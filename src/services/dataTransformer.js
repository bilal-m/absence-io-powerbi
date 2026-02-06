/**
 * Data Transformer Service
 * 
 * Calculates scheduled hours, overtime, and aggregates monthly summaries.
 */

const { getUsers } = require('../api/endpoints/users');
const { getAbsencesByMonth } = require('../api/endpoints/absences');
const { sumWorkHoursByMonth } = require('../api/endpoints/timespans');
const { getHolidayDatesForLocation, getHolidaysByMonth } = require('../api/endpoints/holidays');
const { getReasons } = require('../api/endpoints/reasons');
const { getDepartments } = require('../api/endpoints/departments');
const { getLocations } = require('../api/endpoints/locations');
const { getTeams } = require('../api/endpoints/teams');
const { calculateScheduleBasedHours } = require('./scheduleUtils');

/**
 * Get the number of working days in a month, excluding weekends
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} Working days count
 */
function getWorkingDaysInMonth(year, month) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    let workingDays = 0;
    const current = new Date(firstDay);

    while (current <= lastDay) {
        const dayOfWeek = current.getDay();
        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
        }
        current.setDate(current.getDate() + 1);
    }

    return workingDays;
}

/**
 * Count holidays that fall on working days
 * @param {Array<Date>} holidayDates - Array of holiday dates
 * @returns {number} Count of holidays on working days
 */
function countHolidaysOnWorkingDays(holidayDates) {
    return holidayDates.filter(date => {
        const dayOfWeek = date.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6;
    }).length;
}

/**
 * Calculate scheduled hours for a user in a month
 * Based on Absence.io logic: Scheduled Hours = base hours - holiday hours
 * Note: Absences (vacation, sick, etc.) do NOT reduce scheduled hours in Absence.io
 * 
 * @param {Object} user - User object with weeklyHours
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {number} holidayCount - Number of public holidays on working days
 * @returns {number} Scheduled hours
 */
function calculateScheduledHours(user, year, month, holidayCount) {
    const weeklyHours = user.weeklyHours || parseFloat(process.env.DEFAULT_WEEKLY_HOURS) || 40;
    const dailyHours = weeklyHours / 5; // Assuming 5-day work week

    const workingDays = getWorkingDaysInMonth(year, month);

    // Base scheduled hours
    const baseHours = workingDays * dailyHours;

    // Subtract only public holidays (NOT absences)
    const holidayHours = holidayCount * dailyHours;

    const scheduledHours = baseHours - holidayHours;

    return Math.max(0, Math.round(scheduledHours * 100) / 100);
}

/**
 * Generate monthly summary for all users
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Object} [sharedData] - Pre-fetched metadata to avoid redundant API calls in multi-month requests
 * @param {Array} [sharedData.users] - Pre-fetched users
 * @param {Array} [sharedData.reasons] - Pre-fetched reasons
 * @param {Array} [sharedData.departments] - Pre-fetched departments
 * @param {Array} [sharedData.locations] - Pre-fetched locations
 * @param {Array} [sharedData.teams] - Pre-fetched teams
 * @returns {Promise<Array>} Monthly summary records
 */
