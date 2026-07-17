import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";

export const PAYROLL_AUTHORITY_ADAPTER_EXECUTION_VERSION = 1;

const idSchema = z.string().trim().min(1);
const hashSchema = z.string().trim().min(1);
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);

export const payrollAuthorityAdapterExecutionStatusSchema = z.enum([
  "PENDING",
  "LEASED",
  "SUBMITTED",
  "RETRY_SCHEDULED",
  "ACCEPTED",
  "REJECTED",
  "PAYMENT_DUE",
  "AMENDMENT_REQUIRED",
  "FAILED",
  "DEAD_LETTER",
]);

const REQUIRED_AUTHORITY_CERTIFICATION_PROOF_FIELDS = [
  { field: "authorityStatusCodeMapHash", label: "authority status code map hash" },
  { field: "rejectionMappingHash", label: "rejection mapping hash" },
  { field: "amendmentMappingHash", label: "amendment mapping hash" },
  { field: "paymentDueMappingHash", label: "payment-due mapping hash" },
  {
    field: "credentialRotationProofHash",
    label: "credential rotation proof hash",
  },
  { field: "credentialScopeProofHash", label: "credential scope proof hash" },
  {
    field: "idempotencyReplayFixtureHash",
    label: "idempotency replay fixture hash",
  },
  {
    field: "duplicateResponseFixtureHash",
    label: "duplicate response fixture hash",
  },
  {
    field: "duplicateTerminalResponseReplayFixtureHash",
    label: "duplicate terminal response replay fixture hash",
  },
  { field: "outageRunbookHash", label: "outage runbook hash" },
  { field: "retryPolicyFixtureHash", label: "retry policy fixture hash" },
  {
    field: "deadLetterTriageRunbookHash",
    label: "dead-letter triage runbook hash",
  },
  { field: "auditTrailFixtureHash", label: "audit trail fixture hash" },
  { field: "redactionFixtureHash", label: "redaction fixture hash" },
  { field: "closeImpactRuleHash", label: "close impact rule hash" },
  { field: "legalReviewHash", label: "legal or regulator review hash" },
] as const;

type AuthorityCertificationProofField =
  (typeof REQUIRED_AUTHORITY_CERTIFICATION_PROOF_FIELDS)[number]["field"];

export type PayrollAuthorityCertificationProofEnvelope = Record<
  AuthorityCertificationProofField,
  string
>;

export const enqueuePayrollAuthorityAdapterExecutionInputSchema = z.object({
  organizationId: idSchema,
  declarationEvidenceId: idSchema,
  actorId: idSchema.optional().nullable(),
  idempotencyKey: idSchema.optional(),
  maxAttempts: z.number().int().positive().max(10).default(5),
  now: dateInputSchema.optional(),
});

export const leasePayrollAuthorityAdapterExecutionsInputSchema = z.object({
  organizationId: idSchema,
  leasedBy: idSchema,
  limit: z.number().int().positive().max(50).default(10),
  leaseSeconds: z.number().int().positive().max(900).default(60),
  now: dateInputSchema.optional(),
});

export const processPayrollAuthorityAdapterExecutionInputSchema = z.object({
  organizationId: idSchema,
  declarationEvidenceId: idSchema,
  processedBy: idSchema.optional().nullable(),
  now: dateInputSchema.optional(),
  outcome: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("accepted"),
      authorityReference: idSchema.optional(),
      responseHash: hashSchema,
      receiptHash: hashSchema.optional(),
      responseSummary: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
      status: z.literal("rejected"),
      authorityReference: idSchema.optional(),
      responseHash: hashSchema,
      rejectionReason: z.string().trim().min(1).max(1000),
      responseSummary: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
      status: z.literal("payment_due"),
      authorityReference: idSchema,
      responseHash: hashSchema,
      receiptHash: hashSchema.optional(),
      responseSummary: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
      status: z.literal("amendment_required"),
      authorityReference: idSchema.optional(),
      responseHash: hashSchema,
      receiptHash: hashSchema.optional(),
      amendmentReason: z.string().trim().min(1).max(1000),
      responseSummary: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
      status: z.literal("retryable_error"),
      errorCode: idSchema,
      errorMessage: z.string().trim().min(1).max(1000),
      responseHash: hashSchema.optional(),
      retryAfterSeconds: z.number().int().positive().max(86400).optional(),
      responseSummary: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
      status: z.literal("failed"),
      errorCode: idSchema,
      errorMessage: z.string().trim().min(1).max(1000),
      responseHash: hashSchema.optional(),
      responseSummary: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
});

export type EnqueuePayrollAuthorityAdapterExecutionInput = z.input<
  typeof enqueuePayrollAuthorityAdapterExecutionInputSchema
