# AqStoqFlow HR/Payroll Command Center Final Release Proof Report

Date: 2026-07-01
Skill: aqstoqflow-payroll-command-center
Scope: Phase 2 operator visibility for final HR/payroll production release readiness.

## Decision

Implemented a read-only, service-backed final release readiness surface in the payroll command center. This does not approve production release and does not introduce a release mutation. It exposes the existing final release readiness pack as redacted proof for operators.

## What Changed

- `services/payroll/command-read-model.service.ts`
  - Calls `buildPayrollFinalReleaseReadinessPack(..., persistPack: false)` while composing the command read model.
  - Adds `readiness.finalRelease` and `evidence.finalRelease` with decision, pack hash, blocker counts, gate counts, statutory setup proof, redaction policy, and gate proof rows.
  - Adds `PAYROLL_FINAL_RELEASE_READINESS_BLOCKED` as a command-center blocker when the final release pack is not ready.
  - Keeps pilot-cycle readiness blocker codes separate from final-release blocker codes.

- `components/payroll/PayrollCommandCenter.tsx`
  - Adds a Final release readiness panel after finance state and before adapter operations.
  - Adds a final-release proof drawer subject with pack hash, statutory coverage proof, blocker codes, release gate count, and redaction policy.
  - Keeps the surface read-only: no approve/release button, no client-side calculation, and no mutation action.

- Tests
  - `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
  - `components/payroll/__tests__/PayrollCommandCenter.test.tsx`

## Evidence

Focused verification:

- PASS: `npx jest services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand`
  - 2 suites passed, 5 tests passed.
- PASS: `npx jest services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand`
  - 2 suites passed, 11 tests passed.
- PASS: `npm run typecheck`
- PASS: `npm run service:boundary:fail`
- PASS: `npm run regulatory:hardcode:fail`
- PASS: `npm run policy:gates`
- PASS: `npm run prisma:validate`
- PASS: `git diff --check -- services/payroll/command-read-model.service.ts components/payroll/PayrollCommandCenter.tsx services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- PASS: authenticated browser smoke for `/en/dashboard/payroll`
  - Command: `node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3002 --timeout-ms 120000 --require-screenshots --route payroll --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-final-release-command-center --out what-next/payroll/AQSTOQFLOW_PAYROLL_FINAL_RELEASE_COMMAND_CENTER_UI_ROUTE_SMOKE_BROWSER.json`
  - Evidence JSON: `what-next/payroll/AQSTOQFLOW_PAYROLL_FINAL_RELEASE_COMMAND_CENTER_UI_ROUTE_SMOKE_BROWSER.json`
- PASS: screenshot nonblank pixel check
  - `payroll-tablet.png`: 834x8677, 224 unique sampled colors.
  - `payroll-desktop.png`: 1440x4431, 278 unique sampled colors.

## Browser Smoke Notes

- `npm run dev -- --hostname 127.0.0.1 --port 3001` could not start because `prisma generate` hit a Windows `EPERM` rename on `node_modules/.prisma/client/query_engine-windows.dll.node`.
- The smoke was completed by starting `next dev` directly on `127.0.0.1:3002`; the temporary server process was stopped after the smoke passed.

## Residual Risk

- This closes operator visibility for the final release readiness proof in the command center only.
- Full production readiness is still blocked until the final release pack decision becomes `READY_FOR_FULL_PRODUCTION_APPROVAL` with evidence and required accounting/security/operations signoffs.
- The command center remains a proof and action-routing surface; release certification remains owned by the final readiness service and release gates.

## Recommended Next Slice

Continue with a service-backed workflow for resolving the remaining final-release blockers, beginning with statutory scenario coverage and review evidence gaps that feed the final release readiness pack.