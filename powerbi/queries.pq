/**
 * Power BI M Query Templates for Workforce Analytics API
 *
 * Replace BASE_URL with your Render.com URL, e.g.:
 * https://workforce-analytics-api.onrender.com
 */

// ============================================
// CONFIGURATION - SET YOUR URL HERE
// ============================================

// Create a Power BI Parameter named "BaseUrl" with your Render URL
// Or replace this directly in each query below:
// 
// Example: "https://absence-io-middleware.onrender.com"

// ============================================
// Query: Annual Summary (Power BI Optimized - RECOMMENDED)
// ============================================
// Returns all users × 12 months in a single flat array.
// Use this as the primary data source for the combo chart.
// In Power BI: Create Dataflow > Blank Query > Paste this M code.

let
    BaseUrl = "https://YOUR-APP-NAME.onrender.com",
    ApiKey = "YOUR-API-KEY-HERE",
    FromYear = "2024",
    ToYear = Number.ToText(Date.Year(DateTime.LocalNow())),

    Source = Json.Document(
        Web.Contents(
            BaseUrl & "/api/powerbi/annual-summary",
            [Query = [fromYear = FromYear, toYear = ToYear, key = ApiKey]]
        )
    ),

    ToTable = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),

    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", {
        "userId", "fullName", "departmentName", "locationName", "teamNames",
        "year", "month", "monthLabel", "monthSort", "weeklyHours",
        "scheduledHours", "workedHours", "overtimeHours", "absenceDays", "holidayCount",
        "togglBillableHours", "togglNonBillableHours", "togglTotalHours",
        "togglProjects", "togglClients", "togglTags", "togglTasks"
    }),

    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"userId", type text},
        {"fullName", type text},
        {"departmentName", type text},
        {"locationName", type text},
        {"teamNames", type text},
        {"year", Int64.Type},
        {"month", Int64.Type},
        {"monthLabel", type text},
        {"monthSort", Int64.Type},
        {"weeklyHours", type number},
        {"scheduledHours", type number},
        {"workedHours", type number},
        {"overtimeHours", type number},
        {"absenceDays", type number},
        {"holidayCount", Int64.Type},
        {"togglBillableHours", type number},
        {"togglNonBillableHours", type number},
        {"togglTotalHours", type number},
        {"togglProjects", type text},
        {"togglClients", type text},
        {"togglTags", type text},
        {"togglTasks", type text}
    }),

    Sorted = Table.Sort(TypedTable, {{"monthSort", Order.Ascending}})
in
    Sorted


// ============================================
// Query: Monthly Summary (Single Month)

let
    // Configuration - replace with your Render.com URL
    BaseUrl = "https://YOUR-APP-NAME.onrender.com",
    
    // Parameters - change these to fetch different months
    Year = "2026",
    Month = "1",
    
    // Fetch data from cloud middleware
    Source = Json.Document(
        Web.Contents(
            BaseUrl & "/api/monthly-summary",
            [Query = [year = Year, month = Month]]
        )
    ),
    
    // Extract the data array
    data = Source[data],
    
    // Convert to table
    ToTable = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    
    // Expand all columns
    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", {
        "userId", "firstName", "lastName", "fullName", "email",
        "departmentId", "departmentName", "locationId", "locationName",
        "teamIds", "teamNames", "year", "month", "weeklyHours",
        "scheduledHours", "workedHours", "absenceDays", "absenceCount",
        "holidayCount", "overtimeHours"
    }),
    
    // Set data types
    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"userId", type text},
        {"firstName", type text},
        {"lastName", type text},
        {"fullName", type text},
        {"email", type text},
        {"departmentId", type text},
        {"departmentName", type text},
        {"locationId", type text},
        {"locationName", type text},
        {"year", Int64.Type},
        {"month", Int64.Type},
        {"weeklyHours", type number},
        {"scheduledHours", type number},
        {"workedHours", type number},
        {"absenceDays", type number},
        {"absenceCount", Int64.Type},
        {"holidayCount", Int64.Type},
        {"overtimeHours", type number}
    })
in
    TypedTable


// ============================================
// Query: Departments
// ============================================

let
    BaseUrl = "https://YOUR-APP-NAME.onrender.com",
    Source = Json.Document(Web.Contents(BaseUrl & "/api/departments")),
    data = Source[data],
    ToTable = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", {"id", "name"}),
    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"id", type text},
        {"name", type text}
    })
in
    TypedTable


// ============================================
// Query: Locations
// ============================================

let
    BaseUrl = "https://YOUR-APP-NAME.onrender.com",
    Source = Json.Document(Web.Contents(BaseUrl & "/api/locations")),
    data = Source[data],
    ToTable = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", {"id", "name", "country", "region"}),
    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"id", type text},
        {"name", type text},
        {"country", type text},
        {"region", type text}
    })
in
    TypedTable


// ============================================
// Query: Teams
// ============================================

let
    BaseUrl = "https://YOUR-APP-NAME.onrender.com",
    Source = Json.Document(Web.Contents(BaseUrl & "/api/teams")),
    data = Source[data],
    ToTable = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", {"id", "name"}),
    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"id", type text},
        {"name", type text}
    })
in
    TypedTable


// ============================================
// Query: Users
// ============================================

let
    BaseUrl = "https://YOUR-APP-NAME.onrender.com",
    Source = Json.Document(Web.Contents(BaseUrl & "/api/users")),
    data = Source[data],
    ToTable = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", {
        "id", "firstName", "lastName", "fullName", "email",
        "departmentId", "departmentName", "locationId", "locationName",
        "teamIds", "weeklyHours", "active"
    }),
    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"id", type text},
        {"firstName", type text},
        {"lastName", type text},
        {"fullName", type text},
        {"email", type text},
        {"departmentId", type text},
        {"departmentName", type text},
        {"locationId", type text},
        {"locationName", type text},
        {"weeklyHours", type number},
        {"active", type logical}
    })
in
    TypedTable


// ============================================
// DAX Measures (Create these in Power BI)
// ============================================

/*
-- Total Scheduled Hours
Total Scheduled Hours = SUM('MonthlySummary'[scheduledHours])

-- Total Worked Hours  
Total Worked Hours = SUM('MonthlySummary'[workedHours])

-- Total Overtime Hours
Total Overtime = SUM('MonthlySummary'[overtimeHours])

-- Total Absences
Total Absences = SUM('MonthlySummary'[absenceDays])

-- Total Holidays
Total Holidays = SUM('MonthlySummary'[holidayCount])

-- Average Utilization (%)
Utilization % = 
    DIVIDE(
        SUM('MonthlySummary'[workedHours]),
        SUM('MonthlySummary'[scheduledHours]),
        0
    ) * 100

-- Overtime Indicator (visual flag)
Has Overtime = 
    IF(SUM('MonthlySummary'[overtimeHours]) > 0, "Yes", "No")
*/
