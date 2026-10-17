# Accounting correctness execution evidence

Scope: roadmap R02, R03 and R06; findings F01, F02, F07, F08, F09. Local implementation and mocked service verification only. No database, provider or deployed-environment changes were performed.

## Implemented boundaries

- Manual journals derive omitted denomination from accounting settings; foreign denominations require positive finite explicit exchange rates with at most six decimal places (the existing database scale). Functional-currency lines require rate one. Nominal and functional amounts remain separate. Existing two-decimal HALF_UP arithmetic is explicit; unsupported rounding settings fail closed. Rounded functional debits and credits must balance independently of nominal denomination groups.
- Posting revalidates persisted draft rate/base arithmetic and functional balance. Pre-fix inconsistent drafts require explicit correction. Generic posting cannot relabel a source-owned draft as MANUAL.
- Financial statements, trial balance and general ledger use persisted `baseDebit` and `baseCredit`. Missing base values cause explicit rejection, never nominal fallback or silent zero. Aggregate counts detect partially null populations that SQL SUM would otherwise skip.
- Accounting settings initialize from organization currency. Any actual existing functional-currency transition requires a controlled migration, matching organization-profile policy; normalized same-currency edits remain allowed. This deliberately also blocks transitions before LOCKED rather than presuming setup status proves no economic history.
- Generic reversal permits only MANUAL. Every other `AccountingSourceType` is denied before posting effects and records the existing durable denial audit. Settlement/suspense-specific guidance remains. Denial does not prove every source owner already implements complete compensation.
- Generic/manual reversal also rejects missing original functional amounts before creating a posting batch, and mirrors retained base decimals without nominal fallback. A null/unattributed source is explicitly rejected; it cannot bypass the outer denial result check.
- Monthly fiscal periods are clipped to the requested fiscal-year start and existing normalized end. Partial-month input remains supported, including leap-day and year-boundary cases.
- General-ledger balances combine posted/reversed functional activity strictly before `startDate` with inclusive range movement. `openingBalance` and `periodMovement` accompany existing `runningBalance` per row. Deterministic same-day ordering and a repeatable-read transaction keep opening and movement in one snapshot. The array return contract remains compatible.

## Ownership and navigation

Reviewed root AGENTS.md, current source, audit findings, roadmap and historical graph manifest/action graph. `graph_actions.json` node `accounting_journals_actions_ts` identifies the protected journal action surface; graphs were navigation aids, not current correctness proof. Parent owns the manual-journal lock mock repair and subsequent R07 period-close assurance integration. Fiscal clipping and tests were handed off before R07 edits. Unrelated dirty workspace edits were preserved.

## Verification record

- Initial ordinary Jest: 6 suites / 101 passed before final regression additions.
- Next ordinary Jest: 8 suites / 109 passed; command exit 1 solely because JSON output directory did not exist. The directory was then created and verification rerun with output capture.
- Subsequent ordinary focused run: 8 suites / 112 passed, but JSON writing was denied with EPERM; no focused JSON was produced. The authoritative captured broader run below includes those cases.
- `accounting-suite-results.json`: **49 suites / 579 tests passed**, exit 0, 114.122 seconds. Includes all accounting service suites and the financial analytics cash/completed-sales/provenance suites. Approved report-write access was necessary; no DB was used.
- `ledger-summary-results.json`: **3 suites / 26 tests passed**, exit 0, 32.455 seconds, after the compatible general-ledger summary and period-bound export corrections. Cases include an empty range retaining opening/closing 100, period-only effective bounds, conflicting dates rejecting before reads, tenant period rejection, nonempty opening + movement = closing, and summary coverage by the content hash.
- `manual-reversal-base-results.json`: **1 suite / 53 tests passed**, exit 0, 21.648 seconds, including missing debit/credit base rejection, exact foreign base reversal, tenant lookup and unattributed-source rejection.
- Two final broad-run attempts were intentionally stopped before completion while coordinating the latest source corrections and serializing memory-heavy checks. They produced no final JSON and are not successful verification evidence.
- `accounting-suite-final-results.json`: **49 suites / 600 tests passed**, exit 0, 80.25 seconds, on the final accounting source including the ledger summary, period scope, in-flight assessment guard, parent period preflight and manual reversal changes. This supersedes the earlier 579-test broad snapshot for service verification.
- Parent/verification worker owns full TypeScript checking and release truth-gate evidence. Six nullable-base compiler diagnostics were corrected through explicit missing-evidence rejection and type narrowing. Its subsequent ordinary full-scope incremental typecheck passed (4,771 files, no diagnostics; see `../runner/typecheck-incremental.*`).

