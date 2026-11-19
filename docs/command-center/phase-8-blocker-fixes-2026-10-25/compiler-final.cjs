const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {state,environment,redact}=require('./environment.cjs');const s=state();
const typecheck=JSON.parse(fs.readFileSync(path.join(__dirname,'typecheck-result.json'))),client=JSON.parse(fs.readFileSync(path.join(__dirname,'private-client-result.json')));
if(typecheck.exitCode!==0||!client.generatedSchemaMatches||!client.sharedClientUnchanged)throw Error('Verified private client and full project type-check required');
const log=fs.openSync(path.join(__dirname,'compiler-final.log'),'w');
const child=spawn(process.execPath,[path.join(s.candidate,'scripts/build-app-safe.js'),'--skip-clean','--timeout-ms','1800000'],{cwd:s.candidate,env:environment(s,'production'),windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
child.on('error',e=>{console.error(redact(e.message));process.exitCode=1});child.on('exit',code=>{fs.writeFileSync(path.join(__dirname,'compiler-final-result.json'),JSON.stringify({exitCode:code,productionAccess:false,releaseGateOverridden:false,timeoutMs:1800000,privateGeneratedClient:true,scope:'Full captured build diagnostic, normal checks enabled; not a trusted release artifact or production approval'},null,2));console.log('Final captured build exit: '+code);process.exitCode=code??1});
