# Payment Truth Pilot Sprint 2 - Matching Statement Amount Gate - 2026-07-05

## Decision

The next logical step after statement ingestion hardening is to make reconciliation runs consume statement evidence safely. The matching engine already creates `MatchRecord`, exception, and suspense rows; this slice closes the amount-control gap for imported statement lines.

## Slice Executed

- Updated `services/reconciliation/payment-reconciliation-run.service.ts` so statement-line amount mismatches are treated like provider-event amount mismatches.
- If an internal payment transaction matches a statement line by provider transaction/reference but the amount differs, the run now:
  - avoids creating an auto `MatchRecord`;
  - creates an `AMOUNT_MISMATCH` payment exception;
  - creates an itemized suspense item;
  - marks the statement line and transaction as consumed for this run so the mismatch is not double-counted as an orphan line.
- Added a focused regression test covering conflicting statement evidence without a provider event.

## Gates

- Explainable matching: PASS - mismatch evidence includes transaction amount, statement amount, mismatch source, and rule.
- Itemized suspense: PASS - mismatch creates one suspense item tied to the payment transaction and statement line.
- No ledger bypass: PASS - matching still does not post suspense directly.
- Append-only stance: PASS - no closed match is edited; the service avoids creating the auto match when evidence conflicts.
- Provider/statement handoff: PASS - imported statement evidence now affects run status and signoff readiness.

## Verification

- `npm test -- --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/payments/__tests__/statement-import.service.test.ts services/payments/__tests__/provider-event.service.test.ts --runInBand`
- `npm run typecheck`

## Next Step

Continue Sprint 2 by marking successfully matched provider events and statement lines as processed/matched, or by adding the first pilot fixture that creates provider event, statement line, reconciliation run, match record, and cash-truth snapshot in one deterministic path. Do not move to certification until signed runs, suspense resolution, and maker-checker manual-match controls are complete for the named pilot tenant.