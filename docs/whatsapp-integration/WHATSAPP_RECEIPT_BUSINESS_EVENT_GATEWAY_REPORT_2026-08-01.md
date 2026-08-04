# WhatsApp Receipt Business Event Gateway Report

Generated: 2026-08-01

Selected skill: `004-aqstoqflow-business-event-gateway`

## Summary

This pass moved WhatsApp POS receipt delivery from the checkout request path into the existing business event and outbox backbone. A completed POS sale can now queue a WhatsApp receipt as a durable business event/outbox message, while a worker later claims, sends, retries, defers, or dead-letters the request.

The POS cashier experience remains unchanged: WhatsApp still requires a destination and explicit customer consent before charging. The sale is not blocked by provider availability.

## Implemented

- Added `queueWhatsAppReceiptDeliveryInTx` to record a WhatsApp receipt business event and outbox row atomically.
- Reused existing `BusinessEvent` and `BusinessEventOutbox` models without adding a migration.
- Used existing `WEBHOOK` outbox channel with event name `pos.receipt.whatsapp.requested`.
- Kept raw phone numbers out of business event payloads, metadata, audit logs, and delivery results.
- Stored the raw phone only as the outbox delivery destination required for later provider dispatch.
- Added a WhatsApp receipt worker service with tenant-scoped claim, stale-lock recovery, deferred configuration state, retry/backoff, dead-letter handling, and worker completion events.
- Added a bounded worker CLI wrapper in `scripts/whatsapp-receipt-worker.ts`.
- Updated `sendReceipt` so WhatsApp queues delivery; print, email, and SMS still use the existing provider dispatch.

## Files changed

- `services/communication/whatsapp-receipt-outbox.service.ts`
- `services/communication/whatsapp-receipt-worker.service.ts`
- `services/communication/__tests__/whatsapp-receipt-outbox.service.test.ts`
- `services/communication/__tests__/whatsapp-receipt-worker.service.test.ts`
- `scripts/whatsapp-receipt-worker.ts`
- `scripts/__tests__/whatsapp-receipt-worker.test.ts`
- `services/pos/receipt.service.ts`
- `services/pos/__tests__/receipt-public.test.ts`

## Verification

- `npm test -- --runInBand services/communication/__tests__/whatsapp-receipt-outbox.service.test.ts services/communication/__tests__/whatsapp-receipt-worker.service.test.ts scripts/__tests__/whatsapp-receipt-worker.test.ts`: passed, 3 suites, 7 tests.
- `npm test -- --runInBand services/communication/__tests__/whatsapp-receipt.provider.test.ts services/communication/__tests__/whatsapp-receipt-outbox.service.test.ts services/communication/__tests__/whatsapp-receipt-worker.service.test.ts services/pos/__tests__/receipt-channel-contract.test.ts services/pos/__tests__/receipt-public.test.ts services/pos/__tests__/pos.service.test.ts components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx scripts/__tests__/whatsapp-receipt-worker.test.ts`: passed, 8 suites, 49 tests.
- `npm test -- --runInBand services/pos/__tests__ actions/pos/__tests__ services/events/__tests__/business-event.service.test.ts`: passed, 18 suites passed, 1 skipped; 138 tests passed, 7 skipped.
- `npm run typecheck`: first run timed out; rerun passed.
- Focused ESLint over touched WhatsApp/POS/worker files: passed.
- `npm run prisma:validate`: passed.
- Runtime safety scan for obvious WhatsApp test secrets/raw test phone numbers outside tests: no findings.

## Blocked gate

`npm run policy:gates` was attempted and stopped at `inventory:boundary:fail`.

Exact failing command:

`node scripts/inventory-boundary-gate.js --mode fail`

Cause: the inventory boundary gate is scanning generated Next build output under `.next-dev/` and `.next-slice410/`, producing 66 direct stock mutation findings from generated server files. This blocker is unrelated to the WhatsApp receipt gateway slice.

## Notes

- Global module entitlement behavior was not changed.
- WhatsApp live sends remain opt-in via environment configuration.
- Provider dispatch is now worker-controlled, so later WhatsApp features can reuse the same queue/worker pattern rather than coupling provider calls to user-facing actions.

Next recommended numbered skill: `005-aqstoqflow-accounting-control-center`.
