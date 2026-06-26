# Aqstoqflow HR/Payroll Prompt 10 Payment Evidence Readiness Report

Date: 2026-06-26

Source skill: `aqstoqflow-hrpayroll-10-payment-evidence-readiness`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Decision

Prompt 10 is implemented for the server-owned payment destination approval, HR evidence aggregation, and attendance freeze/drift readiness slice.

The implementation deliberately does not add payment release UI, reconciliation workbench, employee self-service, command-center wizard, statutory automation, or client-computed payroll truth.

## Expert Lenses Applied

- Finance controls expert
- HR operations architect
- Payroll evidence auditor
- Cybersecurity/RBAC reviewer
- SaaS tenant-isolation reviewer

## Source Prerequisite IDs

- P1.07
- P1.08
- P1.09
- P5.03

## Files Inspected

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_08_EMPLOYEE_CONTRACT_WORKFLOW_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_09_COMPENSATION_APPROVAL_REPORT_2026-06-26.md`
- `prisma/schema.prisma`
- `services/payroll/employee.service.ts`
- `services/payroll/contract.service.ts`
- `services/payroll/compensation.service.ts`
- `services/payroll/payroll-control.service.ts`
- `actions/payroll/payroll-compensation.actions.ts`
- Payroll completion, tenant-boundary, privacy, contract, and compensation tests
- `lib/security/rbac-permissions.ts`
- `config/permissions.ts`

## Prerequisite Gate

Status: passed.

- Employee-user mapping exists from Prompt 08.
- Contract workflow and HR source data are service-backed and tested.
- Compensation and salary-change maker-checker rules exist from Prompt 09.
- Salary privacy and redaction rules exist and were preserved.
- Payment release controls are inspectable and now enforce approved destination evidence, not only a destination hash.
- Attendance snapshots are tenant-scoped through `organizationId`, employee relation, and service reads.

## Implemented

### Schema And Migration

Files:

- `prisma/schema.prisma`
- `prisma/migrations/20260626103000_payroll_payment_evidence_readiness/migration.sql`

Added:

- `PayrollPaymentDestinationChangeStatus`
- `PayrollPaymentDestinationChangeRequest`
- Organization and employee relations for payment destination change requests

The model stores approval state, masked destination details, destination hashes, evidence hashes, maker/checker actor IDs, business-event links, metadata, tenant scope, and indexes.

### Service Layer

File: `services/payroll/payment-evidence.service.ts`

Added:

- `getPaymentEvidenceReadiness`
- `requestPaymentDestinationChange`
- `approvePaymentDestinationChange`
- `rejectPaymentDestinationChange`
- `applyApprovedPaymentDestinationChange`
- `assertApprovedPaymentDestinationEvidence`

Service controls:

- Raw bank/mobile inputs are normalized, hashed, masked, and not persisted.
- Payment destination request/approval/application uses maker-checker controls.
- Requesters cannot approve, reject, or apply their own request.
- Applying an approved destination updates the employee destination fields and employee metadata with applied approval evidence.
- Payment evidence references are merged into HR evidence metadata without storing document payloads.
- Readiness data returns masked destination state, evidence presence, contract/salary/payment evidence hashes, and attendance readiness.
- Attendance readiness detects missing snapshots, non-frozen snapshots, missing source hashes, and source drift against expected hashes.

### Protected Server Actions

File: `actions/payroll/payroll-payment-evidence.actions.ts`

Added protected actions:

- `getPaymentEvidenceReadinessAction`
- `requestPaymentDestinationChangeAction`
- `approvePaymentDestinationChangeAction`
- `rejectPaymentDestinationChangeAction`
- `applyApprovedPaymentDestinationChangeAction`

Action protections:

- Payroll module entitlement enforced.
- Tenant and actor context derived server-side.
- Fresh authentication required for all destination mutations.
- Payroll paths revalidated after mutations.

### Permission Vocabulary

Files:

- `lib/security/rbac-permissions.ts`
- `config/permissions.ts`

Added:

- `payroll.payment_destination.read`
- `payroll.payment_destination.request`
- `payroll.payment_destination.approve`
- `payroll.payment_destination.apply`
- `payroll.attendance.readiness.read`

### Payment Release Control

File: `services/payroll/payroll-control.service.ts`

Payment release now calls `assertApprovedPaymentDestinationEvidence` for every allocation before creating the payment batch. A destination hash alone no longer satisfies release readiness; it must match an applied payment destination change request with evidence and approval hashes.

## Security And Privacy Decisions

- No raw bank account or mobile money phone value is persisted in the new workflow.
- Read models return masked destination state and redaction policy labels only.
- Destination approval requires RBAC, module entitlement, fresh auth, audit, and maker-checker separation.
- Tenant scope is enforced on employee lookup, request lookup, readiness reads, and release assertion.
- Payment release blocks when approval evidence is missing, incomplete, stale, or mismatched.

## Accounting And Finance Decisions

- Payroll payment release requires applied destination approval evidence before disbursement.
- The release evidence hash still includes destination hashes, but the gate now proves the destination hash is backed by approved evidence.
- Attendance readiness exposes source freeze and drift state needed for payroll calculation and audit.
- Close invalidation behavior remains covered by existing payroll completion and close-assurance tests.

## UI/UX Decisions

No UI was added in this slice.

Future UI/read-model work should render approval state, evidence state, masked destination, and attendance readiness from the service-owned read model. It must not display raw sensitive payment details or compute readiness client-side.

## Tests And Validation

Passed:

- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-evidence.service.test.ts actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand`
  - 3 suites passed
  - 13 tests passed
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-evidence.service.test.ts actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts services/payroll/__tests__/payroll-completion.service.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts services/payroll/__tests__/payroll-contract.service.test.ts actions/payroll/__tests__/payroll-contract.actions.test.ts services/payroll/__tests__/payroll-compensation.service.test.ts actions/payroll/__tests__/payroll-compensation.actions.test.ts --runInBand`
  - 9 suites passed
  - 49 tests passed
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand`
  - 2 suites passed
  - 12 tests passed
