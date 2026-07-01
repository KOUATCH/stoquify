import "server-only"

import { PayrollPayslipStatus, Prisma } from "@prisma/client"
import { z } from "zod"

import { db } from "@/prisma/db"
import { ForbiddenError, BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { evaluateRedaction, type RedactionDecision } from "@/services/security/redaction-policy.service"
import {
  auditExportSafetyDecision,
  buildExportWatermark,
  evaluateExportSafety,
} from "@/services/security/export-safety.service"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"

const SELF_READ_PERMISSION = "payroll.payslips.self.read"
const SELF_EXPORT_PERMISSION = "payroll.payslips.self.export"

const dateInputSchema = z.union([z.date(), z.string(), z.number()]).optional()

const actorContextSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
})

export const payrollPayslipSelfServiceInputSchema = actorContextSchema.extend({
  payslipId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(36).optional().default(12),
})

export const preparePayrollPayslipExportInputSchema = actorContextSchema.extend({
  payslipId: z.string().trim().min(1),
  purpose: z.string().trim().min(3).max(160).optional().default("EMPLOYEE_SELF_SERVICE_PAYSLIP_ARCHIVE"),
  fileType: z.literal("json").optional().default("json"),
  lastAuthAt: dateInputSchema,
  now: dateInputSchema,
})

export type PayrollPayslipSelfServiceInput = z.input<typeof payrollPayslipSelfServiceInputSchema>
export type PreparePayrollPayslipExportInput = z.input<typeof preparePayrollPayslipExportInputSchema>

export type PayrollPayslipAmountRedaction = {
  allowed: boolean
  mode: RedactionDecision["mode"]
  reasonCode: RedactionDecision["reasonCode"]
  policy: string
  requiredPermissions: string[]
}

export type PayrollPayslipSelfServiceLine = {
  id: string
  lineNumber: number
  code: string
  label: string
  category: string
  baseAmount: string | null
  rateBps: number | null
  amount: string
  currency: string
  sourceType: string | null
  sourceId: string | null
}

export type PayrollPayslipSourceLink = {
  type: string
  id: string
  documentHash?: string | null
  evidenceHash?: string | null
}

export type PayrollPayslipCountryPackLineProof = {
  status: "MATCHED" | "MISMATCH" | "MISSING"
  issues: string[]
  runLineId: string
  countryCode: string | null
  countryPackVersion: string | null
  countryPackSchemaVersion: string | null
  countryPackCapabilityStatus: string | null
  countryPackResolutionHash: string | null
  statutoryScenarioCoverageHash: string | null
  statutoryScenarioCoverageStatus: string | null
  reviewEvidenceSourceHashes: string[]
  legalRefs: string[]
  roundingPolicyHash: string | null
  yearToDatePolicyHash: string | null
  provenanceHash: string | null
  computedHash: string | null
  source: string
}

export type PayrollPayslipSelfServiceRecord = {
  id: string
  payslipNumber: string
  status: string
  issuedAt: string | null
  period: {
    id: string
    name: string
    periodStart: string
    periodEnd: string
    payDate: string
  }
  countryPack: {
    countryCode: string
    version: string
    schemaVersion: string
    resolutionHash: string
    capabilityStatus: string
    supportedScope: string[]
    unsupportedClaims: string[]
  }
  amounts: {
    grossAmount: string
    employeeDeductionAmount: string
    employerChargeAmount: string
    netPayableAmount: string
    currency: string
  }
  lines: PayrollPayslipSelfServiceLine[]
  proof: {
    immutableStatus: "EMITTED_LOCKED"
    documentHash: string
    archiveUri: string | null
    archiveManifestHash: string
    countryPackLineProof: PayrollPayslipCountryPackLineProof
    sourceLinks: PayrollPayslipSourceLink[]
  }
  tieOut: {
    payrollRunId: string
    runNumber: string
    runStatus: string
    runLineId: string
    payrollRunLineDocumentHash: string | null
    calculationHash: string
    ledgerPostingBatchId: string | null
    postedBusinessEventId: string | null
    paymentStatus: string
    paymentEvidenceHashes: string[]
    declarationEvidenceHashes: string[]
  }
}

