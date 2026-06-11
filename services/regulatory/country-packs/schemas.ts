import { z } from "zod"

export const COUNTRY_PACK_SCHEMA_VERSION = "country-pack.v1"

export const countryPackStatusSchema = z.enum(["DRAFT", "LEGAL_REVIEW", "PUBLISHED", "RETIRED"])
export const capabilityStatusSchema = z.enum([
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "NOT_SUPPORTED",
  "REQUIRES_CONFIGURATION",
])
export const verificationStatusSchema = z.enum([
  "SOURCE_CHECKED",
  "EXPERT_REVIEWED",
  "REGULATOR_CONFIRMED",
  "REQUIRES_EXPERT_REVIEW",
])

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const legalReferenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  jurisdiction: z.string().min(2),
  issuedBy: z.string().min(1),
  sourceUrl: z.string().url(),
  article: z.string().min(1).optional(),
  documentDate: isoDateSchema.optional(),
  retrievedOn: isoDateSchema,
  notes: z.string().optional(),
})

export const regulatoryEnvelopeSchema = z.object({
  value: z.unknown(),
  legalRef: z.string().min(1),
  effectiveFrom: isoDateSchema,
  effectiveTo: isoDateSchema.nullable().optional(),
  verifiedOn: isoDateSchema,
  verifiedBy: z.string().min(1),
  verificationStatus: verificationStatusSchema,
  notes: z.string().optional(),
})

export const countryPackHeaderSchema = z.object({
  countryCode: z.string().length(2),
  countryName: z.object({
    en: z.string().min(1),
    fr: z.string().min(1),
  }),
  currencyCode: z.string().length(3),
  packVersion: z.string().min(1),
  schemaVersion: z.literal(COUNTRY_PACK_SCHEMA_VERSION),
  status: countryPackStatusSchema,
  effectiveFrom: isoDateSchema,
  effectiveTo: isoDateSchema.nullable().optional(),
  verifiedOn: isoDateSchema,
  verifiedBy: z.string().min(1),
  hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  capabilityMatrix: z.record(capabilityStatusSchema),
  legalRefs: z.array(legalReferenceSchema).min(1),
})

export const goldenFixtureSchema = z.object({
  id: z.string().min(1),
  countryCode: z.string().length(2),
  parameterPath: z.string().min(1),
  date: isoDateSchema,
  purpose: z.string().optional(),
  entityProfileId: z.string().optional(),
  expectedValue: z.unknown(),
  expectedLegalRef: z.string().min(1),
  expectedPackVersion: z.string().min(1),
  notes: z.string().optional(),
})

export const countryPackSchema = z.object({
  header: countryPackHeaderSchema,
  parameters: z.record(z.unknown()),
  goldenFixtures: z.array(goldenFixtureSchema),
})

export type CountryPackStatus = z.infer<typeof countryPackStatusSchema>
export type CapabilityStatus = z.infer<typeof capabilityStatusSchema>
export type VerificationStatus = z.infer<typeof verificationStatusSchema>
export type LegalReference = z.infer<typeof legalReferenceSchema>
export type RegulatoryEnvelope<T = unknown> = Omit<z.infer<typeof regulatoryEnvelopeSchema>, "value"> & {
  value: T
}
export type CountryPackHeader = z.infer<typeof countryPackHeaderSchema>
export type GoldenFixture = z.infer<typeof goldenFixtureSchema>
export type CountryPack = {
  header: CountryPackHeader
  parameters: Record<string, unknown>
  goldenFixtures: GoldenFixture[]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isRegulatoryEnvelope(value: unknown): value is RegulatoryEnvelope {
  return (
    isRecord(value) &&
    "value" in value &&
    typeof value.legalRef === "string" &&
    typeof value.effectiveFrom === "string" &&
    typeof value.verifiedOn === "string" &&
    typeof value.verifiedBy === "string" &&
    typeof value.verificationStatus === "string"
  )
}

export function isRegulatoryEnvelopeArray(value: unknown): value is RegulatoryEnvelope[] {
  return Array.isArray(value) && value.length > 0 && value.every(isRegulatoryEnvelope)
}
