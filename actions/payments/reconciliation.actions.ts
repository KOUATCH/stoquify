"use server"

import { z } from "zod"

import {
  FreshAuthRequiredError,
  SESSION_ASSURANCE_LEVEL,
} from "@/lib/security/auth-session"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import {
  getPaymentReconciliationDashboardData,
  type PaymentReconciliationDashboardData as DashboardServiceData,
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
import { readPaymentSuspenseRecords, suspenseReadSchema, type SuspenseReadPage } from "@/services/reconciliation/payment-suspense-read.service"
import { previewSuspenseCorrection, proposeSuspenseCorrection, reviewSuspenseCorrection, decideSuspenseCorrection, readSuspenseCorrectionHistory } from "@/services/reconciliation/payment-suspense-correction.service"
import { suspenseCorrectionDraftSchema, suspenseCorrectionProposalSchema, suspenseCorrectionDecisionSchema, suspenseCorrectionReviewSchema, suspenseCorrectionHistorySchema, suspenseCorrectionExportSchema } from "@/services/reconciliation/payment-suspense-correction.contracts"
import { exportSuspenseCorrection } from "@/services/reconciliation/payment-suspense-correction-export.service"
import { reconciliationCertificateExportSchema } from "@/services/reconciliation/reconciliation-certificate-export.contracts"
import { readReconciliationCertificateHistory } from "@/services/reconciliation/reconciliation-certificate-history.service"
import { certificateHistorySchema, type CertificateHistoryPage } from "@/services/reconciliation/reconciliation-certificate-history.contracts"

export type PaymentReconciliationDashboardData = DashboardServiceData & { scope: { organizationId: string; actorId: string } }
export type PaymentSuspenseRecords = SuspenseReadPage & { scope: PaymentReconciliationDashboardData["scope"] }
export type { ImportProviderStatementResult, ReconciliationCertificateExportResult, ReconciliationRunDetail, SignReconciliationRunResult }

const suspenseTypes = [
  "UNKNOWN_CREDIT",
  "MISSING_CALLBACK",
  "MISSING_STATEMENT_LINE",
  "AMOUNT_MISMATCH",
  "DUPLICATE_PROVIDER_ID",
  "ORPHAN_REFUND",
  "FEE_DEVIATION",
  "SETTLEMENT_SHORTFALL",
  "SIGNATURE_FAILURE",
  "REPLAY_SPIKE",
  "FAILED_BUT_DEBITED",
  "SUCCEEDED_BUT_NOT_CREDITED",
  "CASH_DEPOSIT_DELAY",
  "OTHER",
] as const

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
  idempotencyKey: z.string().min(16).max(128),
  supersedesProposalId: z.string().min(1).optional(),
  providerAccountId: z.string().min(1),
  paymentTransactionId: z.string().min(1),
  providerEventId: z.string().optional(),
  statementLineId: z.string().optional(),
  amountMatched: z.union([z.string(), z.number()]),
  currencyCode: z.string().optional(),
  correlationId: z.string().optional(),
})

const approveManualMatchSchema = z.object({
  expectedEvidenceRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  proposedMatchId: z.string().min(1),
  correlationId: z.string().optional(),
})

const assignSuspenseItemSchema = z.object({
  suspenseItemId: z.string().min(1),
  assignedToId: z.string().min(1).optional(),
  correlationId: z.string().optional(),
})

const proposeSuspenseReclassificationSchema = z.object({
  expectedEvidenceRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/),
  suspenseItemId: z.string().min(1),
  targetType: z.enum(suspenseTypes),
  reason: z.string().trim().min(3),
  suspenseLedgerAccountId: z.string().trim().min(1).nullable().optional(),
  correlationId: z.string().optional(),
})

const approveSuspensePostingSchema = z.object({
  expectedEvidenceRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  suspenseItemId: z.string().min(1),
  correlationId: z.string().optional(),
})

const signRunSchema = z.object({
  runId: z.string().min(1),
  expectedEvidenceRevision: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  expectedSourceVersionHash: z
    .string()
    .regex(/^sha256:[a-f0-9]{64}$/),
  correlationId: z.string().optional(),
})


const getDashboard = protect<unknown, PaymentReconciliationDashboardData>(
  { permission: "payments.reconciliation.read", auditResource: "PaymentReconciliation", auditAllowed: false },
  async (_input, ctx) => ({ ...await getPaymentReconciliationDashboardData(ctx.orgId), scope: { organizationId: ctx.orgId, actorId: ctx.userId } }),
)

const getSuspenseRecords = protect<unknown, PaymentSuspenseRecords>(
  { permission: "payments.reconciliation.read", auditResource: "SuspenseItem", auditAllowed: false,
    module: { moduleSlug: "payment_reconciliation", surface: "actions/payments/reconciliation.actions.ts#getPaymentSuspenseRecordsAction", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: false } },
  async (input, ctx) => ({ ...await readPaymentSuspenseRecords(ctx.orgId, suspenseReadSchema.parse(input)), scope: { organizationId: ctx.orgId, actorId: ctx.userId } }),
)

