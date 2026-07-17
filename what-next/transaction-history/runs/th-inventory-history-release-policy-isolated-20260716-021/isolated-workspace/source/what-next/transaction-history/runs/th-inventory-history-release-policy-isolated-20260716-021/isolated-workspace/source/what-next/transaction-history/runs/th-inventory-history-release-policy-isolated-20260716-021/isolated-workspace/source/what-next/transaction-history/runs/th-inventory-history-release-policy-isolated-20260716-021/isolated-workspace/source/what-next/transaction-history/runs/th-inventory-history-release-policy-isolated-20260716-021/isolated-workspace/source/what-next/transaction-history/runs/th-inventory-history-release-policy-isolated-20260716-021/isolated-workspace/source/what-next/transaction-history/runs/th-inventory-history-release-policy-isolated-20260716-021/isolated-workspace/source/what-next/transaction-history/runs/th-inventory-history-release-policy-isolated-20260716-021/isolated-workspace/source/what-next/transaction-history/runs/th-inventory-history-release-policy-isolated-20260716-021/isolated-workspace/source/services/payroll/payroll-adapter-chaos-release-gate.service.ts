import "server-only";

import { z } from "zod";

import { BusinessRuleError } from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";
import type { PayrollAuthorityAdapterExecutionRecord } from "./authority-adapter-execution.service";
import type {
  PayrollAuthorityAdapterOutcome,
  PayrollAuthorityAdapterSubmitInput,
} from "./authority-adapter-worker.service";
import {
  payrollAuthorityAdapterFixtureScenarioSchema,
  runPayrollAuthorityAdapterFixture,
  type PayrollAuthorityAdapterFixtureScenario,
} from "./payroll-authority-adapter-fixture-runner.service";
import {
  payrollPaymentProviderFixtureScenarioSchema,
  payrollSettlementEvidenceInputFromProviderOutcome,
  runPayrollPaymentProviderFixture,
  type PayrollPaymentProviderAdapterOutcome,
  type PayrollPaymentProviderAdapterSubmitInput,
  type PayrollPaymentProviderFixtureScenario,
} from "./payroll-payment-provider-fixture-runner.service";

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

const requiredAuthorityScenarios = [
  "accepted",
  "rejected",
  "payment_due",
  "amendment_required",
  "retryable_error",
  "failed",
] as const satisfies readonly PayrollAuthorityAdapterFixtureScenario[];

const requiredProviderScenarios = [
  "settled",
  "partially_settled",
  "reversed",
  "retryable_error",
  "failed",
] as const satisfies readonly PayrollPaymentProviderFixtureScenario[];

const payrollAdapterChaosReleaseGateInputSchema = z.object({
  organizationId: idSchema,
  asOf: dateInputSchema.optional(),
  authority: z.object({
    certificate: z.unknown(),
    certificationHarnessHash: hashSchema,
    execution: z.custom<PayrollAuthorityAdapterExecutionRecord>(),
    scenarios: z
      .array(payrollAuthorityAdapterFixtureScenarioSchema)
      .default([...requiredAuthorityScenarios]),
  }),
  provider: z.object({
    certificate: z.unknown(),
    providerCertificationHarnessHash: hashSchema,
    submit: z.custom<PayrollPaymentProviderAdapterSubmitInput>(),
    scenarios: z
      .array(payrollPaymentProviderFixtureScenarioSchema)
      .default([...requiredProviderScenarios]),
  }),
});

export type PayrollAdapterChaosReleaseGateInput = z.input<
  typeof payrollAdapterChaosReleaseGateInputSchema
>;

type AdapterChaosState = "PASSED" | "BLOCKED";

type AdapterChaosScenarioResult = {
  domain: "authority" | "provider";
  scenario: string;
  state: AdapterChaosState;
  outcomeStatus: string | null;
  responseHash: string | null;
  receiptHash: string | null;
  replayStable: boolean;
  responseSummaryRedacted: boolean;
  suppressedFieldCount: number;
  sensitiveSummaryLeakDetected: boolean;
  settlementEvidenceConvertible: boolean | null;
  blockerCodes: string[];
  errorCode: string | null;
};

