# AQSTOQFLOW Payroll Finance Forecast Surfaces Run Report - 2026-06-29

## Slice
Implemented the next payroll-to-finance analytics slice from the 2026-06-27 facts run: authoritative upcoming payroll net-pay and statutory-liability forecasts now flow into tenant operating snapshots, cash command, and owner war room surfaces.

Selected skills:
- `aqstoqflow-payroll-accounting-close` for payroll-to-ledger proof, close safety, and finance handoff gates.
- `aqstoqflow-payroll-payment-recon` for payment evidence, provider proof, and payroll payment reconciliation gates.
- `aqstoqflow-payroll-statutory-hardener` was unavailable on disk, so statutory declaration gates were implemented from the existing declaration/evidence models.

## What Changed
- Added `payrollFinanceForecast` to tenant operating metrics with aggregate-only upcoming net pay, statutory liability, total obligation, horizon dates, next pay/declaration dates, source-link/evidence counts, and blocker codes.
- Built the forecast only from payroll periods, posted payroll runs, released/settled payment batches, declaration due dates, posted ledger source links, and payment/declaration evidence hashes.
- Added cash command cards for upcoming net pay and statutory liabilities, plus summary totals for the cash command brief.
- Updated owner war room payroll exposure and morning brief zones to show aggregate payroll obligations when no person-level employee-balance issue is driving the card.
- Kept person-level payroll amounts redacted by default; the surfaces expose only aggregate forecast values and carry redaction metadata for payroll-sensitive drilldowns.

## Fail-Closed Gates
The forecast reports zero amounts and `NON_AUTHORITATIVE` when proof is incomplete. Blockers are raised for missing active provider proof, payment batch proof, declaration proof, ledger/source-link proof, and rejected declarations.

Authoritative forecasts require:
- An active payroll payment provider whenever payment batches are forecast.
- Payroll runs backed by posted ledger posting batches and `PAYROLL_RUN` accounting source links.
- Payment batches in released/partially-settled/settled state with evidence hashes, posted business events, posted ledger batches, and `PAYROLL_PAYMENT` source links.
- Declarations with due dates, payload hash, country-pack resolution hash, matching evidence/source-register hashes, and non-rejected status.

## Files Changed
- `services/snapshots/snapshot-contracts.ts`
- `services/snapshots/tenant-operating-snapshot.service.ts`
- `services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts`
- `services/cash-command/cash-command-contracts.ts`
- `services/cash-command/cash-command.service.ts`
- `services/cash-command/__tests__/cash-command.service.test.ts`
- `services/owner-war-room/owner-war-room-contracts.ts`
- `services/owner-war-room/owner-war-room.service.ts`
- `services/owner-war-room/__tests__/owner-war-room.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_PAYROLL_FINANCE_FORECAST_SURFACES_RUN_REPORT_2026-06-29.md`

## Verification
Passed:
- `npm test -- --runTestsByPath services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/cash-command/__tests__/cash-command.service.test.ts services/owner-war-room/__tests__/owner-war-room.service.test.ts --runInBand`
- `npx eslint services/snapshots/snapshot-contracts.ts services/snapshots/tenant-operating-snapshot.service.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/cash-command/cash-command-contracts.ts services/cash-command/cash-command.service.ts services/cash-command/__tests__/cash-command.service.test.ts services/owner-war-room/owner-war-room-contracts.ts services/owner-war-room/owner-war-room.service.ts services/owner-war-room/__tests__/owner-war-room.service.test.ts`
- `npm run prisma:validate`

Blocked:
- `npm run typecheck` did not reach the edited code because `tsconfig.json` includes missing generated `.next/types` files for app routes and auth API routes. Regenerate `.next/types` or adjust the generated-type include before using full typecheck as the release gate.

## Residual Notes
- Forecast horizon defaults to 30 days from the snapshot start date unless the caller supplies a future `periodEnd`.
- No statutory calculation engine was added in this slice; statutory liability amounts come only from declaration records that pass evidence checks.
- No person-level salary, employee net-pay, or employee statutory amounts are surfaced outside payroll-specific drilldowns.

## Next Slice
Promote proof-linked drillthroughs from the aggregate forecast cards to the underlying payroll runs, payment batches, declarations, and ledger postings, then rerun full typecheck after generated Next.js route types are restored.
