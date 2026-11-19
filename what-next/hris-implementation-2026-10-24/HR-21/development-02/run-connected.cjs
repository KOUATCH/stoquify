const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const base=__dirname,result=path.join(base,'connected-results.json'),log=process.argv[2]||'connected-final.log',startedAt=new Date().toISOString();
if(fs.existsSync(result))fs.writeFileSync(path.join(base,'connected-prior-'+Date.now()+'.json'),fs.readFileSync(result));
fs.writeFileSync(result,JSON.stringify({status:'STARTING',startedAt}));
try{
 if(process.env.HRIS_CORRECTNESS_DATABASE_URL!=='postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public')throw Error('Owned synthetic database required');
 if(!/^[a-z0-9-]+\.log$/.test(log))throw Error('Bounded log filename required');
 const fd=fs.openSync(path.join(base,log),'w');let run;try{run=spawnSync(process.execPath,['node_modules/jest/bin/jest.js','--config','jest.hris-development-postgres.config.cjs','--runInBand','--no-cache'],{cwd:process.cwd(),env:process.env,stdio:['ignore',fd,fd],windowsHide:true})}finally{fs.closeSync(fd)}
 const state=JSON.parse(fs.readFileSync(result,'utf8'));const passed=run.status===0&&state.status==='CLEANUP_COMPLETE_PENDING_RUNNER_EXIT'&&state.stages?.length===6;
 fs.writeFileSync(result,JSON.stringify({...state,status:passed?'PASS_SCOPED_NATIVE_SERVICES':'FAILED',startedAt,jestExitCode:run.status,completedAt:new Date().toISOString(),log,applicationClock:'Fixed October25 then November1; PostgreSQL clock remains real'},null,2));console.log(passed?'PASS_SCOPED_NATIVE_SERVICES':'FAILED');process.exitCode=passed?0:1;
}catch(e){fs.writeFileSync(result,JSON.stringify({status:'FAILED',startedAt,completedAt:new Date().toISOString(),error:e.message},null,2));console.log(e.message);process.exitCode=1}
