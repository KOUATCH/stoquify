import { HrisTimeRequestStatus, HrisTimeRequestType } from "@prisma/client"

import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import { recordBusinessEventInTx, markBusinessEventAppliedInTx } from "@/services/events/business-event.service"
import { decideOperationalTimeRequest } from "../operational-time.service"

jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/hris/org.service", () => ({ resolveHrisPeopleAccessScope: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({
  recordBusinessEventInTx: jest.fn(),
  markBusinessEventAppliedInTx: jest.fn(),
}))

const command = {
  organizationId: "org-1",
  employeeId: "employee-1",
  actorId: "reviewer-1",
  actorPermissions: ["hris.people.manage"],
  requestId: "request-1",
  decision: "APPROVE" as const,
  decisionReason: "Reviewed synthetic request",
  approvalEvidenceHash: "sha256:synthetic-approval",
}

function fixture() {
  const request = {
    id: command.requestId,
    organizationId: command.organizationId,
    employeeId: command.employeeId,
    requestedById: "requester-1",
    leavePolicyId: "policy-1",
    type: HrisTimeRequestType.LEAVE,
    status: HrisTimeRequestStatus.REQUESTED,
    requestedMinutes: 480,
    periodStart: new Date("2026-10-08T00:00:00Z"),
    periodEnd: new Date("2026-10-08T08:00:00Z"),
    requestEvidenceHash: "sha256:synthetic-request",
    sourceHash: "sha256:synthetic-source",
  }
  return {
    hrisTimeRequest: {
      findFirst: jest.fn().mockResolvedValue(request),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockImplementation(({ data }) => ({ ...request, ...data })),
    },
    hrisLeaveBalanceEntry: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { deltaMinutes: 960 } }),
      create: jest.fn().mockResolvedValue({ id: "debit-1" }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
  }
}

describe("time-request decision ownership (unit contract; PostgreSQL races verified separately)", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(resolveHrisPeopleAccessScope).mockResolvedValue({
      organizationId: command.organizationId,
      authority: { kind: "REPORTING_RELATIONSHIP" },
      managedLocations: [],
      employeeIds: [command.employeeId],
      limitations: [],
    } as never)
    jest.mocked(recordBusinessEventInTx).mockResolvedValue({ event: { id: "event-1" }, created: true } as never)
  })

  it.each(["APPROVE", "REJECT"] as const)("rejects a stale %s without any event, debit or audit", async decision => {
    const tx = fixture()
    tx.hrisTimeRequest.updateMany.mockResolvedValue({ count: 0 })

    await expect(decideOperationalTimeRequest({ ...command, decision }, tx as never))
      .rejects.toMatchObject({ code: "CONFLICT" })

    expect(tx.hrisTimeRequest.update).not.toHaveBeenCalled()
    expect(tx.hrisLeaveBalanceEntry.aggregate).not.toHaveBeenCalled()
    expect(tx.hrisLeaveBalanceEntry.create).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
    expect(recordBusinessEventInTx).not.toHaveBeenCalled()
    expect(markBusinessEventAppliedInTx).not.toHaveBeenCalled()
  })

  it.each(["APPROVE", "REJECT"] as const)("claims only the scoped pending request for %s", async decision => {
    const tx = fixture()
    const result = await decideOperationalTimeRequest({ ...command, decision }, tx as never)

    expect(tx.hrisTimeRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: command.requestId,
        organizationId: command.organizationId,
        employeeId: command.employeeId,
        status: HrisTimeRequestStatus.REQUESTED,
      },
      data: { status: decision === "APPROVE" ? HrisTimeRequestStatus.APPROVED : HrisTimeRequestStatus.REJECTED },
    })
    expect(tx.hrisTimeRequest.updateMany.mock.invocationCallOrder[0])
      .toBeLessThan(tx.hrisTimeRequest.update.mock.invocationCallOrder[0])
    expect(result.status).toBe(decision === "APPROVE" ? "APPROVED" : "REJECTED")
    if (decision === "APPROVE") {
      expect(tx.hrisTimeRequest.updateMany.mock.invocationCallOrder[0])
        .toBeLessThan(tx.hrisLeaveBalanceEntry.aggregate.mock.invocationCallOrder[0])
      expect(tx.hrisLeaveBalanceEntry.create).toHaveBeenCalledTimes(1)
    } else {
      expect(recordBusinessEventInTx).not.toHaveBeenCalled()
      expect(tx.hrisLeaveBalanceEntry.create).not.toHaveBeenCalled()
    }
  })

  it("propagates a downstream failure out of the owning transaction", async () => {
    const tx = fixture()
    const persistenceFailure = new Error("synthetic event failure")
    jest.mocked(recordBusinessEventInTx).mockRejectedValue(persistenceFailure)
    const root = { $transaction: jest.fn(async operation => operation(tx)) }

    await expect(decideOperationalTimeRequest(command, root as never)).rejects.toBe(persistenceFailure)
    expect(root.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.hrisTimeRequest.updateMany).toHaveBeenCalledTimes(1)
    expect(tx.hrisLeaveBalanceEntry.create).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
    expect(markBusinessEventAppliedInTx).not.toHaveBeenCalled()
  })
})
