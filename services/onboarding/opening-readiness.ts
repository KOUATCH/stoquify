import type { MasterDataImportSummary, MasterDataOnboardingDashboard } from "./master-data-import.service"

export type OpeningMasterStage = "NOT_STARTED" | "PROPOSED" | "REVIEWED" | "IMPORTED" | "BLOCKED" | "IN_PROGRESS" | "WAIVED"
export type OpeningReadiness = {
  state: "REVIEW_REQUIRED"
  masters: Array<{
    target: MasterDataOnboardingDashboard["milestones"][number]["target"]
    stage: OpeningMasterStage
    evidenceBatchId: string | null
    latestBatchId: string | null
    latestBatchStage: OpeningMasterStage | null
    sourceFilename: string | null
    contentHash: string | null
  }>
  requirements: Array<{
    key: "STOCK" | "AR" | "AP" | "LEDGER" | "TIE_OUT"
    state: "NOT_VERIFIED" | "UNSUPPORTED"
    href: string | null
  }>
}

const batchStages: Record<MasterDataImportSummary["status"], OpeningMasterStage> = {
  UPLOADED: "PROPOSED", VALIDATED: "PROPOSED", APPROVED: "REVIEWED",
  COMMITTING: "IN_PROGRESS", COMMITTED: "IMPORTED", BLOCKED: "BLOCKED",
}

// A read projection of permission-filtered master evidence. No financial completion
// is inferred: there is no source-bound cutover approval/tie-out contract yet.
export function buildOpeningReadiness(
  milestones: MasterDataOnboardingDashboard["milestones"],
  recentBatches: MasterDataImportSummary[],
): OpeningReadiness {
  return {
    state: "REVIEW_REQUIRED",
    masters: milestones.map((milestone) => {
      const latest = recentBatches.find((batch) => batch.target === milestone.target)
      const stage = milestone.state === "WAIVED" ? "WAIVED"
        : milestone.state === "BLOCKED" && (!latest || latest.batchId === milestone.evidenceBatchId) ? "BLOCKED"
        : latest ? batchStages[latest.status]
        : milestone.state === "RECONCILED" ? "IMPORTED"
        : milestone.state === "IMPORTED" ? "IN_PROGRESS"
        : milestone.state === "BLOCKED" ? "BLOCKED" : "NOT_STARTED"
      return {
        target: milestone.target, stage,
        evidenceBatchId: milestone.evidenceBatchId,
        latestBatchId: latest?.batchId ?? null,
        latestBatchStage: latest ? batchStages[latest.status] : null,
        sourceFilename: latest?.sourceFilename ?? null,
        contentHash: latest?.contentHash ?? null,
      }
    }),
    requirements: [
      { key: "STOCK", state: "NOT_VERIFIED", href: "/dashboard/inventory/movements" },
      { key: "AR", state: "UNSUPPORTED", href: "/dashboard/finance/receivables" },
      { key: "AP", state: "UNSUPPORTED", href: "/dashboard/purchases/payables" },
      { key: "LEDGER", state: "NOT_VERIFIED", href: "/dashboard/accounting/journals" },
      { key: "TIE_OUT", state: "NOT_VERIFIED", href: null },
    ],
  }
}
