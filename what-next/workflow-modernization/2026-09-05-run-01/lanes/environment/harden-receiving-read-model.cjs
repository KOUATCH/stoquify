const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../../../../..');
function edit(file,fn){const p=path.join(root,file),s=fs.readFileSync(p,'utf8'),after=fn(s);assert.notEqual(s,after);fs.writeFileSync(p,after)}
edit('services/purchase-order/purchase-receiving-workbench.service.ts',s=>{
 const a=s.indexOf('async function outcomes('),b=s.indexOf('async function decision(',a);assert.ok(a>0&&b>a);
 s=s.slice(0,a)+`const stockLineSchema = z.object({ itemId: z.string(), locationId: z.string(), quantity: z.string(), unitCost: z.string(), movementType: z.literal("PURCHASE_RECEIPT"), referenceType: z.literal("GOODS_RECEIPT"), referenceId: z.string(), batchNumber: z.string().nullable(), serialNumbers: z.array(z.string()), expiryDate: z.string().nullable() })
type StockLine = z.infer<typeof stockLineSchema>
function stockSignatures(lines: StockLine[]) {
  return lines.map(line => hashBusinessPayload({ ...line, quantity: new Prisma.Decimal(line.quantity).toString(), unitCost: new Prisma.Decimal(line.unitCost).toString(), serialNumbers: [...line.serialNumbers].sort() })).sort()
}
async function loadOutcomes(tx: Prisma.TransactionClient, organizationId: string, receipts: Receipt[]) {
  const ids = receipts.map(receipt => receipt.id)
  const events = await tx.businessEvent.findMany({ where: { organizationId, sourceId: { in: ids }, sourceType: "GOODS_RECEIPT", eventType: "purchase.goods_receipt.stock_posted", status: "APPLIED" }, select: { sourceId: true, payload: true, payloadHash: true, processedAt: true } })
  const movements = await tx.inventoryTransaction.findMany({ where: { organizationId, referenceType: "GOODS_RECEIPT", referenceId: { in: ids } }, select: { itemId: true, locationId: true, quantity: true, unitCost: true, type: true, referenceId: true, batchNumber: true, serialNumbers: true, expiryDate: true } })
  const batches = await tx.ledgerPostingBatch.findMany({ where: { organizationId, sourceType: "GOODS_RECEIPT", sourceId: { in: ids }, postingPurpose: "GOODS_RECEIPT" }, select: { sourceId: true, status: true, postedAt: true } })
  return new Map(receipts.map(receipt => {
    if (receipt.status !== "RECEIVED" && receipt.status !== "COMPLETED") return [receipt.id, { stockStatus: "unavailable" as const, accountingStatus: "not_started" as const }]
    const stockEvents = events.filter(event => event.sourceId === receipt.id), stock = movements.filter(m => m.referenceId === receipt.id), ledger = batches.filter(batch => batch.sourceId === receipt.id)
    let verified = false
    try {
      const expected = stockSignatures(receipt.lines.map(line => ({ itemId: line.itemId, locationId: receipt.locationId, quantity: line.receivedQuantity.toString(), unitCost: line.unitCost.toString(), movementType: "PURCHASE_RECEIPT", referenceType: "GOODS_RECEIPT", referenceId: receipt.id, batchNumber: line.batchNumber, serialNumbers: line.serialNumbers, expiryDate: line.expiryDate?.toISOString() ?? null })))
      const actual = stockSignatures(stock.map(m => stockLineSchema.parse({ itemId: m.itemId, locationId: m.locationId, quantity: m.quantity.toString(), unitCost: m.unitCost.toString(), movementType: m.type, referenceType: "GOODS_RECEIPT", referenceId: m.referenceId, batchNumber: m.batchNumber, serialNumbers: m.serialNumbers, expiryDate: m.expiryDate?.toISOString() ?? null })))
      const recorded = stockSignatures(stockEvents.flatMap(event => {
        const payload = event.payload as Record<string, unknown> | null
        if (!event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || payload?.sourceId !== receipt.id || payload.sourceType !== "GOODS_RECEIPT" || payload.eventType !== "purchase.goods_receipt.stock_posted") throw new Error("Unverified stock event")
        return z.array(stockLineSchema).parse(payload.lines)
      }))
      verified = !!receipt.inventoryPostedAt && expected.length > 0 && hashBusinessPayload(expected) === hashBusinessPayload(actual) && hashBusinessPayload(expected) === hashBusinessPayload(recorded)
    } catch { /* Missing or inconsistent evidence is unverified, never healthy. */ }
    const accountingStatus = !ledger.length ? "unverified" as const : ledger.every(batch => batch.status === "POSTED" && batch.postedAt) ? "posted" as const : ledger.some(batch => batch.status === "FAILED") ? "review_required" as const : "unverified" as const
    return [receipt.id, { stockStatus: verified ? "recorded" as const : "unverified" as const, accountingStatus }]
  }))
}
async function outcomes(tx: Prisma.TransactionClient, organizationId: string, receipt: Receipt) {
  return (await loadOutcomes(tx, organizationId, [receipt])).get(receipt.id)!
}

`+s.slice(b);
 s=s.replace('payload?.commandHash !== commandHash','payload?.entityType !== "GoodsReceipt" || payload.commandHash !== commandHash');
 s=s.replace('parsed.data.actorId !== scope.actorId || parsed.data.orderId','parsed.data.kind !== command.draft.kind || parsed.data.actorId !== scope.actorId || parsed.data.orderId');
 const x=s.indexOf('    const receipts: PurchaseReceivingWorkbench'),y=s.indexOf('      let saved:',x);assert.ok(x>0&&y>x);
 s=s.slice(0,x)+`    const receipts: PurchaseReceivingWorkbench["receipts"] = []
    const visible = rows.slice(0, 100), currentOutcomes = await loadOutcomes(tx, scope.organizationId, visible)
    const historyEvents = visible.length ? await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceId: orderId, eventType: { in: [eventType("receive"), eventType("resolve")] }, OR: visible.map(r => ({ payload: { path: ["result", "goodsReceiptId"], equals: r.id } })) }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }] }) : []
    for (const r of visible) {
      const outcome = currentOutcomes.get(r.id)!
      const events = historyEvents.filter(e => (e.payload as { result?: { goodsReceiptId?: string } } | null)?.result?.goodsReceiptId === r.id).slice(0,1)
`+s.slice(y);
 s=s.replace('e.schemaVersion !== 1 || e.payloadHash', 'e.schemaVersion !== 1 || e.sourceType !== null || payload?.entityType !== "GoodsReceipt" || !parsed.success || e.eventType !== eventType(parsed.data.kind) || e.payloadHash');
 s=s.replace('|| parsed.data.goodsReceiptId !== r.id','|| payload?.receiptPayloadHash !== r.payloadHash || parsed.data.disposition !== r.status || parsed.data.receiptNumber !== r.receiptNumber || parsed.data.goodsReceiptId !== r.id');
 return s;
});
edit('services/purchase-order/purchase-order.service.ts',s=>{
 const anchor='      const lineMap = new Map(po.lines.map((line) => [line.id, line]))\n';
 const normalized=s.replace(/\r\n/g,'\n');assert.ok(normalized.includes(anchor));
 return normalized.replace(anchor,anchor+'      const serialUnits = input.items.reduce((sum, item) => sum + (lineMap.get(item.lineId)?.item.trackSerialNumbers ? item.receivedQuantity : 0), 0)\n      if (serialUnits > 5000) throw new BusinessRuleError("Receive at most 5000 serial-tracked units in one request.")\n');
});
edit('components/purchase-orders/PurchaseReceivingWorkbench.tsx',s=>s.replace('function close() { if (!busy) { setPassword(""); onOpenChange(false) } }','function close() { if (!busy) { setPassword(""); if (!pending) { setPreview(null); setReceipt(null); if (resolution) { setResolution(null); setReason("") } } onOpenChange(false) } }'));
console.log('Receiving history now checks each movement against receipt lines and verified stock events with bounded query counts.');
