# AqStoqFlow Offline POS Sync Audit And Overhaul Blueprint

Generated: 2026-06-28

## Scope

This report answers what offline POS is, how indispensable it is for AqStoqFlow/OHADA SMB operations, how difficult it is to implement correctly, what the current repository implementation already does, and what a major professional overhaul should prioritize.

Selected skills:

- `architect`
- `aqstoqflow-prompt-architect`
- `014-aqstoqflow-offline-pos-sync`

No production source files were changed in this audit pass. The architect blueprint gate remains open for confirmation before implementation.

## What Offline POS Is

Offline POS is the ability for a cashier terminal to keep selling when the network, server, fiscal authority, or payment provider is temporarily unavailable. In a finance-safe implementation, the terminal does not pretend the server accepted a final legal transaction. It captures a tamper-evident local sale envelope, issues only provisional evidence unless the country policy explicitly allows final offline numbering, and later replays the envelope through the normal server sale, inventory, payment, accounting, fiscal, audit, and notification gateways.

The key principle is simple: offline POS can preserve business continuity, but the server remains the legal and accounting source of truth.

## Indispensability

For the OHADA SMB market, offline POS is close to indispensable for serious retail adoption. Many stores cannot rely on uninterrupted connectivity, and a POS that stops selling during outages will be bypassed with paper notes, informal receipts, delayed data entry, and cash leakage.

Offline POS becomes mission critical when:

- stores operate in low-connectivity areas;
- cashiers cannot stop selling during peak periods;
- stock, cash drawer, VAT/fiscal receipt, and accounting truth must stay aligned;
- management wants end-of-day close assurance rather than manual reconciliation archaeology;
- the SaaS product wants to feel reliable enough for real shops, not only offices with stable internet.

It is not indispensable for a pure back-office accounting app or a demo-only POS. It is indispensable for a professional retail operating system.

## Difficulty

The easy part is a browser queue and a retry button.

The hard part is making offline sales safe:

- no duplicate sales, stock issues, payments, fiscal numbers, or ledger postings;
- device enrollment, revocation, sequence control, and key rotation;
- tamper-evident local evidence with server-side verification;
- provisional receipt policy by country pack;
- payment reconciliation for offline tenders;
- conflict workflows for manager and accountant review;
- close/Z-day blockers until replay and certification are complete;
- resilient UX that clearly separates online finalization from offline provisional capture;
- durable browser storage and recovery after refresh, browser crash, or interrupted replay;
- audit logs and business events that explain every accepted, replayed, blocked, and conflicted event.

Implementation is moderate for a prototype and hard for production. AqStoqFlow already has much of the hard backend foundation, but the live cashier offline experience is not yet complete.

## Current Implementation Verified

Repository evidence inspected:

- `prisma/schema.prisma` contains `POSOfflineDevice`, `POSOfflineSyncBatch`, `POSOfflineEvent`, `POSOfflineSyncConflict`, `POSOfflineSyncCertificate`, and supporting enums around lines 3083-3375.
- `lib/pos/offline-local-queue.ts` contains a browser queue, stable JSON hashing, SHA-256 payload hashing, device sequence, hash-chain continuity, provisional-only fiscal guard, sync status transitions, and pruning.
- `services/pos/offline-sync.service.ts` owns device enrollment, batch ingest, duplicate/idempotency handling, sequence/hash-chain conflict detection, accepted-event business events, replay through `commitPOSSale`, replay blocking, certificate refresh, and dashboard data.
- `actions/pos/sync.actions.ts` exposes protected server actions for dashboard, enrollment, sync, and replay.
- `hooks/posHooks/useOfflineSync.ts` exposes dashboard, device registration, direct sync, enqueue, and flush hooks.
- `components/pos/offline/OfflineSyncStatusStrip.tsx` renders a cashier-visible sync/readiness strip.
- `components/pos/ProfessionalPOSSystem.tsx` renders the status strip in the active POS page.

Focused verification run on 2026-06-28:

```powershell
npm test -- --runTestsByPath lib/pos/__tests__/offline-local-queue.test.ts services/pos/__tests__/offline-sync.service.test.ts actions/pos/__tests__/sync.actions.test.ts --runInBand
npm run prisma:validate
```

Results:

- Jest: 3 suites passed, 25 tests passed.
- Prisma: schema valid.

## Strengths

- The data model is not a toy queue. It has durable devices, batches, events, conflicts, and certificates.
- Server actions derive tenant and actor from protected context instead of trusting the client.
- Accepted offline events are evidence first and remain pending replay.
- Replay uses `commitPOSSale`, so final stock, payment, accounting, receipt, and fiscal effects go through the normal POS service path.
- Idempotency, duplicate sequence, sequence gap, hash-chain fork, revoked device, payload mismatch, rollback, scope mismatch, and replay duplicate cases have focused tests.
- The UI already surfaces offline status, pending events, conflicts, blockers, and retry.
- Close/certification blockers exist through the certificate model and dashboard data.

## Main Gaps

- The active cashier charge flow still calls `commitSale.mutateAsync` directly. It does not visibly fall back to `useEnqueueOfflinePOSEvent` when the network/server path fails.
- The hardware network indicator is hardcoded as online in `ProfessionalPOSSystem.tsx`, so the cashier UX can misrepresent degraded operation.
- The local queue uses `localStorage`. That is too fragile for a professional offline POS queue because it is size-limited, easy to clear, non-transactional, and not ideal for large sale envelopes.
- Signature verification is still effectively a placeholder: signature is stored, and the conflict enum has `SIGNATURE_INVALID`, but server-side public-key verification and device key rotation are not complete.
- Device enrollment exists as an action/hook, but there is no complete operator-facing enrollment, revocation, lost-device, or key-rotation workflow in the active POS surface.
- Conflict data exists, but manager/accountant conflict resolution is not a complete workbench.
- Offline tenders are not yet deeply integrated into payment reconciliation as a first-class operational queue.
- The current UI presents status monitoring more than actual offline selling workflow.
- Browser recovery, queue compaction, queue export, and support diagnostics are not mature enough for production field support.

