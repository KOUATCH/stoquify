# Accountant Close Portal Trust-Pack Fresh Auth Slice 422 Report

Date: 2026-08-01
Skill: `stoquify-accountant-close-portal`
Control plane: `stoquify-referral-war-room-orchestrator`

## Decision

Slice 422 is implementation-certified in the current worktree for server-verified fresh-authentication evidence on accountant trust-pack exports. This is not deployment certification for the broader accountant-access foundation.

## Before

- The protected export action required authentication no older than five minutes.
- The action then passed `new Date()` to the service-owned `accounting.export` policy.
- The outer protection blocked stale sessions, but the service freshness input was synthetic and made its own age check tautological.
- The report-trust gate did not prove that persisted, claim-bound authentication evidence reached the service.

## Implementation

- The export action now obtains the exact `ctx.freshAuth.lastAuthAt` before parsing client input or resolving delegated client access.
- Evidence fails closed when it is missing, belongs to another user or tenant, has another assurance organization, has missing or nonnumeric assurance level, is below password assurance, or disagrees with the protected claims timestamp.
- The verified `Date` object is passed unchanged to `exportAccountantTrustPack`.
- Client input still cannot supply organization, actor, permissions, fresh-auth evidence, or claims.
- The report-trust release gate now parses the action with the TypeScript AST and verifies the protected export handler, five-minute policy, operation order, verified helper conditions, exact timestamp propagation, and absence of authentication claims in service input.
- Gate tests prove synthetic time, delegated-resolution-before-verification, and spread or aliased authentication payloads are blocked, while unrelated current-time construction outside the trust-pack handler does not false-block.
- Independent read-only review found one P2 structural-gate bypass for spread authentication payloads. The gate now rejects spreads, unexpected export-input properties, and `freshAuth` or `claims` references, and the new negative regression passes.

## Selected Files

- `actions/accounting/data-trust.actions.ts`
- `actions/accounting/__tests__/data-trust.actions.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- `what-next/report-trust-export-readiness.md`
- `what-next/report-trust-export-readiness.json`

All four tracked implementation/test files already contained earlier Phase 4 modifications. This report attributes only the Slice 422 fresh-auth and structural-gate additions. No shared protection, auth-session, service, schema, migration, route, component, or navigation file was changed by this slice.

## Verification

- Pre-edit action/protection baseline: 3 suites / 24 tests passed.
- Pre-edit gate baseline: 1 suite / 3 tests passed.
- Focused Slice 422 tests: 2 suites / 17 tests passed.
- Related authentication, protection, accountant-access, data-trust, sensitive-action, and gate regression: 7 suites / 75 tests passed.
- Exact accountant portal route: 1 suite / 3 tests passed with Jest literal-path mode.
- Full TypeScript typecheck passed.
- Scoped ESLint passed with zero errors.
- Report-trust export policy gate passed 18/18 with zero blockers and regenerated both readiness artifacts.
- Structural ordering, narrowed production caller, generated JSON, whitespace, line-ending, and patch-reject checks passed.
- Build and Prisma validation were not rerun because this slice changes no route runtime, schema, or migration contract; route regression and full typecheck cover the selected boundary.

## Release Boundary

- Slice 422 current-worktree contract: **PASS**
- Accountant-access repository/deployment ownership: **NO-GO**
- Production migration readiness: **NO-GO**
- External sharing, AI/WhatsApp authority, and POS cash-shortage activation: **NOT AUTHORIZED**

The broader NO-GO remains because identity foreign keys and retention policy, database lifecycle constraints, tracked migration ownership, exact-revision PostgreSQL deployment evidence, future-effective grant semantics, and missing-proof lifecycle remain unresolved.

## Next Handoff

Return to `stoquify-referral-war-room-orchestrator` for a fresh Phase 4 evidence and risk audit. No Slice 423 is preselected.
