/**
 * Power BI Optimized Endpoints
 * Returns data in flat formats optimized for Power BI consumption
 */

const { generateMonthlySummary } = require('../../services/dataTransformer');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Simple in-memory cache (5-min TTL)
let cache = {};
const CACHE_TTL = 5 * 60 * 1000;

/**
 * GET /api/powerbi/annual-summary?fromYear=2024&toYear=2025
 * Also supports: ?year=2025 (single year)
 * Returns a flat JSON array of all users × months for Power BI
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

        // Clamp range to prevent abuse
        if (toYear - fromYear > 5) {
            return res.status(400).json({ error: 'Maximum range is 5 years' });
        }

        const cacheKey = `${fromYear}-${toYear}`;
        if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_TTL)) {
            return res.json(cache[cacheKey].data);
        }

        // Fetch all months for all years in parallel
        const monthPromises = [];
        for (let year = fromYear; year <= toYear; year++) {
            for (let month = 1; month <= 12; month++) {
                monthPromises.push({ year, month, promise: generateMonthlySummary(year, month) });
            }
        }

        const results = await Promise.all(monthPromises.map(m => m.promise));

        // Flatten into a single array
        const rows = [];
        for (let idx = 0; idx < monthPromises.length; idx++) {
            const { year, month } = monthPromises[idx];
            for (const user of results[idx]) {
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
                    holidayCount: user.holidayCount
                });
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
