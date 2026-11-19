const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{Client}=require('pg'),{PrismaClient}=require('@prisma/client');
const {state,root,environment,redact}=require('./environment.cjs');
const {withMigrationLock}=require(path.join(root,'scripts/promote-release-schema.cjs'));
const {createNewDatabase}=require(path.join(root,'scripts/prisma-local-fresh-bootstrap.js'));
async function main(){
 const s=state(),url=new URL(s.url);const database=s.database+'_upgrade';url.pathname='/'+database;
 const report={database,productionAccess:false,checks:[]};
 const probe=new Client({connectionString:s.url});await probe.connect();try{const r=(await probe.query("SELECT current_setting('data_directory') AS directory")).rows[0];assert.equal(path.resolve(r.directory).toLowerCase(),s.cluster.toLowerCase())}finally{await probe.end()}
 await createNewDatabase(url,database);
 const folder=path.join(s.work,'upgrade'),schema=path.join(folder,'schema.prisma'),migrations=path.join(folder,'migrations');fs.mkdirSync(migrations,{recursive:true});
 const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'migration-catalog.json'))),last=catalog.at(-1).name;assert.equal(last,'20261024180000_command_center_coordination');
 fs.copyFileSync(path.join(s.candidate,'prisma/schema.prisma'),schema);fs.copyFileSync(path.join(s.candidate,'prisma/migrations/migration_lock.toml'),path.join(migrations,'migration_lock.toml'));
 for(const m of catalog.slice(0,-1))fs.cpSync(path.join(s.candidate,'prisma/migrations',m.name),path.join(migrations,m.name),{recursive:true,errorOnExist:true});
 const config=path.join(folder,'prisma.config.ts');fs.writeFileSync(config,'import {defineConfig} from "prisma/config";export default defineConfig({schema:"./schema.prisma",migrations:{path:"./migrations"}});');
 const env={...environment(s,'test'),DATABASE_URL:url.toString(),DIRECT_URL:url.toString(),SHADOW_DATABASE_URL:url.toString()};
 function deploy(label){const r=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--config',config],{cwd:folder,env,encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:20e6});fs.writeFileSync(path.join(__dirname,label+'.log'),redact(r.stdout)+redact(r.stderr));assert.equal(r.status,0,label)}
 deploy('predecessor-114');
 const db=new PrismaClient({datasources:{db:{url:url.toString()}}});
 try{
  const org=await db.organization.create({data:{name:'Populated predecessor',slug:database,currency:'XAF'}});
  const user=await db.user.create({data:{organizationId:org.id,email:'legacy@phase7-upgrade.example.invalid',firstName:'Legacy',isVerified:true,emailVerified:true}});
  const before=await db.user.findUniqueOrThrow({where:{id:user.id}});
  fs.cpSync(path.join(s.candidate,'prisma/migrations',last),path.join(migrations,last),{recursive:true,errorOnExist:true});
  let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  const held=withMigrationLock(new Client({connectionString:url.toString()}),async()=>{entered();await gate});await ready;
  try{await assert.rejects(withMigrationLock(new Client({connectionString:url.toString()}),async()=>{throw Error('Contender must not execute')}),/already running/)}finally{release();await held}
  await assert.rejects(withMigrationLock(new Client({connectionString:url.toString()}),async()=>{throw Error('Injected failure')}),/Injected failure/);
  await withMigrationLock(new Client({connectionString:url.toString()}),async()=>deploy('populated-upgrade-115'));
  assert.deepEqual(await db.user.findUniqueOrThrow({where:{id:user.id}}),before);report.checks.push('114-to-115 populated upgrade preserves predecessor user bytes');report.checks.push('Actual promotion advisory lock excludes contenders and releases after failure');
  await db.$executeRaw`INSERT INTO command_center_occurrences (id,"organizationId","logicalKey","sourceKey","sourceRefs","scopeKey","windowKey",episode,"sourceRevision",condition) VALUES ('upgrade-occurrence',${org.id},'upgrade-fixture','stockout','[]'::jsonb,'TENANT','CURRENT_STATE',1,'fixture','ACTIVE')`;
  await db.$executeRaw`INSERT INTO command_center_events (id,"organizationId","occurrenceId","actorId",type,"resultRevision",changes) VALUES ('upgrade-event',${org.id},'upgrade-occurrence',${user.id},'OBSERVED',1,'{}'::jsonb)`;
  await db.user.update({where:{id:user.id},data:{firstName:'Legacy after expansion'}});assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).firstName,'Legacy after expansion');
  await assert.rejects(db.$executeRaw`DELETE FROM command_center_events WHERE id='upgrade-event'`,/immutable/);report.checks.push('Old client writes coexist with new coordination rows; retained history rejects deletion');
  const ledger=await db.$queryRaw`SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name`;
  assert.equal(ledger.length,catalog.length);ledger.forEach((row,i)=>{assert.equal(row.checksum,catalog[i].sha256);assert.ok(row.finished_at&&!row.rolled_back_at)});report.checks.push('All 115 upgrade-ledger checksums match the captured catalog');report.passed=true;
 }finally{await db.$disconnect();fs.writeFileSync(path.join(__dirname,'upgrade-results.json'),JSON.stringify(report,null,2))}
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length}));
}
main().catch(e=>{console.error(redact(e.message));process.exitCode=1});
