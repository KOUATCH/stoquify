# Inventory Loss Control Slice 411 Report

Date: 2026-08-01
Slice: 411
Status: certified
Name: Inventory Loss Snapshot Foundation

## Decision

Slice 411 establishes the normalized, service-owned Inventory Loss snapshot required before any Daily Truth, Leakage Radar, action-center, or UI consumer is allowed. It does not activate a downstream consumer.

## Before And After

Before this slice, Stoquify had a certified Inventory Loss read model, protected managed-location query, operating surface, and authenticated browser evidence, but no typed snapshot boundary for the existing snapshot and signal pipeline.

After this slice, `inventory.loss` is a registered snapshot kind with compact metrics and a deterministic adapter over `readInventoryLossSummary`. The adapter preserves tenant or one-location scope, read-model completeness, evidence coverage, truncation, and non-causal approval meaning.

## Implementation

- Added `InventoryLossMetrics` and the `inventory.loss` kind to the shared snapshot contract.
- Added `getInventoryLossSnapshot` as a server-only adapter.
- Converted the snapshot period's inclusive UTC end to the read model's half-open end.
- Requested `detailLimit: 0` so record hashes and actor details never enter the snapshot.
- Mapped recorded line, adjustment, value, currency, category, coverage, missing-proof, and truncation facts.
- Mapped complete records to operational evidence, incomplete records to partial/raw evidence, truncation to blocked evidence, and zero records to empty/raw evidence.
- Added blockers only for source truncation, missing evidence, missing valuation, and missing approval attribution.
- Kept approval attribution explicitly non-causal and declared source-hash redaction.
- Kept source hashes stable across generation-time changes while allowing material source facts to change the hash.

## Authority And Trust

The adapter accepts only `SnapshotScopeInput`. It does not resolve RBAC and therefore must be invoked only after an owning server boundary resolves tenant and optional location authority. It accepts no browser actor, role, permission, approver, item, or plural-location authority.

The Inventory Loss read model remains source of truth for classification, valuation, coverage, grouping, and completeness. No fraud, fault, recovered-value, prevented-loss, or resolution inference was added.

## Verification

| Gate                                         | Result | Evidence                                                                             |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Focused snapshot Jest                        | PASS   | 1 suite, 7 tests                                                                     |
| Inventory Loss plus all snapshot regressions | PASS   | 7 suites, 34 tests                                                                   |
| `npm run typecheck`                          | PASS   | repository TypeScript gate                                                           |
| Focused ESLint                               | PASS   | contract, adapter, and test                                                          |
| Boundary/redaction scan                      | PASS   | no direct DB, browser authority, accusation, sensitive-field, or reject-file finding |
| Diff/whitespace hygiene                      | PASS   | no focused whitespace error                                                          |

The first combined static runner reached its orchestration timeout; the gates were rerun separately and both ESLint and TypeScript passed.

## Evidence Anchors

- Contract: `services/snapshots/snapshot-contracts.ts` lines 11, 142, and 274.
- Adapter: `services/snapshots/inventory-loss-snapshot.service.ts` lines 25, 30, 36, 45, 58, 61, 81, and 132.
- Tests: `services/snapshots/__tests__/inventory-loss-snapshot.service.test.ts` lines 109, 173, 197, 269, 311, 357, and 413.

## Non-Goals And Residual Risk

No signal, exception, incident, action item, route, action, UI, schema, migration, stock write, alert, export, external sharing, AI/copilot behavior, WhatsApp behavior, or production activation was added.

No Prisma, build, or browser gate was selected because this slice changes no schema, route, action, or rendered UI. The pre-existing local Prisma `P3009` noted by Slice 410 remains outside this slice and was not bypassed.

## Next Skill

Run `stoquify-referral-war-room-orchestrator` for a post-Slice 411 audit. No Slice 412 is selected by this report.
