# Toggl Deep Analysis: Revenue & Efficiency Insights
## LA MECHKY — Jul 2024 to Feb 2026 (20 months)

> **Data source:** `/api/powerbi/project-breakdown` endpoint (new)
> **Scope:** 3,103 rows across 17 employees, 349 projects, 47 clients, 20 months

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total tracked hours** | 20,208h |
| **Billable hours** | 9,923h (49.1%) |
| **Non-billable hours** | 10,285h (50.9%) |
| **Target** | 70% billable |
| **Gap to close** | 21 percentage points |

The single biggest finding: **"1065 - Allgemeiner Agentur Kram / Sonstiges" accounts for 5,727 hours (28% of ALL tracked time) and is 100% non-billable.** This one project is the primary reason billable efficiency is stuck below 50%. Understanding what's inside this catch-all bucket — and breaking it into actionable sub-categories — is the #1 lever for improvement.

---

## 1. Where Does Non-Billable Time Go?

Total non-billable: **10,285 hours** over 20 months (514h/month)

| Category | Hours | % of Non-Bill | Type |
|----------|------:|:-------------:|------|
| **1065 - Agentur Kram** (catch-all overhead) | 5,727 | 55.7% | REDUCIBLE |
| **Pause** (break tracking) | 981 | 9.5% | Remove from tracking |
| **No Project** (untagged time) | 682 | 6.6% | NEEDS CATEGORIZATION |
| **LAiter** (internal product) | 337 | 3.3% | Investment |
| **Vertrieb** (sales/BD) | 280 | 2.7% | Investment |
| **Urlaub** (vacation) | 322 | 3.1% | Unavoidable |
| **Krank** (sick leave) | 175 | 1.7% | Unavoidable |
| **Praktikant** (intern training) | 70 | 0.7% | Training cost |
| Other scattered | 1,711 | 16.6% | Mixed |

**Key insight:** 55.7% of all non-billable time is in ONE project. If this is truly all overhead, the question is: what specifically are people doing for 286 hours per month under "Agentur Kram"? Is there billable work hiding in there?

---

## 2. The "Agentur Kram" Problem (5,727 hours)

Every single employee logs time here. It's the default bucket when work doesn't fit elsewhere.

**Per-employee breakdown:**

| Employee | Hours in AK | % of their total time | Avg/month |
|----------|------------:|:---------------------:|----------:|
| Sarah Pier | 937 | 34.0% | 47h |
| Anna Rohowsky | 821 | 32.8% | 41h |
| Fabio D'Orsaneo | 634 | 22.3% | 32h |
| Hacky Hackhausen | 514 | 34.4% | 32h |
| Roberto Blume | 442 | 32.5% | 23h |
| Tom Besselmann | 435 | 23.7% | 22h |
| Julia Laven | 430 | 31.2% | 27h |
| Felix Kett | 429 | 20.5% | 21h |
| Mike Hans | 404 | 27.4% | 34h |
| Jan-Felix Klein | 218 | 74.3% | 31h |
| Emma Adrian-Papworth | 209 | 38.5% | 30h |

**Trend: Agentur Kram is GROWING**
- Jul-Oct 2024: ~178h/month
- Jan-Jun 2025: ~293h/month (+65%)
- Jul-Dec 2025: ~370h/month (+26% more)
- Jan 2026: 368h

This trend is alarming. As the team grows, the "overhead" bucket is growing faster than revenue-generating work.

**Recommendation:** Roberto should break "1065 - Agentur Kram" into specific sub-projects in Toggl:
- Admin/email/meetings (unavoidable overhead)
- Internal process improvement
- Client communication (should this be billable?)
- Creative concepting (should this be billable?)
- Team management/HR
- Learning & development

Even if no hours shift to billable, understanding what's in this bucket enables reducing it.

---

## 3. Pause Tracking (981 hours)

12 employees track their breaks. This inflates total hours and suppresses the billable ratio.

| Employee | Pause hours | Avg/month |
|----------|------------:|----------:|
| Sarah Pier | 244 | 12.2h |
| Julia Laven | 193 | 17.6h |
| Fabio D'Orsaneo | 175 | 8.7h |
| Anna Rohowsky | 152 | 8.4h |
| Mike Hans | 134 | 11.2h |

**Impact:** Removing Pause from the denominator would increase billable ratio from 49.1% to 51.6%.

**Recommendation:** Stop tracking breaks in Toggl, or exclude Pause from efficiency calculations. Break time is legally mandated and not a productivity signal.

---

## 4. Client Revenue Analysis

### Top Revenue Clients (by billable hours)

