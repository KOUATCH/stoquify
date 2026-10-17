# Local demo journal repair — 2026-10-14

## Scope and outcome

Explicitly authorized repair in local PostgreSQL database `stoquify_replay_next_20260830`, organization `rds_org_001` (Wilkinson - Feeney 001). Repaired journals `RDS001-JE-001` through `RDS001-JE-012`: 60 lines, 120 previously-null `baseDebit` / `baseCredit` fields.

All affected lines and organization settings use XAF; every recorded exchange rate is exactly 1. Existing debits and credits therefore supply exact functional amounts. Their original activity totals remain **1,088,370.00 XAF per side**. No nominal amount, account, header, status, date, period, posting batch or close record changed.

Each journal has an `AuditLog` record with action `DEMO_JOURNAL_BASE_AMOUNTS_REPAIRED`, complete before/after line data, repair version and snapshot hash. The maintenance action does not impersonate the browser's signed-in accountant.

## Source inspection

- The report correctly refuses missing functional-currency evidence. Its validation was preserved.
- Current seed code already supplies base amounts; these 12 journals predate that correction.
- Live inspection found no non-internal journal-line triggers in this local database. No trigger, function, constraint or schema was altered or disabled.
- Linked close records were synthetic placeholders: draft runs, unbound/unhashed evidence, uncertified zero-row placeholder exports, and open reviews. The runner refuses actual close assessments or certified evidence.
- The seed includes a closed January period placeholder attached to a May journal. This unrelated fixture inconsistency was preserved; the repair does not certify period correctness or close readiness.

## Verification

- Workflow: `npm run agent:workflow:check` passed.
- Pure validation tests: `node --test scripts/__tests__/repair-demo-journal-base-amounts.node-test.cjs` — **15 passed**. These tests do not connect to PostgreSQL or mock application success.
- PostgreSQL: dry run validated exactly 12 entries / 60 lines and saved a complete local snapshot. A serializable transaction rehearsal executed the repair and audit writes, deliberately rolled back, then confirmed identical original data and zero repair audit records.
- PostgreSQL: applied the same reviewed snapshot hash successfully. An exact before/after comparison permitted only the 120 base fields to change; 12 audit records were required in the same transaction.
- PostgreSQL: subsequent read-only run returned `ALREADY_REPAIRED`, with zero missing fields. An independent organization-wide posted/reversed-line diagnostic also found zero missing base amounts.
- Browser: Edge, English, Accountant role, `/en/dashboard/accounting/reports/trial-balance`, desktop screenshot 1523 × 792. Before repair, the page displayed the missing-evidence error. After reload, it rendered 18 accounts and **Balanced**. Whole-workspace displayed activity totals were **66,981,737 FCFA per side**, with **62,362,950 FCFA per side** in net balances. These include other workspace journals beyond the 12 repaired entries.
- No production deployment, broad seed, migration, build, real concurrent-writer test or mobile check was run for this repair.

## Runner and retained evidence

Runner: `scripts/repair-demo-journal-base-amounts.cjs`. Defaults to a read-only dry run; `--rehearse` and `--apply` require the exact reviewed snapshot hash. The new commands were inspected directly for side effects rather than added to the unrelated shared command registry. No DDL or guard bypass is implemented.

Before hash: `d627c60bf66c1e50820ff6bb5b579b2c863badf169c5990ebf2357c59659c73b`

After hash: `806b7d8e20c8c0e649e583496e9e1e1610a321a9cec2b94475e3a963c466310a`

Local backup and execution receipts are retained under `.codex-tmp/rds001-functional-amount-repair-v1/`; the immutable hash-named `.before.json` contains the original evidence. Database audit rows retain the original line values as well. A later rollback would require a fresh comparison against these records and a separately reviewed transaction, because reverting the base amounts would deliberately make Trial Balance unavailable again. The rehearsal tested atomic failure rollback before committing.

Screenshot: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/13/01a13539-2e52-75f3-81fd-5ccb62bf2097/trial-balance-repaired.jpg`.
