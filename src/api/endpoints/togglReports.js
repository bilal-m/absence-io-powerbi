/**
 * Toggl Track Reports
 *
 * Fetches workspace users, projects, clients, and time entry summaries.
 * Provides monthly billable/non-billable hours per user with project/client metadata.
 * Uses Summary API (1 call/month) instead of Search API (paginated) to minimize quota usage.
 * All fetchers serve stale cache when the Toggl API is unavailable (e.g. 402 quota).
 * Historical months use 24hr cache to minimize API calls.
 */

const { isTogglConfigured, togglGet, togglReportsPost } = require('../togglClient');

// Cache TTLs
const METADATA_CACHE_TTL = 60 * 60 * 1000;        // 1 hour for users/projects/clients
const SUMMARY_CACHE_TTL = 5 * 60 * 1000;           // 5 min for current month
const HISTORICAL_CACHE_TTL = 24 * 60 * 60 * 1000;  // 24 hours for past months

// Workspace users cache
let usersCache = null;
let usersCacheTs = null;

// Projects cache (id -> { name, clientId })
let projectsCache = null;
let projectsCacheTs = null;

// Clients cache (id -> name)
let clientsCache = null;
let clientsCacheTs = null;

// Monthly summary cache (pruned to max 36 entries by count only — stale entries kept as fallback)
const summaryCache = {};
const MAX_SUMMARY_CACHE = 36;

// Last successful Toggl data refresh (ISO string)
let togglLastRefresh = null;

// In-progress fetch deduplication (prevents concurrent requests from burning quota)
const inProgressFetches = new Map();

function getTogglLastRefresh() {
    return togglLastRefresh;
}

function pruneSummaryCache() {
    const keys = Object.keys(summaryCache);
    if (keys.length > MAX_SUMMARY_CACHE) {
        keys.sort((a, b) => summaryCache[a].timestamp - summaryCache[b].timestamp);
        for (let i = 0; i < keys.length - MAX_SUMMARY_CACHE; i++) {
            delete summaryCache[keys[i]];
        }
    }
}

// ============================================
// Metadata fetchers (cached 1 hour, stale fallback)
// ============================================

async function getTogglUsers(forceRefresh = false) {
    if (!isTogglConfigured()) return [];
    const now = Date.now();
    if (!forceRefresh && usersCache && (now - usersCacheTs < METADATA_CACHE_TTL)) return usersCache;

    try {
        const workspaceId = process.env.TOGGL_WORKSPACE_ID;
        const raw = await togglGet(`/api/v9/workspaces/${workspaceId}/users`);

        usersCache = raw.map(u => ({
            id: u.id,
            email: (u.email || '').toLowerCase().trim(),
            fullname: u.fullname || u.email || `User ${u.id}`
        }));
        usersCacheTs = now;
        togglLastRefresh = new Date().toISOString();
        console.log(`[Toggl] Cached ${usersCache.length} workspace users`);
        return usersCache;
    } catch (error) {
        if (usersCache) {
            console.warn(`[Toggl] Failed to refresh users, using stale cache: ${error.message}`);
            return usersCache;
        }
        throw error;
    }
}

async function getTogglProjects() {
    if (!isTogglConfigured()) return new Map();
    const now = Date.now();
    if (projectsCache && (now - projectsCacheTs < METADATA_CACHE_TTL)) return projectsCache;

    try {
        const workspaceId = process.env.TOGGL_WORKSPACE_ID;
        const raw = await togglGet(`/api/v9/workspaces/${workspaceId}/projects`);

        projectsCache = new Map();
        for (const p of (raw || [])) {
            projectsCache.set(p.id, { name: p.name, clientId: p.client_id || null });
        }
        projectsCacheTs = now;
        console.log(`[Toggl] Cached ${projectsCache.size} projects`);
        return projectsCache;
    } catch (error) {
        if (projectsCache) {
            console.warn(`[Toggl] Failed to refresh projects, using stale cache: ${error.message}`);
            return projectsCache;
        }
        throw error;
    }
}

async function getTogglClients() {
    if (!isTogglConfigured()) return new Map();
    const now = Date.now();
    if (clientsCache && (now - clientsCacheTs < METADATA_CACHE_TTL)) return clientsCache;

    try {
        const workspaceId = process.env.TOGGL_WORKSPACE_ID;
        const raw = await togglGet(`/api/v9/workspaces/${workspaceId}/clients`);

        clientsCache = new Map();
        for (const c of (raw || [])) {
            clientsCache.set(c.id, c.name);
        }
        clientsCacheTs = now;
        console.log(`[Toggl] Cached ${clientsCache.size} clients`);
        return clientsCache;
    } catch (error) {
        if (clientsCache) {
            console.warn(`[Toggl] Failed to refresh clients, using stale cache: ${error.message}`);
            return clientsCache;
        }
        throw error;
    }
}

