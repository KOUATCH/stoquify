import type { Prisma } from "@prisma/client"
import { getModuleStopImpactInTx, getModuleStopOptions } from "../module-stop-policy.service"
import * as operationalDependencies from "../module-operational-dependencies"

jest.mock("server-only", () => ({}))
jest.mock("../module-operational-dependencies", () => {
  const actual = jest.requireActual("../module-operational-dependencies")
  return { ...actual, getModuleOperationalDependencies: jest.fn(actual.getModuleOperationalDependencies) }
})

function fixture() {
  const tx = { stockAdjustment: { count: jest.fn().mockResolvedValue(0) }, stockTransfer: { count: jest.fn().mockResolvedValue(0) }, stockCountSession: { count: jest.fn().mockResolvedValue(0) } }
  const input = { organizationId: "tenant-one", stopNewWorkModules: ["inventory"], previousStoppedModules: [] as string[] }
  return { tx, input, read: () => getModuleStopImpactInTx(tx as unknown as Prisma.TransactionClient, input) }
}
describe("explicit stop impact", () => {
  beforeEach(() => {
    const actual = jest.requireActual<typeof import("../module-operational-dependencies")>("../module-operational-dependencies")
    ;(operationalDependencies.getModuleOperationalDependencies as jest.Mock).mockImplementation(actual.getModuleOperationalDependencies)
  })
  it("supports verified inventory operations while leaving unresolved continuation unavailable", () => {
    const options = getModuleStopOptions()
    expect(options.find(item => item.moduleSlug === "inventory")).toMatchObject({ supported: true, newWork: ["inventory_adjustments", "inventory_transfers", "inventory_counts"] })
    expect(options.find(item => item.moduleSlug === "accounting")).toMatchObject({ supported: true, newWork: ["manual_journals"], continuation: ["existing_accounting_work", "mandatory_ledger_effects"] })
    for (const slug of ["pos", "sales", "payment_reconciliation", "settings"]) expect(options.find(item => item.moduleSlug === slug)?.supported).toBe(false)
  })
  it("scopes accounting stop impacts to manual drafts without stopping reconciliation or close", async () => {
    const tx = { journalEntry: { count: jest.fn().mockResolvedValue(2) } }
    const result = await getModuleStopImpactInTx(tx as unknown as Prisma.TransactionClient, { organizationId: "tenant-one", stopNewWorkModules: ["accounting"], previousStoppedModules: [] })
    expect(result).toMatchObject({ canStop: true, canRetain: false })
    expect(result.impacts[0]).toMatchObject({ newWork: ["manual_journals"], dependentModules: [], pendingCount: 2 })
    expect(tx.journalEntry.count).toHaveBeenCalledWith({ where: { organizationId: "tenant-one", status: "DRAFT", OR: [{ sourceType: "MANUAL" }, { sourceType: null }] } })
  })
  it("binds operational dependency meaning into the reviewed policy hash", async () => {
    const { read } = fixture()
    const original = await read()
    const spy = jest.spyOn(operationalDependencies, "getModuleOperationalDependencies").mockReturnValue([])
    try {
      expect((await read()).policyHash).not.toBe(original.policyHash)
    } finally {
      spy.mockRestore()
    }
  })
  it("keeps stopping new work distinct from draining existing obligations", async () => {
    const { tx, read } = fixture()
    tx.stockTransfer.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3)
    const result = await read()
    expect(result).toMatchObject({ canStop: true, canRetain: false, newlyStopped: ["inventory"], resumed: [] })
    expect(result.impacts[0].pendingCount).toBe(5)
    expect(result.impacts[0].observations).toContainEqual({ code: "inventory_transfers_open", count: 3, kind: "obligation" })
    expect(result.impacts[0].dependentModules).not.toContain("purchasing")
    for (const delegate of Object.values(tx)) for (const call of delegate.count.mock.calls) expect(call[0].where.organizationId).toBe("tenant-one")
  })
  it("records a drained retained state only when every observation is zero", async () => {
    const { read } = fixture()
    await expect(read()).resolves.toMatchObject({ canStop: true, canRetain: true })
  })
  it("binds changing observations separately from stable policy meaning", async () => {
    const { tx, read } = fixture()
    const initial = await read()
    tx.stockCountSession.count.mockResolvedValue(1)
    const changed = await read()
    expect(changed.policyHash).toBe(initial.policyHash)
    expect(changed.evidenceHash).not.toBe(initial.evidenceHash)
  })
  it("marks reactivation explicitly for fresh readiness checks", async () => {
    const { input, read } = fixture()
    input.previousStoppedModules = ["inventory"]
    input.stopNewWorkModules = []
    await expect(read()).resolves.toMatchObject({ resumed: ["inventory"], newlyStopped: [], stopNewWorkModules: [] })
  })
  it.each(["settings", "unknown-capability"])("rejects an invalid/core stop without throwing a dependency traversal error: %s", async slug => {
    const { input, tx, read } = fixture()
    input.stopNewWorkModules = [slug]
    await expect(read()).resolves.toMatchObject({ canStop: false, canRetain: false })
    expect(tx.stockAdjustment.count).not.toHaveBeenCalled()
  })
  it("propagates failed observations instead of reporting zero obligations", async () => {
    const { tx, read } = fixture()
    tx.stockAdjustment.count.mockRejectedValue(new Error("ledger unavailable"))
    await expect(read()).rejects.toThrow("ledger unavailable")
  })
})
