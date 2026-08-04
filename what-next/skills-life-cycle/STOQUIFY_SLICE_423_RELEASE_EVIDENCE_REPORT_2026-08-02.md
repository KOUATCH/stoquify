# Stoquify Slice 423 Release Evidence Report

Date: 2026-08-02
Slice: Phase 4 / 423
Capability: Accountant grant temporal honesty and scheduled revocation

## Release Decision

- Current worktree capability: PASS
- Repository ownership: NO-GO
- Database deployment: NO-GO
- Production release: NO-GO

## Evidence Matrix

| Gate | Result | Evidence |
| --- | --- | --- |
| Elapsed-window rejection | Pass | Service tests prove rejection before database work. |
| Scheduled-state derivation | Pass | Service tests prove future-effective grants return `SCHEDULED`. |
| Expiry terminal truth | Pass | Current and legacy post-expiry paths return `EXPIRED` without revocation evidence. |
| Concurrent revocation attribution | Pass | Conditional tenant-scoped transition and losing-writer reread are tested. |
| Delegated active-client scope | Pass | Resolver and portfolio require `isActive: true` and `deletedAt: null`. |
| Browser timestamp transport | Pass | Valid local inputs reach the action as absolute ISO instants. |
| UI terminal-state truth | Pass | Expiry-race response and exact cutoff evidence are tested. |
| Protected command boundary | Pass | AST gate verifies fresh auth, permission, `ctx.orgId`, and `ctx.userId` for grant and revoke. |
| Delegated resolver boundary | Pass | AST gate verifies tenant, time, status, scope key, active client, denial, and READ_ONLY export rules. |
| Fresh-auth control flow | Pass | Gate requires declaration before guard before trusted return. |
| Focused tests | Pass | 3 suites / 35 tests. |
| Expanded regressions | Pass | 8 suites / 80 tests. |
| Exact route | Pass | 1 suite / 3 tests. |
| Type, lint, and schema | Pass | Typecheck, scoped ESLint, and Prisma validation passed. |
| Report-trust gate | Pass | 18/18 ready, zero blockers. |

## Negative Evidence

The 17-test report-gate suite fails closed for synthetic or misordered fresh-auth evidence, payload spreads, elapsed-window acceptance, future misclassification, legacy post-expiry mislabeling, unconditional revocation writes, detached tenant markers, unscoped protected revocation, missing scheduled revocation, raw timestamps, and misleading UI terminal-state evidence.

## Release Limits

- Relevant accountant-access service, action, component, tests, and migration remain partly untracked in the current worktree.
- Actor identity foreign keys and evidence-retention/deletion policy are unresolved.
- Database lifecycle constraints and exact-revision PostgreSQL deployment evidence are absent.
- Register and portfolio result caps lack pagination/truncation evidence.
- Browser-local input still depends on the device timezone; an organization-timezone policy requires a separate product decision.
- The certified close-pack export action still needs a separate fresh-auth provenance audit.
- Missing-proof requests, external sharing, AI, WhatsApp, and POS cash-shortage production activation are not authorized.

## Handoff

Return to `stoquify-referral-war-room-orchestrator` for a fresh Phase 4 audit. Consult `013-aqstoqflow-data-trust-accountant-portal`; do not advance to a new numbered implementation skill or Slice 424 without a new evidence-based selection.
