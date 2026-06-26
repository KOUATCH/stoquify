import "server-only"

import {
  AccountingSourceType,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollPayslipStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { BusinessRuleError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { auditExportSafetyDecision, buildExportWatermark, evaluateExportSafety } from "@/services/security/export-safety.service"
import { evaluateRedaction, type RedactionDecision } from "@/services/security/redaction-policy.service"

const REGISTER_READ_PERMISSIONS = ["payroll.reports.read", "payroll.command.read"] as const
const REGISTER_EXPORT_PERMISSIONS = ["payroll.exports.create"] as const
const dateInputSchema = z.union([z.date(), z.string(), z.number()]).optional()

const actorContextSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).optional().default([]),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
})

export const payrollRegisterInputSchema = actorContextSchema.extend({
  payrollRunId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
})

export const preparePayrollRegisterExportInputSchema = actorContextSchema.extend({
  payrollRunId: z.string().trim().min(1),
  purpose: z.string().trim().min(3).max(160).optional().default("PAYROLL_REGISTER_TIE_OUT_EXPORT"),
  fileType: z.literal("json").optional().default("json"),
  lastAuthAt: dateInputSchema,
  now: dateInputSchema,
})

export type PayrollRegisterInput = z.input<typeof payrollRegisterInputSchema>
export type PreparePayrollRegisterExportInput = z.input<typeof preparePayrollRegisterExportInputSchema>

export type PayrollRegisterAmountRedaction = {
  allowed: boolean
  mode: RedactionDecision["mode"]
  reasonCode: RedactionDecision["reasonCode"]
  policy: string
  requiredPermissions: string[]
}

export type PayrollRegisterTieOutStatus = "MATCHED" | "MISMATCH" | "MISSING" | "PENDING"

export type PayrollRegisterAmountCheck = {
  status: PayrollRegisterTieOutStatus
  expectedAmount: string
  actualAmount: string
  deltaAmount: string
  currency: string
  source: string
}

export type PayrollRegisterCountCheck = {
  status: PayrollRegisterTieOutStatus
  expectedCount: number
  actualCount: number
  source: string
}

export type PayrollRegisterBlocker = {
  code: string
  severity: "critical" | "high" | "medium"
  message: string
  source: string
  sourceId?: string | null
}

export type PayrollRegisterSourceLink = {
  type: string
  id: string
  documentHash?: string | null
  evidenceHash?: string | null
  payloadHash?: string | null
}

export type PayrollRegisterRow = {
  employeeId: string
  employeeNumber: string
  displayName: string
  department: string | null
  jobTitle: string | null
  costCenter: string | null
  runLineId: string
  payslipId: string | null
  payslipNumber: string | null
  payslipStatus: PayrollPayslipStatus | "MISSING"
  amounts: {
    grossAmount: string
    employeeDeductionAmount: string
    employerChargeAmount: string
    netPayableAmount: string
    paidAmount: string
    paymentDeltaAmount: string
    currency: string
  }
  tieOut: {
    payslip: PayrollRegisterTieOutStatus
    payment: PayrollRegisterTieOutStatus
    ledger: PayrollRegisterTieOutStatus
  }
  proof: {
    runLineDocumentHash: string | null
    payslipDocumentHash: string | null
    archiveManifestHash: string | null
    paymentEvidenceHashes: string[]
    sourceLinks: PayrollRegisterSourceLink[]
  }
}

export type PayrollRegisterReadModel = {
  organizationId: string
  asOf: string
  payrollRun: {
    id: string
    runNumber: string
    status: PayrollRunStatus
    runType: string
    version: number
    countryCode: string
    countryPackVersion: string
    countryPackSchemaVersion: string
    countryPackResolutionHash: string
    countryPackCapabilityStatus: string
    calculationHash: string
    attendanceSnapshotHash: string
    documentHash: string | null
    evidenceHash: string | null
    ledgerPostingBatchId: string | null
    postedBusinessEventId: string | null
    accountingSourceLinkId: string | null
    journalEntryId: string | null
    currency: string
  }
  period: {
    id: string
    name: string
    periodStart: string
    periodEnd: string
    payDate: string
    accountingPeriodId: string | null
  }
  summary: {
    lineCount: number
    payslipCount: number
    paymentBatchCount: number
    declarationCount: number
    grossAmount: string
    employeeDeductionAmount: string
    employerChargeAmount: string
    netPayableAmount: string
    paidAmount: string
    declaredAmount: string
    currency: string
    registerHash: string
  }
  tieOut: {
    runLines: PayrollRegisterAmountCheck
    payslips: PayrollRegisterAmountCheck & PayrollRegisterCountCheck
    payments: PayrollRegisterAmountCheck
    declarations: PayrollRegisterAmountCheck
    ledger: {
      status: PayrollRegisterTieOutStatus
      runSourceLinked: boolean
      paymentSourceLinked: boolean
      sourceLinkCount: number
      source: string
    }
    close: {
      status: PayrollRegisterTieOutStatus
      accountingPeriodId: string | null
      closeRunId: string | null
      closeRunStatus: string | null
      evidenceCount: number
      findingCount: number
      source: string
    }
  }
  declarations: Array<{
    id: string
    authority: string
    declarationType: string
    status: PayrollDeclarationStatus
    amount: string
    currency: string
    dueDate: string | null
    payloadHash: string | null
    countryPackResolutionHash: string
  }>
  paymentBatches: Array<{
    id: string
    batchNumber: string
    status: PayrollPaymentBatchStatus
    amount: string
    currency: string
    paymentDate: string
    ledgerPostingBatchId: string | null
    postedBusinessEventId: string | null
    evidenceHash: string | null
    bankFileHash: string | null
    reconciliationStatus: string | null
  }>
  rows: PayrollRegisterRow[]
  blockers: PayrollRegisterBlocker[]
  redaction: {
    payrollAmounts: PayrollRegisterAmountRedaction
  }
  sourceScope: {
    sourceServices: string[]
    sourceTables: string[]
    clientComputedBusinessTruth: false
  }
}

