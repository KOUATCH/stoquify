const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {state,environment}=require('./environment.cjs');
const s=state(),bin='C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe';
if(path.dirname(s.cluster)!==s.work||path.basename(s.cluster)!=='cluster')throw Error('Unexpected cluster');
execFileSync(bin,['-D',s.cluster,'-l',path.join(s.work,'postgres.log'),'-o','-h 127.0.0.1 -p '+s.dbPort,'-w','start'],{env:environment(s,'test'),windowsHide:true,stdio:'inherit',timeout:60000});
console.log('Owned disposable PostgreSQL started; keeping its process lifetime attached.');
const timer=setInterval(()=>{const marker=path.join(s.work,'stop-database');if(fs.existsSync(marker)){fs.unlinkSync(marker);clearInterval(timer);execFileSync(bin,['-D',s.cluster,'-m','fast','-w','stop'],{windowsHide:true,stdio:'inherit',timeout:60000})}},1000);
