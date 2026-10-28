# Stoquify Offline POS Full-Functionality Prompt Run Report

**Date:** 2026-07-16  
**Repository:** `E:\ohada saas\Focused projects\stoquify`  
**Prompt artifact:** `docs/offline pos/STOQUIFY_OFFLINE_POS_FULL_FUNCTIONALITY_PROMPT_2026-07-16.md`  
**Run type:** repository-grounded architecture and delivery assessment

## Executive Answer

Stoquify is not starting from zero. The repository already contains a serious offline POS control spine: provisional local queue contracts, server-side offline sync ingestion, idempotent replay, device status enforcement, conflict/quarantine records, protected sync actions, receipt/fiscal evidence capture, readiness gates, and tests around the replay boundary.

The product is not yet a complete production-grade offline POS experience because the active cashier charge flow is still not fully wired to offline fallback. The cashier screen still primarily attempts normal `commitSale` finalization from the POS screen, while the mature offline controls live beside it. The safest path is to connect the cashier-facing failure path to the existing provisional queue and replay spine without moving stock, payment, drawer, ledger, receipt, or fiscal finalization into the browser.

The smallest safe next slice is Phase 1: when the server or network is unavailable, capture a canonical provisional sale envelope from the active POS state, enqueue `OFFLINE_SALE_CAPTURED`, show a provisional receipt and pending sync state, and prove that business-rule denials never fall back to offline sale capture.

## Evidence Used

This assessment was grounded in the current repository, especially:

- `components/pos/ProfessionalPOSSystem.tsx`
- `components/pos/offline/OfflineSyncStatusStrip.tsx`
- `hooks/posHooks/useOfflineSync.ts`
- `lib/pos/offline-local-queue.ts`
- `services/pos/offline-sync.service.ts`
- `services/pos/offline-sync.schemas.ts`
- `actions/pos/sync.actions.ts`
- `services/pos/pos.service.ts`
- `services/pos/receipt.service.ts`
- `services/pos/public-receipt-token-registry.service.ts`
- `app/api/receipts/[receiptId]/route.ts`
- `prisma/schema.prisma`
- `lib/pos/__tests__/offline-local-queue.test.ts`
- `services/pos/__tests__/offline-sync.service.test.ts`
- `actions/pos/__tests__/sync.actions.test.ts`
- `services/pos/__tests__/receipt-public.test.ts`
- `services/pos/__tests__/pos.service.test.ts`
- `scripts/__tests__/offline-pos-fiscal-replay-gate.test.js`
- `docs/posoffline/AQSTOQFLOW_OFFLINE_POS_EVALUATION_AND_REVAMP_ROADMAP_2026-06-28.md`
- `docs/posoffline/AQSTOQFLOW_OFFLINE_POS_REVAMP_EXECUTION_PROMPT_2026-06-28.md`
- `what-next/AQSTOQFLOW_OFFLINE_POS_SYNC_OVERHAUL_BLUEPRINT_2026-06-28.md`
- `what-next/skills-life-cycle/STOQUIFY_OFFLINE_POS_FISCAL_REPLAY_FINALIZER_IMPLEMENTATION_2026-07-11.md`
- `what-next/offline-pos-fiscal-replay-readiness.md`
- `graphify-out/GRAPH_REPORT.md`

The graph report positions POS inside the "Enterprise POS Delivery Flow", "Operational Transaction Backbone", "Ledger-First Operational Posting", and "Tenant Boundary Hardening Controls" areas. That supports the same architectural conclusion: offline POS must remain a replay/evidence workflow around the server-owned POS, ledger, tenant, and audit boundary, not a second browser-owned sale engine.

## 1. Current State

### Existing Offline POS Capabilities

Stoquify already has these offline POS capabilities:

