const fs=require('fs');const path=require('path');const {spawnSync}=require('child_process');
const ROOT=path.resolve(__dirname,'../../..');const OUT=path.join(__dirname,'commands');fs.mkdirSync(OUT,{recursive:true});
require('dotenv').config({path:path.join(ROOT,'.env'),quiet:true});
const url=new URL((process.env.DATABASE_URL||'').replace(/\$\{([^}]+)\}/g,(_,k)=>process.env[k]||''));
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Local target required');
url.searchParams.set('options','-c default_transaction_read_only=on');
const checks=[
 ['migration-status',[path.join(ROOT,'node_modules/prisma/build/index.js'),'migrate','status']],
 ['migration-history',['scripts/prisma-migration-history-health-check.js','--mode','fail','--out',path.join(OUT,'migration-history.md'),'--json-out',path.join(OUT,'migration-history.json')]],
 ['migration-catalog',['scripts/prisma-migration-catalog-gate.js','--mode','fail','--out',path.join(OUT,'migration-catalog.json')]],
];
const results=[];
for(const [name,args] of checks){const startedAt=new Date().toISOString();const r=spawnSync(process.execPath,args,{cwd:ROOT,env:{...process.env,DATABASE_URL:url.toString(),PGOPTIONS:'-c default_transaction_read_only=on'},windowsHide:true,encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024});const output=((r.stdout||'')+'\n'+(r.stderr||'')).replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_DATABASE_URL]');fs.writeFileSync(path.join(OUT,name+'.log'),output);const entry={name,command:['node',...args],startedAt,finishedAt:new Date().toISOString(),exitCode:r.status,error:r.error?.code||null,readOnlyConnectionOption:true,log:name+'.log'};results.push(entry);console.log(JSON.stringify({name,exitCode:r.status,error:entry.error}));}
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,2)+'\n');process.exitCode=results.some(r=>r.exitCode!==0)?1:0;
