/**
 * Project Analysis Endpoint
 *
 * Returns per-project billable/non-billable hours for each employee per month.
 * One row per employee × month × project — optimized for deep analysis.
 * Matches Toggl users to Absence.io users by email to provide fullName.
 */

const { isTogglConfigured } = require('../togglClient');
const { getTogglUsers } = require('./togglReports');
const { getProjectBreakdown } = require('../../services/togglProjectBreakdown');

// Absence.io user fetcher (reuse existing)
const { getUsers } = require('./users');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * GET /api/powerbi/project-breakdown?fromYear=2024&toYear=2026
 * Returns flat JSON array: one row per employee × month × project
 */
async function getProjectAnalysis(req, res) {
    try {
        if (!isTogglConfigured()) {
            return res.status(503).json({ error: 'Toggl integration is not configured' });
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        let fromYear, toYear;

        if (req.query.year) {
            fromYear = toYear = parseInt(req.query.year);
        } else {
            fromYear = parseInt(req.query.fromYear) || currentYear;
            toYear = parseInt(req.query.toYear) || currentYear;
        }

        if (fromYear < 2020 || toYear > currentYear + 1 || fromYear > toYear) {
            return res.status(400).json({ error: `Invalid year range: ${fromYear}-${toYear}` });
        }

        // Build list of months to fetch
        const months = [];
        for (let y = fromYear; y <= toYear; y++) {
            const maxMonth = (y === currentYear) ? currentMonth : 12;
            for (let m = 1; m <= maxMonth; m++) {
                months.push({ year: y, month: m });
            }
        }

        // Fetch Absence.io users for name matching
        const absenceUsers = await getUsers();
        const absenceByEmail = new Map();
        for (const u of (absenceUsers || [])) {
            const email = (u.email || '').toLowerCase().trim();
            if (email) absenceByEmail.set(email, u);
        }

        // Fetch Toggl users for email lookup
        const togglUsers = await getTogglUsers();
        const togglUserById = new Map();
        for (const tu of togglUsers) {
            togglUserById.set(tu.id, tu);
        }

        // Fetch project breakdowns for all months
        const allRows = [];
        for (const { year, month } of months) {
            try {
                const rows = await getProjectBreakdown(year, month);

                for (const row of rows) {
                    // Match Toggl user to Absence.io user by email
                    const togglEmail = row.togglUserEmail;
                    const absenceUser = togglEmail ? absenceByEmail.get(togglEmail) : null;
                    const fullName = absenceUser?.name || absenceUser?.fullName || row.togglUserName;

                    const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
                    const monthSort = year * 100 + month;

                    allRows.push({
                        fullName,
                        togglUserName: row.togglUserName,
                        year,
                        month,
                        monthLabel,
                        monthSort,
                        projectName: row.projectName,
                        clientName: row.clientName,
                        totalHours: row.totalHours,
                        billableHours: row.billableHours,
                        nonBillableHours: row.nonBillableHours,
                        billableRatio: row.totalHours > 0
                            ? Math.round((row.billableHours / row.totalHours) * 10000) / 100
                            : 0
                    });
                }
            } catch (err) {
                console.warn(`[ProjectAnalysis] No data for ${year}-${month}: ${err.message}`);
            }
        }

        // Sort by monthSort, then fullName, then project
        allRows.sort((a, b) =>
            a.monthSort - b.monthSort ||
            a.fullName.localeCompare(b.fullName) ||
            a.projectName.localeCompare(b.projectName)
        );

        res.set('Cache-Control', 'public, max-age=300');
        res.json(allRows);
    } catch (error) {
        console.error('[ProjectAnalysis] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getProjectAnalysis };
