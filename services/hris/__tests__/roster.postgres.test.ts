import { randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { assignWorkSchedule, approveWorkSchedule } from "../operational-time.service"
import { allocateOperationalMinutes } from "../time-allocation"
import { previewOperationalTime, importReviewedOperationalTime, resolveReviewedOperationalAnomaly } from "../attendance-import.service"
import { getRosterWorkspace, certifyRosterAttendance } from "../roster-workspace.service"
import { requestOperationalTime, decideOperationalTimeRequest, assertOperationalAttendanceCurrentInTx } from "../operational-time.service"
import { correctedAttendanceEntry } from "../attendance-correction"
import { certifyOperationalAttendance } from "../operational-attendance.service"
import { previewAttendanceFile, commitAttendanceFile } from "../attendance-file.service"
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client"), url = process.env.HRIS_CORRECTNESS_DATABASE_URL
  if (url !== "postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public") throw Error("Owned explicit database required")
  return { db: new PrismaClient({ datasources: { db: { url } }, transactionOptions: { maxWait: 15000, timeout: 60000 } }) }
})
const ns = "hris-roster-" + randomUUID(), org = ns + "-a", foreign = ns + "-b", users = [ns + "-maker", ns + "-checker"]
const actor = (i=0) => ({organizationId: org, actorId: users[i], actorPermissions: ["hris.people.manage"]})
const at=(day:string)=>new Date(day+"T00:00:00Z")
const pattern={sun:0,mon:480,tue:480,wed:480,thu:480,fri:480,sat:0}
async function fixture() {
  const employee=await db.payrollEmployee.create({data:{organizationId:org,employeeNumber:randomUUID(),displayName:"Synthetic roster",hireDate:at("2025-01-01"),countryCode:"CM",status:"ACTIVE"}})
  const calendar=await db.hrisWorkCalendar.create({data:{organizationId:org,code:randomUUID(),name:"Synthetic calendar",countryCode:"CM",timezone:"Africa/Douala",effectiveFrom:at("2025-01-01"),status:"ACTIVE",reviewedById:users[1],sourceHash:"sha256:calendar-reviewed"}})
  return {...actor(),employeeId:employee.id,calendarId:calendar.id,name:"Office",timezone:"Africa/Douala",weeklyPattern:pattern,standardWeeklyMinutes:2400,effectiveFrom:at("2026-01-01"),sourceHash:"sha256:source-reviewed"}
}
const approve=(employeeId:string,scheduleId:string)=>({...actor(1),employeeId,scheduleId,approvalEvidenceHash:"sha256:independent-publish"})
async function publish(command:Awaited<ReturnType<typeof fixture>>) { const draft=await assignWorkSchedule(command);return approveWorkSchedule(approve(command.employeeId,draft.id)) }
async function schedules(employeeId:string) {return db.hrisWorkSchedule.findMany({where:{organizationId:org,employeeId,status:"ACTIVE"},include:{calendar:{include:{holidays:true}}}})}
function allocate(rows:Awaited<ReturnType<typeof schedules>>,date:string,minutes:number){return allocateOperationalMinutes({entries:[{id:"synthetic-entry",workDate:at(date),scheduledMinutes:minutes,workedMinutes:minutes,absenceMinutes:0,overtimeMinutes:0}],requests:[],schedules:rows,policies:[],periodStart:at(date),periodEnd:at(date)})}
beforeAll(async()=>{for(const id of [org,foreign])await db.organization.create({data:{id,name:"Synthetic roster employer",slug:id}});for(const id of users)await db.user.create({data:{id,organizationId:org,email:id+"@example.invalid"}})})
afterAll(async()=>{try{
  const where={organizationId:{in:[org,foreign]}};
  await db.hrisReportingRelationship.deleteMany({where});await db.hrisEmploymentAssignment.deleteMany({where});await db.hrisPosition.deleteMany({where});await db.hrisOrgUnit.deleteMany({where});
  await db.payrollAttendanceSnapshot.deleteMany({where});await db.hrisAttendanceAnomaly.deleteMany({where});await db.hrisTimeRequest.deleteMany({where});await db.hrisTimeEntry.deleteMany({where});await db.hrisTimeImportBatch.deleteMany({where});await db.hrisLeavePolicy.deleteMany({where});
  await db.payrollRun.deleteMany({where});await db.payrollPeriod.deleteMany({where});
  await db.hrisWorkSchedule.updateMany({where,data:{supersedesScheduleId:null}});await db.hrisWorkSchedule.deleteMany({where});await db.hrisWorkCalendar.deleteMany({where});await db.payrollEmployee.deleteMany({where});
  await db.organization.deleteMany({where:{id:{in:[org,foreign]}}});expect(await db.organization.count({where:{id:{in:[org,foreign]}}})).toBe(0)
}finally{await db.$disconnect()}},120000)
test("parallel prepare and publish replay retain one version; independent review and evidence are required",async()=>{
  const f=await fixture(),[a,b]=await Promise.all([assignWorkSchedule(f),assignWorkSchedule(f)]);expect(a.id).toBe(b.id)
  await expect(approveWorkSchedule({...approve(f.employeeId,a.id),actorId:users[0]})).rejects.toThrow("SOD")
  const [p,q]=await Promise.all([approveWorkSchedule(approve(f.employeeId,a.id)),approveWorkSchedule(approve(f.employeeId,a.id))]);expect(p.id).toBe(q.id)
  await expect(approveWorkSchedule({...approve(f.employeeId,a.id),approvalEvidenceHash:"sha256:changed-evidence"})).rejects.toThrow("REPLAY_CONFLICT")
})
test("seven-day office/shift roster retains earlier evidence and returns to recurring office pattern after finite shift",async()=>{
  const f=await fixture(),office=await publish(f),before=allocate(await schedules(f.employeeId),"2026-01-29",480)
  for(const [date,off] of [["2026-01-30",false],["2026-01-31",true],["2026-02-01",true]] as const){
    const next=new Date(at(date).getTime()+86400000).toISOString().slice(0,10)
    const draft=await assignWorkSchedule({...f,name:off?"Explicit off day":"Night shift",effectiveFrom:at(date),effectiveTo:at(date),shiftPlan:{workDate:date,timezone:f.timezone,shifts:off?[]:[{start:date+"T22:00+01:00",end:next+"T06:00+01:00",unpaidBreaks:[]}]}})
    await approveWorkSchedule(approve(f.employeeId,draft.id))
  }
  expect(allocate(await schedules(f.employeeId),"2026-01-29",480)).toEqual(before)
  expect((await db.hrisWorkSchedule.findUniqueOrThrow({where:{id:office.id}})).status).toBe("ACTIVE")
  expect(allocate(await schedules(f.employeeId),"2026-01-30",480).usedSchedules[0].id).not.toBe(office.id)
  expect(allocate(await schedules(f.employeeId),"2026-02-02",480).usedSchedules[0].id).toBe(office.id)
  const all=await schedules(f.employeeId),entries=["2026-01-29","2026-01-30","2026-02-02","2026-02-03","2026-02-04"].map(d=>({id:d,workDate:at(d),scheduledMinutes:480,workedMinutes:480,absenceMinutes:0,overtimeMinutes:0}))
  expect(allocateOperationalMinutes({entries,requests:[],schedules:all,policies:[],periodStart:at("2026-01-29"),periodEnd:at("2026-02-04")}).totals.workedMinutes).toBe(2400)
})
test("whole overnight month-end shift belongs once to local start date; neighbor overlap blocked",async()=>{
  const f=await fixture();await publish(f)
  const command={...f,effectiveFrom:at("2026-01-31"),effectiveTo:at("2026-01-31"),shiftPlan:{workDate:"2026-01-31",timezone:f.timezone,shifts:[{start:"2026-01-31T22:00+01:00",end:"2026-02-01T06:00+01:00",unpaidBreaks:[{start:"2026-02-01T02:00+01:00",end:"2026-02-01T02:30+01:00"}]}]}}
  const row=await assignWorkSchedule(command);await approveWorkSchedule(approve(f.employeeId,row.id));expect(allocate(await schedules(f.employeeId),"2026-01-31",450).totals.workedMinutes).toBe(450)
  const other=await assignWorkSchedule({...command,effectiveFrom:at("2026-02-01"),effectiveTo:at("2026-02-01"),shiftPlan:{...command.shiftPlan,workDate:"2026-02-01",shifts:[{start:"2026-02-01T05:00+01:00",end:"2026-02-01T10:00+01:00",unpaidBreaks:[]}]}})
  await expect(approveWorkSchedule(approve(f.employeeId,other.id))).rejects.toThrow("overlap")
})
test("same-interval corrections retain predecessor and reject stale concurrent drafts",async()=>{
  const f=await fixture(),first=await publish(f),command={...f,supersedesScheduleId:first.id,expectedSourceHash:first.sourceHash,name:"Reviewed replacement"}
  const a=await assignWorkSchedule(command),b=await assignWorkSchedule({...command,name:"Competing correction"});await approveWorkSchedule(approve(f.employeeId,a.id))
  await expect(approveWorkSchedule(approve(f.employeeId,b.id))).rejects.toThrow("PREDECESSOR_STALE")
  expect((await db.hrisWorkSchedule.findUniqueOrThrow({where:{id:first.id}})).status).toBe("RETIRED")
  expect((await approveWorkSchedule(approve(f.employeeId,first.id))).id).toBe(first.id)
  await expect(assignWorkSchedule({...command,name:"Stale source"})).rejects.toThrow("PREDECESSOR_STALE")
})
test("legacy nonmidnight bounds and foreign employee are blocked without implicit backfill",async()=>{
  const f=await fixture();const old=await db.hrisWorkSchedule.create({data:{organizationId:org,employeeId:f.employeeId,calendarId:f.calendarId,name:f.name,timezone:f.timezone,weeklyPattern:pattern,standardWeeklyMinutes:2400,effectiveFrom:new Date("2026-01-01T12:00:00Z"),status:"ACTIVE",sourceHash:f.sourceHash,preparedById:users[0],approvedById:users[1],approvalEvidenceHash:"sha256:legacy-review"}})
  await expect(assignWorkSchedule(f)).rejects.toThrow("LEGACY_BOUNDS_UNRESOLVED")
  expect((await db.hrisWorkSchedule.findUniqueOrThrow({where:{id:old.id}})).effectiveFrom.toISOString()).toBe("2026-01-01T12:00:00.000Z")
  await expect(assignWorkSchedule({...f,organizationId:foreign})).rejects.toThrow()
})
test("caller rollback removes draft and audit together",async()=>{const f=await fixture();await expect(db.$transaction(async tx=>{await assignWorkSchedule(f,tx);throw Error("synthetic rollback")})).rejects.toThrow("synthetic rollback");expect(await db.hrisWorkSchedule.count({where:{employeeId:f.employeeId}})).toBe(0)})

