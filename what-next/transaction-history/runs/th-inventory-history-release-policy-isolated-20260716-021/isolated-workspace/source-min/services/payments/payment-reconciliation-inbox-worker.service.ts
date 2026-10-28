import "server-only";

import { randomUUID } from "crypto";

import {
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import { db } from "@/prisma/db";
import { ConflictError } from "@/services/_shared/action-errors";

const idSchema = z.string().trim().min(1);
const leaseTokenSchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const dateInputSchema = z.union([z.date(), z.string().trim().min(1), z.number()]);
const PAYLOAD_SUMMARY_REDACTION_ERROR = "PAYLOAD_SUMMARY_REDACTION_REQUIRED";
const sensitivePayloadSummaryKeyPattern = /(?:secret|password|credential|authorization|signature|rawPayload|raw_payload|privateKey|salary|employee|bank|iban|account|msisdn|phone|email|destination|token)/i;
const safePayloadSummaryKeys = new Set([
  "providerEventId",
  "providerTransactionId",
  "providerReference",
  "eventType",
  "currencyCode",
  "occurredAt",
  "fileName",
  "sourceType",
  "lineCount",
  "notification",
  "evidenceRef",
  "amount",
  "currency",
  "runId",
  "certificateHash",
  "rowCount",
  "fileType",
  "watermarkId",
  "redaction",
  "worker",
]);
const allInboxSources = Object.values(
  PaymentReconciliationInboxSource,
) as PaymentReconciliationInboxSource[];

const workerItemSelect = {
  id: true,
  organizationId: true,
  providerAccountId: true,
  source: true,
  status: true,
  idempotencyKey: true,
  externalId: true,
  payloadHash: true,
  payloadSummary: true,
  attempts: true,
  lastError: true,
  nextAttemptAt: true,
  leasedBy: true,
  leaseToken: true,
  processedAt: true,
  correlationId: true,
  updatedAt: true,
} satisfies Prisma.PaymentReconciliationInboxItemSelect;

type DbClient = typeof db | Prisma.TransactionClient;
type WorkerItemRecord = Prisma.PaymentReconciliationInboxItemGetPayload<{
  select: typeof workerItemSelect;
}>;

type WorkerAction =
  | "LEASED"
  | "DEAD_LETTERED"
  | "COMPLETED"
  | "RETRY_SCHEDULED";

export type PaymentReconciliationInboxWorkerItem = {
  id: string;
  providerAccountId: string | null;
  source: PaymentReconciliationInboxSource;
  status: PaymentReconciliationInboxStatus;
  attempts: number;
  nextAttemptAt: string | null;
  leasedBy: string | null;
  leaseToken: string | null;
  processedAt: string | null;
  payloadHash: string;
  externalId: string | null;
  correlationId: string | null;
  lastErrorCode: string | null;
  action: WorkerAction;
  redacted: true;
};

export type LeasePaymentReconciliationInboxItemsResult = {
  organizationId: string;
  leasedBy: string;
  asOf: string;
  leaseUntil: string;
  leasedItems: PaymentReconciliationInboxWorkerItem[];
  deadLetteredItems: PaymentReconciliationInboxWorkerItem[];
  skippedRaceCount: number;
  redaction: {
    policy: "payment-reconciliation-inbox-worker-redacted";
    rawPayloadsIncluded: false;
    payloadSummariesReturned: false;
    credentialSecretsIncluded: false;
  };
};

export const leasePaymentReconciliationInboxItemsInputSchema = z.object({
  organizationId: idSchema,
  leasedBy: idSchema,
  providerAccountId: idSchema.optional(),
  sources: z.array(z.nativeEnum(PaymentReconciliationInboxSource)).default(allInboxSources),
  limit: z.number().int().positive().max(100).default(25),
  leaseSeconds: z.number().int().positive().max(3600).default(300),
  maxAttempts: z.number().int().positive().max(25).default(5),
  leaseToken: leaseTokenSchema.optional(),
  now: dateInputSchema.optional(),
  correlationId: idSchema.optional(),
});

export const completePaymentReconciliationInboxItemInputSchema = z.object({
  organizationId: idSchema,
  inboxItemId: idSchema,
  leasedBy: idSchema,
  leaseToken: leaseTokenSchema,
  processedBy: idSchema.optional(),
  now: dateInputSchema.optional(),
  correlationId: idSchema.optional(),
});

export const failPaymentReconciliationInboxItemInputSchema = z.object({
  organizationId: idSchema,
  inboxItemId: idSchema,
  leasedBy: idSchema,
  leaseToken: leaseTokenSchema,
  processedBy: idSchema.optional(),
  errorCode: idSchema,
  retryAfterSeconds: z.number().int().positive().max(86400).optional(),
  retryBaseSeconds: z.number().int().positive().max(86400).default(300),
  maxAttempts: z.number().int().positive().max(25).default(5),
  now: dateInputSchema.optional(),
  correlationId: idSchema.optional(),
});

export type LeasePaymentReconciliationInboxItemsInput = z.input<
  typeof leasePaymentReconciliationInboxItemsInputSchema
>;
export type CompletePaymentReconciliationInboxItemInput = z.input<
  typeof completePaymentReconciliationInboxItemInputSchema
>;
export type FailPaymentReconciliationInboxItemInput = z.input<
  typeof failPaymentReconciliationInboxItemInputSchema
>;

function parseDate(value: Date | string | number | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function dateIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function hasSensitivePayloadSummaryKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasSensitivePayloadSummaryKey);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) =>
      sensitivePayloadSummaryKeyPattern.test(key) ||
      hasSensitivePayloadSummaryKey(nested),
  );
}

