---
name: 014-aqstoqflow-offline-pos-sync-architect-builder
description: Architect and implement the AqStoqFlow 014 offline POS/device sync foundation. Use when building, repairing, auditing, or completing offline POS sync for OHADA SMBs with device identity, immutable queued events, sequence/hash-chain validation, provisional receipt safety, conflict quarantine, server-side ingestion, RBAC, notifications, data-trust/accountant blockers, and gates that prevent offline mode from bypassing POS, inventory, payment, compliance, accounting, or ledger controls.
---

# 014 Offline POS Sync Architect Builder

## Parent Skill

Use this as a companion to `014-aqstoqflow-offline-pos-sync`; it extends that numbered suite step and must not replace it.

Also load the relevant companion skills when their domain is touched:

- `offline-first-pos-inventory-sync`
- `stockflow-enterprise-pos`
- `ledger-first-business-events`
- `ohada-compliance-oracle`
- `enterprise-fraud-and-controls`
- `stockflow-data-trust-certifier`
- `enterprise-error-handling`

## Mission

Build the offline POS/device sync foundation as a controlled vertical slice. Devices are controlled witnesses; the server event store, compliance pipeline, posting gateway, and ledger remain the sources of truth.

The safe first target is:

`offline capture -> sync batch -> immutable event inbox -> accepted/quarantined status -> business-event evidence or explicit close blocker -> POS/accountant-visible status`

## Required Repo Context

Before editing, inspect the current repo surfaces that exist:

- `prisma/schema.prisma`
- `services/pos/*`
- `services/events/*`
- `services/accounting/posting.service.ts`
- `services/accounting/source-link.service.ts`
- `services/compliance/*`
- `services/payments/*`
- `services/inventory/*`
- `actions/pos/*`
- `hooks/posHooks/*`
- `components/pos/*`
- `app/[locale]/(dashboard)/dashboard/pos/*`
- `what-next/AQSTOQFLOW_013_DATA_TRUST_ACCOUNTANT_PORTAL_EXECUTION_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`

If the current repo lacks a downstream POS posting/certification hook, record accepted offline sales as `PENDING_REPLAY` or `BLOCKED` with an explicit blocker. Do not invent a direct stock, drawer, journal, AR, or fiscal-number mutation path.

## Implementation Workflow

1. Audit the current POS/event/accounting/compliance surfaces and name the exact active slice.
2. Add or repair schema for device registry, sync batches, immutable offline events, conflict/quarantine records, and sync certification/blockers.
3. Implement `services/pos/offline-sync.schemas.ts` and `services/pos/offline-sync.service.ts`.
4. Ingest batches in one server-side path:
   - validate tenant, device, terminal, location, cashier/session, and RBAC context;
   - verify active device state;
   - verify `(deviceId, deviceSeq)` continuity;
   - verify `prevHash`, `payloadHash`, and `entryHash`;
   - dedupe idempotently;
   - reject same key with different payload hash;
   - quarantine gaps, forks, revoked devices, stale policies, invalid payloads, and signature failures;
   - create business event/audit/outbox evidence for accepted or conflicted envelopes.
5. Add protected `actions/pos/sync.actions.ts` with safe action results and client-safe errors.
6. Add `hooks/posHooks/useOfflineSync.ts` for dashboard and sync actions.
7. Add `components/pos/offline/*` and integrate a minimal status strip into `ProfessionalPOSSystem` without rewiring unrelated POS logic.
8. Integrate data-trust/accountant visibility with sync status, provisional receipt blockers, conflict counts, as-of metadata, and close blockers.
9. Add focused tests for duplicate replay, payload mismatch, sequence gaps, hash-chain fork, revoked devices, tenant/RBAC denial, and visible conflict/blocker output.
10. Save an execution report in `what-next/`.

For the detailed build map, read `references/offline-sync-implementation-plan.md`.

## Hard Gates

- Offline event replay cannot duplicate sales, postings, stock movements, drawer movements, payment claims, or fiscal documents.
- Devices cannot assign final fiscal/legal numbers unless an effective country pack explicitly permits it.
- Sync ingestion cannot write journal, stock, drawer, customer AR, or cash truth directly.
- Every accepted economic consequence must route through the ledger-first event gateway or remain explicitly blocked.
- Same idempotency key with a different payload hash is `IDEMPOTENCY_CONFLICT`.
- Missing or non-contiguous sequence is `SEQUENCE_CONFLICT` and creates a visible conflict/quarantine record.
- Revoked, stale, or invalid devices cannot sync.
- Conflicts and provisional receipts are visible to cashiers/managers/accountants and block close/certification until resolved.
- Server actions return stable `{ ok: true, data }` or `{ ok: false, error }` responses; no raw errors cross the boundary.
- UI/hook code must not import Prisma or services directly.

## Required Typed Errors

Use existing taxonomy where available. Add or map:

- `IDEMPOTENCY_CONFLICT`
- `SEQUENCE_CONFLICT`
- `DEVICE_REVOKED`
- `DEVICE_SIGNATURE_INVALID`
- `OFFLINE_POLICY_EXPIRED`
- `STALE_REFERENCE_SNAPSHOT`
- `AUTHORITY_UNAVAILABLE`
- `PROVISIONAL_RECEIPT_PENDING`
- `SYSTEM_ERROR`

## Verification

Run the strongest available focused checks:

```powershell
npm test -- --runTestsByPath services/pos/__tests__/offline-sync.service.test.ts actions/pos/__tests__/sync.actions.test.ts --runInBand
npm run typecheck
npm run prisma:validate
npm run inventory:boundary
rg -n "@/prisma|PrismaClient|new PrismaClient" components/pos hooks/posHooks actions/pos
rg -n "faker|Math\.random\(|mock|sample|dummy|lorem|TODO estimate|\?\? 0|\|\| 0" services/pos actions/pos hooks/posHooks components/pos
rg -n "throw new Error|return \{ error:.*message|error: any" actions/pos
```

If a command is unavailable or blocked by pre-existing failures, record the exact limitation in the report.

## Output Contract

End with:

- selected skill: `014-aqstoqflow-offline-pos-sync-architect-builder`
- parent skill: `014-aqstoqflow-offline-pos-sync`
- files changed
- gates passed
- gates blocked
- verification result
- whether 014 can advance to 015