export type PayrollPayslipSelfServiceReadModel = {
  organizationId: string
  asOf: string
  employee: {
    id: string
    employeeNumber: string
    displayName: string
    status: string
    countryCode: string | null
    department: string | null
    jobTitle: string | null
    costCenter: string | null
    userMappingStatus: "linked"
    paymentDestinationApproved: boolean
  }
  summary: {
    payslipCount: number
    emittedPayslipCount: number
    latestIssuedAt: string | null
    redactedPayslips: number
  }
  redaction: {
    payrollAmounts: PayrollPayslipAmountRedaction
  }
  payslips: PayrollPayslipSelfServiceRecord[]
}

export type PayrollPayslipExportResult = {
  payslipId: string
  fileName: string
  mimeType: "application/json"
  content: string
  contentHash: string
  archiveManifestHash: string
  watermarkId: string
  rowCount: number
  generatedAt: string
  businessEventId: string
  redaction: PayrollPayslipAmountRedaction
}

type PayrollPayslipClient = Pick<
  Prisma.TransactionClient,
  "payrollEmployee" | "payrollPayslip" | "auditLog"
>

type PayrollPayslipExportClient = PayrollPayslipClient & Pick<Prisma.TransactionClient, "businessEvent">

type PayrollPayslipTransactionRunner = {
  $transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>
}

type LinkedEmployee = {
  id: string
  organizationId: string
  userId: string | null
  employeeNumber: string
  displayName: string
  status: string
  countryCode: string | null
  department: string | null
  jobTitle: string | null
  costCenter: string | null
  paymentDestinationHash: string | null
}

type PayslipRow = Prisma.PayrollPayslipGetPayload<{
  include: {
    employee: {
      select: {
        id: true
        employeeNumber: true
        displayName: true
        status: true
        countryCode: true
        department: true
        jobTitle: true
        costCenter: true
        paymentDestinationHash: true
      }
    }
    payrollRun: {
      select: {
        id: true
        runNumber: true
        status: true
        countryPackCapabilityStatus: true
        calculationHash: true
        documentHash: true
        evidenceHash: true
        ledgerPostingBatchId: true
        postedBusinessEventId: true
        payrollPeriod: {
          select: {
            id: true
            name: true
            periodStart: true
            periodEnd: true
            payDate: true
          }
        }
        declarations: {
          select: {
            id: true
            authority: true
            declarationType: true
            status: true
            payloadHash: true
            countryPackResolutionHash: true
          }
        }
      }
    }
    runLine: {
      select: {
        id: true
        documentHash: true
        calculationSnapshot: true
      }
    }
    lines: true
    paymentAllocations: {
      include: {
        payrollPaymentBatch: {
          select: {
            id: true
            batchNumber: true
            status: true
            documentHash: true
            evidenceHash: true
            ledgerPostingBatchId: true
            postedBusinessEventId: true
            reconciliationStatus: true
          }
        }
      }
    }
  }
}>

function toJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function sha256(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

function unknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function jsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  return unknownRecord(value)
}

function nestedRecord(value: unknown, key: string): Record<string, unknown> | null {
  return unknownRecord(unknownRecord(value)?.[key])
}

function metadataString(value: unknown, key: string) {
  const entry = unknownRecord(value)?.[key]
  return typeof entry === "string" && entry.trim().length > 0 ? entry.trim() : null
}

function metadataStringArray(value: unknown, key: string) {
  const entry = unknownRecord(value)?.[key]
  return Array.isArray(entry)
    ? entry.filter((item): item is string => typeof item === "string" && item.trim().length > 0).sort()
    : []
}

function decimalString(value: Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined) return null
  return new Prisma.Decimal(value).toFixed(2)
}

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function parseDate(value: Date | string | number | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return fallback
}

function hasSelfReadPermission(permissions: readonly string[]) {
  return hasRbacPermission(permissions, SELF_READ_PERMISSION)
}

function hasSelfExportPermission(permissions: readonly string[]) {
  return hasRbacPermission(permissions, SELF_EXPORT_PERMISSION)
}

function assertSelfRead<T extends { actorId?: string; actorPermissions: readonly string[] }>(
  input: T,
): asserts input is T & { actorId: string } {
  if (!input.actorId) {
    throw new ForbiddenError("Employee payslip self-service requires authenticated user context.")
  }

  if (!hasSelfReadPermission(input.actorPermissions)) {
    throw new ForbiddenError("Employee payslip self-service requires own-payslip read permission.")
  }
}

