import { z } from "zod"

// Shared by the action and service; browser validation is only guidance.
export const invitationIssueInput = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  roleId: z.string().trim().min(1).max(191),
  requestId: z.string().uuid().optional(),
  locale: z.enum(["en", "fr"]).optional(),
  replace: z.object({
    inviteId: z.string().trim().min(1).max(191),
    revision: z.string().regex(/^[a-f0-9]{64}$/),
    reason: z.string().trim().min(3).max(500),
  }).optional(),
})

export const invitationCancellationInput = z.object({
  inviteId: z.string().trim().min(1).max(191),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  reason: z.string().trim().min(3).max(500),
  requestId: z.string().uuid(),
})

export const invitationRedemptionInput = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  password: z.string().min(1).max(128),
  firstName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  image: z.string().max(2048).nullable().optional(),
})