>;
export type LeasePayrollAuthorityAdapterExecutionsInput = z.input<
  typeof leasePayrollAuthorityAdapterExecutionsInputSchema
>;
export type ProcessPayrollAuthorityAdapterExecutionInput = z.input<
  typeof processPayrollAuthorityAdapterExecutionInputSchema
>;
export type PayrollAuthorityAdapterExecutionStatus = z.infer<
  typeof payrollAuthorityAdapterExecutionStatusSchema
>;

export type PayrollAuthorityAdapterExecutionRecord = {
  kind: "AQSTOQFLOW_PAYROLL_AUTHORITY_ADAPTER_EXECUTION";
  version: number;
  status: PayrollAuthorityAdapterExecutionStatus;
  idempotencyKey: string;
  declarationId: string;
  declarationEvidenceId: string;
  evidenceHash: string;
  authority: string;
  declarationType: string;
  countryCode: string;
  countryPackVersion: string;
  countryPackResolutionHash: string;
  authorityChannel: string;
  authorityEnvironment: string;
  authorityReference: string | null;
  authorityAdapterKey: string;
  authorityAdapterProofHash: string;
  authorityAdapterContractHash: string;
  authorityAdapterRegistryDecision: string;
  requestHash: string;
  responseHash: string | null;
  receiptHash: string | null;
  sourceRegisterHash: string;
  submittedPayloadHash: string | null;
  payloadMappingHash: string;
  responseMappingHash: string;
  credentialProofHash: string;
  adapterRequestHash: string;
  adapterResponseReceiptHash: string;
  adapterIdempotencyKey: string;
  adapterAttempt: number;
  authorityCertificationHarnessHash: string;
  authorityCertificationProofEnvelope: PayrollAuthorityCertificationProofEnvelope;
  adapterChaosReleaseGateHash: string;
  correlationId: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  leasedAt: string | null;
  leasedUntil: string | null;
  leasedBy: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  rejectionReason: string | null;
  responseSummary: Record<string, unknown> | null;
  nextEvidenceAction: string;
  redactionPolicy: string;
};

type DbClient = typeof db | Prisma.TransactionClient;
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0];
type DeclarationEvidenceForExecution =
  Prisma.PayrollDeclarationEvidenceGetPayload<{
    include: { declaration: true };
  }>;

type DeclarationWithMetadata = {
  id: string;
  organizationId: string;
  metadata: Prisma.JsonValue | null;
};

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function";
}

