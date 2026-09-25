const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../../../..');
const edit=(p,fn)=>{const file=path.join(root,p);fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')).replaceAll('\r\n','\n'))};
function between(s,a,b,value){const x=s.indexOf(a),y=s.indexOf(b,x+1);if(x<0||y<0)throw Error(a);return s.slice(0,x)+value+'\n\n'+s.slice(y)}
edit('services/purchasing/__tests__/ap-control.service.test.ts',s=>{
 s=s.replace('function buildTx() {\r\n  return {','function buildTx() {\r\n  return {\r\n    $queryRaw: jest.fn().mockResolvedValue([]),');
 for(const title of ['blocks supplier invoices that exceed received and uninvoiced quantity','prepares matched invoice evidence without supplier or accounting ledger effects']){
  const a=s.indexOf('  it("'+title+'"'),b=s.indexOf('\n  it(',a+1);let part=s.slice(a,b);part=part.replace('it("'+title+'", async () =>','it.each(["RECEIVED", "CANCELLED"])("'+title+' for %s orders", async status =>').replace('status: "RECEIVED",','status,');
  if(title.startsWith('prepares'))part=part.replace('    expect(result.ledgerStatus)', '    expect(tx.goodsReceiptLine.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ purchaseOrderLine: { purchaseOrder: expect.objectContaining({ deletedAt: null, status: { in: expect.arrayContaining(["CANCELLED"]) } }) } }) }));\n    expect(tx.$queryRaw).toHaveBeenCalled();\n    expect(result.ledgerStatus)');
  s=s.slice(0,a)+part+s.slice(b);
 }return s;
});
edit('components/ui/groups/purchase-orders/__tests__/PurchaseOrderManagement.test.tsx',s=>'jest.mock("@/components/purchase-orders/PurchaseOrderLifecycleDialog", () => ({ PurchaseOrderLifecycleDialog: () => null }))\n'+s);
edit('hooks/__tests__/useRecentPurchaseOrderQueries.boundary.test.tsx',s=>{
 const a=s.indexOf('  it("routes detail lifecycle mutations'),b=s.indexOf('\n})',a);let part=s.slice(a,b);
 part=part.replace('    const wrapper =','    const request = (kind: "submit" | "cancel" | "complete") => ({ kind, expectedRevision: "b".repeat(64), idempotencyKey: "lifecycle-" + kind, ...(kind === "cancel" ? { reason: "Duplicate" } : {}) });\n    const wrapper =');
 for(const [hook,kind]of [['submit','submit'],['cancel','cancel'],['close','complete']])part=part.replace(hook+'.result.current.mutateAsync({ id: "po-1", organizationId: "org-1"',hook+'.result.current.mutateAsync({ id: "po-1", organizationId: "org-1", request: request("'+kind+'")');
 part=part.replace('toHaveBeenCalledWith("po-1", "org-1")','toHaveBeenCalledWith("po-1", "org-1", request("submit"))').replace('mockClosePurchaseOrder).toHaveBeenCalledWith("po-1", "org-1", request("submit"))','mockClosePurchaseOrder).toHaveBeenCalledWith("po-1", "org-1", request("complete"))').replace('toHaveBeenCalledWith("po-1", "org-1", "Duplicate")','toHaveBeenCalledWith("po-1", "org-1", "Duplicate", request("cancel"))');return s.slice(0,a)+part+s.slice(b);
});
edit('actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts',s=>{
 s=s.replace('  deletePurchaseOrder as deletePurchaseOrderService,','  executePurchaseOrderLifecycle as executeLifecycleService,');s=s.replace('  deletePurchaseOrder: jest.fn(),','  executePurchaseOrderLifecycle: jest.fn(),\n  getPurchaseOrderLifecyclePreview: jest.fn(),');s=s.replace('const mockDeletePurchaseOrderService = deletePurchaseOrderService as jest.Mock','const mockExecuteLifecycleService = executeLifecycleService as jest.Mock');s=s.replace('  mockDeletePurchaseOrderService.mockResolvedValue("PO-000001")','  mockExecuteLifecycleService.mockResolvedValue({ id: "po-1", lifecycleReceipt: { archived: true } })');
 s=between(s,'  it("keeps safe non-approval bulk transitions available"','  it("approves purchase orders',`  it("passes reviewed bulk commands with current server identity", async () => {
    const params = { organizationId: "org-session", purchaseOrderIds: ["po-1"], toStatus: "CANCELLED" as const, reason: "No longer required", reviewedRequests: [{ id: "po-1", request: { kind: "cancel" as const, reason: "No longer required", expectedRevision: "a".repeat(64), idempotencyKey: "batch-request" } }] }
    const result = await bulkUpdatePurchaseOrderStatus(params)
    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.cancel", expect.objectContaining({ resource: "PurchaseOrder" }))
    expect(mockBulkUpdateStatus).toHaveBeenCalledWith(params, { organizationId: "org-session", actorId: "actor-session", sessionId: "current-session", sessionToken: "server-session-token" })
    expect(result).toMatchObject({ success: true, data: { updated: ["po-1"], failed: [] } })
  })`);
 s=between(s,'  it("archives purchase orders with the RBAC actor','  it("receives purchase orders',`  it("archives the reviewed version with server identity and keeps its receipt after cache failure", async () => {
    const request = { kind: "archive" as const, expectedRevision: "a".repeat(64), idempotencyKey: "archive-request" }
    ;(revalidatePath as jest.Mock).mockImplementationOnce(() => { throw Error("Cache failure") })
    const result = await deletePurchaseOrder("po-1", "org-session", request)
    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.delete", { resource: "PurchaseOrder", resourceId: "po-1", auditAllowed: undefined })
    expect(mockExecuteLifecycleService).toHaveBeenCalledWith("po-1", { organizationId: "org-session", actorId: "actor-session", sessionId: "current-session", sessionToken: "server-session-token" }, request)
    expect(result).toMatchObject({ success: true, data: { lifecycleReceipt: { archived: true } } })
  })
  it("refuses archive without a reviewed request", async () => {
    expect(await deletePurchaseOrder("po-1", "org-session")).toMatchObject({ success: false, code: "REVIEW_REQUIRED" })
    expect(mockExecuteLifecycleService).not.toHaveBeenCalled()
  })`);return s;
});
edit('services/purchase-order/__tests__/purchase-order.service.test.ts',s=>{
 s=s.replace('import { purchaseApprovalRevision }','import { purchaseApprovalSnapshot } from "../purchase-order-approval"\nimport { hashBusinessPayload } from "@/services/events/business-event.service"\nimport type { PurchaseLifecycleKind } from "../purchase-order-lifecycle-contracts"\njest.mock("../purchase-order-lifecycle", () => ({ ...jest.requireActual("../purchase-order-lifecycle"), purchaseLifecycleAuthority: jest.fn().mockResolvedValue({ requiresFreshAuth: false }), replayPurchaseLifecycle: jest.fn().mockResolvedValue(null) }))\nimport { purchaseApprovalRevision }');
 const marker='const editContext =';s=s.replace(marker,'const lifecycleEvidence = { counts: { goodsReceipts: 0, payments: 0, supplierInvoices: 0, threeWayMatches: 0, acknowledgementEnvelopes: 0, purchaseReturns: 0, supplierCreditNotes: 0 }, receipts: [] };\nconst lifecycleContext = (kind: PurchaseLifecycleKind, order: ReturnType<typeof purchaseOrder>, actorId = "manager-1") => ({ organizationId: "org-1", actorId, sessionId: "session-1", sessionToken: "owned-test-token", kind, expectedRevision: hashBusinessPayload({ version: 1, order: purchaseApprovalSnapshot(order as never), evidence: lifecycleEvidence }), idempotencyKey: "lifecycle-" + order.id, ...(kind === "cancel" ? { reason: "No longer required" } : {}) });\n'+marker);
 s=s.replace('purchaseOrder: { findFirst: mockDb.purchaseOrder.findFirst, ...tx.purchaseOrder }','purchaseOrder: { findFirst: mockDb.purchaseOrder.findFirst, findUniqueOrThrow: jest.fn().mockResolvedValue({ _count: lifecycleEvidence.counts, goodsReceipts: [] }), ...tx.purchaseOrder }');
 s=s.replace('    orderNumber: "PO-000001",','    orderNumber: "PO-000001",\n    organizationId: "org-1",');
 s=s.replace('submitPurchaseOrder("po-1", "org-1")','submitPurchaseOrder("po-1", "org-1", lifecycleContext("submit", purchaseOrder({ status: "DRAFT", lines: [] })))');
 const completeA='purchaseOrder({ status: "RECEIVED", lines: [purchaseOrderLine({ orderedQuantity: "10.125", receivedQuantity: "10.124" })] })';s=s.replace('closePurchaseOrder("po-1", "org-1")','closePurchaseOrder("po-1", "org-1", lifecycleContext("complete", '+completeA+'))');
 s=s.replace('closePurchaseOrder("po-1", "org-1")','closePurchaseOrder("po-1", "org-1", lifecycleContext("complete", purchaseOrder({ status: "RECEIVED" })))');
 s=between(s,'  it("bulk submission rejects an empty order','  it("blocks order completion',`  it("bulk submission uses each reviewed version, deduplicates selection and reports unavailable orders", async () => {
    const valid = purchaseOrder({ id: "valid", status: "DRAFT" }), empty = purchaseOrder({ id: "empty", status: "DRAFT", lines: [] })
    mockDb.purchaseOrder.findFirst.mockImplementation(({ where }) => where.id === "valid" ? valid : where.id === "empty" ? empty : null)
    mockDb.supplier.findFirst.mockResolvedValue({ id: "supplier-1" }); mockDb.location.findFirst.mockResolvedValue({ id: "loc-1" }); mockDb.item.findMany.mockResolvedValue([{ id: "item-1" }])
    const { organizationId, actorId, sessionId, sessionToken, ...validRequest } = lifecycleContext("submit", valid)
    const { organizationId: _org, actorId: _actor, sessionId: _session, sessionToken: _token, ...emptyRequest } = lifecycleContext("submit", empty)
    const result = await bulkUpdateStatus({ organizationId, purchaseOrderIds: ["valid", "empty", "valid", "missing"], toStatus: "SUBMITTED", reviewedRequests: [{ id: "valid", request: validRequest }, { id: "empty", request: emptyRequest }, { id: "missing", request: { ...validRequest, idempotencyKey: "lifecycle-missing" } }] }, { organizationId, actorId, sessionId, sessionToken })
    expect(result.updated).toEqual(["valid"]); expect(result.failed.map(row => row.id)).toEqual(["empty", "missing"]); expect(defaultOrderWrite).toHaveBeenCalledTimes(1)
  })`);
 s=between(s,'  it("keeps valid non-approval bulk transitions available"','  it("rejects self approval',`  it("keeps reviewed cancellation available in a batch without modifying order notes", async () => {
    const order = purchaseOrder(), { organizationId, actorId, sessionId, sessionToken, ...request } = lifecycleContext("cancel", order)
    mockDb.purchaseOrder.findFirst.mockResolvedValue(order)
    const result = await bulkUpdateStatus({ organizationId, purchaseOrderIds: ["po-1"], toStatus: "CANCELLED", reason: request.reason, reviewedRequests: [{ id: "po-1", request }] }, { organizationId, actorId, sessionId, sessionToken })
    expect(result).toEqual({ updated: ["po-1"], failed: [] })
    expect(defaultOrderWrite).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED", updatedAt: expect.any(Date), deletedAt: undefined } }))
  })`);
 s=s.replace(/mockDb.purchaseOrder.findFirst.mockResolvedValue\(\{\r?\n      id: "po-1",\r?\n      status: "DRAFT",[\s\S]*?      approvedById: null,\r?\n    \}\)/,'mockDb.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder({ status: "DRAFT" }))');
 s=s.replace('deletePurchaseOrder("po-1", "org-1", "manager-1")','deletePurchaseOrder("po-1", "org-1", "manager-1", lifecycleContext("archive", purchaseOrder({ status: "DRAFT" })))').replace('expect(orderNumber).toBe("PO-000001")','expect(orderNumber.lifecycleReceipt).toMatchObject({ kind: "archive", archived: true, replayed: false })');
 s=s.replace('idempotencyKey: "purchase-order:archive:org-1:po-1"','idempotencyKey: "purchase-order-lifecycle:lifecycle-po-1"');
 const a=s.indexOf('        payload: expect.objectContaining({',s.indexOf('it("archives purchase orders')),b=s.indexOf('\n      }),',a);if(a<0||b<0)throw Error('archivepayload');s=s.slice(0,a)+'        payload: expect.objectContaining({ entityType: "PurchaseOrder", result: expect.objectContaining({ orderId: "po-1", fromStatus: "DRAFT", toStatus: "CANCELLED", actorId: "manager-1", archived: true }) }),'+s.slice(b);
 return s;
});
