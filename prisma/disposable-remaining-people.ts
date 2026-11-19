/** Upstream people/onboarding scenarios for the manifest-owned disposable database. */
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {db} from './db';
import {hasAnyRbacPermission} from '../lib/security/rbac-permissions';
import {uploadEmployeeDocument, reviewEmployeeDocument, grantEmployeeDocument, downloadEmployeeDocument} from '../services/hris/employee-document.service';
import type {EmployeeDocumentPorts} from '../services/hris/employee-document.storage';
import {decryptEmployeeDocument} from '../services/hris/employee-document.contract';
import {submitOwnCorrection, getCorrectionReview, decideCorrection} from '../services/hris/personal-correction.service';
import {syncLifecycleTaskEventInTx, decideLifecycleTask} from '../services/hris/lifecycle-task.service';
import {saveSetupReviewer} from '../services/hris/workspace-setup.service';
import {createTimeFoundation, approveTimeFoundation} from '../services/hris/operational-time.service';
import {previewOperationalTime, importReviewedOperationalTime, resolveReviewedOperationalAnomaly} from '../services/hris/attendance-import.service';
import {upsertPayrollRubrique, assignEmployeeRubrique} from '../services/payroll/compensation.service';
import {stageMasterDataImport, approveMasterDataImport, commitMasterDataImport} from '../services/onboarding/master-data-import.service';
import {hashCsvContent} from '../services/onboarding/master-data-csv';
import {issueUserInvitation} from '../services/users/user-invitation-issuance.service';
import {createOrganizationRole} from '../services/roles/role-write.service';

