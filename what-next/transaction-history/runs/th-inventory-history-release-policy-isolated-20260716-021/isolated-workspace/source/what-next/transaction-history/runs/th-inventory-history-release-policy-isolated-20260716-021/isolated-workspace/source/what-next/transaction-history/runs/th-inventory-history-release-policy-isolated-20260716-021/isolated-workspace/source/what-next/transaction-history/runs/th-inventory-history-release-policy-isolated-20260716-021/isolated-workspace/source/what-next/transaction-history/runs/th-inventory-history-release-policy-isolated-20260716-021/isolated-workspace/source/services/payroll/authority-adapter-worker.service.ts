import "server-only";

import { z } from "zod";

import { db } from "@/prisma/db";
import { hashBusinessPayload } from "@/services/events/business-event.service";
import {
  leasePayrollAuthorityAdapterExecutions,
  processPayrollAuthorityAdapterExecution,
  type LeasePayrollAuthorityAdapterExecutionsInput,
  type PayrollAuthorityAdapterExecutionRecord,
  type ProcessPayrollAuthorityAdapterExecutionInput,
} from "./authority-adapter-execution.service";
import {
  recordPayrollDeclarationEvidence,
  type RecordPayrollDeclarationEvidenceInput,
} from "./declaration-lifecycle.service";

const idSchema = z.string().trim().min(1);
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);

export const payrollAuthorityAdapterWorkerInputSchema = z.object({
  organizationId: idSchema,
  workerId: idSchema,
  actorId: idSchema.optional(),
  actorPermissions: z
    .array(z.string().trim().min(1))
    .default(["payroll.declarations.manage"]),
  amendmentApprovedById: idSchema.optional(),
  limit: z.number().int().positive().max(50).default(10),
  leaseSeconds: z.number().int().positive().max(900).default(60),
  now: dateInputSchema.optional(),
  lastAuthAt: dateInputSchema.optional(),
});

export type PayrollAuthorityAdapterWorkerInput = z.input<
  typeof payrollAuthorityAdapterWorkerInputSchema
>;
export type PayrollAuthorityAdapterOutcome =
  ProcessPayrollAuthorityAdapterExecutionInput["outcome"];

export type PayrollAuthorityAdapterSubmitInput = {
  organizationId: string;
  workerId: string;
  execution: PayrollAuthorityAdapterExecutionRecord;
  now: Date;
};

export type PayrollAuthorityAdapter = {
  submit(
    input: PayrollAuthorityAdapterSubmitInput,
  ): Promise<PayrollAuthorityAdapterOutcome>;
};

type WorkerDependencies = {
  adapter?: PayrollAuthorityAdapter;
  leaseExecutions?: typeof leasePayrollAuthorityAdapterExecutions;
  processExecution?: typeof processPayrollAuthorityAdapterExecution;
  recordDeclarationEvidence?: typeof recordPayrollDeclarationEvidence;
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

const SENSITIVE_RESPONSE_SUMMARY_KEY_PATTERN =
  /(raw|payload|body|secret|credential|salary|employee|bank|account|token)/i;

function safeSummaryValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value))
    return value.map((entry) => safeSummaryValue(entry));
  return "[REDACTED:SUMMARY_OBJECT]";
}

