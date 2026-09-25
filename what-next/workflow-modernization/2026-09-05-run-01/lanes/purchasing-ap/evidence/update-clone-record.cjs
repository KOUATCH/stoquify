const fs = require("node:fs");
const root = "what-next/workflow-modernization/2026-09-05-run-01/lanes/purchasing-ap/";
const path = root + "WORKFLOW_REGISTER.json"; const register = JSON.parse(fs.readFileSync(path,"utf8"));
const clone = register.workflows.find(x => x.id === "PA-007");
Object.assign(clone, {
 entryPoints: ["/dashboard/purchase-orders/[id] → Clone as a draft / Cloner en brouillon"],
 prerequisites: "Server-authorized purchases.orders.create, current same-tenant active/nondeleted supplier, delivery location and copied items; purchasing admission allows new orders. Current update permission opens editor; create/read-only users open the returned real draft detail.",
 implementationStatus: "interactive-implemented-awaiting-runtime-proof",
 reviewStatus: "source-reviewed-and-regressions-prepared",
 evidence: [...clone.evidence, "hooks/usePurchaseOrderClone.ts", "components/purchase-orders/PurchaseOrderCloneNotice.tsx", "components/purchase-orders/ModernPurchaseOrderDetailPage.tsx", "evidence/jest-clone-before.json"],
 remaining: ["Current-run genuine browser and persisted-state proof pending verifier", "No durable clone-command idempotency key: concurrent local triggers are suppressed and uncertain results block resubmission on the current page; inspecting newest saved records remains required", "Current source/version and related-record concurrent mutation serialization remain separately tracked"]
});
for (const id of ["PA-008","PA-012"]) {
 const row=register.workflows.find(x=>x.id===id);
 row.implementationStatus="backend-only-no-production-UI-caller-found";
 row.entryPoints=[id==="PA-012" ? "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:resolveGoodsReceiptInspection (no UI caller found)" : "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:bulkUpdatePurchaseOrderStatus; unused composed hook"];
 row.remaining.unshift("Required interactive workflow is not implemented; code-only app/components/hooks caller search found none");
 row.reviewStatus="source-revalidated-caller-gap";
}
fs.writeFileSync(path,JSON.stringify(register,null,2)+"\n");
const report=root+"FINDINGS_AND_REMEDIATION.md";let raw=fs.readFileSync(report,"utf8");
raw=raw.replace("| Next assigned bounded correction: reproduce, then add current tenant/active relationship checks. No clone submitted by this lane. |","| Corrected in the clone batch: same-tenant active/nondeleted supplier/location/items checked before numbering/writes; six original regression cases failed before correction. Real detail control now calls the protected action and opens the returned draft. Final tests/browser proof recorded separately. |");
raw=raw.replace("| Guard added; focused component follow-up scheduled. |","| Corrected; final nine-case component suite and scoped lint passed. |");
raw+=`
## Clone batch and further caller trace

The former detail-page Clone button only opened \`/new?clone=<id>\`; the new-order route did not consume that parameter. Both header and quick-action buttons now share one controller and invoke the existing protected clone command. The quick-action copy also uses the authoritative capability. Current server update authority selects the real draft editor; create/read users open the real draft detail.

Before numbering or writes, the clone transaction checks inherited and overridden suppliers/locations plus every copied item for the same tenant and active, nondeleted state. The source order is tenant-filtered. Original quoted amounts, header notes and line notes are preserved; receiving quantities start at zero; no stock, ledger or payment effect is created. Header notes previously changed to a cloning message and are now retained when present.

The client disables concurrent triggers and automatic mutation retry. Confirmed creation alone invalidates list/summary and navigates. Denied/unavailable/stopped outcomes retain the source and show a focused EN/FR alert. Unknown outcomes explain that a draft may already exist, offer the saved-order list in a new tab, and block further sends from this page. There is no durable clone idempotency key across browser sessions; this remaining boundary is explicit rather than hidden by an automatic retry.

Only allowlisted presentation reasons and canonical error codes cross the action catch boundary. Internal exception text/metadata are not returned. Existing fresh identity, tenant checks, purchasing admission and independent approval controls remain effective.

Further code-only caller searches corrected initial inventory labels: PA-008 bulk status and PA-012 held-inspection resolution have backend commands without a production interactive caller. Their required implementation remains open alongside AP invoice, matching, payment and correction workflows. This batch does not clear those gaps or PA-F04 edit/approval concurrency and PA-F08 shipping-only totals.
`;fs.writeFileSync(report,raw);
const guide=root+"USER_AND_OPERATOR_GUIDE.md";fs.appendFileSync(guide,`
## Clone an existing order

Open a purchase-order detail and choose **Clone as a draft / Cloner en brouillon**. This creates a separate saved draft immediately. The original order, its receipts and approval history stay unchanged. The current supplier, delivery location and items must still be available in your organization; a retired record cannot be copied into new work.

The new draft keeps the quoted costs, tax percentages, discounts, shipping and notes. Its received quantities are zero and it has a distinct assigned order number. If you have update authority, Stoquify opens that new draft in the editor; otherwise your read authority governs its detail page. Review the copied delivery date and current commercial terms before submission. A clone never inherits approval.

Wait while **Creating the draft… / Création du brouillon…** is shown. Both clone controls share the same pending request. If access or a source record is unavailable, the page explains the failure and leaves the original order open. If the result cannot be confirmed, a draft may already exist: open the most recent purchase orders through the provided new-tab link and inspect before starting any other clone. This page will not automatically resend the request or permit another click after an uncertain result. There is no cross-session duplicate-command guarantee.

The new clone controls, guidance and error recovery are EN/FR. Other legacy detail-page labels and domain workflows have not all been translated or modernized in this slice. Runtime browser evidence is recorded by the shared verification owner separately from the focused service/hook/component checks.
`);
