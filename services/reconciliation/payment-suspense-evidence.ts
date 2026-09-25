import { createHash } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

export type SuspenseReviewSource = {
  id: string
  organizationId: string
  providerAccountId: string | null
  reconciliationRunId: string | null
  status: string
  type: string
  amount: Prisma.Decimal | string | number
  currencyCode: string
  ownerId: string | null
  suspenseLedgerAccountId: string | null
  updatedAt: Date
  metadata: unknown
  providerAccount?: { suspenseLedgerAccountId?: string | null } | null
  reconciliationRun?: { businessDate: Date } | null
}

export function suspenseMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`
}

export function suspenseEvidenceHash(value: unknown) {
  return `sha256:${createHash("sha256").update(stable(value)).digest("hex")}`
}

const cycleSchema = z.object({
  number: z.number().int().min(2).max(2_147_483_647),
  postingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }),
  previousPostingBatchId: z.string().min(1), reversalJournalEntryId: z.string().min(1), correctionReceiptId: z.string().min(1),
}).strict()

export function suspensePostingCycle(item: { metadata?: unknown }) {
  const value = suspenseMetadata(item.metadata).postingCycle
  return value == null ? null : cycleSchema.parse(value)
}

export function suspenseApprovalKey(item: { id: string; metadata?: unknown }) {
  const cycle = suspensePostingCycle(item)
  return `${item.id}:posting-approval${cycle ? `:cycle:${cycle.number}` : ""}`
}

export function suspensePostingDate(item: Pick<SuspenseReviewSource, "reconciliationRun"> & { metadata?: unknown }, now: Date) {
  const cycle = suspensePostingCycle(item)
  return cycle ? new Date(`${cycle.postingDate}T00:00:00.000Z`) : item.reconciliationRun?.businessDate ?? now
}

export function suspensePostingSourceHash(item: SuspenseReviewSource, now: Date) {
  return suspenseEvidenceHash({
    version: 1, id: item.id, organizationId: item.organizationId,
    providerAccountId: item.providerAccountId, reconciliationRunId: item.reconciliationRunId,
    type: item.type, amount: String(item.amount), currencyCode: item.currencyCode,
    suspenseLedgerAccountId: item.suspenseLedgerAccountId ?? item.providerAccount?.suspenseLedgerAccountId ?? null,
    postingDay: suspensePostingDate(item, now).toISOString().slice(0, 10),
    ...(suspensePostingCycle(item) ? { postingCycle: suspensePostingCycle(item) } : {}),
  })
}

export function suspenseEvidenceRevision(item: SuspenseReviewSource, now: Date) {
  return suspenseEvidenceHash({
    source: suspensePostingSourceHash(item, now), status: item.status,
    ownerId: item.ownerId, updatedAt: item.updatedAt.toISOString(),
    proposal: suspenseMetadata(item.metadata).reclassification ?? null,
  })
}
