import { z } from "zod"
import { advisoryScopeSchema } from "./advisory-outcomes.contract"

const id = z.string().trim().min(1).max(160)
const minutes = z.number().int().min(0).max(1000000)
export const practicePayloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("PLAN"), assigneeId: id.nullable(), minutes }).strict(),
  z.object({ kind: z.literal("EFFORT"), minutes: minutes.max(1440), workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    advisoryRevisionId: id.nullable(), reviewDecisionId: id.nullable() }).strict(),
  z.object({ kind: z.literal("FEE"), currency: z.enum(["XAF", "XOF", "EUR", "USD"]),
    amount: z.string().regex(/^(0|[1-9]\d{0,11})\.\d{2}$/) }).strict(),
])
const commandBase = advisoryScopeSchema.extend({ recordKey: id, expectedVersion: z.number().int().min(0),
  idempotencyKey: z.string().min(8).max(160), reason: z.string().trim().min(10).max(500) })
export const practiceCommandSchema = z.discriminatedUnion("command", [
  commandBase.extend({ command: z.literal("SAVE"), payload: practicePayloadSchema }).strict(),
  commandBase.extend({ command: z.literal("REVIEW") }).strict(),
])
export const practiceReadSchema = z.object({ cohort: z.array(advisoryScopeSchema).min(1).max(10),
  mode: z.enum(["own", "manager"]).default("own"), includeEconomics: z.boolean().default(false) }).strict()
export type PracticePayload = z.infer<typeof practicePayloadSchema>
export type PracticeRecord = { id: string; recordKey: string; version: number; payload: PracticePayload;
  subjectUserId: string | null; recordedById: string; actorId: string; reviewedById: string | null;
  operation: string; reason: string; createdAt: string }

export function currentPracticeRecords(history: PracticeRecord[]) {
  const rows = new Map<string, PracticeRecord>()
  for (const row of history) if (!rows.has(row.recordKey) || rows.get(row.recordKey)!.version < row.version) rows.set(row.recordKey, row)
  return [...rows.values()].sort((a, b) => a.recordKey.localeCompare(b.recordKey))
}
const fixed = (cents: bigint) => `${cents / BigInt(100)}.${(cents % BigInt(100)).toString().padStart(2, "0")}`
/** Manual declarations are always a partial observation, never inferred complete labor. */
export function summarizePractice(history: PracticeRecord[], staffIds: string[]) {
  const current = currentPracticeRecords(history)
  const ids = [...new Set([...staffIds, ...current.filter(row => row.payload.kind !== "FEE").map(row => row.subjectUserId)])]
  const allocation = ids.map(assigneeId => {
    const rows = current.filter(row => row.subjectUserId === assigneeId)
    const plan = rows.find(row => row.payload.kind === "PLAN"), effort = rows.filter(row => row.payload.kind === "EFFORT")
    const plannedMinutes = plan?.payload.kind === "PLAN" ? plan.payload.minutes : null
    const recordedMinutes = effort.length ? effort.reduce((sum, row) => sum + (row.payload.kind === "EFFORT" ? row.payload.minutes : 0), 0) : null
    return { assigneeId, plannedMinutes, recordedMinutes, declarationCount: effort.length,
      effortVarianceMinutes: plannedMinutes !== null && recordedMinutes !== null ? recordedMinutes - plannedMinutes : null,
      recordingCoverage: effort.length ? "PARTIAL_DECLARATIONS" as const : "UNKNOWN" as const,
      reviewedDeclarations: effort.filter(row => row.reviewedById).length }
  })
  const plans = allocation.filter(row => row.plannedMinutes !== null)
  const plannedSubtotalMinutes = plans.length ? plans.reduce((sum, row) => sum + row.plannedMinutes!, 0) : null
  const economics = current.flatMap(row => row.payload.kind === "FEE" ? [{ currency: row.payload.currency,
    feeBudget: row.payload.amount, feePerPlannedHour: plannedSubtotalMinutes ? fixed((BigInt(row.payload.amount.replace(".", "")) * BigInt(60) + BigInt(Math.floor(plannedSubtotalMinutes / 2))) / BigInt(plannedSubtotalMinutes)) : null,
    actualFeeVariance: null, profitability: null }] : [])
  return { allocation, plannedSubtotalMinutes, missingPlans: allocation.filter(row => row.plannedMinutes === null).length,
    economics, corrections: history.filter(row => row.operation === "SAVE" && row.version > 1).length,
    limitations: "Manual declarations are partial; missing effort is unknown. Plans are estimates. Fee per planned hour uses the supplied plan subtotal, not capacity, revenue, realization or profit. No payroll, monitoring or FX conversion." }
}
