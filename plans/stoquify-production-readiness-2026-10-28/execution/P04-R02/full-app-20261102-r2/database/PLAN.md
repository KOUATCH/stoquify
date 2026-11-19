# P04-R02 disposable database resume — 2 November 2026, attempt r2

The only service target is PostgreSQL 17 at 127.0.0.1:53528, with real data directory .codex-tmp/p03-grant-20261028-r1/postgres and pinned binaries C:/Program Files/PostgreSQL/17/bin. The existing template and build/full synthetic databases are retained. No reset, reseed, migration or production connection is authorized.

The new candidate is .codex-tmp/p04-r02-fullapp-20261102-r2/source. Start requires the parent candidate context and successful admission receipt, exact storage ownership/realpaths and frozen schema/migration bytes before any service change. The stopped prior owner marker p04_actions/PID28112 is retained in a new receipt; ownership then transfers only to qualification_database_r2 for run resume-20261102-r2.

Start command: node plans/stoquify-production-readiness-2026-10-28/execution/P04-R02/full-app-20261102-r2/database/resume-cluster.cjs start

Readiness rechecks exact database/host/port/data-directory identity on every SQL connection, all 120 migration hashes and candidate/template schema-source equality, catalog fingerprints for all three databases, empty build/template admission tables, the existing 245-table seeded business digest, zero sessions, baseline audit counts and the unchanged credential password contract. Historical clone/seed/baseline receipts remain in ../full-app/database; new fixture-readiness.json and resume-20261102-r2-readiness.json are produced only after checks pass. Passwords/tokens are never written into public evidence.

Current stop command: node plans/stoquify-production-readiness-2026-10-28/execution/P04-R02/full-app-20261102-r2/database/guarded-cleanup.cjs stop. The owned PID plus real data path, port and attempt start time guard cleanup. Startup failure attempts bounded stop; SQL failure permits the already identified PID/path/time-bound stop fallback. Retain all databases and old receipts. Parent must first stop runtime/browser/proxies before normal DB cleanup.

No current readiness result is implied by this recipe. Actual session issuance, denied bytes, browser consumers and no-write observations belong to the parent runtime harness.

## Observed restart and readiness

The initial r2 start reached its 60-second timeout during normal recovery after the previous host interruption. Its exact PID-bound cleanup stopped the owned server and released port 53528; resume-20261102-r2-failure.json retains that failed attempt. Independently reviewed retry01 allows pg_ctl 180 seconds with a 200-second outer deadline, uses fresh logs/receipts, and requires the prior owned stopped-state/cleanup proof. Retry01 passed with PID 9496.

Fresh fixture-readiness.json and resume-20261102-r2-retry01-readiness.json bind candidate p04-r02-full-eb25ee4e218c: all three catalog fingerprints and 120 migration checksums match, the 245-table business digest matches the seeded baseline, sessions remain zero, and the eight named template/build admission tables are empty. This is retained-fixture validation, not fresh migration replay or application/browser qualification. No reset, reseed, migration or authority/session writes occurred.

Cluster remains running for the parent build/runtime; this worker owns final stop and port-release proof.

## Concurrent-client preservation guard

Before normal shutdown, guarded-cleanup.cjs requires two current pg_stat_activity inventories with zero other client backends (its own backend PID excluded). It records only connection metadata; no SQL text, application rows or environment is inspected. Any remaining client or inability to inspect clients refuses shutdown and preserves the running server. Ownership/PID/data-directory/port/start-time are checked again after inventory. These are current observations, not a reservation preventing a later new client connection. The parent must first confirm its runtime/browser is stopped. Initial startup-failure cleanup remains separately bounded in the old retry runner; use the new guarded cleanup for normal final shutdown.

## Stored synthetic reference inventory

reference-inventory.json passed against the exact full-app fixture database under a repeatable-read READ ONLY transaction. All three item IDs, organization IDs, imageUrls arrays and thumbnail values equal the declared fixture URLs and map to the three admitted synthetic candidate asset hashes. Expected private runtime paths are recorded separately from build/delivery evidence. The first attempt used the fixture API name imageUrl as a SQL column and failed; its rolled-back query and receipt remain in reference-inventory-attempt01.cjs/.json. The corrected query was independently reviewed before execution. No database writes occurred. This is not a live original-tenant reference census.
