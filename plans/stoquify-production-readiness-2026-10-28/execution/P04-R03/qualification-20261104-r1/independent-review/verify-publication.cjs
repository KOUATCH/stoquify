// Independent controlled-publication comparison. Reads repository evidence only;
// writes this review's receipt, never a register or product file.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../../..'), evidence = path.resolve(__dirname, '..'), plan = path.resolve(evidence, '../../..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const read = file => json(path.join(evidence, file));
const before = read('publication-before/work-register.json'), current = json(path.join(plan, 'work-register.json'));
const validation = read('publication-validation.json'), links = read('publication-links.json');
const snapshots = read('publication-before/manifest.json');
for (const row of snapshots.files) assert.equal(hash(fs.readFileSync(path.join(evidence, 'publication-before', row.snapshot))), row.sha256);
for (const row of validation.publicationFiles) assert.equal(hash(fs.readFileSync(path.join(plan, row.path))), row.sha256);
const changedIds = new Set(['P04', 'P04-R03', 'P04-V01', 'P04-V02']);
assert.equal(before.packages.length, 54); assert.equal(current.packages.length, 55);
const byId = new Map(current.packages.map(row => [row.id, row])); assert.equal(byId.size, 55);
let unchanged = 0;
for (const old of before.packages) {
  assert(byId.has(old.id));
  if (!changedIds.has(old.id)) { assert.deepEqual(byId.get(old.id), old); unchanged++; }
}
assert.equal(unchanged, 50);
for (const key of Object.keys(before)) if (!['packages', 'audit_gap_map', 'evidence', 'execution_authorization'].includes(key)) assert.deepEqual(current[key], before[key]);
assert.equal(current.domains.length, 57); assert.equal(current.decisions.length, 14); assert.equal(current.gates.length, 18);
assert.equal(Object.keys(current.audit_gap_map).length, 12);
for (const [gap, old] of Object.entries(before.audit_gap_map)) assert.deepEqual(current.audit_gap_map[gap], gap === 'G04' ? [...old, 'P04-R04'] : old);
assert.equal(Object.keys(before.evidence).length, 23); assert.equal(Object.keys(current.evidence).length, 24);
for (const [id, old] of Object.entries(before.evidence)) assert.deepEqual(current.evidence[id], old);
assert.equal(current.evidence.E24.paths.length, 19); for (const file of current.evidence.E24.paths) assert(fs.existsSync(path.join(root, file)));
const parent = byId.get('P04'), repair = byId.get('P04-R03'), followup = byId.get('P04-R04');
assert.equal(parent.status, 'blocked'); assert.equal(repair.status, 'verified'); assert.equal(repair.implementation_authorized, true);
assert.equal(repair.evidence_record.candidate_id, read('candidate.json').id);
assert.equal(followup.status, 'not_started'); assert.equal(followup.implementation_authorized, false);
assert.deepEqual(followup, read('follow-up-package.json'));
for (const id of ['P04', 'P04-V01', 'P04-V02']) assert.deepEqual(byId.get(id).depends_on, [...before.packages.find(row => row.id === id).depends_on, 'P04-R04']);
assert.deepEqual(parent.required_child_packages, [...before.packages.find(row => row.id === 'P04').required_child_packages, 'P04-R04']);
assert.deepEqual(current.execution_authorization.packages, [...before.execution_authorization.packages, 'P04-R03']);
for (const [key,value] of Object.entries(before.execution_authorization)) if (!['packages','other_packages'].includes(key)) assert.deepEqual(current.execution_authorization[key], value);
let ordinary = 0, conditional = 0;
const graph = new Map();
for (const row of current.packages) {
  const deps = [...row.depends_on, ...(row.conditional_dependencies ?? []).map(item => item.id)];
  assert(deps.every(id => byId.has(id))); graph.set(row.id, deps);
  ordinary += row.depends_on.length; conditional += (row.conditional_dependencies ?? []).length;
}
assert.equal(ordinary, 181); assert.equal(conditional, 7);
const complete = new Set(), stack = new Set();
function visit(id) { if (complete.has(id)) return; assert(!stack.has(id), 'Dependency cycle'); stack.add(id); for (const next of graph.get(id)) visit(next); stack.delete(id); complete.add(id); }
for (const id of graph.keys()) visit(id);
function csv(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i=0;i<text.length;i++) {
    const char=text[i];
    if (quoted) { if (char==='"' && text[i+1]==='"') { value+='"';i++; } else if (char==='"') quoted=false; else value+=char; }
    else if (char==='"') quoted=true;
    else if (char===',') { row.push(value);value=''; }
    else if (char==='\n') { row.push(value.replace(/\r$/, ''));rows.push(row);row=[];value=''; }
    else value+=char;
  }
  assert(!quoted); if(value||row.length) {row.push(value.replace(/\r$/, ''));rows.push(row);} return rows;
}
const rows = csv(fs.readFileSync(path.join(plan, 'work-register.csv'), 'utf8'));
const columns = rows.shift(); assert.equal(rows.length, 55);
const scalar = value => value == null ? '' : Array.isArray(value) ? value.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join('; ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
for (const row of rows) { assert.equal(row.length, columns.length); const pkg=byId.get(row[columns.indexOf('id')]);assert(pkg);columns.forEach((column,i)=>assert.equal(row[i],scalar(pkg[column]),pkg.id+':'+column)); }
const oldRoadmap=fs.readFileSync(path.join(evidence,'publication-before/ROADMAP.md'),'utf8'), newRoadmap=fs.readFileSync(path.join(plan,'ROADMAP.md'),'utf8');
assert.equal(newRoadmap.split('## 11. Deliverables and next action')[0], oldRoadmap.split('## 11. Deliverables and next action')[0]);
assert(fs.readFileSync(path.join(plan,'mutation-log.md'),'utf8').startsWith(fs.readFileSync(path.join(evidence,'publication-before/mutation-log.md'),'utf8')));
for (const row of links.links) assert(fs.existsSync(path.resolve(plan,path.dirname(row.from),row.target)),row.from+' -> '+row.target);
for (const entry of read('owned-source.json').files) assert.equal(hash(fs.readFileSync(path.join(root,entry.path))),entry.sha256);
for (const entry of read('supplemental-findings.json').sourceHashes) assert.equal(hash(fs.readFileSync(path.join(root,entry.path))),entry.sha256);
const gates = read('advancement-gates.json'), assessment = read('independent-review/ASSESSMENT.json');
assert.equal(gates.advanceLocalR03,true); assert.equal(gates.advanceParentP04,false); assert.equal(gates.productionReady,false);
assert.equal(assessment.localR03Accepted,true); assert.equal(assessment.parentP04Accepted,false); assert.equal(assessment.productionAccepted,false);
assert.deepEqual(repair.evidence_record.remaining_release_requirements,assessment.remainingRequirements);
const result = {
  reviewedAt:new Date().toISOString(), reviewer:'r03_review', passed:true, candidateId:read('candidate.json').id,
  controlledFiles:validation.publicationFiles, prePublicationSnapshotsRecomputed:snapshots.files.length,
  packages:55, unchangedPriorPackages:50, csvRowsMatched:55, ordinaryEdges:181, conditionalEdges:7, acyclic:true,
  domainsPreserved:57, decisionsPreserved:14, gatesPreserved:18, auditGapKeysPreserved:12, onlyGapMappingAddition:'G04 -> P04-R04',
  priorEvidencePreserved:23, newE24PathsVerified:19, currentLinksVerified:links.links.length,
  roadmapPriorSectionsUnchanged:true, mutationLogAppendOnly:true, ownedSourceHashesUnchanged:2,
  parentP04Accepted:false, productionAccepted:false, nextEligiblePackage:'P04-R04', nextImplementationAuthorized:false,
  verdict:'accepted_controlled_publication',
};
fs.writeFileSync(path.join(__dirname,'PUBLICATION-REVIEW.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