async function generateMonthlySummary(year, month, sharedData = null) {
    // Use pre-fetched metadata if available, otherwise fetch fresh
    const hasShared = sharedData && sharedData.users;
    const metadataPromises = hasShared ? [] : [
        getUsers(),
        getReasons(),
        getDepartments(),
        getLocations(),
        getTeams()
    ];

    // Always fetch month-specific data fresh
    const monthPromises = [
        getAbsencesByMonth(year, month),
        sumWorkHoursByMonth(year, month)
    ];

    const [monthResults, metadataResults] = await Promise.all([
        Promise.all(monthPromises),
        Promise.all(metadataPromises)
    ]);

    const [absences, workHours] = monthResults;
    const users = hasShared ? sharedData.users : metadataResults[0];
    const reasons = hasShared ? sharedData.reasons : metadataResults[1];
    const departments = hasShared ? sharedData.departments : metadataResults[2];
    const locations = hasShared ? sharedData.locations : metadataResults[3];
    const teams = hasShared ? sharedData.teams : metadataResults[4];

    // Create lookup maps
    const departmentMap = new Map(departments.map(d => [d.id, d.name]));
    const locationMap = new Map(locations.map(l => [l.id, l]));
    const reasonMap = new Map(reasons.map(r => [r.id, r]));

    // Get holidays by location (using each location's holidayIds for filtering)
    // Do this BEFORE processing absences so we can exclude holidays from absence counts
    const holidaysByLocation = {};
    const allHolidayDates = new Set(); // Set of all holiday date strings (YYYY-MM-DD)

    for (const location of locations) {
        const locationHolidays = await getHolidayDatesForLocation(
            year,
            month,
            location.id,
            location.holidayIds || []
        );
        holidaysByLocation[location.id] = locationHolidays;

        // Add all holiday dates to the set for quick lookup
        if (locationHolidays.workingDayDates) {
            locationHolidays.workingDayDates.forEach(date => {
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                allHolidayDates.add(dateStr);
            });
        }
    }

    // Process absences by user
    // - Mobile Work: track separately (not counted as absence or worked hours)
    // - Absences (vacation, sick, etc.): counted as absence days (excluding holidays)
    // Status values: 0 = pending, 1 = rejected, 2 = approved/confirmed
    const absencesByUser = {};
    const absenceDatesByUser = {}; // NEW: Track individual absence dates
    const mobileWorkByUser = {};

    absences.forEach(absence => {
        // Check if absence is approved (status 2 or string 'approved'/'confirmedByApprover')
        const isApproved = absence.status === 2 ||
            absence.status === 'approved' ||
            absence.status === 'confirmedByApprover';

        if (isApproved) {
            const reason = reasonMap.get(absence.reasonId);

            if (reason) {
                if (reason.isMobileWork) {
                    // Mobile Work - track separately
                    if (!mobileWorkByUser[absence.userId]) {
                        mobileWorkByUser[absence.userId] = { days: 0, count: 0 };
                    }
                    // Count only the days in this month (filter by year/month)
                    let daysInMonth = 0;
                    if (absence.days && absence.days.length > 0) {
                        daysInMonth = absence.days.filter(dayInfo => {
                            if (!dayInfo.date) return false;
                            const datePart = dayInfo.date.split('T')[0];
                            const [y, m, d] = datePart.split('-').map(Number);
                            if (y !== year || m !== month) return false;

                            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            // Exclude weekends and holidays (same logic as absences)
                            const isWorkingDay = (dayInfo.value > 0) && !dayInfo.holiday && !dayInfo.weekend;
                            return isWorkingDay && !allHolidayDates.has(dateStr);
                        }).reduce((sum, dayInfo) => sum + (dayInfo.value || 0), 0);
                    } else {
                        daysInMonth = absence.daysCount || 0;
                    }
                    mobileWorkByUser[absence.userId].days += daysInMonth;
                    mobileWorkByUser[absence.userId].count += 1;
                } else if (reason.reducesScheduledHours || reason.isAbsence) {
                    // This is some form of absence (either reported leave or a schedule-reducing marker)

                    // 1. Process for Schedule Reduction (if reducesScheduledHours is true)
                    if (reason.reducesScheduledHours) {
                        if (!absenceDatesByUser[absence.userId]) {
                            absenceDatesByUser[absence.userId] = [];
                        }
                    }

                    // 2. Process for Summary Reporting (if isAbsence is true)
                    if (reason.isAbsence) {
                        if (!absencesByUser[absence.userId]) {
                            absencesByUser[absence.userId] = { days: 0, count: 0 };
                        }
                    }

                    // Generate dates for this period
                    let reportableDaysInMonth = 0;
                    if (absence.days && absence.days.length > 0) {
                        absence.days.forEach(dayInfo => {
                            if (dayInfo.date) {
                                const datePart = dayInfo.date.split('T')[0];
                                const [y, m, d] = datePart.split('-').map(Number);

                                if (y === year && m === month) {
                                    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                                    // Check if it's a valid work day that should be subtracted/counted
                                    const isWorkingDay = (dayInfo.value > 0) && !dayInfo.holiday && !dayInfo.weekend;

                                    if (isWorkingDay && !allHolidayDates.has(dateStr)) {
                                        // Add to schedule reduction pool if applicable
                                        if (reason.reducesScheduledHours) {
                                            absenceDatesByUser[absence.userId].push(new Date(y, m - 1, d, 12, 0, 0));
                                        }

                                        // Add to reportable count pool if applicable
                                        if (reason.isAbsence) {
                                            reportableDaysInMonth += dayInfo.value;
                                        }
                                    }
                                }
                            }
                        });
                    } else if (absence.start && absence.end) {
                        // Fallback: generate dates from start to end, filtering by month and excluding holidays
                        const startParts = absence.start.split('T')[0].split('-').map(Number);
                        const endParts = absence.end.split('T')[0].split('-').map(Number);
                        const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2], 12, 0, 0);
                        const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2], 12, 0, 0);

                        const current = new Date(startDate);
                        while (current <= endDate) {
                            // Only count if it's in the requested month
                            if (current.getFullYear() === year && current.getMonth() + 1 === month) {
                                const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

                                // Exclude holidays from absence counts
                                if (!allHolidayDates.has(dateStr)) {
                                    // Add to schedule reduction pool if applicable
                                    if (reason.reducesScheduledHours) {
                                        absenceDatesByUser[absence.userId].push(new Date(current));
                                    }
                                    // Add to reportable count pool if applicable
                                    if (reason.isAbsence) {
                                        reportableDaysInMonth++;
                                    }
                                }
                            }
                            current.setDate(current.getDate() + 1);
                        }
                    }

                    // Update summary counts
                    if (reason.isAbsence && absencesByUser[absence.userId]) {
                        absencesByUser[absence.userId].days += reportableDaysInMonth;
                        absencesByUser[absence.userId].count += 1;
                    }
                }
            }
        }
    });

    // Generate summary for each active user
    const summaries = [];

    for (const user of users) {
        if (!user.active) continue;

        // Get user's teams
        const userTeamIds = user.teamIds || [];
        const userTeams = teams.filter(t =>
            userTeamIds.includes(t.id) || t.memberIds?.includes(user.id)
        );

        // Get holidays for user's location
        // Returns { totalCount, workingDayCount, workingDayDates }
        const userHolidays = holidaysByLocation[user.locationId] || { totalCount: 0, workingDayCount: 0, workingDayDates: [] };
        const holidayCount = userHolidays.workingDayCount; // Display count (only working-day holidays)

        // Get user's absences (real time-off like vacation, sick leave - NOT Mobile Work)
        const userAbsences = absencesByUser[user.id] || { days: 0, count: 0 };
        const userAbsenceDates = absenceDatesByUser[user.id] || []; // NEW: Individual absence dates

        // Get user's mobile work days (for reference, NOT added to worked hours)
        const userMobileWork = mobileWorkByUser[user.id] || { days: 0, count: 0 };

        // Calculate scheduled hours using user's actual schedule
        // This uses the schedules array with shifts for accurate part-time calculations
        // Both holidays AND absence days are subtracted (Absence.io shows 0 scheduled for absence days)
        const scheduledHours = calculateScheduleBasedHours(
            user,
            year,
            month,
            userHolidays.workingDayDates || [],
            userAbsenceDates // NEW: Pass absence dates
        );

        // Get worked hours (only timespan entries, NOT Mobile Work)
        // Mobile Work is already tracked by timespans or is just a marker
        const workedHours = Math.round((workHours[user.id] || 0) * 100) / 100;

        // Calculate overtime (worked - scheduled)
        const overtimeHours = Math.round((workedHours - scheduledHours) * 100) / 100;

        const userLocation = locationMap.get(user.locationId);

        summaries.push({
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            departmentId: user.departmentId,
            departmentName: departmentMap.get(user.departmentId) || null,
            locationId: user.locationId,
            locationName: userLocation?.name || null,
            teamIds: userTeamIds,
            teamNames: userTeams.map(t => t.name),
            year,
            month,
            weeklyHours: user.weeklyHours || 0,
            scheduledHours,
            workedHours,
            absenceDays: userAbsences.days,
            absenceCount: userAbsences.count,
            mobileWorkDays: userMobileWork.days,
            holidayCount,
            overtimeHours
        });
    }

    return summaries;
}

/**
 * Get summary for a specific user
 * @param {string} userId - User ID
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object|null>} User's monthly summary
 */
async function getUserMonthlySummary(userId, year, month) {
    const summaries = await generateMonthlySummary(year, month);
    return summaries.find(s => s.userId === userId) || null;
}

module.exports = {
    generateMonthlySummary,
    getUserMonthlySummary,
    calculateScheduledHours,
    getWorkingDaysInMonth,
    countHolidaysOnWorkingDays
};
