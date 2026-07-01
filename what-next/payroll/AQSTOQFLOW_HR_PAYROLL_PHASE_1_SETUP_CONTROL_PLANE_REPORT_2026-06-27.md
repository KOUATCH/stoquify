# AqStoqFlow HR/Payroll Phase 1 Setup Control Plane Report

Date: 2026-06-27

Skill applied: `aqstoqflow-hrpayroll-06-seed-backfill-setup`

Roadmap source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ENTERPRISE_COMPLETION_ROADMAP_2026-06-26.md`

Architecture source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`

Seed/backfill setup plan: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SEED_BACKFILL_ADMIN_SETUP_PLAN_2026-06-27.md`

## Decision

Phase 1 setup/admin readiness surface is implemented for the safe read-only slice.

Production seed/backfill mutation remains blocked. No action, route, or UI control was added that can create payroll periods, employees, contracts, salaries, payment destinations, attendance snapshots, or posting setup.

## Prerequisite Gate

Status: passed for this narrow Phase 1 slice.

- Prompt 06 readiness and dry-run services already existed and were reused.
- The final readiness report explicitly keeps production seed/backfill mutation blocked.
- Accounting mappings, payroll journal readiness, posting rules, and open period coverage remain accounting-owned.
- Module access remains governed by the payroll module entitlement service.
- Employee-user readiness is displayed only as redacted counts and blockers.

## Implementation Summary

- Added `/dashboard/payroll/setup`.
- Added protected setup actions:
  - `getPayrollSetupReadinessAction`
  - `generatePayrollSeedBackfillDryRunPlanAction`
- Added `PayrollSetupControlPlane` to render service-owned readiness and the redacted dry-run plan.
- Added the real Setup route to HR & Payroll navigation with `payroll.runs.calculate`.
- Added focused action, service, route-smoke, and sidebar coverage.
- Added payroll browser-smoke scaffolding for authenticated payroll routes; running it still requires a seeded payroll user and saved Playwright auth state.

## Security And Privacy

- Server actions derive `organizationId`, `actorId`, and actor permissions from the protected server context.
- Page and actions enforce payroll module entitlement.
- Setup route requires payroll process access.
- Dry-run output stays redacted: no raw person data, raw salary, or raw payment destination details.
- Mutation mode is explicitly rejected by the existing dry-run service and covered by action tests.

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
- Prisma schema validation: passed.
- Typecheck: passed.
- Service boundary gate: passed, 0 active violations.
- ESLint: passed with 0 errors and 5 existing warnings in unrelated files.

Skipped:

- `npm run prisma:generate`: no Prisma schema or migration changes.
- `npm run policy:gates`: not run for this narrow UI/action slice because it includes runtime database gates outside this setup-route change. Service boundary, Prisma validation, focused payroll setup tests, typecheck, and lint passed.
- Authenticated browser smoke: scaffolding exists for payroll browser smoke, but it requires a seeded payroll user and saved `playwright/.auth/payroll.json` state.

## Files Changed

- `actions/payroll/payroll-setup.actions.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/setup/page.tsx`
- `components/payroll/PayrollSetupControlPlane.tsx`
- `actions/payroll/__tests__/payroll-setup.actions.test.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `scripts/ui-route-smoke-gate.js`
- `playwright.config.ts`
- `tests/e2e/auth.setup.ts`
- `tests/e2e/payroll-authenticated-smoke.spec.ts`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SETUP_CONTROL_PLANE_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SEED_BACKFILL_ADMIN_SETUP_PLAN_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_PAYROLL_BROWSER_VALIDATION_GAP_CLOSURE_2026-06-27.md`

## Handoff

The setup route can guide a tenant through current payroll setup blockers using service-owned facts and a redacted dry-run plan. The next safe expansion remains approval-gated admin actions; production seed/backfill write mode is still unavailable.


