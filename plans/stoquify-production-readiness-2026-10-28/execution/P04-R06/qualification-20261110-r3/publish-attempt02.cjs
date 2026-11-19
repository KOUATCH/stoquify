// Bounded local evidence publication. No application, database, Git or network operations.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const packet = __dirname, plan = path.resolve(packet, '../../..'), root = path.resolve(plan, '../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const local = relative => {
  const full = path.resolve(packet, relative);
  assert(full.startsWith(packet + path.sep), 'Outside packet: ' + relative);
  return full;
};
const input = read(local('publication-input-attempt02.json'));
const targets = ['work-register.json', 'work-register.csv', 'ROADMAP.md', 'mutation-log.md', 'execution/CURRENT.md', 'execution/NEXT.md'];
for (const file of targets) assert(fs.readFileSync(path.join(plan, file)).equals(fs.readFileSync(local('publication-before-attempt02/' + file))), 'Concurrent shared edit: ' + file);
assert(['verified', 'blocked'].includes(input.status));
for (const file of input.evidence) assert(fs.existsSync(local(file)), file);
const gates = read(local('advancement-gates-attempt02.json'));
const review = read(local(input.review));
assert.equal(review.candidateId, input.evidence_record.candidate_id);
assert.equal(review.artifactSha256, input.evidence_record.artifact_sha256);
if (input.status === 'verified') {
  assert.equal(gates.advancement_allowed, true);
  assert(gates.gates.every(gate => gate.status === 'passed'));
  assert.equal(gates.required_logical_groups, 58);
  assert.equal(review.passed, true);
} else {
  assert.equal(gates.advancement_allowed, false);
  assert.equal(review.passed, false);
  assert.equal(review.blockedCheckpointAccepted, true);
}
const source = read(local(input.source_admission));
assert.equal(source.passed, true);
for (const file of source.files) assert.equal(hash(fs.readFileSync(path.join(root, file.path))), file.sha256, 'Source drift: ' + file.path);
const register = read(local('publication-before-attempt02/work-register.json'));
const r06 = register.packages.find(p => p.id === 'P04-R06');
assert.equal(r06.status, 'blocked');
assert.equal(r06.implementation_authorized, true);
assert(!register.evidence.E32);
r06.status = input.status;
r06.current_state = input.current_state;
r06.evidence_record = input.evidence_record;
r06.execution_boundary = input.execution_boundary;



r06.evidence_refs.push('E32');
const prefix = 'execution/P04-R06/qualification-20261110-r3/';
for (const [id, state] of [['P04', input.parent_state], ['P04-V02', input.v02_state]]) {
  const item = register.packages.find(p => p.id === id);
  assert.equal(item.status, 'blocked');
  item.current_state = state;
  item.evidence_refs.push('E32');
  item.evidence_record.latest_auth_repair = prefix + 'RESULT-attempt02.md';
}
register.evidence.E32 = { label: input.evidence_label, paths: input.evidence.map(file => 'plans/stoquify-production-readiness-2026-10-28/' + prefix + file) };
const header = fs.readFileSync(local('publication-before-attempt02/work-register.csv'), 'utf8').split(/\r?\n/)[0];
const keys = header.split(',').map(value => value.slice(1, -1));
assert.equal(keys.length, 20);
const cell = value => '"' + (Array.isArray(value) ? value.map(item => typeof item === 'object' ? JSON.stringify(item) : item).join('; ') : value ?? '').toString().replaceAll('"', '""') + '"';
const csv = header + '\r\n' + register.packages.map(p => keys.map(key => cell(p[key])).join(',')).join('\r\n') + '\r\n';
const oldRoadmap = fs.readFileSync(local('publication-before-attempt02/ROADMAP.md'), 'utf8');
const tail = oldRoadmap.lastIndexOf('**Exact next action:**');
assert(tail >= 0 && input.roadmap_tail.startsWith('**Exact next action:**'));
const outputs = [
  ['work-register.json', JSON.stringify(register, null, 2) + '\n'],
  ['work-register.csv', csv],
  ['ROADMAP.md', oldRoadmap.slice(0, tail) + input.roadmap_tail],
  ['mutation-log.md', Buffer.concat([fs.readFileSync(local('publication-before-attempt02/mutation-log.md')), Buffer.from(input.mutation_append)])],
  ['execution/CURRENT.md', fs.readFileSync(local('CURRENT-attempt02.md'))],
  ['execution/NEXT.md', fs.readFileSync(local('NEXT-attempt02.md'))],
];
for (const [file, bytes] of outputs) fs.writeFileSync(path.join(plan, file), bytes);
fs.writeFileSync(local('publication-written-attempt02.json'), JSON.stringify({ at: new Date().toISOString(), status: input.status, files: outputs.map(([file]) => ({ path: file, sha256: hash(fs.readFileSync(path.join(plan, file))) })) }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: input.status, files: outputs.length }));
