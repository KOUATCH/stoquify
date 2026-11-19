// Evidence reconciliation only: reads recorded outcomes and writes one new matrix. No app, DB or network execution.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const packet=__dirname,read=p=>JSON.parse(fs.readFileSync(path.join(packet,p),'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length,3,'Provide actual runtime result filename');
const runtimeFile=process.argv[2];assert(/^runtime-result-attempt[0-9]+\.json$/.test(runtimeFile));
const intended=read('inventory/test-case-map.json'),candidate=read('candidate-context-attempt02.json'),build=read('build-result-attempt02.json'),runtime=read(runtimeFile);
assert.equal(build.passed,true);assert.equal(build.candidateId,candidate.candidateId);assert.equal(runtime.candidateId,candidate.candidateId);assert.equal(runtime.artifactSha256,build.artifactSha256);
assert.equal(intended.cases.length,58);assert.equal(new Set(intended.cases.map(c=>c.id)).size,58);
const observed=runtime.auth?.checks??[],ids=observed.map(c=>c.id),extras=ids.filter(id=>!intended.cases.some(c=>c.id===id));
assert.equal(new Set(ids).size,ids.length,'Duplicate observed IDs cannot be reconciled');assert.equal(extras.length,0,'Unknown observed cases require review');
const status=c=>c?(c.passed===true?'passed':'failed'):'not_run';
const rows=intended.cases.map(c=>{const actual=observed.find(x=>x.id===c.id);return{id:c.id,lane:c.lane,title:c.title,status:status(actual),acceptance:c.acceptance,observed:actual??null};});
const inherited=intended.inherited_v02_findings.map(f=>({...f,prior_runtime_status:f.runtime_status,runtime_status:rows.find(r=>r.id===f.r06_case)?.status??'not_run',outcome_pointer:ids.includes(f.r06_case)?runtimeFile+'#/auth/checks/'+ids.indexOf(f.r06_case):null}));
const counts={planned:58,observed:observed.length,passed:rows.filter(x=>x.status==='passed').length,failed:rows.filter(x=>x.status==='failed').length,not_run:rows.filter(x=>x.status==='not_run').length,by_lane:{}};
for(const lane of [...new Set(rows.map(x=>x.lane))]){const r=rows.filter(x=>x.lane===lane);counts.by_lane[lane]={planned:r.length,passed:r.filter(x=>x.status==='passed').length,failed:r.filter(x=>x.status==='failed').length,not_run:r.filter(x=>x.status==='not_run').length};}
const inputs=['inventory/test-case-map.json','candidate-context-attempt02.json','build-result-attempt02.json',runtimeFile].map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(packet,p)))}));
const result={at:new Date().toISOString(),package:'P04-R06',passed:runtime.passed===true&&runtime.auth?.passed===true&&counts.passed===58&&counts.failed===0&&counts.not_run===0,candidateId:candidate.candidateId,artifactSha256:build.artifactSha256,scope:'Observed local qualification evidence; independent acceptance and production remain separate',counts,inherited,checks:rows,inputs,runtimeTopLevelPassed:runtime.passed===true,runtimeError:runtime.error??null,cleanupErrors:runtime.cleanup??[],limits:intended.excluded};
fs.writeFileSync(path.join(packet,'verification-matrix-attempt02.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:result.passed,counts,inheritedPassed:inherited.filter(x=>x.runtime_status==='passed').length}));
