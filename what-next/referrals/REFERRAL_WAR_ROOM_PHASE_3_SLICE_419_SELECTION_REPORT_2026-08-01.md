# Referral War Room Phase 3 Slice 419 Selection Report

Date: 2026-08-01
Orchestrator: `stoquify-referral-war-room-orchestrator`
Implementation skill: `stoquify-daily-truth-command-center`
Consulting skill: `stoquify-inventory-loss-control`

## Selected Slice

Phase 3 / Slice 419: Tenant-Wide Cash Command Inventory Loss Action Feed.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/DAILY_TRUTH_CASH_COMMAND_TENANT_AUTHORITY_SLICE_418_REPORT_2026-08-01.md`
- `what-next/referrals/DAILY_TRUTH_OWNER_WAR_ROOM_INVENTORY_LOSS_SLICE_416_REPORT_2026-08-01.md`
- `what-next/referrals/DAILY_TRUTH_INVENTORY_LOSS_SLICE_415_REPORT_2026-08-01.md`
- `what-next/referrals/INVENTORY_LOSS_CONTROL_SLICE_414_REPORT_2026-08-01.md`
- `services/cash-command/cash-command.service.ts`
- `services/cash-command/__tests__/cash-command.service.test.ts`
- `services/snapshots/inventory-loss-snapshot.service.ts`
- `services/signals/business-signal-rules.service.ts`
- `services/signals/action-queue.service.ts`

## Decision

Slice 418 removed Cash Command's broader tenant-authorization blocker. Cash Command already maps `inventory_loss_review` to the inventory module, and the certified snapshot, deterministic signal, action path, neutral review language, evidence redaction, and permission contract are already used by four product services.

The next highest-value bounded step is to add one optional tenant Inventory Loss snapshot to Cash Command's existing signal composition. This advances the roadmap's money-protection action loop without adding a new dashboard card, contract, route, component, or write workflow.

## Required Boundary

- Slice 418's actor, base permission, and shared tenant-wide authority guard remains the first loader operation.
- Optional loading requires inherited `inventory.levels.read`.
- The service must enforce and audit one `inventory` module-entitlement decision with read intent.
- Only an allowed decision may call `getInventoryLossSnapshot`.
- The snapshot uses server-owned organization scope plus the existing Cash Command period, freshness, and time inputs, with no location claim.
- The optional snapshot enters deterministic signal composition only and is not returned as a new output field.
- Missing permission or denied entitlement suppresses only Inventory Loss loading and leaves existing Cash Command data available.

## Expected Product Files

- `services/cash-command/cash-command.service.ts`
- `services/cash-command/__tests__/cash-command.service.test.ts`

## Verification Plan

- Authorized administrator with Inventory Loss permission receives one enforced, audited entitlement decision and exactly one tenant snapshot read.
- Real certified signal and action-queue composition produces the `inventory_loss_review` action at `/dashboard/inventory/losses`.
- Missing Inventory Loss permission performs no entitlement evaluation and no loss read.
- Denied inventory entitlement performs no loss read and preserves the existing Cash Command.
- Existing Slice 418 base-denial cases continue to perform zero source calls.
- Final consumer scan finds exactly five product services importing the Inventory Loss snapshot.
- Cash Command contracts, route, component, card count, and rendered UI remain unchanged.
- Focused and related Jest, full typecheck, scoped ESLint, source-boundary, sensitive-field, accusation, activation, whitespace, and patch-reject scans must pass.

## Baseline

Pre-edit Cash Command, Inventory Loss snapshot, signal rules, action queue, and module-entitlement tests passed: 5 suites / 41 tests.

## Deferred Candidates

- Role-aware navigation remains usability defense-in-depth because service gates already prevent data exposure.
- Accountant authority policy requires a separate provisioning and product-policy decision.
- A location-scoped Cash Command requires a new read-model and UX design and is not part of this tenant feed.
- Standalone owner queues, persistence, notifications, incidents, resolution, sharing, AI/copilot, WhatsApp, and production activation remain unauthorized.

