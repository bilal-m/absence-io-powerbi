/**
 * Power BI Optimized Endpoints
 * Returns data in flat formats optimized for Power BI consumption
 */

const { generateMonthlySummary } = require('../../services/dataTransformer');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Simple in-memory cache (5-min TTL)
let annualCache = {};
const CACHE_TTL = 5 * 60 * 1000;

/**
 * GET /api/powerbi/annual-summary?year=2025
 * Returns a flat JSON array of all users × 12 months for Power BI
 */
async function getAnnualSummary(req, res) {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        // Check cache
        const cacheKey = `${year}`;
        if (annualCache[cacheKey] && (Date.now() - annualCache[cacheKey].timestamp < CACHE_TTL)) {
            return res.json(annualCache[cacheKey].data);
        }

        // Fetch all 12 months in parallel
        const monthPromises = [];
        for (let month = 1; month <= 12; month++) {
            monthPromises.push(generateMonthlySummary(year, month));
        }
        const allMonths = await Promise.all(monthPromises);

        // Flatten into a single array with Power BI-friendly format
        const rows = [];
        for (let i = 0; i < 12; i++) {
            for (const user of allMonths[i]) {
                rows.push({
                    userId: user.userId,
                    fullName: user.fullName,
                    departmentName: user.departmentName,
                    locationName: user.locationName,
                    teamNames: (user.teamNames || []).join(', '),
                    year: user.year,
                    month: user.month,
                    monthLabel: `${MONTH_NAMES[i]} ${year}`,
                    weeklyHours: user.weeklyHours,
                    scheduledHours: user.scheduledHours,
                    workedHours: user.workedHours,
                    overtimeHours: user.overtimeHours,
                    absenceDays: user.absenceDays,
                    holidayCount: user.holidayCount
                });
            }
        }

        // Cache result
        annualCache[cacheKey] = { data: rows, timestamp: Date.now() };

        res.json(rows);
    } catch (error) {
        console.error('Error generating annual summary:', error.message);
        res.status(500).json({ error: 'Failed to generate annual summary', details: error.message });
    }
}

module.exports = { getAnnualSummary };
