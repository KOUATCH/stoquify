# Referral War Room Phase 4 Slice 422 Selection Report

Date: 2026-08-01
Orchestrator: `stoquify-referral-war-room-orchestrator`
Pillar skill: `stoquify-accountant-close-portal`
Supporting skills: `013-aqstoqflow-data-trust-accountant-portal`, `aqstoqflow-release-verification-foundation`

## Selected Slice

Phase 4 / Slice 422: Accountant Trust-Pack Verified Fresh-Authentication Evidence.

## Decision

The accountant trust-pack export is protected by a five-minute fresh-authentication boundary, but its handler discards the verified session evidence and passes `new Date()` to the service-owned sensitive-action policy. The outer `protect` guard currently blocks stale sessions, so this is not an immediate stale-auth bypass through the action. It is still a defense-in-depth and evidence-integrity defect: the service policy receives invocation time instead of the persisted authentication time, making its independent freshness check tautological and severing the control evidence chain from the verified session.

Slice 422 will bind the trust-pack export to `ctx.freshAuth` and add a release ratchet so synthetic or unbound authentication evidence cannot certify.

## Candidate Ranking

| Rank | Candidate | Severity | Dependency readiness | Blast radius | Narrow certification |
| --- | --- | --- | --- | --- | --- |
| 1 | Trust-pack verified fresh-auth evidence | high evidence risk | ready | low | strong |
| 2 | Future-effective and fully-past grant semantics | medium | mostly ready | low-medium | strong |
| 3 | Accountant identity foreign keys and migration ownership | critical structural risk | not ready | medium-high | weak |
| 4 | Missing-proof request lifecycle | high roadmap value | not ready | high | weak |

Identity integrity remains the most severe production-readiness risk, but it requires retention policy, orphan preflight/backfill, foreign-key ownership, migration deployment, and repository-ownership decisions. The missing-proof lifecycle spans persistence, commands, events, evidence fulfillment, owner routing, and multiple product surfaces. Neither is safe to compress into this slice.

## Selected Invariants

- The export remains protected by `accounting.exports.create` and a 300-second fresh-authentication requirement.
- The action derives authentication evidence only from the server-owned protected action context.
- Fresh-auth claims must match the active RBAC user and home tenant.
- The assurance organization must match the home tenant and the assurance level must be at least password assurance.
- The claims timestamp must exactly match the verified `Date` exposed by `protect`.
- Missing or mismatched evidence fails before delegated client resolution or trust-pack service execution.
- The exact verified timestamp, without a current-time fallback, reaches the service-owned sensitive-action policy.
- Client input cannot supply organization, actor, permission, or authentication evidence.
- Delegated `EXPORT` capability resolution, redaction, content hashing, audit history, and export events remain unchanged.
- The report-trust export gate must reject the prior synthetic-time implementation.

## Expected Files

- `actions/accounting/data-trust.actions.ts`
- `actions/accounting/__tests__/data-trust.actions.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`

All four files already contain unrelated or earlier Phase 4 modifications. The implementation must preserve those changes and add only the selected authentication-evidence boundary.

## Pre-Edit Evidence

- Data-trust action, shared protect, and data-trust service baseline: 3 suites / 24 tests passed.
- Report-trust export gate baseline: 1 suite / 3 tests passed.
- The passing gate is insufficient evidence because it does not inspect verified timestamp propagation.
- An independent security audit classified the issue as a P2 provenance and defense-in-depth defect and confirmed the action as the sole production caller.
- A separate candidate review ranked this slice first for severity, readiness, low blast radius, and certifiability.
- The available code graph places the action and service in separate communities, while the missing-proof candidate crosses several additional ownership boundaries.

## Verification Plan

- Focused data-trust action tests for exact timestamp propagation and cross-context fail-closed behavior.
- Focused report-trust export gate tests, including a synthetic-time negative fixture.
- Shared `protect`, auth-session, data-trust service, and sensitive-action regressions.
- `npm run typecheck`.
- Scoped ESLint for the TypeScript source and test.
- `npm run report:trust:export:gate`.
- Static ordering, server-owned evidence, no-current-time-fallback, delegated capability, client-input, redaction/export, whitespace, diff, and patch-reject gates.
- Independent read-only review before certification.

## Non-Goals

- No change to the shared `protect`, auth-session, sensitive-action, or data-trust service contracts.
- No grant schema, migration, identity foreign key, lifecycle, or temporal-status changes.
- No missing-proof request workflow, close-pack expansion, UI, route, navigation, or external-sharing work.
- No AI/copilot or WhatsApp authority.
- No POS cash-shortage production activation.

## Handoff

Run `stoquify-accountant-close-portal` for the four-file implementation under this selection boundary. Return to the war-room orchestrator for certification and fresh Slice 423 selection only after every focused gate passes.
