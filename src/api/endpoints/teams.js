/**
 * Teams API Endpoint
 */

const { fetchAll } = require('../absenceClient');

// Cache for teams
let teamsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Get all teams
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} Teams
 */
async function getTeams(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && teamsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        return teamsCache;
    }

    const teams = await fetchAll('/teams', {});

    teamsCache = teams.map(team => ({
        id: team._id,
        name: team.name,
        memberIds: team.memberIds || [],
        created: team.created,
        modified: team.modified
    }));

    cacheTimestamp = now;
    return teamsCache;
}

/**
 * Get team by ID
 * @param {string} teamId - Team ID
 * @returns {Promise<Object|null>} Team data
 */
async function getTeamById(teamId) {
    const teams = await getTeams();
    return teams.find(t => t.id === teamId) || null;
}

/**
 * Get teams for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Teams the user belongs to
 */
async function getTeamsForUser(userId) {
    const teams = await getTeams();
    return teams.filter(t => t.memberIds.includes(userId));
}

module.exports = {
    getTeams,
    getTeamById,
    getTeamsForUser
};
