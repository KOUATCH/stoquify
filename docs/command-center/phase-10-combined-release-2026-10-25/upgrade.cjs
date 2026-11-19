const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{Client}=require('pg'),{PrismaClient}=require(path.join(require('./environment.cjs').state().work,'private-dependencies/node_modules/@prisma/client'));
const {state,root,environment,redact}=require('./environment.cjs');
const {withMigrationLock}=require(path.join(root,'scripts/promote-release-schema.cjs'));
const {createNewDatabase}=require(path.join(root,'scripts/prisma-local-fresh-bootstrap.js'));
async function main(){
 const s=state(),url=new URL(s.url),database=s.database+'_upgrade';url.pathname='/'+database;
 assert.equal(url.hostname,'127.0.0.1');
 const report={database,productionAccess:false,checks:[],scope:'118-to-120 upgrade with synthetic user and Command Center history; not all older populated domain transitions'};
 const probe=new Client({connectionString:s.url});await probe.connect();try{const r=(await probe.query("SELECT current_database() AS name,current_setting('data_directory') AS directory")).rows[0];assert.equal(r.name,s.database);assert.equal(path.resolve(r.directory).toLowerCase(),s.cluster.toLowerCase())}finally{await probe.end()}
 const catalog=JSON.parse(fs.readFileSync(path.join(s.candidate,'prisma/migration-catalog-manifest.json'))).migrations.map(m=>({name:m.name,sha256:m.rawSha256})),prior=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest-before.json'))).migrations.map(m=>({name:m.name,sha256:m.rawSha256}));
 assert.equal(prior.length,118);assert.equal(catalog.length,120);for(const old of prior)assert.deepEqual(catalog.find(m=>m.name===old.name),old);
 await createNewDatabase(url,database);
 const folder=path.join(s.work,'upgrade'),migrations=path.join(folder,'migrations');fs.mkdirSync(migrations,{recursive:true});
 fs.copyFileSync(path.join(s.candidate,'prisma/schema.prisma'),path.join(folder,'schema.prisma'));fs.copyFileSync(path.join(s.candidate,'prisma/migrations/migration_lock.toml'),path.join(migrations,'migration_lock.toml'));
 for(const m of prior)fs.cpSync(path.join(s.candidate,'prisma/migrations',m.name),path.join(migrations,m.name),{recursive:true,errorOnExist:true});
 const config=path.join(folder,'prisma.config.ts');fs.writeFileSync(config,'import {defineConfig} from "prisma/config";export default defineConfig({schema:"./schema.prisma",migrations:{path:"./migrations"}});');
 const env={...environment(s,'test'),DATABASE_URL:url.toString(),DIRECT_URL:url.toString(),SHADOW_DATABASE_URL:url.toString()};
 function deploy(label){const r=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--config',config],{cwd:folder,env,encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:20e6});fs.writeFileSync(path.join(__dirname,label+'.log'),redact(r.stdout)+redact(r.stderr));assert.equal(r.status,0,label)}
 deploy('predecessor-118');
 const db=new PrismaClient({datasources:{db:{url:url.toString()}}});
 try{
  const org=await db.organization.create({data:{name:'Phase 10 predecessor',slug:database,currency:'XAF'}});
  const user=await db.user.create({data:{organizationId:org.id,email:'legacy@phase10-upgrade.example.invalid',firstName:'Legacy',isVerified:true,emailVerified:true}});
  await db.$executeRaw`INSERT INTO command_center_occurrences (id,"organizationId","logicalKey","sourceKey","sourceRefs","scopeKey","windowKey",episode,"sourceRevision",condition) VALUES ('upgrade-occurrence',${org.id},'upgrade-fixture','stockout','[]'::jsonb,'TENANT','CURRENT_STATE',1,'fixture','ACTIVE')`;
  await db.$executeRaw`INSERT INTO command_center_events (id,"organizationId","occurrenceId","actorId",type,"resultRevision",changes) VALUES ('upgrade-event',${org.id},'upgrade-occurrence',${user.id},'OBSERVED',1,'{}'::jsonb)`;
  async function preserved(){return {user:await db.user.findUniqueOrThrow({where:{id:user.id}}),occurrences:await db.$queryRaw`SELECT row_to_json(t)::text AS row FROM command_center_occurrences t ORDER BY id`,events:await db.$queryRaw`SELECT row_to_json(t)::text AS row FROM command_center_events t ORDER BY id`}}
  const before=await preserved();
  for(const m of catalog.filter(m=>!prior.some(old=>old.name===m.name)))fs.cpSync(path.join(s.candidate,'prisma/migrations',m.name),path.join(migrations,m.name),{recursive:true,errorOnExist:true});
  let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  const held=withMigrationLock(new Client({connectionString:url.toString()}),async()=>{entered();await gate});await ready;
  try{await assert.rejects(withMigrationLock(new Client({connectionString:url.toString()}),async()=>{throw Error('Contender must not execute')}),/already running/)}finally{release();await held}
  await assert.rejects(withMigrationLock(new Client({connectionString:url.toString()}),async()=>{throw Error('Injected failure')}),/Injected failure/);
  await withMigrationLock(new Client({connectionString:url.toString()}),async()=>deploy('populated-upgrade-120'));
  assert.deepEqual(await preserved(),before);report.checks.push('118-to-120 populated upgrade preserves user, occurrence and immutable event bytes');report.checks.push('Promotion advisory lock excludes contenders and releases after failure');
  await db.user.update({where:{id:user.id},data:{firstName:'Legacy after expansion'}});assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).firstName,'Legacy after expansion');
  await assert.rejects(db.$executeRaw`DELETE FROM command_center_events WHERE id='upgrade-event'`,/immutable/);report.checks.push('Existing client writes coexist with retained coordination history; deletion still rejected');
  assert.deepEqual(await db.firmPracticeRevision.findMany(),[]);report.checks.push('Latest generated client reads the newly migrated FirmPracticeRevision table');
  const ledger=await db.$queryRaw`SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name`;
  assert.equal(ledger.length,catalog.length);ledger.forEach((row,i)=>{assert.equal(row.migration_name,catalog[i].name);assert.equal(row.checksum,catalog[i].sha256);assert.ok(row.finished_at&&!row.rolled_back_at)});report.checks.push('All 120 upgrade ledger names and hashes match the captured catalog');report.passed=true;
 }finally{await db.$disconnect();fs.writeFileSync(path.join(__dirname,'upgrade-results.json'),JSON.stringify(report,null,2))}
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length}));
}
main().catch(e=>{console.error(redact(e.message));process.exitCode=1});
