# AqStoqFlow Close Assurance Readiness Audit - 2026-07-20

Created: 2026-07-20 04:57:47 +01:00
Selected skill: `018-aqstoqflow-close-assurance-audit`
Verdict: `GO_WITH_GATES`

## Executive Verdict

The active workspace can support a Close & Assurance Center as an accountant trust layer. The repo already has durable close runs, checklist items, findings, evidence items, pack exports, accounting periods, journal entries, signed payment reconciliation certificates, suspense items, business events, and ledger audit events.

The next implementation skills can proceed, but only with strict gates. The product must continue to describe close packs as system evidence/accountant-review artifacts, not statutory certification. External OHADA/SYSCOHADA legal, tax, fiscal-device, payroll, and authority-submission approval remains outside the system's proven evidence.

## Context Inspected

- `AGENTS.md`: local agent instructions and graph/report workflow.
- `graphify-out/GRAPH_REPORT.md`: confirms a graph-visible ledger-first control plane and period close preflight community at `GRAPH_REPORT.md:335`.
- `what-next/AQSTOQFLOW_CLOSE_ASSURANCE_CENTER_BLUEPRINT_2026-06-15.md`: not present at the expected active path. Older copies exist only inside transaction-history isolated snapshots, so this audit treats the active implementation as the source of truth.
- `prisma/schema.prisma`.
- `services/accounting/periods.service.ts`.
- `services/accounting/reconciliations.service.ts`.
- `services/accounting/close-assurance.service.ts`.
- `services/accounting/close-assurance-pack.service.ts`.
- `services/reconciliation/*` and `services/payments/*` scans.
- `actions/accounting/close-assurance.actions.ts` and `actions/payments/*` scans.
- `services/_shared/protect.ts` and `services/_shared/action-errors.ts`.
- `config/permissions.ts`, `lib/permissions.ts`, and `lib/security/rbac-permissions.ts`.
- Close dashboard routes and component tests under `app/[locale]/(dashboard)/dashboard/accounting/close` and `components/accounting`.

## Current Foundations Found

1. Durable close schema exists. `CloseRun` stores tenant, period, status, readiness score, blocker counts, evidence coverage, provenance, metadata, pack exports, reviews, comments, and correlation id in `prisma/schema.prisma:5145` through `prisma/schema.prisma:5186`.
2. Close checklist, finding, evidence, and pack export rows are durable and tenant scoped. Findings include domain, severity, status, owner, assignment, resolution, waiver, and correlation fields at `prisma/schema.prisma:5228` through `prisma/schema.prisma:5280`. Evidence rows carry source table/type/id/label/date/hash/provenance/availability at `prisma/schema.prisma:5283` through `prisma/schema.prisma:5325`. Pack exports carry watermark, content hash, row count, certification flag, exported-by, and correlation metadata at `prisma/schema.prisma:5328` through `prisma/schema.prisma:5351`.
3. Accounting period and journal foundations are present. Journal entries are tenant, period, posting-batch, status, source, posting-purpose, and audit-event linked at `prisma/schema.prisma:5532` through `prisma/schema.prisma:5582`.
4. Payment reconciliation foundations are present. `ReconciliationRun` stores accounting period, status, signed actor/time, certificate hash/payload, totals, exceptions, suspense, and correlation metadata at `prisma/schema.prisma:4538` through `prisma/schema.prisma:4594`.
5. Suspense is itemized. `SuspenseItem` stores owner, status, severity, evidence, ledger suspense account, posting batch, resolution notes, SLA, and correlation metadata at `prisma/schema.prisma:4482` through `prisma/schema.prisma:4535`.
6. Ledger audit events are durable. `LedgerAuditEvent` stores actor, resource, posting batch/journal links, message, metadata, and tenant indexes at `prisma/schema.prisma:5781` through `prisma/schema.prisma:5808`.
7. Close-assurance execution persists runs, checklist items, findings, evidence rows, and a ledger audit event in one service transaction at `services/accounting/close-assurance.service.ts:1945` through `services/accounting/close-assurance.service.ts:2112`.
8. Close pack export has hash, watermark, redaction note, certification blockers, fresh-auth guard, segregation of duties, and ledger audit evidence at `services/accounting/close-assurance-pack.service.ts:1549` through `services/accounting/close-assurance-pack.service.ts:1783`.
9. Reconciliation sign-off creates a signed certificate hash/payload, audits the decision, records a business event, emits an outbox notification, and invalidates certified close evidence when source reconciliation evidence changes at `services/reconciliation/payment-reconciliation-certification.service.ts:435` through `services/reconciliation/payment-reconciliation-certification.service.ts:765`.
10. Protected action envelope is present. `protect()` enforces fresh auth, RBAC, module gates, tenant guard, and safe typed action responses at `services/_shared/protect.ts:53` through `services/_shared/protect.ts:178`.
11. Close action permissions are explicit. Close read/run/assign/comment/waiver/certify/export/review permissions are registered in `config/permissions.ts:182` through `config/permissions.ts:192`, and RBAC criticality is mapped in `lib/security/rbac-permissions.ts:22` through `lib/security/rbac-permissions.ts:32`.
12. Dashboard route protection is present. Close pages call `checkPermission("accounting.close.read")` before loading dashboard action data at `app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx:22` and `app/[locale]/(dashboard)/dashboard/accounting/close/[periodId]/page.tsx:21`.

