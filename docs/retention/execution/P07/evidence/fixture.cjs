// Writes synthetic identities only to the new P07 database; no ambient target.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PrismaClient}=require('@prisma/client'),argon2=require('argon2');
const target=JSON.parse(fs.readFileSync(path.join(__dirname,'DATABASE_TARGET.json'),'utf8'));
if(target.host!=='localhost'||!/^stoquify_retention_p07_20261017_[a-f0-9]+$/.test(target.database)||target.user!=='retention_fixture')throw Error('Unexpected target');
const db=new PrismaClient({datasources:{db:{url:`postgresql://${target.user}@localhost:${target.port}/${target.database}?schema=public`}}});
async function main(){
  if(fs.existsSync(path.join(__dirname,'BROWSER_FIXTURE.json'))){
    if(process.argv[2]!=='--new')throw Error('Fixture already retained');
    fs.renameSync(path.join(__dirname,'BROWSER_FIXTURE.json'),path.join(__dirname,'BROWSER_FIXTURE.prior-'+Date.now()+'.json'));
  }
  const suffix=crypto.randomBytes(6).toString('hex'),organizationId='p07-org-'+suffix,foreignOrganizationId='p07-foreign-'+suffix;
  for(const id of [organizationId,foreignOrganizationId])await db.organization.create({data:{id,name:'Synthetic P07 setup',slug:id,currency:'XAF',requestedModules:[]}});
  const permissions=['dashboard.read','customers.read','customers.create','purchases.suppliers.read','purchases.suppliers.create','inventory.items.read','inventory.items.create'];
  const actors={};
  const hash=await argon2.hash('Retention-Synthetic-Only-2026!',{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
  for(const kind of ['maker','checker','foreign','denied']){
    const org=kind==='foreign'?foreignOrganizationId:organizationId,id=`p07-${kind}-${suffix}`, email=id+'@retention.invalid';
    const role=await db.role.create({data:{organizationId:org,code:'P07_'+kind,nameEn:'Synthetic '+kind,nameFr:'Test '+kind,permissions:kind==='denied'?['dashboard.read']:permissions}});
    await db.user.create({data:{id,organizationId:org,email,emailVerified:true,isVerified:true,firstName:'Synthetic',lastName:kind,mfaBackupCodes:[],roles:{connect:{id:role.id}}}});
    await db.account.create({data:{userId:id,accountId:id,providerId:'credential',password:hash}});
    actors[kind]={id,email};
  }
  const source=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../../../services/onboarding/__tests__/fixtures/opening-position-source.json'),'utf8'));
  const csv={
    CUSTOMER:`code,name\n${source.counterparties[0].id},Synthetic customer\n`,
    SUPPLIER:`code,name\n${source.counterparties[1].id},Synthetic supplier\n`,
    ITEM:'sku,nameEn,nameFr\n'+source.items.map(item=>`${item.id},Synthetic ${item.unit},Article ${item.unit}`).join('\n')+'\n',
  };
  fs.writeFileSync(path.join(__dirname,'BROWSER_FIXTURE.json'),JSON.stringify({organizationId,foreignOrganizationId,actors,permissions,csv,sourceVersion:source.version,sourceSha256:crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex'),passwordKind:'known synthetic credential; no real customer'},null,2),{flag:'wx'});
  console.log('Synthetic identities and P03 master CSVs prepared');
}
main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>db.$disconnect());
