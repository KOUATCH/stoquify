const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');const root=path.resolve(__dirname,'../../..');
const original=JSON.parse(fs.readFileSync(path.join(__dirname,'lanes/environment/payment-match-proof-source-before-2f0d36be-3d79-409c-991b-b02276a98e74.json')));
const changes=new Map();
function edit(file,work){const source=fs.readFileSync(path.join(root,file),'utf8');assert.equal(source,original[file]);let text=source.replace(/\r\n/g,'\n');text=work(text);changes.set(file,source.includes('\r\n')?text.replace(/\n/g,'\r\n'):text);}
function replace(s,a,b){assert.ok(s.includes(a),a);return s.replace(a,b);}
edit('services/evidence/proof-trail.service.ts',s=>{
 s=replace(s,'import { NotFoundError } from "@/services/_shared/action-errors"','import { NotFoundError } from "@/services/_shared/action-errors"\nimport { MANUAL_ALLOCATION_STATUSES } from "@/services/reconciliation/manual-match-evidence"');
 const index=s.indexOf('async function buildPaymentTransactionProofTrail');assert.ok(index>0);let part=s.slice(index);
 part=replace(part,'      matchRecords: {','      matchRecords: {\n        where: { organizationId: input.organizationId },');
 const marker='  if (!transaction) throw new NotFoundError("Payment transaction proof subject not found")';
 part=replace(part,marker,marker+`

  // Display history includes proposals and rejected decisions. Only accepted
  // allocations across the complete history can establish full reconciliation.
  const matchCoverage = await client.matchRecord.groupBy({
    by: ["currencyCode"],
    where: { organizationId: input.organizationId, paymentTransactionId: transaction.id,
      status: { in: MANUAL_ALLOCATION_STATUSES } },
    _sum: { amountMatched: true }, _min: { amountMatched: true },
    _count: { _all: true, amountMatched: true },
  })
  const coverage = matchCoverage[0]
  const fullyMatched = matchCoverage.length === 1 && coverage.currencyCode === transaction.currencyCode &&
    coverage._count._all === coverage._count.amountMatched && coverage._min.amountMatched?.gt(0) === true &&
    transaction.amount.gt(0) && coverage._sum.amountMatched?.eq(transaction.amount) === true
`);
 part=replace(part,'matchRecordCount: transaction.matchRecords.length,','fullyMatched,');
 part=replace(part,': matchRecord.status === "APPROVED" || matchRecord.status === "AUTO_MATCHED"',': MANUAL_ALLOCATION_STATUSES.includes(matchRecord.status)');
 return s.slice(0,index)+part;
});
edit('services/evidence/evidence-grade.service.ts',s=>replace(replace(s,'matchRecordCount: number','fullyMatched: boolean'),'input.matchRecordCount > 0','input.fullyMatched'));
edit('services/evidence/__tests__/proof-trail.service.test.ts',s=>{
 s=replace(s,'    paymentTransaction: { findFirst: jest.fn() },','    paymentTransaction: { findFirst: jest.fn() },\n    matchRecord: { groupBy: jest.fn() },');
 s=replace(s,'  paymentTransaction: { findFirst: jest.Mock }','  paymentTransaction: { findFirst: jest.Mock }\n  matchRecord: { groupBy: jest.Mock }');
 return replace(s,'    mockDb.businessEvent.count.mockResolvedValue(0)','    mockDb.businessEvent.count.mockResolvedValue(0)\n    mockDb.matchRecord.groupBy.mockResolvedValue([{ currencyCode: "XAF", _sum: { amountMatched: amount(150000) }, _min: { amountMatched: amount(150000) }, _count: { _all: 1, amountMatched: 1 } }])');
});
for(const [file,text]of changes){const fd=fs.openSync(path.join(root,file),'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd);}}
console.log(JSON.stringify({changed:[...changes.keys()]}));
