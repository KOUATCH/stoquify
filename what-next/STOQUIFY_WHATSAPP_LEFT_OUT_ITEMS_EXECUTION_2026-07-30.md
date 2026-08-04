# Stoquify WhatsApp Left-Out Items Execution - 2026-07-30

## Scope

- Skill lane: `aqstoqflow-module-enforcement-pilot` and `aqstoqflow-module-surface-inventory-gate`.
- Request: execute the previously deferred WhatsApp/POS items: live-send capability, default POS WhatsApp receipt provider wiring, bounded POS module enforcement, and refreshed broad module surface inventory.

## Implemented / Verified

- WhatsApp receipt live-send path is implemented behind explicit runtime configuration:
  - `STOQUIFY_WHATSAPP_MODE`
  - `STOQUIFY_WHATSAPP_RECEIPT_LIVE_SENDS`
  - `WHATSAPP_RECEIPT_TEMPLATE_NAME`
  - `WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE`
- POS receipts now use `createControlledReceiptDeliveryProvider()` as the default receipt delivery provider.
- POS sale commit action is module-enforced for `moduleSlug: "pos"` with `mode: "enforce"`.
- WhatsApp receipt sends enforce POS module entitlement in the receipt service before attempting WhatsApp delivery.
- POS cashier UI now captures customer WhatsApp opt-in before receipt delivery.
- Module entitlement remains report-only globally; only the bounded POS action/service pilot is hard-enforced.
- The broad module surface inventory was refreshed on 2026-07-30 with 381 records.

## Refreshed Inventory Evidence

- `what-next/module-surface-inventory.md`
  - Generated at: `2026-07-30T02:58:37.179Z`
  - POS sale action row: `pos/tender.actions.ts` is classified as `mapped`, not `mapped, enforcement candidate`.
- `what-next/module-surface-inventory.json`
  - `actions/pos/tender.actions.ts`
    - `moduleSlug`: `pos`
    - `permission`: `pos.use`
    - `guard`: `protect`
    - `observeOrEnforce`: `enforce`
    - `classification`: `mapped`
  - `app/api/receipts/[receiptId]/route.ts`
    - public receipt lookup remains `not_applicable_public`
    - service evidence row remains token-bound public receipt evidence with `apiModuleAccessMode: "enforce"`

## Verification

- `npm test -- services/communication actions/pos/__tests__/tender.actions.test.ts scripts/__tests__/module-surface-inventory-enforcement.test.js --runInBand`
  - Result: passed
  - 5 test suites passed
  - 18 tests passed
- `npm run typecheck`
  - Result: passed
- `npm run policy:gates`
  - Result: blocked by environment/file write issue after the first three gates passed.
  - Passed before blocker:
    - `inventory:boundary:fail`
    - `service:boundary:fail`
    - `regulatory:boundary:fail`
  - Blocker:
    - `api:guard:inventory:fail` failed while opening `what-next/api-route-guard-inventory.json` for write with Node `UNKNOWN: unknown error`.

## Notes

- The canonical module inventory refresh initially hit the same Windows/Node write issue on `what-next/module-surface-inventory.json`.
- Workaround used: generated timestamped inventory files, then copied them over the canonical inventory artifacts successfully.
- No real WhatsApp message was sent during verification; live sends require explicit environment configuration and provider credentials.
