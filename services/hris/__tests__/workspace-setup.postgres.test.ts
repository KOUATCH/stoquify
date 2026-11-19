import { randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { executeWorkspaceSetup, getWorkspaceSetup, saveSetupReviewer, createSetupUnit, revokeSetupReviewer } from "../workspace-setup.service"
import { approveTimeFoundation, approveWorkSchedule, decideOperationalTimeRequest } from "../operational-time.service"
import { assertSetupReviewInTx } from "../setup-reviewer.service"

jest.mock("@/prisma/db", () => {
  const {PrismaClient} = require("@prisma/client"), value = process.env.HRIS_CORRECTNESS_DATABASE_URL
  if (value !== "postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public") throw new Error("Explicit owned database required")
  return {db: new PrismaClient({datasources: {db: {url: value}}, transactionOptions: {maxWait: 10000, timeout: 20000}})}
})
const ns = "hris-setup-" + randomUUID(), org = ns + "-a", foreign = ns + "-b"
const owner = ns + "-owner", hr = ns + "-hr", checker = ns + "-checker", denied = ns + "-denied", approver = ns + "-approver"
const manager = {organizationId: org, actorId: hr, actorPermissions: ["hris.people.manage", "hris.people.read"]}
const reviewer = {...manager, actorId: checker, actorPermissions: ["hris.people.read"]}
const from = new Date(Date.now()-86400000), until = new Date(Date.now()+86400000*30)
let employee: string, other: string
const command = (operation: string, data: Record<string, unknown>) => ({operation, data})
const grant = (overrides: Record<string, unknown> = {}) => ({reviewerUserId: checker, employeeId: employee, domain: "TIME_REQUEST", authority: "APPROVAL_DECISION", effectiveFrom: from, effectiveTo: until, reason: "Synthetic reviewed delegation", ...overrides})
const foundation = () => ({calendarCode: randomUUID(), calendarName: "Synthetic policy", leavePolicyCode: randomUUID(), leavePolicyName: "Synthetic leave", countryCode: "CM", timezone: "Africa/Douala", effectiveFrom: from, effectiveTo: until, calendarSourceHash: "sha256:synthetic-calendar", leavePolicySourceHash: "sha256:synthetic-policy", holidays: [], annualEntitlementMinutes: 480, carryOverLimitMinutes: 0, accrualRule: {mode: "MANUAL_REVIEWED_LEDGER"}})
async function request(id = employee) {return db.hrisTimeRequest.create({data: {organizationId: org, employeeId: id, type: "OVERTIME", periodStart: from, periodEnd: new Date(from.getTime()+3600000), requestedMinutes: 60, reason: "Synthetic bounded request", requestedById: hr, requestEvidenceHash: "sha256:synthetic-request", sourceHash: randomUUID(), idempotencyKey: randomUUID()}})}
const decision = (id: string, employeeId = employee) => ({...reviewer, requestId: id, employeeId, decision: "REJECT" as const, decisionReason: "Synthetic review reason"})

beforeAll(async () => {
  process.env.HRIS_SETUP_PILOT_ORGANIZATIONS = org
  for (const id of [org, foreign]) await db.organization.create({data: {id, name: "Synthetic setup employer", slug: id, country: "CM", timezone: "Africa/Douala"}})
  for (const id of [owner, hr, checker, denied, approver]) await db.user.create({data: {id, organizationId: org, name: id.endsWith("checker") ? "Independent checker" : "Synthetic " + id.split("-").at(-1), email: id + "@example.invalid", isVerified: true}})
  for (const [id, permissions] of [[owner, ["hris.people.manage", "hris.people.read", "system.organization.update"]], [hr, manager.actorPermissions], [checker, reviewer.actorPermissions], [approver, reviewer.actorPermissions]] as const) {
    await db.role.create({data: {organizationId: org, code: id, nameEn: id, permissions: [...permissions], users: {connect: {id}}}})
  }
  employee = (await db.payrollEmployee.create({data: {organizationId: org, employeeNumber: "1", displayName: "Synthetic first employee", hireDate: from, status: "ACTIVE"}})).id
  other = (await db.payrollEmployee.create({data: {organizationId: foreign, employeeNumber: "1", displayName: "Foreign employee", hireDate: from}})).id
})
afterEach(async () => {await db.$executeRaw`DELETE FROM hris_setup_reviewer_grants WHERE "organizationId" = ${org}`})
afterAll(async () => {
  try {
    await db.$executeRaw`DELETE FROM hris_setup_reviewer_grants WHERE "organizationId" = ${org}`
    await db.hrisTimeRequest.deleteMany({where: {organizationId: org}})
    await db.hrisWorkSchedule.deleteMany({where: {organizationId: org}})
    await db.hrisWorkCalendar.deleteMany({where: {organizationId: org}})
    await db.hrisLeavePolicy.deleteMany({where: {organizationId: org}})
    await db.hrisOrgUnit.deleteMany({where: {organizationId: org}})
    await db.payrollEmployee.deleteMany({where: {organizationId: {in: [org, foreign]}}})
    await db.organization.deleteMany({where: {id: {in: [org, foreign]}}})
    expect(await db.organization.count({where: {id: {in: [org, foreign]}}})).toBe(0)
  } finally {delete process.env.HRIS_SETUP_PILOT_ORGANIZATIONS; await db.$disconnect()}
},120000)

test("one employee: independently prepare and approve policy and schedule without employee checker or manage permission", async () => {
  const prepared = await executeWorkspaceSetup(manager, command("POLICY", foundation())) as any
  await saveSetupReviewer(manager, grant({domain: "TIME_POLICY", employeeId: null}))
  const approved = await executeWorkspaceSetup(reviewer, command("APPROVE_POLICY", {calendarId: prepared.calendar.id, leavePolicyId: prepared.leavePolicy.id, approvalEvidenceHash: "sha256:independent-review"})) as any
  expect(approved.calendar.status).toBe("ACTIVE")
  expect(await db.payrollEmployee.count({where: {organizationId: org}})).toBe(1)
  const schedule = await executeWorkspaceSetup(manager, command("SCHEDULE", {employeeId: employee, calendarId: approved.calendar.id, name: "Office schedule", timezone: "Africa/Douala", weeklyPattern: {"0":0,"1":480,"2":0,"3":0,"4":0,"5":0,"6":0}, standardWeeklyMinutes: 480, effectiveFrom: from, effectiveTo: until, sourceHash: "sha256:reviewed-schedule"})) as any
  await saveSetupReviewer(manager, grant({domain: "WORK_SCHEDULE"}))
  await expect(approveWorkSchedule({...reviewer, employeeId: employee, scheduleId: schedule.id, approvalEvidenceHash: "sha256:checker-evidence"})).resolves.toMatchObject({status: "ACTIVE"})
})
test("read-only delegation exposes only its employee/domain and cannot decide directly", async () => {
  await saveSetupReviewer(manager, grant({authority: "PEOPLE_READ"}))
  const r = await request(), view = await getWorkspaceSetup(reviewer)
  expect(view.requests.some(x => x.id === r.id)).toBe(true)
  expect(view.users).toEqual([]); expect(view.calendars).toEqual([]); expect(view.employees.map(e => e.id)).toEqual([employee])
  await expect(decideOperationalTimeRequest(decision(r.id))).rejects.toThrow("REVIEW_SCOPE_REQUIRED")
})
test.each(["future", "expired", "revoked", "wrong-domain", "disabled", "locked", "moved", "deleted-employee"])("review scope rejects %s", async kind => {
  const saved = await saveSetupReviewer(manager, grant(kind === "future" ? {effectiveFrom: new Date(Date.now()+86400000)} : kind === "wrong-domain" ? {domain: "WORK_SCHEDULE"} : {}))
  if (kind === "expired") await db.$executeRaw`UPDATE hris_setup_reviewer_grants SET "effectiveFrom" = CURRENT_TIMESTAMP - interval '2 days', "effectiveTo" = CURRENT_TIMESTAMP - interval '1 day' WHERE id = ${saved.id}`
  if (kind === "revoked") await revokeSetupReviewer(manager, saved.id)
  if (kind === "disabled") await db.user.update({where: {id: checker}, data: {isActive: false}})
  if (kind === "locked") await db.user.update({where: {id: checker}, data: {isLocked: true, lockedUntil: null}})
  if (kind === "deleted-employee") await db.payrollEmployee.update({where:{id:employee},data:{deletedAt:new Date()}})
  if (kind === "moved") {await db.$executeRaw`DELETE FROM hris_setup_reviewer_grants WHERE id = ${saved.id}`; await db.user.update({where: {id: checker}, data: {organizationId: foreign}})}
  try {await expect(decideOperationalTimeRequest(decision((await request()).id))).rejects.toThrow(/REVIEW_SCOPE_REQUIRED|ACCOUNT_UNAVAILABLE|EMPLOYEE_UNAVAILABLE/)}
  finally {await db.user.update({where: {id: checker}, data: {isActive: true, isLocked: false, organizationId: org}});await db.payrollEmployee.update({where:{id:employee},data:{deletedAt:null}})}
})
test("foreign employee, self-grant and invented manager permissions are denied", async () => {
  await expect(saveSetupReviewer(manager, grant({employeeId: other}))).rejects.toThrow("EMPLOYEE_UNAVAILABLE")
  await expect(saveSetupReviewer(manager, grant({reviewerUserId: hr}))).rejects.toThrow("INDEPENDENT_REVIEWER_REQUIRED")
  await expect(saveSetupReviewer({...manager, actorId: checker}, grant({reviewerUserId: owner}))).rejects.toThrow("MANAGER_REQUIRED")
  await expect(getWorkspaceSetup({...manager, actorId: denied})).rejects.toThrow("READ_REQUIRED")
})
test("exact employee grant cannot decide another employee and requester cannot self-review", async () => {
  await saveSetupReviewer(manager, grant())
  await expect(decideOperationalTimeRequest(decision((await request()).id, other))).rejects.toThrow(/REVIEW_SCOPE_REQUIRED|EMPLOYEE_UNAVAILABLE/)
  const r = await request(); await db.hrisTimeRequest.update({where: {id: r.id}, data: {requestedById: checker}})
  await expect(decideOperationalTimeRequest(decision(r.id))).rejects.toThrow("SOD_VIOLATION")
  const second = await request()
  await expect(decideOperationalTimeRequest(decision(second.id))).resolves.toBeDefined()
  expect((await db.hrisTimeRequest.findUniqueOrThrow({where: {id: second.id}})).status).toBe("REJECTED")
})
test("pilot off denies new setup and delegated decisions without deleting history", async () => {
  const saved = await saveSetupReviewer(manager, grant())
  process.env.HRIS_SETUP_PILOT_ORGANIZATIONS = ""
  try {
    await expect(getWorkspaceSetup(manager)).rejects.toThrow("PILOT_REQUIRED")
    await expect(decideOperationalTimeRequest(decision((await request()).id))).rejects.toThrow("PILOT_REQUIRED")
  } finally {process.env.HRIS_SETUP_PILOT_ORGANIZATIONS = org}
  expect((await db.$queryRaw<any[]>`SELECT id FROM hris_setup_reviewer_grants WHERE id = ${saved.id}`).length).toBe(1)
})
test("invalid interval, domain scope, timezone and incompatible foundation pair fail", async () => {
  await expect(saveSetupReviewer(manager, grant({effectiveTo: from}))).rejects.toThrow()
  await expect(saveSetupReviewer(manager, grant({domain: "TIME_POLICY"}))).rejects.toThrow()
  await expect(executeWorkspaceSetup(manager, command("POLICY", {...foundation(), timezone: "Invalid/Nowhere"}))).rejects.toThrow("TIMEZONE_INVALID")
  const a = await executeWorkspaceSetup(manager, command("POLICY", foundation())) as any
  const b = await executeWorkspaceSetup(manager, command("POLICY", {...foundation(), countryCode: "SN"})) as any
  await saveSetupReviewer(manager, grant({domain: "TIME_POLICY", employeeId: null}))
  await expect(approveTimeFoundation({...reviewer, calendarId: a.calendar.id, leavePolicyId: b.leavePolicy.id, approvalEvidenceHash: "sha256:review-evidence"})).rejects.toThrow("PAIR_MISMATCH")
})
test("future units retain their interval and do not change employee identity or current scope", async () => {
  const future = new Date(Date.now()+86400000*10), code = randomUUID()
  const unit = await createSetupUnit(manager, {code, name: "Future branch", type: "BRANCH", effectiveFrom: future, effectiveTo: until})
  expect((await db.hrisOrgUnit.findUniqueOrThrow({where: {id: unit.id}})).effectiveFrom).toEqual(future)
  expect(await db.hrisEmploymentAssignment.count({where: {organizationId: org}})).toBe(0)
})
test("200 employee setup remains complete and grants only selected employee", async () => {
  await db.payrollEmployee.createMany({data: Array.from({length:199},(_,i) => ({organizationId: org, employeeNumber: String(i+2), displayName: "Synthetic employee " + (i+2), hireDate: from}))})
  const view = await getWorkspaceSetup(manager)
  expect(view.employees).toHaveLength(200); expect(view.employeeLimitExceeded).toBe(false)
  await saveSetupReviewer(manager, grant())
  expect((await getWorkspaceSetup(reviewer)).employees.map(e => e.id)).toEqual([employee])
})

test("semantic grant retry has one effect and revocation cannot be replayed into active authority", async () => {
  const value = grant({reason: "Synthetic retry " + randomUUID()})
  const a = await saveSetupReviewer(manager, value), b = await saveSetupReviewer(manager, value)
  expect(b.id).toBe(a.id)
  expect(await db.auditLog.count({where:{organizationId:org,entityId:a.id,action:"HRIS_SETUP_REVIEWER_GRANTED"}})).toBe(1)
  await revokeSetupReviewer(manager,a.id)
  await expect(saveSetupReviewer(manager,value)).rejects.toThrow("GRANT_REVOKED")
})
test("reviewer availability follows account disable and live read-role removal", async () => {
  await saveSetupReviewer(manager, grant())
  await db.user.update({where:{id:checker},data:{isActive:false}})
  expect((await getWorkspaceSetup(manager)).grants[0]).toMatchObject({current:false,reviewerAvailable:false})
  await db.user.update({where:{id:checker},data:{isActive:true}})
  const role=await db.role.findFirstOrThrow({where:{organizationId:org,code:checker}})
  await db.role.update({where:{id:role.id},data:{permissions:[]}})
  try {
    expect((await getWorkspaceSetup(manager)).grants[0]).toMatchObject({current:false,reviewerAvailable:false})
    await expect(decideOperationalTimeRequest(decision((await request()).id))).rejects.toThrow("READ_REQUIRED")
  } finally {await db.role.update({where:{id:role.id},data:{permissions:reviewer.actorPermissions}})}
})
test("database constraints independently reject cross-tenant reviewer and unordered interval", async () => {
  const foreignUser = await db.user.create({data:{organizationId:foreign,email:randomUUID()+"@example.invalid",isVerified:true}})
  await expect(db.$executeRaw`INSERT INTO hris_setup_reviewer_grants (id,"organizationId","reviewerUserId","employeeId",domain,authority,"effectiveFrom","effectiveTo","createdById","reasonHash") VALUES (${randomUUID()},${org},${foreignUser.id},${employee},'TIME_REQUEST','PEOPLE_READ',${from},${until},${hr},'synthetic')`).rejects.toThrow()
  await expect(db.$executeRaw`INSERT INTO hris_setup_reviewer_grants (id,"organizationId","reviewerUserId","employeeId",domain,authority,"effectiveFrom","effectiveTo","createdById","reasonHash") VALUES (${randomUUID()},${org},${checker},${employee},'TIME_REQUEST','PEOPLE_READ',${until},${from},${hr},'synthetic')`).rejects.toThrow()
})
test("reviewer regression: both checkers read draft but only one commits policy approval and audit", async () => {
  const prepared = await executeWorkspaceSetup(manager, command("POLICY", foundation())) as any
  await saveSetupReviewer(manager, grant({domain:"TIME_POLICY",employeeId:null}))
  let arrived=0, release!:()=>void; const barrier=new Promise<void>(r=>release=r)
  const attempts=[reviewer,{...manager,actorId:owner}].map(actor=>db.$transaction(async tx=>{
    const proxy = new Proxy(tx,{get(target,key){if(key!=="hrisLeavePolicy")return Reflect.get(target,key);return new Proxy(target.hrisLeavePolicy,{get(model,property){if(property!=="findFirst")return Reflect.get(model,property);return async(...args:any[])=>{const result=await (model.findFirst as any)(...args);if(++arrived===2)release();await barrier;return result}}})}})
    return approveTimeFoundation({...actor,calendarId:prepared.calendar.id,leavePolicyId:prepared.leavePolicy.id,approvalEvidenceHash:"sha256:concurrent-review"},proxy)
  }))
  const results=await Promise.allSettled(attempts)
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1)
  expect(await db.auditLog.count({where:{organizationId:org,entityId:prepared.calendar.id,action:"HRIS_TIME_FOUNDATION_APPROVED"}})).toBe(1)
})
test("reviewer regression: schedule coverage, all weekday values and compatible legacy patterns", async () => {
  const prepared=await executeWorkspaceSetup(manager,command("POLICY",foundation())) as any
  await saveSetupReviewer(manager,grant({domain:"TIME_POLICY",employeeId:null}))
  await approveTimeFoundation({...reviewer,calendarId:prepared.calendar.id,leavePolicyId:prepared.leavePolicy.id,approvalEvidenceHash:"sha256:review-evidence"})
  const schedule={employeeId:employee,calendarId:prepared.calendar.id,name:"Valid named weekdays",timezone:"Africa/Douala",weeklyPattern:{sun:0,mon:480,tue:0,wed:0,thu:0,fri:0,sat:0},standardWeeklyMinutes:480,effectiveFrom:from,effectiveTo:until,sourceHash:"sha256:schedule-source"}
  for(const patch of [{effectiveTo:new Date(from.getTime()-86400000)}, {effectiveFrom:new Date(from.getTime()-86400000)}, {effectiveTo:new Date(until.getTime()+86400000)}, {weeklyPattern:{"1":480}}, {weeklyPattern:{...schedule.weeklyPattern,"1":0}}, {standardWeeklyMinutes:1}]) {
    await expect(executeWorkspaceSetup(manager,command("SCHEDULE",{...schedule,...patch}))).rejects.toThrow(/SCHEDULE_/)
  }
  const saved=await executeWorkspaceSetup(manager,command("SCHEDULE",{...schedule,effectiveFrom:new Date(from.getTime()+86400000)})) as any
  expect(saved.weeklyPattern.mon).toBe(480)
  await db.hrisWorkSchedule.update({where:{id:saved.id},data:{effectiveTo:new Date(until.getTime()+86400000)}})
  await saveSetupReviewer(manager,grant({domain:"WORK_SCHEDULE"}))
  await expect(approveWorkSchedule({...reviewer,employeeId:employee,scheduleId:saved.id,approvalEvidenceHash:"sha256:review-evidence"})).rejects.toThrow("CALENDAR_COVERAGE")
  expect((await db.hrisWorkSchedule.findUniqueOrThrow({where:{id:saved.id}})).status).toBe("DRAFT")
})

