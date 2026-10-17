import { z } from "zod"

export const deliveryStates = ["queued", "processing", "accepted", "failed", "deferred", "unknown", "cancelled"] as const
export type DeliveryState = typeof deliveryStates[number]
export type DeliverySource = "statements" | "invitations"
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
})
export const deliveryIssuesInput = z.object({
  source: z.enum(["all", "statements", "invitations"]).default("all"),
  state: z.enum(["issues", "all", ...deliveryStates]).default("issues"),
  channel: z.enum(["all", "EMAIL", "WHATSAPP"]).default("all"),
  from: day.optional(), through: day.optional(),
  statementCursor: z.string().min(1).max(191).optional(),
  invitationCursor: z.string().min(1).max(191).optional(),
}).strict().refine(value => !value.from || !value.through || value.from <= value.through)
export type DeliveryIssuesQuery = z.infer<typeof deliveryIssuesInput>
export type DeliveryIssue = {
  id: string; reference: string; recipient: string; channel: "EMAIL" | "WHATSAPP"
  recordedAt: string; checkedAt: string; state: DeliveryState; attempts: number | null
  reason: "none" | "disabled" | "uncertain" | "review" | "invalidEvidence"
  sourceHref: string | null
}
export type DeliveryIssuePage = {
  source: DeliverySource; availability: "ready" | "restricted" | "unavailable"
  rows: DeliveryIssue[]; nextCursor: string | null
  // State filters use validated projections. Sparse scan windows are explicit.
  windowLimited: boolean
}
export type DeliveryIssuesResult = { checkedAt: string; pages: DeliveryIssuePage[] }

export function matchesDeliveryState(state: DeliveryState, filter: DeliveryIssuesQuery["state"]) {
  return filter === "all" || (filter === "issues" ? ["queued", "processing", "failed", "deferred", "unknown"].includes(state) : state === filter)
}

export function deliveryStatus(status: string | undefined, code: string | null | undefined): DeliveryState {
  if (["PROVIDER_OUTCOME_UNKNOWN", "INVITATION_PROVIDER_OUTCOME_UNKNOWN"].includes(code ?? "")) return "unknown"
  if (status === "SENT") return "accepted"
  if (status === "CANCELLED") return "cancelled"
  if (status === "LOCKED") return "processing"
  if (status === "QUEUED" || status === "PENDING") return "queued"
  if (status === "DEFERRED") return "deferred"
  if (status === "FAILED" || status === "DEAD_LETTER") return "failed"
  return "unknown"
}

export function deliveryReason(state: DeliveryState, code: string | null | undefined): DeliveryIssue["reason"] {
  if (state === "unknown") return "uncertain"
  if (code === "PROVIDER_NOT_CONFIGURED") return "disabled"
  return state === "failed" || state === "deferred" ? "review" : "none"
}
