# Workforce Analytics API

A Node.js middleware that aggregates data from **Absence.io** and **Toggl Track** for Power BI dashboards. Provides pre-calculated monthly summaries of scheduled hours, worked hours, overtime, absences, holidays, and billable/non-billable time.

## Features

- **Absence.io Integration**: Scheduled hours, absences, holidays, overtime from Absence.io
- **Toggl Track Integration** (optional): Billable/non-billable hours, projects, and clients from Toggl
- **User Matching**: Automatically matches Absence.io and Toggl users by email
- **Power BI Optimized**: Flat JSON arrays ready for direct consumption
- **API Key Auth**: All `/api/*` routes secured via `?key=` or `X-API-Key` header
- **Deployed on Render.com**: See [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md)

## Quick Start

### Local Development

```bash
npm install

cp .env.example .env
# Edit .env with your credentials

npm run dev

# Test
curl http://localhost:3001/health
```

### Deploy to Render.com

See [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md) for step-by-step deployment instructions.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ABSENCE_API_ID` | Yes | Absence.io API Key ID |
| `ABSENCE_API_KEY` | Yes | Absence.io API Key Secret |
| `API_KEY` | Recommended | API key for securing endpoints |
| `PORT` | No | Server port (default: 3001) |
| `DEFAULT_WEEKLY_HOURS` | No | Fallback weekly hours (default: 40) |
| `TOGGL_API_TOKEN` | No | Toggl Track API token (enables Toggl integration) |
| `TOGGL_WORKSPACE_ID` | No | Toggl workspace ID |

Toggl integration is optional. If `TOGGL_API_TOKEN` and `TOGGL_WORKSPACE_ID` are not set, the API returns Absence.io data only (Toggl fields will be `null`).

## API Endpoints

All `/api/*` endpoints require authentication: append `?key=YOUR_KEY` or send `X-API-Key: YOUR_KEY` header.

### Power BI Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/powerbi/annual-summary?fromYear=YYYY&toYear=YYYY` | **Primary endpoint** - Combined Absence.io + Toggl data, flat array |
| `GET /api/monthly-summary?year=YYYY&month=MM` | Single month summary (Absence.io only) |
| `GET /api/monthly-summary/:userId?year=YYYY&month=MM` | Single user monthly summary |

### Master Data

| Endpoint | Description |
|----------|-------------|
| `GET /api/users` | Employees with department, location, team info |
| `GET /api/departments` | Departments |
| `GET /api/locations` | Locations |
| `GET /api/teams` | Teams |
| `GET /api/reasons` | Absence reason types |

### Raw Data

| Endpoint | Description |
|----------|-------------|
| `GET /api/absences?startDate=X&endDate=Y` | Absences for date range |
| `GET /api/work-entries?startDate=X&endDate=Y` | Time tracking entries |
| `GET /api/holidays?startDate=X&endDate=Y` | Holidays for date range |

### Debug / Health

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check with integration status |
| `GET /api/debug/toggl-status?year=YYYY&month=MM` | Toggl connection test and sample data |
| `GET /api/debug/reasons` | Absence reasons with classification |
| `GET /api/debug/user-schedule/:lastName?year=YYYY&month=MM` | Schedule debug for a user |
| `GET /api/debug/absences/:lastName?year=YYYY&month=MM` | Absence debug for a user |
| `GET /api/debug/timespans/:lastName?year=YYYY&month=MM` | Timespan debug for a user |

## Connecting Power BI

### Recommended: Annual Summary Endpoint

1. In Power BI, go to **Get Data** > **Web**
2. Choose **Advanced** and enter:
   ```
   https://YOUR-APP.onrender.com/api/powerbi/annual-summary?fromYear=2024&toYear=2026&key=YOUR_KEY
   ```
3. The response is a flat JSON array — Power BI will auto-detect columns

### Using Power Query (M Code)

Copy the template from [powerbi/queries.pq](powerbi/queries.pq) into Power BI's Advanced Editor. Replace `BaseUrl` and `ApiKey` with your values.

## Data Dictionary

### Annual Summary Fields

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Absence.io user ID (or `toggl-{id}` for Toggl-only users) |
| `fullName` | string | Employee full name |
| `departmentName` | string | Department name (from Absence.io) |
| `locationName` | string | Location name (from Absence.io) |
| `teamNames` | string | Comma-separated team names |
| `year` | number | Year |
| `month` | number | Month (1-12) |
| `monthLabel` | string | e.g. "Jan 2025" |
| `monthSort` | number | Sortable year-month (e.g. 202501) |
| `weeklyHours` | number | Contracted weekly hours |
| `scheduledHours` | number | Net scheduled hours (excludes holidays and absences) |
| `workedHours` | number | Worked hours from Absence.io time entries |
| `overtimeHours` | number | `workedHours - scheduledHours` |
| `absenceDays` | number | Approved absence days |
| `holidayCount` | number | Holidays in the month |
| `togglBillableHours` | number/null | Billable hours from Toggl (`null` if Toggl disabled) |
| `togglNonBillableHours` | number/null | Non-billable hours from Toggl |
| `togglTotalHours` | number/null | Total tracked hours from Toggl |
| `togglProjects` | string/null | Comma-separated Toggl project names |
| `togglClients` | string/null | Comma-separated Toggl client names |
| `togglTags` | string/null | Reserved (currently null) |
| `togglTasks` | string/null | Reserved (currently null) |
| `togglLastRefresh` | datetime/null | Last Toggl data refresh timestamp |

### Toggl User Matching

Users are matched between Absence.io and Toggl by **email address** (case-insensitive). If a Toggl user has no matching Absence.io user, they appear as a separate row with `userId: "toggl-{id}"` and Absence.io fields set to 0/null.

## Calculations

### Scheduled Hours

```
scheduledHours = (workingDaysInMonth x dailyHours)
               - (holidayCount x dailyHours)
               - (absenceDays x dailyHours)
```

Where:
- `workingDaysInMonth` = weekdays in the month (Mon-Fri)
- `dailyHours` = weeklyHours / 5
- `holidayCount` = holidays falling on weekdays
- `absenceDays` = approved absences (excluding remote work)

### Overtime

```
overtimeHours = workedHours - scheduledHours
```

- Positive = overtime worked
- Negative = undertime / shortfall

## Architecture

```
src/
  server.js                    # Express server, routes, middleware
  api/
    absenceClient.js           # Absence.io HTTP client (Hawk auth)
    togglClient.js             # Toggl HTTP client (Basic auth, circuit breaker)
    endpoints/
      powerbi.js               # /api/powerbi/annual-summary (main endpoint)
      users.js                 # Absence.io users
      absences.js              # Absence.io absences
      timespans.js             # Absence.io time entries
      holidays.js              # Absence.io holidays
      departments.js           # Absence.io departments
      locations.js             # Absence.io locations
      teams.js                 # Absence.io teams
      reasons.js               # Absence.io absence reasons
      togglReports.js          # Toggl users, projects, clients, monthly summaries
  services/
    dataTransformer.js         # Monthly summary aggregation
    scheduleUtils.js           # Schedule-based hours calculation
powerbi/
  queries.pq                   # Power Query M code templates
docs/
  DEPLOY_RENDER.md             # Render.com deployment guide
```

## Performance

- **Shared metadata**: Users, departments, locations, teams, and reasons are fetched once per request and shared across all monthly calculations
- **Toggl Summary API**: Uses 1 API call per month instead of paginated search (minimizes quota usage)
- **Circuit breaker**: Toggl Reports API backs off for 15 minutes on quota exhaustion (402), while metadata calls continue working
- **Graceful degradation**: If Toggl fails, Absence.io data is still returned (Toggl fields become `null`)
- **Response caching**: 5-minute in-memory cache on the annual-summary endpoint; `Cache-Control: max-age=300` header for browser/Power BI caching

## Troubleshooting

### "Unauthorized"
Ensure you're passing the API key via `?key=YOUR_KEY` or `X-API-Key` header.

### "Missing API credentials"
Ensure `.env` file exists with valid `ABSENCE_API_ID` and `ABSENCE_API_KEY`.

### "API Error (401)"
Your Absence.io credentials are invalid or expired. Generate new ones in Absence.io > Profile > Integrations.

### "Toggl Reports circuit breaker open"
Toggl API quota is exhausted. The circuit breaker will automatically retry after 15 minutes.

### "No data returned"
1. Check the server is running
2. Verify year/month parameters are correct
3. Confirm data exists in Absence.io/Toggl for that period

### Render free tier slow response
Free tier services spin down after 15 min of inactivity. First request after spin-down takes 30-60 seconds.

## License

MIT
