# Inventory Loss Control Slice 414 Report

Date: 2026-08-01
Slice: Phase 3 / 414
Capability: Managed-Location Inventory Loss Action Feed
Status: Certified

## Decision

Slice 414 is certified as the bounded managed-location activation of the existing `inventory.loss` snapshot and `inventory_loss_review` signal.

Before this slice, the tenant-wide Manager Action Center could load Inventory Loss evidence, while managed-location bundles built signals from `branch.operating` alone. After this slice, each authorized managed-location bundle may include its own deterministic Inventory Loss review action without exposing the snapshot or changing the bundle contract.

## Implemented Boundary

- Preserved matching organization and actor checks before optional Inventory Loss gating.
- Preserved the `LOCATIONS` / `LOCATION_RESPONSIBILITY` authority requirement and exact ordered managed-location set check before any snapshot read.
- Required inherited `inventory.levels.read`.
- Enforced and audited the `inventory` module entitlement once per request.
- Loaded at most one certified Inventory Loss snapshot for each server-authorized location using the normalized period and freshness scope.
- Composed each action queue from only that location's branch and Inventory Loss snapshots.
- Preserved resolver order and the existing `{ location, snapshot, actionQueue }` bundle contract.
- Kept branch bundles available when the optional Inventory Loss RBAC or entitlement gate denied the read.

## Trust Evidence

The managed-location service imports the certified snapshot adapter, not Prisma or the Inventory Loss read model. Location IDs come only from resolved `LOCATION_RESPONSIBILITY` evidence after exact agreement with the resolved `LOCATIONS` scope.

No Inventory Loss snapshot is returned to the client. The existing signal rules retain neutral review language, aggregate metrics, blocker propagation, source provenance, and redaction semantics.

The product consumer scan now finds exactly two manager services: the tenant-wide feed certified in Slice 413 and the managed-location feed certified here. No other product consumer was activated.

## Verification

- Pre-edit baseline: 4 suites / 28 tests passed.
- Focused managed-location suite: 1 suite / 7 tests passed.
- Final manager, query, signal, and snapshot regression: 5 suites / 47 tests passed.
- `npm run typecheck`: passed.
- Scoped ESLint: passed.
- Scoped `git diff --check`: passed.
- Direct source-read, Prisma, sensitive-field, contract-widening, and patch-reject scans: no matches.
- Product activation scan: exactly two product services import `getInventoryLossSnapshot`, both selected manager feeds.
- Final product diff: 264 insertions and 5 deletions across only the selected service and focused test.

## Non-Goals Preserved

No Daily Habit, Owner War Room, Cash Command, standalone owner queue, route, component, bundle-contract field, persistence, notification, exception, incident, resolution, schema, migration, inventory write, AI/copilot authority, WhatsApp authority, external sharing, or production activation was added.

The inherited POS cash-shortage activation hold remains unchanged and was not bypassed.

## Next Decision

No Slice 415 is selected. Run `stoquify-referral-war-room-orchestrator` for a fresh evidence, dependency, and risk audit before authorizing another consumer or capability.