- Browser-side provisional queue contract with `OFFLINE_SALE_CAPTURED`, `OFFLINE_TENDER_CLAIMED`, `OFFLINE_RECEIPT_PROVISIONED`, drawer evidence, and session evidence event types.
- Deterministic device sequence, idempotency key, provisional reference, payload hash, previous hash, entry hash, signature fields, policy snapshot hash, and source snapshot hash in the local queue event contract.
- Client-side guard against final fiscal claims unless policy explicitly permits them.
- Offline sync dashboard, device enrollment, event sync, replay, enqueue, and flush hooks.
- Server actions protected by POS permissions such as `pos.transactions.read`, `pos.session.start`, and `pos.use`.
- Sync ingestion that records accepted offline events as `PENDING_REPLAY`.
- Conflict handling for duplicate idempotency, sequence gaps, hash-chain forks, revoked devices, payload mismatch, stale scope, and replay failures.
- Replay through `replayPendingOfflineSaleEnvelope`, which calls normal `commitPOSSale` instead of creating a parallel offline finalization path.
- Device status revalidation before replay, blocking revoked or inactive devices before POS finalization.
- Receipt and fiscal evidence extraction from receipt payloads, including fiscal document status and legal delivery blocker state.
- Public receipt access guarded by receipt access tokens rather than raw receipt ID access.
- Prisma models for offline devices, sync batches, events, conflicts, and certificates.
- Tests for local queue behavior, sync actions, replay idempotency, revoked device behavior, rollback behavior, fiscal blockers, receipt visibility, and replay gate readiness.

### Current Control Spine

The current control spine is:

1. `components/pos/ProfessionalPOSSystem.tsx` is the active cashier POS surface. It renders `OfflineSyncStatusStrip`, but the primary charge path still calls `commitSale.mutateAsync`.
2. `components/pos/offline/OfflineSyncStatusStrip.tsx` exposes readiness, pending, conflict, blocker, and no-device states.
3. `hooks/posHooks/useOfflineSync.ts` provides dashboard, device registration, sync, replay, local enqueue, and local flush hooks.
4. `lib/pos/offline-local-queue.ts` creates provisional local events, hashes and chains entries, tracks status, and blocks final fiscal claims by default.
5. `actions/pos/sync.actions.ts` wraps sync workflows in `protect`.
6. `services/pos/offline-sync.service.ts` owns ingestion, scope checks, conflicts, certificates, replay, receipt/fiscal evidence, and `commitPOSSale` replay.
7. `services/pos/pos.service.ts` remains the normal POS finalization path, including sale commit, receipt, fiscal document, and delivery behavior.
8. `services/pos/receipt.service.ts`, `public-receipt-token-registry.service.ts`, and `app/api/receipts/[receiptId]/route.ts` form the receipt access and delivery boundary.
9. `prisma/schema.prisma` persists offline device, batch, event, conflict, and certificate state.
10. `what-next/offline-pos-fiscal-replay-readiness.md` and the fiscal replay finalizer report document the gate evidence.

### Strong Parts To Preserve

These parts are strong enough to preserve and build around:

- Server-owned replay through `commitPOSSale`.
- Provisional-only browser receipt posture.
- Idempotency key, device sequence, payload hash, and hash-chain controls.
- Device status revalidation before replay.
- Conflict/quarantine visibility instead of silent repair.
- `protect`-based sync action permissions.
- Tenant, organization, terminal, location, session, and device scoping in sync/replay.
- Fiscal/legal delivery blocker evidence.
- Readiness gate script `npm run offline:pos:replay:gate`.

## 2. Full-Functionality Target

Complete offline POS for Stoquify means a cashier can continue taking sales during network, server, payment-provider, or fiscal-authority disruption while the system preserves accounting, inventory, payment, fiscal, tenant, RBAC, and audit truth.

The complete target requires:

- Cashier offline sale capture from the active POS screen.
- Provisional receipt generation with explicit "not final/legal/fiscal" language by default.
- Durable local queue that survives refresh, crash, browser restart, and normal branch outage windows.
- Device identity, device trust, key rotation, signature verification, and revocation.
- Idempotent sync and replay with deterministic dedupe.
- Conflict detection and quarantine for sequence gaps, hash forks, invalid signatures, stale snapshots, revoked devices, payload mismatch, and failed business-rule replay.
- Server-owned finalization through normal POS sale commit.
- Server-side stock, payment, drawer, ledger, receipt, fiscal, audit, notification, and business-event effects.
- Manager/accountant/support workbench for pending events, conflicts, replays, evidence, blockers, and certified outcomes.
- Offline tender reconciliation against drawer and provider settlement evidence.
- Period close blockers for pending replay, unresolved conflict, unreconciled tender, fiscal/legal delivery blockers, and failed certification.
- Fiscal/country-pack policy that controls whether any jurisdiction can ever permit offline final numbering.
- Observability and support diagnostics for queue health, pending age, replay rate, replay failure, device revocation attempts, conflict classes, fiscal delivery state, and close readiness.

## 3. Gap Analysis

### Cashier Charge-Flow Fallback

