const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{PrismaClient}=require('@prisma/client');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8')),t=read('DATABASE_TARGET.json'),f=read('BROWSER_FIXTURE.json');
if(t.host!=='localhost'||!/^stoquify_retention_p07_20261017_[a-f0-9]+$/.test(t.database)||t.user!=='retention_fixture')throw Error('Unexpected target');
const db=new PrismaClient({datasources:{db:{url:`postgresql://${t.user}@localhost:${t.port}/${t.database}?schema=public`}}});
async function main(){
 const where={organizationId:f.organizationId};
 const customers=await db.customer.findMany({where,select:{id:true,code:true,currentBalance:true}}),suppliers=await db.supplier.findMany({where,select:{id:true,code:true,currentBalance:true}}),items=await db.item.findMany({where,select:{id:true,sku:true}});
 assert.equal(customers.length,1);assert.equal(suppliers.length,1);assert.equal(items.length,0);assert(customers.every(row=>row.currentBalance.isZero()));assert(suppliers.every(row=>row.currentBalance.isZero()));
 const stockLevels=await db.inventoryLevel.count({where:{itemId:{in:items.map(row=>row.id)}}}),stockMovements=await db.inventoryTransaction.count({where}),journals=await db.journalEntry.count({where}),postings=await db.ledgerPostingBatch.count({where});
 assert.deepEqual({stockLevels,stockMovements,journals,postings},{stockLevels:0,stockMovements:0,journals:0,postings:0});
 const batches=await db.onboardingImportBatch.findMany({where,select:{id:true,target:true,status:true,sourceRecordCount:true,committedRecordCount:true,contentHash:true,uploadedById:true,approvedById:true,replayCount:true,riskLevel:true}});
 assert.equal(batches.filter(b=>b.status==='COMMITTED').length,2);assert.equal(batches.filter(b=>b.status==='BLOCKED').length,1);assert(batches.filter(b=>b.status==='COMMITTED'&&b.riskLevel==='HIGH').every(b=>b.approvedById&&b.approvedById!==b.uploadedById));
 const rows=await db.onboardingImportRow.findMany({where:{...where,committedRecordId:{not:null}},select:{businessKey:true,committedRecordId:true,sourceRowHash:true,batchId:true}});
 assert.deepEqual(rows.map(row=>row.businessKey).sort(),['customer-a','supplier-a'].sort());
 fs.writeFileSync(path.join(__dirname,'LINEAGE_AND_NO_OPENING_WRITES.json'),JSON.stringify({status:'PASS',scope:'Only customer/supplier lineage and absence of opening writes; item import remains blocked',at:new Date().toISOString(),organizationId:f.organizationId,customers,suppliers,items,stockLevels,stockMovements,journals,postings,batches,rows},null,2));console.log('PASS: customer/supplier lineage, zero stock and opening balances; item import remains blocked');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