const observation=(f:Awaited<ReturnType<typeof fixture>>,overrides:any={})=>({...actor(),sourceSystem:"Synthetic reader",sourceHash:randomUUID(),idempotencyKey:randomUUID(),entries:[{employeeId:f.employeeId,sourceRecordId:randomUUID(),workDate:at("2026-01-05"),scheduledMinutes:480,workedMinutes:360,absenceMinutes:120,overtimeMinutes:0,sourceHash:"sha256:synthetic-observation",...overrides}]})
test("preview and parallel exact commit deduplicate batches and provider records; changed data requires correction",async()=>{
  const f=await fixture(),command=observation(f),preview=await previewOperationalTime(command)
  expect(preview.rows[0].issues).toEqual([])
  const [a,b]=await Promise.all([importReviewedOperationalTime({...command,previewHash:preview.payloadHash}),importReviewedOperationalTime({...command,previewHash:preview.payloadHash})]);expect(a.id).toBe(b.id)
  const duplicate=await importReviewedOperationalTime({...command,sourceHash:randomUUID(),idempotencyKey:randomUUID()});expect(duplicate.acceptedCount).toBe(0)
  expect(await db.hrisTimeEntry.count({where:{employeeId:f.employeeId}})).toBe(1)
  await expect(importReviewedOperationalTime({...command,entries:[{...command.entries[0],workedMinutes:400,absenceMinutes:80}]})).rejects.toThrow("REPLAY_CONFLICT")
  await expect(importReviewedOperationalTime({...command,sourceHash:randomUUID(),idempotencyKey:randomUUID(),entries:[{...command.entries[0],workedMinutes:400,absenceMinutes:80}]})).rejects.toThrow("SOURCE_RECORD_CHANGED")
  await expect(importReviewedOperationalTime({...command,previewHash:"sha256:stale-preview"})).rejects.toThrow("PREVIEW_CHANGED")
})
test("material anomaly needs real repair; correction creates a new frozen revision and rejects stale payroll evidence",async()=>{
  const f=await fixture();await publish(f)
  await db.hrisLeavePolicy.create({data:{organizationId:org,code:randomUUID(),name:"Synthetic enrollment",countryCode:"CM",effectiveFrom:at("2026-01-01"),annualEntitlementMinutes:480,status:"ACTIVE",preparedById:users[0],approvedById:users[1],approvalEvidenceHash:"sha256:reviewed-policy",sourceHash:"sha256:synthetic-policy",accrualRule:{schemaVersion:1,employeeIds:[f.employeeId],negativeBalance:"FORBID",rounding:"EXACT_MINUTES",credits:[],expiry:"NONE",carryover:null}}})
  const period=await db.payrollPeriod.create({data:{organizationId:org,name:randomUUID(),countryCode:"CM",periodStart:at("2026-01-05"),periodEnd:new Date("2026-01-05T23:59:59Z"),payDate:at("2026-01-06")}})
  const cert={...actor(1),employeeId:f.employeeId,payrollPeriodId:period.id,approvalEvidenceHash:"sha256:certification-one"}
  await importReviewedOperationalTime(observation(f,{absenceMinutes:0}))
  const anomaly=await db.hrisAttendanceAnomaly.findFirstOrThrow({where:{employeeId:f.employeeId}})
  await expect(certifyRosterAttendance(cert)).rejects.toThrow()
  await expect(resolveReviewedOperationalAnomaly({...actor(),anomalyId:anomaly.id,status:"DISMISSED",resolutionHash:"sha256:synthetic-repair"})).rejects.toThrow("REPAIR_REQUIRED")
  const valid=await importReviewedOperationalTime(observation(f)),entry=await db.hrisTimeEntry.findFirstOrThrow({where:{importBatchId:valid.id}})
  await expect(certifyRosterAttendance(cert)).rejects.toThrow("INPUT_UNAPPROVED")
  const repair={...actor(),anomalyId:anomaly.id,status:"RESOLVED" as const,resolutionHash:"sha256:synthetic-repair",replacementEntryId:entry.id}
  await resolveReviewedOperationalAnomaly(repair);await resolveReviewedOperationalAnomaly(repair)
  await expect(certifyRosterAttendance({...cert,...actor()})).rejects.toThrow("SOD")
  await expect(certifyOperationalAttendance({...cert,...actor(),preparedById:users[1]})).rejects.toThrow("SOD")
  const first=await certifyRosterAttendance(cert),original=await db.payrollAttendanceSnapshot.findUniqueOrThrow({where:{id:first.attendanceSnapshot.id}})
  const correction=await requestOperationalTime({...actor(),employeeId:f.employeeId,type:"ATTENDANCE_CORRECTION",periodStart:at("2026-01-05"),periodEnd:at("2026-01-05"),requestedMinutes:480,proposedWorkedMinutes:480,proposedAbsenceMinutes:0,targetTimeEntryId:entry.id,expectedEntryHash:correctedAttendanceEntry(entry,[]).sourceHash,reason:"Synthetic missed clock-out",requestEvidenceHash:"sha256:corrected-observation",idempotencyKey:randomUUID()})
  await decideOperationalTimeRequest({...actor(1),employeeId:f.employeeId,requestId:correction.request.id,decision:"APPROVE",decisionReason:"Independent source review",approvalEvidenceHash:"sha256:correction-approved"})
  await expect(db.$transaction(tx=>assertOperationalAttendanceCurrentInTx(tx,{organizationId:org,employeeId:f.employeeId,payrollPeriodId:period.id},original.metadata))).rejects.toThrow("STALE")
  const latest=await certifyRosterAttendance({...cert,approvalEvidenceHash:"sha256:certification-two"});expect(latest.attendanceSnapshot.correctedFromId).toBe(original.id);expect(latest.attendanceSnapshot.totals.workedMinutes).toBe(480)
  expect((await db.hrisTimeEntry.findUniqueOrThrow({where:{id:entry.id}})).workedMinutes).toBe(360)
  expect((await getRosterWorkspace({...actor(1),employeeId:f.employeeId,startDate:at("2026-01-05"),payrollPeriodId:period.id})).closure?.snapshots).toHaveLength(2)
  await importReviewedOperationalTime({...observation(f,{workDate:at("2026-01-04"),scheduledMinutes:0,workedMinutes:0,absenceMinutes:0}),...actor(1)})
  await db.hrisTimeRequest.create({data:{organizationId:org,employeeId:f.employeeId,type:"OVERTIME",status:"APPROVED",periodStart:at("2026-01-04"),periodEnd:at("2026-01-05"),requestedMinutes:1,requestedById:users[0],reviewedById:users[1],reason:"Synthetic adjacent source scope",requestEvidenceHash:"sha256:adjacent-request",approvalEvidenceHash:"sha256:adjacent-review",sourceHash:"sha256:adjacent-source",idempotencyKey:randomUUID()}})
  await expect(certifyOperationalAttendance({...cert,preparedById:users[0],approvalEvidenceHash:"sha256:adjacent-certification"})).rejects.toThrow("SOD")
})
test("self reads only linked employee published plans; foreign and unlinked scopes fail closed",async()=>{
  const f=await fixture();await db.payrollEmployee.update({where:{id:f.employeeId},data:{userId:users[0]}});await publish(f);await assignWorkSchedule({...f,effectiveFrom:at("2026-02-01"),name:"Unpublished draft"})
  const input={...actor(),actorPermissions:["hris.self_service.read"],own:true,startDate:at("2026-02-01")}
  const view=await getRosterWorkspace(input);expect(view.employees.map(e=>e.id)).toEqual([f.employeeId]);expect(view.versions).toEqual([]);expect(view.calendars).toEqual([])
  await expect(getRosterWorkspace({...input,employeeId:"foreign-employee"})).rejects.toThrow()
  await expect(getRosterWorkspace({...input,actorId:users[1]})).rejects.toThrow()
  await expect(getRosterWorkspace({...actor(),organizationId:foreign,employeeId:f.employeeId,startDate:at("2026-01-05")})).rejects.toThrow()
})
test("reused key conflicts even when another retained source matches requested content",async()=>{
  const f=await fixture(),b=observation(f),a=observation(f,{workDate:at("2026-01-06")});await importReviewedOperationalTime(b);await importReviewedOperationalTime(a)
  await expect(importReviewedOperationalTime({...b,idempotencyKey:a.idempotencyKey})).rejects.toThrow("REPLAY_CONFLICT")
})
test("published changes cannot rewrite consumed payroll; declared holidays block working shifts",async()=>{
  const f=await fixture(),draft=await assignWorkSchedule({...f,effectiveFrom:at("2026-03-01"),effectiveTo:at("2026-03-31")})
  const period=await db.payrollPeriod.create({data:{organizationId:org,name:randomUUID(),countryCode:"CM",periodStart:at("2026-03-01"),periodEnd:at("2026-03-31"),payDate:at("2026-03-31")}})
  const run=await db.payrollRun.create({data:{organizationId:org,payrollPeriodId:period.id,runNumber:randomUUID(),status:"CALCULATED",countryCode:"CM",countryPackVersion:"synthetic",countryPackSchemaVersion:"synthetic",countryPackResolutionHash:"synthetic",countryPackCapabilityStatus:"SYNTHETIC_ONLY",ruleSetHash:"synthetic",calculationHash:"synthetic",attendanceSnapshotHash:"synthetic"}})
  try{await expect(approveWorkSchedule(approve(f.employeeId,draft.id))).rejects.toThrow("REQUIRES_PAYROLL_CORRECTION");expect((await db.hrisWorkSchedule.findUniqueOrThrow({where:{id:draft.id}})).status).toBe("DRAFT")}finally{await db.payrollRun.delete({where:{id:run.id}})}
  await db.hrisPublicHoliday.create({data:{organizationId:org,calendarId:f.calendarId,holidayDate:at("2026-04-01"),name:"Synthetic configured holiday",sourceHash:"sha256:reviewed-holiday"}})
  await expect(assignWorkSchedule({...f,effectiveFrom:at("2026-04-01"),effectiveTo:at("2026-04-01"),shiftPlan:{workDate:"2026-04-01",timezone:f.timezone,shifts:[{start:"2026-04-01T08:00+01:00",end:"2026-04-01T16:00+01:00",unpaidBreaks:[]}]}})).rejects.toThrow("HOLIDAY_POLICY_UNRESOLVED")
})
test("supervisor roster uses exact effective reports and revocation removes access",async()=>{
  const manager=await fixture(),report=await fixture(),unrelated=await fixture(),user=ns+"-manager";await db.user.create({data:{id:user,organizationId:org,email:user+"@example.invalid"}});await db.payrollEmployee.update({where:{id:manager.employeeId},data:{userId:user}})
  const unit=await db.hrisOrgUnit.create({data:{organizationId:org,code:randomUUID(),name:"Synthetic roster team",type:"TEAM",effectiveFrom:at("2025-01-01")}}),position=await db.hrisPosition.create({data:{organizationId:org,orgUnitId:unit.id,code:randomUUID(),title:"Synthetic role",effectiveFrom:at("2025-01-01")}})
  const assignments=await Promise.all([manager,report].map(f=>db.hrisEmploymentAssignment.create({data:{organizationId:org,employeeId:f.employeeId,orgUnitId:unit.id,positionId:position.id,effectiveFrom:at("2025-01-01")}})))
  const relationship=await db.hrisReportingRelationship.create({data:{organizationId:org,managerEmployeeId:manager.employeeId,managerAssignmentId:assignments[0].id,reportEmployeeId:report.employeeId,reportAssignmentId:assignments[1].id,effectiveFrom:at("2025-01-01"),approvedById:users[1],approvalEvidenceHash:"sha256:synthetic-team-review",reasonHash:"sha256:synthetic-reason"}})
  const command={organizationId:org,actorId:user,actorPermissions:["hris.people.read"],startDate:at("2026-01-05")}
  expect((await getRosterWorkspace(command)).employees.map(e=>e.id)).toEqual([report.employeeId]);await expect(getRosterWorkspace({...command,employeeId:unrelated.employeeId})).rejects.toThrow()
  await db.hrisReportingRelationship.update({where:{id:relationship.id},data:{effectiveTo:at("2026-02-01")}});await expect(getRosterWorkspace({...command,employeeId:report.employeeId})).rejects.toThrow()
})
test("rendered EN/FR manager prepare-review-import-repair-certify and employee published schedule",async()=>{
  const fixtures:Record<string,any>={};for(const locale of ["en","fr"]){
    const f=await fixture(),user=ns+"-browser-"+locale;await db.user.create({data:{id:user,organizationId:org,email:user+"@example.invalid"}});await db.payrollEmployee.update({where:{id:f.employeeId},data:{userId:user}})
    await db.hrisLeavePolicy.create({data:{organizationId:org,code:randomUUID(),name:"Synthetic browser policy",countryCode:"CM",effectiveFrom:at("2026-01-01"),annualEntitlementMinutes:480,status:"ACTIVE",preparedById:users[0],approvedById:users[1],approvalEvidenceHash:"sha256:browser-reviewed-policy",sourceHash:"sha256:browser-policy",accrualRule:{schemaVersion:1,employeeIds:[f.employeeId],negativeBalance:"FORBID",rounding:"EXACT_MINUTES",credits:[],expiry:"NONE",carryover:null}}})
    const period=await db.payrollPeriod.upsert({where:{organizationId_periodStart_periodEnd:{organizationId:org,periodStart:at("2026-01-05"),periodEnd:new Date("2026-01-05T23:59:59Z")}},update:{},create:{organizationId:org,name:"Synthetic closure",countryCode:"CM",periodStart:at("2026-01-05"),periodEnd:new Date("2026-01-05T23:59:59Z"),payDate:at("2026-01-06")}})
    fixtures[locale]={employeeId:f.employeeId,calendarId:f.calendarId,payrollPeriodId:period.id,user}
  }
  const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),directory=path.resolve("what-next/hris-implementation-2026-10-24/HR-13/browser")
  const server=http.createServer(async(req:any,res:any)=>{try{
    if(req.url==="/api"){
      let body="";for await(const chunk of req){body+=chunk;if(body.length>300000)throw Error("Too large")};const {command,input}=JSON.parse(body),f=fixtures[input.locale],role=/fixtureRole=([^;]+)/.exec(req.headers.cookie||"")?.[1]
      const context=role==="hr"?actor():role==="checker"?actor(1):role==="self"?{...actor(),actorId:f.user,actorPermissions:["hris.self_service.read"]}:{...actor(),actorPermissions:[]}
      const payload={employeeId:f.employeeId,startDate:at("2026-01-05"),payrollPeriodId:f.payrollPeriodId,...input,...context};let data
      if(command==="BOOT"||command==="READ"||command==="OWN")data=await getRosterWorkspace({...payload,own:command==="OWN"||input.own===true})
      else if(command==="PREPARE")data=await assignWorkSchedule({...payload,calendarId:f.calendarId})
      else if(command==="APPROVE")data=await approveWorkSchedule(payload)
      else if(command==="PREVIEW")data=await previewAttendanceFile(payload)
      else if(command==="IMPORT")data=await commitAttendanceFile(payload)
      else if(command==="RESOLVE")data=await resolveReviewedOperationalAnomaly(payload)
      else if(command==="CERTIFY")data=await certifyRosterAttendance(payload)
      else throw Error("Unknown command")
      res.setHeader("Content-Type","application/json");res.end(JSON.stringify({success:true,data}));return
    }
    if(["/bundle.js","/styles.css"].includes(req.url)){res.setHeader("Content-Type",req.url.endsWith("css")?"text/css":"text/javascript");res.end(fs.readFileSync(path.join(directory,req.url.slice(1))));return}
    res.setHeader("Content-Type","text/html; charset=utf-8");res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
  }catch(error){res.statusCode=403;res.end(JSON.stringify({success:false,error:error instanceof Error?error.message:"Unavailable"}))}})
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));try{await require("../../../what-next/hris-implementation-2026-10-24/HR-13/browser/check.cjs")(`http://127.0.0.1:${server.address().port}`,fixtures)}finally{await new Promise<void>(resolve=>server.close(resolve))}
},240000)
