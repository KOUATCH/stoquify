# AqStoqFlow HR/Payroll Wave 1 - Unpaid Release Drawer Browser Fixture Report

Generated: 2026-06-28
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Status: **slice passed**

## Scope

This slice advances the full HR/payroll roadmap by proving that `/dashboard/payroll/runs` can render a service-owned posted payroll run that is unpaid, has emitted payslip/payment-destination proof, and can drive the `release-payments` operator workflow with a separate requester selected from RBAC-backed service data.

This does **not** complete the full HR/payroll production roadmap. The broader production blockers remain active until statutory country packs, calculation/register truth, authority adapters, payment settlement proof, accounting close assurance, migration/backfill, and full release certification are closed with evidence.

## Changes Made

- Added a July 2026 posted-unpaid payroll run fixture to `scripts/seed-payroll-e2e-user.js`:
  - run number: `PAY-BROWSER-UNPAID-RUN-2026-07`
  - status: `POSTED`
  - one emitted payslip: `PAYSLIP-DEMO-2026-07-001`
  - no payment batch, so the run exposes `release-payments`
  - seeded payment destination proof through the existing employee fixture
- Respected payroll immutability by creating the unpaid run/payslip in mutable draft states, adding child lines, then promoting the run to `POSTED` and payslip to `EMITTED`.
- Replaced dynamic unpaid payslip-line IDs with deterministic IDs: `payroll_e2e_browser_2026_06_unpaid_payslip_line_<lineNumber>`.
- Aligned `tests/e2e/auth.setup.ts` with `scripts/seed-payroll-e2e-user.js` so browser auth defaults to `hr.manager@stockflow.test`, the seeded tenant that owns the payroll fixture.
- Applied pending migration `20260628123000_payroll_employee_balance_lifecycle` locally after the live route failed because `public.payroll_employee_balance_cases` was missing.
- Regenerated `playwright/.auth/payroll.json` as a local Better Auth session for `hr.manager@stockflow.test`.

## Evidence

### Seed Output

`npm run seed:e2e:payroll` passed and emitted:

- `requesterUserId`: `usr_payroll_e2e_requester_local`
- `requesterEmail`: `payroll.requester@stockflow.test`
- `requesterPermissions`: `payroll.payments.request`
- `unpaidPayrollRunId`: `payroll_e2e_browser_2026_06_unpaid_run`
- `unpaidPayslipId`: `payroll_e2e_browser_2026_06_unpaid_payslip`

### Direct Service Proof

`getPayrollRunWorkbenchData` returned the unpaid run with:

- `status`: `POSTED`
- `paymentBatches`: `0`
- `paymentAllocationCandidates`: one emitted payslip allocation for `335000.00 XAF`
- `paymentDestinationProofPresent`: `true`
- `nextActions`: includes `release-payments`
- requester candidate: `Payroll Requester (payroll.requester@stockflow.test)` with `payroll.payments.request`

### Browser Proof

Direct Playwright validation passed for:

- route: `http://127.0.0.1:3000/en/dashboard/payroll/runs`
- row: `PAY-BROWSER-UNPAID-RUN-2026-07`
- visible drawer: `Payment release drawer`
- allocation proof: `1 payslip allocation(s) from service-owned payslip proof.`
- visible requester evidence: `payroll.payments.request`
- requester select value: `usr_payroll_e2e_requester_local`
- requester option: `Payroll Requester (payroll.requester@stockflow.test)`
- release button: enabled

Screenshot:

- `what-next/payroll/screenshots/payroll-runs-unpaid-release-drawer/payroll-runs-release-drawer-desktop.png`

### Route Smoke

`node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3000 --timeout-ms 60000 --require-screenshots --route payroll-runs --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-runs-unpaid-release-smoke --out what-next/payroll/AQSTOQFLOW_PAYROLL_RUNS_UNPAID_RELEASE_UI_ROUTE_SMOKE_BROWSER.json`

Result: `UI route smoke: ok`

Generated evidence:

- `what-next/payroll/AQSTOQFLOW_PAYROLL_RUNS_UNPAID_RELEASE_UI_ROUTE_SMOKE_BROWSER.json`
- `what-next/payroll/screenshots/payroll-runs-unpaid-release-smoke/payroll-runs-tablet.png`
- `what-next/payroll/screenshots/payroll-runs-unpaid-release-smoke/payroll-runs-desktop.png`

## Validation

Passed:

- `node --check scripts/seed-payroll-e2e-user.js`
- `npm run seed:e2e:payroll`
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx --runInBand`
  - 2 suites passed
  - 6 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npx prisma migrate status`
  - database schema is up to date
- `npm run policy:gates`
  - inventory boundary: pass
  - service boundary: pass
  - workflow assurance runtime check: ready
  - payroll immutability runtime: ready, 9/9 triggers present, 14/14 forbidden mutation checks blocked
  - hard-delete gate: pass
  - regulatory hardcode gate: pass
  - demo trust gate: pass
  - raw error boundary gate: pass
- `git diff --check -- ...`
  - no whitespace errors; existing CRLF warning for `config/permissions.ts`

## Risks And Notes

- The local database had one pending payroll migration. It was applied with `npx prisma migrate deploy`; this was required because the route workbench now includes employee-balance lifecycle counts.
- `npx playwright test --project=auth-setup --reporter=line` timed out in this local environment. A direct Better Auth session row plus signed Playwright storage state was used to unblock browser validation for the seeded tenant.
- The full HR/payroll system is still not production-ready. This slice only closes a browser evidence gap for the run release workflow.

## Next Best Move

Continue the production roadmap on the calculation/register truth spine:

1. Finish country-pack breadth and golden fixture coverage for statutory formulas.
2. Harden payroll register lock/correction/payment/declaration tie-out around the newly browser-proven release workflow.
3. Extend `/dashboard/payroll/payments` and `/dashboard/payroll/declarations` with equivalent service-owned proof drawers and browser evidence.