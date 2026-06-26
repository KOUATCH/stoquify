import "server-only"

import {
  AccountingSourceType,
  MatchStatus,
  PaymentExceptionStatus,
  PaymentTransactionState,
  PayrollPaymentBatchStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import {
  auditSensitiveActionDecision,
  assertSensitiveActionAllowed,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"
import { evaluateRedaction, type RedactionDecision } from "@/services/security/redaction-policy.service"

const PAYMENT_RECONCILIATION_READ_PERMISSIONS = [
  "payroll.payments.reconcile",
  "payments.reconciliation.read",
  "payroll.command.read",
  "payroll.reports.read",
] as const
const PAYMENT_RECONCILIATION_WRITE_PERMISSIONS = ["payroll.payments.reconcile"] as const
const APPROVED_SETTLEMENT_MATCH_STATUSES = new Set<MatchStatus>([
  MatchStatus.AUTO_MATCHED,
  MatchStatus.APPROVED,
])
const SETTLEMENT_READY_BATCH_STATUSES = new Set<PayrollPaymentBatchStatus>([
  PayrollPaymentBatchStatus.RELEASED,
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
])

const idSchema = z.string().trim().min(1)
const hashSchema = z.string().trim().min(1)
const dateInputSchema = z.union([z.date(), z.string().trim().min(1), z.number()])

const actorContextSchema = z.object({
  organizationId: idSchema,
  actorId: idSchema.optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).optional().default([]),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
})

export const payrollPaymentReconciliationInputSchema = actorContextSchema.extend({
  payrollRunId: idSchema.optional(),
  payrollPaymentBatchId: idSchema.optional(),
  limit: z.number().int().positive().max(100).optional().default(25),
})

export const recordPayrollPaymentSettlementInputSchema = actorContextSchema.extend({
  payrollPaymentBatchId: idSchema,
  settlementStatus: z.enum(["settled", "partially_settled"]).default("settled"),
  settlementAmount: z.union([z.string(), z.number(), z.instanceof(Prisma.Decimal)]).optional(),
  providerAccountId: idSchema.optional(),
  providerTransactionId: idSchema.optional(),
  providerReference: idSchema.optional(),
  providerEventId: idSchema.optional(),
  statementLineId: idSchema.optional(),
  statementFileHash: hashSchema.optional(),
  matchRecordId: idSchema.optional(),
  reconciliationRunId: idSchema.optional(),
  evidenceHash: hashSchema,
  approvedById: idSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
  idempotencyKey: idSchema,
  lastAuthAt: dateInputSchema.optional(),
  now: dateInputSchema.optional(),
  metadata: z.unknown().optional(),
})

export type PayrollPaymentReconciliationInput = z.input<typeof payrollPaymentReconciliationInputSchema>
export type RecordPayrollPaymentSettlementInput = z.input<typeof recordPayrollPaymentSettlementInputSchema>
export type PayrollPaymentSettlementStatus = z.output<typeof recordPayrollPaymentSettlementInputSchema>["settlementStatus"]

export type PayrollPaymentReconciliationRedaction = {
  allowed: boolean
  mode: RedactionDecision["mode"]
  reasonCode: RedactionDecision["reasonCode"]
  policy: string
  requiredPermissions: string[]
}

export type PayrollPaymentSettlementState =
  | "LEDGER_BLOCKED"
  | "AWAITING_PROVIDER_EVIDENCE"
  | "EXCEPTION_OPEN"
  | "READY_TO_SETTLE"
  | "PARTIALLY_SETTLED"
  | "SETTLED"

export type PayrollPaymentReconciliationBatch = {
  id: string
  batchNumber: string
  payrollRunId: string
  runNumber: string
  periodName: string
  status: PayrollPaymentBatchStatus
  reconciliationStatus: string | null
  amount: string
  currency: string
  method: string
  paymentDate: string
  ledgerPostingBatchId: string | null
  postedBusinessEventId: string | null
  paymentTransactionId: string | null
  paymentExceptionId: string | null
  evidenceHash: string | null
  documentHash: string | null
  bankFileHash: string | null
  derivedState: PayrollPaymentSettlementState
  nextAction: string
  proof: {
    payrollRegisterSource: string
    providerEvidenceRequired: boolean
    closeImpactSourceCode: "PAYROLL_PAYMENT_RECONCILED"
    sourceLinks: Array<{
      type: string
      id: string
      documentHash?: string | null
      evidenceHash?: string | null
      payloadHash?: string | null
    }>
  }
  paymentTransaction: {
    id: string
    state: PaymentTransactionState
    providerAccountId: string | null
    providerAccountName: string | null
    providerReference: string | null
    providerTransactionId: string | null
    payloadHash: string | null
    occurredAt: string | null
    confirmedAt: string | null
    settledAt: string | null
  } | null
  matches: Array<{
    id: string
    status: MatchStatus
    rule: string
    confidence: string
    amountMatched: string | null
    providerEventId: string | null
    statementLineId: string | null
    statementFileHash: string | null
    reconciliationRunId: string | null
  }>
  exceptions: Array<{
    id: string
    type: string
    severity: string
    status: PaymentExceptionStatus
    providerEventId: string | null
    statementLineId: string | null
    suspenseItemId: string | null
    resolvedAt: string | null
  }>
  suspenseItems: Array<{
    id: string
    type: string
    status: string
    severity: string
    amount: string
    currency: string
    nextAction: string
  }>
  retry: {
    available: boolean
    attempts: number
    nextAttemptAt: string | null
    lastError: string | null
  }
}

export type PayrollPaymentReconciliationReadModel = {
  organizationId: string
  asOf: string
  summary: {
    batchCount: number
    awaitingProviderEvidence: number
    exceptionOpen: number
    readyToSettle: number
    partiallySettled: number
    settled: number
  }
  redaction: {
    amounts: PayrollPaymentReconciliationRedaction
    providerReferences: PayrollPaymentReconciliationRedaction
    suspenseDetails: PayrollPaymentReconciliationRedaction
  }
  batches: PayrollPaymentReconciliationBatch[]
}

export type PayrollPaymentSettlementResult = {
  payrollPaymentBatchId: string
  payrollRunId: string
  status: PayrollPaymentBatchStatus
  reconciliationStatus: string
  paymentTransactionId: string
  businessEventId: string
  settlementEvidenceHash: string
  idempotent: boolean
}

const payrollPaymentBatchInclude = {
  payrollRun: {
    include: {
      payrollPeriod: true,
    },
  },
  allocations: {
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          displayName: true,
        },
      },
      payslip: {
        select: {
          id: true,
          payslipNumber: true,
          status: true,
          netPayableAmount: true,
          documentHash: true,
          archiveUri: true,
        },
      },
    },
  },
} satisfies Prisma.PayrollPaymentBatchInclude

