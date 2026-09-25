# v141 — Original sale costs and honest operational margins

Evidence date: 2026-09-13. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, with the existing working-tree changes preserved. This is a bounded reporting correction within the continuing whole-platform review. No entire workflow or platform release is certified.

## Finding and correction

The summary and item reports multiplied sold quantities by the item's current catalogue cost. In an owned PostgreSQL fixture, a completed sale for 100 had a recorded stock cost of 20 and a margin of 80. Updating catalogue cost to 75 changed both reports' historical cost to 75 and summary margin to 25 (tool receipt `b48330`). The reproduction succeeded, but its file write failed with EPERM; the retained reproduction receipt records both facts.

`completed-sales-evidence.ts` now reads original SALE stock movements within the same organization and report snapshot. POS references an order; delivery stock issues reference its individual lines. The resolver supports both, groups costs by sale/item, checks location, signed quantity coverage, recorded unit/total cost consistency and explicit source-time provenance, and refuses incomplete or contradictory coverage. It does not substitute today's cost or a fabricated zero. Genuine recorded zero-cost stock issues remain valid. Missing/legacy/partial evidence makes affected costs and margins null; it does not erase otherwise readable sale activity.

Order value includes tax. Margin uses recorded line values minus recorded tax and original stock issue cost. Line totals/tax must reconcile with their order; incompatible legacy totals fail visibly rather than becoming a successful zero-row report. This is current completed/delivered **original sale activity before subsequent returns/credits**, not posted accounting profit, collected cash, a financial statement, or net performance after corrections. Later order status changes can alter this operational cohort. Stored journal and fiscal records are untouched.

The summary and item report read organization, location, sales, original costs and comparison data in RepeatableRead transactions. Date boundaries use the organization's timezone, half-open intervals, and preceding equal calendar days, including daylight-saving transitions. Zero/missing prior values have no percentage comparison. Hour buckets use the same timezone. The public Date input still represents an instant: browser-calendar selection versus a differently located organization's calendar needs a dedicated date-only contract review.

Current PAID payments are separated from pending/cancelled/refunded records. These selected-order payment amounts are explicitly not a cash-flow or reconciliation result. Historical sold items remain visible after catalogue deactivation/deletion. Item trends use real comparison values, and stock-day estimates use the chosen period's day count; no-sales estimates are unavailable.

## Experience and design mapping

The existing `/[locale]/dashboard/analytics/reports` route, authenticated shell, report buttons, calendar, cards and analytics/dashboard tokens are reused. Summary, item and workspace text use `operationalReports` in the existing EN/FR catalogues. The internal-report badge is informational; missing cost evidence uses attention color plus explanatory text. Selecting or viewing a report conveys no approval.

The chart has an equivalent data table behind a shared keyboard-operable button with expanded state. The first native disclosure failed its actual Enter check; the shared button passed that step on the next run. Chart motion is disabled. Search has an accessible label, sort selection has `aria-pressed`, filters wrap, and the calendar displays one month on narrow screens. Failed reads show an alert with retry; stale responses cannot replace the selected organization/date/report. Quick 7/30-day filters now include exactly that many calendar dates.

Responsive shell remounts exposed lost report selection. The selected report and exact date instants now survive remount/refresh in the page URL, with matching server initial props and bounded parsing. This saves read preferences only; it does not bypass authorization. Item-local search/sort persistence and browser/organization date-only semantics remain separate follow-up work.

Shared provenance display localizes standard source/freshness/internal-report meanings, preserves any additional blocker text, and formats timestamps in the report timezone where supplied. Adjacent cashier/cash-flow contents still require their own full localization and metric review.

## What the operator does

1. Open **Operational reports** at `/en/dashboard/analytics/reports` or `/fr/dashboard/analytics/reports`, with `reports.read` in the current organization.
2. Select **Sales and margins** or **Item performance** and a date range. Check scope, currency, source time and the explanation of the metric basis.
3. If a margin is unavailable, ask the inventory operations owner to find the original stock issues for the affected sale/item. POS issues reference the sales-order ID; delivery issues reference the sales-order-line ID. Compare organization, location, quantity, unit cost and total cost with the original sale. The sales/detail and inventory movement records supply those identifiers and amounts.
4. A missing or inconsistent record requires a supported source correction/reconciliation process and its real evidence. Do not edit catalogue prices, insert guessed movements, or relabel historical timestamp provenance to force a margin. Legacy evidence remediation remains a separate controlled task.
5. For a read failure, retry or adjust filters. The failure is not a zero-sales result. For hourly data without using the chart, activate **View hourly values** with the keyboard.

