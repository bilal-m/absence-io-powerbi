/**
 * Toggl Track Reports
 *
 * Fetches workspace users, projects, clients, tags, and time entry summaries.
 * Provides monthly billable/non-billable hours per user with project/client metadata.
 */

const { isTogglConfigured, togglGet, togglReportsPost } = require('../togglClient');

// Cache TTLs
const METADATA_CACHE_TTL = 60 * 60 * 1000; // 1 hour for users/projects/clients/tags
const SUMMARY_CACHE_TTL = 5 * 60 * 1000;   // 5 min for monthly data

// Workspace users cache
let usersCache = null;
let usersCacheTs = null;

// Projects cache (id -> { name, clientId })
let projectsCache = null;
let projectsCacheTs = null;

// Clients cache (id -> name)
let clientsCache = null;
let clientsCacheTs = null;

// Tags cache (id -> name)
let tagsCache = null;
let tagsCacheTs = null;

// Monthly summary cache (pruned to max 24 entries)
const summaryCache = {};
const MAX_SUMMARY_CACHE = 24;

function pruneSummaryCache() {
    const keys = Object.keys(summaryCache);
    const now = Date.now();
    for (const key of keys) {
        if (now - summaryCache[key].timestamp >= SUMMARY_CACHE_TTL) delete summaryCache[key];
    }
    const remaining = Object.keys(summaryCache);
    if (remaining.length > MAX_SUMMARY_CACHE) {
        remaining.sort((a, b) => summaryCache[a].timestamp - summaryCache[b].timestamp);
        for (let i = 0; i < remaining.length - MAX_SUMMARY_CACHE; i++) {
            delete summaryCache[remaining[i]];
        }
    }
}

// ============================================
// Metadata fetchers (cached 1 hour)
// ============================================

async function getTogglUsers(forceRefresh = false) {
    if (!isTogglConfigured()) return [];
    const now = Date.now();
    if (!forceRefresh && usersCache && (now - usersCacheTs < METADATA_CACHE_TTL)) return usersCache;

    const workspaceId = process.env.TOGGL_WORKSPACE_ID;
    const raw = await togglGet(`/api/v9/workspaces/${workspaceId}/users`);

    usersCache = raw.map(u => ({
        id: u.id,
        email: (u.email || '').toLowerCase().trim(),
        fullname: u.fullname || u.email || `User ${u.id}`
    }));
    usersCacheTs = now;
    console.log(`[Toggl] Cached ${usersCache.length} workspace users`);
    return usersCache;
}

async function getTogglProjects() {
    if (!isTogglConfigured()) return new Map();
    const now = Date.now();
    if (projectsCache && (now - projectsCacheTs < METADATA_CACHE_TTL)) return projectsCache;

    const workspaceId = process.env.TOGGL_WORKSPACE_ID;
    const raw = await togglGet(`/api/v9/workspaces/${workspaceId}/projects`);

    projectsCache = new Map();
    for (const p of (raw || [])) {
        projectsCache.set(p.id, { name: p.name, clientId: p.client_id || null });
    }
    projectsCacheTs = now;
    console.log(`[Toggl] Cached ${projectsCache.size} projects`);
    return projectsCache;
}

async function getTogglClients() {
    if (!isTogglConfigured()) return new Map();
    const now = Date.now();
    if (clientsCache && (now - clientsCacheTs < METADATA_CACHE_TTL)) return clientsCache;

    const workspaceId = process.env.TOGGL_WORKSPACE_ID;
    const raw = await togglGet(`/api/v9/workspaces/${workspaceId}/clients`);

    clientsCache = new Map();
    for (const c of (raw || [])) {
        clientsCache.set(c.id, c.name);
    }
    clientsCacheTs = now;
    console.log(`[Toggl] Cached ${clientsCache.size} clients`);
    return clientsCache;
}

