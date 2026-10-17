# Isolated PostgreSQL workflow verification

4 October 2026. Database: `stoquify_local_ui_workflow_20261004_01a10672`, created empty on the existing local PostgreSQL server. The configured application database was not migrated, seeded or reset. No global environment file or application rollout flag changed.

## Migration rehearsal

The server was reachable through the repository's `pg` client even though PostgreSQL/Docker CLI tools were absent from PATH. A read-only probe established local hosting and permission to create a separate database. `scripts/ui-workflow-postgres-bootstrap.cjs` created the new database, refused overwrite, then ran `prisma migrate deploy` with every database URL overridden to that target. No generic build, broad seed or destructive reset ran.

All **93 migrations applied**, including access requests and purchase authoring. `postgres-migration-rehearsal.json` and the sanitized log record the deployment. `postgres-workflow-verification.json` verifies every stored migration checksum against its current repository SQL file and binds the tested source and Jest reports with SHA-256. This proves a fresh-database migration rehearsal; it does not prove upgrade behavior on representative existing data or a restore drill.

## Passed database scenarios

**Alert recovery: 11 PostgreSQL scenarios.** Real stored roles, sessions, module entitlement, business events, audit and worker services were used; only database-client selection was redirected to the isolated target.

- Two identical commands commit one page and one receipt; competing command IDs at the same revision yield one success and a conflict.
- Host worker and operator serialize without losing the checkpoint or deadlocking in the tested schedule. PostgreSQL reports distinct blocked backend connections before the barrier releases; concurrent promises alone are not the evidence.
- A populated review phase records one in-app observation, preserves its source exception, creates no payment/journal/outbox, and replays its receipt after the test-process write flag is disabled.
- A database trigger fails the final audit insert. Notification, checkpoint and event receipt all roll back; removing that synthetic trigger permits the same command to succeed.
- Revoked stored role, expired session and managed module denial block advancement. Unexpected lease/hash state escalates unchanged. Foreign-tenant lookup and revoked-authority receipt reads fail.

The first fixture run was rejected because its synthetic scan object used a different field order from the worker's historical hash contract. Fixtures now parse through the worker schema before hashing, matching producer serialization; production hash validation was not weakened.

**Purchase authoring: 8 PostgreSQL scenarios.** Actual create, numbering, event, module and authoring services execute on the migrated schema.

- Simultaneous first saves deduplicate while retaining incomplete numeric text and create no business document.
- Competing revision saves cannot overwrite newer work.
- Competing prepared commits produce exactly one DRAFT order, one allocated number and one applied event receipt; no stock transaction or outbox message is produced.
- Create/discard races resolve to either a retained discarded draft or the committed creation receipt, without a second order.
- Write-flag rollback preserves committed receipt lookup; expired current sessions are denied.
- A deactivated supplier is rejected before number allocation. Foreign-tenant reads and cross-tenant creator foreign keys are rejected.
- A real final-audit failure rolls back number allocation, order creation and receipt; retry uses `PO-000001`, proving no leaked increment in that fixture.

**Database target guards: 11 unit checks.** Tests reject production mode, remote/non-PostgreSQL URLs, invalid names and the current application database even if it uses the test prefix. The guarded URL pins the separate database and test schema.

**Access requests: 14 PostgreSQL scenarios.** Real request, member-access, role policy, session, module and audit services execute against synthetic tenants. Session assurance fields are synthetic fixtures: these tests verify stored assurance enforcement, not the browser password-verification flow.

- Competing submissions retain one open request and audit; changed command replay is rejected. Approval/decline and decision/withdrawal contention commit one revision without granting access.
- Competing applications commit one member grant and one request receipt, preserve existing roles and revoke requester sessions. Application/withdrawal contention either commits the grant with its receipt or withdraws without a grant.
- Stale authentication records a safe failure, preserves roles/sessions and permits retry after fixture reauthentication. Expired sessions fail. Revoked stored reviewer authority and a different reviewer with equivalent authority cannot apply the decision.
- Changed role contents after approval fail without granting the added authority. Pending expiry is audited once and permits a fresh request. Foreign-tenant history, cross-tenant requester foreign keys and self-review are rejected.
- Disabling application blocks the command. Applied status/history remain readable after flag rollback; return-to-task checks current permissions even after a recorded grant is later revoked.
- A trigger fails the final request audit. Role assignments, member audit and requester session revocation roll back together; the request records a safe failure in the separate failure transaction. Removing the trigger permits one successful grant using the saved command identity.

The contention checks observe at least two distinct PostgreSQL backends waiting on the organization lock before releasing it. They cover the observed schedules, not every ordering. Approval remains limited to the registered item-read task; no application user permissions or rollout flags were changed.

Reports: `alert-recovery-postgres-jest.json` contains 11 database scenarios plus 11 guard checks; `purchase-authoring-postgres-jest.json` contains 8 database scenarios. No tests were skipped. Repository TypeScript session 53671 and focused test ESLint passed.

`access-requests-postgres-jest.json` adds 14 database scenarios with no skips. Focused access-test ESLint, repository TypeScript (session 8911, exit 0) and scoped whitespace checks passed. The refreshed manifest confirms all 93 migration source checksums still match.

**Guided payroll settlement: 14 PostgreSQL scenarios.** Real settlement, stored-proof projection, sensitive-action controls, business events/outbox and close-invalidation service calls execute on the migrated database. The only service replacement selects the isolated Prisma database client.

