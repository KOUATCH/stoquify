# Daily Truth Sign-Off Persistence Foundation Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 11 - Branch daily-close sign-off persistence foundation
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 11 is complete. Stoquify now has additive, tenant-scoped, append-oriented persistence for future branch daily-close sign-off evidence without exposing or implementing a sign-off command.

The design adds a separate `BranchDailyCloseSignOff` history model rather than mutating signature fields onto `BranchDailyCloseRun`. Each record binds to one tenant and review run through a composite foreign key, captures the exact signed readiness/evidence hashes and observation time, records signer and safe L1/fresh-auth evidence, and preserves terminal revocation or supersession history.

At most one active sign-off can exist for one tenant/run through a nullable active key equal to the run ID. Revoked and superseded records clear that key but retain all signed facts. Organization, run, signer, invalidator, and supersession foreign keys are restrictive so signed evidence cannot disappear through an ordinary parent delete.

No command, service mutation, action, route, UI, audit write, event, notification, certificate, AI, or WhatsApp behavior was added. Readiness still reports `MANAGER_SIGN_OFF` and completion as unsupported.

The next narrow slice is Phase 2 / Slice 12: implement the service-owned branch daily-close sign-off command with transactional policy, drift, maker-checker, idempotency, audit, and event controls. It must remain unreachable from server actions, routes, and UI until the service is independently verified.

## Before

- `BranchDailyCloseRun` stored one non-final branch/day review baseline with `IN_REVIEW` or `BLOCKED` status.
- The run preserved review starter identity, evidence observation time, readiness source hash, evidence hash, manifest, idempotency, request hash, and correlation evidence.
- Slice 10 registered the critical `branch.daily-close.sign` policy but could not persist a sign-off.
- No signer, sign time, signed-hash snapshot, safe authentication evidence, revocation, supersession, or one-active-record constraint existed.
- Adding signature fields directly to the single review row would have made future revoke/reopen cycles overwrite history.

## After

### Separate History Model

`BranchDailyCloseSignOff` is a separate record linked to `BranchDailyCloseRun`.

This preserves the review baseline and allows later signatures to be appended while prior records become terminal. `BranchDailyCloseRun` receives only a `signOffs` relation and a redundant tenant/id unique key required by the composite foreign key; it receives no signer, signed-time, signed-hash, or signed lifecycle fields.

### Tenant And Parent Binding

The sign-off stores:

- `organizationId`;
- `branchDailyCloseRunId`;
- a composite relation from those fields to `[organizationId, id]` on the run.

A sign-off therefore cannot reference a review run belonging to another tenant even if a caller supplies both identifiers. The direct organization foreign key is `RESTRICT`, as are run, signer, invalidator, and supersession references.

The model does not duplicate location or business date. Those remain service-owned properties of the immutable review run, preventing a sign-off row from carrying a contradictory branch/day identity.

### Signed Evidence

Each record durably stores:

- signed readiness source hash;
- signed evidence hash;
- signed evidence observation time;
- signer identity;
- sign time;
- authentication assurance level;
- fresh-auth timestamp;
- idempotency key;
- request hash;
- correlation ID.

Hash and request fields are fixed at 71 characters and must use the `sha256:` prefix. Evidence observation cannot be later than sign time.

Only `L1` authentication evidence is valid. The fresh-auth timestamp must be at or before sign time and no more than 300 seconds old. No session token, access token, refresh token, cookie, password, credential, or MFA secret is stored.

### Lifecycle And One-Active Rule

The lifecycle is:

| Status | Active key | Invalidation evidence | Meaning |
|---|---|---|---|
| `ACTIVE` | equal to the review run ID | absent | current sign-off for the run |
| `REVOKED` | null | required | signature intentionally invalidated |
| `SUPERSEDED` | null | required | signature replaced while history remains |

`@@unique([organizationId, activeKey])` permits multiple terminal null keys but only one active run key per tenant. SQL checks enforce that active rows cannot carry invalidation evidence and terminal rows must carry invalidator, time, and reason.

`supersedesSignOffId` is a tenant-bound self-relation. It cannot point to the same record. The persistence foundation does not perform revocation or supersession; it only makes those later operations representable without deleting signed history.

### Typed Contract

`branch-daily-close-sign-off-contracts.ts` freezes:

- lifecycle statuses;
- table name;
- required assurance and freshness window;
- hash format and bounded field lengths;
- active-key strategy;
- immutable signed evidence fields;
- terminal statuses;
- a readonly persistence record shape.

It contains no Prisma client, database, action, route, audit, event, notification, AI, or WhatsApp dependency.

## Migration

The additive migration:

- creates the sign-off status enum;
- adds the tenant/id unique key to existing review runs;
- creates the sign-off table;
- adds hash, identity, evidence-time, assurance, and lifecycle checks;
- adds active-key and idempotency uniqueness;
- adds tenant/run/status, signer, invalidator, supersession, and correlation indexes;
- adds restrictive organization, run, user, and self-reference foreign keys.

It contains no `DROP`, `TRUNCATE`, data delete, or update of existing review rows. No migration was deployed; the local safety gate explicitly skipped database mutation because no target database was configured.

## Files

Added:

- `prisma/migrations/20260718130000_branch_daily_close_sign_off_foundation/migration.sql`
- `services/end-of-day-close/branch-daily-close-sign-off-contracts.ts`
- `services/end-of-day-close/__tests__/branch-daily-close-sign-off-persistence.test.ts`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_PERSISTENCE_FOUNDATION_REPORT_2026-07-18.md`

Updated:

- `prisma/schema.prisma`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated supporting evidence refreshed:

- `what-next/prisma-migration-deployment-readiness.md`
- `what-next/prisma-migration-deployment-readiness.json`
- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`

