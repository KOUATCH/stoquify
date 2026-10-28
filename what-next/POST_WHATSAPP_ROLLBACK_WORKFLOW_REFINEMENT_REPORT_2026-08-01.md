# Post-WhatsApp Rollback Workflow Refinement Report - 2026-08-01

## Summary

Status: completed for the narrow post-rollback POS receipt workflow refinement.

This pass kept WhatsApp removed and refined only the restored non-WhatsApp receipt surfaces. The main improvement was making the receipt channel contract explicit and shared across schema, service, and UI: PRINT and NONE no longer carry destinations, while EMAIL and SMS now require a destination before a sale can be charged or a receipt can be delivered.

No new messaging provider was introduced. RBAC, tenant isolation, module entitlement, fiscalization, audit logging, and policy boundaries were not intentionally weakened.

## Workflows Inspected

- POS sale commit action and protected module enforcement.
- POS sale service receipt finalization after accounting/stock/payment commit.
- Receipt service provider dispatch, audit recording, legal delivery blocking, and skipped delivery behavior.
- Receipt schemas for commit-sale and direct send requests.
- POS cashier UI receipt channel selection, destination input, sale blocker, and notification behavior.
- Notification system and notification settings surfaces touched by the rollback.
- English and French POS receipt locale copy.
- Focused POS action, POS service, and POS component tests.

## Problems Found After Rollback

- Receipt channel knowledge was duplicated between schema, service, and UI.
- PRINT still displayed a generic destination input even though print delivery does not need an email or phone destination.
- EMAIL and SMS could be submitted without a destination and would only become ambiguous at service/provider time.
- POS UI blocker copy was tender-focused and did not block incomplete external receipt destinations before charge.
- Service dispatch used nested channel branching, which made future channel drift easier to reintroduce.

## Refactors Implemented

- Added a shared receipt channel contract in `services/pos/receipt-channels.ts`.
- Centralized restored channel order: NONE, PRINT, EMAIL, SMS.
- Centralized destination requirements:
  - NONE: no destination
  - PRINT: no destination
  - EMAIL: destination required
  - SMS: destination required
- Added destination normalization so PRINT/NONE cannot retain unrelated destination data.
- Replaced receipt service nested provider dispatch with a provider-method resolver.
- Tightened POS schemas so commit-sale and send-receipt requests reject missing EMAIL/SMS destinations.
- Updated POS UI so destination input appears only for EMAIL/SMS.
- Added a visible receipt blocker and disabled Charge until a required destination is entered.
- Updated locale copy to use channel-specific placeholders.

## Files Changed

- `services/pos/receipt-channels.ts`
- `services/pos/pos.schemas.ts`
- `services/pos/receipt.service.ts`
- `services/pos/pos.service.ts`
- `components/pos/ProfessionalPOSSystem.tsx`
- `components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx`
- `services/pos/__tests__/receipt-channel-contract.test.ts`
- `messages/en.json`
- `messages/fr.json`

## Tests Added Or Updated

- Added `services/pos/__tests__/receipt-channel-contract.test.ts` to lock the restored non-WhatsApp channel set, destination requirements, normalization, and service schema behavior.
- Updated `components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx` to assert:
  - PRINT does not show an email/phone destination field.
  - EMAIL disables Charge until a destination is entered.
  - EMAIL sale submission includes the normalized destination.

## Verification Commands

- `node -e "JSON.parse(...messages/en.json...); JSON.parse(...messages/fr.json...)"`
  - Result: passed, locale JSON valid.
- `npm test -- --runInBand services/pos/__tests__/receipt-channel-contract.test.ts actions/pos/__tests__/tender.actions.test.ts services/pos/__tests__/pos.service.test.ts components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx`
  - Result: passed, 4 suites / 25 tests.
- `npm test -- --runInBand services/pos/__tests__`
  - Result: passed, 9 suites passed, 1 skipped; 86 tests passed, 7 skipped.
- Active runtime WhatsApp scan across app, actions, components, services, lib, config, prisma, scripts, package.json, .env.example, and messages.
  - Result: no active runtime WhatsApp matches.
- `npm run policy:gates`
  - Result: failed outside the receipt refinement at `offline:pos:replay:gate` with `UNKNOWN: unknown error, open 'E:\ohada saas\Focused projects\stoquify\what-next\offline-pos-fiscal-replay-readiness.json'`.
  - Gates completed before that blocker: inventory boundary, service boundary, regulatory boundary, api guard inventory, public identity abuse, ledger close truth, payment cash truth, purchasing AP, and then stopped during offline POS replay report writing.
  - Evidence check: `what-next/offline-pos-fiscal-replay-readiness.json` exists, has Archive attributes, and is not read-only.

## Remaining Risks Or Blockers

- `npm run policy:gates` is still blocked by a Windows/generated-report write error at `offline:pos:replay:gate`. This pass did not broaden into generated-report writer remediation.
- Full Jest was not rerun in this pass because the previous rollback run already identified unrelated full-suite failures. The relevant POS-focused suites pass.
- Historical docs and isolated snapshots still contain old WhatsApp references; runtime/product source remains clean.

## Confirmations

- WhatsApp runtime behavior was not reintroduced.
- WhatsApp UI, config, provider imports, and environment requirements were not reintroduced.
- No replacement messaging provider was added.
- The changed workflow remains service-owned: sale commit still completes accounting, payment, inventory, fiscalization, receipt generation, and receipt delivery through the existing POS service boundary.
- Unrelated dirty-worktree changes were not intentionally modified.
