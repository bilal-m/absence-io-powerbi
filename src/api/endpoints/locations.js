/**
 * Locations API Endpoint
 */

const { fetchAll } = require('../absenceClient');

// Cache for locations
let locationsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Get all locations
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} Locations
 */
async function getLocations(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && locationsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        return locationsCache;
    }

    const locations = await fetchAll('/locations', {});

    // Log raw data to discover available fields (temporary for debugging)
    if (locations.length > 0) {
        console.log('Raw location fields:', Object.keys(locations[0]));
        console.log('Sample raw location:', JSON.stringify(locations[0], null, 2));
    }

    locationsCache = locations.map(loc => ({
        id: loc._id,
        name: loc.name,
        country: loc.country,
        region: loc.region,
        timezone: loc.timezone,
        holidayIds: loc.holidayIds || [],
        holidaySubregion: loc.holidaySubregion,
        created: loc.created,
        modified: loc.modified
    }));

    cacheTimestamp = now;
    return locationsCache;
}

/**
 * Get location by ID
 * @param {string} locationId - Location ID
 * @returns {Promise<Object|null>} Location data
 */
async function getLocationById(locationId) {
    const locations = await getLocations();
    return locations.find(l => l.id === locationId) || null;
}

module.exports = {
    getLocations,
    getLocationById
};
