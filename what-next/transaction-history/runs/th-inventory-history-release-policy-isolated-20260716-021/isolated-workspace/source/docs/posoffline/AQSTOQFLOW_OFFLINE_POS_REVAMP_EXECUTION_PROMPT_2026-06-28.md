# AqStoqFlow Offline POS Revamp Execution Prompt

Date: 2026-06-28

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Refined Professional Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise offline POS architecture team:

- Senior enterprise software architect: preserve POS, inventory, payment, fiscal, accounting, close-assurance, and replay boundaries.
- Structural UI/UX design expert: make the cashier workflow clear, fast, touch-friendly, and explicit about online finalization versus offline provisional capture.
- Cybersecurity and RBAC specialist: enforce tenant isolation, RBAC, device trust, signed event envelopes, replay idempotency, safe errors, audit trails, and manager-visible conflicts.
- POS business logic expert: protect cart, tender, receipt, drawer, customer, terminal, session, and branch truth.
- Enterprise finance and controls expert: ensure offline POS replay integrates correctly with inventory movements, payment evidence, drawer truth, ledger posting, fiscal documents, payment reconciliation, and close blockers.
- OHADA/SYSCOHADA-aware platform architect: keep fiscal numbering, tax policy, country-pack rules, and statutory behavior separated from code and governed by expert-reviewed configuration.
- SaaS modularity specialist: keep offline POS module-entitled, tenant-safe, observable, supportable, and not implemented as a standalone browser-only feature.

In `E:\ohada saas\newStockFlow\aqstoqflow`, overhaul offline POS from a status-monitoring foundation into a cashier-usable, finance-safe offline selling workflow.

Preserve the existing Prisma offline POS models and server replay semantics unless a schema change is truly required. Wire active POS sale failure/offline detection in `components/pos/ProfessionalPOSSystem.tsx`. Use `hooks/posHooks/useOfflineSync.ts` and `lib/pos/offline-local-queue.ts` to enqueue `OFFLINE_SALE_CAPTURED` provisional sale evidence. Show a clear provisional receipt state, pending queue count, and sync control. Do not create final fiscal numbers offline. Keep final stock, payment, drawer, ledger, fiscal, receipt, and business-event effects exclusively behind `replayPendingOfflineSaleEnvelope -> commitPOSSale`. Verify with focused Jest tests and a browser offline smoke path, then save evidence under `what-next/`.

## Execution Checklist

1. Inspect the current offline POS implementation:
   - `components/pos/ProfessionalPOSSystem.tsx`
   - `components/pos/offline/OfflineSyncStatusStrip.tsx`
   - `hooks/posHooks/useOfflineSync.ts`
   - `lib/pos/offline-local-queue.ts`
   - `actions/pos/sync.actions.ts`
   - `services/pos/offline-sync.service.ts`
   - `services/pos/pos.service.ts`
   - `services/pos/offline-sync.schemas.ts`
   - `prisma/schema.prisma`

2. Confirm the active cashier charge flow:
   - Locate `handleCommitSale`.
   - Confirm where `commitSale.mutateAsync` is called.
   - Confirm how cart, tenders, receipt options, selected location, terminal, session, and customer are available.

3. Add offline/degraded detection:
   - Use `navigator.onLine` when available.
   - Treat network/server unavailable errors as offline-capture candidates.
   - Do not catch business-rule failures such as insufficient stock, invalid tender, missing session, or credit-limit rejection as offline fallback unless the server was unreachable.

4. Build a provisional offline envelope:
   - Event type: `OFFLINE_SALE_CAPTURED`.
   - Payload includes cart id, cart lines, customer, tenders, receipt preference, terminal, location, session, totals, tax/pricing snapshot, stock snapshot where available, cashier metadata, and captured timestamp.
   - Include an idempotency key tied to device, cart/sale reference, terminal, and timestamp or sequence.
   - Include provisional reference, not final order number or final fiscal number.

5. Wire local queue enqueue:
   - Use `useEnqueueOfflinePOSEvent`.
   - Ensure required device, terminal, location, and session config is present.
   - If device is not enrolled, show a clear blocker and do not claim offline selling is available.

