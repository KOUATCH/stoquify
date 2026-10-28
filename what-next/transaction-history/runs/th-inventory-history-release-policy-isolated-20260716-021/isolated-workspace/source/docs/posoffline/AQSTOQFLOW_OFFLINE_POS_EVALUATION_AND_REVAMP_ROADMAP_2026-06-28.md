# AqStoqFlow Offline POS Evaluation And Revamp Roadmap

Date: 2026-06-28

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Purpose

This document explains what offline POS is, why it matters for an integrated inventory, POS, and accounting platform for SMBs in Sub-Saharan Africa, and how AqStoqFlow's current offline POS module should be revamped into a fully professional, enterprise-grade workflow.

## What Offline POS Is

Offline POS is the ability for a cashier terminal to continue operating when the internet, application server, fiscal authority, or payment provider is temporarily unavailable.

In a finance-safe system, offline POS does not pretend that the final legal or accounting sale has already been accepted by the server. Instead, it captures a tamper-evident provisional sale envelope locally, gives the customer provisional evidence, and later replays that envelope through the normal server-owned sale, inventory, payment, drawer, fiscal, ledger, audit, and notification workflow.

The central rule is:

> Offline POS preserves business continuity, but the server remains the final legal and accounting source of truth.

## Indispensability For Sub-Saharan African SMBs

Offline POS is close to indispensable for a serious retail SMB operating system in Sub-Saharan Africa.

Many stores cannot assume uninterrupted internet, power, mobile-money connectivity, fiscal-authority availability, or payment-provider uptime. If the POS stops during outages, staff usually fall back to notebooks, informal receipts, WhatsApp notes, delayed data entry, and manual cash counting. That creates stock drift, cash leakage, missing payment evidence, duplicate sales, broken close reports, and weak accounting trust.

Offline POS is mission critical when:

- cashiers cannot stop selling during peak hours;
- mobile money and card networks are intermittent;
- shops run branches outside major urban centers;
- fiscal or e-invoicing adapters are not always reachable;
- owners want daily sales, stock, cash, and ledger truth without manual reconstruction;
- accountants need close-ready evidence, not handwritten explanations after outages.

It is not indispensable for a pure back-office accounting app or a demo-only POS. It is indispensable for a professional retail operating system.

## Current System Evaluation

Verdict: AqStoqFlow has a strong offline POS control kernel, but the active cashier experience is not yet a complete offline selling product.

### Strong Points

- The data model is serious. `prisma/schema.prisma` includes offline devices, sync batches, events, conflicts, certificates, hashes, status enums, and uniqueness constraints for idempotent replay.
- The local queue exists in `lib/pos/offline-local-queue.ts` and includes stable JSON hashing, SHA-256 payload hashes, device sequence numbers, hash-chain continuity, provisional-only fiscal guards, queue status transitions, and pruning.
- The server-owned replay service exists in `services/pos/offline-sync.service.ts`.
- Accepted offline events replay through `commitPOSSale`, which means final stock, payment, drawer, fiscal, receipt, and accounting truth stays behind the normal POS service path.
- Protected server actions exist in `actions/pos/sync.actions.ts`.
- The cashier POS screen already renders `OfflineSyncStatusStrip`, so the operator can see offline sync state, conflicts, blockers, and device readiness.
- Focused offline tests pass for local queue behavior, sync service behavior, and server-action RBAC wiring.

Verification run:

```powershell
npm test -- --runTestsByPath lib/pos/__tests__/offline-local-queue.test.ts services/pos/__tests__/offline-sync.service.test.ts actions/pos/__tests__/sync.actions.test.ts --runInBand
```

Result on 2026-06-28: 3 test suites passed, 25 tests passed.

### Weak Points

- The active cashier charge flow still calls `commitSale.mutateAsync` directly in `components/pos/ProfessionalPOSSystem.tsx`. It does not yet fall back to `useEnqueueOfflinePOSEvent` when the network/server path fails.
- The POS hardware network indicator is hardcoded as online, which can mislead cashiers during degraded operation.
- The browser queue uses `localStorage`, which is too fragile for enterprise offline POS because it is size-limited, easy to clear, non-transactional, and weak for large sale envelopes.
- Device signature verification and key rotation are incomplete.
- Device enrollment exists at the service/action/hook level, but there is no complete operator-facing workflow for enrollment, revocation, lost-device handling, or key rotation.
- Offline status is visible, but actual offline selling is not yet fully wired into the cashier workflow.
- There is no dedicated offline operations workbench for managers and accountants to review pending replay, conflicts, blocked events, replay proof, and close blockers.

## Revamp Roadmap

### Phase 1 - Make The Cashier Flow Truly Offline

Wire the active POS charge flow so network/server failure captures an `OFFLINE_SALE_CAPTURED` envelope through the existing offline queue.

Required work:

- Detect offline/degraded state using `navigator.onLine`, mutation network errors, explicit server unavailable responses, and timeout handling.
- Build a canonical offline sale envelope from cart, tenders, customer, terminal, location, session, receipt options, pricing snapshot, tax snapshot, and stock snapshot.
- Enqueue the envelope with `useEnqueueOfflinePOSEvent`.
- Show a clear provisional receipt result.
- Never show final fiscal/legal receipt language while offline.
- Add a visible pending queue counter and one-click sync action.
- Keep final stock, payment, drawer, fiscal, and accounting effects exclusively behind replay.

