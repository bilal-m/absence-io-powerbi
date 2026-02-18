/**
 * Schedule Utilities
 * Functions for calculating scheduled hours based on user's work schedule
 * 
 * User schedules in Absence.io have this structure:
 * - schedules: Array of schedule objects
 * - Each schedule has: scheduleType, start (date), days (array with day configs)
 * - days[0] contains keys "0"-"6" for Sunday-Saturday
 * - Each day has: active (boolean), shift (array of {start, end} times)
 */

/**
 * Parse a time string (HH:MM:SS or HH:MM) to minutes from midnight
 * @param {string} timeStr - Time string
 * @returns {number} Minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
}

/**
 * Calculate hours worked for a day based on shifts
 * @param {Array} shifts - Array of {start, end} shift objects
 * @returns {number} Total hours
 */
function calculateDayHoursFromShifts(shifts) {
    if (!shifts || !Array.isArray(shifts)) return 0;

    let totalMinutes = 0;
    for (const shift of shifts) {
        const startMins = parseTimeToMinutes(shift.start);
        const endMins = parseTimeToMinutes(shift.end);
        if (endMins > startMins) {
            totalMinutes += endMins - startMins;
        }
    }

    return totalMinutes / 60;
}

/**
 * Get the applicable schedule for a given date
 * Schedules are sorted by start date, and we find the most recent one that starts on or before the date
 * @param {Array} schedules - User's schedules array
 * @param {Date} date - The date to check
 * @returns {Object|null} The applicable schedule or null
 */
/**
 * Check if a schedule has any active working days
 * @param {Object} schedule - Schedule object
 * @returns {boolean} True if non-empty
 */
function isScheduleNotEmpty(schedule) {
    if (!schedule || !schedule.days || !schedule.days[0]) return false;
    return Object.values(schedule.days[0]).some(d => d && d.active);
}

function getApplicableSchedule(schedules, date) {
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
        return null;
    }

    // Sort schedules by start date (newest first)
    const sortedSchedules = [...schedules]
        .filter(s => s.start)
        .sort((a, b) => new Date(b.start) - new Date(a.start));

    // Find the newest schedule that starts on or before the date.
    // An empty schedule (all days inactive) is intentional — it means 0 scheduled hours
    // for that period. We must NOT skip it or fall back to an older schedule.
    // Normalize schedule start to local date-only to match the loop dates (which are local midnight).
    // Without this, UTC schedule dates like "2025-08-15T00:00:00Z" compare incorrectly
    // against local midnight dates in CET/CEST, causing off-by-one errors.
    for (const schedule of sortedSchedules) {
        const raw = new Date(schedule.start);
        const scheduleStart = new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
        if (scheduleStart <= date) {
            return schedule;
        }
    }

    // No schedule starts on or before this date
    return null;
}

/**
 * Get hours scheduled for a specific date based on user's schedule
 * @param {Object} schedule - The applicable schedule object
 * @param {Date} date - The date to calculate hours for
 * @returns {number} Hours scheduled for that date (0 if not a working day)
 */
function getHoursForDate(schedule, date) {
    if (!schedule || !schedule.days || !schedule.days[0]) {
        return 0;
    }

    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dayConfig = schedule.days[0][String(dayOfWeek)];

    if (!dayConfig || !dayConfig.active) {
        return 0; // Not a working day
    }

    // Calculate hours from shifts
    return calculateDayHoursFromShifts(dayConfig.shift);
}

/**
 * Get the effective date range for a user within a month, clamped by employment dates.
 * Returns null if the user was not employed at all during this month.
 * @param {Object} user - User object with employmentStartDate and employmentEndDate
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {{ firstDay: Date, lastDay: Date } | null}
 */
function getEmploymentBoundedRange(user, year, month) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // last day of month

    let firstDay = monthStart;
    let lastDay = monthEnd;

    if (user.employmentStartDate) {
        const empStart = new Date(user.employmentStartDate);
        // Normalize to date-only (strip time) to avoid timezone issues
        const empStartDate = new Date(empStart.getFullYear(), empStart.getMonth(), empStart.getDate());
        if (empStartDate > lastDay) return null; // hasn't started yet
        if (empStartDate > firstDay) firstDay = empStartDate;
    }

    if (user.employmentEndDate) {
        const empEnd = new Date(user.employmentEndDate);
        const empEndDate = new Date(empEnd.getFullYear(), empEnd.getMonth(), empEnd.getDate());
        if (empEndDate < firstDay) return null; // already left
        if (empEndDate < lastDay) lastDay = empEndDate;
    }

    return { firstDay, lastDay };
}