## Audit Questions

| Question | Answer |
| --- | --- |
| Durable accounting periods, journals, posting batches, source links, provider events, statement lines, reconciliation runs, suspense, exceptions, and audit logs? | Mostly yes. The schema exposes AccountingPeriod, JournalEntry/Line, LedgerPostingBatch, AccountingSourceLink, ProviderEvent, StatementLine, ReconciliationRun, SuspenseItem, PaymentException, LedgerAuditEvent, BusinessEvent, and AuditLog foundations. |
| Does period close block on draft entries, failed posting batches, unlinked posted entries, open exceptions, open suspense, unsigned runs, and trial-balance failures? | Yes. `getPeriodClosePreflight()` counts all seven conditions at `services/accounting/periods.service.ts:199` through `services/accounting/periods.service.ts:299`; `getPeriodClosePreflightFailures()` translates them to blockers at `services/accounting/periods.service.ts:303` through `services/accounting/periods.service.ts:335`. |
| Are reconciliation certificates signed, hashed, exportable, and audit logged? | Yes for system certificates. Signing stores `certificateHash`/payload and `signedById`/`signedAt`; export verifies hash drift, watermarks JSON, creates inbox/export evidence, audits, and records business events. |
| Are suspense items itemized with owner, status, severity, evidence, ledger account, and resolution metadata? | Yes. Schema fields and service workflow support owner/status/severity/evidence/suspense ledger/posting batch/resolution notes; workflow tests cover assignment, maker-checker posting approval, notification, and close invalidation. |
| Are server actions protected by session, organization scope, permissions, fresh auth where sensitive, and safe errors? | Yes for close actions. `protect()` supplies RBAC/tenant/fresh-auth/safe-error envelope. Certified close export and waiver approval require fresh auth in the action layer. |
| Are dashboard and export figures real, provenance-aware, and free of production mock data? | Yes with one important caveat. Service and route scans found no production mock/sample data in the close flow. Evidence marks reconciliation/suspense as `POSTED`, `OPERATIONAL`, or `UNAVAILABLE`; the UI describes this provenance. Operational figures must remain visibly labeled. |
| What close evidence is missing before accountant-review-ready status? | External statutory/country-pack expert review, production authority integration evidence, full close invalidation mesh proof across every close-impacting write path, and browser-level accessibility/responsiveness evidence for the close UI. |
| What would make the module non-compliant or misleading if built now? | Calling a close pack statutory certification; hiding unresolved high/critical blockers; presenting operational payment/suspense data as posted accounting truth; allowing same actor to run/certify; exporting without fresh auth; or omitting the system-evidence-only limitation. |

## Existing Close Blocker Coverage

Period close blocker coverage is strong. The period service blocks on:

- draft journal entries;
- pending or failed posting batches;
- posted/reversed journal entries missing posting batch links;
- open payment reconciliation exceptions;
- open payment reconciliation suspense items;
- unsigned or unvoided reconciliation runs;
- unbalanced trial-balance totals by currency.

