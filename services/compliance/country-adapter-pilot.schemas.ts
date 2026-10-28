import { z } from "zod"

const sha256Schema = z
  .string()
  .trim()
  .regex(/^sha256:[a-f0-9]{64}$/, "A SHA-256 evidence hash is required.")

export const credentialReferenceSchema = z
  .string()
  .trim()
  .min(12)
  .max(512)
  .regex(
    /^(vault|aws-secretsmanager|azure-keyvault|gcp-secretmanager):\/\/[A-Za-z0-9._~:/-]+$/,
    "Credentials must be referenced through an approved secret manager URI.",
  )

const officialSpecSchema = z.object({
  title: z.string().trim().min(3).max(240),
  version: z.string().trim().min(1).max(120),
  publishedAt: z.coerce.date(),
  effectiveFrom: z.coerce.date().optional(),
  reference: z.string().trim().url().max(1000),
  documentHash: sha256Schema,
})

export const configureCountryAdapterPilotSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  credentialReference: credentialReferenceSchema.optional(),
  credentialExpiresAt: z.coerce.date().optional(),
  officialSpec: officialSpecSchema.optional(),
})

export const rotateCountryAdapterCredentialSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  adapterConfigId: z.string().trim().min(1),
  credentialReference: credentialReferenceSchema,
  credentialExpiresAt: z.coerce.date().optional(),
  reason: z.string().trim().min(8).max(500),
})

export const recordCountryAdapterReviewSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  adapterConfigId: z.string().trim().min(1),
  reviewStatus: z.enum(["EXPERT_APPROVED", "REGULATOR_CONFIRMED"]),
  reviewedAt: z.coerce.date(),
  reviewerQualification: z.string().trim().min(8).max(500),
  reviewerConflictDeclared: z.literal(true),
  reviewEvidenceHash: sha256Schema,
})

export const disableCountryAdapterSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  adapterConfigId: z.string().trim().min(1),
  reason: z.string().trim().min(8).max(500),
})

export type ConfigureCountryAdapterPilotInput = z.input<
  typeof configureCountryAdapterPilotSchema
>
export type RotateCountryAdapterCredentialInput = z.input<
  typeof rotateCountryAdapterCredentialSchema
>
export type RecordCountryAdapterReviewInput = z.input<
  typeof recordCountryAdapterReviewSchema
>
export type DisableCountryAdapterInput = z.input<
  typeof disableCountryAdapterSchema
>
