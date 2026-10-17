import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const id = z.string().trim().min(1).max(200)
const money = z.string().regex(/^-?(0|[1-9][0-9]{0,15})\.[0-9]{2}$/)
export const bankBalanceInputSchema = z.object({
  providerAccountId: id, periodId: id, statementFileId: id, idempotencyKey: id,
  openingBalance: money, closingBalance: money,
  sourceReference: z.string().trim().min(1).max(1000),
  sourceDocumentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  timingItems: z.array(z.object({ boundary: z.enum(["OPENING", "CLOSING"]), journalEntryLineId: id,
    sourceReference: z.string().trim().min(1).max(1000), sourceDocumentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  }).strict()).max(500).default([]),
}).strict()
export const bankBalanceDecisionSchema = z.object({ evidenceId: id, expectedEvidenceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  decision: z.enum(["APPROVE", "REVOKE"]), reason: z.string().trim().min(10).max(2000).optional() }).strict()
export const bankBalanceReadSchema = z.object({ evidenceId: id }).strict()
export type BankBalanceInput = z.infer<typeof bankBalanceInputSchema>
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
  return value
}
export function bankBalanceHash(value: unknown) {
  return "sha256:" + createHash("sha256").update(JSON.stringify(canonical(JSON.parse(JSON.stringify(value))))).digest("hex")
}
export function calculateBankBalance(input: { openingBalance: string; closingBalance: string; statementMovement: string;
  ledgerOpening: string; ledgerClosing: string; openingTiming: string; closingTiming: string }) {
  const d = (value: string) => new Prisma.Decimal(value)
  const adjustedOpening = d(input.openingBalance).plus(input.openingTiming)
  const adjustedClosing = d(input.closingBalance).plus(input.closingTiming)
  const rollForwardDifference = d(input.closingBalance).minus(d(input.openingBalance).plus(input.statementMovement))
  const openingDifference = adjustedOpening.minus(input.ledgerOpening), closingDifference = adjustedClosing.minus(input.ledgerClosing)
  return { ...input, adjustedOpening: adjustedOpening.toFixed(2), adjustedClosing: adjustedClosing.toFixed(2),
    rollForwardDifference: rollForwardDifference.toFixed(2), openingDifference: openingDifference.toFixed(2), closingDifference: closingDifference.toFixed(2),
    balanced: rollForwardDifference.eq(0) && openingDifference.eq(0) && closingDifference.eq(0) }
}
