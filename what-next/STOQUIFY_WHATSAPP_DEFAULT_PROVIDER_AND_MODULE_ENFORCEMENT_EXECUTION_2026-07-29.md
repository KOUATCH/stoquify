# Stoquify WhatsApp Default Provider And Module Enforcement Execution

Date: 2026-07-29

## Scope Executed

This pass executes the items intentionally left out of the first WhatsApp foundation slice, but keeps the rollout bounded to the clearest safe path: POS WhatsApp receipt delivery and the POS sale commit action. It does not turn on broad module enforcement across the whole system.

## What Changed

- Wired the controlled WhatsApp receipt provider as the default POS receipt provider in `services/pos/receipt.service.ts`.
- Added service-side POS module entitlement enforcement for WhatsApp receipt delivery using `observeModuleAccess` in `mode: "enforce"`.
- Added action-level POS module enforcement to `commitPOSSaleAction` in `actions/pos/tender.actions.ts`.
- Added an explicit per-receipt WhatsApp opt-in confirmation field to POS receipt schemas.
- Added a WhatsApp-only opt-in checkbox to the POS checkout UI and sends that confirmation with the receipt payload.
- Added `.env.example` keys for WhatsApp Cloud API mode, credentials, receipt template, and explicit receipt live-send enablement.
- Updated the controlled receipt provider so live Cloud API calls can execute when `STOQUIFY_WHATSAPP_RECEIPT_LIVE_SENDS=true` and provider credentials/mode are configured.
- Updated the module surface inventory script to recognize explicit `mode: "enforce"` gates.
- Refreshed `what-next/module-surface-inventory.md` and `what-next/module-surface-inventory.json`.

## Before / After Gaps

Before:

- WhatsApp receipt delivery was policy-ready but not wired as the default POS provider.
- Live sends were disabled by a hard provider default.
- POS WhatsApp receipt delivery had no service-level module entitlement denial path.
- POS sale commit stayed module report/observe-adjacent rather than an explicit bounded enforcement pilot.
- Module surface inventory could not distinguish explicit enforce-mode gates from report-only candidates.

After:

- Default POS receipt delivery uses the controlled provider.
- WhatsApp live sends are executable when explicitly enabled by environment and valid Cloud API configuration.
- WhatsApp receipt delivery enforces POS module entitlement before provider work.
- POS sale commit is now an enforce-mode module pilot surface.
- Refreshed inventory shows `actions/pos/tender.actions.ts` as `observeOrEnforce: enforce` and `classification: mapped`.
- Inventory summary moved from 371 surfaces on 2026-07-26 to 381 surfaces on 2026-07-29; mapped count is 347 and enforcement-candidate count is 260.

## Controls Preserved

- WhatsApp still cannot execute prohibited business-state changes such as payroll approval, stock adjustment, close certification, statutory filing, payment posting, or module entitlement changes.
- A phone number alone is not treated as consent; cashier must confirm the customer asked for WhatsApp receipt delivery for that receipt.
- Live sending still requires deployment configuration and Cloud API credentials.
- RBAC remains separate from module entitlement.
- The broad module inventory command remains report-mode as an evidence artifact; the bounded runtime enforcement is on POS sale commit and POS WhatsApp receipt delivery.

## Verification

Passed:

- `npm test -- services/communication actions/pos/__tests__/tender.actions.test.ts scripts/__tests__/module-surface-inventory-enforcement.test.js --runInBand`
- `npm run typecheck`
- `npm run module:surface:inventory`
- `npm test -- scripts/__tests__/module-surface-inventory.test.js scripts/__tests__/module-surface-inventory-enforcement.test.js --runInBand`
- `npm test -- components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx --runInBand`

Attempted broader gate:

- `npm run policy:gates` passed `inventory:boundary:fail`, `service:boundary:fail`, and `regulatory:boundary:fail`, then failed during `api:guard:inventory:fail` on a filesystem write error opening `what-next/api-route-guard-inventory.json` (`UNKNOWN: unknown error, open ...`). This is recorded as an environment/filesystem write blocker, not a failed WhatsApp/POS assertion.

## Remaining Follow-Up

- Persist customer-level WhatsApp preferences, opt-outs, and phone ownership review instead of relying only on per-receipt confirmation.
- Add a webhook route and persistence for WhatsApp delivery status callbacks.
- Add provider idempotency and cost-limit persistence for high-volume sending.
- Extend WhatsApp beyond POS receipts only after the same entitlement, consent, audit, and redaction controls are present.