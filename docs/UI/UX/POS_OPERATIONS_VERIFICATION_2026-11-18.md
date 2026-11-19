# POS operations verification — 18 November 2026

Scope: safe local checks supporting the POS selling-screen simplification. No deployment, live sale, payment, refund, message delivery, physical printing or cash-drawer operation was performed.

## Executed evidence

All commands use inspected configurations without a Next application `dir`, application environment-file bootstrap or a database test runner. Persistence, auth and protected actions are mocked by the inspected suites/setup. These results are unit/hook evidence, not PostgreSQL, provider or hardware certification.

| Command | Result |
| --- | --- |
| `node node_modules/jest/bin/jest.js --config jest.pos-purchasing-inventory-repairs.config.cjs --runInBand --no-cache --runTestsByPath services/pos/__tests__/receipt-channel-contract.test.ts services/pos/__tests__/receipt-public.test.ts services/pos/__tests__/public-receipt-token-registry.service.test.ts` | 3 suites, 32 tests passed |
| `node node_modules/jest/bin/jest.js --config jest.remaining-local.config.cjs --runInBand --no-cache --runTestsByPath actions/pos/__tests__/tender.actions.test.ts` | 1 suite, 12 tests passed |
| `node node_modules/jest/bin/jest.js --config jest.pos-checkout-feedback.config.cjs --runInBand --no-cache --runTestsByPath hooks/posHooks/__tests__/usePosOperations-receipts.test.tsx --testMatch '**/usePosOperations-receipts.test.tsx'` | 1 suite, 6 tests passed |

Added three regression cases to `services/pos/__tests__/receipt-public.test.ts`: default PRINT, EMAIL and SMS providers return PENDING with an unconfigured-provider explanation and record that status; they must not claim SENT or create a delivery business event. No production behavior was changed by this test addition.

The receipt suites also exercise destination validation, WhatsApp consent, tenant/sale-bound receipt tokens, expiry/tampering/revocation rejection, public payload redaction, certification blockers and mocked outbox enqueueing. The hook suite checks capability lookup, deferred receipt search, absent-sale query suppression and token-query invalidation. The protected-action suite checks module entitlement, current interactive identity, retained commit identity, checkout ownership and protected refund/void paths.

## Current capabilities and limits from source inspection

- `components/pos/ProfessionalPOSSystem.tsx` exposes receipt channel NONE only. A confirmed sale can provide its digital receipt; the existence of a receipt does not prove delivery or certification.
- `services/pos/receipt.service.ts` uses pending stubs for default PRINT, EMAIL and SMS delivery. WhatsApp has a separate queued provider path; its mocked outbox tests do not prove actual delivery. Unsupported delivery methods must not be advertised as ready.
- There is no current POS refund/void UI caller in `components/` or `app/`. `useRefundPOSSale` and `useVoidPOSSale` exist in `hooks/posHooks/usePosOperations.ts`; adding a navigation link cannot make an executable return workflow available.
- `actions/pos/tender.actions.ts` requires the relevant refund/void permission, POS module access and fresh authentication within 300 seconds. The correction schemas require the original sale, location, terminal, session and a reason. The service checks original completed-sale scope and an active cashier-owned correction session. Refunds are whole-sale cash corrections; unsupported payment rails fail closed, and on-account refunds are rejected. These are not a general partial-return or provider-reversal interface.
- The original scanner status was derived from selling eligibility, not a device handshake. Drawer state is recorded session data; the printer is unconfigured. Neither source inspection nor a mock test proves that a physical scanner, printer or drawer is connected or working.

## Remaining proof

Original-sale selection/review/fresh-auth return UI, end-to-end provider delivery, real peripherals and real PostgreSQL atomicity/concurrency remain separate acceptance work. They were not certified in this run. Existing seed conflicts are not evidence of production failure rates. No fixture conflict was removed or resolved by this verification.

Root-agent layout/browser verification and sale/accounting/offline test evidence are reported in `POS_SIMPLIFICATION_VERIFICATION_2026-11-18.md`. The root agent read revision `80e4abb283216b9f8e04b94e5020393f7dcabf62` using an explicit work-tree path; the existing checkout contains extensive unrelated changes. No Git configuration or metadata was repaired.
