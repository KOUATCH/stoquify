# AqStoqFlow HR/Payroll Wave 1 Payment Requester Permission and Seed Report

Generated: 2026-06-28

## Decision

Status: IMPLEMENTED AND VERIFIED FOR THE CONTROLLED-PILOT SCOPE.

This slice formalizes payroll payment maker/checker intent by introducing an explicit `payroll.payments.request` permission and using it as the only service-backed requester-candidate permission for `/dashboard/payroll/runs` payment release. It also updates the local authenticated payroll browser-smoke seed so the smoke tenant has a separate request-maker user and release/controller user.

## What Changed

- Added `payroll.payments.request` to the canonical payroll permission registry in `config/permissions.ts`.
- Narrowed `PAYROLL_PAYMENT_REQUESTER_CANDIDATE_PERMISSIONS` in `services/payroll/payroll-control.service.ts` to `payroll.payments.request` only.
- Updated requester candidate tests and UI tests to prove the requester select is backed by the explicit maker permission.
- Updated `scripts/seed-payroll-e2e-user.js` to create:
  - main payroll smoke user: `hr.manager@stockflow.test` with payroll read/control/release permissions;
  - separate payroll requester user: `payroll.requester@stockflow.test` with `payroll.payments.request`.
- Added seed validation requiring requester and releaser emails to differ.
- Updated new/local payment batch fixtures to stamp `requestedById` with the requester user and `approvedById`/`releasedById` with the main smoke user.
- Seed output now includes requester user, requester role, and requester permission evidence.

## Evidence Added

- `services/payroll/__tests__/payroll-run-workbench.service.test.ts` now expects `payroll.payments.request` as the matched requester permission.
- `components/payroll/__tests__/PayrollRunWorkbench.test.tsx` now displays and asserts `payroll.payments.request` in requester evidence.
- `scripts/seed-payroll-e2e-user.js` was syntax-checked and executed locally.
- Narrow authenticated browser smoke evidence was generated for `/dashboard/payroll/runs`.

## Validation

Passed:

- `node --check scripts/seed-payroll-e2e-user.js`
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx --runInBand`
  - 2 suites passed
  - 6 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run policy:gates`
- `git diff --check -- config/permissions.ts services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx scripts/seed-payroll-e2e-user.js`
  - Passed; Windows CRLF normalization warning only for `config/permissions.ts`.
- `npm run seed:e2e:payroll`
  - Seed output included `requesterUserId`, `requesterEmail`, `requesterRoleCode`, and `requesterPermissions: ["payroll.payments.request"]`.
- Narrow browser smoke:
  - `node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3000 --timeout-ms 60000 --require-screenshots --route payroll-runs --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-runs-requester-smoke --out what-next/payroll/AQSTOQFLOW_PAYROLL_RUNS_REQUESTER_UI_ROUTE_SMOKE_BROWSER.json`
  - Result: `ok: true`, route `payroll-runs`, tablet and desktop screenshots captured.

## Browser Smoke Evidence

- `what-next/payroll/AQSTOQFLOW_PAYROLL_RUNS_REQUESTER_UI_ROUTE_SMOKE_BROWSER.json`
- `what-next/payroll/screenshots/payroll-runs-requester-smoke/payroll-runs-tablet.png`
- `what-next/payroll/screenshots/payroll-runs-requester-smoke/payroll-runs-desktop.png`

## Limitations

- The full `npm run ui:smoke:payroll` command timed out before completion in this turn. The stale full-smoke validation processes were stopped, and the narrower `/dashboard/payroll/runs` route smoke was run successfully with screenshots.
- Existing local released payment batches created before this change may retain their old immutable `requestedById`; new/local seed creation and any non-released batch update path use the separate requester user.
- The seeded run currently has an existing payment batch, so the route smoke proves the authenticated run surface renders but does not prove a visible release drawer on the seeded run. A later fixture slice should add a second posted, unpaid run specifically for action-drawer smoke.

## Remaining Blockers

- Full production remains blocked until statutory adapter automation, pilot payroll-cycle reconciliation, full authenticated browser smoke, and accounting/security/operations signoff are completed against the final readiness report.
- The next seed/UI slice should add an unpaid posted run with emitted payslips and destination proof so `/dashboard/payroll/runs` browser smoke can prove the release drawer and requester select are visibly present.

## Next Recommended Slice

Add a dedicated unpaid posted payroll run fixture for browser smoke, with emitted payslips and payment destination proof but no payment batch, so the `release-payments` action drawer and `payroll.payments.request` requester select can be verified by screenshots and targeted UI assertions.