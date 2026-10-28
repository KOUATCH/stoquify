# Stoquify Offline POS Full-Functionality Report

**Date:** 2026-07-16  
**Scope:** POS Offline workflow, full functionality target, gap analysis, production roadmap  
**Repository:** `E:\ohada saas\Focused projects\stoquify`

## Executive Summary

Stoquify already has a serious offline POS control spine. The strongest parts are the browser queue contract, offline sync service, protected sync actions, replay through the normal POS finalization path, fiscal replay safety checks, certificates, conflicts, idempotency, and Workflow Assurance evidence.

The product is not yet a complete cashier-usable offline selling experience. The main remaining gap is the active charge flow: the POS cashier workflow still needs to detect offline or server-unavailable conditions, capture a provisional offline sale envelope, show a provisional receipt, expose queue state, and allow sync without leaving the register.

The full target is not "sell in the browser and sync later" in a loose sense. It is a finance-safe workflow where the browser captures tamper-evident provisional evidence, and the server later replays it through service-owned POS sale finalization. Final stock, cash, payment, ledger, receipt, fiscal, audit, and close-assurance truth must stay server-owned.

## Current State

Existing evidence shows a mature foundation:

- `lib/pos/offline-local-queue.ts` provides local queue behavior, hashing, device sequence handling, hash-chain continuity, provisional fiscal guards, status transitions, and pruning.
- `services/pos/offline-sync.service.ts` owns sync ingestion, duplicate/idempotency handling, sequence/hash conflict handling, accepted-event evidence, replay, certificates, and dashboard data.
- `actions/pos/sync.actions.ts` exposes protected server actions for offline sync workflows.
- `hooks/posHooks/useOfflineSync.ts` exposes dashboard, enrollment, sync, enqueue, and flush hooks.
- `components/pos/offline/OfflineSyncStatusStrip.tsx` gives the cashier some sync/readiness visibility.
- Replay uses the normal `commitPOSSale` pathway, preserving service-owned sale, stock, tender, receipt, fiscal, ledger, and audit effects.
- `what-next/offline-pos-fiscal-replay-readiness.md` reports ready checks for provisional receipt policy, inactive-device replay revalidation, sequence/hash/idempotency quarantine, accepted-event pending replay proof, and receipt/fiscal/replay evidence.

Important prior verification:

- The June 2026 offline POS roadmap reports focused tests passing for local queue, sync service, and sync actions.
- The July 2026 offline fiscal replay finalizer reports `npm run offline:pos:replay:gate` as ready with 10/10 checks and 0 blockers.
- The replay finalizer closed a critical authorization gap: a device accepted while active but later suspended, revoked, or rotated can no longer replay into economic or fiscal effects.

## What Complete Offline POS Means

Complete offline POS for Stoquify means the branch can keep selling during network, server, payment-provider, or fiscal-authority disruption without corrupting business truth.

The complete workflow includes:

- Offline-ready checks before a cashier relies on offline selling.
- Cashier sale capture from the active POS screen when network/server finalization is unavailable.
- Provisional sale envelope creation with cart, lines, tenders, customer, terminal, session, location, cashier, pricing/tax snapshot, source snapshot, timestamps, device sequence, hash, and idempotency key.
- Provisional receipt output with explicit non-final wording.
- Durable browser queue with deterministic ordering, crash recovery, corruption quarantine, multi-tab locking, and queue health state.
- Device enrollment, device status revalidation, key material, signing, signature verification, rotation, and revocation.
- Protected server sync ingestion with tenant, RBAC, module, terminal, location, session, and device scope checks.
- Conflict and quarantine records for duplicate sequence, hash fork, invalid signature, stale scope, revoked device, payload mismatch, replay failure, and business-rule rejection.
- Server-owned replay through normal POS finalization only.
- Payment, drawer, inventory, ledger, receipt, fiscal, audit, notification, and business-event effects created only after accepted replay.
- Offline operations workbench for managers, accountants, and support.
- Reconciliation of offline tender claims against drawer and provider settlement evidence.
- Close blockers until replay, conflicts, payment evidence, and fiscal certification are resolved.
- Country-pack policy for provisional vs final fiscal numbering.
- Observability for pending age, replay success/failure, queue health, device conflicts, revoked-device attempts, fiscal delivery state, and close readiness.

## Gap Analysis

### Cashier Workflow

The biggest missing piece is active cashier fallback. The charge flow must distinguish between:

- server/network unavailable, where offline provisional capture is allowed; and
- business-rule denial, where offline fallback must not bypass server controls.

Examples of business-rule denials that must not become offline captures include insufficient stock, invalid tender, missing session, forbidden cashier, credit-limit failure, revoked terminal, and closed drawer.

### Local Storage Durability

The current browser queue foundation is useful, but localStorage is not a production-grade offline store for high-volume retail:

