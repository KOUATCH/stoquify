import { buildHrisPayrollReadinessExport } from "../payroll-readiness-contract"
import { emitPayrollPayslips } from "@/services/payroll/payroll-control.service"
import { processPayrollAuthorityAdapterWorkerBatch } from "@/services/payroll/authority-adapter-worker.service"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { getHrisEmployeeDirectory, getHrisEmployeeProfile } from "../employee.service"
import { createHash, randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { postHrisLeaveBalanceEntry } from "../leave-balance.service"
import { decideOperationalTimeRequest, requestOperationalTime, importOperationalTime, assertOperationalAttendanceCurrentInTx, assignWorkSchedule, approveWorkSchedule } from "../operational-time.service"
import { correctedAttendanceEntry, assertOperationalCorrectionsCertified } from "../attendance-correction"
import { certifyOperationalAttendance } from "../operational-attendance.service"
import { requestHrisEmployeeLifecycle, approveHrisEmployeeLifecycle, rejectHrisEmployeeLifecycle, applyApprovedHrisEmployeeLifecycle, getHrisEmploymentAsOf } from "../lifecycle.service"
import { resolveHrisPeopleAccessScope } from "../org.service"

// Fail closed rather than skipping or loading an application target.
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client")
  const value = process.env.HRIS_CORRECTNESS_DATABASE_URL
  if (!value) throw new Error("Explicit HRIS_CORRECTNESS_DATABASE_URL required")
  const url = new URL(value)
  if (url.hostname !== "127.0.0.1" || url.port !== "55464"
      || url.pathname !== "/stoquify_local_hris_20261024" || url.searchParams.get("schema") !== "public") {
    throw new Error("Refusing non-owned HRIS correctness database")
  }
  return { db: new PrismaClient({ datasources: { db: { url: value } }, transactionOptions: { maxWait: 10000, timeout: 20000 } }) }
})

const namespace = `hris-verification-${randomUUID()}`
const orgs = [namespace + "-a", namespace + "-b"]
const actors = [namespace + "-hr", namespace + "-requester", namespace + "-reviewer"]
let employeeId: string
let policyId: string
const date = new Date("2026-10-10T00:00:00Z")

async function fixture() {
  const employee = await db.payrollEmployee.create({ data: {
    organizationId: orgs[0], employeeNumber: randomUUID(), displayName: "Synthetic HR case",
    hireDate: new Date("2026-01-01Z"), status: "ACTIVE", countryCode: "CM",
  } })
  const policy = await db.hrisLeavePolicy.create({ data: {
    organizationId: orgs[0], code: randomUUID(), name: "Synthetic minutes policy", countryCode: "CM",
    annualEntitlementMinutes: 480, accrualRule: {}, effectiveFrom: new Date("2026-01-01Z"),
    status: "ACTIVE", preparedById: actors[1], approvedById: actors[2], sourceHash: "sha256:synthetic-policy",
    approvalEvidenceHash: "sha256:synthetic-policy-review",
  } })
  employeeId = employee.id
  policyId = policy.id
}

function posting(deltaMinutes = 480, overrides: Record<string, unknown> = {}) {
  const key = randomUUID()
  return {
    organizationId: orgs[0], actorId: actors[0], actorPermissions: ["hris.people.manage"],
    employeeId, leavePolicyId: policyId, deltaMinutes, effectiveAt: date,
    entryType: "MANUAL_ADJUSTMENT" as const, sourceType: "SYNTHETIC_TEST", sourceId: key,
    sourceEvidenceHash: "sha256:synthetic-evidence", idempotencyKey: key, ...overrides,
  }
}

async function balance() {
  const row = await db.hrisLeaveBalanceEntry.aggregate({ where: { organizationId: orgs[0], employeeId, leavePolicyId: policyId }, _sum: { deltaMinutes: true } })
  return row._sum.deltaMinutes ?? 0
}

async function request() {
  return db.hrisTimeRequest.create({ data: {
    organizationId: orgs[0], employeeId, leavePolicyId: policyId,
    type: "LEAVE", periodStart: date, periodEnd: new Date("2026-10-10T06:00:00Z"),
    requestedMinutes: 360, reason: "Synthetic independent request", requestedById: actors[1],
    requestEvidenceHash: "sha256:synthetic-request", sourceHash: randomUUID(), idempotencyKey: randomUUID(),
  } })
}

function approve(requestId: string) {
  return { organizationId: orgs[0], actorId: actors[2], actorPermissions: ["hris.people.manage"],
    employeeId, requestId, decision: "APPROVE" as const, decisionReason: "Reviewed synthetic request",
    approvalEvidenceHash: "sha256:synthetic-approval" }
}

// Both transactions are started before either reaches the service, avoiding
// tests which accidentally exercise only sequential scheduling.
async function race<T>(commands: Array<(tx: Prisma.TransactionClient) => Promise<T>>) {
  let arrived = 0
  let release!: () => void
  const barrier = new Promise<void>(resolve => { release = resolve })
  return Promise.allSettled(commands.map(command => db.$transaction(async tx => {
    arrived++
    if (arrived === commands.length) release()
    await barrier
    return command(tx)
  })))
}

beforeAll(async () => {
  const identity = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  expect(identity[0].name).toBe("stoquify_local_hris_20261024")
  for (const id of orgs) await db.organization.create({ data: { id, name: "Synthetic HR verification", slug: id } })
  for (const id of actors) await db.user.create({ data: { id, organizationId: orgs[0], email: `${id}@example.invalid` } })
})

afterAll(async () => {
  try {
    await db.hrisManagerDelegation.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisReportingRelationship.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisEmploymentAssignment.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisPosition.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisOrgUnit.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.payrollDeclaration.deleteMany({where:{organizationId:{in:orgs}}})
    await db.payrollPayslip.deleteMany({where:{organizationId:{in:orgs}}})
    await db.payrollRunTransition.deleteMany({where:{organizationId:{in:orgs}}})
    await db.payrollRun.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.payrollContract.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.payrollAttendanceSnapshot.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.payrollPeriod.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisAttendanceAnomaly.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisTimeEntry.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisTimeImportBatch.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisWorkSchedule.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisWorkCalendar.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisTimeRequest.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisLeaveBalanceEntry.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.hrisLeavePolicy.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.payrollEmployee.deleteMany({ where: { organizationId: { in: orgs } } })
    await db.organization.deleteMany({ where: { id: { in: orgs } } })
    expect(await db.organization.count({ where: { id: { in: orgs } } })).toBe(0)
  } finally { await db.$disconnect() }
}, 120000)

describe("HR-00 isolated fixtures", () => {
  it("rehearses two tenants and 0/1/50/51/100/200 populations with bounded cleanup", async () => {
    for (const count of [0, 1, 50, 51, 100, 200]) {
      await db.payrollEmployee.createMany({ data: Array.from({ length: count }, (_, i) => ({
        organizationId: orgs[1], employeeNumber: String(i), displayName: `Synthetic ${i}`,
        hireDate: date,
      })) })
      expect(await db.payrollEmployee.count({ where: { organizationId: orgs[1] } })).toBe(count)
      await db.payrollEmployee.deleteMany({ where: { organizationId: orgs[1] } })
      expect(await db.payrollEmployee.count({ where: { organizationId: orgs[1] } })).toBe(0)
    }
  })
})

