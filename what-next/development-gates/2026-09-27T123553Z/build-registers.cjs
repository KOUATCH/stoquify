const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ts = require('typescript');
const OUT = __dirname;
const ROOT = path.resolve(OUT, '../../..');
const read = name => JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'));
const save = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n');
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), value + '\n');
const md = x => String(x == null ? '' : typeof x === 'object' ? JSON.stringify(x) : x).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const table = (headers, rows) => [headers, headers.map(() => '---'), ...rows].map(row => '| ' + row.map(md).join(' | ') + ' |').join('\n');
const csv = (name, rows, columns) => { const cell = x => '"' + String(x == null ? '' : typeof x === 'object' ? JSON.stringify(x) : x).replaceAll('"', '""') + '"'; write(name, [columns, ...rows.map(row => columns.map(col => row[col]))].map(row => row.map(cell).join(',')).join('\n')); };
const snapshot = read('database-extract.json');
const data = snapshot.data;
const people = read('people.json');
const roles = read('roles.json');
const schema = read('schema-fields.json');
if (fs.existsSync(path.join(OUT, 'workflow-extract.json'))) {
  const extra = read('workflow-extract.json');
  for (const [model, records] of Object.entries(extra.data)) {
    if (!data[model]) data[model] = records;
    else data[model] = data[model].map(row => ({ ...row, ...records.find(r => (r.id || r.organizationId) === (row.id || row.organizationId)) }));
  }
  for (const model of read('workflow-schema-fields.json')) {
    const existing = schema.find(s => s.model === model.model);
    if (!existing) schema.push(model);
    else for (const field of model.fields) if (!existing.fields.some(f => f.name === field.name)) existing.fields.push(field);
  }
}
const evidence = [];
if (fs.existsSync(path.join(OUT, 'runtime/tax-classification-current-data.json'))) {
  const tax = read('runtime/tax-classification-current-data.json');
  const {Prisma}=require('@prisma/client');
  for(const [modelName,key] of [['Item','items'],['Unit','units'],['TaxRate','taxes']]) {
    const model=Prisma.dmmf.datamodel.models.find(m=>m.name===modelName);
    const selected=model.fields.filter(f=>f.kind!=='object'&&Object.hasOwn(tax.data[key][0]||{},f.name));
    data[modelName]=tax.data[key].map(r=>Object.fromEntries(selected.map(f=>[f.name,r[f.name]])));
    schema.push({model:modelName,table:model.dbName||modelName,fields:selected.map(f=>({name:f.name,column:f.dbName||f.name,type:f.type,list:f.isList,required:f.isRequired,id:f.isId,unique:f.isUnique,allowedValues:f.kind==='enum'?Prisma.dmmf.datamodel.enums.find(e=>e.name===f.type)?.values.map(v=>v.name):undefined,relations:model.fields.filter(r=>r.relationFromFields?.includes(f.name)).map(r=>({target:r.type,from:r.relationFromFields,to:r.relationToFields,onDelete:r.relationOnDelete}))})),uniqueFields:model.uniqueFields});
  }
}
const cache = new Map();
// Evaluate the repository's pure functions in isolation. No database/service imports run.
function pure(rel, selected, globals = {}) {
  const key = rel + JSON.stringify(selected || []);
  if (cache.has(key)) return cache.get(key);
  const file = path.join(ROOT, rel);
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const chosen = selected ? ast.statements.filter(node => ts.isFunctionDeclaration(node) && selected.includes(node.name?.text)).map(node => node.getText(ast)).join('\n') : source;
  if (selected && selected.some(name => !ast.statements.some(node => ts.isFunctionDeclaration(node) && node.name?.text === name))) throw new Error('Missing pure function: ' + rel);
  const output = ts.transpileModule(chosen, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const allowed = new Set(['config/permissions.ts', 'lib/security/rbac-permissions.ts', 'services/modules/module-control-contracts.ts', 'services/modules/module-catalog.service.ts']);
  const safeRequire = request => {
    if (request === 'server-only') return {};
    const target = path.relative(ROOT, path.resolve(path.dirname(file), request)).replaceAll('\\', '/') + '.ts';
    if (!allowed.has(target)) throw new Error('Non-pure import refused: ' + target);
    return pure(target);
  };
  vm.runInNewContext(output, { exports: module.exports, module, require: safeRequire, Date, Set, Map, ...globals }, { filename: rel, timeout: 10000 });
  cache.set(key, module.exports);
  evidence.push({ path: rel, sha256: crypto.createHash('sha256').update(source).digest('hex'), functions: selected || 'pure module', method: 'TypeScript transpile + isolated VM; imports allowlisted; no DB service imports' });
  return module.exports;
}
const rbac = pure('lib/security/rbac-permissions.ts');
const moduleContracts = pure('services/modules/module-control-contracts.ts');
const catalog = pure('services/modules/module-catalog.service.ts');
const entitlement = pure('services/modules/module-entitlement.service.ts', ['deriveLegacyEntitlements', 'evaluateModuleEntitlement', 'entitlementBlockReason', 'normalizeNow'], { ...moduleContracts, ...catalog });
const moduleRows = [];
for (const org of data.Organization) {
  const config = data.TenantModuleConfiguration.find(c => c.organizationId === org.id);
  const grants = config ? data.TenantModuleGrant.filter(g => g.organizationId === org.id) : undefined;
  for (const entry of catalog.getModuleCatalog()) {
    const base = { organizationId: org.id, moduleSlug: entry.slug, requestedModules: org.requestedModules, explicitEntitlements: grants, surfaceType: 'action', surface: 'audit.snapshot.evaluation', accessIntent: 'write', now: snapshot.observedAt };
    const observe = entitlement.evaluateModuleEntitlement(base);
    const enforce = entitlement.evaluateModuleEntitlement({ ...base, mode: 'enforce' });
    moduleRows.push({ organizationId: org.id, organizationName: org.name, moduleSlug: entry.slug, core: entry.core, configurationAuthority: config ? 'managed grants' : 'legacy requestedModules', configurationRevision: config?.revision ?? null, activeRevision: config?.activeRevision ?? null, grantId: grants?.find(g => g.moduleSlug === entry.slug)?.id ?? null, storedStatus: observe.entitlement?.status ?? null, currentDefaultMode: observe.mode, defaultResult: observe.result, defaultAllowed: observe.allowed, wouldBlockUnderEnforcement: enforce.wouldBlock, reason: enforce.reason, missingDependencies: enforce.missingDependencies, limitation: 'Pure snapshot entitlement evaluation, not a live authenticated action. Individual workflow guards can explicitly enforce even when the default is observe.' });
  }
}
save('module-entitlements.json', moduleRows);
csv('module-entitlements.csv', moduleRows, ['organizationId','organizationName','moduleSlug','configurationAuthority','configurationRevision','activeRevision','grantId','storedStatus','currentDefaultMode','defaultResult','wouldBlockUnderEnforcement','reason','missingDependencies']);
write('MODULE_ENTITLEMENTS.md', '# Module entitlement snapshot\n\nThe repository default is `observe`. A `would_block` result is an enforcement-readiness gap, not proof that every current screen/action is denied. Workflow-specific enforcement is recorded in capability contracts. This report evaluates the exact pure repository functions without importing database services.\n\n' + table(['Organization ID','Module','Grant status','Default result','Would deny if enforced','Reason'], moduleRows.map(r => [r.organizationId,r.moduleSlug,r.storedStatus || 'no grant',r.defaultResult,r.wouldBlockUnderEnforcement,r.reason])));

const fields = [];
for (const model of schema) for (const field of model.fields) {
  const records = data[model.model];
  const values = records.map(row => {
    const value = row[field.name];
    let status = value == null || value === '' || Array.isArray(value) && !value.length ? 'missing' : 'present-unverified';
    let reason = status === 'missing' ? 'No stored value; requiredness depends on the referenced workflow and stage.' : 'Stored value extracted; presence is not authority or semantic validation.';
    if (status !== 'missing' && (field.id || field.name === 'organizationId')) { status = 'present-valid'; reason = 'Extracted internal record identifier; tenant and FK integrity checked separately.'; }
    if (status !== 'missing' && field.allowedValues) { status = field.allowedValues.includes(value) ? 'present-valid' : 'invalid'; reason = 'Compared with generated Prisma enum; business workflow eligibility remains separate.'; }
    for (const relation of field.relations) {
      if (value == null || relation.from.length !== 1 || !data[relation.target]) continue;
      const target = data[relation.target].find(r => r[relation.to[0]] === value);
      if (!target) { status = 'invalid'; reason = 'Referenced record is absent from the extracted model.'; }
      else if (row.organizationId && target.organizationId && row.organizationId !== target.organizationId) { status = 'invalid'; reason = 'Referenced record belongs to another tenant.'; }
      else { status = 'present-valid'; reason = 'Referenced record exists in the tenant-consistent snapshot; appointment/qualification is not inferred.'; }
    }
    return { recordId: row.id || row.organizationId, organizationId: row.organizationId || (model.model === 'Organization' ? row.id : null), value, status, reason };
  });
  const statuses = [...new Set(values.map(v => v.status))];
  fields.push({ id: model.model + '.' + field.name, model: model.model, table: model.table, field: field.name, column: field.column, type: field.type, list: field.list, schemaRequired: field.required, unique: field.unique || field.id, allowedValues: field.allowedValues || null, relationshipConstraints: field.relations, format: field.type === 'DateTime' ? 'ISO 8601 timestamp (stored PostgreSQL/Prisma date); UTC in this export' : field.type === 'String' && (field.id || /Id$/.test(field.name)) ? 'Existing internal string identifier; not necessarily UUID; do not manufacture replacements' : field.allowedValues ? 'Exact enum value' : field.list ? 'Array of declared scalar type' : 'Declared Prisma scalar; workflow-specific validation in capability/assurance contracts', recordCount: values.length, status: !values.length ? 'missing' : statuses.includes('invalid') ? 'invalid' : statuses.length === 1 ? statuses[0] : 'present-unverified', statusCounts: values.reduce((out,v) => (out[v.status] = (out[v.status] || 0) + 1, out), {}), sourceQuery: 'extraction-audit.json#model_' + model.model, sourceSchema: 'prisma/schema.prisma', values, gateConsumers: [], supplyRoute: 'Extract existing IDs and values here; only missing authority, external evidence and business decisions go to USER_INPUT_CHECKLIST.md.', note: 'Schema nullability is not a statement that every optional field or every empty model must be populated. No signed/evidence content was validated solely from a reference or hash.' });
}
save('field-register.json', fields);
csv('field-register.csv', fields, ['id','model','table','field','column','type','list','schemaRequired','unique','allowedValues','relationshipConstraints','format','recordCount','status','statusCounts','gateConsumers','sourceQuery','supplyRoute']);
write('FIELD_REGISTER.md', '# Required fields and available identifiers\n\n`field-register.json` contains the exact current record IDs and safe values, type, database column, enums, FK constraints and presence status for every selected field. `capability-contracts.json` identifies operational requirements; `assurance/required-input-contracts.json` identifies approval/document requirements. An empty optional model is a conditional workflow gap, not automatically a blocker for development. Secrets, credential material, salary/bank information and tax identifier values were excluded.\n\n' + table(['Model / table','Fields extracted','Rows','Query'], schema.map(s => [s.model + ' / ' + s.table,s.fields.map(f => f.name).join(', '),data[s.model].length,'model_' + s.model])));

const candidates = people.filter(p => p.provenance === 'SUPPLIED_CANDIDATE_APPOINTMENT_UNVERIFIED');
const names = candidates.map(p => ({ name:p.displayName, roleCodes:p.roleCodes, userId:p.id, roleIds:p.roleIds, employeeIds:p.employeeIds, organizationId:p.organizationId, email:p.email, locationIds:p.locationIds, accountUsable:p.accountUsable, mfaEnabledAt:p.mfaEnabledAt, authorityStatus:'Candidate nomination only; no verified appointment, signature or professional qualification', source:'PayrollEmployee provenance metadata; prisma/compliance-hris-role-seed.ts; original working-copy documents', discrepancies:p.roleCodes.includes('checker')?'Current database: Yonga Springfield; refreshed working-copy paragraph 38: Yonga Claude. Owner must resolve nomination.':p.displayName==='Kouatchoua mMark'?'Preserved exact spelling. Confirm identity and whether distinct from product approver Kouatchoua Mark.':p.displayName==='Tamen Marceline'?'Same name on separate maker and order_to_cash_product_owner accounts; do not count as independent humans.':p.displayName==='Yonga Springfield'?'Name occurs on checker and security_owner accounts; do not count as independent humans.':null }));
save('named-candidates.json', names);
csv('named-candidates.csv', names, ['name','roleCodes','userId','roleIds','employeeIds','organizationId','email','locationIds','accountUsable','mfaEnabledAt','authorityStatus','discrepancies']);
write('ROLE_PERSON_REGISTER.md', '# Existing people, roles and proposed gate owners\n\nSnapshot: '+snapshot.observedAt+'. There are '+people.length+' users, '+roles.length+' tenant role records and '+new Set(roles.map(r=>r.code)).size+' distinct role codes. Current assignments come from `_UserRoles.A = Role.id` and `_UserRoles.B = User.id`; no cross-tenant memberships were found. Role codes are not job vacancies: only the workflow contracts establish required capabilities.\n\nThe '+names.length+' primary-tenant candidate assignments below preserve existing nominations. Account flags pass preliminary checks, but none has an MFA-enabled timestamp. No entry is certified as a qualified or appointed human by this audit. Technical permission eligibility is separately evaluated in `capability-eligibility.json`; a name or role label alone never satisfies a guard.\n\n'+table(['Name (exact stored form)','Role code','User ID','Role ID','Employee ID','Scope / discrepancy'],names.map(p=>[p.name,p.roleCodes.join(', '),p.userId,p.roleIds.join(', '),p.employeeIds.join(', '),p.organizationId+' / '+p.locationIds.join(', ')+(p.discrepancies?' — '+p.discrepancies:'')]))+'\n\n## All roles, including supporting and development roles\n\nThe complete 180-account register, emails, status flags, organization/employee/location/manager links and permissions are in `people.json` / `people.csv`. Full assignments and permission arrays are in `roles.json` / `roles.csv`. A role absent from an inspected capability contract is marked supporting/unmapped; that does not prove it has no other application use.\n\n'+table(['Role code','Label','Tenant role IDs','Assigned accounts','Permission variants'],read('roles-by-code.json').map(r=>[r.code,r.records[0].nameEn,r.records.map(x=>x.organizationId+': '+x.id).join('<br>'),r.records.map(x=>x.assignedNames.join(', ')).join('<br>'),r.permissionVariants.length]))+'\n\n## Independence and identity resolution\n\nDo not count separate accounts as separate humans. The repeated Tamen Marceline and Yonga Springfield names need an independence check for any workflow in which both would participate. Resolve checker Yonga Claude (working copy) versus Yonga Springfield (database). Confirm whether Kouatchoua mMark and Kouatchoua Mark identify different people; do not silently correct or merge them.\n\nNo delegation rows or accountant consent grants were found. This does not prevent ordinary engineering, but a workflow requiring those records cannot infer them from an administrator role. Seeded test-domain email addresses are development identifiers, not evidence of a deliverable production work mailbox.');
save('pure-evaluation-evidence.json', evidence);
console.log(JSON.stringify({fields:fields.length,namedCandidates:names.length,moduleEvaluations:moduleRows.length,people:people.length,roleCodes:new Set(roles.map(r=>r.code)).size}));

const capabilitySource = read('capability-contracts.json');
const capabilities = capabilitySource.contracts;
const operating = pure('services/operating-access/operating-access-scope-contracts.ts');
const eligibility = [];
for (const c of capabilities) for (const org of data.Organization) {
  const moduleState = moduleRows.find(m=>m.organizationId===org.id && m.moduleSlug===c.module.slug);
  const moduleEnforced = c.module.enforcement.startsWith('ENFORCED');
  const moduleBlocked = moduleEnforced && Boolean(moduleState?.wouldBlockUnderEnforcement);
  const accounts = people.filter(p=>p.organizationId===org.id).map(p=>{
    const missingAll = c.permissions.allOf.filter(permission=>!rbac.hasRbacPermission(p.permissions,permission));
    const anyMatched = !c.permissions.anyOf.length || c.permissions.anyOf.some(permission=>rbac.hasRbacPermission(p.permissions,permission));
    const permissionEligible = !missingAll.length && anyMatched;
    let scopeStatus = 'TRANSACTION_SCOPE_AND_STATE_REQUIRE_RUNTIME_VALIDATION';
    let knownScopeBlocked = false;
    if (c.id.startsWith('CAP-BRANCH')) {
      const tenantAuthority=operating.resolveTenantWideOperatingAuthority({isSuperUser:false,roleCodes:p.roleCodes});
      const managed=data.Location.filter(l=>l.organizationId===p.organizationId&&l.managerId===p.id&&l.isActive&&!l.deletedAt);
      knownScopeBlocked=!tenantAuthority&&!managed.length;
      scopeStatus=tenantAuthority?'TENANT_WIDE_BY_STORED_ROLE':managed.length?'MANAGED_LOCATIONS:'+managed.map(l=>l.id).join(','):'NO_STORED_TENANT_ROLE_OR_ACTIVE_MANAGER_LOCATION';
    }
    if(c.id==='CAP-HRIS-001'){
      knownScopeBlocked=!p.employeeContexts.some(e=>e.organizationId===p.organizationId&&!e.deletedAt);
      scopeStatus=knownScopeBlocked?'NO_LINKED_NONDELETED_EMPLOYEE':'OWN_EMPLOYEE_LINK_PRESENT; PAYSLIP_STATUS_STILL_REQUIRED';
    }
    return { userId:p.id,name:p.displayName,roleIds:p.roleIds,roleCodes:p.roleCodes,employeeIds:p.employeeIds,locationIds:p.locationIds,provenance:p.provenance,intendedRole:p.roleCodes.some(r=>c.intendedRoleCodes.includes(r)),accountFlagsPass:p.accountUsable,permissionEligible,missingPermissions:missingAll,anyOfSatisfied:anyMatched,moduleBlocked,knownScopeBlocked,scopeStatus,conditionalTechnicalCandidate:p.accountUsable&&permissionEligible&&!moduleBlocked&&!knownScopeBlocked,humanAuthority:'UNVERIFIED; no verified appointment established',runtimeConditions:c.scopeConstraints,distinctActorRules:c.distinctActorRules };
  }).filter(p=>p.intendedRole||p.permissionEligible).sort((a,b)=>Number(b.provenance.startsWith('SUPPLIED'))-Number(a.provenance.startsWith('SUPPLIED'))||a.name.localeCompare(b.name));
  const available=accounts.filter(p=>p.conditionalTechnicalCandidate);
  const intended=accounts.filter(p=>p.intendedRole);
  const status=moduleBlocked?'BLOCKED_MODULE_ENTITLEMENT':!available.length?'NO_CANDIDATE_PASSES_CHECKED_ACCOUNT_PERMISSION_SCOPE_CONDITIONS':'CONDITIONAL_TECHNICAL_CANDIDATES';
  eligibility.push({id:c.id+':'+org.id,capabilityId:c.id,label:c.label,organizationId:org.id,domain:c.domain,status,requiredPermissions:c.permissions,moduleBoundary:c.module,moduleSnapshot:moduleState||null,intendedRoleCodes:c.intendedRoleCodes,accounts,conditionalCandidateIds:available.map(p=>p.userId),verifiedHumanOwnerIds:[],intendedCandidateGaps:intended.filter(p=>!p.conditionalTechnicalCandidate).map(p=>({userId:p.userId,name:p.name,missingPermissions:p.missingPermissions,accountFlagsPass:p.accountFlagsPass,moduleBlocked:p.moduleBlocked,scopeStatus:p.scopeStatus})),scopeConstraints:c.scopeConstraints,distinctActorRules:c.distinctActorRules,requiredFieldRefs:c.requiredDataFields.map(f=>f.model+'.'+f.field),stages:c.stages,qualifiedHumanRequirement:c.qualifiedHumanRequirement,sources:c.sources,nextAction:moduleBlocked?'If this workflow is in scope, authorize and complete the module configuration through its supported lifecycle, then validate the actor and transaction.':'Use candidate accounts for isolated development only after transaction/state/fresh-auth checks. For real operations, verify appointment, independence and any required qualification.',limitations:['No login, fresh-auth challenge, workflow transition, approval or posting was executed.','Session freshness and conditional service predicates are not certified by this snapshot.','A synthetic or nominated account cannot by itself establish a legitimate pilot/production human owner.']});
}
save('capability-eligibility.json',eligibility);
csv('capability-eligibility.csv',eligibility,['id','capabilityId','label','organizationId','status','requiredPermissions','moduleBoundary','conditionalCandidateIds','verifiedHumanOwnerIds','intendedCandidateGaps','requiredFieldRefs','nextAction']);
write('CAPABILITY_ELIGIBILITY.md','# Who can perform each required action\n\nThese are conditional technical candidates, not verified human appointments or successful action executions. Every account was joined through its actual tenant membership and evaluated with the repository permission helper. Wildcard access does not imply high-risk permission. Branch manager scope and own-employee links were also checked. Fresh authentication, record state, source evidence and separation of duties remain transaction-specific.\n\n'+table(['Capability','Tenant','Status','Named nominees passing checked conditions','Other technical candidates','Intended-role gaps'],eligibility.map(e=>[e.capabilityId+' '+e.label,e.organizationId,e.status,e.accounts.filter(p=>p.conditionalTechnicalCandidate&&p.provenance.startsWith('SUPPLIED')).map(p=>p.name+' ('+p.roleCodes.join(',')+')').join('; ')||'none',e.accounts.filter(p=>p.conditionalTechnicalCandidate&&!p.provenance.startsWith('SUPPLIED')).map(p=>p.name+' ('+p.roleCodes.join(',')+')').join('; ')||'none',e.intendedCandidateGaps.map(p=>p.name+': '+(p.missingPermissions.join(', ')||p.moduleBlocked&&'module denied'||p.scopeStatus)).join('; ')]))+'\n\n## Minimum independent actors\n\n'+table(['Workflow','Minimum distinct actors','Constraint'],capabilitySource.minimumDistinctResponsibilities.map(r=>[r.workflow,r.minimumActors,r.reason]))+'\n\nThree distinct operational people are the technical lower bound for each supplier-payment and payroll approval/release chain. That is not a claim that three people suffice for the entire enterprise. Specialists, POS decisions, branch coverage, backups and qualifications add responsibilities. The same properly authorized person may work across unrelated modules; nobody may approve their own transaction where the contract requires independence. Separate login IDs alone do not prove separate people. Missing optional creator IDs prevent proof of independence.');

const originalSchema=read('schema-fields.json');
for(const f of fields){
  f.gateConsumers=capabilities.filter(c=>c.requiredDataFields.some(r=>r.model===f.model&&r.field===f.field)).map(c=>c.id);
  if(!originalSchema.some(m=>m.model===f.model&&m.fields.some(x=>x.name===f.field)))f.sourceQuery='workflow-extraction-audit.json#workflow_'+f.model;
  const catalogKey={Item:'items',Unit:'units',TaxRate:'taxes'}[f.model];
  if(catalogKey){f.sourceQuery='runtime/tax-classification-current-data.json#queries.'+catalogKey;f.gateConsumers=[f.model==='Unit'?'STOCKING_UNIT_CONFIRMATION':'PRODUCT_TAX_CLASSIFICATION_UNVERIFIED'];}
}
const assurance=read('assurance/gate-assessment.json');
const inputs=read('assurance/required-input-contracts.json');
const externalFields=inputs.contracts.flatMap(c=>c.fields.map(f=>({id:'EXTERNAL:'+c.id+':'+f.name,contractId:c.id,field:f.name,storage:c.storage||'Deployment environment; managed configuration, no secret values in this report',type:f.type,format:f.format,requiredness:'Per gate contract; conditional stage and optional exceptions are stated in format/source',currentValue:f.currentValue??null,status:/MISSING|INVALID/.test(f.currentState||'')?'missing':'present-unverified',source:c.source||c.storage||c.id,gateConsumers:[c.gate||c.id],providedBy:f.providedBy||c.providedBy||'Provider or accountable authority specified by contract',stage:c.stage,note:f.currentState||'Presence is not approval or certification'})));
save('field-register.json',fields);save('external-field-register.json',externalFields);
csv('field-register.csv',fields,['id','model','table','field','column','type','list','schemaRequired','unique','allowedValues','relationshipConstraints','format','recordCount','status','statusCounts','gateConsumers','sourceQuery','supplyRoute']);
csv('external-field-register.csv',externalFields,['id','contractId','field','storage','type','format','requiredness','currentValue','status','gateConsumers','providedBy','stage']);
save('pure-evaluation-evidence.json',evidence);
console.log(JSON.stringify({capabilityTenantEvaluations:eligibility.length,conditional:eligibility.filter(e=>e.status==='CONDITIONAL_TECHNICAL_CANDIDATES').length,moduleBlocked:eligibility.filter(e=>e.status==='BLOCKED_MODULE_ENTITLEMENT').length,noCheckedCandidate:eligibility.filter(e=>e.status.startsWith('NO_CANDIDATE')).length,dbFieldDefinitions:fields.length,externalFieldDefinitions:externalFields.length}));
