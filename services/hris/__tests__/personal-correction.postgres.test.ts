import {randomUUID} from "node:crypto"
import {db} from "@/prisma/db"
import {submitOwnCorrection,getOwnCorrectionWorkspace,getCorrectionReview,decideCorrection,amendOwnCorrection,getCorrectionQueue} from "../personal-correction.service"
import {requestOwnOperationalTime,cancelOwnLeaveRequest} from "../self-service-boundary.service"
import {importOperationalTime} from "../operational-time.service"
import {upsertHrisEmployeeProfile} from "../employee.service"
import {getHrisEmployeeSelfService} from "../self-service.service"
import {uploadEmployeeDocument,reviewEmployeeDocument,grantEmployeeDocument,listEmployeeDocuments,downloadEmployeeDocument} from "../employee-document.service"
import type {EmployeeDocumentPorts} from "../employee-document.storage"
import {GET as ownDocumentGET,POST as ownDocumentPOST} from "@/app/api/hris/my-documents/route"
import {requireDocumentActor} from "../employee-document.authorization"
jest.mock("../employee-document.authorization",()=>({requireDocumentActor:jest.fn()}))
jest.mock("@/prisma/db",()=>{const {PrismaClient}=require("@prisma/client"),url=process.env.HRIS_CORRECTNESS_DATABASE_URL;if(url!=="postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public")throw Error("Owned synthetic target required");return {db:new PrismaClient({datasources:{db:{url}},transactionOptions:{maxWait:15000,timeout:25000}})}})
const org='hr16-'+randomUUID(),users=[0,1,2,3].map(i=>org+i),employee=org+'-employee',otherEmployee=org+'-other',permissions=['hris.self_service.read','hris.self_service.request','hris.people.read','hris.people.manage','hris.documents.read','hris.documents.manage'],actor=(i=0)=>({organizationId:org,actorId:users[i],actorPermissions:permissions})
const policy={organizationId:org,version:'synthetic-v1',allowedFields:['displayName','legalName'],reviewerId:users[1],supportLabelEn:'Synthetic HR support',supportLabelFr:'Assistance RH synthétique',approvalReference:'synthetic-reviewed-policy',effectiveFrom:'2026-01-01T00:00:00Z',effectiveTo:'2030-01-01T00:00:00Z'}
const request=(value='Synthetic corrected '+randomUUID())=>({proposal:{displayName:value},reason:'Synthetic personal correction request',idempotencyKey:randomUUID()})
async function review(id:string,decision='APPROVE',i=1){const v=await getCorrectionReview(actor(i),id);return {caseId:id,revision:v.revision,reviewVersion:v.reviewVersion,decision,acknowledged:true,reason:'Synthetic independent review of current facts',idempotencyKey:randomUUID()}}
const objects=new Map<string,Buffer>(),ports:EmployeeDocumentPorts={store:{name:'HR16 synthetic document store',async put(k,b){objects.set(k,Buffer.from(b))},async get(k){return objects.get(k)!},async remove(k){objects.delete(k)}},scanner:{name:'HR16 synthetic scanner',async scan(b,sha256){return {sha256,verdict:'CLEAN',reference:'synthetic-proof'}}}}
beforeAll(async()=>{
 process.env.HRIS_PERSONAL_CORRECTION_POLICIES_JSON=JSON.stringify([policy]);process.env.HRIS_DOCUMENT_GRANT_SECRET='synthetic-hr16-secret-'.repeat(3)
 process.env.HRIS_DOCUMENT_POLICIES_JSON=JSON.stringify([{organizationId:org,countryCode:'CM',code:'IDENTITY',version:'1',nameEn:'Synthetic identity policy',nameFr:'Politique identité synthétique',retentionDays:30,employeeVisible:true,employeeMayUpload:true,approvalReference:'synthetic-document-policy',approvedBy:'synthetic-reviewer',approvedAt:'2026-01-01T00:00:00Z',effectiveFrom:'2026-01-01T00:00:00Z',effectiveTo:'2030-01-01T00:00:00Z',documentKind:'IDENTITY'}])
 await db.organization.create({data:{id:org,name:'Synthetic correction employer',slug:org,country:'CM',timezone:'Africa/Douala'}})
 for(const [i,id] of users.entries()){await db.user.create({data:{id,organizationId:org,email:id+'@example.invalid',name:'Synthetic actor '+i,isVerified:true}});await db.role.create({data:{organizationId:org,code:id,nameEn:id,permissions,users:{connect:{id}}}})}
 for(const [id,userId] of [[employee,users[0]],[otherEmployee,users[2]]])await db.payrollEmployee.create({data:{id,organizationId:org,userId,employeeNumber:id,displayName:'Synthetic original '+id,hireDate:new Date('2026-01-01'),countryCode:'CM',status:'ACTIVE'}})
})
afterAll(async()=>{try{await db.$executeRaw`DELETE FROM hris_personal_correction_cases WHERE "organizationId"=${org}`;await db.$executeRaw`DELETE FROM hris_employee_documents WHERE "organizationId"=${org}`;await db.hrisTimeRequest.deleteMany({where:{organizationId:org}});await db.hrisAttendanceAnomaly.deleteMany({where:{organizationId:org}});await db.hrisTimeEntry.deleteMany({where:{organizationId:org}});await db.hrisTimeImportBatch.deleteMany({where:{organizationId:org}});await db.hrisWorkSchedule.deleteMany({where:{organizationId:org}});await db.hrisWorkCalendar.deleteMany({where:{organizationId:org}});await db.hrisLeaveBalanceEntry.deleteMany({where:{organizationId:org}});await db.hrisLeavePolicy.deleteMany({where:{organizationId:org}});await db.payrollEmployee.deleteMany({where:{organizationId:org}});await db.organization.deleteMany({where:{id:org}});expect(await db.organization.count({where:{id:org}})).toBe(0)}finally{await db.$disconnect();delete process.env.HRIS_PERSONAL_CORRECTION_POLICIES_JSON;delete process.env.HRIS_DOCUMENT_POLICIES_JSON;delete process.env.HRIS_DOCUMENT_GRANT_SECRET}},120000)
test('own mode rejects injected identity and restricts fields; missing configuration is truthful',async()=>{
 await expect(submitOwnCorrection(actor(),{...request(),employeeId:otherEmployee})).rejects.toThrow();await expect(submitOwnCorrection(actor(),{...request(),proposal:{employeeNumber:'changed'}})).rejects.toThrow();await expect(submitOwnCorrection(actor(),{...request(),proposal:{legalName:'Unproved legal name'}})).rejects.toThrow(/IDENTITY_DOCUMENT/)
 const own=await getOwnCorrectionWorkspace(actor());expect(own.profile.displayName).toContain(employee);expect(own.canSubmit).toBe(true)
 delete process.env.HRIS_PERSONAL_CORRECTION_POLICIES_JSON;expect(await getOwnCorrectionWorkspace(actor())).toMatchObject({canSubmit:false,unavailableReason:'POLICY_UNAVAILABLE'});process.env.HRIS_PERSONAL_CORRECTION_POLICIES_JSON=JSON.stringify([policy])
 await expect(getOwnCorrectionWorkspace(actor(3))).rejects.toThrow(/account link/)
})
test('concurrent submission and decision recover one native applied version',async()=>{
 const input=request(),created=await Promise.all([submitOwnCorrection(actor(),input),submitOwnCorrection(actor(),input)]);expect(created[0].id).toBe(created[1].id)
 await expect(submitOwnCorrection(actor(),{...input,reason:'Changed same replay key'})).rejects.toThrow(/REPLAY_CONFLICT/)
 const decision=await review(created[0].id);await expect(decideCorrection(actor(),{...decision,reviewVersion:(await getCorrectionReview(actor(),created[0].id)).reviewVersion})).rejects.toThrow(/Independent/);await expect(decideCorrection(actor(2),{...decision,reviewVersion:(await getCorrectionReview(actor(2),created[0].id)).reviewVersion})).rejects.toThrow(/assigned/)
 const receipts=await Promise.all([decideCorrection(actor(1),decision),decideCorrection(actor(1),decision)]);expect(receipts[0]).toEqual(receipts[1]);expect(receipts[0]).toMatchObject({status:'APPLIED',appliedBusinessEventId:expect.any(String),appliedEmployeeVersion:expect.any(String)})
 expect((await db.payrollEmployee.findUniqueOrThrow({where:{id:employee}})).displayName).toBe(input.proposal.displayName);expect(await db.businessEvent.count({where:{organizationId:org,idempotencyKey:`hris-personal-correction:${created[0].id}:1`}})).toBe(1)
 await expect(decideCorrection(actor(1),{...decision,reason:'Changed decision after uncertain response'})).rejects.toThrow(/REPLAY_CONFLICT/)
})
test('return, amended revision, stale rejection and rejection preserve history',async()=>{
 const c=await submitOwnCorrection(actor(),request()),returned=await decideCorrection(actor(1),await review(c.id,'RETURN'))
 const amendment={...request('Synthetic amended name'),caseId:c.id,revision:returned.revision},amended=await amendOwnCorrection(actor(),amendment);expect(await amendOwnCorrection(actor(),amendment)).toEqual(amended)
 const reject=await review(c.id,'REJECT'),receipt=await decideCorrection(actor(1),reject);expect(receipt.status).toBe('REJECTED')
 const row=(await getOwnCorrectionWorkspace(actor())).cases.find(r=>r.id===c.id)!;expect(row.history.map(h=>h.operation)).toEqual(['SUBMITTED','RETURN','AMENDED','REJECT']);expect(row.history[0].proposal).toEqual(c.proposal)
 await expect(amendOwnCorrection(actor(),{...amendment,idempotencyKey:randomUUID()})).rejects.toThrow(/STALE/)
})
test('profile changes invalidate review and case/apply rollback is atomic',async()=>{
 const c=await submitOwnCorrection(actor(),request()),v=await review(c.id);await db.payrollEmployee.update({where:{id:employee},data:{legalName:'Synthetic unrelated current edit'}});await expect(decideCorrection(actor(1),v)).rejects.toThrow(/STALE/)
 const fresh=await review(c.id),before=(await db.payrollEmployee.findUniqueOrThrow({where:{id:employee}})).displayName
 await expect(db.$transaction(async tx=>{await decideCorrection(actor(1),fresh,tx);throw Error('synthetic rollback')})).rejects.toThrow('synthetic rollback');expect((await db.payrollEmployee.findUniqueOrThrow({where:{id:employee}})).displayName).toBe(before);expect((await getCorrectionReview(actor(1),c.id)).status).toBe('REQUESTED');expect(await db.businessEvent.count({where:{organizationId:org,idempotencyKey:`hris-personal-correction:${c.id}:1`}})).toBe(0)
 await decideCorrection(actor(1),fresh)
})
test('changed proposed source cannot be overwritten and revoked reviewer loses authority',async()=>{
 const c=await submitOwnCorrection(actor(),request());await db.payrollEmployee.update({where:{id:employee},data:{displayName:'Synthetic HR changed source'}});await expect(decideCorrection(actor(1),await review(c.id))).rejects.toThrow(/SOURCE_CHANGED/)
 const d=await review(c.id,'RETURN');await db.user.update({where:{id:users[1]},data:{isActive:false}});await expect(decideCorrection(actor(1),d)).rejects.toThrow();expect((await getOwnCorrectionWorkspace(actor())).canSubmit).toBe(false);await db.user.update({where:{id:users[1]},data:{isActive:true}})
})
test('native profile writer and correction apply use a compatible lock order',async()=>{
 const c=await submitOwnCorrection(actor(),request()),decision=await review(c.id),e=await db.payrollEmployee.findUniqueOrThrow({where:{id:employee}})
 const results=await Promise.allSettled([decideCorrection(actor(1),decision),upsertHrisEmployeeProfile({...actor(2),employeeId:e.id,employeeNumber:e.employeeNumber,displayName:e.displayName,legalName:'Synthetic concurrent HR edit',hireDate:e.hireDate,countryCode:e.countryCode,expectedUpdatedAt:e.updatedAt.toISOString(),idempotencyKey:randomUUID()})]);expect(results.some(r=>r.status==='fulfilled')).toBe(true);for(const r of results)if(r.status==='rejected')expect(String(r.reason)).not.toMatch(/deadlock|timeout/i)
})
test('own time and cancellation derive employee even for dual-role HR accounts',async()=>{
 const periodStart=new Date('2026-10-24'),input={employeeId:otherEmployee,type:'OVERTIME',periodStart,periodEnd:periodStart,requestedMinutes:60,reason:'Synthetic own overtime',requestEvidenceHash:'sha256:synthetic-own-time',idempotencyKey:randomUUID()},r=await requestOwnOperationalTime(actor(),input);expect(r.request.employeeId).toBe(employee)
 const foreign=await db.hrisTimeRequest.create({data:{organizationId:org,employeeId:otherEmployee,type:'LEAVE',periodStart,periodEnd:periodStart,requestedMinutes:60,reason:'Synthetic foreign leave',requestedById:users[2],requestEvidenceHash:'sha256:synthetic-foreign',sourceHash:randomUUID(),idempotencyKey:randomUUID()}})
 await expect(cancelOwnLeaveRequest(actor(),{employeeId:otherEmployee,requestId:foreign.id,reason:'Attempted cross employee cancellation',idempotencyKey:randomUUID()})).rejects.toThrow(/not found/)
 const view=await getHrisEmployeeSelfService(actor());expect(view.operationalTime.employeeId).toBe(employee);expect(view.operationalTime.requests.every(r=>r.id!==foreign.id)).toBe(true)
})
test('own document mode excludes other employees and HR decisions regardless of broad role',async()=>{
 const bytes=Buffer.from('%PDF-1.4\nSynthetic other employee original\n%%EOF'),draft=await uploadEmployeeDocument(actor(2),{policyCode:'IDENTITY',title:'Synthetic identity original',mimeType:'application/pdf',idempotencyKey:randomUUID()},bytes,ports),r=await reviewEmployeeDocument(actor(1),{documentId:draft.id,revision:draft.revision,decision:'APPROVE',acknowledged:true,reason:'Synthetic original review'})
 expect((await grantEmployeeDocument(actor(),r.id)).token).toBeTruthy();await expect(grantEmployeeDocument({...actor(),ownOnly:true},r.id)).rejects.toThrow();await expect(listEmployeeDocuments({...actor(),ownOnly:true},otherEmployee)).rejects.toThrow();const own=await listEmployeeDocuments({...actor(),ownOnly:true});expect(own).toMatchObject({canReview:false,canRetain:false,employeeId:employee});const g=await grantEmployeeDocument(actor(),r.id);await expect(downloadEmployeeDocument({...actor(),ownOnly:true},g.token,ports)).rejects.toThrow()
})
test('own HTTP endpoint ignores supplied target and denies HR decisions and pending reviewer privilege',async()=>{
 (requireDocumentActor as jest.Mock).mockResolvedValue(actor());process.env.NEXTAUTH_URL='http://localhost:3000'
 const response=await ownDocumentGET(new Request('http://localhost:3000/api/hris/my-documents?employeeId='+otherEmployee));expect(response.status).toBe(200);expect(await response.json()).toMatchObject({employeeId:employee,canReview:false,canRetain:false})
 const bytes=Buffer.from('%PDF-1.4\nPending original prepared by HR\n%%EOF'),draft=await uploadEmployeeDocument(actor(1),{employeeId:employee,policyCode:'IDENTITY',title:'Pending HR prepared identity',mimeType:'application/pdf',idempotencyKey:randomUUID()},bytes,ports)
 expect((await grantEmployeeDocument(actor(),draft.id)).token).toBeTruthy();await expect(grantEmployeeDocument({...actor(),ownOnly:true},draft.id)).rejects.toThrow()
 const post=await ownDocumentPOST(new Request('http://localhost:3000/api/hris/my-documents',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({command:'REVIEW',input:{documentId:draft.id}})}));expect(post.status).toBe(403)
 delete process.env.NEXTAUTH_URL
})
test('amended legal-name case retains and binds each supporting original and source version',async()=>{
 async function identity(label:string){const bytes=Buffer.from('%PDF-1.4\nSynthetic identity '+label+'\n%%EOF'),draft=await uploadEmployeeDocument(actor(),{policyCode:'IDENTITY',title:'Synthetic identity '+label,mimeType:'application/pdf',idempotencyKey:randomUUID()},bytes,ports);return reviewEmployeeDocument(actor(1),{documentId:draft.id,revision:draft.revision,decision:'APPROVE',acknowledged:true,reason:'Synthetic document inspection'})}
 const a=await identity('A'),b=await identity('B'),c=await submitOwnCorrection(actor(),{...request(),proposal:{legalName:'Synthetic legal correction A'},documentId:a.id}),returned=await decideCorrection(actor(1),await review(c.id,'RETURN'))
 await db.payrollEmployee.update({where:{id:employee},data:{legalName:'Synthetic baseline after return'}})
 await amendOwnCorrection(actor(),{...request(),proposal:{legalName:'Synthetic legal correction B'},documentId:b.id,caseId:c.id,revision:returned.revision})
 const rows=await db.$queryRaw<Array<{history:any[]}>>`SELECT history FROM hris_personal_correction_cases WHERE id=${c.id}`,history=rows[0].history
 expect(history[0]).toMatchObject({documentId:a.id,documentHash:expect.stringMatching(/^[a-f0-9]{64}$/),policy:{version:policy.version}});expect(history[2]).toMatchObject({documentId:b.id,baseline:{legalName:'Synthetic baseline after return'}})
 const docs=await db.$queryRaw<Array<{evidenceBoundAt:Date|null}>>`SELECT "evidenceBoundAt" FROM hris_employee_documents WHERE id IN (${a.id},${b.id})`;expect(docs.every(d=>d.evidenceBoundAt)).toBe(true)
 expect((await decideCorrection(actor(1),await review(c.id))).status).toBe('APPLIED');expect((await db.payrollEmployee.findUniqueOrThrow({where:{id:employee}})).legalName).toBe('Synthetic legal correction B')
 expect(JSON.stringify(await getOwnCorrectionWorkspace(actor()))).not.toContain('documentHash')
})