function assertSelfExport(input: { actorPermissions: readonly string[] }) {
  if (!hasSelfExportPermission(input.actorPermissions)) {
    throw new ForbiddenError("Employee payslip export requires own-payslip export permission.")
  }
}

function ownPayslipAmountDecision(input: {
  actorPermissions: readonly string[]
  field: string
}): RedactionDecision {
  const baseDecision = evaluateRedaction({
    field: input.field,
    category: "payroll_person_amount",
    actorPermissions: input.actorPermissions,
  })

  if (hasSelfReadPermission(input.actorPermissions)) {
    return {
      ...baseDecision,
      mode: "allow",
      allowed: true,
      reasonCode: "ALLOWED",
      policy: "kontava-payroll-own-payslip-self-service-policy",
      requiredPermissions: [SELF_READ_PERMISSION],
      safeMessage: "Own payslip amount access allowed.",
    }
  }

  return baseDecision
}

function redactionSummary(decision: RedactionDecision): PayrollPayslipAmountRedaction {
  return {
    allowed: decision.allowed,
    mode: decision.mode,
    reasonCode: decision.reasonCode,
    policy: decision.policy,
    requiredPermissions: decision.requiredPermissions,
  }
}

async function loadLinkedEmployee(
  client: PayrollPayslipClient,
  input: { organizationId: string; actorId: string },
): Promise<LinkedEmployee> {
  const matches = await client.payrollEmployee.findMany({
    where: {
      organizationId: input.organizationId,
      userId: input.actorId,
      deletedAt: null,
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      employeeNumber: true,
      displayName: true,
      status: true,
      countryCode: true,
      department: true,
      jobTitle: true,
      costCenter: true,
      paymentDestinationHash: true,
    },
    take: 2,
  })

  if (matches.length === 0) {
    throw new NotFoundError("No payroll employee is linked to this user in the tenant.")
  }

  if (matches.length > 1) {
    throw new ConflictError("More than one payroll employee is linked to this user in the tenant.")
  }

  return matches[0]
}

function sourceLinks(row: PayslipRow): PayrollPayslipSourceLink[] {
  const links: PayrollPayslipSourceLink[] = [
    { type: "PayrollPayslip", id: row.id, documentHash: row.documentHash },
    {
      type: "PayrollRun",
      id: row.payrollRun.id,
      documentHash: row.payrollRun.documentHash,
      evidenceHash: row.payrollRun.evidenceHash,
    },
    { type: "PayrollRunLine", id: row.runLine.id, documentHash: row.runLine.documentHash },
    { type: "PayrollPeriod", id: row.payrollRun.payrollPeriod.id },
  ]

  for (const allocation of row.paymentAllocations) {
    links.push({
      type: "PayrollPaymentBatch",
      id: allocation.payrollPaymentBatch.id,
      documentHash: allocation.payrollPaymentBatch.documentHash,
      evidenceHash: allocation.payrollPaymentBatch.evidenceHash,
    })
  }

  for (const declaration of row.payrollRun.declarations) {
    links.push({
      type: "PayrollDeclaration",
      id: declaration.id,
      documentHash: declaration.payloadHash,
    })
  }

  return links
}

function archiveManifestHash(row: PayslipRow) {
  return sha256({
    kind: "AQSTOQFLOW_PAYSLIP_ARCHIVE_MANIFEST",
    version: 1,
    payslipId: row.id,
    payslipNumber: row.payslipNumber,
    documentHash: row.documentHash,
    sourceLinks: sourceLinks(row),
  })
}

function amount(decision: RedactionDecision, value: Prisma.Decimal.Value | null | undefined) {
  return decision.allowed ? decimalString(value) ?? "0.00" : decision.replacement
}

function nullableAmount(decision: RedactionDecision, value: Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined) return null
  return amount(decision, value)
}