Focused command:

```powershell
node ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/accounting/__tests__/journal-currency-regression.service.test.ts services/accounting/__tests__/posting.service.test.ts services/accounting/__tests__/general-ledger-balances.service.test.ts services/accounting/__tests__/financial-statements.service.test.ts services/accounting/__tests__/reports-export.service.test.ts services/accounting/__tests__/reports-retained-accounts.service.test.ts services/accounting/__tests__/manual-journal.test.ts services/accounting/__tests__/accounting-settings.service.test.ts --json --outputFile=what-next/platform-remediation/2026-09-30-run-01/accounting/focused-results.json
```

Independent fixtures: 100 EUR at illustrative 655.957 = 65,595.70 functional units; plus 100 functional units = 65,695.70; opening 100 + movement 25 = closing 125. Additional cases cover rates, HALF_UP, rounded-base imbalance, missing base evidence, compensating credits, all nonmanual source denials, fiscal bounds and tenant/date/state scopes. The illustrative FX rate is not a current-rate recommendation.

Final broad command (completed successfully):

```powershell
node ./node_modules/jest/bin/jest.js --runInBand services/accounting/__tests__ services/analytics/__tests__/cash-report-evidence.test.ts services/analytics/__tests__/completed-sales-evidence.test.ts services/analytics/__tests__/financial-reports.service.test.ts --json --outputFile=what-next/platform-remediation/2026-09-30-run-01/accounting/accounting-suite-final-results.json
```

## Remaining package obligations

1. R09 must inspect historical drafts/postings, currency authority and rate provenance on a verified read-only target. No existing base fields or posted entries were rewritten. Non-null but incorrect historic base values still require controlled remediation; missing values now block reporting visibly.
   Source-owned legacy base fallbacks remain for owner review at `customer-settlement-reversal.service.ts:411,414,746,747`, `inventory-adjustment-reversal.service.ts:161,162,651,652`, and `purchasing/purchase-correction-ledger.service.ts:171,172`. They were not changed by the manual reversal correction; historical FX compensation in those workflows is not qualified by this slice.
2. Qualified owners must approve FX source/date/version, functional currency, rounding, opening/carry-forward and partial fiscal-year treatment. New policy or provenance columns were not invented.
3. Real PostgreSQL concurrency/rollback and source-owned end-to-end compensation tests remain required. Unit mocks validate behavior, not database isolation or complete business effects.
4. The compatible array-only read action cannot expose an empty-range summary, but export now preserves it in additive hashed `general-ledger-summary.v1` while keeping its transaction data array unchanged. The shared report computes opening/movement/closing in one snapshot. Tenant period-only exports now derive effective bounds, and conflicting explicit bounds reject before querying. A real CSV/download/UI adapter remains unqualified.
5. Browser/export acceptance, source-to-ledger reconciliation, country qualification and pilot rollout remain outside this local slice. R07 is parent-owned. R02/R03/R06 are not certified complete packages.

## Source correction follow-up register

