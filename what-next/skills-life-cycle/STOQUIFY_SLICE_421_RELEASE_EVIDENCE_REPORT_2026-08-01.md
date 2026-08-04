# Stoquify Slice 421 Release Evidence Report

Date: 2026-08-01
Slice: Phase 4 / 421
Capability: Accountant access expired-scope retirement and renewal safety

## Scope Classification

- Product implementation: service and focused service test only.
- Schema/migration change: none.
- UI/action change: none.
- External authority: none.
- Production activation: none.

## Evidence Matrix

| Gate | Result | Evidence |
| --- | --- | --- |
| Pre-edit accountant baseline | Pass | 3 suites / 11 tests |
| Focused lifecycle tests | Pass | 1 suite / 9 tests |
| Accountant/data-trust regression | Pass | 5 suites / 29 tests |
| Portal route and business events | Pass | 2 suites / 6 tests |
| TypeScript | Pass | `npm run typecheck` |
| Scoped ESLint | Pass | 0 errors |
| Prisma schema validation | Pass | `npm run prisma:validate` |
| Exact scope and ordering | Pass | All structural assertions true |
| Expiry-event minimization | Pass | No email or firm data |
| Unique-race classification | Pass | Only `activeScopeKey` `P2002` is mapped |
| Delegated access ratchet | Pass | Effective/unexpired/role checks preserved |
| External authority scan | Pass | No matches |
| Whitespace and patch rejects | Pass | Clean |\n| Independent implementation review | Pass | No blocking or high-severity issue |

## Certified Invariants

1. One organization/accountant active-scope key remains the database concurrency boundary.
2. An unexpired reservation produces no retirement, event, or replacement create.
3. Expiry at the exact `now` boundary is renewable.
4. Retirement, deterministic expiry evidence, replacement create, and grant evidence share one transaction.
5. A replacement carries fresh consent evidence.
6. An active-scope unique race returns the canonical accountant-access conflict.
7. Unrelated Prisma uniqueness errors are not relabeled.
8. Delegated reads and exports still require the existing tenant, time-window, and role controls.

## Ownership Evidence

The selected product files and the existing accountant-access migration remain untracked. The shared Prisma schema was already modified before this slice and was not edited by Slice 421. No files were staged or committed.

## Release Classification

- Current-worktree service contract: **PASS**
- Repository/deployment ownership: **NO-GO**
- Production migration readiness: **NO-GO**
- External, AI/WhatsApp, or POS activation: **NOT AUTHORIZED**

## Residual Gates

- Track the accountant-access foundation in an orchestrator-reviewed, feature-isolated revision.
- Decide user identity foreign-key and retention behavior.
- Add database lifecycle constraints/backfill policy.
- Prove clean PostgreSQL migration deployment and status from the exact tracked revision.
- Audit future-effective and fully past grant-window semantics.

No Slice 422 is selected by this evidence report.
