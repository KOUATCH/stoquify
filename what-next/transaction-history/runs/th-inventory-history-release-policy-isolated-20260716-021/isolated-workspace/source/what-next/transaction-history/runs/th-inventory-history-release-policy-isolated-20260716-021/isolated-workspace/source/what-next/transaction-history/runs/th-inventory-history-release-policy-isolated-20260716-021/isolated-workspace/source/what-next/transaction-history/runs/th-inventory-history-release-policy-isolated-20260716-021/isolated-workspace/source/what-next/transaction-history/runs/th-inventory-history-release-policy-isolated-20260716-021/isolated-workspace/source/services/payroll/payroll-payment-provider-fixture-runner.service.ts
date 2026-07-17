import "server-only";

import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

import { BusinessRuleError } from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";
import type { RecordPayrollPaymentSettlementInput } from "./payment-reconciliation.service";
import { normalizePayrollAdapterKey } from "./payroll-adapter-registry.service";

const idSchema = z.string().trim().min(1);
const hashSchema = z
  .string()
  .trim()
  .regex(/^sha256:[A-Za-z0-9_.:-]+$/);
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);

export const payrollPaymentProviderFixtureScenarioSchema = z.enum([
  "settled",
  "partially_settled",
  "reversed",
  "retryable_error",
  "failed",
]);

const payrollPaymentProviderFixtureConfigSchema = z.object({
  certificate: z.unknown(),
  providerCertificationHarnessHash: hashSchema,
  scenario: payrollPaymentProviderFixtureScenarioSchema.default("settled"),
  providerReference: idSchema.optional(),
  providerTransactionId: idSchema.optional(),
  providerEventId: idSchema.optional(),
  reversalReason: z.string().trim().min(1).max(1000).optional(),
  errorCode: idSchema.optional(),
  errorMessage: z.string().trim().min(1).max(1000).optional(),
  retryAfterSeconds: z.number().int().positive().max(86400).default(300),
  responseSummary: z.record(z.string(), z.unknown()).optional(),
});

const payrollPaymentProviderAdapterSubmitInputSchema = z.object({
  organizationId: idSchema,
  payrollPaymentBatchId: idSchema,
  payrollRunId: idSchema.optional(),
  method: z.nativeEnum(PaymentMethod),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: idSchema,
  paymentProviderAdapterKey: idSchema,
  paymentAdapterProofHash: hashSchema,
  paymentProviderAdapterContractHash: hashSchema,
  providerCertificationHarnessHash: hashSchema,
  adapterChaosReleaseGateHash: hashSchema.optional().nullable(),
  paymentDisbursementFileHash: hashSchema.optional().nullable(),
  providerCredentialProofHash: hashSchema,
  providerPayloadMappingHash: hashSchema,
  providerResponseMappingHash: hashSchema,
  providerAdapterRequestHash: hashSchema,
  providerAdapterResponseHash: hashSchema,
  providerSettlementReceiptHash: hashSchema,
  providerIdempotencyKey: idSchema,
  providerAttempt: z.number().int().positive().max(100).default(1),
  productionPaymentAutomationSupported: z.boolean(),
  sourceRegisterHash: hashSchema.optional(),
  providerEvidence: z
    .object({
      providerEventRecordId: idSchema.optional(),
      providerEventId: idSchema.optional(),
      providerTransactionId: idSchema.optional(),
      providerReference: idSchema.optional(),
      statementLineId: idSchema.optional(),
      statementFileHash: hashSchema.optional(),
      rawPayloadHash: hashSchema.optional(),
      rawLineHash: hashSchema.optional(),
    })
    .optional(),
  now: dateInputSchema.optional(),
});

export type PayrollPaymentProviderFixtureScenario = z.infer<
  typeof payrollPaymentProviderFixtureScenarioSchema
>;
export type PayrollPaymentProviderFixtureConfig = z.input<
  typeof payrollPaymentProviderFixtureConfigSchema
>;
export type PayrollPaymentProviderAdapterSubmitInput = z.input<
  typeof payrollPaymentProviderAdapterSubmitInputSchema
