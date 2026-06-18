# AqStoqFlow 014 Offline POS Sync Architect Builder Execution Report

Date: 2026-06-15  
Selected skill: `014-aqstoqflow-offline-pos-sync-architect-builder`  
Parent skill: `014-aqstoqflow-offline-pos-sync`  
Execution mode: controlled vertical foundation for fiscal-safe offline POS/device sync

## Skill Installation

Installed and validated:

- `C:\Users\J COMPUTER\.codex\skills\014-aqstoqflow-offline-pos-sync-architect-builder`

The skill extends the numbered 014 suite step and does not replace it. It codifies the execution recipe for device identity, immutable offline event envelopes, sequence/hash-chain validation, conflict quarantine, provisional receipt safety, data-trust blockers, UI status, tests, and release gates.

## Architecture Decision

014 was implemented as a durable server-side sync foundation rather than a broad offline POS rewrite.

The server now treats offline POS devices as controlled witnesses:

1. A device can be enrolled against an organization, location, and POS terminal.
2. Offline facts are stored in an immutable server inbox with `deviceSeq`, `idempotencyKey`, `payloadHash`, `prevHash`, `entryHash`, optional signature placeholder, payload, and received/captured timestamps.
3. Sync batches validate device state, sequence continuity, hash-chain continuity, duplicate replay, and idempotency conflicts.
4. Accepted envelopes are recorded through the existing `BusinessEvent` gateway with `OFFLINE_POS` source and sync/notification outbox messages.
5. Accepted events remain `PENDING_REPLAY` with explicit close/certification blockers until a later POS replay/certification slice safely converts them into final POS sale, ledger, stock, drawer, payment, and fiscal effects.
6. Conflicts are persisted as operator-visible quarantine records and block accountant trust certification.

This avoids the dangerous shortcut of letting reconnect code write sales, stock, drawer, AR, journal, payment, or fiscal document truth directly.

## Implemented

### Installed Skill

Added draft source in the repo and installed into Codex skills:

- `.codex-skill-drafts/014-aqstoqflow-offline-pos-sync-architect-builder/SKILL.md`
- `.codex-skill-drafts/014-aqstoqflow-offline-pos-sync-architect-builder/references/offline-sync-implementation-plan.md`
- `.codex-skill-drafts/014-aqstoqflow-offline-pos-sync-architect-builder/agents/openai.yaml`

### Prisma Schema And Migration

Updated:

- `prisma/schema.prisma`

Added migration:

- `prisma/migrations/20260615210000_offline_pos_sync_kernel/migration.sql`

New durable models:

- `POSOfflineDevice`
- `POSOfflineSyncBatch`
- `POSOfflineEvent`
- `POSOfflineSyncConflict`
- `POSOfflineSyncCertificate`

New enums cover device state, sync batch state, event type/status, conflict type/severity/status, and certificate status.

Core DB gates:

- unique `(organizationId, deviceId, deviceSeq)`;
- unique `(organizationId, idempotencyKey)`;
- unique `(organizationId, deviceId, entryHash)`;
- tenant-scoped indexes for status, conflicts, blockers, and certification.

### Service Kernel

Added:

- `services/pos/offline-sync.schemas.ts`
- `services/pos/offline-sync.service.ts`

Implemented:

- device enrollment/refresh with revoked-device denial;
- terminal/location tenant scope validation;
- canonical offline entry hash builder;
- sync batch ingestion transaction;
- idempotent duplicate handling;
- idempotency key payload mismatch quarantine;
- sequence gap quarantine;
- hash-chain fork quarantine;
- revoked/suspended device sync rejection;
- `BusinessEvent` gateway evidence for accepted offline envelopes and conflict notifications;
- certificate/blocker refresh;
- accountant-visible blocker DTOs.

### Server Actions

Added:

- `actions/pos/sync.actions.ts`

Actions:

- `getOfflineSyncDashboardAction`
- `registerOfflineDeviceAction`
- `syncOfflineEventsAction`

Controls:

- tenant and actor derived from `protect`/RBAC context;
- `pos.transactions.read` for dashboard;
- `pos.session.start` for enrollment;
- `pos.use` for sync;
- safe protected action response envelope;
- revalidation for POS and accountant portal surfaces.

### Hooks And UI

Added:

- `hooks/posHooks/useOfflineSync.ts`
- `components/pos/offline/OfflineSyncStatusStrip.tsx`

Updated:

- `components/pos/ProfessionalPOSSystem.tsx`

The POS shell now shows:

- offline sync readiness;
- no-device state;
- loading state;
- permission/error retry state;
- pending replay count;
- open conflict count;
- close blocker count;
- as-of timestamp;
- degraded/offline operational signal.

### Data Trust Integration

Updated:

- `services/accounting/data-trust.service.ts`

The accountant portal trust model now includes offline POS:

- pending replay count;
- open offline sync conflict count;
- close blocker count;
- `offline_pos` module evidence;
- blockers for open conflicts, certification blockers, and pending replay.

### Focused Tests

Added:

- `services/pos/__tests__/offline-sync.service.test.ts`
- `actions/pos/__tests__/sync.actions.test.ts`

Coverage:

- accepted offline event is recorded as `PENDING_REPLAY`;
- accepted envelope creates `pos.offline.event.captured` business-event evidence;
- duplicate replay with the same payload is idempotent and creates no duplicate inbox/business event;
- duplicate idempotency key with different payload becomes `IDEMPOTENCY_PAYLOAD_MISMATCH`;
- sequence gap creates quarantine/conflict;
- hash-chain fork creates quarantine/conflict;
- revoked device sync is rejected with a visible conflict;
- dashboard output exposes open conflicts and close blockers;
- protected actions derive tenant and actor from RBAC context, not caller input;
- protected sync actions return a safe forbidden response on RBAC denial;
- accountant data-trust evidence exposes offline POS pending replay, conflicts, and blockers.

