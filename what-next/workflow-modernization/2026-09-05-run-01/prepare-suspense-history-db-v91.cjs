const fs=require('fs'),path=require('path'),assert=require('assert/strict'),dir=path.join(__dirname,'lanes/environment');
let s=fs.readFileSync(path.join(dir,'verify-suspense-review.cjs'),'utf8').replaceAll('suspense-review-','suspense-history-db-v91-');
s=s.replace("'services/accounting/periods.service.ts'","'services/accounting/periods.service.ts','services/reconciliation/payment-suspense-read.service.ts'");
s=s.replace('const now=new Date(),control=',"const now=new Date('2026-09-01T12:00:00Z'),control=");
const insert=`
 const read=require(path.join(f.root,'services/reconciliation/payment-suspense-read.service.ts')).readPaymentSuspenseRecords;
 const historical=await read(x.organizationId,{itemId:item.id});assert.equal(historical.items[0].postingDate,now.toISOString());assert.equal(historical.items[0].suspenseAccount.code,'OWNED-471');assert.ok(historical.items[0].journal.number);report.checks.push('Actual retained September 1 journal date survives a later read; scoped account and journal labels retained');
 await assert.rejects(()=>read(y.organizationId,{itemId:item.id}),/unavailable/i);report.checks.push('Actual cross-tenant history lookup cannot expose the item');
 await db.suspenseItem.createMany({data:Array.from({length:30},()=>({organizationId:x.organizationId,type:'OTHER',status:'RESOLVED',amount:'1.00',createdAt:new Date('2026-10-01T00:00:00Z')}))});
 const state=await snapshot({organizationId:x.organizationId}),a=await read(x.organizationId,{}),b=await read(x.organizationId,{cursor:a.nextCursor});assert.equal(a.items.length,25);assert.equal(b.items.length,6);assert.equal(b.nextCursor,null);assert.equal(new Set([...a.items,...b.items].map(v=>v.id)).size,31);assert.equal(await snapshot({organizationId:x.organizationId}),state);report.checks.push('Actual tied-time cursor pages cover 31 retained records without duplicates or read-side mutations');
 const missing=await db.suspenseItem.create({data:{organizationId:x.organizationId,type:'OTHER',status:'POSTED_TO_SUSPENSE',amount:'1.00',postedAt:now}});assert.equal((await read(x.organizationId,{itemId:missing.id})).items[0].postingDate,null);report.checks.push('Missing retained journal is explicitly unavailable, never replaced with today');
`;
assert.ok(s.includes(' report.passed=true;'));s=s.replace(' report.passed=true;',insert+' report.passed=true;');fs.writeFileSync(path.join(dir,'verify-suspense-history-db-v91.cjs'),s,{flag:'wx'});console.log('Prepared actual history database proof');
