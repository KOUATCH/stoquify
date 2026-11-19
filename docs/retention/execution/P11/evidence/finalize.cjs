// Document/source verification only. Reads repository text/hashes, writes P11 evidence.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../../..');process.chdir(root);
const base='docs/retention/execution/P11';
const hash=p=>fs.existsSync(p)&&fs.statSync(p).isFile()?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null;
const read=p=>fs.readFileSync(p,'utf8');
const baseline=JSON.parse(read(base+'/evidence/BASELINE.json'));
const reviewed=JSON.parse(read(base+'/evidence/SOURCE_REVIEW.json'));
const prerequisites=JSON.parse(read(base+'/evidence/PREREQUISITES.json'));
const checks=[];const check=(id,pass,detail)=>checks.push({id,pass,detail});
const drift=baseline.fingerprints.filter(e=>e.path!=='docs/retention/execution/STATUS.md'&&hash(e.path)!==e.sha256).map(e=>e.path);
// Concurrent public-landing CSS change inspected and left untouched. Exact hash only.
const concurrent={'components/landing/cinematic.css':'4890bba7be78fd9217e5a166009f03f821c71badafa193ec1a62f2ec3fc372be'};
check('no unexplained selected-file drift',drift.every(p=>concurrent[p]===hash(p)),drift.map(p=>({path:p,baseline:baseline.fingerprints.find(e=>e.path===p).sha256,current:hash(p),classification:concurrent[p]===hash(p)?'documented concurrent unrelated change; preserved':'UNEXPLAINED'})));
const sourceDrift=reviewed.files.filter(e=>hash(e.path)!==e.sha256).map(e=>e.path);
check('reviewed source remains current',sourceDrift.length===0,sourceDrift);
const strip=s=>s.replace(/^\| \[P11\].*$/m,'P11_OWNED_ROW').replace(/\r\n/g,'\n');
check('only P11 status row changed',strip(read(base+'/evidence/INITIAL_STATUS.md'))===strip(read('docs/retention/execution/STATUS.md')));
const p03=prerequisites[2].entries.filter(e=>/opening-position|jest.opening/.test(e.path));
check('P03 owned fixture identity',p03.length===5&&p03.every(e=>e.matches&&hash(e.path)===e.expected),p03.map(e=>e.path));
const retained=JSON.parse(read('docs/retention/execution/P03/evidence/PRESERVED_ARTIFACT_HASHES.json'));
const p01=Object.entries(retained).filter(([p])=>/P01\/(BASELINE|DECISIONS|PILOT_SCOPE|RESULT)\.md$/.test(p));
check('P01 retained narrative identity',p01.length===4&&p01.every(([p,h])=>hash(p)===h));
const historical=JSON.parse(read('docs/retention/execution/P03/evidence/FIXTURE_AND_IMPORT_RESULTS_FINAL.json'));
check('historical P03 record inspected, not executed',historical.numPassedTests===48&&historical.numFailedTests===0&&historical.numTotalTestSuites===3);
check('workflow actual exit',JSON.parse(read(base+'/evidence/WORKFLOW.json')).exitCode===0);
const markers=[
 ['services/regulatory/country-packs/registry.ts','CM: [cameroonCountryPack]'],
 ['services/regulatory/country-packs/cameroon.ts','const CNPS_CAPABILITY_STATUS = "SUPPORTED_DRAFT"'],
 ['services/regulatory/country-packs/cameroon.ts','productionCalculationSupported: false'],
 ['services/regulatory/country-packs/cameroon.ts','productionAutomationAllowed: false'],
 ['services/regulatory/country-packs/cameroon.ts','CM_DGI_CGI_2025'],
 ['services/regulatory/regulatory-capability.service.ts','kind: "PENDING_COUNTRY_PACK"'],
 ['services/payroll/payroll-production-admission.ts','CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER'],
 ['services/payroll/authority-adapter-worker.service.ts','deps.adapter ?? payrollSandboxAuthorityAdapter'],
 ['services/payroll/authority-adapter-worker.service.ts','await assertPayrollProductionAdmissionInTx'],
 ['services/payments/adapters/mobile-money-hmac.adapter.ts','x-provider-signature'],
 ['services/payments/provider-operations.service.ts','signingPerformed: false'],
 ['services/onboarding/opening-readiness.ts','state: "REVIEW_REQUIRED"'],
 ['services/onboarding/master-data-import.service.ts','"opening accounting balances"'],
 ['services/inventory/inventory-stock-event.service.ts','OPENING_STOCK_LEDGER_REVIEW']
 ];
check('14 source markers supporting reviewed claims',markers.every(([p,s])=>read(p).includes(s)),markers.map(([p,s])=>({path:p,marker:s,present:read(p).includes(s)})));
const expert=read(base+'/EXPERT_REVIEW_PACKET.md'),provider=read(base+'/PROVIDER_PREREQUISITES.md');
check('12 planned cases',new Set([...expert.matchAll(/^\| (C\d{2}) /gm)].map(m=>m[1])).size===12);
check('9 provider prerequisite groups',new Set([...provider.matchAll(/^\| (I\d{2}) /gm)].map(m=>m[1])).size===9);
const docs=['RESULT.md','COUNTRY_SUPPORT_MATRIX.md','EXPERT_REVIEW_PACKET.md','PROVIDER_PREREQUISITES.md','evidence/PRIMARY_SOURCES.md','evidence/REVIEW_AND_COMMANDS.md'];
const links=[];
for(const d of docs)for(const m of read(base+'/'+d).matchAll(/\]\(([^)]+)\)/g)){
 const target=m[1];if(/^https?:/.test(target))continue;
 const full=path.resolve(path.dirname(base+'/'+d),target.split('#')[0]);
 const expectedGenerated=full===path.resolve(base+'/evidence/VALIDATION.json')||full===path.resolve(base+'/evidence/MANIFEST.json');
 links.push({document:d,target,exists:fs.existsSync(full)||expectedGenerated});
}
check('local artifact links',links.every(l=>l.exists),links);
const result={at:new Date().toISOString(),method:'Static document/source assertions; not application tests',ok:checks.every(c=>c.pass),checks,concurrentOrUnrelatedDrift:drift,sourceDrift};
fs.writeFileSync(path.join(__dirname,'VALIDATION.json'),JSON.stringify(result,null,2)+'\n');
const files=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else if(!p.endsWith('/MANIFEST.json'))files.push({path:p,sha256:hash(p)});}};walk(base);
files.push({path:'docs/retention/execution/STATUS.md',sha256:hash('docs/retention/execution/STATUS.md'),ownership:'P11 row only'});
fs.writeFileSync(path.join(__dirname,'MANIFEST.json'),JSON.stringify({at:new Date().toISOString(),files},null,2)+'\n');
console.log(JSON.stringify({ok:result.ok,checks:checks.map(c=>({id:c.id,pass:c.pass})),drift,sourceDrift,links:links.length,manifestFiles:files.length},null,2));
process.exitCode=result.ok?0:1;