function safeExistingPayloadSummary(value: unknown) {
  const existing = asRecord(value);
  const summary: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(existing)) {
    if (!safePayloadSummaryKeys.has(key)) continue;
    if (hasSensitivePayloadSummaryKey({ [key]: nested })) continue;
    summary[key] = nested;
  }
  return summary;
}

function payloadSummaryRedactionErrorCode(value: unknown) {
  return hasSensitivePayloadSummaryKey(value)
    ? PAYLOAD_SUMMARY_REDACTION_ERROR
    : null;
}

function createLeaseToken(value: string | undefined) {
  return value ?? randomUUID();
}

function normalizeErrorCode(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z0-9_:-]{2,80}$/.test(trimmed)) return trimmed;
  return "PROVIDER_INBOX_WORKER_FAILED";
}

function safeStoredErrorCode(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z0-9_:-]{2,80}$/.test(trimmed)
    ? trimmed
    : "REDACTED_ERROR_PRESENT";
}

function retryDelaySeconds(attempts: number, baseSeconds: number) {
  const exponent = Math.max(0, attempts - 1);
  const delay = baseSeconds * 2 ** exponent;
  return Math.min(delay, 86400);
}

function workerSummary(
  item: WorkerItemRecord,
  worker: {
    action: WorkerAction;
    actorId?: string | null;
    asOf: Date;
    nextAttemptAt?: Date | null;
    errorCode?: string | null;
    redactionErrorCode?: string | null;
    redactionPolicy?: string;
  },
) {
  const redactionErrorCode = worker.redactionErrorCode ?? null;
  return safeJson({
    ...safeExistingPayloadSummary(item.payloadSummary),
    redaction: {
      payloadSummarySanitized: true,
      failClosed: Boolean(redactionErrorCode),
      errorCode: redactionErrorCode,
    },
    worker: {
      action: worker.action,
      actorId: worker.actorId ?? null,
      asOf: worker.asOf.toISOString(),
      nextAttemptAt: dateIso(worker.nextAttemptAt),
      errorCode: worker.errorCode ?? null,
      redactionPolicy:
        worker.redactionPolicy ?? "payment-reconciliation-inbox-worker-redacted",
    },
  });
}

function toWorkerItem(
  item: WorkerItemRecord,
  action: WorkerAction,
): PaymentReconciliationInboxWorkerItem {
  return {
    id: item.id,
    providerAccountId: item.providerAccountId,
    source: item.source,
    status: item.status,
    attempts: item.attempts,
    nextAttemptAt: dateIso(item.nextAttemptAt),
    leasedBy: item.leasedBy,
    leaseToken: item.leaseToken,
    processedAt: dateIso(item.processedAt),
    payloadHash: item.payloadHash,
    externalId: item.externalId,
    correlationId: item.correlationId,
    lastErrorCode: safeStoredErrorCode(item.lastError),
    action,
    redacted: true,
  };
}

function redaction() {
  return {
    policy: "payment-reconciliation-inbox-worker-redacted" as const,
    rawPayloadsIncluded: false as const,
    payloadSummariesReturned: false as const,
    credentialSecretsIncluded: false as const,
  };
}

