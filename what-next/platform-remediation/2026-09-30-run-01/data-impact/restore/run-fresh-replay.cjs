const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process')
const {Client}=require('pg'),dotenv=require('dotenv')
const {runFreshReplay}=require('../../../../../scripts/prisma-fresh-replay-runner')
const {createNewDatabase}=require('../../../../../scripts/prisma-local-fresh-bootstrap')
const {assertDisposableDatabaseTarget}=require('../../../../../scripts/disposable-fixture-guard')
for(const file of ['.env.local','.env']) if(fs.existsSync(file)) dotenv.config({path:file,quiet:true})
const databaseName='stoquify_replay_remediation_20260930_run01'
const revision=process.argv[2]||''
if(revision&&!/^\d{2,3}$/.test(revision))throw Error('INVALID_REVISION')
const suffix=revision?'-'+revision:''
const output=path.join(__dirname,'fresh-replay'+suffix+'-execution.json')
if(fs.existsSync(output)) throw Error('EVIDENCE_ALREADY_EXISTS')
const report={startedAt:new Date().toISOString(),databaseName,createdByThisRun:false,sourceDatabaseTouched:false,stages:[]}
async function run(){
  let target
  try{
    const raw=(process.env.DATABASE_URL||'').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,(_,k)=>process.env[k]||'').replace(/^['"]|['"]$/g,'').trim()
    target=new URL(raw);target.pathname='/'+databaseName
    const guarded=assertDisposableDatabaseTarget(target.toString(),[databaseName])
    function spawn(command,args,options,label){
      const result=cp.spawnSync(command,args,{...options,stdio:['ignore','pipe','pipe'],encoding:'utf8',windowsHide:true,shell:false,timeout:300000,maxBuffer:10*1024*1024})
      report.stages.push({label,exitCode:result.status,errorCode:result.error?.code,completedAt:new Date().toISOString()})
      if(result.error||result.status!==0) throw Error('FRESH_REPLAY_STAGE_FAILED')
      return result
    }
    const prefix='what-next/platform-remediation/2026-09-30-run-01/data-impact/restore/fresh-replay'+suffix
    report.result=await runFreshReplay({root:process.cwd(),mode:'create',databaseName,out:prefix+'.md',jsonOut:prefix+'.json'},{
      loadDatabaseUrl:()=>guarded.url,
      resolveTarget:()=>target,
      createNewDatabase:async(url,name)=>{if(name!==databaseName)throw Error('TARGET_MISMATCH');await createNewDatabase(url,name);report.createdByThisRun=true},
      deployMigrations:url=>spawn(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:url.toString(),DIRECT_URL:url.toString()}},'prisma migrate deploy'),
      runner:(command,args,options)=>spawn(command,args,options,'fresh replay certification'),
    })
    report.status='FRESH_MIGRATION_REPLAY_AND_REPEAT_DEPLOY_PASSED'
  }catch(error){report.status='FRESH_REPLAY_BLOCKED';report.errorCode=/^[A-Z0-9_]+$/.test(error.message||'')?error.message:error.code||'STAGE_ERROR';process.exitCode=1}
  finally{
    if(report.createdByThisRun&&target){
      const admin=new URL(target);admin.pathname='/postgres'
      const client=new Client({connectionString:admin.toString()})
      try{await client.connect();await client.query('DROP DATABASE "stoquify_replay_remediation_20260930_run01"');report.databaseRemoved=true}
      catch(error){report.databaseRemoved=false;report.cleanupErrorCode=error.code||'CLEANUP_ERROR'}
      finally{await client.end().catch(()=>{})}
    }
    report.completedAt=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
  }
}
run().catch(error=>{console.log(JSON.stringify({status:'WRAPPER_FAILED',errorCode:error.code||'WRAPPER_ERROR',sourceDatabaseTouched:false}));process.exitCode=1})
