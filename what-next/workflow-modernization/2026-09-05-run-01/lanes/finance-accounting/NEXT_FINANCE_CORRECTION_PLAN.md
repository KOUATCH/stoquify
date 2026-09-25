# Next finance corrections: truthful reads and retained obligations

Status: read-only plan after the archived-account correction. No further source/tests/DB edits or execution during the current purchase browser freeze. The reporting retention change is separately recorded in RETAINED_REPORT_VERIFICATION.json (30 passing unit checks).

## 1. Accounting list query failures (FA-F02)

The current account page substitutes `[]` for an unsuccessful `listChartAccountsAction` result. Its panel description shows the error, but total/postable/archived cards show zero and the body says “No accounts yet.” The existing page test at `accounts/__tests__/page.test.tsx:127` explicitly expects both the failure and successful-empty copy, so it codifies this mixed state.

The journal page independently substitutes `[]` for failed book and entry reads. A failed entry response leaves the draft-panel error description, while the posted panel declares no posted entries and the shared table boundary stays `ready`. The outer `data-finance-result-state=error` does not make zero totals or empty text truthful. A failed book lookup also suppresses its true count into zero even if entry evidence loaded successfully.

Smallest proposed edit scope:

- `app/[locale]/(dashboard)/dashboard/accounting/accounts/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx`
- Existing `__tests__/page.test.tsx` under each directory.
- A narrowly scoped EN/FR read-state namespace only if parent coordinates shared message edits; otherwise an established route-local EN/FR copy object. No whole-accounting translation rewrite.

Each failed source must render unavailable text and an actual same-route localized retry, without displaying numerical zero or successful-empty copy. For independent successful journal data, either preserve its verified panel or explicitly mark the combined view unavailable; do not silently suppress a failed sibling source. Keep the real successful `[]` branch and its empty-state guidance. A `ready` canonical table must only wrap an actual successful read. Keep server permission/module checks, post/reverse actions and route shell intact. UI mutation recovery is a separate subsequent workflow task.

Before/after tests should cover account failure, journals-only failure, entries-only failure, both failures, successful empty results, successful populated results and denied access before source reads; verify EN/FR retry URLs and absence of misleading zeros/empty rows on failure. Do not treat changing the existing contradictory test expectation as regression evidence without first reproducing the intended new assertion against old source.

## 2. Retained counterparties and current balance totals (FA-F03)

Source facts:

- `services/finance/finance-dashboard.service.ts:690–719` selects only the first 100 active nondeleted customers/suppliers by `currentBalance`. `:766–772` sums those bounded rows into global receivable/payable KPIs; top-eight lists then slice the same rows. No source completeness indicator describes that truncation.
- Current master-data removal intentionally sets only `isActive: false` when financial history exists (`services/customer/customer.service.ts:888–923`; analogous supplier management owner). Removing a trading relationship must not make its existing receivable/payable disappear from financial visibility.
- `services/accounting/customer-ledger.service.ts:105–159` updates the recorded customer balance atomically with ledger entry creation, permits an inactive nondeleted customer, and checks a compare-and-set balance. Other admissions still restrict new work. The discovery does not prove that every historical legacy balance has ledger evidence.
- `services/purchasing/ap-control.service.ts:1884,2525,3468` updates supplier recorded balances for invoice posting/payment; `purchase-return-credit.service.ts:660,808` changes them for supplier credits/reversals. Their financial effects survive deactivation.
- AR history (`services/accounting/ar-open-item.service.ts:182`) reads immutable receivable documents/lifecycle/allocation evidence without an active-customer filter. AP history (`services/purchasing/ap-history.service.ts:342–389,518`) reads supplier invoices/payments, computes summary from the full filtered source set separately from paged rows, and retains scope/freshness metadata. These are existing owners, not a justification to invent ledger truth from a counterparty cache.
- Finance overview aging currently derives open SalesOrder/PurchaseOrder totals minus noncancelled Payment records, using current customer/supplier payment terms. It is a different basis from immutable posted AR/AP. Counterparty balances have no period/location restriction while the view advertises those filters.

Minimum first implementation slice after source review: preserve the existing meaning “recorded current counterparty balance,” query its complete positive-balance aggregate separately from the bounded top list, and include inactive nondeleted counterparties with retained history. Do not silently relabel that cache as posted invoice truth. If old deleted records can retain verified obligations, read those through the retained-history owners or a verified historical relation, not an unqualified account-reactivation shortcut. Keep all new-sale/new-purchase admissions unchanged.

Add explicit basis/scope/freshness to the relevant contract and EN/FR display: current organization-wide recorded balance is not a period movement or selected-location-only metric. Link receivables to existing `/dashboard/finance/receivables/history` (currently absent from its action panel); AP already links to history. Actual destination permission gates remain authoritative. A later owner-backed aging migration must reconcile legacy-only balances and credits instead of discarding them or double counting them.

Proposed files: `services/finance/finance-dashboard.service.ts`, its focused service test, the exact relevant view contract/types and `components/finance/FinanceSpecializedLedgerSurfaces.tsx`; shared `FinanceCommandCenterDashboard.tsx` consumes the same summary, so its labels/scope need review before changing meaning. Parent owns the distinct `SALES-DAILY-01` page; do not edit or duplicate it.

Tests: at least 101 counterparties, inactive customer and supplier with nonzero retained obligation, zero/negative balances, foreign tenant, query failure, top-list bound independent of total, ledger/source basis and period/location labeling, and no mutation/reactivation. Runtime proof must be isolated and compare recorded financial source totals before/after read only.

## 3. Additional bounded metric defects discovered while tracing FA-F03

`finance-dashboard.service.ts:557–676` limits sales orders, purchase orders and expenses to 250 rows, payments to 300, then `:741–765` sums them into apparently complete revenue/cost/tax/payment totals. Open order counts and aging also use at most 250 orders. These are aggregation defects, not merely top-list truncation. Keep previews bounded but obtain full, scoped aggregates or explicitly mark partial results; do not remove all limits and create unbounded payloads as a shortcut.

The collected/outbound payment sums include every linked payment whose status is not CANCELLED. PENDING records therefore contribute to collected cash and also the pending metric. The status domain and all supported reversal/refund/settlement owners must be reviewed before selecting the authoritative settled set; a guessed status replacement can strand legitimate flows. Focused PENDING-versus-PAID cases should reproduce the current discrepancy before correction. This affects cash-flow and confidence-derived displays as well as payment totals.

`financeConfidence` is a local weighted risk heuristic (`:1007–1017,1050`), not a proof of complete financial source coverage. These corrections must not present it as security/accounting certification. No operational or professional certification is granted by this plan.

## Sequencing and limits

First finish current coordinated browser/typecheck evidence. Then take the smallest false-zero UI batch; follow with owner-reviewed aggregate/status scope in a separate regression batch. The balance/aging source distinction needs explicit product explanation but ordinary implementation is authorized by the mission; no fabricated user approval or accounting evidence is needed. PostgreSQL/browser verification belongs to the sole verification owner after a precise fixture plan.

No source changes were made for any item in this plan. Archived-report source inclusion and organization directory scope are the only completed corrections in this lane batch.
