/**
 * Reasons API Endpoint
 * Fetches absence reason types
 * 
 * Classification based on Absence.io behavior:
 * - Mobile Work: Remote work, does NOT reduce scheduled hours, does NOT add to worked hours
 * - Vacation (Urlaub): Time off, does NOT reduce scheduled hours (it's "scheduled" as vacation)
 * - Sick Leave (Krankheit): Time off, does NOT reduce scheduled hours (counted as absence)
 * - Other absences: Treated like vacation/sick leave
 * 
 * Note: In Absence.io, "Scheduled Hours" = base working hours - public holidays only
 * Absences (vacation, sick) don't reduce scheduled hours - they're tracked separately
 */

const { fetchAll } = require('../absenceClient');

// Cache for reasons (they rarely change)
let reasonsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Patterns for different absence types
const MOBILE_WORK_PATTERNS = [
    /mobiles?\s*arbeiten/i,     // "Mobiles Arbeiten"
    /remote\s*work/i,           // "Remote Work"
    /home\s*office/i,           // "Home Office"
    /work\s*from\s*home/i,      // "Work from Home"
];

const WORK_PATTERNS = [
    /^arbeit$/i,                // "Arbeit" (a work marker, not absence)
    /^abwesend$/i,              // "Abwesend" (Exact match for the marker used in some locations)
    /^abwesenheit$/i
];

const COMPENSATION_PATTERNS = [
    /überstunden/i,             // "Überstundenausgleich" (overtime compensation)
    /compensation/i,
    /ausgleich/i
];

const SICK_PATTERNS = [
    /krankheit/i,               // "Krankheit" (illness/sick leave)
    /sick/i,
    /illness/i,
    /krank/i
];

/**
 * Classify a reason name
 * @param {string} name - Reason name
 * @returns {Object} Classification flags
 */
function classifyReason(name) {
    if (!name) return { isMobileWork: false, isSickLeave: false, isWorkMarker: false, isCompensation: false };

    const isMobileWork = MOBILE_WORK_PATTERNS.some(p => p.test(name));
    const isWorkMarker = WORK_PATTERNS.some(p => p.test(name));
    const isSickLeave = SICK_PATTERNS.some(p => p.test(name));
    const isCompensation = COMPENSATION_PATTERNS.some(p => p.test(name));

    return { isMobileWork, isSickLeave, isWorkMarker, isCompensation };
}

/**
 * Get all absence reasons
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} Reasons
 */
async function getReasons(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && reasonsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        return reasonsCache;
    }

    const reasons = await fetchAll('/reasons', {});

    reasonsCache = reasons.map(reason => {
        const classification = classifyReason(reason.name);

        return {
            id: reason._id,
            name: reason.name,
            type: reason.type,
            color: reason.color,
            active: reason.active !== false,
            // API Flags
            countsAsWork: reason.countsAsWork !== false,
            reducesDays: reason.reducesDays === true,
            // Identification flags
            isMobileWork: classification.isMobileWork,
            isWorkMarker: classification.isWorkMarker,
            isSickLeave: classification.isSickLeave,
            isCompensation: classification.isCompensation,
            // Logic for Power BI:
            // 1. isAbsence: Should it show up in the "Absence Days" column?
            //    - Yes if it's a true leave type (reducesDays: true) OR it's Sick Leave
            //    - Mobile work and Compensation/Work markers are NOT absences
            isAbsence: (reason.reducesDays === true || classification.isSickLeave) &&
                !classification.isMobileWork &&
                !classification.isWorkMarker &&
                !classification.isCompensation &&
                reason.countsAsWork !== true,

            // 2. reducesScheduledHours: Should it be subtracted from the "Scheduled Hours" pool?
            //    - Yes if it's NOT work (countsAsWork: false)
            //    - Note: Work markers and Mobile work DO count as work, so they don't reduce scheduled hours
            reducesScheduledHours: reason.countsAsWork === false,

            created: reason.created,
            modified: reason.modified
        };
    });

    cacheTimestamp = now;
    return reasonsCache;
}

/**
 * Get reason by ID
 * @param {string} reasonId - Reason ID
 * @returns {Promise<Object|null>} Reason data
 */
async function getReasonById(reasonId) {
    const reasons = await getReasons();
    return reasons.find(r => r.id === reasonId) || null;
}

/**
 * Get reasons that are absences (not remote work)
 * @returns {Promise<Array>} Absence reasons
 */
async function getAbsenceReasons() {
    const reasons = await getReasons();
    return reasons.filter(r => r.isAbsence);
}

module.exports = {
    getReasons,
    getReasonById,
    getAbsenceReasons
};
