const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const plan = path.resolve(__dirname, '..');
const reg = JSON.parse(fs.readFileSync(path.join(plan, 'work-register.json'), 'utf8'));
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'P01/before-work-register.json'), 'utf8'));
const p04Before = JSON.parse(fs.readFileSync(path.join(__dirname, 'P04/before-work-register.json'), 'utf8'));
const p04Children = ['P04-R01','P04-R02','P04-R03','P04-V01','P04-V02','P04-V03','P04-V04','P04-V05','P04-D01'];
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
for (const p of p04Before.packages.filter(p => p.id !== 'P04')) assert.deepEqual(byId.get(p.id), p, 'Unrelated package changed ' + p.id);
assert.equal(reg.packages.length, p04Before.packages.length + p04Children.length);
for (const id of p04Children) { assert(byId.has(id)); assert.equal(byId.get(id).status,'not_started'); assert.equal(byId.get(id).parent_id,'P04'); }
assert.equal(byId.get('P04').status,'blocked');
assert.deepEqual(byId.get('P04').required_child_packages,p04Children);
for (const [id,value] of Object.entries(p04Before.audit_gap_map)) { if(id==='G04') assert.deepEqual(reg.audit_gap_map[id],[...new Set([...value,...p04Children])]); else assert.deepEqual(reg.audit_gap_map[id],value); }
for (const [id,value] of Object.entries(p04Before.evidence)) assert.deepEqual(reg.evidence[id],value);
for (const p of reg.packages) { p.domains.forEach(d=>assert(reg.domains.some(x=>x.domain===d))); (p.evidence_refs||[]).forEach(id=>assert(reg.evidence[id])); }
assert.deepEqual(reg.domains, before.domains); assert.deepEqual(reg.decisions, before.decisions); assert.deepEqual(reg.gates, before.gates);
const fields = fs.readFileSync(path.join(plan, 'work-register.csv'), 'utf8').split(/\r?\n/)[0].split(',');
const cell = v => '"' + (Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join('; ') : v == null ? '' : String(v)).replaceAll('"', '""') + '"';
fs.writeFileSync(path.join(plan, 'work-register.csv'), fields.join(',') + '\n' + reg.packages.map(p => fields.map(k => cell(p[k])).join(',')).join('\n') + '\n');
const result = { at: new Date().toISOString(), passed: true, packages: reg.packages.length, parentPackages: before.packages.length, domains: 57, auditGaps: 12, decisions: reg.decisions.length, gates: reg.gates.length, dependencyEdges: edges, topologicalOrder: order, unchangedOtherPackages: true, unchangedDeferredCommitments: true, productionGatesNotPromoted: true, p04Status: 'blocked', plannedP04Children: p04Children, p04RepairsImplemented: false };
fs.writeFileSync(path.join(__dirname, 'register-validation.json'), JSON.stringify(result, null, 2) + '\n'); fs.writeFileSync(path.join(__dirname,'P04/register-validation.json'),JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result));
