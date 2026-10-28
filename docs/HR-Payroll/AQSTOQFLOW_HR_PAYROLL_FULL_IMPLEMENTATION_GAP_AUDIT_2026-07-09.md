# AqStoqFlow HR/Payroll Full Implementation Gap Audit - 2026-07-09

## Executive Decision

Status: controlled-pilot capable for the implemented, evidence-gated Wave 1 scope; not ready for unrestricted full HR/payroll production rollout.

The system is no longer a thin dashboard concept. It has a real HR/payroll kernel, dedicated Prisma payroll tables, service-owned workflows, guarded actions, role-aware UI routes, accounting/data-trust coupling, proof drawers, statutory fixture infrastructure, payment reconciliation evidence, and multiple release gates. The remaining issue is not absence of payroll architecture; it is that the last mile to full production requires statutory breadth, historical backfill signoff, live provider/authority automation proof, one clean controlled pilot cycle, and final browser/accessibility/release certification.

## Evidence Inspected

- Prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`.
- Core roadmap/readiness: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-27.md`, `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FULL_PRODUCTION_ROADMAP_2026-06-27.md`.
- Recent 2026-07-05 and 2026-07-09 Wave 1 reports covering statutory lifecycle proof, CNPS/topic coverage, proof drawer state, provider receipt settlement proof, settlement replay proof backfill, and payment destination settlement proof.
- Code surfaces: `services/payroll/`, `actions/payroll/`, `components/payroll/`, `app/[locale]/(dashboard)/dashboard/payroll/*`, `config/permissions.ts`, `lib/security/rbac-permissions.ts`, `prisma/schema.prisma`.
- Gate artifacts: `what-next/payroll/payroll-immutability-runtime-check.md`, `what-next/payroll/payroll-regulatory-hardcode-gate.md`.

## Current Situation

AqStoqFlow HR/payroll is best described as a serious enterprise payroll control plane in Wave 1/early Wave 2 completion, with several production-hardening lanes already done beyond the original baseline.

The strongest completed areas are service ownership, tenant/RBAC/module boundaries, payroll data model coverage, proof-chain discipline, controlled pilot readiness, and accounting/payment/declaration/close coupling. The weakest remaining areas are unrestricted statutory breadth, live authority/provider adapter certification, migration/backfill mutation approval, complete production browser/accessibility evidence, and final Prompt 19/21-style release certification after a reconciled pilot cycle.

## Completed Or Strong Areas

### 1. Payroll Data Model Foundation

Completed. `prisma/schema.prisma` contains dedicated payroll models and enums for employees, contracts, rubriques, rubrique assignments, salary change requests, payment destination changes, periods, attendance snapshots, runs, run lines, payslips, payslip lines, declarations, declaration evidence, payment batches, allocations, and employee balance cases/events.

Why it matters: payroll truth has a durable schema and is not improvised from UI state or finance summaries.

### 2. Service-Owned Payroll Kernel

Completed for the implemented scope. `services/payroll/` includes payroll control, employee, contract, compensation, register, payment evidence, payment reconciliation, declaration lifecycle, payslip self-service, setup readiness, setup evidence, proof backfill, statutory scenario coverage, pilot certification, final release readiness, adapter registry/chaos/certification harness, provider settlement bridge, and authority adapter execution services.

Why it matters: the product correctly keeps business truth server-side and creates read models/actions for UI surfaces.

### 3. Action Boundary, RBAC, Module Entitlement, And Fresh Auth

Strong. `actions/payroll/` protects payroll reads and mutations with explicit permissions, `moduleSlug: "payroll"`, handler-derived tenant guards, and fresh auth on sensitive mutations such as contract, compensation, run approval, payment release, balance settlement, declaration evidence, and adapter execution.

The permission catalog includes payroll read/manage/review/approve/post/release/reconcile/declaration/export/self-service permissions, and RBAC risk classification marks critical payroll actions appropriately.

### 4. Operator And Employee UI Surfaces

Strong for implemented workflows. The app exposes service-backed routes for:

- `/dashboard/payroll`
- `/dashboard/payroll/setup`
- `/dashboard/payroll/employees`
- `/dashboard/payroll/contracts`
- `/dashboard/payroll/compensation`
- `/dashboard/payroll/attendance`
- `/dashboard/payroll/runs`
- `/dashboard/payroll/register`
- `/dashboard/payroll/payments`
- `/dashboard/payroll/declarations`
- `/dashboard/payroll/payslips`

These pages call server actions, enforce module/RBAC checks, and present denied/module-disabled states. This is significantly stronger than the older roadmap state where several operator routes were not yet implemented.

### 5. Payroll Immutability And Correction Bias