- limited storage size;
- weak transactional guarantees;
- easy user/browser clearing;
- poor large-envelope handling;
- weak crash and multi-tab behavior.

An IndexedDB-backed adapter should preserve the queue API while adding leases, health checks, corruption quarantine, compaction, export, and recovery.

### Device Trust

Device state is now revalidated before replay, which is good. The remaining high-priority gap is cryptographic trust:

- public-key enrollment;
- private-key handling on the terminal;
- event signing;
- server-side signature verification;
- key rotation;
- revoked-key rejection;
- operator-visible evidence when signature validation fails.

### Operations Workbench

Offline status exists, but full operations require a manager/accountant surface, likely `/dashboard/pos/offline-sync`, showing:

- pending events by branch, device, terminal, cashier, session, and age;
- conflicts and quarantine records;
- replay history;
- receipt and fiscal evidence;
- posting and business-event links;
- close blockers;
- manager actions and immutable resolution reasons.

### Payment And Close Assurance

Offline tenders are provisional claims until replay and reconciliation. Full functionality requires:

- offline cash claims tied to drawer/session evidence;
- card and mobile-money claims tied to provider settlement evidence;
- reconciliation blockers for unmatched offline tenders;
- close blockers until replay, payment evidence, and fiscal certification are resolved.

### Fiscal And Country-Pack Policy

The current rule should remain: no final fiscal number offline unless an expert-reviewed country pack explicitly permits it. Full functionality needs:

- provisional numbering policy;
- fiscal authority replay queue;
- legal delivery blocker when certification is pending or failed;
- country-pack tests for allowed and disallowed offline final numbering.

## Architecture Boundaries

### Browser-Owned

The browser may:

- detect degraded/offline conditions;
- capture provisional envelopes;
- maintain a local durable queue;
- show provisional receipts;
- show pending queue count, sync state, conflicts, and blockers;
- sign envelopes when device trust is implemented.

The browser must not:

- decrement final stock;
- create final payment records;
- post ledger entries;
- issue final fiscal/legal receipts by default;
- bypass terminal, session, drawer, tenant, or RBAC checks;
- silently resolve conflicts.

### Server-Owned

The server must own:

- accepted sync ingestion;
- tenant, RBAC, entitlement, device, terminal, location, and session validation;
- idempotency and replay dedupe;
- conflict/quarantine classification;
- POS finalization;
- stock, payment, drawer, receipt, fiscal, ledger, audit, notification, and business-event effects;
- certificates and close blockers.

## Implementation Roadmap

### Phase 1: Cashier Offline Fallback And Provisional Receipt

User value: cashiers can continue selling during outage without leaving POS.

Likely files:

- `components/pos/ProfessionalPOSSystem.tsx`
- `components/pos/offline/OfflineSyncStatusStrip.tsx`
- `hooks/posHooks/useOfflineSync.ts`
- `lib/pos/offline-local-queue.ts`
- POS UI tests around the charge flow

Changes:

- Detect offline/server unavailable state.
- Build canonical offline sale envelope from active POS state.
- Enqueue `OFFLINE_SALE_CAPTURED`.
- Show provisional receipt, queue count, and sync action.
- Ensure business-rule failures do not fall back to offline capture.

Success criteria:

- Cashier can queue a provisional sale when the server is unreachable.
- Cashier sees explicit provisional receipt wording.
- Final stock, payment, drawer, ledger, fiscal, and receipt effects do not occur in the browser.

### Phase 2: Durable IndexedDB Queue

User value: queued sales survive refresh, crash, and normal browser restarts.

Changes:

- Add storage abstraction behind the current queue contract.
- Implement IndexedDB adapter.
- Add queue lease/lock for multi-tab safety.
- Add corrupted-entry quarantine, queue health, compaction, and export.

Tests:

- reload recovery;
- browser restart simulation;
- large envelope storage;
- corrupted JSON quarantine;
- multi-tab lock behavior;
- migration from localStorage.

### Phase 3: Device Trust And Signatures

User value: revoked, cloned, or tampered devices cannot inject offline sales.

Changes:

- Implement device key enrollment.
- Sign offline envelopes client-side.
- Verify signatures server-side.
- Rotate and revoke keys.
- Block invalid signature replay with visible conflict evidence.

Tests:

- valid enrolled device syncs;
- revoked device cannot sync or replay;
- invalid signature is quarantined;
- sequence fork and hash-chain fork remain visible.

### Phase 4: Offline Operations Workbench

User value: managers, accountants, and support can see and resolve offline risk.

Changes:

- Add `/dashboard/pos/offline-sync` or equivalent.
- Show pending, accepted, replayed, blocked, conflicted, and quarantined states.
- Link sale, receipt, fiscal, posting, business event, audit, and certificate evidence.
- Require explicit role, reason, and immutable evidence for conflict resolution.

