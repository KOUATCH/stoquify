#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const {ROOT,OUT,PRIVATE,candidateUrl,connect,save,binary}=require('./systematic-reseed-local.cjs');
async function main(){
 const candidate=candidateUrl();
 const smoke=new URL(candidate);smoke.pathname='/stoquify_reseed_smoke_local_20260927';
 const dump=path.join(PRIVATE,'candidate-for-smoke.dump');
 const credentials=path.join(PRIVATE,'candidate-verified-credentials.json');
 if(!fs.existsSync(credentials))throw new Error('Verified credential handoff is required.');
 if(fs.existsSync(dump))throw new Error('Smoke recovery point exists; refusing to overwrite it.');
 const adminUrl=new URL(candidate);adminUrl.pathname='/postgres';
 const admin=await connect(adminUrl);
 try{
  if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[smoke.pathname.slice(1)])).rowCount)throw new Error('Smoke database already exists; refusing to replace it.');
  binary('pg_dump',['--format=custom','--no-owner','--no-privileges','--file='+dump],candidate);
  await admin.query('CREATE DATABASE "stoquify_reseed_smoke_local_20260927"');
 }finally{await admin.end();}
 binary('pg_restore',['--exit-on-error','--no-owner','--no-privileges','--dbname='+smoke.pathname.slice(1),dump],smoke);
 console.log('Isolated smoke database restored.');
 const result=spawnSync(process.execPath,['-r','ts-node/register/transpile-only','-r','./scripts/register-server-only-shim.js','-r','tsconfig-paths/register','scripts/verify-realistic-development-seed.ts'],{cwd:ROOT,env:{...process.env,DATABASE_URL:smoke.toString(),NODE_ENV:'test',STOQUIFY_SEED_CREDENTIAL_ARTIFACT:credentials,TS_NODE_COMPILER_OPTIONS:JSON.stringify({module:'CommonJS',moduleResolution:'node'})},windowsHide:true,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});
 fs.writeFileSync(path.join(OUT,'isolated-pos-smoke.log'),((result.stdout||'')+'\n'+(result.stderr||'')).replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_URL]'));
 const report={generatedAt:new Date().toISOString(),database:smoke.pathname.slice(1),candidateUnchangedBySmoke:true,exitCode:result.status,error:result.error?.code||null,log:'isolated-pos-smoke.log'};
 save(path.join(OUT,'isolated-pos-smoke.json'),report);console.log(JSON.stringify(report));
 process.exitCode=result.status===0?0:1;
}
main().catch(e=>{console.error(e.message.replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_URL]'));process.exitCode=1;});