Strong. The latest immutability runtime report says `Status: ready`, with no runtime blockers detected. Recent Wave 1 work expanded forbidden mutation checks from the older 12/12 level to reports showing 14/14 blocked, with allowed lifecycle checks still passing.

Why it matters: finalized payroll facts are treated as append-only or correction-based evidence, which is the correct posture for salary, statutory, declaration, payment, and close data.

### 6. Regulatory Hardcode Control

Strong. The regulatory hardcode gate report is `Status: pass`. Recent statutory fixture work shows active attention to keeping statutory formulas and production claims behind reviewed country-pack evidence instead of hidden constants.

### 7. Statutory Scenario And Country-Pack Evidence

Partial but strong in the implemented slice. Cameroon/CNPS and IRPP scenario work now includes review-topic coverage, lifecycle proof fields, proof hashes, setup-readiness coupling, proof-backfill reconciliation coupling, and final-release blocker propagation.

The key limitation is breadth: the system has evidence-backed statutory slices, not unrestricted statutory coverage for all jurisdictions/scenarios.

### 8. Accounting, Register, Data-Trust, And Close Coupling

Strong and still maturing. Register proof, payroll auditor proof drawers, accounting audit proof, data-trust blockers, and close/readiness coupling exist. Recent reports show payroll settlement replay proof, provider receipt proof, and payment destination proof now propagate into data-trust and close gates.

This is a major product strength: payroll is being tied to accounting and assurance evidence rather than treated as an isolated calculator.

### 9. Payment Reconciliation And Settlement Evidence

Strong for the hardened Wave 1 slice. Recent 2026-07-09 reports added:

- provider receipt/statement settlement proof;
- destination proof in settlement evidence;
- settlement replay proof backfill;
- data-trust blockers when settlement proof is missing;
- proof visibility in payroll payment workbench and proof drawers;
- focused Jest/typecheck/prisma/service-boundary/regulatory verification in slice reports.

### 10. Payslip Self-Service

Implemented for a guarded scope. Payslip self-service route/action/component/test surfaces exist with module entitlement and RBAC protection. This is a solid baseline, but should still pass final browser/accessibility/export audit before full release.

## Partial, Missing, Or Not Yet Production-Ready Areas

### 1. Full Statutory Payroll Coverage

Status: partial. The system has strong Cameroon-focused evidence and statutory fixture machinery, but not yet full unrestricted statutory coverage for every launch scenario. The final readiness report explicitly says full statutory payroll production remains blocked until expert-reviewed or regulator-confirmed formulas and golden fixtures exist for intended jurisdictions and scenarios.

Solution:
- Finish the statutory parameter matrix for the launch jurisdiction.
- Require expert/regulator provenance for every formula, threshold, exemption, employer charge, employee deduction, declaration line, and effective-date transition.
- Expand golden fixtures for normal runs, retro changes, YTD regularization, corrections, declarations, payments, close, and edge cases.
- Keep unsupported states fail-closed.

### 2. Production Migration And Backfill Mutation

Status: blocked/deferred. Reports still treat production seed/backfill mutation as unresolved. Historical proof-gap scanning exists, but production mutation must remain disabled until there is tenant signoff, idempotency ledger, rollback/correction strategy, and reconciliation certificate.

Solution:
- Keep dry-run-only backfill as default.
- Add an explicit production backfill command path gated by tenant, date range, source certificate, signoff hash, operator fresh auth, and rollback/correction plan.
- Persist an audit certificate before writes and a reconciliation certificate after writes.
- Never fabricate missing contracts, salary history, payment destinations, attendance, authority receipts, provider settlement evidence, or statutory provenance.

### 3. Live Authority Filing Automation

Status: partial/deferred. Authority adapter registry, execution, certification harness, and chaos proof infrastructure exist, but reports do not claim live automated legal filing readiness. The system correctly blocks authority automation when certification proof is incomplete.

Solution:
- Define authority adapter contracts for payload mapping, validation, submission, response parsing, rejection, amendment, receipt, status polling, credential scope, retries, idempotency, audit, and close impact.
- Run sandbox integrations before production claims.
- Keep manual evidence lifecycle available until certified adapters are ready.

### 4. Live Payment Provider Automation

Status: partial/deferred. Provider settlement proof and reconciliation evidence are strong, but recent reports explicitly avoid claiming live provider payment automation. Real receipt response mappings, rejection/amendment trails, and broader historical backfill are next.

Solution:
- Extend provider adapter certification to real provider receipt responses, failed payments, reversals, duplicates, amendments, and settlement delays.
- Keep all raw bank/mobile-money/payment destination values out of operator/auditor metadata.
- Require provider receipt proof before close/data-trust certification.

### 5. Controlled Pilot Cycle Evidence

Status: missing as final proof. The readiness reports say full production requires one controlled pilot payroll cycle reconciled cleanly with accounting, payment, declaration, close, and data-trust evidence.

