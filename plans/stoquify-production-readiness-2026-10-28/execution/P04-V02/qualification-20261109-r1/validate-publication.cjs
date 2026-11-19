// Read-only roadmap consistency checks; writes one exclusive receipt in this packet.
// No application imports, dotenv, DB, build, installation, git mutation or network.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../../../../..'),plan=path.resolve(__dirname,'../../..');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const old=read(path.join(__dirname,'publication-before/work-register.json'));
const now=read(path.join(plan,'work-register.json'));
const expected=read(path.join(__dirname,'publication-expectations.json'));
const equal=(a,b,message)=>assert.deepEqual(a,b,message);
const report={at:new Date().toISOString(),passed:false,checks:[]};
function check(name,fn){fn();report.checks.push(name);}
function parseCsv(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=c;}
    else if(c==='"'){assert.equal(cell,'','Quote must start field');quoted=true;}
    else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  assert(!quoted,'Unclosed CSV field');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}return rows;
}
const cellValue=v=>v==null?'':Array.isArray(v)?v.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join('; '):typeof v==='object'?JSON.stringify(v):String(v);
const edgeList=register=>register.packages.flatMap(p=>[
  ...(p.depends_on||[]).map(id=>({from:p.id,to:id,kind:'ordinary'})),
  ...(p.conditional_dependencies||[]).map(d=>({from:p.id,to:typeof d==='string'?d:d.package_id||d.id||d.package,kind:'conditional',condition:typeof d==='string'?null:d}))
]);
try{
  check('exact publication backups',()=>{for(const row of read(path.join(__dirname,'publication-before/manifest.json')))equal(sha(fs.readFileSync(path.join(__dirname,'publication-before',row.backup))),row.sha256,row.path);});
  check('unchanged repository HEAD',()=>{report.head=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();equal(report.head,old.baseline_head);});
  check('preserved global structures and deferred commitments',()=>{
    for(const key of Object.keys(old))if(!['packages','evidence','audit_gap_map','execution_authorization'].includes(key))equal(now[key],old[key],key);
    for(const p of old.packages.filter(p=>p.id.startsWith('X')))equal(now.packages.find(n=>n.id===p.id),p,p.id);
  });
  check('bounded package mutations',()=>{
    equal(new Set(now.packages.map(p=>p.id)).size,now.packages.length,'Duplicate ID');
    equal(now.packages.filter(p=>!old.packages.some(o=>o.id===p.id)).map(p=>p.id).sort(),[...expected.added_packages].sort());
    for(const p of old.packages){const n=now.packages.find(x=>x.id===p.id);assert(n,'Removed package '+p.id);const fields=expected.allowed_changed_fields[p.id];if(!fields){equal(n,p,p.id);continue;}for(const key of new Set([...Object.keys(p),...Object.keys(n)]))if(!fields.includes(key))equal(n[key],p[key],p.id+'.'+key);}
  });
  check('preserved and explicit new dependency edges; no cycles',()=>{
    const prior=edgeList(old),after=edgeList(now);const signature=x=>JSON.stringify(x);
    for(const edge of prior)assert(after.some(x=>signature(x)===signature(edge)),'Removed edge '+signature(edge));
    const added=after.filter(edge=>!prior.some(x=>signature(x)===signature(edge)));
    equal(added.map(signature).sort(),expected.added_edges.map(signature).sort());
    const ids=new Set(now.packages.map(p=>p.id));const outgoing=new Map(now.packages.map(p=>[p.id,[]]));for(const edge of after){assert(ids.has(edge.to),'Unknown dependency '+signature(edge));outgoing.get(edge.from).push(edge.to);}
    const done=new Set(),active=new Set();const visit=id=>{assert(!active.has(id),'Dependency cycle at '+id);if(done.has(id))return;active.add(id);for(const next of outgoing.get(id))visit(next);active.delete(id);done.add(id);};for(const id of ids)visit(id);
    report.edges={ordinary:after.filter(x=>x.kind==='ordinary').length,conditional:after.filter(x=>x.kind==='conditional').length,added:added.length,acyclic:true};
  });
  check('preserved audit gaps and explicit G04 follow-ups',()=>{for(const [key,value] of Object.entries(old.audit_gap_map))if(key!=='G04')equal(now.audit_gap_map[key],value,key);else equal(now.audit_gap_map[key],[...value,...expected.added_gap_packages]);});
  check('historical evidence unchanged and new paths exist',()=>{
    for(const [key,value] of Object.entries(old.evidence))equal(now.evidence[key],value,key);
    equal(Object.keys(now.evidence).filter(key=>!old.evidence[key]).sort(),[...expected.added_evidence].sort());
    for(const id of expected.added_evidence)for(const p of now.evidence[id].paths){const full=path.isAbsolute(p)?p:path.join(root,p);assert(fs.existsSync(full),'Missing evidence '+p);}
  });
  check('CSV mirrors every package field',()=>{
    const [headers,...rows]=parseCsv(fs.readFileSync(path.join(plan,'work-register.csv'),'utf8'));
    equal(rows.length,now.packages.length);equal(new Set(rows.map(row=>row[0])).size,rows.length);
    for(const p of now.packages){const row=rows.find(r=>r[0]===p.id);assert(row,p.id);equal(row.length,headers.length);for(let i=0;i<headers.length;i++)equal(row[i],cellValue(p[headers[i]]),p.id+'.'+headers[i]);}
    report.csv={rows:rows.length,columns:headers.length};
  });
  check('append-only mutation log and unchanged roadmap prefix',()=>{
    const previous=fs.readFileSync(path.join(__dirname,'publication-before/mutation-log.md'),'utf8'),current=fs.readFileSync(path.join(plan,'mutation-log.md'),'utf8');assert(current.startsWith(previous));assert(current.length>previous.length);
    const before=fs.readFileSync(path.join(__dirname,'publication-before/ROADMAP.md'),'utf8'),after=fs.readFileSync(path.join(plan,'ROADMAP.md'),'utf8');const marker=expected.roadmap_tail_marker;const index=before.lastIndexOf(marker);assert(index>=0);equal(after.slice(0,index),before.slice(0,index));
  });
  check('decision approval and readiness boundaries',()=>{
    const decision=read(path.join(plan,'execution/P04-D01/decision-20261109-r1/decision-record.json'));
    equal(decision.proposed_policy.selected_option,'C');equal(decision.decision_owner.product_accounting,'Kouatchoua Mark');equal(decision.decision_owner.security,'Kouatchoua Mark');equal(decision.user_approval.implementation_authorized,false);
    equal(now.packages.find(p=>p.id==='P04').status,'blocked');for(const id of expected.added_packages)equal(now.packages.find(p=>p.id===id).implementation_authorized,false,id);
    for(const id of ['P04-V02','P04-D01'])assert(now.execution_authorization.packages.includes(id));
  });
  report.packages=now.packages.length;report.preserved={domains:now.domains.length,gaps:Object.keys(now.audit_gap_map).length,decisions:now.decisions.length,gates:now.gates.length};report.passed=true;
}catch(error){report.failure={name:error.name,message:error.message};process.exitCode=1;}
fs.writeFileSync(path.join(__dirname,'publication-validation.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({passed:report.passed,checks:report.checks.length,packages:report.packages,failure:report.failure})+'\n');