The current high-value gap is the cashier path. `ProfessionalPOSSystem.tsx` renders offline status, but the charge path still depends on normal `commitSale.mutateAsync`. The UI needs a tightly scoped fallback only for network/server-unavailable failures. It must not catch and transform business-rule denials into offline sales.

Production requirement:

- Detect offline, timeout, fetch failure, or known server-unavailable responses.
- Build canonical sale envelope from cart, tenders, customer, terminal, session, location, cashier, price/tax snapshot, device, and local sequence.
- Enqueue `OFFLINE_SALE_CAPTURED`.
- Show provisional receipt and pending queue state.
- Reset tender/cart state only after durable enqueue succeeds.
- Do not fallback for authorization, stock, session, terminal, drawer, tax, pricing, or tender business-rule rejection.

### LocalStorage Versus IndexedDB Durability

The queue foundation is good, but it currently uses browser local storage mechanics. That is acceptable for a contract and tests, but not for high-volume production retail. Production needs an IndexedDB adapter with leases, recovery, compaction, corruption quarantine, export, and observable health.

### Offline Readiness Checks

The status strip exposes useful state, but full readiness requires preflight checks before a branch relies on offline selling:

- terminal enrolled and active;
- device active and trusted;
- cashier has required permission;
- open session/drawer exists;
- catalog and price/tax/tender snapshots are fresh enough;
- tenant/module entitlements allow POS and offline POS;
- fiscal/country-pack policy has an explicit offline posture;
- queue storage is healthy and has capacity.

### Device Signature Verification

The data contracts contain signature and public-key fingerprint fields, and replay now revalidates device status before finalization. The remaining hardening step is cryptographic verification: enrolled public key, local private-key signing, server-side signature verification, key rotation, revoked-key rejection, and visible conflict evidence.

### Multi-Tab And Crash Recovery

The production queue needs a lock/lease model so two POS tabs do not allocate conflicting local sequence numbers or flush the same events concurrently. It also needs crash recovery for entries stuck in `SYNCING`, durable status transitions, and deterministic retry behavior.

### Conflict Resolution Workflows

Server-side conflict records exist, but full operations require a manager/accountant workbench where conflicts are visible, scoped by tenant/location/device/session, and resolved only with explicit role, reason, evidence, and audit trail. Conflicts must not disappear silently.

### Offline Tender Reconciliation

Offline tenders must remain provisional claims until server replay and reconciliation. Cash claims need drawer/session proof; card and mobile-money claims need provider settlement proof. Close should block until the tender evidence is reconciled or explicitly quarantined.

### Fiscal Certification Blockers

The project already has fiscal replay and legal delivery blocker evidence. Production offline POS still needs country-pack hardening: no final fiscal/legal numbering offline by default, fiscal authority replay queues, certification failure states, and country-pack tests proving allowed and disallowed behavior.

### PWA/App-Shell Resilience

The browser must be able to keep the cashier screen usable during outage windows. That requires app-shell caching, safe snapshot caching, degraded asset behavior, refresh recovery, and network-flap testing.

### Field Testing And Release Gates

The current unit/service/readiness gates are strong. Production needs field evidence: real terminals, browser restart, tablet/desktop profiles, payment-device behavior, long outage, queue growth, high-volume replay, clock drift, storage pressure, revoked device attempts, and support export drills.

## 4. Architecture And Boundaries

### Browser Responsibilities

The browser may:

- detect offline or degraded server state;
- display readiness, pending, conflict, and blocker state;
- capture provisional sale envelopes;
- store provisional events in a durable queue;
- show provisional receipts;
- sign events once device trust is implemented;
- flush queued envelopes to protected server actions;
- provide support export of local queue diagnostics.

### Server Responsibilities

The server must own:

- tenant and organization scope;
- RBAC and module entitlement checks;
- terminal, location, session, drawer, and device validation;
- idempotency and duplicate replay prevention;
- hash-chain, sequence, payload hash, and signature validation;
- conflict/quarantine classification;
- normal POS sale finalization through `commitPOSSale`;
- stock movement, tender/payment records, cash drawer effects, receipt, fiscal document, ledger posting, audit, notification, business events, certificate evidence, and close blockers.

### Things That Should Never Happen Offline In The Browser

The browser must not:

- decrement final stock;
- create final payments;
- post ledger entries;
- create final receipt records;
- issue final fiscal/legal receipt numbers by default;
- bypass normal POS finalization;
- override RBAC, tenant, terminal, session, drawer, or device controls;
- auto-resolve conflicts;
- hide replay failure or fiscal/legal blocker state from close assurance.

