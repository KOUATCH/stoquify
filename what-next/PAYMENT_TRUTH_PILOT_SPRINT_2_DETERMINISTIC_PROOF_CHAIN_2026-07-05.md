# Payment Truth Pilot Sprint 2 - Deterministic Proof Chain

Date: 2026-07-05

## Decision

The next logical step was a test-owned pilot fixture that proves the narrow payment-truth path end to end before adding more dashboard surface. This keeps the platform from bloating while confirming that the existing services can produce the evidence behind the Daily Business Confidence Brief.

## Executed Slice

Added one deterministic proof-chain fixture covering:

1. Provider event capture as verified external evidence.
2. Provider statement import as unmatched statement evidence.
3. Reconciliation run against one confirmed internal payment transaction.
4. Append-only `MatchRecord` creation.
5. Matched provider event state transition to `PROCESSED`.
6. Matched statement line state transition to `MATCHED`.
7. Payment truth snapshot reading `externalMatchedAmount`, `externalMatchedCount`, and `cashVarianceAmount` from the resulting proof chain.

## Prerequisites Confirmed

- Provider account is active and mapped to the pilot rail.
- Provider event capture and statement import already persist immutable external evidence first.
- Matching stays service-owned and does not post directly to the ledger.
- Successful match state updates happen inside the reconciliation transaction.
- The cash-truth snapshot reads confirmed match records rather than UI-derived values.

## Files Changed

- `services/reconciliation/__tests__/payment-truth-pilot-fixture.test.ts`

## Verification

- `npm test -- --runTestsByPath services/reconciliation/__tests__/payment-truth-pilot-fixture.test.ts --runInBand`
  - 1 suite passed.
  - 1 test passed.
- `npm test -- --runTestsByPath services/reconciliation/__tests__/payment-truth-pilot-fixture.test.ts services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/payments/__tests__/provider-event.service.test.ts services/payments/__tests__/statement-import.service.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts --runInBand`
  - 5 suites passed.
  - 25 tests passed.
- `npm run typecheck`
  - Passed.

## Result

The payment-truth pilot now has a deterministic proof chain from external evidence capture to reconciliation and snapshot metrics:

- `internalCollectedAmount`: 10000
- `externalMatchedAmount`: 10000
- `externalMatchedCount`: 1
- `cashVarianceAmount`: 0
- `openExceptionCount`: 0
- `openSuspenseCount`: 0

## Next Logical Step

Promote the fixture-backed proof into the dashboard read model by adding a narrow assertion that the tenant operating snapshot payment command card exposes the reconciled cash-truth values and proof route when this snapshot is fresh. Avoid adding new dashboard cards until that command-card contract is proven from the service-owned snapshot.