No existing service, server action, route, page, component, readiness contract, audit writer, event publisher, notification, certificate, AI, or WhatsApp file was changed by Slice 11.

## Verification

Final Prisma schema validation:

```text
npx prisma validate
```

Result: valid.

Normal client generation was attempted twice and reached schema loading, but Windows rejected replacement of the live `node_modules/.prisma/client/query_engine-windows.dll.node` with `EPERM`. No process was terminated. The exact final schema was then generated to an isolated workspace output:

```text
npx prisma generate --schema .codex-tmp/prisma-slice11-final/schema.prisma
```

Result: Prisma Client 6.19.3 generated successfully; the output exposed `BranchDailyCloseSignOff`, `BranchDailyCloseSignOffStatus`, and the model delegate. The temporary schema, generated client, patch, and parent directory were removed after verification.

Focused Slice 11 gate:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-sign-off-persistence.test.ts services/end-of-day-close/__tests__/branch-daily-close-sign-off-control.test.ts services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts
```

Result: 3 suites passed, 21 tests passed, 0 failed.

Complete end-of-day-close regression gate:

```text
npm test -- --runInBand services/end-of-day-close/__tests__
```

Result: 6 suites passed, 91 tests passed, 0 failed.

After the final organization-retention hardening, the persistence suite was rerun: 1 suite passed, 4 tests passed, 0 failed.

Additional checks:

- focused ESLint for the two new TypeScript files: passed with 0 errors and 0 warnings;
- `npm run typecheck`: passed;
- `npm run prisma:migration:safety:gate`: ready, 8/8 checks, 19 migrations, 0 risk findings, 0 blockers, deployment skipped;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- tracked-file `git diff --check`: passed;
- new-file trailing-whitespace scan: 0 findings;
- destructive SQL scan: 0 findings;
- raw-auth-field scan: 0 findings;
- command/action/route/audit/event/notification/AI/WhatsApp dependency scan: 0 findings;
- temporary Slice 11 patch and generation artifacts: 0.

The role-cockpit gate applies to the Daily Digest cockpit rather than every Stoquify surface. It remains supporting release evidence, not Phase 2 certification.

## Slice 11 Gate Audit

| Requirement | Evidence | Result |
|---|---|---|
| Existing schema/migration re-audited | live schema, Slice 6 SQL, worktree diff | passed |
| Additive append-oriented shape | separate history model and non-destructive SQL | passed |
| Tenant/run binding | composite tenant/run FK and tests | passed |
| Signer/time/hash evidence | schema fields, typed contract, SQL checks | passed |
| Maker anchored to review | no caller/maker field; run retains `startedById` | passed |
| Revocation/supersession history | terminal statuses, invalidation fields, self-relation | passed |
| One active record | tenant/active-key uniqueness and lifecycle check | passed |
| Idempotency/correlation bounds | schema lengths, uniqueness, indexes, identity check | passed |
| No raw authentication material | safe assurance/time only; static tests | passed |
| Restrictive retention boundaries | organization/run/user/self `RESTRICT` FKs | passed |
| Prisma/client compatibility | final validate and isolated generation | passed |
| Migration safety | 8/8 gate and no destructive findings | passed |
| No command or product surface | scoped worktree and dependency audit | passed |
| Sign-off/completion remain unsupported | readiness source and 91-test regression gate | passed |

## Residual Risks

- Persistence capability is not sign-off execution; no record can be created through a product command yet.
- The database checks cannot compare signer identity with `BranchDailyCloseRun.startedById`; the future command must derive the maker from the stored run and enforce maker-checker before writing.
- Signed evidence fields are immutable by typed contract and service design, but no database trigger prevents a privileged direct SQL update. Future command and release gates must prohibit such updates.
- Revocation and supersession are representable but have no policy, command, audit, or event behavior yet.
- The standard generated-client output remains locked by a live local process; isolated final generation proved compatibility without disturbing that process.
- Provider reconciliation and unlinked payment branch coverage remain incomplete.
- The close contract still uses UTC despite organization timezone availability.
- Slice 6 and Slice 11 migrations were validated but not deployed in this local execution run.

## Next Slice Gate

Phase 2 / Slice 12 should implement a **branch daily-close sign-off service command only**. It should:

1. accept trusted organization/actor/access context, one location, one strict business date, bounded idempotency key, and correlation ID;
2. derive the review maker only from the tenant-scoped stored run, never from caller input;
3. require the run to be `IN_REVIEW` and the stored-versus-current drift assessment to be `CURRENT` immediately before persistence;
4. reject missing, blocked, drifted, cross-tenant, and unassigned-location reviews before any write;
5. compose the Slice 10 critical permission, L1/fresh-auth, maker-checker, and enforced dashboard entitlement controls;
6. perform idempotency replay/conflict handling and one-active-sign-off enforcement inside the transaction;
7. persist an `ACTIVE` sign-off with active key equal to the run ID and exact stored/current evidence hashes;
8. write sensitive-action and successful-command audit evidence transactionally, with no raw auth material;
9. emit a deterministic business event/outbox record only after all control and persistence invariants pass;
10. prove rollback on audit/event/persistence failure, exact-hash storage, replay, conflict, concurrent-active denial, stale auth, self-approval, module denial, and evidence drift;
11. add no server action, API route, page, component, readiness promotion, revocation, certificate, AI, or WhatsApp behavior.

Expected report: `what-next/referrals/DAILY_TRUTH_SIGN_OFF_COMMAND_REPORT_<date>.md`.

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