- `npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand`
  - 1 suite passed
  - 7 tests passed
- `npx eslint services/payroll/payment-evidence.service.ts services/payroll/__tests__/payroll-payment-evidence.service.test.ts actions/payroll/payroll-payment-evidence.actions.ts actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-completion.service.test.ts lib/security/rbac-permissions.ts config/permissions.ts`
  - Passed with one pre-existing warning in `config/permissions.ts` about anonymous default export.
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

Additional hygiene:

- Placeholder/literal-marker search on Prompt 10 touched files found no matches.
- `git diff --check` was attempted and failed only on an unrelated pre-existing blank line at EOF in `services/owner-war-room/owner-war-room.service.ts` plus broad line-ending warnings from the dirty worktree.

## Files Changed In This Slice

- `prisma/schema.prisma`
- `prisma/migrations/20260626103000_payroll_payment_evidence_readiness/migration.sql`
- `services/payroll/payment-evidence.service.ts`
- `actions/payroll/payroll-payment-evidence.actions.ts`
- `services/payroll/payroll-control.service.ts`
- `lib/security/rbac-permissions.ts`
- `config/permissions.ts`
- `services/payroll/__tests__/payroll-payment-evidence.service.test.ts`
- `actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts`
- `services/payroll/__tests__/payroll-completion.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_10_PAYMENT_EVIDENCE_READINESS_REPORT_2026-06-26.md`

## Single Source Of Truth Controls

Preserved:

- Services own payment destination approval, evidence readiness, and attendance readiness truth.
- Server actions only expose protected workflows.
- Payroll release consumes service-owned approval proof.
- Dashboards remain render-only.
- No client-computed payroll/payment/attendance truth was introduced.
- No duplicated metrics or dashboard shadow services were introduced.
- No statutory claim or formula was introduced.
- No payment UI, reconciliation UI, self-service, or command wizard was introduced.

## Risks Found Or Avoided

Avoided:

- Payment release based only on a bare destination hash.
- Raw bank/mobile detail persistence.
- Maker-checker bypass for destination approval.
- Client-owned payment readiness or attendance drift logic.
- UI-first payment workflow exposure.

Remaining:

- Existing employees with legacy `paymentDestinationHash` but no applied `PayrollPaymentDestinationChangeRequest` approval metadata will be blocked from future payroll payment release until destination evidence is migrated or re-approved.
- Prompt 11 should consume this service-owned readiness model rather than deriving command data in UI.

## Blockers

No Prompt 10 blockers remain.

## Not Implemented In This Slice

- Payment release UI.
- Payment reconciliation workbench.
- Payslip self-service.
- Command-center wizard.
- Statutory formula expansion.
- Attendance capture UI or presence system redesign.

## Handoff

Prompt 11 may proceed.

Recommended next skill: `aqstoqflow-hrpayroll-11-command-read-model`.

Prompt 11 should build command read models on top of:

- Employee and contract truth from Prompt 08.
- Compensation and salary-change truth from Prompt 09.
- Payment destination approval and attendance readiness truth from Prompt 10.

It must keep dashboards render-only and must not duplicate payroll truth client-side.