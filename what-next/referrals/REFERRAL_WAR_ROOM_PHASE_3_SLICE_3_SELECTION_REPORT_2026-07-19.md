# Referral War Room Phase 3 Slice 3 Selection Decision

Generated: 2026-07-19  
Program: Stoquify Referral-Worthy Execution Program  
Invocation: `/stoquify-referral-war-room`  
Operating skill: `stoquify-referral-war-room-orchestrator`

## Executive Decision

The war room accepts `pos.shift.closed` schema version 1 as a prospective trusted source and selects exactly one implementation slice:

> **Phase 3 / Slice 3: Stable Workflow Assurance Case Identity Foundation**

Selected operating skill: `stoquify-cash-leakage-radar`  
Shared lifecycle foundation: Workflow Assurance  
Source-contract reference: `004-aqstoqflow-business-event-gateway`

This slice is authorized to make Workflow Assurance incident identity stable across evidence changes and concurrency. It is not authorized to add the POS shortage definition, create Leakage Radar cases, expose a dashboard, change generic resolution policy, implement inventory-loss behavior, or give AI or WhatsApp authority.

## Source Acceptance

The war room accepts the Slice 2 source contract with these boundaries:

- only newly committed `pos.shift.closed` schema-version-1 events are eligible;
- the event payload hash is the source evidence hash;
- all 135 legacy closed or reconciled sessions remain untrusted and excluded;
- transient drawer alerts remain hints and are not durable Leakage Radar cases;
- accepting the source does not authorize a detector or incident creation.

The source foundation passed 29 focused unit/action/UI tests and 6 real PostgreSQL tests, plus focused TypeScript, ESLint, Prisma validation, service-boundary, module-surface, role-cockpit, locale, and diff-integrity checks. Repository deployment readiness remains held because the full TypeScript command did not complete within 304 seconds.

## Evidence Reviewed

