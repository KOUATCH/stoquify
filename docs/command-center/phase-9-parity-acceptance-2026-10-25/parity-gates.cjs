const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {state,environment,root,redact}=require('./environment.cjs');const s=state(),env={...environment(s,'test'),AQSTOQFLOW_FRESH_REPLAY_DATABASE_URL:s.url};
const commands=[
 ['schema-parity','scripts/prisma-fresh-replay-certification.js',['--root',s.candidate,'--mode','fail','--out',path.join(__dirname,'schema-parity.md'),'--json-out',path.join(__dirname,'schema-parity.json')]],
 ['history','scripts/prisma-migration-history-health-check.js',['--mode','fail','--out',path.join(__dirname,'history.md'),'--json-out',path.join(__dirname,'history.json')]],
 ['catalog','scripts/prisma-migration-catalog-gate.js',['--mode','fail','--out',path.join(__dirname,'catalog.json')]],
 ['repeat-deploy',path.join(root,'node_modules/prisma/build/index.js'),['migrate','deploy','--config',path.join(s.work,'prisma.config.ts')]],
];
const results=[];for(const [name,entry,args] of commands){const run=spawnSync(process.execPath,[path.isAbsolute(entry)?entry:path.join(s.candidate,entry),...args],{cwd:s.candidate,env,windowsHide:true,encoding:'utf8',timeout:240000,maxBuffer:20e6});fs.writeFileSync(path.join(__dirname,name+'.log'),redact(run.stdout)+redact(run.stderr));results.push({name,exitCode:run.status,error:run.error?.message});console.log(JSON.stringify(results.at(-1)))}
fs.writeFileSync(path.join(__dirname,'parity-gates.json'),JSON.stringify({results,productionAccess:false,generatedDiffApplied:false},null,2));if(results.some(r=>r.exitCode!==0))process.exitCode=1;
