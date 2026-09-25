# Role playbooks: get practical value from the dashboard

[Guide home](README.md) · [Workflows](workflows.md)

These are suggested operating routines, not newly imposed product requirements. Assign actual responsibilities according to your organization and the permissions already in place. Do not enable every module solely to follow a checklist.

## Business owner

**Daily:** open Owner war room or the Operations dashboard, confirm scope/freshness and choose the largest material risk. If overdue actions increase, open their source records and agree an owner/due date through the supported work process. Use Cash command to follow uncertain cash to its payment or drawer evidence.

**Weekly:** compare equal periods in Analytics/Finance, check the metric definitions, and open the supplier/customer/item behind the largest change. If operational margin falls, separate price, current-cost estimate, purchase commitments, expenses and refunds before concluding the business became less profitable.

**Period end:** review Accounting close blockers and posted reports with the accountant. Request evidence for unresolved settlement/payroll/inventory gaps. A green operating dashboard does not substitute for posted accounts or a current close pack.

**Prerequisites and useful views:** correct currency/timezone, complete location/master data and permitted proof access. Use the location view for operational responsibility, remembering that some financial balances/refunds remain organization-wide.

**Avoid:** calling Company Gross paid payment total revenue; assuming Pro/Live menu labels prove subscription or data freshness; treating an acknowledged brief as resolved work.

## Store manager

**Daily:** open Manager action center and the current location run sheet. If variance appears, open Cash drawer Sessions and the relevant shift before asking the cashier to explain it. Check low/out-of-stock items and decide whether receiving or a transfer is the right supported workflow.

**Weekly:** inspect Inventory loss control by item/location and movement history for repeat causes. Compare daily-sales source status with shift evidence; a stored draft report differs from fallback order aggregation.

**Day/period end:** load Branch daily close for the exact location and business date, inspect unsupported/missing checks and record review/sign-off only when the evidence supports it. Hand accounting issues to finance rather than treating branch sign-off as period closure.

**Useful controls:** location/status/date filters, session sorting by Variance, evidence/source links. Check the transfer list/detail caps if an older transfer appears missing.

**Avoid:** approving a transfer while expecting a later stock-posting step; authority based on location responsibility does not automatically include HR reporting-line or financial approval powers.

## Sales and POS staff

**Daily:** verify location/terminal and opening float, select the correct customer, review stock and cash tender, then confirm the returned sale number/change after Charge. Use the currently supported Cash/No receipt flow.

**Weekly:** a supervisor can review Daily sales and item/cashier reports using matching source/date definitions. If a product's recorded value changes, inspect quantity and pricing before proposing a sales action.

**Shift end:** explicitly count cash, including zero when applicable, explain variance and verify the shift closed. Check current state before repeating a sale or close after a timeout.

**Useful controls:** barcode/SKU search, category/Favorites/Recent, grid/list, Exact cash, customer picker and session detail. Favorites are temporary component state.

**Avoid:** relying on Park sale/Override, assuming a displayed printer/network indicator is a hardware test, or telling a customer that an unavailable receipt channel delivered a message. Customer statement delivery is a separate authorized finance process.

## Inventory and purchasing team

**Daily:** use item availability/reorder signals and open orders to decide what requires receipt, ordering or relocation. If receipt quantity is lower than ordered, preserve the remaining quantity; do not mark fully received without evidence. Record Failed/Incomplete inspection with a hold reason.

**Weekly:** compare supplier lead time/cost relationships and purchase analytics. Review unlinked/no-use master data and consolidate work through deliberate edits, not casual deletions of used records. Use movement history to explain repeated losses or location differences.

**Period end:** provide evidence for held receipts, completed transfers and unresolved AP match issues. Compare physical/operational evidence with the accounting team's valuation/close requirements without assuming a metadata edit fixes stock history.

**Useful controls:** supplier/item search and filters, order status/date views, Receive All Available only after counting goods, paired transfer movement details. Supplier proposals are negotiation evidence; accepting them does not update the PO automatically.

**Avoid:** duplicating opening stock and purchase receipts, treating a PO as a paid invoice, relying on unsaved transfer priority/internal notes, or assuming a filtered first-50 transfer set covers all history.

## Finance and accounting team

**Daily:** use Receivables for collection priorities and Payables/AP controls for obligations/readiness. If unmatched payments or suspense increase, inspect current provider/statement evidence and assign specific cases. Use customer statements for a dated account view and obtain required consent before delivery.

**Weekly:** review aged items using their actual due-date calculation and current terms. Compare operational finance figures to posted ledger evidence with matching statuses/caps. Investigate the record-level reason before describing a difference as an accounting error.

**Period end:** complete eligible reconciliation, resolve/approve source exceptions, review trial balance/classification and run current close assessment. Keep preparation, review, posting, settlement and certified export separate. Retain signed/current proof rather than a stale screenshot.

**Useful controls:** reconciliation residual/currency review, source replacement for stale proposals, independent approval, signed JSON export, trial-balance account filters and statement-line drill-down. Cash/payment history Search/download is unfinished; use implemented type/date filters and authorized source evidence.

**Avoid:** treating finance collected totals as settled receipts, order purchases as cost of goods sold, operational gross profit as the ledger P&L, or a “ready to export” authorization response as an actual downloaded file.

## HR, payroll, employees and managers

**Daily:** employees submit correct time requests; managers review the scoped queue; HR resolves missing identity mapping/contract/payment evidence in the owning process. If a readiness-blocker count grows, open the employee profile and identify the exact missing source.

**Before each run:** payroll compares contract/compensation/attendance/payment readiness with the period's frozen inputs. Review and apply approved People changes through separate actors where required; proposed salary is not effective pay.

**Run/period end:** advance Calculate → Review → Approve → Emit → Post through offered drawers. Independently request/approve/release payment batches, record actual settlement proof and track declaration response. Use Register tie-out and employee payslip availability as evidence of downstream completion.

**Useful controls:** HR search/date/domain/stage filters, profile blockers, source-proof drawers, service-supplied next actions and payment/declaration queues. Read-only workbenches are for diagnosis, not a guarantee of complete source authoring in the UI.

**Avoid:** inventing hashes or reviewer IDs, interpreting Released as settled, Queued as accepted, or an approved time request as already frozen for payroll. Do not export more personal data than the authorized purpose needs.

## Administrator and control owner

**Daily:** resolve access failures by checking organization, role, module state and location responsibility. If a module request remains Preparing, open the named source prerequisite and compare requested/active revision after refresh. Do not simply reapply the same selection.

**Weekly:** review member/role/invitation and configuration history, pending/expired invitations, inactive users and incident ownership. Recorded invitations currently do not send email. Use the specific working Settings pages instead of unresolved account-menu destinations.

**Period end or onboarding:** verify company defaults, controlled import evidence, independent approvals and access mandate expiry. Use supported new master-data imports only; balances, stock opening quantities and historical accounting migration are separate work.

**Useful controls:** reviewed change comparison, same-request retry, invitation history, role risk categories, module conditions and explicit operational stops. Security Sign out other sessions can remove unwanted sessions; MFA enrolment is not implemented on the current page.

**Avoid:** granting broad permissions to resolve a single missing action, assuming theme/notification tests are organization-wide communication configuration, or suppressing an assurance incident in place of correcting its source.
