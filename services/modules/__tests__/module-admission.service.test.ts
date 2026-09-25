import { assertModuleNewWorkInTx, lockModuleAdmissionPolicyInTx, moduleNewWorkBlockers } from "../module-admission.service"
import type { Prisma } from "@prisma/client"
import { getModuleCatalogEntry } from "../module-catalog.service"

jest.mock("server-only", () => ({}))

describe("business new-work admission", () => {
  it("does not equate workspace omission with a revoked right", () => {
    expect(moduleNewWorkBlockers("sales", [])).toEqual([])
  })
  it("stops the selected capability and dependent new order creation", () => {
    expect(moduleNewWorkBlockers("sales", ["sales"])).toEqual(["sales"])
    expect(moduleNewWorkBlockers("pos", ["sales"])).toEqual(["sales"])
    expect(moduleNewWorkBlockers("pos", ["pos", "sales"])).toEqual(["pos", "sales"])
  })
  it("keeps mandatory ledger controls available when new manual journals stop", () => {
    expect(moduleNewWorkBlockers("accounting", ["accounting"])).toEqual(["accounting"])
    expect(moduleNewWorkBlockers("payment_reconciliation", ["accounting"])).toEqual([])
    expect(moduleNewWorkBlockers("close_assurance", ["accounting"])).toEqual([])
    expect(moduleNewWorkBlockers("payment_reconciliation", ["payment_reconciliation"])).toEqual(["payment_reconciliation"])
    for (const slug of ["payment_reconciliation", "close_assurance"] as const) {
      expect(getModuleCatalogEntry(slug)?.dependencies).toContainEqual(expect.objectContaining({ dependsOnSlug: "accounting", dependencyType: "required" }))
    }
  })
  it("does not convert a recommended connection into an admission dependency", () => {
    expect(moduleNewWorkBlockers("purchasing", ["inventory"])).toEqual([])
  })
  it("rejects corrupt and core stop policies", () => {
    expect(() => moduleNewWorkBlockers("sales", ["not-a-module"])).toThrow(/reconciliation/)
    expect(() => moduleNewWorkBlockers("sales", ["settings"])).toThrow(/reconciliation/)
  })
  const txFor = (policies: unknown[] = []) => ({ $queryRaw: jest.fn().mockResolvedValueOnce([{ id: "tenant-one" }]).mockResolvedValueOnce(policies) })
  const input = { organizationId: "tenant-one", moduleSlug: "sales" as const, operation: "sales.order.create" }

  it("locks the owning organization before checking managed admission", async () => {
    const tx = txFor([{ newWorkStoppedModules: [] }])
    await expect(assertModuleNewWorkInTx(tx as unknown as Prisma.TransactionClient, input)).resolves.toBeUndefined()
    expect(tx.$queryRaw.mock.calls[0][0].sql).toContain("FOR SHARE")
    expect(tx.$queryRaw.mock.calls[0][0].values).toContain("tenant-one")
    expect(tx.$queryRaw.mock.calls[1][0].sql).toContain("tenant_module_configurations")
  })
  it("preserves unconfigured legacy admission while still locking its tenant", async () => {
    const tx = txFor()
    await expect(assertModuleNewWorkInTx(tx as unknown as Prisma.TransactionClient, input)).resolves.toBeUndefined()
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2)
  })
  it("returns a safe operation-specific denial without granting continuation", async () => {
    const tx = txFor([{ newWorkStoppedModules: ["sales"] }])
    await expect(assertModuleNewWorkInTx(tx as unknown as Prisma.TransactionClient, input)).rejects.toMatchObject({
      code: "FORBIDDEN", status: 403, metadata: { reason: "MODULE_NEW_WORK_STOPPED", moduleSlug: "sales", blockedBy: ["sales"] },
    })
  })
  it("rejects missing/inactive tenants before reading a policy", async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]) }
    await expect(assertModuleNewWorkInTx(tx as unknown as Prisma.TransactionClient, input)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1)
  })
  it("does not turn a failed policy read into legacy access", async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValueOnce([{ id: "tenant-one" }]).mockRejectedValueOnce(new Error("database unavailable")) }
    await expect(assertModuleNewWorkInTx(tx as unknown as Prisma.TransactionClient, input)).rejects.toThrow("database unavailable")
  })
  it("gives configuration writers an exclusive lock on the same tenant", async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValue([{ id: "tenant-one" }]) }
    await lockModuleAdmissionPolicyInTx(tx as unknown as Prisma.TransactionClient, "tenant-one")
    expect(tx.$queryRaw.mock.calls[0][0].sql).toContain("FOR UPDATE")
    expect(tx.$queryRaw.mock.calls[0][0].values).toContain("tenant-one")
  })
})
