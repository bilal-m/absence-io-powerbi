/**
 * Users API Endpoint
 * Fetches employee data with department, location, and team relationships
 */

const { fetchAll } = require('../absenceClient');

/**
 * Get all users with related data
 * @returns {Promise<Array>} Users with resolved relationships
 */
async function getUsers() {
    const users = await fetchAll('/users', {}, [
        'departmentId',
        'locationId'
    ]);

    return users.map(user => ({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        departmentId: user.departmentId,
        departmentName: user.department?.name || null,
        locationId: user.locationId,
        locationName: user.location?.name || null,
        teamIds: user.teamIds || [],
        weeklyHours: user.weeklyHours || parseFloat(process.env.DEFAULT_WEEKLY_HOURS) || 40,
        schedules: user.schedules || null,
        employmentStartDate: user.employmentStartDate || null,
        employmentEndDate: user.employmentEndDate || null,
        active: user.active !== false,
        created: user.created,
        modified: user.modified
    }));
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User data
 */
async function getUserById(userId) {
    const users = await fetchAll('/users', { _id: userId }, [
        'departmentId',
        'locationId'
    ]);

    if (users.length === 0) return null;

    const user = users[0];
    return {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        departmentId: user.departmentId,
        departmentName: user.department?.name || null,
        locationId: user.locationId,
        locationName: user.location?.name || null,
        teamIds: user.teamIds || [],
        weeklyHours: user.weeklyHours || parseFloat(process.env.DEFAULT_WEEKLY_HOURS) || 40,
        schedules: user.schedules || null,
        employmentStartDate: user.employmentStartDate || null,
        employmentEndDate: user.employmentEndDate || null,
        active: user.active !== false
    };
}

module.exports = {
    getUsers,
    getUserById
};
