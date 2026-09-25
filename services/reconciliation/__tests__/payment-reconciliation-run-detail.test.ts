jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getReconciliationRunDetail } from "../payment-reconciliation-certification.service"

const tx = {
  reconciliationRun: { findFirst: jest.fn() },
  providerEvent: { count: jest.fn() }, statementLine: { count: jest.fn() },
  matchRecord: { findMany: jest.fn(), count: jest.fn() },
  paymentException: { findMany: jest.fn(), count: jest.fn() },
  suspenseItem: { findMany: jest.fn(), count: jest.fn() },
}
const now = new Date("2026-09-12T00:00:00Z")
beforeEach(() => {
  jest.resetAllMocks()
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
  tx.reconciliationRun.findFirst.mockResolvedValue({ id: "run", organizationId: "org", providerAccountId: "provider", paymentRailId: "rail", businessDate: now,
    periodStart: now, periodEnd: new Date("2026-09-13T00:00:00Z"), status: "NEEDS_REVIEW", signedAt: null,
    totalInternalAmount: new Prisma.Decimal(1), totalExternalAmount: new Prisma.Decimal(1), matchedAmount: new Prisma.Decimal(0), suspenseAmount: new Prisma.Decimal(1),
    matchCount: 0, exceptionCount: 1, providerAccount: { id: "provider", displayName: "Owned provider", providerCode: "OWNED", currencyCode: "XAF" }, paymentRail: { name: "Owned rail", type: "BANK" } })
  for (const model of [tx.providerEvent, tx.statementLine, tx.matchRecord, tx.paymentException, tx.suspenseItem]) model.count.mockResolvedValue(0)
  for (const model of [tx.matchRecord, tx.paymentException, tx.suspenseItem]) model.findMany.mockResolvedValue([])
})

it("counts unresolved records outside the bounded detail samples", async () => {
  tx.matchRecord.findMany.mockResolvedValue(Array.from({ length: 100 }, (_, i) => ({ id: "m" + i, confidence: new Prisma.Decimal(1) })))
  tx.paymentException.findMany.mockResolvedValue(Array.from({ length: 100 }, (_, i) => ({ id: "e" + i, status: "RESOLVED" })))
  tx.suspenseItem.findMany.mockResolvedValue(Array.from({ length: 100 }, (_, i) => ({ id: "s" + i, status: "RESOLVED", amount: new Prisma.Decimal(1) })))
  tx.matchRecord.count.mockResolvedValue(145)
  tx.paymentException.count.mockImplementation(({ where }) => Promise.resolve(where.status ? 9 : 109))
  tx.suspenseItem.count.mockImplementation(({ where }) => Promise.resolve(where.status ? 3 : 103))
  const detail = await getReconciliationRunDetail("org", "run")
  expect(detail.evidence).toMatchObject({ matchRecordCount: 145, openExceptionCount: 9, openSuspenseCount: 3 })
  expect(detail.recordCoverage).toEqual({ limitPerCollection: 100, matchRecords: { returned: 100, total: 145, truncated: true },
    exceptions: { returned: 100, total: 109, truncated: true }, suspenseItems: { returned: 100, total: 103, truncated: true } })
  expect(detail.exceptions.every(item => item.status === "RESOLVED")).toBe(true)
})

it("reads counts, records and run from one tenant-scoped repeatable snapshot", async () => {
  await getReconciliationRunDetail("org", "run")
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  expect(tx.reconciliationRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "run", organizationId: "org",
    providerAccount: { organizationId: "org" }, paymentRail: { organizationId: "org" }, OR: [{ runById: null }, { runBy: { organizationId: "org" } }] } }))
  for (const model of [tx.matchRecord, tx.paymentException, tx.suspenseItem]) {
    for (const [query] of model.count.mock.calls) expect(query.where).toMatchObject({ organizationId: "org", reconciliationRunId: "run" })
    expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", reconciliationRunId: "run" }, take: 100, orderBy: expect.arrayContaining([{ id: "asc" }]) }))
  }
  expect(tx.paymentException.count).toHaveBeenCalledWith({ where: { organizationId: "org", reconciliationRunId: "run", status: { in: ["OPEN", "ASSIGNED", "ACKNOWLEDGED", "ESCALATED", "RESOLUTION_PROPOSED", "REOPENED"] } } })
  expect(tx.suspenseItem.count).toHaveBeenCalledWith({ where: { organizationId: "org", reconciliationRunId: "run", status: { in: ["OPEN", "ASSIGNED", "IN_REVIEW", "POSTED_TO_SUSPENSE", "RESOLUTION_PROPOSED", "REOPENED"] } } })
})

it("reports actual empty results without claiming truncation", async () => {
  const detail = await getReconciliationRunDetail("org", "run")
  expect(detail.evidence.openExceptionCount).toBe(0)
  expect(detail.recordCoverage.exceptions).toEqual({ returned: 0, total: 0, truncated: false })
})

it.each(["matchRecord", "paymentException", "suspenseItem"] as const)("propagates failed %s counts instead of reporting zero", async model => {
  tx[model].count.mockRejectedValue(new Error("Database unavailable"))
  await expect(getReconciliationRunDetail("org", "run")).rejects.toThrow("Database unavailable")
})

it("does not enumerate evidence for a missing or foreign run", async () => {
  tx.reconciliationRun.findFirst.mockResolvedValue(null)
  await expect(getReconciliationRunDetail("other-org", "run")).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.paymentException.count).not.toHaveBeenCalled()
  expect(tx.suspenseItem.findMany).not.toHaveBeenCalled()
})
