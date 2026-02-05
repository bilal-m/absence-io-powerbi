# Absence.io Power BI Middleware

A Node.js middleware that connects Power BI to the Absence.io API, enabling visualization of employee scheduling, work hours, absences, holidays, and overtime data.

## Features

- **Hawk Authentication**: Handles Absence.io's authentication automatically
- **Pre-aggregated Data**: Monthly summaries ready for Power BI consumption
- **All Master Data**: Users, departments, locations, teams, reasons
- **Calculated Metrics**:
  - Scheduled Hours (with holidays and absences deducted)
  - Worked Hours (from time entries)
  - Overtime (worked - scheduled)
  - Absence Days count
  - Holiday count

## Quick Start

### For Power BI Web (Recommended)

Since Power BI Web cannot connect to localhost, deploy to Render.com:

1. **Push to GitHub**: Create a private repo and push this code
2. **Deploy to Render**: See [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md)
3. **Connect Power BI Web**: Use your Render URL

### For Local Development

```bash
# Install dependencies
npm install

# Configure API credentials
cp .env.example .env
# Edit .env with your Absence.io API key

# Start server
npm start

# Test
curl http://localhost:3001/health
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/monthly-summary?year=YYYY&month=MM` | **Main endpoint for Power BI** - Pre-aggregated monthly data |
| `GET /api/users` | All employees with department, location, team info |
| `GET /api/absences?startDate=X&endDate=Y` | Absences for date range |
| `GET /api/work-entries?startDate=X&endDate=Y` | Time tracking entries |
| `GET /api/departments` | Department master data |
| `GET /api/locations` | Location master data |
| `GET /api/teams` | Team master data |
| `GET /api/holidays?startDate=X&endDate=Y` | Holidays for date range |
| `GET /api/reasons` | Absence reason types |

## Connecting Power BI

### Step 1: Get Data from Web

1. Open Power BI Desktop
2. Click **Get Data** → **Web**
3. Choose **Advanced**
4. Enter URL: `http://localhost:3001/api/monthly-summary?year=2026&month=1`

### Step 2: Transform Data

In Power Query Editor:
1. Click on the `data` column
2. Click **To Table** → **OK**
3. Click the expand button on the column header
4. Select all fields → **OK**

### Step 3: Create Relationships

Connect these tables:
- `MonthlySummary[departmentId]` → `Departments[id]`
- `MonthlySummary[locationId]` → `Locations[id]`

### Step 4: Create Visuals

Recommended visualizations:
- **Card**: Total Scheduled Hours, Total Worked Hours, Overtime
- **Bar Chart**: Hours by Employee or Department
- **Table**: Detailed employee breakdown
- **Slicers**: Employee, Month, Department, Location, Team

## Example Power Query (M Code)

```m
let
    Source = Json.Document(
        Web.Contents("http://localhost:3001/api/monthly-summary", 
            [Query=[year="2026", month="1"]]
        )
    ),
    data = Source[data],
    ToTable = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", 
        {"userId", "fullName", "departmentName", "locationName", "teamNames",
         "year", "month", "scheduledHours", "workedHours", 
         "absenceDays", "holidayCount", "overtimeHours"}
    )
in
    Expanded
```

## Data Dictionary

### Monthly Summary Fields

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Unique employee ID |
| `fullName` | string | Employee full name |
| `departmentName` | string | Department name |
| `locationName` | string | Location name |
| `teamNames` | array | List of team names |
| `year` | number | Year of data |
| `month` | number | Month (1-12) |
| `scheduledHours` | number | Net scheduled hours (excludes holidays & absences) |
| `workedHours` | number | Total hours from time entries |
| `absenceDays` | number | Number of approved absence days |
| `holidayCount` | number | Number of holidays in the month |
| `overtimeHours` | number | `workedHours - scheduledHours` |

## Calculations Explained

### Scheduled Hours
```
scheduledHours = (workingDaysInMonth × dailyHours) 
                 - (holidayCount × dailyHours)
                 - (absenceDays × dailyHours)
```

Where:
- `workingDaysInMonth` = weekdays in the month (excludes weekends)
- `dailyHours` = weeklyHours ÷ 5
- `holidayCount` = holidays falling on weekdays
- `absenceDays` = approved absences (excluding remote work)

### Overtime
```
overtimeHours = workedHours - scheduledHours
```
- Positive = overtime worked
- Negative = undertime / shortfall

## Troubleshooting

### "Missing API credentials"
Ensure `.env` file exists with valid `ABSENCE_API_ID` and `ABSENCE_API_KEY`.

### "API Error (401)"
Your API credentials are invalid or expired. Generate new ones in Absence.io.

### "No data returned"
Check that:
1. The server is running
2. The year/month parameters are correct
3. There is data in Absence.io for that period

## License

MIT
