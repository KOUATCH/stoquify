// Restart only the retained isolated cluster. No database creation, seeding or migration.
const {fs,path,assert,root,storage,own,target,hash,receipt,connect,checkMigrations,requireEmpty}=require('./database-common.cjs');
const {snapshot}=require('./fixture-control.cjs');const {spawnSync}=require('node:child_process');const net=require('node:net');
const report={startedAt:new Date().toISOString(),passed:false};let started=false,ownedPid;
async function main(){
 assert.equal(process.argv.length,2);assert.notEqual(process.env.NODE_ENV,'production');
 const packet=path.resolve(__dirname,'..'),admission=JSON.parse(fs.readFileSync(path.join(packet,'independent-review/DATABASE-SUSPEND-RESUME-ADMISSION-attempt02.json')));assert.equal(admission.passed,true);for(const row of admission.files)assert.equal(hash(fs.readFileSync(path.join(packet,row.path))),row.sha256);assert(admission.files.some(row=>row.path==='database/'+path.basename(__filename)));
 const resources=require('../check-resources-attempt02-v2.cjs').collect();fs.writeFileSync(path.join(packet,'resource-database-resume-attempt02.json'),JSON.stringify(resources,null,2)+'\n',{flag:'wx'});assert.equal(resources.passed,true,'Do not restart the cluster before retry capacity is available');
 assert.equal(JSON.parse(fs.readFileSync(path.join(storage,'ownership.json'))).root,root);assert.equal(fs.realpathSync(target.cluster),target.cluster);
 const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'suspend-attempt02.json')));assert.equal(prior.passed,true);assert.equal(prior.clusterStopped,true);
 const ownerPath=path.join(own,'cluster-owner.json'),ownerBytes=fs.readFileSync(ownerPath),owner=JSON.parse(ownerBytes);assert.equal(owner.root,root);assert.equal(owner.cluster,target.cluster);assert.equal(owner.port,target.port);assert.equal(owner.state,'stopped');assert(!fs.existsSync(path.join(target.cluster,'postmaster.pid')));
 await new Promise((ok,no)=>{const server=net.createServer();server.once('error',no);server.listen(target.port,target.host,()=>server.close(ok));});
 const log=path.join(own,'postgres-resume-attempt02.log');assert(!fs.existsSync(log));
 const result=spawnSync(path.join(target.bin,'pg_ctl.exe'),['-D',target.cluster,'-l',log,'-o','-h 127.0.0.1 -p '+target.port,'-w','start'],{windowsHide:true,timeout:30000,encoding:'utf8'});report.startCommand={exitCode:result.status,error:result.error?.message};
 if(fs.existsSync(path.join(target.cluster,'postmaster.pid'))){ownedPid=Number(fs.readFileSync(path.join(target.cluster,'postmaster.pid'),'utf8').split(/\r?\n/)[0]);started=true;}
 assert.equal(result.status,0);assert(ownedPid>0);
 const build=await connect(target.build);try{assert.deepEqual(await checkMigrations(build),prior.buildMigrations);report.buildEmpty=await requireEmpty(build);}finally{await build.end();}
 report.after=await snapshot('resume-attempt02-after');assert.equal(report.after.businessSha256,prior.before.businessSha256);assert.equal(report.after.sessionSha256,prior.before.sessionSha256);assert.equal(report.after.auditSha256,prior.before.auditSha256);assert.equal(report.after.sessionRows.length,0);
 assert.equal(hash(fs.readFileSync(ownerPath)),hash(ownerBytes));fs.writeFileSync(path.join(__dirname,'cluster-owner-before-resume-attempt02.json'),ownerBytes,{flag:'wx'});
 fs.writeFileSync(ownerPath,JSON.stringify({...owner,state:'running',ownedPid,resumedAt:new Date().toISOString()},null,2));
 Object.assign(report,{passed:true,ownedPid,fixtureDigestsUnchanged:true,databaseRowMutations:0,databasesRetained:[target.build,target.full]});
}
main().catch(error=>{report.error=error.stack||error.message;process.exitCode=1;if(started&&fs.existsSync(path.join(target.cluster,'postmaster.pid'))&&Number(fs.readFileSync(path.join(target.cluster,'postmaster.pid'),'utf8').split(/\r?\n/)[0])===ownedPid){const result=spawnSync(path.join(target.bin,'pg_ctl.exe'),['-D',target.cluster,'-m','fast','-w','stop'],{windowsHide:true,timeout:30000,encoding:'utf8'});report.failureCleanup={ownedPid,exitCode:result.status,stopped:!fs.existsSync(path.join(target.cluster,'postmaster.pid'))};}}).finally(()=>{report.finishedAt=new Date().toISOString();receipt('resume-attempt02',report);console.log(JSON.stringify({passed:report.passed,error:report.error,ownedPid:report.ownedPid,fixtureDigestsUnchanged:report.fixtureDigestsUnchanged}));});
