const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),argon2=require('argon2');
const {PrismaClient}=require(path.join(require('./environment.cjs').state().work,'private-dependencies/node_modules/@prisma/client'));
const {state,redact}=require('./environment.cjs');
async function main(){
 const s=state();if(JSON.parse(fs.readFileSync(path.join(__dirname,'target-evidence.json'))).migrationExitCode!==0)throw Error('Fresh catalog replay must succeed before seeding');
 const db=new PrismaClient({datasources:{db:{url:s.url}}});
 try{
  const identity=await db.$queryRaw`SELECT current_database() AS name,current_setting('data_directory') AS directory`;
  if(identity[0].name!==s.database||path.resolve(identity[0].directory).toLowerCase()!==s.cluster.toLowerCase())throw Error('Wrong disposable target');
  if(await db.organization.count())throw Error('Empty synthetic database required');
  const password=crypto.randomBytes(24).toString('base64url'),passwordHash=await argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
  const org=await db.organization.create({data:{name:'Phase 10 disposable workspace',slug:'phase10-'+crypto.randomUUID(),currency:'XAF',timezone:'UTC'}});
  const role=await db.role.create({data:{organizationId:org.id,code:'admin',nameEn:'Disposable administrator',permissions:['*','purchases.orders.receive']}});
  async function user(tag){const u=await db.user.create({data:{organizationId:org.id,email:tag+'@phase10.example.invalid',firstName:tag,lastName:'Fixture',isActive:true,isVerified:true,emailVerified:true,password:passwordHash,roles:{connect:{id:role.id}}}});await db.account.create({data:{id:crypto.randomUUID(),accountId:u.id,providerId:'credential',userId:u.id,password:passwordHash}});return u}
  const manager=await user('manager'),owner=await user('owner');
  const location=await db.location.create({data:{organizationId:org.id,name:'Phase 10 warehouse',code:'P10',type:'WAREHOUSE',isActive:true,managerId:manager.id}});
  const supplier=await db.supplier.create({data:{organizationId:org.id,name:'Phase 10 supplier'}});
  const item=await db.item.create({data:{organizationId:org.id,sku:crypto.randomUUID(),slug:crypto.randomUUID(),nameEn:'Phase 10 sample',nameFr:'Échantillon Phase 10',imageUrls:[],isActive:true,trackInventory:true,trackBatches:false,trackSerialNumbers:false,trackExpiry:false,costPrice:0,sellingPrice:0}});
  const level=await db.inventoryLevel.create({data:{itemId:item.id,locationId:location.id}});
  const po=await db.purchaseOrder.create({data:{organizationId:org.id,supplierId:supplier.id,locationId:location.id,orderNumber:'P10-RECEIVE',status:'APPROVED',createdById:manager.id,approvedById:owner.id,approvedAt:new Date(),expectedDeliveryDate:new Date(Date.now()-86400000),subtotal:0,total:0,lines:{create:{itemId:item.id,orderedQuantity:1,receivedQuantity:0,unitCost:0,lineTotal:0}}},include:{lines:true}});
  const year=new Date().getUTCFullYear(),start=new Date(Date.UTC(year,0,1)),end=new Date(Date.UTC(year,11,31,23,59,59,999));
  const fiscal=await db.fiscalYear.create({data:{organizationId:org.id,name:'Phase 10 fiscal year',startDate:start,endDate:end,status:'OPEN'}});
  await db.accountingPeriod.create({data:{organizationId:org.id,fiscalYearId:fiscal.id,periodNumber:1,name:'Phase 10 open period',startDate:start,endDate:end,status:'OPEN'}});
  const foreign=await db.organization.create({data:{name:'Foreign disposable workspace',slug:'phase10-foreign-'+crypto.randomUUID(),currency:'XAF'}});
  const foreignLocation=await db.location.create({data:{organizationId:foreign.id,name:'Foreign branch must remain private',code:'F10'}});
  const fixture={organizationId:org.id,managerId:manager.id,ownerId:owner.id,managerEmail:manager.email,ownerEmail:owner.email,roleId:role.id,locationId:location.id,foreignLocationId:foreignLocation.id,itemId:item.id,levelId:level.id,purchaseOrderId:po.id,purchaseOrderLineId:po.lines[0].id,password};
  fs.writeFileSync(path.join(s.work,'fixture-private.json'),JSON.stringify(fixture));
  const {password:omitted,...safe}=fixture;fs.writeFileSync(path.join(__dirname,'fixture.json'),JSON.stringify({...safe,synthetic:true,zeroValueReceipt:true,sourceBusinessCommandsNotYetRun:true},null,2));
  console.log('Synthetic verified users, stockout, approved overdue PO and open accounting period created. No source completion was fabricated.');
 }finally{await db.$disconnect()}
}
main().catch(e=>{console.error(redact(e.message));process.exitCode=1});
