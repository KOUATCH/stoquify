const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),ts=require('typescript');
const root=process.cwd(),out=path.dirname(__dirname),now=new Date().toISOString();
const write=(n,v)=>fs.writeFileSync(path.join(out,n),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=['services/modules/module-control-contracts.ts','services/modules/module-catalog.service.ts','services/modules/module-entitlement.service.ts','actions/modules/module-control.actions.ts','components/modules/TenantModuleActivationButton.tsx','app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx','lib/security/auth-session.ts','lib/security/server-authz.ts','services/_shared/protect.ts','config/sidebar.ts','prisma/schema.prisma','package.json','scripts/module-surface-inventory.js','scripts/api-route-guard-inventory.js','services/events/business-event-outbox.service.ts','services/accounting/posting.service.ts','services/purchasing/ap-control.service.ts','services/pos/offline-sync.service.ts','services/payroll/payroll-control.service.ts','services/agents/agent-policy.service.ts','services/agents/agent-tool-registry.service.ts','services/hris/self-service.service.ts','services/regulatory/country-packs/resolve.ts','services/security/export-safety.service.ts'];
write('evidence/baseline.json',{recordedAt:now,root,branch:cp.execFileSync('git',['branch','--show-current'],{encoding:'utf8',windowsHide:true}).trim(),commit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),dirtyWorktree:cp.execFileSync('git',['status','--porcelain=v1','-unormal'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).trim(),scope:'Design and isolated prototype only; no application source edits or live database operations.',files:files.map(p=>({path:p,sha256:sha(fs.readFileSync(p))}))});
let requested=[],exists=true;const audit=[];
const db={organization:{findFirst:async()=>exists?{id:'demo-org',requestedModules:requested}:null,update:async({data})=>{requested=data.requestedModules.set}},auditLog:{create:async entry=>audit.push(entry)}};db.$transaction=async fn=>fn(db);
const cache={};
function load(p){const abs=path.resolve(p);if(cache[abs])return cache[abs].exports;const m={exports:{}};cache[abs]=m;
 const js=ts.transpileModule(fs.readFileSync(abs,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const req=id=>{if(id==='server-only')return {};if(id==='@prisma/client')return {Prisma:{TransactionIsolationLevel:{Serializable:'Serializable'}}};if(id==='@/lib/logger')return {logger:{error:()=>{}}};if(id==='@/prisma/db')return {db};if(id==='@/services/_shared/action-errors')return {BusinessRuleError:Error,NotFoundError:Error};if(id.startsWith('.'))return load(path.resolve(path.dirname(abs),id+'.ts'));throw Error('Unexpected import '+id)};
 new Function('require','module','exports',js)(req,m,m.exports);return m.exports;
}
const contracts=load('services/modules/module-control-contracts.ts'),catalog=load('services/modules/module-catalog.service.ts'),ent=load('services/modules/module-entitlement.service.ts');
write('evidence/current-catalog.json',catalog.getModuleCatalog());
const grant=(moduleSlug,status='active')=>({moduleSlug,status,source:'manual_override',startsAt:null,endsAt:null,readOnly:status==='read_only',trial:status==='trial'});
const input={organizationId:'demo-org',moduleSlug:'inventory',surfaceType:'api',surface:'isolated-design-probe',accessIntent:'read',mode:'enforce',now:'2026-09-05T00:00:00Z'},probes=[];
function probe(id,description,result){probes.push({id,description,result})}
probe('C01','Explicit empty grant array falls back to legacy defaults',ent.evaluateModuleEntitlement({...input,explicitEntitlements:[]}));
probe('C02','Expired temporal grant marked trial remains available',ent.evaluateModuleEntitlement({...input,explicitEntitlements:[{...grant('inventory','trial'),endsAt:'2020-01-01T00:00:00Z'}]}));
probe('C03','Present but suspended required dependency satisfies presence check',ent.evaluateModuleEntitlement({...input,moduleSlug:'pos',explicitEntitlements:[grant('pos'),grant('sales','suspended')]}));
probe('C04','Read-only API read denied by surface allowlist',ent.evaluateModuleEntitlement({...input,explicitEntitlements:[grant('inventory','read_only')]}));
probe('C05','Enforcing decision still reports hardEnforcementEnabled false',ent.evaluateModuleEntitlement({...input,requestedModules:['sales']}));
(async()=>{
 exists=false;probe('C06','Missing organization defaults to legacy grants in module service',await ent.observeModuleAccess({...input,audit:false}));exists=true;
 const before=ent.deriveLegacyEntitlements({requestedModules:requested}).entitlements.map(e=>e.moduleSlug);await ent.activateTenantModule({organizationId:'demo-org',actorId:'demo-owner',moduleSlug:'payment_reconciliation'});const after=ent.deriveLegacyEntitlements({requestedModules:requested}).entitlements.map(e=>e.moduleSlug);
 probe('C07','Reconciliation activation narrows empty-intent legacy tenant inferred catalogue',{before,after,lost:before.filter(p=>!after.includes(p)),storedRequestedModules:requested,auditEvents:audit.length});
 write('evidence/current-behavior-probes.json',{recordedAt:now,method:'Actual current TypeScript transpiled in memory; imports stubbed; synthetic in-memory persistence. No real database or application edits.',probes});
 const scanner=require(path.join(root,'scripts/module-surface-inventory.js')),inventory=scanner.buildModuleSurfaceInventory(root,{mode:'report'});write('evidence/module-surface-inventory.json',inventory);write('evidence/module-surface-inventory.md',scanner.renderMarkdown(inventory));
 const manifests=fs.readdirSync('graphify-out').filter(p=>/manifest/i.test(p)).map(p=>({path:'graphify-out/'+p,content:fs.readFileSync('graphify-out/'+p,'utf8').slice(0,6000)}));
 const graphs=['graph_actions.json','graph_components.json'].map(p=>{const g=JSON.parse(fs.readFileSync('graphify-out/'+p,'utf8'));return {path:'graphify-out/'+p,nodes:g.nodes?.length,selected:(g.nodes??[]).filter(n=>/module|entitlement|sidebar/i.test(JSON.stringify(n))).slice(0,12)}});
 write('evidence/graph-provenance.json',{manifests,graphs,rule:'Graphs for another checkout are excluded as proof; source relationships are verified directly.'});
 const schema=fs.readFileSync('prisma/schema.prisma','utf8');write('evidence/schema-check.json',{modelCount:[...schema.matchAll(/^model /gm)].length,matchingModels:[...schema.matchAll(/^model (\w+)/gm)].map(m=>m[1]).filter(n=>/Module|Subscription|Entitlement|ApprovalRegister|AuthorityAppointment|ApprovalRequest|ApprovalDecision/.test(n)),requestedModulesLine:schema.split(/\r?\n/).findIndex(l=>l.includes('requestedModules'))+1});
 write('checkpoint.json',{status:'in_progress',scope:'Design blueprint',completed:['source baseline','legacy evaluator probes','surface inventory','graph provenance'],next:['configuration contracts','prototype','blueprint and migration packages','scenario and browser verification']});
 console.log(JSON.stringify({catalogCount:contracts.COMMERCIAL_MODULE_SLUGS.length,inventorySummary:inventory.summary,probes:probes.map(p=>({id:p.id,allowed:p.result.allowed,lost:p.result.lost?.length}))},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1});

