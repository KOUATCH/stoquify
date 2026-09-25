import { z } from "zod"

export const passwordChangeRequest = z.object({
  targetUserId: z.string().trim().min(1).max(191),
  oldPassword: z.string().max(1024),
  newPassword: z.string().min(1).max(128),
})
export type PasswordChangeFields = Pick<z.infer<typeof passwordChangeRequest>, "oldPassword" | "newPassword">
