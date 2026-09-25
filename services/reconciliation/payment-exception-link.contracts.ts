import { z } from "zod"

export const exceptionLinkReadSchema = z.object({ suspenseItemId: z.string().min(1).max(191) }).strict()
export const exceptionLinkRepairSchema = exceptionLinkReadSchema.extend({
  reason: z.string().trim().min(5).max(2000),
  expectedRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  idempotencyKey: z.string().uuid(),
}).strict()
export type ExceptionLinkRepair = z.infer<typeof exceptionLinkRepairSchema>
