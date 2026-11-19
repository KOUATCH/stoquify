const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{PrismaClient}=require('@prisma/client'),{scratch,sha}=require('./snapshot.cjs');
const base=__dirname,source='postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public',target='stoquify_local_hris_recovery_20261025',targetUrl='postgresql://hris_test@127.0.0.1:55464/'+target+'?schema=public';
const output=path.join(base,'recovery-results.json');
function run(exe,args,file,env=process.env){const fd=fs.openSync(path.join(base,file),'w');try{const r=spawnSync(exe,args,{cwd:process.cwd(),env,stdio:['ignore',fd,fd],windowsHide:true});if(r.status!==0)throw Error(file+' failed; inspect retained log')}finally{fs.closeSync(fd)}}
async function main(){let admin,manifest,created=false,passed=false,cleanupComplete=false,error=null;const started=Date.now();
 if(fs.existsSync(output))fs.writeFileSync(path.join(base,'recovery-prior-'+started+'.json'),fs.readFileSync(output));
 fs.writeFileSync(output,JSON.stringify({status:'IN_PROGRESS',startedAt:new Date().toISOString()}));
 try{
  if(process.env.HRIS_CORRECTNESS_DATABASE_URL!==source)throw Error('Explicit owned source required');
  manifest=JSON.parse(fs.readFileSync(path.join(base,'backup-manifest.json'),'utf8'));const connected=JSON.parse(fs.readFileSync(path.join(base,'connected-results.json'),'utf8'));
  if(connected.status!=='PASS_SCOPED_NATIVE_SERVICES'||connected.runId!==manifest.runId)throw Error('Successful matching connected run required');
  for(const key of ['database','fixture']){const relative=path.relative(path.resolve(scratch),path.resolve(manifest[key]));if(relative.startsWith('..')||path.isAbsolute(relative)||sha(fs.readFileSync(manifest[key]))!==manifest.hashes[key])throw Error('Backup boundary/hash mismatch')}
  fs.writeFileSync(path.join(base,'recovery-test-results.json'),'{}');admin=new PrismaClient({datasources:{db:{url:source}}});
  const existing=await admin.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datname=$1',target);if(existing.length)throw Error('Existing restore target refused; no overwrite or deletion');
  await admin.$executeRawUnsafe('CREATE DATABASE '+target+' TEMPLATE template0');created=true;
  run('C:/Program Files/PostgreSQL/17/bin/pg_restore.exe',['--host=127.0.0.1','--port=55464','--username=hris_test','--dbname='+target,'--no-password','--no-owner','--no-privileges','--exit-on-error',manifest.database],'restore.log');
  run(process.execPath,['node_modules/jest/bin/jest.js','--config','jest.hris-recovery-postgres.config.cjs','--runInBand','--no-cache'],'recovery-tests.log',{...process.env,HRIS_RECOVERY_DATABASE_URL:targetUrl});
  const tests=JSON.parse(fs.readFileSync(path.join(base,'recovery-test-results.json'),'utf8'));if(tests.status!=='TESTS_COMPLETE_PENDING_RUNNER'||tests.stages!==3||tests.runId!==manifest.runId)throw Error('Incomplete recovery evidence');passed=true;
 }catch(e){error=e.message}finally{
  if(created){try{await admin.$executeRawUnsafe('DROP DATABASE '+target);const remaining=await admin.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datname=$1',target);if(remaining.length)throw Error('Restore database cleanup failed');cleanupComplete=true}catch(e){passed=false;error=(error?error+'; ':'')+e.message}}
  if(admin)await admin.$disconnect();fs.writeFileSync(output,JSON.stringify({status:passed&&cleanupComplete?'PASS_SCOPED_SYNTHETIC_RESTORE':'FAILED',runId:manifest?.runId??null,createdTarget:created,target:targetUrl,cleanupComplete,elapsedMs:Date.now()-started,error,limits:['Owned synthetic database/object recovery only','Not customer cumulative upgrade or actual provider disaster recovery','Synthetic account state, not external revocation']},null,2));console.log(passed&&cleanupComplete?'PASS_SCOPED_SYNTHETIC_RESTORE':error);process.exitCode=passed&&cleanupComplete?0:1;
 }
}
main();
