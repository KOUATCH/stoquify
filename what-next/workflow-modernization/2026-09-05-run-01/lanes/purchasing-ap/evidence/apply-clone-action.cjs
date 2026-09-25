const fs=require("node:fs");
const path="actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts";
let raw=fs.readFileSync(path,"utf8");
raw=raw.replace('import { BusinessRuleError } from "@/services/_shared/action-errors";','import { BusinessRuleError, toSafeActionError } from "@/services/_shared/action-errors";');
const start=raw.indexOf("export async function clonePurchaseOrder(params:");
const end=raw.indexOf("export async function getPurchaseOrdersRequiringAttention",start);
if(start<0||end<0)throw new Error("Clone action bounds missing");
const action=`export async function clonePurchaseOrder(params: {
  id: string
  organizationId: string
  overrides?: Partial<{
    supplierId: string
    locationId: string
    date: string
    expectedDeliveryDate: string
    notes: string
    paymentTerms: string
    shippingCost: number
  }>
}): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations> & {
  failure?: "denied" | "unavailable" | "unknown"
  canEdit?: boolean
}> {
  try {
    const actor = await scopedOrg(params.organizationId, "purchases.orders.create", {
      resourceId: params.id,
      auditAllowed: true,
    })
    const parsed = ClonePurchaseOrderSchema.parse({ ...params, organizationId: actor.orgId })
    const cloned = await clonePurchaseOrderService(parsed, actor.userId)
    revalidatePurchaseOrderWorkflow(actor.orgId, cloned.id)
    return {
      ...response(cloned as PurchaseOrderWithRelations),
      canEdit: actor.permissions.includes("purchases.orders.update"),
    }
  } catch (error) {
    const reason = getModuleOperationErrorReason(error)
    if (reason) return { success: false, data: null as unknown as PurchaseOrderWithRelations, code: "FORBIDDEN", reason, failure: "denied" }
    const safe = toSafeActionError(error)
    const failure = safe.status === 401 || safe.status === 403
      ? "denied"
      : ["NOT_FOUND", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "CONFLICT"].includes(safe.code)
        ? "unavailable"
        : "unknown"
    // Only a narrow presentation reason crosses this boundary. Internal
    // exception text and metadata remain on the server.
    return { success: false, data: null as unknown as PurchaseOrderWithRelations, failure }
  }
}

`;
fs.writeFileSync(path,raw.slice(0,start)+action+raw.slice(end));