function redactedSummary(value: Record<string, unknown> | null | undefined) {
  const record = value ?? {};
  const sanitized: Record<string, unknown> = {};
  const suppressedFields: string[] = [];
  for (const [key, entry] of Object.entries(record)) {
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

export const payrollSandboxAuthorityAdapter: PayrollAuthorityAdapter = {
  async submit({ execution, now }) {
    const mode = [
      execution.authorityAdapterKey,
      execution.authorityChannel,
      execution.authorityEnvironment,
      execution.authorityReference ?? "",
    ]
      .join(" ")
      .toUpperCase();

    if (mode.includes("PAYMENT_DUE")) {
      return {
        status: "payment_due",
        authorityReference:
          execution.authorityReference ??
          "PAYROLL-DUE-" + execution.declarationEvidenceId,
        responseHash: prefixedHash({
          kind: "payroll-authority-sandbox-payment-due",
          declarationEvidenceId: execution.declarationEvidenceId,
          requestHash: execution.requestHash,
        }),
        receiptHash: prefixedHash({
          kind: "payroll-authority-sandbox-payment-due-receipt",
          declarationEvidenceId: execution.declarationEvidenceId,
          adapterIdempotencyKey: execution.adapterIdempotencyKey,
        }),
        responseSummary: redactedSummary({
          authorityStatus: "PAYMENT_DUE",
          sandboxMode: "PAYMENT_DUE",
          occurredAt: now.toISOString(),
        }),
      };
    }

    if (mode.includes("AMEND")) {
      return {
        status: "amendment_required",
        authorityReference:
          execution.authorityReference ??
          "PAYROLL-AMEND-" + execution.declarationEvidenceId,
        responseHash: prefixedHash({
          kind: "payroll-authority-sandbox-amendment-required",
          declarationEvidenceId: execution.declarationEvidenceId,
          requestHash: execution.requestHash,
        }),
        receiptHash: prefixedHash({
          kind: "payroll-authority-sandbox-amendment-receipt",
          declarationEvidenceId: execution.declarationEvidenceId,
          adapterIdempotencyKey: execution.adapterIdempotencyKey,
        }),
        amendmentReason: "SANDBOX_PAYROLL_AUTHORITY_AMENDMENT_REQUIRED",
        responseSummary: redactedSummary({
          authorityStatus: "AMENDMENT_REQUIRED",
          sandboxMode: "AMEND",
          occurredAt: now.toISOString(),
        }),
      };
    }

    if (mode.includes("REJECT")) {
      return {
        status: "rejected",
        authorityReference:
          execution.authorityReference ??
          `PAYROLL-REJECT-${execution.declarationEvidenceId}`,
        responseHash: prefixedHash({
          kind: "payroll-authority-sandbox-rejection",
          declarationEvidenceId: execution.declarationEvidenceId,
          requestHash: execution.requestHash,
        }),
        rejectionReason: "SANDBOX_PAYROLL_AUTHORITY_REJECTION",
        responseSummary: redactedSummary({
          authorityStatus: "REJECTED",
          sandboxMode: "REJECT",
          occurredAt: now.toISOString(),
        }),
      };
    }

    if (mode.includes("RATE_LIMIT") || mode.includes("OUTAGE")) {
      return {
        status: "retryable_error",
        errorCode: mode.includes("RATE_LIMIT")
          ? "RATE_LIMITED"
          : "RETRYABLE_AUTHORITY_OUTAGE",
        errorMessage: "Sandbox payroll authority adapter requested a retry.",
        responseHash: prefixedHash({
          kind: "payroll-authority-sandbox-retry",
          declarationEvidenceId: execution.declarationEvidenceId,
          requestHash: execution.requestHash,
        }),
        retryAfterSeconds: 300,
        responseSummary: redactedSummary({
          authorityStatus: "RETRY_SCHEDULED",
          sandboxMode: mode.includes("RATE_LIMIT") ? "RATE_LIMIT" : "OUTAGE",
          occurredAt: now.toISOString(),
        }),
      };
    }

    if (mode.includes("FAIL")) {
      return {
        status: "failed",
        errorCode: "SANDBOX_ADAPTER_FAILURE",
        errorMessage:
          "Sandbox payroll authority adapter returned a terminal failure.",
        responseHash: prefixedHash({
          kind: "payroll-authority-sandbox-failure",
          declarationEvidenceId: execution.declarationEvidenceId,
          requestHash: execution.requestHash,
        }),
        responseSummary: redactedSummary({
          authorityStatus: "FAILED",
          sandboxMode: "FAIL",
          occurredAt: now.toISOString(),
        }),
      };
    }

    return {
      status: "accepted",
      authorityReference:
        execution.authorityReference ??
        `PAYROLL-ACCEPT-${execution.declarationEvidenceId}`,
      responseHash: prefixedHash({
        kind: "payroll-authority-sandbox-accepted",
        declarationEvidenceId: execution.declarationEvidenceId,
        requestHash: execution.requestHash,
      }),
      receiptHash: prefixedHash({
        kind: "payroll-authority-sandbox-receipt",
        declarationEvidenceId: execution.declarationEvidenceId,
        adapterIdempotencyKey: execution.adapterIdempotencyKey,
      }),
      responseSummary: redactedSummary({
        authorityStatus: "ACCEPTED",
        sandboxMode: "ACCEPT",
        occurredAt: now.toISOString(),
      }),
    };
  },
};

function lifecycleInputsForOutcome(input: {
  organizationId: string;
  actorId: string;
  actorPermissions: string[];
  amendmentApprovedById?: string;
  lastAuthAt: Date;
  now: Date;
  execution: PayrollAuthorityAdapterExecutionRecord;
  outcome: PayrollAuthorityAdapterOutcome;
}): RecordPayrollDeclarationEvidenceInput[] {
  const authorityReference =
    "authorityReference" in input.outcome
      ? (input.outcome.authorityReference ??
        input.execution.authorityReference ??
        undefined)
      : (input.execution.authorityReference ?? undefined);
  const responseHash =
    "responseHash" in input.outcome ? input.outcome.responseHash : undefined;
  if (!responseHash) return [];

  const base = {
    organizationId: input.organizationId,
    declarationId: input.execution.declarationId,
    actorId: input.actorId,
    actorPermissions: input.actorPermissions,
    lastAuthAt: input.lastAuthAt,
    now: input.now,
    authorityChannel: input.execution.authorityChannel,
    authorityEnvironment: input.execution.authorityEnvironment,
    authorityReference,
    authorityResponseHash: responseHash,
    portalReceiptHash:
      "receiptHash" in input.outcome ? input.outcome.receiptHash : undefined,
    sourceRegisterHash: input.execution.sourceRegisterHash,
    authorityAdapterKey: input.execution.authorityAdapterKey,
    authorityAdapterReadiness: "SUPPORTED_CERTIFIED" as const,
    payloadMappingHash: input.execution.payloadMappingHash,
    responseMappingHash: input.execution.responseMappingHash,
    ...input.execution.authorityCertificationProofEnvelope,
    credentialProofHash: input.execution.credentialProofHash,
    adapterRequestHash: input.execution.adapterRequestHash,
    adapterResponseReceiptHash: input.execution.adapterResponseReceiptHash,
    adapterIdempotencyKey: input.execution.adapterIdempotencyKey,
    adapterAttempt: input.execution.attempts,
    authorityCertificationHarnessHash:
      input.execution.authorityCertificationHarnessHash,
    metadata: {
      workflowSource: "payroll.authority_adapter_worker",
      authorityAdapterExecutionCorrelationId: input.execution.correlationId,
      authorityAdapterExecutionStatus: input.execution.status,
      redactedResponseSummary:
        "responseSummary" in input.outcome
          ? redactedSummary(input.outcome.responseSummary)
          : null,
    },
  };

  const idempotencyKey = (transition: string) =>
    [
      "payroll-authority-adapter-lifecycle",
      input.execution.declarationEvidenceId,
      input.execution.correlationId,
      transition,
      responseHash,
    ].join(":");

  if (input.outcome.status === "accepted") {
    return [
      {
        ...base,
        transition: "accept",
        authorityStatus: "ACCEPTED_BY_AUTHORITY",
        idempotencyKey: idempotencyKey("accept"),
      },
    ];
  }

  if (input.outcome.status === "rejected") {
    return [
      {
        ...base,
        transition: "reject",
        authorityStatus: "REJECTED_BY_AUTHORITY",
        portalReceiptHash: undefined,
        notes: input.outcome.rejectionReason,
        idempotencyKey: idempotencyKey("reject"),
      },
    ];
  }

  if (input.outcome.status === "payment_due") {
    return [
      {
        ...base,
        transition: "accept",
        authorityStatus: "ACCEPTED_BY_AUTHORITY",
        idempotencyKey: idempotencyKey("accept"),
      },
      {
        ...base,
        transition: "mark_payment_due",
        authorityStatus: "PAYMENT_DUE_CONFIRMED",
        idempotencyKey: idempotencyKey("mark_payment_due"),
      },
    ];
  }

  if (
    input.outcome.status === "amendment_required" &&
    input.amendmentApprovedById
  ) {
    return [
      {
        ...base,
        transition: "amend",
        authorityStatus: "AMENDMENT_REQUIRED_BY_AUTHORITY",
        approvedById: input.amendmentApprovedById,
        notes: input.outcome.amendmentReason,
        idempotencyKey: idempotencyKey("amend"),
      },
    ];
  }

  return [];
}

export async function processPayrollAuthorityAdapterWorkerBatch(
  input: PayrollAuthorityAdapterWorkerInput,
  deps: WorkerDependencies = {},
) {
  const parsed = payrollAuthorityAdapterWorkerInputSchema.parse(input);
  const now = parseDate(parsed.now, new Date());
  const actorId = parsed.actorId ?? parsed.workerId;
  const lastAuthAt = parseDate(parsed.lastAuthAt, now);
  const adapter = deps.adapter ?? payrollSandboxAuthorityAdapter;
  const leaseExecutions =
    deps.leaseExecutions ?? leasePayrollAuthorityAdapterExecutions;
  const processExecution =
    deps.processExecution ?? processPayrollAuthorityAdapterExecution;
  const recordDeclarationEvidence =
    deps.recordDeclarationEvidence ?? recordPayrollDeclarationEvidence;

  const leaseInput: LeasePayrollAuthorityAdapterExecutionsInput = {
    organizationId: parsed.organizationId,
    leasedBy: parsed.workerId,
    limit: parsed.limit,
    leaseSeconds: parsed.leaseSeconds,
    now,
  };
  const leased = await leaseExecutions(leaseInput, db);
  const results = [];

  for (const execution of leased.executions) {
    if (execution.status === "DEAD_LETTER") {
      results.push({
        declarationId: execution.declarationId,
        declarationEvidenceId: execution.declarationEvidenceId,
        executionStatus: execution.status,
        lifecycleTransition: null,
        lifecycleEvidenceId: null,
        errorCode: execution.errorCode,
      });
      continue;
    }

    let outcome: PayrollAuthorityAdapterOutcome;
    try {
      outcome = await adapter.submit({
        organizationId: parsed.organizationId,
        workerId: parsed.workerId,
        execution,
        now,
      });
    } catch {
      outcome = {
        status: "failed",
        errorCode: "ADAPTER_UNSAFE_ERROR",
        errorMessage:
          "Payroll authority adapter threw an unsafe error. Raw error details were suppressed.",
        responseHash: prefixedHash({
          kind: "payroll-authority-adapter-unsafe-error",
          declarationEvidenceId: execution.declarationEvidenceId,
          correlationId: execution.correlationId,
        }),
        responseSummary: redactedSummary({
          authorityStatus: "FAILED",
          safeError: true,
          occurredAt: now.toISOString(),
        }),
      };
    }

    const processed = await processExecution(
      {
        organizationId: parsed.organizationId,
        declarationEvidenceId: execution.declarationEvidenceId,
        processedBy: actorId,
        now,
        outcome,
      },
      db,
    );
    const lifecycleInputs = lifecycleInputsForOutcome({
      organizationId: parsed.organizationId,
      actorId,
      actorPermissions: parsed.actorPermissions,
      amendmentApprovedById: parsed.amendmentApprovedById,
      lastAuthAt,
      now,
      execution: processed.execution,
      outcome,
    });
    const lifecycles = [];
    for (const lifecycleInput of lifecycleInputs) {
      lifecycles.push(await recordDeclarationEvidence(lifecycleInput, db));
    }

    results.push({
      declarationId: execution.declarationId,
      declarationEvidenceId: execution.declarationEvidenceId,
      executionStatus: processed.execution.status,
      lifecycleTransition: lifecycleInputs[0]?.transition ?? null,
      lifecycleEvidenceId: lifecycles[0]?.evidence.id ?? null,
      lifecycleBusinessEventId: lifecycles[0]?.businessEventId ?? null,
      lifecycleTransitions: lifecycleInputs.map(
        (lifecycleInput) => lifecycleInput.transition,
      ),
      lifecycleEvidenceIds: lifecycles.map(
        (lifecycle) => lifecycle.evidence.id,
      ),
      lifecycleBusinessEventIds: lifecycles.map(
        (lifecycle) => lifecycle.businessEventId,
      ),
      nextEvidenceAction: processed.execution.nextEvidenceAction,
      retryAt:
        processed.execution.status === "RETRY_SCHEDULED"
          ? processed.execution.nextAttemptAt
          : null,
      errorCode: processed.execution.errorCode,
    });
  }

  return {
    organizationId: parsed.organizationId,
    workerId: parsed.workerId,
    processedAt: now.toISOString(),
    leasedCount: leased.executions.length,
    processedCount: results.length,
    results,
  };
}
