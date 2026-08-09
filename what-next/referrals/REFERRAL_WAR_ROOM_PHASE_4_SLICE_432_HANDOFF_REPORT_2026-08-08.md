# Referral War Room Phase 4 Slice 432 Handoff Report

Date: 2026-08-08
From: `/caveman full` and `stoquify-referral-war-room-orchestrator`
To: `stoquify-accountant-close-portal`

## Objective

Implement one source-owned command that lets a freshly authenticated authorized accountant accept one fully validated missing-proof response and atomically resolve its finding.

## Authority Packet

- Home organization, actor, permissions, and fresh-auth evidence come only from the protected action context.
- Optional client organization is a target hint only; `resolveAccountantClientAccess` owns the target tenant.
- Delegated access requires `REVIEW`; `READ_ONLY` must fail.
- The service clock owns acceptance and resolution time.
- The accepting actor must be active in the home tenant and must not be the response author.

## Evidence Packet

- Slice 431 queue contract/service proves the request/response relationship vocabulary and target access boundary.
- Slice 429 response mapper and serializable transaction helper are reusable.
- `CloseAssuranceFinding` already supports resolution state and attribution.
- `AccountantComment` can persist typed acceptance evidence without schema change.
- Existing close audit and business-event helpers must be used inside the same transaction.

## Required Verification

- Focused action tests for permission, fresh-auth ordering/evidence, protected authority, and path revalidation.
- Focused service tests for RBAC, actor/access denial, corruption, self-acceptance, lifecycle state, exact replay, conflicting replay, compare-and-set failure, atomic evidence, and redaction.
- Report-trust mutation tests for every authority, relationship, state, idempotency, audit/event, and redaction control.
- Combined Slice 429-432 regression, typecheck, scoped ESLint, live gate, conflict scan, and diff hygiene.

## Stop Conditions

Stop if the implementation requires a migration, weakens the Slice 431 queue, permits caller-owned authority/time, exposes raw metadata or text in event evidence, bypasses delegated `REVIEW`, or turns acceptance into close certification.
