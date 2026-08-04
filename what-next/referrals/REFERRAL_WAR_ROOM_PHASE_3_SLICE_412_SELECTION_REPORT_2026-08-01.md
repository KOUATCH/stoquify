# Referral War Room Phase 3 / Slice 412 Selection Report

Date: 2026-08-01
Slice: 412
Name: Inventory Loss Deterministic Review Signal Contract
Operating skills: `stoquify-referral-war-room-orchestrator`, `stoquify-inventory-loss-control`, `stoquify-daily-truth-command-center`, `stoquify-cash-leakage-radar`, `aqstoqflow-release-verification-foundation`

## Selection Decision

Slice 412 is selected to convert the certified `inventory.loss` snapshot into a neutral, deterministic, evidence-backed business signal that the existing permission-filtered action queue can consume.

The live architecture already routes Payment Truth, Inventory Cash, Close Readiness, Tenant Operating, and Branch Operating snapshots through `buildBusinessSignalsFromSnapshots`. Daily Habit, Manager Action Center, Cash Command, and the protected owner action queue depend on that shared rule layer. Adding the Inventory Loss rule there is the smallest dependency-complete bridge toward the roadmap requirement to feed loss summaries into Daily Truth and Leakage Radar.

This slice defines the signal contract only. It does not make any product consumer load the Inventory Loss snapshot.

## Scope

- Add the neutral `inventory_loss_review` business signal type.
- Add its inventory module, `inventory.levels.read` permission, manager ownership, Inventory Loss route, suggested action, business impact, and expiry defaults.
- Admit `SnapshotResult<InventoryLossMetrics>` to the deterministic snapshot-rule input union.
- Emit no signal for a complete zero-record snapshot.
- Emit one review signal when recorded loss lines exist or source truncation prevents a complete total.
- Use medium severity for complete, bounded recorded-loss evidence.
- Use high severity for source truncation, missing evidence/valuation/approval attribution, a source-recorded theft category, or at least ten recorded loss lines.
- Carry only aggregate value, currency, category, coverage, missing-proof, and truncation facts.
- Preserve snapshot evidence grade, blockers, redactions, freshness, kind, and source hash.
- Use the snapshot's server-resolved tenant/location scope to build a stable dedupe subject.
- Add the new type to exhaustive action-module compatibility mapping.
- Add focused tests for complete, incomplete/high-risk, empty, permission filtering, provenance, deterministic identity, and non-causation.

## Authority And Trust Contract

The signal rule accepts only a service-owned `SnapshotResult<InventoryLossMetrics>`. It does not query the database, resolve RBAC, accept browser scope, or create durable state.

The owning consumer remains responsible for tenant, location, module entitlement, and RBAC before obtaining the snapshot. Signal visibility is additionally filtered by the existing `inventory.levels.read` action-queue permission.

The signal reports recorded inventory adjustments. It must not claim fraud, fault, responsible actor, recovered value, prevented loss, or resolution. A source-recorded theft category may raise review priority but does not identify a responsible person.

Fixed currency amount thresholds are intentionally excluded because the snapshot can use different organization currencies.

## Expected Files

- `services/signals/business-signal-contracts.ts`
- `services/signals/business-signal-rules.service.ts`
- `services/signals/__tests__/business-signal-rules.service.test.ts`
- `services/signals/__tests__/action-queue.service.test.ts`
- `services/cash-command/cash-command.service.ts`
- dated Slice 412 implementation and release-evidence reports
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Non-Goals

No Daily Habit loader, Manager Action Center loader, Cash Command loader, owner action boundary, notification preference, alert delivery, persistence, Leakage Radar exception, Workflow Assurance incident, resolution command, route, component, schema, migration, stock write, AI/copilot behavior, WhatsApp behavior, external sharing, or production activation.

## Expected Verification

- Focused business-signal rule Jest.
- Focused action-queue Jest.
- Cash Command regression Jest.
- Existing Inventory Loss snapshot Jest.
- `npm run typecheck`.
- Scoped ESLint and Prettier.
- Direct database, browser authority, unsupported accusation, sensitive-field, provenance, and patch-hygiene scans.

## Success Criteria

A certified Inventory Loss snapshot deterministically produces a permission-gated, provenance-linked, non-causal review signal and generic action item without changing any product consumer or source-of-truth boundary.

## Next Skill

Run `stoquify-inventory-loss-control`, consulting `stoquify-cash-leakage-radar` for neutral deterministic exception language and `stoquify-daily-truth-command-center` for action-queue compatibility.