function mapPayslip(row: PayslipRow, decision: RedactionDecision): PayrollPayslipSelfServiceRecord {
  const period = row.payrollRun.payrollPeriod
  const paymentEvidenceHashes = row.paymentAllocations
    .map((allocation) => allocation.payrollPaymentBatch.evidenceHash)
    .filter((hash): hash is string => Boolean(hash))
    .sort()
  const declarationEvidenceHashes = row.payrollRun.declarations
    .map((declaration) => declaration.payloadHash)
    .filter((hash): hash is string => Boolean(hash))
    .sort()
  const paymentsSettled = row.paymentAllocations.length > 0
    ? row.paymentAllocations.every((allocation) =>
        ["RELEASED", "PARTIALLY_SETTLED", "SETTLED"].includes(allocation.payrollPaymentBatch.status),
      )
    : false

  return {
    id: row.id,
    payslipNumber: row.payslipNumber,
    status: row.status,
    issuedAt: isoDate(row.issuedAt),
    period: {
      id: period.id,
      name: period.name,
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
      payDate: period.payDate.toISOString(),
    },
    countryPack: {
      countryCode: row.countryCode,
      version: row.countryPackVersion,
      schemaVersion: row.countryPackSchemaVersion,
      resolutionHash: row.countryPackResolutionHash,
      capabilityStatus: row.payrollRun.countryPackCapabilityStatus,
      supportedScope: ["Cameroon CNPS parameters with EXPERT_REVIEWED or REGULATOR_CONFIRMED provenance"],
      unsupportedClaims: [
        "IRPP automation is not claimed by this payslip surface.",
        "Authority declaration submission adapters are not claimed by this payslip surface.",
      ],
    },
    amounts: {
      grossAmount: amount(decision, row.grossAmount),
      employeeDeductionAmount: amount(decision, row.employeeDeductionAmount),
      employerChargeAmount: amount(decision, row.employerChargeAmount),
      netPayableAmount: amount(decision, row.netPayableAmount),
      currency: row.currency,
    },
    lines: row.lines
      .sort((left, right) => left.lineNumber - right.lineNumber)
      .map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        code: line.code,
        label: line.label,
        category: line.category,
        baseAmount: nullableAmount(decision, line.baseAmount),
        rateBps: line.rateBps,
        amount: amount(decision, line.amount),
        currency: line.currency,
        sourceType: line.sourceType,
        sourceId: line.sourceId,
      })),
    proof: {
      immutableStatus: "EMITTED_LOCKED",
      documentHash: row.documentHash,
      archiveUri: row.archiveUri,
      archiveManifestHash: archiveManifestHash(row),
      sourceLinks: sourceLinks(row),
    },
    tieOut: {
      payrollRunId: row.payrollRun.id,
      runNumber: row.payrollRun.runNumber,
      runStatus: row.payrollRun.status,
      runLineId: row.runLine.id,
      payrollRunLineDocumentHash: row.runLine.documentHash,
      calculationHash: row.payrollRun.calculationHash,
      ledgerPostingBatchId: row.payrollRun.ledgerPostingBatchId,
      postedBusinessEventId: row.payrollRun.postedBusinessEventId,
      paymentStatus: paymentsSettled ? "SETTLED_OR_RELEASED" : row.paymentAllocations.length > 0 ? "IN_PROGRESS" : "UNPAID",
      paymentEvidenceHashes,
      declarationEvidenceHashes,
    },
  }
}

async function auditPayslipRead(
  client: PayrollPayslipClient,
  input: {
    organizationId: string
    actorId: string
    employeeId: string
    payslipId?: string
    payslipCount: number
    amountDecision: RedactionDecision
  },
) {
  await client.auditLog.create({
    data: {
      entityType: "PayrollPayslip",
      entityId: input.payslipId ?? input.employeeId,
      action: "PAYROLL_PAYSLIP_SELF_SERVICE_READ",
      userId: input.actorId,
      organizationId: input.organizationId,
      changes: toJson({
        after: {
          employeeId: input.employeeId,
          payslipId: input.payslipId ?? null,
          payslipCount: input.payslipCount,
          amountAccess: redactionSummary(input.amountDecision),
        },
      }) as Prisma.InputJsonValue,
    },
  })
}

