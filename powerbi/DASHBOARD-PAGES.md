# Dashboard Pages — Expanded Layout Guide
## LA MECHKY Leadership Board — All 25 Measures

> This guide expands on [SETUP-GUIDE.md](SETUP-GUIDE.md) Step 8 with detailed layouts
> that use every DAX measure from `dax-measures.dax`.
>
> **Bar vs Column:** In Power BI, "Bar" = horizontal, "Column" = vertical.
> Use **Column** charts when months are on the X-axis (horizontal time axis).
> Use **Bar** charts when categories (names, departments) are on the Y-axis.
>
> **Sorting reminder:** For every chart with `monthDate` on the X-axis, click **...** > **Sort axis** > **monthDate** > **Sort ascending**.

---

## Page 1: Company Health Overview

**Measures used:** `Billable Efficiency %`, `Billable Efficiency % (Billable Roles)`, `Target Efficiency`, `Total Billable Hours`, `Total Non-Billable Hours`, `Active Headcount`, `Total Overtime Hours`, `Total Absence Days`, `Total Holidays`, `Efficiency Change MoM`, `YoY Billable Change %`, `Total Scheduled Hours`, `Last Toggl Refresh`, `Efficiency Color`

### Top row: KPI cards (left to right)

| # | Visual | How to Build |
|---|--------|-------------|
| 1 | **Card** | Value: `Billable Efficiency %`. Conditional format font color: fx > Rules > >=70 green #2ECC71, >=55 orange #F39C12, <55 red #E74C3C |
| 2 | **Card** | Value: `Efficiency Change MoM`. Shows "+3.2" or "-1.5" month-over-month change. Conditional format font color: fx > Rules > >=0 green, <0 red |
| 3 | **Card** | Value: `YoY Billable Change %`. Shows year-over-year delta. Same conditional coloring as above |
| 4 | **Card** | Value: `Active Headcount` |
| 5 | **Card** | Value: `Total Scheduled Hours` |
| 6 | **Card** | Value: `Total Holidays` |

### Middle row: main charts

