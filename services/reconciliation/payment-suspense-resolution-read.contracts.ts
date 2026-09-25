import { z } from "zod"
const id = z.string().trim().min(1).max(191)
const cursor = z.object({ id, createdAt: z.string().datetime() }).strict().nullable().optional()
export const suspenseResolutionReadSchema = z.object({ suspenseItemId: id, cursor }).strict()
export const suspenseResolutionReviewSchema = z.object({ suspenseItemId: id, proposalId: id }).strict()
export const suspenseClearingSearchSchema = z.object({ suspenseItemId: id, search: z.string().trim().max(120).default(""), cursor }).strict()
export type SuspenseResolutionReadInput = z.infer<typeof suspenseResolutionReadSchema>
export type SuspenseClearingSearchInput = z.infer<typeof suspenseClearingSearchSchema>
