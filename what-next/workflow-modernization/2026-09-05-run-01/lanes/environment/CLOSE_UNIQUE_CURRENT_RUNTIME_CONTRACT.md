# Unique-current close certification: isolated runtime contract

Driver: `close-unique-current-runtime.cjs`. Execution requires coordinator release after source freeze; authoring and syntax checks do not establish a runtime pass.

Use the existing owned loopback disposable DB guard and actual accounting fixture services. Five new organizations each receive one explicitly synthetic balanced setup journal. Record these setup effects separately. No customer organization, customer approval, migration, seed, delivery worker or external service is involved.

The existing fixture creates accounting mappings/rules, independently marks setup ready, independently posts the synthetic journal and runs actual evidence collection. Each positive race starts only if this real assessment reaches READY/T4. The driver never assigns READY or T4 to make a certification test pass.

## Required boundaries

Publication and certified export use `ReadCommitted` and the same tenant/period advisory lock. Certification obtains that lock before the existing close-run row lock. Publication checks the actual database clock at millisecond precision and must not invent a greater timestamp when ordering is uncertain.

The creator calls real `runCloseAssurance` on a separate Prisma client selected through `AsyncLocalStorage`. A proxy observes actual SQL/model calls; it does not replace service results. It pauses after the real RUNNING insertion inside the publication transaction, then can pause the transaction result after commit so collectors have not started. The certifier barrier occurs after the actual scoped reload under both locks. Distinct PostgreSQL backend PIDs and `pg_blocking_pids` must establish blocking before either barrier is released.

## Assertions

1. **Pinned earlier READY read:** Re-read the actual earlier/later same-source fixture from receipt `close-unique-current-readonly-333cca19-74f1-421e-86d0-39b38c693c15.json`. Existing actor authority is verified without changes. The older record remains readable and eligible for draft export, but no longer offers certification. The existing latest READY still offers certification.
2. **Publication first:** A real creator inserts RUNNING while holding the period lock. Certification of the older actual READY waits. After publication commits, that certification returns CONFLICT with no certified artifact. The real RUNNING assessment is current; its collectors subsequently complete normally.
3. **Certifier first:** Certification of the current READY holds the shared boundary. The creator waits until certification commits. The retained artifact remains unchanged when a newer real RUNNING becomes current. That assessment subsequently completes through actual collectors.
4. **Adverse ordering:** An actual later assessment blocks old certification. A directly injected tenant-local VOIDED state is clearly labeled an adverse imported-state fixture, remains retained and cannot certify. Recovery uses another real assessment. Equal latest timestamps reject certification; a new real assessment with a strictly later database timestamp can resolve that ambiguity. A future imported timestamp rejects publication without inserting a row or synthesizing time. Timestamp test faults are restored exactly.
5. **Tenant independence:** While one tenant/period advisory lock is held, real assessment publication in another owned tenant commits on a different connection.
6. **Period independence:** While one tenant/period is held, publication in another actual period of the same owned tenant commits. No READY/T4 result is required or fabricated for this future-period collector.
7. **Source invalidation regressions:** Reuse the established real two-PID invalidation scenario on two fresh actual fixtures. The new observer permits the newly required tenant-scoped `periodId`-only discovery read before locking; all full evidence reads still require the row lock. Preserve the old helper unchanged. Check both certifier-first and invalidator-first, retained artifacts and stale evidence, under the new period lock.
8. **Cross-tenant object denial:** Request another owned tenant's close-run ID through certification. Require NOT_FOUND and unchanged foreign history.
9. **Inconsistent imported period reference:** Temporarily point one owned tenant's historical run at another owned tenant's period. Both certified and draft export must return NOT_FOUND. Restore the exact original period and update timestamp; both retained histories must remain unchanged. This is a synthetic import fault, not a repair of customer data.

All historical drivers and receipts stay unchanged. Record source hashes before/after, per-operation financial hashes, a final setup-to-completion financial hash, outside-fixture hashes, exact fixture IDs and each outcome. Existing financial fingerprint coverage is explicitly bounded to the inherited eight models; this is not comprehensive financial, professional or release certification.

The earlier baseline establishes a read/control offer mismatch only: it did not execute an obsolete certified export. Current product guards and real races must supply the write-boundary evidence.
