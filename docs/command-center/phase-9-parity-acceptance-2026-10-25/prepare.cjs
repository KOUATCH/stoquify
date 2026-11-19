const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net'),assert=require('node:assert/strict');
const {spawnSync,execFileSync}=require('node:child_process'),{Client}=require('pg');
const {root,pointer,environment,redact}=require('./environment.cjs'),previous=require('../phase-8-blocker-fixes-2026-10-25/environment.cjs');
const {capture,restore}=require(path.join(root,'scripts/candidate-snapshot.cjs'));
async function main(){
 assert.ok(!fs.existsSync(pointer));const old=previous.state();assert.equal(old.cluster,path.join(old.work,'cluster-retry'));
 const bin='C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe';assert.equal(spawnSync(bin,['-D',old.cluster,'status'],{windowsHide:true,stdio:'ignore'}).status,3,'Owned cluster must be stopped');
 const suffix=crypto.randomBytes(5).toString('hex'),work=path.join(root,'.codex-tmp/phase9-'+suffix),candidate=path.join(work,'candidate');fs.mkdirSync(work);
 console.log('Capturing current source, excluding application environment and generated output');const snapshot=capture(root);restore(snapshot,candidate);fs.writeFileSync(path.join(__dirname,'source-baseline.json'),JSON.stringify({head:snapshot.head,files:snapshot.files.map(({content,...f})=>f)},null,2));
 fs.symlinkSync(path.join(root,'node_modules'),path.join(candidate,'node_modules'),'junction');
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const appPort=socket.address().port;await new Promise(r=>socket.close(r));
 const database='stoquify_replay_command_center_phase9_'+suffix,url=new URL(old.url);url.pathname='/'+database;
 const s={work,candidate,database,cluster:old.cluster,dbPort:old.dbPort,appPort,origin:'http://127.0.0.1:'+appPort,url:url.toString(),secrets:Object.fromEntries(Object.keys(old.secrets).map(k=>[k,crypto.randomBytes(32).toString('hex')]))};
 const env=environment(s,'test');execFileSync(bin,['-D',s.cluster,'-l',path.join(work,'postgres.log'),'-o','-h 127.0.0.1 -p '+s.dbPort,'-w','start'],{env,windowsHide:true,stdio:'ignore',timeout:60000});
 try{
 const adminUrl=new URL(s.url);adminUrl.pathname='/postgres';const admin=new Client({connectionString:adminUrl.toString()});await admin.connect();try{const row=(await admin.query("SELECT current_setting('data_directory') AS directory,host(inet_server_addr()) AS address")).rows[0];assert.equal(path.resolve(row.directory).toLowerCase(),s.cluster.toLowerCase());assert.equal(row.address,'127.0.0.1');await admin.query('CREATE DATABASE "'+database+'"')}finally{await admin.end()}
 fs.writeFileSync(path.join(work,'prisma.config.ts'),'import {defineConfig} from "prisma/config";export default defineConfig({schema:"./candidate/prisma/schema.prisma",migrations:{path:"./candidate/prisma/migrations"}});');
 fs.writeFileSync(path.join(work,'private.json'),JSON.stringify({url:s.url,secrets:s.secrets}));const {url:privateUrl,secrets,...publicState}=s;fs.writeFileSync(pointer,JSON.stringify(publicState,null,2));
 const run=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--config',path.join(work,'prisma.config.ts')],{cwd:work,env,windowsHide:true,encoding:'utf8',timeout:240000,maxBuffer:20e6});fs.writeFileSync(path.join(__dirname,'migration-deploy.log'),redact(run.stdout)+redact(run.stderr));
 fs.writeFileSync(path.join(__dirname,'target-evidence.json'),JSON.stringify({...publicState,migrationExitCode:run.status,sourceFiles:snapshot.files.length,productionAccess:false,applicationEnvironmentRead:false,clusterIdentityVerified:true,stopped:false},null,2));assert.equal(run.status,0);console.log(JSON.stringify({database,origin:s.origin,migrationExitCode:run.status,sourceFiles:snapshot.files.length}));
 }catch(e){execFileSync(bin,['-D',s.cluster,'-m','fast','-w','stop'],{env,windowsHide:true,stdio:'ignore',timeout:60000});throw e}
}
main().catch(e=>{console.error(redact(e.message));process.exitCode=1});