const paymentTransactionInclude = {
  providerAccount: {
    select: {
      id: true,
      providerCode: true,
      displayName: true,
      externalAccountMasked: true,
    },
  },
} satisfies Prisma.PaymentTransactionInclude

const matchRecordInclude = {
  providerEvent: {
    select: {
      id: true,
      providerEventId: true,
      providerTransactionId: true,
      providerReference: true,
      rawPayloadHash: true,
      signatureHash: true,
      signatureValid: true,
    },
  },
  statementLine: {
    select: {
      id: true,
      providerTransactionId: true,
      providerReference: true,
      rawLineHash: true,
      statementFile: {
        select: {
          id: true,
          fileHash: true,
          fileName: true,
        },
      },
    },
  },
  reconciliationRun: {
    select: {
      id: true,
      status: true,
      certificateHash: true,
    },
  },
} satisfies Prisma.MatchRecordInclude

type PayrollPaymentBatchRecord = Prisma.PayrollPaymentBatchGetPayload<{ include: typeof payrollPaymentBatchInclude }>
type PaymentTransactionRecord = Prisma.PaymentTransactionGetPayload<{ include: typeof paymentTransactionInclude }>
type MatchRecordRecord = Prisma.MatchRecordGetPayload<{ include: typeof matchRecordInclude }>
type PaymentExceptionRecord = Prisma.PaymentExceptionGetPayload<Record<string, never>>
type SuspenseItemRecord = Prisma.SuspenseItemGetPayload<Record<string, never>>
type InboxItemRecord = Prisma.PaymentReconciliationInboxItemGetPayload<Record<string, never>>
type DbClient = typeof db | Prisma.TransactionClient
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0]

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function"
}

async function inTransaction<T>(client: DbClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (hasTransaction(client)) return client.$transaction((tx) => work(tx))
  return work(client as Prisma.TransactionClient)
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function parseDate(value: Date | string | number | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return fallback
}

function decimal(value: Prisma.Decimal.Value | null | undefined) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(2)
}

function decimalString(value: Prisma.Decimal.Value | null | undefined) {
  return decimal(value).toFixed(2)
}

function amount(decision: RedactionDecision, value: Prisma.Decimal.Value | null | undefined) {
  return decision.allowed ? decimalString(value) : decision.replacement
}

function redactText(decision: RedactionDecision, value: string | null | undefined) {
  if (!value) return null
  return decision.allowed ? value : decision.replacement
}