test("rendered owner HR narrow reviewer and denied journeys EN/FR at three widths", async () => {
  const http = require("node:http"), fs = require("node:fs"), path = require("node:path")
  const directory = path.resolve("what-next/hris-implementation-2026-10-24/HR-09/browser")
  await saveSetupReviewer(manager, grant({authority: "PEOPLE_READ"}))
  await saveSetupReviewer(manager, grant({reviewerUserId: approver}))
  for(let i=0;i<6;i++) await request()
  const server = http.createServer(async (req: any, res: any) => {
    const role = /fixtureRole=([^;]+)/.exec(req.headers.cookie || "")?.[1] || "denied"
    const actor = role === "owner" ? {...manager, actorId: owner} : role === "hr" ? manager : role === "manager" ? reviewer : role === "approver" ? {...reviewer,actorId:approver} : {...manager, actorId: denied, actorPermissions: []}
    try {
      if (req.url === "/api") {
        res.setHeader("Content-Type", "application/json")
        if (req.method === "POST") {let body = ""; for await (const chunk of req) {body += chunk; if (body.length > 32000) throw new Error("Too large")}; await executeWorkspaceSetup(actor, JSON.parse(body)); res.end(JSON.stringify({success:true}));return}
        res.end(JSON.stringify(await getWorkspaceSetup(actor)));return
      }
      if (["/bundle.js","/styles.css"].includes(req.url)) {res.setHeader("Content-Type",req.url.endsWith("css")?"text/css":"text/javascript");res.end(fs.readFileSync(path.join(directory, req.url.slice(1))));return}
      res.setHeader("Content-Type","text/html; charset=utf-8");res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch {res.statusCode=403;res.end(JSON.stringify({success:false,error:"Synthetic boundary denied"}))}
  })
  await new Promise<void>(r => server.listen(0,"127.0.0.1",r))
  try {await require("../../../what-next/hris-implementation-2026-10-24/HR-09/browser/check.cjs")(`http://127.0.0.1:${server.address().port}`)} finally {await new Promise<void>(r => server.close(r))}
},180000)
