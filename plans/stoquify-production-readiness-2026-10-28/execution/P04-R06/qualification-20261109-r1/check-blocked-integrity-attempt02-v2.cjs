// Read-only final checkpoint integrity. A preservation pass is never qualification approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),net=require('node:net');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex'),read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name)));
const report={startedAt:new Date().toISOString(),passed:false,qualificationPassed:false,buildPassed:false,runtimePassed:false,productionReady:false};
async function main(){
 assert.equal(process.argv.length,2);
 const c=read('candidate-context-attempt02.json'),refresh=read('candidate-refresh-attempt02.json'),expected=read('candidate-source-manifest-attempt02.json').files;
 assert.equal(refresh.passed,true);assert.equal(refresh.candidateId,c.candidateId);assert.equal(expected.length,9788);
 const {capture}=require(path.join(c.source,'scripts/candidate-snapshot.cjs'));
 assert.deepEqual(capture(c.source).files.map(({path,sha256})=>({path,sha256})),expected);
 assert.deepEqual(capture(c.root).files.map(({path,sha256})=>({path,sha256})),expected);
 for(const row of refresh.preservedSource)assert.equal(hash(fs.readFileSync(row.preserved)),row.sha256);
 assert(fs.existsSync(refresh.failedOutput.preserved));assert(!fs.existsSync(refresh.failedOutput.before));
 const failureReview=read('independent-review/RESUME-FAILED-BUILD-REVIEW.json');assert.equal(failureReview.passed,true);for(const row of failureReview.inputs)assert.equal(hash(fs.readFileSync(path.join(__dirname,row.path))),row.sha256,'Historical failure evidence changed: '+row.path);
 const failed=read('build-result.json');assert.equal(failed.passed,false);assert.equal(failed.candidateId,c.predecessorCandidateId);
 assert(!fs.existsSync(path.join(__dirname,'build-result-attempt02.json')),'A build attempt requires its own outcome reconciliation');
 assert(!fs.existsSync(c.artifact));assert(!fs.existsSync(c.runtime));
 const stopped=read('database/suspend-attempt02.json');assert.equal(stopped.passed,true);assert.equal(stopped.clusterStopped,true);assert.equal(stopped.fixturePreserved,true);
 const owner=JSON.parse(fs.readFileSync(path.join(c.storage,'private/cluster-owner.json')));assert.equal(owner.state,'stopped');assert.equal(owner.cluster,path.join(c.storage,'postgres'));assert(!fs.existsSync(path.join(owner.cluster,'postmaster.pid')));
 for(const host of ['127.0.0.1','localhost'])for(const port of [55516,3296,3297,3299])await new Promise((ok,no)=>{const server=net.createServer();server.once('error',no);server.listen(port,host,()=>server.close(ok));});
 const resources=read('resource-resume-20261110-r2.json');assert.equal(resources.passed,false,'Capacity changed: reassess continuation instead of publishing stale blocker');
 const evidence=['candidate-refresh-attempt02.json','candidate-context-attempt02.json','candidate-admission-attempt02.json','candidate-source-manifest-attempt02.json','root-source-manifest-attempt02.json','type-config-input-equivalence-attempt02.json','resource-resume-20261110-r1.json','resource-resume-20261110-r2.json','database/suspend-attempt02.json','build-result.json','artifact-build-result.json','artifact-build.log','private-client.json'];
 Object.assign(report,{passed:true,scope:'Current-source binding, historical preservation and idle owned-cluster checkpoint only',candidateId:c.candidateId,sourceFiles:expected.length,currentRootMatchesCandidate:true,failedAttemptPreserved:true,preservedChangedSourceFiles:refresh.preservedSource.length,clusterStopped:true,taskPortsReleased:[55516,3296,3297,3299],taskPortHostsChecked:['127.0.0.1','localhost'],syntheticFixturesRetained:true,resourceGate:resources.failures,evidence:evidence.map(file=>({path:file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))})),nextAction:'Free host memory, then rerun reviewed resource check with a new exclusive receipt; no build until capacity/source/DB gates pass.'});
}
main().catch(error=>{report.error=error.stack||error.message;process.exitCode=1;}).finally(()=>{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'blocked-integrity-attempt02.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:report.passed,qualificationPassed:false,error:report.error,candidateId:report.candidateId}));});
