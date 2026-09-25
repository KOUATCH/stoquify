import { z } from "zod"

export const passwordRecoveryEmail = z.string().trim().max(254).email().transform(value => value.toLowerCase())
export const passwordResetRequest = z.object({
  email: passwordRecoveryEmail,
  token: z.string().regex(/^[a-z0-9]{32}$/),
  newPassword: z.string().min(1).max(128),
})
