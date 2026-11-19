// Fixed reviewed command, retains actual exit; no app or DB operations.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const start=new Date().toISOString();
const run=cp.spawnSync('npm.cmd',['run','agent:workflow:check'],{cwd:path.resolve(__dirname,'../../../../..'),encoding:'utf8',shell:true,windowsHide:true});
fs.writeFileSync(path.join(__dirname,'WORKFLOW.log'),(run.stdout||'')+(run.stderr||''),{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'WORKFLOW.json'),JSON.stringify({command:'npm run agent:workflow:check',start,end:new Date().toISOString(),exitCode:run.status,error:run.error?.message||null},null,2)+'\n',{flag:'wx'});
console.log(run.stdout,run.stderr);process.exitCode=run.status===0?0:1;
