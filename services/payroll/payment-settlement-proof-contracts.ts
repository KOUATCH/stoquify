import { z } from "zod"

export const settlementProofSelectionSchema = z.object({
  payrollRunId: z.string().min(1).max(200),
  runVersion: z.number().int().positive(),
  runRevision: z.string().min(1).max(100),
  matchRecordId: z.string().min(1).max(200),
  matchRevision: z.string().min(1).max(100),
})
export type SettlementProofSelection = z.infer<typeof settlementProofSelectionSchema>
export type SettlementProofOptions = {
  register: { id: string; runNumber: string; version: number; revision: string } | null
  matches: Array<{ id: string; revision: string; reference: string; kind: "provider" | "statement" | "provider_and_statement"; amount: string; currency: string; occurredAt: string }>
}
