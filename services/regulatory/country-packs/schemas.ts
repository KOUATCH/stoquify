import { z } from "zod";

export const COUNTRY_PACK_SCHEMA_VERSION = "country-pack.v1";

export const countryPackStatusSchema = z.enum([
  "DRAFT",
  "LEGAL_REVIEW",
  "PUBLISHED",
  "RETIRED",
]);
export const capabilityStatusSchema = z.enum([
  "SUPPORTED",
  "SUPPORTED_CERTIFIED",
  "SUPPORTED_DRAFT",
  "PARTIALLY_SUPPORTED",
  "NOT_SUPPORTED",
  "NOT_YET_SUPPORTED",
  "OUT_OF_SCOPE",
  "REQUIRES_CONFIGURATION",
  "REQUIRES_EXPERT_REVIEW",
]);
export const verificationStatusSchema = z.enum([
  "SOURCE_CHECKED",
  "EXPERT_REVIEWED",
  "REGULATOR_CONFIRMED",
  "REQUIRES_EXPERT_REVIEW",
]);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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
});

export const regulatoryEnvelopeSchema = z.object({
  value: z.unknown(),
  legalRef: z.string().min(1),
  effectiveFrom: isoDateSchema,
  effectiveTo: isoDateSchema.nullable().optional(),
  verifiedOn: isoDateSchema,
  verifiedBy: z.string().min(1),
  verificationStatus: verificationStatusSchema,
  notes: z.string().optional(),
});

const eInvoicingDocumentTypeSchema = z.enum([
  "POS_RECEIPT",
  "SALES_INVOICE",
  "CREDIT_NOTE",
]);

const eInvoicingRequiredFieldSchema = z.object({
  scope: z.enum([
    "SELLER",
    "BUYER",
    "DOCUMENT",
    "LINE",
    "TAX",
    "PAYMENT",
    "SOURCE_TRACE",
  ]),
  field: z.string().min(1),
  required: z.boolean(),
  when: z.string().min(1).optional(),
  notes: z.string().optional(),
});

const eInvoicingAuthorityChannelSchema = z.object({
  code: z.string().min(1),
  authorityName: z.string().min(1),
  channelType: z.enum([
    "API",
    "PORTAL",
    "FILE_UPLOAD",
    "EMAIL",
    "IN_PERSON",
    "UNKNOWN",
  ]),
  adapterReadiness: capabilityStatusSchema,
  adapterKey: z.string().min(1).optional(),
  sandboxOnly: z.boolean().optional(),
  supportedDocumentTypes: z.array(eInvoicingDocumentTypeSchema).min(1),
  requiresTenantCredentials: z.boolean(),
  credentialStoragePolicy: z.enum([
    "VAULT_ONLY",
    "NOT_APPLICABLE",
    "REQUIRES_CONFIGURATION",
  ]),
  endpointMetadata: z.object({
    officialSpecStatus: verificationStatusSchema,
    documentationUrl: z.string().url().optional(),
    sandboxBaseUrl: z.string().url().optional(),
    productionBaseUrl: z.string().url().optional(),
    secretsAllowedInPack: z.literal(false),
    notes: z.string().optional(),
  }),
});

const eInvoicingArtifactExpectationSchema = z.object({
  code: z.string().min(1),
  source: z.enum(["AUTHORITY", "MANUAL_PORTAL", "PLATFORM"]),
  required: z.boolean(),
  verificationStatus: verificationStatusSchema,
  notes: z.string().optional(),
});

