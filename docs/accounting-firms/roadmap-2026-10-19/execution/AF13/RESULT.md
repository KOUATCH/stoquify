# AF13: firm workload and engagement economics

**Date:** 25 October 2026. **Status:** VERIFIED within the authorized synthetic development scope. Focused types, 111 regressions, ten real PostgreSQL scenarios and the authenticated browser workflow pass. **Live pilot:** DEFERRED. **AF16 release:** not qualified.

The user's explicit instruction to implement using synthetic scenarios supersedes the original live-demand prerequisite. [Scope authorization](SYNTHETIC_DEVELOPMENT_SCOPE.md) defines this change. Original prompts and discovery runs 01/02 remain preserved. Current evidence is [run 03](2026-10-25-run-03/). No synthetic result is presented as customer demand or business improvement.

## Delivered behavior and reuse

The accountant portal now provides a bilingual firm workload desk for its selected client/period. Staff declare their own effort; authorized managers plan work by assignee or explicitly unassigned, retain corrections and independently review declarations. Confidential fee estimates require an additional current firm permission and remain separated by currency. A guarded JSON snapshot includes current scope, history, observation time, content hash and watermark.

| Current implementation | Reuse and responsibility |
|---|---|
| services/accounting/firm-practice.contract.ts:6 and :33 | Bounded input schemas, latest-revision aggregation, explicit null/zero handling, integer-decimal planning ratios. Reuses AF12 scope schema. |
| services/accounting/firm-practice.service.ts:66, :118, :122 and :129 | Firm-only read/write/export transactions, idempotency, optimistic versions, immutable history, same-scope references and current authority. |
| actions/accounting/firm-practice.actions.ts:14–19 | Existing protect, trusted actor context, module access and step-up policy. No new permission model. |
| components/accounting/FirmPracticeDesk.tsx | English/French forms, own/manager/fee views, correction/review, unknown/partial disclosure, explicit retry and private-state clearing. |
| components/accounting/AccountantPortal.tsx:321 | Mounts the new desk beside AF12 advisory outcomes, using existing client/period context. |
| prisma/schema.prisma:8026 and two 20261025 firm_practice migrations | FirmPracticeRevision plus tenant-bound relationships, uniqueness, checks and append-only trigger. No operational balance writer. |
| Existing firm-engagement and close-evidence authority | AF05 identities, effective assignments, named mandate enrollment, locks, current module/role/session checks and maker/checker controls. |
| Existing advisory-outcomes/review-workpaper | AF12 engagement selector and advisory revision references; AF08 review decision references. Private notes/evidence remain in their original domains. |
| Existing export-safety | Fresh authentication, current export permission, watermark and audit. No confidential firm snapshot inserted into client close deliverables. |

AF12 timing metrics remain unchanged: client waiting and review elapsed time are not labor. No payroll reader, activity monitoring, actual costing, invoices, charges, subscription change, FX conversion, tax rule or automated staffing recommendation was added.

Source HEAD at inspection: 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886. The workspace contains extensive preexisting tracked and untracked edits; HEAD alone does not identify this candidate. AF13 owns its new practice files/tests/harness, two additive migrations, narrow schema and portal additions, and the listed documentation updates. Unrelated work is preserved. The dated September graph evidence is not used as current behavioral proof.

## Acceptance criteria

| Criterion | Outcome and evidence |
|---|---|
| AF13-AC1: authorized engagement workload and stated coverage | PASS, synthetic scope. Own/manager mode, effective mandates and module checks; explicit one-period UI and up-to-ten-scope service. Real multi-client test rejects the entire cohort after one mandate expires. |
| AF13-AC2: privacy and no cross-client/payroll leakage | PASS for implemented boundaries. Client/other-user/economics denial, private-note non-copying, foreign references/FKs denied, export redaction and live role removal tested. No payroll integration. |
| AF13-AC3: estimated, recorded, missing and corrected inputs distinct | PASS. Null differs from zero; manual declarations labeled partial; append-only correction and independent review; current totals exclude superseded versions. |
| AF13-AC4: calculations reconcile without hidden FX sums | PASS. Seven contract tests plus database/export fixtures verify inputs, correction totals, missingness and separate currency budgets. Realized profitability stays unknown. |
| AF13-AC5: useful staffing decision | PASS for the user-approved synthetic substitute only. Plans 300/600/240 become 420/600/120 while preserving 1,140 minutes; corrected effort 180 is separately reviewed. Actual pilot demand and real decision benefit remain DEFERRED. |

## Verification and retained evidence

