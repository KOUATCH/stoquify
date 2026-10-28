# AqStoqFlow HR/Payroll Wave 1 Auditor Proof Drawer Browser Smoke Report

Date: 2026-07-05
Skill: aqstoqflow-payroll-command-center
Phase/Slice: Phase 2 operator evidence hardening - authenticated route-level auditor proof drawers for payroll runs, payments, and declarations.

## Decision

PASS for this slice.

The implemented payroll routes now have authenticated browser evidence that the route-level auditor proof drawers open and expose accounting-backed, redacted proof-pack fields for:

- `/en/dashboard/payroll/runs`
- `/en/dashboard/payroll/payments`
- `/en/dashboard/payroll/declarations`

The proof drawers show the accounting data-trust source, accounting period, redaction mode, aggregate gaps, and source link hash fields. The browser evidence confirms `HASHES_AND_AGGREGATES_ONLY` redaction and no leaked forbidden raw payroll/provider markers in the drawer text.

## Changes Made

- Added route-level proof drawer coverage to `tests/e2e/payroll-authenticated-smoke.spec.ts`.
- Added generated browser evidence at `what-next/payroll/AQSTOQFLOW_PAYROLL_AUDITOR_PROOF_DRAWERS_BROWSER.json`.
- Added screenshots under `what-next/payroll/screenshots/payroll-auditor-proof-drawers/`.
- Updated `scripts/seed-payroll-e2e-user.js` to seed an e2e fiscal year plus June/July accounting periods and link:
  - June payroll period to the June accounting period.
  - July unpaid payroll period to the July accounting period.
  - Payroll payment ledger posting batch to the June accounting period.
  - Payroll payment reconciliation run to the June accounting period.

## Evidence

- Auth state: `playwright/.auth/payroll.json`
- Fixture source: `scripts/seed-payroll-e2e-user.js`
- Browser evidence JSON: `what-next/payroll/AQSTOQFLOW_PAYROLL_AUDITOR_PROOF_DRAWERS_BROWSER.json`
- Screenshots:
  - `what-next/payroll/screenshots/payroll-auditor-proof-drawers/payroll-runs-auditor-proof-drawer.png`
  - `what-next/payroll/screenshots/payroll-auditor-proof-drawers/payroll-payments-auditor-proof-drawer.png`
  - `what-next/payroll/screenshots/payroll-auditor-proof-drawers/payroll-declarations-auditor-proof-drawer.png`

## Gate Results

- `node --check scripts/seed-payroll-e2e-user.js` - PASS
- `git diff --check -- scripts/seed-payroll-e2e-user.js tests/e2e/payroll-authenticated-smoke.spec.ts` - PASS
- `npm run seed:e2e:payroll` - PASS
- `npx playwright test tests/e2e/payroll-authenticated-smoke.spec.ts --project=payroll-authenticated-smoke --grep "accounting-backed auditor proof drawer" --list` - PASS
- `npx playwright test tests/e2e/payroll-authenticated-smoke.spec.ts --project=payroll-authenticated-smoke --grep "accounting-backed auditor proof drawer"` with `PLAYWRIGHT_SKIP_WEB_SERVER=1` against the local dev server - PASS, 4 passed
- `npm run prisma:validate` - PASS
- `npm run typecheck` - PASS

## Notes From Failed Attempts

- First focused smoke after adding the proof drawer assertions reached the drawers but showed `UNAVAILABLE` proof because the local e2e payroll periods had no accounting period bridge. This was a real fixture gap, not a UI-only failure.
- After adding the accounting-period fixture bridge, the browser smoke reached the proof data. The remaining failures were test-selector issues:
  - `HASHES_AND_AGGREGATES_ONLY` appears in both the proof row and the redaction policy section, so the assertion now targets the first visible match.
  - The payments route is heavier to hydrate, so the route-level proof drawer opener now waits for the button and retries the click briefly.
- Playwright's configured webServer timed out at 120 seconds while `npm run dev` was still completing `npx prisma generate`. The dev server was started manually, waited until ready, used for the focused smoke with `PLAYWRIGHT_SKIP_WEB_SERVER=1`, and stopped afterward.

## Residual Risk

- This slice proves authenticated route-level drawer availability and redacted accounting-backed proof fields. It does not certify statutory formula correctness, production authority filing, payment settlement automation, or full close certification.
- The payment page still exposes row-level proof drawers separately; this slice intentionally targets only the route-level auditor proof drawer added for accounting-backed proof-pack readiness.

## Next Slice

Continue with payroll truth hardening before adding more operator polish:

1. Add source-link and close-assurance evidence depth for payroll accounting proof packs.
2. Expand statutory country-pack fixtures and payroll engine golden calculations.
3. Add failure-mode browser evidence for missing proof, denied access, and stale close evidence states.