function redactionSummary(decision: RedactionDecision): PayrollPaymentReconciliationRedaction {
  return {
    allowed: decision.allowed,
    mode: decision.mode,
    reasonCode: decision.reasonCode,
    policy: decision.policy,
    requiredPermissions: decision.requiredPermissions,
  }
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

function openException(status: PaymentExceptionStatus) {
  return !new Set<PaymentExceptionStatus>([
    PaymentExceptionStatus.RESOLVED,
    PaymentExceptionStatus.DISMISSED,
  ]).has(status)
}

function settlementMetadataKey(idempotencyKey: string) {
  return `settlement:${idempotencyKey}`
}

function assertReadAllowed(input: z.output<typeof payrollPaymentReconciliationInputSchema>) {
  if (input.moduleDecision && !input.moduleDecision.allowed) {
    throw new ForbiddenError("Payroll payment reconciliation is not available for this tenant.")
  }
  if (!hasAnyRbacPermission(input.actorPermissions, PAYMENT_RECONCILIATION_READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for payroll payment reconciliation.")
  }
}

function assertWriteAllowed(input: z.output<typeof recordPayrollPaymentSettlementInputSchema>) {
  if (input.moduleDecision && !input.moduleDecision.allowed) {
    throw new ForbiddenError("Payroll payment reconciliation is not available for this tenant.")
  }
  if (!hasAnyRbacPermission(input.actorPermissions, PAYMENT_RECONCILIATION_WRITE_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for payroll payment reconciliation settlement.")
  }
}

function paymentTransactionForBatch(
  batch: PayrollPaymentBatchRecord,
  transactionsById: Map<string, PaymentTransactionRecord>,
  transactionsBySourceId: Map<string, PaymentTransactionRecord>,
) {
  if (batch.paymentTransactionId && transactionsById.has(batch.paymentTransactionId)) {
    return transactionsById.get(batch.paymentTransactionId) ?? null
  }
  return transactionsBySourceId.get(batch.id) ?? null
}

function exceptionsForBatch(
  batch: PayrollPaymentBatchRecord,
  transaction: PaymentTransactionRecord | null,
  exceptions: PaymentExceptionRecord[],
) {
  return exceptions.filter((exception) =>
    (exception.sourceType === "PAYROLL_PAYMENT" && exception.sourceId === batch.id) ||
    (transaction?.id && exception.paymentTransactionId === transaction.id),
  )
}

function matchesForTransaction(transaction: PaymentTransactionRecord | null, matches: MatchRecordRecord[]) {
  if (!transaction) return []
  return matches.filter((match) => match.paymentTransactionId === transaction.id)
}

function suspenseForTransaction(transaction: PaymentTransactionRecord | null, suspenseItems: SuspenseItemRecord[]) {
  if (!transaction) return []
  return suspenseItems.filter((item) => item.paymentTransactionId === transaction.id)
}

function inboxForTransaction(transaction: PaymentTransactionRecord | null, inboxItems: InboxItemRecord[]) {
  if (!transaction) return []
  return inboxItems.filter((item) => item.correlationId === transaction.id || item.externalId === transaction.id)
}

function derivedState(input: {
  batch: PayrollPaymentBatchRecord
  transaction: PaymentTransactionRecord | null
  matches: MatchRecordRecord[]
  exceptions: PaymentExceptionRecord[]
  suspenseItems: SuspenseItemRecord[]
}): PayrollPaymentSettlementState {
  if (input.batch.status === PayrollPaymentBatchStatus.SETTLED || input.transaction?.state === PaymentTransactionState.SETTLED) {
    return "SETTLED"
  }
  if (input.batch.status === PayrollPaymentBatchStatus.PARTIALLY_SETTLED) {
    return "PARTIALLY_SETTLED"
  }
  if (!input.batch.ledgerPostingBatchId || input.transaction?.state === PaymentTransactionState.SUSPENSE || input.batch.reconciliationStatus === "LEDGER_BLOCKED") {
    return "LEDGER_BLOCKED"
  }
  if (input.exceptions.some((exception) => openException(exception.status)) || input.suspenseItems.some((item) => item.status !== "RESOLVED" && item.status !== "WRITTEN_OFF")) {
    return "EXCEPTION_OPEN"
  }
  const hasApprovedMatch = input.matches.some((match) =>
    APPROVED_SETTLEMENT_MATCH_STATUSES.has(match.status) &&
    Boolean(match.providerEventId || match.statementLineId),
  )
  if (hasApprovedMatch) return "READY_TO_SETTLE"
  return "AWAITING_PROVIDER_EVIDENCE"
}

function nextAction(state: PayrollPaymentSettlementState) {
  switch (state) {
    case "SETTLED":
      return "No action required. Payment settlement evidence is recorded."
    case "PARTIALLY_SETTLED":
      return "Investigate residual amount and attach follow-up provider evidence."
    case "READY_TO_SETTLE":
      return "Record settlement evidence with fresh authentication and maker-checker control."
    case "EXCEPTION_OPEN":
      return "Resolve payment exceptions or suspense items before settlement."
    case "LEDGER_BLOCKED":
      return "Fix payroll payment ledger posting before reconciliation."
    case "AWAITING_PROVIDER_EVIDENCE":
    default:
      return "Import provider statement or match provider evidence."
  }
}

async function auditReconciliationRead(
  client: Pick<Prisma.TransactionClient, "auditLog">,
  input: {
    organizationId: string
    actorId?: string | null
    batchCount: number
    amountDecision: RedactionDecision
    providerDecision: RedactionDecision
    suspenseDecision: RedactionDecision
  },
) {
  await client.auditLog.create({
    data: {
      entityType: "PayrollPaymentReconciliation",
      entityId: input.organizationId,
      action: "PAYROLL_PAYMENT_RECONCILIATION_READ",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({
        batchCount: input.batchCount,
        redaction: {
          amounts: redactionSummary(input.amountDecision),
          providerReferences: redactionSummary(input.providerDecision),
          suspenseDetails: redactionSummary(input.suspenseDecision),
        },
      }),
    },
  })
}

async function loadReconciliationRows(
  client: Prisma.TransactionClient,
  input: z.output<typeof payrollPaymentReconciliationInputSchema>,
) {
  const batches = await client.payrollPaymentBatch.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.payrollRunId ? { payrollRunId: input.payrollRunId } : {}),
      ...(input.payrollPaymentBatchId ? { id: input.payrollPaymentBatchId } : {}),
    },
    include: payrollPaymentBatchInclude,
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    take: input.limit,
  })

  if (input.payrollPaymentBatchId && batches.length === 0) {
    throw new NotFoundError("Payroll payment batch not found.")
  }

  const batchIds = batches.map((batch) => batch.id)
  const transactionIds = batches.map((batch) => batch.paymentTransactionId).filter((id): id is string => Boolean(id))

  const [transactions, exceptions, matches, suspenseItems, inboxItems] = batchIds.length
    ? await Promise.all([
        client.paymentTransaction.findMany({
          where: {
            organizationId: input.organizationId,
            OR: [
              ...(transactionIds.length ? [{ id: { in: transactionIds } }] : []),
              { sourceType: "PAYROLL_PAYMENT", sourceId: { in: batchIds } },
            ],
          },
          include: paymentTransactionInclude,
        }),
        client.paymentException.findMany({
          where: {
            organizationId: input.organizationId,
            OR: [
              { sourceType: "PAYROLL_PAYMENT", sourceId: { in: batchIds } },
              ...(transactionIds.length ? [{ paymentTransactionId: { in: transactionIds } }] : []),
            ],
          },
          orderBy: { createdAt: "desc" },
        }),
        client.matchRecord.findMany({
          where: {
            organizationId: input.organizationId,
            ...(transactionIds.length ? { paymentTransactionId: { in: transactionIds } } : { paymentTransactionId: "__none__" }),
          },
          include: matchRecordInclude,
          orderBy: { createdAt: "desc" },
        }),
        client.suspenseItem.findMany({
          where: {
            organizationId: input.organizationId,
            ...(transactionIds.length ? { paymentTransactionId: { in: transactionIds } } : { paymentTransactionId: "__none__" }),
          },
          orderBy: { createdAt: "desc" },
        }),
        client.paymentReconciliationInboxItem.findMany({
          where: {
            organizationId: input.organizationId,
            ...(transactionIds.length
              ? {
                  OR: [
                    { correlationId: { in: transactionIds } },
                    { externalId: { in: transactionIds } },
                  ],
                }
              : { id: "__none__" }),
          },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], [], [], [], []]

  return { batches, transactions, exceptions, matches, suspenseItems, inboxItems }
}

function buildReadModel(input: {
  organizationId: string
  amountDecision: RedactionDecision
  providerDecision: RedactionDecision
  suspenseDecision: RedactionDecision
  batches: PayrollPaymentBatchRecord[]
  transactions: PaymentTransactionRecord[]
  exceptions: PaymentExceptionRecord[]
  matches: MatchRecordRecord[]
  suspenseItems: SuspenseItemRecord[]
  inboxItems: InboxItemRecord[]
}): PayrollPaymentReconciliationReadModel {
  const transactionsById = new Map(input.transactions.map((transaction) => [transaction.id, transaction]))
  const transactionsBySourceId = new Map(
    input.transactions
      .filter((transaction) => transaction.sourceType === "PAYROLL_PAYMENT" && transaction.sourceId)
      .map((transaction) => [transaction.sourceId as string, transaction]),
  )

  const batches = input.batches.map<PayrollPaymentReconciliationBatch>((batch) => {
    const transaction = paymentTransactionForBatch(batch, transactionsById, transactionsBySourceId)
    const batchExceptions = exceptionsForBatch(batch, transaction, input.exceptions)
    const batchMatches = matchesForTransaction(transaction, input.matches)
    const batchSuspenseItems = suspenseForTransaction(transaction, input.suspenseItems)
    const batchInboxItems = inboxForTransaction(transaction, input.inboxItems)
    const state = derivedState({
      batch,
      transaction,
      matches: batchMatches,
      exceptions: batchExceptions,
      suspenseItems: batchSuspenseItems,
    })
    const retryAttempts = batchInboxItems.reduce((total, item) => total + item.attempts, 0)
    const latestRetry = batchInboxItems[0] ?? null

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      payrollRunId: batch.payrollRunId,
      runNumber: batch.payrollRun.runNumber,
      periodName: batch.payrollRun.payrollPeriod.name,
      status: batch.status,
      reconciliationStatus: batch.reconciliationStatus,
      amount: amount(input.amountDecision, batch.amount),
      currency: batch.currency,
      method: batch.method,
      paymentDate: batch.paymentDate.toISOString(),
      ledgerPostingBatchId: batch.ledgerPostingBatchId,
      postedBusinessEventId: batch.postedBusinessEventId,
      paymentTransactionId: transaction?.id ?? batch.paymentTransactionId,
      paymentExceptionId: batch.paymentExceptionId,
      evidenceHash: batch.evidenceHash,
      documentHash: batch.documentHash,
      bankFileHash: batch.bankFileHash,
      derivedState: state,
      nextAction: nextAction(state),
      proof: {
        payrollRegisterSource: "services/payroll/payroll-register.service.ts",
        providerEvidenceRequired: state !== "SETTLED",
        closeImpactSourceCode: "PAYROLL_PAYMENT_RECONCILED",
        sourceLinks: [
          { type: "PayrollPaymentBatch", id: batch.id, documentHash: batch.documentHash, evidenceHash: batch.evidenceHash },
          ...batch.allocations.map((allocation) => ({
            type: "PayrollPaymentAllocation",
            id: allocation.id,
            documentHash: allocation.payslip.documentHash,
          })),
          ...(transaction ? [{ type: "PaymentTransaction", id: transaction.id, payloadHash: transaction.payloadHash }] : []),
          ...batchMatches.flatMap((match) => [
            { type: "MatchRecord", id: match.id },
            ...(match.providerEvent ? [{ type: "ProviderEvent", id: match.providerEvent.id, payloadHash: match.providerEvent.rawPayloadHash }] : []),
            ...(match.statementLine ? [{ type: "StatementLine", id: match.statementLine.id, payloadHash: match.statementLine.rawLineHash }] : []),
          ]),
        ],
      },
      paymentTransaction: transaction
        ? {
            id: transaction.id,
            state: transaction.state,
            providerAccountId: transaction.providerAccountId,
            providerAccountName: transaction.providerAccount?.displayName ?? null,
            providerReference: redactText(input.providerDecision, transaction.providerReference),
            providerTransactionId: redactText(input.providerDecision, transaction.providerTransactionId),
            payloadHash: transaction.payloadHash,
            occurredAt: transaction.occurredAt?.toISOString() ?? null,
            confirmedAt: transaction.confirmedAt?.toISOString() ?? null,
            settledAt: transaction.settledAt?.toISOString() ?? null,
          }
        : null,
      matches: batchMatches.map((match) => ({
        id: match.id,
        status: match.status,
        rule: match.rule,
        confidence: decimalString(match.confidence),
        amountMatched: match.amountMatched ? amount(input.amountDecision, match.amountMatched) : null,
        providerEventId: match.providerEventId,
        statementLineId: match.statementLineId,
        statementFileHash: match.statementLine?.statementFile?.fileHash ?? null,
        reconciliationRunId: match.reconciliationRunId,
      })),
      exceptions: batchExceptions.map((exception) => ({
        id: exception.id,
        type: exception.type,
        severity: exception.severity,
        status: exception.status,
        providerEventId: exception.providerEventId,
        statementLineId: exception.statementLineId,
        suspenseItemId: exception.suspenseItemId,
        resolvedAt: exception.resolvedAt?.toISOString() ?? null,
      })),
      suspenseItems: batchSuspenseItems.map((item) => ({
        id: item.id,
        type: input.suspenseDecision.allowed ? item.type : input.suspenseDecision.replacement,
        status: item.status,
        severity: item.severity,
        amount: amount(input.amountDecision, item.amount),
        currency: item.currencyCode,
        nextAction: input.suspenseDecision.allowed ? "Resolve or post suspense before settlement." : input.suspenseDecision.replacement,
      })),
      retry: {
        available: state === "AWAITING_PROVIDER_EVIDENCE" || state === "EXCEPTION_OPEN",
        attempts: retryAttempts,
        nextAttemptAt: latestRetry?.nextAttemptAt?.toISOString() ?? null,
        lastError: input.suspenseDecision.allowed ? latestRetry?.lastError ?? null : latestRetry?.lastError ? input.suspenseDecision.replacement : null,
      },
    }
  })

  return {
    organizationId: input.organizationId,
    asOf: new Date().toISOString(),
    summary: {
      batchCount: batches.length,
      awaitingProviderEvidence: batches.filter((batch) => batch.derivedState === "AWAITING_PROVIDER_EVIDENCE").length,
      exceptionOpen: batches.filter((batch) => batch.derivedState === "EXCEPTION_OPEN").length,
      readyToSettle: batches.filter((batch) => batch.derivedState === "READY_TO_SETTLE").length,
      partiallySettled: batches.filter((batch) => batch.derivedState === "PARTIALLY_SETTLED").length,
      settled: batches.filter((batch) => batch.derivedState === "SETTLED").length,
    },
    redaction: {
      amounts: redactionSummary(input.amountDecision),
      providerReferences: redactionSummary(input.providerDecision),
      suspenseDetails: redactionSummary(input.suspenseDecision),
    },
    batches,
  }
}