| Source family | Required owner and effects to prove |
|---|---|
| MANUAL | Accounting reversal: original nominal/base evidence, target period, maker-checker, linked correction and close invalidation. |
| POS_SALE, POS_PAYMENT, POS_REFUND, POS_VOID, CASH_DRAWER_CLOSE | POS/cash: sale/tender, stock, tax, provider refund evidence and ledger. |
| DELIVERY_ORDER, DELIVERY_GOODS_ISSUE, DELIVERY_INVOICE | Delivery/sales: fulfillment, stock/COGS, receivable and ledger. |
| GOODS_RECEIPT, SUPPLIER_INVOICE, SUPPLIER_PAYMENT, PURCHASE_RETURN, SUPPLIER_CREDIT_NOTE | Purchasing/AP: valuation, GRNI, allocations, supplier obligation and ledger. |
| STOCK_ADJUSTMENT, STOCK_COUNT, STOCK_TRANSFER, PRODUCTION_BATCH | Inventory/production: location movement, valuation, reservations and linked posting. |
| EXPENSE | Expense owner: approval, reimbursement obligation and ledger. |
| PAYROLL_RUN, PAYROLL_PAYMENT, PAYROLL_EMPLOYEE_BALANCE, PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT | Payroll: immutable corrections, employee balances, disbursement proof, liabilities and ledger. |
| PAYMENT_RECONCILIATION, PAYMENT_SUSPENSE | Reconciliation: resolution/reopening, allocations, evidence and clearing journals. |
| CUSTOMER_SETTLEMENT, CUSTOMER_SETTLEMENT_ALLOCATION, CUSTOMER_SETTLEMENT_REVERSAL, CUSTOMER_RECEIVABLE_DOCUMENT | AR: allocation, linked compensating reversal and receivable/ledger tie-out. |
| OPENING_BALANCE, IMPORT | Explicit opening/import owner: batch provenance and controlled correction. Manually created opening journals retain MANUAL source. |
| CUSTOMER_STATEMENT_SNAPSHOT, CUSTOMER_STATEMENT, CUSTOMER_STATEMENT_DELIVERY, CUSTOMER_STATEMENT_RECIPIENT_ACTION, SUPPLIER_PO_ACKNOWLEDGEMENT, ACCOUNTANT_CLIENT_INVITE | Document/evidence/access owner. Enum existence is not financial-correction authority. |

All non-MANUAL sources above fail closed in the generic command. This register identifies required domain owners, not completed workflow qualifications.

## R07 independent review and follow-up

The parent-added period-close guard agrees with current close-assurance severity/state rules. Review found that recorded-change discovery previously selected only CERTIFIED runs or runs with certified exports, while the guard can also consume READY and EXPORTED runs. At the parent's request, `close-assurance-pack.service.ts` now discovers RUNNING/READY/CERTIFIED/EXPORTED and transitions all four to BLOCKED with recorded EVIDENCE_STALE provenance. Parameterized service tests exercise source events against these statuses without an export; existing certified-export behavior remains. The initial READY follow-up passed **4 suites / 98 tests**, recorded in `close-invalidation-results.json`.

A further missed-invalidation window was fixed by creating RUNNING before the six source collectors, then finalizing only through a conditional status update. An intervening event's BLOCKED state wins; its reason is retained and stale checklist/evidence writes are skipped. Collector or persistence failures conditionally retain BLOCKED. `assessment-race-results.json` records **3 suites / 126 tests passed**, including creation-before-collection, an event winning the finalization race, collector failure, transaction failure and the parent's functional-balance preflight cases. No database migration was needed.

This does not close the concurrency proof obligation: `closeAccountingPeriod` locks the accounting-period row, but assessment/invalidation writers do not all acquire that same lock. A source mutation may occur after close's assurance read and mark its run stale after the period-close decision. Fresh source evidence and a shared lock/version contract must be proved with PostgreSQL interleavings before claiming qualified close completeness. Mocked status tests do not prove serializability, complete invalidation producer coverage, or source assessment freshness.

See `close-concurrency-design.md` for observed writer ordering, the minimum next slice, explicit late-provider-evidence policy decisions, static coverage counts and required two-connection PostgreSQL proof cases. A CloseRun lock alone would delay invalidation without excluding an unadmitted source mutation.
