import { Prisma } from "@prisma/client"
import { assertStockAdjustmentAdmissionInTx } from "../module-inventory-continuation.service"
import { createStockAdjustmentInputSchema } from "@/services/inventory/inventory-event.schemas"

jest.mock("server-only", () => ({}))

const before = new Date("2026-09-01T10:00:00Z")
const cutoff = "2026-09-05T10:00:00Z"
function arrange() {
  const count = { id: "count-1", organizationId: "org-1", createdAt: before, status: "SUBMITTED", locationId: "loc-1", snapshotHash: "snapshot", countSheetHash: "sheet", postedAdjustmentId: null, lines: [
    { id: "line-1", itemId: "item-1", systemQuantity: new Prisma.Decimal(10), countedQuantity: new Prisma.Decimal(8), varianceQuantity: new Prisma.Decimal(-2), unitCost: new Prisma.Decimal(100), evidenceHash: "line-evidence" },
  ] }
  const policy = { newWorkStoppedModules: ["inventory"], newWorkStoppedAt: { inventory: cutoff } }
  const tx = {
    $queryRaw: jest.fn().mockImplementation(async (query: { sql: string }) => query.sql.includes('"organizations"') ? [{ id: "org-1" }] : query.sql.includes('"stock_count_sessions"') ? [{ id: "count-1" }] : [policy]),
    stockCountSession: { findFirst: jest.fn().mockResolvedValue(count) },
    stockAdjustment: { findFirst: jest.fn().mockResolvedValue(null) },
  }
  const input = createStockAdjustmentInputSchema.parse({ organizationId: "org-1", locationId: "loc-1", createdById: "maker-1", type: "PHYSICAL_COUNT", reason: "Existing count variance", sourceCountSessionId: "count-1", documentHash: "sheet", evidenceHash: "sheet", lines: [
    { itemId: "item-1", stockCountLineId: "line-1", systemQuantity: 10, actualQuantity: 8, adjustedQuantity: -2, unitCost: 100, evidenceHash: "line-evidence" },
  ] })
  const run = () => assertStockAdjustmentAdmissionInTx(tx as unknown as Prisma.TransactionClient, input)
  return { count, policy, tx, input, run }
}

describe("inventory admission and retained count continuation", () => {
  it("preserves unconfigured new work without requiring count evidence", async () => {
    const { policy, input, tx, run } = arrange()
    policy.newWorkStoppedModules = []
    delete input.sourceCountSessionId
    await expect(run()).resolves.toBeUndefined()
    expect(tx.stockCountSession.findFirst).not.toHaveBeenCalled()
  })
  it("allows only the exact frozen lines from a tenant-owned count accepted before stopping", async () => {
    const { tx, run } = arrange()
    await expect(run()).resolves.toBeUndefined()
    expect(tx.$queryRaw.mock.calls[2][0].sql).toContain("FOR UPDATE")
    expect(tx.$queryRaw.mock.calls[2][0].values).toEqual(["count-1", "org-1"])
    expect(tx.stockCountSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "count-1", organizationId: "org-1" } }))
  })
  it.each(["source", "hash", "quantity", "item", "cost", "line", "duplicate line", "type"])("rejects forged %s continuation evidence", async field => {
    const { input, run } = arrange()
    if (field === "source") delete input.sourceCountSessionId
    if (field === "hash") input.documentHash = "forged"
    if (field === "quantity") input.lines[0].adjustedQuantity = "-20"
    if (field === "item") input.lines[0].itemId = "foreign-item"
    if (field === "cost") input.lines[0].unitCost = "1000"
    if (field === "line") input.lines[0].stockCountLineId = "foreign-line"
    if (field === "duplicate line") input.lines.push({ ...input.lines[0] })
    if (field === "type") input.type = "CORRECTION"
    await expect(run()).rejects.toMatchObject({ metadata: { reason: "MODULE_NEW_WORK_STOPPED" } })
  })
  it.each(["missing", "after stop", "unsubmitted", "missing cutoff"])("rejects %s recorded count", async state => {
    const { tx, count, policy, run } = arrange()
    if (state === "missing") tx.stockCountSession.findFirst.mockResolvedValue(null)
    if (state === "after stop") count.createdAt = new Date(cutoff)
    if (state === "unsubmitted") count.status = "FROZEN"
    if (state === "missing cutoff") policy.newWorkStoppedAt.inventory = ""
    await expect(run()).rejects.toMatchObject({ metadata: { reason: "MODULE_NEW_WORK_STOPPED" } })
  })
  it("reuses an existing count adjustment instead of creating duplicate effects", async () => {
    const { tx, run } = arrange()
    tx.stockAdjustment.findFirst.mockResolvedValue({ id: "existing-adjustment" })
    await expect(run()).rejects.toMatchObject({ code: "CONFLICT" })
  })
  it("propagates failed evidence reads", async () => {
    const { tx, run } = arrange()
    tx.stockCountSession.findFirst.mockRejectedValue(new Error("read failed"))
    await expect(run()).rejects.toThrow("read failed")
  })
})
