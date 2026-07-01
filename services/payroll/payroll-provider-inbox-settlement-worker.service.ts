import "server-only";

import {
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import { db } from "@/prisma/db";
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors";
import {
  completePaymentReconciliationInboxItem,
  failPaymentReconciliationInboxItem,
  type PaymentReconciliationInboxWorkerItem,
} from "@/services/payments/payment-reconciliation-inbox-worker.service";
import type { PayrollPaymentProviderAdapter } from "./payroll-payment-provider-fixture-runner.service";
import {
  recordPayrollProviderMatchedSettlement,
  type PayrollProviderMatchedSettlementInput,
  type PayrollProviderSettlementBridgeResult,
} from "./payroll-provider-settlement-bridge.service";

const idSchema = z.string().trim().min(1);
const hashSchema = z.string().trim().min(1);
const leaseTokenSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);

export const payrollProviderInboxSettlementWorkerInputSchema = z.object({
  organizationId: idSchema,
  inboxItemId: idSchema,
  leasedBy: idSchema,
  leaseToken: leaseTokenSchema,
  payrollPaymentBatchId: idSchema,
  matchRecordId: idSchema,
  actorId: idSchema.optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  approvedById: idSchema.optional(),
  sourceRegisterHash: hashSchema,
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  retryBaseSeconds: z.number().int().positive().max(86400).default(300),
  maxAttempts: z.number().int().positive().max(25).default(5),
  correlationId: idSchema.optional(),
});

export type PayrollProviderInboxSettlementWorkerInput = z.input<
  typeof payrollProviderInboxSettlementWorkerInputSchema
>;

type DbClient = typeof db | Prisma.TransactionClient;
type CompleteInbox = typeof completePaymentReconciliationInboxItem;
type FailInbox = typeof failPaymentReconciliationInboxItem;
type RecordBridge = typeof recordPayrollProviderMatchedSettlement;

type InboxRecord = {
  id: string;
  organizationId: string;
  providerAccountId: string | null;
  source: PaymentReconciliationInboxSource;
  status: PaymentReconciliationInboxStatus;
  leasedBy: string | null;
  leaseToken: string | null;
  correlationId: string | null;
};

export type PayrollProviderInboxSettlementWorkerDependencies = {
  adapter: PayrollPaymentProviderAdapter;
  client?: DbClient;
  recordBridge?: RecordBridge;
  completeInbox?: CompleteInbox;
  failInbox?: FailInbox;
};

export type PayrollProviderInboxSettlementWorkerResult =
  | {
      status: "SETTLEMENT_EVIDENCE_RECORDED";
      inboxItem: PaymentReconciliationInboxWorkerItem;
      bridgeResult: Extract<
        PayrollProviderSettlementBridgeResult,
        { status: "SETTLED" | "PARTIALLY_SETTLED" }
      >;
    }
  | {
      status: "EXCEPTION_EVIDENCE_RECORDED";
      inboxItem: PaymentReconciliationInboxWorkerItem;
      bridgeResult: Extract<
        PayrollProviderSettlementBridgeResult,
        { status: "REVERSAL_REQUIRES_CORRECTION" | "FAILED_REQUIRES_REVIEW" }
      >;
    }
  | {
      status: "RETRY_SCHEDULED";
      inboxItem: PaymentReconciliationInboxWorkerItem;
      bridgeResult: Extract<
        PayrollProviderSettlementBridgeResult,
        { status: "RETRY_SCHEDULED" }
      >;
    }
  | {
      status: "BRIDGE_FAILED_RETRY_SCHEDULED";
      inboxItem: PaymentReconciliationInboxWorkerItem;
      bridgeResult: null;
      errorCode: string;
    };

const inboxSelect = {
  id: true,
  organizationId: true,
  providerAccountId: true,
  source: true,
  status: true,
  leasedBy: true,
  leaseToken: true,
  correlationId: true,
} satisfies Prisma.PaymentReconciliationInboxItemSelect;

const supportedInboxSources = new Set<PaymentReconciliationInboxSource>([
  PaymentReconciliationInboxSource.PROVIDER_EVENT,
  PaymentReconciliationInboxSource.STATEMENT_FILE,
]);

async function loadLeasedProviderInboxItem(
  client: DbClient,
  input: z.output<typeof payrollProviderInboxSettlementWorkerInputSchema>,
): Promise<InboxRecord> {
  const item = await client.paymentReconciliationInboxItem.findFirst({
    where: {
      id: input.inboxItemId,
      organizationId: input.organizationId,
    },
    select: inboxSelect,
  });

  if (!item) {
    throw new ConflictError("Payment reconciliation inbox item was not found.");
  }
  if (item.status !== PaymentReconciliationInboxStatus.PROCESSING) {
    throw new ConflictError(
      "Payment reconciliation inbox item is not leased for payroll settlement processing.",
    );
  }
  if (item.leasedBy !== input.leasedBy || item.leaseToken !== input.leaseToken) {
    throw new ConflictError(
      "Payment reconciliation inbox item lease does not match payroll settlement worker.",
    );
  }
  if (!supportedInboxSources.has(item.source)) {
    throw new BusinessRuleError(
      "Payroll provider inbox settlement worker only accepts provider event or statement file inbox items.",
    );
  }

  return item as InboxRecord;
}

