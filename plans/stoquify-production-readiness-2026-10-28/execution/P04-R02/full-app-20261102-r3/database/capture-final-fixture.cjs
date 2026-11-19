// Capture retained synthetic fixture state; do not undo explicit browser test transitions.
const {fs,path,assert,receipt,connect,target}=require('./database-common.cjs');
const {snapshot}=require('./fixture-control.cjs');
const {actors}=require('./fixture-definition.cjs');
assert.equal(process.argv.length,2);
async function main(){
  const readiness=JSON.parse(fs.readFileSync(path.join(__dirname,'resume-20261102-r3-readiness.json'),'utf8'));
  const context=JSON.parse(fs.readFileSync(path.join(__dirname,'../candidate-context.json'),'utf8'));
  assert.equal(readiness.passed,true);assert.equal(readiness.candidateId,context.candidateId);
  const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,readiness.baselineEvidence),'utf8'));
  const current=await snapshot('final-precleanup-20261102-r3');assert.equal(current.tables.length,245);
  assert.deepEqual(current.tables.map(row=>row.table),baseline.tables.map(row=>row.table));
  const changedBusinessTables=current.tables.flatMap((row,index)=>{
    const before=baseline.tables[index];return row.sha256===before.sha256&&row.count===before.count?[]:[{table:row.table,before:{count:before.count,sha256:before.sha256},after:{count:row.count,sha256:row.sha256}}];
  });
  const authority=[];let dashboardGrants;
  const client=await connect(target.full);
  try{
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    for(const [alias,actor] of Object.entries(actors)){
      const role=(await client.query('SELECT id,code,permissions FROM roles WHERE id=$1 AND "organizationId"=$2',[actor.roleId,actor.organizationId])).rows[0];
      assert.equal(role?.code,actor.roleCode);
      authority.push({alias,actorId:actor.id,organizationId:actor.organizationId,roleId:role.id,dashboardRead:role.permissions.includes('dashboard.read'),seededPermissionsMatch:JSON.stringify([...role.permissions].sort())===JSON.stringify([...actor.permissions].sort())});
    }
    dashboardGrants=(await client.query('SELECT "organizationId",status,revision FROM tenant_module_grants WHERE "organizationId"=ANY($1::text[]) AND "moduleSlug"=$2 ORDER BY "organizationId"',[['p04-upload-a','p04-upload-b','p04-upload-disabled'],'dashboard'])).rows;
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
  const sessionsUnchanged=JSON.stringify(current.sessionCounts)===JSON.stringify(baseline.sessionCounts);
  const auditsUnchanged=JSON.stringify(current.auditCounts)===JSON.stringify(baseline.auditCounts);
  const result={at:new Date().toISOString(),passed:true,evidenceClass:'read_only_final_fixture_observation',database:current.database,candidateId:readiness.candidateId,businessSha256:current.businessSha256,businessTables:current.tables.length,businessBaselineUnchanged:current.businessSha256===baseline.businessSha256,changedBusinessTables,sessionCounts:current.sessionCounts,auditCounts:current.auditCounts,authority,dashboardGrants,fixtureReadyForFreshRepeat:changedBusinessTables.length===0&&sessionsUnchanged&&auditsUnchanged,baselineEvidence:readiness.baselineEvidence,finalEvidence:current.evidence,transitionEvidence:fs.readdirSync(__dirname).filter(name=>/^transition-.*\.json$/.test(name)).sort(),requiresOutcomeReconciliation:changedBusinessTables.length>0||!sessionsUnchanged||!auditsUnchanged,limitations:'Observation only. Explicit role/module/expiry/revocation transitions and real sign-in may change fixture rows. Per-denial before/after snapshots establish no-write assertions; this receipt does not certify request behavior or authorize broad fixture reset.',mutations:'None. READ ONLY queries; retained test state is not automatically reverted.'};
  receipt('final-fixture-integrity',result);console.log(JSON.stringify({passed:result.passed,businessBaselineUnchanged:result.businessBaselineUnchanged,changedBusinessTables:changedBusinessTables.map(row=>row.table),sessionCounts:result.sessionCounts,requiresOutcomeReconciliation:result.requiresOutcomeReconciliation,evidence:'final-fixture-integrity.json'}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
