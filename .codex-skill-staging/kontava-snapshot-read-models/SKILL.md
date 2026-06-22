---
name: kontava-snapshot-read-models
description: Build Kontava snapshot and read-model foundations for cross-module moat features. Use for TenantDailyOperatingSnapshot, BranchDailyOperatingSnapshot, PaymentTruthSnapshot, InventoryCashSnapshot, CloseReadinessSnapshot, SnapshotBuildRun, snapshot services, rebuild jobs, stale/freshness contracts, dashboard read actions, and tests for tenant isolation, idempotency, stale fallback, performance, and evidence-grade propagation.
---

# Kontava Snapshot Read Models

## Purpose

Use this skill to make Owner War Room, Cash Leakage Radar, Stock-to-Cash Twin, Close Autopilot, and accountant views fast and stable without expensive live cross-module joins.

## Upgraded Mission

Build the read-model foundation that lets Kontava answer owner and accountant questions quickly without stressing transactional modules or mixing tenant data. Snapshots must be trusted, freshness-aware, evidence-graded, redaction-aware, and safe to rebuild.

This skill turns operational data into stable decision contracts: cash truth, stock cash exposure, branch performance, close readiness, payment truth, and action readiness.

## Stakeholder Value

- Owners get fast command-center answers without waiting for deep joins.
- Accountants get stable period facts and close/readiness context.
- Managers get branch and stock pressure without seeing sensitive payroll or payment data.
- Engineering gets explicit contracts between transactional modules and dashboards.
- Sales gets a stronger story: Kontava knows the business because it has a governed operating snapshot.

## Snapshot Quality Rules

Each snapshot should say whether it is fresh, stale, partial, blocked, or rebuilt. It must never pretend stale data is live truth. When evidence is weak, return lower evidence grade and blockers rather than optimistic metrics.

Snapshot rebuilds must be:

- Tenant-scoped.
- Idempotent.
- Audited when sensitive.
- Non-destructive.
- Tolerant of partial upstream data.
- Safe to retry.

## Inspect First

Inspect:

- `moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md`
- `services/dashboard/dashboard-read-model.service.ts`
- `services/payments`
- `services/accounting`
- `services/inventory`
- `services/purchase*`
- `services/payroll`
- `services/compliance`
- `services/events`
- `prisma/schema.prisma`
- Existing dashboard, close, payment, inventory, and reconciliation tests

## Product And UX Requirements

Dashboard consumers must receive enough metadata to render:

- Loading.
- Empty.
- Fresh.
- Stale.
- Partial.
- Blocked.
- Redacted.
- Permission denied.
- Module unavailable.
- Safe error.

Do not force UI components to infer these states from missing values. The service contract should carry the state explicitly.

## Snapshot Contracts

Design stable contracts before UI:

- Tenant daily operating snapshot.
- Branch daily operating snapshot.
- Payment truth snapshot.
- Inventory cash snapshot.
- Close readiness snapshot.
- Snapshot build run.

Every snapshot result must include:

- `organizationId`
- optional `locationId`
- period/date range
- status
- freshness
- evidence grade
- source hash
- generated time
- metrics
- blockers
- redactions
- source modules

## Build

Prefer these layers:

- `services/snapshots/snapshot-contracts.ts`
- `services/snapshots/tenant-operating-snapshot.service.ts`
- `services/snapshots/branch-operating-snapshot.service.ts`
- `services/snapshots/payment-truth-snapshot.service.ts`
- `services/snapshots/inventory-cash-snapshot.service.ts`
- `services/snapshots/close-readiness-snapshot.service.ts`
- `services/snapshots/snapshot-rebuild.service.ts`
- Guarded read server actions.
- Freshness/stale UI chips only after the service contract exists.

Add Prisma models only after confirming no existing read model is sufficient. Use nullable fields and safe indexes.

## Must Not Do

- Do not compute owner dashboards through unbounded live joins.
- Do not hide stale or partial data.
- Do not mix tenant data during aggregation.
- Do not make snapshot rebuilds destructive.
- Do not block existing dashboards if snapshot generation fails.
- Do not build owner dashboards directly from unbounded live joins.
- Do not hide source modules, freshness, blockers, or redactions from downstream consumers.

## Tests

Add or extend:

- Snapshot contract tests.
- Tenant isolation tests.
- Stale/fresh/partial/blocked state tests.
- Rebuild idempotency tests.
- Source hash stability tests.
- Performance-budget tests where practical.
- Permission and redaction tests for sensitive snapshot fields.
- Rebuild failure tests that prove existing dashboards do not break.

## Validation

Run:

- `npm run typecheck`
- `npm run lint`
- Focused Jest tests for snapshot services and any modified dashboard read model.
- `npx prisma validate` if schema changes.

## Completion Criteria

Finish when snapshot services return guarded, evidence-graded, freshness-aware contracts that future dashboards can consume without knowing module internals.
