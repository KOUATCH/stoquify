import "server-only";

import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

import { hashBusinessPayload } from "@/services/events/business-event.service";
import {
  normalizePayrollAdapterKey,
  type PayrollAuthorityAdapterReadiness,
  type PayrollPaymentAdapterStatus,
} from "./payroll-adapter-registry.service";

const idSchema = z.string().trim().min(1);
const hashSchema = z
  .string()
  .trim()
  .regex(/^sha256:[A-Za-z0-9_.:-]+$/, {
    message: "Proof references must be immutable sha256 hashes.",
  });
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);

const authorityHarnessInputSchema = z.object({
  authorityChannel: idSchema,
  authorityEnvironment: idSchema,
  countryCode: idSchema.optional(),
  countryPackVersion: idSchema.optional(),
  countryPackResolutionHash: hashSchema.optional(),
  declarationType: idSchema.optional(),
  mappingSchemaVersion: idSchema.default("payroll-authority-mapping.v1"),
  authorityAdapterKey: idSchema.optional(),
  requestedReadiness: z
    .enum([
      "MANUAL_EVIDENCE",
      "REQUIRES_EXPERT_REVIEW",
      "SUPPORTED",
      "SUPPORTED_CERTIFIED",
    ])
    .default("SUPPORTED_CERTIFIED"),
  reviewedBy: idSchema.optional(),
  reviewedAt: dateInputSchema.optional(),
  payloadMappingHash: hashSchema.optional(),
  responseMappingHash: hashSchema.optional(),
  authorityStatusCodeMapHash: hashSchema.optional(),
  rejectionMappingHash: hashSchema.optional(),
  amendmentMappingHash: hashSchema.optional(),
  paymentDueMappingHash: hashSchema.optional(),
  credentialProofHash: hashSchema.optional(),
  credentialRotationProofHash: hashSchema.optional(),
  credentialScopeProofHash: hashSchema.optional(),
  adapterRequestHash: hashSchema.optional(),
  adapterResponseReceiptHash: hashSchema.optional(),
  adapterIdempotencyKey: idSchema.optional(),
  adapterAttempt: z.number().int().positive().max(100).default(1),
  idempotencyReplayFixtureHash: hashSchema.optional(),
  duplicateResponseFixtureHash: hashSchema.optional(),
  duplicateTerminalResponseReplayFixtureHash: hashSchema.optional(),
  outageRunbookHash: hashSchema.optional(),
  retryPolicyFixtureHash: hashSchema.optional(),
  deadLetterTriageRunbookHash: hashSchema.optional(),
  auditTrailFixtureHash: hashSchema.optional(),
  redactionFixtureHash: hashSchema.optional(),
  closeImpactRuleHash: hashSchema.optional(),
  legalReviewHash: hashSchema.optional(),
});

const paymentHarnessInputSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  paymentProviderAdapterKey: idSchema.optional(),
  requestedStatus: z
    .enum([
      "MANUAL_PROVIDER_SETTLEMENT_REQUIRED",
      "REQUIRES_EXPERT_REVIEW",
      "SUPPORTED",
      "SUPPORTED_CERTIFIED",
    ])
    .default("SUPPORTED_CERTIFIED"),
  reviewedBy: idSchema.optional(),
  reviewedAt: dateInputSchema.optional(),
  bankFileHash: hashSchema.optional(),
  providerCredentialProofHash: hashSchema.optional(),
  providerCredentialRotationProofHash: hashSchema.optional(),
  providerCredentialScopeProofHash: hashSchema.optional(),
  providerPayloadMappingHash: hashSchema.optional(),
  providerResponseMappingHash: hashSchema.optional(),
  providerReversalMappingHash: hashSchema.optional(),
  providerAdapterRequestHash: hashSchema.optional(),
  providerAdapterResponseHash: hashSchema.optional(),
  providerSettlementReceiptHash: hashSchema.optional(),
  providerIdempotencyKey: idSchema.optional(),
  providerAttempt: z.number().int().positive().max(100).default(1),
  providerReplayFixtureHash: hashSchema.optional(),
  providerDuplicateResponseFixtureHash: hashSchema.optional(),
  providerOutageRunbookHash: hashSchema.optional(),
  providerRetryPolicyFixtureHash: hashSchema.optional(),
  providerDeadLetterTriageRunbookHash: hashSchema.optional(),
  providerAuditTrailFixtureHash: hashSchema.optional(),
  providerRedactionFixtureHash: hashSchema.optional(),
  providerCloseImpactRuleHash: hashSchema.optional(),
});

