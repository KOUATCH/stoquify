// Documentation consistency only. Reads roadmap records; writes current CSV and a new validation receipt. No application, database or process commands.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const plan=path.resolve(__dirname,'../../..');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const before=read(path.join(__dirname,'before-register-publication.json'));
const reg=read(path.join(plan,'work-register.json'));
const byId=new Map(reg.packages.map(p=>[p.id,p]));
assert.equal(byId.size,54); assert.equal(reg.packages.length,54);
for(const p of before.packages)if(p.id!=='P04-R02')assert.deepEqual(byId.get(p.id),p,'Unrelated package '+p.id);
for(const k of Object.keys(before))if(!['packages','evidence'].includes(k))assert.deepEqual(reg[k],before[k],'Unrelated field '+k);
for(const [k,v]of Object.entries(before.evidence))assert.deepEqual(reg.evidence[k],v,'Historical evidence '+k);
assert.deepEqual(Object.keys(reg.evidence).filter(k=>!before.evidence[k]),['E20']);
const r=byId.get('P04-R02'); assert.equal(r.status,'blocked');assert.equal(r.implementation_status,'implemented_scoped_verified');
assert.deepEqual(r.depends_on,before.packages.find(p=>p.id==='P04-R02').depends_on);
assert.equal(reg.domains.length,57); assert.equal(new Set(reg.domains.map(d=>d.domain)).size,57);assert.equal(Object.keys(reg.audit_gap_map).length,12);
for(const d of reg.domains){assert(d.packages.length);for(const id of d.packages)assert(byId.has(id));}
for(const ids of Object.values(reg.audit_gap_map))for(const id of ids)assert(byId.has(id));
const done=new Set(),active=new Set(),order=[];let edges=0;
function visit(id){assert(byId.has(id));assert(!active.has(id),'Cycle '+id);if(done.has(id))return;active.add(id);const p=byId.get(id);for(const d of [...p.depends_on,...(p.conditional_dependencies||[]).map(x=>x.id)]){edges++;visit(d);}active.delete(id);done.add(id);order.push(id);}
for(const p of reg.packages){visit(p.id);for(const ref of p.evidence_refs||[])assert(reg.evidence[ref]);if(p.status==='verified')for(const d of p.depends_on)assert.equal(byId.get(d).status,'verified');}
assert.equal(edges,183);assert.equal(reg.decisions.length,14);assert.equal(reg.gates.length,18);
const gates=read(path.join(__dirname,'advancement-gates.json'));assert.equal(gates.advance_parent,false);assert.equal(gates.gates[0].status,'blocked');assert.equal(gates.gates[0].compiler_status,'passed');assert.equal(gates.gates[0].artifact_status,'failed_before_seal');assert.equal(gates.gates[0].browser_status,'not_run');
const fields=fs.readFileSync(path.join(plan,'work-register.csv'),'utf8').split(/\r?\n/)[0].split(',');
const cell=v=>'"'+(Array.isArray(v)?v.map(x=>typeof x==='string'?x:JSON.stringify(x)).join('; '):v==null?'':String(v)).replaceAll('"','""')+'"';
fs.writeFileSync(path.join(plan,'work-register.csv'),fields.join(',')+'\n'+reg.packages.map(p=>fields.map(k=>cell(p[k])).join(',')).join('\n')+'\n');
const result={at:new Date().toISOString(),passed:true,packages:54,dependencyEdges:edges,domains:57,auditGaps:12,decisions:14,productionGates:18,otherPackagesUnchanged:53,historicalEvidenceUnchanged:true,deferredCommitmentsUnchanged:true,productionGatesUnchanged:true,advanceParent:false,r02Status:'blocked',nextGate:'R02-ASSET-01',topologicalOrder:order};
fs.writeFileSync(path.join(__dirname,'register-validation.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
