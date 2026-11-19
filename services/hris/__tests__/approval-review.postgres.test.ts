import {randomUUID} from "node:crypto"
import {db} from "@/prisma/db"
import {upsertHrisEmployeeProfile} from "../employee.service"
import {createPayrollContract,updatePayrollContract} from "@/services/payroll/contract.service"
import {requestHrisContractDocumentEvidence} from "../document-evidence.service"
import {requestHrisContractActivation} from "../contract.service"
import {requestHrisEmployeeLifecycle} from "../lifecycle.service"
import {requestHrisPaymentDestinationChange} from "../payment-destination.service"
import {requestHrisSalaryChange,requestHrisCompensationAssignment} from "../compensation.service"
import {getHrisApprovalReview,decideReviewedHrisApproval,type HrisApprovalReview} from "../approval-review.service"
import {attachPayrollEmployeeEvidenceReferences} from "@/services/payroll/employee.service"
import {createTimeFoundation,approveTimeFoundation} from "../operational-time.service"
import {prepareHrisWorkSchedule} from "../schedule-revision.service"
import {getTimeApprovalReview,decideReviewedTimeApproval} from "../time-review.service"
import {saveSetupReviewer,revokeSetupReviewer,executeWorkspaceSetup} from "../workspace-setup.service"
import {getHrisManagerSelfService} from "../manager-self-service.service"
jest.mock("@/prisma/db",()=>{const {PrismaClient}=require("@prisma/client"),url=process.env.HRIS_CORRECTNESS_DATABASE_URL;if(url!=="postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public")throw Error("Owned explicit database required");return {db:new PrismaClient({datasources:{db:{url}},transactionOptions:{maxWait:15000,timeout:25000}})}})
const ns="hr14-"+randomUUID(),org=ns,users=[0,1,2,3].map(i=>ns+i),permissions=["hris.people.read","hris.people.manage","payroll.contracts.manage","payroll.contracts.read","EMPLOYEE_SALARY_READ","payroll.employees.manage"]
const actor=(i=0)=>({organizationId:org,actorId:users[i],actorPermissions:permissions}),today=new Date().toISOString().slice(0,10),future=new Date(Date.now()+30*86400000).toISOString().slice(0,10)
let employeeId:string,contractId:string
const target=(domain:HrisApprovalReview["domain"],sourceId:string,decision:HrisApprovalReview["decision"]="APPROVE",i=1)=>({...actor(i),employeeId,domain,sourceId,decision})
const envelope=(v:HrisApprovalReview,i=1)=>({...target(v.domain,v.sourceId,v.decision,i),reviewVersion:v.version,acknowledged:true as const,decisionReason:"Synthetic review of all displayed facts",evidenceReferences:v.evidence.map(e=>e.id)})
async function decide(t:ReturnType<typeof target>){const view=await getHrisApprovalReview(t);return decideReviewedHrisApproval(envelope(view,users.indexOf(t.actorId)))}
beforeAll(async()=>{
 process.env.HRIS_SETUP_PILOT_ORGANIZATIONS=org;process.env.PAYROLL_PAYMENT_DESTINATION_HASH_SECRET="synthetic-only-hr14-secret-never-production-0123456789"
 await db.organization.create({data:{id:org,name:"Synthetic review employer",slug:org,country:"CM",timezone:"Africa/Douala"}})
 for(const id of users){await db.user.create({data:{id,organizationId:org,email:id+"@example.invalid",isVerified:true,name:"Synthetic reviewer "+users.indexOf(id)}});await db.role.create({data:{organizationId:org,code:id,nameEn:id,permissions,users:{connect:{id}}}})}
 employeeId=(await upsertHrisEmployeeProfile({...actor(),createOnly:true,employeeNumber:ns,displayName:"Synthetic review employee",hireDate:new Date(today),countryCode:"CM"})).payrollEmployee.id
 contractId=(await createPayrollContract({...actor(),employeeId,contractNumber:ns,type:"CDI",effectiveFrom:today,baseSalary:"150000",currency:"XAF",workingHoursPerMonth:"160"})).contract.id
})
afterAll(async()=>{try{
 await db.$executeRaw`DELETE FROM hris_setup_reviewer_grants WHERE "organizationId"=${org}`
 await db.hrisTimeRequest.deleteMany({where:{organizationId:org}});await db.hrisWorkSchedule.deleteMany({where:{organizationId:org}});await db.hrisPublicHoliday.deleteMany({where:{organizationId:org}});await db.hrisWorkCalendar.deleteMany({where:{organizationId:org}});await db.hrisLeavePolicy.deleteMany({where:{organizationId:org}})
 await db.payrollEmployeeRubriqueAssignment.deleteMany({where:{organizationId:org}});await db.payrollSalaryChangeRequest.deleteMany({where:{organizationId:org}});await db.payrollPaymentDestinationChangeRequest.deleteMany({where:{organizationId:org}});await db.payrollContract.deleteMany({where:{organizationId:org}});await db.payrollEmployee.deleteMany({where:{organizationId:org}});await db.organization.deleteMany({where:{id:org}});await db.user.deleteMany({where:{id:{in:users}}});expect(await db.user.count({where:{id:{in:users}}})).toBe(0);expect(await db.organization.count({where:{id:org}})).toBe(0)
 }finally{delete process.env.HRIS_SETUP_PILOT_ORGANIZATIONS;await db.$disconnect()}},120000)
