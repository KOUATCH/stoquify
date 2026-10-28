# HR/Payroll Enterprise Readiness Assessment

Date: 2026-06-24
Mode: report-only audit
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Executive Decision

The HR/Payroll module is not a throwaway prototype, but it is also not yet a complete professional enterprise HR/payroll suite. The correct path is phased recomposition and hardening, not a blind rebuild.

Verdict:

- Backend payroll control foundation: strong partial foundation.
- Statutory payroll breadth: incomplete and not ready for legal production claims.
- HR employee/contract operating UX: missing as a full product surface.
- Payroll workbench UX: useful control dashboard, but not yet a modern payroll command center.
- Security/control posture: good foundations, with some critical production blockers still open.
- Final recommendation: preserve the existing kernel, then build a phased enterprise HR/payroll suite around it.

## Evidence Inspected

Code and architecture:

- `prisma/schema.prisma`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-control.schemas.ts`
- `actions/payroll/payroll-control.actions.ts`
- `hooks/payroll/usePayrollWorkbench.ts`
- `components/payroll/PayrollControlWorkbench.tsx`
- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- `app/[locale]/(dashboard)/dashboard/payroll/error.tsx`
- `config/permissions.ts`
- `config/sidebar.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/assurance/*`
- `services/signals/*`
- `services/owner-war-room/*`
- `services/manager-action-center/*`
- `graphify-out/GRAPH_REPORT.md`

Prior reports:

- `what-next/AQSTOQFLOW_012_PAYROLL_PRESENCE_ARCHITECTURE_GATE_REPORT_2026-06-15.md`
- `what-next/AQSTOQFLOW_012_PAYROLL_PRESENCE_COMPLETION_GATE_EXECUTION_REPORT_2026-06-15.md`
- `what-next/exam-suite-runs/EXAM_014_PAYROLL_STATUTORY_HARDENER_RUN_REPORT_2026-06-16.md`
- `docs/PAYROLL_SYSTEM_MODERNIZATION_ANALYSIS.md`
- `docs/PAYROLL_AND_PRESENCE_SYSTEMS_ANALYSIS.md`
- `documentation/PAYROLL_SYSTEM_COMPREHENSIVE_ANALYSIS.md`

Skill criteria applied:

- `ohada-payroll-engine`
- `kontava-payroll-statutory-assurance`
- `012-aqstoqflow-payroll-presence-engine`

## Current Verification

Passed:

```powershell
npm test -- services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand
```

Result: 3 suites passed, 12 tests passed.

Passed:

```powershell
npm run prisma:validate
```

Result: Prisma schema is valid.

Passed:

```powershell
npm run typecheck
```

Result: TypeScript completed with no reported errors.

## What Is Done Well

### 1. Dedicated payroll data model exists

The schema has dedicated tenant-scoped models for:

- `PayrollEmployee`
- `PayrollContract`
- `PayrollPeriod`
- `PayrollAttendanceSnapshot`
- `PayrollRun`
- `PayrollRunLine`
- `PayrollPayslip`
- `PayrollPayslipLine`
- `PayrollDeclaration`
- `PayrollPaymentBatch`
- `PayrollPaymentAllocation`

This is a real payroll kernel, not just salary fields on a user table. It includes tenant scope, run lifecycle statuses, provenance fields, hashes, idempotency keys, actor fields, ledger references, payment allocation records, and country-pack metadata.

### 2. Payroll calculation is country-pack-aware

`calculatePayrollRun` resolves country-pack parameters through `resolveRegulatoryParameter`, pins pack/schema/resolution metadata, and records calculation/ruleset hashes. This follows the right direction: payroll mechanisms in the engine, statutory values in country packs.

### 3. Attendance freeze exists as a source-evidence boundary

`freezeAttendanceSnapshot` records scheduled/worked/overtime/absence/leave minutes, hashes source payloads, supports idempotency, emits business events, and prevents replay drift. That is the correct foundation for time-to-payroll evidence.

### 4. Payroll runs are posted through accounting controls

`approveAndPostPayrollRun` posts through configured payroll posting rules, verifies balanced lines, uses active leaf accounts, links accounting source evidence, writes ledger audit events, emits business events, creates payslips, and updates run/period state.

### 5. Payment release is controlled and evidence-backed

`releasePayrollPaymentBatch` requires posted payroll run evidence, emitted payslips, payment destination hashes, separate requester/approver/releaser roles, idempotency, payment allocations, ledger posting, outbound reconciliation transaction, payment exception tracking, and audit events.

### 6. Declaration preparation is honest about statutory limits

`preparePayrollDeclarations` attempts country-pack declaration resolution and falls back to internal liability review with `expertReviewRequired` instead of pretending statutory filing is complete. This is the right professional boundary.

### 7. Server actions protect tenant context

`actions/payroll/payroll-control.actions.ts` derives `organizationId`, actors, and permissions from authenticated context and overwrites client-supplied values. Payment release and run approval require fresh auth.

### 8. Focused tests cover important control paths

Current tests cover:

- country-pack provenance on calculation;
- calculation idempotency replay mismatch rejection;
- approval/posting/payslip emission orchestration;
- duplicate approval replay behavior;
- journal failure rollback behavior;
- payment release with ledger/reconciliation evidence;
- missing employee payment destination blocker;
- declaration expert-review fallback;
- RBAC denial response;
- fresh-auth enforcement;
- tenant/actor derivation in actions.

### 9. Payroll is integrated into assurance and command surfaces

Evidence exists in:

- payroll exposure redaction in Owner War Room;
- payroll action routing in business signals;
- released payroll payment evidence checks in assurance registry;
- redaction policy for payroll incident evidence.

## What Is Partially Done But Fragile

### 1. Calculation engine is still narrow

Current calculation appears limited to:

- base salary;
- attendance ratio proration;
- CNPS pension-style employee/employer deductions;
- simple gross/net totals;
- anomaly flags for overtime and CNPS review.

Missing or shallow:

- IRPP/income tax calculation;
- family allowance and occupational risk contribution calculation;
- rubriques for allowances, deductions, benefits, loans, advances, garnishments, bonuses, commissions, seniority, transport, housing, meal, risk, function, and overtime;
- leave balance effects;
- YTD cumulatives;
- corrective calculation deltas;
- lawful caps and recovery rules;
- multi-country mechanism breadth.

### 2. HR employee and contract workflows are schema-first, not product-complete

The schema supports employees and contracts, but the module currently exposes only a single payroll workbench route. There are no discovered production routes/components for:

- employee management;
- contract history management;
- compensation/rubrique assignment;
- employee payment profile approval;
- leave/presence management;
- salary change workflow;
- document/evidence upload;
- employee self-service.

### 3. Payslip output is emitted, but not a full payslip product

The service emits payslip rows and basic lines, but no full payslip viewer/PDF/archive/self-service route was found. Payslip content is also minimal: gross, employee deduction, employer charge, net payable. A professional OHADA payslip needs richer legal and payroll line detail, pack provenance, YTD, leave balance, payment reference, employer/employee identity, contract classification, and generated immutable document/archive behavior.

### 4. Declaration lifecycle is only preparation-grade

The schema has declaration statuses through submission, acceptance, payment, reconciliation, and archive, but the service currently prepares declarations and produces expert-review fallback. There is no country-specific declaration adapter, authority submission evidence, acceptance/rejection handling, authority payment workflow, or statutory filing proof trail.

### 5. UI is a control dashboard, not an enterprise payroll center

`PayrollControlWorkbench` is useful but operationally thin. It shows counts and queues for runs, blockers, payment batches, and declarations. It does not yet provide:

- a run wizard: inputs -> calculate -> review -> approve -> emit -> pay -> post -> declare;
- employee/contract/payslip drillthrough;
- role-specific views for HR manager, payroll officer, accountant, treasurer, auditor, employee;
- evidence drawer/proof links per run, payslip, declaration, and payment;
- guided next actions and blockers first;
- mobile-optimized workflow controls;
- bilingual payroll labels inside the payroll app surface.

### 6. The hook layer exists but appears unused by the current server-rendered page

`hooks/payroll/usePayrollWorkbench.ts` defines TanStack Query hooks and mutations, but the current payroll route renders data through a server action. That is not wrong, but it means the interactive mutation hooks are not yet visibly wired into a full client workflow.

### 7. DB immutability claim does not match the inspected workspace

The prior completion report says a migration `20260615193000_payroll_completion_immutability` added triggers for posted runs, emitted payslips, released payment batches, allocations, and declarations. In this workspace, `prisma/migrations` only shows later migrations from June 18, 19, and 21; a search under `prisma/` did not find payroll immutability triggers. This is a production blocker unless those triggers exist outside the current worktree or were intentionally dropped.

## What Is Missing Entirely Or Not Evident

### Product/workflow gaps

- Employee master-data UI and service boundary.
- Contract lifecycle UI and service boundary.
- Rubrique catalog and employee assignment workflow.
- Compensation changes with maker-checker approval.
- Payroll run review screen with line-level evidence.
- Payslip viewer, export, PDF/archive, employee self-service.
- Payroll declaration submission/reconciliation workbench.
- Authority payment lifecycle.
- Correction run workflow UI and service depth.
- Payroll register / livre de paie tie-out report.
- Payroll export controls and audit-worthy export flow.
- Manager/team payroll visibility policy.
- Leave balance management and attendance source integration beyond frozen snapshots.

### Control and compliance gaps

- Confirmed DB-level immutability triggers are absent in this worktree.
- No full statutory filing adapters.
- No external/legal expert approval registry for country-pack payroll rules.
- No complete IRPP/income-tax/social contribution breadth.
- No full four-eyes workflow across run review/approval/payment release/declaration submission.
- No visible row-version concurrency enforcement on employee/contract/run/payment mutation paths beyond idempotency.
- No tenant-escape test matrix for every payroll model/list/search/export path.
- No payment destination approval/change workflow despite payment destination hashes being required for release.
- No salary read audit surface for payroll/person-level access outside incident redaction.

### UX gaps

- No flagship HR/payroll dashboard that answers what is due, blocked, risky, proven, payable, declared, and reconciled.
- No persona-specific cockpit.
- No payroll calendar.
- No onboarding wizard.
- No mobile workflow for approvals or exceptions.
- No bilingual payroll domain copy throughout the module surface.
- No proof/evidence drawer on payroll workbench rows.

## Risk Register

| Priority | Area | Gap | Risk | Evidence | Recommendation |
|---|---|---|---|---|---|
| P0 | DB immutability | Reported payroll immutability migration is not present in inspected migrations | Emitted/posted artifacts may be mutable at DB level if service boundary is bypassed | `prisma/migrations` lacks `20260615193000_payroll_completion_immutability`; trigger scan under `prisma/` found no payroll trigger definitions | Restore/add audited immutability migration and tests before production payroll |
| P0 | Statutory accuracy | Calculation only covers a narrow CNPS-style pension path, not full payroll law | Incorrect payslips/declarations and statutory exposure | `calculatePayrollRun` uses pension rates and salary proration; broader rubriques/tax logic not found | Build country-pack-driven payroll rules engine and expert-reviewed Cameroon pack expansion |
| P0 | Employee data privacy | No complete employee/payslip self-service/access audit workflow found | Salary/person data exposure risk | Data model has masked/hash fields, but no full salary/payslip access product or audit path found | Add privacy policy layer, salary-read auditing, employee self-service, and role-specific redaction |
| P1 | HR operations | Employee and contract management UI/services missing | HR cannot safely maintain source payroll data | Only `PayrollControlWorkbench` route/component found | Build employee/contract/compensation workflows before expanding payroll operations |
| P1 | Payroll lifecycle UX | Workbench is read-only queue, not a guided lifecycle | Operators may not know what to do next; hidden manual steps | UI lists counts/queues but no wizard or drillthrough workflow | Recompose into payroll command center with run wizard and blocker-first action board |
| P1 | Declarations | Preparation fallback exists, but no submission/acceptance/payment/reconciliation adapters | Statutory filing remains manual/unproven | `preparePayrollDeclarations` falls back to expert-review liability review | Add declaration adapters and authority evidence lifecycle |
| P1 | Payments | Payment release has strong controls, but bank/mobile-money file generation and settlement matching are not complete payroll product flows | Payment operations can remain manual and hard to certify | Release creates transaction/exception, but no payroll payment workbench/drilldown found | Build payroll payment batch detail, provider evidence upload/match, retry states |
| P2 | Assurance | Only released payroll payment evidence check is visible | Other payroll invariants may not be monitored | Assurance registry has `payroll.released_payment_evidence.required` | Add checks for attendance freeze drift, duplicate posting, missing payslip archive, declaration due risk, country-pack provenance |
| P2 | Testing | Focused tests are good but not complete chaos matrix | Regressions can slip through edge paths | 12 focused tests pass; no full tenant escape/export/correction/self-service matrix found | Add permanent payroll chaos and tenant-escape suites |
| P2 | Reporting | No livre de paie/tie-out report found | Payroll cannot be certified end-to-end | Workbench shows counts, not register tie-outs | Build payroll register and accountant/auditor certification report |

## Target Enterprise Experience

The professional version should become a role-aware HR/Payroll Command Center:

- First viewport: current payroll period, due actions, blocked evidence, statutory deadlines, net payable, ledger/posting state, declaration state, payment/reconciliation state, and confidence/trust state.
- HR workspace: employee profile, contracts, payment profile, salary history, documents, leave/presence, compensation items.
- Payroll officer workspace: input readiness, calculation preview, anomalies, run wizard, payslip issue queue.
- Approver workspace: four-eyes review, evidence summary, variance/high-risk highlights, fresh-auth approval.
- Accountant workspace: posting rules, source links, livre de paie tie-out, close blockers.
- Treasurer workspace: payment batch preparation, approval/release, bank/mobile-money evidence, reconciliation exceptions.
- Auditor workspace: read-only evidence, immutable hashes, actor chain, redacted person-level views when required.
- Employee self-service: own payslips, limited own profile, documents, payment destination change request.

## Recommended Roadmap

### Phase 0: Recovery and production gate hardening

Goal: make the current foundation safe to rely on.

- Restore/add payroll immutability migration for posted runs, emitted payslips, payslip lines, released payment batches, allocations, and prepared/submitted declarations.
- Add tests proving DB immutability and allowed correction state transitions.
- Add a payroll hardcode/static gate for non-test rate literals and direct statutory constants.
- Add payroll tenant-escape tests for all current service and action paths.
- Add missing loading state for `/dashboard/payroll` if desired for route responsiveness.

### Phase 1: HR source-data foundation

Goal: make payroll inputs professionally maintainable.

- Build `services/payroll/employee.service.ts` and `contract.service.ts`.
- Add routes for employees and contracts under `/dashboard/payroll`.
- Add payment profile approval/change workflow with maker-checker and audit.
- Add compensation/rubrique catalog and employee assignment models/services.
- Add document/evidence references for contracts, salary changes, identifiers, and payment details.

### Phase 2: Payroll run operating cockpit

Goal: turn the workbench into a guided payroll command center.

- Recompose `PayrollControlWorkbench` into a first-viewport command brief and action board.
- Add run wizard: freeze inputs, calculate, review, approve/post, emit payslips, release payment, prepare declarations.
- Add line-level run review with anomalies, evidence, and redactions.
- Add drillthrough pages for run, payslip, payment batch, declaration, and blocker details.
- Add proof drawer integration for payroll run/payment/declaration evidence.

### Phase 3: Statutory rules and declarations

Goal: move from honest fallback to real country-pack-driven statutory payroll.

- Expand Cameroon payroll country pack with expert-reviewed IRPP, CNPS family allowance, occupational risk, taxable/social bases, rubriques, filing deadlines, and declaration layouts.
- Build declaration adapters for authority-specific outputs and submission evidence.
- Add declaration payment and reconciliation workflows.
- Add legal/expert review provenance for statutory pack changes.

### Phase 4: Payslips, self-service, and reports

Goal: make it feel like a real payroll product.

- Build payslip viewer/PDF/archive from immutable data.
- Add employee self-service with own payslip access and limited profile visibility.
- Add livre de paie/payroll register with payslip/run/ledger/declaration/payment tie-out.
- Add payroll exports with permission, fresh auth, redaction, and audit.
- Add bilingual French-first payroll labels and payslip/domain copy.

### Phase 5: Assurance and chaos hardening

Goal: make it robust under abuse, failure, and concurrency.

- Add assurance checks for attendance freeze drift, missing archive, duplicate run/posting/payment/declaration, declaration due risk, payment destination changes before payroll, unusual salary changes, and correction abuse.
- Add chaos tests for rollback, double-submit, concurrent calculation, concurrent approval, closed-period posting, correction integrity, and tenant escape.
- Add browser smoke tests for HR/payroll command center, run detail, approval, payment, declarations, payslip, and self-service.

## Final Recommendation

Do not rebuild from scratch. The payroll kernel has real value: dedicated models, service-layer controls, country-pack provenance, business events, ledger posting, payment evidence, declarations, redaction signals, and focused tests already exist.

Do not ship it as a complete enterprise HR/Payroll module yet. It is currently a controlled payroll foundation plus a read-only control workbench. It lacks the full HR source-data product, statutory breadth, payslip/self-service product, declaration adapters, immutability migration proof in this workspace, and full payroll chaos/tenant-escape coverage.

Recommended path: phased recomposition and hardening.

- Immediate priority: restore/prove DB immutability and harden the current payroll kernel.
- Next: build employee/contract/compensation source-data workflows.
- Then: recompose the UI into a professional payroll command center.
- Finally: expand statutory country packs, declaration adapters, payslip/self-service, and assurance/chaos gates.

## Selected Skill

- `012-aqstoqflow-payroll-presence-engine`
- `ohada-payroll-engine`
- `kontava-payroll-statutory-assurance`

## Gates Passed

- Tenant-scoped payroll schema exists.
- Payroll service uses country-pack provenance for calculation.
- Focused payroll tests pass.
- Prisma schema validation passes.
- Typecheck passes.
- Server actions derive tenant and actor context from auth/RBAC.
- Payment release requires fresh auth through protected actions.
- Payment release includes SoD and idempotency checks.
- Payroll payment evidence is connected to ledger/reconciliation surfaces.

## Gates Blocked

- DB immutability migration/triggers are not present in the inspected workspace.
- Full statutory payroll rules and declaration adapters are incomplete.
- Employee/contract/rubrique/payroll source-data UI is missing.
- Payslip PDF/archive/self-service is missing.
- Payroll register/livre de paie certification is missing.
- Full tenant escape, correction, export, and chaos test matrix is missing.

## Next Recommended Work

Run a focused Phase 0 hardening slice:

1. Restore/add payroll immutability migration and tests.
2. Add tenant-escape tests for current payroll services/actions.
3. Add payroll command-center report model for blockers, evidence, and next actions.
4. Prepare the Phase 1 employee/contract/rubrique workflow implementation plan.