>;

export type PayrollPaymentProviderSettlementOutcome = {
  status: "settled" | "partially_settled";
  settlementStatus: "settled" | "partially_settled";
  amount: string;
  currency: string;
  providerEventId: string;
  providerTransactionId: string;
  providerReference: string;
  providerResponseHash: string;
  providerSettlementReceiptHash: string;
  settlementEvidenceHash: string;
  providerIdempotencyKey: string;
  responseSummary: Record<string, unknown>;
};

export type PayrollPaymentProviderReversalOutcome = {
  status: "reversed";
  providerEventId: string;
  providerTransactionId: string;
  providerReference: string;
  providerResponseHash: string;
  reversalReceiptHash: string;
  reversalReason: string;
  providerIdempotencyKey: string;
  responseSummary: Record<string, unknown>;
};

export type PayrollPaymentProviderErrorOutcome =
  | {
      status: "retryable_error";
      errorCode: string;
      errorMessage: string;
      providerResponseHash: string;
      retryAfterSeconds: number;
      providerIdempotencyKey: string;
      responseSummary: Record<string, unknown>;
    }
  | {
      status: "failed";
      errorCode: string;
      errorMessage: string;
      providerResponseHash: string;
      providerIdempotencyKey: string;
      responseSummary: Record<string, unknown>;
    };

export type PayrollPaymentProviderAdapterOutcome =
  | PayrollPaymentProviderSettlementOutcome
  | PayrollPaymentProviderReversalOutcome
  | PayrollPaymentProviderErrorOutcome;

export type PayrollPaymentProviderAdapter = {
  submit(
    input: PayrollPaymentProviderAdapterSubmitInput,
  ): Promise<PayrollPaymentProviderAdapterOutcome>;
};

const REQUIRED_PROVIDER_PROOF_FIELDS = [
  "bankFileHash",
  "providerCredentialProofHash",
  "providerCredentialRotationProofHash",
  "providerCredentialScopeProofHash",
  "providerPayloadMappingHash",
  "providerResponseMappingHash",
  "providerReversalMappingHash",
  "providerAdapterRequestHash",
  "providerAdapterResponseHash",
  "providerSettlementReceiptHash",
  "providerIdempotencyKey",
  "providerReplayFixtureHash",
  "providerDuplicateResponseFixtureHash",
  "providerOutageRunbookHash",
  "providerRetryPolicyFixtureHash",
  "providerDeadLetterTriageRunbookHash",
  "providerAuditTrailFixtureHash",
  "providerRedactionFixtureHash",
  "providerCloseImpactRuleHash",
] as const;

const SENSITIVE_RESPONSE_SUMMARY_KEY_PATTERN =
  /(raw|payload|body|secret|credential|salary|employee|bank|account|token|destination|phone|msisdn)/i;

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

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeSettlementAmount(value: string | number | undefined) {
  const raw = typeof value === "number" ? value.toFixed(2) : value?.trim();
  if (!raw) {
    throw new BusinessRuleError(
      "Payroll payment provider fixture requires settlement amount proof.",
    );
  }
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new BusinessRuleError(
      "Payroll payment provider fixture settlement amount proof must be a positive money value with at most two decimals.",
    );
  }
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BusinessRuleError(
      "Payroll payment provider fixture settlement amount proof must be positive.",
    );
  }
  return amount.toFixed(2);
}

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

function requireCertificateValue(
  certificate: Record<string, unknown>,
  field: string,
) {
  const value = asString(certificate[field]);
  if (!value) {
    throw new BusinessRuleError(
      `Payroll payment provider fixture certificate is missing ${field}.`,
    );
  }
  return value;
}

function requireProofValue(proof: Record<string, unknown>, field: string) {
  const value = asString(proof[field]);
  if (!value) {
    throw new BusinessRuleError(
      `Payroll payment provider fixture certificate is missing proof ${field}.`,
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
      `Payroll payment provider fixture certificate does not match payment proof ${label}.`,
    );
  }
}

