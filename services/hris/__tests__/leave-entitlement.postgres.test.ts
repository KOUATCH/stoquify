import { randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { executeHrisLeaveEntitlements, getHrisLeaveBalances, requestLeaveCancellation, decideLeaveCancellation, getManagedLeaveWorkspace } from "../leave-entitlement.service"
import { requestOperationalTime, decideOperationalTimeRequest, getOwnOperationalTime, createTimeFoundation, approveTimeFoundation } from "../operational-time.service"
import { postHrisLeaveBalanceEntry } from "../leave-balance.service"
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client"), url = process.env.HRIS_CORRECTNESS_DATABASE_URL
  if (url !== "postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public") throw Error("Owned explicit database required")
  return { db: new PrismaClient({ datasources: { db: { url } }, transactionOptions: { maxWait: 15000, timeout: 60000 } }) }
})
const ns = "hris-leave-" + randomUUID(), org = ns + "-a", foreign = ns + "-b", users = [ns + "-hr", ns + "-self", ns + "-checker"]
const actor = (i = 0) => ({ organizationId: org, actorId: users[i], actorPermissions: i === 1 ? ["hris.self_service.read", "hris.self_service.request"] : ["hris.people.manage"] })
const at = (day: string) => new Date(day + "T00:00:00Z")
const rules = (employeeId: string, overrides: any = {}) => ({ schemaVersion: 1, employeeIds: [employeeId], negativeBalance: "FORBID", rounding: "EXACT_MINUTES", credits: [{ date: "2026-01-01", minutes: 480, kind: "ACCRUAL" }], expiry: "NONE", carryover: null, ...overrides })
async function fixture(overrides: any = {}) {
  const employee = await db.payrollEmployee.create({ data: { organizationId: org, employeeNumber: randomUUID(), displayName: "Synthetic leave employee", hireDate: at("2025-01-01"), status: "ACTIVE", countryCode: "CM" } })
  const policy = await db.hrisLeavePolicy.create({ data: { organizationId: org, code: randomUUID(), name: "Synthetic leave policy", countryCode: "CM", annualEntitlementMinutes: 4800, carryOverLimitMinutes: 0,
    effectiveFrom: at("2026-01-01"), status: "ACTIVE", preparedById: users[0], approvedById: users[2], approvalEvidenceHash: "sha256:synthetic-approved-policy", sourceHash: "sha256:synthetic-policy", accrualRule: rules(employee.id), ...overrides } })
  const calendar = await db.hrisWorkCalendar.create({ data: { organizationId: org, code: randomUUID(), name: "Synthetic reviewed calendar", countryCode: "CM", timezone: "Africa/Douala", effectiveFrom: new Date("2025-01-01Z"), status: "ACTIVE", reviewedById: users[2], sourceHash: "sha256:synthetic-calendar" } })
  await db.hrisWorkSchedule.create({ data: { organizationId: org, employeeId: employee.id, calendarId: calendar.id, name: "Synthetic reviewed schedule", timezone: "Africa/Douala", effectiveFrom: new Date("2025-01-01Z"), status: "ACTIVE", preparedById: users[0], approvedById: users[2], approvalEvidenceHash: "sha256:synthetic-schedule-review", sourceHash: "sha256:synthetic-schedule", standardWeeklyMinutes: 3360, weeklyPattern: {sun:480,mon:480,tue:480,wed:480,thu:480,fri:480,sat:480} } })
  return { employee, policy }
}
const execute = (f: Awaited<ReturnType<typeof fixture>>, throughDate = "2026-10-10") => ({ ...actor(), employeeId: f.employee.id, leavePolicyId: f.policy.id, throughDate: at(throughDate) })
const posting = (f: Awaited<ReturnType<typeof fixture>>, deltaMinutes: number, date = "2026-01-02") => ({ ...actor(), employeeId: f.employee.id, leavePolicyId: f.policy.id, deltaMinutes, effectiveAt: at(date), entryType: "MANUAL_ADJUSTMENT" as const, sourceType: "SYNTHETIC_ADJUSTMENT", sourceId: randomUUID(), sourceEvidenceHash: "sha256:synthetic-adjustment", reason: "Synthetic reviewed adjustment", idempotencyKey: randomUUID() })
const request = (f: Awaited<ReturnType<typeof fixture>>, minutes = 360) => requestOperationalTime({ ...actor(), employeeId: f.employee.id, leavePolicyId: f.policy.id, type: "LEAVE", periodStart: at("2026-02-01"), periodEnd: at("2026-02-01"), requestedMinutes: minutes, reason: "Synthetic leave request", requestEvidenceHash: "sha256:synthetic-request", idempotencyKey: randomUUID() })
const approve = (f: Awaited<ReturnType<typeof fixture>>, id: string) => ({ ...actor(2), employeeId: f.employee.id, requestId: id, decision: "APPROVE" as const, decisionReason: "Synthetic independent approval", approvalEvidenceHash: "sha256:synthetic-review" })
const cancel = (f: Awaited<ReturnType<typeof fixture>>, id: string) => ({ ...actor(), employeeId: f.employee.id, requestId: id, reason: "Synthetic cancellation reason", idempotencyKey: randomUUID() })
const decide = (f: Awaited<ReturnType<typeof fixture>>, id: string) => ({ ...actor(2), employeeId: f.employee.id, requestId: id, decision: "APPROVE" as const, reason: "Synthetic reviewed cancellation", evidenceHash: "sha256:synthetic-cancel-review" })
beforeAll(async () => {
  for (const id of [org, foreign]) await db.organization.create({ data: { id, name: "Synthetic leave employer", slug: id } })
  for (const id of users) await db.user.create({ data: { id, organizationId: org, email: id + "@example.invalid" } })
})
afterAll(async () => {
  try {
    const where = { organizationId: { in: [org, foreign] } }
    await db.payrollRun.deleteMany({ where }); await db.payrollPeriod.deleteMany({ where })
    await db.hrisWorkSchedule.deleteMany({ where }); await db.hrisWorkCalendar.deleteMany({ where });
    await db.hrisTimeRequest.deleteMany({ where }); await db.hrisLeaveBalanceEntry.deleteMany({ where }); await db.hrisLeavePolicy.deleteMany({ where }); await db.payrollEmployee.deleteMany({ where })
    await db.organization.deleteMany({ where: { id: { in: [org, foreign] } } })
    expect(await db.organization.count({ where: { id: { in: [org, foreign] } } })).toBe(0)
  } finally { await db.$disconnect() }
}, 120000)
test("parallel scheduler creates one credit and exact catch-up replay returns retained entries", async () => {
  const f = await fixture(), command = execute(f)
  const [a, b] = await Promise.all([executeHrisLeaveEntitlements(command), executeHrisLeaveEntitlements(command)])
  expect(a).toEqual(b)
  expect(await db.hrisLeaveBalanceEntry.count({ where: { employeeId: f.employee.id } })).toBe(1)
  expect((await getHrisLeaveBalances({ ...actor(), employeeId: f.employee.id })).policies[0]).toMatchObject({ availableMinutes: 480, credits: 480, debits: 0 })
})
test("two parallel approvals cannot overdraw; cancellation reverses the exact debit only once", async () => {
  const f = await fixture(); await executeHrisLeaveEntitlements(execute(f))
  const [a, b] = await Promise.all([request(f), request(f)])
  const outcomes = await Promise.allSettled([decideOperationalTimeRequest(approve(f, a.request.id)), decideOperationalTimeRequest(approve(f, b.request.id))])
  expect(outcomes.filter(x => x.status === "fulfilled")).toHaveLength(1)
  const approved = await db.hrisTimeRequest.findFirstOrThrow({ where: { employeeId: f.employee.id, status: "APPROVED" } })
  const original = await db.hrisLeaveBalanceEntry.findFirstOrThrow({ where: { sourceId: approved.id } })
  const cancellation = cancel(f, approved.id)
  await requestLeaveCancellation(cancellation)
  await expect(decideLeaveCancellation({ ...decide(f, approved.id), ...actor() })).rejects.toThrow("SOD")
  await Promise.all([decideLeaveCancellation(decide(f, approved.id)), decideLeaveCancellation(decide(f, approved.id))])
  expect(await db.hrisLeaveBalanceEntry.count({ where: { sourceType: "HRIS_LEAVE_REVERSAL", sourceId: original.id } })).toBe(1)
  expect((await getHrisLeaveBalances({ ...actor(), employeeId: f.employee.id })).policies[0].availableMinutes).toBe(480)
})
test("pending cancellation creates no credit; changed-key evidence conflicts; replay survives policy closure", async () => {
  const f = await fixture(), pending = await request(f), command = cancel(f, pending.request.id)
  expect((await requestLeaveCancellation(command)).status).toBe("CANCELLED")
  await expect(requestLeaveCancellation({ ...command, reason: "Changed synthetic reason" })).rejects.toThrow("IDEMPOTENCY_CONFLICT")
  expect(await db.hrisLeaveBalanceEntry.count({ where: { employeeId: f.employee.id } })).toBe(0)
  await db.hrisLeavePolicy.update({ where: { id: f.policy.id }, data: { effectiveTo: at("2026-01-31") } })
  expect((await requestLeaveCancellation(command)).status).toBe("CANCELLED")
})
test("carryover and expiry retain a single source settlement, cap transfer, freeze backdates and cancel refunds", async () => {
  const f = await fixture({ effectiveTo: at("2026-06-30") })
  await db.hrisLeavePolicy.update({ where: { id: f.policy.id }, data: { accrualRule: rules(f.employee.id, { expiry: "AT_POLICY_END" }) } })
  await executeHrisLeaveEntitlements(execute(f, "2026-02-01"))
  const used = await request(f, 120); await decideOperationalTimeRequest(approve(f, used.request.id))
  const next = await db.hrisLeavePolicy.create({ data: { ...f.policy, id: undefined, version: 2, effectiveFrom: at("2026-07-01"), effectiveTo: at("2026-09-30"), carryOverLimitMinutes: 180,
    accrualRule: rules(f.employee.id, { credits: [], expiry: "AT_POLICY_END", carryover: { fromPolicyId: f.policy.id, limitMinutes: 180 } }) } })
  const command = { ...execute(f, "2026-07-01"), leavePolicyId: next.id }
  await Promise.all([executeHrisLeaveEntitlements(command), executeHrisLeaveEntitlements(command)])
  expect((await getHrisLeaveBalances({ ...actor(), employeeId: f.employee.id })).policies.find(p => p.leavePolicyId === next.id)?.availableMinutes).toBe(180)
  await expect(postHrisLeaveBalanceEntry(posting(f, 120))).rejects.toThrow("SETTLED")
  await expect(requestLeaveCancellation(cancel(f, used.request.id))).rejects.toThrow("SETTLED")
  await executeHrisLeaveEntitlements({ ...command, throughDate: at("2026-10-01") })
  await executeHrisLeaveEntitlements({ ...command, throughDate: at("2026-10-01") })
  expect(await db.hrisLeaveBalanceEntry.count({ where: { employeeId: f.employee.id, sourceType: "HRIS_LEAVE_SETTLEMENT" } })).toBe(2)
  expect((await getHrisLeaveBalances({ ...actor(), employeeId: f.employee.id })).policies.every(p => p.availableMinutes === 0)).toBe(true)
})
test("unknown policy and other employee/country/tenant are denied before any effect", async () => {
  const f = await fixture({ accrualRule: {} })
  await expect(executeHrisLeaveEntitlements(execute(f))).rejects.toThrow("RULES_UNRESOLVED")
  await db.hrisLeavePolicy.update({ where: { id: f.policy.id }, data: { accrualRule: rules("not-enrolled") } })
  await expect(request(f)).rejects.toThrow("NOT_ELIGIBLE")
  await db.hrisLeavePolicy.update({ where: { id: f.policy.id }, data: { accrualRule: rules(f.employee.id), countryCode: "GA" } })
  await expect(request(f)).rejects.toThrow("COUNTRY_UNRESOLVED")
  await expect(getHrisLeaveBalances({ ...actor(1), employeeId: f.employee.id })).rejects.toThrow("own leave")
  await expect(executeHrisLeaveEntitlements({ ...execute(f), organizationId: foreign })).rejects.toThrow()
  expect(await db.hrisLeaveBalanceEntry.count({ where: { employeeId: f.employee.id } })).toBe(0)
})
test("future grants do not appear in today's available balance and retain full reconciliation", async () => {
  const f = await fixture(); await executeHrisLeaveEntitlements(execute(f))
  await postHrisLeaveBalanceEntry(posting(f, 240, "2027-01-01"))
  const view = await getHrisLeaveBalances({ ...actor(), employeeId: f.employee.id })
  expect(view.policies[0]).toMatchObject({ availableMinutes: 480, futureCredits: 240, credits: 480, debits: 0 })
  expect(view.policies[0].movements).toHaveLength(2)
})
test("caller rollback removes scheduler entries and audit together", async () => {
  const f = await fixture()
  await expect(db.$transaction(async client => { await executeHrisLeaveEntitlements(execute(f), client); throw Error("synthetic rollback") })).rejects.toThrow("synthetic rollback")
  expect(await db.hrisLeaveBalanceEntry.count({ where: { employeeId: f.employee.id } })).toBe(0)
})
test("mid-period version boundaries and two eligible leave types remain explicit", async () => {
  const f = await fixture({ effectiveTo: at("2026-01-31") })
  await expect(request(f)).rejects.toThrow("NOT_EFFECTIVE")
  const second = await db.hrisLeavePolicy.create({ data: { ...f.policy, id: undefined, code: randomUUID(), effectiveTo: null, accrualRule: rules(f.employee.id) } })
  expect((await getHrisLeaveBalances({ ...actor(), employeeId: f.employee.id })).policies.map(p => p.leavePolicyId)).toEqual(expect.arrayContaining([f.policy.id, second.id]))
  await expect(request({ ...f, policy: second })).resolves.toMatchObject({ created: true })
})
test("R1 settlement waits for a pending approved-leave cancellation, then closes the corrected ledger", async () => {
  const f = await fixture({ effectiveTo: at("2026-06-30") })
  await db.hrisLeavePolicy.update({ where: { id: f.policy.id }, data: { accrualRule: rules(f.employee.id, { expiry: "AT_POLICY_END" }) } })
  await executeHrisLeaveEntitlements(execute(f, "2026-02-01"))
  const leave = await request(f); await decideOperationalTimeRequest(approve(f, leave.request.id))
  await requestLeaveCancellation(cancel(f, leave.request.id))
  await expect(executeHrisLeaveEntitlements(execute(f))).rejects.toThrow("SETTLEMENT_BLOCKED")
  await decideLeaveCancellation(decide(f, leave.request.id))
  await executeHrisLeaveEntitlements(execute(f))
  expect((await getHrisLeaveBalances({ ...actor(), employeeId: f.employee.id })).policies[0]).toMatchObject({ availableMinutes: 0, settled: true })
})
test("R3 exact scheduler recovery survives retirement but missing credits cannot create new effects", async () => {
  const f = await fixture()
  await db.hrisLeavePolicy.update({ where: { id: f.policy.id }, data: { accrualRule: rules(f.employee.id, { credits: [{ date: "2026-01-01", minutes: 480, kind: "ACCRUAL" }, { date: "2026-02-01", minutes: 480, kind: "ACCRUAL" }] }) } })
  const command = execute(f, "2026-01-01"), result = await executeHrisLeaveEntitlements(command)
  await db.hrisLeavePolicy.update({ where: { id: f.policy.id }, data: { status: "RETIRED" } })
  expect(await executeHrisLeaveEntitlements(command)).toEqual(result)
  await expect(executeHrisLeaveEntitlements(execute(f, "2026-02-01"))).rejects.toThrow("NOT_EFFECTIVE")
  expect(await db.hrisLeaveBalanceEntry.count({ where: { employeeId: f.employee.id } })).toBe(1)
})
test("partial days, variable overnight shift lengths and month-boundary allocations conserve minutes", async () => {
  const f = await fixture()
  const base = { ...actor(), employeeId: f.employee.id, leavePolicyId: f.policy.id, type: "LEAVE" as const, requestedMinutes: 1, quantity: 0.5, quantityUnit: "DAYS" as const, reason: "Synthetic half-day request", requestEvidenceHash: "sha256:synthetic-partial", idempotencyKey: randomUUID(), periodStart: at("2026-01-31"), periodEnd: at("2026-01-31") }
  const half = await requestOperationalTime(base)
  expect(half.request.requestedMinutes).toBe(240)
  expect((half.request.metadata as any).conversion).toMatchObject({ quantity: 0.5, unit: "DAYS", scheduledMinutes: 480, minutes: 240, workDate: "2026-01-31" })
  const requestAudit = await db.auditLog.findFirstOrThrow({ where: { entityId: half.request.id, action: "HRIS_LEAVE_REQUESTED" } })
  expect(requestAudit.changes).toMatchObject({ requestedMinutes: 240 })
  await db.hrisWorkSchedule.updateMany({ where: { employeeId: f.employee.id }, data: { weeklyPattern: {sun:720,mon:720,tue:720,wed:720,thu:720,fri:720,sat:720}, standardWeeklyMinutes: 5040 } })
  expect((await requestOperationalTime({ ...base, idempotencyKey: randomUUID() })).request.requestedMinutes).toBe(360)
  expect((await requestOperationalTime(base)).request.id).toBe(half.request.id)
  const multi = await requestOperationalTime({ ...base, quantity: undefined, quantityUnit: undefined, requestedMinutes: 480, periodEnd: at("2026-02-01"), allocations: [{ workDate: "2026-01-31", minutes: 240 }, { workDate: "2026-02-01", minutes: 240 }], idempotencyKey: randomUUID() })
  expect((multi.request.metadata as any).allocations.reduce((sum: number, row: any) => sum + row.minutes, 0)).toBe(480)
  await expect(requestOperationalTime({ ...base, quantity: undefined, requestedMinutes: 480, periodEnd: at("2026-02-01"), idempotencyKey: randomUUID() })).rejects.toThrow("per-date allocations")
})
test("R4 parallel leave approvals across policies cannot exceed the work-date capacity despite ample balances", async () => {
  const f = await fixture(); await executeHrisLeaveEntitlements(execute(f)); await postHrisLeaveBalanceEntry(posting(f, 480))
  const other = await db.hrisLeavePolicy.create({ data: { ...f.policy, id: undefined, code: randomUUID(), name: "Synthetic second eligible policy", accrualRule: rules(f.employee.id) } })
  const second = { ...f, policy: other }; await executeHrisLeaveEntitlements(execute(second))
  const a = await request(f, 480), b = await request(second, 480)
  const results = await Promise.allSettled([decideOperationalTimeRequest(approve(f, a.request.id)), decideOperationalTimeRequest(approve(second, b.request.id))])
  expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1)
  expect(String((results.find(row => row.status === "rejected") as PromiseRejectedResult).reason)).toContain("DAY_CAPACITY_EXCEEDED")
})
test("reviewed policy preparation requires independent approval and rejects overlapping enrolled versions", async () => {
  const f = await fixture()
  const input = { ...actor(), calendarCode: randomUUID(), calendarName: "Synthetic reviewed foundation", countryCode: "CM", timezone: "Africa/Douala", effectiveFrom: at("2026-01-01"), effectiveTo: at("2026-12-31"), calendarSourceHash: "sha256:synthetic-calendar", holidays: [], leavePolicyCode: f.policy.code, leavePolicyName: "Synthetic next policy", leavePolicyVersion: 2, annualEntitlementMinutes: 4800, carryOverLimitMinutes: 0, accrualRule: rules(f.employee.id), leavePolicySourceHash: "sha256:synthetic-policy" }
  const draft = await createTimeFoundation(input)
  await expect(approveTimeFoundation({ ...actor(), calendarId: draft.calendar.id, leavePolicyId: draft.leavePolicy.id, approvalEvidenceHash: "sha256:synthetic-review" })).rejects.toThrow()
  await expect(approveTimeFoundation({ ...actor(2), calendarId: draft.calendar.id, leavePolicyId: draft.leavePolicy.id, approvalEvidenceHash: "sha256:synthetic-review" })).rejects.toThrow("POLICY_OVERLAP")
  expect((await db.hrisLeavePolicy.findUniqueOrThrow({ where: { id: draft.leavePolicy.id } })).status).toBe("DRAFT")
  const valid = await createTimeFoundation({ ...input, calendarCode: randomUUID(), leavePolicyCode: randomUUID() })
  await expect(approveTimeFoundation({ ...actor(), calendarId: valid.calendar.id, leavePolicyId: valid.leavePolicy.id, approvalEvidenceHash: "sha256:synthetic-review" })).rejects.toThrow("SOD")
  await expect(approveTimeFoundation({ ...actor(2), calendarId: valid.calendar.id, leavePolicyId: valid.leavePolicy.id, approvalEvidenceHash: "sha256:synthetic-review" })).resolves.toMatchObject({ leavePolicy: { status: "ACTIVE" } })
})
test("scheduler and approval serialize without overdraft; rejected cancellation creates only a decision audit", async () => {
  const f = await fixture(), leave = await request(f)
  const results = await Promise.allSettled([executeHrisLeaveEntitlements(execute(f)), decideOperationalTimeRequest(approve(f, leave.request.id))])
  expect(results[0].status).toBe("fulfilled")
  const current = await db.hrisTimeRequest.findUniqueOrThrow({ where: { id: leave.request.id } })
  if (current.status === "REQUESTED") await decideOperationalTimeRequest(approve(f, leave.request.id))
  await requestLeaveCancellation(cancel(f, leave.request.id))
  const decision = { ...decide(f, leave.request.id), decision: "REJECT" as const }
  await decideLeaveCancellation(decision); await decideLeaveCancellation(decision)
  expect(await db.auditLog.count({ where: { entityId: leave.request.id, action: "HRIS_LEAVE_CANCELLATION_DECIDED" } })).toBe(1)
  expect((await getHrisLeaveBalances({ ...actor(), employeeId: f.employee.id })).policies[0].availableMinutes).toBe(120)
})
test("retained calculated payroll blocks cancellation without reversing the ledger", async () => {
  const f = await fixture(); await executeHrisLeaveEntitlements(execute(f)); const leave = await request(f)
  await decideOperationalTimeRequest(approve(f, leave.request.id)); await requestLeaveCancellation(cancel(f, leave.request.id))
  const period = await db.payrollPeriod.create({ data: { organizationId: org, name: randomUUID(), countryCode: "CM", periodStart: at("2026-02-01"), periodEnd: at("2026-02-28"), payDate: at("2026-02-28"), frequency: "MONTHLY" } })
  const run = await db.payrollRun.create({ data: { organizationId: org, payrollPeriodId: period.id, runNumber: randomUUID(), status: "CALCULATED", countryCode: "CM", countryPackVersion: "synthetic", countryPackSchemaVersion: "synthetic", countryPackResolutionHash: "synthetic", countryPackCapabilityStatus: "SYNTHETIC_ONLY", ruleSetHash: "synthetic", calculationHash: "synthetic", attendanceSnapshotHash: "synthetic" } })
  try {
    await expect(decideLeaveCancellation(decide(f, leave.request.id))).rejects.toThrow("REQUIRES_PAYROLL_CORRECTION_RUN")
    expect((await getHrisLeaveBalances({ ...actor(), employeeId: f.employee.id })).policies[0].availableMinutes).toBe(120)
    expect((await db.hrisTimeRequest.findUniqueOrThrow({ where: { id: leave.request.id } })).status).toBe("APPROVED")
  } finally { await db.payrollRun.delete({ where: { id: run.id } }); await db.payrollPeriod.delete({ where: { id: period.id } }) }
})
test("rendered EN/FR employee and HR credit adjustment cancellation and navigation journeys", async () => {
  const a = await fixture(), b = await fixture()
  await db.payrollEmployee.update({ where: { id: a.employee.id }, data: { userId: users[1] } })
  await db.payrollEmployee.update({ where: { id: b.employee.id }, data: { displayName: "Synthetic navigation B" } })
  const http = require("node:http"), fs = require("node:fs"), path = require("node:path"), directory = path.resolve("what-next/hris-implementation-2026-10-24/HR-12/browser")
  const server = http.createServer(async (req: any, res: any) => {
    try {
      if (req.url === "/api") {
        res.setHeader("Content-Type", "application/json")
        let body = ""; for await (const chunk of req) { body += chunk; if (body.length > 100000) throw Error("Too large") }
        const { command, input } = JSON.parse(body), role = /fixtureRole=([^;]+)/.exec(req.headers.cookie || "")?.[1]
        const context = role === "hr" ? actor() : role === "checker" ? actor(2) : role === "self" ? actor(1) : { ...actor(1), actorPermissions: [] }
        const employeeId = command === "BOOT" && input.target === "B" ? b.employee.id : input.employeeId ?? a.employee.id
        let data
        if (command === "BOOT" || command === "READ") data = await getManagedLeaveWorkspace({ ...context, employeeId })
        else if (command === "SELF") { const model = await getOwnOperationalTime(context); data = { ...model, requests: model.requests.map(row => ({ ...row, periodStart: row.periodStart.toISOString(), periodEnd: row.periodEnd.toISOString(), requestedAt: row.requestedAt.toISOString() })) } }
        else if (command === "REQUEST") data = await requestOperationalTime({ ...input, ...context })
        else if (command === "CANCEL") data = await requestLeaveCancellation({ ...input, ...context })
        else if (command === "EXECUTE") data = await executeHrisLeaveEntitlements({ ...input, ...context })
        else if (command === "DECIDE") data = await decideLeaveCancellation({ ...input, ...context })
        else if (command === "ADJUST") data = await postHrisLeaveBalanceEntry({ ...input, ...context, entryType: "MANUAL_ADJUSTMENT", sourceType: "HRIS_REVIEWED_ADJUSTMENT", sourceId: input.idempotencyKey })
        else if (command === "APPROVE_LATEST") {
          const latest = await db.hrisTimeRequest.findFirstOrThrow({ where: { employeeId: a.employee.id, status: "REQUESTED" }, orderBy: { requestedAt: "desc" } })
          data = await decideOperationalTimeRequest({ ...approve(a, latest.id), ...context })
        } else throw Error("Unknown command")
        res.end(JSON.stringify({ success: true, data })); return
      }
      if (["/bundle.js", "/styles.css"].includes(req.url)) { res.setHeader("Content-Type", req.url.endsWith("css") ? "text/css" : "text/javascript"); res.end(fs.readFileSync(path.join(directory, req.url.slice(1)))); return }
      res.setHeader("Content-Type", "text/html; charset=utf-8")
      res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) { res.statusCode = 403; res.end(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unavailable" })) }
  })
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  try { await require("../../../what-next/hris-implementation-2026-10-24/HR-12/browser/check.cjs")(`http://127.0.0.1:${server.address().port}`, a.policy.id) }
  finally { await new Promise<void>(resolve => server.close(resolve)) }
}, 240000)
