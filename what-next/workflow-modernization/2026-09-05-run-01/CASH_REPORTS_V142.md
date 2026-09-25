# v142 — Cash movements and closing evidence

Evidence date: 13 September 2026. Branch: codex/migration-control-plane-release-2026-08-29. Commit: a05a41ef66cd5d98fd69ae3df18225795f912232 plus preserved working changes. Current source hashes, commands and receipts: [verification](evidence/cash-reports-v142.json). The whole-platform assignment remains open.

## Delivered behavior and reasons

The existing authenticated operational reports now distinguish cashier activity, cash movement and whole-shift closing counts. No new shell, financial writer, schema, entitlement or approval path was introduced.

| Reproduced defect | Correction and user benefit |
| --- | --- |
| An active, uncounted shift received score 100 and variance zero | Open counts remain unavailable. Removed unsupported employee scores and productivity ratings from this report. |
| A 100-unit sale closed at 100 showed net flow zero | Closing cash is a count, not an outflow. Correct operating net is 100. Opening floats and reconciliation entries are separately excluded. |
| A fully voided 100-unit sale showed 200 cash in | POS RETURN is an unsigned cash outflow. Correct receipt 100, return 100, net zero. |
| Positive and negative variances could cancel and look healthy | Show signed net difference and sum of absolute differences; no invented tolerance or performance threshold. |
| Session-start filtering omitted overlapping shifts and used lifetime counters | Read overlapping shifts, period-filtered completed/delivered orders and period-clipped elapsed hours. Elapsed time explicitly does not measure work time. |
| Missing expected balance appeared as zero | Keep unknown expected/count/variance nullable; require coherent closure records before aggregating differences. |
| Cash reports used server-local dates and lacked service-level location validation | Reuse the shared active-organization, owned-location, organization-calendar contract and a repeatable database snapshot. |

Cash direction validation checks unsigned amounts against recorded before/after balances. Inconsistent movement evidence makes complete aggregate totals unavailable; inconsistent days and subsequent cumulative movement are unavailable too. Genuine empty periods still return zero operating flow. Query failures propagate to the existing error/retry interface.

Count statuses are OPEN, RECORDED within the selected period, OUTSIDE_PERIOD, and INCONSISTENT. Closed counts require expected/count/variance agreement, one matching closing transaction and matching terminal/location. Whole-shift count differences are separate from part-period activity. These consistency checks do not authenticate a signature or independently approve a reconciliation.

The shared count list shows all returned sessions, signed shortage/overage and recorded closing time. Replaced misleading performance/running-balance charts with directly readable totals and daily records. The cumulative figure starts at zero and is expressly a period movement, not a continuous drawer balance.

## Application routes and use

- /en/dashboard/analytics/reports?report=cashier
- /fr/dashboard/analytics/reports?report=cashier
- /en/dashboard/analytics/reports?report=cashflow
- /fr/dashboard/analytics/reports?report=cashflow

Use an existing account with reports.read for its organization. Select the site and date range, then choose Cashier activity or Cash flow. Report/date selection survives refresh. A failed read shows an error and Retry; it does not show successful empty totals.

For an open shift, the original cashier completes the existing POS closing workflow and supplies the actual drawer count and required explanation for a difference. Obtain expected cash from the recorded shift/drawer operations, not a manually invented approval reference. Refresh the report after closing.

For inconsistent evidence, an authorized operations/finance reviewer needs the session number, selected period/site, original opening/closing rows and relevant cash movements. These come from retained POS session/drawer records and the existing authorized operational review process. Investigate the source discrepancy; do not edit historical rows merely to make the report pass. No additional information is needed from the user to run these report screens.

## Design and verification

Reused authenticated dashboard shell, analytics panel/row components and semantic tokens. Information and recorded counts use info treatment; inconsistent records and nonzero count differences use attention with text/icons. A recorded count is never presented as employee quality or approval. Both reports are localized through operationalReports in EN/FR.

Seven focused suites / 60 tests passed, covering classification, count consistency, variance cancellation, calendar/scope, authorization, query failure, summary/item regressions and report request/recovery behavior. Typecheck and changed TypeScript lint passed; exact receipts are in the aggregate.

Seven owned PostgreSQL cases passed with actual synthetic POS sale/void/close services and isolated incomplete-evidence records. Reads preserved the captured sale, inventory levels, payments/refunds, journals, session, drawer and commit-result state. This snapshot does not enumerate every database table; test setup intentionally changes synthetic evidence to exercise corruption.

