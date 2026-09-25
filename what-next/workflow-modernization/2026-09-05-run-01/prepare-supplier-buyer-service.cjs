// One-time extraction and scoped service edits, guarded against applying twice.
const fs=require('fs'),p='services/purchase-order/supplier-po-acknowledgement.service.ts';let s=fs.readFileSync(p,'utf8');
if(s.includes('async function loadBuyerOrderInTx'))throw Error('Extraction already applied');
const start=s.indexOf('  const purchaseOrder = await tx.purchaseOrder.findFirst({',s.indexOf('async function createOrReuseEnvelopeInTx'));
const end=s.indexOf('  const existing = await tx.supplierPoEnvelope.findFirst({',start);
if(start<0||end<start)throw Error('Missing extraction bounds');
let original=s.slice(start,end),checks=original.slice(original.indexOf('  if (purchaseOrder.status'),original.indexOf('  const payload ='));
let loader=original.replace(checks,'').replace('preferredLocale: true, isActive: true','preferredLocale: true, isActive: true, email: true');
loader=loader.replace('    purchaseOrderId: purchaseOrder.id,\n','    purchaseOrderId: purchaseOrder.id,\n    supplierId: purchaseOrder.supplier.id,\n    locationId: purchaseOrder.location.id,\n');
// Handle the repository's CRLF without changing unrelated source lines.
loader=loader.replace('    purchaseOrderId: purchaseOrder.id,\r\n','    purchaseOrderId: purchaseOrder.id,\r\n    supplierId: purchaseOrder.supplier.id,\r\n    locationId: purchaseOrder.location.id,\r\n');
const helper='async function loadBuyerOrderInTx(tx: Prisma.TransactionClient, input: { organizationId: string; purchaseOrderId: string }) {\n  await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${input.purchaseOrderId} AND "organizationId" = ${input.organizationId} FOR SHARE`\n'+loader+'  return { purchaseOrder, payload, contentHash, sourceStateHash }\n}\n\n';
s=s.slice(0,start)+'  const { purchaseOrder, payload, contentHash, sourceStateHash } = await loadBuyerOrderInTx(tx, input)\n'+checks+s.slice(end);
const actorStart=s.indexOf('async function activeActor('),actorEnd=s.indexOf('async function createOrReuseEnvelopeInTx(',actorStart);if(actorStart<0||actorEnd<actorStart)throw Error('Missing actor bounds');
s=s.slice(0,actorStart)+helper+s.slice(actorEnd);
fs.writeFileSync(p,s);
