import "server-only";

import { z } from "zod";

import { BusinessRuleError } from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";
import type { PayrollAuthorityAdapterExecutionRecord } from "./authority-adapter-execution.service";
import {
  type PayrollAuthorityAdapter,
  type PayrollAuthorityAdapterOutcome,
  type PayrollAuthorityAdapterSubmitInput,
} from "./authority-adapter-worker.service";
import { normalizePayrollAdapterKey } from "./payroll-adapter-registry.service";

const idSchema = z.string().trim().min(1);
const hashSchema = z
  .string()
  .trim()
  .regex(/^sha256:[A-Za-z0-9_.:-]+$/);

export const payrollAuthorityAdapterFixtureScenarioSchema = z.enum([
  "accepted",
  "rejected",
  "payment_due",
  "amendment_required",
  "retryable_error",
  "failed",
]);

const payrollAuthorityAdapterFixtureConfigSchema = z.object({
  certificate: z.unknown(),
  certificationHarnessHash: hashSchema,
  scenario: payrollAuthorityAdapterFixtureScenarioSchema.default("accepted"),
  authorityReference: idSchema.optional(),
  rejectionReason: z.string().trim().min(1).max(1000).optional(),
  amendmentReason: z.string().trim().min(1).max(1000).optional(),
  errorCode: idSchema.optional(),
  errorMessage: z.string().trim().min(1).max(1000).optional(),
  retryAfterSeconds: z.number().int().positive().max(86400).default(300),
  responseSummary: z.record(z.string(), z.unknown()).optional(),
});

export type PayrollAuthorityAdapterFixtureScenario = z.infer<
  typeof payrollAuthorityAdapterFixtureScenarioSchema
>;
export type PayrollAuthorityAdapterFixtureConfig = z.input<
  typeof payrollAuthorityAdapterFixtureConfigSchema
>;

const REQUIRED_CERTIFICATE_PROOF_FIELDS = [
  "payloadMappingHash",
  "responseMappingHash",
  "authorityStatusCodeMapHash",
  "rejectionMappingHash",
  "amendmentMappingHash",
  "paymentDueMappingHash",
  "credentialProofHash",
  "credentialRotationProofHash",
  "credentialScopeProofHash",
  "adapterRequestHash",
  "adapterResponseReceiptHash",
  "adapterIdempotencyKey",
  "idempotencyReplayFixtureHash",
  "duplicateResponseFixtureHash",
  "duplicateTerminalResponseReplayFixtureHash",
  "outageRunbookHash",
  "retryPolicyFixtureHash",
  "deadLetterTriageRunbookHash",
  "auditTrailFixtureHash",
  "redactionFixtureHash",
  "closeImpactRuleHash",
  "legalReviewHash",
] as const;

const SENSITIVE_RESPONSE_SUMMARY_KEY_PATTERN =
  /(raw|payload|body|secret|credential|salary|employee|bank|account|token)/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function safeSummaryValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => safeSummaryValue(entry));
  return "[REDACTED:SUMMARY_OBJECT]";
}

function redactedSummary(value: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};
  const suppressedFields: string[] = [];
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_RESPONSE_SUMMARY_KEY_PATTERN.test(key)) {
      suppressedFields.push(key);
      continue;
    }
    sanitized[key] = safeSummaryValue(entry);
  }
  return {
    ...sanitized,
    redacted: true,
    ...(suppressedFields.length > 0 ? { suppressedFields } : {}),
  };
}

function normalize(value: string | null) {
  return value ? value.trim().toUpperCase() : null;
}

function requireCertificateValue(
  certificate: Record<string, unknown>,
  field: string,
) {
  const value = asString(certificate[field]);
  if (!value) {
    throw new BusinessRuleError(
      `Payroll authority adapter fixture certificate is missing ${field}.`,
    );
  }
  return value;
}

function requireProofValue(proof: Record<string, unknown>, field: string) {
  const value = asString(proof[field]);
  if (!value) {
    throw new BusinessRuleError(
      `Payroll authority adapter fixture certificate is missing proof ${field}.`,
    );
  }
  return value;
}

function assertSameProof(
  label: string,
  executionValue: string,
  certificateValue: string,
) {
  if (executionValue !== certificateValue) {
    throw new BusinessRuleError(
      `Payroll authority adapter fixture certificate does not match execution ${label}.`,
    );
  }
}

