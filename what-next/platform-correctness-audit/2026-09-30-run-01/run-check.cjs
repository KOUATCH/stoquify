const fs=require('fs');const path=require('path');const cp=require('child_process');
const [name,script,...args]=process.argv.slice(2);
if(!/^[a-z0-9-]+$/.test(name||'')||!script)throw Error('Expected log name and Node script');
const startedAt=new Date().toISOString();const target=path.join(__dirname,'verification',name);
const env={...process.env,TS_NODE_TRANSPILE_ONLY:'1'};
// Command checks use no real database. Explicit localhost port 1 fails closed if a mocked test unexpectedly connects.
for(const key of ['DATABASE_URL','DIRECT_URL','DATABASE_URL_UNPOOLED','POSTGRES_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NON_POOLING'])env[key]='postgresql://audit:audit@127.0.0.1:1/audit_disabled?connect_timeout=2';
const child=cp.spawn(process.execPath,[script,...args],{cwd:process.cwd(),env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let stdout='',stderr='',timedOut=false;
child.stdout.on('data',d=>{stdout+=d;});child.stderr.on('data',d=>{stderr+=d;});
const timer=setTimeout(()=>{timedOut=true;child.kill();},420000);
child.on('error',e=>stderr+=e.message);
child.on('close',(code,signal)=>{clearTimeout(timer);const redact=s=>s.replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[REDACTED_DATABASE_URL]');fs.writeFileSync(target+'.stdout.log',redact(stdout));fs.writeFileSync(target+'.stderr.log',redact(stderr));const result={name,command:['node',script,...args],startedAt,endedAt:new Date().toISOString(),code,signal,timedOut,databaseTarget:'disabled localhost:1; no live data target',stdoutBytes:stdout.length,stderrBytes:stderr.length};fs.writeFileSync(target+'.result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));console.log(redact((stdout+'\n'+stderr).slice(-2000)));});
