# AqStoqFlow HR/Payroll Wave 1: Employee Balance Tenant Operating Snapshot Integration

Date: 2026-06-28
Status: implemented and validated

## Scope

This slice moves employee balance recovery from a payroll-only workbench concern into the tenant operating truth layer so finance, BI, cash command, owner war room, and action queues can see aggregate recovery pressure without exposing employee-level payroll details.

## Implemented

- Extended `TenantOperatingMetrics` with active/open/partially settled employee balance case counts, outstanding amount, period settlement count, and period settlement amount.
- Added service-owned snapshot queries against `payroll_employee_balance_cases` and `payroll_employee_balance_events`.
- Added a high-severity tenant operating blocker when active employee balance recovery cases remain open.
- Included employee balance facts in tenant freshness and source-hash inputs.
- Updated tenant snapshot rebuild defaults so empty/fallback snapshots remain contract-complete.
- Extended payroll exposure business signals to route active employee balance cases to `/dashboard/payroll/payments` with `payroll.payments.reconcile` permission and redacted person-level payloads.
- Added aggregate payroll recovery visibility to Cash Command through a new `employee_balance_recovery` KPI, summary metrics, change event, risk, brief text, and primary action fallback.
- Updated Owner War Room payroll exposure to pivot from payroll run count to active recovery case count when employee balance cases are open.

## Guardrails Preserved

- POS and sales do not own payroll truth; they continue to feed operating context only.
- Payroll balance truth remains service-owned and sourced from payroll employee balance tables.
- BI surfaces receive aggregate counts and amounts only; employee identity, payslip lines, documents, bank data, and person-level values remain redacted.
- Open recovery cases block tenant operating trust and flow into action queues instead of becoming silent dashboard decoration.

## Validation

- `npm test -- --runTestsByPath services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/signals/__tests__/business-signal-rules.service.test.ts services/cash-command/__tests__/cash-command.service.test.ts components/cash-command/__tests__/CashCommandDashboard.test.tsx services/owner-war-room/__tests__/owner-war-room.service.test.ts services/manager-action-center/__tests__/manager-action-center.service.test.ts --runInBand` passed: 6 suites, 16 tests.
- `npm run typecheck` passed.
- `npm run prisma:validate` passed.
- `npm run policy:gates` passed, including payroll immutability runtime proof: required triggers 9/9, forbidden mutation checks blocked 14/14, allowed lifecycle checks 3/3.
- `git diff --check` passed for the changed files; only CRLF normalization warnings were reported.

## Remaining Follow-Up

- Continue country-pack breadth and payroll engine hardening as the deepest production-readiness blocker.
- Add richer payroll route proof drawers only after register/calculation truth remains stable.
- Expand controlled pilot evidence to include one cycle with employee balance recovery cases settled, posted, reconciled, and close-certified.