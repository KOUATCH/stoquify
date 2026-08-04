# Accountant Close Portal Waiver Fresh-Auth Slice 425 Report

Generated: 2026-08-02
Phase: Phase 4 - Accountant Portal And Close Pack
Slice: 425 - Close-Waiver Service-Owned Verified Fresh-Authentication Evidence
Decision: certified for current worktree; deployment remains NO-GO

## Before

The public waiver action requested fresh authentication but synthesized the service timestamp with `Date.now()`. The owning service accepted `lastAuthAt` without validating it, allowed a missing approver, and exposed a per-call clock override through its shared control contract. Existing tests passed despite those gaps, and the report-trust gate did not classify the waiver boundary.

## Implemented

- Reused the claim-bound close fresh-auth verifier for waiver and certified-pack actions.
- Verification remains the waiver handler's first statement and precedes client-input parsing.
- The action passes fresh-auth evidence bound to the protected actor, organization, and exact session timestamp.
- Added a waiver-specific service control type that excludes the shared `now` override.
- The service owns approval time with `new Date()` and validates actor presence, evidence presence, actor identity, organization identity, timestamp validity, future time, and the five-minute maximum age before database work.
- The exact five-minute boundary is accepted; older evidence is rejected.
- The verified actor is used for segregation of duties, persistence, audit, event attribution, and payload attribution.
- Waiver state transitions, schemas, routes, UI, and certified-pack behavior remain otherwise unchanged.

## Release Gate

Added `close_waiver_service_owned_verified_fresh_auth_evidence` to the report-trust gate. Its TypeScript AST proof requires:

- one immutable public protected action with `accounting.close.waiver.approve` and a 300-second freshness policy;
- verification before parsing and exact wrapper delegation;
- exact tenant, actor, permission, organization-bound evidence, and timestamp payloads;
- a service-owned clock with no per-call override;
- one fail-closed service preflight before transaction work;
- mandatory actor and organization binding;
- exact approver and approval-time persistence;
- no post-validation clock alias, reassignment, mutation, synthetic time, direct-context shortcut, spread, mutable binding, or wrapper bypass.

## Independent Review

The initial independent review found two P2 gaps: the service clock and approver were not fully fail-closed, and the AST proof could certify nested post-validation `Date` mutation. The waiver contract, runtime tests, AST checker, and mutation fixtures were hardened. The final narrow recheck returned `closed`.

## Verification

- Baseline: 3 suites, 57 tests passed while synthetic action time and absent service enforcement remained.
- Final focused action/service/gate: 3 suites, 93 tests passed.
- Final expanded regression: 9 suites, 153 tests passed.
- TypeScript typecheck: passed.
- Scoped ESLint: passed.
- Prisma validation: passed.
- JavaScript syntax checks: passed.
- Scoped `git diff --check`: passed, with only the repository's existing CRLF normalization warning.
- Report-trust readiness: 20/20 ready, zero blockers.
- Rejected-patch artifact check: clean.
- Independent reviewer recheck: `closed`.

## Files

- `actions/accounting/close-assurance.actions.ts`
- `actions/accounting/__tests__/close-assurance.actions.test.ts`
- `services/accounting/close-assurance.service.ts`
- `services/accounting/__tests__/close-assurance.service.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- `what-next/report-trust-export-readiness.md`
- `what-next/report-trust-export-readiness.json`
- war-room selection, status, and release-evidence reports

## Boundaries

This certification proves the current-worktree public waiver path, service freshness policy, identity binding, actor attribution, and static release evidence. It does not certify deployment, migrations, accountant-access identity retention, pagination, timezone policy, missing-proof workflow, external sharing, AI/WhatsApp authority, or POS cash-shortage activation.

## Next Skill

Run `stoquify-referral-war-room-orchestrator` for a fresh Phase 4 candidate audit, consulting `013-aqstoqflow-data-trust-accountant-portal`. No Slice 426 is preselected.