function assertCertifiedFixtureCertificate(input: {
  certificate: unknown;
  certificationHarnessHash: string;
  execution: PayrollAuthorityAdapterExecutionRecord;
}) {
  const certificate = asRecord(input.certificate);
  const proof = asRecord(certificate.proof);

  if (
    certificate.kind !==
    "AQSTOQFLOW_PAYROLL_AUTHORITY_ADAPTER_CERTIFICATION_HARNESS"
  ) {
    throw new BusinessRuleError(
      "Payroll authority adapter fixture requires an authority adapter certification harness certificate.",
    );
  }
  if (certificate.certificationReady !== true) {
    throw new BusinessRuleError(
      "Payroll authority adapter fixture requires certificationReady evidence.",
    );
  }
  if (Array.isArray(certificate.blockers) && certificate.blockers.length > 0) {
    throw new BusinessRuleError(
      "Payroll authority adapter fixture certificate still has certification blockers.",
    );
  }
  if (prefixedHash(certificate) !== input.certificationHarnessHash) {
    throw new BusinessRuleError(
      "Payroll authority adapter fixture certificate hash does not match the supplied certification harness hash.",
    );
  }

  const executionProofEnvelope = {
    ...asRecord(input.execution),
    ...asRecord(input.execution.authorityCertificationProofEnvelope),
  };
  for (const field of REQUIRED_CERTIFICATE_PROOF_FIELDS) {
    const proofValue = requireProofValue(proof, field);
    assertSameProof(
      `authority certification proof envelope ${field}`,
      requireProofValue(executionProofEnvelope, field),
      proofValue,
    );
  }

  assertSameProof(
    "country code",
    input.execution.countryCode,
    requireCertificateValue(certificate, "countryCode"),
  );
  assertSameProof(
    "country pack version",
    input.execution.countryPackVersion,
    requireCertificateValue(certificate, "countryPackVersion"),
  );
  assertSameProof(
    "country pack resolution hash",
    input.execution.countryPackResolutionHash,
    requireCertificateValue(certificate, "countryPackResolutionHash"),
  );
  assertSameProof(
    "declaration type",
    input.execution.declarationType,
    requireCertificateValue(certificate, "declarationType"),
  );
  assertSameProof(
    "authority channel",
    normalize(input.execution.authorityChannel) ?? "",
    normalize(requireCertificateValue(certificate, "authorityChannel")) ?? "",
  );
  assertSameProof(
    "authority environment",
    normalize(input.execution.authorityEnvironment) ?? "",
    normalize(requireCertificateValue(certificate, "authorityEnvironment")) ??
      "",
  );
  assertSameProof(
    "adapter key",
    normalizePayrollAdapterKey(input.execution.authorityAdapterKey),
    normalizePayrollAdapterKey(
      requireCertificateValue(certificate, "authorityAdapterKey"),
    ),
  );
  assertSameProof(
    "certification harness hash",
    input.execution.authorityCertificationHarnessHash,
    input.certificationHarnessHash,
  );
  assertSameProof(
    "payload mapping hash",
    input.execution.payloadMappingHash,
    requireProofValue(proof, "payloadMappingHash"),
  );
  assertSameProof(
    "response mapping hash",
    input.execution.responseMappingHash,
    requireProofValue(proof, "responseMappingHash"),
  );
  assertSameProof(
    "credential proof hash",
    input.execution.credentialProofHash,
    requireProofValue(proof, "credentialProofHash"),
  );
  assertSameProof(
    "adapter request hash",
    input.execution.adapterRequestHash,
    requireProofValue(proof, "adapterRequestHash"),
  );
  assertSameProof(
    "adapter response receipt hash",
    input.execution.adapterResponseReceiptHash,
    requireProofValue(proof, "adapterResponseReceiptHash"),
  );
  assertSameProof(
    "adapter idempotency key",
    input.execution.adapterIdempotencyKey,
    requireProofValue(proof, "adapterIdempotencyKey"),
  );

  return {
    mappingSchemaVersion: requireCertificateValue(
      certificate,
      "mappingSchemaVersion",
    ),
  };
}

function fixtureAuthorityReference(
  execution: PayrollAuthorityAdapterExecutionRecord,
  authorityReference?: string,
) {
  return (
    authorityReference ??
    execution.authorityReference ??
    `PAYROLL-FIXTURE-${execution.declarationEvidenceId}`
  );
}

