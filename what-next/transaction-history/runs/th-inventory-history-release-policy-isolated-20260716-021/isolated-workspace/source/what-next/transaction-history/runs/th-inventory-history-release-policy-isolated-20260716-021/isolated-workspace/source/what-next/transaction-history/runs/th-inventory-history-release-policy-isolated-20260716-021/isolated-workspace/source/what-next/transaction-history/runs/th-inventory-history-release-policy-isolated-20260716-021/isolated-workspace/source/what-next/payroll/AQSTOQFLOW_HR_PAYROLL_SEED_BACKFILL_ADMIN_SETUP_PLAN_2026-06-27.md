# AqStoqFlow HR/Payroll Seed Backfill Admin Setup Plan

Date: 2026-06-27

Skill applied: `aqstoqflow-hrpayroll-06-seed-backfill-setup`

Architecture source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`

Implementation report: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SETUP_CONTROL_PLANE_REPORT_2026-06-27.md`

## Control Decision

The payroll setup/admin surface is implemented as a dry-run-only control plane. It exposes readiness and seed/backfill planning without opening production mutation mode.

No route, action, UI, or script in this slice creates payroll periods, employees, contracts, salaries, payment destinations, attendance snapshots, journal setup, posting rules, or ledger postings.

## Implemented Surface

- `/dashboard/payroll/setup`
- `getPayrollSetupReadinessAction`
- `generatePayrollSeedBackfillDryRunPlanAction`
- `PayrollSetupControlPlane`
- HR & Payroll sidebar Setup destination guarded by `payroll.runs.calculate`

## Readiness Truth Sources

The UI renders service-owned facts only:

- tenant payroll entitlement and required accounting dependency
- accounting setup status
- required payroll account mappings
- active default payroll journal
- payroll posting rules
- open accounting period coverage for pay date
- country-pack capability and resolution hashes
- employee-user mapping counts
- contract evidence and payment-destination readiness counts
- blockers, warnings, redacted dry-run planned writes

## Security Boundaries

- Server actions derive `organizationId`, `actorId`, and actor permissions from protected server context.
- The setup page and setup actions enforce payroll module entitlement.
- Dry-run mutation mode remains unavailable and explicitly rejected.
- Dry-run output excludes raw person data, raw salary data, and raw payment destination data.
- Planned write rows use redacted organization/actor refs and stable idempotency keys.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-setup.actions.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts __tests__/payroll-dashboard-routes.smoke.test.tsx config/__tests__/sidebar.test.ts --runInBand
npm run prisma:validate
npm run typecheck
npm run service:boundary:fail
npm run lint -- --quiet
```

Results:

- Focused Jest: 5 suites passed, 29 tests passed.
- Prisma validation: passed.
- Typecheck: passed.
- Service boundary gate: passed with 0 active violations.
- Lint: passed with 0 errors and 5 existing warnings outside this payroll setup slice.

## Remaining Gates

- Production seed/backfill write mode is still blocked by design.
- Authenticated browser smoke requires a seeded payroll-enabled user and saved Playwright auth state.
- The next expansion should add approval-gated setup admin commands only after maker-checker, audit, idempotency, redaction, and rollback evidence are specified per command.
