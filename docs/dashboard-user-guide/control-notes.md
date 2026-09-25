# Detailed controls and consequential actions

[Guide home](README.md) · [Shared controls](shared-controls.md)

These notes give the exact labels and significant inputs/effects for workflows where a short page description could otherwise be misleading. All are source-reviewed and unexercised. The CSV additionally records individual static candidates and unresolved controls.

## Module control center

Open [Modules](http://localhost:3000/en/dashboard/settings/modules). Read/write requires MANAGE_SYSTEM_SETTINGS; protected writes require identity assurance within ten minutes.

1. **Configure**, **My workspace**, **Change history** change views.
2. **Retailer** puts Inventory, Sales, POS and Cash accountability into the local draft. **Service business** selects Sales, Finance, Accounting and Reports. **Current configuration** restores current server selection to the draft. They do not purchase access.
3. **Find a capability** searches names/descriptions. **Show capabilities** filters All capabilities, Operations, Finance & assurance, People, Insights & content. Checkboxes edit the draft. Required dependencies are included automatically and cannot be removed while dependents need them.
4. Read **Selected in draft**, **Required connection**, grant and setup badges separately. Operating dashboard, Settings and Administration are shared foundations. **Save draft** persists a draft, and unsaved selection is also restored from organization/user-scoped session storage.
5. **Payroll period to verify** and **Authority connection to verify** select existing scoped records, capped at 50 each; they do not create a period or certify an authority connection.
6. **Review configuration** obtains a preview tied to current revision, permissions, grants, dependencies, setup and evidence. Review **Join workspace**, **Stay in workspace**, **Leave workspace**, **Established access kept**, conditions and stop consequences.
7. **Apply configuration** applies the reviewed request. **Verify identity and apply** supplies the current password when needed. Requested revision can differ from Active workspace revision: Requested/Preparing/Failed can leave the previous verified workspace active. Explicitly reviewed stops can remain effective during preparation.
8. Fix named source prerequisites; use **Refresh current state** and **Check inputs and resume preparation** when offered. Refresh preserves the draft but requires another review.
9. **Stop new work in …** has a separate operational meaning. Supported scopes: inventory adjustments/transfers/counts, new purchase orders, new payroll periods/runs, new manual accounting journals. Sales, POS and direct reconciliation stops are unsupported. Existing completion work and mandatory financial effects remain governed.
10. **Prepare reactivation of …** proposes clearing a stop, requiring review. **Open authorized … records** preserves permitted historical access. **Load earlier changes** pages history; **Reopen as new draft** does not undo transactions or grants.

Best use: choose the operating model needed today, review dependencies, then compare requested/active revisions before telling colleagues a module is available. Removing a workspace selection is distinct from revoking permission, cancelling a subscription or stopping all business effects.

[Source: components/modules/ModuleCompositionWorkbench.tsx:453](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx:453>); [Source: services/modules/module-composition.service.ts:383](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:383>); [Source: services/modules/module-stop-policy.service.ts:23](<E:/ohada saas/Focused projects/stoquify/services/modules/module-stop-policy.service.ts:23>).

## Company, role and member changes

Company **Actions → Edit profile** opens the Company DNA form. **Identity**, **Regional**, **Calendar**, **Review**, **Previous**, **Next**, **Save organization** guide name, industry/address, region, language, timezone and fiscal/inventory start dates. Currency is locked. Updates require system.organization.update. On conflict use **Load latest for comparison**, **Keep my edits and review** or **Use the saved version**.

**Set up another organization** opens a handoff: **Open owner registration**, **Sign in to an existing organization**, **Back to this organization**. It does not directly create another tenant. **Export → Prepare reviewed CSV** checks current-organization scope, reports.export and fresh identity; **Confirm identity** may be required. **Retry same export request**, **Download prepared file again**, **Reload and review current data** distinguish replay from a new review.

Role form controls include **Role name (English)**, optional French name, **Purpose and responsibilities**, **Find a permission**, permission categories and risk-labelled checkboxes. **Review changes → Save reviewed role** saves definition and audit together. Every member using the role is affected. Existing out-of-authority grants may be preserved but not freely added. **Confirm identity** does not bypass another explicit review/save. Conflict/retry controls retain the intended draft or retry the same save.

Users supports search, activation/verification filters, **Clear filters**, **Refresh**, **Export matching members**, Users/Invitations tabs. **Deactivate → Review account deactivation** requires a 3–400-character reason; **Confirm deactivation** stops sign-in, revokes sessions and cancels pending invitation links while retaining business history. Self/last-administrator guards apply.

Member access changes role assignments/reactivation, not arbitrary profile fields. Enter **Reason for this change → Review changes → Confirm access change**. **Confirm password** verifies identity; confirm the change explicitly afterward. Successful access changes revoke member sessions. **Reload and compare** preserves selections/reason; **Retry same request** resolves uncertainty. Reactivation has verification and matching deactivation-evidence requirements.

**Invite user → Invite a colleague** requires Email address and an authorized Role. **Record invitation** creates the reviewed request; links expire after seven days. Email transport is disabled in this build. **Replace invitation** invalidates the old link and records a replacement with a reason. **Cancel invitation** invalidates the link, not an already accepted member account. **View history**, **Refresh history**, **Load older decisions** expose request/delivery-attempt evidence. Refresh status as of the displayed check time before reissuing.

[Source: components/settings/OrganizationSettingsForm.tsx:592](<E:/ohada saas/Focused projects/stoquify/components/settings/OrganizationSettingsForm.tsx:592>); [Source: components/settings/OrganizationDirectoryExport.tsx:68](<E:/ohada saas/Focused projects/stoquify/components/settings/OrganizationDirectoryExport.tsx:68>); [Source: components/settings/MemberAccessEditor.tsx:104](<E:/ohada saas/Focused projects/stoquify/components/settings/MemberAccessEditor.tsx:104>); [Source: services/users/user-invitation-history.service.ts:74](<E:/ohada saas/Focused projects/stoquify/services/users/user-invitation-history.service.ts:74>).

## Master-data onboarding

Choose Customers, Suppliers or Items from permitted targets; **Download template**, select a CSV up to 5 MB/1,000 rows, then **Run dry validation**. This records staging evidence but creates no business master records yet. Inspect source hash, mapping version, valid/error/duplicate counts and row issues. Approve the exact reviewed data using the acknowledgement and **Record explicit approval**; only a fully valid run is eligible. **Commit through domain owners** creates approved records and records resulting IDs/counts. **Export evidence manifest** preserves the handoff evidence.

High risk needs a different authorized approver; examples include at least 100 rows, supplier creation, a positive customer credit limit or item price values. Supported scope is new master data. Current balances, opening stock/accounting balances, historical transactions, merges/updates/deletes and automatic rollback are excluded. A paused batch needs its specific conflict resolved and controlled replay, not an invented clean slate.

[Source: services/onboarding/master-data-import.service.ts:32](<E:/ohada saas/Focused projects/stoquify/services/onboarding/master-data-import.service.ts:32>); [Source: components/onboarding/MasterDataOnboardingWorkbench.tsx:364](<E:/ohada saas/Focused projects/stoquify/components/onboarding/MasterDataOnboardingWorkbench.tsx:364>).

## Purchasing and transfer operations

Purchase order detail uses state/permission rules: DRAFT **Submit** requires lines; submitted **Approve** requires a different user with approval authority; eligible approved/partial orders offer **Receive Items**; fully received orders offer **Complete Order**. Short-close is unavailable. **Cancel Order** is state/permission-dependent; its reason currently falls back to “Cancelled by user.” Clone needs create authority. **Print** opens the browser print dialog.

Receiving requires positive integer line quantities. **Receive All Available** fills remaining ordered quantities; **Clear All** resets them. Optional supplier lot/expiry fields depend on item tracking; serial-tracked items indicate generated serials. **Receiving inspection outcome** is required: Passed releases available inventory; Failed/Incomplete holds stock and requires **Hold reason**. Optional notes preserve inspection evidence. Held stock blocks availability and supplier-invoice matching until authorized resolution; this modal does not resolve the hold. Verify the **Receipts**, **Inventory** and **History** tabs after success.

Supplier acknowledgement: approved PO → **Issue invitation** (optional recipient reference defaults to supplier email) → **Copy link**. No email send button is provided. **Revoke**, **Accept proposal**, **Reject proposal** need a 3–500-character reason. Issuance/review require purchase-order update authority and identity verified within five minutes, with no inline password step-up in this workbench. Accepting a proposal records BUYER_ACCEPTED history without changing authoritative order quantities/dates, stock, AP or accounting.

Transfers: **Create Transfer** requires distinct locations and at least one positive quantity no greater than available stock; repeated additions aggregate and recheck stock. **Approve Transfer** appears for a DRAFT and an actor other than the creator. It immediately posts paired TRANSFER_OUT/TRANSFER_IN and sets COMPLETED. There are no separate ship/receive/cancel/reject buttons in this flow. Priority/internal notes are collected but omitted from the service payload. Older records outside the bounded detail lookup can show an indefinite loading presentation.

AP workbench controls are navigation only: **Open AP history**, **Open suppliers**, **Review history** and supplier-profile links. There are no local search/date filters or invoice execution buttons. Reload the page to get a new source snapshot.

[Source: services/purchase-order/purchase-order-capabilities.ts:75](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/purchase-order-capabilities.ts:75>); [Source: components/purchase-orders/ModernPurchaseOrderDetailPage.tsx:621](<E:/ohada saas/Focused projects/stoquify/components/purchase-orders/ModernPurchaseOrderDetailPage.tsx:621>); [Source: services/purchase-order/supplier-po-acknowledgement.service.ts:1185](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/supplier-po-acknowledgement.service.ts:1185>); [Source: services/inventory/inventory-transfer.service.ts:806](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-transfer.service.ts:806>).

## POS and physical cash

**Open** creates the shift from selected location/terminal and Opening float. An occupied terminal is blocked. Product add and quantity/remove controls change the persisted cart; quantities commit on blur/keyboard and invalid/rejected input returns to persisted state. Changing location is blocked when the draft contains lines. Customer selection is location-scoped; Walk-in customer clears a named customer.

**Grid**, **List**, **Touch mode**, All/Favorites/Recent, category and favorite controls change local presentation. Favorites/recent are component state. Product details do not supply the promised future supplier/movement/price-history panels.

**Exact cash** and quick amounts fill tender. **Add tender** adds a cash row; the final row cannot be removed. **Charge {amount}** requires an active shift, cart and sufficient positive tender; success gives order number, total/change and posting evidence. Current options are Cash and No receipt. **Park sale** and **Override** show a backend-workflow warning only.

**End shift / Close** requires an explicitly typed nonnegative cash count, up to 12 integer and 2 fractional digits. Empty is not zero. Nonzero variance at currency precision requires an explanation. A failure retains the dialog/input. Receipt history Search/Select sale/Revoke is separately permission-gated; revoking access does not refund or erase the sale. Offline **Retry** refreshes evidence, not enrollment, replay or conflict resolution.

Keyboard controls in source: Ctrl/Cmd+K focuses search, F4 opens customer selection when a location exists, F8 focuses tender, Escape clears searches. These shortcuts were not exercised in a live dashboard session.

[Source: components/pos/ProfessionalPOSSystem.tsx:308](<E:/ohada saas/Focused projects/stoquify/components/pos/ProfessionalPOSSystem.tsx:308>); [Source: components/pos/ProfessionalPOSSystem.tsx:665](<E:/ohada saas/Focused projects/stoquify/components/pos/ProfessionalPOSSystem.tsx:665>); [Source: components/pos/ProfessionalPOSSystem.tsx:955](<E:/ohada saas/Focused projects/stoquify/components/pos/ProfessionalPOSSystem.tsx:955>).

## Statements and payment reconciliation

Customer **Generate immutable statement** requires period start/end, read-only organization currency and current password. Inverted dates are blocked; the end uses UTC end-of-day capped at now. Inspect statement number/version, open-item count, closing balance, As of, Recorded through and hash. A truncation warning limits completeness; this form has no export button. **Queue secure delivery** requires Email/WhatsApp destination, explicit consent, optional Allow disputes/Allow promises to pay and password again. Default access lifetime is 30 days. Inspect queue status/redacted destination/expiry; no dashboard revoke button is wired.

Reconciliation **Import** accepts an active provider account and CSV/JSON file or pasted content. Review currency and file errors. **Run** persists reconciliation; the current button uses today as businessDate, not the displayed dashboard filter's date. Review residual amounts/currencies before **Propose match**. An authorized independent reviewer uses **Approve match** with fresh identity and expected evidence revision. The original preparer can **Replace with current evidence** and review a stale proposal again. Suspense follows Assign → propose reclassification → authorized approval.

**Sign** needs signing permission and identity verified within five minutes. Its button has no equivalent inline password form to the manual-match step. **Export** downloads a signed JSON certificate only for an eligible signed run and with separate export/fresh-identity authority. Changed source after signing can invalidate export; rerun/review the evidence. **Retry access check** and a new-tab sign-in support access recovery; a failed read preserves draft amounts for correction.

[Source: components/customers/CustomerStatementWorkflow.tsx:91](<E:/ohada saas/Focused projects/stoquify/components/customers/CustomerStatementWorkflow.tsx:91>); [Source: components/finance/PaymentReconciliationWorkbench.tsx:479](<E:/ohada saas/Focused projects/stoquify/components/finance/PaymentReconciliationWorkbench.tsx:479>); [Source: services/reconciliation/payment-reconciliation-certification.service.ts:1053](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-certification.service.ts:1053>).

## People, payroll, accounting and assurance

People approvals separate **Approve**, **Reject** and **Apply**. The source can require an independent operator after approval; requesters cannot review their own request. Give the reason and required evidence hash, then confirm the resulting history/state.

Payroll Runs exposes only service-approved next actions: **Open calculation drawer**, **Open review drawer**, **Open approval drawer**, **Open emission drawer**, **Open posting drawer**, **Open declaration drawer**, **Open payment request drawer**, **Open payment approval drawer**, **Open payment release drawer**. Each shows source proof, permission, Fresh auth and Maker-checker where relevant. Supply its requested date/evidence/payment inputs; do not fabricate proof hashes. Requesting, approving and releasing a payment batch use distinct actors as required. Payments records later settlement proof. Declarations queues adapter work and awaits evidence of execution/response.

Accounting **Create draft** saves balanced lines; **Post** produces ledger evidence; **Reverse** creates a retained reversal trail. **Run assessment**, **Assign to me**, comments, waiver requests, accountant review and close exports each create or use separate evidence. **Ready to close** is a review decision, not automatically the period-close action. Draft and certified JSON exports have different gates.

Assurance **Acknowledge**, **Assign**, **Resolve**, **Suppress**, **Request waiver**, **Approve waiver**, **Reopen** are separate state changes. Enter the action-specific owner/due date/reason/evidence/expiry and **Apply action**, then inspect the timeline. A waiver or suppression does not correct the original record.

[Source: components/hris/HrisApprovalInbox.tsx:47](<E:/ohada saas/Focused projects/stoquify/components/hris/HrisApprovalInbox.tsx:47>); [Source: components/payroll/PayrollRunActionPanel.tsx:56](<E:/ohada saas/Focused projects/stoquify/components/payroll/PayrollRunActionPanel.tsx:56>); [Source: components/accounting/CloseAssuranceCenter.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/accounting/CloseAssuranceCenter.tsx:1>); [Source: components/assurance/AssuranceIncidentActions.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/assurance/AssuranceIncidentActions.tsx:1>).