| # | Visual | How to Build |
|---|--------|-------------|
| 7 | **Gauge** | Value: `Billable Efficiency % (Billable Roles)` > Target: `Target Efficiency`. This shows efficiency for billable staff only (filtered through EmployeeConfig relationship) |
| 8 | **Line Chart** | X-axis: `monthDate` > Y-axis: `Billable Efficiency %`. Add constant line at 70 (Format > Analytics > Constant line > value 70 > color #2ECC71 green, dashed). Sort axis by monthDate ascending |
| 9 | **Stacked Column** | X-axis: `monthDate` > Y-axis: `Total Billable Hours` + `Total Non-Billable Hours`. Colors: `Total Billable Hours` = #2ECC71 green, `Total Non-Billable Hours` = #E74C3C red. Sort axis by monthDate ascending |

### Bottom row: secondary KPIs

| # | Visual | How to Build |
|---|--------|-------------|
| 10 | **Card** | Value: `Total Overtime Hours`. Conditional format: fx > Rules > >50 red, >20 orange, <=20 green |
| 11 | **Card** | Value: `Total Absence Days` |
| 12 | **Card** (small) | Value: `Last Toggl Refresh`. Format as date/time. Place at bottom-right corner — shows data freshness |

### Slicers (place at top of page)

- `year` > **Slicer** (dropdown)
- `departmentName` > **Slicer** (multi-select checklist)
- `EmployeeConfig[isLaMechky]` > **Slicer** (set default to TRUE to hide Herzog/cleaning)
- `EmployeeConfig[isBillableRole]` > **Slicer** (set default to TRUE for billable-only view)

---

## Page 2: Employee Deep-Dive

**Measures used:** `Employee Billable Ratio %`, `Avg Monthly Scheduled Hours`, `Avg Monthly Toggl Hours`, `Has Overtime`, `Total Overtime Hours`, `Total Absence Days`, `Billable Hours Same Month Last Year`, `Efficiency Color`

### Slicer

Add `fullName` as a **Slicer** (single-select dropdown). Place at the top. All visuals on this page react to the selected employee.

Add `year` as a **Slicer** (dropdown) next to it.

### Top row: employee KPI cards

| # | Visual | How to Build |
|---|--------|-------------|
| 1 | **Card** | Value: `Employee Billable Ratio %`. Conditional font color: fx > Rules > >=70 green, >=55 orange, <55 red |
| 2 | **Card** | Value: `Avg Monthly Scheduled Hours`. Shows the employee's average scheduled hours per month |
| 3 | **Card** | Value: `Avg Monthly Toggl Hours`. Shows average tracked hours — compare with scheduled to see tracking compliance |
| 4 | **Card** | Value: `Has Overtime`. Shows "Yes"/"No". Conditional background: fx > Rules > "Yes" = #F39C12 orange |
| 5 | **Card** | Value: `Total Overtime Hours` |
| 6 | **Card** | Value: `Total Absence Days` |

### Middle row: monthly trend charts

| # | Visual | How to Build |
|---|--------|-------------|
| 7 | **Clustered Column** | X-axis: `monthDate` > Y-axis: `scheduledHours` + `workedHours`. Compares what was expected vs what Absence.io recorded. Sort axis by monthDate ascending |
| 8 | **Stacked Column** | X-axis: `monthDate` > Y-axis: `togglBillableHours` + `togglNonBillableHours`. Colors: billable = #2ECC71 green, non-billable = #E74C3C red. Sort axis by monthDate ascending |

### Bottom row: detail table

| # | Visual | How to Build |
|---|--------|-------------|
| 9 | **Table** | Columns: `monthDate`, `scheduledHours`, `workedHours`, `overtimeHours`, `togglBillableHours`, `togglNonBillableHours`, `Billable Hours Same Month Last Year`. Conditional format `togglBillableHours` background: fx > Rules (higher values = greener). This table lets you compare each month side-by-side and see how the same month performed last year |

---

## Page 3: Data Quality & Tracking Compliance

**Measures used:** `Toggl Coverage %`, `Tracking Gap Hours`, `Absence vs Toggl Difference`, `Total Scheduled Hours`, `Total Toggl Hours`, `Total Worked Hours (Absence)`, `Efficiency Color`

### Top row: compliance KPI cards

| # | Visual | How to Build |
|---|--------|-------------|
| 1 | **Card** | Value: `Toggl Coverage %`. Conditional font color: fx > Rules > >=90 green, >=70 orange, <70 red. This is the headline number — "what % of scheduled time is tracked in Toggl?" |
| 2 | **Card** | Value: `Tracking Gap Hours`. Shows total untracked hours across all employees |
| 3 | **Card** | Value: `Total Scheduled Hours`. Context for the gap |
| 4 | **Card** | Value: `Total Toggl Hours`. Context for the gap |

### Middle row: who is tracking well?

| # | Visual | How to Build |
|---|--------|-------------|
| 5 | **Bar Chart** (horizontal) | Y-axis: `fullName` > X-axis: `Toggl Coverage %`. Sort descending by value (...  > Sort axis > Toggl Coverage % > Sort descending). Conditional format bar colors: fx > Rules > >=90 green #2ECC71, >=70 orange #F39C12, <70 red #E74C3C. Long bars = good trackers, short bars = need to track more |
| 6 | **Bar Chart** (horizontal) | Y-axis: `fullName` > X-axis: `Tracking Gap Hours`. Sort descending by value. Color: #E74C3C red. The biggest bars = most untracked hours |

### Bottom row: detail table + system comparison

| # | Visual | How to Build |
|---|--------|-------------|
| 7 | **Table** | Columns: `fullName`, `Total Scheduled Hours`, `Total Worked Hours (Absence)`, `Total Toggl Hours`, `Toggl Coverage %`, `Tracking Gap Hours`, `Absence vs Toggl Difference`. Sort by `Toggl Coverage %` ascending (worst trackers first). Conditional format `Toggl Coverage %` cell background: fx > Rules > >=90 green, >=70 orange, <70 red. Conditional format `Absence vs Toggl Difference` cell background: fx > Rules > between -5 and 5 = green (systems agree), otherwise orange (discrepancy between Absence.io and Toggl) |

### Slicers

- `year` > Slicer (dropdown)
- `EmployeeConfig[isLaMechky]` > Slicer (default TRUE)

---

## Page 4: Department / Team Comparison

**Measures used:** `Dept Billable Efficiency %`, `Dept Overtime Rate %`, `Dept Absence Rate`, `Approx FTE`, `Total Toggl Hours`, `Total Billable Hours`, `Efficiency Color`

### Top row: department KPI card

| # | Visual | How to Build |
|---|--------|-------------|
| 1 | **Card** | Value: `Approx FTE`. Shows approximate full-time equivalents based on scheduled hours (÷160). Gives Roberto a quick headcount-in-hours view |

### Middle row: department comparison charts

| # | Visual | How to Build |
|---|--------|-------------|
| 2 | **Clustered Bar** (horizontal) | Y-axis: `departmentName` > X-axis: `Dept Billable Efficiency %`. Conditional format bar colors: fx > Field value > `Efficiency Color`. Add constant line at 70 (Analytics pane). Shows which departments hit the target |
| 3 | **Clustered Bar** (horizontal) | Y-axis: `departmentName` > X-axis: `Dept Overtime Rate %`. Color: #F39C12 orange. Shows which departments are overworked |
| 4 | **Clustered Bar** (horizontal) | Y-axis: `departmentName` > X-axis: `Dept Absence Rate`. Color: #3498DB blue. Shows absence days per person by department |

### Bottom row: monthly trend by department

| # | Visual | How to Build |
|---|--------|-------------|
| 5 | **Stacked Column** | X-axis: `monthDate` > Y-axis: `Total Toggl Hours` > Legend: `departmentName`. Shows how each department's tracked hours change over time. Sort axis by monthDate ascending |
| 6 | **Line Chart** | X-axis: `monthDate` > Y-axis: `Dept Billable Efficiency %` > Legend: `departmentName`. Shows efficiency trends per department — one line per department. Add constant line at 70 (green dashed). Sort axis by monthDate ascending |

### Slicers

- `year` > Slicer (dropdown)
- `EmployeeConfig[isLaMechky]` > Slicer (default TRUE)

---

## Page 5: Expectation vs Reality (activate after targets are set)

**Measures used:** `Target Billable Hours`, `Billable Hours Gap`, `Total Billable Hours`

> **Note:** This page only works after Roberto fills in `targetBillableHoursPerDay` values in the EmployeeConfig DATATABLE. All targets are currently 0, so these visuals will show blank/zero until updated.

### Layout

| # | Visual | How to Build |
|---|--------|-------------|
| 1 | **Card** | Value: `Target Billable Hours`. Shows the company-wide billable target for the selected period |
| 2 | **Card** | Value: `Total Billable Hours`. Shows what was actually achieved |
| 3 | **Card** | Value: `Billable Hours Gap`. Conditional font color: fx > Rules > >=0 green (ahead of target), <0 red (behind). The key metric — are we hitting Roberto's targets? |
| 4 | **Clustered Column** | X-axis: `monthDate` > Y-axis: `Target Billable Hours` + `Total Billable Hours`. Two bars side by side per month — target vs actual. Colors: target = #95A5A6 grey, actual = #2ECC71 green. Sort axis by monthDate ascending |
| 5 | **Bar Chart** (horizontal) | Y-axis: `fullName` > X-axis: `Billable Hours Gap`. Conditional format bar colors: fx > Rules > >=0 green (ahead), <0 red (behind). Shows per-employee who is ahead/behind target |

### Slicers

- `year` > Slicer
- `EmployeeConfig[isBillableRole]` > Slicer (default TRUE — only show billable roles)

---

## Measure Usage Summary

Every measure from `dax-measures.dax` mapped to its page(s):

| Measure | Page(s) |
|---------|---------|
| Billable Efficiency % | 1 (card, line chart) |
| Billable Efficiency % (Billable Roles) | 1 (gauge) |
| Total Scheduled Hours | 1 (card), 3 (card, table) |
| Total Worked Hours (Absence) | 3 (table) |
| Total Toggl Hours | 1 (card context), 3 (card), 4 (stacked column) |
| Total Billable Hours | 1 (stacked column), 5 (card, clustered column) |
| Total Non-Billable Hours | 1 (stacked column) |
| Total Overtime Hours | 1 (card), 2 (card) |
| Total Absence Days | 1 (card), 2 (card) |
| Total Holidays | 1 (card) |
| Active Headcount | 1 (card) |
| Efficiency Change MoM | 1 (card) |
| Target Billable Hours | 5 (card, clustered column) |
| Billable Hours Gap | 5 (card, bar chart) |
| Billable Hours Same Month Last Year | 2 (table column) |
| YoY Billable Change % | 1 (card) |
| Toggl Coverage % | 3 (card, bar chart, table) |
| Tracking Gap Hours | 3 (card, bar chart, table) |
| Absence vs Toggl Difference | 3 (table) |
| Employee Billable Ratio % | 2 (card) |
| Has Overtime | 2 (card) |
| Avg Monthly Scheduled Hours | 2 (card) |
| Avg Monthly Toggl Hours | 2 (card) |
| Dept Billable Efficiency % | 4 (bar chart, line chart) |
| Dept Overtime Rate % | 4 (bar chart) |
| Dept Absence Rate | 4 (bar chart) |
| Approx FTE | 4 (card) |
| Efficiency Color | 1 (conditional formatting), 4 (bar chart field value) |
| Target Efficiency | 1 (gauge target) |
| Last Toggl Refresh | 1 (card) |

Created DASHBOARD-PAGES.md as a separate file — the original SETUP-GUIDE.md is untouched.

Here's what's in it:
Page 1: Company Health Overview — 12 visuals using 14 measures

6 KPI cards across top (Efficiency %, MoM change, YoY change, Headcount, Scheduled Hours, Holidays)
Gauge with Billable Efficiency % (Billable Roles) targeting 70%
Line chart with 70% constant line
Stacked column (billable vs non-billable)
Bottom cards: Overtime, Absence Days, Last Toggl Refresh (data freshness)
Page 2: Employee Deep-Dive — 9 visuals using 8 measures

Single-select fullName slicer controls the page
Cards: Employee Billable Ratio %, Avg Monthly Scheduled/Toggl Hours, Has Overtime, Overtime Hours, Absence Days
Clustered column: scheduled vs worked
Stacked column: billable vs non-billable
Detail table with Billable Hours Same Month Last Year for comparison
Page 3: Data Quality — 7 visuals using 7 measures

Cards: Toggl Coverage %, Tracking Gap Hours, Scheduled/Toggl totals
Two horizontal bar charts: Coverage % per person and Gap Hours per person
Full detail table with Absence vs Toggl Difference to spot system discrepancies
Page 4: Team Comparison — 6 visuals using 7 measures

Approx FTE card
Three horizontal bars: Dept Efficiency (with Efficiency Color), Dept Overtime Rate, Dept Absence Rate
Stacked column: hours by department over time
Multi-line chart: department efficiency trends
Page 5: Expectation vs Reality — 5 visuals (dormant until targets are set)

Target vs Actual cards and gap
Side-by-side column chart per month
Per-employee gap bar chart
All 25 measures are now mapped. The summary table at the bottom shows exactly where each measure is used.

---

## Page 6: Client & Project Revenue Analysis

> **Data source:** `ProjectBreakdown` table (new query from `/api/powerbi/project-breakdown`)
> **Prerequisite:** Load ProjectBreakdown query, create relationship to EmployeeConfig, add all `Proj *` DAX measures.

**Measures used:** `Proj Billable Ratio %`, `Proj Billable Hours`, `Proj Non-Billable Hours`, `Proj Total Hours`, `Client % Of Billable Hours`, `Active Client Count`, `Active Project Count`, `Proj Billable Color`, `Avg Monthly Project Hours`

### Slicers (top of page, left to right)

| # | Slicer | Configuration |
|---|--------|---------------|
| S1 | `ProjectBreakdown[year]` | Dropdown slicer |
| S2 | `EmployeeConfig[isLaMechky]` | Slicer, default TRUE (hide Herzog/cleaning) |
| S3 | `ProjectBreakdown[clientName]` | Multi-select checklist slicer — allows focusing on specific clients |
| S4 | `EmployeeConfig[isBillableRole]` | Slicer (leave unset by default to see full picture) |

### Top row: KPI cards (left to right)

| # | Visual | How to Build |
|---|--------|-------------|
| 1 | **Card** | Value: `Proj Billable Ratio %`. Conditional format font color: fx > Rules > >=70 green #2ECC71, >=50 orange #F39C12, <50 red #E74C3C |
| 2 | **Card** | Value: `Proj Billable Hours` |
| 3 | **Card** | Value: `Proj Non-Billable Hours`. Conditional format font color: always #E74C3C red (this is the number to reduce) |
| 4 | **Card** | Value: `Active Client Count` |
| 5 | **Card** | Value: `Active Project Count` |

### Middle row: main charts

| # | Visual | How to Build |
|---|--------|-------------|
| 6 | **Bar Chart** (horizontal) | **Title:** "Top Clients by Billable Hours". Y-axis: `ProjectBreakdown[clientName]`. X-axis: `Proj Billable Hours`. Sort descending by value (... > Sort axis > Proj Billable Hours > Sort descending). Show Top N = 15: Visual filters pane > clientName > Top N > Top 15 by `Proj Billable Hours`. Conditional format bar colors: fx > Field value > `Proj Billable Color`. This is the core revenue chart — green bars = high-efficiency clients, red bars = low-efficiency |
| 7 | **Stacked Column** | **Title:** "Monthly Billable vs Non-Billable (All Projects)". X-axis: `ProjectBreakdown[monthDate]`. Y-axis: `Proj Billable Hours` + `Proj Non-Billable Hours`. Colors: Billable = #2ECC71 green, Non-Billable = #E74C3C red. Sort axis by monthDate ascending. Shows the declining billable trend over time |
| 8 | **Bar Chart** (horizontal) | **Title:** "Client Share of Billable Hours (%)". Y-axis: `ProjectBreakdown[clientName]`. X-axis: `Client % Of Billable Hours`. Top N = 10 filter. Color: #3498DB blue. Shows concentration — "No Client" = 47.5%, Team Service = 21% |

### Bottom row: detail table

| # | Visual | How to Build |
|---|--------|-------------|
| 9 | **Table** | Columns: `ProjectBreakdown[clientName]`, `Proj Billable Hours`, `Proj Non-Billable Hours`, `Proj Total Hours`, `Proj Billable Ratio %`, `Client % Of Billable Hours`, `Active Project Count`. Sort by `Proj Total Hours` descending. Conditional format `Proj Billable Ratio %` cell background: fx > Rules > >=80 green #2ECC71, >=50 orange #F39C12, <50 red #E74C3C. Conditional format `Proj Total Hours` data bars: solid fill #3498DB blue. Lets Roberto see every client and quickly spot low-efficiency clients (Peill at 22%, Herzog at 42%) |

---

## Page 7: Non-Billable Deep-Dive

> The "Agentur Kram investigation page" — where do 10,285 non-billable hours go?
> Uses cross-filtering: click a project bar to filter employee and table visuals automatically.

**Measures used:** `Proj Non-Billable Hours`, `Non-Billable % Of Category`, `Proj Total Hours`, `Proj Billable Ratio %`, `Avg Monthly Project Hours`, `Non-Billable MoM Change %`, `Non-Billable Severity Color`

### Slicers (top of page)

| # | Slicer | Configuration |
|---|--------|---------------|
| S1 | `ProjectBreakdown[year]` | Dropdown slicer |
| S2 | `EmployeeConfig[isLaMechky]` | Slicer, default TRUE |
| S3 | `ProjectBreakdown[fullName]` | Multi-select checklist — drill into one employee's non-billable breakdown |

### Top row: KPI cards

| # | Visual | How to Build |
|---|--------|-------------|
| 1 | **Card** | Value: `Proj Non-Billable Hours`. Font color: #E74C3C red |
| 2 | **Card** | Value: `Proj Billable Ratio %`. Conditional format: >=70 green, >=50 orange, <50 red |
| 3 | **Card** | Value: `Non-Billable MoM Change %`. Conditional format font color: fx > Rules > >=0 red (growing = bad), <0 green (shrinking = good) |

### Middle row: main charts

| # | Visual | How to Build |
|---|--------|-------------|
| 4 | **Bar Chart** (horizontal) | **Title:** "Top Non-Billable Projects (Where Does Time Go?)". Y-axis: `ProjectBreakdown[projectName]`. X-axis: `Proj Non-Billable Hours`. Visual filter: `ProjectBreakdown[nonBillableHours]` is greater than 0. Sort descending by `Proj Non-Billable Hours`. Top N = 15 filter on projectName. Conditional format bar colors: fx > Field value > `Non-Billable Severity Color`. Data labels: ON. "1065 - Agentur Kram" shows as a dominant red bar (5,727h) — makes the problem visceral |
| 5 | **Stacked Column** | **Title:** "Non-Billable Hours Over Time (Top 5 Projects)". X-axis: `ProjectBreakdown[monthDate]`. Y-axis: `Proj Non-Billable Hours`. Legend: `ProjectBreakdown[projectName]`. Top N = 5 filter on projectName by `Proj Non-Billable Hours`. Sort axis by monthDate ascending. Shows the GROWTH trend — Agentur Kram growing from 178h/mo to 370h/mo is visually obvious as stacked bars get taller |
| 6 | **Bar Chart** (horizontal) | **Title:** "Non-Billable Hours by Employee". Y-axis: `ProjectBreakdown[fullName]`. X-axis: `Proj Non-Billable Hours`. Sort descending by value. Color: #E74C3C red. Data labels: ON. Shows WHO spends the most non-billable time. Cross-filter: click Agentur Kram in chart #4 to see who contributes to it |

### Bottom row: detail table

| # | Visual | How to Build |
|---|--------|-------------|
| 7 | **Table** | Columns: `ProjectBreakdown[projectName]`, `Proj Non-Billable Hours`, `Non-Billable % Of Category`, `Proj Total Hours`, `Proj Billable Ratio %`, `Avg Monthly Project Hours`. Sort by `Proj Non-Billable Hours` descending. Visual filter: `ProjectBreakdown[nonBillableHours]` is greater than 0. Conditional format `Non-Billable % Of Category` cell background: fx > Rules > >=10 red #E74C3C, >=5 orange #F39C12, <5 green #2ECC71. Conditional format `Proj Billable Ratio %`: =0 red (pure non-billable), >0 and <50 orange, >=50 green. Lets Roberto decide: reducible? investment? should be billable? |

---

## Page 8: Employee x Project Matrix

> Who works on what? Spot single-person dependency risks (e.g., Sarah Pier = 44% of Team Service).
> Select a client in the slicer to see how work is distributed across team members.

**Measures used:** `Proj Billable Hours`, `Proj Total Hours`, `Proj Billable Ratio %`, `Employee % Of Client`, `Employee Project Count`, `Active Client Count`, `Active Project Count`, `Proj Non-Billable Hours`

### Slicers (top of page)

| # | Slicer | Configuration |
|---|--------|---------------|
| S1 | `ProjectBreakdown[year]` | Dropdown slicer |
| S2 | `EmployeeConfig[isLaMechky]` | Slicer, default TRUE |
| S3 | `EmployeeConfig[isBillableRole]` | Slicer (set TRUE to focus on billable roles) |
| S4 | `ProjectBreakdown[clientName]` | Multi-select checklist — select "Team Service" to see its employee distribution |

### Top row: KPI cards

| # | Visual | How to Build |
|---|--------|-------------|
| 1 | **Card** | Value: `Active Client Count` |
| 2 | **Card** | Value: `Active Project Count` |

### Middle row: matrix and dependency chart

| # | Visual | How to Build |
|---|--------|-------------|
| 3 | **Matrix** | Rows: `ProjectBreakdown[fullName]`. Columns: `ProjectBreakdown[clientName]`. Values: `Proj Billable Hours`. Top N = 10 filter on clientName by `Proj Billable Hours` to keep readable. Conditional format cell background on values: fx > Rules > >200 dark green #27AE60, >100 light green #82E0AA, >50 light yellow #F9E79F, >0 white. Row subtotals: ON (total per employee). Column subtotals: ON (total per client). This is the "who works where" matrix — heavy allocations pop out in green |
| 4 | **Bar Chart** (horizontal) | **Title:** "Employee Dependency by Client (%)". Y-axis: `ProjectBreakdown[fullName]`. X-axis: `Employee % Of Client`. Most useful when a specific client is selected in slicer S4. Conditional format bar colors: fx > Rules > >=40 red #E74C3C (single-person dependency), >=25 orange #F39C12, <25 green #2ECC71. Data labels: ON |

### Bottom row: trend and detail

| # | Visual | How to Build |
|---|--------|-------------|
| 5 | **Stacked Column** | **Title:** "Employee Billable Hours by Client Over Time". X-axis: `ProjectBreakdown[monthDate]`. Y-axis: `Proj Billable Hours`. Legend: `ProjectBreakdown[clientName]`. Top N = 5 filter on clientName. Sort axis by monthDate ascending. Shows how client work distribution changes over time. When filtered to one employee via cross-filter from the matrix, shows that employee's client portfolio |
| 6 | **Table** | Columns: `ProjectBreakdown[fullName]`, `ProjectBreakdown[clientName]`, `Proj Billable Hours`, `Proj Non-Billable Hours`, `Proj Billable Ratio %`, `Employee % Of Client`. Sort by `Proj Billable Hours` descending. Conditional format `Employee % Of Client` cell background: fx > Rules > >=40 red (dependency risk), >=25 orange, <25 green |

---

## Project Analysis Measure Usage Summary

| Measure | Page(s) |
|---------|---------|
| Proj Total Hours | 6 (table), 7 (table) |
| Proj Billable Hours | 6 (bar chart, card, table), 8 (matrix, stacked column, table) |
| Proj Non-Billable Hours | 6 (stacked column, card, table), 7 (bar charts, stacked column, card, table), 8 (table) |
| Proj Billable Ratio % | 6 (card, table), 7 (card, table), 8 (table) |
| Proj % Of Company Hours | 6 (available for tooltips) |
| Client % Of Billable Hours | 6 (bar chart, table) |
| Active Project Count | 6 (card, table), 8 (card) |
| Active Client Count | 6 (card), 8 (card) |
| Non-Billable % Of Category | 7 (table) |
| Avg Monthly Project Hours | 7 (table) |
| Non-Billable MoM Change % | 7 (card) |
| Proj Hours MoM Change | (available for tooltips/cards) |
| Employee % Of Client | 8 (bar chart, table) |
| Employee Project Count | 8 (available for tooltips) |
| Proj Billable Color | 6 (bar chart conditional format) |
| Non-Billable Severity Color | 7 (bar chart conditional format) |

---

## Full Page Summary

Page 1: Company Health Overview — 12 visuals using 14 measures (AnnualSummary)
Page 2: Employee Deep-Dive — 9 visuals using 8 measures (AnnualSummary)
Page 3: Data Quality — 7 visuals using 7 measures (AnnualSummary)
Page 4: Team Comparison — 6 visuals using 7 measures (AnnualSummary)
Page 5: Expectation vs Reality — 5 visuals (AnnualSummary, dormant until targets set)
Page 6: Client & Project Revenue — 9 visuals using 9 measures (ProjectBreakdown)
Page 7: Non-Billable Deep-Dive — 7 visuals using 7 measures (ProjectBreakdown)
Page 8: Employee x Project Matrix — 6 visuals using 8 measures (ProjectBreakdown)

All 41 measures (25 original + 16 new) are mapped. 8 pages total.

