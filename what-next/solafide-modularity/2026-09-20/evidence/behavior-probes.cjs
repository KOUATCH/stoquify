// Audit-only harness: real current TS functions, no database or network.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const root = process.cwd();
const cache = new Map();
const inertDb = new Proxy({}, {get() { throw new Error('Database access forbidden in pure audit probes'); }});
class AuditError extends Error {}
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = {exports:{}}; cache.set(file,module);
  const source = fs.readFileSync(file,'utf8');
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const req = id => {
    if (id === 'server-only') return {};
    if (id === '@/prisma/db') return {db:inertDb};
    if (id === '@/lib/logger') return {logger:{error(){}}};
    if (id === '@prisma/client') return {Prisma:{TransactionIsolationLevel:{Serializable:'Serializable'}}};
    if (id === '@/services/_shared/action-errors') return {ApplicationError:AuditError,BusinessRuleError:AuditError,ConflictError:AuditError,NotFoundError:AuditError};
    if (id.startsWith('.')) return load(path.relative(root,path.resolve(path.dirname(file),id+'.ts')));
    if (id.startsWith('@/')) return load(id.slice(2)+'.ts');
    throw new Error('Unapproved probe import '+id);
  };
  vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{Date,Set,Map,Object,Array,Number,JSON,Error})(req,module,module.exports);
  return module.exports;
}
const e = load('services/modules/module-entitlement.service.ts');
const a = load('services/modules/module-admission.service.ts');
const c = load('services/modules/module-catalog.service.ts');
const grant = (moduleSlug, changes={}) => ({moduleSlug,status:'active',source:'manual_override',startsAt:null,endsAt:null,readOnly:false,trial:false,...changes});
const check = (changes={}) => e.evaluateModuleEntitlement({organizationId:'synthetic-audit-org',moduleSlug:'inventory',surfaceType:'api',surface:'audit-pure-probe',accessIntent:'read',mode:'enforce',now:'2026-09-20T12:00:00Z',explicitEntitlements:[grant('inventory')],...changes});
const probes = [];
function probe(id,name,fn) { try { const observed=fn(); probes.push({id,name,status:'passed',observed}); } catch(err) {probes.push({id,name,status:'failed',error:err.message});} }
probe('P01','Explicit empty grants do not restore legacy access',()=>{const d=check({explicitEntitlements:[]});assert.equal(d.allowed,false);return d.reason;});
probe('P02','Legacy empty intent preserves full-suite access',()=>{const d=check({explicitEntitlements:undefined,requestedModules:[]});assert.equal(d.allowed,true);return d.entitlement.status;});
probe('P03','Expired grants deny at the end boundary',()=>{const d=check({explicitEntitlements:[grant('inventory',{endsAt:'2026-09-20T12:00:00Z'})]});assert.equal(d.allowed,false);return d.reason;});
probe('P04','Invalid validity interval denies',()=>{const d=check({explicitEntitlements:[grant('inventory',{startsAt:'invalid'})]});assert.equal(d.allowed,false);return d.reason;});
probe('P05','POS requires an operational sales grant',()=>{const d=check({moduleSlug:'pos',explicitEntitlements:[grant('pos'),grant('sales',{status:'suspended'})]});assert.equal(d.allowed,false);return d.reason;});
probe('P06','Read-only allows reads and denies writes and exports',()=>{const grants=[grant('inventory',{readOnly:true})];const values=['read','write','export','job'].map(accessIntent=>check({explicitEntitlements:grants,accessIntent}).allowed);assert.deepEqual(values,[true,false,false,false]);return values;});
probe('P07','RBAC wildcard cannot override an enforcing entitlement deny',()=>{const d=check({explicitEntitlements:[],actorPermissions:['*']});assert.equal(d.allowed,false);assert.equal(d.rbacWildcardBypassedEntitlement,false);return d.result;});
probe('P08','Default observe mode records would-block but allows',()=>{const d=check({explicitEntitlements:[],mode:undefined});assert.equal(d.allowed,true);assert.equal(d.wouldBlock,true);return {mode:d.mode,result:d.result};});
probe('P09','Duplicate grants are rejected',()=>{const d=check({explicitEntitlements:[grant('inventory'),grant('inventory')]});assert.equal(d.allowed,false);return d.reason;});
probe('P10','Workspace omission does not stop new work',()=>{const v=a.moduleNewWorkBlockers('inventory',[]);assert.equal(v.length,0);return Array.from(v);});
probe('P11','Recommended purchasing-inventory connection is not a stop dependency',()=>{const v=a.moduleNewWorkBlockers('purchasing',['inventory']);assert.equal(v.length,0);return Array.from(v);});
probe('P12','Stopping manual journals does not cascade into reconciliation',()=>{const v=a.moduleNewWorkBlockers('payment_reconciliation',['accounting']);assert.equal(v.length,0);return Array.from(v);});
probe('P13','Stopping sales blocks dependent POS new work at the admission resolver',()=>{const v=a.moduleNewWorkBlockers('pos',['sales']);assert.equal(v.join(','),'sales');return Array.from(v);});
probe('P14','Catalog counts and hard versus recommended dependencies',()=>{const catalog=c.getModuleCatalog();assert.equal(catalog.length,19);return {count:catalog.length,core:catalog.filter(x=>x.core).map(x=>x.slug),dependencies:catalog.flatMap(x=>x.dependencies)};});
const result={recordedAt:new Date().toISOString(),method:'TypeScript transpileModule + VM; real pure entitlement/catalog/admission functions; DB access forbidden; error classes and Prisma metadata stubbed; no transaction, browser or production proof',passed:probes.filter(p=>p.status==='passed').length,failed:probes.filter(p=>p.status==='failed').length,probes};
fs.writeFileSync(path.join(__dirname,'behavior-probes.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:result.passed,failed:result.failed,results:probes.map(({id,name,status})=>({id,name,status}))},null,2));
process.exitCode=result.failed?1:0;
