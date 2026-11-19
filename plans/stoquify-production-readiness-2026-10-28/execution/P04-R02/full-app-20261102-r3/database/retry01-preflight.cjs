// Read-only carry-forward admission after failed runtime; never delete sessions or reset data.
const net=require('node:net');
const {fs,path,assert,root,candidate,own,target,hash,receipt,connect,checkMigrations,schemaFingerprint,requireEmpty}=require('./database-common.cjs');
const {snapshot}=require('./fixture-control.cjs');
const report={at:new Date().toISOString(),passed:false,evidenceClass:'real_isolated_database_read_only_retry_admission',mutations:'None. Existing auth sessions, audit rows and login metadata retained.'};
function bindOwner(){
  const owner=JSON.parse(fs.readFileSync(path.join(own,'cluster-owner.json'),'utf8'));
  assert.equal(owner.exclusiveOwner,'qualification_database_r3');assert.equal(owner.run,'resume-20261102-r3');assert.equal(owner.state,'running');assert.equal(owner.postmasterPid,32788);assert.equal(owner.cluster,target.cluster);assert.equal(owner.port,target.port);
  const lines=fs.readFileSync(path.join(target.cluster,'postmaster.pid'),'utf8').split(/\r?\n/);
  assert.equal(Number(lines[0]),owner.postmasterPid);assert.equal(fs.realpathSync(lines[1]).toLowerCase(),fs.realpathSync(target.cluster).toLowerCase());assert.equal(Number(lines[3]),target.port);
  const started=Number(lines[2])*1000;assert(started>=Date.parse(owner.startedAt)-5000&&started<=Date.now());return owner;
}
async function otherClients(){
  const client=await connect('postgres');try{return(await client.query("SELECT pid,datname AS database,application_name AS application,client_addr::text AS address,usename AS role,state FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid() ORDER BY pid")).rows;}finally{await client.end();}
}
async function main(){
  assert.equal(process.argv.length,2);const owner=bindOwner();report.postmasterPid=owner.postmasterPid;
  const context=JSON.parse(fs.readFileSync(path.join(__dirname,'../candidate-context.json'),'utf8'));
  const admission=JSON.parse(fs.readFileSync(path.join(__dirname,'../candidate-admission.json'),'utf8'));
  const ready=JSON.parse(fs.readFileSync(path.join(__dirname,'fixture-readiness.json'),'utf8'));
  const initial=JSON.parse(fs.readFileSync(path.join(__dirname,'resume-20261102-r3-readiness.json'),'utf8'));
  const runtime=JSON.parse(fs.readFileSync(path.join(__dirname,'../runtime-result.json'),'utf8'));
  assert.equal(path.resolve(context.root),root);assert.equal(path.resolve(context.source),candidate);assert.equal(fs.realpathSync(candidate),candidate);assert.equal(fs.realpathSync(context.storage),path.dirname(candidate));assert.equal(JSON.parse(fs.readFileSync(path.join(context.storage,'ownership.json'),'utf8')).root,root);
  for(const value of [admission,ready,initial]){assert.equal(value.passed,true);assert.equal(value.candidateId,context.candidateId);}
  assert.equal(runtime.candidateId,context.candidateId);assert.equal(runtime.passed,false);assert.equal(runtime.proxyClosed,true);assert.equal(runtime.portsReleased,true);assert.equal(runtime.artifactUnchanged,true);assert.equal(runtime.runtimeIntegrity.allSealedBytesUnchanged,true);assert.equal(runtime.runtimeTermination.exitCode,0);assert.deepEqual(runtime.cleanup,[]);
  assert.equal(fs.readdirSync(__dirname).filter(name=>/^transition-.*\.json$/.test(name)).length,0,'Lifecycle controls already ran; fresh reviewed retry contract required');
  report.candidateId=context.candidateId;report.artifactSha256=runtime.artifactSha256;report.database=target.full;
  report.runtimePortsAvailable=[];for(const port of [3192,3193,3194]){await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(port,target.host,()=>probe.close(resolve));});report.runtimePortsAvailable.push(port);}
  report.clientsBefore=await otherClients();assert.equal(report.clientsBefore.length,0,'Other database clients remain');
  report.databases=[];
  for(const database of [target.template,target.build,target.full]){
    const client=await connect(database);try{await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');const migrations=await checkMigrations(client),schema=await schemaFingerprint(client);const expected=initial.databases.find(row=>row.database===database);assert.deepEqual(migrations,expected.migrations);assert.deepEqual(schema,expected.schema);const empty=database===target.full?undefined:await requireEmpty(client);await client.query('COMMIT');report.databases.push({database,migrations,schema,empty});}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
  }
  const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,initial.baselineEvidence),'utf8'));
  const current=await snapshot('retry01-preflight');report.snapshotEvidence=current.evidence;report.businessSha256=current.businessSha256;report.businessTables=current.tables.length;assert.equal(current.tables.length,245);assert.deepEqual(current.tables.map(row=>row.table),baseline.tables.map(row=>row.table));
  report.changedBusinessTables=current.tables.flatMap((row,index)=>{const before=baseline.tables[index];assert.equal(row.count,before.count,'Business row count changed: '+row.table);return row.sha256===before.sha256?[]:[row.table];});assert(report.changedBusinessTables.every(name=>name==='users'),'Non-login business data changed');
  const client=await connect(target.full);try{
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const rows=(await client.query(`SELECT (CASE WHEN u.id=$1 THEN to_jsonb(u) || jsonb_build_object('lastLogin',NULL,'updatedAt',u."createdAt") ELSE to_jsonb(u) END)::text AS row FROM users u ORDER BY (CASE WHEN u.id=$1 THEN to_jsonb(u) || jsonb_build_object('lastLogin',NULL,'updatedAt',u."createdAt") ELSE to_jsonb(u) END)::text COLLATE "C"`,['p04r02-user-ui'])).rows;
    const reconstructedSha256=hash(rows.map(row=>row.row).join('\n'));assert.equal(reconstructedSha256,baseline.tables.find(row=>row.table==='users').sha256,'Users changed outside lastLogin/updatedAt');
    report.userMetadataProof={baselineSha256:reconstructedSha256,rows:rows.length,allowedActor:'p04r02-user-ui',allowedChangedFields:['lastLogin','updatedAt'],reconstruction:'Only ui: lastLogin=NULL; updatedAt=createdAt. All other user JSON is unchanged. The inspected seed inserts users in one transaction with both timestamps now(). No reconstructed rows are written or logged.'};
    report.loginMetadata=(await client.query('SELECT id,"lastLogin","updatedAt","createdAt",("updatedAt"="createdAt") AS "seedTimestampsUnchanged","failedLoginAttempts","lastFailedLogin","isLocked","lockedUntil" FROM users ORDER BY id')).rows;
    assert(report.loginMetadata.every(row=>row.failedLoginAttempts===0&&!row.isLocked&&row.lockedUntil===null&&row.lastFailedLogin===null),'Unexpected failed-login or lock state');
    const from=Date.parse(runtime.startedAt),to=Date.parse(runtime.finishedAt);assert(Number.isFinite(from)&&Number.isFinite(to)&&from<=to);
    for(const row of report.loginMetadata){if(row.id==='p04r02-user-ui'){for(const value of [row.lastLogin,row.updatedAt]){assert(value&&new Date(value).getTime()>=from&&new Date(value).getTime()<=to,'UI login timestamp outside failed runtime interval');}}else{assert.equal(row.lastLogin,null);assert.equal(row.seedTimestampsUnchanged,true);}}
    const expired=(await client.query('SELECT count(*)::int AS count FROM sessions WHERE "expiresAt"<=now()')).rows[0].count;assert.equal(expired,0,'Retained session expired before retry; inspect explicitly');report.retainedExpiredSessions=expired;
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
  assert(current.sessionCounts.every(row=>row.userId==='p04r02-user-ui'&&row.count===3),'Unexpected session actors/counts');assert.equal(current.sessionCounts.length,1,'Expected successful UI session evidence missing');
  assert.deepEqual(current.auditCounts,[{entityType:'SecurityEvent',action:'LOGIN_SUCCESS',count:3},{entityType:'SecurityEvent',action:'PERMISSION_GRANTED',count:3}],'Unexpected audit activity');
  report.sessionCounts=current.sessionCounts;report.auditCounts=current.auditCounts;report.initialZeroSessionReadinessStillApplies=false;
  report.clientsAfter=await otherClients();assert.equal(report.clientsAfter.length,0,'Other database clients appeared');assert.deepEqual(bindOwner(),owner);
  report.passed=true;report.limitations='Carry-forward fixture admission only; failed first runtime is retained. No denial or browser success inferred. Empty client inventories are observations, not a reservation.';
  receipt('fixture-readiness-retry01',{at:new Date().toISOString(),passed:true,candidateId:context.candidateId,artifactSha256:runtime.artifactSha256,database:target.full,privateFixturePath:ready.privateFixturePath,businessSha256:current.businessSha256,businessTables:current.tables.length,sessions:current.sessionCounts.reduce((n,row)=>n+row.count,0),sessionsInitially:0,retainedSessions:true,authorityUnchanged:true,baselineEvidence:current.evidence,proof:'retry01-preflight.json',limit:report.limitations});
}
main().catch(error=>{report.error=String(error.message).slice(0,1000);process.exitCode=1;}).finally(()=>{report.finishedAt=new Date().toISOString();receipt('retry01-preflight',report);console.log(JSON.stringify({passed:report.passed,candidateId:report.candidateId,changedBusinessTables:report.changedBusinessTables,error:report.error,evidence:'retry01-preflight.json'}));});
