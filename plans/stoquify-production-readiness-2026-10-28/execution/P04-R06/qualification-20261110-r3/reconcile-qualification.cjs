// Read frozen local outcome files and write one successor coverage receipt. No app/DB/network execution.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const packet=__dirname;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const local=relative=>{const full=path.resolve(packet,relative);assert(full.startsWith(packet+path.sep));return full;};
const read=relative=>JSON.parse(fs.readFileSync(local(relative),'utf8'));
const original=read('inventory/test-case-map-original.json'),contract=read('runtime/qualification-contract.json');
const runtimeBytes=fs.readFileSync(local('runtime-result.json')),runtime=JSON.parse(runtimeBytes),runtimeHash=hash(runtimeBytes);
assert.equal(typeof runtime.candidateId,'string');assert(runtime.candidateId.length>0);assert.match(runtime.artifactSha256,/^[a-f0-9]{64}$/);
assert.deepEqual(contract.originalRequirements.slice().sort(),original.cases.map(c=>c.id).sort());
for(const report of [runtime.protectedCore,runtime.expanded,runtime.expanded?.expiry,runtime.expanded?.browserDiagnostic]){assert(report);assert.equal(report.candidateId,runtime.candidateId);assert.equal(report.artifactSha256,runtime.artifactSha256);}
assert.equal(original.cases.length,58);assert.equal(contract.protectedCore.requirements.length,50);
assert.equal(contract.mandatoryProofs.length,57);
const key=p=>JSON.stringify([p.receipt,p.arrayPath,p.caseId]);
assert.equal(new Set(contract.mandatoryProofs.map(key)).size,57);
const expectedPaths={core:['protectedCore','checks'],expanded:['expanded','checks'],expiry:['expanded','expiry','checks'],browser:['expanded','browserDiagnostic','checks']};
const aux=contract.mandatoryProofs;
for(const p of aux)assert.equal(p.receipt,'runtime-result.json');
const credential=aux.filter(p=>p.caseId.startsWith('R06-C-login-'));
const origin=aux.filter(p=>p.caseId.startsWith('R06-C-origin-'));
const infrastructure=aux.filter(p=>p.caseId.startsWith('R06-I-'));
const expiry=aux.filter(p=>p.caseId.startsWith('R06-E-retained-'));
const browser=aux.filter(p=>JSON.stringify(p.arrayPath)===JSON.stringify(expectedPaths.browser));
assert.equal(credential.length,10);assert.equal(origin.length,24);assert.equal(infrastructure.length,2);assert.equal(expiry.length,3);assert.equal(browser.length,18);
assert.deepEqual(origin.map(p=>p.caseId).sort(),contract.originCaseIds.slice().sort());
assert.deepEqual(browser.map(p=>p.caseId).sort(),contract.browserCaseIds.slice().sort());
assert.deepEqual(credential.map(p=>p.caseId).sort(),contract.credentialCases.map(c=>'R06-C-login-'+c[0]).sort());
assert.deepEqual(infrastructure.map(p=>p.caseId).sort(),['R06-I-database-unavailable','R06-I-normal-configuration-recovery']);
assert.deepEqual(expiry.map(p=>p.caseId).sort(),contract.retainedExpirySupplement.map(id=>'R06-E-retained-'+id).sort());
for(const p of [...credential,...origin,...infrastructure])assert.deepEqual(p.arrayPath,expectedPaths.expanded);
for(const p of expiry)assert.deepEqual(p.arrayPath,expectedPaths.expiry);
const core=contract.protectedCore.requirements.map(caseId=>({receipt:'runtime-result.json',arrayPath:expectedPaths.core,caseId}));
const all=[...core,...aux];assert.equal(new Set(all.map(key)).size,107);
function arrayAt(keys){let value=runtime;for(const part of keys){assert.equal(typeof part,'string');assert(!['__proto__','prototype','constructor'].includes(part));value=value[part];}assert(Array.isArray(value));return value;}
for(const keys of Object.values(expectedPaths)){
 const expected=all.filter(p=>JSON.stringify(p.arrayPath)===JSON.stringify(keys)).map(p=>p.caseId).sort();
 const actual=arrayAt(keys).map(row=>row.id).sort();assert.deepEqual(actual,expected,'Actual case set differs from admitted contract: '+keys.join('.'));
}
const attach=p=>({...p,sha256:runtimeHash});
const passed=p=>{const matches=arrayAt(p.arrayPath).filter(row=>row.id===p.caseId);assert.equal(matches.length,1);return matches[0].passed===true;};
const requirements=original.cases.map(({id})=>{
 let proofs=core.filter(p=>p.caseId===id);
 if(id===contract.credentialRequirement)proofs=credential;
 if(id===contract.originRequirement)proofs=origin;
 if(contract.browser.requirements.includes(id))proofs=browser.filter(p=>p.caseId===id);
 assert(proofs.length>0,'Unmapped logical requirement: '+id);
 return{id,passed:proofs.every(passed),proofs:proofs.map(attach)};
});
const result={at:new Date().toISOString(),candidateId:runtime.candidateId,artifactSha256:runtime.artifactSha256,passed:runtime.passed===true&&requirements.every(r=>r.passed)&&aux.every(passed),runtimePassed:runtime.passed===true,runtimeSha256:runtimeHash,contractSha256:hash(fs.readFileSync(local('runtime/qualification-contract.json'))),requiredLogicalGroups:58,passedLogicalGroups:requirements.filter(r=>r.passed).length,totalActualCases:107,passedActualCases:all.filter(passed).length,requirements,auxiliaryProofs:aux.map(attach),limitations:['Local repaired candidate only; historical failed observations preserved.','Connection failure/recovery does not prove an after-hook session-creation error branch.','Parent P04/P04-V02 and production admission remain blocked.']};
fs.writeFileSync(local('qualification-reconciliation.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:result.passed,passedLogicalGroups:result.passedLogicalGroups,requiredLogicalGroups:58,passedActualCases:result.passedActualCases,totalActualCases:107}));
process.exitCode=result.passed?0:1;