Tests:

- RBAC denial before data access;
- tenant/location filtering;
- conflict and replay evidence rendering;
- close blocker visibility.

### Phase 5: Payment Reconciliation And Close Assurance

User value: offline sales do not create hidden cash or provider-settlement drift.

Changes:

- Promote offline tenders into reconciliation evidence.
- Tie offline cash to drawer/session proof.
- Tie card/mobile-money claims to settlement evidence.
- Block close until replay and reconciliation are complete.

Tests:

- unmatched offline tender blocks close;
- reconciled tender clears blocker;
- failed replay preserves blocker and evidence;
- drawer and close reports show provisional vs final state.

### Phase 6: Fiscal And Country-Pack Hardening

User value: receipts remain legally honest across jurisdictions.

Changes:

- Keep provisional-only client policy by default.
- Add country-pack policy for offline final numbering only where reviewed.
- Add fiscal replay queue and legal delivery blockers.
- Add country-pack simulation tests.

Tests:

- default policy rejects final offline fiscal number;
- allowed country pack permits only reviewed final numbering behavior;
- fiscal authority failure preserves legal-delivery blocker.

### Phase 7: PWA Resilience, Observability, And Field Release

User value: branches can rely on offline mode in real field conditions.

Changes:

- Cache app shell and safe snapshots.
- Add offline readiness checks for catalog, price/tax policy, tender policy, device, terminal, session, and cashier permission.
- Add telemetry for queue health, pending age, replay rate, conflicts, revoked-device attempts, and fiscal delivery.
- Add support runbook and pilot checklist.

Tests:

- offline app shell load;
- readiness blocker when snapshots are missing;
- long outage queue growth;
- high-volume replay;
- clock drift;
- network flap;
- support export.

## Verification Plan

Minimum production gates:

- Local queue unit tests for hashing, ordering, status transitions, corruption, and migration.
- POS UI tests for offline fallback, provisional receipt, queue count, and no fallback on business-rule rejection.
- Sync action tests for RBAC, tenant, terminal, location, device, and schema validation.
- Service replay tests for idempotency, duplicate sequence, hash fork, revoked device, invalid signature, replay rollback, and post-error recovery.
- Receipt/fiscal tests for provisional-only policy and legal delivery state.
- Payment reconciliation tests for offline cash/card/mobile-money claims.
- Close-assurance tests proving pending replay, conflict, unreconciled tender, and fiscal blocker states block close.
- Browser smoke tests for `/en/dashboard/pos` with network offline simulation.
- Field tests for reload, browser restart, multi-tab, long outage, and high-volume replay.
- Observability checks for trace IDs, conflict counts, pending age, replay success/failure, and support diagnostics.

## Smallest Safe Next Slice

The next implementation slice should be Phase 1 only:

1. Wire active cashier charge-flow fallback.
2. Enqueue a canonical provisional sale envelope only when network/server finalization is unavailable.
3. Show provisional receipt, pending queue count, and sync CTA.
4. Prove no fallback happens for normal business-rule rejection.
5. Save a focused verification report under `what-next/`.

This slice gives immediate user value without weakening the existing replay, fiscal, accounting, and audit boundaries.

## Non-Goals For The Next Slice

- No final fiscal numbering offline.
- No browser-side stock, payment, drawer, ledger, receipt, or fiscal mutation.
- No new country legal rule without reviewed country-pack provenance.
- No conflict auto-resolution.
- No broad POS redesign.
- No replacement of the server replay path.

## Non-Negotiables

- Server remains the legal, fiscal, inventory, cash, payment, ledger, and accounting source of truth.
- Offline browser output is provisional unless country policy explicitly and safely says otherwise.
- Every accepted, replayed, blocked, rejected, or conflicted envelope must remain visible and auditable.
- Replay must be idempotent and crash-recoverable.
- Revoked or inactive devices must not create economic or fiscal effects.
- Close readiness must block until offline replay, conflicts, payment evidence, and fiscal certification are resolved.

## Source Evidence

- `docs/posoffline/AQSTOQFLOW_OFFLINE_POS_EVALUATION_AND_REVAMP_ROADMAP_2026-06-28.md`
- `docs/posoffline/AQSTOQFLOW_OFFLINE_POS_REVAMP_EXECUTION_PROMPT_2026-06-28.md`
- `what-next/AQSTOQFLOW_OFFLINE_POS_SYNC_OVERHAUL_BLUEPRINT_2026-06-28.md`
- `what-next/skills-life-cycle/STOQUIFY_OFFLINE_POS_FISCAL_REPLAY_FINALIZER_IMPLEMENTATION_2026-07-11.md`
- `what-next/offline-pos-fiscal-replay-readiness.md`