export async function getPayrollPaymentReconciliation(
  input: PayrollPaymentReconciliationInput,
  client: DbClient = db,
): Promise<PayrollPaymentReconciliationReadModel> {
  const parsed = payrollPaymentReconciliationInputSchema.parse(input)
  assertReadAllowed(parsed)

  const amountDecision = evaluateRedaction({
    field: "PayrollPaymentReconciliation.amounts",
    category: "payroll_person_amount",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision,
  })
  const providerDecision = evaluateRedaction({
    field: "PayrollPaymentReconciliation.providerReferences",
    category: "payment_provider_reference",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision,
  })
  const suspenseDecision = evaluateRedaction({
    field: "PayrollPaymentReconciliation.suspenseDetails",
    category: "reconciliation_suspense_detail",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision,
  })

  const rows = await loadReconciliationRows(client as Prisma.TransactionClient, parsed)
  const readModel = buildReadModel({
    organizationId: parsed.organizationId,
    amountDecision,
    providerDecision,
    suspenseDecision,
    ...rows,
  })

  await auditReconciliationRead(client as Prisma.TransactionClient, {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    batchCount: readModel.batches.length,
    amountDecision,
    providerDecision,
    suspenseDecision,
  })

  return readModel
}

function assertSettlementEvidence(
  parsed: z.output<typeof recordPayrollPaymentSettlementInputSchema>,
  matchRecord: MatchRecordRecord | null,
) {
  const hasProviderEvidence = Boolean(
    parsed.providerEventId ||
      parsed.statementLineId ||
      parsed.statementFileHash ||
      (matchRecord && (matchRecord.providerEventId || matchRecord.statementLineId)),
  )
  if (!hasProviderEvidence) {
    throw new BusinessRuleError("Payroll payment settlement requires provider event, statement line, or statement file evidence.")
  }
}