### Duplicate-Effect Prevention

Replay must avoid duplicate sales, stock movements, payments, ledger postings, receipts, and fiscal numbers by combining:

- local idempotency keys;
- device-scoped sequence numbers;
- entry hash and previous-hash chain;
- tenant/device/sequence and entry-hash uniqueness in persistence;
- payload-hash revalidation before replay;
- accepted-event status transitions;
- replay evidence lookup before finalization;
- normal `commitPOSSale` idempotency controls;
- final receipt/fiscal lookup after committed replay;
- conflict/quarantine records instead of destructive repair.

### Tenant, RBAC, Terminal, Location, Session, And Device Scope

Scope enforcement should remain layered:

- browser displays only current tenant/location/terminal/session context;
- protected sync actions derive actor and tenant from the authenticated context;
- server rejects mismatched organization, terminal, location, session, or device state;
- replay reloads device status immediately before finalization;
- manager/accountant workbench filters by role and tenant/location scope;
- all conflict and certificate evidence includes enough scope to audit who, where, when, and which device created the offline event.

## 5. Implementation Roadmap

### Phase 1: Cashier Offline Fallback And Provisional Receipt

User value: cashiers can keep selling during server/network outage without leaving the POS screen.

Likely files touched:

- `components/pos/ProfessionalPOSSystem.tsx`
- `components/pos/offline/OfflineSyncStatusStrip.tsx`
- `hooks/posHooks/useOfflineSync.ts`
- `lib/pos/offline-local-queue.ts`
- new focused POS UI tests for offline charge fallback
- `what-next/` verification report

Service/data changes:

- No schema change should be required.
- Reuse current queue event contract and sync action contract.
- Add a canonical sale-envelope builder if the POS component currently assembles too much inline state.

Risks:

- Accidentally treating business-rule denial as offline eligibility.
- Losing tender/cart state if enqueue fails.
- Ambiguous receipt wording.
- Creating a second sale finalization path in UI code.

Tests:

- network/server-unavailable queues `OFFLINE_SALE_CAPTURED`;
- provisional receipt is shown;
- pending count updates;
- sync CTA calls existing flush path;
- stock/payment/drawer/ledger/fiscal/final receipt mocks are not called client-side;
- business-rule rejection does not enqueue.

Success criteria:

- One cashier can complete a provisional offline sale in the active POS UI.
- The sale remains provisional until server replay.
- Existing `offline-local-queue`, `offline-sync.service`, and `sync.actions` tests still pass.
- A short verification report is saved under `what-next/`.

Remaining blockers:

- Queue durability is still localStorage-level until Phase 2.
- Device signatures remain contract-level until Phase 3.

### Phase 2: Durable IndexedDB Queue

User value: queued sales survive refresh, crash, restart, large outage windows, and normal branch volume.

Likely files touched:

- `lib/pos/offline-local-queue.ts`
- new `lib/pos/offline-queue-store.*` adapter files
- `hooks/posHooks/useOfflineSync.ts`
- queue tests and browser recovery tests

Service/data changes:

- Add a storage abstraction behind the current queue API.
- Implement IndexedDB with transactions, lock/lease, versioned schema, compaction, and support export.
- Keep localStorage migration read-only and explicit.

Risks:

- Multi-tab sequence races.
- Storage quota exhaustion.
- Corrupt entries blocking all sync.
- Hard-to-debug browser-specific IndexedDB behavior.

Tests:

- refresh recovery;
- browser restart simulation;
- crash while `SYNCING`;
- multi-tab lock;
- large envelope;
- storage quota/corruption quarantine;
- localStorage migration.

Success criteria:

- Durable queue health is visible.
- No duplicate local sequence allocation under two tabs.
- Corrupt entries are quarantined without blocking healthy entries.

Remaining blockers:

- Real terminal/browser matrix testing.

### Phase 3: Device Trust And Signatures

User value: cloned, revoked, or tampered devices cannot inject offline sales.

Likely files touched:

- `services/pos/offline-sync.service.ts`
- `services/pos/offline-sync.schemas.ts`
- `lib/pos/offline-local-queue.ts`
- device enrollment UI/action surfaces
- Prisma migration if key metadata is insufficient
- service tests for valid/invalid/revoked signatures

Service/data changes:

- Enroll public keys or trusted key fingerprints.
- Sign offline envelopes client-side.
- Verify signatures server-side before accepting or replaying events.
- Add key rotation/revocation evidence.

