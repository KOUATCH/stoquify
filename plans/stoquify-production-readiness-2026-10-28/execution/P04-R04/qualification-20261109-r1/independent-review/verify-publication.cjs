'use strict';
// Read-only independent publication verification. Writes one review receipt only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const root = 'E:/ohada saas/Focused projects/stoquify';
const plan = path.join(root, 'plans/stoquify-production-readiness-2026-10-28');
const packet = path.join(plan, 'execution/P04-R04/qualification-20261109-r1');
const read = p => fs.readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const beforeDir = path.join(packet, 'publication-before');
const before = json(path.join(beforeDir, 'work-register.json'));
const after = json(path.join(plan, 'work-register.json'));
const manifest = json(path.join(beforeDir, 'manifest.json'));
for (const f of manifest.files) assert.equal(hash(path.join(beforeDir,f.snapshot)),f.sha256);
const changedTop = Object.keys(after).filter(k=>JSON.stringify(after[k])!==JSON.stringify(before[k]));
assert.deepEqual(changedTop,['packages','evidence','execution_authorization']);
assert.deepEqual(after.packages.map(p=>p.id),before.packages.map(p=>p.id));
assert.equal(after.packages.length,55);
const changedPackages=after.packages.filter((p,i)=>JSON.stringify(p)!==JSON.stringify(before.packages[i])).map(p=>p.id);
assert.deepEqual(changedPackages,['P04','P04-R04']);
const edges=register=>register.packages.flatMap(p=>[...(p.depends_on||[]).map(id=>({from:p.id,to:id,kind:'ordinary'})),...(p.conditional_dependencies||[]).map(d=>({from:p.id,to:d.id,kind:'conditional',when:d.when}))]);
const beforeEdges=edges(before),afterEdges=edges(after);
assert.deepEqual(afterEdges,beforeEdges);
assert.equal(afterEdges.filter(e=>e.kind==='ordinary').length,181);
assert.equal(afterEdges.filter(e=>e.kind==='conditional').length,7);
const visited=new Set(),active=new Set();
function visit(id){assert(!active.has(id),'dependency cycle '+id);if(visited.has(id))return;assert(after.packages.some(p=>p.id===id),'missing dependency '+id);active.add(id);for(const e of afterEdges.filter(e=>e.from===id))visit(e.to);active.delete(id);visited.add(id);}
for(const p of after.packages)visit(p.id);
for(const k of ['domains','audit_gap_map','decisions','gates'])assert.deepEqual(after[k],before[k]);
assert.equal(after.domains.length,57);assert.equal(Object.keys(after.audit_gap_map).length,12);assert.equal(after.decisions.length,14);assert.equal(after.gates.length,18);
for(const id of ['X01','X02','X03','X04'])assert.deepEqual(after.packages.find(p=>p.id===id),before.packages.find(p=>p.id===id));
for(const id of Object.keys(before.evidence))assert.deepEqual(after.evidence[id],before.evidence[id]);
assert.deepEqual(Object.keys(after.evidence).filter(k=>!before.evidence[k]),['E25']);
for(const p of after.evidence.E25.paths)assert(fs.existsSync(path.join(root,p)),'missing E25 path '+p);
const parent=after.packages.find(p=>p.id==='P04'),repair=after.packages.find(p=>p.id==='P04-R04');
assert.equal(parent.status,'blocked');assert.equal(repair.status,'verified');assert.equal(repair.implementation_status,'verified_local_native_actions');assert.equal(repair.implementation_authorized,true);
const parentChanged=Object.keys(parent).filter(k=>JSON.stringify(parent[k])!==JSON.stringify(before.packages.find(p=>p.id==='P04')[k]));assert.deepEqual(parentChanged,['current_state','evidence_refs']);
const authBefore=before.execution_authorization,authAfter=after.execution_authorization;
for(const k of Object.keys(authBefore))if(!['packages','other_packages'].includes(k))assert.deepEqual(authAfter[k],authBefore[k]);
assert.deepEqual(authAfter.packages,[...authBefore.packages,'P04-R04']);assert(!authAfter.packages.includes('P04-V02'));assert(authAfter.p04_r04);
function parseCsv(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}if(field||row.length){row.push(field);rows.push(row);}assert(!quoted);return rows;}
const csv=parseCsv(read(path.join(plan,'work-register.csv'))),headers=csv.shift();assert.equal(csv.length,55);
for(let i=0;i<csv.length;i++){assert.equal(csv[i].length,headers.length);for(let j=0;j<headers.length;j++){const value=after.packages[i][headers[j]];const expected=Array.isArray(value)?value.map(v=>typeof v==='object'?JSON.stringify(v):String(v)).join('; '):value==null?'':String(value);assert.equal(csv[i][j],expected,after.packages[i].id+' CSV '+headers[j]);}}
const beforeRoad=read(path.join(beforeDir,'ROADMAP.md')),afterRoad=read(path.join(plan,'ROADMAP.md')),marker='**Exact next action:**';assert.equal(beforeRoad.indexOf(marker),beforeRoad.lastIndexOf(marker));assert.equal(afterRoad.indexOf(marker),afterRoad.lastIndexOf(marker));assert.equal(afterRoad.slice(0,afterRoad.indexOf(marker)),beforeRoad.slice(0,beforeRoad.indexOf(marker)));
const beforeLog=read(path.join(beforeDir,'mutation-log.md')),afterLog=read(path.join(plan,'mutation-log.md'));assert(afterLog.startsWith(beforeLog));assert(afterLog.slice(beforeLog.length).includes('2026-11-09'));
const gates=json(path.join(packet,'advancement-gates.json'));assert.equal(gates.advanceLocalR04,true);assert.equal(gates.advanceParentP04,false);assert.equal(gates.productionReady,false);assert.equal(gates.nextEligiblePackage,'P04-V02');
const owned=json(path.join(packet,'owned-source.json'));for(const f of owned.files)assert.equal(hash(path.join(root,f.path)),f.sha256,'owned source '+f.path);
assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),'80e4abb283216b9f8e04b94e5020393f7dcabf62');
const docs=['execution/CURRENT.md','execution/NEXT.md','ROADMAP.md','mutation-log.md'];
const localLinks=[];
for(const doc of docs){const text=read(path.join(plan,doc));for(const m of text.matchAll(/\]\(([^)]+)\)/g)){let target=m[1].replace(/^<|>$/g,'').split('#')[0];if(!target||/^https?:/i.test(target))continue;const full=/^[A-Za-z]:[\\/]/.test(target)?target:path.resolve(path.dirname(path.join(plan,doc)),target);assert(fs.existsSync(full),'missing link '+doc+' '+target);localLinks.push({doc,target});}}
const result={reviewedAt:new Date().toISOString(),reviewer:'r04_review',passed:true,candidateId:gates.candidateId,publicationAccepted:true,changedTopLevelKeys:changedTop,changedPackageIds:changedPackages,unchangedPriorPackages:53,packages:55,ordinaryEdges:181,conditionalEdges:7,acyclic:true,domainsUnchanged:57,auditGapMappingsUnchanged:12,decisionsUnchanged:14,gatesUnchanged:18,deferredCommitmentsUnchanged:['X01','X02','X03','X04'],priorEvidenceEntriesUnchanged:24,newEvidenceId:'E25',newEvidencePathsExist:after.evidence.E25.paths.length,csvRowsReconciled:55,csvColumnsReconciled:headers.length,roadmapPrefixUnchanged:true,mutationLogAppendOnly:true,linksChecked:localLinks.length,priorAuthorizationPreserved:true,newAuthorizationOnly:'P04-R04',nextEligiblePackage:'P04-V02',nextPackageExecutedOrNewlyAuthorized:false,ownedSourceHashesStable:true,headUnchanged:true,parentP04Accepted:false,productionAccepted:false,noProductOrTestEditsByReviewer:true,publicationFiles:manifest.files.map(f=>({path:f.path,beforeSha256:f.sha256,afterSha256:hash(path.join(plan,f.path))})),packetFiles:['RESULT.md','advancement-gates.json','verification-matrix.json','VERIFICATION-MATRIX.md'].map(p=>({path:p,sha256:hash(path.join(packet,p))}))};
fs.writeFileSync(path.join(packet,'independent-review/PUBLICATION-REVIEW.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
