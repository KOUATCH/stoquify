const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../prototype/model.js');const out=__dirname,results=[];
function check(name,fn){try{fn();results.push({name,status:'passed'})}catch(error){results.push({name,status:'failed',error:error.message})}}
const ready={country_pack_verified:true,responsible_owner:true,agent_policy:true},clone=v=>JSON.parse(JSON.stringify(v));
check('All proposed manifests satisfy the isolated registry contract',()=>assert.deepEqual(M.registryIssues(M.manifests),[]));
for(const [id,p] of Object.entries(M.presets))check('Compatible customer configuration: '+id,()=>assert.equal(M.plan(p.selected,{prerequisites:ready}).compatible,true));
check('Service invoicing does not acquire inventory or POS',()=>{const p=M.plan(M.presets.services.selected);assert(!p.resolved.includes('inventory'));assert(!p.resolved.includes('pos'));assert(p.resolved.includes('ledger_core'))});
check('Required dependencies precede consumers',()=>{const p=M.plan(['payment_reconciliation']);for(const edge of p.edges)assert(p.resolved.indexOf(edge.to)<p.resolved.indexOf(edge.from))});
check('Required dependencies are explained without purchase',()=>{const p=M.plan(['pos']);assert(p.automatic.includes('sales'));assert(p.reasons.sales.includes('pos'));assert(p.pricing.includes('explicit acceptance'))});
check('Missing dependency cannot silently pass',()=>assert(M.plan(['pos'],{autoInclude:false}).issues.some(i=>i.code==='MISSING_DEPENDENCY')));
check('Unknown module is rejected',()=>assert(M.plan(['invented']).issues.some(i=>i.code==='UNKNOWN_MODULE')));
check('Two ledger authorities conflict',()=>assert(M.plan(['sales','external_ledger'],{registry:[...M.manifests,M.externalLedger]}).issues.some(i=>i.code==='CONFLICT')));
check('Absent payroll setup is explicit',()=>assert(M.plan(['payroll']).issues.some(i=>i.code==='SETUP')));
check('A selected module is not a commercial grant',()=>assert(M.plan(['inventory'],{licensed:[]}).issues.some(i=>i.code==='LICENSE')));
check('Duplicate module identifiers fail',()=>assert(M.registryIssues([...M.manifests,M.manifests[0]]).some(i=>i.code==='DUPLICATE_ID')));
check('Unsupported schema fails',()=>{const r=clone(M.manifests);r[0].schemaVersion=2;assert(M.registryIssues(r).some(i=>i.code==='INVALID_MANIFEST'))});
check('Dependency cycle fails',()=>{const r=clone(M.manifests);r[0].requires=[{moduleId:'sales',min:'1.0.0',maxExclusive:'2.0.0'}];assert(M.registryIssues(r).some(i=>i.code==='CYCLE'))});
check('Incompatible dependency major fails',()=>{const r=clone(M.manifests);r.find(m=>m.id==='sales').version='2.0.0';assert(M.registryIssues(r).some(i=>i.code==='VERSION'))});
check('Duplicate data writer fails',()=>{const r=clone(M.manifests);r.find(m=>m.id==='sales').dataOwnership.push(clone(r.find(m=>m.id==='inventory').dataOwnership[0]));assert(M.plan(['sales','inventory'],{registry:r}).issues.some(i=>i.code==='OWNERSHIP'))});
check('Duplicate route fails',()=>{const r=clone(M.manifests);r.find(m=>m.id==='sales').surfaces[0].path='/workspace/inventory';assert(M.plan(['sales','inventory'],{registry:r}).issues.some(i=>i.code==='ROUTE_COLLISION'))});
check('Prerelease ranges are not guessed by simplified parser',()=>assert.equal(M.compatible('1.0.0-beta.1','1.0.0','2.0.0'),false));
const access={organizationExists:true,organizationId:'tenant-a',actorOrganizationId:'tenant-a',objectOrganizationId:'tenant-a',sessionValid:true,permission:true,codeAvailable:true,controlsValid:true,securitySuspended:false,now:'2026-09-05T12:00:00Z',grant:{status:'active',startsAt:null,endsAt:null},entitlementKnown:true,selected:true,dependenciesReady:true,setupReady:true,runtimeReady:true,cachedReadAvailable:false,intent:'read',historical:false,retentionAllowed:false,retentionCapability:false};
check('Authorized read succeeds',()=>assert.equal(M.decide(access).reason,'ALLOW'));
for(const [name,patch,reason] of [
['Missing tenant',{organizationExists:false},'TENANT_SCOPE'],['Cross-tenant actor',{actorOrganizationId:'tenant-b'},'TENANT_SCOPE'],['Cross-tenant object',{objectOrganizationId:'tenant-b'},'TENANT_SCOPE'],['Revoked session',{sessionValid:false},'SESSION'],['Missing permission',{permission:false},'PERMISSION'],['Missing code',{codeAvailable:false},'NOT_AVAILABLE'],['Missing domain control',{controlsValid:false},'CONTROL'],['Security suspension',{securitySuspended:true},'SECURITY_SUSPENSION'],['Unknown grants',{grant:null},'ENTITLEMENT'],['Future grant',{grant:{status:'active',startsAt:'2027-01-01T00:00:00Z'}},'ENTITLEMENT'],['Expired grant',{grant:{status:'trial',endsAt:'2026-09-05T12:00:00Z'}},'ENTITLEMENT'],['Malformed grant date',{grant:{status:'active',endsAt:'invalid'}},'ENTITLEMENT'],['Not selected',{selected:false},'NOT_SELECTED'],['Suspended dependency',{dependenciesReady:false},'DEPENDENCY'],['Incomplete setup',{setupReady:false},'SETUP'],['Read-only write',{grant:{status:'read_only'},intent:'write'},'READ_ONLY'],['Provider unavailable for write',{runtimeReady:false,intent:'write'},'RUNTIME'],['Unavailable read without cached view',{runtimeReady:false},'RUNTIME']
])check(name,()=>assert.equal(M.decide({...access,...patch}).reason,reason));
check('Read-only API read uses operation policy, not UI surface',()=>assert.equal(M.decide({...access,grant:{status:'read_only'},surface:'api'}).allowed,true));
check('Degraded read is labeled stale',()=>assert.equal(M.decide({...access,runtimeReady:false,cachedReadAvailable:true}).reason,'STALE_READ'));
const retained={...access,grant:{status:'expired'},selected:false,historical:true,retentionAllowed:true,retentionCapability:true};
check('Authorized retained history survives commercial expiry',()=>assert.equal(M.decide(retained).reason,'RETAINED_HISTORY'));
check('Retention does not override security suspension',()=>assert.equal(M.decide({...retained,securitySuspended:true}).allowed,false));
check('Retention does not override object scope',()=>assert.equal(M.decide({...retained,objectOrganizationId:'tenant-b'}).allowed,false));
check('Retention does not permit new writes',()=>assert.equal(M.decide({...retained,intent:'write'}).allowed,false));
check('Retention requires known source history',()=>assert.equal(M.decide({...retained,entitlementKnown:false}).allowed,false));
check('Validated revision can provision',()=>assert(M.transition('validated','provisioning',{revision:2,currentRevision:2}).allowed));
check('Stale preview cannot apply',()=>assert.equal(M.transition('validated','provisioning',{revision:1,currentRevision:2}).reason,'STALE_REVISION'));
check('Open obligations prevent final deactivation',()=>assert.equal(M.transition('suspending','retained',{revision:2,currentRevision:2,openObligations:3}).reason,'OPEN_OBLIGATIONS'));
check('Failed provisioning has an explicit retry',()=>assert(M.transition('failed','provisioning',{revision:2,currentRevision:2}).allowed));
check('Retired record cannot resume directly',()=>assert.equal(M.transition('retired','active',{revision:2,currentRevision:2}).allowed,false));
fs.writeFileSync(path.join(out,'module-manifests.json'),JSON.stringify({status:'proposed examples; names of owned entities are conceptual, not assertions of current Prisma model names',modules:M.manifests},null,2)+'\n');
fs.writeFileSync(path.join(out,'configuration-examples.json'),JSON.stringify(Object.fromEntries(Object.entries(M.presets).map(([id,p])=>[id,{...p,plan:M.plan(p.selected,{prerequisites:ready})}])),null,2)+'\n');
const report={recordedAt:new Date().toISOString(),scope:'Isolated proposed model; no production authorization, database test or approved pricing.',total:results.length,passed:results.filter(r=>r.status==='passed').length,results};
fs.writeFileSync(path.join(out,'model-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,passed:report.passed,failures:results.filter(r=>r.status==='failed')},null,2));
if(report.passed!==report.total)process.exitCode=1;

