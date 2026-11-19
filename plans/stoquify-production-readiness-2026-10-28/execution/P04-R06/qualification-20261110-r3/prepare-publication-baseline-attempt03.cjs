// Evidence-only preparation. Preserve E32; do not execute application or database commands.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const packet = __dirname, plan = path.resolve(packet, '../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(packet, name), 'utf8'));
const prior = read('publication-written-attempt02.json');
assert.equal(prior.status, 'blocked'); assert.equal(prior.files.length, 6);
const captured = prior.files.map(file => {
  const bytes = fs.readFileSync(path.join(plan, file.path));
  assert.equal(hash(bytes), file.sha256, 'Concurrent shared change: ' + file.path);
  return { ...file, bytes };
});
const register = JSON.parse(captured.find(file => file.path === 'work-register.json').bytes);
assert(register.evidence.E32 && !register.evidence.E33);
assert.equal(register.packages.find(item => item.id === 'P04-R06').status, 'blocked');
const target = path.join(packet, 'publication-before-attempt03');
assert(!fs.existsSync(target));
for (const file of captured) {
  const output = path.join(target, file.path);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, file.bytes, { flag: 'wx' });
}
for (const name of ['publish', 'validate-publication']) {
  const source = fs.readFileSync(path.join(packet, name + '-attempt02.cjs'), 'utf8');
  assert(source.includes('E32') && source.includes('attempt02'));
  const successor = source.replaceAll('E32', 'E33').replaceAll('attempt02', 'attempt03');
  fs.writeFileSync(path.join(packet, name + '-attempt03.cjs'), successor, { flag: 'wx' });
}
const capacity = read('resource-current-schema-retry-ready-r1.json');
assert.equal(capacity.passed, false);
assert.deepEqual(capacity.failures, ['commit_headroom']);
const receipt = { at: new Date().toISOString(), sourceEvidence: 'E32', nextEvidence: 'E33', baseline: captured.map(({bytes, ...file}) => file), currentRequest: 'Memory freed; other edits paused; continue R06 on D only after passing capacity and source gates.', capacityReceipt: 'resource-current-schema-retry-ready-r1.json', capacitySha256: hash(fs.readFileSync(path.join(packet, 'resource-current-schema-retry-ready-r1.json'))), workflowCheck: {command: 'npm run agent:workflow:check', exitCode: 0, toolChunks: ['9b3657', '8e6d90'], unclassifiedScripts: 196}, sharedFilesChanged: 0, applicationOrDatabaseStarted: false };
fs.writeFileSync(path.join(packet, 'publication-baseline-attempt03.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ prepared: true, baselineFiles: captured.length, sharedFilesChanged: 0 }));
