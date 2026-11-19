// Stop only the owned idle qualification cluster while preserving fixtures for a reviewed retry.
const {fs,path,assert,root,storage,own,target,hash,receipt,connect,checkMigrations,requireEmpty}=require('./database-common.cjs');
const {snapshot}=require('./fixture-control.cjs');
const {actors}=require('./fixture-definition.cjs');
const {spawnSync}=require('node:child_process');const net=require('node:net');
const report={startedAt:new Date().toISOString(),passed:false,reason:'Build retry blocked on host resources; no full-app runtime qualification has run'};
async function main(){
 assert.equal(process.argv.length,2);assert.notEqual(process.env.NODE_ENV,'production');
 const packet=path.resolve(__dirname,'..'),admission=JSON.parse(fs.readFileSync(path.join(packet,'independent-review/DATABASE-SUSPEND-RESUME-ADMISSION-attempt02.json')));assert.equal(admission.passed,true);for(const row of admission.files)assert.equal(hash(fs.readFileSync(path.join(packet,row.path))),row.sha256);assert(admission.files.some(row=>row.path==='database/'+path.basename(__filename)));
 assert.equal(JSON.parse(fs.readFileSync(path.join(storage,'ownership.json'))).root,root);
 const ownerPath=path.join(own,'cluster-owner.json'),ownerBytes=fs.readFileSync(ownerPath),owner=JSON.parse(ownerBytes);
 assert.equal(owner.root,root);assert.equal(owner.cluster,target.cluster);assert.equal(owner.port,target.port);assert.equal(owner.state,'running');
 const rows=fs.readFileSync(path.join(target.cluster,'postmaster.pid'),'utf8').split(/\r?\n/);assert.equal(Number(rows[0]),owner.ownedPid);assert.equal(fs.realpathSync(rows[1]),fs.realpathSync(target.cluster));assert.equal(Number(rows[3]),target.port);
 assert(!fs.existsSync(path.join(packet,'runtime-result-attempt01.json'))&&!fs.existsSync(path.join(packet,'runtime-result-attempt02.json')),'Runtime evidence exists: use its reviewed finalization instead');
 const admin=await connect('postgres');try{report.remainingClients=(await admin.query("SELECT pid,datname,application_name,state FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid() ORDER BY pid")).rows;assert.equal(report.remainingClients.length,0,'Preserve other database clients');}finally{await admin.end();}
 const build=await connect(target.build);try{report.buildMigrations=await checkMigrations(build);report.buildEmpty=await requireEmpty(build);}finally{await build.end();}
 const full=await connect(target.full);try{report.fullMigrations=await checkMigrations(full);assert.deepEqual(report.fullMigrations,report.buildMigrations);const actual=(await full.query('SELECT id,email,"organizationId" FROM users ORDER BY id')).rows;const expected=Object.values(actors).map(({id,email,organizationId})=>({id,email,organizationId})).sort((a,b)=>a.id.localeCompare(b.id,'en'));assert.deepEqual(actual,expected);report.actorCount=actual.length;assert.equal((await full.query('SELECT count(*)::int n FROM sessions')).rows[0].n,0,'Preserve unexpected sessions');}finally{await full.end();}
 report.before=await snapshot('suspend-attempt02-before');assert.equal(report.before.sessionRows.length,0);assert.equal(report.before.auditRows.length,0);
 const finalCheck=await connect('postgres');try{const clients=(await finalCheck.query("SELECT pid FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid()")).rows;assert.equal(clients.length,0,'New client appeared; do not stop');}finally{await finalCheck.end();}
 assert.equal(hash(fs.readFileSync(ownerPath)),hash(ownerBytes));assert.equal(Number(fs.readFileSync(path.join(target.cluster,'postmaster.pid'),'utf8').split(/\r?\n/)[0]),owner.ownedPid);
 fs.writeFileSync(path.join(__dirname,'cluster-owner-before-suspend-attempt02.json'),ownerBytes,{flag:'wx'});
 const result=spawnSync(path.join(target.bin,'pg_ctl.exe'),['-D',target.cluster,'-m','fast','-w','stop'],{windowsHide:true,timeout:30000,encoding:'utf8'});
 report.stopCommand={exitCode:result.status,error:result.error?.message};assert.equal(result.status,0);assert(!fs.existsSync(path.join(target.cluster,'postmaster.pid')));
 await new Promise((ok,no)=>{const server=net.createServer();server.once('error',no);server.listen(target.port,target.host,()=>server.close(ok));});
 fs.writeFileSync(ownerPath,JSON.stringify({...owner,state:'stopped',stoppedAt:new Date().toISOString(),reason:report.reason,resumeRecipe:'database/resume-attempt02.cjs'},null,2));
 Object.assign(report,{passed:true,ownedPid:owner.ownedPid,clusterStopped:true,portReleased:true,databasesRetained:[target.build,target.full],sessionRows:0,fixturePreserved:true,databaseRowMutations:0});
}
main().catch(error=>{report.error=error.stack||error.message;process.exitCode=1;}).finally(()=>{report.finishedAt=new Date().toISOString();receipt('suspend-attempt02',report);console.log(JSON.stringify({passed:report.passed,error:report.error,clusterStopped:report.clusterStopped,portReleased:report.portReleased,actorCount:report.actorCount}));});
