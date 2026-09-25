const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = process.cwd();
const audit = path.resolve(__dirname, '..');
const failures = [];
const checks = [];
const check = (name, pass, details) => { checks.push({name, pass, details}); if (!pass) failures.push(name); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const required = ['REPORT.md','DECISION-MATRIX.md','EVIDENCE.json','ROADMAP.md','VERIFICATION.md','EXECUTION-PROMPT.md'];
check('Required artifacts exist and are nonempty', required.every(f => fs.existsSync(path.join(audit,f)) && fs.statSync(path.join(audit,f)).size > 0), required);
const originals = readJson(path.join(__dirname,'source-hashes.json'));
const changes = originals.filter(r => !fs.existsSync(path.join(root,r.file)) || hash(path.join(root,r.file)) !== r.sha256).map(r => r.file);
check('Inspected source hashes unchanged', changes.length === 0, {compared:originals.length, changed:changes});
const jsonFiles = [path.join(audit,'EVIDENCE.json'), ...fs.readdirSync(__dirname).filter(f => f.endsWith('.json') && f !== 'verification-results.json').map(f => path.join(__dirname,f))];
for (const file of jsonFiles) { try { readJson(file); check('JSON parses: '+path.basename(file), true); } catch(error) { check('JSON parses: '+path.basename(file), false, error.message); } }
const jest = readJson(path.join(__dirname,'jest-results.json'));
check('Recorded Jest result matches report', jest.success === true && jest.numPassedTests === 199 && jest.numFailedTests === 0 && jest.numPendingTests === 0 && jest.numPassedTestSuites === 14, {passed:jest.numPassedTests,failed:jest.numFailedTests,pending:jest.numPendingTests,suites:jest.numPassedTestSuites});
const probes = readJson(path.join(__dirname,'behavior-probes.json'));
check('Recorded probe result matches report', probes.passed === 14 && probes.failed === 0 && probes.probes.length === 14);
const evidence = readJson(path.join(audit,'EVIDENCE.json'));
const refs = evidence.findings.flatMap(f => f.sources || []).filter(s => s && typeof s === 'object' && s.path);
const badRefs = [];
for (const ref of refs) {
 const file = path.isAbsolute(ref.path) ? ref.path : path.join(audit,ref.path);
 if (!fs.existsSync(file)) badRefs.push(ref);
 else if (ref.line && (ref.line < 1 || ref.line > fs.readFileSync(file,'utf8').split(/\r?\n/).length)) badRefs.push(ref);
}
check('Evidence local references resolve', badRefs.length === 0, {references:refs.length, invalid:badRefs});
const badLinks = [];
for (const filename of required.filter(f => f.endsWith('.md') && f !== 'EXECUTION-PROMPT.md')) {
 const contents = fs.readFileSync(path.join(audit,filename),'utf8');
 for (const match of contents.matchAll(/\]\((?:<([^>]+)>|([^\s)]+))\)/g)) {
  const target = match[1] || match[2];
  if (/^(https?:|#)/i.test(target)) continue;
  const filePart = target.replace(/:\d+$/,'').split('#')[0];
  const file = path.isAbsolute(filePart) ? filePart : path.resolve(audit,filePart);
  if (file.endsWith('verification-results.json')) continue;
  if (!fs.existsSync(file)) badLinks.push({filename,target});
 }
}
check('Audit Markdown local links resolve', badLinks.length === 0, badLinks);
const weights = [15,15,20,10,10,10,10,5,5];
const sensitivity = [25,25,15,5,5,5,5,5,10];
const scores = {A:[3,3,4,3,4,5,4,3,2],B:[4,3,3,2,3,4,4,4,2],C:[4,4,5,5,4,4,4,4,4],D1:[5,5,4,4,3,4,3,4,5],D2:[4,4,3,3,2,1,1,3,5]};
const weighted = (s,w) => Number((s.reduce((n,v,i)=>n+v*w[i],0)/100).toFixed(2));
const base = Object.values(scores).map(s=>weighted(s,weights));
const alt = Object.values(scores).map(s=>weighted(s,sensitivity));
check('Matrix arithmetic', JSON.stringify(base) === JSON.stringify([3.55,3.25,4.3,4.15,2.9]) && JSON.stringify(alt) === JSON.stringify([3.25,3.25,4.2,4.5,3.45]), {order:Object.keys(scores),base,sensitivity:alt});
const additional = ['actions/item/items.ts','services/item/item.service.ts','services/pos/cart-write-access.ts'].map(file => ({file,sha256:hash(path.join(root,file)),bytes:fs.statSync(path.join(root,file)).size}));
const result = {recordedAt:new Date().toISOString(),passed:failures.length === 0,checks,failures,additionalSourceHashes:additional};
fs.writeFileSync(path.join(__dirname,'verification-results.json'), JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:result.passed,checkCount:checks.length,failures,sourceFilesCompared:originals.length},null,2));
process.exitCode = failures.length ? 1 : 0;
