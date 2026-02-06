/**
 * Workforce Analytics API
 *
 * Aggregates data from Absence.io and Toggl Track for Power BI dashboards.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

// API endpoints
const { getUsers, getUserById } = require('./api/endpoints/users');
const { getAbsences, getAbsencesByMonth } = require('./api/endpoints/absences');
const { getTimespans, getTimespansByMonth } = require('./api/endpoints/timespans');
const { getReasons } = require('./api/endpoints/reasons');
const { getDepartments } = require('./api/endpoints/departments');
const { getLocations } = require('./api/endpoints/locations');
const { getTeams, getTeamsForUser } = require('./api/endpoints/teams');
const { getHolidays, getHolidaysByMonth } = require('./api/endpoints/holidays');

// Services
const { generateMonthlySummary, getUserMonthlySummary } = require('./services/dataTransformer');
const { getAnnualSummary } = require('./api/endpoints/powerbi');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// API Key authentication for /api/* routes
app.use('/api', (req, res, next) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return next(); // No key configured = no auth required

    const provided = req.query.key || req.headers['x-api-key'];
    if (provided === apiKey) return next();

    res.status(401).json({ error: 'Unauthorized. Provide API key via ?key= or X-API-Key header.' });
});

// ============================================
// Root - API Documentation
// ============================================

app.get('/', (req, res) => {
    res.json({
        name: 'Workforce Analytics API',
        version: '2.0.0',
        description: 'Aggregates Absence.io and Toggl Track data for Power BI dashboards',
        endpoints: {
            annualSummary: '/api/powerbi/annual-summary?fromYear=YYYY&toYear=YYYY',
            monthlySummary: '/api/monthly-summary?year=YYYY&month=MM',
            togglStatus: '/api/debug/toggl-status',
            health: '/health'
        }
    });
});

// ============================================
// Health Check
// ============================================

app.get('/health', (req, res) => {
    const { isTogglConfigured } = require('./api/togglClient');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        integrations: {
            absenceIo: true,
            toggl: isTogglConfigured()
        }
    });
});

// ============================================
// Monthly Summary (Main endpoint for Power BI)
// ============================================

app.get('/api/monthly-summary', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        const summary = await generateMonthlySummary(year, month);

        res.json({
            year,
            month,
            count: summary.length,
            data: summary
        });
    } catch (error) {
        console.error('Error generating monthly summary:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monthly-summary/:userId', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        const summary = await getUserMonthlySummary(req.params.userId, year, month);

        if (!summary) {
            return res.status(404).json({ error: 'User summary not found' });
        }

        res.json(summary);
    } catch (error) {
        console.error('Error generating user summary:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Power BI Optimized Endpoints
// ============================================

app.get('/api/powerbi/annual-summary', getAnnualSummary);

// ============================================
// Debug Endpoints (for development/testing)
// ============================================

const { fetchAll } = require('./api/absenceClient');
const { calculateScheduleBasedHours, getScheduleSummary } = require('./services/scheduleUtils');

app.get('/api/debug/user-schedule/:lastName', async (req, res) => {
    try {
        const users = await fetchAll('/users', {}, ['departmentId', 'locationId']);
        const user = users.find(u => u.lastName.toLowerCase() === req.params.lastName.toLowerCase());

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const year = parseInt(req.query.year) || 2025;
        const month = parseInt(req.query.month) || 1;

        // Get holiday dates for this user's location
        const { getHolidayDatesForLocation } = require('./api/endpoints/holidays');
        const holidays = await getHolidayDatesForLocation(year, month, user.locationId, user.location?.holidayIds);

        // Calculate scheduled hours using our logic
        const scheduledHours = calculateScheduleBasedHours(user, year, month, holidays.workingDayDates || []);

        res.json({
            user: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                weeklyHours: user.weeklyHours,
                locationId: user.locationId
            },
            rawSchedules: user.schedules,
            scheduleSummary: getScheduleSummary(user),
            calculation: {
                year,
                month,
                holidaysInMonth: holidays.totalCount,
                workingDayHolidays: holidays.workingDayCount,
                holidayDates: (holidays.workingDayDates || []).map(d => d.toISOString().split('T')[0]),
                ourScheduledHours: scheduledHours
            }
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug: Show raw timespans for a user
app.get('/api/debug/timespans/:lastName', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        const users = await getUsers();
        const user = users.find(u => u.lastName.toLowerCase() === req.params.lastName.toLowerCase());

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { getTimespansByMonth } = require('./api/endpoints/timespans');
        const timespans = await getTimespansByMonth(year, month, user.id);

        res.json({
            user: {
                id: user.id,
                name: user.fullName
            },
            year,
            month,
            totalHours: timespans.reduce((sum, ts) => sum + ts.durationHours, 0),
            count: timespans.length,
            timespans: timespans.map(ts => ({
                start: ts.start,
                end: ts.end,
                durationHours: ts.durationHours,
                type: ts.type,
                commentary: ts.commentary
            }))
        });
    } catch (error) {
        console.error('Error in debug timespans endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug: Show all reasons and their classification
app.get('/api/debug/reasons', async (req, res) => {
    try {
        const reasons = await getReasons();
        res.json({
            count: reasons.length,
            reasons: reasons.map(r => ({
                id: r.id,
                name: r.name,
                isAbsence: r.isAbsence,
                isMobileWork: r.isMobileWork,
                isCompensation: r.isCompensation,
                isWorkMarker: r.isWorkMarker
            }))
        });
    } catch (error) {
        console.error('Error in debug reasons endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug: Show raw absences with reason classification
app.get('/api/debug/absences/:lastName', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        const users = await getUsers();
        const user = users.find(u => u.lastName.toLowerCase() === req.params.lastName.toLowerCase());

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const absences = await getAbsencesByMonth(year, month, user.id);
        const reasons = await getReasons();
        const reasonMap = new Map(reasons.map(r => [r.id, r]));

        const absencesWithReasons = absences.map(absence => {
            const reason = reasonMap.get(absence.reasonId);
            return {
                start: absence.start,
                end: absence.end,
                daysCount: absence.daysCount,
                status: absence.status,
                reasonId: absence.reasonId,
                reasonName: reason?.name || 'Unknown',
                reasonType: reason?.type || 'Unknown',
                isMobileWork: reason?.isMobileWork || false,
                isAbsence: reason?.isAbsence || false,
                days: absence.days
            };
        });

        res.json({
            user: {
                id: user.id,
                name: user.fullName
            },
            year,
            month,
            absences: absencesWithReasons
        });
    } catch (error) {
        console.error('Error in debug absences endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug: Toggl connection status
app.get('/api/debug/toggl-status', async (req, res) => {
    const { isTogglConfigured } = require('./api/togglClient');

    if (!isTogglConfigured()) {
        return res.json({ enabled: false, message: 'Set TOGGL_API_TOKEN and TOGGL_WORKSPACE_ID to enable' });
    }

    try {
        const { getTogglUsers, getTogglHoursByMonth } = require('./api/endpoints/togglReports');
        const users = await getTogglUsers(true);
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const hours = await getTogglHoursByMonth(year, month);

        res.json({
            enabled: true,
            workspaceId: process.env.TOGGL_WORKSPACE_ID,
            userCount: users.length,
            users: users.map(u => ({ id: u.id, email: u.email, fullname: u.fullname })),
            summary: {
                year,
                month,
                usersWithHours: hours.size,
                data: Array.from(hours.entries()).map(([id, h]) => ({ togglUserId: id, ...h }))
            }
        });
    } catch (error) {
        res.status(500).json({ enabled: true, error: error.message });
    }
});

// ============================================
// Error handling
// ============================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// Start server
// ============================================

const server = app.listen(PORT, () => {
    const { isTogglConfigured } = require('./api/togglClient');
    console.log('='.repeat(50));
    console.log('Workforce Analytics API');
    console.log('='.repeat(50));
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Integrations: Absence.io [ON]  Toggl Track [${isTogglConfigured() ? 'ON' : 'OFF'}]`);
    console.log('');
    console.log('Key endpoints:');
    console.log(`  GET /api/powerbi/annual-summary  - Combined data for Power BI`);
    console.log(`  GET /api/monthly-summary         - Monthly summary`);
    console.log(`  GET /api/debug/toggl-status      - Toggl connection test`);
    console.log(`  GET /health                      - Health check`);
    console.log('='.repeat(50));
});

// Prevent hung connections on Render free tier
server.timeout = 120000;        // 2 min max request time
server.keepAliveTimeout = 65000; // Slightly above typical LB timeout (60s)

module.exports = app;