- **Source/workflow:** current implementation and reusable controls inspected. Workflow check passed with 196 package scripts outside the reviewed manifest; no registry hashes changed.
- **Schema/type checks:** schema validation, isolated client generation and focused tsconfig.firm-practice.json passed. No repository-wide production build or schema promotion.
- **Pure/mocked/component:** [regression-final.json](2026-10-25-run-03/regression-final.json): 111 passing tests, comprising seven contract tests, six component tests and 98 reused authority regressions.
- **Real PostgreSQL:** [postgres-final.json](2026-10-25-run-03/postgres-final.json): ten passing scenarios on the explicitly owned local PostgreSQL 17 database. Includes concurrency, immutable history, exact retry, stale versions, current permission/session/module/mandate denial, expiry rollback, source references, source bounds, multi-client scope and guarded export.
- **Migration preservation:** fresh target brought through 119 migrations, then the explicit JSON/null integrity migration to 120 before fixtures. A populated AF12 baseline at 118 migrated to 120 and replayed safely. [upgrade-verification.json](2026-10-25-run-03/upgrade-verification.json) retains unchanged counts/digests across ten operational/advisory tables. Ledger and advisory rows were populated; several other checked tables were empty.
- **Browser:** [browser-verification.json](2026-10-25-run-03/browser-verification.json) passes: real preparer/reviewer/client sign-ins; manual declaration/correction; independent review with password step-up; confidential budget and JSON export; current fee-permission removal. English/French at 1440px and 390px: four scoped axe scans with zero violations, no horizontal overflow and no page errors. Screenshots were reviewed separately. This does not certify the entire portal.
- **Documents:** matching Markdown/PDF outputs use docs-report-publisher. Publication receipt and separate visual review are retained in run 03. Document rendering is not product-browser evidence.

The initial extra module-denial fixture used an empty module list, which intentionally invokes existing legacy defaults. Its failure is retained; the corrected fixture explicitly excludes close_assurance and the final run passes. No module semantics were changed. [ACCESS_VERIFICATION_PLAN](ACCESS_VERIFICATION_PLAN.md) records exact lanes and commands.

## Rollout, fallback and retention

This is a development implementation; no live activation or production migration was performed. Before deployment, qualify the candidate under AF16, review migration application against the intended target and confirm existing firm assignments, named mandates, role grants and module access. No blanket economics permission is seeded. Later pilot validation remains separate.

For safe fallback, remove the new portal entry and disable the AF13 protected actions in a controlled application rollback while retaining the additive table and authorized recovery/export service. Do not run destructive down migrations or delete corrected history. Operational accounting is unaffected because AF13 only writes its own revisions and existing audit logs. Restore the previous UI without rewriting financial accounts.

Observable failures include stale-version conflicts, current-access denials, uncertain submissions and explicit source-bound errors. The UI offers exact retry after uncertain responses and password confirmation; current authorization still governs retries. No background scheduler or worker was added.

## Bounds and remaining work

The UI covers one selected engagement-period; API cohorts are at most ten scopes. Per scope limits are 500 revisions, 100 assignees and 20 choices per reference type. Limit overflow fails explicitly. Historical unavailable assignees remain attributable; manual completeness and capacity are never inferred. The fee-per-planned-hour figure uses supplied plans and may be incomplete.

No live pilot baseline, realized margin, staffing optimization, scale benchmark or full accessibility certification is claimed. AF11's qualified-country evidence remains open. AF14–AF16 are not started by this execution. The next step is a user-selected phase or later pilot/release validation, not automatic optional expansion.

## Review responsibilities

Architecture/backend/database review focused on reusing authority and immutable transaction boundaries. Privacy/security review focused on firm-only economics, export scope and current access. Product/UX review focused on explicit manual inputs, unknown values, corrections, bilingual workflows and useful synthetic staffing. QA/operations review separated mocked, real database, browser and publication evidence. SaaS packaging changes are out of scope. Country/tax, payroll, payments, AI and offline integrations are not applicable because AF13 adds no rules, domain writers or autonomous actions.


## Browser correction

The initial browser attempt exposed dropdown accessible names that included option text. Explicit localized aria-label values were added using the existing AF12 pattern. The six component tests were rerun after that UI-only correction; these overlap the 111-test regression total and are not counted twice. Earlier browser receipts are retained.

The completed authenticated workflow is retained in browser-attempt-03.json. A presentation assertion then matched both a budget summary and its revision card. The harness selector was narrowed, and --presentation-only completed layout/access checks against the same source and retained synthetic records. The final browser receipt combines those sequential checks; no extra manual declarations were created for that continuation.
