const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {state,environment,redact}=require('./environment.cjs');
const s=state(),log=fs.openSync(path.join(__dirname,'compiler.log'),'w');
// Compile-only diagnostic. The independent production policy gates remain blocked.
const child=spawn(process.execPath,[path.join(s.candidate,'scripts/build-app-safe.js'),'--timeout-ms','1200000'],{cwd:s.candidate,env:environment(s,'production'),windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
child.on('error',e=>{console.error(redact(e.message));process.exitCode=1});
child.on('exit',code=>{fs.writeFileSync(path.join(__dirname,'compiler-result.json'),JSON.stringify({exitCode:code,productionAccess:false,releasePolicyBypassed:false,scope:'Separate compile-only diagnostic; not the npm build or artifact release gate'},null,2));console.log('Compile-only diagnostic exit: '+code);process.exitCode=code??1});