describe("HR-01 real transaction and ledger boundaries", () => {
  beforeEach(fixture)

  it("serializes two independent 360 debits against 480", async () => {
    await postHrisLeaveBalanceEntry(posting())
    const commands = [posting(-360), posting(-360)]
    const result = await race(commands.map(command => tx => postHrisLeaveBalanceEntry(command, tx)))
    expect(result.filter(item => item.status === "fulfilled")).toHaveLength(1)
    expect(await balance()).toBe(120)
    expect(await db.hrisLeaveBalanceEntry.count({ where: { employeeId } })).toBe(2)
  })

  it("serializes distinct approvals and rolls back the losing CAS, event and debit", async () => {
    await postHrisLeaveBalanceEntry(posting())
    const requests = await Promise.all([request(), request()])
    const result = await race(requests.map(item => tx => decideOperationalTimeRequest(approve(item.id), tx)))
    expect(result.filter(item => item.status === "fulfilled")).toHaveLength(1)
    expect(await balance()).toBe(120)
    expect(await db.hrisTimeRequest.count({ where: { employeeId, status: "APPROVED" } })).toBe(1)
    expect(await db.hrisTimeRequest.count({ where: { employeeId, status: "REQUESTED" } })).toBe(1)
    expect(await db.businessEvent.count({ where: { organizationId: orgs[0], sourceId: { in: requests.map(item => item.id) } } })).toBe(1)
  })

  it("recovers an exact concurrent first write into an empty ledger", async () => {
    const command = posting()
    const results = await race([tx => postHrisLeaveBalanceEntry(command, tx), tx => postHrisLeaveBalanceEntry(command, tx)])
    expect(results.every(item => item.status === "fulfilled")).toBe(true)
    expect(await balance()).toBe(480)
    expect(await db.hrisLeaveBalanceEntry.count({ where: { employeeId } })).toBe(1)
    expect(await db.auditLog.count({ where: { organizationId: orgs[0], changes: { path: ["employeeId"], equals: employeeId } } })).toBe(1)
  })

  it.each(["entryType", "sourceType", "sourceId", "deltaMinutes", "effectiveAt", "sourceEvidenceHash"])("rejects changed %s replay", async field => {
    const command = posting()
    await postHrisLeaveBalanceEntry(command)
    const changed = { entryType: "CORRECTION", sourceType: "OTHER", sourceId: "another-source", deltaMinutes: 240,
      effectiveAt: new Date("2026-10-11Z"), sourceEvidenceHash: "sha256:changed-evidence" }[field]
    await expect(postHrisLeaveBalanceEntry({ ...command, [field]: changed })).rejects.toThrow("IDEMPOTENCY_CONFLICT")
    expect(await balance()).toBe(480)
  })

  it("rolls back a default/root posting when its audit foreign key fails", async () => {
    await expect(postHrisLeaveBalanceEntry(posting(480, { actorId: namespace + "-missing-user" }))).rejects.toThrow()
    expect(await balance()).toBe(0)
  })

  it("propagates caller failure and rolls back a supplied transaction", async () => {
    await expect(db.$transaction(async tx => {
      await postHrisLeaveBalanceEntry(posting(), tx)
      throw new Error("synthetic caller rollback")
    })).rejects.toThrow("synthetic caller rollback")
    expect(await balance()).toBe(0)
  })

  it("rejects stale snapshot isolation before posting", async () => {
    await expect(db.$transaction(tx => postHrisLeaveBalanceEntry(posting(), tx), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    })).rejects.toThrow("Read Committed")
    expect(await balance()).toBe(0)
  })

  it("protects later commitments against a backdated debit", async () => {
    await postHrisLeaveBalanceEntry(posting())
    await postHrisLeaveBalanceEntry(posting(-360, { effectiveAt: new Date("2026-10-20Z") }))
    await expect(postHrisLeaveBalanceEntry(posting(-360, { effectiveAt: new Date("2026-10-15Z") }))).rejects.toThrow("HRIS_LEAVE_BALANCE_NEGATIVE")
    expect(await balance()).toBe(120)
  })

  it("serializes manual debits against request approvals", async () => {
    await postHrisLeaveBalanceEntry(posting())
    const pending = await request()
    const command = posting(-360)
    const results = await race<unknown>([
      tx => postHrisLeaveBalanceEntry(command, tx),
      tx => decideOperationalTimeRequest(approve(pending.id), tx),
    ])
    expect(results.filter(item => item.status === "fulfilled")).toHaveLength(1)
    expect(await balance()).toBe(120)
  })

  it("allows one decision on a duplicated request and denies self approval", async () => {
    await postHrisLeaveBalanceEntry(posting())
    const pending = await request()
    await expect(decideOperationalTimeRequest({ ...approve(pending.id), actorId: actors[1] })).rejects.toThrow("SOD_VIOLATION")
    const command = approve(pending.id)
    const results = await race([tx => decideOperationalTimeRequest(command, tx), tx => decideOperationalTimeRequest(command, tx)])
    expect(results.filter(item => item.status === "fulfilled")).toHaveLength(1)
    expect(await balance()).toBe(120)
    expect(await db.businessEvent.count({ where: { sourceId: pending.id } })).toBe(1)
  })

  it("rejects same-key reuse for another employee or policy", async () => {
    const command = posting()
    await postHrisLeaveBalanceEntry(command)
    await fixture()
    await expect(postHrisLeaveBalanceEntry({ ...command, employeeId })).rejects.toThrow("IDEMPOTENCY_CONFLICT")
    await expect(postHrisLeaveBalanceEntry({ ...command, leavePolicyId: policyId })).rejects.toThrow("IDEMPOTENCY_CONFLICT")
  })

  it("retains exact historical hash replay and rejects altered semantics", async () => {
    const command = posting()
    const result = await postHrisLeaveBalanceEntry(command)
    const legacyHash = "sha256:" + createHash("sha256").update(JSON.stringify({
      employeeId: command.employeeId, leavePolicyId: command.leavePolicyId,
      deltaMinutes: command.deltaMinutes, effectiveAt: command.effectiveAt.toISOString(),
      sourceEvidenceHash: command.sourceEvidenceHash,
    })).digest("hex")
    await db.hrisLeaveBalanceEntry.update({ where: { id: result.entry.id }, data: { sourceHash: legacyHash } })
    expect((await postHrisLeaveBalanceEntry(command)).created).toBe(false)
    await expect(postHrisLeaveBalanceEntry({ ...command, entryType: "CORRECTION" })).rejects.toThrow("IDEMPOTENCY_CONFLICT")
  })

  it("does not serialize an unrelated employee/policy behind a held ledger", async () => {
    const first = posting()
    await fixture()
    const second = posting()
    let unlock!: () => void
    let acquired!: () => void
    const held = new Promise<void>(resolve => { acquired = resolve })
    const release = new Promise<void>(resolve => { unlock = resolve })
    const transaction = db.$transaction(async tx => {
      await postHrisLeaveBalanceEntry(first, tx)
      acquired()
      await release
    })
    try {
      await held
      expect((await postHrisLeaveBalanceEntry(second)).created).toBe(true)
    } finally { unlock(); await transaction }
  })

  it.each(["event", "ledger", "audit", "applied"])("rolls back approval on injected %s failure", async stage => {
    await postHrisLeaveBalanceEntry(posting())
    const pending = await request()
    const table = { event: "businessEvent", ledger: "hrisLeaveBalanceEntry", audit: "auditLog", applied: "businessEvent" }[stage]!
    const method = stage === "applied" ? "update" : "create"
    await expect(db.$transaction(async tx => {
      const injected = new Proxy(tx, { get(target, property) {
        const value = Reflect.get(target, property)
        if (property !== table) return value
        return new Proxy(value, { get(delegate, key) {
          if (key === method) return () => { throw new Error("synthetic persistence fault") }
          return Reflect.get(delegate, key)
        } })
      } })
      await decideOperationalTimeRequest(approve(pending.id), injected)
    })).rejects.toThrow()
    expect(await balance()).toBe(480)
    expect((await db.hrisTimeRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("REQUESTED")
    expect(await db.businessEvent.count({ where: { sourceId: pending.id } })).toBe(0)
    expect(await db.auditLog.count({ where: { entityId: pending.id } })).toBe(0)
  })

  it("rejects foreign-tenant employee and missing permission without ledger effects", async () => {
    await expect(postHrisLeaveBalanceEntry(posting(480, { organizationId: orgs[1] }))).rejects.toThrow("tenant scope")
    await expect(postHrisLeaveBalanceEntry(posting(480, { actorPermissions: [] }))).rejects.toThrow("Missing permission")
    expect(await balance()).toBe(0)
  })
})

describe("HR-02 corrected attendance revisions", () => {
  beforeEach(fixture)
  async function attendanceFixture(complete=true) {
    await postHrisLeaveBalanceEntry(posting(960))
    const calendar = await db.hrisWorkCalendar.create({ data: {
      organizationId: orgs[0], code: randomUUID(), name: "Synthetic calendar", countryCode: "CM", timezone: "Africa/Douala",
      effectiveFrom: new Date("2026-01-01Z"), sourceHash: "sha256:synthetic-calendar", status: "ACTIVE",
    } })
    await db.hrisWorkSchedule.create({ data: { organizationId: orgs[0], employeeId, calendarId: calendar.id,
      name: "Synthetic schedule", timezone: "Africa/Douala", weeklyPattern: {sun:480,mon:480,tue:480,wed:480,thu:480,fri:480,sat:480}, standardWeeklyMinutes: 3360,
      effectiveFrom: new Date("2026-01-01Z"), preparedById: actors[0], approvedById: actors[2], approvalEvidenceHash: "sha256:synthetic-schedule-review", status: "ACTIVE", sourceHash: "sha256:synthetic-schedule" } })
    const period = await db.payrollPeriod.upsert({ where: { organizationId_periodStart_periodEnd: {
      organizationId: orgs[0], periodStart: new Date("2026-10-01Z"), periodEnd: new Date("2026-10-31T23:59:59Z"),
    } }, update: {}, create: { organizationId: orgs[0], name: randomUUID(), countryCode: "CM",
      periodStart: new Date("2026-10-01Z"), periodEnd: new Date("2026-10-31T23:59:59Z"), payDate: new Date("2026-10-31Z") } })
    const dates=complete?Array.from({length:31},(_,i)=>i+1):[10]
    const batch = await importOperationalTime({organizationId:orgs[0],actorId:actors[0],actorPermissions:["hris.people.manage"],
      sourceSystem:"SYNTHETIC",sourceHash:randomUUID(),idempotencyKey:randomUUID(),entries:dates.map(day=>({
        employeeId,workDate:new Date(Date.UTC(2026,9,day)),scheduledMinutes:480,workedMinutes:day===10?360:0,
        absenceMinutes:day===10?120:480,overtimeMinutes:0,sourceRecordId:`october-${day}`,sourceHash:`sha256:synthetic-october-${day}`,
      }))})
    const entry=await db.hrisTimeEntry.findFirstOrThrow({where:{organizationId:orgs[0],employeeId,importBatchId:batch.id,workDate:date}})
    const certification = { organizationId: orgs[0], employeeId, payrollPeriodId: period.id, actorId: actors[2],
      actorPermissions: ["hris.people.manage"], preparedById: actors[0], approvalEvidenceHash: "sha256:synthetic-attendance-review" }
    const correction = { organizationId: orgs[0], employeeId, actorId: actors[0], actorPermissions: ["hris.people.manage"],
      type: "ATTENDANCE_CORRECTION" as const, periodStart: date, periodEnd: date, requestedMinutes: 480,
      targetTimeEntryId: entry.id, expectedEntryHash: correctedAttendanceEntry(entry, []).sourceHash,
      proposedWorkedMinutes: 480, proposedAbsenceMinutes: 0, reason: "Correct synthetic missed minutes",
      requestEvidenceHash: "sha256:synthetic-correction-proof", idempotencyKey: randomUUID() }
    return { entry, period, certification, correction, recertification: { ...certification, approvalEvidenceHash: "sha256:synthetic-corrected-review" } }
  }

  it("HR-08 reviewer rejects a lifecycle proposal over already frozen attendance without stranding certification", async () => {
    const f = await attendanceFixture()
    const frozen = await certifyOperationalAttendance(f.certification)
    const eventsBefore = await db.businessEvent.count({where:{organizationId:orgs[0],sourceId:employeeId}})
    await expect(requestHrisEmployeeLifecycle({organizationId:orgs[0],employeeId,actorId:actors[0],actorPermissions:["hris.people.manage"],type:"TERMINATE",effectiveAt:new Date("2026-10-30Z"),reason:"Synthetic frozen-period departure",evidenceHash:"sha256:synthetic",idempotencyKey:randomUUID()})).rejects.toThrow("certified payroll input")
    const employee = await db.payrollEmployee.findUniqueOrThrow({where:{id:employeeId}})
    expect((employee.metadata as any)?.hrisLifecycle?.pending).toBeUndefined()
    expect(employee.status).toBe("ACTIVE")
    expect(await db.businessEvent.count({where:{organizationId:orgs[0],sourceId:employeeId}})).toBe(eventsBefore)
    expect((await certifyOperationalAttendance(f.certification)).attendanceSnapshot.id).toBe(frozen.attendanceSnapshot.id)
  })

  async function assertCurrent(periodId: string, snapshotId: string) {
    const snapshot = await db.payrollAttendanceSnapshot.findUniqueOrThrow({where:{id:snapshotId}})
    return db.$transaction(tx => assertOperationalAttendanceCurrentInTx(tx,{organizationId:orgs[0],employeeId,payrollPeriodId:periodId},snapshot.metadata))
  }

  it.each(["LEAVE", "OVERTIME"] as const)("HR-08 reviewer rejects stale %s evidence and permits rejected-request recovery", async type => {
    const f = await attendanceFixture()
    const frozen = await certifyOperationalAttendance(f.certification)
    await assertCurrent(f.period.id, frozen.attendanceSnapshot.id)
    const input = {organizationId:orgs[0],employeeId,actorId:actors[0],actorPermissions:["hris.people.manage"],type,leavePolicyId:policyId,
      periodStart:date,periodEnd:date,requestedMinutes:120,reason:"Synthetic post-freeze request",requestEvidenceHash:"sha256:synthetic-request",idempotencyKey:randomUUID()}
    const pending = await requestOperationalTime(input)
    await expect(assertCurrent(f.period.id,frozen.attendanceSnapshot.id)).rejects.toThrow("INPUT_UNAPPROVED")
    await decideOperationalTimeRequest({...approve(pending.request.id),decision:"REJECT"})
    await assertCurrent(f.period.id, frozen.attendanceSnapshot.id)
    const approved = await requestOperationalTime({...input,idempotencyKey:randomUUID()})
    await decideOperationalTimeRequest(approve(approved.request.id))
    await expect(assertCurrent(f.period.id,frozen.attendanceSnapshot.id)).rejects.toThrow()
    if(type === "LEAVE") {
      const fresh = await certifyOperationalAttendance(f.recertification)
      expect(fresh.attendanceSnapshot.totals.leaveMinutes).toBe(120)
      await assertCurrent(f.period.id,fresh.attendanceSnapshot.id)
    } // Overtime without matching worked-time evidence remains unavailable.
    expect((await db.payrollAttendanceSnapshot.findUniqueOrThrow({where:{id:frozen.attendanceSnapshot.id}})).workedMinutes).toBe(360)
  })

  it("HR-08 reviewer detects a newly approved schedule and requires fresh certification", async () => {
    const f = await attendanceFixture()
    const frozen = await certifyOperationalAttendance(f.certification)
    const prior = await db.hrisWorkSchedule.findFirstOrThrow({where:{organizationId:orgs[0],employeeId}})
    const schedule = await assignWorkSchedule({organizationId:orgs[0],employeeId,actorId:actors[0],actorPermissions:["hris.people.manage"],calendarId:prior.calendarId,
      name:"Synthetic revised schedule",timezone:prior.timezone,weeklyPattern:prior.weeklyPattern as Record<string,number>,standardWeeklyMinutes:prior.standardWeeklyMinutes,
      effectiveFrom:new Date("2026-10-02Z"),sourceHash:"sha256:synthetic-revised-schedule"})
    await approveWorkSchedule({organizationId:orgs[0],employeeId,scheduleId:schedule.id,actorId:actors[2],actorPermissions:["hris.people.manage"],approvalEvidenceHash:"sha256:synthetic-new-schedule-review"})
    await expect(assertCurrent(f.period.id,frozen.attendanceSnapshot.id)).rejects.toThrow("OPERATIONAL_ATTENDANCE_STALE")
    const fresh = await certifyOperationalAttendance(f.recertification)
    await assertCurrent(f.period.id,fresh.attendanceSnapshot.id)
  })

  it("HR-08 reviewer blocks post-freeze import anomalies and changed ledger proof", async () => {
    const f = await attendanceFixture()
    const frozen = await certifyOperationalAttendance(f.certification)
    await postHrisLeaveBalanceEntry(posting(120))
    await expect(assertCurrent(f.period.id,frozen.attendanceSnapshot.id)).rejects.toThrow("OPERATIONAL_ATTENDANCE_STALE")
    const fresh = await certifyOperationalAttendance(f.recertification)
    await assertCurrent(f.period.id,fresh.attendanceSnapshot.id)
    await importOperationalTime({organizationId:orgs[0],actorId:actors[0],actorPermissions:["hris.people.manage"],sourceSystem:"SYNTHETIC",sourceHash:randomUUID(),idempotencyKey:randomUUID(),
      entries:[{employeeId,workDate:date,scheduledMinutes:480,workedMinutes:100,absenceMinutes:0,overtimeMinutes:0,sourceRecordId:randomUUID(),sourceHash:"sha256:synthetic-invalid-import"}]})
    await expect(assertCurrent(f.period.id,fresh.attendanceSnapshot.id)).rejects.toThrow("INPUT_UNAPPROVED")
  })

  it("HR-08 blocks early certification across an approved future employment change", async () => {
    const f = await attendanceFixture()
    const request = await requestHrisEmployeeLifecycle({organizationId:orgs[0],employeeId,actorId:actors[0],actorPermissions:["hris.people.manage"],type:"TERMINATE",effectiveAt:new Date("2026-10-30Z"),reason:"Synthetic future departure",evidenceHash:"sha256:synthetic",idempotencyKey:randomUUID()})
    await approveHrisEmployeeLifecycle({organizationId:orgs[0],employeeId,actorId:actors[2],actorPermissions:["hris.people.manage"],requestId:request.workflow.requestId,decisionReason:"Synthetic independent review",approvalEvidenceHash:"sha256:synthetic-approval"})
    await expect(certifyOperationalAttendance(f.certification)).rejects.toThrow("HRIS_TIME_EMPLOYMENT_CHANGE_PENDING")
    expect(await db.payrollAttendanceSnapshot.count({where:{employeeId}})).toBe(0)
    expect((await db.payrollEmployee.findUniqueOrThrow({where:{id:employeeId}})).status).toBe("ACTIVE")
  })
  it("preserves the original and produces exactly one corrected 360→480 revision with exact replay", async () => {
    const f = await attendanceFixture()
    const first = await certifyOperationalAttendance(f.certification)
    const pending = await requestOperationalTime(f.correction)
    await expect(certifyOperationalAttendance(f.certification)).rejects.toThrow("HRIS_TIME_INPUT_UNAPPROVED")
    await decideOperationalTimeRequest(approve(pending.request.id))
    const original = await db.payrollAttendanceSnapshot.findUniqueOrThrow({ where: { id: first.attendanceSnapshot.id } })
    await expect(db.$transaction(tx => assertOperationalCorrectionsCertified(tx, { organizationId: orgs[0], employeeId }, f.period, original.metadata))).rejects.toThrow("NOT_CERTIFIED")
    await expect(certifyOperationalAttendance(f.certification)).rejects.toThrow("FRESH_APPROVAL_REQUIRED")
    const corrected = await certifyOperationalAttendance(f.recertification)
    expect(corrected.attendanceSnapshot.totals.workedMinutes).toBe(480)
    expect(corrected.attendanceSnapshot.correctedFromId).toBe(first.attendanceSnapshot.id)
    const retained = await db.payrollAttendanceSnapshot.findUniqueOrThrow({ where: { id: first.attendanceSnapshot.id } })
    expect(retained.workedMinutes).toBe(360)
    expect(retained.metadata).toEqual(original.metadata)
    expect(retained.sourceHash).toBe(original.sourceHash)
    expect((await db.hrisTimeEntry.findUniqueOrThrow({ where: { id: f.entry.id } })).workedMinutes).toBe(360)
    const replay = await certifyOperationalAttendance(f.recertification)
    expect(replay.created).toBe(false)
    expect(replay.attendanceSnapshot.id).toBe(corrected.attendanceSnapshot.id)
    const latest = await db.payrollAttendanceSnapshot.findUniqueOrThrow({ where: { id: corrected.attendanceSnapshot.id } })
    expect((latest.metadata as any).sourcePayload.sourceRevision).toBe(2)
    expect(latest.sourceHash).not.toBe(original.sourceHash)
    const readiness = buildHrisPayrollReadinessExport({organizationId:orgs[0],payrollPeriodId:f.period.id,periodStart:f.period.periodStart.toISOString(),periodEnd:f.period.periodEnd.toISOString(),countryCode:"CM",employees:[{
      employeeId,employeeDisplayName:"Synthetic",employeeMetadata:{},contract:null,compensationAssignments:[],paymentDestinationHash:null,paymentDestinationRequest:null,
      attendance:{snapshotId:latest.id,sourceHash:latest.sourceHash,certificationHash:`sha256:${hashBusinessPayload((latest.metadata as any).sourcePayload)}`},
    }]})
    expect(readiness.employeeProofs[0].attendanceSnapshotId).toBe(latest.id)
    expect(readiness.blockerCodes).not.toContain("HRIS_PAYROLL_ATTENDANCE_CERTIFICATION_PROOF_MISSING")
    expect(readiness.status).toBe("BLOCKED") // Unrelated contract/identity/payment proof was deliberately not fabricated.
    await db.$transaction(tx => assertOperationalCorrectionsCertified(tx, { organizationId: orgs[0], employeeId }, f.period, latest.metadata))
    expect((await requestOperationalTime(f.correction)).created).toBe(false)
    await expect(requestOperationalTime({ ...f.correction, proposedWorkedMinutes: 420 })).rejects.toThrow("IDEMPOTENCY_CONFLICT")
  })

  it("rejects a simultaneous stale correction instead of overwriting reviewed values", async () => {
    const f = await attendanceFixture()
    const first = await requestOperationalTime(f.correction)
    const second = await requestOperationalTime({ ...f.correction, idempotencyKey: randomUUID(), proposedWorkedMinutes: 420, proposedAbsenceMinutes: 60 })
    const results = await race([tx => decideOperationalTimeRequest(approve(first.request.id), tx), tx => decideOperationalTimeRequest(approve(second.request.id), tx)])
    expect(results.filter(item => item.status === "fulfilled")).toHaveLength(1)
    expect(results.filter(item => item.status === "rejected").map(item => (item as PromiseRejectedResult).reason.message).join()).toContain("HRIS_CORRECTION_STALE")
  })

  it("does not apply a rejected correction and rejects foreign targets", async () => {
    const f = await attendanceFixture()
    const pending = await requestOperationalTime(f.correction)
    await decideOperationalTimeRequest({ ...approve(pending.request.id), decision: "REJECT" })
    const certified = await certifyOperationalAttendance(f.certification)
    expect(certified.attendanceSnapshot.totals.workedMinutes).toBe(360)
    await expect(requestOperationalTime({ ...f.correction, idempotencyKey: randomUUID(), targetTimeEntryId: "other-employee-entry" })).rejects.toThrow("TARGET_MISSING")
  })

  it.each(["CALCULATED", "PAID"] as const)("blocks correction of a %s period without changing history", async status => {
    const f = await attendanceFixture()
    const first = await certifyOperationalAttendance(f.certification)
    const pending = await requestOperationalTime(f.correction)
    const run = await db.payrollRun.create({ data: { organizationId: orgs[0], payrollPeriodId: f.period.id,
      runNumber: randomUUID(), status, countryCode: "CM", countryPackVersion: "synthetic", countryPackSchemaVersion: "synthetic",
      countryPackResolutionHash: "synthetic", countryPackCapabilityStatus: "SYNTHETIC_ONLY", ruleSetHash: "synthetic",
      calculationHash: "synthetic", attendanceSnapshotHash: "sha256:synthetic-retained-snapshot" } })
    try {
      await expect(decideOperationalTimeRequest(approve(pending.request.id))).rejects.toThrow("REQUIRES_PAYROLL_CORRECTION_RUN")
      expect((await db.hrisTimeRequest.findUniqueOrThrow({ where: { id: pending.request.id } })).status).toBe("REQUESTED")
      expect((await db.payrollAttendanceSnapshot.findUniqueOrThrow({ where: { id: first.attendanceSnapshot.id } })).workedMinutes).toBe(360)
    } finally { await db.payrollRun.delete({ where: { id: run.id } }) }
  })

  it("rolls back a corrected snapshot and original status when the caller aborts, then recovers", async () => {
    const f = await attendanceFixture()
    const first = await certifyOperationalAttendance(f.certification)
    const pending = await requestOperationalTime(f.correction)
    await decideOperationalTimeRequest(approve(pending.request.id))
    await expect(db.$transaction(async tx => {
      await certifyOperationalAttendance(f.recertification, tx)
      throw new Error("synthetic-correction-abort")
    })).rejects.toThrow("synthetic-correction-abort")
    expect((await db.payrollAttendanceSnapshot.findUniqueOrThrow({ where: { id: first.attendanceSnapshot.id } })).status).toBe("FROZEN")
    expect(await db.payrollAttendanceSnapshot.count({ where: { organizationId: orgs[0], employeeId } })).toBe(1)
    expect((await certifyOperationalAttendance(f.recertification)).attendanceSnapshot.totals.workedMinutes).toBe(480)
  })

  it("HR-03 certifies a 960-minute leave once as 480 in each period and binds schedule changes to a fresh revision", async () => {
    const f = await attendanceFixture()
    await importOperationalTime({organizationId:orgs[0],actorId:actors[0],actorPermissions:["hris.people.manage"],
      sourceSystem:"SYNTHETIC",sourceHash:randomUUID(),idempotencyKey:randomUUID(),entries:Array.from({length:30},(_,i)=>({employeeId,
        workDate:new Date(Date.UTC(2026,10,i+1)),scheduledMinutes:480,workedMinutes:0,absenceMinutes:480,overtimeMinutes:0,
        sourceRecordId:`november-${i+1}`,sourceHash:`sha256:synthetic-november-${i+1}`}))})
    const leave = await requestOperationalTime({ organizationId:orgs[0],employeeId,actorId:actors[0],actorPermissions:["hris.people.manage"],
      type:"LEAVE",leavePolicyId:policyId,periodStart:new Date("2026-10-31Z"),periodEnd:new Date("2026-11-01Z"),requestedMinutes:960,
      reason:"Synthetic two-period leave",requestEvidenceHash:"sha256:two-period-leave",idempotencyKey:randomUUID() })
    await decideOperationalTimeRequest(approve(leave.request.id))
    const november = await db.payrollPeriod.create({data:{organizationId:orgs[0],name:randomUUID(),countryCode:"CM",
      periodStart:new Date("2026-11-01Z"),periodEnd:new Date("2026-11-30T23:59:59Z"),payDate:new Date("2026-11-30Z")}})
    const octoberResult = await certifyOperationalAttendance(f.certification)
    const novemberResult = await certifyOperationalAttendance({...f.certification,payrollPeriodId:november.id})
    expect([octoberResult.attendanceSnapshot.totals.leaveMinutes,novemberResult.attendanceSnapshot.totals.leaveMinutes]).toEqual([480,480])
    expect((await certifyOperationalAttendance(f.certification)).attendanceSnapshot.id).toBe(octoberResult.attendanceSnapshot.id)
    const schedule=await db.hrisWorkSchedule.findFirstOrThrow({where:{organizationId:orgs[0],employeeId}})
    await db.hrisWorkSchedule.create({data:{organizationId:orgs[0],employeeId,calendarId:schedule.calendarId,name:"Reviewed new schedule version",
      timezone:schedule.timezone,weeklyPattern:schedule.weeklyPattern as Prisma.InputJsonValue,standardWeeklyMinutes:3360,
      effectiveFrom:new Date("2026-10-15Z"),preparedById:actors[0],approvedById:actors[2],approvalEvidenceHash:"sha256:new-schedule-review",status:"ACTIVE",sourceHash:"sha256:new-schedule"}})
    await expect(certifyOperationalAttendance(f.certification)).rejects.toThrow("FRESH_APPROVAL_REQUIRED")
    const revision=await certifyOperationalAttendance(f.recertification)
    expect(revision.attendanceSnapshot.correctedFromId).toBe(octoberResult.attendanceSnapshot.id)
    expect(revision.attendanceSnapshot.totals.leaveMinutes).toBe(480)
  })
  it("HR-03 refuses an incomplete period even when every supplied row reconciles",async()=>{
    const f=await attendanceFixture(false)
    await expect(certifyOperationalAttendance(f.certification)).rejects.toThrow("every scheduled work date")
    expect(await db.payrollAttendanceSnapshot.count({where:{organizationId:orgs[0],employeeId}})).toBe(0)
  })
})

describe("HR-04 effective lifecycle",()=>{
  beforeEach(fixture)
  async function lifecycle(type:"SUSPEND"|"TRANSFER"|"TERMINATE"|"REHIRE",effectiveAt:Date,target={}) {
    const request=await requestHrisEmployeeLifecycle({organizationId:orgs[0],employeeId,actorId:actors[0],actorPermissions:["hris.people.manage"],
      type,effectiveAt,target,reason:"Synthetic lifecycle change",evidenceHash:"sha256:synthetic-lifecycle",idempotencyKey:randomUUID()})
    const command={organizationId:orgs[0],employeeId,actorId:actors[2],actorPermissions:["hris.people.manage"],requestId:request.workflow.requestId}
    await approveHrisEmployeeLifecycle({...command,decisionReason:"Independent synthetic review",approvalEvidenceHash:"sha256:synthetic-lifecycle-approved"})
    return command
  }
  it("leaves tomorrow's termination scheduled without changing today's employee or contracts",async()=>{
    const command=await lifecycle("TERMINATE",new Date(Date.now()+86400000))
    const before=await db.payrollEmployee.findUniqueOrThrow({where:{id:employeeId}})
    expect(await applyApprovedHrisEmployeeLifecycle(command)).toMatchObject({applied:false,employee:{status:"ACTIVE"}})
    const after=await db.payrollEmployee.findUniqueOrThrow({where:{id:employeeId}})
    expect(after.status).toBe(before.status);expect(after.terminationDate).toBe(null);expect(after.metadata).toEqual(before.metadata)
    expect(await db.businessEvent.count({where:{organizationId:orgs[0],sourceId:employeeId,eventType:"hris.employee.lifecycle.applied"}})).toBe(0)
  })
  it("applies one due movement under contention and returns the retained result to the retry",async()=>{
    const effectiveAt=new Date(Date.now()-1000)
    const command=await lifecycle("TRANSFER",effectiveAt,{department:"Synthetic Finance"})
    const results=await race([tx=>applyApprovedHrisEmployeeLifecycle(command,tx),tx=>applyApprovedHrisEmployeeLifecycle(command,tx)])
    expect(results.filter(item=>item.status==="fulfilled")).toHaveLength(2)
    expect(await db.businessEvent.count({where:{organizationId:orgs[0],sourceId:employeeId,eventType:"hris.employee.lifecycle.applied"}})).toBe(1)
    expect(await db.auditLog.count({where:{organizationId:orgs[0],entityId:employeeId,action:"HRIS_EMPLOYEE_LIFECYCLE_APPLIED"}})).toBe(1)
    expect(await applyApprovedHrisEmployeeLifecycle(command)).toMatchObject({applied:true,replayed:true,employee:{department:"Synthetic Finance"}})
    const before=await getHrisEmploymentAsOf({...command,asOf:new Date(effectiveAt.getTime()-1)})
    const after=await getHrisEmploymentAsOf({...command,asOf:effectiveAt})
    expect(before.state.department).toBe(null);expect(after.state.department).toBe("Synthetic Finance")
  })
  it.each(["auditLog","businessEvent"] as const)("rolls back failed %s persistence and recovers the same approved due movement",async boundary=>{
    const command=await lifecycle("SUSPEND",new Date(Date.now()-1000))
    await expect(db.$transaction(async tx=>{
      const failing=new Proxy(tx,{get(target,key){if(key===boundary)return new Proxy(target[boundary],{get(delegate,method){if(method==="create")return async()=>{throw Error("synthetic-lifecycle-audit-failure")};return Reflect.get(delegate,method)}});return Reflect.get(target,key)}})
      return applyApprovedHrisEmployeeLifecycle(command,failing)
    })).rejects.toThrow(boundary==="auditLog"?"synthetic-lifecycle-audit-failure":"Business event could not be recorded.")
    expect((await db.payrollEmployee.findUniqueOrThrow({where:{id:employeeId}})).status).toBe("ACTIVE")
    expect(await db.businessEvent.count({where:{organizationId:orgs[0],sourceId:employeeId,eventType:"hris.employee.lifecycle.applied"}})).toBe(0)
    expect(await applyApprovedHrisEmployeeLifecycle(command)).toMatchObject({applied:true,employee:{status:"SUSPENDED"}})
  })
  it("rejects changed employment fields or removed permission without applying",async()=>{
    const command=await lifecycle("SUSPEND",new Date(Date.now()-1000))
    await db.payrollEmployee.update({where:{id:employeeId},data:{jobTitle:"Changed after review"}})
    await expect(applyApprovedHrisEmployeeLifecycle(command)).rejects.toThrow("SOURCE_CHANGED")
    await expect(applyApprovedHrisEmployeeLifecycle({...command,actorPermissions:[]})).rejects.toThrow("Missing permission")
    expect((await db.payrollEmployee.findUniqueOrThrow({where:{id:employeeId}})).status).toBe("ACTIVE")
  })
  it("HR-08 reviewer recovers a legacy approved change blocked by frozen attendance without rewriting evidence",async()=>{
    const effectiveAt=new Date(Date.now()-1000)
    const command=await lifecycle("SUSPEND",effectiveAt)
    const snapshot=await db.payrollAttendanceSnapshot.create({data:{organizationId:orgs[0],employeeId,status:"FROZEN",
      periodStart:new Date(effectiveAt.getTime()-86400000),periodEnd:new Date(effectiveAt.getTime()+86400000),sourceHash:"sha256:retained-frozen-input"}})
    await expect(applyApprovedHrisEmployeeLifecycle(command)).rejects.toThrow("certified payroll input")
    expect((await db.payrollAttendanceSnapshot.findUniqueOrThrow({where:{id:snapshot.id}})).sourceHash).toBe(snapshot.sourceHash)
    expect((await db.payrollEmployee.findUniqueOrThrow({where:{id:employeeId}})).status).toBe("ACTIVE")
    const rejection = {...command, actorId:actors[2], decisionReason:"Withdraw unsupported frozen-period proposal"}
    await expect(rejectHrisEmployeeLifecycle({...rejection,actorId:actors[0]})).rejects.toThrow("cannot reject their own request")
    await rejectHrisEmployeeLifecycle(rejection)
    const recovered = await db.payrollEmployee.findUniqueOrThrow({where:{id:employeeId}})
    expect((recovered.metadata as any).hrisLifecycle.pending).toBeNull()
    expect(recovered.status).toBe("ACTIVE")
    expect((await db.payrollAttendanceSnapshot.findUniqueOrThrow({where:{id:snapshot.id}})).sourceHash).toBe(snapshot.sourceHash)
    expect(await db.auditLog.count({where:{organizationId:orgs[0],entityId:employeeId,action:"HRIS_EMPLOYEE_LIFECYCLE_REJECTED"}})).toBe(1)
    await expect(applyApprovedHrisEmployeeLifecycle(command)).rejects.toThrow("Approved lifecycle request not found")
    await expect(requestHrisEmployeeLifecycle({...command,actorId:actors[0],type:"SUSPEND",effectiveAt:new Date(snapshot.periodEnd.getTime()+1),reason:"Synthetic later proposal",evidenceHash:"sha256:synthetic",idempotencyKey:randomUUID()})).resolves.toBeDefined()
  })
  it("retains original employment dates through a reviewed rehire",async()=>{
    const effectiveAt=new Date(Date.now()-1000)
    await db.payrollEmployee.update({where:{id:employeeId},data:{status:"TERMINATED",terminationDate:new Date("2026-06-01Z"),paymentDestinationHash:"sha256:synthetic-destination"}})
    await db.payrollContract.create({data:{organizationId:orgs[0],employeeId,contractNumber:randomUUID(),type:"CDI",status:"ACTIVE",
      effectiveFrom:effectiveAt,baseSalary:1,signedDocumentHash:"sha256:synthetic-contract",activatedBusinessEventId:"synthetic-existing-activation"}})
    const command=await lifecycle("REHIRE",effectiveAt)
    expect(await applyApprovedHrisEmployeeLifecycle(command)).toMatchObject({applied:true,employee:{status:"ACTIVE",hireDate:effectiveAt.toISOString(),terminationDate:null}})
    const historical=await getHrisEmploymentAsOf({...command,asOf:new Date(effectiveAt.getTime()-1)})
    expect(historical.state).toMatchObject({status:"TERMINATED",hireDate:"2026-01-01T00:00:00.000Z",terminationDate:"2026-06-01T00:00:00.000Z"})
  })
})

describe("HR-05 real manager authorization", () => {
  const start = new Date("2026-01-01Z")
  let manager: string
  let delegate: string
  let unit: string
  let delegation: string
  const reports = Array.from({length: 200}, (_, i) => `${namespace}-report-${String(i + 1).padStart(3, "0")}`)
  const input = (extra: Record<string, unknown> = {}) => ({organizationId: orgs[0], actorId: actors[1], actorPermissions: ["hris.people.read"], limit: 1, ...extra})
  beforeAll(async () => {
    manager = (await db.payrollEmployee.create({data: {organizationId: orgs[0], userId: actors[1], employeeNumber: randomUUID(), displayName: "Synthetic manager", status: "ACTIVE", hireDate: start}})).id
    delegate = (await db.payrollEmployee.create({data: {organizationId: orgs[0], userId: actors[2], employeeNumber: randomUUID(), displayName: "Synthetic delegate", status: "ACTIVE", hireDate: start}})).id
    unit = (await db.hrisOrgUnit.create({data: {organizationId: orgs[0], code: randomUUID(), name: "Synthetic team", type: "TEAM", effectiveFrom: start}})).id
    const position = await db.hrisPosition.create({data: {organizationId: orgs[0], orgUnitId: unit, code: randomUUID(), title: "Synthetic role", effectiveFrom: start}})
    await db.payrollEmployee.createMany({data: reports.map((id, i) => ({id, organizationId: orgs[0], employeeNumber: id, displayName: `Synthetic report ${i + 1}`, department: "Synthetic team", status: "ACTIVE", hireDate: start}))})
    const assignments = [manager, ...reports].map(id => ({id: `${id}-assignment`, organizationId: orgs[0], employeeId: id, positionId: position.id, orgUnitId: unit, effectiveFrom: start}))
    await db.hrisEmploymentAssignment.createMany({data: assignments})
    await db.hrisReportingRelationship.createMany({data: reports.map(id => ({organizationId: orgs[0], managerEmployeeId: manager, managerAssignmentId: `${manager}-assignment`, reportEmployeeId: id, reportAssignmentId: `${id}-assignment`, effectiveFrom: start, approvalEvidenceHash: "sha256:synthetic", approvedById: actors[0], reasonHash: "sha256:synthetic"}))})
    delegation = (await db.hrisManagerDelegation.create({data: {organizationId: orgs[0], delegatorEmployeeId: manager, delegateEmployeeId: delegate, scopeOrgUnitId: unit, authority: "PEOPLE_READ", effectiveFrom: start, effectiveTo: new Date("2099-01-01Z"), approvalEvidenceHash: "sha256:synthetic", approvedById: actors[0], reasonHash: "sha256:synthetic"}})).id
  })
  it("authorizes exact reports 2/51/200 and all scope IDs despite page size one", async () => {
    for (const n of [2, 51, 200]) expect((await resolveHrisPeopleAccessScope(input({employeeId: reports[n - 1]}))).employeeIds).toEqual([reports[n - 1]])
    expect((await resolveHrisPeopleAccessScope(input())).employeeIds).toHaveLength(200)
  })
  it("denies foreign and unrelated targets before profile access", async () => {
    const foreign = await db.payrollEmployee.create({data: {organizationId: orgs[1], employeeNumber: randomUUID(), displayName: "Foreign synthetic", hireDate: start}})
    await expect(resolveHrisPeopleAccessScope(input({employeeId: foreign.id}))).rejects.toThrow("tenant scope")
    await expect(resolveHrisPeopleAccessScope(input({employeeId: delegate}))).rejects.toThrow("No active durable")
    await expect(resolveHrisPeopleAccessScope(input({actorPermissions: ["hris.self_service.read"]}))).rejects.toThrow("Missing permission")
  })
  it("read delegation never grants approval, and expiry/revocation denies historical reads", async () => {
    const delegated = input({actorId: actors[2], employeeId: reports[199], asOf: new Date("2026-04-01Z")})
    expect((await resolveHrisPeopleAccessScope(delegated)).employeeIds).toEqual([reports[199]])
    await expect(resolveHrisPeopleAccessScope({...delegated, delegationAuthority: "APPROVAL_DECISION"})).rejects.toThrow("No active durable")
    await db.hrisManagerDelegation.update({where: {id: delegation}, data: {effectiveTo: new Date("2026-05-01Z")}})
    await expect(resolveHrisPeopleAccessScope(delegated)).rejects.toThrow("No active durable")
    await db.hrisManagerDelegation.update({where: {id: delegation}, data: {effectiveTo: new Date("2099-01-01Z"), revokedAt: new Date()}})
    await expect(resolveHrisPeopleAccessScope(delegated)).rejects.toThrow("No active durable")
  })
  it("denies former and inactive managers even when the requested date predates removal", async () => {
    await db.hrisReportingRelationship.updateMany({where: {organizationId: orgs[0], managerEmployeeId: manager, reportEmployeeId: reports[199]}, data: {effectiveTo: new Date("2026-05-01Z")}})
    await expect(resolveHrisPeopleAccessScope(input({employeeId: reports[199], asOf: new Date("2026-04-01Z")}))).rejects.toThrow("No active durable")
    await db.payrollEmployee.update({where: {id: manager}, data: {status: "TERMINATED"}})
    await expect(resolveHrisPeopleAccessScope(input({employeeId: reports[1]}))).rejects.toThrow("active employee identity")
    await db.payrollEmployee.update({where: {id: manager}, data: {status: "ACTIVE"}})
  })
})

describe("HR-06 real scoped discovery", () => {
  const admin = {organizationId: orgs[1], actorId: `${namespace}-b-admin`, actorPermissions: ["hris.people.read", "hris.people.manage"], page: 1, limit: 25}
  beforeAll(async () => {
    await db.user.create({data: {id: admin.actorId, organizationId: orgs[1], email: `${admin.actorId}@example.invalid`}})
  })
  it.each([0,1,50,51,100,200])("finds the last employee and pages exactly %i records", async count => {
    await db.payrollEmployee.deleteMany({where: {organizationId: orgs[1]}})
    await db.payrollEmployee.createMany({data: Array.from({length: count}, (_, i) => ({id: `${namespace}-discovery-${String(i).padStart(3,"0")}`, organizationId: orgs[1], employeeNumber: String(i), displayName: i === count-1 ? "ZZ Synthetic last employee" : "Duplicate synthetic name", status: "ACTIVE", department: "RH", hireDate: date}))})
    const first = await getHrisEmployeeDirectory(admin)
    expect(first.pagination).toMatchObject({total: count, authorizedTotal: count})
    const ids = []
    for (let page=1; page<=first.pagination!.totalPages; page++) {
      const result = page === 1 ? first : await getHrisEmployeeDirectory({...admin,page})
      ids.push(...result.employees.map(e=>e.id))
    }
    expect(ids).toHaveLength(count)
    expect(new Set(ids).size).toBe(count)
    const last = await getHrisEmployeeDirectory({...admin, search: "ZZ Synthetic", department: "rh", status: "ACTIVE", page: 99})
    expect(last.pagination).toMatchObject({total: count ? 1 : 0, page: 1, authorizedTotal: count})
    expect(last.employees).toHaveLength(count ? 1 : 0)
    expect((await getHrisEmployeeDirectory({...admin, search: "Foreign absent"})).pagination!.total).toBe(0)
  })
  it("counts only the manager's current reports and returns redacted exact profiles", async () => {
    const manager = {organizationId: orgs[0], actorId: actors[1], actorPermissions: ["hris.people.read"], page: 1, limit: 25}
    const directory = await getHrisEmployeeDirectory(manager)
    // HR-05 closed report 200; 199 current relationships remain.
    expect(directory.pagination).toMatchObject({total: 199, authorizedTotal: 199})
    expect((await getHrisEmployeeDirectory({...manager,search: "ZZ Synthetic"})).pagination!.total).toBe(0)
    const profile = await getHrisEmployeeProfile({...manager,employeeId: `${namespace}-report-002`})
    expect(profile.employee.id).toBe(`${namespace}-report-002`)
    expect(profile.employee.userMapping).not.toHaveProperty("userId")
    expect(JSON.stringify(profile.employee)).not.toMatch(/bankAccount|taxIdentifierHash|socialIdentifierHash|baseSalary/)
  })
})

it("HR-06 browser scoped search and recovery with real database", async () => {
  const {createServer} = require("node:http")
  const fs = require("node:fs")
  const path = require("node:path")
  const {execFile} = require("node:child_process")
  const directory = path.resolve("what-next/hris-implementation-2026-10-24/HR-06/browser")
  const server = createServer(async (req: any, res: any) => {
    const url = new URL(req.url,"http://127.0.0.1")
    if (url.pathname === "/api") {
      res.setHeader("Content-Type","application/json")
      const role = /fixtureRole=([^;]+)/.exec(req.headers.cookie ?? "")?.[1]
      const authority = role === "admin" ? {organizationId:orgs[1],actorId:`${namespace}-b-admin`,actorPermissions:["hris.people.read","hris.people.manage"]}
        : {organizationId:orgs[0],actorId:actors[1],actorPermissions:role==="manager"?["hris.people.read"]:role==="own"?["hris.self_service.read"]:[]}
      try {
        if (url.searchParams.has("failure")) throw new Error("Synthetic unavailable response")
        const {peopleDirectoryQuerySchema} = require("../people-directory-query")
        const result = await getHrisEmployeeDirectory({...authority, ...peopleDirectoryQuerySchema.parse(Object.fromEntries(url.searchParams)),limit:25})
        res.end(JSON.stringify(result))
      } catch(error) {res.statusCode=(error as any).code==="FORBIDDEN"?403:500;res.end(JSON.stringify({unavailable:true}))}
      return
    }
    const name=url.pathname==="/bundle.js"?"bundle.js":url.pathname==="/style.css"?"style.css":"index.html"
    res.setHeader("Content-Type",name.endsWith("js")?"text/javascript":name.endsWith("css")?"text/css":"text/html")
    res.end(fs.readFileSync(path.join(directory,name)))
  })
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve))
  try {
    const origin=`http://127.0.0.1:${server.address().port}`
    await new Promise<void>((resolve,reject)=>execFile(process.execPath,[path.join(directory,"check.cjs"),origin],{timeout:150000},(error:Error|null,stdout:string,stderr:string)=>error?reject(new Error(stderr||String(error))):resolve()))
    expect(JSON.parse(fs.readFileSync(path.join(directory,"results.json"),"utf8")).results).toHaveLength(6)
  } finally {await new Promise<void>(resolve=>server.close(resolve))}
},180000)

