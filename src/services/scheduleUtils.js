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

    // 1. First try: Find the newest non-empty schedule that starts on or before the date
    for (const schedule of sortedSchedules) {
        const scheduleStart = new Date(schedule.start);
        if (scheduleStart <= date && isScheduleNotEmpty(schedule)) {
            return schedule;
        }
    }

    // 2. Second try: If all schedules starting before are empty, but there are non-empty ones at any time
    const anyNonEmpty = sortedSchedules.find(s => isScheduleNotEmpty(s));
    if (anyNonEmpty) {
        return anyNonEmpty;
    }

    // Fallback: Just use the most recent one even if empty
    return sortedSchedules[0] || null;
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
 * Calculate total scheduled hours for a user in a month
 * This uses the user's actual schedule to determine working days and hours
 * Scheduled hours are ONLY counted for days when the employee is NOT on holiday or absence
 * @param {Object} user - User object with schedules
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Array<Date>} holidayDates - Array of holiday dates (on working days)
 * @param {Array<Date>} absenceDates - Array of absence dates (days employee is off)
 * @returns {number} Total scheduled hours for the month
 */
function calculateScheduleBasedHours(user, year, month, holidayDates = [], absenceDates = []) {
    const schedules = user.schedules || [];

    // If no schedules at all, fall back to weeklyHours calculation
    if (schedules.length === 0) {
        return calculateFallbackHours(user, year, month, holidayDates, absenceDates);
    }

    // Determine if we have at least one non-empty schedule in the whole history
    const hasAnyWorkSchedule = schedules.some(s => isScheduleNotEmpty(s));

    // If NO schedule has any work hours, fall back to weeklyHours
    if (!hasAnyWorkSchedule && (user.weeklyHours || 0) > 0) {
        return calculateFallbackHours(user, year, month, holidayDates, absenceDates);
    }

    // Create Sets for quick lookup of days to skip
    const holidaySet = new Set(holidayDates.map(d => d.toDateString()));
    const absenceSet = new Set(absenceDates.map(d => d.toDateString()));

    let totalHours = 0;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const current = new Date(firstDay);
    while (current <= lastDay) {
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

    // Final guard: If we ended up with 0 but have weekly hours, maybe the schedules picked were all empty
    if (totalHours === 0 && (user.weeklyHours || 0) > 0) {
        return calculateFallbackHours(user, year, month, holidayDates, absenceDates);
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
    const weeklyHours = user.weeklyHours || parseFloat(process.env.DEFAULT_WEEKLY_HOURS) || 40;
    const dailyHours = weeklyHours / 5;

    const holidaySet = new Set(holidayDates.map(d => d.toDateString()));
    const absenceSet = new Set(absenceDates.map(d => d.toDateString()));

    let workingDays = 0;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const current = new Date(firstDay);
    while (current <= lastDay) {
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
    calculateScheduleBasedHours,
    calculateFallbackHours,
    getScheduleSummary
};
