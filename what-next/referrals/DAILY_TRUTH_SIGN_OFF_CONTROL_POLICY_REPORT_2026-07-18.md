# Daily Truth Sign-Off Control Policy Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 10 - Branch daily-close sign-off control-policy foundation
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 10 is complete. Stoquify now has one canonical, typed control policy for future branch daily-close sign-off without claiming that sign-off persistence or execution exists.

The policy registers `branch.daily-close.sign` as both the canonical permission and sensitive-action ID. It is critical, cannot be granted by wildcard permission, requires L1 assurance and authentication no older than 300 seconds, blocks maker-checker self-approval, and defines stable audit and detector identifiers.

The policy is owned by the core `dashboard` commercial module with write intent. A pure evaluator composes the existing sensitive-action and module-entitlement services in enforced mode. It performs no database read or write, audit write, sign-off mutation, route, action, UI, event, notification, certificate, AI, or WhatsApp work.

The next narrow slice is Phase 2 / Slice 11: establish additive, tenant-scoped, append-oriented persistence for branch daily-close sign-off evidence. It must not add the sign-off command or make readiness report sign-off as supported.

## Before

- No canonical branch daily-close sign-off permission existed.
- No sensitive-action ID or assurance policy existed for daily-close sign-off.
- Wildcard behavior, fresh authentication, maker-checker behavior, and module ownership were therefore undefined for this operation.
- The reusable module-entitlement and sensitive-action evaluators existed but were not composed into a daily-close contract.
- `BranchDailyCloseRun` remained non-final with `IN_REVIEW` and `BLOCKED` only.
- Readiness correctly reported `MANAGER_SIGN_OFF` and completion as unsupported.

## After

### Canonical Permission

`config/permissions.ts` now registers:

```text
branch.daily-close.sign
```

The permission is grouped separately as a branch daily-close control. It is included in the admin and manager role configurations, but its explicit critical risk still prevents `*` from granting it implicitly.

### RBAC Risk

`lib/security/rbac-permissions.ts` explicitly classifies the permission as `crit`. Existing RBAC behavior therefore provides:

- unknown-key fail-closed behavior;
- no wildcard grant for the critical permission;
- direct canonical grants only unless an alias is deliberately added later.

No legacy alias was added. Daily-close sign-off authority cannot be inherited accidentally from POS operation, accounting-period close, or generic dashboard read permissions.

### Sensitive-Action Policy

`services/controls/sensitive-action.service.ts` now registers:

| Field | Frozen value |
|---|---|
| Action | `branch.daily-close.sign` |
| Permission | `branch.daily-close.sign` |
| Risk | `critical` |
| Assurance | `L1` |
| Fresh-auth maximum | 300 seconds |
| Self-approval | blocked |
| Audit action | `BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL` |
| Detector signal | `branch_daily_close_sign_off_attempt` |
| Detector signal | `branch_daily_close_self_approval_attempt` |
| Detector signal | `branch_daily_close_evidence_drift` |

The policy evaluator denies missing permission before other checks, blocks a signer whose actor ID equals the subject/maker ID, and rejects missing or stale authentication evidence.

### Module Ownership

The commercial owner is frozen as `dashboard` with `write` intent and an `action` surface.

This is deliberate:

- branch daily close is an operating-truth workflow available for no-activity and non-POS days;
- assigning it to `pos` would incorrectly make POS packaging the authority for all branch close evidence;
- assigning it to `close_assurance` would silently conflate daily operating review with accounting-period certification;
- `dashboard` is the core operating shell and command-center boundary already selected by the Daily Truth roadmap.

The typed control fixes module evaluation to `enforce`. A read-only or otherwise blocked dashboard entitlement therefore denies the future write operation even when sensitive-action checks allow it. RBAC wildcard never bypasses this decision.

### Typed Control Evaluator

`evaluateBranchDailyCloseSignOffControl()` composes exactly:

1. `evaluateSensitiveAction()` for permission, assurance, fresh-auth, and maker-checker rules;
2. `evaluateModuleEntitlement()` for the dashboard write entitlement.

The result exposes both underlying decisions and is allowed only when both allow. The function is pure and does not audit or mutate; a later command must perform transactional enforcement and audit recording after persistence exists.

## Files

Added:

- `services/end-of-day-close/branch-daily-close-sign-off-control.ts`
- `services/end-of-day-close/__tests__/branch-daily-close-sign-off-control.test.ts`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_CONTROL_POLICY_REPORT_2026-07-18.md`

Updated:

- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `lib/security/__tests__/rbac-permissions.test.ts`
- `services/controls/sensitive-action.service.ts`
- `services/controls/__tests__/sensitive-action.service.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated supporting evidence refreshed:

- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`

No Prisma schema, migration, review lifecycle, service command, server action, API route, page, component, notification, business event, certificate, AI, or WhatsApp file was added or changed by Slice 10.

## Verification

Focused policy and control suites:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-sign-off-control.test.ts services/controls/__tests__/sensitive-action.service.test.ts lib/security/__tests__/rbac-permissions.test.ts services/modules/__tests__/module-entitlement.service.test.ts
```

Result: 4 suites passed, 44 tests passed, 0 failed.

Close-readiness regression suites:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-review.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-review-drift.service.test.ts
```

Result: 3 suites passed, 57 tests passed, 0 failed.

Additional checks:

- `npm run typecheck`: passed;
- focused ESLint over all seven touched source/test files: 0 errors and one pre-existing `import/no-anonymous-default-export` warning in `config/permissions.ts`;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- tracked-file `git diff --check`: passed;
- new-file trailing-whitespace scan: 0 findings;
- static sensitive-action evaluator calls: 1;
- static module-entitlement evaluator calls: 1;
- static database, Prisma, transaction, and audit-write references: 0;
- static action, route, component, AI, copilot, and WhatsApp references: 0;
- temporary patch files after application: 0.

The first parallel lint/typecheck/regression wrapper reached its 182-second harness timeout without diagnostics and did not preserve individual child results. Each check was rerun separately; the results above are the authoritative results.

The role-cockpit gate applies to the Daily Digest cockpit rather than every Stoquify surface. It remains supporting release evidence, not Phase 2 certification.

## Slice 10 Gate Audit

| Requirement | Evidence | Result |
|---|---|---|
| Canonical permission | canonical permission array and known-key test | passed |
| Critical wildcard denial | explicit risk map and wildcard test | passed |
| Canonical sensitive action | action union and complete policy map | passed |
| L1 and bounded fresh auth | policy values and stale-auth test | passed |
| Maker-checker | self-approval denial and distinct-checker allow tests | passed |
| Stable audit/detector identifiers | exact policy assertion | passed |
| One module owner and write intent | typed `dashboard`/`write` contract and rationale | passed |
| Existing control APIs reused | one sensitive-action and one module-entitlement composition | passed |
| Module denial | enforced read-only entitlement test | passed |
| No schema or lifecycle change | scoped file audit | passed |
| No command, audit write, route, UI, or automation | static source and worktree audit | passed |
| Sign-off/completion remain unsupported | 57 close regression tests and source check | passed |

## Residual Risks

- Policy evaluation is not sign-off execution and must never be represented as a completed close.
- No durable signer, sign time, signed source hash, signed evidence hash, revocation, reopen, or supersession evidence exists yet.
- A later command must re-read current readiness, require a `CURRENT` drift assessment, verify the maker from trusted stored evidence, enforce fresh authentication, enforce entitlement, and write audit evidence in one transaction.
- Provider reconciliation and unlinked payment branch coverage remain incomplete.
- The close contract still uses UTC despite organization timezone availability.
- Slice 6's migration remains validated but was not deployed in this local execution run.
- The shared sensitive-action file contains an unrelated in-progress `report.export` worktree change. Slice 10 did not alter or revert it.

## Next Slice Gate

Phase 2 / Slice 11 should establish a **branch daily-close sign-off persistence foundation only**. It should:

1. audit the current `BranchDailyCloseRun` schema and validated Slice 6 migration before choosing the additive relation shape;
2. create tenant-scoped, branch/run-bound, append-oriented sign-off evidence that preserves signer identity, sign time, signed readiness source hash, signed evidence hash, and evidence observation time;
3. preserve the maker identity through the immutable review/run relationship so future maker-checker enforcement cannot accept caller-supplied identity;
4. define explicit active/revoked or supersession semantics without deleting signed history;
5. include bounded idempotency, request-hash, and correlation evidence without storing session tokens or raw authentication material;
6. use restrictive foreign-key and tenant-query boundaries and indexes appropriate for one branch/day review;
7. add an additive, rollback-aware migration and typed persistence contract;
8. validate Prisma schema, generated client compatibility, migration SQL, uniqueness, tenant isolation, and append-history invariants;
9. add no sign-off command, server action, route, UI, audit write, business event, notification, certificate, AI, or WhatsApp behavior;
10. leave `MANAGER_SIGN_OFF` and completion unsupported until a later command slice is implemented and verified.

Expected report: `what-next/referrals/DAILY_TRUTH_SIGN_OFF_PERSISTENCE_FOUNDATION_REPORT_<date>.md`.

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
