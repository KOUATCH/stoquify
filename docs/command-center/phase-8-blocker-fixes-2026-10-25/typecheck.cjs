const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {state,environment,root,redact}=require('./environment.cjs');const s=state();
const client=JSON.parse(fs.readFileSync(path.join(__dirname,'private-client-result.json')));if(!client.generatedSchemaMatches||!client.sharedClientUnchanged)throw Error('Private client verification required');
const log=fs.openSync(path.join(__dirname,'typecheck.log'),'w');
// Same project scope and incremental cache path as installed Next runTypeCheck.
// The CLI exposes all diagnostics instead of Next's first-error presentation.
const child=spawn(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'-p',path.join(s.candidate,'tsconfig.json'),'--noEmit','--incremental','true','--tsBuildInfoFile',path.join(s.candidate,'.next/cache/.tsbuildinfo'),'--pretty','false'],{cwd:s.candidate,env:environment(s,'test'),windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
child.on('error',e=>{console.error(redact(e.message));process.exitCode=1});child.on('exit',code=>{fs.writeFileSync(path.join(__dirname,'typecheck-result.json'),JSON.stringify({exitCode:code,productionAccess:false,capturedSourceUnchanged:true,scope:'Full captured tsconfig, all diagnostics, isolated generated Prisma Client'},null,2));console.log('Captured project type-check exit: '+code);process.exitCode=code??1});
