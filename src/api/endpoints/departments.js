/**
 * Departments API Endpoint
 */

const { fetchAll } = require('../absenceClient');

// Cache for departments
let departmentsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Get all departments
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} Departments
 */
async function getDepartments(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && departmentsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        return departmentsCache;
    }

    const departments = await fetchAll('/departments', {});

    departmentsCache = departments.map(dept => ({
        id: dept._id,
        name: dept.name,
        created: dept.created,
        modified: dept.modified
    }));

    cacheTimestamp = now;
    return departmentsCache;
}

/**
 * Get department by ID
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object|null>} Department data
 */
async function getDepartmentById(departmentId) {
    const departments = await getDepartments();
    return departments.find(d => d.id === departmentId) || null;
}

module.exports = {
    getDepartments,
    getDepartmentById
};
