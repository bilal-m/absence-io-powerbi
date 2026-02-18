/**
 * Power BI Queries v2 — LA MECHKY Leadership Dashboard
 *
 * SETUP (Power BI Web — Semantic Model workflow):
 *   1. Workspace > + New > Semantic model / Get data
 *   2. Choose Blank Query > Advanced Editor
 *   3. Paste the M code for AnnualSummary
 *   4. For EmployeeConfig: use the DAX DATATABLE (see dax-measures.dax or SETUP-GUIDE.md)
 *   5. For DateTable/QuarterlyPattern: use DAX calculated tables (optional)
 *
 * IMPORTANT: Before using these queries, commit and deploy the
 * uncommitted changes (fullName→name, weeklyHours removal, status filter).
 *
 * Replace YOUR-APP-NAME with your Render.com subdomain.
 * Replace YOUR-API-KEY with your actual API key.
 *
 * NOTE: The URL is hardcoded (not built via string concatenation) to avoid
 * the "dynamic data source" limitation in Power BI web Power Query editor.
 */


// ============================================
// QUERY 1: "AnnualSummary" (PRIMARY DATA SOURCE)
// ============================================
// This is the ONLY external data connection needed. Returns all users × all months
// in a flat array. All dashboard pages use this as their source.
// Paste this in the Power Query Advanced Editor.

let
    Source = Json.Document(
        Web.Contents(
            "https://YOUR-APP-NAME.onrender.com/api/powerbi/annual-summary",
            [Query = [
                fromYear = "2024",
                toYear = Number.ToText(Date.Year(DateTime.LocalNow())),
                key = "YOUR-API-KEY-HERE"
            ]]
        )
    ),

    // ── Convert to table ───────────────────────────
    ToTable = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),

    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", {
        "userId", "fullName", "departmentName", "locationName", "teamNames",
        "year", "month", "monthDate", "monthLabel", "monthSort",
        "scheduledHours", "workedHours", "overtimeHours", "absenceDays", "holidayCount",
        "togglBillableHours", "togglNonBillableHours", "togglTotalHours",
        "togglProjects", "togglClients", "togglTags", "togglTasks",
        "togglLastRefresh"
    }),

    // ── Set data types ─────────────────────────────
    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"userId", type text},
        {"fullName", type text},
        {"departmentName", type text},
        {"locationName", type text},
        {"teamNames", type text},
        {"year", Int64.Type},
        {"month", Int64.Type},
        {"monthDate", type date},
        {"monthLabel", type text},
        {"monthSort", Int64.Type},
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
        {"togglTasks", type text},
        {"togglLastRefresh", type datetimezone}
    }),

    // ── Replace nulls with 0 for numeric columns ──
    ReplaceNulls = Table.ReplaceValue(
        Table.ReplaceValue(
            Table.ReplaceValue(
                Table.ReplaceValue(TypedTable,
                    null, 0, Replacer.ReplaceValue, {"togglBillableHours"}),
                null, 0, Replacer.ReplaceValue, {"togglNonBillableHours"}),
            null, 0, Replacer.ReplaceValue, {"togglTotalHours"}),
        null, 0, Replacer.ReplaceValue, {"scheduledHours"}),

    // ── Sort by month ──────────────────────────────
    Sorted = Table.Sort(ReplaceNulls, {{"monthSort", Order.Ascending}})
in
    Sorted


// ============================================
// QUERY 2: "ProjectBreakdown" (PROJECT-LEVEL DATA)
// ============================================
// Per-project billable/non-billable hours for each employee per month.
// One row per employee × month × project — enables client/project analysis.
// Paste this as a second Blank Query in the Power Query editor.
//
// After loading, set monthLabel "Sort by column" → monthSort in the model editor.
// Then create relationship: ProjectBreakdown[fullName] → EmployeeConfig[fullName] (Many-to-One)

