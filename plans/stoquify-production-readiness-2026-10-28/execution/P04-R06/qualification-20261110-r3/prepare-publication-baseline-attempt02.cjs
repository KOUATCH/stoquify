// Preserve the settled E31 publication and prepare new E32 helpers. Local evidence writes only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const packet = __dirname, plan = path.resolve(packet, '../../..'), root = path.resolve(plan, '../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(packet, name), 'utf8'));
const prior = read('publication-written.json');
assert.equal(prior.status, 'blocked');
assert.equal(prior.files.length, 6);
const captured = prior.files.map(file => {
  const bytes = fs.readFileSync(path.join(plan, file.path));
  assert.equal(hash(bytes), file.sha256, 'Shared file changed since E31: ' + file.path);
  return { ...file, bytes };
});
const register = JSON.parse(captured.find(file => file.path === 'work-register.json').bytes);
assert(register.evidence.E31 && !register.evidence.E32);
assert.equal(register.packages.find(item => item.id === 'P04-R06').status, 'blocked');
const target = path.join(packet, 'publication-before-attempt02');
assert(!fs.existsSync(target));
fs.mkdirSync(target);
for (const file of captured) {
  const output = path.join(target, file.path);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, file.bytes, { flag: 'wx' });
}
function replace(text, before, after, expected = 1) {
  assert.equal(text.split(before).length - 1, expected, 'Unexpected source pattern: ' + before);
  return text.replaceAll(before, after);
}
function common(text) {
  text = text.replaceAll('E31', 'E32');
  text = text.replaceAll('publication-before/', 'publication-before-attempt02/');
  text = replace(text, "local('publication-input.json')", "local('publication-input-attempt02.json')");
  text = replace(text, "local('advancement-gates.json')", "local('advancement-gates-attempt02.json')");
  return text;
}
let publisher = common(fs.readFileSync(path.join(packet, 'publish.cjs'), 'utf8'));
publisher = replace(publisher, "prefix + 'RESULT.md'", "prefix + 'RESULT-attempt02.md'");
publisher = replace(publisher, "local('CURRENT.md')", "local('CURRENT-attempt02.md')");
publisher = replace(publisher, "local('NEXT.md')", "local('NEXT-attempt02.md')");
publisher = replace(publisher, "local('publication-written.json')", "local('publication-written-attempt02.json')");
let validator = common(fs.readFileSync(path.join(packet, 'validate-publication.cjs'), 'utf8'));
validator = replace(validator, 'qualification-20261110-r3/RESULT.md', 'qualification-20261110-r3/RESULT-attempt02.md');
validator = replace(validator, "fs.readFileSync(local(file))", "fs.readFileSync(local(file.replace('.md', '-attempt02.md')))");
validator = replace(validator, "local('publication-validation.json')", "local('publication-validation-attempt02.json')");
fs.writeFileSync(path.join(packet, 'publish-attempt02.cjs'), publisher, { flag: 'wx' });
fs.writeFileSync(path.join(packet, 'validate-publication-attempt02.cjs'), validator, { flag: 'wx' });
const packageBytes = fs.readFileSync(path.join(root, 'package.json'));
const scripts = JSON.parse(packageBytes).scripts;
assert.equal(scripts['agent:workflow:check'], 'node scripts/verify-agent-workflow-contract.js');
assert.equal(scripts['preagent:workflow:check'], undefined);
assert.equal(scripts['postagent:workflow:check'], undefined);
const receipt = {
  at: new Date().toISOString(), packageId: 'P04-R06', sourceEvidence: 'E31', nextEvidence: 'E32',
  currentRequest: 'Resume on D after user freed memory; source checks, isolated full build, real-session/browser qualification, independent review; no commits/deployment/production changes.',
  baseline: captured.map(({ bytes, ...file }) => file),
  workflowCheck: { command: 'npm run agent:workflow:check', exitCode: 0, toolChunk: 'c4a709', unclassifiedScripts: 196, packageSha256: hash(packageBytes) },
  capacityReceipt: 'resource-capture-retry-ready-r2.json',
  capacityReceiptSha256: hash(fs.readFileSync(path.join(packet, 'resource-capture-retry-ready-r2.json'))),
  newTestRun: false, candidateQualified: false, sharedFilesChanged: 0,
};
fs.writeFileSync(path.join(packet, 'publication-baseline-attempt02.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ prepared: true, baselineFiles: captured.length, sharedFilesChanged: 0 }));
