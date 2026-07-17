# Aqstoqflow HR/Payroll Prompt 11 Payroll Command Read Model Report

Date: 2026-06-26

Source skill: `aqstoqflow-hrpayroll-11-command-read-model`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Decision

Prompt 11 is implemented for the service-owned payroll command read-model slice.

The implementation deliberately does not redesign the payroll UI, add command-center visuals, create dashboard-only shadow services, compute payroll truth in the client, add statutory formulas, release payments, or mutate finalized payroll evidence.

## Expert Lenses Applied

- Enterprise architect
- BI/read-model specialist
- Security and RBAC reviewer
- Payroll privacy reviewer
- Accounting and close-control reviewer

## Source Prerequisite IDs

- P0.13
- P2.01
- P2.02
- P2.05

## Files Inspected

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_10_PAYMENT_EVIDENCE_READINESS_REPORT_2026-06-26.md`
- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- `components/payroll/PayrollControlWorkbench.tsx`
- `actions/payroll/payroll-control.actions.ts`
- `services/_shared/protect.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/employee.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/security/redaction-policy.service.ts`
- `lib/security/rbac-permissions.ts`
- `config/permissions.ts`
- `prisma/schema.prisma`

## Prerequisite Gate

Status: passed.

Evidence:

- Prompt 10 report hands off to Prompt 11 with no blockers.
- Existing source-data, privacy, payment-evidence, and module-denial tests passed before implementation.
- Redaction and salary-read audit behavior remained service-owned.
- Module disablement behavior remains enforced through the shared protected action wrapper.

Prerequisite gate command:

`npm test -- --runTestsByPath services/payroll/__tests__/payroll-employee.service.test.ts services/payroll/__tests__/payroll-payment-evidence.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand`

Result: 4 suites passed, 20 tests passed.

## Implemented

### Command Read Model Service

File: `services/payroll/command-read-model.service.ts`

Added `getPayrollCommandReadModel`, a server-owned read model that composes trusted outputs from:

- `getPayrollWorkbenchData`
- `getPayrollEmployeeSourceData`
- `getPaymentEvidenceReadiness`
- Direct server-side Prisma reads for command-level counts, current period evidence, linked close-run state, and freshness metadata

The read model includes:

- Current payroll period
- Trusted counts
- Role scope
- Payroll amount redaction policy result
- Readiness sections
- Blockers
- Next actions
- Evidence hashes and lifecycle pointers
- Freshness indicators
- Source coverage and source-service provenance
- Existing workbench data for backward-compatible composition

### Protected Server Action

File: `actions/payroll/payroll-command-read-model.actions.ts`

Added `getPayrollCommandReadModelAction`, protected by:

- `payroll.command.read`
- Payroll module entitlement gate
- Server-derived organization and actor context
- `auditAllowed: false` on the RBAC guard
- Handler-derived tenant ownership

### Permission Vocabulary

Files:

- `lib/security/rbac-permissions.ts`
- `config/permissions.ts`

Added:

- `payroll.command.read`

Important privacy decision:

- `payroll.command.read` is explicit and high-risk, but it is not aliased to broad salary-capable permissions. This prevents command-read access from implicitly becoming salary-read access through permission expansion.

### Existing Service Consumption Permission

Files:

- `services/payroll/employee.service.ts`
- `services/payroll/payment-evidence.service.ts`

Extended read permissions so the command read model can consume existing audited services:

- Employee source-data read accepts `payroll.command.read`.
- Payment destination readiness read accepts `payroll.command.read`.
- Attendance readiness read accepts `payroll.command.read`.

This keeps source-data and payment-evidence rules in their owning services rather than duplicating them in the dashboard or action layer.

## Security And Privacy Decisions

- Command data is built on the server.
- No client-computed payroll truth was introduced.
- Salary/person amount redaction is evaluated inside the service and exposed as policy metadata.
- Command read access does not imply salary-read authorization by alias expansion.
- Payment destination details remain masked and delegated to the payment-evidence service.
- Every command read writes a dedicated `PAYROLL_COMMAND_READ_MODEL_READ` audit log.
- The protected action derives tenant and actor context server-side.
- Payroll module entitlement blocks the action before service execution.

## Accounting And Finance Decisions

The command model surfaces blockers only from trusted server-side sources:

- Payroll run and register readiness from payroll run records
- Payment and reconciliation blockers from the payroll workbench service
- Declaration follow-up from payroll declaration state
- Posting blockers from ledger posting batch counts already exposed by the workbench service
- Close blockers from the linked close run for the payroll period's accounting period

No statutory formula, legal rate, or country-pack calculation was added in this slice.

## UI/UX Decisions

No UI was changed in this slice.

The read model is shaped for Prompt 12 to compose a command-center UX without requiring UI-side totals, readiness calculations, blocker logic, role-scope decisions, or privacy decisions.

## Tests And Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts actions/payroll/__tests__/payroll-command-read-model.actions.test.ts --runInBand`
  - 2 suites passed
  - 5 tests passed
