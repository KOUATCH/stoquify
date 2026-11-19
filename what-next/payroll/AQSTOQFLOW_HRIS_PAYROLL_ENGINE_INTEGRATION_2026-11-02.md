# Payroll and database continuation — 2 November 2026

Status: **ENGINEERING_PROGRESS_STATUTORY_EXECUTION_BLOCKED**. Database: `stoquify_replay_dataset_20261028_01`. The user confirmed that signed reviewer decisions, independent fixture results and the approved calculation contract are not available. Engineering progress below preserves that boundary.

## Completed engineering

- Added v2 observed-history integrity/currentness checks before new independent review, approval, payslip emission and posting. New or missing prior rows, changed source snapshots/hashes, scope mismatches and incomplete amounts are rejected. The existing selection policy is preserved; it does not prove legal history membership.
- Added a protected numeric-v2 marker to new calculations and a narrow trigger preventing that existing marker from being changed or removed. Other metadata edits and legacy records retain their existing behavior; no frozen records were backfilled. The new migration is applied to the owned disposable dataset.
- Closed the older combined approval/posting route for new v2 runs. Successful committed replay remains available, and legacy-only transitions retain their existing gates.
- Added a separate deterministic twelve-month period-gate runner, without reseeding. It requires an inspected, hash-bound plan, authenticates retained synthetic users and records exact service outcomes. Full payroll calculation and downstream lifecycle are still gated and unimplemented by this runner.

New v2 calculations require the independent command workflow. Environments using the older combined command must adopt the governed trust-spine workflow before processing new v2 runs. Runtime feature configuration was not changed by this continuation.

## Actual execution outcomes

| Outcome | Result |
|---|---:|
| Planned organization/month slots | 36 |
| Historical period-service attempts | 33 |
| Blocked period gates | 33 |
| Periods created | 0 |
| Existing periods reused | 0 |
| October slots pending | 3 |
| Completed payroll lifecycles | 0 |
| Unexpected runner failures | 0 |

The six November–December 2025 attempts lack effective published pack coverage. The other 27 historical attempts lack reviewed CNPS provenance. October retains its October 31 pay date and observation cutoff of October 28; elapsed calendar time does not supply the missing observations. Existing payroll runs and period records were preserved. See [execution results](../../docs/database-seed/payroll-continuation-2026-11-02/payroll-continuation-results.json), [plan](../../docs/database-seed/payroll-continuation-2026-11-02/payroll-continuation-plan.json) and [database inspection](../../docs/database-seed/payroll-continuation-2026-11-02/database-inspection.json).

## Verification, with separate evidence classes

| Evidence class | Fresh result | Practical limit |
|---|---|---|
| Scoped mock/unit tests | 207/207 passed, 7 suites | Regression evidence; no statutory approval |
| PostgreSQL service tests | 23/23 passed | Synthetic isolated scopes on a fresh database |
| SQL approval/rollback checks | 3/3 passed | Actual database contenders, uniqueness and rollback |
| Fresh migration replay | 121 applied | Fresh test database; application database unchanged |
| Source-only TypeScript | 0 owned / 0 imported diagnostics | No runtime or browser certification |
| Research artifact checks | 19/19 passed | Exact retained bytes and documentary integrity |
| Whole retained dataset | 1124 checks passed | Read-only recheck; last complete ordered scenario replay was October 29 |
| Business fingerprint | Unchanged | Tracked business state compared with retained pre-continuation evidence |
| Authentic reviewer preflight | 4/12 conditions | **BLOCKED_PENDING_QUALIFIED_REVIEW**; not ready for publication |
| New browser checks | Not run | Existing limited browser evidence remains historical |

See [unit results](../../docs/database-seed/payroll-continuation-2026-11-02/history-proof-unit.json), [fresh database run](../../docs/database-seed/payroll-continuation-2026-11-02/history-proof-postgres/postgres-run.json), [SQL checks](../../docs/database-seed/payroll-continuation-2026-11-02/history-proof-postgres/trust-spine.json), [service results](../../docs/database-seed/payroll-continuation-2026-11-02/history-proof-postgres/service-transactions.json), [type check](../../docs/database-seed/payroll-continuation-2026-11-02/typecheck.json), [local deployment](../../docs/database-seed/payroll-continuation-2026-11-02/history-guard-deployment.json) and [whole-dataset verification](../../docs/database-seed/payroll-continuation-2026-11-02/whole-dataset-verification.json).

