const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const out=path.dirname(__dirname);
const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
const errors=[];
const required=['REVIEW.md','coverage.json','findings.json','blockers-and-gates.json','ROADMAP.md','USER_ACTIONS.md','WORKFLOW_TRACES.md','checkpoint.json'];
for(const name of required)if(!fs.existsSync(path.join(out,name)))errors.push('Missing '+name);
const coverage=read('coverage.json');
if(coverage.fileCount!==coverage.files.length||new Set(coverage.files.map(f=>f.path)).size!==coverage.fileCount)errors.push('Coverage count/uniqueness mismatch');
if(Object.values(coverage.byArea).reduce((total,area)=>total+area.files,0)!==coverage.fileCount)errors.push('Area count mismatch');
for(const f of read('findings.json').findings){
 for(const ref of f.sourceRefs){const file=path.resolve(ref.path);if(!fs.existsSync(file)||ref.line<1||ref.line>fs.readFileSync(file,'utf8').split(/\r?\n/).length)errors.push('Invalid source '+f.id);}
 for(const ref of f.evidence??[])if(!fs.existsSync(path.join(out,ref)))errors.push('Missing evidence '+f.id+': '+ref);
}
const test=read('evidence/verification-summary.json');
if(test.failed!==0||test.tests!==test.passed)errors.push('Focused tests not fully passing');
const finalBinding=read('evidence/current-finance-verified-source-binding.json');
const finalDrift=Object.entries(finalBinding.after).filter(([p,hash])=>!fs.existsSync(p)||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==hash).map(([p])=>p);
if(finalDrift.length)errors.push('Source changed after final check: '+finalDrift.join(', '));
const manifest=read('evidence/final-change-manifest.json');
manifest.coEditedFiles=read('evidence/concurrency-review.json').coEditedFiles;
manifest.note+=' FinanceCommandCenterDashboard also contains concurrent edits; attributableToThisRun identifies files we touched, not sole authorship of their full baseline diff.';
fs.writeFileSync(path.join(out,'evidence/final-change-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const result={recordedAt:new Date().toISOString(),status:errors.length?'failed':'passed',requiredArtifacts:required.length,firstPartyFiles:coverage.fileCount,findings:read('findings.json').findings.length,focusedTests:test.tests,focusedSuites:test.suites,finalDrift,errors,meaning:'Artifact integrity and evidence consistency only; not release or security certification.'};
fs.writeFileSync(path.join(out,'evidence/artifact-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
