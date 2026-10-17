const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const {ROOT,OUT,PRIVATE,sourceUrl,candidateUrl,save}=require('./systematic-reseed-local.cjs');
const url=process.argv.includes('--source')?sourceUrl():candidateUrl();
const target=process.argv.includes('--source')?'source':'candidate';
const prefix=path.join(OUT,'checks',target);
fs.mkdirSync(prefix,{recursive:true});
const cli=path.join(ROOT,'node_modules/prisma/build/index.js');
const checks=[
 ['prisma-validate',[cli,'validate']],
 ['prisma-status',[cli,'migrate','status']],
 ['migration-history',['scripts/prisma-migration-history-health-check.js','--mode','fail','--out',path.join(prefix,'migration-history.md'),'--json-out',path.join(prefix,'migration-history.json')]],
 ['migration-catalog',['scripts/prisma-migration-catalog-gate.js','--mode','fail']],
 ['workflow-runtime',['scripts/workflow-assurance-runtime-table-check.js','--mode','fail']],
 ['seed-readonly',['-r','ts-node/register/transpile-only','-r','./scripts/register-server-only-shim.js','-r','tsconfig-paths/register','scripts/verify-realistic-development-seed-readonly.ts']],
];
const results=[];
for(const [name,args] of checks){
 const start=Date.now();
 const r=spawnSync(process.execPath,args,{cwd:ROOT,env:{...process.env,DATABASE_URL:url.toString(),NODE_ENV:'test',STOQUIFY_SEED_CREDENTIAL_ARTIFACT:path.join(PRIVATE,target+'-verified-credentials.json'),TS_NODE_COMPILER_OPTIONS:JSON.stringify({module:'CommonJS',moduleResolution:'node'})},encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024,timeout:180000});
 const output=((r.stdout||'')+'\n'+(r.stderr||'')).replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_DATABASE_URL]');
 fs.writeFileSync(path.join(prefix,name+'.log'),output);
 const result={name,exitCode:r.status,error:r.error?.code||null,elapsedMs:Date.now()-start};results.push(result);console.log(JSON.stringify(result));
}
save(path.join(prefix,'results.json'),results);
process.exitCode=results.some(r=>r.exitCode!==0)?1:0;