6. Add cashier UI states:
   - Show online, degraded, offline-ready, offline-not-ready, queue-pending, syncing, conflict, and blocked states.
   - Add pending queue count.
   - Add one-click sync action using `useFlushOfflinePOSQueue`.
   - Show provisional receipt after offline capture.
   - Reset tender inputs only after the offline envelope is successfully queued.

7. Preserve final truth boundary:
   - Do not decrement stock in the browser.
   - Do not create payments in the browser.
   - Do not create ledger entries in the browser.
   - Do not create final fiscal documents in the browser.
   - Do not bypass `commitPOSSale` during replay.

8. Add focused tests:
   - Local queue still hashes and chains events correctly.
   - Active POS UI queues provisional sale on simulated offline/server-unavailable path.
   - Active POS UI does not queue offline event for normal business-rule rejection.
   - Sync action preserves RBAC and tenant derivation.
   - Replay remains idempotent and finalizes through `commitPOSSale`.

9. Save verification:
   - Add a report under `what-next/` with files changed, tests run, results, remaining blockers, and manual smoke status.

## Evidence To Inspect

- Current audit blueprint: `what-next/AQSTOQFLOW_OFFLINE_POS_SYNC_OVERHAUL_BLUEPRINT_2026-06-28.md`
- Offline queue tests: `lib/pos/__tests__/offline-local-queue.test.ts`
- Offline sync service tests: `services/pos/__tests__/offline-sync.service.test.ts`
- POS sync action tests: `actions/pos/__tests__/sync.actions.test.ts`
- POS service tests: `services/pos/__tests__/pos.service.test.ts`
- Assurance checks:
  - `services/assurance/assurance-registry.service.ts`
  - `services/assurance/assurance-registry-contracts.ts`
  - `services/accounting/data-trust.service.ts`

## Verification Commands

```powershell
npm test -- --runTestsByPath lib/pos/__tests__/offline-local-queue.test.ts services/pos/__tests__/offline-sync.service.test.ts actions/pos/__tests__/sync.actions.test.ts --runInBand
```

```powershell
npm test -- --runTestsByPath services/pos/__tests__/pos.service.test.ts --runInBand
```

```powershell
npx eslint components/pos/ProfessionalPOSSystem.tsx components/pos/offline/OfflineSyncStatusStrip.tsx hooks/posHooks/useOfflineSync.ts lib/pos/offline-local-queue.ts services/pos/offline-sync.service.ts actions/pos/sync.actions.ts
```

Optional browser smoke after implementation:

```powershell
npm run dev
```

Then test `/en/dashboard/pos` with an authenticated cashier and browser network offline simulation.

## Risk Controls

- Do not touch unrelated legacy route trees or broad dashboard refactors.
- Do not convert provisional offline sales into final legal/accounting truth in the browser.
- Do not weaken RBAC or tenant derivation from server context.
- Do not trust client-supplied organization/user scope.
- Do not let offline replay silently fail. Every accepted, replayed, blocked, rejected, or conflicted envelope must remain visible.
- Do not claim final receipt/fiscal certification until server replay and fiscal/country policy allow it.
- Preserve safe error redaction for replay failures.

## Success Criteria

- Active cashier charge flow can queue a provisional sale when offline/server unavailable.
- The cashier sees a provisional receipt state and a pending queue counter.
- The cashier can trigger sync from the POS screen.
- Sync records offline evidence server-side.
- Replay finalizes through the normal `commitPOSSale` path.
- Conflicts remain manager-visible.
- Close readiness remains blocked while accepted offline events are pending replay or conflicted.
- Focused offline POS tests pass.
- A verification report is saved under `what-next/`.

## Non-Goals

- No new country legal/fiscal rules without reviewed country-pack provenance.
- No browser-side stock decrement, payment creation, ledger posting, or final fiscal numbering.
- No large POS redesign unrelated to offline capture.
- No broad cleanup of unrelated lint or TypeScript issues.