type AdapterChaosSummary = {
  authorityScenariosRequired: number;
  authorityScenariosPassed: number;
  providerScenariosRequired: number;
  providerScenariosPassed: number;
  replayStable: boolean;
  redactionClean: boolean;
  settlementConvertibilityClean: boolean;
};

type AdapterChaosCertificate = {
  kind: "AQSTOQFLOW_PAYROLL_ADAPTER_CHAOS_RELEASE_GATE_CERTIFICATE";
  version: 1;
  organizationId: string;
  asOf: string;
  state: "ADAPTER_CHAOS_READY" | "BLOCKED";
  authorityCertificationHarnessHash: string;
  providerCertificationHarnessHash: string;
  blockerCodes: string[];
  summary: AdapterChaosSummary;
  authority: AdapterChaosScenarioResult[];
  provider: AdapterChaosScenarioResult[];
  redactionPolicy: "payroll-adapter-chaos-release-gate-redacted";
};

export type PayrollAdapterChaosReleaseGateResult = {
  organizationId: string;
  asOf: string;
  state: "ADAPTER_CHAOS_READY" | "BLOCKED";
  adapterChaosReleaseGateHash: string;
  blockerCodes: string[];
  summary: AdapterChaosSummary;
  authority: AdapterChaosScenarioResult[];
  provider: AdapterChaosScenarioResult[];
  certificate: AdapterChaosCertificate;
  redaction: {
    policy: "payroll-adapter-chaos-release-gate-redacted";
    rawPayloadsIncluded: false;
    credentialSecretsIncluded: false;
    salaryOrEmployeeIdentityIncluded: false;
  };
};

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

