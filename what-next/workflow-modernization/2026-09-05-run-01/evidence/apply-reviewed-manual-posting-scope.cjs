// Single proof-bound local application; no application imports or database code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const target=path.join(root,'services/accounting/journal-posting-order.service.ts');
const candidate=fs.readFileSync(path.join(__dirname,'manual-posting-all-period-candidate.ts.txt'));
const proofFile=path.join(__dirname,'manual-posting-scope-candidate-a05e8323-fe5f-440f-b7f3-f584a69d6c95.json'),proof=JSON.parse(fs.readFileSync(proofFile));
const reviewFile=path.join(__dirname,'../MANUAL_POSTING_SCOPE_REVIEW_2026-10-01.md');
assert.equal(sha(fs.readFileSync(reviewFile)),'90522e0d2d62250f2196e488dfe2b24e511404c4b6d7914824f5803308902216');
assert.equal(proof.passed,true);assert.equal(proof.sourceStable,true);assert.equal(proof.kind,'PURE_ISOLATED_CANDIDATE_CONTRACT');
assert.equal(sha(candidate),'82f7be861b1c131340ba0773e0db3229c98eb6c095424ece1fe999a081cfe8ac');
assert.equal(sha(candidate),proof.candidateSha256);
const before=fs.readFileSync(target);assert.equal(sha(before),proof.activeSourceBefore);
const id=crypto.randomUUID(),prefix=path.join(__dirname,'manual-posting-scope-application-'+id);
fs.writeFileSync(prefix+'-before.ts.txt',before,{flag:'wx'});
fs.writeFileSync(target,candidate);assert.equal(sha(fs.readFileSync(target)),sha(candidate));
const receipt={at:new Date().toISOString(),passed:true,file:'services/accounting/journal-posting-order.service.ts',beforeSha256:sha(before),afterSha256:sha(candidate),candidateProofSha256:sha(fs.readFileSync(proofFile)),reviewSha256:sha(fs.readFileSync(reviewFile)),scope:'One local helper file; no database execution or deployment. Production lock capacity remains unverified.'};
fs.writeFileSync(prefix+'.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:prefix+'.json',...receipt}));