type Actor={organizationId:string;actorId:string;actorPermissions:string[];sessionId?:string;sessionToken?:string;lastAuthAt?:Date};
const orgs=['synth12_douala','synth12_yaounde','synth12_bafoussam'];
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const at=(day:string)=>new Date(day+'T00:00:00.000Z');
const now='2026-10-28T20:00:00.000Z';
function ensure(condition:unknown,message:string):asserts condition{if(!condition)throw Error(message);}
function uuid(value:string){const h=sha(value);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
function pdfDocument(label:string){
 const line=label.replace(/[^a-zA-Z0-9 _.-]/g,'_');
 const stream=`BT /F1 14 Tf 45 760 Td (SYNTHETIC TEST DOCUMENT - NOT REAL IDENTITY) Tj 0 -30 Td (${line}) Tj 0 -25 Td (Disposable employee document workflow evidence.) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let value='%PDF-1.4\n';const offsets=[0];objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(value));value+=`${i+1} 0 obj\n${object}\nendobj\n`;});
 const xref=Buffer.byteLength(value);value+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(value);
}

export async function seedRemainingPeople(org:string,actors:Record<string,Actor>,out:string){
 const {OUT,assertManifestTarget}=require('../scripts/disposable-business-dataset.cjs');
 const manifest=JSON.parse(readFileSync(path.join(out,'manifest.json'),'utf8'));
 ensure(process.env.NODE_ENV==='test'&&orgs.includes(org)&&path.resolve(out)===path.resolve(OUT)&&new Date().toISOString()===now,'Owned people fixture target and fixed test clock required');
 ensure(manifest.status==='schema-verified'&&manifest.target.database==='stoquify_replay_dataset_20261028_01'&&manifest.schemaSha256===sha(readFileSync('prisma/schema.prisma')),'Owned schema-verified people manifest required');
 assertManifestTarget(new URL(process.env.DATABASE_URL!),manifest);
 ensure((await db.$queryRaw<Array<{n:string}>>`SELECT current_database() AS n`)[0].n===manifest.target.database,'Database identity mismatch');
 for(const role of ['owner','payroll_administrator','employee_self_service'])ensure(actors[role]?.organizationId===org,`Scoped ${role} actor required`);
 const owner=actors.owner,maker=actors.payroll_administrator,self=actors.employee_self_service;
 ensure(new Set([owner.actorId,maker.actorId,self.actorId]).size===3,'Independent people personas required');
 const employee=await db.payrollEmployee.findFirstOrThrow({where:{organizationId:org,userId:self.actorId,deletedAt:null}});
 const originalEmployee={id:employee.id,displayName:employee.displayName,legalName:employee.legalName,status:employee.status};
 const directory=path.join(out,'synthetic-documents');mkdirSync(directory,{recursive:true});
 const retain=(name:string,bytes:Buffer|string)=>{const file=path.join(directory,name),data=Buffer.from(bytes);if(existsSync(file))ensure(readFileSync(file).equals(data),'Retained people fixture changed: '+name);else writeFileSync(file,data);return{file,sha256:sha(data),uri:`http://127.0.0.1:3188/${name}`};};
 const proof=(name:string,data:unknown)=>retain(`${org}-remaining-people-${name}.json`,JSON.stringify({classification:'SYNTHETIC_TEST_ONLY',legalOrProviderCertification:false,data},null,2)+'\n');
 const report:{organizationId:string;scenarios:any[];issues:any[];blockedTables:string[]}={organizationId:org,scenarios:[],issues:[],blockedTables:[]};
 const run=async(name:string,fn:()=>Promise<unknown>)=>{try{report.scenarios.push({scenario:name,result:await fn()});}catch(error){report.issues.push({scenario:name,message:error instanceof Error?error.message:String(error)});}writeFileSync(path.join(out,`${org}-remaining-people.json`),JSON.stringify(report,null,2)+'\n');};
 const environmentKeys=['HRIS_DOCUMENT_POLICIES_JSON','HRIS_PERSONAL_CORRECTION_POLICIES_JSON','HRIS_LIFECYCLE_TASK_POLICIES_JSON','HRIS_DOCUMENT_GRANT_SECRET','HRIS_SETUP_PILOT_ORGANIZATIONS','STOQUIFY_USER_INVITE_FROM_EMAIL'];
 const previous=Object.fromEntries(environmentKeys.map(k=>[k,process.env[k]]));
 try{
  process.env.HRIS_SETUP_PILOT_ORGANIZATIONS=orgs.join(',');
  await run('reviewed-encrypted-employee-document',async()=>{
   const bytes=pdfDocument(`${org} employee ${employee.employeeNumber}`),original=retain(`${org}-remaining-employee-record.pdf`,bytes);
   const policy={organizationId:org,countryCode:'CM',code:'SYNTHETIC_EMPLOYMENT_RECORD',version:'1',nameEn:'Synthetic employee record',nameFr:'Dossier employé synthétique',retentionDays:365,employeeVisible:true,employeeMayUpload:true,approvalReference:original.sha256,approvedBy:owner.actorId,approvedAt:now,effectiveFrom:'2025-11-01T00:00:00.000Z',effectiveTo:'2027-11-01T00:00:00.000Z',documentKind:'EMPLOYMENT_RECORD'};
   proof('document-policy',{...policy,approvalMeaning:'Synthetic configuration; not statutory retention approval',scannerMeaning:'Fixed generated PDF test adapter; not a qualified malware scanner'});
   process.env.HRIS_DOCUMENT_POLICIES_JSON=JSON.stringify([policy]);
   ensure((process.env.AUTH_SECRET?.length??0)>=32,'Isolated test authentication secret required');
   process.env.HRIS_DOCUMENT_GRANT_SECRET=sha('disposable-hr-document:'+process.env.AUTH_SECRET);
   const objects=path.resolve('.seed-artifacts/disposable-dataset-2026-10-28/employee-document-objects');mkdirSync(objects,{recursive:true});
   const objectPath=(key:string)=>{ensure(key.startsWith(`hris/${org}/`),'Unexpected employee object tenant');return path.join(objects,sha(key)+'.bin');};
   const ports:EmployeeDocumentPorts={store:{name:'SYNTHETIC_LOCAL_ENCRYPTED_TEST_STORE_V1',async put(key,data){const target=objectPath(key);if(existsSync(target))ensure(readFileSync(target).equals(Buffer.from(data)),'Encrypted object differs on replay');else writeFileSync(target,data);},async get(key){return readFileSync(objectPath(key));},async remove(){throw Error('Fixture originals are retained; deletion is not configured');}},scanner:{name:'SYNTHETIC_FIXED_PDF_VALIDATOR_NOT_PRODUCTION_AV',async scan(data,hash){ensure(Buffer.from(data).equals(bytes)&&hash===original.sha256,'Unexpected bytes supplied to fixed fixture scanner');return{sha256:hash,verdict:'CLEAN',reference:original.sha256};}}};
   const own={...self,ownOnly:true};let uploaded=await uploadEmployeeDocument(own,{policyCode:policy.code,title:'Synthetic employee onboarding record',mimeType:'application/pdf',idempotencyKey:`${org}:remaining:employee-document`},bytes,ports);
   if(uploaded.status==='PENDING_REVIEW')uploaded=await reviewEmployeeDocument(owner,{documentId:uploaded.id,revision:uploaded.revision,decision:'APPROVE',acknowledged:true,reason:'Independent review of the generated synthetic employee record; no real identity claim'});
   ensure(uploaded.status==='AVAILABLE','Employee document is not available after independent review');
   const priorDownload=await db.auditLog.findFirst({where:{organizationId:org,userId:self.actorId,entityType:'HrisEmployeeDocument',entityId:uploaded.id,action:'HRIS_DOCUMENT_DOWNLOADED'}});
   if(!priorDownload){const grant=await grantEmployeeDocument(own,uploaded.id),download=await downloadEmployeeDocument(own,grant.token,ports);ensure(Buffer.from(download.bytes).equals(bytes),'Decrypted employee document differs from its original');}
   else{const retained=await db.hrisEmployeeDocument.findUniqueOrThrow({where:{id:uploaded.id}});ensure(retained.sha256===original.sha256&&decryptEmployeeDocument(await ports.store.get(`hris/${org}/${uploaded.id}`),retained).equals(bytes),'Retained encrypted download evidence changed');}
   return{documentId:uploaded.id,status:uploaded.status,originalSha256:original.sha256,encryptedStorage:true,downloadRoundTrip:true,scannerIsSynthetic:true};
  });
  await run('personal-correction-independent-rejection',async()=>{
   const policy={organizationId:org,version:'1',allowedFields:['displayName'],reviewerId:owner.actorId,supportLabelEn:'Synthetic HR correction review',supportLabelFr:'Révision RH synthétique',approvalReference:proof('correction-policy',{reviewer:owner.actorId,synthetic:true}).sha256,effectiveFrom:'2025-11-01T00:00:00.000Z',effectiveTo:'2027-11-01T00:00:00.000Z'};
   process.env.HRIS_PERSONAL_CORRECTION_POLICIES_JSON=JSON.stringify([policy]);
   const proposed=await submitOwnCorrection(self,{proposal:{displayName:employee.displayName+' (unverified)'},reason:'Synthetic request intentionally lacks a verified reason to change the retained display name',idempotencyKey:`${org}:remaining:personal-correction`});
   if(proposed.status==='REQUESTED'){const review=await getCorrectionReview(owner,proposed.id);await decideCorrection(owner,{caseId:proposed.id,revision:review.revision,reviewVersion:review.reviewVersion,decision:'REJECT',acknowledged:true,reason:'Independent synthetic review rejected the unsupported display-name change',idempotencyKey:`${org}:remaining:personal-correction:reject`});}
   const saved=await db.hrisPersonalCorrectionCase.findUniqueOrThrow({where:{id:proposed.id}});ensure(saved.status==='REJECTED'&&!saved.appliedBusinessEventId,'Personal correction must retain a rejected outcome without changing the employee');
   return{caseId:saved.id,status:saved.status,employeeUnchanged:true};
  });
  await run('onboarding-lifecycle-task-completion',async()=>{
   for(const [a,permissions]of [[maker,['hris.tasks.read','hris.tasks.work']],[owner,['hris.tasks.read','hris.tasks.review']]]as const){const memberships=await db.role.findMany({where:{organizationId:org,users:{some:{id:a.actorId}}},select:{permissions:true}});const live=memberships.flatMap(r=>r.permissions);for(const permission of permissions)ensure(live.includes(permission),`Stored explicit permission required for ${a.actorId}: ${permission}`);}
   const codes=['HR_PREPARATION','APPLICATION_ACCESS','EXTERNAL_ACCESS','ASSETS']as const;
   const templates=codes.map((code,i)=>({code,ownerId:maker.actorId,reviewerId:owner.actorId,dueOffsetDays:i,dependsOn:i?[codes[i-1]]:[],evidenceInstructionsEn:'Review the retained synthetic task evidence; no external provisioning is claimed.',evidenceInstructionsFr:'Vérifier la preuve synthétique conservée; aucun accès externe réel.'}));
   const document=proof('lifecycle-policy',{employeeId:employee.id,templates,externalProvisioningPerformed:false});
   process.env.HRIS_LIFECYCLE_TASK_POLICIES_JSON=JSON.stringify([{organizationId:org,version:'1',approvalReference:document.sha256,effectiveFrom:'2025-11-01T00:00:00.000Z',effectiveTo:'2027-11-01T00:00:00.000Z',enabled:true,supportEn:'Synthetic onboarding task review',supportFr:'Révision des tâches synthétiques',starter:templates,leaver:templates}]);
   const source=await db.businessEvent.findFirstOrThrow({where:{organizationId:org,sourceId:employee.id,eventType:'hris.employee.lifecycle.approved',status:'APPLIED'},orderBy:{occurredAt:'asc'}});
   await db.$transaction(tx=>syncLifecycleTaskEventInTx(tx,org,employee.id,source.id),{timeout:30000});
   const results=[];for(const code of codes){let task=await db.hrisLifecycleTask.findFirstOrThrow({where:{organizationId:org,employeeId:employee.id,approvalEventId:source.id,code}});const evidence=proof('task-'+code,{employeeId:employee.id,taskId:task.id,code,synthetic:true,realExternalAccessOrAssetsClaimed:false,existingApplicationAccount:self.actorId});
    if(task.status==='OPEN')await decideLifecycleTask(maker,{taskId:task.id,revision:task.revision,operation:'SUBMIT',reason:'Submit generated test evidence for independent review',evidenceReference:evidence.uri,acknowledged:true,idempotencyKey:`${org}:remaining:task:${code}:submit`});
    task=await db.hrisLifecycleTask.findUniqueOrThrow({where:{id:task.id}});if(task.status==='AWAITING_REVIEW')await decideLifecycleTask(owner,{taskId:task.id,revision:task.revision,operation:'APPROVE',reason:'Reviewed synthetic test evidence; no real external provisioning or asset transfer claimed',acknowledged:true,idempotencyKey:`${org}:remaining:task:${code}:approve`});
    task=await db.hrisLifecycleTask.findUniqueOrThrow({where:{id:task.id}});ensure(task.status==='COMPLETED'&&task.sourceState==='ACTIVE','Lifecycle task completion failed');results.push({id:task.id,code,status:task.status});
   }return{tasks:results,authoritativeApprovalEventId:source.id,externalProvisioningPerformed:false};
  });
  await run('company-holiday-and-reviewer-grant',async()=>{
   const evidence=proof('company-training-closure',{date:'2026-10-30',name:'Synthetic company training closure',paid:true,officialPublicHolidayClaimed:false,employeeSchedulesChanged:false});
   const code='SYN-REMAINING-COMPANY-CLOSURE';let calendar=await db.hrisWorkCalendar.findFirst({where:{organizationId:org,code}}),leave=await db.hrisLeavePolicy.findFirst({where:{organizationId:org,code}});
   if(!calendar){const created=await createTimeFoundation({...maker,countryCode:'CM',calendarCode:code,calendarName:'Synthetic company training calendar; not statutory',timezone:'Africa/Douala',effectiveFrom:at('2026-10-01'),effectiveTo:at('2026-11-01'),calendarSourceHash:evidence.sha256,holidays:[{date:at('2026-10-30'),name:'Synthetic company training closure',paid:true,sourceHash:evidence.sha256}],leavePolicyCode:code,leavePolicyName:'Zero-credit synthetic policy for calendar workflow',annualEntitlementMinutes:0,carryOverLimitMinutes:0,accrualRule:{schemaVersion:1,employeeIds:[employee.id],negativeBalance:'FORBID',rounding:'EXACT_MINUTES',credits:[],expiry:'NONE',carryover:null},leavePolicySourceHash:evidence.sha256});calendar=created.calendar;leave=created.leavePolicy;}
   ensure(leave,'Matching company calendar policy required');if(calendar.status==='DRAFT')await approveTimeFoundation({...owner,calendarId:calendar.id,leavePolicyId:leave.id,approvalEvidenceHash:evidence.sha256});
   const holidays=await db.hrisPublicHoliday.findMany({where:{organizationId:org,calendarId:calendar.id}});ensure(holidays.length===1&&holidays[0].sourceHash===evidence.sha256,'Retained company closure differs from fixture');
   const grant=await saveSetupReviewer(owner,{reviewerUserId:maker.actorId,employeeId:null,domain:'TIME_POLICY',authority:'APPROVAL_DECISION',effectiveFrom:at('2026-10-01'),effectiveTo:at('2026-11-01'),reason:'Synthetic bounded review delegation for a company policy; no statutory review authority claimed'});
   return{calendarId:calendar.id,holidayId:holidays[0].id,reviewerGrantId:grant.id,officialHolidayClaimed:false,schedulesChanged:false};
  });
  await run('rejected-attendance-source-and-resolved-anomaly',async()=>{
   const replacement=await db.hrisTimeEntry.findFirstOrThrow({where:{organizationId:org,employeeId:employee.id,workDate:at('2026-10-28'),status:'VALIDATED'}});
   const evidence=proof('bad-attendance-source',{employeeId:employee.id,workDate:'2026-10-28',scheduledMinutes:480,workedMinutes:480,absenceMinutes:0,overtimeMinutes:481,purpose:'Rejected source observation; valid existing observation remains authoritative'});
   const command={...maker,sourceSystem:'SYNTHETIC_REMAINING_NEGATIVE_ATTENDANCE',sourceFileName:path.basename(evidence.file),sourceHash:evidence.sha256,idempotencyKey:`${org}:remaining:bad-attendance`,entries:[{sourceRecordId:`${org}:remaining:bad-observation`,employeeId:employee.id,workDate:replacement.workDate,scheduledMinutes:480,workedMinutes:480,absenceMinutes:0,overtimeMinutes:481,sourceHash:evidence.sha256}]};
   const preview=await previewOperationalTime(command);ensure(preview.rows.length===1&&preview.rows[0].issues.includes('OVERTIME_EXCEEDS_WORKED'),'Negative observation did not expose its intended issue');
   const batch=await importReviewedOperationalTime({...command,previewHash:preview.payloadHash});const anomalies=await db.hrisAttendanceAnomaly.findMany({where:{organizationId:org,importBatchId:batch.id}});ensure(batch.status==='REJECTED'&&anomalies.length===1,'Expected one rejected source and anomaly');
   const resolution=proof('attendance-anomaly-resolution',{anomalyId:anomalies[0].id,replacementEntryId:replacement.id,sourceHash:evidence.sha256});
   const resolved=await resolveReviewedOperationalAnomaly({...owner,anomalyId:anomalies[0].id,status:'RESOLVED',resolutionHash:resolution.sha256,replacementEntryId:replacement.id});ensure(resolved.status==='RESOLVED','Anomaly resolution failed');
   return{batchId:batch.id,anomalyId:resolved.id,status:resolved.status,authoritativeEntryId:replacement.id,rawEntryChanged:false};
  });
  await run('draft-nonstatutory-compensation',async()=>{
   const code='SYN-REMAINING-ALLOWANCE',evidence=proof('rubrique-assignment',{employeeId:employee.id,amount:'5000',currency:'XAF',effectiveFrom:'2026-11-01',status:'DRAFT',statutoryTreatmentApproved:false});
   let rubrique=await db.payrollRubrique.findFirst({where:{organizationId:org,code,deletedAt:null}});
   if(!rubrique){await upsertPayrollRubrique({...owner,code,label:'Synthetic proposed transport allowance',description:'Draft nonstatutory catalogue scenario; not available for accepted payroll calculation',kind:'EARNING',valueType:'FIXED_AMOUNT',status:'DRAFT',taxableBase:false,socialBase:false,sourceReference:{sourceSystem:'SYNTHETIC_DISPOSABLE',sourceRecordId:code,sourceHash:evidence.sha256},idempotencyKey:`${org}:remaining:rubrique`});rubrique=await db.payrollRubrique.findFirstOrThrow({where:{organizationId:org,code,deletedAt:null}});}
   ensure(rubrique.status==='DRAFT'&&rubrique.statutoryParameterPath===null,'Retained draft rubrique differs from fixture');
   let assignment=await db.payrollEmployeeRubriqueAssignment.findFirst({where:{organizationId:org,employeeId:employee.id,rubriqueId:rubrique.id,evidenceDocumentHash:evidence.sha256}});
   if(!assignment){await assignEmployeeRubrique({...owner,employeeId:employee.id,rubriqueId:rubrique.id,status:'DRAFT',amount:5000,currency:'XAF',effectiveFrom:'2026-11-01',evidenceDocumentHash:evidence.sha256,sourceReference:{sourceSystem:'SYNTHETIC_DISPOSABLE',sourceHash:evidence.sha256},idempotencyKey:`${org}:remaining:rubrique-assignment`});assignment=await db.payrollEmployeeRubriqueAssignment.findFirstOrThrow({where:{organizationId:org,employeeId:employee.id,rubriqueId:rubrique.id,evidenceDocumentHash:evidence.sha256}});}
   ensure(assignment.status==='DRAFT'&&assignment.amount?.eq(5000)&&assignment.effectiveFrom.toISOString().slice(0,10)==='2026-11-01','Retained proposed allowance differs from fixture');return{rubriqueId:rubrique.id,assignmentId:assignment.id,status:assignment.status,statutoryTreatmentApproved:false};
  });
  await run('supplier-csv-validation-and-import',async()=>{
   const uploader=actors.maker;ensure(uploader?.organizationId===org&&uploader.actorId!==owner.actorId,'Independent supplier CSV uploader required');
   for(const actor of [uploader,owner]){const live=(await db.role.findMany({where:{organizationId:org,users:{some:{id:actor.actorId}}},select:{permissions:true}})).flatMap(r=>r.permissions);ensure(hasAnyRbacPermission(actor.actorPermissions.filter(p=>live.includes(p)),['purchases.suppliers.create']),'Current supplier onboarding write permission required');}
   const outcomes=[];for(const valid of [false,true]){const fileName=`${org}-remaining-supplier-${valid?'valid':'invalid'}.csv`,headers='code,name,contactPerson,email,phone,address,city,state,zipCode,country,taxId,paymentTerms,creditLimit,preferredLocale,isActive\n',content=headers+(valid?'SYN-REMAINING-VENDOR,Synthetic Training Supplies,Test Contact,vendor@example.invalid,+237600000099,Synthetic training address,Test City,Test Region,,CM,,30,0,en,true\n':'SYN-REMAINING-INVALID,,Test Contact,vendor-invalid@example.invalid,+237600000098,Synthetic training address,Test City,Test Region,,CM,,30,0,en,true\n');const source=retain(fileName,content);
    let batch=await db.onboardingImportBatch.findFirst({where:{organizationId:org,target:'SUPPLIER',sourceFilename:fileName}});
    if(!batch){await stageMasterDataImport({organizationId:org,actorId:uploader.actorId,target:'SUPPLIER',sourceFilename:fileName,content,now:new Date(now)});batch=await db.onboardingImportBatch.findFirstOrThrow({where:{organizationId:org,target:'SUPPLIER',sourceFilename:fileName}});}
    ensure(batch.contentHash===hashCsvContent(content),'Retained CSV source differs from fixture');
    if(valid){if(batch.status==='VALIDATED')await approveMasterDataImport({organizationId:org,batchId:batch.id,expectedTarget:'SUPPLIER',actorId:owner.actorId,expectedApprovalDigest:batch.approvalDigest!});batch=await db.onboardingImportBatch.findUniqueOrThrow({where:{id:batch.id}});if(batch.status==='APPROVED'||batch.status==='COMMITTED')await commitMasterDataImport({organizationId:org,batchId:batch.id,expectedTarget:'SUPPLIER',actorId:owner.actorId,expectedApprovalDigest:batch.approvalDigest!});batch=await db.onboardingImportBatch.findUniqueOrThrow({where:{id:batch.id}});ensure(batch.status==='COMMITTED'&&batch.committedRecordCount===1,'Valid supplier import did not commit exactly one row');}
    else ensure(batch.status==='BLOCKED'&&batch.errorRecordCount>0,'Invalid CSV did not retain validation issues');outcomes.push({batchId:batch.id,status:batch.status,sourceSha256:source.sha256});
   }return{batches:outcomes,approvalPolicy:'HIGH_RISK_SUPPLIER_INDEPENDENT_REVIEW',noOpeningBalanceOrTransactionImported:true};
  });
  await run('unsent-user-invitation-outbox',async()=>{
   ensure(!process.env.RESEND_API_KEY,'External email credentials must be absent');process.env.STOQUIFY_USER_INVITE_FROM_EMAIL='synthetic-invitations@example.invalid';
   // The retained legacy self-service role includes three unmapped presence permissions.
   // Current grant policy correctly refuses them. Author a separate canonical test
   // invitation role instead of changing that baseline role or bypassing the ceiling.
   const permissions=['dashboard.read','profile.read','profile.update','profile.password.update','hris.self_service.read','hris.self_service.request','payroll.payslips.self.read','payroll.payslips.self.export'];
   let role=await db.role.findFirst({where:{organizationId:org,nameEn:'Synthetic employee invitation'}});
   if(!role){ensure(owner.sessionId&&owner.sessionToken,'Fresh authenticated role author required');const created=await createOrganizationRole({ctx:{orgId:org,userId:owner.actorId,isSuperUser:false,session:{id:owner.sessionId,token:owner.sessionToken}},data:{name:'Synthetic employee invitation',nameFr:'Invitation employé synthétique',description:'Canonical self-service invitation scenario; no legacy presence permissions or external delivery',permissions,organizationId:org},command:{requestId:uuid(`${org}:remaining:invitation-role`)}});role=await db.role.findUniqueOrThrow({where:{id:created.id}});}
   ensure(JSON.stringify([...role.permissions].sort())===JSON.stringify([...permissions].sort()),'Retained canonical invitation role changed');
   const input={actor:{id:owner.actorId,organizationId:org},actorPermissions:owner.actorPermissions,email:`new-colleague+${org}@example.invalid`,roleId:role.id,requestId:uuid(`${org}:remaining:invitation`),locale:'en' as const};
   const issued=await issueUserInvitation(input);ensure(!issued?.error&&issued?.data,'Synthetic invitation issuance failed: '+issued?.error);const replay=await issueUserInvitation(input);ensure(replay?.data?.inviteId===issued.data.inviteId&&replay.data.replayed,'Invitation replay changed identity');
   const invitation=await db.invite.findUniqueOrThrow({where:{id:issued.data.inviteId}});ensure(invitation.status==='PENDING'&&invitation.email===input.email,'Retained invitation differs from pending synthetic case');
   const pending=await db.businessEventOutbox.findMany({where:{organizationId:org,businessEventId:issued.data.issueId}});ensure(pending.length===1&&pending[0].status==='PENDING','Invitation should remain queued with no delivery attempt');
   proof('invitation',{inviteId:invitation.id,roleId:role.id,issueId:issued.data.issueId,recipientDomain:'example.invalid',delivery:'PENDING',externalEmailSent:false});return{inviteId:invitation.id,roleId:role.id,issueId:issued.data.issueId,delivery:'PENDING',replayed:true,externalEmailSent:false,legacyPresenceRoleUnchanged:true};
  });
  const current=await db.payrollEmployee.findUniqueOrThrow({where:{id:employee.id}});ensure(JSON.stringify({id:current.id,displayName:current.displayName,legalName:current.legalName,status:current.status})===JSON.stringify(originalEmployee),'People fixture changed the original employee profile');
  report.blockedTables=['payroll_periods','payroll_attendance_snapshots','payroll_runs','payroll_run_lines','payroll_run_transitions','payroll_payslips','payroll_payslip_lines','payroll_declarations','payroll_declaration_evidence','payroll_payment_batches','payroll_payment_allocations','payroll_employee_balance_cases','payroll_employee_balance_events','hris_payroll_handoff_packages','hris_payroll_handoff_receipts'];
  writeFileSync(path.join(out,`${org}-remaining-people.json`),JSON.stringify(report,null,2)+'\n');return report;
 }finally{for(const key of environmentKeys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
}