// ============================================
// Monthly summary — uses Summary API (1 call/month, no pagination)
// ============================================

/**
 * Fetch monthly summary via Summary Reports API.
 * Returns per-user aggregation: hours, projects, clients.
 * Falls back to stale cache if API is unavailable.
 * Deduplicates concurrent requests for the same month.
 */
async function getTogglMonthlySummary(year, month) {
    if (!isTogglConfigured()) return new Map();

    const cacheKey = `${year}-${String(month).padStart(2, '0')}`;

    // Dedup: if another request is already fetching this month, reuse it
    if (inProgressFetches.has(cacheKey)) {
        return inProgressFetches.get(cacheKey);
    }

    const promise = _fetchMonthlySummary(year, month, cacheKey);
    inProgressFetches.set(cacheKey, promise);
    try {
        return await promise;
    } finally {
        inProgressFetches.delete(cacheKey);
    }
}

async function _fetchMonthlySummary(year, month, cacheKey) {
    const now = Date.now();

    // Historical months use 24hr cache, current month uses 5 min
    const currentDate = new Date();
    const isCurrentMonth = (year === currentDate.getFullYear() && month === currentDate.getMonth() + 1);
    const ttl = isCurrentMonth ? SUMMARY_CACHE_TTL : HISTORICAL_CACHE_TTL;

    if (summaryCache[cacheKey] && (now - summaryCache[cacheKey].timestamp < ttl)) {
        return summaryCache[cacheKey].data;
    }

    try {
        const workspaceId = process.env.TOGGL_WORKSPACE_ID;
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // Fetch project/client lookup tables via v9 API (not Reports API — no quota impact)
        const [projects, clients] = await Promise.all([
            getTogglProjects(),
            getTogglClients()
        ]);

        // Summary API: 1 call per month, returns aggregated totals grouped by user→project
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

        // Parse Summary API response: { groups: [{ id: userId, sub_groups: [...] }] }
        const result = new Map();
        const groups = response?.groups || [];

        for (const group of groups) {
            const userId = group.id;
            let totalSeconds = 0;
            let billableSeconds = 0;
            const projectIds = new Set();

            for (const sub of (group.sub_groups || [])) {
                totalSeconds += sub.seconds || 0;
                // billable_seconds may be at sub_group level or inside rates array
                if (sub.billable_seconds != null) {
                    billableSeconds += sub.billable_seconds;
                } else if (sub.rates) {
                    for (const rate of sub.rates) {
                        billableSeconds += rate.billable_seconds || 0;
                    }
                }
                if (sub.id) projectIds.add(sub.id);
            }

            // Resolve project and client names from v9 metadata
            const projectNames = [];
            const clientIds = new Set();
            for (const pid of projectIds) {
                const proj = projects.get(pid);
                if (proj) {
                    projectNames.push(proj.name);
                    if (proj.clientId) clientIds.add(proj.clientId);
                }
            }
            const clientNames = [];
            for (const cid of clientIds) {
                const name = clients.get(cid);
                if (name) clientNames.push(name);
            }

            result.set(userId, {
                totalSeconds,
                billableSeconds,
                projectNames,
                clientNames,
                tagNames: [],
                taskDescriptions: []
            });
        }

        summaryCache[cacheKey] = { data: result, timestamp: Date.now() };
        togglLastRefresh = new Date().toISOString();
        pruneSummaryCache();
        console.log(`[Toggl] Summary for ${cacheKey}: ${result.size} users, ${groups.length} groups`);
        return result;
    } catch (error) {
        if (summaryCache[cacheKey]) {
            console.warn(`[Toggl] Failed to refresh ${cacheKey}, using stale cache: ${error.message}`);
            return summaryCache[cacheKey].data;
        }
        throw error;
    }
}

/**
 * Get Toggl hours + metadata by user for a month (ready for Power BI)
 */
async function getTogglHoursByMonth(year, month) {
    const summary = await getTogglMonthlySummary(year, month);
    const result = new Map();

    for (const [userId, data] of summary) {
        const totalHours = Math.round((data.totalSeconds / 3600) * 100) / 100;
        const billableHours = Math.round((data.billableSeconds / 3600) * 100) / 100;
        const nonBillableHours = Math.round((totalHours - billableHours) * 100) / 100;

        result.set(userId, {
            billableHours,
            nonBillableHours,
            totalHours,
            projects: data.projectNames.join(', ') || null,
            clients: data.clientNames.join(', ') || null,
            tags: data.tagNames.join(', ') || null,
            tasks: data.taskDescriptions.join(', ') || null
        });
    }

    return result;
}

module.exports = { getTogglUsers, getTogglProjects, getTogglClients, getTogglMonthlySummary, getTogglHoursByMonth, getTogglLastRefresh };