export type PayrollAuthorityAdapterCertificationHarnessInput = z.input<
  typeof authorityHarnessInputSchema
>;
export type PayrollPaymentProviderCertificationHarnessInput = z.input<
  typeof paymentHarnessInputSchema
>;

type CheckDefinition<TInput> = {
  code: string;
  label: string;
  field?: keyof TInput;
  present: (input: TInput) => boolean;
};

type HarnessCheck = {
  code: string;
  label: string;
  present: boolean;
};

function parseDate(value: Date | string | number | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function hasValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function evaluateChecks<TInput>(
  input: TInput,
  definitions: CheckDefinition<TInput>[],
): HarnessCheck[] {
  return definitions.map(({ code, label, present }) => ({
    code,
    label,
    present: present(input),
  }));
}

function missingCodes(checks: HarnessCheck[]) {
  return checks.filter((check) => !check.present).map((check) => check.code);
}

function missingLabels(checks: HarnessCheck[]) {
  return checks.filter((check) => !check.present).map((check) => check.label);
}

const authorityChecks: CheckDefinition<
  z.output<typeof authorityHarnessInputSchema>
>[] = [
  {
    code: "AUTHORITY_COUNTRY_CODE_PRESENT",
    label: "country code",
    present: (input) => hasValue(input.countryCode),
  },
  {
    code: "AUTHORITY_COUNTRY_PACK_VERSION_PRESENT",
    label: "country-pack version",
    present: (input) => hasValue(input.countryPackVersion),
  },
  {
    code: "AUTHORITY_COUNTRY_PACK_PROOF_PRESENT",
    label: "country-pack resolution proof",
    present: (input) => hasValue(input.countryPackResolutionHash),
  },
  {
    code: "AUTHORITY_DECLARATION_TYPE_PRESENT",
    label: "declaration type",
    present: (input) => hasValue(input.declarationType),
  },
  {
    code: "AUTHORITY_MAPPING_SCHEMA_VERSION_PRESENT",
    label: "mapping schema version",
    present: (input) => hasValue(input.mappingSchemaVersion),
  },
  {
    code: "AUTHORITY_PAYLOAD_MAPPING_REVIEWED",
    label: "reviewed authority payload mapping",
    present: (input) => hasValue(input.payloadMappingHash),
  },
  {
    code: "AUTHORITY_RESPONSE_MAPPING_REVIEWED",
    label: "reviewed authority response mapping",
    present: (input) => hasValue(input.responseMappingHash),
  },
  {
    code: "AUTHORITY_STATUS_CODE_MAP_REVIEWED",
    label: "reviewed authority status code map",
    present: (input) => hasValue(input.authorityStatusCodeMapHash),
  },
  {
    code: "AUTHORITY_REJECTION_MAPPING_REVIEWED",
    label: "reviewed authority rejection mapping",
    present: (input) => hasValue(input.rejectionMappingHash),
  },
  {
    code: "AUTHORITY_AMENDMENT_MAPPING_REVIEWED",
    label: "reviewed authority amendment mapping",
    present: (input) => hasValue(input.amendmentMappingHash),
  },
  {
    code: "AUTHORITY_PAYMENT_DUE_MAPPING_REVIEWED",
    label: "reviewed authority payment-due mapping",
    present: (input) => hasValue(input.paymentDueMappingHash),
  },
  {
    code: "AUTHORITY_CREDENTIAL_PROOF_PRESENT",
    label: "credential proof reference",
    present: (input) => hasValue(input.credentialProofHash),
  },
  {
    code: "AUTHORITY_CREDENTIAL_ROTATION_REVIEWED",
    label: "credential rotation proof",
    present: (input) => hasValue(input.credentialRotationProofHash),
  },
  {
    code: "AUTHORITY_CREDENTIAL_SCOPE_REVIEWED",
    label: "least privilege credential scope proof",
    present: (input) => hasValue(input.credentialScopeProofHash),
  },
  {
    code: "AUTHORITY_REQUEST_HASH_PRESENT",
    label: "adapter request hash",
    present: (input) => hasValue(input.adapterRequestHash),
  },
  {
    code: "AUTHORITY_RESPONSE_RECEIPT_PRESENT",
    label: "authority response or receipt hash",
    present: (input) => hasValue(input.adapterResponseReceiptHash),
  },
  {
    code: "AUTHORITY_IDEMPOTENCY_KEY_PRESENT",
    label: "adapter idempotency key",
    present: (input) => hasValue(input.adapterIdempotencyKey),
  },
  {
    code: "AUTHORITY_IDEMPOTENCY_REPLAY_REVIEWED",
    label: "idempotent replay fixture",
    present: (input) => hasValue(input.idempotencyReplayFixtureHash),
  },
  {
    code: "AUTHORITY_DUPLICATE_RESPONSE_REVIEWED",
    label: "duplicate authority response fixture",
    present: (input) => hasValue(input.duplicateResponseFixtureHash),
  },
  {
    code: "AUTHORITY_DUPLICATE_TERMINAL_RESPONSE_REPLAY_REVIEWED",
    label: "duplicate terminal authority response replay fixture",
    present: (input) =>
      hasValue(input.duplicateTerminalResponseReplayFixtureHash),
  },
  {
    code: "AUTHORITY_OUTAGE_RUNBOOK_PRESENT",
    label: "authority outage runbook",
    present: (input) => hasValue(input.outageRunbookHash),
  },
  {
    code: "AUTHORITY_RETRY_POLICY_REVIEWED",
    label: "retry policy fixture",
    present: (input) => hasValue(input.retryPolicyFixtureHash),
  },
  {
    code: "AUTHORITY_DEAD_LETTER_TRIAGE_PRESENT",
    label: "dead-letter triage runbook",
    present: (input) => hasValue(input.deadLetterTriageRunbookHash),
  },
  {
    code: "AUTHORITY_AUDIT_TRAIL_REVIEWED",
    label: "audit trail fixture",
    present: (input) => hasValue(input.auditTrailFixtureHash),
  },
  {
    code: "AUTHORITY_REDACTION_REVIEWED",
    label: "redaction fixture",
    present: (input) => hasValue(input.redactionFixtureHash),
  },
  {
    code: "AUTHORITY_CLOSE_IMPACT_REVIEWED",
    label: "close impact rule proof",
    present: (input) => hasValue(input.closeImpactRuleHash),
  },
  {
    code: "AUTHORITY_LEGAL_REVIEW_PRESENT",
    label: "legal or regulator review proof",
    present: (input) => hasValue(input.legalReviewHash),
  },
];

const paymentChecks: CheckDefinition<
  z.output<typeof paymentHarnessInputSchema>
>[] = [
  {
    code: "PAYMENT_DISBURSEMENT_FILE_PRESENT",
    label: "payment disbursement file hash",
    present: (input) =>
      input.method !== PaymentMethod.BANK_TRANSFER &&
      input.method !== PaymentMethod.MOBILE_MONEY
        ? true
        : hasValue(input.bankFileHash),
  },
  {
    code: "PROVIDER_CREDENTIAL_PROOF_PRESENT",
    label: "provider credential proof reference",
    present: (input) => hasValue(input.providerCredentialProofHash),
  },
  {
    code: "PROVIDER_CREDENTIAL_ROTATION_REVIEWED",
    label: "provider credential rotation proof",
    present: (input) => hasValue(input.providerCredentialRotationProofHash),
  },
  {
    code: "PROVIDER_CREDENTIAL_SCOPE_REVIEWED",
    label: "least privilege provider credential scope proof",
    present: (input) => hasValue(input.providerCredentialScopeProofHash),
  },
  {
    code: "PROVIDER_PAYLOAD_MAPPING_REVIEWED",
    label: "reviewed provider payload mapping",
    present: (input) => hasValue(input.providerPayloadMappingHash),
  },
  {
    code: "PROVIDER_RESPONSE_MAPPING_REVIEWED",
    label: "reviewed provider response or settlement mapping",
    present: (input) => hasValue(input.providerResponseMappingHash),
  },
  {
    code: "PROVIDER_REVERSAL_MAPPING_REVIEWED",
    label: "reviewed provider reversal mapping",
    present: (input) => hasValue(input.providerReversalMappingHash),
  },
  {
    code: "PROVIDER_REQUEST_HASH_PRESENT",
    label: "provider request hash",
    present: (input) => hasValue(input.providerAdapterRequestHash),
  },
  {
    code: "PROVIDER_RESPONSE_HASH_PRESENT",
    label: "provider response hash",
    present: (input) => hasValue(input.providerAdapterResponseHash),
  },
  {
    code: "PROVIDER_SETTLEMENT_RECEIPT_PRESENT",
    label: "provider settlement receipt hash",
    present: (input) => hasValue(input.providerSettlementReceiptHash),
  },
  {
    code: "PROVIDER_IDEMPOTENCY_KEY_PRESENT",
    label: "provider idempotency key",
    present: (input) => hasValue(input.providerIdempotencyKey),
  },
  {
    code: "PROVIDER_IDEMPOTENCY_REPLAY_REVIEWED",
    label: "provider replay fixture",
    present: (input) => hasValue(input.providerReplayFixtureHash),
  },
  {
    code: "PROVIDER_DUPLICATE_RESPONSE_REVIEWED",
    label: "duplicate provider response fixture",
    present: (input) => hasValue(input.providerDuplicateResponseFixtureHash),
  },
  {
    code: "PROVIDER_OUTAGE_RUNBOOK_PRESENT",
    label: "provider outage runbook",
    present: (input) => hasValue(input.providerOutageRunbookHash),
  },
  {
    code: "PROVIDER_RETRY_POLICY_REVIEWED",
    label: "provider retry policy fixture",
    present: (input) => hasValue(input.providerRetryPolicyFixtureHash),
  },
  {
    code: "PROVIDER_DEAD_LETTER_TRIAGE_PRESENT",
    label: "provider dead-letter triage runbook",
    present: (input) => hasValue(input.providerDeadLetterTriageRunbookHash),
  },
  {
    code: "PROVIDER_AUDIT_TRAIL_REVIEWED",
    label: "provider audit trail fixture",
    present: (input) => hasValue(input.providerAuditTrailFixtureHash),
  },
  {
    code: "PROVIDER_REDACTION_REVIEWED",
    label: "provider redaction fixture",
    present: (input) => hasValue(input.providerRedactionFixtureHash),
  },
  {
    code: "PROVIDER_CLOSE_IMPACT_REVIEWED",
    label: "provider close impact rule proof",
    present: (input) => hasValue(input.providerCloseImpactRuleHash),
  },
];

export function certifyPayrollAuthorityAdapterHarness(
  input: PayrollAuthorityAdapterCertificationHarnessInput,
) {
  const parsed = authorityHarnessInputSchema.parse(input);
  const reviewedAt = parseDate(parsed.reviewedAt, new Date());
  const manualEnvironment = [
    "MANUAL_PORTAL",
    "MANUAL_EVIDENCE",
    "AUTHORITY_PORTAL",
  ].includes(parsed.authorityEnvironment.trim().toUpperCase());
  const checks = evaluateChecks(parsed, authorityChecks);
  const blockers = missingCodes(checks);
  if (manualEnvironment) blockers.push("AUTHORITY_ENVIRONMENT_IS_MANUAL_ONLY");
  if (parsed.requestedReadiness !== "SUPPORTED_CERTIFIED") {
    blockers.push("AUTHORITY_READINESS_NOT_SUPPORTED_CERTIFIED");
  }

  const certificationReady = blockers.length === 0;
  const certificate = {
    kind: "AQSTOQFLOW_PAYROLL_AUTHORITY_ADAPTER_CERTIFICATION_HARNESS",
    version: 1,
    authorityChannel: parsed.authorityChannel,
    authorityEnvironment: parsed.authorityEnvironment.trim().toUpperCase(),
    countryCode: parsed.countryCode ?? null,
    countryPackVersion: parsed.countryPackVersion ?? null,
    countryPackResolutionHash: parsed.countryPackResolutionHash ?? null,
    declarationType: parsed.declarationType ?? null,
    mappingSchemaVersion: parsed.mappingSchemaVersion,
    authorityAdapterKey: normalizePayrollAdapterKey(
      parsed.authorityAdapterKey ??
        `${parsed.authorityChannel}:PRODUCTION_ADAPTER`,
    ),
    requestedReadiness:
      parsed.requestedReadiness as PayrollAuthorityAdapterReadiness,
    certificationReady,
    blockers,
    requiredForCertification: missingLabels(checks),
    checks,
    reviewedBy: parsed.reviewedBy ?? null,
    reviewedAt: reviewedAt.toISOString(),
    proof: {
      payloadMappingHash: parsed.payloadMappingHash ?? null,
      responseMappingHash: parsed.responseMappingHash ?? null,
      authorityStatusCodeMapHash: parsed.authorityStatusCodeMapHash ?? null,
      rejectionMappingHash: parsed.rejectionMappingHash ?? null,
      amendmentMappingHash: parsed.amendmentMappingHash ?? null,
      paymentDueMappingHash: parsed.paymentDueMappingHash ?? null,
      credentialProofHash: parsed.credentialProofHash ?? null,
      credentialRotationProofHash: parsed.credentialRotationProofHash ?? null,
      credentialScopeProofHash: parsed.credentialScopeProofHash ?? null,
      adapterRequestHash: parsed.adapterRequestHash ?? null,
      adapterResponseReceiptHash: parsed.adapterResponseReceiptHash ?? null,
      adapterIdempotencyKey: parsed.adapterIdempotencyKey ?? null,
      adapterAttempt: parsed.adapterAttempt,
      idempotencyReplayFixtureHash: parsed.idempotencyReplayFixtureHash ?? null,
      duplicateResponseFixtureHash: parsed.duplicateResponseFixtureHash ?? null,
      duplicateTerminalResponseReplayFixtureHash:
        parsed.duplicateTerminalResponseReplayFixtureHash ?? null,
      outageRunbookHash: parsed.outageRunbookHash ?? null,
      retryPolicyFixtureHash: parsed.retryPolicyFixtureHash ?? null,
      deadLetterTriageRunbookHash: parsed.deadLetterTriageRunbookHash ?? null,
      auditTrailFixtureHash: parsed.auditTrailFixtureHash ?? null,
      redactionFixtureHash: parsed.redactionFixtureHash ?? null,
      closeImpactRuleHash: parsed.closeImpactRuleHash ?? null,
      legalReviewHash: parsed.legalReviewHash ?? null,
    },
    redactionPolicy:
      "Harness certificates store proof hashes, ids, statuses, and review metadata only; no raw salary, employee identity, authority payload, or credential secret is allowed.",
  };
  const certificationHarnessHash = certificationReady
    ? prefixedHash(certificate)
    : null;

  return {
    certificationReady,
    certificationHarnessHash,
    blockers,
    checks,
    certificate,
    registryInput: certificationHarnessHash
      ? {
          authorityChannel: parsed.authorityChannel,
          authorityEnvironment: parsed.authorityEnvironment,
          requestedAdapterKey: certificate.authorityAdapterKey,
          requestedReadiness: parsed.requestedReadiness,
          payloadMappingHash: parsed.payloadMappingHash,
          responseMappingHash: parsed.responseMappingHash,
          credentialProofHash: parsed.credentialProofHash,
          adapterRequestHash: parsed.adapterRequestHash,
          adapterResponseReceiptHash: parsed.adapterResponseReceiptHash,
          adapterIdempotencyKey: parsed.adapterIdempotencyKey,
          adapterAttempt: parsed.adapterAttempt,
          certificationHarnessHash,
        }
      : null,
  };
}

export function certifyPayrollPaymentProviderHarness(
  input: PayrollPaymentProviderCertificationHarnessInput,
) {
  const parsed = paymentHarnessInputSchema.parse(input);
  const reviewedAt = parseDate(parsed.reviewedAt, new Date());
  const checks = evaluateChecks(parsed, paymentChecks);
  const blockers = missingCodes(checks);
  if (parsed.requestedStatus !== "SUPPORTED_CERTIFIED") {
    blockers.push("PROVIDER_STATUS_NOT_SUPPORTED_CERTIFIED");
  }

  const certificationReady = blockers.length === 0;
  const certificate = {
    kind: "AQSTOQFLOW_PAYROLL_PAYMENT_PROVIDER_CERTIFICATION_HARNESS",
    version: 1,
    method: parsed.method,
    paymentProviderAdapterKey: normalizePayrollAdapterKey(
      parsed.paymentProviderAdapterKey ??
        `${parsed.method}:PRODUCTION_PROVIDER_ADAPTER`,
    ),
    requestedStatus: parsed.requestedStatus as PayrollPaymentAdapterStatus,
    certificationReady,
    blockers,
    requiredForCertification: missingLabels(checks),
    checks,
    reviewedBy: parsed.reviewedBy ?? null,
    reviewedAt: reviewedAt.toISOString(),
    proof: {
      bankFileHash: parsed.bankFileHash ?? null,
      providerCredentialProofHash: parsed.providerCredentialProofHash ?? null,
      providerCredentialRotationProofHash:
        parsed.providerCredentialRotationProofHash ?? null,
      providerCredentialScopeProofHash:
        parsed.providerCredentialScopeProofHash ?? null,
      providerPayloadMappingHash: parsed.providerPayloadMappingHash ?? null,
      providerResponseMappingHash: parsed.providerResponseMappingHash ?? null,
      providerReversalMappingHash: parsed.providerReversalMappingHash ?? null,
      providerAdapterRequestHash: parsed.providerAdapterRequestHash ?? null,
      providerAdapterResponseHash: parsed.providerAdapterResponseHash ?? null,
      providerSettlementReceiptHash:
        parsed.providerSettlementReceiptHash ?? null,
      providerIdempotencyKey: parsed.providerIdempotencyKey ?? null,
      providerAttempt: parsed.providerAttempt,
      providerReplayFixtureHash: parsed.providerReplayFixtureHash ?? null,
      providerDuplicateResponseFixtureHash:
        parsed.providerDuplicateResponseFixtureHash ?? null,
      providerOutageRunbookHash: parsed.providerOutageRunbookHash ?? null,
      providerRetryPolicyFixtureHash:
        parsed.providerRetryPolicyFixtureHash ?? null,
      providerDeadLetterTriageRunbookHash:
        parsed.providerDeadLetterTriageRunbookHash ?? null,
      providerAuditTrailFixtureHash:
        parsed.providerAuditTrailFixtureHash ?? null,
      providerRedactionFixtureHash: parsed.providerRedactionFixtureHash ?? null,
      providerCloseImpactRuleHash: parsed.providerCloseImpactRuleHash ?? null,
    },
    redactionPolicy:
      "Harness certificates store proof hashes, ids, statuses, and review metadata only; no raw salary, employee payment destination, provider payload, or credential secret is allowed.",
  };
  const providerCertificationHarnessHash = certificationReady
    ? prefixedHash(certificate)
    : null;

  return {
    certificationReady,
    providerCertificationHarnessHash,
    blockers,
    checks,
    certificate,
    registryInput: providerCertificationHarnessHash
      ? {
          method: parsed.method,
          bankFileHash: parsed.bankFileHash,
          requestedAdapterKey: certificate.paymentProviderAdapterKey,
          requestedStatus: parsed.requestedStatus,
          providerCredentialProofHash: parsed.providerCredentialProofHash,
          providerPayloadMappingHash: parsed.providerPayloadMappingHash,
          providerResponseMappingHash: parsed.providerResponseMappingHash,
          providerAdapterRequestHash: parsed.providerAdapterRequestHash,
          providerAdapterResponseHash: parsed.providerAdapterResponseHash,
          providerSettlementReceiptHash: parsed.providerSettlementReceiptHash,
          providerIdempotencyKey: parsed.providerIdempotencyKey,
          providerAttempt: parsed.providerAttempt,
          providerCertificationHarnessHash,
        }
      : null,
  };
}