describe("HR-07 real admission denial and recovery", () => {
  let runId: string
  let lineId: string
  let periodId: string
  const key = `${namespace}-emission`
  const now = new Date()
  const input = () => ({organizationId:orgs[0], payrollRunId:runId, actorId:actors[0], actorPermissions:["payroll.payslips.emit"], expectedVersion:3, idempotencyKey:key, now, lastAuthAt:now})
  let oldSwitch: string | undefined
  beforeAll(async () => {
    oldSwitch=process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED
    process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED="true"
    await fixture()
    const contract=await db.payrollContract.create({data:{organizationId:orgs[0],employeeId,contractNumber:randomUUID(),type:"CDI",status:"ACTIVE",effectiveFrom:date,baseSalary:100}})
    const period=await db.payrollPeriod.create({data:{organizationId:orgs[0],name:randomUUID(),countryCode:"GA",periodStart:date,periodEnd:date,payDate:date,frequency:"MONTHLY"}})
    periodId=period.id
    const event=await db.businessEvent.create({data:{organizationId:orgs[0],eventType:"payroll.run.approved",idempotencyKey:randomUUID(),payloadHash:"sha256:synthetic",payload:{synthetic:true},occurredAt:now}})
    const run=await db.payrollRun.create({data:{organizationId:orgs[0],payrollPeriodId:period.id,runNumber:randomUUID(),status:"APPROVED",version:3,
      countryCode:"GA",countryPackVersion:"SYNTHETIC-NOT-APPROVED",countryPackSchemaVersion:"1",countryPackResolutionHash:"sha256:synthetic",countryPackCapabilityStatus:"REQUIRES_EXPERT_REVIEW",ruleSetHash:"sha256:synthetic",calculationHash:"sha256:synthetic",attendanceSnapshotHash:"sha256:synthetic",
      preparedById:actors[1],approvedById:actors[2],approvedAt:now,approvedBusinessEventId:event.id,
      lines:{create:{organizationId:orgs[0],employeeId,contractId:contract.id,calculationSnapshot:{synthetic:true},ruleProvenance:{synthetic:true}}}},include:{lines:true}})
    runId=run.id;lineId=run.lines[0].id
  })
  afterAll(()=>{if(oldSwitch===undefined)delete process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED;else process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED=oldSwitch})
  it("actual emission denies before effects and rolls back its authorization audit", async () => {
    const before=await db.auditLog.count({where:{organizationId:orgs[0]}})
    const eventCount=await db.businessEvent.count({where:{organizationId:orgs[0]}})
    await expect(emitPayrollPayslips(input())).rejects.toThrow("PAYROLL_PRODUCTION_ADMISSION_BLOCKED")
    expect(await db.auditLog.count({where:{organizationId:orgs[0]}})).toBe(before)
    expect(await db.businessEvent.count({where:{organizationId:orgs[0]}})).toBe(eventCount)
    expect(await db.payrollPayslip.count({where:{payrollRunId:runId}})).toBe(0)
    expect(await db.payrollRunTransition.count({where:{payrollRunId:runId}})).toBe(0)
    expect(await db.payrollPaymentBatch.count({where:{payrollRunId:runId}})).toBe(0)
    expect(await db.payrollRun.findUnique({where:{id:runId},select:{status:true,version:true}})).toEqual({status:"APPROVED",version:3})
  })
  it("recovers an exact retained emission despite unavailable rules; changed replay conflicts", async () => {
    // A synthetic retained outcome tests recovery; it is not a newly approved national calculation.
    const event=await db.businessEvent.create({data:{organizationId:orgs[0],eventType:"payroll.payslips.emitted",idempotencyKey:randomUUID(),payloadHash:"sha256:synthetic-retained",payload:{synthetic:true},occurredAt:now}})
    await db.payrollRun.update({where:{id:runId},data:{status:"EMITTED",version:4,emittedBusinessEventId:event.id}})
    const run=await db.payrollRun.findUniqueOrThrow({where:{id:runId}})
    await db.payrollPayslip.create({data:{organizationId:orgs[0],payrollRunId:runId,runLineId:lineId,employeeId,payslipNumber:randomUUID(),status:"EMITTED",countryCode:run.countryCode,countryPackVersion:run.countryPackVersion,countryPackSchemaVersion:run.countryPackSchemaVersion,countryPackResolutionHash:run.countryPackResolutionHash,ruleSetHash:run.ruleSetHash,documentHash:"sha256:synthetic-retained",emittedBusinessEventId:event.id}})
    const payloadHash=`sha256:${hashBusinessPayload({operation:"emitPayrollPayslips",payrollRunId:runId,expectedVersion:3,actorId:actors[0],documentHash:null})}`
    await db.payrollRunTransition.create({data:{organizationId:orgs[0],payrollRunId:runId,sequence:1,fromStatus:"APPROVED",toStatus:"EMITTED",fromVersion:3,toVersion:4,actorId:actors[0],transitionedAt:now,businessEventId:event.id,idempotencyKey:key,payloadHash}})
    for(let retry=0;retry<2;retry++) expect((await emitPayrollPayslips(input())).idempotent).toBe(true)
    await expect(emitPayrollPayslips({...input(),actorPermissions:[]})).rejects.toThrow("not allowed")
    await expect(emitPayrollPayslips({...input(),lastAuthAt:new Date(now.getTime()-3600000)})).rejects.toMatchObject({code:"FRESH_AUTH_REQUIRED"})
    await expect(emitPayrollPayslips({...input(),documentHash:"sha256:changed"})).rejects.toThrow("different payload")
    expect(await db.payrollPayslip.count({where:{payrollRunId:runId}})).toBe(1)
    expect(await db.payrollRunTransition.count({where:{payrollRunId:runId}})).toBe(1)
  })
  it("real worker admission denies before even a fake adapter is called", async () => {
    const declaration=await db.payrollDeclaration.create({data:{organizationId:orgs[0],payrollRunId:runId,authority:"SYNTHETIC",declarationType:"SYNTHETIC",periodStart:date,periodEnd:date,countryCode:"GA",countryPackVersion:"SYNTHETIC",countryPackSchemaVersion:"1",countryPackResolutionHash:"sha256:synthetic"}})
    const execution={declarationId:declaration.id,declarationEvidenceId:"synthetic-evidence",correlationId:"synthetic",status:"LEASED"}
    const adapter={submit:jest.fn()}
    const processExecution=jest.fn().mockImplementation(async ({outcome})=>({execution:{...execution,status:"FAILED",errorCode:outcome.errorCode}}))
    const recordDeclarationEvidence=jest.fn()
    await processPayrollAuthorityAdapterWorkerBatch({organizationId:orgs[0],workerId:actors[0],actorId:actors[0],actorPermissions:["payroll.declarations.manage"],lastAuthAt:new Date()}, {adapter,leaseExecutions:jest.fn().mockResolvedValue({executions:[execution]}),processExecution,recordDeclarationEvidence})
    expect(adapter.submit).not.toHaveBeenCalled()
    expect(recordDeclarationEvidence).not.toHaveBeenCalled()
    expect(processExecution).toHaveBeenCalledWith(expect.objectContaining({outcome:expect.objectContaining({errorCode:"PAYROLL_PRODUCTION_ADMISSION_BLOCKED"})}),db)
  })
})