Risks:

- Private key storage is sensitive.
- Key rotation can strand legitimate terminals if not staged carefully.
- Clock drift can complicate signature freshness if timestamps are included.

Tests:

- valid enrolled device syncs;
- invalid signature quarantines;
- revoked key blocks sync/replay;
- rotated key behavior;
- tampered payload fails payload-hash/signature verification.

Success criteria:

- Server-side signature verification is mandatory for trusted offline replay.
- Invalid signature evidence is visible to managers/accountants.

Remaining blockers:

- Device provisioning and support runbook.

### Phase 4: Offline Operations Workbench

User value: managers, accountants, and support can see and manage offline risk.

Likely files touched:

- new `/dashboard/pos/offline-sync` route or equivalent dashboard surface
- `services/pos/offline-sync.service.ts`
- `actions/pos/sync.actions.ts`
- new workbench components and tests
- RBAC/permission registry if a dedicated permission is needed

Service/data changes:

- Add read models for pending, accepted, replayed, blocked, conflicted, quarantined, and certified states.
- Add explicit resolution actions with immutable reason/evidence.
- Link sale, receipt, fiscal, posting, business event, audit, and certificate evidence.

Risks:

- Workbench can become a hidden privileged data leak.
- Over-broad "resolve" actions can weaken audit trust.
- Operators may expect conflicts to be auto-fixed.

Tests:

- RBAC denial before data access;
- tenant/location/device/session filters;
- conflict list/detail rendering;
- replay evidence link rendering;
- resolution requires role, reason, and evidence;
- close blockers stay visible until resolved.

Success criteria:

- No offline event state is operationally invisible.
- Every manager/accountant action is auditable.

Remaining blockers:

- Final conflict taxonomy and operator workflow policy.

### Phase 5: Payment Reconciliation And Close Assurance

User value: offline selling does not create hidden cash, card, or mobile-money drift.

Likely files touched:

- payment reconciliation services/surfaces
- cash drawer/session services
- close-assurance services and tests
- `services/pos/offline-sync.service.ts`
- reporting/workflow assurance evidence

Service/data changes:

- Promote offline tender claims into reconciliation evidence after replay.
- Tie cash claims to drawer/session close.
- Tie card/mobile-money claims to provider settlement.
- Add close blockers for pending replay, conflict, unreconciled tender, and failed replay.

Risks:

- Treating provisional tender claim as settled payment.
- Close process bypassing offline blockers.
- Provider settlement timing mismatch.

Tests:

- unmatched offline cash blocks close;
- unmatched provider tender blocks close;
- reconciled tender clears blocker;
- failed replay preserves blocker;
- close pack shows provisional vs final state.

Success criteria:

- Offline tender effects cannot disappear from reconciliation.
- Accounting close cannot certify while offline payment risk remains open.

Remaining blockers:

- Provider-specific settlement evidence adapters.

### Phase 6: Fiscal And Country-Pack Hardening

User value: fiscal/legal receipt posture remains jurisdictionally honest.

Likely files touched:

- fiscal document services;
- country-pack policy services;
- receipt service;
- offline sync replay result mapping;
- fiscal/country-pack tests;
- readiness gate script.

Service/data changes:

- Keep provisional-only offline client policy by default.
- Add reviewed country-pack policy for any exceptional final offline numbering.
- Add fiscal authority replay queue and legal delivery blocker evidence.
- Carry certification status into receipt and close-assurance surfaces.

Risks:

- Accidentally issuing legal numbers offline without statutory approval.
- Country-pack drift between cashier snapshot and server policy.
- Legal delivery before certification.

Tests:

- default policy rejects final offline fiscal claim;
- reviewed allowed policy permits only the explicitly allowed behavior;
- fiscal authority failure blocks legal delivery;
- country-pack stale snapshot quarantines or blocks replay;
- fiscal blocker appears in close assurance.

Success criteria:

- Offline fiscal behavior is policy-driven, tested, and auditable per country.
- Legal delivery blocker state cannot be bypassed.

Remaining blockers:

- Country-specific legal review and certification evidence.

### Phase 7: PWA Resilience, Observability, And Field Release

User value: branches can rely on offline POS under real operating conditions.

Likely files touched:

- app shell/service worker/PWA configuration;
- POS asset and snapshot caching;
- observability instrumentation;
- support diagnostics/export;
- Playwright/e2e field smoke tests;
- runbooks and release gates.

Service/data changes:

