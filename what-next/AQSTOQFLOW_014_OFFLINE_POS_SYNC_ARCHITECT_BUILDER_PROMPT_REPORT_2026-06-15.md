# AqStoqFlow 014 Offline POS Sync Architect Builder Prompt Report

Date: 2026-06-15  
Target suite step: `014-aqstoqflow-offline-pos-sync`  
Purpose: refine the 014 execution route into a reusable skill-building prompt for architecting and implementing fiscal-safe offline POS/device sync.

## Decision

014 should be executed as a controlled vertical foundation, not as a broad offline rewrite.

The highest-efficiency path is:

1. Architect the offline/device sync boundary against the current POS, event, accounting, compliance, payment, inventory, and data-trust kernels.
2. Build the immutable device-event sync foundation.
3. Prove one vertical path first: offline sale capture -> sync -> accepted or quarantined event -> ledger/source-link/compliance evidence or explicit blocker.
4. Expand later to refunds, voids, drawer events, Z close, receipt delivery, payment reconciliation, and full accountant certification blockers.

This avoids breaking the existing POS while creating the hard moat: offline-first POS that works in weak-network OHADA environments without weakening fiscal, ledger, or audit integrity.

## Skill To Create

Recommended companion skill:

`014-aqstoqflow-offline-pos-sync-architect-builder`

This skill should extend the existing 014 suite skill. It should not replace:

- `014-aqstoqflow-offline-pos-sync`
- `offline-first-pos-inventory-sync`
- `stockflow-enterprise-pos`
- `ledger-first-business-events`
- `ohada-compliance-oracle`
- `enterprise-fraud-and-controls`
- `stockflow-data-trust-certifier`

## Why A Companion Skill Is Better

The existing 014 skill defines the numbered suite boundary. The new companion skill should provide the execution recipe:

- exact repo surfaces to inspect;
- schema/service/action/hook/UI split;
- event envelope;
- sequence and hash-chain rules;
- provisional receipt policy;
- sync ingestion transaction;
- conflict and quarantine gates;
- data-trust/accountant integration;
- tests and verification commands.

This keeps the parent skill stable while making implementation repeatable and less error-prone.

## Refined Prompt