function fixtureHashes(input: {
  execution: PayrollAuthorityAdapterExecutionRecord;
  scenario: PayrollAuthorityAdapterFixtureScenario;
  certificationHarnessHash: string;
  now: Date;
}) {
  const responseHash = prefixedHash({
    kind: "payroll-authority-fixture-response",
    scenario: input.scenario,
    declarationEvidenceId: input.execution.declarationEvidenceId,
    adapterIdempotencyKey: input.execution.adapterIdempotencyKey,
    certificationHarnessHash: input.certificationHarnessHash,
    occurredAt: input.now.toISOString(),
  });
  const receiptHash = prefixedHash({
    kind: "payroll-authority-fixture-receipt",
    scenario: input.scenario,
    declarationEvidenceId: input.execution.declarationEvidenceId,
    adapterIdempotencyKey: input.execution.adapterIdempotencyKey,
    certificationHarnessHash: input.certificationHarnessHash,
  });
  return { responseHash, receiptHash };
}

export async function runPayrollAuthorityAdapterFixture(
  input: PayrollAuthorityAdapterSubmitInput & PayrollAuthorityAdapterFixtureConfig,
): Promise<PayrollAuthorityAdapterOutcome> {
  const parsed = payrollAuthorityAdapterFixtureConfigSchema.parse(input);
  const certificate = assertCertifiedFixtureCertificate({
    certificate: parsed.certificate,
    certificationHarnessHash: parsed.certificationHarnessHash,
    execution: input.execution,
  });
  const { responseHash, receiptHash } = fixtureHashes({
    execution: input.execution,
    scenario: parsed.scenario,
    certificationHarnessHash: parsed.certificationHarnessHash,
    now: input.now,
  });
  const authorityReference = fixtureAuthorityReference(
    input.execution,
    parsed.authorityReference,
  );
  const responseSummary = redactedSummary({
    ...asRecord(parsed.responseSummary),
    authorityStatus: parsed.scenario.toUpperCase(),
    fixtureScenario: parsed.scenario,
    countryCode: input.execution.countryCode,
    countryPackVersion: input.execution.countryPackVersion,
    countryPackResolutionHash: input.execution.countryPackResolutionHash,
    declarationType: input.execution.declarationType,
    mappingSchemaVersion: certificate.mappingSchemaVersion,
    certificationHarnessHash: parsed.certificationHarnessHash,
    occurredAt: input.now.toISOString(),
  });

  switch (parsed.scenario) {
    case "rejected":
      return {
        status: "rejected",
        authorityReference,
        responseHash,
        rejectionReason:
          parsed.rejectionReason ?? "FIXTURE_AUTHORITY_REJECTION",
        responseSummary,
      };
    case "payment_due":
      return {
        status: "payment_due",
        authorityReference,
        responseHash,
        receiptHash,
        responseSummary,
      };
    case "amendment_required":
      return {
        status: "amendment_required",
        authorityReference,
        responseHash,
        receiptHash,
        amendmentReason:
          parsed.amendmentReason ??
          "FIXTURE_AUTHORITY_AMENDMENT_REQUIRED",
        responseSummary,
      };
    case "retryable_error":
      return {
        status: "retryable_error",
        errorCode: parsed.errorCode ?? "FIXTURE_AUTHORITY_RETRYABLE_ERROR",
        errorMessage:
          parsed.errorMessage ??
          "Certified payroll authority fixture requested a retry.",
        responseHash,
        retryAfterSeconds: parsed.retryAfterSeconds,
        responseSummary,
      };
    case "failed":
      return {
        status: "failed",
        errorCode: parsed.errorCode ?? "FIXTURE_AUTHORITY_FAILURE",
        errorMessage:
          parsed.errorMessage ??
          "Certified payroll authority fixture returned a terminal failure.",
        responseHash,
        responseSummary,
      };
    case "accepted":
    default:
      return {
        status: "accepted",
        authorityReference,
        responseHash,
        receiptHash,
        responseSummary,
      };
  }
}

export function createPayrollAuthorityFixtureAdapter(
  config: PayrollAuthorityAdapterFixtureConfig,
): PayrollAuthorityAdapter {
  const parsed = payrollAuthorityAdapterFixtureConfigSchema.parse(config);
  return {
    async submit(input) {
      return runPayrollAuthorityAdapterFixture({
        ...input,
        ...parsed,
      });
    },
  };
}
