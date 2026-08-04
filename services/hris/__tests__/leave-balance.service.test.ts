import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"

import { postHrisLeaveBalanceEntry } from "../leave-balance.service"

jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

describe("HRIS leave balance ledger", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(resolveHrisPeopleAccessScope as jest.Mock).mockResolvedValue({
      employeeIds: ["emp-1"],
    })
  })

  it("posts an evidence-backed accrual idempotently", async () => {
    const client = {
      hrisLeavePolicy: {
        findFirst: jest.fn().mockResolvedValue({ id: "policy-1" }),
      },
      hrisLeaveBalanceEntry: {
        findUnique: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({
          _sum: { deltaMinutes: 0 },
        }),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: "balance-1",
          ...data,
        })),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    }

    const result = await postHrisLeaveBalanceEntry({
      organizationId: "org-1",
      actorId: "hr-admin-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      leavePolicyId: "policy-1",
      deltaMinutes: 1200,
      effectiveAt: new Date("2026-08-01"),
      entryType: "ACCRUAL",
      sourceType: "MONTHLY_ACCRUAL",
      sourceId: "2026-08",
      sourceEvidenceHash: "sha256:accrual-proof",
      idempotencyKey: "accrual:emp-1:2026-08",
    }, client as never)

    expect(result).toMatchObject({ created: true })
    expect(client.hrisLeaveBalanceEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deltaMinutes: 1200,
        employeeId: "emp-1",
        createdById: "hr-admin-1",
      }),
    })
    expect(client.auditLog.create).toHaveBeenCalled()
  })

  it("rejects an adjustment that would produce a negative balance", async () => {
    const client = {
      hrisLeavePolicy: {
        findFirst: jest.fn().mockResolvedValue({ id: "policy-1" }),
      },
      hrisLeaveBalanceEntry: {
        findUnique: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({
          _sum: { deltaMinutes: 60 },
        }),
        create: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    }

    await expect(postHrisLeaveBalanceEntry({
      organizationId: "org-1",
      actorId: "hr-admin-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      leavePolicyId: "policy-1",
      deltaMinutes: -120,
      effectiveAt: new Date("2026-08-01"),
      entryType: "MANUAL_ADJUSTMENT",
      sourceType: "APPROVED_ADJUSTMENT",
      sourceId: "adjustment-1",
      sourceEvidenceHash: "sha256:adjustment-proof",
      idempotencyKey: "adjustment:emp-1:1",
    }, client as never)).rejects.toThrow("HRIS_LEAVE_BALANCE_NEGATIVE")

    expect(client.hrisLeaveBalanceEntry.create).not.toHaveBeenCalled()
  })
})
