const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {state,environment,redact,root}=require('./environment.cjs');
const s=state(),env=environment(s,'test'),results=[];
const commands=[
 ['catalog','scripts/prisma-migration-catalog-gate.js',['--mode','fail','--out',path.join(__dirname,'catalog-gate.json')]],
 ['history','scripts/prisma-migration-history-health-check.js',['--mode','fail','--out',path.join(__dirname,'history-gate.md'),'--json-out',path.join(__dirname,'history-gate.json')]],
 ['migration-risk','scripts/prisma-production-migration-gate.js',['--mode','review','--environment','local','--review-packet-out',path.join(__dirname,'migration-review.md'),'--out',path.join(__dirname,'migration-gate.md'),'--json-out',path.join(__dirname,'migration-gate.json')]],
 ['release-secrets','scripts/release-secret-preflight.js',['--mode','fail','--release','on','--out',path.join(__dirname,'release-secret-gate.md'),'--json-out',path.join(__dirname,'release-secret-gate.json')]],
 ['candidate-lint',path.join(root,'node_modules/eslint/bin/eslint.js'),['app','actions','components','config','hooks','lib','services','--ext','.js,.jsx,.ts,.tsx','--format','json','--output-file',path.join(__dirname,'candidate-eslint.json')]],
];
for(const [name,entry,args] of commands){const run=spawnSync(process.execPath,[path.isAbsolute(entry)?entry:path.join(s.candidate,entry),...args],{cwd:s.candidate,env,windowsHide:true,encoding:'utf8',maxBuffer:20e6,timeout:240000});fs.writeFileSync(path.join(__dirname,name+'.log'),redact(run.stdout)+redact(run.stderr));results.push({name,exitCode:run.status,error:run.error?.message});console.log(JSON.stringify(results.at(-1)))}
fs.writeFileSync(path.join(__dirname,'release-gates.json'),JSON.stringify({productionAccess:false,liveProvidersEnabled:false,results},null,2));
