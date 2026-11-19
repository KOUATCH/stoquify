const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const packet=__dirname,plan=path.resolve(packet,'../../..'),root=path.resolve(plan,'../..');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const input=read(path.join(packet,'blocked-publication-inputs.json'));
const baselineDir=path.join(packet,'preservation/before/publication');
const shared=['work-register.json','work-register.csv','ROADMAP.md','mutation-log.md','execution/CURRENT.md','execution/NEXT.md'];
for(const rel of shared) assert(fs.readFileSync(path.join(plan,rel)).equals(fs.readFileSync(path.join(baselineDir,rel))),'Concurrent publication edit: '+rel);
for(const rel of input.evidence) assert(fs.existsSync(path.join(packet,rel)),rel);
assert.equal(read(path.join(packet,'advancement-gates.json')).advancement_allowed,false);
assert.equal(read(path.join(packet,input.independentOutcome)).passed,false);
assert.equal(read(path.join(packet,input.cleanup)).passed,true);
const sourceAdmission=read(path.join(packet,'independent-review/REPAIR-SOURCE-ADMISSION-v3.json'));
assert.equal(sourceAdmission.passed,true);
for(const f of sourceAdmission.files) assert.equal(hash(fs.readFileSync(path.join(root,f.path))),f.sha256,f.path);
const wr=read(path.join(baselineDir,'work-register.json'));
const prefix='execution/P04-R06/qualification-20261109-r1/';
const r06=wr.packages.find(x=>x.id==='P04-R06'),p04=wr.packages.find(x=>x.id==='P04'),v02=wr.packages.find(x=>x.id==='P04-V02');
r06.status='blocked';
r06.implementation_authorized=true;
r06.current_state='Authorized bounded repair implemented and independently source-reviewed; current-source mocked attempt03 passes87/87 across4suites,0skips. First isolated full build compiled but failed with native V8 memory exhaustion during type/lint; no sealed repaired artifact or actual R06 session/browser qualification. Host memory gate blocks retry. Nine inherited V02 failure groups require actual denial/positive/native-state requalification; parent and production remain blocked.';
r06.execution_boundary='User explicitly authorized P04-R06 current-authentication repair and isolated verification. Only two product files and two regression files owned; unrelated changes preserved. Broader browser freshness, provider, dependency upgrades and unrelated business changes remain separate. No commit/push, production flags/data migrations or deployment.';
r06.evidence_refs.push('E28');
r06.evidence_record={
candidate_id:input.candidate_id,
source_hashes:prefix+'inventory/source-after-manifest-v4.json:63selected; inventory/source-after-repair-manifest-v4.json:48subset; full source resume comparison retained',
commands:prefix+input.retryHandoff,
source_review:prefix+'independent-review/REPAIR-SOURCE-ADMISSION-v3.json',
mocked_tests:prefix+'unit/attempt03/jest.json:87passed;4suites;0failed;0skipped; mocked persistence; independent UNIT-OUTCOME-REVIEW-v3.json',
native_database:'Preparation only:122migrations;246initially empty public business tables in each isolated DB;10synthetic actors/2organizations;0preseeded sessions. No repaired per-request denial/positive database qualification. '+prefix+input.cleanup,
authenticated_browser:'NOT RUN on repaired artifact; first full build failed before artifact sealing.',
provider_hosted:'NOT RUN',
operator:'NOT RUN',
cleanup:prefix+input.cleanup,
reviewer:prefix+input.independentOutcome,
build:prefix+'build-result.json:failed native memory exhaustion after successful compilation; original logs retained',
latest_checkpoint:prefix+'RESULT.md',
resource_gate:prefix+input.resource,
advancement:prefix+'advancement-gates.json:false'
};
p04.current_state='P04 remains blocked. R06 bounded current-auth repair is implemented with87current mocked tests and independent source review; full-app qualification is blocked by native build memory exhaustion and failed host-capacity gate. Actual repaired session/browser/native-state evidence is absent. R08 item-list module enforcement and R07 failed-refresh recovery remain unimplemented; V02 historical failures retained. P04-D01 option C is approved; R05 creator/delegate repair unimplemented. V01/V03/V04/V05 and wider current-checkout/hosted/operator obligations remain open.';
p04.evidence_refs.push('E28');
p04.evidence_record.latest_auth_repair=prefix+'RESULT.md:implemented;blocked pending full-app qualification;no advancement';
v02.current_state='Historical sealed candidate p04-v02-full-6577e9e63dc7 remains blocked:196logical groups,171scoped qualified,17product-failure groups,8native-visibility prerequisites unexercised,11additional replay/corroboration records distinct. R06 now has a bounded source-reviewed repair and87current mocked passes, but its full build failed with memory exhaustion; no repaired actual-session/browser/native-state result supersedes the9inherited groups. R08/R07 unimplemented. Provider23/23 and selected media checks retain local historical verdicts; wider hosted/operator/current-checkout evidence remains open.';
v02.evidence_refs.push('E28');
v02.evidence_record.latest_auth_repair=prefix+'RESULT.md:pending actual affected-gate requalification;historic V02 results unchanged';
wr.execution_authorization.packages.push('P04-R06');
wr.execution_authorization.prepared_not_authorized=wr.execution_authorization.prepared_not_authorized.filter(x=>x!=='P04-R06');
wr.execution_authorization.other_packages='Prior explicitly authorized packages retain recorded boundaries. P04-R06 repair and isolated qualification explicitly authorized by subsequent user request and continuation. R05/R07/R08 remain reviewable proposals only; implementation_authorized:false. No commit/push, production flags/data migrations or deployment.';
wr.execution_authorization.p04_r06={date:'2026-11-09',continued:'2026-11-10',request:'P04-R06:refresh authentication hashes and authority map; advancement requires real-session denials, authorized positives, database evidence and independent review.',scope_record:prefix+'AUTHORIZATION.md',implementation_authorized:true};
wr.evidence.E28={label:'P04-R06 bounded repair; current mocked87pass; real-session qualification blocked by full-build memory failure',paths:input.evidence.map(p=>'plans/stoquify-production-readiness-2026-10-28/'+prefix+p)};
const header=fs.readFileSync(path.join(baselineDir,'work-register.csv'),'utf8').split(/\r?\n/)[0];
const keys=header.split(',').map(s=>s.slice(1,-1));
const cell=v=>'"'+(Array.isArray(v)?v.map(x=>typeof x==='object'?JSON.stringify(x):x).join('; '):v??'').toString().replaceAll('"','""')+'"';
const csv=header+'\r\n'+wr.packages.map(p=>keys.map(k=>cell(p[k])).join(',')).join('\r\n')+'\r\n';
const oldRoad=fs.readFileSync(path.join(baselineDir,'ROADMAP.md'),'utf8');
const marker='**Exact next action:** prepare P04-R06';
const start=oldRoad.lastIndexOf(marker);assert(start>=0);
const tail='**Exact next action:** refresh the reviewed P04-R06 host-capacity check. After memory headroom passes, refresh source/recipe admission and run the isolated second full-build attempt with normal type/lint checks. The bounded repair and87current mocked tests pass source-level review, but the first build exhausted native memory after compilation; no repaired real-session or browser result exists. See [R06 result]('+prefix+'RESULT.md), [current checkpoint](execution/CURRENT.md) and [next action](execution/NEXT.md).\r\n\r\n**Evidence to advance:** a sealed refreshed artifact, genuine revoked/expired/ineligible session denials with no private data or unauthorized writes, independent authorized positives, per-request database snapshots, rendered browser results, cleanup and independent outcome review. R06, parent P04, V02 and production remain blocked. R08/R07/R05 remain unimplemented and unauthorized here; P04-D01 option C remains approved by Kouatchoua Mark. All57domains, global decisions, dependencies and deferred commitments remain preserved. No commit, push, production flags/data migrations or deployment.\r\n';
const append='\r\n## 2026-11-10 — P04-R06 bounded repair; native qualification blocked\r\n\r\nExplicit user authorization and continuation cover current authentication hashes/authority map, bounded repair and isolated qualification. Two product and two regression-test files changed; unrelated concurrent annotation/schema/configuration/documentation changes preserved. Current63source inputs and48subset independently reviewed. Mocked attempt03 passes87/87 in4suites,0skips; historical83/87runs retained. E28 adds scoped evidence; original E01–E27 unchanged.\r\n\r\nPreparation passed:152,806dependency files reconciled;122migrations;246initially empty business tables perDB;10synthetic actors,2organizations,0preseeded sessions. First full-app build compiled, then failed with native memory exhaustion during type/lint. No sealed repaired artifact; no actual repaired session, per-request database or rendered browser qualification. Host resource gate fails despite available disk; owned cleanup and concrete retry handoff retained. No gate bypass or unrelated process termination.\r\n\r\nR06 moves not_started→blocked/implementation_authorized:true; it does not advance to verified. P04/V02 summaries recognize the implemented but unqualified repair and retain historical failures. Shared changes limited to these three package summaries, only R06 new authorization, E28, matching CSV, CURRENT/NEXT, roadmap final tail and this append-only log. All59packages,208ordinary+7conditional edges,57domains,12gap maps,14global decisions,18gates and deferred X01–X04 remain unchanged. R05/R07/R08 remain unauthorized. No commit/push, production flag/data migration or deployment.\r\n';
const files=[
['work-register.json',JSON.stringify(wr,null,2)+'\n'],
['work-register.csv',csv],
['ROADMAP.md',oldRoad.slice(0,start)+tail],
['mutation-log.md',Buffer.concat([fs.readFileSync(path.join(baselineDir,'mutation-log.md')),Buffer.from(append)])],
['execution/CURRENT.md',fs.readFileSync(path.join(packet,'publication-draft/CURRENT.md'))],
['execution/NEXT.md',fs.readFileSync(path.join(packet,'publication-draft/NEXT.md'))]
];
for(const [p,b]of files) fs.writeFileSync(path.join(plan,p),b);
fs.writeFileSync(path.join(packet,'publication-written.json'),JSON.stringify({at:new Date().toISOString(),status:'blocked',files:files.map(([p])=>({path:p,sha256:hash(fs.readFileSync(path.join(plan,p)))}))},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'blocked',published:files.map(x=>x[0])}));
