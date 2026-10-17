# Build artifacts and schema promotion

S11 separates compilation from migration. `npm run build` runs the existing secret preflight, lint and application compiler. It does not deploy migrations. Application imports and environment loading still make a build unsuitable for a read-only audit: use an isolated build environment with no deployment-target credentials.

## Prepare and retain the artifact

1. Freeze the reviewed source candidate and install its locked dependencies. Use synthetic build-time configuration and a disposable database if rendering needs a schema. Do not expose the migration target or live provider credentials to the compiler.
2. Run `npm run release:artifact -- <new-artifact-directory>`. The runner records source hashes before building, rejects source drift, checks complete standalone output, copies standalone/static/public assets, and writes `artifact.json` last. It refuses existing destinations, links and secret-shaped files.
3. Retain the emitted manifest SHA-256 in the reviewed release record and an immutable artifact store. The local folder is content-verified, not filesystem-immutable or a signature. A digest obtained from an untrusted replacement manifest is not provenance. Keep the reviewed source/migrations and lockfile with the release record; the runtime artifact is not a database backup.
4. Run `npm run release:artifact:verify -- <artifact-directory> <trusted-sha256>` in the exact source candidate. Added, removed or modified runtime/source files fail verification. Do not rebuild after verification/promotion. Runtime configuration belongs to the deployment system, not the bundle.

Source capture also retains top-level `vendor/*.tgz` installation inputs and `vendor/README.md`, plus `validations/` and `_legacy-dashboard/` modules still imported by active application code. Check each archive against its lockfile integrity before reconstruction. Installed `node_modules` remains excluded; a source snapshot or a build using existing installed dependencies does not prove a clean locked installation.

## Explicit schema stage

Only the authorized release operator may run `npm run release:schema:promote -- <artifact-directory> <trusted-sha256>` in the matching source candidate with a direct database connection. This is a mutating command. It does not deploy the application. Local targets remain refused by the existing production gate; local rehearsals use the dedicated disposable runner.

The stage validates the artifact, existing secret policy and target decision, then obtains a database-wide PostgreSQL session advisory lock before running the existing safe migration gate. Another promotion fails closed rather than cancelling the owner. The gate retains migration catalog/history, exact destructive-change approvals, baseline-bridge policy and post-deploy history checks. Prisma's own migration advisory lock remains enabled. Do not use transaction-mode pooling or alternate connection overrides. All release entry points must use this stage; direct/manual migration commands remain privileged operational capabilities and are not fenced by this wrapper's lock.

After schema success, the deployment provider must promote the exact reviewed artifact bytes and perform cohort health checks. This repository has verification CI, but no verified hosted artifact-promotion hook. Wiring the hosting provider, protected environment approvals, durable artifact retention, and fail/rollback handling remains a release gate. A legacy hook that depended on `npm run build` to migrate must be changed before adopting this candidate. Never let the hosting provider rebuild after schema promotion.

## Expand/contract and rollback

Use additive schema changes while the old and new application can coexist. Rehearse a populated predecessor schema, preserve old read/write behavior, then test new behavior on the expanded schema. Backfills need separate bounded/resumable evidence. Destructive contracts require explicit reviewed approvals after old workers/applications are drained and rollback requirements expire.

S11's local upgrade boundary is the final additive `20261004130000_purchase_order_authoring` migration. Its fixture proves legacy user read/write SQL and new draft writes coexist; it does not certify every old application path. Deploying the prior application against an expanded schema is the code rollback; retain new data. Reverting source does not undo SQL. Failed or partial migration needs the existing history checks plus a reviewed fix-forward/restore decision.

The later [S06–S12 local follow-up](../prompt-execution/S06-S12_LOCAL_GATES_2026-10-16.md) records separate 94-to-96 and 94-to-97 populated upgrades and intentional close-evidence invalidation. Migrations beyond each frozen catalog remain unqualified by that run. Preserve historical evidence and identify the exact tested catalog rather than re-labelling it as the latest release.

## Verification classes

- `tests/s10-s11/release-artifact.test.js`: orchestration, digest/source tamper, compiler failure, target refusal and lock cleanup with mocked operations.
- `scripts/verify-s11-local.cjs <existing-evidence-directory>`: creates two uniquely named localhost databases, fresh catalog replay, populated additive upgrade, real advisory-lock contention, and real failed/successful Next standalone fixture builds. Retains databases and evidence; never resets an existing database.
- Full Stoquify artifact compilation, full prior-application compatibility, hosted promotion, realistic restore/RPO/RTO and production operations require separate evidence. Fixture verification does not close those gates.
