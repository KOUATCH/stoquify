// Read-only binding of the independent supplemental source review; no application imports.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function verifySupplementSource(){
 const receipt='independent-review/SUPPLEMENT03-SOURCE-REVIEW.json',bytes=fs.readFileSync(path.join(__dirname,receipt));assert.equal(hash(bytes),'6739ff3eb68631955dc0cc254416172d4795694520f82f1373a2f695ed9452d5');
 const review=JSON.parse(bytes),c=JSON.parse(fs.readFileSync(path.join(__dirname,'candidate-context.json'))),build=JSON.parse(fs.readFileSync(path.join(__dirname,'build-result.json')));assert.equal(review.verdict,'source_binding_admitted_for_bounded_read_only_supplement');assert.equal(review.candidateId,c.candidateId);assert.equal(review.artifactSha256,build.artifactSha256);assert.equal(review.currentCheckoutQualified,false);assert.equal(review.totalDistinctCriticalInputs,107);assert.equal(review.rows.length,16);
 const checked=review.rows.map(row=>{assert(!path.isAbsolute(row.path)&&!row.path.split('/').includes('..'));const currentSha256=hash(fs.readFileSync(path.join(root,row.path))),candidateSha256=hash(fs.readFileSync(path.join(c.source,row.path)));assert.equal(currentSha256,row.sha256,'Supplement current input changed: '+row.path);assert.equal(candidateSha256,row.sha256,'Supplement frozen input changed: '+row.path);return{...row,currentSha256,candidateSha256};});
 const base=JSON.parse(fs.readFileSync(path.join(__dirname,'independent-review/CONCURRENT-DRIFT-SCAN.json'))).rows;assert.equal(new Set([...base,...checked].map(r=>r.path)).size,107);
 return{passed:true,receipt,receiptSha256:hash(bytes),checked,totalDistinctCriticalInputs:107,currentCheckoutQualified:false};
}
module.exports={verifySupplementSource};
