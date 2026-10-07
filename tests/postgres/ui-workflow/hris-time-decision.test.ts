import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"

jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  if (process.env.RUN_UI_WORKFLOW_POSTGRES !== "1") return { db: {} }
  const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
  const { PrismaClient } = jest.requireActual("@prisma/client")
  return { db: new PrismaClient({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } }) }
})
// Scope/permission behavior is covered by the ordinary service suite. All
// decision, event, outbox, balance and audit persistence below uses PostgreSQL.
jest.mock("@/services/hris/org.service", () => ({ resolveHrisPeopleAccessScope: jest.fn() }))
import { db } from "@/prisma/db"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import { decideOperationalTimeRequest } from "@/services/hris/operational-time.service"

const suite = process.env.RUN_UI_WORKFLOW_POSTGRES === "1" ? describe : describe.skip

function latch() {
  let open!: () => void
  const ready = new Promise<void>(resolve => { open = resolve })
  return { ready, open }
}

async function fixture() {
  const suffix = randomUUID()
  const organizationId = `hris-claim-${suffix}`
  await db.organization.create({ data: { id: organizationId, name: "Synthetic HR decision race", slug: organizationId, currency: "XAF" } })
  const user = await db.user.create({ data: { organizationId, email: `${suffix}@example.invalid` } })
  const secondUser = await db.user.create({ data: { organizationId, email: `second-${suffix}@example.invalid` } })
  const employee = await db.payrollEmployee.create({ data: { organizationId, employeeNumber: "SYNTHETIC-1", displayName: "Synthetic employee", hireDate: new Date("2026-01-01"), countryCode: "CM" } })
  const policy = await db.hrisLeavePolicy.create({ data: { organizationId, code: "TEST", name: "Illustrative test policy", countryCode: "CM", annualEntitlementMinutes: 960, accrualRule: {}, effectiveFrom: new Date("2026-01-01"), preparedById: user.id, sourceHash: "sha256:synthetic-policy" } })
  const request = await db.hrisTimeRequest.create({ data: { organizationId, employeeId: employee.id, leavePolicyId: policy.id, type: "LEAVE", periodStart: new Date("2026-10-08"), periodEnd: new Date("2026-10-09"), requestedMinutes: 480, reason: "Synthetic leave request", requestedById: `synthetic-requester-${suffix}`, requestEvidenceHash: "sha256:synthetic-request", sourceHash: "sha256:synthetic-source", idempotencyKey: `request-${suffix}` } })
  await db.hrisLeaveBalanceEntry.create({ data: { organizationId, employeeId: employee.id, leavePolicyId: policy.id, deltaMinutes: 960, effectiveAt: new Date("2026-01-01"), entryType: "SYNTHETIC_OPENING", sourceType: "TEST", sourceId: suffix, sourceHash: "sha256:synthetic-opening", idempotencyKey: suffix, createdById: user.id } })
  return { organizationId, employeeId: employee.id, actorId: user.id, secondActorId: secondUser.id, requestId: request.id,
    actorPermissions: ["hris.people.manage"], decisionReason: "Reviewed synthetic evidence", approvalEvidenceHash: "sha256:synthetic-approval" }
}

type Fixture = Awaited<ReturnType<typeof fixture>>

async function effects(f: Fixture) {
  const where = { organizationId: f.organizationId }
  return {
    request: await db.hrisTimeRequest.findUniqueOrThrow({ where: { id: f.requestId } }),
    events: await db.businessEvent.findMany({ where, include: { outboxMessages: true } }),
    debits: await db.hrisLeaveBalanceEntry.findMany({ where: { ...where, sourceType: "HRIS_TIME_REQUEST", sourceId: f.requestId } }),
    audits: await db.auditLog.findMany({ where: { ...where, entityId: f.requestId } }),
  }
}

suite("HR time decisions on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const identity = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    expect(identity[0].name).toBe(process.env.UI_WORKFLOW_POSTGRES_DATABASE)
    jest.mocked(resolveHrisPeopleAccessScope).mockResolvedValue({} as never)
  })
  afterAll(async () => { await db.$disconnect() })

  it.each([
    ["APPROVE", "REJECT"],
    ["REJECT", "APPROVE"],
    ["APPROVE", "APPROVE"],
  ] as const)("preserves %s when a competing stale %s follows", async (winner, loser) => {
    const f = await fixture()
    const read = [latch(), latch()]
    const release = [latch(), latch()]
    // Pause both real SELECTs after they observe REQUESTED, then commit the
    // chosen winner before releasing the stale decision. No database mock.
    const run = (index: number, decision: "APPROVE" | "REJECT") => db.$transaction(async tx => {
      const scheduled = {
        ...tx,
        hrisTimeRequest: {
          ...tx.hrisTimeRequest,
          findFirst: async (args: Prisma.HrisTimeRequestFindFirstArgs) => {
            const request = await tx.hrisTimeRequest.findFirst(args)
            read[index].open()
            await release[index].ready
            return request
          },
        },
      }
      return decideOperationalTimeRequest({ ...f, actorId: index === 0 ? f.actorId : f.secondActorId, decision }, scheduled as Prisma.TransactionClient)
    }, { timeout: 20000 }).then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }))

    const first = run(0, winner), second = run(1, loser)
    try {
      await Promise.all(read.map(signal => signal.ready))
      release[0].open()
      expect((await first).ok).toBe(true)
      release[1].open()
      expect(await second).toMatchObject({ ok: false, error: { code: "CONFLICT" } })
    } finally {
      release.forEach(signal => signal.open())
      await Promise.all([first, second])
    }
    const actual = await effects(f)
    expect(actual.request.status).toBe(winner === "APPROVE" ? "APPROVED" : "REJECTED")
    expect(actual.request.reviewedById).toBe(f.actorId)
    expect(actual.audits).toHaveLength(1)
    expect(actual.events).toHaveLength(winner === "APPROVE" ? 1 : 0)
    expect(actual.debits).toHaveLength(winner === "APPROVE" ? 1 : 0)
    if (winner === "APPROVE") {
      expect(actual.events[0].status).toBe("APPLIED")
      expect(actual.events[0].outboxMessages).toHaveLength(1)
      expect(actual.debits[0].deltaMinutes).toBe(-480)
      expect(actual.request.decisionBusinessEventId).toBe(actual.events[0].id)
    }
  })

  it("rolls back the claim, event, outbox and debit when the final audit fails", async () => {
    const f = await fixture()
    await expect(db.$transaction(tx => decideOperationalTimeRequest({ ...f, decision: "APPROVE" }, {
      ...tx,
      auditLog: { ...tx.auditLog, create: async () => { throw new Error("synthetic audit failure") } },
    } as Prisma.TransactionClient))).rejects.toThrow("synthetic audit failure")

    const actual = await effects(f)
    expect(actual.request.status).toBe("REQUESTED")
    expect(actual.request.reviewedById).toBeNull()
    expect(actual.request.decisionBusinessEventId).toBeNull()
    expect(actual.events).toHaveLength(0)
    expect(actual.debits).toHaveLength(0)
    expect(actual.audits).toHaveLength(0)
    expect(await db.businessEventOutbox.count({ where: { organizationId: f.organizationId } })).toBe(0)
  })
})
