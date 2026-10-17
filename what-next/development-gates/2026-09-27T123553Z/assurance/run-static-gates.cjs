const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '../../../..');
const relativeOut = path.relative(root, __dirname).replaceAll('\\', '/');
const save = (name, value) => fs.writeFileSync(path.join(__dirname, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
const specs = [
 ['inventory-valuation-truth-gate', 'development', 'Inventory code control seams'],
 ['ledger-close-truth-gate', 'development', 'Ledger close invalidation control seams'],
 ['payment-cash-truth-gate', 'development', 'Payments and refund control seams'],
 ['purchasing-ap-consolidation-gate', 'development', 'Current purchasing maker-checker and atomic receiving seams'],
 ['role-based-operating-cockpit-gate', 'development', 'Current localized role cockpit'],
 ['statutory-country-pack-development-gate', 'development/sandbox', 'Separates sandbox work from external statutory approval'],
 ['statutory-country-pack-production-gate', 'production statutory authority', 'Actual artifact hashing and qualified approval gate'],
 ['workflow-assurance-release-gate', 'development', 'Canonical workflow assurance registry'],
 ['payroll-payments-declarations-development-gate', 'development/sandbox', 'Explicit payroll payment/declaration development scope'],
 ['payroll-accounting-close-development-gate', 'development/sandbox', 'Payroll close assurance development scope'],
 ['hris-payroll-migration-development-gate', 'development/sandbox', 'Non-mutating migration/backfill prerequisites'],
 ['payroll-presence-readiness-gate', 'development', 'HR/presence baseline controls'],
 ['payroll-trust-spine-readiness-gate', 'development', 'Payroll source/proof control seams'],
 ['ai-copilot-guardrails-gate', 'development', 'AI authority prohibition and human proposal review'],
 ['ci-release-readiness-gate', 'CI configuration', 'Checks workflow source; does not execute CI'],
 ['agent-external-input-readiness', 'internal pilot authoritative evidence capture', 'Names exact external inputs without capturing or applying them'],
 ['module-surface-inventory', 'development regression ratchet', 'Compares current source inventory to existing baseline', ['--baseline','what-next/module-surface-registry-baseline-2026-07-12.json']],
 ['release-evidence-ratchet', 'production release evidence', 'Read-only aggregate consumes historical default artifact paths', ['--release','on']],
];
const results=[];
for (const [gate,stage,why,extra=[]] of specs) {
 const file='scripts/'+gate+'.js';
 const source=fs.readFileSync(path.join(root,file));
 const args=[file,'--mode','fail','--out',relativeOut+'/'+gate+'.md','--json-out',relativeOut+'/'+gate+'.json',...extra];
 const start=new Date().toISOString();
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,windowsHide:true});
 save(gate+'.log',(result.stdout||'')+(result.stderr||'')+(result.error?String(result.error):''));
 const out=path.join(__dirname,gate+'.json');
 const report=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')):null;
 results.push({gate,stage,why,producer:file,producerSha256:crypto.createHash('sha256').update(source).digest('hex'),command:[process.execPath,...args],startedAt:start,finishedAt:new Date().toISOString(),exitCode:result.status,signal:result.signal,error:result.error?.code||null,report:report?relativeOut+'/'+gate+'.json':null,status:report?.summary?.status||report?.status|| (report?.ratchet?.failed?'BLOCKED':'UNSPECIFIED'),blockers:report?.blockers||[],safety:'Inspected producer/imports: local source/artifact reads and scoped report writes only; no database, network, migration, credential rotation, approvals or activation executed.'});
 console.log(JSON.stringify({gate,exitCode:result.status,status:results.at(-1).status,blockers:results.at(-1).blockers}));
}
for (const gate of ['agent-credential-rotation-gate','agent-operational-release-gate']) {
 const file='scripts/'+gate+'.js';
 const args=[file,'--mode','fail','--out',relativeOut+'/'+gate+'.md'];
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,windowsHide:true});
 save(gate+'.log',(result.stdout||'')+(result.stderr||''));
 const credPath='docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json';
 const credBuffer=fs.readFileSync(path.join(root,credPath));
 let report;
 if(gate==='agent-credential-rotation-gate') report=require(path.join(root,file)).evaluateRotationRegister(JSON.parse(credBuffer));
 else report=require(path.join(root,file)).evaluateOperationalReleaseRegister(JSON.parse(fs.readFileSync(path.join(root,'docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json'),'utf8')),{credentialRegister:JSON.parse(credBuffer),credentialRegisterSha256:'sha256:'+crypto.createHash('sha256').update(credBuffer).digest('hex')});
 save(gate+'.json',report);
 results.push({gate,stage:'internal pilot independent approval',why:'Read-only evidence register evaluator; does not perform credential rotation or activation',producer:file,producerSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),command:[process.execPath,...args],finishedAt:new Date().toISOString(),exitCode:result.status,status:report.status,blockers:report.blockers,report:relativeOut+'/'+gate+'.json',safety:'Inspected: existing value-free registers are inputs; CLI writes only new Markdown; exported pure evaluator supplies JSON. No apply or capture command executed.'});
 console.log(JSON.stringify({gate,exitCode:result.status,status:report.status,blockerCount:report.blockers.length}));
}
save('gate-executions.json',{generatedAt:new Date().toISOString(),readOnly:true,results});
