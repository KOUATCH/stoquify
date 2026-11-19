const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {state,redact}=require('./environment.cjs'),s=state();
const {PrismaClient}=require(path.join(s.work,'private-dependencies/node_modules/@prisma/client')),db=new PrismaClient({datasources:{db:{url:s.url}}});
async function main(){
 const [identity]=await db.$queryRaw`SELECT current_database() AS name,current_setting('data_directory') AS directory`;
 assert.equal(identity.name,s.database);assert.equal(path.resolve(identity.directory).toLowerCase(),s.cluster.toLowerCase());
 const file=path.join(s.work,'fixture-private.json'),backup=path.join(s.work,'first-native-fixture-private.json');
 if(!fs.existsSync(backup))fs.copyFileSync(file,backup);
 const first=JSON.parse(fs.readFileSync(backup));
 const org=await db.organization.findUniqueOrThrow({where:{id:first.organizationId}});assert.ok(org.slug.startsWith('phase10-'));
 const original=await db.purchaseOrder.findUniqueOrThrow({where:{id:first.purchaseOrderId}});assert.equal(original.organizationId,org.id);assert.equal(original.status,'RECEIVED');
 assert.equal(await db.goodsReceipt.count({where:{purchaseOrderId:original.id}}),1);
 let po=await db.purchaseOrder.findFirst({where:{organizationId:org.id,orderNumber:'P10-RECEIVE-2'},include:{lines:true}});
 if(po)assert.equal(po.status,'APPROVED','Never repeat a completed source command');
 else po=await db.$transaction(async tx=>{
  const item=await tx.item.create({data:{organizationId:org.id,sku:crypto.randomUUID(),slug:crypto.randomUUID(),nameEn:'Phase 10 second sample',nameFr:'Deuxième échantillon Phase 10',imageUrls:[],isActive:true,trackInventory:true,trackBatches:false,trackSerialNumbers:false,trackExpiry:false,costPrice:0,sellingPrice:0}});
  await tx.inventoryLevel.create({data:{itemId:item.id,locationId:first.locationId}});
  return tx.purchaseOrder.create({data:{organizationId:org.id,supplierId:original.supplierId,locationId:first.locationId,orderNumber:'P10-RECEIVE-2',status:'APPROVED',createdById:first.managerId,approvedById:first.ownerId,approvedAt:new Date(),expectedDeliveryDate:new Date(Date.now()-86400000),subtotal:0,total:0,lines:{create:{itemId:item.id,orderedQuantity:1,receivedQuantity:0,unitCost:0,lineTotal:0}}},include:{lines:true}});
 });
 assert.equal(po.lines.length,1);
 const level=await db.inventoryLevel.findFirstOrThrow({where:{itemId:po.lines[0].itemId,locationId:first.locationId}});assert.equal(level.quantityAvailable.toString(),'0');
 const next={...first,itemId:po.lines[0].itemId,levelId:level.id,purchaseOrderId:po.id,purchaseOrderLineId:po.lines[0].id};
 fs.writeFileSync(file,JSON.stringify(next));
 const {password:omitted,...safe}=next;
 fs.writeFileSync(path.join(__dirname,'recurrence-fixture.json'),JSON.stringify({...safe,originalPurchaseOrderId:original.id,originalReceiptCount:1,synthetic:true,sourceCompletionNotFabricated:true},null,2));
 console.log('Fresh synthetic zero-stock item and approved overdue order ready; original received order and receipt preserved');
}
main().catch(e=>{console.error(redact(e.message));process.exitCode=1}).finally(()=>db.$disconnect());
