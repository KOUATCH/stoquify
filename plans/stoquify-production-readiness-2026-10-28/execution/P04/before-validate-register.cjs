const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const plan = path.resolve(__dirname, '..');
const reg = JSON.parse(fs.readFileSync(path.join(plan, 'work-register.json'), 'utf8'));
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'P01/before-work-register.json'), 'utf8'));
const byId = new Map(reg.packages.map(p => [p.id, p]));
assert.equal(byId.size, reg.packages.length);
const order = [], active = new Set(), done = new Set(); let edges = 0;
function visit(id) {
  assert(byId.has(id), 'Missing ' + id); assert(!active.has(id), 'Cycle ' + id);
  if (done.has(id)) return;
  active.add(id); const p = byId.get(id);
  for (const d of [...p.depends_on, ...(p.conditional_dependencies || []).map(x => x.id)]) { edges++; visit(d); }
  active.delete(id); done.add(id); order.push(id);
}
for (const p of reg.packages) visit(p.id);
assert.equal(reg.domains.length, 57); assert.equal(new Set(reg.domains.map(d => d.domain)).size, 57);
for (const d of reg.domains) { assert(d.packages.length); d.packages.forEach(id => assert(byId.has(id))); }
assert.equal(Object.keys(reg.audit_gap_map).length, 12);
for (const ids of Object.values(reg.audit_gap_map)) { assert(ids.length); ids.forEach(id => assert(byId.has(id))); }
for (const p of reg.packages.filter(p => p.status === 'verified')) for (const d of p.depends_on) assert.equal(byId.get(d).status, 'verified', p.id + ' required dependency ' + d);
for (const p of before.packages.filter(p => !['P01', 'P02', 'P03'].includes(p.id))) assert.deepEqual(byId.get(p.id), p, 'Unrelated package changed ' + p.id);
assert.deepEqual(reg.domains, before.domains); assert.deepEqual(reg.decisions, before.decisions); assert.deepEqual(reg.gates, before.gates);
const fields = fs.readFileSync(path.join(plan, 'work-register.csv'), 'utf8').split(/\r?\n/)[0].split(',');
const cell = v => '"' + (Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join('; ') : v == null ? '' : String(v)).replaceAll('"', '""') + '"';
fs.writeFileSync(path.join(plan, 'work-register.csv'), fields.join(',') + '\n' + reg.packages.map(p => fields.map(k => cell(p[k])).join(',')).join('\n') + '\n');
const result = { at: new Date().toISOString(), passed: true, packages: reg.packages.length, parentPackages: before.packages.length, domains: 57, auditGaps: 12, decisions: reg.decisions.length, gates: reg.gates.length, dependencyEdges: edges, topologicalOrder: order, unchangedOtherPackages: true, unchangedDeferredCommitments: true, productionGatesNotPromoted: true };
fs.writeFileSync(path.join(__dirname, 'register-validation.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