function bridgeInput(
  input: z.output<typeof payrollProviderInboxSettlementWorkerInputSchema>,
): PayrollProviderMatchedSettlementInput {
  return {
    organizationId: input.organizationId,
    payrollPaymentBatchId: input.payrollPaymentBatchId,
    matchRecordId: input.matchRecordId,
    actorId: input.actorId,
    actorPermissions: input.actorPermissions,
    approvedById: input.approvedById,
    sourceRegisterHash: input.sourceRegisterHash,
    lastAuthAt: input.lastAuthAt,
    now: input.now,
  };
}

function correlationId(input: {
  parsed: z.output<typeof payrollProviderInboxSettlementWorkerInputSchema>;
  inbox: InboxRecord;
}) {
  return input.parsed.correlationId ?? input.inbox.correlationId ?? undefined;
}

function safeBridgeErrorCode(error: unknown) {
  if (error instanceof BusinessRuleError) return "PAYROLL_PROVIDER_BRIDGE_BLOCKED";
  if (error instanceof ConflictError) return "PAYROLL_PROVIDER_BRIDGE_CONFLICT";
  return "PAYROLL_PROVIDER_BRIDGE_FAILED";
}

export async function processPayrollProviderInboxSettlementItem(
  input: PayrollProviderInboxSettlementWorkerInput,
  deps: PayrollProviderInboxSettlementWorkerDependencies,
): Promise<PayrollProviderInboxSettlementWorkerResult> {
  const parsed = payrollProviderInboxSettlementWorkerInputSchema.parse(input);
  const client = deps.client ?? db;
  const recordBridge = deps.recordBridge ?? recordPayrollProviderMatchedSettlement;
  const completeInbox = deps.completeInbox ?? completePaymentReconciliationInboxItem;
  const failInbox = deps.failInbox ?? failPaymentReconciliationInboxItem;
  const inbox = await loadLeasedProviderInboxItem(client, parsed);
  const sharedInboxInput = {
    organizationId: parsed.organizationId,
    inboxItemId: parsed.inboxItemId,
    leasedBy: parsed.leasedBy,
    leaseToken: parsed.leaseToken,
    processedBy: parsed.actorId ?? parsed.leasedBy,
    now: parsed.now,
    correlationId: correlationId({ parsed, inbox }),
  };

  let bridgeResult: PayrollProviderSettlementBridgeResult;
  try {
    bridgeResult = await recordBridge(bridgeInput(parsed), {
      adapter: deps.adapter,
      client,
    });
  } catch (error) {
    const errorCode = safeBridgeErrorCode(error);
    const failure = await failInbox(
      {
        ...sharedInboxInput,
        errorCode,
        retryBaseSeconds: parsed.retryBaseSeconds,
        maxAttempts: parsed.maxAttempts,
      },
      client,
    );
    return {
      status: "BRIDGE_FAILED_RETRY_SCHEDULED",
      inboxItem: failure.item,
      bridgeResult: null,
      errorCode,
    };
  }

  if (bridgeResult.status === "RETRY_SCHEDULED") {
    const failure = await failInbox(
      {
        ...sharedInboxInput,
        errorCode: bridgeResult.providerOutcome.errorCode,
        retryAfterSeconds: bridgeResult.providerOutcome.retryAfterSeconds,
        retryBaseSeconds: parsed.retryBaseSeconds,
        maxAttempts: parsed.maxAttempts,
      },
      client,
    );
    return {
      status: "RETRY_SCHEDULED",
      inboxItem: failure.item,
      bridgeResult,
    };
  }

  const completion = await completeInbox(sharedInboxInput, client);

  if (
    bridgeResult.status === "SETTLED" ||
    bridgeResult.status === "PARTIALLY_SETTLED"
  ) {
    return {
      status: "SETTLEMENT_EVIDENCE_RECORDED",
      inboxItem: completion.item,
      bridgeResult,
    };
  }

  if (
    bridgeResult.status === "REVERSAL_REQUIRES_CORRECTION" ||
    bridgeResult.status === "FAILED_REQUIRES_REVIEW"
  ) {
    return {
      status: "EXCEPTION_EVIDENCE_RECORDED",
      inboxItem: completion.item,
      bridgeResult,
    };
  }

  throw new BusinessRuleError(
    "Payroll provider inbox settlement worker received an unsupported bridge result.",
  );
}
