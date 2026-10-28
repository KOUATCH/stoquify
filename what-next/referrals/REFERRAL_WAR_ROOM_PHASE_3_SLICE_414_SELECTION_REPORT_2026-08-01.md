# Referral War Room Phase 3 / Slice 414 Selection Report

Date: 2026-08-01
Slice: 414
Name: Managed-Location Inventory Loss Action Feed
Operating skills: `stoquify-referral-war-room-orchestrator`, `stoquify-daily-truth-command-center`, `stoquify-inventory-loss-control`, `stoquify-cash-leakage-radar`, `aqstoqflow-release-verification-foundation`

## Selection Decision

Slice 414 is selected to complete the location-aware Manager Action Center path for the certified `inventory.loss` snapshot and `inventory_loss_review` signal.

Slice 413 activated tenant-wide authority only. The existing managed-location service already validates `LOCATION_RESPONSIBILITY`, proves exact equality between server-resolved managed locations and snapshot scope, and builds one isolated branch bundle and action queue per location. Adding the certified Inventory Loss snapshot inside that boundary is the dependency-complete next step required by the roadmap's role-aware and location-aware Daily Truth acceptance criterion.

## Scope

- Preserve existing matching organization/actor, `LOCATIONS` / `LOCATION_RESPONSIBILITY`, and exact managed-location-set checks before optional feed evaluation.
- Require inherited RBAC satisfaction of `inventory.levels.read` before module evaluation or Inventory Loss reads.
- Enforce and audit the `inventory` module entitlement once per request for the resolved tenant and actor.
- When allowed, load one `getInventoryLossSnapshot` per server-authorized location using the normalized period, freshness, and location scope.
- Build each location's deterministic signals and permission-filtered action queue from its own branch and Inventory Loss snapshots only.
- Preserve managed-location order and prevent cross-location aggregation, signal mixing, and browser-selected scope.
- Do not add the Inventory Loss snapshot to the returned bundle contract; expose only its existing generic signal/action representation.
- Add focused tests for multi-location activation and isolation, missing RBAC, denied entitlement, and pre-read scope rejection.

## Authority And Trust Contract

The browser cannot supply the managed-location set. `resolveOperatingAccessScope` derives it from server-owned responsibility evidence, and the service verifies that the authority locations exactly equal the resolved scope in the same order before any branch or Inventory Loss read.

The entitlement decision is tenant-level and therefore runs once. Snapshot reads fan out only across the already-authorized locations. Each snapshot carries its server-resolved `locationId`, which the Slice 412 signal uses for stable subject and dedupe identity.

Missing RBAC or denied entitlement suppresses the optional feed without inventing empty loss evidence. The branch operating bundles remain available. No Inventory Loss source table, evidence hash, approving actor, or other detail record is exposed.

## Expected Files

- `services/manager-action-center/manager-location-action-center.service.ts`
- `services/manager-action-center/__tests__/manager-location-action-center.service.test.ts`
- dated Slice 414 implementation and release-evidence reports
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Non-Goals

No tenant-feed change, Daily Habit feed, Owner War Room feed, Cash Command feed, standalone owner queue feed, bundle-contract change, new route/component, persistence, notification, exception, incident, resolution command, schema, migration, inventory write, AI/copilot behavior, WhatsApp behavior, external sharing, or production activation.

## Expected Verification

- Focused managed-location service Jest.
- Unified query dispatch, tenant Manager Action Center, signal-rule, and Inventory Loss snapshot regressions.
- `npm run typecheck`.
- Scoped ESLint and native-style patch hygiene.
- Authority-set, browser-scope, cross-location, module-entitlement, direct-source, sensitive-field, accusation, and consumer-activation scans.

## Baseline

Pre-edit managed-location, unified query, signal-rule, and Inventory Loss snapshot tests passed: 4 suites / 28 tests.

## Success Criteria

Every authorized managed location can receive only its own deterministic Inventory Loss review action after independent RBAC and module-entitlement gates. Missing permission, denied entitlement, or inconsistent scope performs no Inventory Loss snapshot read.

## Next Skill

Run `stoquify-daily-truth-command-center`, consulting `stoquify-inventory-loss-control` for per-location source truth and `stoquify-cash-leakage-radar` for neutral review language.
