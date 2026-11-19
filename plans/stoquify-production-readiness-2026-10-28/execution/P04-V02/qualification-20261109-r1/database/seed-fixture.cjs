// SQL fixture writes only to the confirmed fresh full-app DB. No app imports.
const crypto = require('node:crypto');
const argon2 = require('argon2');
const { fs,path,assert,candidate,own,target,hash,receipt,connect,checkMigrations,requireEmpty }=require('./database-common.cjs');
const { organizations,actors,items,modules }=require('./fixture-definition.cjs');
async function main(){
  assert.equal(process.argv.length,2);
  const clones=JSON.parse(fs.readFileSync(path.join(__dirname,'database-clones.json'),'utf8'));assert.equal(clones.passed,true);
  const passwordSource=fs.readFileSync(path.join(candidate,'lib/password.ts'),'utf8');
  assert(/memoryCost:\s*19_456/.test(passwordSource)&&/timeCost:\s*2/.test(passwordSource)&&/parallelism:\s*1/.test(passwordSource),'Reviewed password-hash contract changed');
  const users={};
  for(const [alias,actor] of Object.entries(actors))users[alias]={...actor,password:'P04r02!'+crypto.randomBytes(24).toString('base64url')};
  const privatePath=path.join(own,'browser-fixture.private.json');assert(!fs.existsSync(privatePath),'Fresh private fixture required');
  const fixture={seedState:'prepared',baseURL:'https://localhost:3196',database:target.full,users,
    assets:[],item:{...items[0],editPath:`/dashboard/inventory/items/${items[0].id}/edit`,listPath:'/dashboard/inventory/items'},
    controls:{modulePath:path.join(__dirname,'fixture-control.cjs'),statePath:path.join(own,'control-state.private.json')}};
  fs.mkdirSync(own,{recursive:true});fs.writeFileSync(privatePath,JSON.stringify(fixture,null,2),{flag:'wx'});
  const client=await connect(target.full);let committed=false;
  try{
    assert.deepEqual(await checkMigrations(client),clones.migrations);await requireEmpty(client);
    await client.query('BEGIN');
    for(const organizationId of organizations){
      await client.query('INSERT INTO organizations(id,name,slug,"requestedModules","updatedAt","onboardingCompletedAt") VALUES($1,$2,$1,$3::text[],now(),now())',[organizationId,'Isolated P04-R02 '+organizationId,modules]);
      const admitted=organizationId!==organizations[2];
      await client.query('INSERT INTO tenant_module_configurations("organizationId",revision,"activeRevision","selectedModules","activeModules","manifestHash","updatedAt") VALUES($1,1,1,$2::text[],$2::text[],$3,now())',[organizationId,admitted?modules:[],hash(JSON.stringify(admitted?modules:[]))]);
      if(admitted)for(const moduleSlug of modules)await client.query('INSERT INTO tenant_module_grants(id,"organizationId","moduleSlug",status,source,"updatedAt") VALUES($1,$2,$3,$4,$5,now())',['p04r02-grant-'+organizationId+'-'+moduleSlug,organizationId,moduleSlug,'active','manual_override']);
    }
    for(const actor of Object.values(users)){
      assert(!actor.permissions.some(value=>value.includes('*')));assert(!['admin','administrator','super_admin'].includes(actor.roleCode));
      const passwordHash=await argon2.hash(actor.password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
      await client.query('INSERT INTO roles(id,code,"nameEn",permissions,"organizationId","updatedAt") VALUES($1,$2,$3,$4::text[],$5,now())',[actor.roleId,actor.roleCode,'Qualification '+actor.roleCode,actor.permissions,actor.organizationId]);
      await client.query('INSERT INTO users(id,name,email,"emailVerified","firstName","lastName",password,"isVerified","organizationId","mfaBackupCodes","updatedAt") VALUES($1,$2,$3,true,$4,$5,$6,true,$7,ARRAY[]::text[],now())',[actor.id,'Qualification '+actor.roleCode,actor.email,'Qualification',actor.roleCode,passwordHash,actor.organizationId]);
      await client.query('INSERT INTO "_UserRoles"("A","B") VALUES($1,$2)',[actor.roleId,actor.id]);
      await client.query('INSERT INTO accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$2,$4,now())',['p04r02-account-'+actor.id,actor.id,'credential',passwordHash]);
    }
    for(const [index,item] of items.entries()){
      const managerId=[actors.ui.id,actors.foreign.id,actors.moduleDenied.id][index];
      const location='p04r02-location-'+index;
      await client.query('INSERT INTO locations(id,name,code,"organizationId","managerId","isDefault","updatedAt") VALUES($1,$2,$3,$4,$5,true,now())',[location,'Qualification location '+index,'P04R02-'+index,item.organizationId,managerId]);
      await client.query('INSERT INTO items(id,slug,sku,"nameEn","nameFr","imageUrls",thumbnail,"organizationId","sellingPrice","costPrice","updatedAt") VALUES($1,$1,$2,$3,$4,$5::text[],$6,$7,10,5,now())',[item.id,'P04R02-'+index,item.nameEn,item.nameFr,[item.imageUrl],item.thumbnail,item.organizationId]);
      await client.query('INSERT INTO inventory_levels(id,"itemId","locationId","quantityOnHand","quantityAvailable","averageCost","totalValue","updatedAt") VALUES($1,$2,$3,5,5,5,25,now())',['p04r02-level-'+index,item.id,location]);
    }
    await client.query('INSERT INTO locations(id,name,code,"organizationId","managerId","updatedAt") VALUES($1,$2,$3,$4,$5,now())',['p04r02-location-revocation','Qualification revocation location','P04R02-REVOKE',organizations[0],actors.revocation.id]);
    await client.query('COMMIT');committed=true;
    assert.equal((await client.query('SELECT count(*)::int AS count FROM sessions')).rows[0].count,0,'Sessions must be created by actual auth');
    fixture.seedState='ready';fs.writeFileSync(privatePath,JSON.stringify(fixture,null,2));
    receipt('fixture-seeded',{at:new Date().toISOString(),passed:true,database:target.full,organizations,actors:Object.fromEntries(Object.entries(actors).map(([alias,actor])=>[alias,{id:actor.id,organizationId:actor.organizationId,roleId:actor.roleId,permissions:actor.permissions}])),items,passwordAlgorithm:'Argon2id(memoryCost=19456,timeCost=2,parallelism=1)',passwordSourceSha256:hash(passwordSource),credentialAcquisition:'Actual POST /api/auth/sign-in/email; no preseeded sessions or synthetic cookies',privateFixturePath:privatePath,sessionsInitially:0});
    const context=JSON.parse(fs.readFileSync(path.join(__dirname,'../candidate-context.json'),'utf8')),build=JSON.parse(fs.readFileSync(path.join(__dirname,'../build-result.json'),'utf8'));assert(build.passed);receipt('fixture-readiness',{passed:true,candidateId:context.candidateId,artifactSha256:build.artifactSha256,database:target.full,privateFixturePath:privatePath,sessionsInitially:0});
    console.log(JSON.stringify({seeded:true,database:target.full,actors:Object.keys(actors).length,items:items.length,privateFixturePath:privatePath}));
  }catch(error){if(!committed)await client.query('ROLLBACK');throw error;}finally{await client.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
