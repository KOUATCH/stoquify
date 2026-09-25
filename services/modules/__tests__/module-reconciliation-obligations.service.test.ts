import type { Prisma } from "@prisma/client"
import { getModuleReconciliationObligations } from "../module-reconciliation-obligations.service"

describe("reconciliation obligation read failures", () => {
  it("rejects missing tenant context before querying", async () => {
    const query = jest.fn()
    await expect(getModuleReconciliationObligations({ $queryRaw: query } as unknown as Prisma.TransactionClient, " "))
      .rejects.toThrow("Organization context is required")
    expect(query).not.toHaveBeenCalled()
  })

  it("propagates a query failure instead of reporting no obligations", async () => {
    const failure = new Error("Database unavailable")
    await expect(getModuleReconciliationObligations({
      $queryRaw: jest.fn().mockRejectedValue(failure),
    } as unknown as Prisma.TransactionClient, "tenant-one")).rejects.toBe(failure)
  })

  it("rejects an incomplete observation result instead of filling missing counts with zero", async () => {
    await expect(getModuleReconciliationObligations({
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as unknown as Prisma.TransactionClient, "tenant-one")).rejects.toThrow("observations are incomplete")
  })
})
