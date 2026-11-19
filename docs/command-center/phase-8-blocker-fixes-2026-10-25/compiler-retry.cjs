const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {state,environment,redact}=require('./environment.cjs');const s=state();
const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'compiler-result.json'))),priorLog=fs.readFileSync(path.join(__dirname,'compiler.log'),'utf8');
if(prior.exitCode!==1||!priorLog.includes('Build timed out: yes')||!priorLog.includes('Orphaned build chains after build: 0'))throw Error('Expected fully stopped timeout attempt');
const log=fs.openSync(path.join(__dirname,'compiler-retry.log'),'w');
// Keep only this owned candidate's partial build/cache. Next reruns all normal checks.
// The existing release policy is still evaluated separately and is not overridden.
const child=spawn(process.execPath,[path.join(s.candidate,'scripts/build-app-safe.js'),'--skip-clean','--timeout-ms','1800000'],{cwd:s.candidate,env:environment(s,'production'),windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
child.on('error',e=>{console.error(redact(e.message));process.exitCode=1});
child.on('exit',code=>{fs.writeFileSync(path.join(__dirname,'compiler-retry-result.json'),JSON.stringify({exitCode:code,productionAccess:false,releaseGateOverridden:false,timeoutMs:1800000,reusedOwnedBuildCache:true,scope:'Separate full compile-only diagnostic; not the npm build or trusted artifact release gate'},null,2));console.log('Compile retry exit: '+code);process.exitCode=code??1});
