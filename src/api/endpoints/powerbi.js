/**
 * Power BI Optimized Endpoints
 *
 * Returns combined Absence.io + Toggl data in flat format for Power BI.
 */

const { generateMonthlySummary } = require('../../services/dataTransformer');
const { isTogglConfigured } = require('../togglClient');
const { getTogglUsers, getTogglHoursByMonth, getTogglLastRefresh } = require('./togglReports');
const { getUsers } = require('./users');
const { getReasons } = require('./reasons');
const { getDepartments } = require('./departments');
const { getLocations } = require('./locations');
const { getTeams } = require('./teams');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// In-memory cache (5-min TTL, max 10 entries)
let cache = {};
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 10;
const ABSENCE_CONCURRENCY = 3; // Max parallel Absence.io month fetches

function pruneCache() {
    const keys = Object.keys(cache);
    const now = Date.now();
    for (const key of keys) {
        if (now - cache[key].timestamp >= CACHE_TTL) delete cache[key];
    }
    // If still over limit, drop oldest
    const remaining = Object.keys(cache);
    if (remaining.length > MAX_CACHE_ENTRIES) {
        remaining.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
        for (let i = 0; i < remaining.length - MAX_CACHE_ENTRIES; i++) {
            delete cache[remaining[i]];
        }
    }
}

/**
 * GET /api/powerbi/annual-summary?fromYear=2024&toYear=2025
 * Also supports: ?year=2025 (single year)
 * Returns a flat JSON array of all users x months for Power BI
 */
