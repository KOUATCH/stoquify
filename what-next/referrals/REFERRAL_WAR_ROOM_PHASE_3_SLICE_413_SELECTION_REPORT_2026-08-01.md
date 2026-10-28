# Referral War Room Phase 3 / Slice 413 Selection Report

Date: 2026-08-01
Slice: 413
Name: Tenant-Wide Manager Inventory Loss Action Feed
Operating skills: `stoquify-referral-war-room-orchestrator`, `stoquify-inventory-loss-control`, `stoquify-daily-truth-command-center`, `stoquify-cash-leakage-radar`, `aqstoqflow-release-verification-foundation`

## Selection Decision

Slice 413 is selected to activate the certified `inventory.loss` snapshot and `inventory_loss_review` signal in one existing product consumer: the tenant-wide Manager Action Center.

This is the smallest safe step toward the roadmap requirement to feed Inventory Loss summaries into Daily Truth. The tenant Manager Action Center already resolves operating access and rejects location-responsibility scope before loading tenant-wide evidence. Its existing generic action queue can expose the review action without a new UI contract.

Managed-location bundles are deliberately excluded because they require per-location snapshot loading and separate fan-out evidence. Daily Habit, Owner War Room, Cash Command, and the standalone owner action queue remain unchanged.

## Scope

- Load `getInventoryLossSnapshot` only after tenant-wide operating authority has been resolved and validated.
- Require inherited RBAC satisfaction of `inventory.levels.read` before evaluating module entitlement or reading the snapshot.
- Enforce the `inventory` module entitlement through `observeModuleAccess` using the resolved actor and tenant.
- Skip Inventory Loss loading when RBAC or module entitlement does not allow it while preserving the rest of the Manager Action Center.
- Add an allowed snapshot to the existing deterministic signal input and permission-filtered action queue.
- Preserve the Slice 412 signal route, severity, provenance, aggregate payload, blockers, redactions, and non-causation language.
- Add focused tests for allowed activation, RBAC suppression, module-entitlement suppression, and pre-read operating-scope rejection.

## Authority And Trust Contract

The browser cannot provide an organization or location for this feed. `getManagerActionCenterData` resolves operating access from the trusted server context, and the tenant implementation verifies organization and actor consistency plus `TENANT` / `TENANT_WIDE` authority before any snapshot read.

The optional Inventory Loss read then applies two independent gates: `inventory.levels.read` through the repository RBAC hierarchy and an enforced `inventory` module-entitlement decision. A denied optional gate suppresses only this feed; it does not expose data or invent an empty loss state.

The service consumes only the certified aggregate snapshot. It does not query Inventory Loss source tables directly, accept actor/location authority from the client, expose evidence hashes, or infer fraud, fault, responsible actor, recovery, prevention, or resolution.

## Expected Files

- `services/manager-action-center/manager-action-center.service.ts`
- `services/manager-action-center/__tests__/manager-action-center.service.test.ts`
- dated Slice 413 implementation and release-evidence reports
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Non-Goals

No managed-location feed, Daily Habit feed, Owner War Room feed, Cash Command feed, standalone owner action-queue feed, new route/component, persistence, notification, exception, incident, resolution command, schema, migration, inventory write, AI/copilot behavior, WhatsApp behavior, external sharing, or production activation.

## Expected Verification

- Focused Manager Action Center Jest.
- Inventory Loss snapshot and business-signal rule regressions.
- Manager query/location regressions to prove scope dispatch remains unchanged.
- `npm run typecheck`.
- Scoped ESLint and Prettier.
- Direct database, browser authority, managed-location activation, sensitive-field, accusation, and patch-hygiene scans.

## Baseline

Pre-edit Manager Action Center, Inventory Loss snapshot, and business-signal rules passed: 3 suites / 32 tests.

## Success Criteria

A tenant-wide manager with inherited `inventory.levels.read` and an allowed inventory entitlement receives the deterministic Inventory Loss review action. Missing RBAC, denied entitlement, denied scope, or location-responsibility scope performs no Inventory Loss snapshot read.

## Next Skill

Run `stoquify-daily-truth-command-center`, consulting `stoquify-inventory-loss-control` for source truth and `stoquify-cash-leakage-radar` for neutral exception language.