function assertSettlementState(
  batch: PayrollPaymentBatchRecord,
  transaction: PaymentTransactionRecord,
  openExceptions: PaymentExceptionRecord[],
  matchRecord: MatchRecordRecord | null,
) {
  if (!SETTLEMENT_READY_BATCH_STATUSES.has(batch.status)) {
    throw new BusinessRuleError("Payroll payment settlement can only be recorded for released payment batches.")
  }
  if (!batch.ledgerPostingBatchId || !batch.postedBusinessEventId) {
    throw new BusinessRuleError("Payroll payment settlement requires posted payroll payment ledger evidence.")
  }
  if (transaction.sourceType !== "PAYROLL_PAYMENT" || transaction.sourceId !== batch.id) {
    throw new BusinessRuleError("Payment transaction is not linked to the payroll payment batch.")
  }
  if (transaction.state === PaymentTransactionState.SUSPENSE) {
    throw new BusinessRuleError("Payroll payment settlement cannot proceed while the payment transaction is in suspense.")
  }
  if (openExceptions.length > 0 && !matchRecord) {
    throw new BusinessRuleError("Open payroll payment exceptions require approved matching evidence before settlement.")
  }
  if (matchRecord && !APPROVED_SETTLEMENT_MATCH_STATUSES.has(matchRecord.status)) {
    throw new BusinessRuleError("Payroll payment settlement requires an approved or auto-matched reconciliation match.")
  }
}