No new approval form, price, provider account or user-supplied signing reference is needed for these read-only changes. The user would need to supply an authorized legacy-evidence owner and the original source records only for an affected tenant's historical reconciliation; this implementation does not fabricate them.

## Review accountability

| Responsibility | Current engineering assessment |
| --- | --- |
| Architecture/backend/API | Shared service-owned evidence resolver, existing action adapters and canonical routes; no second ledger. Legacy analytics service remains separately inventoried. |
| Database/migration | Read-only RepeatableRead; Decimal arithmetic; scoped cost-reference joins. No schema change or migration. Large-history query/load budgeting remains open. |
| Security/IAM/privacy | Existing reports.read and server-derived organization checks retained; foreign locations rejected. Costs follow organization and object references. No credentials in evidence. |
| Frontend/design system | Existing cards, buttons and semantic tokens; evidence states independent of selection and operational success. |
| Workflow/accessibility/localization | EN/FR report content, recoverable failure, stale-response fence and keyboard data alternative. Full screen-reader/contrast/native zoom certification remains open. |
| Product/operations | Historical costs no longer drift with merchandising edits; incomplete evidence is actionable. No financial certification implied. |
| Finance/accounting/internal controls | Tax excluded from margin; original inventory cost evidence and incomplete-group propagation. Not posted/net-after-return profit. No journal mutation. |
| Audit/records | Source tables, checked time and filter reference retained; incompatible source totals stay visible as an error. No fabricated approval/history. |
| Inventory/POS/offline | Read original stock issues only; no admission, replay, retention or sale-commit control changes. |
| Payments/providers | PAID-only selected-order totals; no payment processing, provider access or reconciliation clearance. |
| Statutory/country/close | No statutory rules or signed close evidence supplied; internal report explicitly unapproved for statutory export. |
| Quality/release | Focused tests, owned database and browser evidence; failed attempts preserved. See aggregate verification. |
| SRE/performance/cost | One consistent read snapshot; local readiness observations are development timings, not approved production budgets. |
| Packaging/billing | No commercial change; current report authority retained. No entitlement activation or pricing inferred. |
| Rollout/support | No migration; source rollback must preserve nullable semantics or show reports unavailable. Pilot legacy evidence coverage before broad enablement. |
| HRIS/payroll | Not applicable to this batch: no employee, payroll or compensation records used or changed. |
| Purchasing/AP | Not applicable to this batch: reports consume sale issues, not supplier/payment workflows. |
| AI/agents | Not applicable to this batch: no agent invocation, authority or model-generated evidence. |

## Rollout, recovery and remaining work

Use an authorized isolated cohort first. Inspect actual original-issue coverage and incompatible legacy line/order totals. The patch does not backfill or alter source data. On a report defect, retain source records and failure evidence and restrict the report while repairing the read model; do not revert to catalogue-derived historical profit. No production deploy, live payment, external message, approval fabrication or X1 clearance occurred. Test fixtures create genuine synthetic local sales/postings and separately identified delivery records; report reads are checked for no additional financial effects.

Outstanding engineering: date-only input semantics across browser/organization timezones; organization/location/currency behavior of the unchanged cashier/cash-flow services; cashier unclosed/unknown variance and session-period cohorts; cash-flow opening/closing balances and signs; legacy sales analytics' createdAt/non-cancelled/deleted/payment rules; full net returns/credits and ledger tie-out; large-history bounds/paging; user-readable per-record evidence drill-down; adjacent report EN/FR/accessibility; complete route/module/access inventory. Prior source findings are not external approvals or automatic release blockers. Continue the full workflow register.

Exact command receipts, current hashes, actual screenshots, failed/skipped checks and coverage are in `evidence/report-cost-v141.json` once publication completes. That file, not this narrative, governs verified status.
