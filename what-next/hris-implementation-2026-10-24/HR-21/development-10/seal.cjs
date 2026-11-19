// Read-only verification of saved results/source identity; writes only this evidence manifest/patch.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict'),{spawnSync}=require('child_process');
const base=__dirname,read=f=>fs.readFileSync(path.join(base,f),'utf8'),json=f=>JSON.parse(read(f)),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const browser=json('browser-results.json'),native=json('regression-final.json'),before=json('regression-before.json'),startup=json('preflight-checks.json'),shutdown=json('shutdown.json');
assert.equal(browser.status,'PASS_SCOPED');assert.equal(browser.steps.length,13);assert.equal(browser.cleanupComplete,true);assert.equal(browser.pageErrors.length,0);
assert.equal(native.status,'PASS');assert.equal(native.checks.length,33);assert.equal(native.cleanup,true);assert.equal(before.checks.length,33);assert.ok(before.checks.some(c=>c.status==='FAIL'));assert.equal(before.cleanup,true);
assert.match(read('unit-final.log'),/49 passed, 49 total/);assert.match(read('typecheck.log'),/Diagnostics: 0/);assert.match(read('workflow-final.log'),/Workflow contract passed/);assert.equal(read('diff-check.log').trim(),'');
assert.equal(startup.status,'PASS');assert.equal(startup.checks.length,2);assert.equal(shutdown.status,'PASS');assert.equal(shutdown.nextStopped,true);assert.equal(shutdown.postgresStopped,true);
assert.match(read('INDEPENDENT-REVIEW.md'),/Final verdict: PASS_SCOPED/);
for(const [file,h]of Object.entries(browser.sourceHashes))assert.equal(hash(file),h,'Browser source drift '+file);
for(const [file,h]of Object.entries(browser.runtimeHashes))assert.equal(hash(path.join(base,'runtime-files',file)),h,'Runtime drift '+file);
for(const [file,h]of Object.entries(native.sourceHashes))assert.equal(hash(file),h,'Native source drift '+file);
const provenance=json('runtime-provenance.json');for(const [file,h]of Object.entries(provenance.configurationHashes))assert.equal(hash(file),h,'Root configuration drift '+file);
const production=['services/hris/document-evidence.service.ts','services/hris/lifecycle.service.ts','services/hris/payroll-readiness-contract.ts','actions/payroll/payroll-contract.actions.ts'];let patch='';
for(const file of production){const old=path.join(base,file.replaceAll('/','__')+'.baseline');const r=spawnSync('git',['diff','--no-index','--',old,file],{encoding:'utf8',windowsHide:true});assert.ok([0,1].includes(r.status));patch+=r.stdout}fs.writeFileSync(path.join(base,'production-changes.patch'),patch);
const files=fs.readdirSync(base).filter(f=>f!=='evidence.json'&&f!=='integrity.log'&&fs.statSync(path.join(base,f)).isFile());
const hashes=Object.fromEntries(files.map(f=>[f,hash(path.join(base,f))]));
const report={status:'VERIFIED_SCOPED',date:new Date().toISOString(),unit:{passed:49},postgres:{passed:33,beforeFailures:before.checks.filter(c=>c.status==='FAIL').length},browser:{stages:13,sources:Object.keys(browser.sourceHashes).length,runtimeFiles:Object.keys(browser.runtimeHashes).length},types:0,preflight:2,cleanup:true,shutdown:true,independentReview:'PASS_SCOPED',limitations:['Synthetic document metadata attestations, not protected original upload/scanner verification','Synthetic reviewed time certification','Base salary only, no additional compensation authoring','No FR/mobile/self-review/revocation qualification in this slice','No statutory, deployment, external-provider or operator acceptance'],hashes};
fs.writeFileSync(path.join(base,'evidence.json'),JSON.stringify(report,null,2));for(const [f,h]of Object.entries(json('evidence.json').hashes))assert.equal(hash(path.join(base,f)),h);console.log('PASS: '+files.length+' evidence files sealed and read back; current source/runtime hashes match');
