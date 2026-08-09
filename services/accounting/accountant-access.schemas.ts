import { z } from "zod"

const idSchema = z.string().trim().min(1)
const sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/i)

export const grantAccountantAccessInputSchema = z.object({
  accountantEmail: z.string().trim().email(),
  accountantFirmName: z.string().trim().min(2).max(160),
  accountantFirmRegistrationNumber: z.string().trim().min(2).max(120).nullable().optional(),
  role: z.enum(["READ_ONLY", "REVIEWER", "PREPARER"]),
  consentEvidenceHash: sha256Schema,
  effectiveFrom: z.coerce.date().optional(),
  expiresAt: z.coerce.date(),
  correlationId: idSchema.nullable().optional(),
})

export const inviteAccountantAccessInputSchema =
  grantAccountantAccessInputSchema.extend({
    idempotencyKey: idSchema.min(8).max(191).nullable().optional(),
    locale: z.enum(["EN", "FR"]).optional(),
  })

export const revokeAccountantAccessInputSchema = z.object({
  grantId: idSchema,
  reason: z.string().trim().min(5).max(500),
  correlationId: idSchema.nullable().optional(),
})

export const accountantClientScopeInputSchema = z.object({
  clientOrganizationId: idSchema.nullable().optional(),
})

export type GrantAccountantAccessInput = z.infer<typeof grantAccountantAccessInputSchema>
export type InviteAccountantAccessInput = z.infer<typeof inviteAccountantAccessInputSchema>
export type RevokeAccountantAccessInput = z.infer<typeof revokeAccountantAccessInputSchema>
