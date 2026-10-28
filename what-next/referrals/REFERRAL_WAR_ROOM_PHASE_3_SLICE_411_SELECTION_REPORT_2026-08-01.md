# Referral War Room Phase 3 / Slice 411 Selection Report

Date: 2026-08-01
Slice: 411
Name: Inventory Loss Snapshot Foundation
Operating skills: `stoquify-referral-war-room-orchestrator`, `stoquify-inventory-loss-control`, `stoquify-daily-truth-command-center`, `aqstoqflow-release-verification-foundation`, `stoquify-release-evidence-ratchet`

## Selection Decision

Slice 411 is selected to create the missing normalized snapshot boundary between the certified Inventory Loss read model and Stoquify's existing Daily Truth and business-signal infrastructure.

The roadmap requires inventory-loss summaries to feed daily truth and leakage workflows. Live code currently stops at `readInventoryLossSummary`; no inventory-loss snapshot, signal, action item, or Daily Truth bridge exists. Existing consumers already depend on typed `SnapshotResult` contracts, so a service-owned adapter is the smallest dependency-complete next step.

## Scope

- Add `inventory.loss` to the snapshot kind vocabulary.
- Add compact Inventory Loss metrics for line and adjustment counts, recorded value and currency, category counts, evidence/valuation/approval coverage, missing-proof counts, and truncation.
- Normalize tenant or one-location snapshot scope and convert its inclusive period end to the read model's half-open boundary.
- Delegate unchanged source truth to `readInventoryLossSummary`.
- Preserve complete, partial, blocked, and empty states without treating recorded loss as proven fraud or fault.
- Emit evidence blockers only for source truncation or missing evidence, valuation, and approval attribution.
- Redact source evidence hashes from the snapshot payload.
- Add focused tests for forwarding, period boundaries, complete/partial/blocked/empty states, stable source hashes, redaction, and non-causation.

Expected files:

- `services/snapshots/snapshot-contracts.ts`
- `services/snapshots/inventory-loss-snapshot.service.ts`
- `services/snapshots/__tests__/inventory-loss-snapshot.service.test.ts`
- dated Slice 411 implementation and release-evidence reports
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Authority Contract

The adapter accepts only server-side snapshot scope. It performs no RBAC resolution itself and must be called only after an owning query or action resolves tenant and location authority. It cannot accept actor, role, permission, approver, item, or plural-location authority from a browser.

The Inventory Loss service remains the source of adjustment classification, value, coverage, groups, and non-causation meaning. The adapter may normalize those facts but cannot infer fraud, theft, fault, recovered value, prevented loss, or resolution state.

## Non-Goals

No business signal, Leakage Radar exception, Workflow Assurance incident, action-center item, notification, alert, route, action, UI, schema, migration, stock write, approval command, export, external sharing, AI/copilot behavior, WhatsApp behavior, or production activation.

## Expected Verification

- Focused snapshot Jest.
- Existing Inventory Loss read-model Jest.
- Snapshot contract and rebuild regression Jest.
- `npm run typecheck`.
- Scoped ESLint and Prettier.
- Direct database import, browser authority, accusation-language, redaction, and whitespace/patch scans.

## Success Criteria

The service returns a deterministic `SnapshotResult<InventoryLossMetrics>` whose scope, period, metrics, blockers, evidence grade, redaction, and source hash are derived only from the certified Inventory Loss read model. No consumer or product surface is added.

## Next Skill

Run `stoquify-inventory-loss-control`, consulting `stoquify-daily-truth-command-center` only for snapshot compatibility.
