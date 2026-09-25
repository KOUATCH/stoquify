import { z } from "zod"

export const memberAccessCommand = z.object({
  requestId: z.string().uuid(),
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
  operation: z.enum(["roles", "reactivate"]),
  roleIds: z.array(z.string().min(1).max(200)).max(100).refine(values => new Set(values).size === values.length),
  reason: z.string().trim().min(3).max(400),
}).strict()

export type MemberAccessCommand = z.infer<typeof memberAccessCommand>
export type MemberAccessReceipt = { id: string; auditId: string; revision: string; operation: "roles" | "reactivate"; sessionsRevoked: number; replayed: boolean }