## Overhaul Blueprint

### Phase 1 - Make The Cashier Flow Truly Offline

Wire the active POS charge flow so network/server failure can capture an `OFFLINE_SALE_CAPTURED` envelope through `useEnqueueOfflinePOSEvent`.

Requirements:

- detect offline state with `navigator.onLine`, mutation network errors, and explicit server unavailable responses;
- show a clear "Provisional offline receipt" result, never a final receipt;
- include `commitSale` payload, terminal/location/session/customer/tenders/cart snapshot, policy snapshot hash, source snapshot hash, and provisional reference;
- add a visible pending queue counter and a one-click sync action;
- update the hardware network indicator to real online/degraded state.

### Phase 2 - Replace LocalStorage With Durable IndexedDB Queue

Introduce a small offline queue adapter backed by IndexedDB:

- transactional writes;
- retry state;
- queue lease/lock to prevent double flush across tabs;
- schema version migrations;
- bounded payload size and pruning policy;
- optional encrypted-at-rest payload field using WebCrypto where feasible.

Keep the existing `lib/pos/offline-local-queue.ts` contract as the compatibility layer during migration.

### Phase 3 - Complete Device Trust

Make device identity operational:

- device enrollment screen with manager permission;
- non-extractable browser key generation;
- public key fingerprint registration;
- server signature verification for each event envelope;
- key rotation status and grace period;
- lost/stolen device revocation;
- sync rejection for revoked or rotated devices.

### Phase 4 - Build The Offline Operations Workbench

Add a manager/accountant workbench for:

- open conflicts;
- sequence gaps;
- hash-chain forks;
- idempotency mismatches;
- blocked replays;
- pending replay by device/session;
- certificate status and close blockers;
- safe resolution notes and audit logs.

No conflict should silently disappear. Dismissal should require an explicit role, reason, and immutable evidence event.

### Phase 5 - Payment And Close Assurance

Promote offline tenders into payment reconciliation:

- offline cash claims tied to drawer session;
- offline card/mobile money claims tied to provider settlement evidence;
- unmatched provider event blockers;
- period close blockers until replay, payment reconciliation, and certificate completion pass.

### Phase 6 - Fiscal/Country Pack Hardening

Keep the current rule: no final fiscal number offline unless a country pack explicitly allows it.

Add:

- policy snapshots by country/version;
- provisional receipt expiry/aging;
- certification queue;
- fiscal authority delivery retry evidence;
- country-pack simulation tests for allowed and disallowed offline final numbering.

### Phase 7 - Release Gates And Observability

Add release gates for:

- offline sale capture from the active POS UI;
- queue survives refresh and browser restart;
- duplicate flush cannot double-finalize a sale;
- sequence gap and hash fork block close;
- revoked device cannot sync;
- replay rollback is safe and redacted;
- fiscal ineligible and fiscal queued receipts preserve legal metadata;
- payment reconciliation blocks close until offline tender evidence is matched.

Add operational metrics:

- pending offline event age;
- conflict count by terminal/device;
- replay success/failure rate;
- close blockers by organization;
- revoked-device sync attempts;
- IndexedDB queue health.

## Execution Prompt Package

Use this prompt for the implementation phase:

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

In E:\ohada saas\newStockFlow\aqstoqflow, overhaul offline POS from status-monitoring foundation into a cashier-usable, finance-safe offline selling workflow.

Start with the smallest production-safe slice:
1. Preserve existing Prisma models and server replay semantics unless a schema change is truly required.
2. Wire active POS sale failure/offline detection in components/pos/ProfessionalPOSSystem.tsx.
3. Use hooks/posHooks/useOfflineSync.ts and lib/pos/offline-local-queue.ts to enqueue OFFLINE_SALE_CAPTURED provisional sale evidence.
4. Show a clear provisional receipt state, pending queue count, and sync control.
5. Do not create final fiscal numbers offline.
6. Keep final stock/payment/ledger/fiscal effects exclusively behind replayPendingOfflineSaleEnvelope -> commitPOSSale.
7. Add focused tests for UI fallback, queue envelope shape, and no duplicate finalization.
8. Save verification evidence under what-next/.

Risk controls:
- no direct Prisma in UI;
- no client-supplied tenant/user trust;
- no final fiscal numbering offline;
- no stock/payment/ledger mutation from browser queue;
- no conflict auto-resolution;
- no broad refactor outside POS offline flow.

Success criteria:
- active cashier charge flow can queue a provisional sale when offline/server unavailable;
- focused offline queue, sync action, replay service, and POS UI tests pass;
- Prisma validation passes;
- report names remaining production gaps.
```

## Gates Passed In This Audit

- Architecture context loaded.
- Offline POS source implementation verified.
- Prisma schema validated.
- Focused offline POS tests passed.
- Backend replay path confirmed to use normal POS finalization service.
- Active POS UI gap identified.

## Gates Still Blocked

- Cashier offline sale fallback is not wired into the active charge flow.
- Durable IndexedDB queue is not implemented.
- Device signature verification and key rotation are incomplete.
- Full conflict-resolution workbench is incomplete.
- Offline tender reconciliation and close enforcement need deeper integration.
- Browser/PWA field-resilience checks were not run in this audit.

## Recommended Next Skill

Remain on `014-aqstoqflow-offline-pos-sync` for the next implementation slice.

Blueprint ready.
