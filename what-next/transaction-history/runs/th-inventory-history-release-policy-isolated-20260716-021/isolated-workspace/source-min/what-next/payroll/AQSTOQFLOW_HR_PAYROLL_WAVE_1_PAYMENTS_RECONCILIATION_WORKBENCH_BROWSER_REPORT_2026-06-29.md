# AqStoqFlow HR/Payroll Wave 1 Payments Reconciliation Workbench Browser Report - 2026-06-29

## Decision

Status: controlled-scope slice verified.

This run does not make full HR/payroll production-ready. It closes the next practical blocker for the payment surface: `/dashboard/payroll/payments` now presents service-owned payroll payment reconciliation truth first, keeps employee-balance recovery as a secondary section, and has authenticated browser-smoke evidence with screenshots.

## Implemented Scope

- Replaced the payments route surface with the proof-backed payroll payment reconciliation workbench plus the existing employee balance workbench below it.
- Enforced route access through `payments.reconciliation.read` on `PayrollPaymentReconciliationWorkbench` while preserving payroll module entitlement.
- Added a server-rendered reconciliation workbench that exposes batch state, provider proof, statement/match evidence, source links, transactions, exceptions, and next actions.
- Added a client settlement evidence form that calls the existing server action and does not send client-controlled tenant, actor, permission, or fresh-auth claims.
- Extended payment reconciliation path revalidation to include `/dashboard/payroll/payments` and localized dashboard paths.
- Seeded a browser-safe payment reconciliation fixture with provider account, payment transaction, provider event, statement file/line, reconciliation run, approved match, component proof metadata, and payment batch proof metadata.
- Updated route smoke metadata so `payroll-payments` validates the `Payroll payment reconciliation` surface.
- Fixed payroll finance forecast snapshot typing/fallback integration so full typecheck remains green after the route and seed additions.

## Primary Files

- `app/[locale]/(dashboard)/dashboard/payroll/payments/page.tsx`
- `components/payroll/PayrollPaymentReconciliationWorkbench.tsx`
- `components/payroll/PayrollPaymentSettlementForm.tsx`
- `components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx`
- `actions/payroll/payroll-payment-reconciliation.actions.ts`
- `actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- `scripts/seed-payroll-e2e-user.js`
- `scripts/ui-route-smoke-gate.js`
- `services/snapshots/tenant-operating-snapshot.service.ts`
- `services/snapshots/snapshot-rebuild.service.ts`

## Browser Evidence

- Browser smoke report: `what-next/payroll/AQSTOQFLOW_PAYROLL_PAYMENTS_RECONCILIATION_UI_ROUTE_SMOKE_BROWSER.json`
- Route: `/en/dashboard/payroll/payments`
- Surface: `Payroll payment reconciliation`
- Auth mode: Playwright saved storage state, `playwright/.auth/payroll.json`
- Result: ok, authenticated tablet and desktop captures
- Screenshots:
  - `what-next/payroll/screenshots/payroll-payments-reconciliation-smoke/payroll-payments-desktop.png` - 3,384,726 bytes
  - `what-next/payroll/screenshots/payroll-payments-reconciliation-smoke/payroll-payments-tablet.png` - 2,089,720 bytes

## Verification Passed

- `node --check scripts/seed-payroll-e2e-user.js`
- `npm run seed:e2e:payroll`
- Direct service proof for `getPayrollPaymentReconciliation(...)` returned one `READY_TO_SETTLE` batch with one approved match and six source links.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand` - 4 suites, 18 tests passed.
- `npm test -- --runTestsByPath services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/snapshots/__tests__/snapshot-rebuild.service.test.ts --runInBand` - 2 suites, 6 tests passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 5 existing warnings outside this slice.
- `npm run prisma:validate` - passed.
- `npm run policy:gates` - passed, including payroll immutability runtime checks.
- `node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3001 --timeout-ms 120000 --require-screenshots --route payroll-payments --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-payments-reconciliation-smoke --out what-next/payroll/AQSTOQFLOW_PAYROLL_PAYMENTS_RECONCILIATION_UI_ROUTE_SMOKE_BROWSER.json` - passed.

## Remaining Production Readiness Risks

- Full HR/payroll remains limited-release only until all final readiness blockers are closed with evidence.
- This slice proves payment reconciliation operator visibility and settlement evidence capture; it does not by itself complete authority filing automation, full provider settlement automation, production migration/backfill, or multi-country statutory breadth.
- Original `npm run dev` on port 3000 previously hit a locked Prisma DLL during `prisma generate`; the browser smoke used an already running Next dev server on port 3001 and passed authenticated route validation.
- The worktree remains broadly dirty from multiple HR/payroll waves. This report claims only the files and checks listed above.

## Next Roadmap Move

Proceed to the next production blocker in this order:

1. Complete authority declaration and payment adapters with payload mappings, response mappings, rejections, amendments, receipts, credentials, retries, idempotency, and settlement proof.
2. Expand statutory country-pack breadth with reviewed formulas, golden fixtures, caps, allowances, contributions, YTD, retro corrections, and effective dating.
3. Run one controlled pilot payroll cycle through calculation, register lock, payslip issue, payment reconciliation, declarations, accounting postings, close assurance, and data-trust signoff.