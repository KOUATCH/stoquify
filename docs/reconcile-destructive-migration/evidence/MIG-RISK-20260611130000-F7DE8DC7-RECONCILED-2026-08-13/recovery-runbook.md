# B-03 recovery runbook — draft, not tested evidence

Status: `PARTIAL`  
Migration SHA-256: `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4`

## Preconditions

- Name the incident owner, database operator, application operator, security reviewer, and communications owner.
- Bind the candidate Git commit, application artifact, Prisma schema, migration, evidence bundle, and B-01 backup identifiers.
- Confirm B-02 restore proof meets accepted RPO/RTO.
- Confirm no credentials or raw sensitive values will enter tickets or repository logs.

## Stop conditions

Stop deployment or resolve adoption immediately when any of these occurs:

- Migration, schema, packet, or evidence hash differs from the reviewed value.
- The selected environment path disagrees with R-01.
- The baseline guard fails unexpectedly.
- Any application-table count/checksum changes during resolve-only adoption.
- Any migration is unfinished, rolled back, missing, unknown, or checksum-mismatched.
- Authentication, session, email-verification, or RBAC smoke checks fail.
- Backup access or restore readiness cannot be proved.

## Empty-baseline failure path

1. Prevent application publication and stop further migration attempts.
2. Archive redacted database and migration logs in the evidence vault.
3. Verify transaction rollback and compare schema/data controls with the pre-attempt state.
4. If the disposable target is inconsistent, destroy and recreate it; never repair a rehearsal by editing migration history silently.
5. For a real rollout, restore B-01/PITR into a controlled recovery target and deploy the previous compatible application artifact.
6. Prefer a reviewed fix-forward migration when recovery must preserve a successful committed deployment.
7. Rerun migration-history, schema-drift, auth, and release gates before resuming.

## Existing-database resolve-only failure path

1. Stop before any subsequent migration deployment.
2. Prove application tables are unchanged using R-05 controls.
3. Recover migration metadata using the tested B-05 procedure or restore the pre-resolve snapshot.
4. Do not directly edit `_prisma_migrations` unless a DBA and release owner explicitly authorize and independently verify the exact correction.
5. Rerun `prisma migrate status`, schema comparison, R-05 reconciliation, and R-06 auth regression.

## Post-recovery validation

- Migration history is clean and bound to repository hashes.
- Application schema and data match the expected pre-action or reviewed fix-forward state.
- Credential and configured OAuth sign-in work.
- Session expiry, revocation, verification, step-up, and RBAC checks pass.
- Monitoring remains active for the approved observation window.
- Incident evidence and decision records are immutable and redacted.

## Required rehearsal record

This runbook becomes `PRESENT_VALID` only after a different authorized operator follows it successfully in an isolated environment and records the execution evidence, deviations, measured recovery time, and reviewer acceptance.
