# Stage 03 Accounting Control Gate - Cash Payment

Status: PARTIAL  
Run: `th-cash-payment-architecture-20260716-023`  
Slice: `cash-payment`  
Mode: `audit`  
Active lanes: `cash`, `payment`

## Verdict

Stage 03 does not pass yet for canonical cash-payment transaction histories. Focused accounting tests passed for existing POS posting, reconciliation certification, and close blockers, but the visible cash/payment dashboard data is still capped and not suitable for complete roll-forward, cutoff, tie-out, or certification claims.

No product code was edited.

## Claim Matrix

| Claim | Cash lane | Payment lane | Evidence grade | Verdict |
| --- | --- | --- | --- | --- |
| `TH03_ROLLFORWARD` | Dashboard computes opening, cash sales, cash-in/out, refunds, closing counts, expected/current balance, and variance, but uses capped service rows | Payment workbench groups captured payments and reconciliation failures, but capture workbench declares persistent runs unavailable | operational only | GAP |
| `TH03_CONTROL_TIEOUT` | No complete cash subledger to GL cash-control tie-out was proven from the history surface | Reconciliation/close services include payment blockers, but a full history tie-out from row filters was not proven | operational/partial posted | GAP |
| `TH03_POSTING_TRACE` | POS service posts POS sale/refund/void paths and tests cover posting/audit behavior | Reconciliation certification checks provider evidence, statement evidence, open exceptions, suspense, and ledger posting batch for posted suspense | posted for tested service paths | PASS, scoped |
| `TH03_CORRECTION_REVERSAL` | POS refund/void paths exist and tests cover audit/posting behavior | Payment reconciliation supports sign-off/void/export paths, but full history correction timeline not exposed | operational/posted scoped | GAP |
| `TH03_TIME_CUTOFF` | Dashboard uses period start/end and `createdAt`; no immutable `recordedThrough` cutoff/cursor exists | Workbench uses date range and capture read model; durable reconciliation services have lifecycle dates | partial | GAP |
| `TH03_RECONCILIATION` | Counted-cash/session variance logic exists but no approval threshold workflow was proven for canonical history | Certification service blocks sign-off on missing provider/statement evidence, open exceptions, open suspense, and stale evidence | reconciled for tested run certification path | PASS, scoped |
| `TH03_CLOSE_BLOCKERS` | Unapproved variance/offline ambiguity/shared drawer blockers not proven in history surface | Accounting period tests prove payment reconciliation blockers prevent close | operational/reconciled scoped | GAP |
| `TH03_EVIDENCE_GRADE` | Current cash dashboard is capped and therefore cannot exceed operational/partial | Payment capture workbench explicitly says capture read model, not certified reconciliation | operational | GAP |
| `TH03_OHADA_PROVENANCE` | Posting rules map POS cash/card/mobile money/bank/store credit, but immutable country-pack provenance for this history surface was not proven | Payment settlement mappings exist, but history surface country-pack snapshot was not proven | partial | GAP |
| `TH03_AR_PREREQUISITES` | N/A | N/A | N/A | NA |

## Positive Accounting Controls

- POS posting rules distinguish cash, card, mobile money, bank transfer, and store credit for POS receipt/refund/void flows.
- POS service updates cash drawer/session expected balances separately from non-cash tender totals.
- POS tests passed for core sale/refund/void posting/audit behavior.
- Payment/cash truth readiness gate currently reports ready with 10/10 static checks.
- Payment reconciliation certification blocks sign-off when provider/statement evidence is missing, exceptions or suspense remain open, or evidence drifts.
- Accounting period tests prove unresolved payment reconciliation runs block period close.

## Findings

1. `TH03_CAPPED_CASH_POPULATION` - High  
   `services/pos/drawer-dashboard.service.ts` uses capped `take` limits for sessions, transactions, and journal rows. Capped dashboard rows cannot prove opening + movements = closing for a canonical history interval.

2. `TH03_RECORDED_THROUGH_MISSING` - High  
   Cash/payment history does not yet expose an immutable `recordedThrough` cutoff or deterministic `(effectiveAt, recordedAt, id)` traversal. Historical as-of claims must remain blocked.

3. `TH03_CASH_VARIANCE_APPROVAL_GAP` - High  
   The current dashboard displays variance severity, but Stage 03 did not find a canonical approval-threshold workflow tied to close blockers for cash variance.

4. `TH03_CAPTURE_VS_CERTIFIED_PAYMENT_GAP` - Medium  
   The payment workbench correctly declares capture-readiness, but Stage 04/05 must preserve the distinction between capture read model rows and certified reconciliation runs.

5. `TH03_OHADA_PROVENANCE_PARTIAL` - Medium  
   Default posting rules provide mappings, but the history surface does not yet carry immutable country-pack/posting-rule snapshot provenance for OHADA-facing claims.

## Focused Verification

Command:

`npm test -- services/pos/__tests__/pos.service.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/accounting/__tests__/periods.service.test.ts --runInBand`

Result:

- Test suites: 3 passed, 3 total.
- Tests: 21 passed, 21 total.

## Stop Decision

Stage 03 is `PARTIAL`. Do not start Stage 04 for the cash-payment slice until the following are designed and authorized:

- Uncapped server-side cash/payment history read model with stable pagination.
- Recorded-through cutoff and effective/recorded timestamp semantics.
- Complete cash roll-forward per drawer/session/cashier with electronic tenders excluded from physical cash expectation.
- Cash variance approval/close-blocker semantics.
- Payment history row model that separates capture-readiness, matched/reconciled state, suspense/exception state, posting state, and certification state.
- Focused tests for cash roll-forward, same-time pagination, backdated cutoff, suspense/exception blockers, maker-checker, sign-off, and close blockers.

## Stage 04 Eligibility

Not eligible. Both Stage 02 and Stage 03 are `PARTIAL`.