async function inTransaction<T>(
  client: DbClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (hasTransaction(client)) return client.$transaction((tx) => work(tx));
  return work(client as Prisma.TransactionClient);
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

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

function buildAuthorityCertificationProofEnvelope(
  proof: Record<string, unknown>,
  metadata: Record<string, unknown>,
) {
  const envelope: Partial<PayrollAuthorityCertificationProofEnvelope> = {};
  const missing: string[] = [];

  for (const requirement of REQUIRED_AUTHORITY_CERTIFICATION_PROOF_FIELDS) {
    const value =
      asString(proof[requirement.field]) ?? asString(metadata[requirement.field]);
    if (!value) {
      missing.push(requirement.label);
    } else {
      envelope[requirement.field] = value;
    }
  }

  return {
    envelope: envelope as PayrollAuthorityCertificationProofEnvelope,
    missing,
  };
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

function normalizeToken(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
}

function executionFromMetadata(metadata: unknown) {
  const execution = asRecord(metadata).authorityAdapterExecution;
  return Object.keys(asRecord(execution)).length > 0
    ? asRecord(execution)
    : null;
}

function executionRecordFromMetadata(
  metadata: unknown,
): PayrollAuthorityAdapterExecutionRecord | null {
  const execution = executionFromMetadata(metadata);
  if (!execution) return null;
  const status = asString(execution.status);
  if (
    !status ||
    !payrollAuthorityAdapterExecutionStatusSchema.safeParse(status).success
  ) {
    return null;
  }
  return execution as unknown as PayrollAuthorityAdapterExecutionRecord;
}

function executionIdempotencyKey(input: {
  organizationId: string;
  declarationEvidenceId: string;
  evidenceHash: string;
  idempotencyKey?: string | null;
}) {
  if (input.idempotencyKey) return input.idempotencyKey;
  return [
    "payroll-authority-adapter",
    input.organizationId,
    input.declarationEvidenceId,
    input.evidenceHash,
  ]
    .map((part) => normalizeToken(part))
    .join(":");
}

function nextRetryAt(now: Date, retryAfterSeconds?: number | null) {
  return new Date(
    now.getTime() + Math.max(retryAfterSeconds ?? 300, 30) * 1000,
  );
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

function redactedResponseSummary(value: unknown) {
  const record = asRecord(value);
  if (Object.keys(record).length === 0) return null;
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

function certifiedAuthorityProof(evidence: DeclarationEvidenceForExecution) {
  const metadata = asRecord(evidence.metadata);
  const proof = asRecord(metadata.authorityAdapterProof);
  const certificationBlockers = Array.isArray(
    metadata.authorityAdapterCertificationBlockers,
  )
    ? metadata.authorityAdapterCertificationBlockers
    : Array.isArray(proof.authorityAdapterCertificationBlockers)
      ? proof.authorityAdapterCertificationBlockers
      : [];
  const proofComplete =
    metadata.authorityAdapterCertificationProofComplete === true ||
    proof.authorityAdapterCertificationProofComplete === true;

  if (!evidence.productionSubmissionSupported || !proofComplete) {
    throw new BusinessRuleError(
      "Payroll authority adapter execution requires certified production declaration evidence.",
    );
  }
  if (certificationBlockers.length > 0) {
    throw new BusinessRuleError(
      "Payroll authority adapter execution is blocked by incomplete certification proof.",
    );
  }

  const authorityAdapterProofHash =
    asString(metadata.authorityAdapterProofHash) ??
    asString(proof.authorityAdapterProofHash);
  const authorityAdapterContractHash =
    asString(metadata.authorityAdapterContractHash) ??
    asString(proof.authorityAdapterContractHash);
  const authorityAdapterRegistryDecision =
    asString(metadata.authorityAdapterRegistryDecision) ??
    asString(proof.authorityAdapterRegistryDecision);
  const authorityAdapterKey =
    asString(metadata.authorityAdapterKey) ??
    asString(proof.authorityAdapterKey);
  const requestHash =
    asString(proof.adapterRequestHash) ?? asString(metadata.adapterRequestHash);
  const receiptHash =
    asString(proof.adapterResponseReceiptHash) ??
    asString(metadata.adapterResponseReceiptHash) ??
    evidence.portalReceiptHash ??
    evidence.authorityResponseHash;
  const adapterIdempotencyKey =
    asString(proof.adapterIdempotencyKey) ??
    asString(metadata.adapterIdempotencyKey) ??
    evidence.idempotencyKey;
  const sourceRegisterHash = evidence.sourceRegisterHash;
  const payloadMappingHash = asString(proof.payloadMappingHash);
  const responseMappingHash = asString(proof.responseMappingHash);
  const credentialProofHash = asString(proof.credentialProofHash);
  const adapterRequestHash =
    asString(proof.adapterRequestHash) ?? asString(metadata.adapterRequestHash);
  const adapterResponseReceiptHash =
    asString(proof.adapterResponseReceiptHash) ??
    asString(metadata.adapterResponseReceiptHash) ??
    evidence.portalReceiptHash ??
    evidence.authorityResponseHash;
  const adapterAttempt = asNumber(proof.adapterAttempt) ?? 1;
  const authorityCertificationHarnessHash =
    asString(proof.authorityCertificationHarnessHash) ??
    asString(metadata.authorityCertificationHarnessHash);
  const adapterChaosReleaseGateHash =
    asString(proof.adapterChaosReleaseGateHash) ??
    asString(metadata.adapterChaosReleaseGateHash);
  const authorityCertificationProofEnvelope =
    buildAuthorityCertificationProofEnvelope(proof, metadata);

  const missing = [
    ["authority adapter proof hash", authorityAdapterProofHash],
    ["authority adapter contract hash", authorityAdapterContractHash],
    ["authority adapter registry decision", authorityAdapterRegistryDecision],
    ["authority adapter key", authorityAdapterKey],
    ["source register hash", sourceRegisterHash],
    ["payload mapping hash", payloadMappingHash],
    ["response mapping hash", responseMappingHash],
    ["credential proof hash", credentialProofHash],
    ["adapter request hash", adapterRequestHash],
    ["adapter response or receipt hash", adapterResponseReceiptHash],
    ["adapter idempotency key", adapterIdempotencyKey],
    ["authority certification harness hash", authorityCertificationHarnessHash],
    ...authorityCertificationProofEnvelope.missing.map(
      (label) => [label, null] as const,
    ),
    ["adapter chaos release gate hash", adapterChaosReleaseGateHash],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new BusinessRuleError(
      `Payroll authority adapter execution proof is incomplete: ${missing
        .map(([label]) => label)
        .join(", ")}.`,
    );
  }

  return {
    metadata,
    proof,
    authorityAdapterProofHash: authorityAdapterProofHash as string,
    authorityAdapterContractHash: authorityAdapterContractHash as string,
    authorityAdapterRegistryDecision:
      authorityAdapterRegistryDecision as string,
    authorityAdapterKey: authorityAdapterKey as string,
    requestHash: requestHash as string,
    receiptHash: receiptHash as string,
    sourceRegisterHash: sourceRegisterHash as string,
    payloadMappingHash: payloadMappingHash as string,
    responseMappingHash: responseMappingHash as string,
    credentialProofHash: credentialProofHash as string,
    adapterRequestHash: adapterRequestHash as string,
    adapterResponseReceiptHash: adapterResponseReceiptHash as string,
    adapterIdempotencyKey: adapterIdempotencyKey as string,
    adapterAttempt,
    authorityCertificationHarnessHash:
      authorityCertificationHarnessHash as string,
    authorityCertificationProofEnvelope:
      authorityCertificationProofEnvelope.envelope,
    adapterChaosReleaseGateHash: adapterChaosReleaseGateHash as string,
  };
}

function buildExecutionRecord(input: {
  evidence: DeclarationEvidenceForExecution;
  now: Date;
  idempotencyKey: string;
  maxAttempts: number;
  proof: ReturnType<typeof certifiedAuthorityProof>;
}): PayrollAuthorityAdapterExecutionRecord {
  const correlationId = prefixedHash({
    kind: "payroll-authority-adapter-correlation",
    evidenceId: input.evidence.id,
    adapterIdempotencyKey: input.proof.adapterIdempotencyKey,
    requestHash: input.proof.requestHash,
  });

  return {
    kind: "AQSTOQFLOW_PAYROLL_AUTHORITY_ADAPTER_EXECUTION",
    version: PAYROLL_AUTHORITY_ADAPTER_EXECUTION_VERSION,
    status: "PENDING",
    idempotencyKey: input.idempotencyKey,
    declarationId: input.evidence.declarationId,
    declarationEvidenceId: input.evidence.id,
    evidenceHash: input.evidence.evidenceHash,
    authority: input.evidence.authority,
    declarationType: input.evidence.declarationType,
    countryCode: input.evidence.declaration.countryCode,
    countryPackVersion: input.evidence.declaration.countryPackVersion,
    countryPackResolutionHash: input.evidence.countryPackResolutionHash,
    authorityChannel: input.evidence.authorityChannel,
    authorityEnvironment: input.evidence.authorityEnvironment,
    authorityReference: input.evidence.authorityReference ?? null,
    authorityAdapterKey: input.proof.authorityAdapterKey,
    authorityAdapterProofHash: input.proof.authorityAdapterProofHash,
    authorityAdapterContractHash: input.proof.authorityAdapterContractHash,
    authorityAdapterRegistryDecision:
      input.proof.authorityAdapterRegistryDecision,
    requestHash: input.proof.requestHash,
    responseHash: input.evidence.authorityResponseHash ?? null,
    receiptHash: input.proof.receiptHash,
    sourceRegisterHash: input.proof.sourceRegisterHash,
    submittedPayloadHash: input.evidence.submittedPayloadHash ?? null,
    payloadMappingHash: input.proof.payloadMappingHash,
    responseMappingHash: input.proof.responseMappingHash,
    credentialProofHash: input.proof.credentialProofHash,
    adapterRequestHash: input.proof.adapterRequestHash,
    adapterResponseReceiptHash: input.proof.adapterResponseReceiptHash,
    adapterIdempotencyKey: input.proof.adapterIdempotencyKey,
    adapterAttempt: input.proof.adapterAttempt,
    authorityCertificationHarnessHash:
      input.proof.authorityCertificationHarnessHash,
    authorityCertificationProofEnvelope:
      input.proof.authorityCertificationProofEnvelope,
    adapterChaosReleaseGateHash: input.proof.adapterChaosReleaseGateHash,
    correlationId,
    attempts: 0,
    maxAttempts: input.maxAttempts,
    nextAttemptAt: input.now.toISOString(),
    leasedAt: null,
    leasedUntil: null,
    leasedBy: null,
    submittedAt: null,
    completedAt: null,
    errorCode: null,
    errorMessage: null,
    rejectionReason: null,
    responseSummary: null,
    nextEvidenceAction:
      "Persist authority execution outcome and record accept, rejection, payment-due, or amendment evidence as the next controlled declaration transition.",
    redactionPolicy:
      "Authority execution metadata stores hashes, ids, and redacted summaries only; no raw salary, employee identity, credential secret, or authority payload is stored.",
  };
}

function mergeDeclarationMetadata(
  declaration: DeclarationWithMetadata,
  execution: PayrollAuthorityAdapterExecutionRecord,
) {
  return safeJson({
    ...asRecord(declaration.metadata),
    authorityAdapterExecution: execution,
    latestAuthorityAdapterExecutionStatus: execution.status,
    latestAuthorityAdapterExecutionEvidenceId: execution.declarationEvidenceId,
    latestAuthorityAdapterExecutionCorrelationId: execution.correlationId,
    latestAuthorityAdapterExecutionUpdatedAt: new Date().toISOString(),
  });
}

async function writeExecutionMetadata(
  tx: Prisma.TransactionClient,
  input: {
    evidence: DeclarationEvidenceForExecution;
    execution: PayrollAuthorityAdapterExecutionRecord;
    actorId?: string | null;
    action: string;
    now: Date;
  },
) {
  await tx.payrollDeclaration.update({
    where: { id: input.evidence.declarationId },
    data: {
      metadata: safeJson({
        ...asRecord(input.evidence.declaration.metadata),
        authorityAdapterExecution: input.execution,
        latestAuthorityAdapterExecutionStatus: input.execution.status,
        latestAuthorityAdapterExecutionEvidenceId:
          input.execution.declarationEvidenceId,
        latestAuthorityAdapterExecutionCorrelationId:
          input.execution.correlationId,
        latestAuthorityAdapterExecutionUpdatedAt: input.now.toISOString(),
      }),
    },
  });

  await tx.auditLog.create({
    data: {
      entityType: "PayrollDeclaration",
      entityId: input.evidence.declarationId,
      action: input.action,
      userId: input.actorId ?? null,
      organizationId: input.evidence.organizationId,
      changes: safeJson({
        after: {
          executionStatus: input.execution.status,
          declarationEvidenceId: input.evidence.id,
          correlationId: input.execution.correlationId,
          authorityAdapterProofHash: input.execution.authorityAdapterProofHash,
          authorityAdapterContractHash:
            input.execution.authorityAdapterContractHash,
          adapterChaosReleaseGateHash:
            input.execution.adapterChaosReleaseGateHash,
          requestHash: input.execution.requestHash,
          responseHash: input.execution.responseHash,
          receiptHash: input.execution.receiptHash,
          redacted: true,
        },
      }),
    },
  });
}

async function loadCertifiedEvidence(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; declarationEvidenceId: string },
) {
  const evidence = await tx.payrollDeclarationEvidence.findFirst({
    where: {
      id: input.declarationEvidenceId,
      organizationId: input.organizationId,
    },
    include: { declaration: true },
  });
  if (!evidence)
    throw new NotFoundError("Payroll declaration evidence not found.");
  return evidence;
}

export async function enqueuePayrollAuthorityAdapterExecution(
  input: EnqueuePayrollAuthorityAdapterExecutionInput,
  client: DbClient = db,
) {
  const parsed =
    enqueuePayrollAuthorityAdapterExecutionInputSchema.parse(input);
  const now = parseDate(parsed.now, new Date());

  return inTransaction(client, async (tx) => {
    const evidence = await loadCertifiedEvidence(tx, parsed);
    const proof = certifiedAuthorityProof(evidence);
    const idempotencyKey = executionIdempotencyKey({
      organizationId: parsed.organizationId,
      declarationEvidenceId: evidence.id,
      evidenceHash: evidence.evidenceHash,
      idempotencyKey: parsed.idempotencyKey,
    });
    const existing = executionRecordFromMetadata(evidence.declaration.metadata);

    if (existing) {
      if (
        existing.idempotencyKey !== idempotencyKey ||
        existing.evidenceHash !== evidence.evidenceHash ||
        existing.declarationEvidenceId !== evidence.id
      ) {
        throw new ConflictError(
          "Payroll authority adapter execution already exists for this declaration with different evidence.",
        );
      }
      return {
        declarationId: evidence.declarationId,
        declarationEvidenceId: evidence.id,
        execution: existing,
        idempotent: true,
      };
    }

    const execution = buildExecutionRecord({
      evidence,
      now,
      idempotencyKey,
      maxAttempts: parsed.maxAttempts,
      proof,
    });

    await writeExecutionMetadata(tx, {
      evidence,
      execution,
      actorId: parsed.actorId,
      action: "PAYROLL_AUTHORITY_ADAPTER_EXECUTION_QUEUED",
      now,
    });

    await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
      organizationId: parsed.organizationId,
      eventType: "payroll.declaration.adapter_execution.queued",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: `payroll-authority-adapter:${evidence.id}:${idempotencyKey}:queued`,
      actorId: parsed.actorId ?? undefined,
      sourceType: "PAYROLL_DECLARATION",
      sourceId: evidence.declarationId,
      documentHash: evidence.evidenceHash,
      payload: {
        declarationId: evidence.declarationId,
        declarationEvidenceId: evidence.id,
        executionStatus: execution.status,
        authorityChannel: execution.authorityChannel,
        authorityEnvironment: execution.authorityEnvironment,
        authorityAdapterKey: execution.authorityAdapterKey,
        authorityAdapterProofHash: execution.authorityAdapterProofHash,
        authorityAdapterContractHash: execution.authorityAdapterContractHash,
        adapterChaosReleaseGateHash: execution.adapterChaosReleaseGateHash,
        requestHash: execution.requestHash,
        receiptHash: execution.receiptHash,
        correlationId: execution.correlationId,
        redacted: true,
      },
      outboxMessages: [
        {
          channel: "AUTHORITY_SUBMISSION",
          eventName: "payroll.declaration.adapter_execution.queued",
          idempotencyKey: `${idempotencyKey}:authority-submission`,
          destination: "payroll-authority-adapter",
          payload: {
            declarationId: evidence.declarationId,
            declarationEvidenceId: evidence.id,
            correlationId: execution.correlationId,
            authorityChannel: execution.authorityChannel,
            authorityEnvironment: execution.authorityEnvironment,
          },
        },
      ],
    });

    return {
      declarationId: evidence.declarationId,
      declarationEvidenceId: evidence.id,
      execution,
      idempotent: false,
    };
  });
}

function executionDue(
  execution: PayrollAuthorityAdapterExecutionRecord,
  now: Date,
) {
  if (!["PENDING", "RETRY_SCHEDULED"].includes(execution.status)) return false;
  const dueAt = new Date(execution.nextAttemptAt);
  return !Number.isNaN(dueAt.getTime()) && dueAt <= now;
}

export async function leasePayrollAuthorityAdapterExecutions(
  input: LeasePayrollAuthorityAdapterExecutionsInput,
  client: DbClient = db,
) {
  const parsed = leasePayrollAuthorityAdapterExecutionsInputSchema.parse(input);
  const now = parseDate(parsed.now, new Date());
  const leasedUntil = new Date(now.getTime() + parsed.leaseSeconds * 1000);
  const candidates = await client.payrollDeclaration.findMany({
    where: {
      organizationId: parsed.organizationId,
    },
    orderBy: { updatedAt: "asc" },
    take: parsed.limit * 10,
  });

  const due: Array<{
    declaration: (typeof candidates)[number];
    execution: PayrollAuthorityAdapterExecutionRecord;
  }> = [];
  for (const declaration of candidates) {
    const execution = executionRecordFromMetadata(declaration.metadata);
    if (!execution || !executionDue(execution, now)) continue;
    due.push({ declaration, execution });
    if (due.length >= parsed.limit) break;
  }

  const leased: PayrollAuthorityAdapterExecutionRecord[] = [];
  for (const item of due) {
    const attempts = item.execution.attempts + 1;
    const status: PayrollAuthorityAdapterExecutionStatus =
      attempts > item.execution.maxAttempts ? "DEAD_LETTER" : "LEASED";
    const execution: PayrollAuthorityAdapterExecutionRecord = {
      ...item.execution,
      status,
      attempts,
      leasedAt: status === "LEASED" ? now.toISOString() : null,
      leasedUntil: status === "LEASED" ? leasedUntil.toISOString() : null,
      leasedBy: status === "LEASED" ? parsed.leasedBy : null,
      completedAt: status === "DEAD_LETTER" ? now.toISOString() : null,
      errorCode:
        status === "DEAD_LETTER"
          ? "MAX_ATTEMPTS_EXCEEDED"
          : item.execution.errorCode,
      errorMessage:
        status === "DEAD_LETTER"
          ? "Payroll authority adapter execution exceeded max attempts."
          : item.execution.errorMessage,
    };

    await client.payrollDeclaration.update({
      where: { id: item.declaration.id },
      data: {
        metadata: mergeDeclarationMetadata(item.declaration, execution),
      },
    });
    leased.push(execution);
  }

  return {
    organizationId: parsed.organizationId,
    leasedBy: parsed.leasedBy,
    leasedUntil: leasedUntil.toISOString(),
    executions: leased,
  };
}
function processableStatus(status: PayrollAuthorityAdapterExecutionStatus) {
  return ["PENDING", "LEASED", "RETRY_SCHEDULED"].includes(status);
}

function terminalStatusForOutcome(
  outcome: z.output<
    typeof processPayrollAuthorityAdapterExecutionInputSchema
  >["outcome"],
): PayrollAuthorityAdapterExecutionStatus | null {
  switch (outcome.status) {
    case "accepted":
      return "ACCEPTED";
    case "rejected":
      return "REJECTED";
    case "payment_due":
      return "PAYMENT_DUE";
    case "amendment_required":
      return "AMENDMENT_REQUIRED";
    case "failed":
      return "FAILED";
    default:
      return null;
  }
}

function responseHashForOutcome(
  outcome: z.output<
    typeof processPayrollAuthorityAdapterExecutionInputSchema
  >["outcome"],
) {
  return "responseHash" in outcome ? (outcome.responseHash ?? null) : null;
}

function receiptHashForOutcome(
  outcome: z.output<
    typeof processPayrollAuthorityAdapterExecutionInputSchema
  >["outcome"],
) {
  return "receiptHash" in outcome ? (outcome.receiptHash ?? null) : null;
}

function duplicateTerminalOutcomeMatches(
  execution: PayrollAuthorityAdapterExecutionRecord,
  outcome: z.output<
    typeof processPayrollAuthorityAdapterExecutionInputSchema
  >["outcome"],
) {
  const expectedStatus = terminalStatusForOutcome(outcome);
  const responseHash = responseHashForOutcome(outcome);
  const receiptHash = receiptHashForOutcome(outcome);
  if (!expectedStatus || !responseHash) return false;
  if (execution.status !== expectedStatus) return false;
  if (execution.responseHash !== responseHash) return false;
  if (receiptHash && execution.receiptHash !== receiptHash) return false;
  return true;
}

function executionForOutcome(
  execution: PayrollAuthorityAdapterExecutionRecord,
  input: z.output<typeof processPayrollAuthorityAdapterExecutionInputSchema>,
  now: Date,
): PayrollAuthorityAdapterExecutionRecord {
  if (input.outcome.status === "accepted") {
    return {
      ...execution,
      status: "ACCEPTED",
      authorityReference:
        input.outcome.authorityReference ?? execution.authorityReference,
      responseHash: input.outcome.responseHash,
      receiptHash: input.outcome.receiptHash ?? execution.receiptHash,
      responseSummary: redactedResponseSummary(input.outcome.responseSummary),
      submittedAt: execution.submittedAt ?? now.toISOString(),
      completedAt: now.toISOString(),
      leasedAt: null,
      leasedUntil: null,
      leasedBy: null,
      errorCode: null,
      errorMessage: null,
      rejectionReason: null,
      nextEvidenceAction:
        "Record authority acceptance evidence, then statutory payment due or reconciliation evidence as applicable.",
    };
  }

  if (input.outcome.status === "rejected") {
    return {
      ...execution,
      status: "REJECTED",
      authorityReference:
        input.outcome.authorityReference ?? execution.authorityReference,
      responseHash: input.outcome.responseHash,
      responseSummary: redactedResponseSummary(input.outcome.responseSummary),
      submittedAt: execution.submittedAt ?? now.toISOString(),
      completedAt: now.toISOString(),
      leasedAt: null,
      leasedUntil: null,
      leasedBy: null,
      errorCode: "TERMINAL_REJECTION",
      errorMessage: null,
      rejectionReason: input.outcome.rejectionReason,
      nextEvidenceAction:
        "Record rejection or amendment evidence before close certification can proceed.",
    };
  }

  if (input.outcome.status === "payment_due") {
    return {
      ...execution,
      status: "PAYMENT_DUE",
      authorityReference: input.outcome.authorityReference,
      responseHash: input.outcome.responseHash,
      receiptHash: input.outcome.receiptHash ?? execution.receiptHash,
      responseSummary: redactedResponseSummary(input.outcome.responseSummary),
      submittedAt: execution.submittedAt ?? now.toISOString(),
      completedAt: now.toISOString(),
      leasedAt: null,
      leasedUntil: null,
      leasedBy: null,
      errorCode: null,
      errorMessage: null,
      rejectionReason: null,
      nextEvidenceAction:
        "Record authority acceptance and payment-due lifecycle evidence with source register proof.",
    };
  }

  if (input.outcome.status === "amendment_required") {
    return {
      ...execution,
      status: "AMENDMENT_REQUIRED",
      authorityReference:
        input.outcome.authorityReference ?? execution.authorityReference,
      responseHash: input.outcome.responseHash,
      receiptHash: input.outcome.receiptHash ?? execution.receiptHash,
      responseSummary: redactedResponseSummary(input.outcome.responseSummary),
      submittedAt: execution.submittedAt ?? now.toISOString(),
      completedAt: now.toISOString(),
      leasedAt: null,
      leasedUntil: null,
      leasedBy: null,
      errorCode: "AMENDMENT_REQUIRED",
      errorMessage: null,
      rejectionReason: input.outcome.amendmentReason,
      nextEvidenceAction:
        "Record maker-checker amendment evidence before close certification can proceed.",
    };
  }

  if (input.outcome.status === "retryable_error") {
    const nextAttemptAt = nextRetryAt(now, input.outcome.retryAfterSeconds);
    return {
      ...execution,
      status: "RETRY_SCHEDULED",
      responseHash: input.outcome.responseHash ?? execution.responseHash,
      responseSummary: redactedResponseSummary(input.outcome.responseSummary),
      nextAttemptAt: nextAttemptAt.toISOString(),
      leasedAt: null,
      leasedUntil: null,
      leasedBy: null,
      errorCode: input.outcome.errorCode,
      errorMessage: input.outcome.errorMessage,
      rejectionReason: null,
      nextEvidenceAction:
        "Retry authority adapter execution after the scheduled backoff window.",
    };
  }

  return {
    ...execution,
    status: "FAILED",
    responseHash: input.outcome.responseHash ?? execution.responseHash,
    responseSummary: redactedResponseSummary(input.outcome.responseSummary),
    completedAt: now.toISOString(),
    leasedAt: null,
    leasedUntil: null,
    leasedBy: null,
    errorCode: input.outcome.errorCode,
    errorMessage: input.outcome.errorMessage,
    rejectionReason: null,
    nextEvidenceAction:
      "Review adapter configuration and record manual authority evidence if automation cannot be recovered.",
  };
}

export async function processPayrollAuthorityAdapterExecution(
  input: ProcessPayrollAuthorityAdapterExecutionInput,
  client: DbClient = db,
) {
  const parsed =
    processPayrollAuthorityAdapterExecutionInputSchema.parse(input);
  const now = parseDate(parsed.now, new Date());

  return inTransaction(client, async (tx) => {
    const evidence = await loadCertifiedEvidence(tx, parsed);
    certifiedAuthorityProof(evidence);
    const existing = executionRecordFromMetadata(evidence.declaration.metadata);
    if (!existing || existing.declarationEvidenceId !== evidence.id) {
      throw new NotFoundError(
        "Payroll authority adapter execution was not queued.",
      );
    }
    if (!processableStatus(existing.status)) {
      if (duplicateTerminalOutcomeMatches(existing, parsed.outcome)) {
        return {
          declarationId: evidence.declarationId,
          declarationEvidenceId: evidence.id,
          execution: existing,
          idempotent: true,
        };
      }
      throw new BusinessRuleError(
        "Only pending, leased, or retry-scheduled payroll authority adapter executions can be processed.",
      );
    }

    const execution = executionForOutcome(existing, parsed, now);
    await writeExecutionMetadata(tx, {
      evidence,
      execution,
      actorId: parsed.processedBy,
      action: "PAYROLL_AUTHORITY_ADAPTER_EXECUTION_PROCESSED",
      now,
    });

    const retryable = execution.status === "RETRY_SCHEDULED";
    await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
      organizationId: parsed.organizationId,
      eventType: retryable
        ? "payroll.declaration.adapter_execution.retry_scheduled"
        : "payroll.declaration.adapter_execution.processed",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: `payroll-authority-adapter:${evidence.id}:${execution.correlationId}:${execution.status}:${now.toISOString()}`,
      actorId: parsed.processedBy ?? undefined,
      sourceType: "PAYROLL_DECLARATION",
      sourceId: evidence.declarationId,
      documentHash: execution.responseHash ?? evidence.evidenceHash,
      payload: {
        declarationId: evidence.declarationId,
        declarationEvidenceId: evidence.id,
        executionStatus: execution.status,
        authorityChannel: execution.authorityChannel,
        authorityEnvironment: execution.authorityEnvironment,
        authorityReference: execution.authorityReference,
        responseHash: execution.responseHash,
        receiptHash: execution.receiptHash,
        adapterChaosReleaseGateHash: execution.adapterChaosReleaseGateHash,
        correlationId: execution.correlationId,
        retryable,
        nextAttemptAt: execution.nextAttemptAt,
        nextEvidenceAction: execution.nextEvidenceAction,
        redacted: true,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: retryable
            ? "payroll.declaration.adapter_execution.retry_scheduled"
            : "payroll.declaration.adapter_execution.processed",
          destination: "payroll",
          payload: {
            declarationId: evidence.declarationId,
            declarationEvidenceId: evidence.id,
            executionStatus: execution.status,
            adapterChaosReleaseGateHash: execution.adapterChaosReleaseGateHash,
            nextEvidenceAction: execution.nextEvidenceAction,
          },
        },
      ],
    });

    return {
      declarationId: evidence.declarationId,
      declarationEvidenceId: evidence.id,
      execution,
      idempotent: false,
    };
  });
}