async function getAnnualSummary(req, res) {
    try {
        const currentYear = new Date().getFullYear();
        let fromYear, toYear;

        if (req.query.fromYear || req.query.toYear) {
            fromYear = parseInt(req.query.fromYear) || currentYear;
            toYear = parseInt(req.query.toYear) || currentYear;
        } else {
            const year = parseInt(req.query.year) || currentYear;
            fromYear = year;
            toYear = year;
        }

        if (toYear - fromYear > 5) {
            return res.status(400).json({ error: 'Maximum range is 5 years' });
        }

        const togglEnabled = isTogglConfigured();
        const cacheKey = `${fromYear}-${toYear}${togglEnabled ? '-toggl' : ''}`;

        res.set('Cache-Control', 'public, max-age=300'); // 5 min browser/Power BI cache

        if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_TTL)) {
            return res.json(cache[cacheKey].data);
        }

        // Build month tasks (only up to current month to avoid empty future data)
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const months = [];
        for (let year = fromYear; year <= toYear; year++) {
            const maxMonth = (year === currentYear) ? currentMonth : 12;
            for (let month = 1; month <= maxMonth; month++) {
                months.push({ year, month });
            }
        }

        // Pre-fetch shared metadata once (avoids redundant API calls across months)
        const [users, reasons, departments, locations, teams] = await Promise.all([
            getUsers(), getReasons(), getDepartments(), getLocations(), getTeams()
        ]);
        const sharedData = { users, reasons, departments, locations, teams };

        // Fetch Absence.io data in batches to limit memory on Render free tier
        const absenceResults = [];
        for (let i = 0; i < months.length; i += ABSENCE_CONCURRENCY) {
            const batch = months.slice(i, i + ABSENCE_CONCURRENCY);
            const results = await Promise.all(batch.map(m => generateMonthlySummary(m.year, m.month, sharedData)));
            absenceResults.push(...results);
        }

        // Fetch Toggl data (graceful degradation — if Toggl fails, return data without it)
        let togglUsers = [];
        const togglUserByEmail = new Map();
        const togglResults = [];
        let togglAvailable = togglEnabled;

        if (togglEnabled) {
            try {
                togglUsers = await getTogglUsers();
                for (const tu of togglUsers) {
                    if (tu.email) togglUserByEmail.set(tu.email, tu);
                }
                // Fetch sequentially; per-month errors return empty Map (partial data > no data)
                for (const m of months) {
                    try {
                        togglResults.push(await getTogglHoursByMonth(m.year, m.month));
                    } catch (monthError) {
                        console.warn(`[Toggl] No data for ${m.year}-${m.month}: ${monthError.message}`);
                        togglResults.push(new Map());
                    }
                }
            } catch (togglError) {
                console.warn(`[Toggl] Failed to initialize Toggl: ${togglError.message}`);
                togglAvailable = false;
                togglResults.length = 0;
            }
        }

        // Fill empty Toggl results if Toggl failed or disabled
        while (togglResults.length < months.length) {
            togglResults.push(new Map());
        }

        // Flatten into a single array
        const togglRefreshTime = togglAvailable ? (getTogglLastRefresh() || null) : null;
        const rows = [];
        for (let idx = 0; idx < months.length; idx++) {
            const { year, month } = months[idx];
            const absenceData = absenceResults[idx];
            const togglHours = togglResults[idx];
            const matchedTogglIds = new Set();

            // Absence.io users (enriched with Toggl data)
            for (const user of absenceData) {
                let togglBillableHours = togglAvailable ? 0 : null;
                let togglNonBillableHours = togglAvailable ? 0 : null;
                let togglTotalHours = togglAvailable ? 0 : null;
                let togglProjects = null;
                let togglClients = null;
                let togglTags = null;
                let togglTasks = null;

                if (togglAvailable) {
                    const email = (user.email || '').toLowerCase().trim();
                    const togglUser = email ? togglUserByEmail.get(email) : null;

                    if (togglUser && togglHours.has(togglUser.id)) {
                        const h = togglHours.get(togglUser.id);
                        togglBillableHours = h.billableHours;
                        togglNonBillableHours = h.nonBillableHours;
                        togglTotalHours = h.totalHours;
                        togglProjects = h.projects;
                        togglClients = h.clients;
                        togglTags = h.tags;
                        togglTasks = h.tasks;
                        matchedTogglIds.add(togglUser.id);
                    }
                }

                rows.push({
                    userId: user.userId,
                    fullName: user.fullName,
                    departmentName: user.departmentName,
                    locationName: user.locationName,
                    teamNames: (user.teamNames || []).join(', '),
                    year,
                    month,
                    monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
                    monthSort: year * 100 + month,
                    weeklyHours: user.weeklyHours || 0,
                    scheduledHours: user.scheduledHours,
                    workedHours: user.workedHours,
                    overtimeHours: user.overtimeHours,
                    absenceDays: user.absenceDays,
                    holidayCount: user.holidayCount,
                    togglBillableHours,
                    togglNonBillableHours,
                    togglTotalHours,
                    togglProjects,
                    togglClients,
                    togglTags,
                    togglTasks,
                    togglLastRefresh: togglRefreshTime
                });
            }

            // Toggl-only users (no Absence.io match)
            if (togglAvailable) {
                for (const [togglUserId, h] of togglHours) {
                    if (!matchedTogglIds.has(togglUserId)) {
                        const tu = togglUsers.find(u => u.id === togglUserId);
                        rows.push({
                            userId: `toggl-${togglUserId}`,
                            fullName: tu ? tu.fullname : `Toggl User ${togglUserId}`,
                            departmentName: null,
                            locationName: null,
                            teamNames: null,
                            year,
                            month,
                            monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
                            monthSort: year * 100 + month,
                            weeklyHours: 0,
                            scheduledHours: 0,
                            workedHours: 0,
                            overtimeHours: 0,
                            absenceDays: 0,
                            holidayCount: 0,
                            togglBillableHours: h.billableHours,
                            togglNonBillableHours: h.nonBillableHours,
                            togglTotalHours: h.totalHours,
                            togglProjects: h.projects,
                            togglClients: h.clients,
                            togglTags: h.tags,
                            togglTasks: h.tasks,
                            togglLastRefresh: togglRefreshTime
                        });
                    }
                }
            }
        }

        // Only cache complete responses (skip if Toggl was configured but failed)
        if (!togglEnabled || togglAvailable) {
            cache[cacheKey] = { data: rows, timestamp: Date.now() };
            pruneCache();
        }
        res.json(rows);
    } catch (error) {
        console.error('Error generating annual summary:', error.message);
        res.status(500).json({ error: 'Failed to generate annual summary', details: error.message });
    }
}

module.exports = { getAnnualSummary };
