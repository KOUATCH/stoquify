# Aqstoqflow HR/Payroll Prompt 08 Employee Contract Workflow Report

Date: 2026-06-26

Source skill: `aqstoqflow-hrpayroll-08-employee-contract-workflow`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Decision

Prompt 08 is implemented for the server-owned employee identity and contract workflow slice.

The implementation deliberately stops before payslip self-service, salary-change workflow, payment destination workflow, command-center UI expansion, and any client-computed payroll truth.

## Prerequisite Gate

Status: passed for this slice.

- Prompt 07 source-data foundation exists and provides `services/payroll/employee.service.ts`.
- Employee ownership remains tenant-bound through `PayrollEmployee.organizationId`, `PayrollEmployee.userId`, and service-level checks.
- Employee-user mapping has an own-data resolver, but no self-service route was exposed.
- Contract truth remains in `PayrollContract`, protected service methods, protected actions, audit logs, and business events.
- Runtime payroll immutability proof was available through the local dedicated test DB wrapper before this prompt ran.

## Implemented

### Service Layer

File: `services/payroll/contract.service.ts`

Added:

- `getEmployeeContractWorkflow`
- `resolvePayrollEmployeeForUser`
- `createPayrollContract`
- `updatePayrollContract`
- `terminatePayrollContract`
- Zod input schemas for read, resolver, create, update, and termination workflows.
- Tenant-scoped employee lookup before contract mutation.
- Duplicate contract-number protection.
- Active contract overlap protection.
- Signed evidence requirement before activating a contract.
- Contract lifecycle business events.
- Contract lifecycle audit logs.
- Active salary mutation blocker that forces future salary changes into the compensation approval workflow.
- Contract salary redaction unless the actor has explicit salary/payslip permission.
- Own-data resolver denial when a user requests another employee's record.

### Protected Server Actions

File: `actions/payroll/payroll-contract.actions.ts`

Added protected actions:

- `getEmployeeContractWorkflowAction`
- `resolvePayrollEmployeeForUserAction`
- `createPayrollContractAction`
- `updatePayrollContractAction`
- `terminatePayrollContractAction`

Action protections:

- Payroll module entitlement enforced.
- RBAC enforced.
- Tenant and actor fields derived from authenticated context.
- Fresh authentication required for create, update, and terminate.
- Payroll paths revalidated after mutations.

### Tests

Files:

- `services/payroll/__tests__/payroll-contract.service.test.ts`
- `actions/payroll/__tests__/payroll-contract.actions.test.ts`

Coverage added:

- Tenant-scoped contract workflow read.
- Salary redaction.
- Contract read permission denial.
- Employee-user own-data denial.
- Tenant-owned employee requirement for contract creation.
- Signed active contract evidence.
- Duplicate/overlap active contract protection.
- Active contract salary mutation blocker.
- Contract termination event and audit history.
- Protected action module gate.
- Protected action fresh-auth gate.
- Authenticated tenant/actor derivation.

## Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-contract.service.test.ts actions/payroll/__tests__/payroll-contract.actions.test.ts --runInBand`
  - 2 suites passed
  - 15 tests passed
- `npx eslint services/payroll/contract.service.ts services/payroll/__tests__/payroll-contract.service.test.ts actions/payroll/payroll-contract.actions.ts actions/payroll/__tests__/payroll-contract.actions.test.ts`
- `npm run prisma:validate`
- `npm run service:boundary:fail`
- `npm run typecheck`
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

- Services own employee/contract workflow truth.
- Server actions only expose protected workflows.
- No dashboard-specific contract state was introduced.
- No client-computed payroll eligibility was introduced.
- No duplicated payroll metrics were introduced.
- No UI route was added before the service/action/test foundation.
- No finalized payroll evidence is mutated in place.
- Salary-change workflow is blocked until Prompt 09 compensation approval.

## Risks Found Or Avoided

Avoided:

- Cross-tenant contract mutation by deriving tenant from protected action context and checking employee ownership in the service.
- Cross-employee own-data access by requiring user-to-employee mapping to match the requested employee.
- Duplicate active contracts by checking effective-date overlap before activation.
- Premature salary-change implementation by blocking active contract salary mutation.
- Payroll amount exposure by redacting contract salary unless explicit salary/payslip permission is present.

Noted:

- Existing RBAC aliases are broad around payroll read permissions. This slice therefore applies explicit salary/payslip permission gating in the contract workflow read model instead of treating contract-read alone as salary visibility.

## Blockers

No Prompt 08 blockers remain.

## Not Implemented In This Slice

- Payslip self-service.
- Employee self-service route.
- Salary/compensation approval workflow.
- Payment destination workflow.
- Payroll command-center UI expansion.
- Payroll calculation changes.
- Statutory declaration changes.

## Handoff

Prompt 09 may proceed.

Recommended next skill: `aqstoqflow-hrpayroll-09-compensation-approval`.

Prompt 09 prerequisites:

- Use the contract workflow service as the contract truth boundary.
- Do not mutate active contract salary in place.
- Implement compensation approval as a separate maker-checker workflow with evidence, audit, RBAC, and explicit salary privacy controls.
- Re-run the payroll release gates after the compensation slice.