test("document review binds source version, preserves transaction atomicity, and recovers concurrent retries",async()=>{
 await requestHrisContractDocumentEvidence({...actor(),employeeId,contractId,artifactHash:"sha256:synthetic-document",malwareScanEvidenceHash:"sha256:synthetic-scan",malwareScanProvider:"Synthetic scanner",malwareScannedAt:new Date(today),signedAt:new Date(today),retentionPolicyCode:"SYNTHETIC",retentionBasis:"Synthetic retention basis",retainUntil:new Date(Date.now()+365*86400000)})
 const t=target("CONTRACT_DOCUMENT",contractId),view=await getHrisApprovalReview(t),input=envelope(view)
 expect(JSON.stringify(view)).not.toContain("sha256:synthetic-document");expect(view.fields.some(f=>f.key==="scanProvider")).toBe(true)
 await expect(getHrisApprovalReview({...t,...actor()})).rejects.toThrow(/Independent/)
 await expect(decideReviewedHrisApproval({...input,reviewVersion:"a".repeat(64)})).rejects.toThrow(/STALE/)
 await expect(db.$transaction(async tx=>{await decideReviewedHrisApproval(input,tx);throw Error("rollback probe")})).rejects.toThrow("rollback probe")
 expect(await db.auditLog.count({where:{organizationId:org,action:"HRIS_REVIEW_DECISION_RECORDED"}})).toBe(0)
 expect((await getHrisApprovalReview(t)).version).toBe(view.version)
 const receipts=await Promise.all([decideReviewedHrisApproval(input),decideReviewedHrisApproval(input)])
 expect(receipts[0].id).toBe(receipts[1].id);expect(receipts.map(r=>r.replayed).sort()).toEqual([false,true]);expect(receipts[0]).toMatchObject({status:"APPROVED",actor:{id:users[1]},scope:{employeeId}})
 await expect(decideReviewedHrisApproval({...input,decisionReason:"Changed review after uncertain response"})).rejects.toThrow(/REPLAY_CONFLICT/)
 await db.user.update({where:{id:users[1]},data:{isActive:false}});await expect(decideReviewedHrisApproval(input)).rejects.toThrow();await db.user.update({where:{id:users[1]},data:{isActive:true}})
})
test("contract review denies salary disclosure and stale direct edits, then records approval",async()=>{
 await requestHrisContractActivation({...actor(),employeeId,contractId,reason:"Synthetic agreed contract",requestEvidenceHash:"sha256:synthetic-activation"})
 const t=target("CONTRACT_ACTIVATION",contractId),v=await getHrisApprovalReview(t)
 await expect(getHrisApprovalReview({...t,actorPermissions:["hris.people.manage"]})).rejects.toThrow(/salary visibility/)
 expect(v.fields.some(f=>f.key==="classification")).toBe(true)
 await updatePayrollContract({...actor(),contractId,classification:"Synthetic grade"})
 await expect(decideReviewedHrisApproval(envelope(v))).rejects.toThrow(/STALE/)
 expect((await decide(t)).status).toBe("APPROVED")
})
test("payment and lifecycle decisions keep independent actors and human receipts",async()=>{
 const payment=await requestHrisPaymentDestinationChange({...actor(),employeeId,paymentMethod:"CASH",requestReason:"Synthetic payment setup",evidenceDocumentHash:"sha256:synthetic-payment"}),id=payment.paymentDestinationChange.id
 const pv=await getHrisApprovalReview(target("PAYMENT_DESTINATION",id));expect(JSON.stringify(pv)).not.toContain("paymentDestinationHash")
 await decideReviewedHrisApproval(envelope(pv));await expect(getHrisApprovalReview(target("PAYMENT_DESTINATION",id,"APPLY",1))).rejects.toThrow(/Independent/)
 expect((await decide(target("PAYMENT_DESTINATION",id,"APPLY",2))).status).toBe("APPLIED")
 const life=await requestHrisEmployeeLifecycle({...actor(),employeeId,type:"ONBOARD",effectiveAt:new Date(today),reason:"Synthetic onboarding",evidenceHash:"sha256:synthetic-onboard"})
 await decide(target("LIFECYCLE",life.workflow.requestId));expect((await decide(target("LIFECYCLE",life.workflow.requestId,"APPLY",2))).status).toBe("APPLIED")
})
test("salary receipt and material compensation fields use native owners",async()=>{
 const salary=await requestHrisSalaryChange({...actor(),employeeId,sourceContractId:contractId,proposedBaseSalary:"175000",effectiveFrom:future,requestReason:"Synthetic planned increase",evidenceDocumentHash:"sha256:synthetic-salary"})
 await decide(target("SALARY_CHANGE",salary.salaryChange.id));expect((await decide(target("SALARY_CHANGE",salary.salaryChange.id,"APPLY",2))).status).toBe("APPLIED")
 const component=await db.payrollRubrique.create({data:{organizationId:org,code:ns,label:"Synthetic allowance",kind:"EARNING",valueType:"FIXED_AMOUNT",status:"ACTIVE"}})
 const assignment=await requestHrisCompensationAssignment({...actor(),employeeId,rubriqueId:component.id,amount:"1000",currency:"XAF",effectiveFrom:today,effectiveTo:today,evidenceDocumentHash:"sha256:synthetic-assignment"})
 const id=assignment.assignment.id,v=await getHrisApprovalReview(target("COMPENSATION_ASSIGNMENT",id));expect(v.fields.map(f=>f.key)).toEqual(expect.arrayContaining(["kind","valueType","taxable","social","employerCharge","contracts"]))
 expect((await decideReviewedHrisApproval(envelope(v))).status).toBe("APPROVED")
})
test("future lifecycle receipt remains scheduled on exact recovery",async()=>{
 const life=await requestHrisEmployeeLifecycle({...actor(),employeeId,type:"TERMINATE",effectiveAt:new Date(future),reason:"Synthetic future leaver",evidenceHash:"sha256:synthetic-leaver"});await decide(target("LIFECYCLE",life.workflow.requestId))
 const v=await getHrisApprovalReview(target("LIFECYCLE",life.workflow.requestId,"APPLY",2)),input=envelope(v,2),receipt=await decideReviewedHrisApproval(input)
 expect(receipt).toMatchObject({status:"SCHEDULED",scheduledFor:new Date(future).toISOString()});expect((await decideReviewedHrisApproval(input)).replayed).toBe(true)
 expect((await db.payrollEmployee.findUniqueOrThrow({where:{id:employeeId}})).status).toBe("ACTIVE")
})

