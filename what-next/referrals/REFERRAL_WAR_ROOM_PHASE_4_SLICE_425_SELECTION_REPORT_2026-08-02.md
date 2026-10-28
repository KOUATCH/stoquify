# Phase 4 Slice 425 Selection Report

Generated: 2026-08-02
Phase: Phase 4 - Accountant Portal And Close Pack
Selected slice: Close-Waiver Service-Owned Verified Fresh-Authentication Evidence

## Decision

Select close-waiver approval fresh-authentication enforcement. The protected action requests fresh authentication but synthesizes `Date.now()`, while `approveCloseWaiver` accepts `lastAuthAt` in its control type and never validates it. Outer protection currently limits the public action, but service-owned freshness truth is absent.

## Candidate Ranking

1. Waiver verified fresh-auth plus service enforcement: high control value, existing action/service contract, bounded implementation.
2. Missing-proof request lifecycle: high product value, but needs persistence, audit, notifications, and action-center design.
3. Grant identity and retention: high integrity value, but needs schema ownership and deletion-policy decisions.
4. Portfolio/register pagination: useful scale contract, lower immediate control risk.
5. Organization-timezone policy: important, but requires product-wide temporal policy.

## Scope

- Reuse one claim-bound close fresh-auth verifier for certified pack and waiver actions.
- Make waiver freshness window explicit at 300 seconds.
- Verify evidence before waiver input parsing.
- Pass exact protected-session `lastAuthAt` to `approveCloseWaiver`.
- Enforce missing, invalid, future, and stale evidence in the service before transaction work.
- Add focused action and service tests.
- Add an AST-bound report-trust check covering public wrapper, immutable bindings, ordering, exact payload, service preflight, and fail-closed policy.
- Regenerate readiness artifacts and program evidence.

## Non-Scope

- Waiver workflow state, segregation-of-duties rules, audit/event payloads, schema, migration, route, or UI behavior.
- Accountant identity retention, pagination, timezone policy, missing-proof requests, external sharing, AI/WhatsApp authority, or POS activation.

## Acceptance Criteria

- Action rejects missing or mismatched evidence before schema parsing.
- Client input cannot provide tenant, actor, permissions, authentication time, claims, or service clock.
- Service rejects missing, nonnumeric, nonpositive, future, and older-than-five-minute evidence before DB access.
- Exact boundary timestamps are accepted.
- Existing SoD behavior remains intact after valid freshness evidence.
- Gate rejects synthetic time, late verification, direct-context shortcuts, mutable bindings, wrapper bypass, missing service enforcement, and freshness-policy weakening.
- Focused and expanded tests, typecheck, lint, Prisma validation, syntax, hygiene, generated gate, and independent review pass.

## Baseline

`npm test -- --runInBand actions/accounting/__tests__/close-assurance.actions.test.ts services/accounting/__tests__/close-assurance.service.test.ts scripts/__tests__/report-trust-export-gate.test.js`

Result: 3 suites passed, 57 tests passed while synthetic action time and absent service enforcement remained.

## Next Skill

Continue with `013-aqstoqflow-data-trust-accountant-portal` under `stoquify-referral-war-room-orchestrator` control.
