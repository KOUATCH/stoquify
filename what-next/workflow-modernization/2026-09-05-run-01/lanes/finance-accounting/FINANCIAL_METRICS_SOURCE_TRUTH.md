# Legacy financial metrics: source truth — 2026-09-06

FA-ANALYTICS-LEGACY-01 is a distinct exported-action/reporting workflow. It was not covered merely because the daily-sales workflow referenced the same action/service files. The provisional master denominator increases from205 to206; no whole workflow is declared complete.

## Finding and correction

Historical source v10 confirms the endpoint generated rent5000, utilities1200, fixed assets500000, long-term liabilities150000, loans100000, investing cash flow−15000 and financing−8000. It derived revenue targets, forecasts, recurring shares, receivables, payables and taxes from arbitrary revenue ratios. Current item cost was used as historical COGS and the last transaction from one drawer could become location cash. These were not authoritative financial statements. No product sign-off can convert those assumptions into actual records.

Current `financial-metrics.v2` returns unsupported legacy financial fields as null with `PARTIAL / FINANCIAL_SOURCES_NOT_CONNECTED`. It retains field names for explicit unavailable handling but intentionally changes their type. A consumer must handle the version/availability rather than coalescing null to zero. No current production component/hook/route caller was found by source search. The separate `types/financialTypes.ts` interface has no import relationship to this service and is unchanged.

Exact confirmed-order activity is now a separate typed field, with current and preceding equal-calendar-day periods, counts, currency, organization timezone, checked time and source statuses. It is not called posted revenue, profit or collected cash. PostgreSQL Decimal aggregation avoids per-order floating-point conversion and unnecessary full order/line/payment loads. Previous period ends exactly where the current period begins. Day boundaries use organization timezone, including DST, instead of application-server start/end-of-day defaults.

Active organization and same-tenant location must exist. Explicit all/* location scope is genuinely organization-wide; retained locations remain readable. Invalid dates, empty scope, foreign locations and failed reads are errors. An empty valid aggregate is zero order activity, not zero assets/taxes/cash.

Existing payroll lifecycle/evidence, permission redaction, module observation and forecast logic remain effective. Missing/redacted salary and employer-charge figures are now null at the outer metrics boundary. Supported payroll evidence remains separate from unsupported financial totals. `payrollBasis` explicitly records overlapping payroll periods, current employee location allocation and tenant-wide forecast scope; these are not a uniform as-of financial statement. Payroll calculation precision, source linkage and full lifecycle remain separately reviewable; this patch does not certify them.

## Integration and review

Graph action community70 located `financialAnalyticsInput/getFinancialMetrics` alongside daily reporting. Current source verified the action → financial service relationship. New owner: `services/analytics/financial-order-activity.service.ts`. Existing action validates dates/scope, enforces reports.read, rejects unauthorized organizations and derives payroll context from the signed-in actor. No UI, navigation or new speculative report page was added.

| Review responsibility | Finding / verification |
| --- | --- |
| Architecture/backend/API | Versioned partial contract, dedicated order aggregate owner, existing exported action preserved; no current UI consumer found. |
| Database/integrity | Repeatable-read order snapshot, tenant/location checks, exact aggregates and adjacent timezone periods tested in real PostgreSQL. Schema unchanged. |
| IAM/privacy/security | Existing reports.read and server tenant guard preserved; service validates object scope before reading figures. Payroll redaction/module inputs remain server-derived. Unit/action denial tests and PostgreSQL foreign object refusal. |
| Finance/accounting/controls | Unsupported balances/profits/taxes/cash/targets now unavailable. Order totals and overlapping payroll evidence remain distinct. No ledger mutation or accounting certification. |
| Statutory/country | Removed unsupported hardcoded rates; no statutory formula or country-pack rule introduced. Actual tax sources and expert-reviewed meanings remain future integration work. |
| Analytics/product | Eliminates false precision and fixed forecasts; period comparison and provenance explicit. Future consumers must handle null and source scope correctly. |
| Audit/records | Read-only checks preserve source orders/reports and authority hashes. Saved daily-report lifecycle unchanged. |
| QA/release/SRE | 51 tests in four suites passed; full typecheck and five-file lint passed. Five real PostgreSQL checks passed. Full build's historical Windows packaging failure remains unresolved. |
| UI/UX/accessibility/localization | Not applicable to this endpoint-only patch: no current production screen caller and no strings/screen changed. Existing daily-sales EN/FR browser evidence remains historical; its current component/action/service readers are unchanged and focused regressions pass. |
| SaaS packaging/operations | Existing permissions/module observation unchanged. No price, subscription or customer activation. Version-aware integration guidance below. |
| Payroll | Existing evidence and redaction tests preserved; explicit outer null on unavailable amounts. Full producer/concurrency/precision lifecycle not certified here. |
| POS/offline/inventory/purchasing/payments/ledger-close | No producer mutations. Unsupported inferences from mutable item cost or a drawer transaction were removed. Correct domain-owned financial report integration remains open. |
| AI/agents/background/providers | Not applicable: synchronous server read, no agent, external provider or worker changed. |

## Proof and practical limits

- `evidence/financial-metrics-after-01.json`:51/51 across the financial evidence suite, daily action and daily reader/component regressions; d26153,4.109s.
- Typecheck: npm run typecheck, session30278/chunk8a8404,exit0. Five-file lint: dda08d,exit0.
- `lanes/environment/financial-order-activity-c024e2cd-4f5.json`:5/5 actual PostgreSQL reads. Reused prior synthetic daily fixtures; no seed or mutation. Current26.00 and previous900.00, growth−97.11%, Douala24h/Paris23h, all-location and retained scope, missing/foreign/invalid refusal. Source stable; authority/source-record hash unchanged.
- No current UI caller exists to visit for this endpoint. No browser success is invented, and no new page was created solely to produce screenshots. Daily-sales browser evidence8b90ef4d-ce7 is the prior actual UI proof; shared legacy service/action files have since changed only at the financial-metrics boundary and final daily regressions passed.

No platform-wide completion, X1 clearance, live deployment, migration or professional certification. Report interface connection, authoritative finance sources, relevant retained records, actual endpoint transport/authentication in a routed customer workflow and full payroll semantics remain open engineering work.

## Input, owner and recovery guide

| Required input | Owner / where it comes from |
| --- | --- |
| Tenant identity and reporting permission | Existing signed-in session and administrator-managed reports.read permission. Never a caller-supplied role list. |
| Location or all/* | Actual same-tenant Location record, or explicit aggregate selection. Retained sites remain valid historical scopes. |
| Start/end Date instants | Calling report workflow; each instant maps to its organization's calendar date. Returned context states the exact boundaries. Do not assume server-local calendar interpretation. |
| Currency/timezone | Actual organization setup, maintained by its administrator. Invalid values require setup correction. |
| Missing financial figures | Engineering connects approved domain read owners; finance defines and reviews field meanings and source coverage. A signature or arbitrary default cannot supply missing financial records. |
| Payroll evidence | Existing payroll register, posted source links and payment/transition proof under current actor/module authority. Obtain missing records through the payroll lifecycle, not by editing this response. |

Integrate the versioned service/action changes together. Consumers must show unavailable fields as unavailable and identify order activity separately. Retry transient reads without treating an error as zeros. This is read-only, so no business command/idempotency retry is involved. Preserve records and correct forward; rollback must not silently reinstate unsupported figures. No new user decision is needed to continue ordinary source correction.
