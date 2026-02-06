/**
 * Power BI Optimized Endpoints
 *
 * Returns combined Absence.io + Toggl data in flat format for Power BI.
 */

const { generateMonthlySummary } = require('../../services/dataTransformer');
const { isTogglConfigured } = require('../togglClient');
const { getTogglUsers, getTogglHoursByMonth } = require('./togglReports');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// In-memory cache (5-min TTL)
let cache = {};
const CACHE_TTL = 5 * 60 * 1000;

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

        if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_TTL)) {
            return res.json(cache[cacheKey].data);
        }

        // Fetch Toggl users once (cached 1hr internally)
        const togglUsers = togglEnabled ? await getTogglUsers() : [];
        const togglUserByEmail = new Map();
        for (const tu of togglUsers) {
            if (tu.email) togglUserByEmail.set(tu.email, tu);
        }

        // Build month tasks
        const months = [];
        for (let year = fromYear; year <= toYear; year++) {
            for (let month = 1; month <= 12; month++) {
                months.push({ year, month });
            }
        }

        // Fetch Absence.io data in parallel
        const absenceResults = await Promise.all(months.map(m => generateMonthlySummary(m.year, m.month)));

        // Fetch Toggl data sequentially to avoid rate limiting (detailed report API)
        const togglResults = [];
        for (const m of months) {
            togglResults.push(togglEnabled ? await getTogglHoursByMonth(m.year, m.month) : new Map());
        }

        // Flatten into a single array
        const rows = [];
        for (let idx = 0; idx < months.length; idx++) {
            const { year, month } = months[idx];
            const absenceData = absenceResults[idx];
            const togglHours = togglResults[idx];
            const matchedTogglIds = new Set();

            // Absence.io users (enriched with Toggl data)
            for (const user of absenceData) {
                let togglBillableHours = togglEnabled ? 0 : null;
                let togglNonBillableHours = togglEnabled ? 0 : null;
                let togglTotalHours = togglEnabled ? 0 : null;
                let togglProjects = null;
                let togglClients = null;
                let togglTags = null;
                let togglTasks = null;

                if (togglEnabled) {
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
                    weeklyHours: user.weeklyHours,
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
                    togglTasks
                });
            }

            // Toggl-only users (no Absence.io match)
            if (togglEnabled) {
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
                            togglTasks: h.tasks
                        });
                    }
                }
            }
        }

        cache[cacheKey] = { data: rows, timestamp: Date.now() };
        res.json(rows);
    } catch (error) {
        console.error('Error generating annual summary:', error.message);
        res.status(500).json({ error: 'Failed to generate annual summary', details: error.message });
    }
}

module.exports = { getAnnualSummary };
