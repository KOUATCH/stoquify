// Read-only comparison except for one new validation receipt in this packet.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const packet = __dirname, plan = path.resolve(packet, '../../..'), root = path.resolve(plan, '../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const local = relative => {
  const full = path.resolve(packet, relative);
  assert(full.startsWith(packet + path.sep), relative);
  return full;
};
const baseline = read(local('publication-before-attempt02/work-register.json'));
const current = read(path.join(plan, 'work-register.json'));
const input = read(local('publication-input-attempt02.json'));
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
}
check('all domains, global decisions, gates and deferred scope preserved', () => {
  for (const key of new Set([...Object.keys(baseline), ...Object.keys(current)])) if (!['packages', 'evidence'].includes(key)) assert.deepEqual(current[key], baseline[key], key);
  assert.equal(current.domains.length, 57);
  assert.equal(current.decisions.length, 14);
  assert.equal(current.gates.length, 18);
});
check('exact bounded package changes and dependencies preserved', () => {
  assert.equal(current.packages.length, 59);
  const allowed = ['status', 'current_state', 'evidence_record', 'execution_boundary', 'tasks', 'evidence_refs'];
  for (const before of baseline.packages) {
    const after = current.packages.find(p => p.id === before.id);
    assert(after);
    if (before.id === 'P04-R06') {
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) if (!allowed.includes(key)) assert.deepEqual(after[key], before[key], key);
      assert.deepEqual(after.tasks, before.tasks);
      assert.deepEqual(after.evidence_refs, [...before.evidence_refs, 'E32']);
      for (const [key, expected] of Object.entries({ status: input.status, current_state: input.current_state, evidence_record: input.evidence_record, execution_boundary: input.execution_boundary })) assert.deepEqual(after[key], expected);
    } else if (['P04', 'P04-V02'].includes(before.id)) {
      const expected = structuredClone(before);
      expected.current_state = before.id === 'P04' ? input.parent_state : input.v02_state;
      expected.evidence_refs.push('E32');
      expected.evidence_record.latest_auth_repair = 'execution/P04-R06/qualification-20261110-r3/RESULT-attempt02.md';
      assert.deepEqual(after, expected);
    } else assert.deepEqual(after, before, before.id);
  }
});
check('dependencies remain acyclic', () => {
  const complete = new Set(), active = new Set();
  function visit(id) {
    assert(!active.has(id), 'Dependency cycle: ' + id);
    if (complete.has(id)) return;
    const item = current.packages.find(p => p.id === id); assert(item);
    active.add(id);
    for (const dependency of item.depends_on || []) visit(dependency);
    active.delete(id); complete.add(id);
  }
  current.packages.forEach(p => visit(p.id));
});
check('historical evidence and authorization preserved', () => {
  for (const [key, value] of Object.entries(baseline.evidence)) assert.deepEqual(current.evidence[key], value);
  assert.deepEqual(Object.keys(current.evidence).sort(), [...Object.keys(baseline.evidence), 'E32'].sort());
  assert.equal(current.packages.find(p => p.id === 'P04-R06').implementation_authorized, true);
  for (const id of ['P04-R05', 'P04-R07', 'P04-R08']) assert.equal(current.packages.find(p => p.id === id).implementation_authorized, false);
  for (const id of ['P04', 'P04-V02']) assert.equal(current.packages.find(p => p.id === id).status, 'blocked');
});
check('new evidence paths and exact E32 record resolve', () => {
  assert.deepEqual(current.evidence.E32, { label: input.evidence_label, paths: input.evidence.map(file => 'plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261110-r3/' + file) });
  for (const file of input.evidence) assert(fs.existsSync(local(file)), file);
});
check('CSV mirrors all 59 packages and 20 columns', () => {
  const parse = line => {
    const fields = []; let value = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (quoted && line[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
      else if (ch === ',' && !quoted) { fields.push(value); value = ''; } else value += ch;
    }
    fields.push(value); assert(!quoted); return fields;
  };
  const lines = fs.readFileSync(path.join(plan, 'work-register.csv'), 'utf8').trimEnd().split(/\r?\n/);
  const header = parse(lines[0]); assert.equal(header.length, 20); assert.equal(lines.length, 60);
  const encode = value => (Array.isArray(value) ? value.map(item => typeof item === 'object' ? JSON.stringify(item) : item).join('; ') : value ?? '').toString();
  current.packages.forEach((item, index) => {
    const row = parse(lines[index + 1]); assert.equal(row.length, 20);
    header.forEach((key, column) => assert.equal(row[column], encode(item[key])));
  });
});
check('exact append-only log and bounded roadmap/document publication', () => {
  const oldLog = fs.readFileSync(local('publication-before-attempt02/mutation-log.md'));
  assert(fs.readFileSync(path.join(plan, 'mutation-log.md')).equals(Buffer.concat([oldLog, Buffer.from(input.mutation_append)])));
  const oldRoadmap = fs.readFileSync(local('publication-before-attempt02/ROADMAP.md'), 'utf8');
  const start = oldRoadmap.lastIndexOf('**Exact next action:**'); assert(start >= 0);
  assert.equal(fs.readFileSync(path.join(plan, 'ROADMAP.md'), 'utf8'), oldRoadmap.slice(0, start) + input.roadmap_tail);
  for (const file of ['CURRENT.md', 'NEXT.md']) assert(fs.readFileSync(path.join(plan, 'execution', file)).equals(fs.readFileSync(local(file.replace('.md', '-attempt02.md')))));
});
check('owned source still matches independent admission', () => {
  const source = read(local(input.source_admission)); assert.equal(source.passed, true);
  for (const file of source.files) assert.equal(hash(fs.readFileSync(path.join(root, file.path))), file.sha256, file.path);
});
check('package status follows actual independent outcome and qualification evidence', () => {
  const r06 = current.packages.find(p => p.id === 'P04-R06');
  const gates = read(local('advancement-gates-attempt02.json')), review = read(local(input.review));
  assert.equal(review.candidateId, r06.evidence_record.candidate_id);
  assert.equal(review.artifactSha256, r06.evidence_record.artifact_sha256);
  if (r06.status === 'verified') {
    assert.equal(gates.advancement_allowed, true);
    assert.equal(gates.required_logical_groups, 58);
    assert(gates.gates.length >= 10 && gates.gates.every(gate => gate.status === 'passed'));
    assert.equal(review.passed, true);
    const receipts = gates.outcome_receipts; assert(receipts);
    for (const key of ['qualification', 'integrity', 'review']) {
      const receipt = read(local(receipts[key])); assert.equal(receipt.passed, true, receipts[key]);
      assert.equal(receipt.candidateId, r06.evidence_record.candidate_id);
      assert.equal(receipt.artifactSha256, r06.evidence_record.artifact_sha256);
    }
    const qualification = read(local(receipts.qualification));
    const intended = read(local('inventory/test-case-map-original.json'));
    assert.equal(qualification.requirements.length, 58);
    assert.deepEqual(qualification.requirements.map(item => item.id).sort(), intended.cases.map(item => item.id).sort());
    assert.equal(new Set(qualification.requirements.map(item => item.id)).size, 58);
    assert(qualification.requirements.every(item => item.passed === true && item.proofs.length > 0));
    const contract = read(local('runtime/qualification-contract.json'));
    assert.deepEqual(contract.originalRequirements.slice().sort(), intended.cases.map(item => item.id).sort());
    assert(Array.isArray(contract.mandatoryProofs) && contract.mandatoryProofs.length === 57, 'Explicit supplementary coverage missing');
    assert.equal(qualification.contractSha256, hash(fs.readFileSync(local('runtime/qualification-contract.json'))));
    assert.equal(qualification.totalActualCases, 107);
    assert.equal(qualification.passedActualCases, 107);
    assert.equal(qualification.passedLogicalGroups, 58);
    assert(Array.isArray(qualification.auxiliaryProofs));
    const proofKey = proof => JSON.stringify([proof.receipt, proof.arrayPath, proof.caseId]);
    const requiredKeys = contract.mandatoryProofs.map(proofKey).sort();
    assert.equal(new Set(requiredKeys).size, requiredKeys.length, 'Duplicate mandatory proof');
    assert.deepEqual(qualification.auxiliaryProofs.map(proofKey).sort(), requiredKeys, 'Missing or extra supplementary proofs');
    const proofs = [...qualification.requirements.flatMap(item => item.proofs), ...qualification.auxiliaryProofs];
    for (const proof of proofs) {
      const bytes = fs.readFileSync(local(proof.receipt)); assert.equal(hash(bytes), proof.sha256);
      const rawReceipt = JSON.parse(bytes);
      assert.equal(rawReceipt.candidateId, r06.evidence_record.candidate_id, proof.receipt);
      assert.equal(rawReceipt.artifactSha256, r06.evidence_record.artifact_sha256, proof.receipt);
      let selected = rawReceipt;
      for (const key of proof.arrayPath) { assert.equal(typeof key, 'string'); assert(!['__proto__', 'constructor', 'prototype'].includes(key)); selected = selected[key]; }
      assert(Array.isArray(selected));
      const matches = selected.filter(item => item.id === proof.caseId); assert.equal(matches.length, 1);
      assert.equal(matches[0].passed, true, proof.caseId);
    }
  } else {
    assert.equal(r06.status, 'blocked');
    assert.equal(gates.advancement_allowed, false);
    assert.equal(review.passed, false);
    assert.equal(review.blockedCheckpointAccepted, true);
  }
});
const result = { at: new Date().toISOString(), passed: checks.every(item => item.passed), checks, packageCount: current.packages.length };
fs.writeFileSync(local('publication-validation-attempt02.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));
process.exitCode = result.passed ? 0 : 1;
