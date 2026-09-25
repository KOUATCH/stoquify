# Purchasing draft editor — operator guide

Open **Purchasing → Purchase orders**, choose an existing draft, then **Edit**. Direct routes are `/en/dashboard/purchase-orders/<id>/edit` and `/fr/dashboard/purchase-orders/<id>/edit`. Your active organization and purchasing update permission control access.

1. Review the assigned order number and date. Stoquify retains the assigned number. Choose or check the expected delivery date.
2. Check the supplier and delivery location. These are current organization records, supplied by administrators. An existing choice missing from the active catalogue remains visible so a saved draft is not silently rewritten.
3. Check each item, whole quantity, unit cost, **tax percentage**, monetary line discount and line notes. Existing quote costs and notes remain unchanged until you edit them. A new item's cost can be suggested from its current cost record. The preview uses your organization's currency.
4. Review payment terms, shipping cost and order notes, then choose **Save changes / Enregistrer les modifications**. Shipping is added once; the discount shown in totals is the sum of the line discounts.

Saving edits a draft. Submission, independent approval, receiving and payment remain separate controlled operations. The server recalculates the saved totals and enforces its business rules. You cannot create a tax or approval exception by changing a preview.

A confirmed save opens the updated order and refreshes the relevant list/summary. If the server refuses the save, an alert explains that the entered changes remain on the page. Check your access and the current order status. If a connection error leaves the result uncertain, use **Open saved order in a new tab / Ouvrir la commande enregistrée dans un nouvel onglet** and compare before trying again. The application does not automatically resubmit an uncertain edit.

Wait for the pending save to finish before editing again. Repeated clicks are ignored while that save is running. The Back control asks before discarding a changed draft; staying keeps the entered values. Draft preservation in this slice covers the open form and recoverable failures, not loss of the browser session.

Keyboard users can move through labeled fields and Continue/Previous buttons. Step changes move focus to the current heading; rejected saves focus the alert. The discard dialog uses the existing focus trap and returns focus to Back when closed. Native browser zoom and mobile rendering of this new editor still require the current workflow-run browser evidence; prior module-composer screenshots are not editor verification.

The AP control-center queues remain available for reviewing invoice, matching and payment state. Invoice preparation/posting, matching exceptions, supplier payment approvals/releases and returns/credits currently have server commands without complete interactive workflows; the lane register tracks those as unfinished. Do not treat a queue status as a payment authorization or proof of external settlement.

## Clone an existing order

Open a purchase-order detail and choose **Clone as a draft / Cloner en brouillon**. This creates a separate saved draft immediately. The original order, its receipts and approval history stay unchanged. The current supplier, delivery location and items must still be available in your organization; a retired record cannot be copied into new work.

The new draft keeps the quoted costs, tax percentages, discounts, shipping and notes. Its received quantities are zero and it has a distinct assigned order number. If you have update authority, Stoquify opens that new draft in the editor; otherwise your read authority governs its detail page. Review the copied delivery date and current commercial terms before submission. A clone never inherits approval.

Wait while **Creating the draft… / Création du brouillon…** is shown. Both clone controls share the same pending request. If access or a source record is unavailable, the page explains the failure and leaves the original order open. If the result cannot be confirmed, a draft may already exist: open the most recent purchase orders through the provided new-tab link and inspect before starting any other clone. This page will not automatically resend the request or permit another click after an uncertain result. There is no cross-session duplicate-command guarantee.

The new clone controls, guidance and error recovery are EN/FR. Other legacy detail-page labels and domain workflows have not all been translated or modernized in this slice. Runtime browser evidence is recorded by the shared verification owner separately from the focused service/hook/component checks.

## Review and saved amounts

Continue advances to the next step; Save is a separate final action. Reaching review does not authorize a save. The current editor uses the existing local dashboard theme. Both the review and saved-order detail display retained fractional amounts, including 38.50 and 243.50 on an existing XAF draft. At least two stored decimal places are shown; a currency with greater display precision keeps it. This reveals the actual quoted amounts and does not set the organization’s rounding or currency-admission policy.

## A status change while you are editing

If another authorized user submits, approves or cancels the order while your editor is open, the server may refresh its status. The editor now remains on the page in read-only mode. Your unsaved values stay in this open tab. Use Previous/Continue to review them; text and amount fields remain available to focus and copy, while Save, item changes and party selectors are disabled. The notice shows the current status in English or French and links to the saved order in a separate tab for comparison. Opening a non-draft order directly shows the same read-only guidance under the existing permission checks.

This is recovery for an open form, not durable draft storage. Closing or fully reloading the tab does not restore unsaved values. Missing records, a different organization and revoked permissions still enforce their access boundaries. The editor does not turn a cancelled or approved order back into a draft, retry automatically, or bypass server approval/receiving controls.