async function getTogglTags() {
    if (!isTogglConfigured()) return new Map();
    const now = Date.now();
    if (tagsCache && (now - tagsCacheTs < METADATA_CACHE_TTL)) return tagsCache;

    const workspaceId = process.env.TOGGL_WORKSPACE_ID;
    const raw = await togglGet(`/api/v9/workspaces/${workspaceId}/tags`);

    tagsCache = new Map();
    for (const t of (raw || [])) {
        tagsCache.set(t.id, t.name);
    }
    tagsCacheTs = now;
    console.log(`[Toggl] Cached ${tagsCache.size} tags`);
    return tagsCache;
}

// ============================================
// Monthly summary (cached 5 min)
// ============================================

/**
 * Fetch detailed time entries for a month with pagination.
 * Returns per-user aggregation: hours, projects, clients, tags, tasks.
 */
async function getTogglMonthlySummary(year, month) {
    if (!isTogglConfigured()) return new Map();

    const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
    const now = Date.now();
    if (summaryCache[cacheKey] && (now - summaryCache[cacheKey].timestamp < SUMMARY_CACHE_TTL)) {
        return summaryCache[cacheKey].data;
    }

    const workspaceId = process.env.TOGGL_WORKSPACE_ID;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Fetch lookup tables in parallel
    const [projects, clients, tags] = await Promise.all([
        getTogglProjects(),
        getTogglClients(),
        getTogglTags()
    ]);

    // Fetch detailed time entries with pagination, aggregating on-the-fly to save memory
    const userMap = new Map(); // userId -> { totalSeconds, billableSeconds, projectIds, tagIds, taskDescriptions }
    let nextRowNumber = null;
    let totalEntries = 0;
    const maxPages = 20; // Safety limit

    for (let page = 0; page < maxPages; page++) {
        const body = {
            start_date: startDate,
            end_date: endDate,
        };
        if (nextRowNumber !== null) {
            body.first_row_number = nextRowNumber;
        }

        const response = await togglReportsPost(
            `/workspace/${workspaceId}/search/time_entries`,
            body
        );

        if (!Array.isArray(response) || response.length === 0) break;

        // Aggregate each entry immediately instead of buffering
        for (const entry of response) {
            const userId = entry.user_id;
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    totalSeconds: 0,
                    billableSeconds: 0,
                    projectIds: new Set(),
                    tagIds: new Set(),
                    taskDescriptions: new Set()
                });
            }
            const agg = userMap.get(userId);

            const entrySeconds = (entry.time_entries || []).reduce((sum, te) => sum + (te.seconds || 0), 0);
            agg.totalSeconds += entrySeconds;
            if (entry.billable) agg.billableSeconds += entrySeconds;

            if (entry.project_id) agg.projectIds.add(entry.project_id);
            if (entry.tag_ids) {
                for (const tagId of entry.tag_ids) agg.tagIds.add(tagId);
            }
            if (entry.description && entry.description.trim()) {
                agg.taskDescriptions.add(entry.description.trim());
            }
        }
        totalEntries += response.length;

        if (response.length < 50) break;
        nextRowNumber = (nextRowNumber || 1) + response.length;
    }

    // Resolve IDs to names
    const result = new Map();
    for (const [userId, agg] of userMap) {
        const projectNames = [];
        const clientIds = new Set();
        for (const pid of agg.projectIds) {
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
        const tagNames = [];
        for (const tid of agg.tagIds) {
            const name = tags.get(tid);
            if (name) tagNames.push(name);
        }

        result.set(userId, {
            totalSeconds: agg.totalSeconds,
            billableSeconds: agg.billableSeconds,
            projectNames,
            clientNames,
            tagNames,
            taskDescriptions: [...agg.taskDescriptions]
        });
    }

    summaryCache[cacheKey] = { data: result, timestamp: now };
    pruneSummaryCache();
    console.log(`[Toggl] Cached detailed summary for ${cacheKey}: ${result.size} users, ${totalEntries} entries`);
    return result;
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

module.exports = { getTogglUsers, getTogglProjects, getTogglClients, getTogglTags, getTogglMonthlySummary, getTogglHoursByMonth };
