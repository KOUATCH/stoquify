"use server"

import { SuspenseType } from "@prisma/client"
import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  getPaymentReconciliationDashboardData,
  type PaymentReconciliationDashboardData,
} from "@/services/reconciliation/payment-reconciliation-dashboard.service"
import {
  exportReconciliationCertificate,
  getReconciliationRunDetail,
  signReconciliationRun,
  type ReconciliationCertificateExportResult,
  type ReconciliationRunDetail,
  type SignReconciliationRunResult,
} from "@/services/reconciliation/payment-reconciliation-certification.service"
import {
  approveManualMatch,
  proposeManualMatch,
  runPaymentReconciliation,
} from "@/services/reconciliation/payment-reconciliation-run.service"
import {
  approveSuspensePosting,
  assignPaymentSuspenseItem,
  proposeSuspenseReclassification,
} from "@/services/reconciliation/payment-suspense-workflow.service"
import { MobileMoneyHmacAdapter } from "@/services/payments/adapters/mobile-money-hmac.adapter"
import { importProviderStatement, type ImportProviderStatementResult } from "@/services/payments/statement-import.service"

export type { PaymentReconciliationDashboardData }
export type { ImportProviderStatementResult, ReconciliationCertificateExportResult, ReconciliationRunDetail, SignReconciliationRunResult }

const runInputSchema = z.object({
  providerAccountId: z.string().min(1),
  businessDate: z.coerce.date(),
  correlationId: z.string().optional(),
})

const runDetailSchema = z.object({
  runId: z.string().min(1),
})

const importStatementSchema = z.object({
  providerAccountId: z.string().min(1),
  providerCode: z.string().trim().min(1).optional(),
  rawContent: z.string().min(1),
  fileName: z.string().trim().min(1).optional(),
  correlationId: z.string().optional(),
})

const proposeManualMatchSchema = z.object({
  providerAccountId: z.string().min(1),
  paymentTransactionId: z.string().min(1),
  providerEventId: z.string().optional(),
  statementLineId: z.string().optional(),
  amountMatched: z.union([z.string(), z.number()]),
  currencyCode: z.string().optional(),
  correlationId: z.string().optional(),
})

const approveManualMatchSchema = z.object({
  proposedMatchId: z.string().min(1),
  correlationId: z.string().optional(),
})

const assignSuspenseItemSchema = z.object({
  suspenseItemId: z.string().min(1),
  assignedToId: z.string().min(1).optional(),
  correlationId: z.string().optional(),
})

const proposeSuspenseReclassificationSchema = z.object({
  suspenseItemId: z.string().min(1),
  targetType: z.nativeEnum(SuspenseType),
  reason: z.string().trim().min(3),
  suspenseLedgerAccountId: z.string().trim().min(1).nullable().optional(),
  correlationId: z.string().optional(),
})

const approveSuspensePostingSchema = z.object({
  suspenseItemId: z.string().min(1),
  correlationId: z.string().optional(),
})

const signRunSchema = z.object({
  runId: z.string().min(1),
  correlationId: z.string().optional(),
})

const exportCertificateSchema = z.object({
  runId: z.string().min(1),
  fileType: z.literal("json").optional(),
  correlationId: z.string().optional(),
})

const getDashboard = protect<unknown, PaymentReconciliationDashboardData>(
  { permission: "payments.reconciliation.read", auditResource: "PaymentReconciliation", auditAllowed: false },
  async (_input, ctx) => getPaymentReconciliationDashboardData(ctx.orgId),
)

const getRunDetail = protect<unknown, ReconciliationRunDetail>(
  { permission: "payments.reconciliation.read", auditResource: "PaymentReconciliationRun", auditAllowed: false },
  async (input, ctx) => {
    const parsed = runDetailSchema.parse(input)
    return getReconciliationRunDetail(ctx.orgId, parsed.runId)
  },
)

const importStatement = protect<unknown, ImportProviderStatementResult>(
  { permission: "payments.reconciliation.import", auditResource: "PaymentStatementImport", auditAllowed: true },
  async (input, ctx) => {
    const parsed = importStatementSchema.parse(input)
    const adapter = new MobileMoneyHmacAdapter(parsed.providerCode ?? "GENERIC")
    return importProviderStatement({
      organizationId: ctx.orgId,
      providerAccountId: parsed.providerAccountId,
      adapter,
      rawContent: parsed.rawContent,
      fileName: parsed.fileName,
      importedById: ctx.userId,
      correlationId: parsed.correlationId,
    })
  },
)

const runReconciliation = protect<unknown, Awaited<ReturnType<typeof runPaymentReconciliation>>>(
  { permission: "payments.reconciliation.run", auditResource: "PaymentReconciliationRun", auditAllowed: true },
  async (input, ctx) => {
    const parsed = runInputSchema.parse(input)
    return runPaymentReconciliation({
      organizationId: ctx.orgId,
      providerAccountId: parsed.providerAccountId,
      businessDate: parsed.businessDate,
      runById: ctx.userId,
      correlationId: parsed.correlationId,
    })
  },
)

