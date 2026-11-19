const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{PrismaClient}=require('@prisma/client'),argon2=require('argon2')
const target=JSON.parse(fs.readFileSync(path.join(__dirname,'DATABASE_TARGET.json'),'utf8'))
if(target.host!=='localhost'||target.user!=='retention_fixture'||!/^stoquify_pos_audit_20261018_[a-f0-9]+$/.test(target.database))throw Error('Invalid P08 target')
const db=new PrismaClient({datasources:{db:{url:`postgresql://retention_fixture@localhost:${target.port}/${target.database}?schema=public`}}})
async function main(){
 const output=path.join(__dirname,'MANAGER_FIXTURE.json');if(fs.existsSync(output))throw Error('Preserve fixture')
 const suffix=crypto.randomBytes(6).toString('hex'),organizationId='p08-manager-'+suffix,locationId='p08-location-'+suffix,actors={}
 await db.organization.create({data:{id:organizationId,name:'Synthetic P08 manager shop',slug:organizationId,currency:'XAF',requestedModules:[]}})
 await db.location.create({data:{id:locationId,organizationId,name:'Synthetic main shop',code:suffix,type:'STORE'}})
 const password=await argon2.hash('Retention-Synthetic-Only-2026!',{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1})
 for(const kind of ['manager','denied']){
   const id='p08-'+kind+'-'+suffix,email=id+'@retention.invalid',permissions=kind==='manager'?['dashboard.read','inventory.read','inventory.items.read','inventory.levels.read','locations.read']:['pos.read']
   const role=await db.role.create({data:{organizationId,code:kind==='manager'?'manager':'P08_DENIED',nameEn:'Synthetic '+kind,permissions}})
   await db.user.create({data:{id,organizationId,email,emailVerified:true,isVerified:true,firstName:'Synthetic',lastName:kind,mfaBackupCodes:[],roles:{connect:{id:role.id}}}})
   await db.account.create({data:{userId:id,accountId:id,providerId:'credential',password}})
   actors[kind]={id,email,permissions}
 }
 // A source-level stockout discrepancy, not a fabricated business signal.
 const itemId='p08-item-'+suffix
 await db.item.create({data:{id:itemId,organizationId,slug:itemId,sku:'P08-STOCKOUT',nameEn:'P08 stockout source',nameFr:'Source de rupture P08',imageUrls:[],trackInventory:true,sellingPrice:10,costPrice:4}})
 await db.inventoryLevel.create({data:{itemId,locationId,quantityOnHand:0,quantityAvailable:0,quantityReserved:0,averageCost:4,totalValue:0}})
 fs.writeFileSync(output,JSON.stringify({organizationId,locationId,itemId,actors,database:target.database,scope:'Synthetic tenant-wide manager, no multi-location grant claim'},null,2))
 console.log('Synthetic manager and denied actor created')
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect())
