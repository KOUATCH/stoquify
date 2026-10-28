# Payment Truth Pilot Sprint 2 - Statement Ingestion Tamper Gate - 2026-07-05

## Decision

The next logical step after the cash-truth command card is to harden the first real evidence rail, not to add another dashboard or proof drawer. The selected first rail remains the existing mobile-money HMAC provider/statement ingestion path.

## Slice Executed

- Added a statement-line tamper gate to `services/payments/statement-import.service.ts`.
- Exact duplicate statement-line fingerprints still return `DUPLICATE_LINE`.
- A provider transaction/reference that already exists for the same provider account with a different amount now returns `TAMPERED_LINE`.
- The tamper path creates a critical `PaymentExceptionType.TAMPER_SIGNAL` before any `StatementFile` or `StatementLine` is created.
- Evidence stores file hash, statement-line hashes/fingerprints, hashed provider transaction/reference identifiers, amounts, and correlation id. Raw statement content is not copied into the exception.

## Gates

- Tenant scope: PASS - existing and incoming statement evidence is checked under `organizationId` and `providerAccountId`.
- No ledger side effect: PASS - the tamper branch returns before statement file/line creation and does not post to journals.
- Idempotency preserved: PASS - exact duplicate file and exact duplicate line behavior remains unchanged.
- Tamper detection: PASS - changed amount on an existing provider transaction/reference is promoted to critical exception evidence.
- Dashboard bloat control: PASS - no UI or new command card was added.

## Verification

- `npm test -- --runTestsByPath services/payments/__tests__/statement-import.service.test.ts services/payments/__tests__/provider-event.service.test.ts services/payments/__tests__/mobile-money-hmac.adapter.test.ts --runInBand`
- `npm run typecheck`

## Next Step

Continue Sprint 2 by feeding imported statement/provider evidence into reconciliation run creation and match records for the named pilot tenant. Do not claim certification until provider evidence, statement lines, match records, suspense handling, and signed reconciliation runs exist for that pilot scope.