| Rank | Client | Billable Hours | % of Total |
|------|--------|---------------:|:----------:|
| 1 | No Client (unassigned projects) | 4,713 | 47.5% |
| 2 | Team Service | 2,080 | 21.0% |
| 3 | ETC | 343 | 3.5% |
| 4 | Bruckenkopf-Park | 281 | 2.8% |
| 5 | juwork.julife. | 225 | 2.3% |
| 6 | barnet | 181 | 1.8% |
| 7 | Gissler&Pass | 167 | 1.7% |
| 8 | Herzog (HZGM) | 163 | 1.6% |
| 9 | Pasqualini | 151 | 1.5% |
| 10 | Kontax | 145 | 1.5% |

### Client Concentration Risk

| Metric | Value |
|--------|-------|
| Top 3 clients | 71.9% of all billable hours |
| Top 5 clients | 77.0% |
| Top 10 clients | 85.2% |
| Total clients with billable hours | 44 |

**Critical finding:** 47.5% of billable hours are in "No Client" — these are 226 projects without a client assigned in Toggl. Many are clearly real client work (project IDs, high billable ratios). This means the real client picture is obscured by poor Toggl hygiene.

**Recommendation:** Assign clients to all active Toggl projects. This is a one-time cleanup that dramatically improves data quality.

### High-Efficiency Clients (>90% billable)

| Client | Hours | Billable % |
|--------|------:|:----------:|
| Team Service | 2,198 | 94.6% |
| ETC | 363 | 94.4% |
| Oriental Motor | 140 | 99.8% |
| Clasun | 108 | 99.2% |
| juwork.julife. | 225 | 100% |
| barnet | 184 | 98.3% |
| Kontax | 147 | 98.4% |
| CO_SPACE.DN | 80 | 100% |

These are the model clients — almost all time is billable. Seek more clients like these.

### Low-Efficiency Clients (potential improvement)

| Client | Hours | Billable % | Issue |
|--------|------:|:----------:|-------|
| Peill | 239 | 21.9% | 168h non-billable on SoMe |
| Herzog (HZGM) | 393 | 41.5% | Split across 6 projects, mixed billing |

---

## 5. Employee Performance

### Billable Ratio Ranking

| Employee | Total Hours | Billable | Ratio | Avg hrs/mo | Trend |
|----------|------------:|---------:|:-----:|:----------:|-------|
| Yvonne Bielfeld | 174 | 133 | 76.1% | 29 | (6 months only) |
| Zara Schmittgall | 536 | 365 | 68.2% | 32 | Part-time, strong |
| Kristina Sehl | 73 | 50 | 67.8% | 18 | (4 months only) |
| Felix Kett | 2,090 | 1,316 | 63.0% | 105 | Was 75%+, dropped to ~45% |
| Fabio D'Orsaneo | 2,846 | 1,765 | 62.0% | 142 | Stable ~60-70% |
| Tom Besselmann | 1,835 | 1,069 | 58.2% | 92 | Variable 45-73% |
| Maya Nink | 654 | 353 | 53.9% | 65 | (10 months) |
| Mike Hans | 1,479 | 734 | 49.6% | 123 | Stable ~50% |
| Julia Laven | 1,377 | 655 | 47.5% | 81 | Declining |
| Sarah Pier | 2,756 | 1,294 | 46.9% | 138 | Declining sharply |
| Anna Rohowsky | 2,501 | 1,069 | 42.8% | 125 | Declining |
| Azra Yelmen | 88 | 35 | 40.1% | 7 | Very part-time |
| Roberto Blume | 1,359 | 473 | 34.8% | 68 | COO, expected lower |
| Hacky Hackhausen | 1,497 | 434 | 29.0% | 94 | Business dev role? |
| Emma Adrian-Papworth | 541 | 130 | 24.0% | 77 | 50% in AK/No Project |
| Jan-Felix Klein | 293 | 45 | 15.3% | 42 | 74% in AK (!!) |
| Stefan Wiesen | 108 | 5 | 4.8% | 22 | Admin/non-billable role |

### Concerning Trends

**Sarah Pier** — billable ratio has dropped from 65% (Oct 2024) to 25-27% (late 2025). She's the #1 contributor to Team Service (945 billable hours) but her non-billable time has ballooned. She tracks 12h/month in Pause and 47h/month in Agentur Kram.

**Felix Kett** — was consistently 75-84% billable (Aug 2024-Jun 2025), then dropped to 33-57% (Jul 2025-Feb 2026). Something changed mid-year.

**Anna Rohowsky** — peaked at 67% (Oct 2024), now oscillating 27-51%. Spends 41h/month in Agentur Kram and 8h/month in Pause.

---

## 6. Team Service — The #2 Revenue Driver

"Team Service" is the single most important billable client at 2,080 billable hours (21% of all billable work).

| Employee | Hours | % of Team Service |
|----------|------:|:-----------------:|
| Sarah Pier | 977 | 44.4% |
| Mike Hans | 348 | 15.8% |
| Julia Laven | 292 | 13.3% |
| Felix Kett | 147 | 6.7% |
| Emma Adrian-Papworth | 137 | 6.2% |

**Risk:** Sarah Pier alone drives 44% of this client. If she's unavailable, nearly half the Team Service revenue is at risk.