```text
[$014-aqstoqflow-offline-pos-sync](C:\Users\J COMPUTER\.codex\skills\014-aqstoqflow-offline-pos-sync\SKILL.md)
[$offline-first-pos-inventory-sync](C:\Users\J COMPUTER\.codex\skills\offline-first-pos-inventory-sync\SKILL.md)
[$stockflow-enterprise-pos](C:\Users\J COMPUTER\.codex\skills\stockflow-enterprise-pos\SKILL.md)
[$ledger-first-business-events](C:\Users\J COMPUTER\.codex\skills\ledger-first-business-events\SKILL.md)
[$ohada-compliance-oracle](C:\Users\J COMPUTER\.codex\skills\ohada-compliance-oracle\SKILL.md)
[$enterprise-fraud-and-controls](C:\Users\J COMPUTER\.codex\skills\enterprise-fraud-and-controls\SKILL.md)
[$stockflow-data-trust-certifier](C:\Users\J COMPUTER\.codex\skills\stockflow-data-trust-certifier\SKILL.md)
[$skill-creator](C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\SKILL.md)

Create, install, and then execute a focused companion skill named:

014-aqstoqflow-offline-pos-sync-architect-builder

Purpose:
Architect and implement the AqStoqFlow offline POS/device sync foundation for OHADA SMBs in a professional, robust, secure, enterprise-grade way, without allowing offline mode to bypass fiscal, ledger, stock, payment, compliance, RBAC, audit, or data-trust gates.

The skill must use the existing 014 skill as the parent suite step and must not replace it.

The skill must first inspect:
- prisma/schema.prisma
- services/pos/*
- services/events/*
- services/accounting/posting.service.ts
- services/accounting/source-link.service.ts
- services/compliance/*
- services/payments/*
- services/inventory/*
- actions/pos/*
- hooks/posHooks/*
- components/pos/*
- app/[locale]/(dashboard)/dashboard/pos/*
- what-next/AQSTOQFLOW_013_DATA_TRUST_ACCOUNTANT_PORTAL_EXECUTION_REPORT_2026-06-15.md
- graphify-out/GRAPH_REPORT.md

Architecture requirements:
1. Treat offline POS devices as controlled witnesses, not sources of financial truth.
2. Add or repair device identity, terminal enrollment, key state, revocation state, and sync authorization.
3. Design an immutable offline event envelope with:
   - organizationId
   - locationId
   - terminalId
   - deviceId
   - cashier/session ID
   - deviceSeq
   - idempotencyKey
   - payloadHash
   - prevHash
   - entryHash
   - signature or signature placeholder
   - capturedAtDevice
   - receivedAtServer
   - eventType
   - schemaVersion
   - payload
   - sync status
4. Ensure offline tickets use provisional local references only unless a country pack explicitly permits final offline fiscal numbering.
5. Preserve final legal/fiscal numbering on the server side through the compliance/fiscal document pipeline.
6. Build server ingestion as the only path from offline event to business event/posting:
   - validate tenant/device/session
   - verify sequence continuity
   - verify hash chain
   - dedupe idempotently
   - reject same key with different payload hash
   - quarantine gaps, forks, stale keys, revoked devices, invalid payloads
   - create audit evidence and notifications
7. Accepted events must route into the ledger-first business-event gateway and existing POS/posting services. Do not let sync handlers write journal, stock, drawer, AR, or cash truth directly.
8. Add conflict/quarantine records and close blockers for:
   - sequence gap
   - duplicate replay
   - payload mismatch
   - forked chain
   - revoked/stale device
   - stale catalog/price policy
   - provisional fiscal receipt not certified
   - unposted accepted event
   - unreconciled offline tender claim
9. Integrate with 013 data trust:
   - expose sync certification status
   - expose provisional receipt blockers
   - expose device conflict blockers
   - expose source-link/posting completeness
10. Add user/operator notifications:
   - cashier: offline mode active, sync pending, sync accepted/rejected
   - manager: device gap, duplicate sync, conflict queue
   - accountant: provisional receipts pending certification
11. Add UI surfaces:
   - POS offline status strip
   - sync queue status
   - conflict badge
   - manager sync/conflict dashboard
   - degraded/offline policy explanation without exposing internals
12. Add typed errors:
   - IDEMPOTENCY_CONFLICT
   - SEQUENCE_CONFLICT
   - DEVICE_REVOKED
   - DEVICE_SIGNATURE_INVALID
   - OFFLINE_POLICY_EXPIRED
   - STALE_REFERENCE_SNAPSHOT
   - AUTHORITY_UNAVAILABLE
   - PROVISIONAL_RECEIPT_PENDING
   - SYSTEM_ERROR
13. Add tests:
   - duplicate replay creates no duplicate sale/posting
   - same idempotency key with different payload is rejected
   - missing deviceSeq creates conflict/quarantine
   - forked hash chain is detected
   - revoked device cannot sync
   - offline sale remains provisional until server certification
   - accepted event gets business event/source link/posting evidence or explicit blocker
   - conflict is visible to operator/accountant
   - no UI imports Prisma
   - no mock/sample production data

Implementation order:
A. Repository audit and architecture report.
B. Prisma schema/migration for offline devices, events, sync batches, conflicts, certifications, and blockers if missing.
C. Service layer:
   - services/pos/offline-sync.service.ts
   - services/pos/offline-sync.schemas.ts
   - tests
D. Server actions:
   - actions/pos/sync.actions.ts
   - protected by RBAC and tenant context
E. Hooks:
   - hooks/posHooks/useOfflineSync.ts
F. UI:
   - components/pos/offline/*
   - integrate minimal visible status into ProfessionalPOSSystem without rewiring unrelated POS logic.
G. Data trust/accountant integration.
H. Verification and report saved in what-next.

Hard rules:
- Do not bypass the event gateway.
- Do not post accounting later in a cron.
- Do not trust device clock for legal period selection.
- Do not assign final fiscal/legal numbers offline unless country-pack policy explicitly permits it.
- Do not use last-write-wins for money, stock, receipt, tender, or fiscal conflicts.
- Do not mutate finalized offline events.
- Do not advance to 015 while CRITICAL or HIGH offline sync gates remain open.

Deliverables:
- Installed skill folder in C:\Users\J COMPUTER\.codex\skills
- Implementation files changed
- Focused tests
- Typecheck and Prisma validation
- Inventory boundary gate
- Static scans for Prisma-in-UI, mock/sample production data, raw action errors
- Saved report:
  what-next/AQSTOQFLOW_014_OFFLINE_POS_SYNC_ARCHITECT_BUILDER_EXECUTION_REPORT_2026-06-15.md

Final output must include:
- selected skill
- files changed
- gates passed
- gates blocked
- verification results
- whether 014 can advance to 015
```

