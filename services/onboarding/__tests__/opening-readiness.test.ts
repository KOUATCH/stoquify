import { buildOpeningReadiness } from "../opening-readiness"
import type { MasterDataOnboardingDashboard, MasterDataImportSummary } from "../master-data-import.service"
import source from "./fixtures/opening-position-source.json"

const milestone = (state = "NOT_STARTED", target = "ITEM") => ({ target, state, evidenceBatchId: null }) as MasterDataOnboardingDashboard["milestones"][number]
const batch = (status: MasterDataImportSummary["status"], target = "ITEM") => ({ target, status, batchId: "source-batch", sourceFilename: "items.csv", contentHash: "sha256:retained" }) as MasterDataImportSummary

describe("opening readiness guidance", () => {
  it.each([
    ["UPLOADED", "PROPOSED"], ["VALIDATED", "PROPOSED"], ["APPROVED", "REVIEWED"],
    ["COMMITTED", "IMPORTED"], ["COMMITTING", "IN_PROGRESS"], ["BLOCKED", "BLOCKED"],
  ] as const)("distinguishes %s without implying posted opening positions", (status, stage) => {
    const result = buildOpeningReadiness([milestone()], [batch(status)])
    expect(result.masters[0]).toMatchObject({ stage, latestBatchId: "source-batch", sourceFilename: "items.csv", contentHash: "sha256:retained" })
    expect(result.state).toBe("REVIEW_REQUIRED")
    expect(result.requirements.map(step => [step.key, step.state])).toEqual([
      ["STOCK", "NOT_VERIFIED"], ["AR", "UNSUPPORTED"], ["AP", "UNSUPPORTED"], ["LEDGER", "NOT_VERIFIED"], ["TIE_OUT", "NOT_VERIFIED"],
    ])
  })
  it("keeps P03 stock, AR/AP and balanced ledger independent of master import", () => {
    expect(source.stock).toHaveLength(4)
    expect(source.openItems.map(row => row.kind)).toEqual(["AR", "AP"])
    const result = buildOpeningReadiness([milestone("RECONCILED", "CUSTOMER"), milestone("RECONCILED", "SUPPLIER"), milestone("RECONCILED")], [])
    expect(result.masters.every(step => step.stage === "IMPORTED")).toBe(true)
    expect(result.requirements).toHaveLength(5)
    expect(result.state).toBe("REVIEW_REQUIRED")
  })
  it("does not turn partial imports or waived milestones into completion", () => {
    expect(buildOpeningReadiness([milestone("IMPORTED")], []).masters[0].stage).toBe("IN_PROGRESS")
    expect(buildOpeningReadiness([milestone("WAIVED")], [batch("COMMITTED")]).masters[0].stage).toBe("WAIVED")
    expect(buildOpeningReadiness([milestone("WAIVED")], [batch("APPROVED")]).masters[0].latestBatchStage).toBe("REVIEWED")
  })
  it("keeps older evidence distinct from a newer blocked batch", () => {
    const result = buildOpeningReadiness([{ ...milestone("RECONCILED"), evidenceBatchId: "older-import" }], [batch("BLOCKED")])
    expect(result.masters[0]).toMatchObject({ stage: "BLOCKED", evidenceBatchId: "older-import", latestBatchId: "source-batch" })
  })
  it("retains a blocked commit even when its batch is retryable APPROVED", () => {
    expect(buildOpeningReadiness([{ ...milestone("BLOCKED"), evidenceBatchId: "source-batch" }], [batch("APPROVED")]).masters[0].stage).toBe("BLOCKED")
  })
  it("shows only authorized master targets and no row contents", () => {
    const result = buildOpeningReadiness([milestone()], [batch("COMMITTED", "CUSTOMER")])
    expect(result.masters).toEqual([{ target: "ITEM", stage: "NOT_STARTED", evidenceBatchId: null, latestBatchId: null, latestBatchStage: null, sourceFilename: null, contentHash: null }])
    expect(buildOpeningReadiness([], []).masters).toEqual([])
  })
})
