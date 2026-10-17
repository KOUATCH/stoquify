const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'../../..');
const dest = path.join(root,'docs/prompt-execution');
const sha = b=>crypto.createHash('sha256').update(b).digest('hex');
const basenames=['01_REFINED_PROMPT','02_EXECUTION_REPORT','03_EXECUTION_FINDINGS_AND_RISKS','04_IMPLEMENTATION_ROADMAP','05_ROADMAP_EXECUTIVE_SUMMARY'];
const expected = basenames.flatMap(b=>[b+'.md',b+'.pdf']).sort();
assert.deepEqual(fs.readdirSync(dest).sort(),expected,'Publication must contain exactly five pairs and no intermediates');
const before = JSON.parse(fs.readFileSync(path.join(__dirname,'markdown-before-publish.json'))).hashes;
const original = JSON.parse(fs.readFileSync(path.join(__dirname,'source-baseline.json'))).hashes;
const items=[];
for(const name of expected) {
 const buf=fs.readFileSync(path.join(dest,name));
 if(name.endsWith('.pdf')) {assert.ok(buf.length>=1024);assert.equal(buf.subarray(0,5).toString(),'%PDF-');}
 else assert.equal(sha(buf),before[name],`Markdown changed during publication: ${name}`);
 items.push({name,bytes:buf.length,sha256:sha(buf)});
}
for(const [name,hash] of Object.entries(original)) assert.equal(sha(fs.readFileSync(path.join(root,name))),hash,'Original audit changed');
const archive=path.join(__dirname,'previous-publication');
assert.deepEqual(fs.readdirSync(archive).sort(),expected,'Previous publication missing files');
const archiveItems=expected.map(name=>({name,bytes:fs.statSync(path.join(archive,name)).size,sha256:sha(fs.readFileSync(path.join(archive,name)))}));
const result={checkedAt:new Date().toISOString(),status:'PASS',destination:dest,exactFivePairs:true,markdownUnchanged:true,pdfHeadersAndSizesValid:true,noIntermediates:true,originalAuditUnchanged:true,previousPublicationRetained:true,items,archiveItems};
fs.writeFileSync(path.join(__dirname,'publication-validation.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,files:items.map(({name,bytes})=>({name,bytes})),originalAuditUnchanged:true,archiveFiles:archiveItems.length},null,2));
