import { z } from "zod"

export const accountSessionCommand = z.object({
  requestId: z.string().uuid(),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()
export type AccountSessionCommand = z.infer<typeof accountSessionCommand>
export const accountSessionReceipt = z.object({
  id: z.string().regex(/^sessionrevoke_[a-f0-9]{64}$/),
  actorId: z.string(),
  organizationId: z.string(),
  requestId: z.string().uuid(),
  completedAt: z.string().datetime(),
  revokedCount: z.number().int().nonnegative(),
  reviewedCount: z.number().int().nonnegative(),
}).strict()
export type AccountSessionReceipt = z.infer<typeof accountSessionReceipt>
export type AccountSessionPreview = {
  actorId: string
  organizationId: string
  sessionId: string
  checkedAt: string
  snapshotHash: string
  others: { id: string; createdAt: string; expiresAt: string; device: string | null }[]
  history: AccountSessionReceipt[]
}
