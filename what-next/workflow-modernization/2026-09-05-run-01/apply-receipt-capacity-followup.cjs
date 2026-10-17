const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const edits=[
 ['services/purchasing/ap-control.service.ts','  const reservedByReceipt = new Map<string, Prisma.Decimal>()',`  const reservedByReceipt = new Map<string, Prisma.Decimal>()
  const receiptLineIds = [...new Set(input.lines.map(line => line.goodsReceiptLineId))]
  if (receiptLineIds.length) await tx.$queryRaw(Prisma.sql\`SELECT r.id FROM goods_receipts r JOIN goods_receipt_lines l ON l."goodsReceiptId" = r.id WHERE r."organizationId" = \${input.organizationId} AND l.id IN (\${Prisma.join(receiptLineIds)}) ORDER BY r.id FOR SHARE OF r\`)`],
 ...['invoice-preparation.service.ts','invoice-correction.service.ts'].map(file=>['services/purchasing/'+file,'available: row.receivedQuantity.minus(used.get(row.id) ?? 0).toString()','available: Prisma.Decimal.max(0, row.receivedQuantity.minus(used.get(row.id) ?? 0).minus(returned.get(row.id) ?? 0)).toString()']),
];
const writes=edits.map(([file,before,after])=>{const target=path.join(root,file),original=fs.readFileSync(target,'utf8');assert.equal(original.split(before).length,2,file);return{target,text:original.replace(before,after.replace(/\r?\n/g,original.includes('\r\n')?'\r\n':'\n'))};});
for(const{target,text}of writes){const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd)}}
console.log(JSON.stringify({changed:writes.map(w=>path.relative(root,w.target))}));
