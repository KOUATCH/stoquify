// Validate this evidence-only update; regenerate only the current work-register CSV.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const plan = path.resolve(__dirname, '../../..');
const root = path.resolve(plan, '../..');
const out = path.join(__dirname, 'resume-2026-11-02');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const reg = read(path.join(plan, 'work-register.json'));
const before = read(path.join(out, 'before-work-register.json'));
const byId = new Map(reg.packages.map(p => [p.id, p]));
assert.equal(byId.size, reg.packages.length);
for (const p of before.packages.filter(p => p.id !== 'P04-R02')) assert.deepEqual(byId.get(p.id), p);
for (const key of Object.keys(before).filter(k => !['packages', 'evidence'].includes(k))) assert.deepEqual(reg[key], before[key]);
for (const [id, evidence] of Object.entries(before.evidence)) assert.deepEqual(reg.evidence[id], evidence);
assert.deepEqual(Object.keys(reg.evidence).filter(k => !before.evidence[k]), ['E19']);
for (const file of reg.evidence.E19.paths) assert(fs.statSync(path.join(root, file)).isFile());
const p = byId.get('P04-R02');
assert.equal(p.status, 'blocked');
assert.equal(p.implementation_status, 'implemented_scoped_verified');
assert.deepEqual(p.depends_on, before.packages.find(x => x.id === p.id).depends_on);
assert.equal(byId.get('P04').status, 'blocked');
const gates = read(path.join(__dirname, 'advancement-gates.json'));
assert.equal(gates.advance_parent, false);
assert.equal(gates.gates.find(g => g.id === 'R02-G08').status, 'blocked');
assert.equal(gates.gates.find(g => g.id === 'R02-G09').required_for_local_r02_completion, false);
const active = new Set(), done = new Set(); let edges = 0;
function visit(id) {
  assert(byId.has(id)); assert(!active.has(id), 'Dependency cycle');
  if (done.has(id)) return;
  active.add(id);
  for (const d of [...byId.get(id).depends_on, ...(byId.get(id).conditional_dependencies || []).map(x => x.id)]) { edges++; visit(d); }
  active.delete(id); done.add(id);
}
for (const p of reg.packages) visit(p.id);
assert.equal(reg.domains.length, 57);
const fields = fs.readFileSync(path.join(plan, 'work-register.csv'), 'utf8').split(/\r?\n/)[0].split(',');
const cell = v => '"' + (Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join('; ') : v == null ? '' : String(v)).replaceAll('"', '""') + '"';
fs.writeFileSync(path.join(plan, 'work-register.csv'), fields.join(',') + '\n' + reg.packages.map(p => fields.map(k => cell(p[k])).join(',')).join('\n') + '\n');
const result = { at: new Date().toISOString(), passed: true, packages: reg.packages.length, dependencyEdges: edges,
  domains: reg.domains.length, auditGaps: Object.keys(reg.audit_gap_map).length, decisions: reg.decisions.length,
  productionGates: reg.gates.length, unrelatedPackagesUnchanged: true, deferredCommitmentsUnchanged: true,
  productionGatesNotPromoted: true, r02Status: p.status, evidenceAdded: 'E19' };
fs.writeFileSync(path.join(out, 'register-validation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
