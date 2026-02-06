/**
 * Toggl Track API Client
 *
 * Handles all HTTP requests to Toggl with Basic Auth.
 */

const axios = require('axios');

const TOGGL_API_BASE = 'https://api.track.toggl.com';
const TOGGL_REPORTS_BASE = 'https://api.track.toggl.com/reports/api/v3';

function isTogglConfigured() {
    return !!(process.env.TOGGL_API_TOKEN && process.env.TOGGL_WORKSPACE_ID);
}

function getAuthHeader() {
    const token = process.env.TOGGL_API_TOKEN;
    return 'Basic ' + Buffer.from(`${token}:api_token`).toString('base64');
}

async function togglGet(path) {
    try {
        const response = await axios.get(`${TOGGL_API_BASE}${path}`, {
            headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Toggl API Error (${error.response.status}): ${error.response.data?.message || error.message}`);
        }
        throw error;
    }
}

async function togglReportsPost(path, body = {}) {
    try {
        const response = await axios.post(`${TOGGL_REPORTS_BASE}${path}`, body, {
            headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Toggl Reports API Error (${error.response.status}): ${error.response.data?.message || error.message}`);
        }
        throw error;
    }
}

module.exports = { isTogglConfigured, togglGet, togglReportsPost };
