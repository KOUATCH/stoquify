# Evidence Map

## Core Evidence

- `lib/pos/offline-local-queue.ts`
- `services/pos/offline-sync.service.ts`
- `services/pos/receipt.service.ts`
- `services/pos/`
- `actions/pos/`
- `services/inventory/`
- `services/accounting/`

## Replay States

- Pending local event
- Submitted sync payload
- Accepted pending replay
- Conflict
- Replayed
- Rejected
- Certified receipt

## Evidence Questions

- Which device produced the event?
- What is the device sequence?
- What idempotency key protects replay?
- Is the receipt provisional or final?
- What stock, cash, and ledger effects were produced?
