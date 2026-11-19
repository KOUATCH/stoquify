import { z } from "zod"

export const userDeactivationCommand = z.object({
  requestId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(3).max(400),
}).strict()

export type UserDeactivationCommand = z.infer<typeof userDeactivationCommand>
export type UserDeactivationReceipt = {
  id: string; auditId: string; updatedAt: string; sessionsRevoked: number
  pendingInvitesCancelled: number; replayed: boolean
}
