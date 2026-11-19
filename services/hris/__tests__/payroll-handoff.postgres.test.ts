import {randomUUID} from 'node:crypto'
import {db} from '@/prisma/db'
import {handoffActor,readHandoffInputsInTx,retainedHandoffFreshnessInTx} from '../payroll-handoff-read.service'
import {handoffHash,handoffCsv} from '../payroll-handoff.contract'
import {previewPayrollHandoff,issuePayrollHandoff,getPayrollHandoffPackage,acknowledgePayrollHandoff,getPayrollHandoffWorkspace} from '../payroll-handoff.service'
import {correctCertifiedHrisTimeLeaveAttendance} from '../time-leave.service'
jest.mock('@/prisma/db',()=>{const {PrismaClient}=require('@prisma/client'),url=process.env.HRIS_CORRECTNESS_DATABASE_URL;if(url!=='postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public')throw Error('Owned synthetic target required');return {db:new PrismaClient({datasources:{db:{url}},transactionOptions:{maxWait:15000,timeout:120000}})}})
const org='hr19-'+randomUUID(),users=[0,1,2,3].map(i=>org+'-u'+i),periodId=org+'-period',ids=Array.from({length:200},(_,i)=>org+'-e'+String(i).padStart(3,'0')),perms=['EMPLOYEE_SALARY_READ','hris.people.manage','hris.people.read','hris.handoff.read','hris.handoff.export','hris.handoff.receive'],actor=(i=0)=>({organizationId:org,actorId:users[i],actorPermissions:perms}),start=new Date('2026-10-01T00:00:00Z'),end=new Date('2026-10-31T23:59:59Z'),proof='sha256:synthetic-reviewed-proof',policy={organizationId:org,version:'synthetic-v1',countryCode:'GA',recipientUserId:users[1],recipientLabel:'Synthetic recipient only',templateVersion:'HR_CORE_INPUTS_V1',approvalReference:'synthetic-reviewed-template',effectiveFrom:'2026-01-01T00:00:00Z',effectiveTo:'2030-01-01T00:00:00Z',enabled:true}
const certification=(id:string,revision=1,worked=480)=>({kind:'STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_CERTIFICATION',version:1,sourceSystem:'SYNTHETIC_REVIEWED_TEST_SOURCE',sourceRecordId:id+':'+periodId,sourceRevision:revision,policy:{countryCode:'GA',policyVersion:'synthetic-v1',countryPolicyHash:proof,companyPolicyHash:proof,leavePolicyHash:proof,overtimePolicyHash:proof,scheduleHash:proof,holidayCalendarHash:proof,effectiveFrom:'2026-01-01T00:00:00Z',effectiveTo:null,verificationStatus:'REVIEWED',reviewedById:users[2],reviewEvidenceHash:proof},evidence:{attendanceImportHash:proof,leaveBalanceSnapshotHash:proof,approvedLeaveRequestHashes:[],approvedOvertimeRequestHashes:[],approvedCorrectionHashes:[]},approval:{preparedById:users[2],approvedById:users[3],approvalEvidenceHash:proof},unresolved:{timeEntryCount:0,leaveRequestCount:0,overtimeRequestCount:0,correctionCount:0},totals:{scheduledMinutes:480,workedMinutes:worked,overtimeMinutes:0,absenceMinutes:480-worked,leaveMinutes:0}})
const read=()=>db.$transaction(async tx=>readHandoffInputsInTx(tx,await handoffActor(tx,actor()),periodId),{timeout:120000})
async function cleanupHandoffFixtures(){
 // Database guard above permits only the disposable loopback database. Production
 // services have no delete/bypass command. Restore both triggers in the same tx.
 await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('ALTER TABLE hris_payroll_handoff_receipts DISABLE TRIGGER hris_handoff_receipt_guard')
  await tx.$executeRawUnsafe('ALTER TABLE hris_payroll_handoff_packages DISABLE TRIGGER hris_handoff_package_guard')
  await tx.$executeRaw`DELETE FROM hris_payroll_handoff_receipts WHERE "organizationId"=${org}`
  const rows=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM hris_payroll_handoff_packages WHERE "organizationId"=${org} ORDER BY version DESC`
  for(const r of rows)await tx.$executeRaw`DELETE FROM hris_payroll_handoff_packages WHERE id=${r.id} AND "organizationId"=${org}`
  await tx.$executeRawUnsafe('ALTER TABLE hris_payroll_handoff_packages ENABLE TRIGGER hris_handoff_package_guard')
  await tx.$executeRawUnsafe('ALTER TABLE hris_payroll_handoff_receipts ENABLE TRIGGER hris_handoff_receipt_guard')
 },{timeout:120000})
}
beforeAll(async()=>{
 process.env.HRIS_PAYROLL_HANDOFF_POLICIES_JSON=JSON.stringify([policy]);await db.organization.create({data:{id:org,slug:org,name:'Synthetic handoff employer',country:'GA',timezone:'Africa/Libreville'}})
 for(const id of users){await db.user.create({data:{id,organizationId:org,email:id+'@example.invalid',isVerified:true}});await db.role.create({data:{organizationId:org,code:id,nameEn:id,permissions:perms,users:{connect:{id}}}})}
 await db.payrollPeriod.create({data:{id:periodId,organizationId:org,name:'Synthetic October inputs',periodStart:start,periodEnd:end,payDate:end,countryCode:'GA'}})
 await db.payrollEmployee.createMany({data:ids.map((id,i)=>({id,organizationId:org,employeeNumber:id,displayName:i===0?'=Synthetic formula':'Synthetic employee '+i,legalName:'Synthetic legal '+i,countryCode:'GA',status:i===199?'TERMINATED':'ACTIVE',hireDate:new Date('2026-01-01'),terminationDate:i===199?new Date('2026-10-15'):null,paymentDestinationHash:proof+id,metadata:{hrSourceData:{sourceSystem:'SYNTHETIC',sourceRecordId:id,sourceHash:proof,updatedAt:'2026-10-01T00:00:00Z'},approvedPaymentDestinationEvidence:{requestId:id+'-dest',paymentDestinationHash:proof+id,evidenceDocumentHash:proof,approvalEvidenceHash:proof,requestBusinessEventId:id+'-req-event',approvalBusinessEventId:id+'-approval-event',appliedBusinessEventId:id+'-apply-event'}}}))})
 await db.payrollEmployee.create({data:{id:org+'-excluded',organizationId:org,employeeNumber:org+'-excluded',displayName:'Synthetic prior leaver',countryCode:'GA',status:'TERMINATED',hireDate:new Date('2026-01-01'),terminationDate:new Date('2026-09-01')}})
 await db.payrollContract.createMany({data:ids.map(id=>({id:id+'-contract',organizationId:org,employeeId:id,contractNumber:id,type:'CDI',status:'ACTIVE',effectiveFrom:new Date('2026-01-01'),baseSalary:'100.10',currency:'XAF',signedDocumentHash:proof,activatedBusinessEventId:id+'-activation',metadata:{hrisContractApproval:{latest:{status:'APPROVED',requestId:id+'-request',requestEvidenceHash:proof,approvalEvidenceHash:proof,activationBusinessEventId:id+'-activation'}},hrisDocumentEvidence:{current:{status:'APPROVED',artifactHash:proof,malwareScanEvidenceHash:proof,approvalEvidenceHash:proof,approvalBusinessEventId:id+'-document'}}}}))})
 await db.payrollPaymentDestinationChangeRequest.createMany({data:ids.map(id=>({id:id+'-dest',organizationId:org,employeeId:id,status:'APPLIED',paymentMethod:'BANK_TRANSFER',paymentDestinationHash:proof+id,requestedById:users[2],approvedById:users[3],appliedById:users[0],appliedAt:start,requestReason:'Synthetic retained applied destination',evidenceDocumentHash:proof,approvalEvidenceHash:proof,requestBusinessEventId:id+'-req-event',approvalBusinessEventId:id+'-approval-event',appliedBusinessEventId:id+'-apply-event'}))})
 await db.payrollAttendanceSnapshot.createMany({data:ids.map(id=>({id:id+'-snapshot',organizationId:org,employeeId:id,payrollPeriodId:periodId,status:'FROZEN',periodStart:start,periodEnd:end,scheduledMinutes:480,workedMinutes:480,overtimeMinutes:0,absenceMinutes:0,leaveMinutes:0,sourceHash:handoffHash(certification(id)),frozenById:users[3],frozenAt:start,metadata:{sourcePayload:certification(id)}}))})
},120000)
afterAll(async()=>{try{await cleanupHandoffFixtures();await db.hrisTimeRequest.deleteMany({where:{organizationId:org}});await db.payrollAttendanceSnapshot.deleteMany({where:{organizationId:org}});await db.payrollPaymentDestinationChangeRequest.deleteMany({where:{organizationId:org}});await db.payrollContract.deleteMany({where:{organizationId:org}});await db.payrollEmployee.deleteMany({where:{organizationId:org}});await db.payrollPeriod.deleteMany({where:{organizationId:org}});await db.organization.deleteMany({where:{id:org}});expect(await db.organization.count({where:{id:org}})).toBe(0)}finally{delete process.env.HRIS_PAYROLL_HANDOFF_POLICIES_JSON;await db.$disconnect()}},120000)
test('HR19A exactly200 eligible including in-period leaver, exclusions and exact units reconcile',async()=>{const now=Date.now(),r=await read();expect(r.blockers).toEqual([]);expect(r.manifest.rows).toHaveLength(200);expect(r.manifest.rows.find(e=>e.employeeId===ids[199])?.employmentStatus).toBe('TERMINATED');expect(r.manifest.excluded).toEqual([{employeeId:org+'-excluded',employeeNumber:org+'-excluded',reason:'LEFT_BEFORE_PERIOD'}]);expect(r.manifest.totals).toMatchObject({employeeCount:200,excludedCount:1,scheduledMinutes:96000,workedMinutes:96000,contractBaseSalaryByCurrency:{XAF:'20020.00'}});expect(handoffCsv(r.manifest).split('\r\n')).toHaveLength(202);require('node:fs').writeFileSync('what-next/hris-implementation-2026-10-24/HR-19/performance-a.json',JSON.stringify({employees:201,eligible:200,elapsedMs:Date.now()-now,environment:'owned synthetic loopback; no SLA'}))})
test('HR19A missing contract and pending request block rather than silently exclude employees',async()=>{await db.payrollContract.update({where:{id:ids[0]+'-contract'},data:{status:'DRAFT'}});const request=await db.hrisTimeRequest.create({data:{organizationId:org,employeeId:ids[1],type:'OVERTIME',periodStart:start,periodEnd:end,requestedMinutes:60,reason:'Synthetic pending input',requestedById:users[2],requestEvidenceHash:proof,sourceHash:randomUUID(),idempotencyKey:randomUUID()}});const r=await read();expect(r.manifest.rows).toHaveLength(200);expect(r.blockers).toEqual(expect.arrayContaining([{employeeId:ids[0],code:'ACTIVE_CONTRACT_MISSING'},{employeeId:ids[1],code:'PENDING_APPROVAL_OR_CANCELLATION'}]));await db.payrollContract.update({where:{id:ids[0]+'-contract'},data:{status:'ACTIVE'}});await db.hrisTimeRequest.delete({where:{id:request.id}})})
test('HR19A exact exported-name change alters preview hash and unauthorized current roles deny',async()=>{const before=await read();await db.payrollEmployee.update({where:{id:ids[0]},data:{displayName:'Synthetic revised name'}});const after=await read();expect(after.previewHash).not.toBe(before.previewHash);expect(after.manifest.sourceFingerprint).not.toBe(before.manifest.sourceFingerprint);await expect(db.$transaction(async tx=>readHandoffInputsInTx(tx,await handoffActor(tx,{...actor(),actorPermissions:[]}),periodId))).rejects.toThrow();expect(await db.payrollRun.count({where:{organizationId:org}})).toBe(0);expect(await db.payrollPaymentBatch.count({where:{organizationId:org}})).toBe(0)})

test('HR19A operator and configured recipient both require live existing salary visibility',async()=>{
 await expect(db.$transaction(tx=>handoffActor(tx,{...actor(),actorPermissions:perms.filter(p=>p!=='EMPLOYEE_SALARY_READ')}))).rejects.toThrow(/salary visibility/)
 await db.role.updateMany({where:{organizationId:org,code:users[1]},data:{permissions:perms.filter(p=>p!=='EMPLOYEE_SALARY_READ')}})
 try{await expect(read()).rejects.toThrow(/salary visibility/)}finally{await db.role.updateMany({where:{organizationId:org,code:users[1]},data:{permissions:perms}})}
})

test('HR19A employee-first competing calculation can update period without lock inversion',async()=>{
 const {lockHrisReviewEmployeeInTx}=await import('../review-lock.service');let signal!:()=>void;const selected=new Promise<void>(r=>{signal=r});let start!:()=>void;const locked=new Promise<void>(r=>{start=r})
 const writer=db.$transaction(async tx=>{await lockHrisReviewEmployeeInTx(tx,org,ids[0]);start();await selected;await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '3s'");await tx.payrollPeriod.update({where:{id:periodId},data:{name:'Synthetic reconciled October'}})},{timeout:120000})
 await locked
 const reader=db.$transaction(async tx=>{const wrapped=new Proxy(tx,{get(target,key){if(key==='payrollEmployee')return new Proxy(tx.payrollEmployee,{get(model,k){if(k==='findMany')return async(args:any)=>{const rows=await tx.payrollEmployee.findMany(args);if(args.take===1001)signal();return rows};return (model as any)[k]}});return (target as any)[key]}});return readHandoffInputsInTx(wrapped,await handoffActor(tx,actor()),periodId)},{timeout:120000})
 await writer;expect((await reader).manifest.period.name).toBe('Synthetic reconciled October')
})

let issued:Awaited<ReturnType<typeof issuePayrollHandoff>>,issueInput:any,receiptInput:any,originalBytes:string
test('HR19B concurrent exact issue retains one immutable package, one event and no payroll effects',async()=>{
 const preview=await previewPayrollHandoff(actor(),{payrollPeriodId:periodId});issueInput={payrollPeriodId:periodId,previewHash:preview.previewHash,idempotencyKey:randomUUID()}
 const outcomes=await Promise.all([issuePayrollHandoff(actor(),issueInput),issuePayrollHandoff(actor(),issueInput)]);expect(outcomes[0]).toEqual(outcomes[1]);issued=outcomes[0]
 const p=await getPayrollHandoffPackage(actor(),{packageId:issued.id});originalBytes=p.csvBytes;expect(p.freshness).toBe('CURRENT');expect(p.manifest.rows).toHaveLength(200)
 expect(await db.businessEvent.count({where:{organizationId:org,eventType:'hris.payroll.handoff.issued'}})).toBe(1)
 await expect(db.$executeRaw`UPDATE hris_payroll_handoff_packages SET "csvBytes"='changed' WHERE id=${issued.id}`).rejects.toThrow(/IMMUTABLE/)
 await expect(db.$executeRaw`DELETE FROM hris_payroll_handoff_packages WHERE id=${issued.id}`).rejects.toThrow(/IMMUTABLE/)
 await expect(issuePayrollHandoff(actor(),{...issueInput,previewHash:'sha256:'+'a'.repeat(64)})).rejects.toThrow(/REPLAY_CONFLICT/)
 await expect(issuePayrollHandoff(actor(),{...issueInput,idempotencyKey:randomUUID()})).rejects.toThrow(/REPLACEMENT/)
 expect(await db.payrollRun.count({where:{organizationId:org}})).toBe(0);expect(await db.payrollPaymentBatch.count({where:{organizationId:org}})).toBe(0)
})
test('HR19B database actor/lineage guards reject invalid inserts and failed event rolls back issuance',async()=>{
 const originalEmployee=await db.payrollEmployee.findUniqueOrThrow({where:{id:ids[0]}})
 const foreignOrg=org+'-foreign',foreignUser=foreignOrg+'-user';await db.organization.create({data:{id:foreignOrg,slug:foreignOrg,name:'Synthetic other tenant'}});await db.user.create({data:{id:foreignUser,organizationId:foreignOrg,email:foreignUser+'@example.invalid',isVerified:true}});await db.role.create({data:{organizationId:foreignOrg,code:'fixture',nameEn:'Synthetic role',permissions:perms,users:{connect:{id:foreignUser}}}})
 try{
  await expect(getPayrollHandoffPackage({organizationId:foreignOrg,actorId:foreignUser,actorPermissions:perms},{packageId:issued.id})).rejects.toThrow()
  for(const change of [{recipientUserId:foreignUser},{issuedById:foreignUser}])await expect(db.$executeRawUnsafe('INSERT INTO hris_payroll_handoff_packages SELECT (jsonb_populate_record(NULL::hris_payroll_handoff_packages,to_jsonb(p)||$1::jsonb)).* FROM hris_payroll_handoff_packages p WHERE id=$2',JSON.stringify({id:randomUUID(),idempotencyKey:randomUUID(),version:2,replacesPackageId:issued.id,...change}),issued.id)).rejects.toThrow(/ACTOR_SCOPE_MISMATCH/)
 }finally{await db.organization.delete({where:{id:foreignOrg}})}
 for(const change of [{recipientUserId:'missing-user'},{issuedById:'missing-user'},{recipientUserId:users[0]},{version:3,replacesPackageId:null}]){
  const patch={id:randomUUID(),idempotencyKey:randomUUID(),version:2,replacesPackageId:issued.id,...change}
  await expect(db.$executeRawUnsafe('INSERT INTO hris_payroll_handoff_packages SELECT (jsonb_populate_record(NULL::hris_payroll_handoff_packages,to_jsonb(p)||$1::jsonb)).* FROM hris_payroll_handoff_packages p WHERE id=$2',JSON.stringify(patch),issued.id)).rejects.toThrow(/HRIS_HANDOFF_(ACTOR_SCOPE|LINEAGE)_MISMATCH/)
 }
 await db.payrollEmployee.update({where:{id:ids[0]},data:{legalName:'Synthetic changed input'}})
 const preview=await previewPayrollHandoff(actor(),{payrollPeriodId:periodId}),key=randomUUID()
 const failing=new Proxy(db,{get(target,k){if(k==='$transaction')return (fn:any,options:any)=>db.$transaction(tx=>fn(new Proxy(tx,{get(t,p){if(p==='businessEvent')return new Proxy(tx.businessEvent,{get(m,k){if(k==='create')return async()=>{throw Error('SYNTHETIC_EVENT_FAILURE')};return (m as any)[k]}});return (t as any)[p]}})),options);return (target as any)[k]}})
 await expect(issuePayrollHandoff(actor(),{payrollPeriodId:periodId,previewHash:preview.previewHash,idempotencyKey:key,replacesPackageId:issued.id},failing)).rejects.toThrow('SYNTHETIC_EVENT_FAILURE')
 expect(await db.$queryRaw`SELECT id FROM hris_payroll_handoff_packages WHERE "organizationId"=${org} AND "idempotencyKey"=${key}`).toEqual([])
 await db.payrollEmployee.update({where:{id:ids[0]},data:{legalName:originalEmployee.legalName,updatedAt:originalEmployee.updatedAt}})
})
test('HR19B recipient without HR management can see only addressed retained package and reconcile exact rows',async()=>{
 const originalEmployee=await db.payrollEmployee.findUniqueOrThrow({where:{id:ids[0]}})
 await db.role.updateMany({where:{organizationId:org,code:users[1]},data:{permissions:['EMPLOYEE_SALARY_READ','hris.handoff.read','hris.handoff.receive']}})
 const p=await getPayrollHandoffPackage(actor(1),{packageId:issued.id});expect(p.canReceive).toBe(true);expect(p.freshness).toBe('CURRENT')
 await db.payrollEmployee.update({where:{id:ids[0]},data:{legalName:'Synthetic current source not addressed'}})
 expect(await db.$transaction(tx=>retainedHandoffFreshnessInTx(tx,actor(1),issued.id),{timeout:120000})).toBe('STALE')
 await expect(db.$transaction(async tx=>readHandoffInputsInTx(tx,await handoffActor(tx,actor(1)),periodId),{timeout:120000})).rejects.toThrow()
 await db.payrollEmployee.update({where:{id:ids[0]},data:{legalName:originalEmployee.legalName,updatedAt:originalEmployee.updatedAt}})
 await expect(previewPayrollHandoff(actor(1),{payrollPeriodId:periodId})).rejects.toThrow()
 await db.role.updateMany({where:{organizationId:org,code:users[2]},data:{permissions:['EMPLOYEE_SALARY_READ','hris.handoff.read','hris.handoff.receive']}})
 await expect(getPayrollHandoffPackage(actor(2),{packageId:issued.id})).rejects.toThrow()
 await db.role.updateMany({where:{organizationId:org,code:users[2]},data:{permissions:perms}})
 await expect(acknowledgePayrollHandoff(actor(),{packageId:p.id,packageHash:p.packageHash,acceptedRowIds:ids,rejectedRows:[],reference:'Synthetic issuer cannot acknowledge',idempotencyKey:randomUUID()})).rejects.toThrow(/independent/)
 await expect(acknowledgePayrollHandoff(actor(1),{packageId:p.id,packageHash:p.packageHash,acceptedRowIds:ids.slice(1),rejectedRows:[],reference:'Synthetic omitted row',idempotencyKey:randomUUID()})).rejects.toThrow(/RECONCILE/)
 receiptInput={packageId:p.id,packageHash:p.packageHash,acceptedRowIds:ids.slice(1),rejectedRows:[{rowId:ids[0],reason:'Synthetic name must be corrected in source'}],reference:'Synthetic recipient review only; not payment',idempotencyKey:randomUUID()}
 const failing=new Proxy(db,{get(target,k){if(k==='$transaction')return (fn:any,options:any)=>db.$transaction(tx=>fn(new Proxy(tx,{get(t,q){if(q==='auditLog')return {create:async()=>{throw Error('SYNTHETIC_AUDIT_FAILURE')}};return (t as any)[q]}})),options);return (target as any)[k]}})
 await expect(acknowledgePayrollHandoff(actor(1),receiptInput,failing)).rejects.toThrow('SYNTHETIC_AUDIT_FAILURE')
 expect(await db.$queryRaw`SELECT id FROM hris_payroll_handoff_receipts WHERE "packageId"=${issued.id}`).toEqual([])
 const results=await Promise.all([acknowledgePayrollHandoff(actor(1),receiptInput),acknowledgePayrollHandoff(actor(1),receiptInput)]);expect(results[0]).toEqual(results[1]);expect(results[0].status).toBe('CORRECTION_REQUESTED')
 await expect(db.$executeRaw`UPDATE hris_payroll_handoff_receipts SET reference='changed' WHERE id=${results[0].id}`).rejects.toThrow(/IMMUTABLE/)
 for(const removed of ['EMPLOYEE_SALARY_READ','hris.handoff.read','hris.handoff.receive']){
  await db.role.updateMany({where:{organizationId:org,code:users[1]},data:{permissions:['EMPLOYEE_SALARY_READ','hris.handoff.read','hris.handoff.receive'].filter(p=>p!==removed)}})
  await expect(acknowledgePayrollHandoff(actor(1),receiptInput)).rejects.toThrow()
  if(removed!=='hris.handoff.receive')await expect(getPayrollHandoffPackage(actor(1),{packageId:issued.id})).rejects.toThrow()
 }
 await db.role.updateMany({where:{organizationId:org,code:users[1]},data:{permissions:['EMPLOYEE_SALARY_READ','hris.handoff.read','hris.handoff.receive']}})
})
test('HR19B native certified correction makes original stale and preserves bytes in linked replacement',async()=>{
 const c=certification(ids[0],2,420)
 const correction=await correctCertifiedHrisTimeLeaveAttendance({...actor(3),payrollPeriodId:periodId,employeeId:ids[0],...c.totals,sourceSystem:c.sourceSystem,sourceRecordId:c.sourceRecordId,sourceRevision:2,preparedById:users[2],approvalEvidenceHash:'sha256:synthetic-fresh-correction-review',policy:c.policy,evidence:c.evidence,unresolved:c.unresolved,originalAttendanceSnapshotId:ids[0]+'-snapshot',correctionReason:'Synthetic recipient correction and recertification',correctionEvidenceHash:'sha256:synthetic-material-correction',idempotencyKey:randomUUID()} as any)
 expect(correction.attendanceSnapshot.totals.workedMinutes).toBe(420)
 expect((await getPayrollHandoffPackage(actor(1),{packageId:issued.id})).freshness).toBe('STALE')
 const preview=await previewPayrollHandoff(actor(),{payrollPeriodId:periodId});expect(preview.manifest.totals.workedMinutes).toBe(95940)
 const replacement=await issuePayrollHandoff(actor(),{payrollPeriodId:periodId,previewHash:preview.previewHash,idempotencyKey:randomUUID(),replacesPackageId:issued.id});expect(replacement.version).toBe(2);expect(replacement.replacesPackageId).toBe(issued.id)
 const old=await getPayrollHandoffPackage(actor(),{packageId:issued.id});expect(old.freshness).toBe('SUPERSEDED');expect(old.csvBytes).toBe(originalBytes)
 expect(await acknowledgePayrollHandoff(actor(1),receiptInput)).toMatchObject({status:'CORRECTION_REQUESTED'})
 const fresh=await getPayrollHandoffPackage(actor(1),{packageId:replacement.id});expect(fresh.canReceive).toBe(true);expect((await acknowledgePayrollHandoff(actor(1),{packageId:fresh.id,packageHash:fresh.packageHash,acceptedRowIds:ids,rejectedRows:[],reference:'Synthetic all rows and totals reconciled',idempotencyKey:randomUUID()})).status).toBe('ACKNOWLEDGED')
})
test('HR19B disabled policy permits exact recovery and labelled archive but no new issue',async()=>{
 process.env.HRIS_PAYROLL_HANDOFF_POLICIES_JSON=JSON.stringify([{...policy,enabled:false}]);try{expect(await issuePayrollHandoff(actor(),issueInput)).toEqual(issued);await expect(issuePayrollHandoff(actor(),{...issueInput,idempotencyKey:randomUUID()})).rejects.toThrow(/POLICY_UNAVAILABLE/);expect((await getPayrollHandoffPackage(actor(),{packageId:issued.id})).csvBytes).toBe(originalBytes)}finally{process.env.HRIS_PAYROLL_HANDOFF_POLICIES_JSON=JSON.stringify([policy])}
})

test('HR19C selected period predecessor remains exact beyond100 other historical periods',async()=>{
 await db.payrollPeriod.createMany({data:Array.from({length:101},(_,i)=>({id:org+'-old-'+i,organizationId:org,name:'Synthetic historical period '+i,countryCode:'GA',periodStart:new Date(Date.UTC(2015,i,1)),periodEnd:new Date(Date.UTC(2015,i+1,0)),payDate:new Date(Date.UTC(2015,i+1,0))}))})
 const w=await getPayrollHandoffWorkspace(actor());expect(w.historyTruncated).toBe(true);expect(w.periods.some(p=>p.id===periodId)).toBe(true)
 const p=await previewPayrollHandoff(actor(),{payrollPeriodId:periodId});expect(p.latestPackage?.version).toBe(2)
})

const browserTest=process.env.HRIS_HANDOFF_BROWSER==='1'?test:test.skip
browserTest('HR19C actual browser operator and recipient journey with native services and synthetic transport',async()=>{
 await db.role.updateMany({where:{organizationId:org,code:users[2]},data:{permissions:['EMPLOYEE_SALARY_READ','hris.handoff.read','hris.handoff.receive']}})
 const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),directory=path.resolve('what-next/hris-implementation-2026-10-24/HR-19/browser')
 const server=http.createServer(async(req:any,res:any)=>{try{const url=new URL(req.url,'http://127.0.0.1'),role=req.headers.cookie?.match(/fixtureRole=([^;]+)/)?.[1],a=actor(role==='recipient'?1:role==='unaddressed'?2:0);if(role==='revoked')a.actorPermissions=[];res.setHeader('Content-Type','application/json');if(url.pathname.startsWith('/fixture/')){let body='';for await(const chunk of req)body+=chunk;const input=body?JSON.parse(body):{},kind=url.pathname.slice(9);let result:unknown
 if(kind==='block'||kind==='resolve'){await db.payrollContract.update({where:{id:ids[0]+'-contract'},data:{status:kind==='block'?'DRAFT':'ACTIVE'}});result={fixture:true}}
 else if(kind==='correct'){const current=await db.payrollAttendanceSnapshot.findFirstOrThrow({where:{organizationId:org,employeeId:ids[0],payrollPeriodId:periodId,status:'FROZEN'}}),revision=Number((current.metadata as any).sourcePayload.sourceRevision)+1,c=certification(ids[0],revision,current.workedMinutes-60);result=await correctCertifiedHrisTimeLeaveAttendance({...actor(3),payrollPeriodId:periodId,employeeId:ids[0],...c.totals,sourceSystem:c.sourceSystem,sourceRecordId:c.sourceRecordId,sourceRevision:revision,preparedById:users[0],approvalEvidenceHash:'sha256:synthetic-browser-correction-'+revision,policy:{...c.policy,reviewedById:users[0]},evidence:c.evidence,unresolved:c.unresolved,originalAttendanceSnapshotId:current.id,correctionReason:'Synthetic recipient time correction',correctionEvidenceHash:'sha256:synthetic-browser-correct-'+revision,idempotencyKey:randomUUID()} as any)}
 else if(kind==='workspace')result=await getPayrollHandoffWorkspace(a)
 else if(kind==='preview')result=await previewPayrollHandoff(a,input)
 else if(kind==='issue')result=await issuePayrollHandoff(a,input)
 else if(kind==='package')result=await getPayrollHandoffPackage(a,input)
 else if(kind==='receive')result=await acknowledgePayrollHandoff(a,input)
 else throw Error('Unknown synthetic action');res.end(JSON.stringify(result));return}
 if(['/bundle.js','/styles.css'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(directory,url.pathname.slice(1))));return}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
 }catch(e){res.statusCode=403;res.end(JSON.stringify({error:(e as Error).message}))}})
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));try{const results=await require('../../../what-next/hris-implementation-2026-10-24/HR-19/browser/check.cjs')(`http://127.0.0.1:${server.address().port}`);expect(results.length).toBeGreaterThanOrEqual(18)}finally{await new Promise<void>(r=>server.close(r));await db.role.updateMany({where:{organizationId:org,code:users[2]},data:{permissions:perms}})}
},600000)
