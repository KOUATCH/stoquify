# WhatsApp Integration Rollback Report - 2026-08-01

## Summary

Rollback status: completed for runtime/product WhatsApp integration.

The rollback removed active WhatsApp receipt delivery, provider wiring, POS UI affordances, notification/settings copy, environment requirements, and generated WhatsApp smoke artifacts. POS receipt behavior is restored to the non-WhatsApp channels: PRINT, EMAIL, SMS, and NONE. Module entitlement, RBAC, tenant isolation, audit, and policy guard behavior were not intentionally weakened.

Historical strategy/report documents under docs/whatsapp-integration and what-next were left intact because they are not runtime code, navigation, tests, or product-facing workflow surfaces.

## Skill Used

- C:\Users\J COMPUTER\.codex\skills\aqstoqflow-prompt-architect\SKILL.md

## Baseline And Evidence Inspected

- git log --all --grep=whatsapp --oneline --decorate -n 50: no matching commit history found.
- git log --all --name-status -- "*whatsapp*" -n 50: no matching tracked filename history found.
- Runtime scans across app, actions, components, services, lib, config, prisma, scripts, package.json, .env.example, and messages.
- POS receipt/action surfaces:
  - actions/pos/tender.actions.ts
  - services/pos/receipt.service.ts
  - services/pos/pos.schemas.ts
  - services/pos/pos.service.ts
  - components/pos/ProfessionalPOSSystem.tsx
- Notification/settings surfaces:
  - components/notifications/NotificationSystem.tsx
  - app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx
  - messages/en.json
  - messages/fr.json
  - .env.example
- WhatsApp-only communication folder:
  - services/communication/index.ts
  - services/communication/receipt-whatsapp-delivery.provider.ts
  - services/communication/whatsapp-cloud-api.provider.ts
  - services/communication/whatsapp-policy.ts
  - services/communication/__tests__/*.test.ts
- Focused tests:
  - actions/pos/__tests__/tender.actions.test.ts
  - services/pos/__tests__/pos.service.test.ts
  - components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx

## Integration Points Found

- POS sale action scheduled a post-commit WhatsApp receipt path through next/server after().
- Receipt service imported WhatsApp delivery providers and policy helpers.
- Receipt schemas exposed WHATSAPP and whatsAppCustomerOptInConfirmed.
- POS UI showed WHATSAPP as a receipt channel and rendered a WhatsApp opt-in checkbox.
- Locale messages exposed WhatsApp receipt preview, channel labels, opt-in text, and destination hints.
- Notification channel union and settings copy referenced WhatsApp.
- .env.example required/advertised WhatsApp Cloud API configuration.
- services/communication was WhatsApp-only provider and policy code.
- Generated .next-dev-pos-whatsapp-smoke and .next-dev cache artifacts were present and removed.

## Changes Made

- actions/pos/tender.actions.ts: restored service-owned POS sale/receipt handling and removed WhatsApp after() scheduling.
- services/pos/receipt.service.ts: restored PRINT/EMAIL/SMS provider contract and removed WhatsApp delivery, module observation, consent, phone normalization, and provider dispatch.
- services/pos/pos.schemas.ts: restored receipt channel enum to PRINT, EMAIL, SMS, NONE and removed WhatsApp opt-in schema fields.
- services/pos/pos.service.ts: stopped forwarding WhatsApp consent into receipt delivery.
- components/pos/ProfessionalPOSSystem.tsx: removed WhatsApp channel, opt-in state, checkbox UI, and payload field; restored four-channel layout.
- components/notifications/NotificationSystem.tsx: removed whatsapp from the notification channel type.
- app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx: removed WhatsApp from notification settings copy.
- messages/en.json and messages/fr.json: removed WhatsApp receipt preview/channel/opt-in strings and restored generic receipt destination copy.
- .env.example: removed WhatsApp mode, live-send, consent, phone number, access token, app secret, and template variables.
- services/communication/: removed WhatsApp-only provider/policy code and tests.
- Removed generated artifacts: .next-dev-pos-whatsapp-smoke/ and .next-dev/.

## Workflows Restored

- POS sale commit now delegates receipt handling through commitPOSSale without action-level WhatsApp scheduling.
- Receipt delivery now supports only PRINT, EMAIL, SMS, and NONE through the existing stub provider behavior.
- Normal app/test execution no longer requires WhatsApp environment variables.
- POS receipt UI no longer asks for WhatsApp consent or displays WhatsApp as a delivery choice.
- Notification settings no longer advertise WhatsApp as a notification channel.

## Tests Updated

- actions/pos/__tests__/tender.actions.test.ts now asserts service-owned POS sale receipt handling with EMAIL and preserves POS module/RBAC denial coverage.
- services/pos/__tests__/pos.service.test.ts now verifies EMAIL receipt delivery failure does not invalidate an otherwise committed sale.
- components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx now submits an active cash sale with EMAIL receipt destination and no WhatsApp opt-in.

## Verification Commands

- npm test -- --runInBand actions/pos/__tests__/tender.actions.test.ts services/pos/__tests__/pos.service.test.ts components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx
  - Result: passed, 3 suites / 21 tests.
- npm test -- --runInBand
  - Result: failed on pre-existing/non-WhatsApp tests:
    - scripts/__tests__/module-surface-enforcement-first-pass.test.js expects report-only but source reports observe.
    - services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts has Cameroon statutory readiness expectation drift.
    - scripts/__tests__/landing-founder-preview.test.js frozen landing source size/hash mismatch.
    - scripts/__tests__/workflow-assurance-multi-finding-persistence-migration.test.js detects activated POS cash-shortage review key.
- npm run policy:gates
  - First run: failed at inventory:boundary:fail because generated .next-dev/server output was scanned.
  - After removing generated .next-dev-pos-whatsapp-smoke/ and .next-dev/: progressed through POS-adjacent gates and failed at statutory:country-pack:gate.
  - Remaining blocker: Cameroon country pack still needs valid bound source hashes and qualified expert approval evidence.
- Runtime-source scan:
  - rg for WhatsApp/WHATSAPP/whatsApp/sendWhatsApp/STOQUIFY_WHATSAPP/WHATSAPP_/wa.me/services/communication/provider policy terms across runtime source returned: no runtime WhatsApp matches.

## Remaining WhatsApp Mentions

Only negative guard tests still mention WhatsApp to assert that unrelated workflows have no WhatsApp dependency. Those were intentionally preserved.

## Remaining Blockers

- Full Jest is not clean because of unrelated module surface, payroll statutory, landing freeze, and workflow assurance migration failures.
- policy:gates is not clean because statutory:country-pack:gate remains blocked on source_artifact_hash_verification and source_artifact_expert_approval.

## Unrelated Work Protection

No broad git checkout, reset, or destructive source rollback was used. Existing unrelated dirty-worktree changes were not intentionally modified. Historical WhatsApp reports were preserved unless they were generated runtime smoke/cache artifacts.
