import {
  nextModuleNormalizationContracts,
  tableScaleContract,
  validateNextPhaseContracts,
} from "../next-phase-contracts"

describe("table harmonization NEXT contracts", () => {
  it("defines one gated normalization contract for each X1-X4 module wave", () => {
    expect(nextModuleNormalizationContracts.map((contract) => contract.wave)).toEqual(["X1", "X2", "X3", "X4"])
    expect(nextModuleNormalizationContracts.every((contract) => contract.behaviorContract.preserveServiceOwnedTruth)).toBe(true)
    expect(nextModuleNormalizationContracts.every((contract) => contract.behaviorContract.preserveTenantIsolation)).toBe(true)
  })

  it("keeps finance statement controls and payroll privacy explicit", () => {
    const finance = nextModuleNormalizationContracts.find((contract) => contract.wave === "X1")!
    const payroll = nextModuleNormalizationContracts.find((contract) => contract.wave === "X2")!
    expect(finance.behaviorContract.requirements).toEqual(expect.arrayContaining([
      "freeze identity columns before numeric columns",
      "show currency and period/entity context with totals",
      "keep editable journal drafts separate from posted journals and evidence",
    ]))
    expect(payroll.behaviorContract.requirements).toEqual(expect.arrayContaining([
      "payroll access must not unlock HRIS people truth",
      "support own-record, manager-scope, payroll-admin, and auditor policies",
    ]))
  })

  it("keeps POS operational interactions and offline replay outside table replacement", () => {
    const pos = nextModuleNormalizationContracts.find((contract) => contract.wave === "X3")!
    expect(pos.behaviorContract.requirements).toEqual(expect.arrayContaining([
      "keep the core sale interaction out of table migration scope",
      "preserve idempotency for queued actions",
    ]))
  })

  it("defines all scale tiers and limits virtualization to one measured desktop trial", () => {
    expect(tableScaleContract.datasetTiers.map((tier) => tier.matchingRows)).toEqual([100, 1_000, 10_000, 100_000])
    expect(tableScaleContract.virtualizationTrial.surfaceCount).toBe(1)
    expect(tableScaleContract.virtualizationTrial.surfaceId).toBe("accounting.trial-balance")
    expect(tableScaleContract.virtualizationTrial.surfaceClass).toBe("analytical-desktop")
    expect(tableScaleContract.budgets.every((budget) => budget.status === "proposed-not-measured")).toBe(true)
    expect(tableScaleContract.notAnSla).toBe(true)
  })

  it("rejects unsafe contract expansion", () => {
    expect(() => validateNextPhaseContracts(
      nextModuleNormalizationContracts,
      { ...tableScaleContract, notAnSla: false },
    )).toThrow("proposed and non-SLA")
  })
})