---

## 7. The "No Client" Data Quality Problem

226 projects with no client assigned account for 5,731 hours of tracked time. Many have clear billable work:
- 73.5% average billable ratio
- 4,713 billable hours hidden behind anonymous project IDs

These projects appear as "Project 208169530", "Project 209862620", etc. They represent real client work that isn't properly attributed.

**Impact:** Without client assignment, Roberto can't answer:
- Which clients are most profitable?
- Which clients need more/fewer resources?
- Where is the revenue pipeline growing?

**Recommendation:** One-time Toggl cleanup — assign all 226 projects to their correct clients.

---

## 8. What-If Scenarios

| Scenario | Action | New Ratio | vs Current |
|----------|--------|:---------:|:----------:|
| **Current state** | — | **49.1%** | — |
| Reduce AK by 30% | Break AK into sub-categories, shift billable work out | **57.6%** | +8.5pp |
| Tag "No Project" | Assume 50% of untagged is billable | **50.8%** | +1.7pp |
| Remove Pause | Stop tracking breaks | **51.6%** | +2.5pp |
| **All three combined** | — | **62.3%** | +13.2pp |

To reach 70%, the team additionally needs to either:
- Acquire more billable work (grow revenue), or
- Reduce headcount on non-billable roles, or
- Shift internal projects (LAiter, Vertrieb) to be partially billable

---

## 9. Monthly Trend

The billable ratio peaked at **71.9% in October 2024** and has been declining since. The lowest point was **34.8% in January 2026**.

```
2024-07  14.1%  (ramp-up month, limited data)
2024-08  58.8%
2024-09  70.7%  ← Peak period
2024-10  71.9%  ← Peak
2024-11  58.9%
2024-12  58.5%
2025-01  52.6%
2025-02  46.0%  ← Decline begins
2025-03  50.1%
2025-04  46.5%
2025-05  50.0%
2025-06  56.3%
2025-07  47.8%
2025-08  41.2%
2025-09  46.0%
2025-10  39.0%  ← Trough
2025-11  47.1%
2025-12  46.5%
2026-01  34.8%  ← New low
2026-02  49.6%  (partial month)
```

**What happened?** The team grew (more people joined in late 2024/early 2025) but the new capacity wasn't fully utilized on billable work. Meanwhile, "Agentur Kram" hours grew from ~178h/mo to ~370h/mo.

---

## 10. Actionable Recommendations

### Immediate (this week)

1. **Break up "1065 - Agentur Kram"** into 5-6 specific sub-projects in Toggl. This alone provides visibility into 5,727 hours of hidden activity.

2. **Assign clients to all Toggl projects.** 226 projects have no client — fix this to understand actual client profitability.

3. **Stop tracking Pause** or exclude it from efficiency calculations. It's not actionable and drags down the ratio.

### Short-term (this month)

4. **Investigate Sarah Pier's decline** — from 65% to 25% billable. She's the #1 Team Service contributor. What shifted?

5. **Investigate Felix Kett's decline** — from 80% to 45% billable. Was consistently top performer.

6. **Review Jan-Felix Klein and Emma Adrian-Papworth** — both spending 74%+ and 38%+ respectively on Agentur Kram. Are they in the right roles? Do they need more client projects?

### Medium-term (this quarter)

7. **Set billable targets per employee** — fill in `targetBillableHoursPerDay` in the Power BI EmployeeConfig table. This activates Page 5 (Expectation vs Reality) in the dashboard.

8. **Diversify client portfolio** — top 3 clients = 72% of revenue. Reduce dependency.

9. **Formalize the Peill relationship** — 239 hours tracked but only 22% billable. Either renegotiate billing or reduce non-billable commitment.

10. **Track "Vertrieb" (sales) ROI** — 280 hours invested. What new clients came from it?

---

## Technical Notes

### New Endpoint

```
GET /api/powerbi/project-breakdown?fromYear=2024&toYear=2026&key=...
```

Returns one row per employee x month x project with:
- `fullName`, `togglUserName`
- `year`, `month`, `monthLabel`, `monthSort`
- `projectName`, `clientName`
- `totalHours`, `billableHours`, `nonBillableHours`, `billableRatio`

### Power BI Integration (optional)

To add this as a second table in Power BI:
1. In the semantic model, add a new query with the project-breakdown URL
2. Create a relationship: `ProjectBreakdown[fullName]` → `EmployeeConfig[fullName]`
3. Build a new page: "Project Deep-Dive" with project/client breakdowns

### Files Created

| File | Purpose |
|------|---------|
| `src/services/togglProjectBreakdown.js` | Service: per-project billable data from Toggl |
| `src/api/endpoints/projectAnalysis.js` | Endpoint: `/api/powerbi/project-breakdown` |
| `src/server.js` | Added 2 lines to register new route |
| `docs/toggl-data-analysis.md` | This analysis document |