Solution:
- Pick one tenant, one jurisdiction, one pay period, one payroll population size, and one controlled payment/declaration scenario.
- Execute setup -> source data -> freeze -> calculate -> review -> approve -> post -> pay -> declare -> reconcile -> close/data-trust certification.
- Save a pilot certification report with signed blockers, proof hashes, screenshots, command outputs, and explicit no-go/ready status.

### 6. Browser, Accessibility, And Visual Regression Evidence

Status: partial. Browser smoke setup and screenshots exist, and recent reports include route/browser evidence. The final readiness report still requires authenticated browser visual/accessibility coverage for unrestricted release, including role visibility, keyboard paths, mobile, dark/light, denied, stale, partial, and redacted states.

Solution:
- Refresh seeded payroll auth state.
- Run `npm run ui:smoke:payroll` against a stable local/staging server.
- Add accessibility checks for proof drawers, action panels, modals, empty/blocked/denied states, and mobile routes.
- Save screenshot and JSON evidence under `what-next/payroll/`.

### 7. Finance, BI, POS, And Sales Integration

Status: intentionally constrained. The roadmap says POS/sales may feed approved inputs but must never own payroll truth. Finance/BI payroll intelligence should use payroll register, ledger, payment, declaration, and close facts, not estimates.

Solution:
- Replace estimated payroll analytics with register-backed facts.
- Add payroll cash forecast from approved runs, net-pay batches, statutory liabilities, authority due dates, settlement exceptions, and close blockers.
- Add drillthrough proof links without exposing raw payroll PII or payment details.

## Pros Of The Current System

- Correct architecture posture: service-owned payroll truth, protected server actions, and UI as workflow surface rather than calculation authority.
- Strong tenant and security model: explicit payroll module entitlement, RBAC permissions, fresh-auth sensitive actions, and redaction-aware read models.
- Strong evidence culture: proof hashes, source links, data-trust blockers, close coupling, and proof-backfill gates are treated as first-class product behavior.
- Good statutory safety: hardcode gates and country-pack review evidence prevent silent legal assumptions.
- Accounting-grade ambition: register, ledger, payment, declaration, and close proof are being tied together instead of left as independent reports.
- Better-than-MVP UI coverage: command center, setup, employees, contracts, compensation, attendance, runs, register, payments, declarations, and payslips are all represented as service-backed surfaces.
- Strong testing footprint: focused service/action/component tests exist across most payroll subdomains, with recent reports showing passing targeted suites and gates.

## Cons And Risks

- The system is broad, so completion risk is coordination risk: many proof chains must stay aligned across payroll, accounting, assurance, payments, declarations, and UI.
- Full production claims are still blocked by statutory breadth and final pilot evidence, not by a single missing UI page.
- Historical backfill is inherently high risk because it can create false confidence if allowed before source certificates and rollback/correction evidence are complete.
- Live authority/provider integrations remain non-trivial because legal payloads, credentials, response mapping, rejections, amendments, receipts, retries, and close impact must all be certified.
- Browser/accessibility evidence can lag backend readiness, making the system functionally strong but not yet release-polished.
- The many `what-next/payroll` reports need a current canonical status index, otherwise future work can confuse completed Wave 1 slices with remaining production blockers.

## Completed Vs Uncompleted Matrix

| Area | Current status | Notes |
| --- | --- | --- |
| Payroll schema | Completed/strong | Dedicated payroll tables and enums exist. |
| Employee source data | Implemented, needs production completeness proof | Employee route/service/action exist; launch needs completeness gates per tenant. |
| Contracts | Implemented | Service/action/UI exists; must remain source-evidence backed. |
| Compensation/rubriques | Implemented | Approval actions and fresh auth exist; statutory breadth still depends on country-pack proof. |
| Payment destination evidence | Implemented and recently hardened | Destination proof now blocks unsafe settlement when missing. |
| Attendance readiness/freeze | Implemented for readiness scope | Needs full leave/overtime/time input breadth if sold as complete HR/payroll. |
| Payroll run lifecycle | Implemented for controlled scope | Needs final pilot and concurrency/double-submit/closed-period release proof. |
| Register tie-out | Strong and maturing | Must remain the central proof chain for payslip, ledger, payment, declaration, close. |
| Payslip self-service | Implemented | Needs final export/a11y/browser evidence before unrestricted release. |
| Payment reconciliation | Strong Wave 1 implementation | Recent settlement proof, provider receipt proof, and replay proof hardening are high-value. |
| Declaration lifecycle | Implemented/manual proof-backed | Live authority automation still not production-certified. |
| Country-pack/statutory formulas | Partial | Strong Cameroon/CNPS/IRPP proof machinery; not full unrestricted statutory breadth. |
| Accounting/close/data-trust | Strong and maturing | Data-trust blockers and close proof are present; pilot cycle must prove end-to-end. |
| Adapter automation | Partial/deferred | Registry/harness/execution exist; live provider/authority production claims not yet safe. |
| Production backfill | Blocked/deferred | Dry-run/proof scans exist; mutation requires signoff, idempotency, rollback, reconciliation. |
| Browser/a11y/release evidence | Partial | Route surfaces exist; final authenticated smoke/a11y matrix still needed. |
| Final production certification | Not complete | Requires Prompt 19/21 rerun after blockers close and one clean pilot cycle. |

