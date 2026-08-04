# Phase 4 Slice 424 Selection Report

Generated: 2026-08-02
Program: Stoquify Referral-Worthy Execution Program
Phase: Phase 4 - Accountant Portal And Close Pack
Selected slice: Certified Close-Pack Verified Fresh-Authentication Evidence

## Decision

Select the certified close-pack action boundary for Slice 424. The action requires fresh authentication through `protect`, but currently supplies `new Date()` to `exportClosePack`. That timestamp proves invocation time, not the session authentication event the service is expected to validate.

## Live Evidence

- `actions/accounting/close-assurance.actions.ts` protects `exportCertifiedPack` with `accounting.close.certify` and `freshAuth: { maxAgeSeconds: 300 }`.
- The same handler currently forwards `lastAuthAt: new Date()` instead of verified context evidence.
- `services/accounting/close-assurance-pack.service.ts` treats `control.lastAuthAt` as certification freshness evidence.
- The focused action test accepts any `Date`, so it cannot distinguish verified evidence from a synthetic timestamp.
- The report-trust release gate certifies accountant trust-pack freshness but does not yet certify the close-pack action boundary.

## Candidate Ranking

1. Certified close-pack fresh-auth provenance: high trust impact, low implementation breadth, existing service contract, deterministic verification.
2. Missing-proof requests: high product value, but requires a new lifecycle, persistence, action-center integration, and audit design.
3. Grant actor identity and retention policy: high integrity value, but requires schema ownership and deletion-policy decisions.
4. Portfolio/register pagination: useful scale control, but lower immediate trust impact.
5. Organization-timezone policy: important temporal semantics, but requires an explicit product-wide policy.

## Scope

- Verify fresh-auth claims against the protected action context before parsing client input or invoking the service.
- Forward the exact verified `ctx.freshAuth.lastAuthAt` value to certified close-pack export.
- Add focused action tests for exact evidence forwarding and fail-closed identity, tenant, assurance, and timestamp mismatches.
- Extend the AST-bound report-trust gate and adversarial tests to reject synthetic time, late verification, spread leakage, and non-exact control payloads.
- Regenerate report-trust readiness artifacts and update program evidence.

## Explicit Non-Scope

- Draft close-pack behavior.
- Close-waiver fresh-auth provenance.
- Schema, migration, service, route, or UI changes.
- Missing-proof workflows, pagination, timezone policy, external sharing, AI/WhatsApp authority, or POS cash-shortage activation.

## Acceptance Criteria

- Certified export fails closed when fresh-auth evidence is absent or mismatched.
- Verification precedes input parsing and service invocation.
- `exportClosePack` receives only actor identity, permissions, and the exact verified timestamp in its control object.
- Client input cannot supply or override authentication evidence.
- The focused release gate reports the new control ready and fails its adversarial fixtures.
- Focused tests, expanded regressions, typecheck, scoped lint, Prisma validation, and generated readiness artifacts are green.

## Baseline

`npm test -- --runInBand actions/accounting/__tests__/close-assurance.actions.test.ts scripts/__tests__/report-trust-export-gate.test.js services/accounting/__tests__/close-assurance-pack.service.test.ts`

Result: 3 suites passed, 35 tests passed. This baseline is green while the synthetic timestamp remains, demonstrating the required coverage gap.

## Next Skill

Continue with `013-aqstoqflow-data-trust-accountant-portal` under `stoquify-referral-war-room-orchestrator` control.
