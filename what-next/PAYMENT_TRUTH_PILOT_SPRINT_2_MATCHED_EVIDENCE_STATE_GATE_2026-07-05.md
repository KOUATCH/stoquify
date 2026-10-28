# Payment Truth Pilot Sprint 2 - Matched Evidence State Gate

Date: 2026-07-05

## Decision

The next logical slice after the matching amount gate was to make successful deterministic matches consume their external evidence. A confirmed `MatchRecord` is not enough by itself: the provider event or statement line must also move out of the unresolved evidence pool so future reconciliation runs and cash-truth snapshots do not keep treating already-proven records as work still open.

## Scope

- Keep the existing append-only `MatchRecord` creation path.
- In the same reconciliation transaction, mark successfully matched `ProviderEvent` rows as `PROCESSED` with `processedAt`.
- In the same reconciliation transaction, mark successfully matched `StatementLine` rows as `MATCHED`.
- Leave amount-mismatch and suspense paths unresolved; they must not mark external evidence as consumed.
- Add focused tests for provider-event consumption, statement-line consumption, and the mismatch no-consumption guard.

## Prerequisites Confirmed

- Provider events already expose `ProviderEventStatus.PROCESSED` and `processedAt`.
- Statement lines already expose `StatementLineStatus.MATCHED`.
- Reconciliation runs already execute the match creation and suspense updates inside the service-owned transaction.
- The matching/suspense skill stance remains intact: no direct ledger posting, no UI-derived truth, and no closed-match mutation.

## Files Changed

- `services/reconciliation/payment-reconciliation-run.service.ts`
- `services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts`

## Verification

- `npm test -- --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/payments/__tests__/statement-import.service.test.ts services/payments/__tests__/provider-event.service.test.ts --runInBand`
  - 3 suites passed.
  - 22 tests passed.
- `npm run typecheck`
  - Passed.

## Next Logical Step

Add the deterministic pilot fixture that runs the full narrow path in one proof chain: provider event capture, statement import, reconciliation run, evidence-state updates, match record, and cash-truth snapshot. This should stay fixture/test-owned first, not a new dashboard shell.
