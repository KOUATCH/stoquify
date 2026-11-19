# Core-HR pilot release and recovery gate

Prepared procedure only. No customer migration, production deployment, account revocation, external message, backup or restore is executed by this document.

## Candidate reconciliation

Use candidate-integrity.json for the current source hashes and the changed dependency files. Historical slice hashes remain historical; never rewrite them to hide subsequent edits. Trace each changed shared owner to current tests or mark it unverified. The controlled test database was initially synchronized to a schema; later additive migration/replay checks do not prove a cumulative upgrade from a real customer baseline.

Before approving a target, record its explicit identity, environment, owner, existing migration ledger, schema fingerprint, row-count reconciliation, app artifact revision and provider configuration. A restore destination must be separately named, disposable and isolated from users/provider effects. The source must have a reviewed backup/retention scope. Do not infer either from application environment files.

## Restore rehearsal to authorize and execute

1. Freeze the rehearsal inputs and record the source snapshot time/backup manifest. Record database and protected-original object/key versions together; a database-only backup cannot recover encrypted document originals by itself.
2. Verify the backup checksum and inspect the restore contents before any write. Confirm the resolved destination matches the reviewed target and has no production/provider bindings.
3. Restore through the existing database/provider operations process. Do not use implicit resets, root application seeders or blanket trigger disabling to pass a test.
4. Reconcile employee/contract/assignment counts, leave ledger balances and revisions, certification lineage, package/receipt IDs and exact bytes/hashes, retained document retrieval/key access, lifecycle tasks, audit/events and migration ledger.
5. Run current role/tenant denial checks and exact replay recovery. Confirm no worker/provider effect is repeated. Record recovery duration/data gap without inventing an RTO/RPO promise.
6. Obtain named data-owner acceptance. Clean up only the expressly owned disposable rehearsal target after evidence is saved. Keep production/customer backups according to the reviewed retention policy.

No executable restore command is supplied without concrete source/destination/version information. The runbook is reviewable; restore acceptance remains NOT_RUN.

## Rollback and support

Stop new handoff issuance by disabling its reviewed policy. Preserve originals, supersession links and receipts; authorized exact recovery remains supported. Use existing role/module controls to stop access, preserving retained obligations. Do not treat hiding a menu as access revocation.

Document storage admission remains disabled unless a named gateway/scanner and employer retention/hold policy qualify. HR12 entitlement scheduling still needs an operational scheduler; manual reviewed execution is not unattended operation. HR17 task attestation needs named accountable operators and does not prove external access revocation.

Support triage records correlation/record IDs, operation and error category. Avoid salaries, bank details and document contents in ordinary logs/tickets. Assign the source-owning HR/reviewer/support team; don't repair immutable history with direct database writes. Approved corrections use linked native revisions and a new handoff when required.

Rollout order: isolated qualification → named internal dry run → named small pilot → accountable review → separately authorized broader activation. Stop before the next stage when its evidence or authorization is absent.