Success criteria:

- A cashier can complete a provisional offline sale without leaving the POS screen.
- The sale appears in the pending offline queue.
- Reconnect and sync sends the envelope to the server.
- Replay finalizes through `commitPOSSale`.

### Phase 2 - Replace LocalStorage With IndexedDB

Introduce an IndexedDB-backed queue adapter while preserving the current queue API.

Required work:

- Add an offline queue storage abstraction.
- Implement IndexedDB storage with versioning and migrations.
- Retain compatibility with the current local queue contract.
- Add queue limits, corrupted-entry quarantine, queue health reporting, and deterministic ordering.
- Add tests for reload recovery, browser crash recovery, corrupted JSON, large envelopes, and migration.

Success criteria:

- Offline sales survive reload and browser restart.
- Queue corruption does not lose all queued sales.
- Queue health is visible to the cashier/manager.

### Phase 3 - Complete Device Trust

Move from "stored signature field" to a real device-trust lifecycle.

Required work:

- Add device keypair generation on enrollment.
- Persist only public key/fingerprint server-side.
- Sign every offline event envelope client-side.
- Verify signatures server-side during sync.
- Support key rotation.
- Support revoked and lost devices.
- Block revoked devices from sync.

Success criteria:

- A valid enrolled device can sync.
- A revoked device cannot sync.
- Tampered payloads, invalid signatures, sequence forks, and hash-chain forks are visible as conflicts.

### Phase 4 - Build Offline Operations Workbench

Create a dedicated manager/accountant surface, likely `/dashboard/pos/offline-sync`.

Required work:

- Pending events by branch, terminal, device, cashier, age, and session.
- Conflict queue with severity and manager actions.
- Replay history with sale, receipt, posting batch, document hash, and business-event links.
- Device enrollment/revocation/key rotation controls.
- Close blockers and certification state.
- Exportable evidence for support and accountants.

Success criteria:

- Managers can see what is pending, blocked, replayed, or conflicted.
- Accountants can identify whether branch close is blocked by offline POS.
- Support can diagnose replay failures without reading raw database rows.

### Phase 5 - Payment And Close Assurance

Treat offline tenders as provisional claims until reconciled.

Required work:

- Offline cash claims tied to drawer/session evidence.
- Offline card/mobile-money claims tied to provider settlement evidence.
- Reconciliation blockers for unmatched offline tender claims.
- Close blockers until replay, payment reconciliation, and certificate completion pass.
- Clear manager workflows for partial replay, failed replay, and payment mismatch.

Success criteria:

- Offline cash, card, and mobile-money claims become auditable payment evidence.
- Close readiness blocks when offline tenders are unresolved.
- Accountant trust surfaces reflect offline replay and payment-reconciliation state.

### Phase 6 - Fiscal And Country-Pack Hardening

Keep the current policy: no final fiscal number offline unless a country pack explicitly permits it.

Required work:

- Country-pack policy for offline final numbering.
- Provisional receipt wording and numbering.
- Fiscal adapter replay after server finalization.
- Legal delivery blocker when fiscal certification is pending or failed.
- Country-pack tests for allowed and disallowed offline final numbering.

Success criteria:

- Offline receipts never overclaim legal certification.
- Fiscal authority submissions occur only through server-controlled replay unless a reviewed country policy allows otherwise.

### Phase 7 - PWA And Field Resilience

Add app-shell resilience so the POS can operate in the field.

Required work:

- Cache POS shell assets safely.
- Cache catalog snapshot, tax/pricing snapshot, customer basics, terminal/session context, and allowed tender policies.
- Add offline readiness checks before a branch relies on offline mode.
- Avoid caching privileged or stale sensitive data beyond policy.

Success criteria:

- POS opens and sells provisionally during network outage after prior setup.
- Cached data is visibly time-stamped.
- Cashiers see when offline selling is unavailable because required snapshots are missing.

## Recommended Build Order

1. Cashier offline fallback using existing local queue.
2. POS UI queue counter, provisional receipt state, and sync CTA.
3. IndexedDB queue adapter.
4. Device trust and signature verification.
5. Offline operations workbench.
6. Payment reconciliation and close blockers.
7. Fiscal/country-pack hardening.
8. PWA/app-shell resilience and field smoke tests.

## Non-Goals

- Do not create final fiscal/legal receipt numbers offline by default.
- Do not bypass `commitPOSSale` for final replay.
- Do not create a separate offline accounting pathway.
- Do not hand-roll stock/accounting effects in the browser.
- Do not refactor unrelated POS, inventory, or accounting modules during the first revamp slice.

## Key Files To Inspect

- `components/pos/ProfessionalPOSSystem.tsx`
- `components/pos/offline/OfflineSyncStatusStrip.tsx`
- `hooks/posHooks/useOfflineSync.ts`
- `lib/pos/offline-local-queue.ts`
- `actions/pos/sync.actions.ts`
- `services/pos/offline-sync.service.ts`
- `services/pos/pos.service.ts`
- `services/pos/offline-sync.schemas.ts`
- `prisma/schema.prisma`
- `services/accounting/data-trust.service.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/assurance-registry-contracts.ts`

