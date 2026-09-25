const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../../../../..');
function edit(file,fn){const p=path.join(root,file),s=fs.readFileSync(p,'utf8'),a=fn(s);assert.notEqual(s,a);fs.writeFileSync(p,a)}
edit('services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts',s=>{
 s=s.replace('import { receiveItems, resolveGoodsReceiptInspection } from "../purchase-order.service"','import { Prisma } from "@prisma/client"\nimport { receiveItems as receiveWithScope, resolveGoodsReceiptInspection as resolveWithScope } from "../purchase-order.service"\nimport { purchaseReceivingAuthority } from "../purchase-receiving-authority"');
 const point='const mockDb = db as unknown as {';
 const helper=`// Current account/session authority is exercised against PostgreSQL by the receiving
// prerequisite and workbench verifiers. These tests isolate stock/receipt behavior.
jest.mock("../purchase-receiving-authority", () => ({
  ...jest.requireActual("../purchase-receiving-authority"),
  purchaseReceivingAuthority: jest.fn().mockResolvedValue({ fresh: true, canReceive: true }),
}))
function receiveItems(input: Parameters<typeof receiveWithScope>[0]) {
  return receiveWithScope(input, { organizationId: input.organizationId, actorId: input.receivedById, sessionId: "test-session", sessionToken: "test-session-token" })
}
function resolveGoodsReceiptInspection(input: Parameters<typeof resolveWithScope>[0]) {
  return resolveWithScope(input, { organizationId: input.organizationId, actorId: input.resolvedById, sessionId: "test-session", sessionToken: "test-session-token" })
}
function databaseRows(value: unknown, parent?: string): unknown {
  if (Array.isArray(value)) return value.map(row => databaseRows(row))
  if (!value || typeof value !== "object" || value instanceof Date || value instanceof Prisma.Decimal) return value
  const row = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, typeof child === "number" && ["orderedQuantity", "receivedQuantity", "unitCost", "lineTotal"].includes(key) ? new Prisma.Decimal(child) : databaseRows(child,key)]))
  if (parent === "item") return { organizationId: "org-1", isActive: true, deletedAt: null, ...row }
  return row
}
// Supply the shared persisted fields required by the receiving service. Each test
// retains its own delegate spies and explicit overrides for exceptional behavior.
function receivingTx<T extends object>(input: T) {
  const tx = input as Record<string, unknown>
  const models: Record<string, Record<string, jest.Mock>> = {
    location: { findFirst: jest.fn().mockResolvedValue({ id: "loc-1" }) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "receiving-audit" }) },
    purchaseOrder: { findFirst: jest.fn().mockResolvedValue(purchaseOrder()) },
    goodsReceipt: { findFirst: jest.fn().mockResolvedValue(tx.goodsReceiptInspectionResolution ? { purchaseOrderId: "po-1" } : null) },
  }
  return new Proxy(input, { get(target, property) {
    const original = Reflect.get(target,property)
    if (typeof property !== "string" || property.startsWith("$")) return original
    const model = { ...models[property], ...(original as Record<string, jest.Mock> | undefined) }
    return new Proxy(model, { get(delegate,method) {
      const fn = delegate[String(method)]
      if (typeof fn !== "function") return fn
      return (...args: unknown[]) => Promise.resolve(fn(...args)).then(row => databaseRows(row))
    } })
  } })
}

`;
 assert.ok(s.includes(point));s=s.replace(point,helper+point);
 s=s.replace('    jest.clearAllMocks()','    jest.clearAllMocks()\n    mockDb.$transaction.mockReset().mockImplementation(async handler => handler(receivingTx(mockDb)))\n    ;(purchaseReceivingAuthority as jest.Mock).mockResolvedValue({ fresh: true, canReceive: true })');
 s=s.replace(/handler\((tx|firstTx|replayTx)\)/g,'handler(receivingTx($1))');
 s=s.replace('inspection: { id: "inspection-1", outcome: "FAILED" }','inspection: { id: "inspection-1", outcome: "FAILED", inspectedById: "original-inspector" }');
 s=s.replace('inspection: { id: "inspection-2", outcome: "INCOMPLETE" }','inspection: { id: "inspection-2", outcome: "INCOMPLETE", inspectedById: "original-inspector" }');
 s=s.replace('where: { id: "line-1", purchaseOrderId: "po-1", receivedQuantity: 0 },','where: { id: "line-1", purchaseOrderId: "po-1", receivedQuantity: new Prisma.Decimal(0) },');
 s=s.replace('expect(tx.$queryRaw).toHaveBeenCalledTimes(1)','expect(tx.$queryRaw).not.toHaveBeenCalled()');
 // The session-scoped P2002 recovery now uses an authorized transaction too.
 s=s.replace(/(mockDb\.\$transaction\.mockRejectedValueOnce\(\{ code: "P2002", clientVersion: "test" \}\))/g,'$1\n    mockDb.$transaction.mockImplementationOnce(async handler => handler(receivingTx(mockDb)))');
 return s;
});
edit('actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts',s=>{
 s=s.replace('it("receives purchase orders with only the canonical receive permission"','it("requires the reviewed receiving panel even for an authorized legacy client"');
 s=s.replace('it("resolves a held receipt with the canonical receive permission and RBAC actor"','it("requires the reviewed inspection panel even for an authorized legacy client"');
 const a=s.indexOf('  it("requires the reviewed receiving panel'),b=s.indexOf('  it("does not record a receiving inspection',a);assert.ok(a>0&&b>a);let block=s.slice(a,b);block=block.replace('auditAllowed: true','auditAllowed: undefined').replace(/expect\(mockReceiveItemsService\)\.toHaveBeenCalledWith\(\{[\s\S]*?\}\)/,'expect(mockReceiveItemsService).not.toHaveBeenCalled()').replace('expect(result.success).toBe(true)','expect(result).toMatchObject({ success: false, code: "REVIEW_REQUIRED" })');s=s.slice(0,a)+block+s.slice(b);
 const c=s.indexOf('  it("requires the reviewed inspection panel'),d=s.indexOf('  it("rejects cross-tenant inspection',c);assert.ok(c>0&&d>c);block=s.slice(c,d);block=block.replace('auditAllowed: true','auditAllowed: undefined').replace(/expect\(mockResolveGoodsReceiptInspectionService\)\.toHaveBeenCalledWith\(\{[\s\S]*?\}\)/,'expect(mockResolveGoodsReceiptInspectionService).not.toHaveBeenCalled()').replace('expect(result).toMatchObject({ success: true, data: { receiptStatus: "RECEIVED" } })','expect(result).toMatchObject({ success: false, code: "REVIEW_REQUIRED" })');s=s.slice(0,c)+block+s.slice(d);
 s=s.replaceAll('expect(result).toMatchObject({ success: false, error: "Permission denied" })','expect(result).toMatchObject({ success: false, code: "INTERNAL_ERROR" })\n    expect(result.error).not.toContain("Permission denied")');
 return s;
});
console.log('Updated receiving unit fixtures and assertions for current scoped and reviewed contracts.');
