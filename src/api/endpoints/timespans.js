/**
 * Timespans API Endpoint
 * Fetches work entries/time tracking data
 */

const { fetchAll } = require('../absenceClient');

/**
 * Get work entries (timespans) for a date range
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {string} userId - Optional user ID filter
 * @returns {Promise<Array>} Work entries
 */
async function getTimespans(startDate, endDate, userId = null) {
    // Use an overlap query: fetch any entry that overlaps with the requested range.
    // An entry overlaps if it starts before the range ends AND ends after the range starts.
    const filter = {
        start: { $lte: endDate.toISOString() },
        end: { $gte: startDate.toISOString() }
    };

    if (userId) {
        filter.userId = userId;
    }

    const timespans = await fetchAll('/timespans', filter, ['userId']);

    const rangeStart = startDate.getTime();
    const rangeEnd = endDate.getTime();

    return timespans.map(ts => {
        const startTime = new Date(ts.start);
        const endTime = new Date(ts.end);

        // Clip entry to the requested range so cross-boundary entries
        // only count the portion within this month
        const clippedStart = Math.max(startTime.getTime(), rangeStart);
        const clippedEnd = Math.min(endTime.getTime(), rangeEnd);
        const durationMs = Math.max(0, clippedEnd - clippedStart);
        const durationHours = durationMs / (1000 * 60 * 60);

        return {
            id: ts._id,
            userId: ts.userId,
            userName: ts.user ? `${ts.user.firstName} ${ts.user.lastName}` : null,
            start: ts.start,
            end: ts.end,
            durationHours,
            type: ts.type || 'work',
            commentary: ts.commentary,
            created: ts.created,
            modified: ts.modified
        };
    });
}

/**
 * Get work entries for a specific month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {string} userId - Optional user ID filter
 * @returns {Promise<Array>} Work entries
 */
async function getTimespansByMonth(year, month, userId = null) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return getTimespans(startDate, endDate, userId);
}

/**
 * Sum work hours by user for a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Map of userId to total hours worked
 */
async function sumWorkHoursByMonth(year, month) {
    const timespans = await getTimespansByMonth(year, month);

    const totals = {};
    timespans.forEach(ts => {
        // Only include actual work entries (exclude breaks)
        if (ts.type === 'work') {
            totals[ts.userId] = (totals[ts.userId] || 0) + ts.durationHours;
        }
    });

    // Round to 2 decimal places
    Object.keys(totals).forEach(userId => {
        totals[userId] = Math.round(totals[userId] * 100) / 100;
    });

    return totals;
}

module.exports = {
    getTimespans,
    getTimespansByMonth,
    sumWorkHoursByMonth
};
