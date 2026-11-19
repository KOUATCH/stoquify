'use strict';
// Apply exactly the reviewed history-marker migration to the retained local test DB.
// Refuses extra pending migrations; never bootstraps, resets, seeds or drops a database.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {Client}=require('pg');
const {ownedTarget,childEnv,redact}=require('./disposable-business-dataset.cjs');
const {validateManifest,buildCatalog}=require('./prisma-migration-catalog-gate.js');
const DB='stoquify_replay_dataset_20261028_01',MIGRATION='20261102190000_payroll_history_proof_version_binding';
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'docs/database-seed/payroll-continuation-2026-11-02');
async function main(){
 if(process.argv.length!==3||process.argv[2]!==DB||process.env.NODE_ENV==='production')throw Error('Exact disposable development target required');
 const target=ownedTarget(DB);if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname))throw Error('Local target required');
 const validation=validateManifest(ROOT);if(validation.status!=='ready')throw Error('Migration catalog is not reviewed/current');
 const catalog=buildCatalog(ROOT);const c=new Client({connectionString:target.toString(),connectionTimeoutMillis:5000});
 const result={generatedAt:new Date().toISOString(),database:DB,migration:MIGRATION,status:'INSPECTING',applicationDatabaseChanged:false};
 fs.mkdirSync(OUT,{recursive:true});const save=()=>fs.writeFileSync(path.join(OUT,'history-guard-deployment.json'),JSON.stringify(result,null,2)+'\n');
 try{
  await c.connect();const id=(await c.query('SELECT current_database() AS database,current_schema() AS schema')).rows[0];
  if(id.database!==DB||id.schema!=='public')throw Error('Database identity mismatch');
  const before=(await c.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
  if(before.some(row=>!row.finished_at||row.rolled_back_at))throw Error('Incomplete or rolled-back migration requires explicit review');
  for(const row of before){const local=catalog.find(x=>x.name===row.migration_name);if(!local||![local.rawSha256,local.canonicalLfSha256,local.canonicalCrlfSha256].includes(row.checksum))throw Error('Historical migration checksum differs');}
  const pending=catalog.filter(x=>!before.some(row=>row.migration_name===x.name)).map(x=>x.name);
  if(pending.some(name=>name!==MIGRATION)||pending.length>1)throw Error('Unreviewed extra pending migration');
  const snapshot=async()=> (await c.query('SELECT (SELECT count(*)::int FROM payroll_runs) AS runs,(SELECT count(*)::int FROM payroll_periods) AS periods')).rows[0];
  result.before={migrations:before.length,...await snapshot()};result.pending=pending;
  const file=path.join(ROOT,'prisma/migrations',MIGRATION,'migration.sql');
  result.sqlSha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');save();
  if(pending.length){
   const run=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{cwd:ROOT,env:{...childEnv(target),RESEND_API_KEY:'',UPLOADTHING_TOKEN:''},encoding:'utf8',timeout:240000,windowsHide:true});
   fs.writeFileSync(path.join(OUT,'history-guard-deployment.log'),redact(run.stdout)+redact(run.stderr));
   result.exitCode=run.status;if(run.error||run.status!==0)throw Error('Owned migration deployment failed');
  }
  const triggers=(await c.query(`SELECT t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND r.relname='payroll_runs' AND t.tgname='payroll_run_history_proof_version_immutable'`)).rows;
  if(triggers.length!==1||triggers[0].tgenabled==='D')throw Error('History-marker trigger is absent or disabled');
  result.after={migrations:Number((await c.query('SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows[0].n),...await snapshot()};
  if(result.before.runs!==result.after.runs||result.before.periods!==result.after.periods)throw Error('Payroll rows changed during guard deployment');
  result.trigger=triggers[0];result.status='APPLIED_TO_OWNED_DISPOSABLE_DATABASE';result.finishedAt=new Date().toISOString();save();
  console.log(JSON.stringify({status:result.status,database:DB,before:result.before,after:result.after}));
 }catch(error){result.status='FAILED_OR_BLOCKED';result.error=redact(error.message);save();throw error;}finally{await c.end();}
}
main().catch(error=>{console.error(redact(error.message));process.exitCode=1;});