## Execution Path For Maximum Efficiency

### Phase 1: Audit And Architecture

Inspect existing models and services before editing:

- terminal and POS session models;
- current POS sale/refund/void paths;
- receipt/fiscal document path;
- business event gateway;
- accounting posting/source-link service;
- inventory valuation kernel boundary;
- payment reconciliation and exception queues;
- 013 data-trust/accountant portal blockers.

Output:

- offline capability ruling;
- event envelope;
- proposed schema;
- conflict taxonomy;
- UI entry points;
- verification matrix.

### Phase 2: Server Sync Kernel

Implement durable server-side foundations first:

- device registry/enrollment state;
- offline event inbox;
- sync batch;
- conflict/quarantine record;
- sync certificate/read model;
- idempotency and payload hash checks;
- sequence gap and fork detection;
- audit/notification evidence.

Gate:

- duplicate replay creates no duplicate posting;
- payload mismatch is rejected;
- gaps/forks are quarantined;
- accepted event has terminal status.

### Phase 3: One Vertical POS Sale Slice

Implement one complete, narrow offline sale path:

- local/provisional sale event envelope;
- sync ingestion;
- accepted event routes to existing business event/POS/posting path;
- receipt remains provisional until server certification;
- conflict appears in manager/accountant surfaces.

Gate:

- no direct stock/ledger/drawer mutation in sync handler;
- final fiscal numbering remains server-controlled;
- accountant portal sees blockers/certification state.

### Phase 4: UI And Operator Workflow

Add visible status:

- POS offline strip;
- pending sync count;
- last successful sync;
- conflict badge;
- manager conflict queue;
- accountant provisional receipt blocker.

Gate:

- loading, empty, error, permission-denied, degraded/offline, retry, and stale/as-of states exist.

### Phase 5: Hardening And Release

Run:

```powershell
npm test -- --runTestsByPath services/pos/__tests__/offline-sync.service.test.ts actions/pos/__tests__/sync.actions.test.ts --runInBand
npm run typecheck
npm run prisma:validate
npm run inventory:boundary
rg -n "@/prisma|PrismaClient|new PrismaClient" components/pos hooks/posHooks actions/pos
rg -n "faker|Math\.random\(|mock|sample|dummy|lorem|TODO estimate|\?\? 0|\|\| 0" services/pos actions/pos hooks/posHooks components/pos
rg -n "throw new Error|return \{ error:.*message|error: any" actions/pos
```

Only advance to 015 if no CRITICAL or HIGH 014 gates remain.

## Moat Created

The moat is not "offline mode" alone. Many products can queue data.

The real moat is:

- device-level tamper evidence;
- offline fiscal-numbering safety;
- deterministic replay;
- quarantine and conflict workflow;
- ledger-first ingestion;
- accountant-visible certification blockers;
- OHADA-aware provisional receipt handling;
- fraud controls that survive network loss.

That combination is difficult to copy because it requires POS, accounting, compliance, payment reconciliation, inventory, RBAC, audit, and UX to work together.

## Acceptance Criteria

014 is complete only when:

- offline events are immutable and hash-chained;
- server ingestion is idempotent and gap-aware;
- final fiscal/legal numbering remains server/country-policy controlled;
- accepted offline events route through the event and ledger pipeline;
- conflicts are visible, auditable, and block close/certification;
- POS users see clear offline/degraded/sync states;
- accountants see provisional receipt and sync blockers;
- tests prove duplicate replay, payload mismatch, sequence gap, fork detection, revoked device, and certification gating.