test("concurrent native evidence attachment cannot overwrite approved lifecycle metadata",async()=>{
 const e=(await upsertHrisEmployeeProfile({...actor(),createOnly:true,employeeNumber:randomUUID(),displayName:"Synthetic metadata collision",hireDate:new Date(today),countryCode:"CM"})).payrollEmployee.id
 const request=await requestHrisEmployeeLifecycle({...actor(),employeeId:e,type:"ONBOARD",effectiveAt:new Date(today),reason:"Synthetic metadata collision",evidenceHash:"sha256:synthetic-collision"})
 const v=await getHrisApprovalReview({...target("LIFECYCLE",request.workflow.requestId),employeeId:e}),input={...envelope(v),employeeId:e}
 let entered!:()=>void,release!:()=>void;const reached=new Promise<void>(r=>entered=r),barrier=new Promise<void>(r=>release=r)
 const deciding=db.$transaction(async tx=>{const proxy=new Proxy(tx,{get(target,key){if(key!=="auditLog")return Reflect.get(target,key);return new Proxy(target.auditLog,{get(model,property){if(property!=="create")return Reflect.get(model,property);return async(args:any)=>{if(args.data.entityType==="HrisReviewedDecision"){entered();await barrier}return model.create(args)}}})}});return decideReviewedHrisApproval(input,proxy)})
 await reached;let attachmentRead=false
 const attaching=db.$transaction(async tx=>{const proxy=new Proxy(tx,{get(target,key){if(key!=="payrollEmployee")return Reflect.get(target,key);return new Proxy(target.payrollEmployee,{get(model,property){if(property!=="findFirst")return Reflect.get(model,property);return async(args:any)=>{attachmentRead=true;return model.findFirst(args)}}})}});return attachPayrollEmployeeEvidenceReferences({...actor(2),employeeId:e,evidenceReferences:[{type:"CONTRACT",documentHash:"sha256:synthetic-attached",label:"Synthetic retained contract"}]},proxy)})
 await new Promise(r=>setTimeout(r,80));expect(attachmentRead).toBe(false);release();await Promise.all([deciding,attaching])
 const metadata=(await db.payrollEmployee.findUniqueOrThrow({where:{id:e}})).metadata as any;expect(metadata.hrisLifecycle.pending.status).toBe("APPROVED");expect(metadata.hrEvidenceReferences).toHaveLength(1)
})

