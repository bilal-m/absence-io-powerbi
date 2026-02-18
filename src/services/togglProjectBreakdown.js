/**
 * Toggl Project Breakdown Service
 *
 * Provides per-project billable/non-billable hours for each user per month.
 * Reuses metadata caches from togglReports.js (users, projects, clients)
 * and calls the same Summary API — but preserves per-project granularity
 * instead of aggregating to user-level totals.
 */

const { isTogglConfigured, togglReportsPost } = require('../api/togglClient');
const { getTogglUsers, getTogglProjects, getTogglClients } = require('../api/endpoints/togglReports');

// Separate cache for project-level breakdown (same TTL strategy as togglReports)
const SUMMARY_CACHE_TTL = 5 * 60 * 1000;           // 5 min for current month
const HISTORICAL_CACHE_TTL = 24 * 60 * 60 * 1000;  // 24 hours for past months
const breakdownCache = {};
const MAX_CACHE = 36;

const inProgressFetches = new Map();

function pruneCache() {
    const keys = Object.keys(breakdownCache);
    if (keys.length > MAX_CACHE) {
        keys.sort((a, b) => breakdownCache[a].timestamp - breakdownCache[b].timestamp);
        for (let i = 0; i < keys.length - MAX_CACHE; i++) {
            delete breakdownCache[keys[i]];
        }
    }
}

/**
 * Get per-project breakdown for a given month.
 * Returns array of { togglUserId, togglUserName, togglUserEmail,
 *   projectId, projectName, clientId, clientName,
 *   totalHours, billableHours, nonBillableHours, year, month }
 */
async function getProjectBreakdown(year, month) {
    if (!isTogglConfigured()) return [];

    const cacheKey = `${year}-${String(month).padStart(2, '0')}`;

    // Dedup concurrent requests
    if (inProgressFetches.has(cacheKey)) {
        return inProgressFetches.get(cacheKey);
    }

    const promise = _fetchBreakdown(year, month, cacheKey);
    inProgressFetches.set(cacheKey, promise);
    try {
        return await promise;
    } finally {
        inProgressFetches.delete(cacheKey);
    }
}

async function _fetchBreakdown(year, month, cacheKey) {
    const now = Date.now();

    const currentDate = new Date();
    const isCurrentMonth = (year === currentDate.getFullYear() && month === currentDate.getMonth() + 1);
    const ttl = isCurrentMonth ? SUMMARY_CACHE_TTL : HISTORICAL_CACHE_TTL;

    if (breakdownCache[cacheKey] && (now - breakdownCache[cacheKey].timestamp < ttl)) {
        return breakdownCache[cacheKey].data;
    }

    try {
        const workspaceId = process.env.TOGGL_WORKSPACE_ID;
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // Reuse shared metadata caches from togglReports.js
        const [users, projects, clients] = await Promise.all([
            getTogglUsers(),
            getTogglProjects(),
            getTogglClients()
        ]);

        // Build user lookup (id -> { email, fullname })
        const userMap = new Map();
        for (const u of users) {
            userMap.set(u.id, u);
        }

        // Summary API: 1 call per month
        const response = await togglReportsPost(
            `/workspace/${workspaceId}/summary/time_entries`,
            {
                start_date: startDate,
                end_date: endDate,
                grouping: 'users',
                sub_grouping: 'projects',
                include_time_entry_ids: false
            }
        );

        const rows = [];
        const groups = response?.groups || [];

        for (const group of groups) {
            const userId = group.id;
            const user = userMap.get(userId);

            for (const sub of (group.sub_groups || [])) {
                const totalSeconds = sub.seconds || 0;
                let billableSeconds = 0;

                if (sub.billable_seconds != null) {
                    billableSeconds = sub.billable_seconds;
                } else if (sub.rates) {
                    for (const rate of sub.rates) {
                        billableSeconds += rate.billable_seconds || 0;
                    }
                }

                const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;
                const billableHours = Math.round((billableSeconds / 3600) * 100) / 100;
                const nonBillableHours = Math.round((totalHours - billableHours) * 100) / 100;

                // Resolve project and client
                const projectId = sub.id || null;
                const project = projectId ? projects.get(projectId) : null;
                const projectName = project?.name || (projectId ? `Project ${projectId}` : 'No Project');
                const clientId = project?.clientId || null;
                const clientName = clientId ? (clients.get(clientId) || `Client ${clientId}`) : 'No Client';

                rows.push({
                    togglUserId: userId,
                    togglUserName: user?.fullname || `User ${userId}`,
                    togglUserEmail: user?.email || null,
                    projectId,
                    projectName,
                    clientId,
                    clientName,
                    totalHours,
                    billableHours,
                    nonBillableHours,
                    year,
                    month
                });
            }
        }

        breakdownCache[cacheKey] = { data: rows, timestamp: Date.now() };
        pruneCache();
        console.log(`[Toggl] Project breakdown for ${cacheKey}: ${rows.length} rows from ${groups.length} users`);
        return rows;
    } catch (error) {
        if (breakdownCache[cacheKey]) {
            console.warn(`[Toggl] Failed to refresh breakdown ${cacheKey}, using stale cache: ${error.message}`);
            return breakdownCache[cacheKey].data;
        }
        throw error;
    }
}

module.exports = { getProjectBreakdown };
