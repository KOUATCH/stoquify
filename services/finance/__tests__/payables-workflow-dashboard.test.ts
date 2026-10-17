jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/purchasing/ap-control.service", () => ({ getAPWorkbenchData: jest.fn() }))
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getAPWorkbenchData } from "@/services/purchasing/ap-control.service"
import { getPayablesWorkflowDashboard } from "../payables-workflow-dashboard.service"

it("reuses workbench counts in one snapshot, omits private queues, and skips restricted payment counts", async () => {
  const tx = { supplierPayment: { count: jest.fn().mockResolvedValue(4) }, supplierInvoice: { count: jest.fn().mockResolvedValue(2) } }
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(tx))
  ;(getAPWorkbenchData as jest.Mock).mockResolvedValue({ asOf: "2026-10-12T12:00:00Z", counts: { ledgerBlockers: 3 }, queues: { bankDetails: "private" } })
  const report = await getPayablesWorkflowDashboard("org1", { approval: false, execution: false })
  expect(report).toEqual({ checkedAt: "2026-10-12T12:00:00Z", counts: { ledgerBlockers: 3 }, draftInvoices: 2, awaitingApproval: null, awaitingExecution: null })
  expect(tx.supplierPayment.count).not.toHaveBeenCalled()
  expect(getAPWorkbenchData).toHaveBeenCalledWith({ organizationId: "org1", limit: 1 }, tx)
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }))
  const allowed = await getPayablesWorkflowDashboard("org1", { approval: true, execution: true })
  expect(allowed).toMatchObject({ awaitingApproval: 4, awaitingExecution: 4 })
  expect(tx.supplierPayment.count).toHaveBeenNthCalledWith(1, { where: { organizationId: "org1", deletedAt: null, supplier: { organizationId: "org1" }, status: "DRAFT" } })
  expect(tx.supplierPayment.count).toHaveBeenNthCalledWith(2, { where: { organizationId: "org1", deletedAt: null, supplier: { organizationId: "org1" }, status: "APPROVED" } })
})
