# Evidence timing

The results and failure triage below describe the initial sweep. Later concurrent changes were rechecked; see [concurrent-changes-and-rechecks.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/concurrent-changes-and-rechecks.md>) before treating an initial failure as current.

# Verification results

## Existing unit/service/workflow tests

| Group | Suites | Passed assertions | Failed assertions | Pending |
|---|---:|---:|---:|---:|
| commerce | 114 | 1335 | 0 | 0 |
| finance | 65 | 665 | 8 | 0 |
| people | 73 | 552 | 15 | 0 |
| platform | 58 | 509 | 0 | 0 |
| supplement | 16 | 112 | 0 | 0 |
| Total (excluding duplicate smoke test) | 326 | 3173 | 23 | 0 |

The initial queue smoke test passed 3 assertions; it is excluded from totals because the commerce cohort contains the same test. Test selections and complete JSON/stdout/stderr are retained in verification/. No new application tests or source fixes were added.

**Runner limit:** normal Jest/nextJest startup attempts timed out without results. The successful audit-only CJS adapter uses the repository jest.setup.ts, installed Next SWC transformer, relevant roots, alias/server-only/font/style mappings and jsdom. It bypasses asynchronous Next configuration discovery. These results are useful current unit evidence, **not an exact CI pass**. DATABASE_URL and related variables target inaccessible localhost:1 for command checks; actual PostgreSQL/integration/mutating scripts were excluded. Prisma mocks are not database atomicity proof. The direct adapter is saved alongside the reports.

## Failure triage

- Accountant work desk: mock does not provide closeAssuranceFinding.findMany now queried by the service. This prevents intended assertions from reaching behavior.
- Manual journals: mock expects query.sql, while the current period lock uses a tagged raw query. The failure is the mock, not proof that live balanced journals throw this TypeError.
- Payroll backfill plan/execution/reconciliation: mocks lack current module configuration/grant dependencies. No actual backfill was run.
- Payroll statutory scenario tests: expected CNPS READY contradicts the current SUPPORTED_DRAFT capability gate. Preserve the gate pending qualified review; update fixtures/contracts intentionally.
- Business Pulse links: inventory.read versus destination-specific inventory.items.read expectation needs contract reconciliation. Current resolver checks requiredPermission; this is not evidence of unauthorized access.
- Any supplementary failures are retained verbatim in [verification/test-failure-register.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/test-failure-register.json>); do not classify a new failure as harmless without reviewing it.

## Other commands and probes

- Prisma validation: passed.
- Full TypeScript no-emit check: timed out after 420 seconds, with no completed result. Not passed.
- Eight structural gates passed: inventory boundary, inventory valuation truth, ledger close truth, payment cash truth, purchasing AP consolidation, offline replay, payroll presence, service boundary.
- Payroll trust-spine gate: blocked (5/6 ready), exact regression-text/persistence marker check. Transition behavior tests still ran in the people suite.
- Report-trust gate: blocked (30/35 ready). Failing clauses: service-owned currency, trust banner wiring, settlement reversal foundation, signed statement external access foundation, consented referral launch foundation. The first two inspect literal source strings and can be stale; the remaining clauses require explicit reconciliation with current contracts. No blanket false-positive dismissal.
- Audit behavior probes: seven current accounting behaviors and three offline queue conditions reproduced. Synthetic doubles isolate logic; authorization allowed in accounting probes, no live writes.
- Local database: metadata parity, migration hashes and aggregate tie-outs completed in READ ONLY transactions; raw business identifiers were not saved.
- Browser: attempted hidden in-app navigation to http://localhost:3000/en returned ERR_CONNECTION_REFUSED; no Node listening service was identified in the local check. No authenticated workflow, visual, screen-reader, keyboard or responsive-mobile test was completed.
- No current provider/authority sandbox, deploy, load, worker schedule, backup restore or mutating PostgreSQL concurrency test ran.

Every command wrapper records command, timestamp, exit/signal, timeout and sanitized database target in *.result.json. Historical runs and failed startup attempts remain preserved; none were overwritten to obtain a pass.

## Concrete scanner mismatch

The payroll gate searches for `retries a serializable transaction conflict and applies the transition once`; the current parameterized test title is `retries a %s serializable transaction conflict and applies the transition once` at services/payroll/__tests__/payroll-run-approval-transition.service.test.ts:964. The literal check therefore fails despite a present parameterized test. This explains one conjunct, not every possible gate condition. Evidence: [verification/payroll-scanner-marker-triage.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/payroll-scanner-marker-triage.json>).

## Rechecks after concurrent edits

| Recheck cohort | Suites | Passed | Failed | Source files changed during run |
|---|---:|---:|---:|---:|
| people | 73 | 552 | 15 | 0 |
| finance | 65 | 677 | 3 | 0 |
| supplement | 16 | 112 | 0 | 0 |
| changed-ui | 1 | 8 | 0 | 0 |

Do not add overlapping tests to the original total. [verification/recheck-summary.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/recheck-summary.json>) retains current failed-suite details.
