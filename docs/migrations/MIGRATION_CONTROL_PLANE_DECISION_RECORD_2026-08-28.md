# Migration Control-Plane Decision Record

Date: 2026-08-28
Decision: accepted for local implementation; production promotion remains fail-closed pending target-specific external evidence.

## Context

The former deployment gate treated every destructive statement in the repository as if every target were about to execute it. That made a healthy, fully migrated database fail because of historical SQL while still leaving baseline adoption, hash identity, and catalog mutation insufficiently explicit.

## Decision

Stoquify migration authorization is split into four boundaries:

1. **Immutable catalog and full-history integrity.** The repository manifest records every full migration name and raw/LF/CRLF hash. Target history must contain no mutation, unknown successful migration, unfinished row, checksum divergence, or duplicate success.
2. **Exact target-pending risk.** Only the repository migrations absent from a verified target are execution candidates. Destructive approval is required for destructive findings in that exact set. Historical findings remain visible in catalog review evidence.
3. **Baseline path selection.** The baseline bridge may execute only on a genuinely empty target with complete evidence and exact human approval. If it is pending on a database with any completed repository history, automation stops and selects controlled manual resolve-only adoption. Automation never runs `prisma migrate resolve`.
4. **Release evidence.** Immutable SQL approval identity is canonical LF UTF-8 SHA-256; raw SHA-256 is transport integrity. Mutable source, schema, package, commit, and smoke-test state belongs to a release snapshot and cannot invalidate historical approval truth.

## Consequences

- A current target is not blocked by destructive SQL it already applied with a matching checksum.
- A pending destructive migration remains blocked without exact finding-level approval.
- New migration timestamp collisions and any manifested-file mutation fail closed.
- The two existing `20260818120000` migrations remain grandfathered only by exact full name.
- Existing-database baseline adoption is deliberately manual and requires target census, compatibility, backup/restore rehearsal, maker/checker, and metadata-only reconciliation proof.
- A production release is not certified merely because local history and blank replay are healthy.

## Rejected alternatives

- Editing, renaming, squashing, or resetting applied migrations.
- Globally approving historical destructive SQL.
- Automatically resolving a baseline migration on an existing database.
- Treating raw checkout bytes as the only approval identity.
- Binding historical approval validity to mutable application files or Git HEAD.

## Verification

- Configured local development database: 80/80, no missing, unknown, unfinished, duplicate, or checksum-mismatched history.
- Empty local replay: 80/80, second deploy no-op, zero unexpected schema drift.
- Focused migration-control tests: 49 passed across six suites.
- Production authorization: not granted; backup/restore, failure injection, functional auth/accounting smoke, target census, and maker/checker remain external where applicable.