The PostgreSQL fixture constructs isolated synthetic PAID history records directly and exercises real transactions, triggers and approval-service boundaries. Normal employee payroll creation, real actor authentication and admitted statutory calculations require their separate acceptance evidence. Two early PostgreSQL attempts exposed fixture assumptions about the current model, deletion behavior and unique period ranges. Their failed results are retained in the attempt-1 and attempt-2 evidence folders; the final rerun uses corrected fixtures and unchanged production controls. The [separate legacy deletion finding](../../docs/database-seed/payroll-continuation-2026-11-02/history-proof-legacy-delete-finding.md) records the pre-existing trigger behavior without changing its policy.

## Source preparation and reviewer return

Seven additional official DGI PDFs were retained and parsed, alongside re-verification of eight existing artifacts. The preparation maps fifteen rule paths and eleven scenario families. The consolidated 2025 CGI remains unrecovered; the official targets returned 404. A source-reference discrepancy in the scanned 2026 circular is preserved for reviewer reconciliation. Source discovery and byte checks do not constitute statutory interpretation or independent fixture approval.

Read the [reviewer handoff](../../docs/database-seed/payroll-unblock-workpapers/source-research-2026-11-02/REVIEWER-HANDOFF.md), [source verification](../../docs/database-seed/payroll-unblock-workpapers/source-research-2026-11-02/preparation-verification.json), [source manifest](../../docs/database-seed/payroll-unblock-workpapers/source-research-2026-11-02/retained-source-manifest.json), and [historical AP admission finding](../../docs/database-seed/payroll-unblock-workpapers/source-research-2026-11-02/AP-2025-ADMISSION-FINDING.md).

## Work that remains blocked

All 15 originally empty payroll-dependent tables remain empty. The 18 historical supplier invoices remain matched and unposted. The remaining parent tasks are recorded in the [detailed register](../../docs/database-seed/PAYROLL-UNBLOCK-REGISTER.md) and [machine register](../../docs/database-seed/payroll-unblock-register.json).

Required inputs are authentic effective-dated 2025/2026 rules; independently calculated expected results; the approved tax-year/history, adjustment, correction/reversal and refund contract; reviewer/checker evidence; legal-owner publication and production-admission authority. After those inputs, complete authoritative YTD/adjustment binding, full cross-month service acceptance, certified input snapshots, annual payroll, payslips, payment/declaration and accounting/close reconciliation. Re-preview the eighteen AP invoices only after an authorized 2025 VAT publication.

The retained application database was not changed. No live payment, external message, tax filing, statutory approval or production deployment was performed.

## Reproduce the bounded continuation

Generate and inspect the plan first; the execute command records real blockers and returns the dedicated blocked status when prerequisites are absent.

```powershell
node scripts/run-disposable-payroll-continuation.cjs plan stoquify_replay_dataset_20261028_01
node scripts/run-disposable-payroll-continuation.cjs execute stoquify_replay_dataset_20261028_01
```

The source-only check is `node scripts/check-payroll-continuation-types.cjs`. Fresh PostgreSQL tests require a new guarded database name and a dedicated output directory; see the retained run command. Databases and evidence are retained; no automatic deletion is included. The next skill handoff is country-pack provenance after authentic review prerequisites arrive.

## Skill control record

Scope and inspected sources: payroll-control.service.ts, payroll-history-proof.ts, the period-gate runner and plan, the marker migration, current payroll fixtures/tests, the qualified-review preflight and detailed work register. Exact source hashes and execution evidence are retained in the continuation summary and database-run records.

HRIS retains ownership of employee and attendance truth; payroll consumes certified input and frozen calculation evidence, while accounting retains ledger truth. This slice validates retained payroll-line history and does not certify or rewrite raw HRIS observations.

Existing tenant authorization and independent actor controls remain in place. The new checks run after authorization and bind organization, employee, currency and source evidence. The database tests use explicit synthetic service actor inputs; real session authentication and browser access remain separate acceptance work.

Existing transactional event, audit and outbox controls are reused. Runner logs redact database URLs and token/secret values; a scoped scan found no credential values in public continuation JSON/log evidence. Private runtime credentials remain in ignored storage.

Residual limits include the unreviewed tax-year/history-membership and correction contract, legacy-only transition policy, the separately recorded DELETE-trigger behavior, and absent statutory fixtures/admission. No full annual payroll, new browser checks, broad build or production release is certified. The next handoff is `aqstoqflow-hris-payroll-12-country-pack-provenance` after authentic review evidence is available.