let
    Source = Json.Document(
        Web.Contents(
            "https://YOUR-APP-NAME.onrender.com/api/powerbi/project-breakdown",
            [Query = [
                fromYear = "2024",
                toYear = Number.ToText(Date.Year(DateTime.LocalNow())),
                key = "YOUR-API-KEY-HERE"
            ]]
        )
    ),

    // ── Convert to table ───────────────────────────
    ToTable = Table.FromList(Source, Splitter.SplitByNothing(), null, null, ExtraValues.Error),

    Expanded = Table.ExpandRecordColumn(ToTable, "Column1", {
        "fullName", "togglUserName",
        "year", "month", "monthLabel", "monthSort",
        "projectName", "clientName",
        "totalHours", "billableHours", "nonBillableHours", "billableRatio"
    }),

    // ── Set data types ─────────────────────────────
    TypedTable = Table.TransformColumnTypes(Expanded, {
        {"fullName", type text},
        {"togglUserName", type text},
        {"year", Int64.Type},
        {"month", Int64.Type},
        {"monthLabel", type text},
        {"monthSort", Int64.Type},
        {"projectName", type text},
        {"clientName", type text},
        {"totalHours", type number},
        {"billableHours", type number},
        {"nonBillableHours", type number},
        {"billableRatio", type number}
    }),

    // ── Replace nulls ──────────────────────────────
    ReplaceNulls = Table.ReplaceValue(
        Table.ReplaceValue(
            Table.ReplaceValue(
                Table.ReplaceValue(TypedTable,
                    null, 0, Replacer.ReplaceValue, {"totalHours"}),
                null, 0, Replacer.ReplaceValue, {"billableHours"}),
            null, 0, Replacer.ReplaceValue, {"nonBillableHours"}),
        null, 0, Replacer.ReplaceValue, {"billableRatio"}),

    ReplaceNullText = Table.ReplaceValue(
        Table.ReplaceValue(ReplaceNulls,
            null, "No Project", Replacer.ReplaceValue, {"projectName"}),
        null, "No Client", Replacer.ReplaceValue, {"clientName"}),

    // ── Compute monthDate (API does not return it) ──
    AddMonthDate = Table.AddColumn(ReplaceNullText, "monthDate",
        each #date([year], [month], 1), type date),

    // ── Sort by month ──────────────────────────────
    Sorted = Table.Sort(AddMonthDate, {{"monthSort", Order.Ascending}})
in
    Sorted


// ============================================
// TABLE 3: "EmployeeConfig" (DAX CALCULATED TABLE)
// ============================================
// Create this as a DAX calculated table in the semantic model editor,
// NOT as a Power Query. In the model editor:
//   Ribbon > New table > paste the DAX below.
//
// See SETUP-GUIDE.md Step 3 for the full DATATABLE DAX code.
//
// Fields:
//   fullName (text)          — must match API fullName exactly
//   isBillableRole (bool)    — true = measure billable efficiency
//   isFullTime (bool)        — full-time vs part-time
//   isLaMechky (bool)        — true = LA MECHKY entity (false = Herzog/cleaning)
//   targetBillableHoursPerDay (number) — from Roberto's Excel (0 = not yet set)


// ============================================
// OPTIONAL TABLE: "DateTable" (DAX CALCULATED TABLE)
// ============================================
// If you need a proper date dimension for date-axis slicers,
// create this as a DAX calculated table:
//
// DateTable =
// VAR StartDate = DATE(2024, 1, 1)
// VAR EndDate = EOMONTH(TODAY(), 0)
// RETURN
//     ADDCOLUMNS(
//         CALENDAR(StartDate, EndDate),
//         "Year", YEAR([Date]),
//         "Month", MONTH([Date]),
//         "MonthName", FORMAT([Date], "MMM YYYY"),
//         "Quarter", "Q" & FORMAT([Date], "Q"),
//         "MonthSort", YEAR([Date]) * 100 + MONTH([Date]),
//         "IsCurrentMonth", YEAR([Date]) = YEAR(TODAY()) && MONTH([Date]) = MONTH(TODAY()),
//         "MonthStartDate", DATE(YEAR([Date]), MONTH([Date]), 1)
//     )
//
// Then mark it as a Date Table: right-click > Mark as date table


// ============================================
// OPTIONAL TABLE: "QuarterlyPattern" (DAX CALCULATED TABLE)
// ============================================
// Reference table for Roberto's quarterly pattern labels.
// Month 1 of quarter = "Q-Start", Month 2 = "Q-Mid", Month 3 = "Q-Close"
//
// QuarterlyPattern =
// DATATABLE(
//     "month", INTEGER,
//     "quarterPosition", STRING,
//     {
//         {1, "Q-Start"}, {2, "Q-Mid"}, {3, "Q-Close"},
//         {4, "Q-Start"}, {5, "Q-Mid"}, {6, "Q-Close"},
//         {7, "Q-Start"}, {8, "Q-Mid"}, {9, "Q-Close"},
//         {10, "Q-Start"}, {11, "Q-Mid"}, {12, "Q-Close"}
//     }
// )