- A full settlement records one receipt and resolves an identical retry. The contention barrier observes two distinct database backends blocked on payment update; identical commands both resolve to one receipt, while different competing commands yield one success.
- A 40.00 partial settlement leaves 60.00 remaining. A stale balance selection is rejected unchanged; a fresh 60.00 settlement produces a second event linked to the first, cumulative 100.00 and remaining 0.00.
- Revoked match approval, stale proof revision, unmatched/excessive amount, foreign-tenant match/batch and a recorded match correction all reject without changing the batch, payment, event/outbox or audit state.
- Missing supplied permission, self-approval by the batch releaser and stale supplied authentication are rejected by the actual service controls. Authentication/session retrieval in the server action still requires separate integration/browser evidence.
- A trigger fails the final reconciliation audit. Batch metadata/status, payment state, event, outbox and audit changes all roll back. Removing the trigger permits the same command identity to commit exactly once. No journal entry is created by settlement.

Fixtures construct synthetic posted/released source state and verified provider-event fields directly in the isolated database. They do not verify upstream payroll calculation, posting journals, provider signature ingestion or statutory validity. No close certificate exists in these fixtures, so rollback of an actual certification invalidation remains unproven. Outbox rows are retained as database evidence; no worker dispatch or provider send runs.

`payroll-settlement-postgres-jest.json` records 14 passing tests, no skips. Focused payroll-test ESLint, repository TypeScript (session 61652, exit 0) and scoped whitespace checks passed. All 93 recorded migration checksums match source.

**Item overview and record search: 9 PostgreSQL scenarios.** The actual read services and module decisions query synthetic stored records.

- Identity-only access excludes quantities and prices. Active managed-location scope excludes unrelated/inactive locations; tenant administrator scope includes other active tenant locations. Stored zero, unknown stock and exact fractional quantities remain distinct.
- 205 same-name managed locations traverse as 100/100/5 rows with no duplicates or omissions. Foreign and newly unauthorized cursors restart within current scope; a foreign item remains unavailable. Archived/untracked states are explicit.
- Customer and PO results use the user-approved tenant-wide destination read scope even with no location responsibility or customer assignment. Foreign records and contact/financial fields are absent. French item titles come from stored localization.
- Customer analytics permission remains required; missing domain grants and managed module denial remove results. Each domain returns at most ten rows, places exact references first and excludes soft-deleted records.
- An exclusive lock on the isolated database's item table causes a real item-query timeout. Customer/PO results remain available with an explicit partial-domain marker; the item domain recovers when the lock releases. No application table was locked.

These are read-service tests with explicit actor context. They do not prove session retrieval or role changes in browser actions, nor representative query-plan or latency targets.

**Audit explorer: 7 PostgreSQL scenarios.** Real stored role checks, entity/location predicates, safe SQL projections and cursor queries are exercised.

- Private role identifiers, tokens, reasons, network identifiers and arbitrary payload fields are removed; unsupported actions are omitted. Revoked stored authority and locked accounts are rejected.
- Fifty-five equal-timestamp events page without duplication. A newer insertion is excluded by the original upper bound. An older backfilled event remains visible on a later page: the contract is an event cutoff, not a frozen multi-request database snapshot.
- Foreign and changed-filter cursor anchors fail. Stock events require authorized locations and tenant-consistent item lines; an intentionally malformed cross-tenant line is excluded. Revoking location responsibility removes its events.
- Actor identity is absent without user-read permission and actor filters are forbidden. Module denial removes item events. Action/actor/entity/UTC-day filters combine before pagination.

`item-search-postgres-jest.json` and `audit-explorer-postgres-jest.json` record 9 and 7 passing tests with no skips. The isolated database evidence now totals **63 scenarios plus 11 target guards**. Focused ESLint passed; repository TypeScript is recorded in execution status when its active run completes.

## Reproduction

Use the existing isolated target; do not rerun bootstrap against its existing name. Bootstrap is only for a fresh unique database. The following process-local variables do not enable application features:

```powershell
$env:RUN_UI_WORKFLOW_POSTGRES='1'
$env:UI_WORKFLOW_POSTGRES_DATABASE='stoquify_local_ui_workflow_20261004_01a10672'
node node_modules/jest/bin/jest.js --config jest.ui-workflow-postgres.config.cjs --runInBand
node scripts/record-ui-workflow-postgres.cjs stoquify_local_ui_workflow_20261004_01a10672
```

The dedicated Jest configuration limits discovery to `tests/postgres/ui-workflow`. Its initial whole-worktree discovery was stopped by exact verified process ID before any database connection, then replaced with bounded discovery. The application server was not stopped. Fixtures use unique synthetic tenants and `.invalid` email addresses, preserve their records for inspection, and do not send messages. Database failure-injection triggers are removed in `finally`; no application trigger is touched.

## Still open

- Communications delivery database fixtures; representative query plans/volume for read models, historical-actor audit variants and action/session/browser integration.
- Payroll statement-source/account/currency variants and populated close-invalidation rollback.
- Additional access-request schedules (revocation while waiting and module admission changes), broader target acceptance, populated browser/password/session-recovery tasks and operating/retention ownership.
- Additional forced worker-first/operator-first schedules, permission revocation while waiting, bounded multi-page populated scans and volume/lock-duration measurements.
- Representative existing-data migration upgrades, database restore, retention and rollout rollback drills.
- Populated/restricted-role EN/FR browser tasks, actual 390px and screen-reader checks, operating ownership and pilot acceptance.

These results remove the unidentified-database blocker for local engineering verification. They do not identify a pilot cohort or authorize feature activation. Keep all application command flags off and all roadmap release gates open until the remaining evidence and acceptance exist.