function assertCertifiedProviderFixtureCertificate(input: {
  certificate: unknown;
  providerCertificationHarnessHash: string;
  submit: z.output<typeof payrollPaymentProviderAdapterSubmitInputSchema>;
}) {
  const certificate = asRecord(input.certificate);
  const proof = asRecord(certificate.proof);

  if (
    certificate.kind !== "AQSTOQFLOW_PAYROLL_PAYMENT_PROVIDER_CERTIFICATION_HARNESS"
  ) {
    throw new BusinessRuleError(
      "Payroll payment provider fixture requires a payment provider certification harness certificate.",
    );
  }
  if (certificate.certificationReady !== true) {
    throw new BusinessRuleError(
      "Payroll payment provider fixture requires certificationReady evidence.",
    );
  }
  if (Array.isArray(certificate.blockers) && certificate.blockers.length > 0) {
    throw new BusinessRuleError(
      "Payroll payment provider fixture certificate still has certification blockers.",
    );
  }
  if (!input.submit.productionPaymentAutomationSupported) {
    throw new BusinessRuleError(
      "Payroll payment provider fixture requires production payment automation proof on the released batch.",
    );
  }

  for (const field of REQUIRED_PROVIDER_PROOF_FIELDS) {
    requireProofValue(proof, field);
  }

  assertSameProof(
    "method",
    input.submit.method,
    requireCertificateValue(certificate, "method"),
  );
  assertSameProof(
    "adapter key",
    normalizePayrollAdapterKey(input.submit.paymentProviderAdapterKey),
    normalizePayrollAdapterKey(
      requireCertificateValue(certificate, "paymentProviderAdapterKey"),
    ),
  );
  assertSameProof(
    "provider certification harness hash",
    input.submit.providerCertificationHarnessHash,
    input.providerCertificationHarnessHash,
  );
  assertSameProof(
    "payment disbursement file hash",
    input.submit.paymentDisbursementFileHash ?? "",
    requireProofValue(proof, "bankFileHash"),
  );
  assertSameProof(
    "provider credential proof hash",
    input.submit.providerCredentialProofHash,
    requireProofValue(proof, "providerCredentialProofHash"),
  );
  assertSameProof(
    "provider payload mapping hash",
    input.submit.providerPayloadMappingHash,
    requireProofValue(proof, "providerPayloadMappingHash"),
  );
  assertSameProof(
    "provider response mapping hash",
    input.submit.providerResponseMappingHash,
    requireProofValue(proof, "providerResponseMappingHash"),
  );
  assertSameProof(
    "provider adapter request hash",
    input.submit.providerAdapterRequestHash,
    requireProofValue(proof, "providerAdapterRequestHash"),
  );
  assertSameProof(
    "provider adapter response hash",
    input.submit.providerAdapterResponseHash,
    requireProofValue(proof, "providerAdapterResponseHash"),
  );
  assertSameProof(
    "provider settlement receipt hash",
    input.submit.providerSettlementReceiptHash,
    requireProofValue(proof, "providerSettlementReceiptHash"),
  );
  assertSameProof(
    "provider idempotency key",
    input.submit.providerIdempotencyKey,
    requireProofValue(proof, "providerIdempotencyKey"),
  );

  const providerAttempt = asNumber(proof.providerAttempt) ?? 1;
  if (providerAttempt !== input.submit.providerAttempt) {
    throw new BusinessRuleError(
      "Payroll payment provider fixture certificate does not match payment proof provider attempt.",
    );
  }

  return {
    providerReversalMappingHash: requireProofValue(
      proof,
      "providerReversalMappingHash",
    ),
  };
}

