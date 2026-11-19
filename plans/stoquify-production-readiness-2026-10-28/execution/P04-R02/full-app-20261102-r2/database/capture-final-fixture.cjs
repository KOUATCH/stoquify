// Final read-only retained-fixture comparison before owned-cluster cleanup.
const {fs,path,assert,receipt}=require('./database-common.cjs');
const {snapshot}=require('./fixture-control.cjs');
assert.equal(process.argv.length,2);
async function main(){
  const readiness=JSON.parse(fs.readFileSync(path.join(__dirname,'resume-20261102-r2-retry01-readiness.json'),'utf8'));
  assert.equal(readiness.passed,true);
  const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,readiness.baselineEvidence),'utf8'));
  const current=await snapshot('final-precleanup-20261102-r2');
  assert.equal(current.businessSha256,baseline.businessSha256);
  assert.equal(current.tables.length,245);
  assert.deepEqual(current.sessionCounts,baseline.sessionCounts);
  assert.deepEqual(current.auditCounts,baseline.auditCounts);
  const result={at:new Date().toISOString(),passed:true,database:current.database,candidateId:readiness.candidateId,businessSha256:current.businessSha256,businessTables:current.tables.length,sessionCounts:current.sessionCounts,auditCounts:current.auditCounts,baselineEvidence:readiness.baselineEvidence,finalEvidence:current.evidence,limitations:'Retained synthetic fixture unchanged; application/browser qualification did not run. This does not establish denied-request behavior.',mutations:'None. Repeatable-read READ ONLY queries; digest/count evidence only.'};
  receipt('final-fixture-integrity',result);console.log(JSON.stringify(result));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