/**
 * Calculate total scheduled hours for a user in a month
 * This uses the user's actual schedule to determine working days and hours
 * Scheduled hours are ONLY counted for days when the employee is NOT on holiday or absence
 * Day range is clamped by employmentStartDate / employmentEndDate
 * @param {Object} user - User object with schedules
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Array<Date>} holidayDates - Array of holiday dates (on working days)
 * @param {Array<Date>} absenceDates - Array of absence dates (days employee is off)
 * @returns {number} Total scheduled hours for the month
 */
function calculateScheduleBasedHours(user, year, month, holidayDates = [], absenceDates = []) {
    // Clamp to employment period — return 0 if not employed this month
    const range = getEmploymentBoundedRange(user, year, month);
    if (!range) return 0;

    const schedules = user.schedules || [];

    // No schedules = no scheduled hours (Absence.io derives hours entirely from schedules)
    if (schedules.length === 0) return 0;

    // Create Sets for quick lookup of days to skip
    const holidaySet = new Set(holidayDates.map(d => d.toDateString()));
    const absenceSet = new Set(absenceDates.map(d => d.toDateString()));

    let totalHours = 0;

    const current = new Date(range.firstDay);
    while (current <= range.lastDay) {
        const dateStr = current.toDateString();

        // Skip if this is a holiday
        if (holidaySet.has(dateStr)) {
            current.setDate(current.getDate() + 1);
            continue;
        }

        // Skip if this is an absence day (employee is not scheduled to work)
        if (absenceSet.has(dateStr)) {
            current.setDate(current.getDate() + 1);
            continue;
        }

        // Get the applicable schedule for this date
        const schedule = getApplicableSchedule(schedules, current);

        // Get hours for this day
        const dayHours = getHoursForDate(schedule, current);
        totalHours += dayHours;

        current.setDate(current.getDate() + 1);
    }

    return Math.round(totalHours * 100) / 100;
}

/**
 * Fallback calculation when user has no schedules
 * Uses weeklyHours / 5 days for each working day
 * @param {Object} user - User object
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Array<Date>} holidayDates - Array of holiday dates
 * @param {Array<Date>} absenceDates - Array of absence dates
 * @returns {number} Scheduled hours
 */
function calculateFallbackHours(user, year, month, holidayDates = [], absenceDates = []) {
    // Clamp to employment period — return 0 if not employed this month
    const range = getEmploymentBoundedRange(user, year, month);
    if (!range) return 0;

    const weeklyHours = user.weeklyHours || parseFloat(process.env.DEFAULT_WEEKLY_HOURS) || 40;
    const dailyHours = weeklyHours / 5;

    const holidaySet = new Set(holidayDates.map(d => d.toDateString()));
    const absenceSet = new Set(absenceDates.map(d => d.toDateString()));

    let workingDays = 0;

    const current = new Date(range.firstDay);
    while (current <= range.lastDay) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toDateString();
        // Mon-Fri and not a holiday and not an absence
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr) && !absenceSet.has(dateStr)) {
            workingDays++;
        }
        current.setDate(current.getDate() + 1);
    }

    return Math.round(workingDays * dailyHours * 100) / 100;
}

/**
 * Get summary of user's schedule for debugging
 * @param {Object} user - User object
 * @returns {Object} Schedule summary
 */
function getScheduleSummary(user) {
    const schedules = user.schedules || [];

    return {
        hasSchedule: schedules.length > 0,
        scheduleCount: schedules.length,
        schedules: schedules.map(s => ({
            start: s.start,
            type: s.scheduleType,
            activeDays: s.days && s.days[0] ?
                Object.values(s.days[0]).filter(d => d && d.active).length : 0
        }))
    };
}

module.exports = {
    parseTimeToMinutes,
    calculateDayHoursFromShifts,
    getApplicableSchedule,
    getHoursForDate,
    getEmploymentBoundedRange,
    calculateScheduleBasedHours,
    calculateFallbackHours,
    getScheduleSummary
};