function fixtureIds(input: {
  submit: z.output<typeof payrollPaymentProviderAdapterSubmitInputSchema>;
  scenario: PayrollPaymentProviderFixtureScenario;
  providerCertificationHarnessHash: string;
  providerReference?: string;
  providerTransactionId?: string;
  providerEventId?: string;
}) {
  const stableSuffix = prefixedHash({
    kind: "payroll-payment-provider-fixture-id",
    scenario: input.scenario,
    payrollPaymentBatchId: input.submit.payrollPaymentBatchId,
    providerIdempotencyKey: input.submit.providerIdempotencyKey,
    providerCertificationHarnessHash: input.providerCertificationHarnessHash,
  }).replace(/^sha256:/, "");

  return {
    providerReference:
      input.providerReference ??
      input.submit.providerEvidence?.providerReference ??
      `PAYROLL-PROVIDER-REF-${stableSuffix}`,
    providerTransactionId:
      input.providerTransactionId ??
      input.submit.providerEvidence?.providerTransactionId ??
      `PAYROLL-PROVIDER-TX-${stableSuffix}`,
    providerEventId:
      input.providerEventId ??
      input.submit.providerEvidence?.providerEventId ??
      `PAYROLL-PROVIDER-EVENT-${stableSuffix}`,
  };
}

function fixtureHashes(input: {
  submit: z.output<typeof payrollPaymentProviderAdapterSubmitInputSchema>;
  scenario: PayrollPaymentProviderFixtureScenario;
  providerCertificationHarnessHash: string;
}) {
  const base = {
    payrollPaymentBatchId: input.submit.payrollPaymentBatchId,
    paymentProviderAdapterKey: input.submit.paymentProviderAdapterKey,
    providerIdempotencyKey: input.submit.providerIdempotencyKey,
    providerSettlementReceiptHash: input.submit.providerSettlementReceiptHash,
    providerCertificationHarnessHash: input.providerCertificationHarnessHash,
    scenario: input.scenario,
  };
  return {
    providerResponseHash: prefixedHash({
      kind: "payroll-payment-provider-fixture-response",
      ...base,
    }),
    settlementEvidenceHash: prefixedHash({
      kind: "payroll-payment-provider-fixture-settlement-evidence",
      ...base,
    }),
    reversalReceiptHash: prefixedHash({
      kind: "payroll-payment-provider-fixture-reversal-receipt",
      ...base,
    }),
  };
}

export async function runPayrollPaymentProviderFixture(
  input: PayrollPaymentProviderAdapterSubmitInput & PayrollPaymentProviderFixtureConfig,
): Promise<PayrollPaymentProviderAdapterOutcome> {
  const submit = payrollPaymentProviderAdapterSubmitInputSchema.parse(input);
  const config = payrollPaymentProviderFixtureConfigSchema.parse(input);
  const now = parseDate(submit.now, new Date());
  const certificate = assertCertifiedProviderFixtureCertificate({
    certificate: config.certificate,
    providerCertificationHarnessHash: config.providerCertificationHarnessHash,
    submit,
  });
  const ids = fixtureIds({
    submit,
    scenario: config.scenario,
    providerCertificationHarnessHash: config.providerCertificationHarnessHash,
    providerReference: config.providerReference,
    providerTransactionId: config.providerTransactionId,
    providerEventId: config.providerEventId,
  });
  const hashes = fixtureHashes({
    submit,
    scenario: config.scenario,
    providerCertificationHarnessHash: config.providerCertificationHarnessHash,
  });
  const settlementAmount = normalizeSettlementAmount(submit.amount);
  const responseSummary = redactedSummary({
    ...asRecord(config.responseSummary),
    providerStatus: config.scenario.toUpperCase(),
    fixtureScenario: config.scenario,
    method: submit.method,
    amount: settlementAmount,
    currency: submit.currency,
    paymentProviderAdapterKey: submit.paymentProviderAdapterKey,
    paymentAdapterProofHash: submit.paymentAdapterProofHash,
    paymentProviderAdapterContractHash: submit.paymentProviderAdapterContractHash,
    providerCertificationHarnessHash: config.providerCertificationHarnessHash,
    adapterChaosReleaseGateHash: submit.adapterChaosReleaseGateHash ?? null,
    providerReversalMappingHash: certificate.providerReversalMappingHash,
    occurredAt: now.toISOString(),
  });

  if (config.scenario === "retryable_error") {
    return {
      status: "retryable_error",
      errorCode: config.errorCode ?? "FIXTURE_PROVIDER_RETRYABLE_ERROR",
      errorMessage:
        config.errorMessage ??
        "Certified payroll payment provider fixture requested a retry.",
      providerResponseHash: hashes.providerResponseHash,
      retryAfterSeconds: config.retryAfterSeconds,
      providerIdempotencyKey: submit.providerIdempotencyKey,
      responseSummary,
    };
  }

  if (config.scenario === "failed") {
    return {
      status: "failed",
      errorCode: config.errorCode ?? "FIXTURE_PROVIDER_FAILURE",
      errorMessage:
        config.errorMessage ??
        "Certified payroll payment provider fixture returned a terminal failure.",
      providerResponseHash: hashes.providerResponseHash,
      providerIdempotencyKey: submit.providerIdempotencyKey,
      responseSummary,
    };
  }

  if (config.scenario === "reversed") {
    return {
      status: "reversed",
      ...ids,
      providerResponseHash: hashes.providerResponseHash,
      reversalReceiptHash: hashes.reversalReceiptHash,
      reversalReason:
        config.reversalReason ?? "FIXTURE_PROVIDER_REVERSAL_CONFIRMED",
      providerIdempotencyKey: submit.providerIdempotencyKey,
      responseSummary,
    };
  }

  const settlementStatus =
    config.scenario === "partially_settled" ? "partially_settled" : "settled";
  return {
    status: settlementStatus,
    settlementStatus,
    amount: settlementAmount,
    currency: submit.currency,
    ...ids,
    providerResponseHash: hashes.providerResponseHash,
    providerSettlementReceiptHash: submit.providerSettlementReceiptHash,
    settlementEvidenceHash: hashes.settlementEvidenceHash,
    providerIdempotencyKey: submit.providerIdempotencyKey,
    responseSummary,
  };
}

