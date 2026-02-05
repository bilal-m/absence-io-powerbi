/**
 * Absence.io API Client
 * 
 * Handles all API requests to Absence.io with Hawk authentication.
 * Supports pagination and error handling.
 */

const axios = require('axios');
const { generateAuthHeader } = require('../auth/hawkAuth');

const BASE_URL = 'https://app.absence.io/api/v2';

/**
 * Make an authenticated request to Absence.io API
 * @param {string} endpoint - API endpoint (e.g., '/users')
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (default: 'POST' for queries)
 * @param {Object} options.body - Request body
 * @returns {Promise<Object>} API response data
 */
async function apiRequest(endpoint, options = {}) {
    const method = options.method || 'POST';
    const url = `${BASE_URL}${endpoint}`;

    const headers = generateAuthHeader(url, method);

    try {
        const response = await axios({
            method,
            url,
            headers,
            data: options.body || {}
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.message;
            throw new Error(`API Error (${status}): ${message}`);
        }
        throw error;
    }
}

/**
 * Fetch all records from an endpoint with automatic pagination
 * @param {string} endpoint - API endpoint
 * @param {Object} filter - Filter object for query
 * @param {Array} relations - Relations to resolve
 * @returns {Promise<Array>} All records
 */
async function fetchAll(endpoint, filter = {}, relations = []) {
    const allData = [];
    let skip = 0;
    const limit = 100; // Max allowed by API
    let hasMore = true;

    while (hasMore) {
        const body = {
            skip,
            limit,
            filter,
            relations
        };

        const response = await apiRequest(endpoint, { body });

        if (response.data && response.data.length > 0) {
            allData.push(...response.data);
            skip += response.data.length;
            hasMore = response.data.length === limit;
        } else {
            hasMore = false;
        }
    }

    return allData;
}

/**
 * Fetch a single record by ID
 * @param {string} endpoint - API endpoint
 * @param {string} id - Record ID
 * @returns {Promise<Object>} Record data
 */
async function fetchById(endpoint, id) {
    const url = `${BASE_URL}${endpoint}/${id}`;
    const headers = generateAuthHeader(url, 'GET');

    try {
        const response = await axios({
            method: 'GET',
            url,
            headers
        });

        return response.data;
    } catch (error) {
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

module.exports = {
    apiRequest,
    fetchAll,
    fetchById,
    BASE_URL
};
