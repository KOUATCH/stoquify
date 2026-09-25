const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../../../..');
function edit(file,work){const p=path.join(root,file);fs.writeFileSync(p,work(fs.readFileSync(p,'utf8')))}
function between(s,a,b,value){const x=s.indexOf(a),y=s.indexOf(b,x);if(x<0||y<0)throw Error(a);return s.slice(0,x)+value+'\n\n'+s.slice(y)}
edit('services/purchase-order/purchase-order.service.ts',s=>between(s,'export async function bulkUpdateStatus(', '// ── Clone',`export async function bulkUpdateStatus(input: BulkStatusUpdateInput, scope?: PurchaseLifecycleScope) {
  if (!input.purchaseOrderIds.length) throw new BusinessRuleError("Select at least one purchase order.")
  if (input.toStatus === "APPROVED") throw new BusinessRuleError("Purchase orders cannot be approved in bulk. Use the canonical approval workflow for each order.")
  const kind = ({ SUBMITTED: "submit", CANCELLED: "cancel", COMPLETED: "complete" } as const)[input.toStatus as "SUBMITTED" | "CANCELLED" | "COMPLETED"]
  if (!kind) throw new BusinessRuleError("Use the receiving workflow to record received quantities and receipt status.")
  if (!scope || scope.organizationId !== input.organizationId || !input.reviewedRequests) throw new BusinessRuleError("Review each selected order before confirming the batch.", "REVIEW_REQUIRED")
  const ids = [...new Set(input.purchaseOrderIds)].sort(), requests = new Map(input.reviewedRequests.map(value => [value.id, value.request]))
  if (requests.size !== input.reviewedRequests.length || requests.size !== ids.length || ids.some(id => !requests.has(id)) || input.reviewedRequests.some(value => value.request.kind !== kind || (value.request.reason ?? "") !== (input.reason?.trim() ?? ""))) throw new BusinessRuleError("The reviewed batch does not match the selected orders and decision.", "REVIEW_REQUIRED")
  const updated: string[] = [], failed: Array<{ id: string; error: string }> = []
  // Each order owns one atomic receipt. Partial batches retry the same per-order commands.
  for (const id of ids) {
    try { await executePurchaseOrderLifecycle(id, scope, requests.get(id)!); updated.push(id) }
    catch (error) { if (!(error instanceof ApplicationError) || !error.isOperational) throw error; failed.push({ id, error: error.message }) }
  }
  return { updated, failed }
}`));
edit('actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts',s=>{
  s=s.replace('import { revalidatePath,','import { purchaseLifecyclePermission, purchaseLifecycleKindSchema, purchaseLifecycleRequestSchema, type PurchaseLifecycleRequest, type PurchaseLifecycleKind, type PurchaseLifecyclePreview, type PurchaseLifecycleReceipt } from "@/services/purchase-order/purchase-order-lifecycle-contracts";\nimport { executePurchaseOrderLifecycle as executeLifecycleService, getPurchaseOrderLifecyclePreview } from "@/services/purchase-order/purchase-order.service";\n\nimport { revalidatePath,');
  for(const name of ['cancel','close','delete','submit'])s=s.replace(new RegExp('    '+name+'PurchaseOrder as '+name+'PurchaseOrderService,\\r?\\n'),'');
  s=between(s,'export async function deletePurchaseOrder(', 'async function approvalScope(',`async function lifecycleScope(id: string, organizationId: string, kind: PurchaseLifecycleKind) {
  const { orgId, userId } = await scopedOrg(organizationId, purchaseLifecyclePermission(kind), { resourceId: id })
  const { claims } = await requireSession()
  if (claims.userId !== userId || claims.tenantId !== orgId) throw new ForbiddenError("Current purchase-order identity is required.")
  return { organizationId: orgId, actorId: userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}

export async function previewPurchaseOrderLifecycle(id: string, organizationId: string, kindInput: PurchaseLifecycleKind): Promise<PurchaseOrderResponse<PurchaseLifecyclePreview | null>> {
  try { const kind = purchaseLifecycleKindSchema.parse(kindInput); return response(await getPurchaseOrderLifecyclePreview(id, await lifecycleScope(id, organizationId, kind), kind)) }
  catch (error) { const safe = toSafeActionError(error); return { success: false, data: null, error: safe.error, code: safe.code } }
}

export async function executePurchaseOrderLifecycle(id: string, organizationId: string, requestInput: PurchaseLifecycleRequest): Promise<PurchaseOrderResponse<{ id: string; lifecycleReceipt: PurchaseLifecycleReceipt } | null>> {
  try {
    const request = purchaseLifecycleRequestSchema.parse(requestInput), scope = await lifecycleScope(id, organizationId, request.kind)
    const result = await executeLifecycleService(id, scope, request)
    try { revalidatePurchaseOrderWorkflow(scope.organizationId, id) } catch { /* A committed receipt remains recoverable when cache invalidation fails. */ }
    return response(result)
  } catch (error) { const safe = toSafeActionError(error); return { success: false, data: null, error: safe.error, code: safe.code } }
}

export async function deletePurchaseOrder(id: string, organizationId?: string, request?: PurchaseLifecycleRequest) {
  if (!organizationId || request?.kind !== "archive") return { success: false as const, data: null, error: "Review this archive request before confirming.", code: "REVIEW_REQUIRED" }
  return executePurchaseOrderLifecycle(id, organizationId, request)
}
export async function submitPurchaseOrder(id: string, organizationId?: string, request?: PurchaseLifecycleRequest) {
  if (!organizationId || request?.kind !== "submit") return { success: false as const, data: null, error: "Review this submission before confirming.", code: "REVIEW_REQUIRED" }
  return executePurchaseOrderLifecycle(id, organizationId, request)
}`);
  s=between(s,'export async function cancelPurchaseOrder(', 'export async function receiveItems(',`export async function cancelPurchaseOrder(id: string, organizationId?: string, reason?: string, request?: PurchaseLifecycleRequest) {
  if (!organizationId || request?.kind !== "cancel" || reason !== request.reason) return { success: false as const, data: null, error: "Review this cancellation before confirming.", code: "REVIEW_REQUIRED" }
  return executePurchaseOrderLifecycle(id, organizationId, request)
}
export async function closePurchaseOrder(id: string, organizationId?: string, request?: PurchaseLifecycleRequest) {
  if (!organizationId || request?.kind !== "complete") return { success: false as const, data: null, error: "Review this completion before confirming.", code: "REVIEW_REQUIRED" }
  return executePurchaseOrderLifecycle(id, organizationId, request)
}`);
  s=s.replace('  const result = await bulkUpdateStatus(parsed)','  const { claims } = await requireSession()\n  const scope = await lifecycleScope("bulk", orgId, params.toStatus === "CANCELLED" ? "cancel" : params.toStatus === "COMPLETED" ? "complete" : "submit")\n  if (claims.userId !== scope.actorId || claims.tenantId !== scope.organizationId) throw new ForbiddenError("Current purchase-order identity is required.")\n  const result = await bulkUpdateStatus(parsed, scope)');
  s=s.replace('  toStatus: PurchaseOrderStatus\n  reason?: string','  toStatus: PurchaseOrderStatus\n  reviewedRequests?: Array<{ id: string; request: PurchaseLifecycleRequest }>\n  reason?: string').replace('  toStatus: PurchaseOrderStatus\r\n  reason?: string','  toStatus: PurchaseOrderStatus\r\n  reviewedRequests?: Array<{ id: string; request: PurchaseLifecycleRequest }>\r\n  reason?: string');
  return s;
});