test("policy and schedule controlled review preserve native serialization and stale checks",async()=>{
 const foundation=await createTimeFoundation({...actor(),calendarCode:randomUUID(),calendarName:"Synthetic review calendar",leavePolicyCode:randomUUID(),leavePolicyName:"Synthetic leave rules",countryCode:"CM",timezone:"Africa/Douala",effectiveFrom:new Date(today),effectiveTo:new Date(future),calendarSourceHash:"sha256:synthetic-calendar",leavePolicySourceHash:"sha256:synthetic-policy",holidays:[],annualEntitlementMinutes:480,carryOverLimitMinutes:0,accrualRule:{schemaVersion:1,employeeIds:[employeeId],negativeBalance:"FORBID",rounding:"EXACT_MINUTES",credits:[{date:today,minutes:480,kind:"ACCRUAL"}],expiry:"NONE",carryover:null}})
 const policyTarget={...actor(1),domain:"TIME_POLICY" as const,sourceId:foundation.calendar.id,employeeId:"",leavePolicyId:foundation.leavePolicy.id,decision:"APPROVE" as const},v=await getTimeApprovalReview(policyTarget),input={...policyTarget,reviewVersion:v.version,acknowledged:true as const,decisionReason:"Synthetic policy review",evidenceReferences:["REQUEST"] as ["REQUEST"]}
 const outcomes=await Promise.allSettled([decideReviewedTimeApproval(input),approveTimeFoundation({...actor(2),calendarId:foundation.calendar.id,leavePolicyId:foundation.leavePolicy.id,approvalEvidenceHash:"sha256:synthetic-direct-review"})]);expect(outcomes.filter(r=>r.status==="fulfilled")).toHaveLength(1)
 for(const result of outcomes)if(result.status==="rejected")expect(String(result.reason)).not.toMatch(/deadlock|timeout/i)
 const schedule=await prepareHrisWorkSchedule({...actor(),employeeId,calendarId:foundation.calendar.id,name:"Synthetic office",timezone:"Africa/Douala",weeklyPattern:{sun:0,mon:480,tue:480,wed:480,thu:480,fri:480,sat:0},standardWeeklyMinutes:2400,effectiveFrom:new Date(today),effectiveTo:new Date(today),sourceHash:"sha256:synthetic-schedule"})
 const t={...actor(1),domain:"WORK_SCHEDULE" as const,sourceId:schedule.id,employeeId,decision:"APPROVE" as const},view=await getTimeApprovalReview(t),command={...t,reviewVersion:view.version,acknowledged:true as const,decisionReason:"Synthetic schedule review",evidenceReferences:["REQUEST"] as ["REQUEST"]}
 await db.hrisWorkSchedule.update({where:{id:schedule.id},data:{name:"Changed schedule"}});await expect(decideReviewedTimeApproval(command)).rejects.toThrow(/STALE/)
 const fresh=await getTimeApprovalReview(t),receipt=await decideReviewedTimeApproval({...command,reviewVersion:fresh.version});expect(receipt).toMatchObject({status:"APPROVED",scope:{employeeId}})
 expect((await decideReviewedTimeApproval({...command,reviewVersion:fresh.version})).replayed).toBe(true)
})

