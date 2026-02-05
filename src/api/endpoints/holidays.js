/**
 * Holidays API Endpoint
 * Fetches public and custom holidays
 * 
 * Note: In Absence.io, holidays are stored as IDs in locations.
 * Each holiday has a `dates` array with dates for multiple years.
 */

const { fetchAll } = require('../absenceClient');

// Cache for all holidays
let holidaysCache = null;
let holidaysCacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (holidays rarely change)

/**
 * Get all holidays from the system
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} All holidays
 */
async function getAllHolidays(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && holidaysCache && holidaysCacheTimestamp &&
        (now - holidaysCacheTimestamp < CACHE_DURATION)) {
        return holidaysCache;
    }

    // Fetch all holidays without date filter
    const holidays = await fetchAll('/holidays', {});

    console.log(`Fetched ${holidays.length} holidays from API`);

    // Process holidays - each holiday may have a dates array for multiple years
    holidaysCache = holidays.map(holiday => ({
        id: holiday._id,
        name: holiday.name,
        // Handle both single date and dates array
        dates: holiday.dates || (holiday.date ? [holiday.date] : []),
        baseDate: holiday.date,
        year: holiday.year,
        country: holiday.countryCode || holiday.country,
        region: holiday.region,
        isPublic: holiday.isPublic !== false,
        repeating: holiday.repeating || false,
        locationIds: holiday.locationIds || [],
        created: holiday.created,
        modified: holiday.modified
    }));

    holidaysCacheTimestamp = now;
    return holidaysCache;
}

/**
 * Get holidays for a date range (filters from cached holidays)
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {Array} locationHolidayIds - Optional array of holiday IDs to filter by
 * @returns {Promise<Array>} Holidays in date range
 */
async function getHolidays(startDate, endDate, locationHolidayIds = null) {
    const allHolidays = await getAllHolidays();

    const results = [];

    for (const holiday of allHolidays) {
        // If we have location holiday IDs, filter by them
        if (locationHolidayIds && locationHolidayIds.length > 0) {
            if (!locationHolidayIds.includes(holiday.id)) {
                continue;
            }
        }

        // Check if any date in the dates array falls within our range
        for (const dateStr of holiday.dates) {
            // Parse date as LOCAL date to avoid timezone issues
            // API returns "2025-01-01T00:00:00.000Z" - we want Jan 1, not Dec 31
            const holidayDate = parseDateAsLocal(dateStr);

            if (holidayDate >= startDate && holidayDate <= endDate) {
                results.push({
                    ...holiday,
                    date: dateStr, // The specific date in range
                    holidayDate: holidayDate
                });
                break; // Only add once per holiday per range
            }
        }
    }

    return results;
}

/**
 * Parse an ISO date string as a local date (ignoring timezone)
 * This prevents "2025-01-01T00:00:00.000Z" from becoming "2024-12-31" in CET
 * @param {string} dateStr - ISO date string
 * @returns {Date} Local date object
 */
function parseDateAsLocal(dateStr) {
    // Extract just the date part (YYYY-MM-DD)
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    // Create date at noon to avoid any DST edge cases
    return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Get holidays for a specific month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Array} locationHolidayIds - Optional array of holiday IDs to filter by
 * @returns {Promise<Array>} Holidays
 */
async function getHolidaysByMonth(year, month, locationHolidayIds = null) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return getHolidays(startDate, endDate, locationHolidayIds);
}

/**
 * Count holidays by location for a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Array} locationHolidayIds - Optional array of holiday IDs to filter by
 * @returns {Promise<number>} Holiday count
 */
async function countHolidaysByMonth(year, month, locationHolidayIds = null) {
    const holidays = await getHolidaysByMonth(year, month, locationHolidayIds);
    return holidays.length;
}

/**
 * Get holiday dates for a location in a month
 * Uses the holidayIds from location data to filter holidays
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {string} locationId - Location ID (not used directly, use holidayIds instead)
 * @param {Array} locationHolidayIds - Array of holiday IDs from location
 * @returns {Promise<Object>} Object with totalCount, workingDayCount, and workingDayDates
 */
async function getHolidayDatesForLocation(year, month, locationId, locationHolidayIds = null) {
    const holidays = await getHolidaysByMonth(year, month, locationHolidayIds);

    // Total holidays in month (for display, matching Absence.io)
    const totalCount = holidays.length;

    // Filter to only holidays on working days (Mon-Fri) for scheduled hours calculation
    const workingDayHolidays = holidays.filter(h => {
        const day = h.holidayDate.getDay();
        return day !== 0 && day !== 6; // Not Sunday (0) or Saturday (6)
    });

    // Unique working day dates - keep the Date objects directly
    // Create a unique set using date string, then map back to the original Date objects
    const seenDates = new Set();
    const workingDayDates = [];
    for (const h of workingDayHolidays) {
        const dateKey = `${h.holidayDate.getFullYear()}-${String(h.holidayDate.getMonth() + 1).padStart(2, '0')}-${String(h.holidayDate.getDate()).padStart(2, '0')}`;
        if (!seenDates.has(dateKey)) {
            seenDates.add(dateKey);
            workingDayDates.push(h.holidayDate);
        }
    }

    return {
        totalCount,
        workingDayCount: workingDayDates.length,
        workingDayDates
    };
}

module.exports = {
    getAllHolidays,
    getHolidays,
    getHolidaysByMonth,
    countHolidaysByMonth,
    getHolidayDatesForLocation
};