function parseDate(value: Date | string | number | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeErrorCode(error: unknown) {
  if (error instanceof BusinessRuleError) return "BUSINESS_RULE_BLOCKED";
  if (error instanceof z.ZodError) return "VALIDATION_BLOCKED";
  if (error instanceof Error && error.name) return error.name;
  return "ADAPTER_CHAOS_GATE_FAILED";
}

function responseSummary(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return asRecord(asRecord(value).responseSummary);
}

function responseHash(value: PayrollAuthorityAdapterOutcome) {
  return "responseHash" in value ? value.responseHash ?? null : null;
}

function authorityReceiptHash(value: PayrollAuthorityAdapterOutcome) {
  return "receiptHash" in value ? value.receiptHash ?? null : null;
}

function providerResponseHash(value: PayrollPaymentProviderAdapterOutcome) {
  return value.providerResponseHash;
}

function providerReceiptHash(value: PayrollPaymentProviderAdapterOutcome) {
  if ("providerSettlementReceiptHash" in value)
    return value.providerSettlementReceiptHash;
  if ("reversalReceiptHash" in value) return value.reversalReceiptHash;
  return null;
}

function isRedacted(summary: Record<string, unknown>) {
  return summary.redacted === true;
}

function suppressedFieldCount(summary: Record<string, unknown>) {
  return Array.isArray(summary.suppressedFields)
    ? summary.suppressedFields.length
    : 0;
}

function hasSensitiveLeak(value: unknown) {
  const serialized = JSON.stringify(value);
  return (
    serialized.includes("do-not-leak") ||
    serialized.includes("699999999") ||
    serialized.includes("raw-secret-fixture")
  );
}

function requiredMissing<T extends string>(
  actual: readonly T[],
  required: readonly T[],
) {
  return required.filter((scenario) => !actual.includes(scenario));
}

function blocker(prefix: string, scenario: string, code: string) {
  return `${prefix}_${scenario.toUpperCase()}_${code}`;
}

function settlementConvertible(input: {
  outcome: PayrollPaymentProviderAdapterOutcome;
  organizationId: string;
  payrollPaymentBatchId: string;
  sourceRegisterHash: string | null;
  now: Date;
}) {
  try {
    payrollSettlementEvidenceInputFromProviderOutcome({
      outcome: input.outcome,
      organizationId: input.organizationId,
      payrollPaymentBatchId: input.payrollPaymentBatchId,
      actorPermissions: ["payroll.payments.reconcile"],
      sourceRegisterHash: input.sourceRegisterHash ?? "sha256:register",
      now: input.now,
    });
    return true;
  } catch {
    return false;
  }
}

function authoritySubmitInput(input: {
  organizationId: string;
  workerId: string;
  execution: PayrollAuthorityAdapterExecutionRecord;
  now: Date;
}): PayrollAuthorityAdapterSubmitInput {
  return {
    organizationId: input.organizationId,
    workerId: input.workerId,
    execution: input.execution,
    now: input.now,
  };
}

async function evaluateAuthorityScenario(input: {
  organizationId: string;
  certificate: unknown;
  certificationHarnessHash: string;
  execution: PayrollAuthorityAdapterExecutionRecord;
  scenario: PayrollAuthorityAdapterFixtureScenario;
  now: Date;
}): Promise<AdapterChaosScenarioResult> {
  const result: AdapterChaosScenarioResult = {
    domain: "authority",
    scenario: input.scenario,
    state: "PASSED",
    outcomeStatus: null,
    responseHash: null,
    receiptHash: null,
    replayStable: false,
    responseSummaryRedacted: false,
    suppressedFieldCount: 0,
    sensitiveSummaryLeakDetected: false,
    settlementEvidenceConvertible: null,
    blockerCodes: [],
    errorCode: null,
  };

  try {
    const submit = authoritySubmitInput({
      organizationId: input.organizationId,
      workerId: "adapter-chaos-gate",
      execution: input.execution,
      now: input.now,
    });
    const first = await runPayrollAuthorityAdapterFixture({
      ...submit,
      certificate: input.certificate,
      certificationHarnessHash: input.certificationHarnessHash,
      scenario: input.scenario,
      responseSummary: {
        safeMarker: "authority-chaos-gate",
        rawPayload: { salary: "do-not-leak" },
        secretToken: "raw-secret-fixture",
      },
    });
    const replay = await runPayrollAuthorityAdapterFixture({
      ...submit,
      certificate: input.certificate,
      certificationHarnessHash: input.certificationHarnessHash,
      scenario: input.scenario,
      responseSummary: {
        safeMarker: "authority-chaos-gate",
        rawPayload: { salary: "do-not-leak" },
        secretToken: "raw-secret-fixture",
      },
    });
    const summary = responseSummary(first);
    result.outcomeStatus = first.status;
    result.responseHash = responseHash(first);
    result.receiptHash = authorityReceiptHash(first);
    result.replayStable =
      responseHash(first) === responseHash(replay) &&
      authorityReceiptHash(first) === authorityReceiptHash(replay);
    result.responseSummaryRedacted = isRedacted(summary);
    result.suppressedFieldCount = suppressedFieldCount(summary);
    result.sensitiveSummaryLeakDetected = hasSensitiveLeak(first);
    if (!result.replayStable) {
      result.blockerCodes.push(
        blocker("AUTHORITY", input.scenario, "REPLAY_UNSTABLE"),
      );
    }
    if (!result.responseSummaryRedacted) {
      result.blockerCodes.push(
        blocker("AUTHORITY", input.scenario, "SUMMARY_NOT_REDACTED"),
      );
    }
    if (result.sensitiveSummaryLeakDetected) {
      result.blockerCodes.push(
        blocker("AUTHORITY", input.scenario, "SENSITIVE_SUMMARY_LEAK"),
      );
    }
  } catch (error) {
    result.errorCode = safeErrorCode(error);
    result.blockerCodes.push(blocker("AUTHORITY", input.scenario, "FAILED"));
  }

  if (result.blockerCodes.length > 0) result.state = "BLOCKED";
  return result;
}

async function evaluateProviderScenario(input: {
  organizationId: string;
  certificate: unknown;
  providerCertificationHarnessHash: string;
  submit: PayrollPaymentProviderAdapterSubmitInput;
  scenario: PayrollPaymentProviderFixtureScenario;
  now: Date;
}): Promise<AdapterChaosScenarioResult> {
  const result: AdapterChaosScenarioResult = {
    domain: "provider",
    scenario: input.scenario,
    state: "PASSED",
    outcomeStatus: null,
    responseHash: null,
    receiptHash: null,
    replayStable: false,
    responseSummaryRedacted: false,
    suppressedFieldCount: 0,
    sensitiveSummaryLeakDetected: false,
    settlementEvidenceConvertible: null,
    blockerCodes: [],
    errorCode: null,
  };

  try {
    const submit = {
      ...input.submit,
      organizationId: input.organizationId,
      now: input.now,
    };
    const first = await runPayrollPaymentProviderFixture({
      ...submit,
      certificate: input.certificate,
      providerCertificationHarnessHash: input.providerCertificationHarnessHash,
      scenario: input.scenario,
      responseSummary: {
        safeMarker: "provider-chaos-gate",
        rawPayload: { salary: "do-not-leak", destination: "699999999" },
        secretToken: "raw-secret-fixture",
      },
    });
    const replay = await runPayrollPaymentProviderFixture({
      ...submit,
      certificate: input.certificate,
      providerCertificationHarnessHash: input.providerCertificationHarnessHash,
      scenario: input.scenario,
      responseSummary: {
        safeMarker: "provider-chaos-gate",
        rawPayload: { salary: "do-not-leak", destination: "699999999" },
        secretToken: "raw-secret-fixture",
      },
    });
    const summary = responseSummary(first);
    result.outcomeStatus = first.status;
    result.responseHash = providerResponseHash(first);
    result.receiptHash = providerReceiptHash(first);
    result.replayStable =
      providerResponseHash(first) === providerResponseHash(replay) &&
      providerReceiptHash(first) === providerReceiptHash(replay);
    result.responseSummaryRedacted = isRedacted(summary);
    result.suppressedFieldCount = suppressedFieldCount(summary);
    result.sensitiveSummaryLeakDetected = hasSensitiveLeak(first);
    result.settlementEvidenceConvertible = settlementConvertible({
      outcome: first,
      organizationId: input.organizationId,
      payrollPaymentBatchId: submit.payrollPaymentBatchId,
      sourceRegisterHash: submit.sourceRegisterHash ?? null,
      now: input.now,
    });
    const shouldConvert =
      input.scenario === "settled" || input.scenario === "partially_settled";
    if (result.settlementEvidenceConvertible !== shouldConvert) {
      result.blockerCodes.push(
        blocker("PROVIDER", input.scenario, "SETTLEMENT_CONVERTIBILITY_INVALID"),
      );
    }
    if (!result.replayStable) {
      result.blockerCodes.push(
        blocker("PROVIDER", input.scenario, "REPLAY_UNSTABLE"),
      );
    }
    if (!result.responseSummaryRedacted) {
      result.blockerCodes.push(
        blocker("PROVIDER", input.scenario, "SUMMARY_NOT_REDACTED"),
      );
    }
    if (result.sensitiveSummaryLeakDetected) {
      result.blockerCodes.push(
        blocker("PROVIDER", input.scenario, "SENSITIVE_SUMMARY_LEAK"),
      );
    }
  } catch (error) {
    result.errorCode = safeErrorCode(error);
    result.blockerCodes.push(blocker("PROVIDER", input.scenario, "FAILED"));
  }

  if (result.blockerCodes.length > 0) result.state = "BLOCKED";
  return result;
}

export async function evaluatePayrollAdapterChaosReleaseGate(
  input: PayrollAdapterChaosReleaseGateInput,
): Promise<PayrollAdapterChaosReleaseGateResult> {
  const parsed = payrollAdapterChaosReleaseGateInputSchema.parse(input);
  const asOf = parseDate(parsed.asOf, new Date());
  const blockerCodes: string[] = [];

  if (parsed.provider.submit.organizationId !== parsed.organizationId) {
    blockerCodes.push("PROVIDER_SUBMIT_TENANT_SCOPE_MISMATCH");
  }

  for (const scenario of requiredMissing(
    parsed.authority.scenarios,
    requiredAuthorityScenarios,
  )) {
    blockerCodes.push(`AUTHORITY_${scenario.toUpperCase()}_SCENARIO_MISSING`);
  }
  for (const scenario of requiredMissing(
    parsed.provider.scenarios,
    requiredProviderScenarios,
  )) {
    blockerCodes.push(`PROVIDER_${scenario.toUpperCase()}_SCENARIO_MISSING`);
  }

  const [authority, provider] = await Promise.all([
    Promise.all(
      parsed.authority.scenarios.map((scenario) =>
        evaluateAuthorityScenario({
          organizationId: parsed.organizationId,
          certificate: parsed.authority.certificate,
          certificationHarnessHash: parsed.authority.certificationHarnessHash,
          execution: parsed.authority.execution,
          scenario,
          now: asOf,
        }),
      ),
    ),
    Promise.all(
      parsed.provider.scenarios.map((scenario) =>
        evaluateProviderScenario({
          organizationId: parsed.organizationId,
          certificate: parsed.provider.certificate,
          providerCertificationHarnessHash:
            parsed.provider.providerCertificationHarnessHash,
          submit: parsed.provider.submit,
          scenario,
          now: asOf,
        }),
      ),
    ),
  ]);

  for (const result of [...authority, ...provider]) {
    blockerCodes.push(...result.blockerCodes);
  }

  const allResults = [...authority, ...provider];
  const replayStable = allResults.every((result) => result.replayStable);
  const redactionClean = allResults.every(
    (result) =>
      result.responseSummaryRedacted && !result.sensitiveSummaryLeakDetected,
  );
  const settlementConvertibilityClean = provider.every(
    (result) =>
      result.scenario === "settled" ||
      result.scenario === "partially_settled"
        ? result.settlementEvidenceConvertible === true
        : result.settlementEvidenceConvertible === false,
  );

  const summary = {
    authorityScenariosRequired: requiredAuthorityScenarios.length,
    authorityScenariosPassed: authority.filter(
      (result) => result.state === "PASSED",
    ).length,
    providerScenariosRequired: requiredProviderScenarios.length,
    providerScenariosPassed: provider.filter(
      (result) => result.state === "PASSED",
    ).length,
    replayStable,
    redactionClean,
    settlementConvertibilityClean,
  };
  const state: AdapterChaosCertificate["state"] = blockerCodes.length === 0
    ? "ADAPTER_CHAOS_READY"
    : "BLOCKED";
  const certificate = {
    kind: "AQSTOQFLOW_PAYROLL_ADAPTER_CHAOS_RELEASE_GATE_CERTIFICATE" as const,
    version: 1 as const,
    organizationId: parsed.organizationId,
    asOf: asOf.toISOString(),
    state,
    authorityCertificationHarnessHash: parsed.authority.certificationHarnessHash,
    providerCertificationHarnessHash:
      parsed.provider.providerCertificationHarnessHash,
    blockerCodes,
    summary,
    authority,
    provider,
    redactionPolicy: "payroll-adapter-chaos-release-gate-redacted" as const,
  };
  const adapterChaosReleaseGateHash = prefixedHash(certificate);

  return {
    organizationId: parsed.organizationId,
    asOf: asOf.toISOString(),
    state,
    adapterChaosReleaseGateHash,
    blockerCodes,
    summary,
    authority,
    provider,
    certificate,
    redaction: {
      policy: "payroll-adapter-chaos-release-gate-redacted",
      rawPayloadsIncluded: false,
      credentialSecretsIncluded: false,
      salaryOrEmployeeIdentityIncluded: false,
    },
  };
}