### 2026-06-16 Hardening Update

Updated:

- `services/pos/offline-sync.service.ts`
- `services/pos/__tests__/offline-sync.service.test.ts`
- `actions/pos/__tests__/sync.actions.test.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `services/compliance/adapter-contract.ts`
- `services/compliance/certification-outbox.service.ts`

Additional fixes:

- Sync certificates now keep unresolved persisted conflicts as close blockers, even when a later batch has no new conflicts.
- The compliance adapter source contract now includes source number/date metadata already emitted by the canonical payload builder.
- Compliance submission processing status checks were aligned with the full Prisma enum.
- Post-production-guard sandbox metadata comparisons were simplified so TypeScript no longer flags impossible enum comparisons.

## Gates Passed

- Skill gate: installed companion skill validates with `quick_validate.py`.
- Tenant gate: service/action inputs derive organization from RBAC context; queries scope by organization.
- RBAC gate: sync actions use `protect` permissions.
- Event gateway gate: accepted offline envelopes use `recordBusinessEventInTx`.
- No direct ledger/stock/drawer mutation: sync service only records event evidence, conflicts, and blockers.
- Idempotency gate: same key and same payload is duplicate-safe; same key and different payload is conflict.
- Sequence gate: device sequence gap is quarantined.
- Hash gate: entry hash and previous-hash continuity are validated.
- Revoked device gate: inactive devices cannot sync as accepted events.
- Notification gate: accepted and conflicted events produce business outbox messages.
- Data-trust gate: accountant portal sees offline POS blockers.
- UI gate: cashier-facing status strip shows loading/error/empty/degraded/blocker states.
- Certificate gate: unresolved persisted conflicts remain close blockers until resolved.
- Inventory boundary gate: 0 active violations.

## Gates Blocked Or Deferred

014 should not advance to 015 as a fully complete offline POS suite yet.

Remaining 014 follow-up gates:

- Build the next replay slice that converts `PENDING_REPLAY` offline sale envelopes into existing POS sale finalization without bypassing cart/sale/stock/payment/fiscal posting controls.
- Implement server certification that turns provisional receipts into final legal/fiscal artifacts only through country-pack and compliance rules.
- Add manager conflict resolution workflow for `POSOfflineSyncConflict`.
- Add offline tender reconciliation integration with the payment reconciliation workbench.
- Add device key rotation/signature verification beyond the current signature placeholder.
- Add close/Z-day/period blocker enforcement wherever close workflows are finalized.

Pre-existing broad POS static-scan findings remain outside the new 014 files:

- `actions/pos/terminal-management.actions.ts` imports Prisma error types and throws raw `Error` in an internal helper.
- Existing POS UI/service files contain older `Math.random` and `?? 0` patterns.

The new 014 offline sync files passed the targeted no-Prisma-in-UI/raw-action-error/mock-sample scans.

## Verification

Passed:

```powershell
npm run prisma:generate
npm test -- --runTestsByPath services/pos/__tests__/offline-sync.service.test.ts actions/pos/__tests__/sync.actions.test.ts services/accounting/__tests__/data-trust.service.test.ts services/compliance/__tests__/certification-outbox-processing.test.ts --runInBand
npm run typecheck
npm run prisma:validate
npm run inventory:boundary
rg -n "@/prisma|PrismaClient|new PrismaClient" actions/pos/sync.actions.ts hooks/posHooks/useOfflineSync.ts components/pos/offline/OfflineSyncStatusStrip.tsx components/pos/ProfessionalPOSSystem.tsx
rg -n "faker|Math\.random\(|mock|sample|dummy|lorem|TODO estimate|\?\? 0|\|\| 0" services/pos/offline-sync.service.ts actions/pos/sync.actions.ts hooks/posHooks/useOfflineSync.ts components/pos/offline/OfflineSyncStatusStrip.tsx
rg -n "throw new Error|return \{ error:.*message|error: any" actions/pos/sync.actions.ts
```

Results:

- Prisma Client generation: passed.
- Focused Jest: 4 suites passed, 21 tests passed.
- TypeScript: passed.
- Prisma schema validation: passed.
- Inventory boundary gate: 0 active violations.
- Targeted new-surface static scans: no matches.

Broad POS static scan notes:

```powershell
rg -n "@/prisma|PrismaClient|new PrismaClient" components/pos hooks/posHooks actions/pos
rg -n "faker|Math\.random\(|mock|sample|dummy|lorem|TODO estimate|\?\? 0|\|\| 0" services/pos actions/pos hooks/posHooks components/pos
rg -n "throw new Error|return \{ error:.*message|error: any" actions/pos
```

The exact broad scans still surface pre-existing POS findings outside the 014 production surface:

- `actions/pos/terminal-management.actions.ts` imports Prisma error types and throws raw `Error` in an internal helper.
- Older POS files contain existing `Math.random`, `?? 0`, and `|| 0` patterns.
- Test files intentionally contain `mock` strings.

The narrowed 014 production files passed the no-Prisma-in-UI, no mock/sample, and no raw action error scans.

## Next Recommended 014 Slice

Remain on `014-aqstoqflow-offline-pos-sync`.

Next slice:

`PENDING_REPLAY offline sale -> safe POS sale replay adapter -> fiscal document certification -> payment reconciliation blocker -> manager/accountant resolution UI`

The foundation is now in place; the next work should convert accepted offline sale evidence into final business effects only through the existing POS, inventory, payment, fiscal-document, and ledger-first gateways.