const proposeMatch = protect<unknown, Awaited<ReturnType<typeof proposeManualMatch>>>(
  { permission: "payments.reconciliation.match", auditResource: "PaymentReconciliationMatch", auditAllowed: true },
  async (input, ctx) => {
    const parsed = proposeManualMatchSchema.parse(input)
    return proposeManualMatch({
      organizationId: ctx.orgId,
      providerAccountId: parsed.providerAccountId,
      paymentTransactionId: parsed.paymentTransactionId,
      providerEventId: parsed.providerEventId,
      statementLineId: parsed.statementLineId,
      proposedById: ctx.userId,
      amountMatched: parsed.amountMatched,
      currencyCode: parsed.currencyCode,
      correlationId: parsed.correlationId,
    })
  },
)

const approveMatch = protect<unknown, Awaited<ReturnType<typeof approveManualMatch>>>(
  { permission: "payments.reconciliation.override", auditResource: "PaymentReconciliationMatch", auditAllowed: true, freshAuth: true },
  async (input, ctx) => {
    const parsed = approveManualMatchSchema.parse(input)
    return approveManualMatch({
      organizationId: ctx.orgId,
      proposedMatchId: parsed.proposedMatchId,
      approvedById: ctx.userId,
      correlationId: parsed.correlationId,
    })
  },
)

const assignSuspense = protect<unknown, Awaited<ReturnType<typeof assignPaymentSuspenseItem>>>(
  { permission: "payments.reconciliation.exception.assign", auditResource: "PaymentReconciliationException", auditAllowed: true },
  async (input, ctx) => {
    const parsed = assignSuspenseItemSchema.parse(input)
    return assignPaymentSuspenseItem({
      organizationId: ctx.orgId,
      suspenseItemId: parsed.suspenseItemId,
      assignedById: ctx.userId,
      assignedToId: parsed.assignedToId ?? ctx.userId,
      control: {
        actorPermissions: ctx.permissions,
      },
      correlationId: parsed.correlationId,
    })
  },
)

const proposeSuspense = protect<unknown, Awaited<ReturnType<typeof proposeSuspenseReclassification>>>(
  { permission: "payments.reconciliation.suspense.propose", auditResource: "PaymentSuspenseItem", auditAllowed: true },
  async (input, ctx) => {
    const parsed = proposeSuspenseReclassificationSchema.parse(input)
    return proposeSuspenseReclassification({
      organizationId: ctx.orgId,
      suspenseItemId: parsed.suspenseItemId,
      proposedById: ctx.userId,
      targetType: parsed.targetType,
      reason: parsed.reason,
      suspenseLedgerAccountId: parsed.suspenseLedgerAccountId,
      control: {
        actorPermissions: ctx.permissions,
      },
      correlationId: parsed.correlationId,
    })
  },
)

const approveSuspense = protect<unknown, Awaited<ReturnType<typeof approveSuspensePosting>>>(
  { permission: "payments.reconciliation.suspense.post", auditResource: "PaymentSuspenseItem", auditAllowed: true, freshAuth: true },
  async (input, ctx) => {
    const parsed = approveSuspensePostingSchema.parse(input)
    return approveSuspensePosting({
      organizationId: ctx.orgId,
      suspenseItemId: parsed.suspenseItemId,
      approvedById: ctx.userId,
      control: {
        actorPermissions: ctx.permissions,
        lastAuthAt: Date.now(),
      },
      correlationId: parsed.correlationId,
    })
  },
)

const signRun = protect<unknown, SignReconciliationRunResult>(
  { permission: "payments.reconciliation.sign", auditResource: "PaymentReconciliationRun", auditAllowed: true, freshAuth: true },
  async (input, ctx) => {
    const parsed = signRunSchema.parse(input)
    return signReconciliationRun({
      organizationId: ctx.orgId,
      runId: parsed.runId,
      signedById: ctx.userId,
      control: {
        actorPermissions: ctx.permissions,
        lastAuthAt: Date.now(),
      },
      correlationId: parsed.correlationId,
    })
  },
)

const exportCertificate = protect<unknown, ReconciliationCertificateExportResult>(
  {
    permission: "payments.reconciliation.certificate.export",
    auditResource: "PaymentReconciliationCertificate",
    auditAllowed: true,
    freshAuth: true,
  },
  async (input, ctx) => {
    const parsed = exportCertificateSchema.parse(input)
    return exportReconciliationCertificate({
      organizationId: ctx.orgId,
      runId: parsed.runId,
      exportedById: ctx.userId,
      fileType: parsed.fileType,
      control: {
        actorPermissions: ctx.permissions,
        lastAuthAt: Date.now(),
      },
      correlationId: parsed.correlationId,
    })
  },
)

export async function getPaymentReconciliationDashboardAction(input: unknown = {}) {
  return getDashboard(input)
}

export async function getReconciliationRunDetailAction(input: unknown) {
  return getRunDetail(input)
}

export async function importProviderStatementAction(input: unknown) {
  return importStatement(input)
}

export async function runPaymentReconciliationAction(input: unknown) {
  return runReconciliation(input)
}

export async function proposeManualMatchAction(input: unknown) {
  return proposeMatch(input)
}

export async function approveManualMatchAction(input: unknown) {
  return approveMatch(input)
}

export async function assignPaymentSuspenseItemAction(input: unknown) {
  return assignSuspense(input)
}

export async function proposeSuspenseReclassificationAction(input: unknown) {
  return proposeSuspense(input)
}

export async function approveSuspensePostingAction(input: unknown) {
  return approveSuspense(input)
}

export async function signReconciliationRunAction(input: unknown) {
  return signRun(input)
}

export async function exportReconciliationCertificateAction(input: unknown) {
  return exportCertificate(input)
}
