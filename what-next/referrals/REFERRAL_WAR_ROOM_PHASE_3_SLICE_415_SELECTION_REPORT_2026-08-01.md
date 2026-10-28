# Referral War Room Phase 3 Slice 415 Selection Report

Date: 2026-08-01
Program: Referral-Worthy Execution
Phase: 3, Leakage Radar And Inventory Loss
Selected slice: Tenant-Wide Daily Habit Inventory Loss Action Feed
Status: Selected

## Decision

Select Slice 415 to feed the certified `inventory.loss` snapshot and `inventory_loss_review` signal into the existing Daily Habit digest for tenant-wide actors only.

This is the next dependency-backed roadmap move after Slices 413 and 414 activated tenant-wide and managed-location Manager Action Center feeds. It advances the explicit Inventory Loss requirement to feed loss summaries into Daily Truth without exposing tenant-wide loss evidence to location-responsibility users.

## Live Evidence

- The certified Inventory Loss read model, protected query, operating surface, snapshot, deterministic signal, and both Manager Action Center feeds are present.
- `getDailyHabitDigestData` currently loads tenant operating, payment truth, inventory cash, and close readiness snapshots and composes the generic action queue.
- The Daily Habit service has two server-owned callers: the protected dashboard route and the command-agent tool adapter.
- Those callers currently omit actor identity and super-user state from the digest service input, so Inventory Loss entitlement and tenant authority cannot yet be proven inside the service.
- The established operating-access contract defines tenant-wide authority as super-user or normalized `admin`, `administrator`, or `super_admin` role evidence.
- Pre-edit baseline passed: 5 suites / 33 tests across Daily Habit, agent adapter, operating scope, signal rules, and Inventory Loss snapshot.

## Selected Boundary

- Reuse one exported pure tenant-wide authority resolver from the operating-access boundary so role logic cannot drift.
- Carry server-resolved actor ID and super-user state from both current callers.
- Require inherited `inventory.levels.read`.
- Require established tenant-wide authority before entitlement evaluation or snapshot loading.
- Enforce and audit the `inventory` module entitlement for the resolved organization and actor.
- Load at most one tenant-scoped certified Inventory Loss snapshot using the digest period and freshness scope.
- Add the snapshot only to deterministic signal composition; preserve the existing digest output contract.
- Missing actor evidence, RBAC, tenant authority, or entitlement suppresses only the optional Inventory Loss feed.
- Location-responsibility users continue through the certified Slice 414 per-location Manager Action Center feed.

## Expected Files

- `services/operating-access/operating-access-scope-contracts.ts`
- `services/operating-access/operating-access-scope.service.ts`
- `services/daily-habit/daily-habit-digest.service.ts`
- `services/daily-habit/__tests__/daily-habit-digest.service.test.ts`
- `services/agents/tools/command-tool-adapters.ts`
- `services/agents/__tests__/command-tool-adapters.test.ts`
- `app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx`
- focused evidence reports under `what-next/referrals/` and `what-next/skills-life-cycle/`

## Verification Plan

- Focused Daily Habit and command-tool-adapter Jest.
- Operating-access, signal-rule, action-queue, and Inventory Loss snapshot regressions.
- Manager Action Center regression to prove Slices 413 and 414 remain unchanged.
- Full TypeScript typecheck and scoped ESLint.
- Tenant-authority, RBAC, entitlement, caller-propagation, no-location-read, direct-source, sensitive-field, contract-diff, consumer-count, and patch-hygiene scans.

## Non-Goals

No managed-location Daily Habit aggregation, primary KPI redesign, route or component redesign, output-contract field, persistence, notification, exception, incident, resolution, schema, migration, inventory write, AI/copilot authority, WhatsApp authority, external sharing, or production activation is selected.
