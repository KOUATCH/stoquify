# P02 — Synthetic cohort expectations

13 October 2026. **All organizations, IDs, counts and dates below are synthetic. No customer activity or measured churn appears here.** Executable fixtures: [retention-fixtures.ts](../../../../services/analytics/__tests__/retention-fixtures.ts). Assertions: [retention-cohorts.test.ts](../../../../services/analytics/__tests__/retention-cohorts.test.ts). Definitions: [METRIC_CONTRACT.md](METRIC_CONTRACT.md).

The established retailer cohort activates at 2026-01-01T00:00:00Z. As-of is 2026-03-26T00:00:00Z (day 84). UTC is an explicit fixture simplification, not a prescribed Cameroon business calendar. Windows are target weeks, half-open and non-cumulative.

| Organization | Synthetic evidence |
|---|---|
| A | HUMAN, complete coverage, five scheduled days; a distinct synthetic sale in every target week. Duplicate `a-sale-week-N` entries within that week still count once. |
| B | HUMAN, complete coverage, five scheduled days; completes work in Week 1 only. Later zeroes are NO_OBSERVED_REPEAT, not inferred churn. |
| C | HUMAN, five scheduled days, MISSING coverage and no events. Unknown for all weeks. |
| D | DEMO, excluded from human adoption despite sample events. |
| E | HUMAN, complete coverage, zero scheduled days for each target week. Not scheduled, separately reported. |

| Week / window UTC | Cohort size | Eligible | Observed | Repeated | No observed repeat | Unknown | Excluded demo | Not scheduled | Conditional observed repeat rate | Missing observation rate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1: Jan 1–Jan 8 | 5 | 3 | 2 | 2 | 0 | 1 | 1 | 1 | 2/2 = 100% | 1/3 |
| 4: Jan 22–Jan 29 | 5 | 3 | 2 | 1 | 1 | 1 | 1 | 1 | 1/2 = 50% | 1/3 |
| 8: Feb 19–Feb 26 | 5 | 3 | 2 | 1 | 1 | 1 | 1 | 1 | 1/2 = 50% | 1/3 |
| 12: Mar 19–Mar 26 | 5 | 3 | 2 | 1 | 1 | 1 | 1 | 1 | 1/2 = 50% | 1/3 |

The observed rates omit C's unknown outcome and therefore cannot be labelled whole-cohort retention. Zero immature/not-activated rows in this established fixture do not remove those columns from the reporting contract.

A **separate recent cohort** activates on March 22 (day 80). At the same March 26 as-of, its Week 1/4/8/12 windows are all immature. Each target-week result is cohort size 1, immature 1, eligible 0, observed 0, repeated 0 and both rates null. A preliminary operation does not make the window mature. Do not combine this recent cohort with the established cohort and call missing future weeks churn.

Additional executable cases cover TEST/AUTOMATED exclusion, unknown provenance, partial coverage despite some events, unknown calendars, absent activation, exact maturity boundary, duplicate organizations, mixed target weeks, invalid evidence and empty denominators.

## Durable-outcome examples

| Input | Expected projection |
|---|---|
| Same sale's COMMITTED row replayed and later COMPLETED receipt state | One completed operation; duplicate diagnostic. |
| CLAIMED registry row with no commit timestamp | Zero completion for that row; unresolved diagnostic. |
| COMMITTED row with missing/invalid timestamp | Excluded with invalid diagnostic. |
| Finalized sale plus refund or void event | Original completion retained plus explicit REVERSED observation; no net-value inference. |
| Correction of sale completed before the selected window | Correction only; no invented in-window sale. |
| Conflicting sale locations/timestamps or conflicting correction identity | Exclude conflicted record(s), report diagnostic. |
| Foreign organization or foreign location in a narrowed scope | Throw; no mixed-tenant report returned. |
| Missing historical actor/demo/job provenance | Role/traffic UNKNOWN, human eligible completed count null. |
| Source query failure or more than 1,000 rows | Explicit failure; never an empty or truncated cohort. |

Successful synthetic checks validate code behavior for these inputs. They do not prove source completeness, persisted uniqueness, deployed authorization, transaction snapshots, real trading calendars or customer value.