function settlementPayload(input: {
  parsed: z.output<typeof recordPayrollPaymentSettlementInputSchema>
  batch: PayrollPaymentBatchRecord
  transaction: PaymentTransactionRecord
  matchRecord: MatchRecordRecord | null
  now: Date
  nextStatus: PayrollPaymentBatchStatus
}) {
  const amountValue = input.parsed.settlementAmount ? decimal(input.parsed.settlementAmount) : decimal(input.batch.amount)
  return {
    kind: "AQSTOQFLOW_PAYROLL_PAYMENT_SETTLEMENT_EVIDENCE",
    version: 1,
    payrollPaymentBatchId: input.batch.id,
    payrollRunId: input.batch.payrollRunId,
    batchNumber: input.batch.batchNumber,
    previousStatus: input.batch.status,
    nextStatus: input.nextStatus,
    settlementStatus: input.parsed.settlementStatus,
    settlementAmount: amountValue.toFixed(2),
    batchAmount: input.batch.amount.toFixed(2),
    currency: input.batch.currency,
    paymentTransactionId: input.transaction.id,
    paymentTransactionState: input.transaction.state,
    ledgerPostingBatchId: input.batch.ledgerPostingBatchId,
    postedBusinessEventId: input.batch.postedBusinessEventId,
    matchRecordId: input.matchRecord?.id ?? input.parsed.matchRecordId ?? null,
    reconciliationRunId: input.matchRecord?.reconciliationRunId ?? input.parsed.reconciliationRunId ?? null,
    providerAccountId: input.parsed.providerAccountId ?? input.transaction.providerAccountId ?? null,
    providerTransactionId: input.parsed.providerTransactionId ?? input.transaction.providerTransactionId ?? null,
    providerReference: input.parsed.providerReference ?? input.transaction.providerReference ?? null,
    providerEventId: input.parsed.providerEventId ?? input.matchRecord?.providerEventId ?? null,
    statementLineId: input.parsed.statementLineId ?? input.matchRecord?.statementLineId ?? null,
    statementFileHash: input.parsed.statementFileHash ?? input.matchRecord?.statementLine?.statementFile?.fileHash ?? null,
    inputEvidenceHash: input.parsed.evidenceHash,
    settledAt: input.now.toISOString(),
    actorId: input.parsed.actorId,
    approvedById: input.parsed.approvedById ?? null,
  }
}

