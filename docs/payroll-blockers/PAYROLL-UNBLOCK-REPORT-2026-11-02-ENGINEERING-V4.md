# Payroll unblock engineering report — Draft 4

Updated: 2 November 2026. Contract: `STOQUIFY-CM-PAYROLL-CALCULATION-2026-11-02-DRAFT-4`. Statutory review and production admission remain pending.

## Completed engineering

ED-05 records the new scoped database verification and harness repair.

Real PostgreSQL: 7/7 service transaction tests and 3/3 SQL approval/rollback checks passed on a fresh local database after 120 migrations. Existing mocked/unit regression: 152/152 tests across five suites passed. Disposable-target guards: 7/7 pure checks passed.

The existing production transaction helper is exported with an internal-use annotation so database tests execute its actual code. Its isolation, retry, error and injected-client behavior is unchanged. A new guarded runner creates a fresh local target, refuses existing databases, applies migrations, verifies database identity and retains sanitized results. It never resets or seeds the application dataset. Test configuration has no application Next config, environment-file loader or Prisma mocks; Prisma migration configuration reads the local environment file but the runner explicitly fixes every database URL to the fresh target and does not invoke the seed command.

The SQL approval harness had a real orchestration defect under the current close-source revision trigger: awaiting both preparation phases held the first transaction open while the second waited on the same organization. The repair starts both snapshots before writes and lets each contender finish independently. Connection, statement and idle-transaction deadlines bound the race. The original timeout and assertion failure are retained in the first-attempt evidence folder.

## Verification results and limits

| Check | Result | Evidence meaning |
|---|---|---|
| Migration deploy | 120 migrations passed | Fresh `stoquify_local_payroll_blockers_20261102_b27d8e04` on PostgreSQL 17.5; no application database mutation. |
| Production transaction helper | 6 tests passed | Real contention retry, uniqueness replay, three-attempt exhaustion, domain rollback, caller-owned transaction isolation, and injected acknowledgement-loss recovery. |
| Calculation service replay | 1 test passed | Concurrent stored-run replay, changed payload denial, cross-tenant period denial; no new statutory calculation. |
| SQL approval/rollback | 3 checks passed | One race winner and SQLSTATE 40001 loser; one complete evidence set; duplicate rejection; rollback of run/event/outbox/audit/transition. |
| Existing mocked/unit suites | 152 tests / 5 suites passed | Regression evidence only; not database or legal certification. |
| Disposable-target guard tests | 7 passed | Reject remote/protected/mismatched targets, production mode, arbitrary names and app-target reuse. |
| Workflow contract | Recheck failed | Unrelated `test:dev:startup -> next.config.mjs` fingerprint drift; needs owner review before registry refresh. |
| Full typecheck, browser, production | Not run | No project-wide or production readiness claim. |

Full new-payroll creation with admitted statutory rules, cross-month history membership, approval-time stale-history comparison, real network-loss testing, and the complete downstream lifecycle remain unverified. The acknowledgement-loss test injects a client error after a real commit; it does not cut the network. SQL approval checks exercise migrations/triggers directly, not the full authenticated approval service.

## Exact remaining work and inputs

| Task | Verified progress | Remaining dependency and work |
|---|---|---|
| ENG-02 | Explicit finite input checks and missing-history denial retained | Expert-approved algorithm and adjustment dictionary; wire certified YTD and adjustment amounts into actual new-run calculation. |
| ENG-03 | Version-2 observed-history fingerprint retained | Reviewer-selected tax year, history membership and opening balances; then implement completeness/gap detection and approval-time history comparison. |
| ENG-04 | Shared Serializable/retry boundary now tested on PostgreSQL; production callers already audited | Approved same-day/off-cycle rules; full new-run/correction races, stale-history handling and lifecycle replay. Future injected callers must explicitly own isolation/retry. Physical network-loss injection remains separate coverage. |
| ENG-05 | Existing correction-only protections retained | Expert full/delta/reversal/negative/cross-year semantics and independent examples; implement chain membership without double counting. |
| ENG-06 | Invalid/non-finite input denial retained | Expert-approved adjusted bases, branch-specific caps, tax/CAC storage, rounding and refund rules; then update stored authoritative components. |
| ENG-07 | Seven service DB tests, three SQL checks and 152 unit tests passed | F-01 through F-22 independently calculated results; all eleven release families and integrated register/payslip/posting/declaration/payment/close proofs. |
| ENG-08 | September-only runner and release denial retained | Admitted rules for each pay date and owner-approved D-15 October scope before full chronological execution. The October observation cutoff remains 28 October; elapsed calendar time does not fill missing observations. |

All 16 composite decisions remain PENDING_REVIEW. No reviewer identity, signature, selected statutory formula, approval or independent expected amount was invented. Seven parent engineering tasks remain pending, with completed substeps recorded separately. The next engineering step is a complete new-run fixture through certified input/admission boundaries once the calculation contract and independent expected amounts are supplied. Source-history membership and correction semantics must precede their production implementation.

## Evidence and reproducibility

Run `node scripts/run-payroll-blockers-postgres.cjs --database stoquify_local_payroll_blockers_YYYYMMDD_<8 lowercase hex characters>` using a fresh name on the configured local PostgreSQL server. This is a mutating disposable-database lane, not an audit command. It refuses existing targets and retains the created database. Credentials are read in process and omitted from evidence. No public provider or remote service is exercised. Guard tests: `node --test scripts/__tests__/payroll-blockers-target.node.test.cjs`.

Retained [database run](evidence/postgres-run.json), [service test results](evidence/service-transactions.json), [SQL checks](evidence/trust-spine.json), [unit regression](evidence/unit-regression.json), [guard results](evidence/target-guards.tap), [engineering results](PAYROLL-CALCULATION-ENGINEERING-RESULTS.json), [calculation contract](PAYROLL-CALCULATION-CONTRACT.md), [reviewer checklist](PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md) and [unblock register](PAYROLL-UNBLOCK-REGISTER.md).

Rollback only this slice's helper export, harness orchestration changes and newly added runner/tests if needed; preserve pre-existing edits and retained payroll records. The first and final disposable test databases are retained. No automatic database drop is part of this task.
