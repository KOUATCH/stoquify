# v143 — Legacy analytics isolation and recorded activity

13 September 2026; branch codex/migration-control-plane-release-2026-08-29; commit a05a41ef66cd5d98fd69ae3df18225795f912232 plus preserved worktree changes. [Source-bound evidence](evidence/legacy-analytics-v143.json). This is progress on the full workflow assignment, not a declaration of completion.

## Reproduced and corrected

The legacy cash-reconciliation reader accepted the requested organization but queried only the caller-supplied location. An owned organization-A request with organization-B's location returned B's session. All five legacy readers now validate the active organization and owned location before business reads; summary active-session counts also explicitly constrain organization. Existing server action reports.read and organization authorization remain in force.

| Owned local reproduction | Before | After |
| --- | --- | --- |
| Foreign location in cash reader | One foreign session returned | All five readers reject |
| Uncommitted POS cart | One sale counted | Zero completed sales |
| Open shift | Employee score 90 | No employee score; count remains unknown |
| Change current cost from 20 to 75 after sale at 100 | Historical margin 80% becomes 25% | Original margin remains 80% |
| Sell then void 100 cash | Cash in 0, out 0 | Cash in 100, out 100 |

Sales analytics now uses completed/delivered nondeleted orders by orderDate, organization-calendar buckets, PAID nondeleted tenders and Decimal aggregation. This is current completed-order activity, not net ledger revenue. Subsequent voids remove the order from that current cohort; original cash movements remain available in cash reports.

User and product readers reuse the corrected cashier/item services instead of maintaining a second calculation. Unknown average price for an unsold item remains null. Historical cashier activity is not discarded merely because the user is no longer active. Cash reconciliation reuses scoped movement/count evidence and keeps missing expected amounts nullable.

Legacy action names remain stable. Nullable fields and count/provenance fields have changed; callers must respect them. No current UI caller was found for the legacy user/product/cash action exports in current TS/TSX source. They remain exported compatibility entry points, verified through service/database/action tests. No artificial page was added just to claim a browser visit.

## Source relationships and actual route

Graph hint: graph_actions.json, node analytics_get_sales_analytics_ts, community 61. Current source confirms actions/analytics/get-sales-analytics.ts re-exports getSalesAnalytics.ts, whose authorized actions call sales-analytics.service.ts.

The actual /en/dashboard/analytics and /fr/dashboard/analytics routes call getBusinessPulseCommandReadModel → getDashboardSummaryReadModel → corrected getSalesAnalyticsReadModel. Business pulse's explicit route policy allows reports.read OR dashboard.read. Detailed reports require reports.read. This batch preserves the distinction.

Use the existing Analytics overview to review the current completed-sales figures. Create/complete/void through normal authorized POS services; refresh Analytics to observe the resulting cohort. No extra approval document or user-supplied evidence is needed for these reads.

For a denied location, use a location belonging to the current organization. Administrators obtain site identifiers from the existing location settings; do not substitute another tenant's identifier. For unknown costs/counts, use the source-investigation guidance in CASH_REPORTS_V142.md and REPORT_COST_V141.md.

## Verification and limits

Focused tests cover all five service location denials, all five action permission/organization boundaries, Decimal aggregation, local-midnight grouping, completed-status and paid-tender filters, failed reads versus genuine empty periods, aggregate-location tenant scope and shared report regressions. Owned PostgreSQL reproductions exercise actual POS draft/sale/void records and recorded stock cost.

Browser verification targets actual Business pulse figures for draft → completed → voided sales in EN/FR, responsive screenshots and the documented any-of permission policy. The first browser attempt incorrectly expected dashboard.read alone to be denied; source inspection disproved that test assumption. Exact monetary assertions replace weak substring checks. Final results and retained failed receipt are in the aggregate.

No new UI was created or restyled in this batch. Existing Business pulse remains only partially reviewed: hard-coded XAF currency, server-local week/month and presentation period boundaries, separate period snapshots, hard-coded low-stock threshold and mixed-language generated content require further correction. A passing activity read does not certify those other metrics or the full screen.

No migration, deployment, provider call, live payment, X1 clearance or rejected offline admission change. Only owned test fixtures were mutated; analytics read snapshots preserve the captured sale/inventory/payment/journal/session/drawer/commit state. Default migration-bearing build not invoked; current dev application used.

## Rollout, accountability and next work

Release the service and its return-type changes together through the existing reviewed process. Compare staging examples for own/foreign locations, draft and completed orders, voids, missing counts and catalogue edits. Watch denial/error rates and unavailable values. If rollback is needed, revert this batch's source hunks while preserving unrelated changes; never restore cross-tenant access or claim the former metrics are trustworthy. No financial-data rollback is appropriate.

Platform/backend/data: shared read contracts and repeatable transactions for each bounded reader; whole-summary snapshot still open. Security/privacy: tenant/object checks and current action authority tested; no new exported personal fields. Finance/POS/records: original cost, unsigned cash movements and count evidence preserved; no statutory/ledger certification. Product/UX/localization: actual consumer identified and existing EN/FR visited with limitations above; no unsupported employee ranking. Quality/SRE/release: tests, local database/browser evidence, lint/typecheck and explicit remaining performance scope. API/integration: canonical action entry points retained; return types deliberately make unknown data explicit.

Statutory/country/close: internal activity only; no rule or approval change. Purchasing/AP, HRIS/payroll, billing/packaging, AI/agents, providers and offline admission: not applicable to these read corrections; their workflows remain in the broader register.

Next: complete Business pulse's organization currency/calendar/snapshot and generated EN/FR content, then continue the remaining platform register. Large-history bounds, source completeness and record drill-down remain engineering work. No external decision prevents this next implementation.