export function createPayrollPaymentProviderFixtureAdapter(
  config: PayrollPaymentProviderFixtureConfig,
): PayrollPaymentProviderAdapter {
  const parsed = payrollPaymentProviderFixtureConfigSchema.parse(config);
  return {
    async submit(input) {
      return runPayrollPaymentProviderFixture({
        ...input,
        ...parsed,
      });
    },
  };
}

export function payrollSettlementEvidenceInputFromProviderOutcome(input: {
  outcome: PayrollPaymentProviderAdapterOutcome;
  organizationId: string;
  payrollPaymentBatchId: string;
  actorId?: string | null;
  actorPermissions: string[];
  approvedById?: string;
  matchRecordId?: string;
  reconciliationRunId?: string;
  sourceRegisterHash: string;
  lastAuthAt?: Date | string | number;
  now?: Date | string | number;
}): RecordPayrollPaymentSettlementInput {
  if (
    input.outcome.status !== "settled" &&
    input.outcome.status !== "partially_settled"
  ) {
    throw new BusinessRuleError(
      "Only settled payroll payment provider outcomes can become settlement evidence.",
    );
  }

  return {
    organizationId: input.organizationId,
    payrollPaymentBatchId: input.payrollPaymentBatchId,
    actorId: input.actorId ?? undefined,
    actorPermissions: input.actorPermissions,
    settlementStatus: input.outcome.settlementStatus,
    providerTransactionId: input.outcome.providerTransactionId,
    providerReference: input.outcome.providerReference,
    providerEventId: input.outcome.providerEventId,
    matchRecordId: input.matchRecordId,
    reconciliationRunId: input.reconciliationRunId,
    evidenceHash: input.outcome.settlementEvidenceHash,
    sourceRegisterHash: input.sourceRegisterHash,
    approvedById: input.approvedById,
    idempotencyKey: input.outcome.providerIdempotencyKey,
    lastAuthAt: input.lastAuthAt,
    now: input.now,
    metadata: {
      workflowSource: "payroll.payment_provider_fixture",
      providerResponseHash: input.outcome.providerResponseHash,
      providerSettlementReceiptHash:
        input.outcome.providerSettlementReceiptHash,
      providerSettlementAmount: input.outcome.amount,
      providerSettlementCurrency: input.outcome.currency,
      redactedResponseSummary: input.outcome.responseSummary,
    },
  };
}