test('rendered dual-role own cases, time requests and protected documents in EN/FR',async()=>{
 const at=(s:string)=>new Date(s+'T00:00:00Z'),leave=await db.hrisLeavePolicy.create({data:{organizationId:org,code:randomUUID(),name:'Synthetic browser leave policy',countryCode:'CM',annualEntitlementMinutes:4800,carryOverLimitMinutes:0,effectiveFrom:at('2026-01-01'),status:'ACTIVE',preparedById:users[0],approvedById:users[1],approvalEvidenceHash:'sha256:synthetic-policy',sourceHash:'sha256:synthetic-policy',accrualRule:{schemaVersion:1,employeeIds:[employee],negativeBalance:'FORBID',rounding:'EXACT_MINUTES',credits:[],expiry:'NONE',carryover:null}}})
 const calendar=await db.hrisWorkCalendar.create({data:{organizationId:org,code:randomUUID(),name:'Synthetic calendar',countryCode:'CM',timezone:'Africa/Douala',effectiveFrom:at('2026-01-01'),status:'ACTIVE',reviewedById:users[1],sourceHash:'sha256:synthetic-calendar'}})
 await db.hrisWorkSchedule.create({data:{organizationId:org,employeeId:employee,calendarId:calendar.id,name:'Synthetic reviewed schedule',timezone:'Africa/Douala',effectiveFrom:at('2026-01-01'),status:'ACTIVE',preparedById:users[0],approvedById:users[1],approvalEvidenceHash:'sha256:synthetic-schedule',sourceHash:'sha256:synthetic-schedule',standardWeeklyMinutes:3360,weeklyPattern:{sun:480,mon:480,tue:480,wed:480,thu:480,fri:480,sat:480}}})
 const batch=await importOperationalTime({...actor(1),sourceSystem:'SYNTHETIC_HR16_BROWSER',sourceHash:randomUUID(),idempotencyKey:randomUUID(),entries:[{employeeId:employee,workDate:at('2026-10-24'),scheduledMinutes:480,workedMinutes:360,absenceMinutes:120,overtimeMinutes:0,sourceRecordId:randomUUID(),sourceHash:'sha256:synthetic-browser-entry'}]})
 const entry=await db.hrisTimeEntry.findFirstOrThrow({where:{organizationId:org,importBatchId:batch.id}})
 const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),directory=path.resolve('what-next/hris-implementation-2026-10-24/HR-16/browser')
 const server=http.createServer(async(req:any,res:any)=>{try{
  const url=new URL(req.url,'http://127.0.0.1'),role=req.headers.cookie?.match(/fixtureRole=([^;]+)/)?.[1],a=actor(role==='checker'?1:role==='unlinked'?3:0)
  if(role==='revoked')a.actorPermissions=[]
  res.setHeader('Content-Type','application/json')
  if(url.pathname==='/fixture/boot'){const p=url.searchParams.get('path')??'',own=p.includes('/me');res.end(JSON.stringify(p.endsWith('/corrections')?{own,initial:own?await getOwnCorrectionWorkspace(a):await getCorrectionQueue(a)}:{model:await getHrisEmployeeSelfService(a)}));return}
  if(url.pathname==='/fixture/action'){
   const parts=[];let length=0;for await(const c of req){length+=c.length;if(length>16384)throw Error('bounded fixture');parts.push(c)}const {operation,input}=JSON.parse(Buffer.concat(parts).toString()),fns:Record<string,()=>Promise<unknown>>={OWN:()=>getOwnCorrectionWorkspace(a),QUEUE:()=>getCorrectionQueue(a),SUBMIT:()=>submitOwnCorrection(a,input),AMEND:()=>amendOwnCorrection(a,input),REVIEW:()=>getCorrectionReview(a,input.caseId),DECIDE:()=>decideCorrection(a,input),TIME:()=>requestOwnOperationalTime(a,input),CANCEL:()=>cancelOwnLeaveRequest(a,input)};if(!fns[operation])throw Error('unknown operation');res.end(JSON.stringify({success:true,data:await fns[operation]()}));return
  }
  if(url.pathname==='/api/hris/my-documents'){
   const ownActor={...a,ownOnly:true};if(req.method==='GET'){res.end(JSON.stringify(await listEmployeeDocuments(ownActor)));return}const parts=[];for await(const c of req)parts.push(c);const input=JSON.parse(Buffer.concat(parts).toString());if(input.command==='GRANT'){res.end(JSON.stringify(await grantEmployeeDocument(ownActor,input.documentId)));return}if(input.command==='DOWNLOAD'){const r=await downloadEmployeeDocument(ownActor,input.token,ports);res.setHeader('Content-Type',r.mimeType);res.end(r.bytes);return}throw Error('own command denied')
  }
  if(['/bundle.js','/styles.css'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(directory,url.pathname.slice(1))));return}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
 }catch(e){res.statusCode=403;res.end(JSON.stringify({success:false,status:403,error:'Synthetic request denied: '+String(e)}))}})
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));try{const result=await require('../../../what-next/hris-implementation-2026-10-24/HR-16/browser/check.cjs')(`http://127.0.0.1:${server.address().port}`,leave.id,entry.id);expect(result).toHaveLength(14);expect(await db.hrisTimeRequest.count({where:{organizationId:org,employeeId:employee,type:'LEAVE'}})).toBe(2);expect(await db.hrisTimeRequest.count({where:{organizationId:org,employeeId:employee,type:'ATTENDANCE_CORRECTION'}})).toBe(2)}finally{await new Promise<void>(r=>server.close(r))}
},240000)
