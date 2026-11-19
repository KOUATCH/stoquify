const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{PrismaClient}=require('@prisma/client');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8')),t=read('DATABASE_TARGET.json'),f=read('BROWSER_FIXTURE.json');
if(t.host!=='localhost'||!/^stoquify_retention_p07_20261018_[a-f0-9]+$/.test(t.database)||t.user!=='retention_fixture'||f.database!==t.database)throw Error('Unexpected target');
const db=new PrismaClient({datasources:{db:{url:`postgresql://${t.user}@localhost:${t.port}/${t.database}?schema=public`}}});
async function main(){
 const where={organizationId:f.organizationId};
 const customers=await db.customer.findMany({where,select:{id:true,code:true,currentBalance:true}}),suppliers=await db.supplier.findMany({where,select:{id:true,code:true,currentBalance:true}}),items=await db.item.findMany({where,select:{id:true,sku:true,imageUrls:true}});
 assert.equal(customers.length,1);assert.equal(suppliers.length,1);assert.equal(items.length,2);assert(customers.every(r=>r.currentBalance.isZero()));assert(suppliers.every(r=>r.currentBalance.isZero()));
 assert.deepEqual(items.flatMap(r=>r.imageUrls).sort(),[...f.media].sort());
 const assets=await db.pictureAsset.findMany({where:{...where,id:{in:f.media.map(ref=>ref.split('/').pop())}},select:{id:true,organizationId:true,status:true,attachedAt:true}});
 assert.equal(assets.length,2);assert(assets.every(a=>a.status==='ready'&&a.attachedAt));
 const stockLevels=await db.inventoryLevel.count({where:{itemId:{in:items.map(r=>r.id)}}}),stockMovements=await db.inventoryTransaction.count({where}),journals=await db.journalEntry.count({where}),postings=await db.ledgerPostingBatch.count({where});
 assert.deepEqual({stockLevels,stockMovements,journals,postings},{stockLevels:0,stockMovements:0,journals:0,postings:0});
 const batches=await db.onboardingImportBatch.findMany({where,select:{id:true,target:true,status:true,schemaVersion:true,mappingVersion:true,sourceRecordCount:true,committedRecordCount:true,contentHash:true,uploadedById:true,approvedById:true,replayCount:true,riskLevel:true}});
 assert.equal(batches.filter(b=>b.status==='COMMITTED').length,3);assert.equal(batches.filter(b=>b.status==='BLOCKED').length,2);assert(batches.filter(b=>b.status==='COMMITTED'&&b.riskLevel==='HIGH').every(b=>b.approvedById&&b.approvedById!==b.uploadedById));
 const rows=await db.onboardingImportRow.findMany({where:{...where,committedRecordId:{not:null}},select:{businessKey:true,committedRecordId:true,sourceRowHash:true,batchId:true,normalizedData:true}});
 assert.deepEqual(rows.map(r=>r.businessKey).sort(),['customer-a','supplier-a','item-each','item-weight'].sort());
 const injections=await db.$queryRawUnsafe(`SELECT tgname FROM pg_trigger WHERE tgname IN ('p07_media_checkpoint_failure','p07_media_item_failure')`);assert.equal(injections.length,0);
 fs.writeFileSync(path.join(__dirname,'LINEAGE_AND_NO_OPENING_WRITES.json'),JSON.stringify({status:'PASS',at:new Date().toISOString(),database:t.database,organizationId:f.organizationId,mediaBoundary:f.mediaBoundary,customers,suppliers,items,assets,stockLevels,stockMovements,journals,postings,batches,rows,checkpointTriggerRemoved:true},null,2));console.log('PASS: all four masters retain source and media; zero opening effects');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
