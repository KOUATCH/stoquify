# AqStoqFlow HR/Payroll Phase 1 Payment And Attendance Readiness Report

Date: 2026-06-27

Skill applied: `aqstoqflow-hrpayroll-10-payment-evidence-readiness`

Prompt name: Payment Destination, HR Evidence, And Attendance Readiness

Architecture source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`

Predecessors:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SOURCE_DATA_FOUNDATION_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CONTRACT_LIFECYCLE_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMPENSATION_APPROVAL_REPORT_2026-06-27.md`

## Decision

The payment destination, HR evidence, and attendance readiness slice is now exposed as a guarded read-only workbench at `/dashboard/payroll/attendance`.

This is not a payment release screen, reconciliation workbench, employee self-service flow, payroll run wizard, or destination mutation console. The route exposes service-owned readiness facts only: payment destination approval state, masked destination, approval evidence presence, HR proof reference counts, attendance freeze status, source-hash presence, drift status, and blockers.

## Expert Lenses Applied

- Payroll domain expert.
- Security and privacy controls architect.
- Accountant and payment-release control reviewer.
- HR evidence and audit-trail reviewer.
- UI/UX reviewer for service-backed operational workbenches.

## Prerequisite Gate

Status: passed for this narrow Phase 1 payment and attendance readiness slice.

- Employee source-data, contract, and compensation surfaces are already service-backed and tested.
- Payment destination service controls exist for request, approval, rejection, application, audit, redaction, and business events.
- Payment release control calls `assertApprovedPaymentDestinationEvidence` before release, so this readiness workbench is upstream of an enforceable release gate.
- Attendance readiness is service-computed from attendance snapshots and expected source hashes; no UI-owned freeze logic was added.
- Regulatory hardcode gate passed with 0 active findings.

## Files Inspected

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMPENSATION_APPROVAL_REPORT_2026-06-27.md`
- `services/payroll/payment-evidence.service.ts`
- `actions/payroll/payroll-payment-evidence.actions.ts`
- `services/payroll/payroll-control.service.ts`
- `actions/payroll/payroll-control.actions.ts`
- `services/payroll/__tests__/payroll-payment-evidence.service.test.ts`
- `actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts`
- `config/sidebar.ts`
- `scripts/ui-route-smoke-gate.js`

## Implementation Summary

- Added `/dashboard/payroll/attendance`.
- Added `PayrollPaymentAttendanceReadinessWorkbench` as a read-only readiness workbench.
- Used `getPaymentEvidenceReadinessAction({ limit: 80 })` as the only data source for the page.
- Added page-level RBAC and module entitlement enforcement before the protected action is called.
- Updated payment destination mutation revalidation to refresh `/dashboard/payroll/attendance` and `/[locale]/dashboard/payroll/attendance`.
- Added Attendance to HR & Payroll navigation with `payroll.payment_destination.read`.
- Extended payroll route smoke coverage for RBAC, module entitlement, protected action delegation, denial states, route contract checks, and UI surface inventory.
- Extended the UI route smoke catalog, authenticated Playwright route list, and `ui:smoke:payroll` route ids with `payroll-attendance`.
- Added the missing `payroll-compensation` route id to the UI route smoke catalog, matching the existing package script.

## Security And Privacy

- The page requires `payroll.payment_destination.read`, not attendance-only access, because the current readiness DTO includes masked payment destination status and latest destination-change metadata.
- The page and action both enforce payroll module entitlement in `enforce` mode.
- The page does not render raw bank account numbers, phone numbers, destination hashes, evidence hashes, or source hashes.
- Evidence is presented as counts and boolean presence signals, not raw document hashes.
- Destination values remain masked by the service.
- Payment destination mutation workflows remain protected by fresh authentication, actor-derived tenant context, RBAC, module entitlement, maker-checker controls, business events, and audit logs.

## Accounting And Finance Decisions

- Payment release remains outside this slice.
- The readiness view makes the payment-release blocker visible before release: employees need approved payment destination evidence and attendance readiness.
- The release service remains the enforcement point through `assertApprovedPaymentDestinationEvidence`; the UI is an operator control view, not the source of release truth.
- No payroll posting, bank file generation, GL journal, reconciliation, or close certification workflow was added here.

## HR Evidence And Attendance Decisions

- HR evidence is shown as contract, salary-change, identifier, and payment proof reference counts.
- Attendance readiness is shown by snapshot status, freeze period, frozen-at date, source-hash presence, expected-hash presence through service state, drift flag, and blockers.
- The page highlights blockers such as missing approved payment destination evidence, missing freeze, missing source hash, and drift detection.
- No attendance capture, attendance edit, biometric integration, or freeze mutation was added.

## UI/UX Decisions

- The first screen is an operator readiness workbench with metrics and a queue, not a wizard.
- The metrics focus on release blockers: employee count, approved destinations, pending destinations, missing destinations, attendance ready count, and blocker count.
- The table keeps fixed widths and horizontal overflow for dense payroll control data.
- The page links to Compensation and Setup because those are upstream readiness dependencies.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts services/payroll/__tests__/payroll-payment-evidence.service.test.ts __tests__/payroll-dashboard-routes.smoke.test.tsx config/__tests__/sidebar.test.ts --runInBand
npm run prisma:validate
npm run service:boundary:fail
node scripts/ui-route-smoke-gate.js --help
npm run lint -- --quiet
npm run typecheck
npm run regulatory:hardcode:fail
```

Results:

- Focused Jest: 4 suites passed, 28 tests passed.
- Prisma schema validation: passed.
- Service boundary gate: passed, 0 active violations.
- UI smoke script parse/help run: passed.
- ESLint: passed with 0 errors and 5 existing warnings in unrelated files.
- Typecheck: passed on the longer standalone run.
- Regulatory hardcode gate: passed, 0 active findings.

Skipped:

- `npm run prisma:generate`: no schema or migration changes.
- Authenticated browser smoke execution: still requires a running app, a seeded payroll-enabled user, and saved `playwright/.auth/payroll.json` state.
- Full `npm run policy:gates`: not run for this narrow route exposure because the relevant regulatory and service-boundary gates passed; the full gate includes heavier runtime/database checks outside this UI slice.

## Files Changed

- `actions/payroll/payroll-payment-evidence.actions.ts`
- `actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/attendance/page.tsx`
- `components/payroll/PayrollPaymentAttendanceReadinessWorkbench.tsx`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `scripts/ui-route-smoke-gate.js`
- `tests/e2e/payroll-authenticated-smoke.spec.ts`
- `package.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_PAYMENT_ATTENDANCE_READINESS_REPORT_2026-06-27.md`

## Source-Of-Truth Risks Avoided

- No direct payment release bypass.
- No UI-owned payment approval truth.
- No raw bank, mobile money, hash, or document evidence leakage.
- No attendance-only role exposure to payment destination metadata.
- No attendance freeze mutation from the readiness page.
- No payroll posting, payment reconciliation, or statutory declaration expansion before downstream gates.

## Handoff

Payment destination, HR evidence, and attendance readiness now have a protected operator surface. The next safe slice is command-read-model expansion that can summarize these blockers without weakening the payment destination privacy boundary.