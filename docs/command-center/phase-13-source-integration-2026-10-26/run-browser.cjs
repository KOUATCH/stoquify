const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {state,environment}=require('./environment.cjs'),s=state();
const fd=fs.openSync(path.join(__dirname,'browser.log'),'w'),start=Date.now();
const run=spawnSync(process.execPath,[path.join(__dirname,'browser.cjs')],{cwd:s.candidate,env:environment(),windowsHide:true,stdio:['ignore',fd,fd],timeout:600000});fs.closeSync(fd);
const result={exitCode:run.status,error:run.error?.message,elapsedMs:Date.now()-start};fs.writeFileSync(path.join(__dirname,'browser-command.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=run.status??1;
