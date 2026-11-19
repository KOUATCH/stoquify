// Bounded evidence publication; no application, database, network or production operations.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const packet=__dirname,plan=path.resolve(packet,'../../..'),root=path.resolve(plan,'../..'),baseline=path.join(packet,'continuation-20261110-r2/publication-before');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const input=read(path.join(packet,'publication-input-attempt02.json'));
const targets=['work-register.json','work-register.csv','ROADMAP.md','mutation-log.md','execution/CURRENT.md','execution/NEXT.md'];
for(const p of targets)assert(fs.readFileSync(path.join(plan,p)).equals(fs.readFileSync(path.join(baseline,p))),'Concurrent shared edit: '+p);
assert(['verified','blocked'].includes(input.status));
for(const p of input.evidence){const full=path.resolve(packet,p);assert(full.startsWith(packet+path.sep));assert(fs.existsSync(full),p);}
const gates=read(path.join(packet,'advancement-gates-attempt02.json')),review=read(path.join(packet,input.review));
if(input.status==='verified'){assert.equal(gates.advancement_allowed,true);assert.equal(review.passed,true);assert(gates.gates.every(g=>g.status==='passed'));assert.equal(gates.required_logical_groups,58);assert.equal(review.candidateId,input.evidence_record.candidate_id);assert.equal(review.artifactSha256,gates.artifact_sha256);}else{assert.equal(gates.advancement_allowed,false);assert.equal(review.passed,false);assert.equal(review.blockedCheckpointAccepted,true);}
const source=read(path.join(packet,input.source_admission));assert.equal(source.passed,true);
for(const f of source.files)assert.equal(hash(fs.readFileSync(path.join(root,f.path))),f.sha256,'Source drift: '+f.path);
const wr=read(path.join(baseline,'work-register.json')),r06=wr.packages.find(p=>p.id==='P04-R06'),p04=wr.packages.find(p=>p.id==='P04'),v02=wr.packages.find(p=>p.id==='P04-V02');
const prefix='execution/P04-R06/qualification-20261109-r1/';
assert.equal(r06.implementation_authorized,true);assert.equal(r06.status,'blocked');assert(!wr.evidence.E29);
r06.status=input.status;r06.current_state=input.current_state;r06.evidence_record=input.evidence_record;r06.evidence_refs.push('E29');
for(const [p,state]of[[p04,input.parent_state],[v02,input.v02_state]]){assert.equal(p.status,'blocked');p.current_state=state;p.evidence_refs.push('E29');p.evidence_record.latest_auth_repair=prefix+'RESULT-attempt02.md';}
wr.evidence.E29={label:input.evidence_label,paths:input.evidence.map(p=>'plans/stoquify-production-readiness-2026-10-28/'+prefix+p)};
const header=fs.readFileSync(path.join(baseline,'work-register.csv'),'utf8').split(/\r?\n/)[0],keys=header.split(',').map(s=>s.slice(1,-1));
assert.equal(keys.length,20);const cell=v=>'"'+(Array.isArray(v)?v.map(x=>typeof x==='object'?JSON.stringify(x):x).join('; '):v??'').toString().replaceAll('"','""')+'"';
const csv=header+'\r\n'+wr.packages.map(p=>keys.map(k=>cell(p[k])).join(',')).join('\r\n')+'\r\n';
const oldRoad=fs.readFileSync(path.join(baseline,'ROADMAP.md'),'utf8'),tailStart=oldRoad.lastIndexOf('**Exact next action:**');assert(tailStart>=0);assert(input.roadmap_tail.startsWith('**Exact next action:**'));
const outputs=[
['work-register.json',JSON.stringify(wr,null,2)+'\n'],['work-register.csv',csv],
['ROADMAP.md',oldRoad.slice(0,tailStart)+input.roadmap_tail],
['mutation-log.md',Buffer.concat([fs.readFileSync(path.join(baseline,'mutation-log.md')),Buffer.from(input.mutation_append)])],
['execution/CURRENT.md',fs.readFileSync(path.join(packet,'continuation-20261110-r2/CURRENT.md'))],
['execution/NEXT.md',fs.readFileSync(path.join(packet,'continuation-20261110-r2/NEXT.md'))]
];
for(const[p,b]of outputs)fs.writeFileSync(path.join(plan,p),b);
fs.writeFileSync(path.join(packet,'publication-written-attempt02.json'),JSON.stringify({at:new Date().toISOString(),status:input.status,files:outputs.map(([p])=>({path:p,sha256:hash(fs.readFileSync(path.join(plan,p)))}))},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:input.status,files:outputs.length}));