- Add offline readiness snapshots for catalog, prices, tax, tender policy, device, terminal, cashier, and session.
- Add telemetry for pending age, replay rate, replay failure, queue capacity, device conflicts, revoked-device attempts, fiscal delivery state, and close blockers.
- Add field pilot reports and release evidence artifacts.

Risks:

- Stale catalog/price/tax data.
- Storage pressure in real browsers.
- Network flapping during replay.
- Support cannot diagnose local-only failures.

Tests:

- offline app shell loads;
- stale snapshot blocks offline readiness;
- long outage queue growth;
- high-volume replay;
- clock drift;
- network flap;
- support export import/review;
- real terminal field pilot checklist.

Success criteria:

- Release gate includes automated tests plus field evidence.
- Support can diagnose every pending, blocked, failed, or conflicted offline event.

Remaining blockers:

- Hardware/browser/provider matrix and pilot sign-off.

## 6. Verification Plan

Existing gates to keep green:

```powershell
npm test -- --runTestsByPath lib/pos/__tests__/offline-local-queue.test.ts services/pos/__tests__/offline-sync.service.test.ts actions/pos/__tests__/sync.actions.test.ts --runInBand
npm run offline:pos:replay:gate
```

Required new gates before production:

- Unit tests for sale-envelope builder, provisional receipt builder, failure classifier, queue status transitions, hash/idempotency behavior, and IndexedDB adapter.
- Service replay tests for duplicate replay, payload mismatch, sequence gap, hash fork, revoked device, invalid signature, stale scope, rollback, and post-error recovery.
- UI offline smoke tests proving cashier fallback works only for network/server-unavailable states.
- UI denial tests proving stock/session/RBAC/tender/business-rule failures do not enqueue offline events.
- Browser refresh/crash recovery tests for queued, syncing, and corrupted events.
- Multi-tab tests proving no duplicate sequence allocation or double flush.
- Revoked-device tests for sync-time and replay-time revocation.
- Fiscal-policy tests for provisional-only default, legal delivery blockers, and country-pack exceptions.
- Payment-reconciliation tests for offline cash/card/mobile-money claims and provider settlement mismatch.
- Close-blocker tests for pending replay, conflict, unreconciled tender, and fiscal certification blocker.
- Receipt tests proving public/final receipt access remains token-scoped and provisional receipts remain clearly non-final.
- Observability tests proving metrics/traces/audit records include queue age, replay result, conflict type, device id, terminal, location, session, and tenant.
- Support runbook checks for queue export, conflict triage, replay retry, revoked device handling, and fiscal authority outage handling.

Suggested Phase 1 focused test names:

- `ProfessionalPOSSystem.offline-fallback.test.tsx`: queues provisional sale on network unavailable.
- `ProfessionalPOSSystem.offline-fallback.test.tsx`: does not queue on business-rule rejection.
- `ProfessionalPOSSystem.offline-fallback.test.tsx`: shows provisional receipt and pending count after durable enqueue.
- `ProfessionalPOSSystem.offline-fallback.test.tsx`: never calls client-side stock/payment/ledger/fiscal finalizers.

## 7. Final Recommendation

Build Phase 1 first and stop there until it is verified. This gives the branch the first real cashier-visible offline value while preserving the existing server-owned finalization spine.

The next implementation slice should:

1. Add a narrow failure classifier around the cashier charge flow.
2. Build a canonical provisional sale envelope from the current POS state.
3. Enqueue `OFFLINE_SALE_CAPTURED` through the existing local queue/hook contract.
4. Show a provisional receipt and pending sync state.
5. Prove no offline fallback occurs for business-rule denials.
6. Save a focused verification report under `what-next/`.

Do not build these yet:

- final offline fiscal numbering;
- browser-side stock movement;
- browser-side payment creation;
- browser-side drawer mutation;
- browser-side ledger posting;
- automatic conflict resolution;
- broad POS redesign;
- replacement of `commitPOSSale`;
- country-specific legal exceptions without reviewed country-pack evidence.

Non-negotiables:

- Server remains the legal, fiscal, inventory, cash, payment, ledger, accounting, and audit source of truth.
- Browser output remains provisional by default.
- Replay must be idempotent, scope-checked, and conflict-visible.
- Tenant isolation, RBAC, terminal, location, session, and device scope must be enforced before data access and before finalization.
- Revoked or inactive devices must never create economic or fiscal effects.
- Close assurance must block until offline replay, conflicts, tender evidence, and fiscal certification are resolved.

