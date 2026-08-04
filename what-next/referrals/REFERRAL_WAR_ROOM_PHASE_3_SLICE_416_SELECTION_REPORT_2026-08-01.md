# Referral War Room Phase 3 Slice 416 Selection Report

Date: 2026-08-01
Program: Referral-Worthy Execution
Phase: 3, Leakage Radar And Inventory Loss
Selected slice: Tenant-Wide Owner War Room Inventory Loss Action Feed
Status: Selected

## Decision

Select Slice 416 to feed the certified `inventory.loss` snapshot and `inventory_loss_review` signal into the existing Owner War Room action queue for tenant-wide actors only.

This is the strongest dependency-backed move after Slices 413-415 activated the Manager Action Center and Daily Habit consumers. It advances the roadmap's owner-summary requirement through the existing service-owned signal and action contracts without inventing a second loss model, widening tenant authority, or adding speculative UI.

## Live Evidence

- The certified Inventory Loss read model, protected operating surface, snapshot, deterministic signal, and three bounded consumer feeds are present.
- `getOwnerWarRoomData` currently composes tenant operating, payment truth, inventory cash, and close readiness snapshots through the generic business-signal and action-queue services.
- The exhaustive Owner War Room action-module map already recognizes `inventory_loss_review`, but the service does not load `inventory.loss`.
- The two server-owned callers currently pass organization, actor, and permission evidence but omit role codes and super-user state.
- The shared operating-access contract defines tenant-wide authority as super-user or normalized `admin`, `administrator`, or `super_admin` role evidence. It does not authorize an arbitrary `owner` role.
- Pre-edit Owner War Room baseline passed: 3 suites / 7 tests.
- Architecture evidence places Owner War Room and Daily Habit services in the same service community while keeping the Owner War Room output contracts separate, supporting a service-only feed addition.

## Selected Boundary

- Carry server-resolved role codes and super-user state from the protected action and dashboard route.
- Require a non-empty server actor ID, inherited `dashboard.read`, inherited `inventory.levels.read`, and the shared tenant-wide authority decision.
- Enforce and audit the `inventory` module entitlement for the resolved tenant and actor.
- Load at most one tenant-scoped certified Inventory Loss snapshot using the Owner War Room period and freshness scope.
- Add the optional snapshot only to deterministic signal composition so the existing action queue can expose the neutral review action.
- Preserve `OwnerWarRoomData`, cards, strips, morning-brief fields, route shape, and component contracts.
- Missing actor evidence, RBAC, tenant authority, or entitlement suppresses only the Inventory Loss feed; the existing Owner War Room remains available under its current base guard.

## Expected Files

- `services/owner-war-room/owner-war-room.service.ts`
- `services/owner-war-room/__tests__/owner-war-room.service.test.ts`
- `actions/owner-war-room/owner-war-room.actions.ts`
- `actions/owner-war-room/__tests__/owner-war-room.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx`
- focused evidence reports under `what-next/referrals/` and `what-next/skills-life-cycle/`

## Verification Plan

- Focused Owner War Room service and action Jest.
- Positive tenant-authority, entitlement, single-read, and neutral action assertions.
- Negative missing-actor, missing-RBAC, location-responsibility, and denied-entitlement assertions.
- Daily Habit, Manager Action Center, operating-authority, signal-rule, action-queue, and Inventory Loss snapshot regressions.
- Full TypeScript typecheck and scoped ESLint.
- Caller-propagation, authority, entitlement, direct-source, sensitive-field, accusation, contract-diff, consumer-count, location-scope, patch-reject, and whitespace/diff scans.

## Non-Goals

No tenant-authority expansion, managed-location aggregation, new card or KPI, cash-leakage strip redesign, output-contract field, component redesign, route shape change, direct loss-source query, persistence, notification, exception, incident, resolution, schema, migration, inventory write, AI/copilot authority, WhatsApp authority, external sharing, or production activation is selected.
