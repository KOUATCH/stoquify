# Daily sales implementation — 2026-09-06

The read and recovery slice of SALES-DAILY-01 is implemented. Whole-workflow completion remains open. This supersedes the implementation status in DAILY_SALES_CORRECTION_PLAN.md; its original observations remain historical evidence.

Open `/en/dashboard/sales` or `/fr/dashboard/sales`. The existing authenticated shell, sales component re-export, organization context and dashboard tokens remain in use.

## What changed and why

The former view used a new default Date each render, a fictitious default location, invented opening cash/session and fixed goal/satisfaction scores. It could swallow a failed query and show an empty or zero-like state. The new service owns scope, calendar boundaries, totals, source metadata and retained-location choices. The UI owns only unsaved scope choices.

The selected calendar date is interpreted in the organization's configured timezone. Timestamped orders use an inclusive start and exclusive end; saved PostgreSQL DATE reports use the actual calendar date. Tests cover Douala, Paris 23/25-hour days, invalid dates/timezones and ambiguous or nonexistent local midnight. Invalid organization context is an error, never a server-timezone fallback.

Saved reports expose their recorded totals, cash fields and distinct credit amount. A saved draft/finalized flag is not professional approval. Without a saved report, the service aggregates confirmed/processing/shipped/delivered/completed orders. That is order value, not cash collected or posted revenue. It does not invent opening cash, drawer balance, a session or targets. Top-five item values use line totals and can differ from order totals through charges/tax; the interface explains this.

Money remains decimal strings throughout this read path; locale formatting does not pass through floating-point numbers. Empty orders, no configured location, denied permission and failed loading are separate states. Scope inputs survive recoverable errors. Query keys include user, organization, date and location; a late old-scope response cannot replace the current report. A successful fetch carries a checked time, not a claim of continuous real-time monitoring.

Both `sales.read` and `reports.read` remain required. The new action and older daily-report action enforce both. The common action guard rejects foreign organizations, the service verifies an active organization and same-tenant location, and retained locations can still be selected for history. Existing sales module observation mode is unchanged; this batch does not claim universal enforced entitlement gating.

## Verification

- Final focused checks: 39/39 tests across four service/action/component suites. Exact amounts, period boundaries, permission combinations, foreign scope, genuine zero versus failure, saved cash/credit, delayed response and recovery are covered.
- Full typecheck, ten-file lint and scoped whitespace checks passed. The first final-test invocation passed all tests but exited 1 while Windows denied writing its JSON report; the scoped approved rerun saved the 39 passing results. Both outcomes are recorded.
- Actual PostgreSQL: five checks passed against uniquely owned synthetic fixtures in `stoquify_local_modern_modules_controls_20260905_01`. Aggregate reader source remains byte-identical to that run. Its older UI hash predates the accessible-label correction and is not used as UI proof.
- Actual application browser: English 1440px and French 390px passed order/saved/empty/denied states and failed-read recovery through genuine local authentication. No response body was mocked. One read was aborted per locale; scope was retained and keyboard retry worked. No page errors, external origins or horizontal overflow were recorded. Original organization/grant/configuration/actor authority hash was unchanged.
- Final denied-route ready observations were 2029ms EN and 2976ms FR in development. These are local observations, not production budgets or a before/after performance claim.
- The first browser attempt exposed an imprecise accessible label and test selectors matching the framework announcer. Controls now use explicit labels/IDs; selectors target the report state. Failed receipts and screenshots are retained.

Canonical evidence is `evidence/daily-sales-receipt.json` at the run root. The receipt binds source v10, tests and actual screenshots. Historical full build remains failed at Windows standalone symlink packaging; successful typecheck and route visits do not replace a successful full build.

## Operating guide

| Information | Who supplies it | Where to obtain it / action |
| --- | --- | --- |
| Organization | Signed-in user with membership | Use the existing organization switcher; the server verifies scope. |
| Location | Report reader | Select a real configured site. Retained sites are labelled for historical reading. Ask the organization administrator to configure a missing site. |
| Business date | Report reader | Select the date to inspect. The displayed organization timezone determines boundaries. |
| Currency/timezone | Organization administrator | Check actual organization setup. Correct invalid setup through its authorized workflow; no default dollar currency or server timezone is substituted. |
| Reporting authority | Organization administrator | Grant established `sales.read` and `reports.read` through role management only when appropriate. A denied screen is not a zero report. |
| Saved cash/credit figures | Owner of the recorded daily report | Consult the referenced saved report and source business records. This screen does not produce or approve that report. |
| Failed loading | Reader, then support if persistent | Keep the selected date/site and use Retry/Refresh. Report the scope and time to support; do not treat failure as zero trading. |

No new signature, approval register, provider account or X1 clearance is required to use this read correction. No real financial operation, external message, customer activation, schema change, migration or deployment was performed.

## Review responsibilities and remaining work

| Responsibility | Review / limit |
| --- | --- |
| Architecture/backend/API | Dedicated typed service, protected action, stable scoped query, existing route/re-export verified. Older daily action delegates to same reader. |
| Database/integrity | Repeatable-read snapshot, full aggregate scope, same-tenant joins, PostgreSQL DATE vs timestamp boundaries and Decimal transport tested. No migration. |
| Security/privacy | Both permissions, tenant/object isolation and stale actor response checks pass; sales module observe mode remains explicit. No cross-user cached display. No security certification. |
| Frontend/design/workflow/accessibility/localization | Existing surfaces and neutral source badges, labelled controls, EN/FR, keyboard recovery and desktop/mobile visited. Tablet, native zoom, actual screen reader, exhaustive contrast/reduced-motion audit remain unverified. |
| Product/analytics | Source-labelled order value replaces misleading revenue/cash conclusions. Shared financial metrics still contain unsupported estimates and remain a separate open correction. |
| Finance/controls/audit | Saved records displayed as recorded, credit separated, no invented expected drawer balance or ledger posting. Saved-report production/finalization/retention lifecycle is not yet verified. |
| Statutory/country | No statutory calculation changed. Organization currency/timezone used; no legal/accounting approval or country-pack certification implied. |
| QA/release/SRE/support | Unit/action/component, real PostgreSQL/browser proof and retry guide recorded. Development timings only; full build remains failed. |
| SaaS packaging | Existing route permissions and sales observation configuration preserved. No price/subscription/customer activation change. |
| POS/offline, purchasing/AP, HR/payroll, payments/providers, ledger/close | No writes or producer changes in this read slice. Their complete handoffs and source correctness remain separately registered; no claim of downstream verification. |
| AI/agents | Not applicable: no AI decision or agent action in this reader. |
| Background/events/integration | Not applicable to the synchronous read itself. Daily-report generation and connected order/payment producers remain unverified workflows. |

Roll out the service/action/hook/UI/translations together through the existing release process. Preserve source reports and domain records. Correct forward if discrepancies arise; do not restore fabricated cash/targets to hide them. Synthetic browser fixtures are explicitly local verification data; the browser runner can repeat read checks without reseeding. Do not rerun its one-time preparation mode.