Actual authenticated EN/FR browsers passed: active shift unknown count, signed shortage, closing count excluded from operating flow, keyboard report selection, 1440/768/320 widths, enlarged text, failed action/retry, inconsistent source warning, refresh preservation and revoked report permission. Fourteen screenshots are retained. Visually inspected EN cashier desktop, FR cash-flow mobile and FR 200% text. Text reflows; extreme narrow/enlarged rendering breaks long words. No screen-reader or professional accessibility certification is claimed.

Development route-ready observations: EN 8,101 ms, FR 5,572 ms. These include local development rendering and are observations, not a production budget pass. Earlier summary/item measurements exercise different reports and are not a like-for-like performance improvement claim.

## Rollout and recovery

No migration, backfill, seed, production build, deployment, provider call or live customer activation is required by these source changes. The local browser verifies current development application integration. The default build remains migration-bearing and was not run.

Ship through the existing reviewed application release process. First compare owned/staging sample sessions: sale, void, closing shortage, open shift, inconsistent count, foreign location and genuine empty period. Monitor report read failures, unavailable evidence counts and large-period response times. Existing X1 and release controls remain in force.

The changed read-model contracts and UI must ship together; removed score/hour/productivity and running-balance fields are not interchangeable with the new metrics. The canonical server action names and report route keys remain stable. Repository consumers were typechecked. No external API contract or statutory report was changed.

If a regression appears, revert only this batch’s service/helper/UI/message/test hunks via reviewed source change, preserving unrelated edits. Do not roll back financial records or migrations. The former calculations are known defective, so restrict reliance on affected reports while correction is reviewed rather than treating old output as validated.

## Review accountability and remaining work

| Responsibility | Engineering review outcome |
| --- | --- |
| Platform/backend/data | Shared service-owned evidence helpers; repeatable snapshot; scoped calendar; Decimal arithmetic; no migration. |
| Security/IAM/privacy | Existing reports.read and server-derived organization preserved. Owned location checked; foreign scope denied. No new personal-data export; cashier names use existing first/last fields. |
| Finance/reconciliation/POS | Actual sale, void and close semantics traced and exercised. Flow/count distinction corrected. Full source completeness and ledger tie-out remain open. |
| Frontend/design/workflow/accessibility/localization | Shared shell/tokens, EN/FR, non-color count cues, keyboard/reflow/error recovery verified within stated limits. |
| Product/operations/support | Removed unsupported employee judgments; explicit whole-shift versus period basis and recovery guidance. Record-level drill-down and pagination remain open. |
| Quality/release/SRE/cost | Focused tests, typecheck, lint, local PostgreSQL and actual browser evidence; no production certification or large-history budget. |
| Audit/records | Original operational records retained; report has source/time/filter provenance. Not authenticated approval, immutable report archive or signed close evidence. |
| Statutory/country/ledger-close | No statutory/country rules changed. Outputs remain internal operational reports, not OHADA certification or posted cash-flow statements. |
| APIs/events/integration | Existing server-action authorization reused. No event, outbox, provider or background writer changed. |
| SaaS packaging/billing | Not applicable: no entitlement, pricing, subscription or billing behavior changed. |
| Purchasing/AP and HRIS/payroll | Not applicable: these report paths do not alter purchasing, payroll or employment records. |
| AI/agents | Not applicable: no agent action, model result or approval automation added. |
| Offline/edge/provider/fraud | No offline admission, replay, payment-provider or fraud approval boundary changed. Existing recorded POS cash movements only. |

Both analytical workflows remain partially verified, not whole-workflow complete. Remaining engineering work includes bounded large-history reads, record-level source drill-down, source completeness/missing movement investigation, report-view date-only semantics across browser timezones, legacy cash-reconciliation provenance and full accessibility/operational rollout. Current-state completed sales exclude subsequently voided orders while cash reports preserve actual period movements; this is not a complete net-sales/credit/ledger statement.

Another legacy sales-analytics service still computes arbitrary cashier scores (services/analytics/sales-analytics.service.ts). Its consumers and workflow need a separate trace and correction; this batch does not claim to fix that distinct path. Continue the full register beyond analytics. No external decision blocks ordinary implementation; X1/live-release approvals and previously rejected offline admission changes remain separate.