Close-assurance blocker coverage also includes data trust, payment reconciliation, suspense, inventory valuation, payroll forecast proof, and AP/payroll/compliance exposure through `services/accounting/close-assurance.service.ts:1420` through `services/accounting/close-assurance.service.ts:1735`.

Close-pack certification blockers include non-ready run status, open critical/high findings, failed high-risk checklist items, missing evidence, unsigned reconciliation evidence, unavailable critical evidence, stale inventory valuation annex evidence, and missing/blocked payroll pilot-cycle certification evidence at `services/accounting/close-assurance-pack.service.ts:929` through `services/accounting/close-assurance-pack.service.ts:999`.

## Permission And Fresh-Auth Readiness

Readiness is good for the audited slice.

- Close dashboard read/run/finding/comment/waiver/review/export actions use `protect()`.
- Certified close pack export requires `accounting.close.certify` and fresh auth with max age 300 seconds.
- Close waiver approval uses fresh auth.
- Certified close pack export blocks same actor as close runner.
- Payment reconciliation sign/certificate export and suspense post are marked critical permissions in RBAC.

Remaining gate: prove all UI entry points use the protected action path and do not bypass service controls when skills 021/022 expand the interface.

## Error-Handling Readiness

Readiness is good for the audited slice.

- Actions return the protected discriminated envelope through `protect()`.
- Shared action errors convert `ApplicationError` and unknown errors into canonical safe responses.
- Close/reconciliation service checks use typed `BusinessRuleError`, `NotFoundError`, and `ForbiddenError` patterns.
- The raw-error boundary gate was already released separately on 2026-07-20 for the current workspace state.

Remaining gate: each new 019-022 mutation/export path must add focused tests asserting safe messages and no raw provider/SQL/secret leakage.

## Notification Readiness

Payment reconciliation notification readiness is good. The reconciliation notification service publishes idempotent in-app inbox items with severity, owner, due date, evidence refs, and payload hashes.

Close workflow notification readiness is partial. Close assignment, comments, waiver, review, run, and export paths create ledger audit events, but this audit did not find a dedicated close-specific in-app notification dispatcher comparable to payment reconciliation. Skill 021 should either wire close findings to the existing notification/inbox model or explicitly document the close dashboard as the operator queue.

## Data Trust And Provenance Risks

The design is provenance-aware. Evidence items record source table/type/id/hash/provenance/availability, and close dashboards distinguish `POSTED`, `OPERATIONAL`, and `UNAVAILABLE` evidence.

Risks to control:

- `OPERATIONAL` reconciliation/suspense evidence must remain visually distinct from posted accounting proof.
- The close pack currently states automatic recertification triggers are limited to the captured close-run snapshot; do not imply universal recertification until invalidation coverage is proven.
- Export payloads are JSON and redacted, but skill 022 must freeze a stable schema/version contract and redaction tests before external accountant handoff.
- Generic `AuditLog`, `LedgerAuditEvent`, and `BusinessEvent` evidence should be reconciled into one accountant-readable audit timeline in the portal/export layer.

## OHADA/SYSCOHADA Compliance Risks

The implementation is intentionally cautious. Certified close pack limitations state that statutory filings still require qualified expert validation, and metadata marks statutory readiness as blocked where authority/country-pack evidence is unavailable.

Do not claim:

- statutory filing certification;
- fiscal-device certification;
- tax/payroll/social-security submission readiness;
- OHADA/SYSCOHADA legal correctness;
- authority acceptance.

Acceptable claim, based on the inspected evidence: the system can produce a ledger-linked internal close evidence pack with blocker, provenance, hash, and audit controls.

## Missing Schema Or Service Pieces

No mandatory foundation is missing for starting skills 019-022. The schema already contains the core close-assurance models.

Required hardening before production/accountant-review claims:

