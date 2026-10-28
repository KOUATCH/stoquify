# Phase 3 / Slice 8 Selection Report: Workflow Assurance Multi-Finding Contract Foundation

Date: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Orchestrator: `stoquify-referral-war-room-orchestrator`  
Selected pillar skill: `stoquify-cash-leakage-radar`  
Supporting skills: `004-aqstoqflow-business-event-gateway`, `stoquify-release-evidence-ratchet`

## Decision

Select one contract-only registry foundation slice: represent one server-owned Workflow Assurance definition execution as one aggregate result plus zero through 100 normalized source findings.

The contract must preserve the existing single-result runner shape, require explicit source identity for every source finding, bind every finding to one tenant/check/version execution identity, order findings deterministically, and reject duplicate logical identities before any future persistence begins.

This slice does not change registry execution, check-run persistence, incident creation, incident lifecycle, worker state, scheduler behavior, detector activation, or product surfaces.

## Evidence And Dependency Review

- The live runner contract returns exactly one `WorkflowAssuranceCheckResult` per definition.
- The registry loop writes one check run, invokes one incident upsert, and exposes one optional incident ID per definition execution.
- The certified cash-shortage batch returns zero through 100 event-specific evaluations in deterministic `(recordedAt, eventId)` order.
- Prisma can associate multiple incidents with one check run, but the service does not yet validate or persist a multi-finding set transactionally.
- Stable incident identity is already tenant/check/version/source-type/source-ID based; mutable status, severity, evidence, and source hash do not define a new case.
- Source-event eligibility is now complete for future POS shift closes: the source transaction marks the event `APPLIED` and exact replay verifies processing evidence.
- Direct money-protection resolution and suppression remain unsafe because the generic incident lifecycle lacks owning-source recheck, a complete transition matrix, tenant-safe assignment, and full maker-checker separation.
- The scheduler remains a declarative plan. It has no durable checkpoint, lease fencing, frozen window, retry, overlap, or dead-letter runtime.
- The configured PostgreSQL runtime reports all 23 migrations applied and no active cash-shortage policy, eligible close event, incident, or cash-shortage registry definition.

## Why This Slice Comes First

1. The registry cannot safely persist one finding per POS source until it has a bounded collection contract.
2. A collection must be validated in full before a later transaction can write its aggregate run and incidents atomically.
3. Worker checkpointing depends on idempotent multi-finding persistence and must not invent a parallel case path.
4. Scheduler activation depends on the worker and remains downstream.
5. A contract-only slice creates no money-protection case, so it does not expose the current incident closure weaknesses.

## Authorized Scope

- Add a named maximum of 100 source findings per definition execution.
- Add typed aggregate-execution and source-finding input/output contracts.
- Adapt the current single-result shape as one aggregate plus one ordinal-zero source finding so later integration can preserve existing check-run and incident behavior.
- Rebind aggregate and finding identity to one explicit organization, check key, and positive definition version supplied by the caller.
- Require nonblank `sourceType` and `sourceId` on every source finding; normalized output must retain a source hash and stable case fingerprint.
- Normalize the complete collection, reject duplicate logical fingerprints, sort a copied collection by explicit numeric ordinal, and require contiguous zero-based ordinals.
- Add focused contract tests for zero, one, many, unordered, invalid-ordinal, duplicate, blank-identity, over-limit, identity-rebinding, immutability, and legacy single-result cases.
- Refresh only the war-room status and dated Slice 8 evidence reports.

## Explicit Non-Goals

- No registry runner return-type migration or registry service change.
- No check-run, finding, incident, event, audit, outbox, notification, or checkpoint write.
- No Prisma model, migration, definition registration, cash-shortage adapter, production threshold, seed, or backfill.
- No incident transition, assignment, permission, source-recheck, suppression, resolution, or waiver change.
- No worker, lease, watermark, overlap, retry, dead-letter, cron, or scheduler activation.
- No route, action, dashboard, control-tower projection, inventory behavior, predictive scoring, AI, or WhatsApp behavior.

## Expected Files

- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/__tests__/assurance-registry-contracts.test.ts`
- `what-next/referrals/WORKFLOW_ASSURANCE_MULTI_FINDING_CONTRACT_REPORT_2026-07-20.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

```text
npm test -- --runInBand services/assurance/__tests__/assurance-registry-contracts.test.ts
npm run typecheck
npx eslint services/assurance/assurance-registry-contracts.ts services/assurance/__tests__/assurance-registry-contracts.test.ts
npm run workflow:assurance:release-gate
npm run workflow:assurance:runtime-check
npm run service:boundary:fail
```

## Risks And Guardrails

- Aggregate execution truth and individual source findings must remain separate; zero findings must still mean the definition executed.
- Duplicate logical identities must fail the whole contract. They must never be merged, dropped, or resolved by input order.
- Sorting must not use locale-sensitive comparison because execution order is evidence.
- Permission denial, missing runner, and runner-wide failure remain aggregate outcomes with zero source findings.
- Per-source `blocked` outcomes may later be source findings, but they require explicit stable source identity.
- This contract does not make persistence atomic or idempotent. Registry service integration requires a separate selected slice and transaction design.
- The POS shortage observation hash must eventually cover approved policy identity and evaluation semantics as well as source-event payload evidence.
- No case may enter the generic incident lifecycle until money-protection terminal-command controls are separately certified.

## Handoff

Run `/stoquify-leakage-radar` for this selected contract-only slice, certify it, then return control to `/stoquify-referral-war-room` without inferring authorization for persistence, lifecycle, worker, scheduler, or product-surface work.