test("time decision grants are employee-specific, expire before replay, and do not manufacture manage permission",async()=>{
 await db.role.updateMany({where:{organizationId:org,code:users[3]},data:{permissions:["hris.people.read"]}})
 const reviewer={...actor(3),actorPermissions:["hris.people.read"]},grant=await saveSetupReviewer(actor(),{reviewerUserId:users[3],employeeId,domain:"TIME_REQUEST",authority:"APPROVAL_DECISION",effectiveFrom:new Date(Date.now()-3600000),effectiveTo:new Date(Date.now()+3600000),reason:"Synthetic bounded reviewer"})
 const request=await db.hrisTimeRequest.create({data:{organizationId:org,employeeId,type:"OVERTIME",periodStart:new Date(today),periodEnd:new Date(today),requestedMinutes:60,reason:"Synthetic overtime request",requestedById:users[0],requestEvidenceHash:"sha256:synthetic-request",sourceHash:randomUUID(),idempotencyKey:randomUUID()}})
 const t={...reviewer,domain:"TIME_REQUEST" as const,sourceId:request.id,employeeId,decision:"REJECT" as const},view=await getTimeApprovalReview(t),input={...t,reviewVersion:view.version,acknowledged:true as const,decisionReason:"Synthetic rejected overtime",evidenceReferences:["REQUEST"] as ["REQUEST"]}
 await expect(getTimeApprovalReview({...t,employeeId:"foreign-employee"})).rejects.toThrow();await expect(getTimeApprovalReview({...t,...actor(0)})).rejects.toThrow(/preparer/)
 await expect(db.$transaction(async tx=>{await decideReviewedTimeApproval(input,tx);throw Error("time rollback")})).rejects.toThrow("time rollback");expect((await db.hrisTimeRequest.findUniqueOrThrow({where:{id:request.id}})).status).toBe("REQUESTED")
 const receipt=await decideReviewedTimeApproval(input);expect(receipt.scope.authority).toBe("EXPLICIT_DOMAIN_REVIEW_GRANT");expect((await decideReviewedTimeApproval(input)).replayed).toBe(true)
 await revokeSetupReviewer(actor(),grant.id);await expect(decideReviewedTimeApproval(input)).rejects.toThrow(/REVIEW_SCOPE/)
})

test("legacy workspace policy approvals serialize before account SHARE locks",async()=>{
 const prepared=await createTimeFoundation({...actor(),calendarCode:randomUUID(),calendarName:"Synthetic compatibility calendar",leavePolicyCode:randomUUID(),leavePolicyName:"Synthetic compatibility policy",countryCode:"CM",timezone:"Africa/Douala",effectiveFrom:new Date(today),effectiveTo:new Date(future),calendarSourceHash:"sha256:synthetic-calendar",leavePolicySourceHash:"sha256:synthetic-policy",holidays:[],annualEntitlementMinutes:480,carryOverLimitMinutes:0,accrualRule:{mode:"MANUAL_REVIEWED_LEDGER"}})
 const command={operation:"APPROVE_POLICY",data:{calendarId:prepared.calendar.id,leavePolicyId:prepared.leavePolicy.id,approvalEvidenceHash:"sha256:synthetic-compat-review"}}
 const outcomes=await Promise.allSettled([executeWorkspaceSetup(actor(1),command),executeWorkspaceSetup(actor(2),command)]);expect(outcomes.filter(x=>x.status==="fulfilled")).toHaveLength(1);for(const r of outcomes)if(r.status==="rejected")expect(String(r.reason)).not.toMatch(/deadlock|timeout/i)
})

