// Read-only cluster/storage inspection; never starts a service or connects to a DB.
const {spawnSync}=require('node:child_process');
const net=require('node:net');
const {fs,path,assert,own,target,candidate,receipt}=require('./database-common.cjs');
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>['PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'].includes(key.toUpperCase())));
async function main(){
  assert.equal(process.argv.length,2);
  const ownerFile=path.join(own,'cluster-owner.json');const owner=JSON.parse(fs.readFileSync(ownerFile,'utf8'));
  assert.equal(owner.cluster,target.cluster);assert.equal(owner.port,target.port);assert.equal(owner.exclusiveOwner,'p04_actions');assert.equal(owner.postmasterPid,28112);
  assert.equal(fs.realpathSync(target.cluster).toLowerCase(),path.resolve(target.cluster).toLowerCase());
  assert.equal(fs.readFileSync(path.join(target.cluster,'PG_VERSION'),'utf8').trim(),'17');
  const result=spawnSync(path.join(target.bin,'pg_ctl.exe'),['-D',target.cluster,'status'],{env,windowsHide:true,encoding:'utf8',timeout:10000});if(result.error)throw result.error;
  assert.equal(result.status,3,'Cluster is not confirmed stopped');
  await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(target.port,target.host,()=>probe.close(resolve));});
  const value={at:new Date().toISOString(),inspectionPassed:true,readiness:'blocked',cluster:target.cluster,host:target.host,port:target.port,pgVersion:'17',pgCtlStatus:result.status,statusOutput:result.stdout.trim(),noServerRunning:true,portAvailable:true,staleOwnerPreserved:{exclusiveOwner:owner.exclusiveOwner,state:owner.state,postmasterPid:owner.postmasterPid},candidate,candidateAvailable:fs.existsSync(path.join(candidate,'prisma/schema.prisma')),storageDriveAvailable:fs.existsSync('D:/'),databasesRetained:[target.build,target.full],databaseVerification:'not-run: candidate storage unavailable; no service started, queries, reset, seed or migrations',clusterOwnerMarkerChanged:false};
  assert.equal(value.candidateAvailable,false,'Storage restored: use reviewed readiness runner instead');receipt('resume-20261102-r1-preconditions',value);console.log(JSON.stringify(value));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