async function loadSelfServiceReadModel(
  client: PayrollPayslipClient,
  input: z.output<typeof payrollPayslipSelfServiceInputSchema>,
): Promise<PayrollPayslipSelfServiceReadModel> {
  assertSelfRead(input)
  const employee = await loadLinkedEmployee(client, {
    organizationId: input.organizationId,
    actorId: input.actorId,
  })
  const amountDecision = ownPayslipAmountDecision({
    actorPermissions: input.actorPermissions,
    field: "PayrollPayslip.amounts",
  })
  const payslips = await client.payrollPayslip.findMany({
    where: {
      organizationId: input.organizationId,
      employeeId: employee.id,
      status: PayrollPayslipStatus.EMITTED,
      ...(input.payslipId ? { id: input.payslipId } : {}),
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          displayName: true,
          status: true,
          countryCode: true,
          department: true,
          jobTitle: true,
          costCenter: true,
          paymentDestinationHash: true,
        },
      },
      payrollRun: {
        select: {
          id: true,
          runNumber: true,
          status: true,
          countryPackCapabilityStatus: true,
          calculationHash: true,
          documentHash: true,
          evidenceHash: true,
          ledgerPostingBatchId: true,
          postedBusinessEventId: true,
          payrollPeriod: {
            select: {
              id: true,
              name: true,
              periodStart: true,
              periodEnd: true,
              payDate: true,
            },
          },
          declarations: {
            select: {
              id: true,
              authority: true,
              declarationType: true,
              status: true,
              payloadHash: true,
              countryPackResolutionHash: true,
            },
          },
        },
      },
      runLine: {
        select: {
          id: true,
          documentHash: true,
        },
      },
      lines: true,
      paymentAllocations: {
        include: {
          payrollPaymentBatch: {
            select: {
              id: true,
              batchNumber: true,
              status: true,
              documentHash: true,
              evidenceHash: true,
              ledgerPostingBatchId: true,
              postedBusinessEventId: true,
              reconciliationStatus: true,
            },
          },
        },
      },
    },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    take: input.limit,
  })

  if (input.payslipId && payslips.length === 0) {
    throw new NotFoundError("Payslip was not found for the authenticated employee.")
  }

  await auditPayslipRead(client, {
    organizationId: input.organizationId,
    actorId: input.actorId,
    employeeId: employee.id,
    payslipId: input.payslipId,
    payslipCount: payslips.length,
    amountDecision,
  })

  const mappedPayslips = payslips.map((payslip) => mapPayslip(payslip, amountDecision))

  return {
    organizationId: input.organizationId,
    asOf: new Date().toISOString(),
    employee: {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      displayName: employee.displayName,
      status: employee.status,
      countryCode: employee.countryCode,
      department: employee.department,
      jobTitle: employee.jobTitle,
      costCenter: employee.costCenter,
      userMappingStatus: "linked",
      paymentDestinationApproved: Boolean(employee.paymentDestinationHash),
    },
    summary: {
      payslipCount: mappedPayslips.length,
      emittedPayslipCount: mappedPayslips.filter((payslip) => payslip.status === PayrollPayslipStatus.EMITTED).length,
      latestIssuedAt: mappedPayslips[0]?.issuedAt ?? null,
      redactedPayslips: amountDecision.allowed ? 0 : mappedPayslips.length,
    },
    redaction: {
      payrollAmounts: redactionSummary(amountDecision),
    },
    payslips: mappedPayslips,
  }
}

export async function getPayrollPayslipSelfService(
  input: PayrollPayslipSelfServiceInput,
  client: PayrollPayslipClient = db,
): Promise<PayrollPayslipSelfServiceReadModel> {
  const parsed = payrollPayslipSelfServiceInputSchema.parse(input)
  return loadSelfServiceReadModel(client, parsed)
}

function hasTransactionRunner(client: unknown): client is PayrollPayslipTransactionRunner {
  return Boolean(client && typeof client === "object" && "$transaction" in client && typeof (client as Record<string, unknown>).$transaction === "function")
}

