import { z } from "zod"

const text = (limit: number) => z.string().trim().max(limit).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Use plain text without control characters.")
export const selfProfileFields = z.object({
  firstName: text(100).refine(value => value.length > 0, "Enter your given or display name."),
  lastName: text(100),
  jobTitle: text(100),
}).strict()
export const selfProfileCommand = z.object({
  requestId: z.string().uuid(),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
  fields: selfProfileFields,
}).strict()
export type SelfProfileFields = z.infer<typeof selfProfileFields>
export type SelfProfileCommand = z.infer<typeof selfProfileCommand>
export const selfProfileReceipt = z.object({
  id: z.string().regex(/^selfprofile_[a-f0-9]{64}$/),
  actorId: z.string(), organizationId: z.string(), requestId: z.string().uuid(),
  savedAt: z.string().datetime(),
  fields: selfProfileFields,
  displayName: z.string(),
  changedFields: z.array(z.enum(["firstName", "lastName", "jobTitle", "name"])),
}).strict()
export type SelfProfileReceipt = z.infer<typeof selfProfileReceipt>
export type SelfProfileRead = {
  actorId: string; organizationId: string; fields: SelfProfileFields; displayName: string
  email: string; emailVerified: boolean; phone: string | null; image: string | null
  canUpdate: boolean; checkedAt: string; updatedAt: string; snapshotHash: string
  history: SelfProfileReceipt[]
}
