import type { BIDailyDigest } from "@/services/bi/bi-contracts"
import type { ActionQueueResult } from "@/services/signals/business-signal-contracts"

export type DailyHabitDigestSummary = {
  digestCount: number
  visibleActionCount: number
  filteredOutActionCount: number
  staleSignalCount: number
  redactedSignalCount: number
  blockedDigestCount: number
}

export type DailyHabitDigestData = {
  organizationId: string
  organizationName: string | null
  generatedAt: string
  periodStart: string
  periodEnd: string
  currency: string
  digests: BIDailyDigest[]
  actionQueue: Pick<ActionQueueResult, "summary" | "filteredOutCount">
  summary: DailyHabitDigestSummary
}