async function readWorkerItem(
  client: DbClient,
  organizationId: string,
  id: string,
) {
  return client.paymentReconciliationInboxItem.findFirst({
    where: { id, organizationId },
    select: workerItemSelect,
  });
}

async function guardedUpdateItem(
  client: DbClient,
  item: WorkerItemRecord,
  data: Prisma.PaymentReconciliationInboxItemUpdateManyMutationInput,
  leaseGuard?: { leasedBy: string | null; leaseToken: string | null },
) {
  const result = await client.paymentReconciliationInboxItem.updateMany({
    where: {
      id: item.id,
      organizationId: item.organizationId,
      status: item.status,
      attempts: item.attempts,
      nextAttemptAt: item.nextAttemptAt,
      leasedBy: leaseGuard ? leaseGuard.leasedBy : item.leasedBy,
      leaseToken: leaseGuard ? leaseGuard.leaseToken : item.leaseToken,
    },
    data,
  });
  if (result.count !== 1) return null;
  return readWorkerItem(client, item.organizationId, item.id);
}

export async function leasePaymentReconciliationInboxItems(
  input: LeasePaymentReconciliationInboxItemsInput,
  client: DbClient = db,
): Promise<LeasePaymentReconciliationInboxItemsResult> {
  const parsed = leasePaymentReconciliationInboxItemsInputSchema.parse(input);
  const now = parseDate(parsed.now, new Date());
  const leaseUntil = new Date(now.getTime() + parsed.leaseSeconds * 1000);
  const leasedItems: PaymentReconciliationInboxWorkerItem[] = [];
  const deadLetteredItems: PaymentReconciliationInboxWorkerItem[] = [];
  let skippedRaceCount = 0;

  const candidates = await client.paymentReconciliationInboxItem.findMany({
    where: {
      organizationId: parsed.organizationId,
      ...(parsed.providerAccountId
        ? { providerAccountId: parsed.providerAccountId }
        : {}),
      source: { in: parsed.sources },
      OR: [
        { status: PaymentReconciliationInboxStatus.RECEIVED },
        {
          status: PaymentReconciliationInboxStatus.FAILED,
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        {
          status: PaymentReconciliationInboxStatus.PROCESSING,
          nextAttemptAt: { lte: now },
        },
      ],
    },
    orderBy: [{ nextAttemptAt: "asc" }, { updatedAt: "asc" }],
    take: parsed.limit,
    select: workerItemSelect,
  });

  for (const item of candidates) {
    const redactionErrorCode = payloadSummaryRedactionErrorCode(item.payloadSummary);
    const nextAttempts = item.attempts + 1;
    const shouldDeadLetter = Boolean(redactionErrorCode) || nextAttempts > parsed.maxAttempts;
    const action: WorkerAction = shouldDeadLetter ? "DEAD_LETTERED" : "LEASED";
    const lastError = redactionErrorCode ?? (shouldDeadLetter ? "MAX_ATTEMPTS_EXCEEDED" : item.lastError);
    const leaseToken = shouldDeadLetter ? null : createLeaseToken(parsed.leaseToken);
    const updated = await guardedUpdateItem(client, item, {
      status: shouldDeadLetter
        ? PaymentReconciliationInboxStatus.DEAD_LETTER
        : PaymentReconciliationInboxStatus.PROCESSING,
      attempts: { increment: 1 },
      lastError,
      nextAttemptAt: shouldDeadLetter ? null : leaseUntil,
      leasedBy: shouldDeadLetter ? null : parsed.leasedBy,
      leaseToken,
      correlationId: parsed.correlationId ?? item.correlationId,
      payloadSummary: workerSummary(item, {
        action,
        actorId: parsed.leasedBy,
        asOf: now,
        nextAttemptAt: shouldDeadLetter ? null : leaseUntil,
        errorCode: lastError,
        redactionErrorCode,
      }),
    });

    if (!updated) {
      skippedRaceCount += 1;
      continue;
    }

    if (shouldDeadLetter) {
      deadLetteredItems.push(toWorkerItem(updated, action));
    } else {
      leasedItems.push(toWorkerItem(updated, action));
    }
  }

  return {
    organizationId: parsed.organizationId,
    leasedBy: parsed.leasedBy,
    asOf: now.toISOString(),
    leaseUntil: leaseUntil.toISOString(),
    leasedItems,
    deadLetteredItems,
    skippedRaceCount,
    redaction: redaction(),
  };
}

export async function completePaymentReconciliationInboxItem(
  input: CompletePaymentReconciliationInboxItemInput,
  client: DbClient = db,
) {
  const parsed = completePaymentReconciliationInboxItemInputSchema.parse(input);
  const now = parseDate(parsed.now, new Date());
  const item = await readWorkerItem(client, parsed.organizationId, parsed.inboxItemId);
  if (!item || item.status !== PaymentReconciliationInboxStatus.PROCESSING) {
    throw new ConflictError("Payment reconciliation inbox item is not leased for processing.");
  }

  const redactionErrorCode = payloadSummaryRedactionErrorCode(item.payloadSummary);
  const action: WorkerAction = redactionErrorCode ? "DEAD_LETTERED" : "COMPLETED";
  const updated = await guardedUpdateItem(
    client,
    item,
    {
      status: redactionErrorCode
        ? PaymentReconciliationInboxStatus.DEAD_LETTER
        : PaymentReconciliationInboxStatus.PROCESSED,
      lastError: redactionErrorCode,
      nextAttemptAt: null,
      leasedBy: null,
      leaseToken: null,
      processedAt: redactionErrorCode ? null : now,
      correlationId: parsed.correlationId ?? item.correlationId,
      payloadSummary: workerSummary(item, {
        action,
        actorId: parsed.processedBy ?? parsed.leasedBy,
        asOf: now,
        nextAttemptAt: null,
        errorCode: redactionErrorCode,
        redactionErrorCode,
      }),
    },
    { leasedBy: parsed.leasedBy, leaseToken: parsed.leaseToken },
  );

  if (!updated) {
    throw new ConflictError("Payment reconciliation inbox item lease changed before completion.");
  }

  return {
    item: toWorkerItem(updated, action),
    redaction: redaction(),
  };
}

export async function failPaymentReconciliationInboxItem(
  input: FailPaymentReconciliationInboxItemInput,
  client: DbClient = db,
) {
  const parsed = failPaymentReconciliationInboxItemInputSchema.parse(input);
  const now = parseDate(parsed.now, new Date());
  const item = await readWorkerItem(client, parsed.organizationId, parsed.inboxItemId);
  if (!item || item.status !== PaymentReconciliationInboxStatus.PROCESSING) {
    throw new ConflictError("Payment reconciliation inbox item is not leased for processing.");
  }

  const redactionErrorCode = payloadSummaryRedactionErrorCode(item.payloadSummary);
  const errorCode =
    redactionErrorCode ??
    normalizeErrorCode(parsed.errorCode) ??
    "PROVIDER_INBOX_WORKER_FAILED";
  const shouldDeadLetter = Boolean(redactionErrorCode) || item.attempts >= parsed.maxAttempts;
  const retrySeconds =
    parsed.retryAfterSeconds ?? retryDelaySeconds(item.attempts, parsed.retryBaseSeconds);
  const nextAttemptAt = shouldDeadLetter ? null : new Date(now.getTime() + retrySeconds * 1000);
  const action: WorkerAction = shouldDeadLetter ? "DEAD_LETTERED" : "RETRY_SCHEDULED";
  const lastError = redactionErrorCode ?? (shouldDeadLetter ? "MAX_ATTEMPTS_EXCEEDED" : errorCode);

  const updated = await guardedUpdateItem(
    client,
    item,
    {
      status: shouldDeadLetter
        ? PaymentReconciliationInboxStatus.DEAD_LETTER
        : PaymentReconciliationInboxStatus.FAILED,
      lastError,
      nextAttemptAt,
      leasedBy: null,
      leaseToken: null,
      processedAt: null,
      correlationId: parsed.correlationId ?? item.correlationId,
      payloadSummary: workerSummary(item, {
        action,
        actorId: parsed.processedBy ?? parsed.leasedBy,
        asOf: now,
        nextAttemptAt,
        errorCode: lastError,
        redactionErrorCode,
      }),
    },
    { leasedBy: parsed.leasedBy, leaseToken: parsed.leaseToken },
  );

  if (!updated) {
    throw new ConflictError("Payment reconciliation inbox item lease changed before failure handling.");
  }

  return {
    item: toWorkerItem(updated, action),
    redaction: redaction(),
  };
}
