# Payroll unblock register — status summary

Updated 2 November 2026. This publication summarizes the complete 601-entry register retained in [canonical Markdown](../database-seed/PAYROLL-UNBLOCK-REGISTER.md) and [machine-readable register](payroll-unblock-register.json). No entry was removed or marked approved by this continuation.

Real PostgreSQL: 7/7 service transaction tests and 3/3 SQL approval/rollback checks passed on a fresh local database after 120 migrations. Existing mocked/unit regression: 152/152 tests across five suites passed. Disposable-target guards: 7/7 pure checks passed.

## Counts, unchanged

| Status | Entries |
|---|---|
| VERIFIED | 8 |
| RECORDED | 90 |
| PENDING_HUMAN | 319 |
| OPTIONAL_OR_CONDITIONAL | 52 |
| PENDING_INDEPENDENT_RECOMPUTATION | 18 |
| PENDING_RESEARCH | 49 |
| CONDITIONAL | 15 |
| BLOCKED | 42 |
| PENDING_ENGINEERING | 7 |
| COMPLETED_ENGINEERING | 1 |

## Seven parent engineering tasks

| Task | Current evidence | Remaining work |
|---|---|---|
| ENG-02 | calculatePayrollRun currently passes taxableBaseAmount, capabilityStatus and currency only. Supply authoritative prior taxable base/withholding and named adjustment values after ENG-01. | calculatePayrollRun currently passes taxableBaseAmount, capabilityStatus and currency only. Supply authoritative prior taxable base/withholding and named adjustment values after ENG-01. |
| ENG-03 | Replace or justify missing-snapshot/zero fallbacks; define tax-year selection independently of tenant fiscal year. | Replace or justify missing-snapshot/zero fallbacks; define tax-year selection independently of tenant fiscal year. |
| ENG-04 | Calculation owning-client transactions use Serializable with up to three conflict retries. Real PostgreSQL retry/rollback and stored-run replay are verified. Existing history query still uses strictly earlier pay dates; legal same-day/off-cycle membership remains pending. | Integrate approved history membership and stale-history denial with complete new-run/correction creation, then verify full lifecycle. Preserve explicit caller-owned isolation for injected transactions. |
| ENG-05 | Current correction delta occurs after tax evaluation. Bind original/replacement/reversal chain without double-counting. | Current correction delta occurs after tax evaluation. Bind original/replacement/reversal chain without double-counting. |
| ENG-06 | Snapshot currentAmounts keeps the pre-adjustment taxable base; evaluator floors raw negative tax. Align authoritative stored bases and refund treatment with ENG-01. | Snapshot currentAmounts keeps the pre-adjustment taxable base; evaluator floors raw negative tax. Align authoritative stored bases and refund treatment with ENG-01. |
| ENG-07 | Produce reviewed payroll-service cross-month, register, payslip, posting, declaration/payment and close-invalidation proofs. | Produce reviewed payroll-service cross-month, register, payslip, posting, declaration/payment and close-invalidation proofs. |
| ENG-08 | Existing seed calculates only m===10 (September 2026). Add ordered, idempotent remaining-month lifecycle operations only after prerequisites. | Existing seed calculates only m===10 (September 2026). Add ordered, idempotent remaining-month lifecycle operations only after prerequisites. |

## Database substeps completed

ED-05 records actual PostgreSQL evidence for shared transaction isolation, bounded conflict retries, rollback, stored-run replay, changed payload and tenant denial. SQL tests prove one complete approval evidence winner, duplicate denial and atomic failure rollback. A client error injected after a real commit proves callback replay recovery; physical network-loss testing is not included.

Full new-payroll creation with admitted statutory rules, cross-month history membership, approval-time stale-history comparison, real network-loss testing, and the complete downstream lifecycle remain unverified. The acknowledgement-loss test injects a client error after a real commit; it does not cut the network. SQL approval checks exercise migrations/triggers directly, not the full authenticated approval service.

All 16 composite review decisions remain PENDING_REVIEW and all 22 independently calculated fixture expectations remain null. No production authorization was recorded. See the [Draft 4 report](PAYROLL-UNBLOCK-REPORT-2026-11-02-ENGINEERING-V4.md), [calculation contract](PAYROLL-CALCULATION-CONTRACT.md), [reviewer checklist](PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md) and [database evidence](evidence/postgres-run.json).