test("rendered controlled review EN/FR width keyboard stale and uncertain recovery",async()=>{
 const fixtures:Record<string,any>={}
 for(const locale of ["en","fr"]){
   const e=(await upsertHrisEmployeeProfile({...actor(),createOnly:true,employeeNumber:randomUUID(),displayName:"Synthetic browser employee "+locale,hireDate:new Date(today),countryCode:"CM"})).payrollEmployee.id
   const c=(await createPayrollContract({...actor(),employeeId:e,contractNumber:randomUUID(),type:"CDI",effectiveFrom:today,baseSalary:"150000",currency:"XAF",workingHoursPerMonth:"160"})).contract.id
   await requestHrisContractDocumentEvidence({...actor(),employeeId:e,contractId:c,artifactHash:"sha256:synthetic-browser-document",malwareScanEvidenceHash:"sha256:synthetic-browser-scan",malwareScanProvider:"Synthetic scanner",malwareScannedAt:new Date(today),signedAt:new Date(today),retentionPolicyCode:"SYNTHETIC",retentionBasis:"Synthetic review retention",retainUntil:new Date(Date.now()+365*86400000)})
   fixtures[locale+"/document"]={domain:"CONTRACT_DOCUMENT",decision:"APPROVE",employeeId:e,sourceId:c}
   const r=await db.hrisTimeRequest.create({data:{organizationId:org,employeeId:e,type:"OVERTIME",periodStart:new Date(today),periodEnd:new Date(today),requestedMinutes:60,reason:"Synthetic browser overtime",requestedById:users[0],requestEvidenceHash:"sha256:synthetic-request",sourceHash:randomUUID(),idempotencyKey:randomUUID()}})
   fixtures[locale+"/time"]={domain:"TIME_REQUEST",decision:"REJECT",employeeId:e,sourceId:r.id}
 }
 const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),directory=path.resolve("what-next/hris-implementation-2026-10-24/HR-14/browser");let lost=false
 const server=http.createServer(async(req:any,res:any)=>{try{
   if(req.url.startsWith("/boot/")){res.setHeader("Content-Type","application/json");if(req.url.includes("/dashboard/people/team")){const locale=req.url.includes("/fr/")?"fr":"en",target=fixtures[locale+"/time"],model=await getHrisManagerSelfService(actor(1));model.operationalTime.requests=model.operationalTime.requests.filter(r=>r.id===target.sourceId);res.end(JSON.stringify({target,model}));return}res.end(JSON.stringify({target:fixtures[req.url.slice(6)]}));return}
   if(req.url==="/api"||req.url==="/fixture/stale"){
     let body="";for await(const chunk of req){body+=chunk;if(body.length>20000)throw Error("Bounded fixture payload required")};const command=JSON.parse(body);res.setHeader("Content-Type","application/json")
     if(req.url==="/fixture/stale"){await db.payrollContract.update({where:{id:fixtures[command.locale+"/document"].sourceId},data:{classification:"Synthetic revised classification"}});res.end("{}");return}
     const index=req.headers.cookie?.includes("fixtureRole=checker")?1:3,context=index===1?actor(1):{...actor(3),actorPermissions:[]}
     const methods:Record<string,(v:any)=>Promise<any>>={PREVIEW:getHrisApprovalReview,DECIDE:decideReviewedHrisApproval,TIME_PREVIEW:getTimeApprovalReview,TIME_DECIDE:decideReviewedTimeApproval};if(!methods[command.operation])throw Error("Unknown fixture operation")
     const data=await methods[command.operation]({...command.input,...context})
     if(command.operation==="DECIDE"&&command.input.sourceId===fixtures["en/document"].sourceId&&!lost){lost=true;res.end(JSON.stringify({success:false,code:"INTERNAL_ERROR"}));return}
     res.end(JSON.stringify({success:true,data}));return
   }
   if(["/bundle.js","/styles.css"].includes(req.url)){res.setHeader("Content-Type",req.url.endsWith("css")?"text/css":"text/javascript");res.end(fs.readFileSync(path.join(directory,req.url.slice(1))));return}
   res.setHeader("Content-Type","text/html; charset=utf-8");res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
 }catch(error){res.end(JSON.stringify({success:false,code:String(error).includes("STALE")?"CONFLICT":"FORBIDDEN"}))}})
 await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));try{const results=await require("../../../what-next/hris-implementation-2026-10-24/HR-14/browser/check.cjs")(`http://127.0.0.1:${server.address().port}`);expect(results.length).toBe(17)}finally{await new Promise<void>(r=>server.close(r))}
},240000)
