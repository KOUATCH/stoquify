# Cross-page workflows

[Guide home](README.md) · [Detailed controls](control-notes.md)

These sequences describe supported handoffs and their limits. Responsible roles below are recommendations for organizing work; actual permissions and independence rules are enforced by the application. Every command remains subject to its current record state and access.

## 1. Establish a usable organization workspace

Company profile → Roles/users → Modules review → Locations/terminals/master data → Domain readiness.

1. The owner verifies identity, region, language, timezone and accounting/inventory start dates in [Company](http://localhost:3000/en/dashboard/settings/company). Currency is fixed for this profile workflow. Save only the reviewed changes and verify the resulting revision.
2. The administrator defines narrowly appropriate roles and assigns them to verified members. Invitations currently record links/requests with disabled mail transport; do not tell colleagues an email was delivered merely because the record exists.
3. In [Modules](http://localhost:3000/en/dashboard/settings/modules), choose the working composition and inspect dependencies, grants, setup and stop consequences. Save draft is optional persistence; Review configuration is the authoritative preview; Apply configuration submits that reviewed request.
4. Compare requested and active revisions. Complete missing source setup and resume preparation when offered. A saved or requested configuration is not automatically the active workspace.
5. Configure locations, terminals, units/categories/tax rates and other needed master data. Use governed data onboarding for supported new master records. Domain specialists verify accounting or payroll readiness before operations begin.

**Completion evidence:** saved profile/access histories, active workspace revision, valid domain setup and records visible to the intended users. **Recovery:** compare stale revisions, preserve drafts and check same-request receipts before retrying. Maximum value comes from the modules actually needed, not selecting everything.

## 2. Buy, inspect and receive inventory

Supplier/item setup → Purchase order draft → Submit → Independent approval → Receive with inspection → Complete order → Movement/AP evidence.

1. Purchasing checks supplier identity/terms and item supplier links. Confirm the destination location, unit, price and quantities.
2. Create and review a [purchase order](http://localhost:3000/en/dashboard/purchase-orders/new). A saved draft is neither a sent order nor stock.
3. Submit an order with lines. A different authorized reviewer approves it. If supplier acknowledgement is needed, Issue invitation and Copy link from the order's acknowledgement page; communication happens through an authorized handoff.
4. The receiving team chooses Receive Items and records only actual positive integer quantities. Passed inspection releases stock; Failed/Incomplete requires a hold reason. A held receipt exists but cannot be treated as freely available stock or fully matchable invoice evidence.
5. Inspect Receipts, Inventory and History. Complete Order becomes available only when fully received; short-close is not available.
6. Finance checks [AP controls](http://localhost:3000/en/dashboard/purchases/payables) and history for invoice/match/payment readiness. That dashboard is read-only; it does not itself provide invoice approval/post/payment execution.

**Completion evidence:** order/receipt IDs, remaining quantities, inspection disposition, inventory movements and separate AP/ledger proof where present. **Recovery:** inspect receipts before repeating an uncertain receive; held inventory requires its authorized resolution process outside the receipt modal. A supplier proposal acceptance records a decision without applying PO changes.

## 3. Transfer stock between locations

Create Transfer → Independent Approve Transfer → Paired stock postings and COMPLETED → Review movement history.

1. Inventory staff inspect source availability and choose distinct source/destination locations.
2. Create the transfer with at least one item and positive available quantities. Requested date/notes are useful context; priority/internal notes are not reliably persisted by the reviewed action.
3. A different authorized actor opens the DRAFT and selects Approve Transfer. **This immediately moves stock and completes the transfer.** Arrange physical handling to match this accounting of stock; do not assume later ship/receive buttons exist.
4. Inspect both location quantities and [movement history](http://localhost:3000/en/dashboard/inventory/movements), including the paired transfer-out and transfer-in.

**Completion evidence:** COMPLETED transfer and paired movements. **Recovery:** reload source quantities after conflicts/insufficient stock. The UI's first-50 list and first-100 detail lookup can hide older records; a persistent spinner is not proof a transfer never existed.

## 4. Sell through the current POS and account for physical cash

Location/terminal → Open shift → Persisted cart → Cash Charge → Review sale → Count and Close shift → Drawer/history review.

1. The cashier selects an authorized location and an available configured terminal, enters the real opening float and opens the shift.
2. Add catalog items, check quantities and select the correct customer or Walk-in customer. Cart additions and quantity changes already persist.
3. Enter cash tender, inspect total/due/change and Charge. Current selectable options are Cash and No receipt. Park/Override do not provide operational workflows.
4. Confirm the returned order number, amount/change and posting evidence. Resolve an uncertain result by reading the current order/session before submitting again.
5. At close, enter the counted amount explicitly—even zero—and explain a nonzero variance. Verify the closed shift in [Cash drawer](http://localhost:3000/en/dashboard/finance/cash-drawer).
6. The manager compares the shift and [cash/payment history](http://localhost:3000/en/dashboard/finance/cash-payment-history), then completes branch daily-close review if used. Electronic/provider settlement belongs to its supported reconciliation flow, not a physical cash count.

**Completion evidence:** committed sale, shift/drawer events, explicit cash count and explained variance, with branch review as a separate record. **Recovery:** a rejected close preserves inputs; address the stated count/variance/session blocker. Network/printer indicators are not connectivity tests.

## 5. Review customer activity and prepare a statement

Customer directory/profile → Orders and receivable evidence → Immutable statement → Consent and secure delivery queue → Delivery evidence/follow-up.

1. Sales/finance staff identify the correct customer and check account/order scope and payment terms.
2. Inspect [Receivables](http://localhost:3000/en/dashboard/finance/receivables) and history for the entries explaining the balance. [Daily sales](http://localhost:3000/en/dashboard/sales) is a report, not a general order-creation/fulfillment workspace.
3. Open the customer's Statement page. Select dates, confirm read-only currency, verify identity and Generate immutable statement. Read its number/version, As of and Recorded through timestamps, balance, open-item count and any truncation warning.
4. Review destination, consent and dispute/promise options before Queue secure delivery. Inspect queued status, expiry and later delivery evidence.

**Completion evidence:** immutable statement version plus distinct delivery status. **Recovery:** correct inverted dates/invalid destination; do not equate a queue receipt with recipient delivery. This dashboard has no wired revoke/export button for the statement despite broader descriptive copy.

## 6. Reconcile payments to external evidence

Provider account/evidence → Import → Run → Match/residual review → Independent approval → Suspense resolution → Sign → Signed certificate export.

1. Finance checks selected location/date scope and current provider account, currency and source timestamps.
2. Import supported CSV/JSON or pasted evidence. Import persists source data; inspect errors and duplicates/outcomes before repeating it.
3. Run reconciliation. The current button uses **today** as its business date; dashboard filters are not a run-date selector.
4. Review candidates and residual amounts by currency. Propose a supported match only within available residual. A different authorized reviewer approves against the same current evidence revision with fresh identity.
5. Assign unresolved suspense and prepare/review reclassification through its protected process. Stale proposals require authorized replacement with current evidence and a new review.
6. Sign an eligible run. Export its signed JSON certificate with the required separate permission/fresh identity. If source evidence changes, the certificate may no longer be eligible; rerun/review.

**Completion evidence:** linked statement/provider transaction and payment, approved match/reclassification, valid signed run/certificate. **Recovery:** use access recheck/normal sign-in and preserve draft amounts during a failed read. Payment capture, matching, release and settlement are distinct states.

## 7. Prepare, post and review accounts

Ledger setup → Accounts/mappings/journals/open period → Balanced draft → Post → Ledger reports → Close assessment/review → Eligible close export and period action.

1. The accounting administrator configures the ledger and resolves [Control center](http://localhost:3000/en/dashboard/accounting/control-center) blockers. Mark ready is a setup decision.
2. An authorized preparer creates a balanced journal draft using valid manual journals/postable leaf accounts and an open-period date. Inspect source/reference evidence.
3. The authorized posting process posts the draft. Reverse a posted entry with a reason and retained trail if a correction is required; do not delete history.
4. Review [Trial balance](http://localhost:3000/en/dashboard/accounting/reports/trial-balance) and [Financial statements](http://localhost:3000/en/dashboard/accounting/reports/financial-statements). Resolve account-classification and balance issues; distinguish management EBITDA from statutory subtotals.
5. In [Close](http://localhost:3000/en/dashboard/accounting/close), run the assessment, resolve findings, assign work, record comments and use independent waiver/review controls where appropriate. Draft export documents unresolved state; certified export requires its gates.
6. Perform the actual permitted period-close operation separately where appropriate; a Ready to close review or exported file alone is not that operation.

**Completion evidence:** posted lines and source links, period reports, current close assessment/review and eligible pack/period status. **Recovery:** changed sources can invalidate old close evidence; reassess instead of relying on an earlier badge.

## 8. Prepare payroll and complete its evidence chain

People identity → Reviewed contract/compensation/time/destination → Frozen inputs → Calculate → Review → Approve → Emit → Post → Payment/declaration evidence → Register/close tie-out.

1. HR checks employee-user mapping and profile blockers. Employees submit time requests; managers review within responsibility scope. People approvals separates review from application when another operator is required.
2. Payroll checks employee, contract, compensation and attendance/payment readiness workbenches. Several are read-only; correct sources through their owning process. Confirm the period and reviewed country-pack evidence; this screen set does not provide every source-authoring workflow.
3. In Runs, open the service-offered calculation/review/approval/emission/posting drawer in order. Satisfy source proof, fresh identity and independent-actor requirements. Verify the resulting run state after each action.
4. Prepare declarations from locked run proof. Request a payment batch from emitted allocations, use independent approval and release, then record actual settlement proof on Payments.
5. Queue supported declaration adapter execution only when ready; inspect execution/authority response separately. Issued payslips appear in employee self-service according to identity scope.
6. Use Register to tie employee count, net payable, payslips, payments and ledger/close evidence together.

**Completion evidence:** frozen-source/register hashes, run state, issued payslips, posted accounting links, actual settlement and declaration-response proof. **Recovery:** do not invent absent authoring UI or evidence hashes; escalate the named source gap to its owner. Released/queued is not settled/accepted.

## 9. Handle control and compliance exceptions

Compliance/Assurance signal → Source evidence → Assigned owner → Corrective source work → Review/waiver as allowed → New state and evidence.

1. The control owner identifies a blocking/overdue incident or document queue item and reads country/workflow/scope/freshness.
2. Open its source, confirm the underlying issue and assign responsibility. Acknowledge only records that the issue was seen.
3. Complete the correction in the source system. If a permitted waiver/suppression is appropriate, record reason, evidence and expiry with independent approval where required.
4. Verify the incident timeline and refreshed evidence. For external compliance work, distinguish preparation, queueing, execution and actual authority acceptance; the dashboard is not a universal submission form.

**Completion evidence:** source correction plus current incident/document state and response evidence when applicable. **Recovery:** unresolved adapter credentials/country review are prerequisites, not failures to fix by pressing Submit repeatedly.