- Restore or recreate the active blueprint file at `what-next/AQSTOQFLOW_CLOSE_ASSURANCE_CENTER_BLUEPRINT_2026-06-15.md`, or explicitly retire that path and point to the active close-assurance plan.
- Prove full close-certification invalidation coverage for every write path that changes ledger, payment reconciliation, suspense, inventory valuation, payroll, AP, tax, or report-export evidence after a close pack is certified.
- Add/confirm close-specific in-app notifications or a documented exception queue for finding assignments, waiver requests, reviews, stale evidence, and failed certification attempts.
- Add browser-level smoke/accessibility evidence for close routes; Jest route/component coverage passed, but no browser run was performed in this audit.
- Freeze close pack JSON schema and redaction contract for external accountant review.

## Build Gates For Skills 019 Through 022

### 019 - Close Assurance Schema

Gate: proceed only if schema work is additive or a deliberate migration cleanup. Do not duplicate existing `CloseRun`, `CloseChecklistItem`, `CloseAssuranceFinding`, `CloseEvidenceItem`, or `ClosePackExport` models.

Required checks:

- Verify tenant indexes and period/run/source lookup indexes.
- Confirm accountant review/comment models link to close run and evidence as expected.
- Add migration tests only if schema changes are actually needed.
- Run `npm run prisma:validate` and focused schema/contract tests.

### 020 - Close Assurance Engine

Gate: engine output must be source-owned, ledger-first, and blocker-first.

Required checks:

- Period close blockers must remain aligned with `getPeriodClosePreflight()`.
- New blockers must distinguish posted accounting proof from operational/estimated data.
- Every close-impacting write must emit audit/invalidation evidence when certified close evidence becomes stale.
- Focused tests must cover high/critical blockers, unavailable dependencies, stale source hash, tenant scope, safe errors, and idempotency/duplicate behavior where applicable.

### 021 - Close Assurance Portal

Gate: UI must render real service data only.

Required checks:

- Route uses `accounting.close.read` before data load.
- Empty, loading, permission-denied, unavailable, stale, retry, and degraded states are covered.
- `POSTED`, `OPERATIONAL`, and `UNAVAILABLE` provenance are visible and not collapsed into a single confidence label.
- Close findings/waivers/reviews use protected server actions only.
- Browser smoke, responsive screenshots, keyboard/focus checks, and accessibility scan must pass before release.

### 022 - Close Pack Certification

Gate: certification must fail closed.

Required checks:

- Certified export requires fresh auth, `accounting.close.certify`, and segregation of duties.
- Certified export blocks if high/critical findings remain, critical evidence is unavailable, reconciliation evidence is unsigned/unhashed, inventory evidence is stale, or payroll/AP/tax blockers remain.
- Export content has deterministic hash, watermark, schema version, redaction note, and certification limitations.
- Any post-certification source drift records `close.certification.invalidated` evidence and marks affected close packs/runs stale or blocked.
- Tests must cover successful draft export, successful certified export, blocker rejection, same-actor rejection, stale evidence invalidation, redaction, deterministic hashing, and safe errors.

## Verification Performed

- `npm run prisma:validate`: passed. Prisma schema is valid.
- `npx jest --runTestsByPath "services/accounting/__tests__/periods.service.test.ts" "services/accounting/__tests__/close-assurance.service.test.ts" "services/accounting/__tests__/close-assurance-pack.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "actions/accounting/__tests__/close-assurance.actions.test.ts" --runInBand`: passed, 6 suites, 42 tests.
- `npx jest --runTestsByPath "components/accounting/__tests__/CloseAssuranceCenter.test.tsx" "app/[locale]/(dashboard)/dashboard/accounting/close/__tests__/page.test.tsx" --runInBand`: passed, 2 suites, 6 tests.
- `npm run typecheck`: passed with `tsc --noEmit --pretty false`.
- Focused `rg` evidence scans: completed for schema, services, actions, permissions, routes, UI, tests, graph report, and mock/sample/operational provenance risk.

## Final Gate Decision

`GO_WITH_GATES` for implementation skills 019-022.

The active repo has enough accounting period, tenant, ledger, reconciliation, suspense, evidence, and export foundations to continue. The work must not be promoted as statutory certification, and certified close-pack work must remain blocked by the gates above until external statutory review, production authority integrations, and complete close-invalidation proof exist.

## Next Recommended Numbered Skill

`019-aqstoqflow-close-assurance-schema`