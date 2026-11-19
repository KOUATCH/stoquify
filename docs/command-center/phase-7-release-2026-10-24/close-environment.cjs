const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{Client}=require('pg');
const {state,redact}=require('./environment.cjs');
async function listening(port){return new Promise(resolve=>{const socket=net.createConnection({host:'127.0.0.1',port});socket.setTimeout(1500);socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false)})})}
async function main(){const s=state();assert.equal(path.dirname(s.cluster),s.work);assert.equal(path.basename(s.cluster),'cluster');assert.equal(await listening(s.appPort),false,'Stop the owned application before closing the database');
 const client=new Client({connectionString:s.url});await client.connect();try{const [identity]=(await client.query("SELECT current_database() AS name,current_setting('data_directory') AS directory")).rows;assert.equal(identity.name,s.database);assert.equal(path.resolve(identity.directory).toLowerCase(),s.cluster.toLowerCase())}finally{await client.end()}
 // The database lifetime helper performs pg_ctl under the same process identity that started it.
 fs.writeFileSync(path.join(s.work,'stop-database'),'stop');
 for(let i=0;i<60&&await listening(s.dbPort);i++)await new Promise(r=>setTimeout(r,500));assert.equal(await listening(s.dbPort),false,'Disposable database still listening');
 const status=execFileSync('C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe',['-D',s.cluster,'status'],{windowsHide:true,encoding:'utf8',stdio:'pipe'});throw Error('Unexpected running cluster: '+status);
}
main().catch(e=>{if(e.status===3){const targetPath=path.join(__dirname,'target-evidence.json'),target=JSON.parse(fs.readFileSync(targetPath));target.stopped=true;target.applicationStopped=true;target.closedAt=new Date().toISOString();target.clusterStatusExitCode=3;fs.writeFileSync(targetPath,JSON.stringify(target,null,2));console.log('Owned application and PostgreSQL cluster stopped; evidence and synthetic files retained.')}else{console.error(redact(e.message));process.exitCode=1}});