## Recommended Solution Path

### Phase 1: Freeze The Current Truth

Create a single current-status index under `docs/HR-Payroll/` that points to the latest prompt, this audit, the final readiness report, full production roadmap, and latest 2026-07-09 Wave 1 proof reports. Mark the product as controlled-pilot capable, not full production-ready.

### Phase 2: Close Statutory Breadth For The Launch Jurisdiction

Prioritize country-pack breadth and payroll engine hardening. Finish expert-reviewed statutory parameter matrices, golden fixtures, effective dating, correction/YTD replay, declaration proof, and register tie-out for the launch jurisdiction. No UI or BI expansion should outrun statutory/register truth.

### Phase 3: Complete Run/Register/Correction Kernel Release Proof

Consolidate idempotency, double-submit protection, closed-period blockers, correction-run rules, register proof expansion, and close invalidation. Prove that no payment, payslip emission, declaration, export, or close certification can proceed without register proof.

### Phase 4: Certify Payment And Declaration Backbone

Finish provider receipt response mappings, rejection/amendment trails, settlement backfill breadth, declaration authority proof, and source-register proof in every payment/declaration lifecycle transition. Keep automation behind certification gates.

### Phase 5: Approve Production Backfill As A Controlled Migration Product

Convert current dry-run/proof-gap scanning into a signoff-gated production migration lane. It must be idempotent, auditable, reversible by correction, and unable to fabricate missing payroll facts.

### Phase 6: Run One Controlled Pilot Cycle

Execute one real bounded tenant/pay-period cycle and save evidence for setup, source data, freeze, calculate, approve, post, pay, declare, reconcile, close/data-trust, proof drawers, browser screenshots, and operator signoff.

### Phase 7: Final Release Certification

Rerun focused payroll tests, `npm run typecheck`, `npm run prisma:validate`, `npm run service:boundary:fail`, `npm run regulatory:hardcode:fail`, `npm run policy:gates`, authenticated `npm run ui:smoke:payroll`, and final Prompt 19/21 readiness reports. Only then claim unrestricted production readiness.

## Verification Summary From This Audit

Live commands run during this documentation pass:

```powershell
npm --prefix "E:\ohada saas\newStockFlow\aqstoqflow" run prisma:validate
npm --prefix "E:\ohada saas\newStockFlow\aqstoqflow" run typecheck
npm --prefix "E:\ohada saas\newStockFlow\aqstoqflow" run service:boundary:fail
npm --prefix "E:\ohada saas\newStockFlow\aqstoqflow" run regulatory:hardcode:fail
```

Results:

- `prisma:validate`: pass; Prisma schema is valid.
- `typecheck`: pass; `tsc --noEmit --pretty false` completed cleanly.
- `service:boundary:fail`: pass; active service-boundary violations: 0.
- `regulatory:hardcode:fail`: pass; active findings: 0.

Existing latest evidence reports also show:

- Payroll immutability runtime: `Status: ready`, no runtime blockers detected.
- Recent payment/provider/settlement proof slices: focused Jest, typecheck, prisma validate, service-boundary, and regulatory hardcode checks passed in their reports.
- Final production readiness report still says `NOT PRODUCTION-READY` for unrestricted release and `ready for controlled limited pilot` for implemented evidence-gated workflows.

Checks not run live in this documentation pass:

```powershell
npm run policy:gates
npm run ui:smoke:payroll
```

Reason: this was a report-only audit, and `ui:smoke:payroll` requires a running dev/staging server plus valid `playwright/.auth/payroll.json`. Full `policy:gates` should be rerun during the next implementation/release-certification pass because it can refresh payroll gate artifacts and is better treated as a release evidence run.

## Final Recommendation

Do not reset or restart the payroll program. The existing implementation is substantial and largely correct in its enterprise posture. The right move is to consolidate status, close the statutory/register/payment/declaration proof blockers in order, run one controlled pilot cycle, then perform final Prompt 19/21 release certification.

The system should be marketed internally as: controlled-pilot ready for implemented HR/payroll workflows, with full production rollout pending statutory breadth, migration/backfill signoff, live adapter certification, browser/accessibility evidence, and clean pilot reconciliation.