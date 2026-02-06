/**
 * Toggl Track API Client
 *
 * Handles all HTTP requests to Toggl with Basic Auth.
 * Includes request timeouts, rate limit delays, and retry with backoff.
 */

const axios = require('axios');

const TOGGL_API_BASE = 'https://api.track.toggl.com';
const TOGGL_REPORTS_BASE = 'https://api.track.toggl.com/reports/api/v3';
const REQUEST_TIMEOUT = 30000; // 30s timeout
const RATE_LIMIT_DELAY = 1100; // 1.1s between requests (Toggl leaky bucket = 1 req/sec)
const MAX_RETRIES = 2;

let lastRequestTime = 0;

function isTogglConfigured() {
    return !!(process.env.TOGGL_API_TOKEN && process.env.TOGGL_WORKSPACE_ID);
}

function getAuthHeader() {
    const token = process.env.TOGGL_API_TOKEN;
    return 'Basic ' + Buffer.from(`${token}:api_token`).toString('base64');
}

// Enforce minimum delay between Toggl API calls
async function throttle() {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < RATE_LIMIT_DELAY) {
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY - elapsed));
    }
    lastRequestTime = Date.now();
}

// Retry wrapper: only retry 429 (burst limit, resets in seconds).
// 402 (hourly quota exhausted) fails immediately — can take up to an hour to reset.
async function withRetry(fn) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            await throttle();
            return await fn();
        } catch (error) {
            const status = error.response?.status;
            if (status === 429 && attempt < MAX_RETRIES) {
                const backoff = (attempt + 1) * 3000; // 3s, 6s
                console.warn(`[Toggl] Burst rate limited (429), retrying in ${backoff / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
                await new Promise(r => setTimeout(r, backoff));
                continue;
            }
            if (error.response) {
                throw new Error(`Toggl API Error (${status}): ${error.response.data?.message || error.message}`);
            }
            throw new Error(`Toggl network error: ${error.message}`);
        }
    }
}

async function togglGet(path) {
    return withRetry(async () => {
        const response = await axios.get(`${TOGGL_API_BASE}${path}`, {
            headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/json' },
            timeout: REQUEST_TIMEOUT
        });
        return response.data;
    });
}

async function togglReportsPost(path, body = {}) {
    return withRetry(async () => {
        const response = await axios.post(`${TOGGL_REPORTS_BASE}${path}`, body, {
            headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/json' },
            timeout: REQUEST_TIMEOUT
        });
        return response.data;
    });
}

module.exports = { isTogglConfigured, togglGet, togglReportsPost };