const correctionReadModule = { moduleSlug: "payment_reconciliation", surface: "actions/payments/reconciliation.actions.ts", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: false } as const
const correctionWriteModule = { ...correctionReadModule, accessIntent: "write", audit: true } as const
function correctionControl(ctx: ProtectedActionContext) { return { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions } }
type CorrectionActionData<T> = T & { scope: { organizationId: string; actorId: string } }
function correctionScope<T>(data: T, ctx: ProtectedActionContext): CorrectionActionData<T> { return { ...data, scope: { organizationId: ctx.orgId, actorId: ctx.userId } } }
const correctionPreview = protect<unknown, CorrectionActionData<Awaited<ReturnType<typeof previewSuspenseCorrection>>>>(
  { permission: "payments.reconciliation.read", auditResource: "SuspenseItem", module: correctionReadModule },
  async (input, ctx) => correctionScope(await previewSuspenseCorrection(suspenseCorrectionDraftSchema.parse(input), correctionControl(ctx)), ctx),
)
const correctionPropose = protect<unknown, CorrectionActionData<Awaited<ReturnType<typeof proposeSuspenseCorrection>>>>(
  { permission: "payments.reconciliation.suspense.propose", auditResource: "SuspenseItem", module: correctionWriteModule },
  async (input, ctx) => correctionScope(await proposeSuspenseCorrection(suspenseCorrectionProposalSchema.parse(input), correctionControl(ctx)), ctx),
)
const correctionReview = protect<unknown, CorrectionActionData<Awaited<ReturnType<typeof reviewSuspenseCorrection>>>>(
  { permission: "payments.reconciliation.read", auditResource: "SuspenseItem", module: correctionReadModule },
  async (input, ctx) => { const parsed = suspenseCorrectionReviewSchema.parse(input); return correctionScope(await reviewSuspenseCorrection(parsed.suspenseItemId, parsed.proposalId, correctionControl(ctx)), ctx) },
)
const correctionDecide = protect<unknown, CorrectionActionData<Awaited<ReturnType<typeof decideSuspenseCorrection>>>>(
  { permission: "payments.reconciliation.suspense.post", auditResource: "SuspenseItem", freshAuth: { maxAgeSeconds: 300 }, module: correctionWriteModule },
  async (input, ctx) => correctionScope(await decideSuspenseCorrection(suspenseCorrectionDecisionSchema.parse(input), { ...correctionControl(ctx), lastAuthAt: verifiedFreshAuthTime(ctx) }), ctx),
)
const correctionHistory = protect<unknown, CorrectionActionData<Awaited<ReturnType<typeof readSuspenseCorrectionHistory>>>>(
  { permission: "payments.reconciliation.read", auditResource: "SuspenseItem", module: correctionReadModule },
  async (input, ctx) => correctionScope(await readSuspenseCorrectionHistory(suspenseCorrectionHistorySchema.parse(input), correctionControl(ctx)), ctx),
)
const correctionExport = protect<unknown, CorrectionActionData<Awaited<ReturnType<typeof exportSuspenseCorrection>>>>(
  { permission: "payments.export", auditResource: "SuspenseCorrectionRecord", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 }, module: correctionReadModule },
  async (input, ctx) => correctionScope(await exportSuspenseCorrection(suspenseCorrectionExportSchema.parse(input), { ...correctionControl(ctx), lastAuthAt: verifiedFreshAuthTime(ctx) }), ctx),
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
  {
    permission: "payments.reconciliation.match", auditResource: "PaymentReconciliationMatch", auditAllowed: true,
    module: { moduleSlug: "payment_reconciliation", surface: "actions/payments/reconciliation.actions.ts", surfaceType: "action", accessIntent: "write", mode: "enforce", audit: true },
  },
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
      idempotencyKey: parsed.idempotencyKey,
      supersedesProposalId: parsed.supersedesProposalId,
      control: { actorPermissions: ctx.permissions },
      currencyCode: parsed.currencyCode,
      correlationId: parsed.correlationId,
    })
  },
)

