# HR-00 — baseline and isolated verification

Date: 2026-10-24. Status: **VERIFIED for the scoped baseline/environment criteria**, not application or release certification. Branch: codex/migration-control-plane-release-2026-08-29. HEAD: 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus inherited changes.

## Baseline and ownership

The complete starting status is in baseline-status.txt; selected source hashes are in baseline-hashes.json and inherited changes in inherited-owned-paths.diff. No inherited changes were reverted. Initial ownership covers the leave ledger service, operational-time writer, a narrow leave locking helper, relevant tests, isolated test configuration and this evidence/register addendum. Later slices declare their additional files before editing.

Product scope remains 1–200 employees, OHADA zone, office and shifts. The technical payroll envelope remains Cameroon/monthly/single-employer. Pilot country, employer rules and qualified statutory review remain unresolved and do not block synthetic correctness tests.

## Current finding reconciliation

| Finding | Current source evidence and disposition |
|---|---|
| F01 | Operational certification sums imported values, sourceRevision is fixed at 1, approved correction values are not consumed and overlapping leave uses whole requestedMinutes. Confirmed; HR-02/03 pending. |
| F02 | Manual leave posting has no root transaction; decision CAS protects a single request but separate requests can overspend. Confirmed before HR-01 edits. |
| F03 | Lifecycle application immediately updates status/fields using pending effectiveAt, without a due-date guard. Confirmed; HR-04 pending. |
| F04 | Scope resolver limits relationships before membership checks; profile uses limit 1; People route requests 50 and payroll service caps at 100. Confirmed; HR-05/06 pending. |
| F05 | Existing production-admission guard and exact-replay exceptions are implemented; no replacement gate required. HR-07 verifies current boundaries. |
| F06 | Directory/profile operating gaps remain assessment evidence; source still uses capped discovery and existing authoring services. Later workflow work must re-trace callers rather than infer missing backend services. |
| F07 | Approval UI still renders “Approval evidence hash”; operating ergonomics remain future HR-14 work. |
| F08 | Manager/self-service read model still reports TASK_LEDGER_NOT_CONFIGURED and RAW_DOCUMENT_ACCESS_NOT_CONFIGURED. Confirmed capability limits. |

Graph discovery: graphify-out/graph_actions.json and graph_components.json have September 2026 timestamps. The actions graph includes the leave-balance.actions.ts/postHrisLeaveBalanceEntryAction nodes. Current source, not graph freshness/counts, establishes behavior.

## Writer and transaction map

| Path | Owner at baseline | Required outcome |
|---|---|---|
| protected postHrisLeaveBalanceEntryAction → postHrisLeaveBalanceEntry | Root client used directly; ledger/read/audit separate | HR-01 owns transaction and ledger/replay locks |
| decideOperationalTimeRequest → leave approval | Root wrapper or caller-supplied transaction; pending request CAS; ledger/event/outbox/audit inside transaction | Keep CAS; serialize the shared balance across distinct requests and manual postings |
| request/approve/applyHrisEmployeeLifecycle | Existing transaction helper; effective projection stored with employee metadata | Preserve owner, repair date/transition semantics in HR-04 |
| resolveHrisPeopleAccessScope | Read resolver with scope audit writes | Correct target query and temporal authority in HR-05; do not expand grants |
| certify/correct time-leave → payroll snapshot | Existing certification/freeze and correction transaction owners | Reuse immutable snapshot boundary in HR-02 |

Production TypeScript writer search found the leave service and operational-time approval as ledger creators. Test/graph artifacts are not application writers. No schema modification is required for the initial leave lock strategy.

## Isolated PostgreSQL environment and command preflight

Installed PostgreSQL 17.5 binaries were found at C:/Program Files/PostgreSQL/17/bin. A new cluster was initialized under the current task's writable visualization directory, in hris-postgres-20261024. It binds only 127.0.0.1:55464. The new database is stoquify_local_hris_20261024; role hris_test has no production credentials. The directory did not exist before initialization. No existing application database was used, reset or inspected.

The user explicitly requested establishing this verification environment. Sandbox loopback access failed; the approved elevated execution connected only to this named test instance. A first sandbox-owned server stopped when its process context ended; the elevated server recovered its own fresh cluster. No approval review rejection occurred. PostgreSQL logs remain in the owned runtime directory.

Current schema.prisma was copied into the isolated directory. Prisma db push --skip-generate ran there against an explicitly supplied URL to the new empty database. This is schema synchronization for service tests, **not migration replay or trigger certification**. Prisma reported loading an ancestor .env automatically; no target was derived from it, and the printed datasource confirmed the explicit owned database. Existing wrapper fallbacks to application .env were not used. No generated client or application schema file was changed.

The dedicated Jest config avoids nextJest(dir), application setup and Prisma mocks. Its test module refuses missing/wrong host, port, database or schema; it asserts current_database(). Fixtures use a random hris-verification namespace, two organizations, distinct HR/requester/reviewer identities and 0/1/50/51/100/200 populations. Deletion is bounded to those exact organization IDs. Population fixtures were created/count-checked/deleted; final organization cleanup was asserted. This establishes fixture preparation, not browser role acceptance or production RBAC provisioning.

No reset helper was run. Database tests require elevated loopback access in this host. The test cluster should be stopped with pg_ctl -D <the exact task-owned data directory> -m fast -w stop after verification; preserve evidence and do not recursively remove an unresolved path.

## Acceptance and executed evidence

| Criterion | Outcome | Evidence |
|---|---|---|
| HR-00-AC01 | PASS | Finding reconciliation above, retained current source baseline |
| HR-00-AC02 | PASS | Writer map, reviewed workflow/config/setup/runner definitions |
| HR-00-AC03 | PASS | Explicit new target; postgres-rehearsal-and-ledger.json includes population/cleanup rehearsal |
| HR-00-AC04 | PASS | Product scope and unresolved domain decisions recorded |
| HR-00-AC05 | PASS | One next active slice: HR-01; historical WPs preserved |

- Workflow contract: PASS, 196 unclassified scripts still require review.
- Mocked baseline: 4 suites / 27 tests PASS; baseline-jest.json.
- Real PostgreSQL first run: 1 suite / 15 tests PASS; postgres-rehearsal-and-ledger.json. Includes HR-00 fixture rehearsal and initial HR-01 tests; expanded HR-01 results belong to that slice.
- Browser/provider/qualified statutory review: NOT RUN; no claim of those acceptance classes.

Architecture/data/security/QA review: existing service ownership, explicit target, scoped fixture cleanup and no production mutation. HR/product review: confirmed workforce scope. SRE: local startup/recovery limits recorded. Frontend/accessibility, commercial packaging and unrelated AI/inventory/AP changes: not applicable to this environment slice. Domain legal review remains required for future live payroll.

Next: complete HR-01 acceptance, then HR-02. This report does not activate any capability or reset the historical payroll program.
