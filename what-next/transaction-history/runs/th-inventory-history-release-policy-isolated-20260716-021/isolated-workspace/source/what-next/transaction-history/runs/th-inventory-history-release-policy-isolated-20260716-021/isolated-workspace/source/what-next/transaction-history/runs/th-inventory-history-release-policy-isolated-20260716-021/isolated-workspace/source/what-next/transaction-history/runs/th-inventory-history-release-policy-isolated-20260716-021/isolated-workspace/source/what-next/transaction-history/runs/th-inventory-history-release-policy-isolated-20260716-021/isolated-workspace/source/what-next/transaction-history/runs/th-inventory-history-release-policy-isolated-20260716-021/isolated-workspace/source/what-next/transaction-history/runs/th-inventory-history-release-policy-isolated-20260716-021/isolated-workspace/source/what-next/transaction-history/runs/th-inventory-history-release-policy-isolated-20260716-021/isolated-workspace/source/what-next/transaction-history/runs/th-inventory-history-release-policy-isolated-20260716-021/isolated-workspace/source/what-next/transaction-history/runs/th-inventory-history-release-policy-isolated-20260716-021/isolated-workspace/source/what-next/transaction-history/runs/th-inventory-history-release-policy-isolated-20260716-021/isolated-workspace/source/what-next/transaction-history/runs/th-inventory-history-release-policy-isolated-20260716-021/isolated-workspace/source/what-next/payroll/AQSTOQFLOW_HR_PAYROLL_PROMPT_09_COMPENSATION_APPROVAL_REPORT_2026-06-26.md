# Aqstoqflow HR/Payroll Prompt 09 Compensation Approval Report

Date: 2026-06-26

Source skill: `aqstoqflow-hrpayroll-09-compensation-approval`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Decision

Prompt 09 is implemented for the server-owned compensation/rubrique catalog and maker-checker salary-change workflow slice.

The implementation intentionally does not add payslip surfaces, statutory formulas, payroll command-center redesign, or client-side salary editing.

## Prerequisite Gate

Status: passed.

- Prompt 08 report exists and explicitly handed off to Prompt 09.
- Employee and contract workflows are service-backed and tested.
- The hardcode gate passed before and after this slice.
- Salary permission separation is strengthened through explicit salary/payslip visibility checks.
- Maker-checker rules are now implemented in the salary-change approval service.

## Implemented

### Schema And Migration

Files:

- `prisma/schema.prisma`
- `prisma/migrations/20260626093000_payroll_compensation_approval/migration.sql`

Added:

- `PayrollRubrique`
- `PayrollEmployeeRubriqueAssignment`
- `PayrollSalaryChangeRequest`
- `PayrollRubriqueKind`
- `PayrollRubriqueValueType`
- `PayrollRubriqueStatus`
- `PayrollRubriqueAssignmentStatus`
- `PayrollSalaryChangeStatus`

The schema supports:

- Tenant-owned compensation/rubrique catalog.
- Taxable/social/employer-charge metadata.
- Country-pack provenance fields for statutory rubriques.
- Employee rubrique assignment with effective dating and evidence.
- Salary-change requests with current/proposed salary, evidence, approver/apply actors, business-event references, and effective dates.
- Contract versioning through a superseding contract instead of active contract salary mutation.

### Permission Vocabulary

Files:

- `lib/security/rbac-permissions.ts`
- `config/permissions.ts`

Added:

- `payroll.compensation.read`
- `payroll.compensation.manage`
- `payroll.salary_changes.read`
- `payroll.salary_changes.request`
- `payroll.salary_changes.approve`
- `payroll.salary_changes.apply`

### Service Layer

File: `services/payroll/compensation.service.ts`

Added:

- `getCompensationWorkflow`
- `upsertPayrollRubrique`
- `assignEmployeeRubrique`
- `requestSalaryChange`
- `approveSalaryChange`
- `rejectSalaryChange`
- `applyApprovedSalaryChange`

Service controls:

- Tenant checks before employee, contract, rubrique, assignment, and salary-change access.
- Country-pack provenance resolution for statutory rubrique references.
- No statutory formula implementation or statutory legal claim.
- Salary redaction unless explicit salary/payslip permission exists.
- Fresh service-side permission checks.
- Maker-checker approval: requester cannot approve, reject, or apply their own salary change.
- Salary changes are applied by ending the source contract and creating a new effective-dated contract version.
- Existing payroll run lines on or after the salary-change effective date block application and require a corrective payroll workflow.
- Audit logs and business events are recorded for catalog, assignment, request, approval, rejection, and application workflows.

### Protected Server Actions

File: `actions/payroll/payroll-compensation.actions.ts`

Added protected actions:

- `getCompensationWorkflowAction`
- `upsertPayrollRubriqueAction`
- `assignEmployeeRubriqueAction`
- `requestSalaryChangeAction`
- `approveSalaryChangeAction`
- `rejectSalaryChangeAction`
- `applyApprovedSalaryChangeAction`

Action protections:

- Payroll module entitlement enforced.
- Tenant and actor are derived from authenticated context.
- Fresh auth is required for all compensation and salary-change mutations.
- Payroll paths are revalidated after mutations.

### Tests

Files:

- `services/payroll/__tests__/payroll-compensation.service.test.ts`
- `actions/payroll/__tests__/payroll-compensation.actions.test.ts`

Coverage added:

- Compensation workflow redaction.
- Rubrique country-pack provenance.
- Employee rubrique assignment event and audit evidence.
- Salary-change request without active contract salary mutation.
- Duplicate open salary-change request blocker.
- Maker-checker denial when requester attempts approval.
- Approval with evidence.
- Application by effective-dated contract versioning.
- Application blocker when existing payroll run lines overlap the effective date.
- Protected action tenant/actor derivation.
- Protected action module entitlement and fresh-auth gates.

## Validation

Passed:

- `npm run prisma:validate`
- `npm run prisma:generate`
  - Initial full generate hit Windows `EPERM` on `query_engine-windows.dll.node`.
  - `npx prisma generate --no-engine` succeeded as a temporary fallback, but aggregate runtime gates require the normal engine.
  - Generated engine artifacts were moved aside inside `node_modules/.prisma/client`, then full `npm run prisma:generate` passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-compensation.service.test.ts actions/payroll/__tests__/payroll-compensation.actions.test.ts --runInBand`
  - 2 suites passed
  - 15 tests passed
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-compensation.service.test.ts actions/payroll/__tests__/payroll-compensation.actions.test.ts services/payroll/__tests__/payroll-contract.service.test.ts actions/payroll/__tests__/payroll-contract.actions.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand`
  - 6 suites passed
  - 36 tests passed
- `npx eslint services/payroll/compensation.service.ts services/payroll/__tests__/payroll-compensation.service.test.ts actions/payroll/payroll-compensation.actions.ts actions/payroll/__tests__/payroll-compensation.actions.test.ts lib/security/rbac-permissions.ts config/permissions.ts`
  - Passed with one pre-existing warning in `config/permissions.ts` about anonymous default export.
- `npm run typecheck`
- `npm run service:boundary:fail`
- `npm run policy:gates`
  - inventory boundary: passed
  - service boundary: passed
  - workflow assurance runtime table check: ready
  - payroll immutability runtime check: ready, 7/7 triggers present, 9/9 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed
  - hard-delete gate: passed
  - regulatory hardcode gate: passed
  - demo/report trust gate: passed
  - raw error boundary gate: passed

## Single Source Of Truth Controls

Preserved:

- Services own compensation and salary-change truth.
- Server actions only expose protected workflows.
- Dashboards remain render-only; no new UI route was added.
- Salary change approval cannot bypass maker-checker.
- Active contract salary is not mutated in place by the approval workflow.
- No client-computed salary truth was introduced.
- No duplicated payroll metrics were introduced.
- No statutory formula or statutory legal claim was implemented.

## Risks Found Or Avoided

Avoided:

- Salary leak through compensation read models by redacting salary-bearing values unless explicit salary/payslip permission is present.
- Maker-checker bypass by rejecting requesters as approvers/rejecters/appliers.
- Direct active salary mutation by applying approved changes through effective-dated contract versioning.
- Retroactive corruption of existing payroll run evidence by blocking application when run lines exist on or after the salary-change effective date.
- Statutory hardcode bloat by resolving country-pack provenance without implementing unsupported formulas.

Remaining:

- Payroll calculation still reads only base contract salary. It has not yet consumed employee rubrique assignments.
- Payslip/register surfaces are not implemented in this slice.
- Statutory formulas remain blocked until expert-reviewed country-pack readiness is expanded in later prompts.

## Blockers

No Prompt 09 blockers remain.

## Not Implemented In This Slice

- Payslip self-service.
- Payroll register/livre de paie.
- Payment destination workflow.
- Payroll command-center redesign.
- Country-specific statutory calculation formulas.
- Client-side salary editing UI.

## Handoff

Prompt 10 may proceed.

Recommended next skill: `aqstoqflow-hrpayroll-10-payment-evidence-readiness`.

Prompt 10 should build on:

- Employee identity and contract workflow from Prompt 08.
- Compensation and salary-change approval workflow from Prompt 09.
- The rule that payment destination changes must require approved destination evidence and must not expose raw salary/person/payment details.