const approveMatch = protect<unknown, Awaited<ReturnType<typeof approveManualMatch>>>(
  {
    permission: "payments.reconciliation.override", auditResource: "PaymentReconciliationMatch", auditAllowed: true, freshAuth: true,
    module: { moduleSlug: "payment_reconciliation", surface: "actions/payments/reconciliation.actions.ts", surfaceType: "action", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = approveManualMatchSchema.parse(input)
    return approveManualMatch({
      organizationId: ctx.orgId,
      proposedMatchId: parsed.proposedMatchId,
      approvedById: ctx.userId,
      expectedEvidenceRevision: parsed.expectedEvidenceRevision,
      control: { actorPermissions: ctx.permissions, lastAuthAt: verifiedFreshAuthTime(ctx) },
      correlationId: parsed.correlationId,
    })
  },
)

const assignSuspense = protect<unknown, Awaited<ReturnType<typeof assignPaymentSuspenseItem>>>(
  {
    permission: "payments.reconciliation.exception.assign", auditResource: "PaymentReconciliationException", auditAllowed: true,
    module: { moduleSlug: "payment_reconciliation", surface: "actions/payments/reconciliation.actions.ts", surfaceType: "action", accessIntent: "write", mode: "enforce", audit: true },
  },
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
  {
    permission: "payments.reconciliation.suspense.propose", auditResource: "PaymentSuspenseItem", auditAllowed: true,
    module: { moduleSlug: "payment_reconciliation", surface: "actions/payments/reconciliation.actions.ts", surfaceType: "action", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = proposeSuspenseReclassificationSchema.parse(input)
    return proposeSuspenseReclassification({
      expectedEvidenceRevision: parsed.expectedEvidenceRevision,
      idempotencyKey: parsed.idempotencyKey,
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
  {
    permission: "payments.reconciliation.suspense.post", auditResource: "PaymentSuspenseItem", auditAllowed: true, freshAuth: true,
    module: { moduleSlug: "payment_reconciliation", surface: "actions/payments/reconciliation.actions.ts", surfaceType: "action", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = approveSuspensePostingSchema.parse(input)
    return approveSuspensePosting({
      expectedEvidenceRevision: parsed.expectedEvidenceRevision,
      organizationId: ctx.orgId,
      suspenseItemId: parsed.suspenseItemId,
      approvedById: ctx.userId,
      control: {
        actorPermissions: ctx.permissions,
        lastAuthAt: verifiedFreshAuthTime(ctx),
      },
      correlationId: parsed.correlationId,
    })
  },
)

const signRun = protect<unknown, SignReconciliationRunResult>(
  {
    permission: "payments.reconciliation.sign",
    auditResource: "PaymentReconciliationRun",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: {
      moduleSlug: "payment_reconciliation",
      surface: "actions/payments/reconciliation.actions.ts",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = signRunSchema.parse(input)
    const lastAuthAt = verifiedFreshAuthTime(ctx)

    return signReconciliationRun({
      organizationId: ctx.orgId,
      runId: parsed.runId,
      signedById: ctx.userId,
      expectedSourceVersionHash: parsed.expectedSourceVersionHash,
      expectedEvidenceRevision: parsed.expectedEvidenceRevision,
      control: {
        actorPermissions: ctx.permissions,
        lastAuthAt,
      },
      correlationId: parsed.correlationId,
    })
  },
)

const readCertificateHistory = protect<unknown, CertificateHistoryPage>(
  { permission: "payments.reconciliation.read", auditResource: "ReconciliationCertificateHistory", auditAllowed: false, module: correctionReadModule },
  async (input, ctx) => readReconciliationCertificateHistory(certificateHistorySchema.parse(input), { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }),
)

export async function readReconciliationCertificateHistoryAction(input: unknown) { return readCertificateHistory(input) }

const exportCertificate = protect<unknown, ReconciliationCertificateExportResult & { scope: { organizationId: string; actorId: string } }>(
  {
    permission: "payments.reconciliation.certificate.export",
    auditResource: "PaymentReconciliationCertificate",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    module: correctionReadModule,
  },
  async (input, ctx) => {
    const parsed = reconciliationCertificateExportSchema.parse(input)
    const data = await exportReconciliationCertificate({
      ...parsed,
      organizationId: ctx.orgId,
      runId: parsed.runId,
      exportedById: ctx.userId,
      fileType: parsed.fileType,
      control: {
        actorPermissions: ctx.permissions,
        lastAuthAt: verifiedFreshAuthTime(ctx),
      },
      correlationId: parsed.correlationId,
    })
    return { ...data, scope: { organizationId: ctx.orgId, actorId: ctx.userId } }
  },
)

export async function getPaymentReconciliationDashboardAction(input: unknown = {}) {
  return getDashboard(input)
}

export async function getPaymentSuspenseRecordsAction(input: unknown = {}) {
  return getSuspenseRecords(input)
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

export async function previewSuspenseCorrectionAction(input: unknown) { return correctionPreview(input) }
export async function proposeSuspenseCorrectionAction(input: unknown) { return correctionPropose(input) }
export async function reviewSuspenseCorrectionAction(input: unknown) { return correctionReview(input) }
export async function decideSuspenseCorrectionAction(input: unknown) { return correctionDecide(input) }
export async function readSuspenseCorrectionHistoryAction(input: unknown) { return correctionHistory(input) }
export async function exportSuspenseCorrectionAction(input: unknown) { return correctionExport(input) }

function verifiedFreshAuthTime(ctx: ProtectedActionContext) {
  const freshAuth = ctx.freshAuth
  if (
    !freshAuth ||
    freshAuth.claims.userId !== ctx.userId ||
    freshAuth.claims.tenantId !== ctx.orgId ||
    freshAuth.claims.assuranceOrganizationId !== ctx.orgId ||
    freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
    freshAuth.claims.lastAuthAt !== freshAuth.lastAuthAt.getTime()
  ) {
    throw new FreshAuthRequiredError()
  }

  return freshAuth.lastAuthAt
}