export type PayrollRegisterExportResult = {
  payrollRunId: string
  fileName: string
  mimeType: "application/json"
  content: string
  contentHash: string
  registerHash: string
  watermarkId: string
  rowCount: number
  generatedAt: string
  businessEventId: string
  redaction: PayrollRegisterAmountRedaction
}

const payrollRegisterRunInclude = {
  payrollPeriod: {
    select: {
      id: true,
      name: true,
      periodStart: true,
      periodEnd: true,
      payDate: true,
      accountingPeriodId: true,
    },
  },
  lines: {
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          displayName: true,
          department: true,
          jobTitle: true,
          costCenter: true,
        },
      },
      payslip: {
        include: {
          lines: { orderBy: { lineNumber: "asc" } },
          paymentAllocations: {
            include: {
              payrollPaymentBatch: {
                select: {
                  id: true,
                  batchNumber: true,
                  status: true,
                  documentHash: true,
                  evidenceHash: true,
                  bankFileHash: true,
                  ledgerPostingBatchId: true,
                  postedBusinessEventId: true,
                  reconciliationStatus: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
  declarations: { orderBy: [{ authority: "asc" }, { declarationType: "asc" }] },
  paymentBatches: {
    include: { allocations: true },
    orderBy: { createdAt: "asc" },
  },
  _count: {
    select: {
      lines: true,
      payslips: true,
      paymentBatches: true,
      declarations: true,
    },
  },
} satisfies Prisma.PayrollRunInclude

const accountingSourceLinkSelect = {
  id: true,
  postingBatchId: true,
  journalEntryId: true,
  sourceType: true,
  sourceId: true,
  sourceNumber: true,
  sourceDate: true,
} satisfies Prisma.AccountingSourceLinkSelect

type PayrollRegisterRunRecord = Prisma.PayrollRunGetPayload<{ include: typeof payrollRegisterRunInclude }>
type AccountingSourceLinkRecord = Prisma.AccountingSourceLinkGetPayload<{ select: typeof accountingSourceLinkSelect }>
type PayrollRegisterClient = Pick<
  Prisma.TransactionClient,
  "payrollRun" | "accountingSourceLink" | "closeRun" | "closeEvidenceItem" | "closeAssuranceFinding" | "auditLog"
>
type PayrollRegisterExportClient = PayrollRegisterClient & Pick<Prisma.TransactionClient, "businessEvent">
type PayrollRegisterTransactionRunner = {
  $transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>
}

function hasTransactionRunner(client: unknown): client is PayrollRegisterTransactionRunner {
  return Boolean(client && typeof client === "object" && "$transaction" in client && typeof (client as Record<string, unknown>).$transaction === "function")
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
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

function sumDecimals(values: Array<Prisma.Decimal.Value | null | undefined>) {
  let total = new Prisma.Decimal(0)
  for (const value of values) {
    total = total.plus(decimal(value))
  }
  return total.toDecimalPlaces(2)
}

function compareDecimals(expected: Prisma.Decimal.Value, actual: Prisma.Decimal.Value): PayrollRegisterTieOutStatus {
  return decimal(expected).equals(decimal(actual)) ? "MATCHED" : "MISMATCH"
}

function amount(decision: RedactionDecision, value: Prisma.Decimal.Value | null | undefined) {
  return decision.allowed ? decimalString(value) : decision.replacement
}

function redactionSummary(decision: RedactionDecision): PayrollRegisterAmountRedaction {
  return {
    allowed: decision.allowed,
    mode: decision.mode,
    reasonCode: decision.reasonCode,
    policy: decision.policy,
    requiredPermissions: decision.requiredPermissions,
  }
}

function assertReadAllowed(input: z.output<typeof payrollRegisterInputSchema>) {
  if (input.moduleDecision && !input.moduleDecision.allowed) {
    throw new ForbiddenError("Payroll register is not available for this tenant.")
  }

  if (!hasAnyRbacPermission(input.actorPermissions, REGISTER_READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for payroll register read model.")
  }
}

function assertExportAllowed(input: z.output<typeof preparePayrollRegisterExportInputSchema>) {
  if (input.moduleDecision && !input.moduleDecision.allowed) {
    throw new ForbiddenError("Payroll register is not available for this tenant.")
  }

  if (!hasAnyRbacPermission(input.actorPermissions, REGISTER_READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for payroll register read model.")
  }

  if (!hasAnyRbacPermission(input.actorPermissions, REGISTER_EXPORT_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for payroll register export.")
  }
}

function sourceLinkKey(sourceType: AccountingSourceType, sourceId: string) {
  return `${sourceType}:${sourceId}`
}

function sourceLinkMap(sourceLinks: AccountingSourceLinkRecord[]) {
  const map = new Map<string, AccountingSourceLinkRecord[]>()
  for (const link of sourceLinks) {
    const key = sourceLinkKey(link.sourceType, link.sourceId)
    map.set(key, [...(map.get(key) ?? []), link])
  }
  return map
}

function sourceLinksFor(
  sourceLinks: Map<string, AccountingSourceLinkRecord[]>,
  sourceType: AccountingSourceType,
  sourceId: string,
) {
  return sourceLinks.get(sourceLinkKey(sourceType, sourceId)) ?? []
}

function archiveManifestHash(row: PayrollRegisterRunRecord["lines"][number]["payslip"]) {
  if (!row) return null
  return `sha256:${hashBusinessPayload({
    kind: "AQSTOQFLOW_PAYSLIP_ARCHIVE_MANIFEST",
    version: 1,
    payslipId: row.id,
    payslipNumber: row.payslipNumber,
    documentHash: row.documentHash,
    sourceLinks: [
      { type: "PayrollPayslip", id: row.id, documentHash: row.documentHash },
      ...row.paymentAllocations.map((allocation) => ({
        type: "PayrollPaymentBatch",
        id: allocation.payrollPaymentBatch.id,
        documentHash: allocation.payrollPaymentBatch.documentHash,
        evidenceHash: allocation.payrollPaymentBatch.evidenceHash,
      })),
    ],
  })}`
}

function amountCheck(input: {
  expected: Prisma.Decimal.Value
  actual: Prisma.Decimal.Value
  currency: string
  decision: RedactionDecision
  source: string
}): PayrollRegisterAmountCheck {
  const expected = decimal(input.expected)
  const actual = decimal(input.actual)
  return {
    status: compareDecimals(expected, actual),
    expectedAmount: amount(input.decision, expected),
    actualAmount: amount(input.decision, actual),
    deltaAmount: amount(input.decision, actual.minus(expected).abs()),
    currency: input.currency,
    source: input.source,
  }
}

function countStatus(expected: number, actual: number): PayrollRegisterTieOutStatus {
  return expected === actual ? "MATCHED" : actual === 0 ? "MISSING" : "MISMATCH"
}

function registerHash(input: {
  run: PayrollRegisterRunRecord
  sourceLinks: AccountingSourceLinkRecord[]
  closeEvidenceCount: number
}) {
  return `sha256:${hashBusinessPayload({
    kind: "AQSTOQFLOW_PAYROLL_REGISTER_TIE_OUT",
    version: 1,
    payrollRunId: input.run.id,
    runNumber: input.run.runNumber,
    documentHash: input.run.documentHash,
    evidenceHash: input.run.evidenceHash,
    calculationHash: input.run.calculationHash,
    attendanceSnapshotHash: input.run.attendanceSnapshotHash,
    runLineDocumentHashes: input.run.lines.map((line) => line.documentHash).sort(),
    payslipDocumentHashes: input.run.lines.map((line) => line.payslip?.documentHash).filter(Boolean).sort(),
    paymentEvidenceHashes: input.run.paymentBatches.map((batch) => batch.evidenceHash).filter(Boolean).sort(),
    declarationPayloadHashes: input.run.declarations.map((declaration) => declaration.payloadHash).filter(Boolean).sort(),
    sourceLinkIds: input.sourceLinks.map((link) => link.id).sort(),
    closeEvidenceCount: input.closeEvidenceCount,
  })}`
}

async function loadRun(client: PayrollRegisterClient, input: z.output<typeof payrollRegisterInputSchema>) {
  const where: Prisma.PayrollRunWhereInput = {
    organizationId: input.organizationId,
    deletedAt: null,
    ...(input.payrollRunId ? { id: input.payrollRunId } : {}),
  }

  const run = await client.payrollRun.findFirst({
    where,
    include: payrollRegisterRunInclude,
    orderBy: [{ payrollPeriod: { periodStart: "desc" } }, { createdAt: "desc" }],
  })

  if (!run) {
    throw new NotFoundError("Payroll register run was not found.")
  }

  return run
}

async function loadSourceLinks(client: PayrollRegisterClient, run: PayrollRegisterRunRecord) {
  const paymentBatchIds = run.paymentBatches.map((batch) => batch.id)
  return client.accountingSourceLink.findMany({
    where: {
      organizationId: run.organizationId,
      OR: [
        { sourceType: AccountingSourceType.PAYROLL_RUN, sourceId: run.id },
        ...(paymentBatchIds.length
          ? [{ sourceType: AccountingSourceType.PAYROLL_PAYMENT, sourceId: { in: paymentBatchIds } }]
          : []),
      ],
    },
    select: accountingSourceLinkSelect,
    orderBy: { createdAt: "asc" },
  })
}

async function loadCloseTieOut(client: PayrollRegisterClient, run: PayrollRegisterRunRecord) {
  const accountingPeriodId = run.payrollPeriod.accountingPeriodId
  if (!accountingPeriodId) {
    return {
      status: "MISSING" as const,
      accountingPeriodId: null,
      closeRunId: null,
      closeRunStatus: null,
      evidenceCount: 0,
      findingCount: 0,
      source: "payroll_period.accountingPeriodId",
    }
  }

  const closeRun = await client.closeRun.findFirst({
    where: { organizationId: run.organizationId, periodId: accountingPeriodId, voidedAt: null },
    orderBy: { asOf: "desc" },
    select: {
      id: true,
      status: true,
    },
  })

  if (!closeRun) {
    return {
      status: "PENDING" as const,
      accountingPeriodId,
      closeRunId: null,
      closeRunStatus: null,
      evidenceCount: 0,
      findingCount: 0,
      source: "close_runs",
    }
  }

  const sourceIds = [
    run.id,
    ...run.paymentBatches.map((batch) => batch.id),
    ...run.declarations.map((declaration) => declaration.id),
  ]
  const [evidenceCount, findingCount] = await Promise.all([
    client.closeEvidenceItem.count({
      where: {
        organizationId: run.organizationId,
        closeRunId: closeRun.id,
        sourceId: { in: sourceIds },
      },
    }),
    client.closeAssuranceFinding.count({
      where: {
        organizationId: run.organizationId,
        closeRunId: closeRun.id,
        sourceId: { in: sourceIds },
      },
    }),
  ])

  return {
    status: evidenceCount > 0 ? "MATCHED" as const : "PENDING" as const,
    accountingPeriodId,
    closeRunId: closeRun.id,
    closeRunStatus: closeRun.status,
    evidenceCount,
    findingCount,
    source: "close_runs/close_evidence_items/close_assurance_findings",
  }
}

function buildRows(input: {
  run: PayrollRegisterRunRecord
  sourceLinksByKey: Map<string, AccountingSourceLinkRecord[]>
  amountDecision: RedactionDecision
}) {
  return input.run.lines.map<PayrollRegisterRow>((line) => {
    const payslip = line.payslip
    const paymentAllocations = payslip?.paymentAllocations ?? []
    const paymentBatches = paymentAllocations.map((allocation) => allocation.payrollPaymentBatch)
    const paidAmount = sumDecimals(paymentAllocations.map((allocation) => allocation.amount))
    const paymentDelta = paidAmount.minus(decimal(line.netPayableAmount)).abs()
    const payslipMatchesLine = payslip
      ? decimal(payslip.grossAmount).equals(decimal(line.grossAmount)) &&
        decimal(payslip.employeeDeductionAmount).equals(decimal(line.employeeDeductionAmount)) &&
        decimal(payslip.employerChargeAmount).equals(decimal(line.employerChargeAmount)) &&
        decimal(payslip.netPayableAmount).equals(decimal(line.netPayableAmount))
      : false
    const paymentStatus = paymentAllocations.length === 0
      ? (decimal(line.netPayableAmount).isZero() ? "MATCHED" : "MISSING")
      : (paymentDelta.isZero() ? "MATCHED" : "MISMATCH")
    const runLinks = sourceLinksFor(input.sourceLinksByKey, AccountingSourceType.PAYROLL_RUN, input.run.id)
    const paymentLinks = paymentBatches.flatMap((batch) => sourceLinksFor(input.sourceLinksByKey, AccountingSourceType.PAYROLL_PAYMENT, batch.id))
    const ledgerStatus = runLinks.length > 0 && paymentBatches.every((batch) => sourceLinksFor(input.sourceLinksByKey, AccountingSourceType.PAYROLL_PAYMENT, batch.id).length > 0)
      ? "MATCHED"
      : "MISSING"

    return {
      employeeId: line.employeeId,
      employeeNumber: line.employee.employeeNumber,
      displayName: line.employee.displayName,
      department: line.employee.department,
      jobTitle: line.employee.jobTitle,
      costCenter: line.employee.costCenter,
      runLineId: line.id,
      payslipId: payslip?.id ?? null,
      payslipNumber: payslip?.payslipNumber ?? null,
      payslipStatus: payslip?.status ?? "MISSING",
      amounts: {
        grossAmount: amount(input.amountDecision, line.grossAmount),
        employeeDeductionAmount: amount(input.amountDecision, line.employeeDeductionAmount),
        employerChargeAmount: amount(input.amountDecision, line.employerChargeAmount),
        netPayableAmount: amount(input.amountDecision, line.netPayableAmount),
        paidAmount: amount(input.amountDecision, paidAmount),
        paymentDeltaAmount: amount(input.amountDecision, paymentDelta),
        currency: line.currency,
      },
      tieOut: {
        payslip: payslip ? (payslipMatchesLine ? "MATCHED" : "MISMATCH") : "MISSING",
        payment: paymentStatus,
        ledger: ledgerStatus,
      },
      proof: {
        runLineDocumentHash: line.documentHash,
        payslipDocumentHash: payslip?.documentHash ?? null,
        archiveManifestHash: archiveManifestHash(payslip),
        paymentEvidenceHashes: paymentBatches.map((batch) => batch.evidenceHash).filter((hash): hash is string => Boolean(hash)).sort(),
        sourceLinks: [
          ...runLinks.map((link) => ({ type: "AccountingSourceLink", id: link.id })),
          ...paymentLinks.map((link) => ({ type: "AccountingSourceLink", id: link.id })),
          ...(payslip ? [{ type: "PayrollPayslip", id: payslip.id, documentHash: payslip.documentHash }] : []),
          ...paymentBatches.map((batch) => ({
            type: "PayrollPaymentBatch",
            id: batch.id,
            documentHash: batch.documentHash,
            evidenceHash: batch.evidenceHash,
          })),
        ],
      },
    }
  })
}

function buildBlockers(input: {
  run: PayrollRegisterRunRecord
  rows: PayrollRegisterRow[]
  sourceLinksByKey: Map<string, AccountingSourceLinkRecord[]>
  closeStatus: PayrollRegisterReadModel["tieOut"]["close"]
}) {
  const blockers: PayrollRegisterBlocker[] = []

  if (!new Set<PayrollRunStatus>([PayrollRunStatus.POSTED, PayrollRunStatus.PAID, PayrollRunStatus.ARCHIVED]).has(input.run.status)) {
    blockers.push({
      code: "PAYROLL_REGISTER_RUN_NOT_POSTED",
      severity: "critical",
      message: "Payroll register tie-out requires a posted payroll run.",
      source: "payroll_runs.status",
      sourceId: input.run.id,
    })
  }

  if (!input.run.ledgerPostingBatchId || !input.run.postedBusinessEventId || sourceLinksFor(input.sourceLinksByKey, AccountingSourceType.PAYROLL_RUN, input.run.id).length === 0) {
    blockers.push({
      code: "PAYROLL_REGISTER_LEDGER_SOURCE_LINK_MISSING",
      severity: "critical",
      message: "Posted payroll run is missing ledger posting or accounting source-link evidence.",
      source: "payroll_runs/accounting_source_links",
      sourceId: input.run.id,
    })
  }

  for (const row of input.rows) {
    if (row.tieOut.payslip !== "MATCHED") {
      blockers.push({
        code: "PAYROLL_REGISTER_PAYSLIP_TIEOUT_FAILED",
        severity: "high",
        message: `Payroll line ${row.runLineId} does not tie to an emitted payslip.`,
        source: "payroll_run_lines/payroll_payslips",
        sourceId: row.runLineId,
      })
    }
    if (row.tieOut.payment !== "MATCHED") {
      blockers.push({
        code: "PAYROLL_REGISTER_PAYMENT_TIEOUT_FAILED",
        severity: "high",
        message: `Payroll line ${row.runLineId} does not tie to payment allocation evidence.`,
        source: "payroll_payment_allocations",
        sourceId: row.payslipId,
      })
    }
  }

  for (const batch of input.run.paymentBatches) {
    const hasSourceLink = sourceLinksFor(input.sourceLinksByKey, AccountingSourceType.PAYROLL_PAYMENT, batch.id).length > 0
    if (!batch.ledgerPostingBatchId || !batch.postedBusinessEventId || !hasSourceLink) {
      blockers.push({
        code: "PAYROLL_REGISTER_PAYMENT_LEDGER_SOURCE_LINK_MISSING",
        severity: "high",
        message: `Payroll payment batch ${batch.batchNumber} is missing ledger source-link evidence.`,
        source: "payroll_payment_batches/accounting_source_links",
        sourceId: batch.id,
      })
    }
  }

  for (const declaration of input.run.declarations) {
    if (!declaration.payloadHash) {
      blockers.push({
        code: "PAYROLL_REGISTER_DECLARATION_PAYLOAD_HASH_MISSING",
        severity: "high",
        message: `Payroll declaration ${declaration.authority}/${declaration.declarationType} is missing immutable payload evidence.`,
        source: "payroll_declarations.payloadHash",
        sourceId: declaration.id,
      })
    }
  }

  if (input.closeStatus.status === "MISSING") {
    blockers.push({
      code: "PAYROLL_REGISTER_CLOSE_PERIOD_LINK_MISSING",
      severity: "medium",
      message: "Payroll period is not linked to an accounting period for close evidence.",
      source: input.closeStatus.source,
      sourceId: input.run.payrollPeriodId,
    })
  }

  return blockers
}

async function auditRegisterRead(
  client: PayrollRegisterClient,
  input: {
    organizationId: string
    actorId?: string | null
    payrollRunId: string
    rowCount: number
    blockerCount: number
    registerHash: string
    amountDecision: RedactionDecision
  },
) {
  await client.auditLog.create({
    data: {
      entityType: "PayrollRegister",
      entityId: input.payrollRunId,
      action: "PAYROLL_REGISTER_READ",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({
        rowCount: input.rowCount,
        blockerCount: input.blockerCount,
        registerHash: input.registerHash,
        amountAccess: redactionSummary(input.amountDecision),
      }),
    },
  })
}

async function buildReadModel(
  client: PayrollRegisterClient,
  input: z.output<typeof payrollRegisterInputSchema>,
): Promise<PayrollRegisterReadModel> {
  assertReadAllowed(input)

  const amountDecision = evaluateRedaction({
    field: "PayrollRegister.amounts",
    category: "payroll_person_amount",
    actorPermissions: input.actorPermissions,
    moduleDecision: input.moduleDecision ?? null,
  })
  const run = await loadRun(client, input)
  const [sourceLinks, closeTieOut] = await Promise.all([
    loadSourceLinks(client, run),
    loadCloseTieOut(client, run),
  ])
  const sourceLinksByKey = sourceLinkMap(sourceLinks)
  const rows = buildRows({ run, sourceLinksByKey, amountDecision }).slice(0, input.limit)

  const runLineTotals = {
    gross: sumDecimals(run.lines.map((line) => line.grossAmount)),
    deductions: sumDecimals(run.lines.map((line) => line.employeeDeductionAmount)),
    employer: sumDecimals(run.lines.map((line) => line.employerChargeAmount)),
    net: sumDecimals(run.lines.map((line) => line.netPayableAmount)),
  }
  const payslipTotals = {
    gross: sumDecimals(run.lines.map((line) => line.payslip?.grossAmount)),
    deductions: sumDecimals(run.lines.map((line) => line.payslip?.employeeDeductionAmount)),
    employer: sumDecimals(run.lines.map((line) => line.payslip?.employerChargeAmount)),
    net: sumDecimals(run.lines.map((line) => line.payslip?.netPayableAmount)),
  }
  const paidAmount = sumDecimals(run.paymentBatches.flatMap((batch) => batch.allocations.map((allocation) => allocation.amount)))
  const declaredAmount = sumDecimals(run.declarations.map((declaration) => declaration.amount))
  const runSourceLinked = sourceLinksFor(sourceLinksByKey, AccountingSourceType.PAYROLL_RUN, run.id).length > 0
  const paymentSourceLinked = run.paymentBatches.length === 0
    ? false
    : run.paymentBatches.every((batch) => sourceLinksFor(sourceLinksByKey, AccountingSourceType.PAYROLL_PAYMENT, batch.id).length > 0)
  const hash = registerHash({ run, sourceLinks, closeEvidenceCount: closeTieOut.evidenceCount })
  const blockers = buildBlockers({ run, rows, sourceLinksByKey, closeStatus: closeTieOut })

  await auditRegisterRead(client, {
    organizationId: input.organizationId,
    actorId: input.actorId,
    payrollRunId: run.id,
    rowCount: rows.length,
    blockerCount: blockers.length,
    registerHash: hash,
    amountDecision,
  })

  return {
    organizationId: input.organizationId,
    asOf: new Date().toISOString(),
    payrollRun: {
      id: run.id,
      runNumber: run.runNumber,
      status: run.status,
      runType: run.runType,
      version: run.version,
      countryCode: run.countryCode,
      countryPackVersion: run.countryPackVersion,
      countryPackSchemaVersion: run.countryPackSchemaVersion,
      countryPackResolutionHash: run.countryPackResolutionHash,
      countryPackCapabilityStatus: run.countryPackCapabilityStatus,
      calculationHash: run.calculationHash,
      attendanceSnapshotHash: run.attendanceSnapshotHash,
      documentHash: run.documentHash,
      evidenceHash: run.evidenceHash,
      ledgerPostingBatchId: run.ledgerPostingBatchId,
      postedBusinessEventId: run.postedBusinessEventId,
      accountingSourceLinkId: run.accountingSourceLinkId,
      journalEntryId: run.journalEntryId,
      currency: run.currency,
    },
    period: {
      id: run.payrollPeriod.id,
      name: run.payrollPeriod.name,
      periodStart: run.payrollPeriod.periodStart.toISOString(),
      periodEnd: run.payrollPeriod.periodEnd.toISOString(),
      payDate: run.payrollPeriod.payDate.toISOString(),
      accountingPeriodId: run.payrollPeriod.accountingPeriodId,
    },
    summary: {
      lineCount: run._count.lines,
      payslipCount: run._count.payslips,
      paymentBatchCount: run._count.paymentBatches,
      declarationCount: run._count.declarations,
      grossAmount: amount(amountDecision, run.grossAmount),
      employeeDeductionAmount: amount(amountDecision, run.employeeDeductionAmount),
      employerChargeAmount: amount(amountDecision, run.employerChargeAmount),
      netPayableAmount: amount(amountDecision, run.netPayableAmount),
      paidAmount: amount(amountDecision, paidAmount),
      declaredAmount: amount(amountDecision, declaredAmount),
      currency: run.currency,
      registerHash: hash,
    },
    tieOut: {
      runLines: amountCheck({
        expected: run.netPayableAmount,
        actual: runLineTotals.net,
        currency: run.currency,
        decision: amountDecision,
        source: "payroll_runs/payroll_run_lines",
      }),
      payslips: {
        ...amountCheck({
          expected: run.netPayableAmount,
          actual: payslipTotals.net,
          currency: run.currency,
          decision: amountDecision,
          source: "payroll_run_lines/payroll_payslips",
        }),
        expectedCount: run._count.lines,
        actualCount: run._count.payslips,
        status: compareDecimals(run.netPayableAmount, payslipTotals.net) === "MATCHED"
          ? countStatus(run._count.lines, run._count.payslips)
          : "MISMATCH",
      },
      payments: amountCheck({
        expected: run.netPayableAmount,
        actual: paidAmount,
        currency: run.currency,
        decision: amountDecision,
        source: "payroll_payment_batches/payroll_payment_allocations",
      }),
      declarations: amountCheck({
        expected: run.employeeDeductionAmount.plus(run.employerChargeAmount),
        actual: declaredAmount,
        currency: run.currency,
        decision: amountDecision,
        source: "payroll_declarations",
      }),
      ledger: {
        status: runSourceLinked && paymentSourceLinked ? "MATCHED" : "MISSING",
        runSourceLinked,
        paymentSourceLinked,
        sourceLinkCount: sourceLinks.length,
        source: "accounting_source_links",
      },
      close: closeTieOut,
    },
    declarations: run.declarations.map((declaration) => ({
      id: declaration.id,
      authority: declaration.authority,
      declarationType: declaration.declarationType,
      status: declaration.status,
      amount: amount(amountDecision, declaration.amount),
      currency: declaration.currency,
      dueDate: declaration.dueDate?.toISOString() ?? null,
      payloadHash: declaration.payloadHash,
      countryPackResolutionHash: declaration.countryPackResolutionHash,
    })),
    paymentBatches: run.paymentBatches.map((batch) => ({
      id: batch.id,
      batchNumber: batch.batchNumber,
      status: batch.status,
      amount: amount(amountDecision, batch.amount),
      currency: batch.currency,
      paymentDate: batch.paymentDate.toISOString(),
      ledgerPostingBatchId: batch.ledgerPostingBatchId,
      postedBusinessEventId: batch.postedBusinessEventId,
      evidenceHash: batch.evidenceHash,
      bankFileHash: batch.bankFileHash,
      reconciliationStatus: batch.reconciliationStatus,
    })),
    rows,
    blockers,
    redaction: {
      payrollAmounts: redactionSummary(amountDecision),
    },
    sourceScope: {
      sourceServices: [
        "services/payroll/payroll-register.service.ts",
        "services/payroll/payroll-control.service.ts",
        "services/payroll/payslip-self-service.service.ts",
        "services/accounting/posting.service.ts",
        "services/accounting/close-assurance-pack.service.ts",
      ],
      sourceTables: [
        "payroll_runs",
        "payroll_run_lines",
        "payroll_payslips",
        "payroll_payment_batches",
        "payroll_payment_allocations",
        "payroll_declarations",
        "accounting_source_links",
        "close_runs",
        "close_evidence_items",
      ],
      clientComputedBusinessTruth: false,
    },
  }
}

export async function getPayrollRegister(
  input: PayrollRegisterInput,
  client: PayrollRegisterClient = db,
): Promise<PayrollRegisterReadModel> {
  const parsed = payrollRegisterInputSchema.parse(input)
  return buildReadModel(client, parsed)
}

async function prepareExportInTx(
  tx: PayrollRegisterExportClient,
  parsed: z.output<typeof preparePayrollRegisterExportInputSchema>,
): Promise<PayrollRegisterExportResult> {
  assertExportAllowed(parsed)

  const now = parseDate(parsed.now, new Date())
  const readModel = await buildReadModel(tx, {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision ?? null,
    payrollRunId: parsed.payrollRunId,
    limit: 100,
  })
  const rowCount = readModel.rows.length + readModel.declarations.length + readModel.paymentBatches.length
  const watermarkId = buildExportWatermark({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    scope: "payroll-register-tie-out",
    filtersHash: readModel.summary.registerHash,
    rowCount,
    fileType: parsed.fileType,
    sensitivity: "statutory",
    issuedAt: now,
  })
  const exportDecision = evaluateExportSafety({
    action: "payroll.register.export",
    actorId: parsed.actorId,
    organizationId: parsed.organizationId,
    actorPermissions: parsed.actorPermissions,
    resourceType: "PayrollRegister",
    resourceId: readModel.payrollRun.id,
    lastAuthAt: parsed.lastAuthAt,
    now,
    exportContext: {
      scope: "payroll-register-tie-out",
      filtersHash: readModel.summary.registerHash,
      rowCount,
      fileType: parsed.fileType,
      sensitivity: "statutory",
      watermarkId,
    },
    metadata: {
      purpose: parsed.purpose,
      runNumber: readModel.payrollRun.runNumber,
      periodId: readModel.period.id,
    },
  })
  await auditExportSafetyDecision(tx as Prisma.TransactionClient, exportDecision)
  if (!exportDecision.allowed) {
    throw new BusinessRuleError(
      exportDecision.safeMessage,
      exportDecision.reasonCode === "FRESH_AUTH_REQUIRED" ? "FRESH_AUTH_REQUIRED" : "BUSINESS_RULE_VIOLATION",
    )
  }

  const payload = {
    kind: "AQSTOQFLOW_PAYROLL_REGISTER_TIE_OUT_EXPORT",
    version: 1,
    export: {
      generatedAt: now.toISOString(),
      generatedById: parsed.actorId,
      purpose: parsed.purpose,
      fileType: parsed.fileType,
      watermarkId,
      rowCount,
      redaction: readModel.redaction.payrollAmounts,
      renderer: {
        pdfStatus: "NOT_GENERATED_NO_APPROVED_PAYROLL_REGISTER_RENDERER",
        mimeType: "application/json",
      },
    },
    register: readModel,
  }
  const contentHash = `sha256:${hashBusinessPayload(payload)}`
  const content = JSON.stringify({ ...payload, export: { ...payload.export, contentHash } }, null, 2)
  const eventResult = await recordBusinessEventInTx(tx as unknown as Parameters<typeof recordBusinessEventInTx>[0], {
    organizationId: parsed.organizationId,
    eventType: "payroll.register.exported",
    eventSource: "SYSTEM",
    idempotencyKey: `payroll-register:${readModel.payrollRun.id}:export:${contentHash}`,
    actorId: parsed.actorId ?? undefined,
    sourceType: "PAYROLL_REGISTER",
    sourceId: readModel.payrollRun.id,
    documentHash: contentHash,
    payload: {
      payrollRunId: readModel.payrollRun.id,
      runNumber: readModel.payrollRun.runNumber,
      registerHash: readModel.summary.registerHash,
      contentHash,
      watermarkId,
      rowCount,
      purpose: parsed.purpose,
      redaction: readModel.redaction.payrollAmounts,
    },
    outboxMessages: [
      {
        channel: "REPORT_EXPORT",
        eventName: "payroll.register.exported",
        idempotencyKey: `payroll-register:${readModel.payrollRun.id}:export:${contentHash}:report-export`,
        payload: {
          payrollRunId: readModel.payrollRun.id,
          contentHash,
          watermarkId,
          rowCount,
        },
      },
    ],
  })

  return {
    payrollRunId: readModel.payrollRun.id,
    fileName: `${watermarkId}.json`,
    mimeType: "application/json",
    content,
    contentHash,
    registerHash: readModel.summary.registerHash,
    watermarkId,
    rowCount,
    generatedAt: now.toISOString(),
    businessEventId: eventResult.event.id,
    redaction: readModel.redaction.payrollAmounts,
  }
}

export async function preparePayrollRegisterExport(
  input: PreparePayrollRegisterExportInput,
  client: (PayrollRegisterExportClient & Partial<PayrollRegisterTransactionRunner>) | typeof db = db,
): Promise<PayrollRegisterExportResult> {
  const parsed = preparePayrollRegisterExportInputSchema.parse(input)

  if (parsed.fileType !== "json") {
    throw new BusinessRuleError("Only JSON payroll register exports are enabled.")
  }

  if (hasTransactionRunner(client)) {
    return client.$transaction((tx) => prepareExportInTx(tx as unknown as PayrollRegisterExportClient, parsed))
  }

  return prepareExportInTx(client as PayrollRegisterExportClient, parsed)
}
