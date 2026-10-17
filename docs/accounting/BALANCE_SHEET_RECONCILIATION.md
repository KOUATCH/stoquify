# Phase 6: balance-sheet account reconciliations

Implemented 2026-10-16. This extends Phases 1–5 with retained, independently approved account/currency supporting schedules. A balanced trial balance proves debit/credit equality; this control additionally compares the balances and gross movements of individual balance-sheet accounts with reviewed support. Existing bank, AP exception, inventory, payroll, suspense and close publication controls continue to apply.

## Account population and scope

Supported account types are ASSET, CONTRA_ASSET, LIABILITY and EQUITY. For the requested organization and completed accounting period, require each account/currency combination belonging to:

- An active, undeleted leaf account known through the recording cutoff, including unused accounts.
- An account with POSTED/REVERSED ledger history through period end, including archived/deactivated accounts and parents with direct postings.
- An account with retained supporting evidence for this period, so archival alone cannot hide an existing reconciliation.

Empty summary parents are excluded; revenue, expense, contra-revenue and memo accounts are outside the balance-sheet population. This is current classification with conservative historical activity retention, not a fully effective-dated account classification system. Bank-mapped accounts also require this general supporting schedule; Phase 5 bank-specific proof remains mandatory and cannot be replaced by it.

Currencies come from the account designation and actual posted line currencies. An unused account without an assigned currency uses the organization's currency. Each currency needs separate evidence. No currency conversion, netting or materiality threshold is introduced. A fixed-currency account with incompatible ledger lines blocks reconciliation rather than excluding the offending lines. Count fields represent account/currency combinations.

## Supporting schedules

Preparers identify the account, period, currency, schedule kind, explanation and retained document reference/SHA-256 hash. Schedule kinds cover receivables, payables, inventory, fixed assets, tax, payroll, accruals, prepayments, debt, equity, cash and other balances. The kind labels the review; it does not bypass the controls or imply automated verification of that subledger.

Each supporting item has a unique reference, description, opening balance, gross additions, gross reductions, closing balance and its own supporting document reference/hash. Values use the account's natural sign: increases are debits for debit-normal accounts and credits for credit-normal accounts. Opening/closing balances may be negative; additions/reductions must be nonnegative exact two-decimal strings, matching existing monetary storage.

For every item:

`opening balance + additions - reductions = closing balance`

Totals must exactly equal each corresponding ledger value:

| Schedule total | Ledger comparison |
|---|---|
| Opening | Cumulative posted natural balance before period start |
| Additions | Gross debits for debit-normal accounts, gross credits for credit-normal accounts, inside the period |
| Reductions | Gross credits for debit-normal accounts, gross debits for credit-normal accounts, inside the period |
| Closing | Opening + additions - reductions through inclusive period end |

Every equality must pass. There is no difference tolerance, free-form reconciliation adjustment, automatic balancing journal or automatic waiver. Offsetting errors cannot disappear inside a correct ending balance. Incorrect books must be corrected through existing accounting workflows, followed by a replacement proposal. A legitimate unpaid payable, tax liability, loan or receivable can reconcile at a nonzero balance; payment itself is not required by this control.

`ZERO_ACTIVITY` is an explicit evidence basis with explanation and retained source reference/hash, and an empty item list. It is accepted only when the opening ledger balance is zero and there are no posted period lines for the currency. An empty supporting schedule is invalid. A period with transactions that net to zero still needs an itemized schedule. Historical activity that cleared to zero before the period may use explicitly reviewed zero-activity evidence for the new period.

This is an independently reviewed supporting-schedule mechanism. The application checks the document hash format, retains the references and content, and verifies schedule/ledger arithmetic. It does not fetch external documents, authenticate their contents, or automatically generate complete AR/AP, fixed-asset, tax or payroll subledger schedules. Reviewers must establish that the retained support is genuine and complete. Existing domain-specific operational exceptions remain separate blockers even when a schedule balances.

## Authority, retention and stale evidence

Protected actions under the `close_assurance` module use server-owned tenant, actor and permission context. Preparation requires `accounting.close.run`; approval/revocation requires `accounting.close.certify`; retrieval requires `accounting.close.read`. Mutations require authentication within five minutes. Approval requires a different actor from the preparer. Revocation requires a reason; historical approval remains retained.

`BalanceSheetEvidence` records input, source snapshot, content hash, account/period/currency, idempotency key, preparer, approval and revocation. Database composite foreign keys bind tenant/account and tenant/period. Checks enforce currency shape and independent approval; triggers prevent payload edits, deletion, approval rewriting and resurrection after revocation. Same-key/same-input/same-preparer replay returns the original; changed payload or actor conflicts. Approval replay rechecks current evidence.

Transactions acquire ordered period locks followed by the tenant source-revision lock, use Read Committed and read the database clock after waiting. Snapshot verification and evidence mutation occur under that guard. A source writer that wins the race must be observed before approval; a writer that follows approval invalidates current close proof. Failed transactions/rollbacks cannot advance successful proof.

Snapshots bind hashes of exact ledger rows and account identity/classification, and retain computed balances, period endpoints and a supporting-source revision. Any change recorded by the existing financial-source guards requires re-review, including registered changes that do not yet have a journal posting. This is deliberately conservative across the organization and periods. The revision excludes decisions in `balance_sheet_evidence`, `bank_balance_evidence` and `reconciliation_no_activity_evidence`, so independent schedules can be prepared and approved together without invalidating one another. Those decisions still invalidate close assessments through the general publication guard.

External source changes not represented in the application cannot be discovered automatically. Newly introduced financial source tables must join the source-revision inventory. Recording-cutoff checks are current-state controls, not historical database reconstruction; unavailable or inconsistent posting dates, tenant links or currencies block collection.

## Close integration

The collector selects the latest unambiguous account/period/currency evidence visible at the cutoff. Missing, pending, revoked, altered, stale or post-cutoff-approved proof blocks. It never falls back to an older approval when a replacement exists. Database collection errors propagate as unavailable evidence rather than an empty successful result.

The accountant portal retains per-account/currency results and emits high-severity `ledger.balance-sheet` blockers. Close Assurance has a dedicated `balance-sheet-reconciliation` checklist and explicit findings independent of portal blocker projections. Blocked accounts cannot leave a close run READY. Evidence receipts and full summary are retained in close metadata and the accountant trust-pack payload; existing content hashing binds the exported result.

## Implementation and rollout

New files: `services/accounting/balance-sheet-contract.ts`, `balance-sheet-sources.service.ts`, `balance-sheet-evidence.service.ts`, `balance-sheet-close.service.ts`, and `actions/accounting/balance-sheet-evidence.actions.ts`. Narrow integration changes live in `data-trust.service.ts` and `close-assurance.service.ts`.

Migration `20261016230000_balance_sheet_evidence` creates the tenant-bound retained table, indexes, lifecycle checks, immutability/source revision triggers and advances revisions for tenants with existing close runs. Old assessments must be rerun under the new requirement. The migration was tested only on new isolated databases; application migration/client generation and deployment remain release operations.

This slice adds backend actions and integration into existing close/portal findings. It does not add a schedule entry/import screen, automatic subledger extraction, external document validation, FX translation, performance certification or statutory certification. Production-volume queries read complete populations and need operational evaluation. Roll back through a reviewed forward correction while preserving historical proof; do not drop evidence or restore stale READY states.

See [execution evidence](BALANCE_SHEET_RECONCILIATION_EVIDENCE_2026-10-16.md).