- `npx eslint services/payroll/command-read-model.service.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts actions/payroll/payroll-command-read-model.actions.ts actions/payroll/__tests__/payroll-command-read-model.actions.test.ts services/payroll/employee.service.ts services/payroll/payment-evidence.service.ts lib/security/rbac-permissions.ts config/permissions.ts`
  - Passed with one pre-existing warning in `config/permissions.ts` about anonymous default export.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts actions/payroll/__tests__/payroll-command-read-model.actions.test.ts services/payroll/__tests__/payroll-employee.service.test.ts services/payroll/__tests__/payroll-payment-evidence.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts --runInBand`
  - 7 suites passed
  - 30 tests passed
- `npm run prisma:validate`
- `npm run typecheck`
- `npm run service:boundary:fail`
- `npm run policy:gates`
  - inventory boundary: passed
  - service boundary: passed
  - workflow assurance runtime table check: ready
  - payroll immutability runtime check: ready, 7/7 triggers present, 9/9 forbidden mutations blocked, 3/3 allowed lifecycle checks passed
  - hard-delete gate: passed
  - regulatory hardcode gate: passed
  - demo/report trust gate: passed
  - raw error boundary gate: passed
- `git diff --check -- <Prompt 11 touched files>`
  - Passed; Git reported line-ending warnings for `config/permissions.ts` and `lib/security/rbac-permissions.ts`.

Skipped:

- `npm run prisma:generate` was not run because Prompt 11 made no Prisma schema changes.

## Files Changed In This Slice

- `services/payroll/command-read-model.service.ts`
- `actions/payroll/payroll-command-read-model.actions.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `actions/payroll/__tests__/payroll-command-read-model.actions.test.ts`
- `services/payroll/employee.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `lib/security/rbac-permissions.ts`
- `config/permissions.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_11_COMMAND_READ_MODEL_REPORT_2026-06-26.md`

## Single Source Of Truth Controls

Preserved:

- Services own HR/payroll business truth.
- Server actions expose protected workflows.
- Dashboards remain render-only.
- RBAC governs capability.
- Module entitlement governs tenant/module access.
- No client-computed payroll truth was introduced.
- No duplicated dashboard metrics or shadow payroll services were introduced.
- No statutory legal claim or unsupported country-pack automation was introduced.
- No finalized payroll evidence mutation was introduced.

## Risks Found Or Avoided

Avoided:

- Granting salary-read capability through `payroll.command.read` alias expansion.
- Recomputing payment destination approval or attendance drift in the dashboard.
- Letting Prompt 12 depend on UI-calculated readiness.
- Creating a dashboard-specific command service outside the payroll service boundary.

Remaining:

- Prompt 12 must switch the payroll UI to consume this read model carefully and remain render-only.
- Existing roles or seeds may need to include `payroll.command.read` before the new command-center surface is exposed broadly.

## Blockers

No Prompt 11 blockers remain.

## Not Implemented In This Slice

- Visual command-center UX
- Proof drawer
- Payslip self-service
- Payment release UI
- Payment reconciliation workbench
- Statutory formula expansion
- Payroll calculation changes
- Database schema changes

## Handoff

Prompt 12 may proceed.

Recommended next skill: `aqstoqflow-hrpayroll-12-command-center-ux`.

Prompt 12 should consume `getPayrollCommandReadModelAction` and keep the payroll command-center UI render-only: no client totals, no client blocker rules, no salary/privacy decisions, and no dashboard-specific shadow services.