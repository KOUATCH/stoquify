const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const expected='postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public';if(process.env.HRIS_CORRECTNESS_DATABASE_URL!==expected)throw Error('Owned synthetic database required');
const base=__dirname,result=path.join(base,'connected-results.json'),log=process.argv[2]||'connected-final.log';if(!/^[a-z0-9-]+\.log$/.test(log))throw Error('Bounded log filename required');
if(fs.existsSync(result)){const prior=JSON.parse(fs.readFileSync(result,'utf8'));fs.writeFileSync(path.join(base,'connected-prior-'+Date.now()+'.json'),JSON.stringify(prior,null,2))}
fs.writeFileSync(result,JSON.stringify({status:'STARTING',startedAt:new Date().toISOString()}));
const fd=fs.openSync(path.join(base,log),'w');let run;try{run=spawnSync(process.execPath,['node_modules/jest/bin/jest.js','--config','jest.hris-integrated-pilot-postgres.config.cjs','--runInBand','--no-cache'],{cwd:process.cwd(),env:process.env,stdio:['ignore',fd,fd],windowsHide:true})}finally{fs.closeSync(fd)}
const state=JSON.parse(fs.readFileSync(result,'utf8'));const passed=run.status===0&&state.status==='CLEANUP_COMPLETE_PENDING_RUNNER_EXIT'&&state.stages?.length===4;
fs.writeFileSync(result,JSON.stringify({...state,status:passed?'PASS_SCOPED_NATIVE_SERVICES':'FAILED',jestExitCode:run.status,completedAt:new Date().toISOString(),log},null,2));console.log(JSON.stringify({status:passed?'PASS_SCOPED_NATIVE_SERVICES':'FAILED',exitCode:run.status,log}));process.exitCode=passed?0:1;
