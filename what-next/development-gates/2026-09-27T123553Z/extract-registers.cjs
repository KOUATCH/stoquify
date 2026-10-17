const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {execFileSync}=require('child_process');
const {Client}=require('pg');
const {Prisma}=require('@prisma/client');
const ROOT=path.resolve(__dirname,'../../..');
const OUT=__dirname;
require('dotenv').config({path:path.join(ROOT,'.env'),quiet:true});
const save=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n');
const quote=value=>'"'+value.replaceAll('"','""')+'"';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const allow={
 Organization:['id','name','tradeName','slug','country','countryCode','currency','timezone','defaultLocale','requestedModules','isActive','deletedAt','onboardingCompletedAt'],
 User:['id','name','email','firstName','lastName','jobTitle','organizationId','isActive','isVerified','emailVerified','isLocked','lockedUntil','mfaEnabledAt','preferredLocale'],
 Role:['id','code','nameEn','nameFr','description','permissions','organizationId'],
 Location:['id','name','code','type','organizationId','managerId','isActive','isDefault','deletedAt','requiresApproval','allowNegativeStock'],
 PayrollEmployee:['id','organizationId','userId','employeeNumber','displayName','status','countryCode','locationId','department','jobTitle','deletedAt'],
 HrisOrgUnit:['id','organizationId','code','name','type','status','parentId','effectiveFrom','effectiveTo'],
 HrisPosition:['id','organizationId','orgUnitId','locationId','code','title','status','effectiveFrom','effectiveTo'],
 HrisEmploymentAssignment:['id','organizationId','employeeId','positionId','orgUnitId','type','status','effectiveFrom','effectiveTo'],
 HrisManagerDelegation:['id','organizationId','delegatorEmployeeId','delegateEmployeeId','scopeOrgUnitId','authority','status','effectiveFrom','effectiveTo','approvalEvidenceHash','approvedById','revokedAt'],
 OrganizationAccountingSettings:['id','organizationId','accountingEnabled','setupStatus','countryPack','baseCurrency','fiscalYearStartMonth','fiscalYearStartDay','inventoryValuationPolicy','roundingMode','roundingScale','taxRegime','payrollCnpsFamilyAllowanceSector','payrollCnpsOccupationalRiskGroup','setupCompletedAt','setupCompletedById'],
 FiscalYear:['id','organizationId','name','startDate','endDate','status','closedAt','closedById'],
 AccountingPeriod:['id','organizationId','fiscalYearId','periodNumber','name','startDate','endDate','status','lockedAt','closedAt','closedById'],
 AccountantAccessGrant:['id','organizationId','accountantUserId','accountantFirmName','role','status','consentGrantedById','consentGrantedAt','consentEvidenceHash','effectiveFrom','expiresAt','revokedById','revokedAt'],
 AccountantReview:['id','organizationId','periodId','closeRunId','status','reviewerId','openedById','reviewedAt'],
 CloseRun:['id','organizationId','periodId','status','readinessScore','criticalBlockerCount','highBlockerCount','asOf','runById','completedAt'],
 HrisWorkCalendar:['id','organizationId','code','name','countryCode','timezone','version','status','effectiveFrom','effectiveTo','sourceHash','reviewedById','reviewedAt'],
 HrisLeavePolicy:['id','organizationId','code','name','countryCode','version','annualEntitlementMinutes','carryOverLimitMinutes','effectiveFrom','effectiveTo','status','preparedById','approvedById','approvedAt','sourceHash','approvalEvidenceHash'],
 PayrollContract:['id','organizationId','employeeId','contractNumber','type','status','effectiveFrom','effectiveTo','currency','signedDocumentHash','activatedBusinessEventId','deletedAt'],
 ProviderAccount:['id','organizationId','paymentRailId','providerCode','displayName','status','countryCode','currencyCode','settlementLagDays','archivedAt','settlementLedgerAccountId','suspenseLedgerAccountId','feeLedgerAccountId'],
 ComplianceAdapterConfig:['id','organizationId','countryCode','authorityChannel','adapterKey','environment','status','countryPackVersion','countryPackResolutionHash','capabilityStatus','credentialReference','credentialExpiresAt','credentialRotatedAt','credentialRotatedById','officialSpecTitle','officialSpecVersion','officialSpecPublishedAt','officialSpecEffectiveFrom','officialSpecReference','officialSpecHash','reviewStatus','reviewedById','reviewedAt','reviewerQualification','reviewerConflictDeclared','reviewEvidenceHash','configHash','createdById','updatedById','approvedById','approvedAt','disabledAt'],
 TenantModuleConfiguration:['organizationId','revision','activeRevision','selectedModules','activeModules','newWorkStoppedModules','legacyUnknownValues','manifestHash'],
 TenantModuleGrant:['id','organizationId','moduleSlug','status','source','startsAt','endsAt','readOnly','trial','revision'],
 TenantModuleConfigurationCommand:['id','organizationId','idempotencyKey','expectedRevision','resultRevision','state','selectedModules','previousModules','previewHash','errorCode','actorId'],
 TenantModuleLifecycleOperation:['id','organizationId','commandId','desiredRevision','baseActiveRevision','desiredModules','stopNewWorkModules','authorityHash','state','version','errorCode','actorId','completedAt'],
 TenantModuleLifecycleStep:['id','organizationId','operationId','moduleSlug','stepKey','state','code','href','evidenceHash','checkedAt'],
 AgentDefinition:['id','key','name','ownerModuleSlug','status','rolloutMode','riskLevel','allowedToolKeys','allowedSkillKeys'],
 AgentActivationPackage:['id','organizationId','agentKey','releaseVersion','environment','commitSha','manifestHash','allowedRoleCodes','activationStartsAt','activationEndsAt','state','version','requestedById','activatedById','activatedAt','suspendedAt','retiredAt','retiredById','lastReconciledAt','reconciliationState','alertTransportReady'],
 AgentActivationOwner:['id','packageId','responsibility','primaryUserId','backupUserId','escalationRouteRef','runbookVersion','acceptedAt','validUntil','coverageStartsAt','coverageEndsAt'],
 AgentActivationApproval:['id','packageId','approvalType','decision','approverId','evidenceHash','decidedAt','expiresAt','revokedAt'],
 AgentPilotCertification:['id','packageId','commitSha','manifestHash','suiteVersion','ciRunId','result','reportHash','passedAt','expiresAt'],
 BranchDailyCloseSignOff:['id','organizationId','branchDailyCloseRunId','status','signedReadinessSourceHash','signedEvidenceHash','signedEvidenceObservedAt','signedById','signedAt','authAssuranceLevel','freshAuthAt','invalidatedById','invalidatedAt'],
};
function csv(name,rows,columns){const cell=x=>'"'+String(x==null?'':typeof x==='object'?JSON.stringify(x):x).replaceAll('"','""')+'"';fs.writeFileSync(path.join(OUT,name),[columns,...rows.map(r=>columns.map(c=>r[c]))].map(row=>row.map(cell).join(',')).join('\n')+'\n');}
async function main(){
 const url=new URL((process.env.DATABASE_URL||'').replace(/\$\{([^}]+)\}/g,(_,k)=>process.env[k]||''));
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!/(local|replay|dev|test)/i.test(url.pathname))throw new Error('Only the configured local development source is allowed');
 const client=new Client({connectionString:url.toString(),application_name:'stoquify_development_gates_readonly',options:'-c default_transaction_read_only=on -c statement_timeout=30000'});
 const evidence=[],data={},schema=[];await client.connect();
 const query=async(id,sql)=>{const start=Date.now();const result=await client.query(sql);evidence.push({id,sql,rowCount:result.rowCount,elapsedMs:Date.now()-start});return result.rows;};
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const identity=(await query('database_context',"SELECT current_database() AS database,current_schema() AS schema,current_setting('transaction_read_only') AS transaction_read_only,current_setting('default_transaction_read_only') AS default_transaction_read_only,transaction_timestamp() AS observed_at"))[0];
  if(identity.transaction_read_only!=='on'||identity.default_transaction_read_only!=='on')throw new Error('Read-only enforcement missing');
  for(const [name,names] of Object.entries(allow)){
   const model=Prisma.dmmf.datamodel.models.find(m=>m.name===name);if(!model)throw new Error('Required model missing: '+name);
   const fields=names.map(n=>{const f=model.fields.find(x=>x.name===n);if(!f||f.kind==='object')throw new Error('Invalid allowlisted field '+name+'.'+n);return f;});
   const select=fields.map(f=>quote(f.dbName||f.name)+(f.dbName?' AS '+quote(f.name):''));
   if(name==='Organization')select.push('(length(coalesce("taxIdentifier",\'\'))>0) AS "taxIdentifierPresent"');
   if(name==='PayrollEmployee')for(const key of ['seedSource','sourceDocument','sourceClassification','roleCode','appointmentStatus','externalQualificationStatus','signatureStatus'])select.push('metadata->>'+"'"+key+"'"+' AS '+quote('provenance_'+key));
   const rows=await query('model_'+name,'SELECT '+select.join(',')+' FROM public.'+quote(model.dbName||model.name)+' ORDER BY '+quote(names.includes('id')?'id':'organizationId'));
   // Credential references identify a secret-manager entry. They are never resolved.
   data[name]=rows;
   schema.push({model:name,table:model.dbName||model.name,fields:fields.map(f=>({name:f.name,column:f.dbName||f.name,type:f.type,list:f.isList,required:f.isRequired,id:f.isId,unique:f.isUnique,allowedValues:f.kind==='enum'?Prisma.dmmf.datamodel.enums.find(e=>e.name===f.type)?.values.map(v=>v.name):undefined,relations:model.fields.filter(r=>r.relationFromFields?.includes(f.name)).map(r=>({target:r.type,from:r.relationFromFields,to:r.relationToFields,onDelete:r.relationOnDelete}))})),uniqueFields:model.uniqueFields});
  }
  const joins=await query('role_memberships','SELECT "A" AS "roleId","B" AS "userId" FROM public."_UserRoles" ORDER BY "A","B"');data.UserRoles=joins;
  const migrations=await query('migration_history','SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
  const crossTenant=joins.filter(j=>{const u=data.User.find(u=>u.id===j.userId),r=data.Role.find(r=>r.id===j.roleId);return !u||!r||u.organizationId!==r.organizationId;});
  const people=data.User.map(u=>{
   const roles=joins.filter(j=>j.userId===u.id).map(j=>data.Role.find(r=>r.id===j.roleId)).filter(Boolean);
   const employees=data.PayrollEmployee.filter(e=>e.userId===u.id);
   const metadataClass=employees.map(e=>e.provenance_sourceClassification).filter(Boolean);
   let provenance='UNVERIFIED_IDENTITY_AND_AUTHORITY';
   if(metadataClass.includes('SUPPLIED_CANDIDATE')&&u.organizationId==='rds_org_001')provenance='SUPPLIED_CANDIDATE_APPOINTMENT_UNVERIFIED';
   else if(u.id.startsWith('sysseed_user_')||metadataClass.some(x=>x.startsWith('SYNTHETIC')))provenance='CONFIRMED_SYNTHETIC_PERSONA';
   else if(u.email.endsWith('@stockflow.test'))provenance='DEVELOPMENT_ACCOUNT_HUMAN_AUTHORITY_UNVERIFIED';
   const org=data.Organization.find(o=>o.id===u.organizationId);
   return {...u,displayName:u.name||[u.firstName,u.lastName].filter(Boolean).join(' '),organizationName:org?.name,roleIds:roles.map(r=>r.id),roleCodes:roles.map(r=>r.code),permissions:[...new Set(roles.flatMap(r=>r.permissions))].sort(),employeeIds:employees.map(e=>e.id),locationIds:[...new Set([...employees.map(e=>e.locationId),...data.Location.filter(l=>l.managerId===u.id).map(l=>l.id)].filter(Boolean))],managedLocationIds:data.Location.filter(l=>l.managerId===u.id).map(l=>l.id),employeeContexts:employees,provenance,humanAuthority:'NOT_VERIFIED_BY_ACCOUNT_OR_ROLE',accountUsable:u.isActive&&u.isVerified&&u.emailVerified&&!u.isLocked&&(!u.lockedUntil||new Date(u.lockedUntil)<=new Date())&&Boolean(org?.isActive&&!org?.deletedAt)};
  });
  const roles=data.Role.map(r=>({...r,organizationName:data.Organization.find(o=>o.id===r.organizationId)?.name,assignedUserIds:joins.filter(j=>j.roleId===r.id).map(j=>j.userId),assignedNames:people.filter(p=>p.roleIds.includes(r.id)).map(p=>p.displayName)}));
  const rolesByCode=[...new Set(roles.map(r=>r.code))].sort().map(code=>({code,records:roles.filter(r=>r.code===code),permissionVariants:[...new Set(roles.filter(r=>r.code===code).map(r=>JSON.stringify([...r.permissions].sort())))]}));
  await client.query('ROLLBACK');
  save('database-extract.json',{observedAt:identity.observed_at,target:{host:url.hostname,port:url.port||'5432',database:identity.database},data});
  save('schema-fields.json',schema);save('people.json',people);save('roles.json',roles);save('roles-by-code.json',rolesByCode);save('memberships.json',joins);
  csv('people.csv',people,['id','displayName','email','organizationId','organizationName','roleIds','roleCodes','employeeIds','locationIds','managedLocationIds','isActive','isVerified','emailVerified','isLocked','lockedUntil','mfaEnabledAt','accountUsable','provenance','humanAuthority']);
  csv('roles.csv',roles,['id','code','nameEn','nameFr','description','organizationId','organizationName','permissions','assignedUserIds','assignedNames']);
  const git=(args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
  save('extraction-audit.json',{generatedAt:new Date().toISOString(),databaseContext:identity,target:{host:url.hostname,port:url.port||'5432',database:identity.database},commit:git(['rev-parse','HEAD']),worktree:git(['status','--short']).split('\n'),counts:{organizations:data.Organization.length,roleRecords:roles.length,roleCodes:rolesByCode.length,users:people.length,memberships:joins.length,employees:data.PayrollEmployee.length},crossTenantMemberships:crossTenant,migrationCount:migrations.length,unfinishedMigrations:migrations.filter(m=>!m.finished_at&&!m.rolled_back_at),latestMigration:migrations.at(-1)?.migration_name,selectedModelCounts:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length])),queries:evidence,readOnlyVerified:true,transactionEnded:'ROLLBACK',mutationStatementsExecuted:0,secretFieldsSelected:false,provenanceSource:'prisma/compliance-hris-role-seed.ts:182-192,385-393 and selected employee metadata; synthetic ID namespace for new personas',fingerprints:{roles:sha(JSON.stringify(roles)),people:sha(JSON.stringify(people))}});
  console.log(JSON.stringify({target:identity.database,readOnly:identity.transaction_read_only,organizations:data.Organization.length,roles:roles.length,roleCodes:rolesByCode.length,users:people.length,memberships:joins.length,crossTenantMemberships:crossTenant.length,provenance:people.reduce((s,p)=>(s[p.provenance]=(s[p.provenance]||0)+1,s),{})}));
 }finally{await client.end();}
}
main().catch(e=>{console.error(String(e.message).replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_URL]'));process.exitCode=1;});
