# HR-01 — atomic leave ledger and decision serialization

Date: 2026-10-24. Status: **VERIFIED for HR-01 scoped service/database criteria**. Final PostgreSQL run: 1 suite / 24 tests PASS, including cleanup (58.357 seconds). Baseline and inherited changes are retained under HR-00. No schema change, country-rule change or deployment.

## Change and ownership

- leave-balance.service.ts now owns a Read Committed transaction for the default root-client action path and joins supplied transactions without nested commits.
- leave-ledger-order.ts uses the repository's existing PostgreSQL transaction-scoped advisory-lock pattern. Its key includes tenant, employee and policy and therefore covers empty ledgers. All discovered production ledger writers use it. Snapshot isolation is rejected explicitly to prevent stale reads after waiting for the lock.
- Manual replay keys are serialized separately across employee/policy changes. New hashes include entry type, source type and source ID. Exact older-hash replay remains recoverable only when those persisted semantic fields also match; historical hashes are not rewritten.
- Both manual posting and operational approval validate the balance at the effective date and every later dated balance. Backdated deductions cannot consume an already approved future commitment.
- Operational decisions retain their existing compare-and-set claim on REQUESTED. A losing distinct request rolls back its claim; event, outbox, ledger and audit stay in the existing transaction. Supplied transaction failures propagate to the owner.
- Tests update narrow fixtures for real lock/ledger operations. The new dedicated PostgreSQL suite uses real Prisma services, constraints and transactions; only deliberately injected persistence faults use a proxy. No provider is called.

## Acceptance matrix

| Criterion | Evidence |
|---|---|
| HR-01-AC01 | Competing independent 360-minute manual deductions and distinct approvals against 480: one winner, 120 retained. Mixed manual/approval race also covered. |
| HR-01-AC02 | Real transactions with injected event/create, ledger/create, audit/create and event-applied failures retain pending request and original balance; event/audit rows are absent. Default-path audit foreign-key failure rolls back the ledger. |
| HR-01-AC03 | Concurrent empty-ledger exact replay produces one entry/audit. Changed type/source/amount/date/evidence/employee/policy conflicts. Exact legacy-hash recovery is tested. |
| HR-01-AC04 | Unrelated employee/policy commits while another ledger transaction remains held. Foreign-tenant employee, missing permission and self-approval are denied. |
| HR-01-AC05 | Caller-injected failure rolls back supplied transaction. Duplicated decision creates one event and debit. Root default posting is exercised without a client override. |
| HR-01-AC06 | PASS: postgres.json records 24 passing tests and successful suite cleanup; prior cleanup-timeout run retained separately. |

## Verification and limitations

- Mocked focused regression: 3 suites / 13 tests passed after the service change (leave-balance, operational-time-decision-concurrency, operational-time).
- Focused TypeScript program with four source/test roots: zero diagnostics, including imported dependencies; noEmit=true, incremental=false. See typecheck.txt. This is not a whole-repository build.
- Initial real PostgreSQL suite: 15 tests passed. Expanded run: 22 tests passed. A subsequent 24-test run passed all assertions but failed its 30-second cleanup hook; preserved in postgres-cleanup-timeout.json. A direct scoped query later confirmed zero remaining synthetic organizations.
- Environment remediation: sandbox initialization selected 400 kB shared_buffers. The owned test server was restarted with 64 MB, and only fixture-cleanup allowance increased to 120 seconds. The same 24 correctness assertions were retained for rerun. No production setting changed.
- Browser/action-session authentication, provider behavior, migration replay, statutory review and deployment: not run. This service-only slice changes no UI. Existing protected action supplies server-derived actor/tenant and fresh auth; test claims are limited to the service and database boundaries exercised.

## Controls, recovery and review lenses

Architecture: one existing ledger owner, no new balance master. Data: no migration; immutable business entries and semantic retries preserved. Security: permission/tenant/independent-review denials remain server-side; test IDs and synthetic policies only. HR/product: prevents overspending without inventing entitlement rules. QA: concurrency barriers start contenders before either service executes; mocks and PostgreSQL evidence remain distinct. SRE: caller sees recoverable failure, no swallowed transaction errors; environment failure and retry are retained. Frontend/accessibility/commercial packaging and unrelated AI/POS/AP: not applicable to this service-only change.

Rollback: disable affected mutation entry points operationally if an invariant fails; retain all committed ledger/event/audit history. Do not remove locks to compensate for test or policy failures. The patch can be reviewed/reverted by owned hunks; the inherited workspace is not reset. Test cleanup uses exact generated organization IDs only.

Next dependent slice after final acceptance: HR-02 correction-to-certification revisions.
