import type {
  BIActionLink,
  BIBlocker,
  BIChangeEvent,
  BICommandBrief,
  BIFreshness,
  BIKpiCard,
  BIKpiState,
  BIRedaction,
  BIUnassessedObservation,
  BISeverity,
  BITrustState,
} from "@/services/bi/bi-contracts"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"

export type BusinessPulseActionItem = {
  id: string
  title: string
  nextStep: string
  severity: BISeverity
  state: BIKpiState
  actionLink: BIActionLink
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  dueLabel: string | null
  ownerLabel: string | null
  blockers: BIBlocker[]
  redactions: BIRedaction[]
}

export type BusinessPulseSummary = {
  todaySales: number
  todayTransactions: number
  todayAverageTransaction: number
  salesChange: number
  transactionChange: number
  weekSales: number
  monthSales: number
  activeSessions: number
  lowStockItems: number
  stockCoverage: { activeItems: number; itemsWithRecords: number; itemsWithoutRecords: number } | null
}

export type BusinessPulseCommandData = {
  organizationId: string
  locationId: string
  generatedAt: string
  periodStart: string
  periodEnd: string
  currency: string
  timezone: string
  commandBrief: BICommandBrief
  cards: BIKpiCard[]
  changes: BIChangeEvent[]
  actionsToday: BusinessPulseActionItem[]
  risks: BIUnassessedObservation[]
  summary: BusinessPulseSummary
}
