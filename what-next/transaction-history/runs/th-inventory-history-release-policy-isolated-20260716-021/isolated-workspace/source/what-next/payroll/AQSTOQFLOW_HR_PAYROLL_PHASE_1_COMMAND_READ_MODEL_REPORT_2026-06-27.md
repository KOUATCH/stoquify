# AqStoqFlow HR/Payroll Phase 1 Command Read Model Report

Date: 2026-06-27

Skill applied: `aqstoqflow-hrpayroll-11-command-read-model`

Prompt name: Payroll Command Read Model

Architecture source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`

Predecessors:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SOURCE_DATA_FOUNDATION_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CONTRACT_LIFECYCLE_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMPENSATION_APPROVAL_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_PAYMENT_ATTENDANCE_READINESS_REPORT_2026-06-27.md`

## Decision

The payroll command read model now owns next-action route hints for implemented or already-existing control surfaces.

This is not a visual redesign, payroll run cockpit, payment release UI, declaration workbench, or client-owned command service. The service remains the source of command data: current period, blockers, readiness, next actions, evidence, freshness, role scope, redaction state, and trusted counts.

## Expert Lenses Applied

- Enterprise architect.
- BI/read-model specialist.
- Security and privacy reviewer.
- Payroll/accounting controls reviewer.
- UI composition reviewer for render-only command surfaces.

## Prerequisite Gate

Status: passed for this narrow Prompt 11 command read-model consolidation slice.

- Phase 1 source-data surfaces exist for setup, employee, contract, compensation, and payment/attendance readiness.
- The command read-model service already composes employee source data, payment evidence, attendance readiness, payroll workbench data, period/run/payment/declaration/close facts, salary redaction, audit, and trusted counts.
- The command read-model action derives tenant and actor context through `protect`, requires `payroll.command.read`, and enforces payroll module entitlement.
- Payroll privacy and tenant-boundary tests pass.
- Module-disabled behavior is covered by command action tests and route smoke tests.

## Files Inspected

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_PAYMENT_ATTENDANCE_READINESS_REPORT_2026-06-27.md`
- `services/payroll/command-read-model.service.ts`
- `actions/payroll/payroll-command-read-model.actions.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `services/payroll/employee.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/security/redaction-policy.service.ts`
- `services/modules/module-entitlement.service.ts`
- `services/events/business-event.service.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `actions/payroll/__tests__/payroll-command-read-model.actions.test.ts`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`

## Implementation Summary

- Added `href: string | null` to `PayrollCommandNextAction`.
- Added service-owned next-action route mapping in `command-read-model.service.ts`.
- Mapped only real implemented or already-existing routes:
  - employee source gaps to `/dashboard/payroll/employees`;
  - contract gaps to `/dashboard/payroll/contracts`;
  - compensation queues to `/dashboard/payroll/compensation`;
  - attendance and payment destination evidence gaps to `/dashboard/payroll/attendance`;
  - payroll period setup to `/dashboard/payroll/setup`;
  - ledger blockers to `/dashboard/accounting/control-center`;
  - payment reconciliation exceptions to `/dashboard/finance/reconciliation`;
  - generic payment state to `/dashboard/finance/payments`;
  - close assurance to `/dashboard/accounting/close`.
- Left future/unimplemented workflow sources with `href: null` rather than linking to fake routes.
- Updated `PayrollCommandCenter` to render `action.href` from the service and stop guessing routes client-side.
- Updated component fallback text from `Blocked` to `Pending route` when no implemented route exists.
- Updated read-model and component tests to verify service-owned action hrefs and the pending-route fallback.

## Security And Privacy

- No new data source was added to the browser.
- The UI remains render-only and consumes the protected read model.
- The command read model still requires `payroll.command.read`.
- Salary/person amount visibility remains governed by `evaluateRedaction` and the existing payroll redaction policy.
- Audit still records command read access with redaction mode, blocker count, next-action count, and trusted counts.
- No raw bank/mobile destination values, evidence hashes beyond existing proof subjects, or salary amounts were newly exposed.

## Accounting And Finance Decisions

- Accounting, payment, declaration, register, and close blockers remain sourced from trusted payroll/control/accounting facts.
- Ledger blocker actions route to the accounting control center rather than inventing a payroll-local posting tool.
- Payment reconciliation exceptions route to the finance reconciliation surface.
- No posting, payment release, declaration automation, close mutation, or client-computed finance metric was added.

## UI/UX Decisions

- The command center no longer has to infer routes from action source strings.
- Operators can open the real upstream workbench for employee, contract, compensation, attendance/payment evidence, setup, ledger, and reconciliation actions.
- Unimplemented future workflow actions remain visible but do not link to unsupported routes.
- No visual redesign was performed.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts actions/payroll/__tests__/payroll-command-read-model.actions.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand
npm run prisma:validate
npm run service:boundary:fail
npm run typecheck
npm run lint -- --quiet
```

Results:

- Focused command read-model/action/component/route smoke tests: 4 suites passed, 10 tests passed.
- Payroll tenant/privacy tests: 2 suites passed, 6 tests passed.
- Prisma schema validation: passed.
- Service boundary gate: passed, 0 active violations.
- Typecheck: passed.
- ESLint: passed with 0 errors and 5 existing warnings in unrelated files.

Skipped:

- `npm run prisma:generate`: no schema or migration changes.
- Regulatory hardcode gate: not rerun for this slice because no statutory/country-pack logic changed; it passed in the preceding payment/attendance slice.
- Authenticated browser smoke execution: still requires a running app, a seeded payroll-enabled user, and saved `playwright/.auth/payroll.json` state.
- Full `npm run policy:gates`: not run for this read-model routing contract slice because the relevant service-boundary, privacy, action, route, typecheck, and lint gates passed.

## Files Changed

- `services/payroll/command-read-model.service.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMMAND_READ_MODEL_REPORT_2026-06-27.md`

## Source-Of-Truth Risks Avoided

- No client-side payroll metric computation.
- No client-side route derivation as command truth.
- No fake links to `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, or `/dashboard/payroll/declarations`.
- No visual redesign before command data readiness.
- No weakening of RBAC, module entitlement, redaction, audit, or tenant scope.

## Handoff

Command data is ready for safer command-center composition because next actions now carry service-owned route hints. The next safe slice is Prompt 12: command-center UX and proof drawer hardening, constrained to render-only composition over this read model.