// Read-only reuse admission for the completed synthetic r3 fixture; never resets prior data.
const {fs,path,assert,own,target,connect}=require('./database-common-r3.cjs');
const {snapshot}=require('./fixture-control-r3.cjs');
async function verifyFollowupReadiness(){
 const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'../runtime-result-attempt03.json')));assert.equal(prior.portsReleased,true);assert.equal(prior.artifactUnchanged,true);assert.deepEqual(prior.cleanup,[]);
 const fixture=JSON.parse(fs.readFileSync(path.join(own,'auth-transport-fixture.private.json')));assert.equal(fixture.state,'ready');assert.equal(fixture.database,target.full);assert.equal(Object.keys(fixture.users).length,10);
 const before=await snapshot('followup04-readiness-before'),c=await connect(target.full),actors=[];try{await c.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');assert.equal((await c.query('SELECT count(*)::int n FROM sessions')).rows[0].n,0,'Fresh sessions required after prior auth cleanup');
 for(const [alias,expected] of Object.entries(fixture.users)){
  const row=(await c.query('SELECT id,email,"organizationId","isActive","isLocked","emailVerified" FROM users WHERE id=$1',[expected.id])).rows[0];assert.equal(row.id,expected.id);assert.equal(row.email,expected.email);assert.equal(row.organizationId,expected.organizationId);assert.equal(row.isActive,true);assert.equal(row.isLocked,false);assert.equal(row.emailVerified,true);
  const role=(await c.query('SELECT r.id,r."organizationId",r.permissions FROM roles r JOIN "_UserRoles" ur ON ur."A"=r.id WHERE ur."B"=$1',[row.id])).rows;assert.equal(role.length,1);assert.equal(role[0].id,expected.roleId);assert.equal(role[0].organizationId,expected.organizationId);assert.deepEqual([...role[0].permissions].sort(),[...expected.permissions].sort(),'Fixture permission restoration required');
  const org=(await c.query('SELECT "isActive","deletedAt" FROM organizations WHERE id=$1',[row.organizationId])).rows[0];assert.equal(org.isActive,true);assert.equal(org.deletedAt,null);const grants=(await c.query('SELECT "moduleSlug",status FROM tenant_module_grants WHERE "organizationId"=$1',[row.organizationId])).rows;for(const moduleSlug of ['inventory','dashboard','settings'])assert.equal(grants.find(g=>g.moduleSlug===moduleSlug)?.status,'active','Fixture module restoration required');assert.equal((await c.query('SELECT count(*)::int n FROM accounts WHERE "userId"=$1 AND "providerId"=$2',[row.id,'credential'])).rows[0].n,1);actors.push({alias,id:row.id,organizationId:row.organizationId,roleId:role[0].id,permissionsRestored:true,grantsActive:true});
 }
 await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
 const after=await snapshot('followup04-readiness-after');for(const key of ['businessSha256','sessionSha256','auditSha256'])assert.equal(after[key],before[key]);return{passed:true,database:target.full,actors,sessionsInitially:0,before,after,fixtureReset:false};
}
module.exports={verifyFollowupReadiness};
