# HR21 development continuation 02 — effective leaver and recovery

Status: **VERIFIED_SCOPED development checks**. HR21 remains **IMPLEMENTED_PENDING_VERIFICATION** for full application/operator release acceptance. Deployment details do not block development, as explicitly clarified by the user. The prior BLOCKED register entry is historical and superseded for development sequencing.

Completed in order: the connected native office/shift workflow through effective termination, then an actual synthetic PostgreSQL backup/restore into a new disposable database with recovered encrypted document objects. No product change was needed in this continuation; findings concerned test repeatability and evidence reliability.

## Acceptance and checks

| Development criterion | Result | Evidence |
|---|---|---|
| Future and due-but-unapplied departure cannot complete access/assets | PASS | Six-stage connected database suite; effective clock advanced explicitly only after denied paths |
| Native application closes employment/contract/compensation exactly once | PASS | Termination date, contract/assignment end date, one event and replay assertions |
| Starter history and original handoff evidence survive departure | PASS | Exact retained task IDs/status/evidence/history and original CSV comparison |
| Application-access completion requires inactive account state | PASS_SCOPED | Active account denied; isolated synthetic account-state fixture then independent task review. No external identity-provider workflow executed |
| Real restore preserves retained source facts | PASS_SCOPED | pg_dump/pg_restore to a newly created different database; tenant table, role membership, schema-column and local migration-ledger fingerprints match |
| Protected originals and immutability survive recovery | PASS_SCOPED | Authorized decrypted hashes match; ciphertext differs from plaintext; absent/corrupt objects and absent/wrong keys deny; package update and receipt deletion rejected |
| Current access and retry controls survive recovery | PASS | Wrong tenant, other employee, inactive employee and revoked recipient denied; lifecycle/task retries preserve event counts and history |
| Evidence cannot retain stale success after preflight failure | PASS | Three isolated runner tests; wrong targets and changed backup hash cause FAILED with zero database clients/child launches |

Executed: **6 connected real-database tests**, **3 restored-database tests**, **3 isolated runner tests**, bounded TypeScript **0 diagnostics**, workflow and owned diff checks. Independent reviewer: **PASS_SCOPED_SOURCE_ONLY** after findings were fixed. Source review is separate from executed tests. No browser, assistive-technology, real-provider, customer upgrade or human operator acceptance was executed here.

## Findings and corrections

1. The initial connected extension depended on the current date being before1 November2026. The application clock is now fixed to25 October for preparation and explicitly advanced to1 November for due application; real asynchronous scheduling is preserved. PostgreSQL timestamps remain real. Stage timestamps involving this simulated clock are not execution wall-clock measurements; runner timestamps are real.
2. Preflight rejection could leave a previous recovery PASS visible. Both runners now archive prior output and initialize the new result before target/hash checks, then record FAILED on rejection. The three negative harness tests prove no database client or child launch occurs.
3. Recovery coverage was strengthened with restored immutability triggers, recipient permission revocation, wrong-but-valid-length encryption keys, schema/ledger fingerprints and due-but-unapplied task denial.

The initial and final connected successes and all artifacts remain retained. Historical HR21/HR19 evidence was not overwritten. The new source tests are separate from the earlier four-stage pilot fixture.

## Scope, data and cleanup

The only source database is the explicitly guarded owned loopback stoquify_local_hris_20261024 on127.0.0.1:55464. Recovery creates stoquify_local_hris_recovery_20261025 only if absent; it never overwrites an existing database. The newly created target is dropped and its absence checked before PASS. Backup/object fixtures remain in the owned visualization workspace, contain synthetic data only, and are checksum-bound in backup-manifest.json. Encryption keys are in the synthetic database backup; object bytes are captured separately. No fixture contents or credentials are printed in evidence logs.

This is a real local database restore plus an injected synthetic document-store recovery, not customer/provider disaster-recovery certification. pg_restore uses no-owner/no-privileges, so this does not qualify deployment database grants. No live account revocation, mail, payroll effect, deployment or production migration occurred.

## Next development step

Continue local authentication/session and HR access-boundary qualification using synthetic accounts and the real configured authentication owner. Existing release-browser recipes reference other seeded environments and must not be reused against an implicit application database. Actual operator training, hosting choice and launch approval remain later release work; no deployment information is needed to continue development.

Architecture/data reuse the existing employee/lifecycle/task/document/handoff owners. Security/privacy coverage is explicit and bounded. No UI or country-rule behavior changed; visual design, statutory calculation, AI, POS and purchasing are not applicable to this continuation.
