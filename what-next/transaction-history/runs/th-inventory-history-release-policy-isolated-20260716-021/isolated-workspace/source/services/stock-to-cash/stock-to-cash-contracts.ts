import type {
  BICommandBrief,
  BIFlowStep,
  BIKpiCard,
  BIProofDrawerSubject,
  BIRiskRank,
} from "@/services/bi/bi-contracts"

export type StockToCashFlowSummary = {
  stockCashExposure: number
  pendingPurchaseOrderCount: number
  quantityOnOrder: number
  completedSalesRevenue: number
  cashCollected: number
  unresolvedSuspenseAmount: number
  sourceLinkCount: number
  blockedStepCount: number
  unavailableProofCount: number
}

export type StockToCashFlowData = {
  organizationId: string
  organizationName: string | null
  generatedAt: string
  periodStart: string
  periodEnd: string
  currency: string
  commandBrief: BICommandBrief
  cards: BIKpiCard[]
  flowSteps: BIFlowStep[]
  risks: BIRiskRank[]
  proofSubjects: BIProofDrawerSubject[]
  summary: StockToCashFlowSummary
}