async function prepareExportInTx(
  tx: PayrollPayslipExportClient,
  parsed: z.output<typeof preparePayrollPayslipExportInputSchema>,
): Promise<PayrollPayslipExportResult> {
  assertSelfRead(parsed)
  assertSelfExport(parsed)

  const now = parseDate(parsed.now, new Date())
  const readModel = await loadSelfServiceReadModel(tx, {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: parsed.actorPermissions,
    payslipId: parsed.payslipId,
    limit: 1,
  })
  const payslip = readModel.payslips[0]

  if (!payslip) {
    throw new NotFoundError("Payslip was not found for export.")
  }

  const rowCount = 1 + payslip.lines.length + payslip.proof.sourceLinks.length
  const watermarkId = buildExportWatermark({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    scope: "payroll-payslip-self-service",
    filtersHash: payslip.proof.archiveManifestHash,
    rowCount,
    fileType: parsed.fileType,
    sensitivity: "personal",
    issuedAt: now,
  })
  const exportDecision = evaluateExportSafety({
    action: "payroll.payslip.self.export",
    actorId: parsed.actorId,
    organizationId: parsed.organizationId,
    actorPermissions: parsed.actorPermissions,
    resourceType: "PayrollPayslip",
    resourceId: payslip.id,
    lastAuthAt: parsed.lastAuthAt,
    now,
    exportContext: {
      scope: "payroll-payslip-self-service",
      filtersHash: payslip.proof.archiveManifestHash,
      rowCount,
      fileType: parsed.fileType,
      sensitivity: "personal",
      watermarkId,
    },
    metadata: {
      purpose: parsed.purpose,
      payslipNumber: payslip.payslipNumber,
      employeeId: readModel.employee.id,
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
    kind: "AQSTOQFLOW_PAYSLIP_SELF_SERVICE_ARCHIVE_EXPORT",
    version: 1,
    export: {
      generatedAt: now.toISOString(),
      generatedById: parsed.actorId,
      purpose: parsed.purpose,
      fileType: parsed.fileType,
      watermarkId,
      redaction: readModel.redaction.payrollAmounts,
      renderer: {
        pdfStatus: "NOT_GENERATED_NO_APPROVED_PAYROLL_PDF_RENDERER",
        mimeType: "application/json",
      },
    },
    employee: readModel.employee,
    payslip,
  }
  const contentHash = sha256(payload)
  const content = JSON.stringify({ ...payload, export: { ...payload.export, contentHash } }, null, 2)
  const eventResult = await recordBusinessEventInTx(tx as unknown as Parameters<typeof recordBusinessEventInTx>[0], {
    organizationId: parsed.organizationId,
    eventType: "payroll.payslip.exported",
    eventSource: "SYSTEM",
    idempotencyKey: `payroll-payslip:${payslip.id}:self-service-export:${contentHash}`,
    actorId: parsed.actorId,
    sourceType: "PAYROLL_PAYSLIP",
    sourceId: payslip.id,
    documentHash: contentHash,
    payload: {
      payslipId: payslip.id,
      payslipNumber: payslip.payslipNumber,
      employeeId: readModel.employee.id,
      archiveManifestHash: payslip.proof.archiveManifestHash,
      contentHash,
      watermarkId,
      rowCount,
      purpose: parsed.purpose,
      generatedAt: now.toISOString(),
    },
    outboxMessages: [
      {
        channel: "REPORT_EXPORT",
        eventName: "payroll.payslip.exported",
        idempotencyKey: `payroll-payslip:${payslip.id}:self-service-export:${contentHash}:report-export`,
        payload: {
          payslipId: payslip.id,
          contentHash,
          watermarkId,
          rowCount,
        },
      },
    ],
  })

  return {
    payslipId: payslip.id,
    fileName: `${watermarkId}.json`,
    mimeType: "application/json",
    content,
    contentHash,
    archiveManifestHash: payslip.proof.archiveManifestHash,
    watermarkId,
    rowCount,
    generatedAt: now.toISOString(),
    businessEventId: eventResult.event.id,
    redaction: readModel.redaction.payrollAmounts,
  }
}

export async function preparePayrollPayslipExport(
  input: PreparePayrollPayslipExportInput,
  client: (PayrollPayslipExportClient & Partial<PayrollPayslipTransactionRunner>) | typeof db = db,
): Promise<PayrollPayslipExportResult> {
  const parsed = preparePayrollPayslipExportInputSchema.parse(input)

  if (parsed.fileType !== "json") {
    throw new BusinessRuleError("Only JSON payslip archive exports are enabled.")
  }

  if (hasTransactionRunner(client)) {
    return client.$transaction((tx) => prepareExportInTx(tx as unknown as PayrollPayslipExportClient, parsed))
  }

  return prepareExportInTx(client as PayrollPayslipExportClient, parsed)
}
