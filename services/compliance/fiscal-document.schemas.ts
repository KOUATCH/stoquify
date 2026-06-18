import {
  AccountingSourceType,
  ComplianceAdapterEnvironment,
  ComplianceSubmissionOperation,
  FiscalDocumentType,
} from "@prisma/client"
import { z } from "zod"

const decimalStringSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") return "0"
    return String(value)
  },
  z.string().trim().min(1),
)

const optionalTrimmedString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .nullable()

const countryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase())

const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase())

export const fiscalDocumentLineInputSchema = z
  .object({
    lineNumber: z.coerce.number().int().positive(),
    sourceLineId: optionalTrimmedString,
    itemId: optionalTrimmedString,
    description: z.string().trim().min(1),
    quantity: decimalStringSchema,
    unitPrice: decimalStringSchema,
    discountAmount: decimalStringSchema.default("0"),
    taxRateBps: z.coerce.number().int().min(0).max(100000).optional().nullable(),
    taxCode: optionalTrimmedString,
    taxAmount: decimalStringSchema.default("0"),
    lineSubtotal: decimalStringSchema.default("0"),
    lineTotal: decimalStringSchema.default("0"),
    linePayload: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()

export const createFiscalDocumentFromPostedSourceSchema = z
  .object({
    organizationId: z.string().trim().min(1),
    createdById: optionalTrimmedString,
    documentType: z.nativeEnum(FiscalDocumentType),
    sourceType: z.nativeEnum(AccountingSourceType),
    sourceId: z.string().trim().min(1),
    sourceNumber: optionalTrimmedString,
    sourceDate: z.coerce.date().optional().nullable(),
    issueDate: z.coerce.date().optional(),
    countryCode: countryCodeSchema,
    currency: currencyCodeSchema.default("XAF"),
    fiscalYear: z.string().trim().min(4).optional(),
    fiscalPeriodKey: z.string().trim().min(1).default("ANNUAL"),
    sequenceScopeKey: z.string().trim().min(1).default("GLOBAL"),
    idempotencyKey: z.string().trim().min(1),
    subtotal: decimalStringSchema.default("0"),
    taxAmount: decimalStringSchema.default("0"),
    discountAmount: decimalStringSchema.default("0"),
    totalAmount: decimalStringSchema.default("0"),
    taxBreakdown: z.unknown().optional(),
    sourcePayloadHash: optionalTrimmedString,
    canonicalPayload: z.record(z.unknown()).optional(),
    lines: z.array(fiscalDocumentLineInputSchema).min(1),
    enqueueCertification: z.boolean().default(false),
    authorityChannel: optionalTrimmedString,
    adapterKey: optionalTrimmedString,
    adapterEnvironment: z
      .nativeEnum(ComplianceAdapterEnvironment)
      .default(ComplianceAdapterEnvironment.FAKE_SANDBOX),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()

export const enqueueComplianceSubmissionSchema = z
  .object({
    organizationId: z.string().trim().min(1),
    actorId: optionalTrimmedString,
    fiscalDocumentId: z.string().trim().min(1),
    adapterConfigId: optionalTrimmedString,
    operation: z
      .nativeEnum(ComplianceSubmissionOperation)
      .default(ComplianceSubmissionOperation.CERTIFY),
    authorityChannel: z.string().trim().min(1),
    adapterKey: optionalTrimmedString,
    environment: z
      .nativeEnum(ComplianceAdapterEnvironment)
      .default(ComplianceAdapterEnvironment.FAKE_SANDBOX),
    idempotencyKey: z.string().trim().min(1),
    payloadHash: z.string().trim().min(1),
    requestSummary: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    nextAttemptAt: z.coerce.date().optional(),
  })
  .strict()

export const complianceMetadataResolutionSchema = z
  .object({
    countryCode: countryCodeSchema,
    date: z.coerce.date().optional(),
    pinnedPackVersion: optionalTrimmedString,
    entityProfileId: optionalTrimmedString,
  })
  .strict()

export const complianceCenterQuerySchema = z
  .object({
    countryCode: countryCodeSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict()

export type FiscalDocumentLineInput = z.infer<typeof fiscalDocumentLineInputSchema>
export type CreateFiscalDocumentFromPostedSourceInput = z.infer<
  typeof createFiscalDocumentFromPostedSourceSchema
>
export type EnqueueComplianceSubmissionInput = z.infer<
  typeof enqueueComplianceSubmissionSchema
>
export type ComplianceMetadataResolutionInput = z.infer<
  typeof complianceMetadataResolutionSchema
>