export async function recordPayrollPaymentSettlementEvidence(
  input: RecordPayrollPaymentSettlementInput,
  client: DbClient = db,
): Promise<PayrollPaymentSettlementResult> {
  const parsed = recordPayrollPaymentSettlementInputSchema.parse(input)
  assertWriteAllowed(parsed)
  const now = parseDate(parsed.now, new Date())

  return inTransaction(client, async (tx) => {
    const batch = await tx.payrollPaymentBatch.findFirst({
      where: {
        id: parsed.payrollPaymentBatchId,
        organizationId: parsed.organizationId,
      },
      include: payrollPaymentBatchInclude,
    })
    if (!batch) throw new NotFoundError("Payroll payment batch not found.")

    const transaction = await tx.paymentTransaction.findFirst({
      where: {
        organizationId: parsed.organizationId,
        OR: [
          ...(batch.paymentTransactionId ? [{ id: batch.paymentTransactionId }] : []),
          { sourceType: "PAYROLL_PAYMENT", sourceId: batch.id },
        ],
      },
      include: paymentTransactionInclude,
    })
    if (!transaction) {
      throw new BusinessRuleError("Payroll payment batch has no linked payment transaction for reconciliation.")
    }

    const [matchRecord, openExceptions] = await Promise.all([
      parsed.matchRecordId
        ? tx.matchRecord.findFirst({
            where: {
              id: parsed.matchRecordId,
              organizationId: parsed.organizationId,
              paymentTransactionId: transaction.id,
            },
            include: matchRecordInclude,
          })
        : Promise.resolve(null),
      tx.paymentException.findMany({
        where: {
          organizationId: parsed.organizationId,
          status: {
            notIn: [PaymentExceptionStatus.RESOLVED, PaymentExceptionStatus.DISMISSED],
          },
          OR: [
            { sourceType: "PAYROLL_PAYMENT", sourceId: batch.id },
            { paymentTransactionId: transaction.id },
          ],
        },
      }),
    ])

    if (parsed.matchRecordId && !matchRecord) {
      throw new NotFoundError("Payroll payment reconciliation match was not found.")
    }

    assertSettlementEvidence(parsed, matchRecord)
    assertSettlementState(batch, transaction, openExceptions, matchRecord)

    const existingSettlement = asRecord(batch.metadata)[settlementMetadataKey(parsed.idempotencyKey)]
    if (existingSettlement) {
      const existing = asRecord(existingSettlement)
      if (existing.inputEvidenceHash !== parsed.evidenceHash) {
        throw new ConflictError("Payroll payment settlement idempotency key was reused with a different evidence hash.")
      }
      return {
        payrollPaymentBatchId: batch.id,
        payrollRunId: batch.payrollRunId,
        status: batch.status,
        reconciliationStatus: batch.reconciliationStatus ?? "SETTLEMENT_REPLAY",
        paymentTransactionId: transaction.id,
        businessEventId: String(existing.businessEventId ?? ""),
        settlementEvidenceHash: String(existing.settlementEvidenceHash ?? parsed.evidenceHash),
        idempotent: true,
      }
    }

    const nextBatchStatus =
      parsed.settlementStatus === "settled"
        ? PayrollPaymentBatchStatus.SETTLED
        : PayrollPaymentBatchStatus.PARTIALLY_SETTLED
    const reconciliationStatus =
      parsed.settlementStatus === "settled"
        ? "SETTLED"
        : "PARTIALLY_SETTLED"
    const evidence = settlementPayload({
      parsed,
      batch,
      transaction,
      matchRecord,
      now,
      nextStatus: nextBatchStatus,
    })
    const settlementEvidenceHash = prefixedHash(evidence)
    const controlDecision = evaluateSensitiveAction({
      action: "payroll.payment.reconcile",
      actorId: parsed.actorId ?? null,
      organizationId: parsed.organizationId,
      actorPermissions: parsed.actorPermissions,
      subjectActorId: batch.releasedById ?? batch.approvedById ?? batch.requestedById,
      lastAuthAt: parsed.lastAuthAt,
      now,
      resourceType: "PayrollPaymentBatch",
      resourceId: batch.id,
      amount: parsed.settlementAmount ?? batch.amount,
      currency: batch.currency,
      metadata: {
        settlementStatus: parsed.settlementStatus,
        paymentTransactionId: transaction.id,
        matchRecordId: matchRecord?.id ?? null,
        openExceptionCount: openExceptions.length,
      },
    })
    await auditSensitiveActionDecision(tx, controlDecision)
    assertSensitiveActionAllowed(controlDecision)

    const updatedTransaction = await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        state: parsed.settlementStatus === "settled"
          ? PaymentTransactionState.SETTLED
          : PaymentTransactionState.CONFIRMED,
        providerAccountId: parsed.providerAccountId ?? transaction.providerAccountId,
        providerTransactionId: parsed.providerTransactionId ?? transaction.providerTransactionId,
        providerReference: parsed.providerReference ?? transaction.providerReference,
        confirmedAt: transaction.confirmedAt ?? now,
        settledAt: parsed.settlementStatus === "settled" ? now : transaction.settledAt,
        metadata: safeJson({
          ...asRecord(transaction.metadata),
          latestPayrollSettlementEvidenceHash: settlementEvidenceHash,
          latestPayrollSettlementAt: now.toISOString(),
          latestPayrollSettlementStatus: parsed.settlementStatus,
        }),
      },
    })

    if (openExceptions.length > 0) {
      await tx.paymentException.updateMany({
        where: {
          id: { in: openExceptions.map((exception) => exception.id) },
          organizationId: parsed.organizationId,
        },
        data: {
          status: PaymentExceptionStatus.RESOLVED,
          resolvedAt: now,
          resolutionNotes: "Resolved by payroll payment settlement evidence.",
          providerEventId: parsed.providerEventId ?? matchRecord?.providerEventId ?? undefined,
          statementLineId: parsed.statementLineId ?? matchRecord?.statementLineId ?? undefined,
          reconciliationRunId: parsed.reconciliationRunId ?? matchRecord?.reconciliationRunId ?? undefined,
          metadata: safeJson({
            settlementEvidenceHash,
            payrollPaymentBatchId: batch.id,
          }),
        },
      })
    }

    const eventResult = await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
      organizationId: parsed.organizationId,
      eventType: "payroll.payment_batch.reconciled",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: `payroll-payment-reconciliation:${batch.id}:${parsed.idempotencyKey}`,
      payload: {
        payrollPaymentBatchId: batch.id,
        payrollRunId: batch.payrollRunId,
        batchNumber: batch.batchNumber,
        previousStatus: batch.status,
        nextStatus: nextBatchStatus,
        reconciliationStatus,
        settlementEvidenceHash,
        paymentTransactionId: updatedTransaction.id,
        paymentTransactionState: updatedTransaction.state,
        matchRecordId: matchRecord?.id ?? null,
        providerEventId: parsed.providerEventId ?? matchRecord?.providerEventId ?? null,
        statementLineId: parsed.statementLineId ?? matchRecord?.statementLineId ?? null,
        statementFileHash: parsed.statementFileHash ?? matchRecord?.statementLine?.statementFile?.fileHash ?? null,
      },
      occurredAt: now,
      actorId: parsed.actorId ?? undefined,
      sourceType: AccountingSourceType.PAYROLL_PAYMENT,
      sourceId: batch.id,
      postingBatchId: batch.ledgerPostingBatchId ?? undefined,
      documentHash: settlementEvidenceHash,
      metadata: {
        gate: "aqstoqflow-hrpayroll-17-payment-reconciliation",
        settlementEvidenceHash,
        closeImpactSourceCode: "PAYROLL_PAYMENT_RECONCILED",
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "payroll_payment_batch.reconciled",
          destination: "accounting",
          payload: {
            severity: parsed.settlementStatus === "settled" ? "info" : "warning",
            payrollPaymentBatchId: batch.id,
            payrollRunId: batch.payrollRunId,
            reconciliationStatus,
            paymentTransactionId: updatedTransaction.id,
          },
        },
      ],
    })
    await markBusinessEventAppliedInTx(tx as unknown as BusinessEventTx, parsed.organizationId, eventResult.event.id)

    const updatedBatch = await tx.payrollPaymentBatch.update({
      where: { id: batch.id },
      data: {
        status: nextBatchStatus,
        reconciliationStatus,
        paymentExceptionId: null,
        metadata: safeJson({
          ...asRecord(batch.metadata),
          latestSettlementEvidenceHash: settlementEvidenceHash,
          latestSettlementBusinessEventId: eventResult.event.id,
          latestSettlementAt: now.toISOString(),
          latestSettlementStatus: parsed.settlementStatus,
          [settlementMetadataKey(parsed.idempotencyKey)]: {
            businessEventId: eventResult.event.id,
            inputEvidenceHash: parsed.evidenceHash,
            settlementEvidenceHash,
          },
          requestedMetadata: parsed.metadata ?? null,
        }),
      },
    })

    await recordCloseCertificationInvalidationsForSourceInTx(
      tx,
      parsed.organizationId,
      {
        sourceCode: "PAYROLL_PAYMENT_RECONCILED",
        sourceId: batch.id,
        periodId: batch.payrollRun.payrollPeriod.accountingPeriodId ?? undefined,
        periodStart: batch.paymentDate,
        periodEnd: batch.paymentDate,
        staleReason: "Payroll payment settlement evidence changed certified close evidence.",
        newEvidenceHash: settlementEvidenceHash,
        correlationId: eventResult.event.id,
      },
      {
        actorId: parsed.actorId ?? null,
        now,
      },
    )

    await tx.auditLog.create({
      data: {
        entityType: "PayrollPaymentBatch",
        entityId: batch.id,
        action: "PAYROLL_PAYMENT_RECONCILIATION_RECORDED",
        userId: parsed.actorId ?? null,
        organizationId: parsed.organizationId,
        changes: safeJson({
          before: {
            status: batch.status,
            reconciliationStatus: batch.reconciliationStatus,
            paymentTransactionState: transaction.state,
          },
          after: {
            status: updatedBatch.status,
            reconciliationStatus: updatedBatch.reconciliationStatus,
            paymentTransactionState: updatedTransaction.state,
            settlementEvidenceHash,
            businessEventId: eventResult.event.id,
          },
        }),
      },
    })

    return {
      payrollPaymentBatchId: updatedBatch.id,
      payrollRunId: updatedBatch.payrollRunId,
      status: updatedBatch.status,
      reconciliationStatus: updatedBatch.reconciliationStatus ?? reconciliationStatus,
      paymentTransactionId: updatedTransaction.id,
      businessEventId: eventResult.event.id,
      settlementEvidenceHash,
      idempotent: false,
    }
  })
}