- Referral roadmap and war-plan artifacts required by the orchestrator and specialist skill
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_2026-07-19.md`
- `what-next/referrals/POS_SHIFT_CLOSE_EVIDENCE_FOUNDATION_REPORT_2026-07-19.md`
- Live Workflow Assurance registry, normalization, incident lifecycle, Prisma schema, migration, release-gate, and focused tests
- Current graph report, with the limitation that it predates the July 2026 assurance implementation
- Read-only PostgreSQL identity preflight

## Why This Slice Is Selected

The selected Workflow Assurance lifecycle cannot safely receive the future shortage rule yet. Its current fingerprint includes mutable fields including `status`, `severity`, `sourceHash`, and `recommendedAction`. Incident lookup also includes both fingerprint and source hash, while reopen logic expects the fingerprint to survive a source-hash change.

That contradiction produces three risks:

- changed evidence for one active source can create a second incident;
- a resolved case cannot reopen through the normal normalized-result path because its fingerprint changes with the source hash;
- concurrent first detection has no stable database-enforced logical identity to converge on.

Stable identity is therefore a dependency of case creation, not an optional cleanup after detector launch.

## Database Preflight

The war room ran read-only aggregate queries against the configured local PostgreSQL database.

| Check | Count | Decision |
| --- | ---: | --- |
| Existing Workflow Assurance incidents | 0 | Prospective identity migration is safe |
| Duplicate groups under the proposed logical identity | 0 | No merge or adjudication is required |
| Duplicate groups under the proposed stable fingerprint | 0 | No fingerprint collision cleanup is required |

No row was changed. The migration must still fail closed if duplicate logical identities appear between this preflight and migration execution.

## Authorized Identity Contract

The logical identity is:

```text
organizationId + checkKey + definitionVersion + sourceType + sourceId
```

The version-1 fingerprint is a deterministic SHA-256 hash of exactly:

```text
identityVersion + organizationId + checkKey + definitionVersion + sourceType + sourceId
```

`sourceHash` remains the changing evidence version. Status, severity, recommended action, evidence payload, and evidence grade are mutable case observations and must not participate in identity.

The registry owns `definitionVersion`. Runner output must not be able to silently choose or spoof the version used for incident identity.

## Migration Decision

One narrow Prisma migration is authorized.

- Replace `workflow_assurance_incident_dedupe_key` with a unique logical-identity key over organization, check key, definition version, source type, and source ID.
- Add `SOURCE_CHANGED` to the incident-event enum for explicit evidence-drift history.
- Fail before replacing the index if duplicate logical identities exist.
- Do not backfill, merge, delete, or synthetically upgrade incident rows.

Direct logical-column uniqueness is preferred to uniqueness on the fingerprint alone because it is inspectable and does not rely on hash collision assumptions.

## Authorized Lifecycle Behavior

- Same identity and same source hash: retain one row, increment occurrence metadata, emit the existing duplicate/severity history as applicable, and do not send another creation alert.
- Same identity and changed source hash while active: update the same row, retain active status, record `SOURCE_CHANGED` plus audit evidence, and do not send a new-case alert.
- Same identity and changed source hash after `RESOLVED`, `WAIVED`, or `CLOSED`: reopen the same row, clear terminal-resolution fields, record reopen/evidence history, and emit one reopen alert.
- Same identity and changed source hash while `SUPPRESSED`: preserve suppression, update evidence, and record `SOURCE_CHANGED`; do not silently reopen or alert.
- Changed definition version: create a distinct logical identity so rule semantics can evolve without rewriting prior case history.

The database constraint must prevent duplicate identities. The service must recover from expected unique or serialization races with a bounded retry or committed-row reread; it must not swallow unrelated database failures.

## Expected Files

- `prisma/schema.prisma`
- one new migration under `prisma/migrations/`
- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/assurance-incident-contracts.ts`
- `services/assurance/assurance-incident.service.ts`
- `services/assurance/__tests__/assurance-registry-contracts.test.ts`
- `services/assurance/__tests__/assurance-incident.service.test.ts`
- one focused real-PostgreSQL identity/concurrency test if the existing suite cannot certify races
- `scripts/workflow-assurance-release-gate.js` and its focused test only if the gate encodes the changed schema contract

No POS source file, shortage-rule definition, action, dashboard, inventory service, generic case-resolution command, AI surface, or WhatsApp surface is expected to change.

## Verification Plan

Focused tests must prove:

- fingerprint stability across source hash, status, severity, recommended action, and evidence changes;
- fingerprint change for tenant, check key, definition version, source type, or source ID changes;
- active source drift updates one incident and records `SOURCE_CHANGED` without a creation alert;
- finalized source drift reopens the same incident exactly once;
- suppressed source drift remains suppressed;
- a definition-version change creates a new identity;
- concurrent first detection converges on one incident and one creation alert in real PostgreSQL;
- migration duplicate preflight fails closed and Prisma schema validation passes.

Required verification after implementation includes the focused Jest suites, a real-PostgreSQL disposable-schema certification, Prisma validation, focused TypeScript and ESLint, the Workflow Assurance release gate, service-boundary gate, module-surface ratchet, and role-cockpit gate. Full repository TypeScript remains a deployment requirement and may not be waived.

## Stop Conditions

Stop and return to the war room if:

- pre-existing logical duplicates appear and require adjudication;
- stable identity requires rewriting or deleting historical incidents;
- registry definition version cannot be made server-owned without broad runner refactoring;
- concurrency cannot converge without a wider transaction redesign;
- implementation requires the shortage detector, generic resolution hardening, UI, or cross-domain case creation;
- unrelated dirty-worktree changes cannot be preserved.

## Selection Outcome

Phase 3 / Slice 3 is **selected for implementation** under `stoquify-cash-leakage-radar`, limited to the shared stable case-identity foundation.

After focused certification, return to `/stoquify-referral-war-room`. The war room must separately decide whether identity evidence is sufficient to select resolution-policy hardening or the first deterministic shortage-rule contract.
