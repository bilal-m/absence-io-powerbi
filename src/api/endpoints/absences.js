/**
 * Absences API Endpoint
 * Fetches absence records with reason relationships
 */

const { fetchAll } = require('../absenceClient');

/**
 * Get absences for a date range
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {string} userId - Optional user ID filter
 * @returns {Promise<Array>} Absences
 */
async function getAbsences(startDate, endDate, userId = null) {
    const filter = {
        start: { $lte: endDate.toISOString() },
        end: { $gte: startDate.toISOString() }
    };

    if (userId) {
        filter.assignedToId = userId;
    }

    const absences = await fetchAll('/absences', filter, ['reasonId', 'assignedToId']);

    return absences.map(absence => ({
        id: absence._id,
        userId: absence.assignedToId,
        userName: absence.assignedTo ?
            `${absence.assignedTo.firstName} ${absence.assignedTo.lastName}` : null,
        reasonId: absence.reasonId,
        reasonName: absence.reason?.name || null,
        reasonType: absence.reason?.type || null,
        start: absence.start,
        end: absence.end,
        days: absence.days || [],
        daysCount: absence.daysCount || 0,
        status: absence.status,
        commentary: absence.commentary,
        created: absence.created,
        modified: absence.modified
    }));
}

/**
 * Get absences for a specific month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {string} userId - Optional user ID filter
 * @returns {Promise<Array>} Absences
 */
async function getAbsencesByMonth(year, month, userId = null) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return getAbsences(startDate, endDate, userId);
}

/**
 * Count absences by user for a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Map of userId to absence count
 */
async function countAbsencesByMonth(year, month) {
    const absences = await getAbsencesByMonth(year, month);

    const counts = {};
    absences.forEach(absence => {
        if (absence.status === 'approved' || absence.status === 'confirmedByApprover') {
            counts[absence.userId] = (counts[absence.userId] || 0) + absence.daysCount;
        }
    });

    return counts;
}

module.exports = {
    getAbsences,
    getAbsencesByMonth,
    countAbsencesByMonth
};