const eInvoicingMetadataSchema = z.object({
  capability: z
    .array(
      regulatoryEnvelopeSchema.extend({
        value: z.object({
          status: capabilityStatusSchema,
          productionAutomationAllowed: z.boolean(),
          automationBlockReason: z.string().min(1),
          supportedDocumentTypes: z.array(eInvoicingDocumentTypeSchema).min(1),
          requiresPostedLedgerSource: z.boolean(),
          requiresOfficialTechnicalSpec: z.boolean(),
          requiredExpertReviewBeforeAdapter: z.boolean(),
        }),
      }),
    )
    .min(1),
  requiredFields: z
    .array(
      regulatoryEnvelopeSchema.extend({
        value: z.object({
          documentTypes: z.array(eInvoicingDocumentTypeSchema).min(1),
          fields: z.array(eInvoicingRequiredFieldSchema).min(1),
          missingFieldPolicy: z.enum([
            "BLOCK_CERTIFICATION",
            "ALLOW_DRAFT_ONLY",
            "REQUIRES_EXPERT_REVIEW",
          ]),
        }),
      }),
    )
    .min(1),
  certificationPolicy: z
    .array(
      regulatoryEnvelopeSchema.extend({
        value: z.object({
          certificationTiming: z.enum([
            "BEFORE_ISSUE",
            "AFTER_LEDGER_COMMIT_OUTBOX",
            "REQUIRES_EXPERT_REVIEW",
          ]),
          legalDeliveryWhenUncertified: z.enum([
            "BLOCK",
            "ALLOW_WITH_STATUS",
            "REQUIRES_EXPERT_REVIEW",
          ]),
          offlineFinalNumberPolicy: z.enum([
            "PROHIBITED",
            "SERVER_ASSIGNED_ONLY",
            "REQUIRES_EXPERT_REVIEW",
          ]),
          requiresLedgerSourceTrace: z.boolean(),
          authorityCallInsideSaleTransactionAllowed: z.literal(false),
        }),
      }),
    )
    .min(1),
  authorityChannels: z
    .array(
      regulatoryEnvelopeSchema.extend({
        value: z.array(eInvoicingAuthorityChannelSchema).min(1),
      }),
    )
    .min(1),
  manualPortalFallback: z
    .array(
      regulatoryEnvelopeSchema.extend({
        value: z.object({
          availability: z.enum([
            "ALLOWED",
            "NOT_ALLOWED",
            "REQUIRES_EXPERT_REVIEW",
          ]),
          allowedWhen: z.array(z.string().min(1)).min(1),
          requiresFreshAuth: z.boolean(),
          requiresApproval: z.boolean(),
          evidenceRequired: z.array(z.string().min(1)).min(1),
          immutableEvidenceHashRequired: z.boolean(),
        }),
      }),
    )
    .min(1),
  artifactExpectations: z
    .array(
      regulatoryEnvelopeSchema.extend({
        value: z.object({
          hashRequired: z.boolean(),
          immutableStorageRequired: z.boolean(),
          expectedArtifacts: z
            .array(eInvoicingArtifactExpectationSchema)
            .min(1),
          receiptDisplayFields: z.array(z.string().min(1)),
        }),
      }),
    )
    .min(1),
});

const countryPackParametersSchema = z
  .object({
    compliance: z
      .object({
        eInvoicing: eInvoicingMetadataSchema.optional(),
      })
      .catchall(z.unknown())
      .optional(),
  })
  .catchall(z.unknown());

const payrollCalculationScenarioReviewEvidenceSchema = z.object({
  reviewedBy: z.string().min(1),
  reviewedOn: isoDateSchema,
  legalRef: z.string().min(1),
  sourceEvidenceHash: z
    .string()
    .regex(/^sha256:[A-Za-z0-9_.:-]+$/),
  notes: z.string().optional(),
});

const payrollCalculationScenarioSchema = z.object({
  input: z.record(z.unknown()),
  expectedOutput: z.record(z.unknown()),
  reviewStatus: z.enum(["EXPERT_REVIEWED", "REGULATOR_CONFIRMED"]),
  reviewEvidence: payrollCalculationScenarioReviewEvidenceSchema.optional(),
  notes: z.string().optional(),
});

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
});

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
  calculationScenario: payrollCalculationScenarioSchema.optional(),
  notes: z.string().optional(),
});

export const countryPackSchema = z.object({
  header: countryPackHeaderSchema,
  parameters: countryPackParametersSchema,
  goldenFixtures: z.array(goldenFixtureSchema),
});

export type CountryPackStatus = z.infer<typeof countryPackStatusSchema>;
export type CapabilityStatus = z.infer<typeof capabilityStatusSchema>;
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;
export type LegalReference = z.infer<typeof legalReferenceSchema>;
export type RegulatoryEnvelope<T = unknown> = Omit<
  z.infer<typeof regulatoryEnvelopeSchema>,
  "value"
> & {
  value: T;
};
export type CountryPackHeader = z.infer<typeof countryPackHeaderSchema>;
export type GoldenFixture = z.infer<typeof goldenFixtureSchema>;
export type CountryPackEInvoicingMetadata = z.infer<
  typeof eInvoicingMetadataSchema
>;
export type CountryPack = {
  header: CountryPackHeader;
  parameters: Record<string, unknown>;
  goldenFixtures: GoldenFixture[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRegulatoryEnvelope(
  value: unknown,
): value is RegulatoryEnvelope {
  return (
    isRecord(value) &&
    "value" in value &&
    typeof value.legalRef === "string" &&
    typeof value.effectiveFrom === "string" &&
    typeof value.verifiedOn === "string" &&
    typeof value.verifiedBy === "string" &&
    typeof value.verificationStatus === "string"
  );
}

export function isRegulatoryEnvelopeArray(
  value: unknown,
): value is RegulatoryEnvelope[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isRegulatoryEnvelope)
  );
}
