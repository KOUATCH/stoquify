import "server-only"

import {
  AccountingPostingPurpose,
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

export type PayrollRegisterYearToDateProof = {
  status: PayrollRegisterTieOutStatus
  policyHash: string | null
  accumulatorHash: string | null
  periodStart: string | null
  periodEnd: string | null
  priorLineCount: number
  missingPriorCalculationSnapshotCount: number
  missingPriorLineDocumentHashCount: number
  source: string
}

export type PayrollRegisterStatutoryScenarioCoverageProof = {
  status: string | null
  coverageHash: string | null
  presentCount: number
  missingCount: number
  reviewedBy: string[]
  reviewedOn: string[]
  legalRefs: string[]
  sourceEvidenceHashes: string[]
}

export type PayrollRegisterCountryPackProof = {
  runLineId: string
  status: PayrollRegisterTieOutStatus
  issues: string[]
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

export type PayrollRegisterComponentAmounts = {
  grossAmount: string
  taxableBaseAmount: string
  socialBaseAmount: string
  employeePensionContributionAmount: string
  employerPensionContributionAmount: string
  familyAllowanceContributionAmount: string
  occupationalRiskContributionAmount: string
  incomeTaxWithholdingAmount: string | null
  overtimePremiumAmount: string
  payrollRubriqueGrossAmount: string
  payrollRubriqueTaxableBaseAmount: string
  payrollRubriqueSocialBaseAmount: string
  payrollRubriqueEmployeeDeductionAmount: string
  payrollRubriqueEmployerChargeAmount: string
  incomeTaxCalculationStatus: string | null
  incomeTaxApplied: boolean
  employeeDeductionAmount: string
  employerChargeAmount: string
  netPayableAmount: string
  currency: string
}

export type PayrollRegisterEffectiveComponentFamily =
  | "TAXABLE_ALLOWANCE"
  | "BENEFIT_IN_KIND"
  | "PAID_LEAVE"
  | "UNPAID_LEAVE"
  | "OVERTIME"

export type PayrollRegisterEffectiveComponentProof = {
  family: PayrollRegisterEffectiveComponentFamily
  status: PayrollRegisterTieOutStatus
  amount: string
  taxableBaseAmount: string
  socialBaseAmount: string
  employeeDeductionAmount: string
  employerChargeAmount: string
  quantity: string | null
  currency: string
  componentCount: number
  componentCodes: string[]
  issues: string[]
  source: string
}

export type PayrollRegisterComponentProof = {
  status: PayrollRegisterTieOutStatus
  issues: string[]
  source: string
  componentEvidenceHash: string
  effectiveComponents: PayrollRegisterEffectiveComponentProof[]
}

export type PayrollRegisterComponentTieOut = {
  status: PayrollRegisterTieOutStatus
  checkedLineCount: number
  matchedLineCount: number
  missingLineCount: number
  mismatchedLineCount: number
  blockedStatutoryComponentCount: number
  source: string
}

export type PayrollRegisterComponentMappingTieOut = {
  status: PayrollRegisterTieOutStatus
  taxableBaseAmount: string
  incomeTaxWithholdingAmount: string
  statutoryPayableAmount: string
  declarationLiabilityAmount: string
  declarationLiabilityDeltaAmount: string
  ledgerPostingLineCount: number
  ledgerMappedLineCount: number
  missingLedgerMappingKeys: string[]
  componentMappingHash: string
  declarationComponentMappingHashes: string[]
  ledgerComponentMappingHashes: string[]
  incomeTaxCalculationStatus: string | null
  incomeTaxWithholdingEnabled: boolean
  source: string
}

export type PayrollRegisterLedgerTieOut = {
  status: PayrollRegisterTieOutStatus
  runSourceLinked: boolean
  paymentSourceLinked: boolean
  sourceLinkCount: number
  journalEntryLineCount: number
  expectedDebitAmount: string
  actualDebitAmount: string
  debitDeltaAmount: string
  expectedCreditAmount: string
  actualCreditAmount: string
  creditDeltaAmount: string
  balanceDeltaAmount: string
  requiredMappingKeys: string[]
  presentMappingKeys: string[]
  missingMappingKeys: string[]
  extraMappingKeys: string[]
  unmappedLineCount: number
  unhashedLineCount: number
  postingPurposeMatched: boolean
  sourceMatched: boolean
  source: string
}

export type PayrollRegisterComponentTotals = PayrollRegisterComponentAmounts & {
  missingComponentProofCount: number
  mismatchedComponentProofCount: number
  blockedStatutoryComponentCount: number
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
  components: PayrollRegisterComponentAmounts
  tieOut: {
    payslip: PayrollRegisterTieOutStatus
    payment: PayrollRegisterTieOutStatus
    ledger: PayrollRegisterTieOutStatus
    components: PayrollRegisterTieOutStatus
  }
  componentProof: PayrollRegisterComponentProof
  proof: {
    runLineDocumentHash: string | null
    payslipDocumentHash: string | null
    archiveManifestHash: string | null
    paymentEvidenceHashes: string[]
    countryPack: PayrollRegisterCountryPackProof
    yearToDate: PayrollRegisterYearToDateProof
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
    statutoryScenarioCoverage: PayrollRegisterStatutoryScenarioCoverageProof
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
    componentTotals: PayrollRegisterComponentTotals
  }
  tieOut: {
    runLines: PayrollRegisterAmountCheck
    payslips: PayrollRegisterAmountCheck & PayrollRegisterCountCheck
    payments: PayrollRegisterAmountCheck
    declarations: PayrollRegisterAmountCheck
    components: PayrollRegisterComponentTieOut
    componentMapping: PayrollRegisterComponentMappingTieOut
    ledger: PayrollRegisterLedgerTieOut
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

const journalEntryLineSelect = {
  id: true,
  journalEntryId: true,
  lineNumber: true,
  debit: true,
  credit: true,
  metadata: true,
  journalEntry: {
    select: {
      postingBatchId: true,
      sourceType: true,
      sourceId: true,
      postingPurpose: true,
    },
  },
} satisfies Prisma.JournalEntryLineSelect

type PayrollRegisterRunRecord = Prisma.PayrollRunGetPayload<{ include: typeof payrollRegisterRunInclude }>
type AccountingSourceLinkRecord = Prisma.AccountingSourceLinkGetPayload<{ select: typeof accountingSourceLinkSelect }>
type PayrollRegisterJournalEntryLineRecord = Prisma.JournalEntryLineGetPayload<{ select: typeof journalEntryLineSelect }>
type PayrollRegisterClient = Pick<
  Prisma.TransactionClient,
  "payrollRun" | "accountingSourceLink" | "journalEntryLine" | "closeRun" | "closeEvidenceItem" | "closeAssuranceFinding" | "auditLog"
>
type PayrollRegisterExportClient = PayrollRegisterClient & Pick<Prisma.TransactionClient, "businessEvent">
type PayrollRegisterTransactionRunner = {
  $transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>
}

type PayrollRegisterComponentAmountKey = keyof Omit<
  PayrollRegisterComponentAmounts,
  "incomeTaxCalculationStatus" | "incomeTaxApplied" | "currency"
>

type PayrollRegisterComponentAmountsRaw = Record<PayrollRegisterComponentAmountKey, Prisma.Decimal | null>

type PayrollRegisterEffectiveComponentProofRaw = {
  family: PayrollRegisterEffectiveComponentFamily
  status: PayrollRegisterTieOutStatus
  amount: Prisma.Decimal
  taxableBaseAmount: Prisma.Decimal
  socialBaseAmount: Prisma.Decimal
  employeeDeductionAmount: Prisma.Decimal
  employerChargeAmount: Prisma.Decimal
  quantity: string | null
  currency: string
  componentCount: number
  componentCodes: string[]
  issues: string[]
  source: string
}

type PayrollRegisterLineComponentProof = {
  runLineId: string
  status: PayrollRegisterTieOutStatus
  issues: string[]
  amounts: PayrollRegisterComponentAmountsRaw
  incomeTaxCalculationStatus: string | null
  incomeTaxApplied: boolean
  currency: string
  blockedStatutoryComponentCount: number
  effectiveComponents: PayrollRegisterEffectiveComponentProofRaw[]
  componentEvidenceHash: string
}

const PAYROLL_COMPONENT_SOURCE = "payroll_run_lines.calculationSnapshot"
const PAYROLL_EFFECTIVE_COMPONENT_SOURCE = "payroll_run_lines.calculationSnapshot.effectiveComponents"
const PAYROLL_COUNTRY_PACK_PROVENANCE_SOURCE = "payroll_run_lines.calculationSnapshot.countryPackProvenance"
const PAYROLL_COMPONENT_AMOUNT_KEYS = [
  "grossAmount",
  "taxableBaseAmount",
  "socialBaseAmount",
  "employeePensionContributionAmount",
  "employerPensionContributionAmount",
  "familyAllowanceContributionAmount",
  "occupationalRiskContributionAmount",
  "incomeTaxWithholdingAmount",
  "overtimePremiumAmount",
  "payrollRubriqueGrossAmount",
  "payrollRubriqueTaxableBaseAmount",
  "payrollRubriqueSocialBaseAmount",
  "payrollRubriqueEmployeeDeductionAmount",
  "payrollRubriqueEmployerChargeAmount",
  "employeeDeductionAmount",
  "employerChargeAmount",
  "netPayableAmount",
] as const satisfies readonly PayrollRegisterComponentAmountKey[]
const PAYROLL_COMPONENT_OPTIONAL_AMOUNT_KEYS = new Set<PayrollRegisterComponentAmountKey>([
  "incomeTaxWithholdingAmount",
  "overtimePremiumAmount",
  "payrollRubriqueGrossAmount",
  "payrollRubriqueTaxableBaseAmount",
  "payrollRubriqueSocialBaseAmount",
  "payrollRubriqueEmployeeDeductionAmount",
  "payrollRubriqueEmployerChargeAmount",
])
const REQUIRED_PAYROLL_COMPONENT_AMOUNT_KEYS = PAYROLL_COMPONENT_AMOUNT_KEYS.filter(
  (key) => !PAYROLL_COMPONENT_OPTIONAL_AMOUNT_KEYS.has(key),
)

const PAYROLL_COMPONENT_LEDGER_MAPPING_KEYS = [
  "PAYROLL_GROSS_EXPENSE",
  "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
  "EMPLOYEE_PAYABLES",
  "PAYROLL_WITHHOLDING_PAYABLE",
  "SOCIAL_CONTRIBUTIONS_PAYABLE",
] as const

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

function nullableAmount(decision: RedactionDecision, value: Prisma.Decimal.Value | null | undefined) {
  return value === null || typeof value === "undefined" ? null : amount(decision, value)
}

function jsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function unknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function nestedRecord(value: unknown, key: string): Record<string, unknown> | null {
  return unknownRecord(unknownRecord(value)?.[key])
}

function metadataString(value: unknown, key: string) {
  const entry = unknownRecord(value)?.[key]
  return typeof entry === "string" && entry.trim().length > 0 ? entry.trim() : null
}

function metadataNumber(value: unknown, key: string) {
  const entry = unknownRecord(value)?.[key]
  return typeof entry === "number" && Number.isFinite(entry) ? entry : 0
}

function metadataStringArray(value: unknown, key: string) {
  const entry = unknownRecord(value)?.[key]
  return Array.isArray(entry)
    ? entry.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []
}

function statutoryScenarioCoverageFromRun(
  run: PayrollRegisterRunRecord,
): PayrollRegisterStatutoryScenarioCoverageProof {
  const metadata = jsonRecord(run.metadata)
  const coverage = nestedRecord(metadata, "statutoryScenarioCoverage")
  const reviewEvidence = nestedRecord(coverage, "reviewEvidence")

  return {
    status: metadataString(coverage, "status"),
    coverageHash:
      metadataString(metadata, "statutoryScenarioCoverageHash") ??
      metadataString(coverage, "coverageHash"),
    presentCount: metadataNumber(reviewEvidence, "presentCount"),
    missingCount: metadataNumber(reviewEvidence, "missingCount"),
    reviewedBy: metadataStringArray(reviewEvidence, "reviewedBy"),
    reviewedOn: metadataStringArray(reviewEvidence, "reviewedOn"),
    legalRefs: metadataStringArray(reviewEvidence, "legalRefs"),
    sourceEvidenceHashes: metadataStringArray(
      reviewEvidence,
      "sourceEvidenceHashes",
    ),
  }
}

function buildLineCountryPackProof(input: {
  line: PayrollRegisterRunRecord["lines"][number]
  run: PayrollRegisterRunRecord
  statutoryScenarioCoverage: PayrollRegisterStatutoryScenarioCoverageProof
}): PayrollRegisterCountryPackProof {
  const snapshot = jsonRecord(input.line.calculationSnapshot)
  const provenance = nestedRecord(snapshot, "countryPackProvenance")
  const issues: string[] = []

  if (!snapshot) {
    issues.push("missing:calculationSnapshot")
  }
  if (!provenance) {
    issues.push("missing:countryPackProvenance")
  }

  const countryCode = metadataString(provenance, "countryCode") ?? metadataString(snapshot, "countryCode")
  const countryPackVersion = metadataString(provenance, "packVersion") ?? metadataString(snapshot, "countryPackVersion")
  const countryPackSchemaVersion = metadataString(provenance, "schemaVersion") ?? metadataString(snapshot, "countryPackSchemaVersion")
  const countryPackCapabilityStatus = metadataString(provenance, "capabilityStatus") ?? metadataString(snapshot, "countryPackCapabilityStatus")
  const countryPackResolutionHash = metadataString(provenance, "resolutionHash") ?? metadataString(snapshot, "countryPackResolutionHash")
  const statutoryScenarioCoverageHash = metadataString(provenance, "statutoryScenarioCoverageHash")
  const statutoryScenarioCoverageStatus = metadataString(provenance, "statutoryScenarioCoverageStatus")
  const roundingPolicyHash = metadataString(provenance, "roundingPolicyHash") ?? metadataString(snapshot, "roundingPolicyHash")
  const yearToDatePolicyHash = metadataString(provenance, "yearToDatePolicyHash") ?? metadataString(snapshot, "yearToDatePolicyHash")
  const provenanceHash = metadataString(snapshot, "countryPackProvenanceHash")
  const computedHash = provenance ? `sha256:${hashBusinessPayload(provenance)}` : null

  const requireMatched = (actual: string | null, expected: string | null | undefined, key: string) => {
    if (!actual) {
      issues.push(`missing:${key}`)
      return
    }
    if (expected && actual !== expected) {
      issues.push(`mismatch:${key}`)
    }
  }

  requireMatched(countryCode, input.run.countryCode, "countryCode")
  requireMatched(countryPackVersion, input.run.countryPackVersion, "countryPackVersion")
  requireMatched(countryPackSchemaVersion, input.run.countryPackSchemaVersion, "countryPackSchemaVersion")
  requireMatched(countryPackCapabilityStatus, input.run.countryPackCapabilityStatus, "countryPackCapabilityStatus")
  requireMatched(countryPackResolutionHash, input.run.countryPackResolutionHash, "countryPackResolutionHash")
  requireMatched(statutoryScenarioCoverageHash, input.statutoryScenarioCoverage.coverageHash, "statutoryScenarioCoverageHash")
  requireMatched(statutoryScenarioCoverageStatus, input.statutoryScenarioCoverage.status, "statutoryScenarioCoverageStatus")
  if (!roundingPolicyHash) issues.push("missing:roundingPolicyHash")
  if (!yearToDatePolicyHash) issues.push("missing:yearToDatePolicyHash")
  if (!provenanceHash) issues.push("missing:countryPackProvenanceHash")
  if (provenanceHash && computedHash && provenanceHash !== computedHash) {
    issues.push("mismatch:countryPackProvenanceHash")
  }

  const missingEvidence = issues.some((issue) => issue.startsWith("missing:"))
  const status: PayrollRegisterTieOutStatus = missingEvidence ? "MISSING" : issues.length > 0 ? "MISMATCH" : "MATCHED"

  return {
    runLineId: input.line.id,
    status,
    issues,
    countryCode,
    countryPackVersion,
    countryPackSchemaVersion,
    countryPackCapabilityStatus,
    countryPackResolutionHash,
    statutoryScenarioCoverageHash,
    statutoryScenarioCoverageStatus,
    reviewEvidenceSourceHashes: metadataStringArray(provenance, "reviewEvidenceSourceHashes").sort(),
    legalRefs: metadataStringArray(provenance, "legalRefs").sort(),
    roundingPolicyHash,
    yearToDatePolicyHash,
    provenanceHash,
    computedHash,
    source: PAYROLL_COUNTRY_PACK_PROVENANCE_SOURCE,
  }
}

function yearToDateAccumulatorHashFromLine(line: PayrollRegisterRunRecord["lines"][number]) {
  const snapshot = jsonRecord(line.calculationSnapshot)
  const proof = nestedRecord(snapshot, "yearToDateProof")
  return (
    metadataString(snapshot, "yearToDateAccumulatorHash") ??
    metadataString(proof, "ytdAccumulatorHash")
  )
}

function yearToDateProofFromLine(line: PayrollRegisterRunRecord["lines"][number]): PayrollRegisterYearToDateProof {
  const snapshot = jsonRecord(line.calculationSnapshot)
  const proof = nestedRecord(snapshot, "yearToDateProof")
  const policy = unknownRecord(proof?.policy) ?? nestedRecord(snapshot, "yearToDatePolicy")
  const accumulatorHash = yearToDateAccumulatorHashFromLine(line)
  const policyHash =
    metadataString(snapshot, "yearToDatePolicyHash") ??
    metadataString(proof, "yearToDatePolicyHash") ??
    metadataString(policy, "ytdPolicyHash")

  return {
    status: accumulatorHash && policyHash ? "MATCHED" : "MISSING",
    policyHash,
    accumulatorHash,
    periodStart: metadataString(policy, "periodStart"),
    periodEnd: metadataString(policy, "periodEnd"),
    priorLineCount: metadataNumber(proof, "priorLineCount"),
    missingPriorCalculationSnapshotCount: metadataNumber(
      proof,
      "missingPriorCalculationSnapshotCount",
    ),
    missingPriorLineDocumentHashCount: metadataNumber(
      proof,
      "missingPriorLineDocumentHashCount",
    ),
    source: "payroll_run_lines.calculationSnapshot.yearToDateProof",
  }
}

function snapshotDecimal(snapshot: Record<string, unknown> | null, key: string) {
  if (!snapshot) return null
  const value = snapshot[key]
  if (value === null || typeof value === "undefined" || value === "") return null
  if (typeof value !== "string" && typeof value !== "number") return null

  try {
    return decimal(value)
  } catch {
    return null
  }
}

function snapshotString(snapshot: Record<string, unknown> | null, key: string) {
  const value = snapshot?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function snapshotBoolean(snapshot: Record<string, unknown> | null, key: string) {
  return snapshot?.[key] === true
}

function emptyComponentAmounts(): PayrollRegisterComponentAmountsRaw {
  return {
    grossAmount: null,
    taxableBaseAmount: null,
    socialBaseAmount: null,
    employeePensionContributionAmount: null,
    employerPensionContributionAmount: null,
    familyAllowanceContributionAmount: null,
    occupationalRiskContributionAmount: null,
    incomeTaxWithholdingAmount: null,
    overtimePremiumAmount: null,
    payrollRubriqueGrossAmount: null,
    payrollRubriqueTaxableBaseAmount: null,
    payrollRubriqueSocialBaseAmount: null,
    payrollRubriqueEmployeeDeductionAmount: null,
    payrollRubriqueEmployerChargeAmount: null,
    employeeDeductionAmount: null,
    employerChargeAmount: null,
    netPayableAmount: null,
  }
}

function lineComponentAmount(
  line: PayrollRegisterRunRecord["lines"][number],
  key: PayrollRegisterComponentAmountKey,
): Prisma.Decimal.Value | null {
  switch (key) {
    case "grossAmount":
      return line.grossAmount
    case "taxableBaseAmount":
      return line.taxableBaseAmount
    case "socialBaseAmount":
      return line.socialBaseAmount
    case "employeeDeductionAmount":
      return line.employeeDeductionAmount
    case "employerChargeAmount":
      return line.employerChargeAmount
    case "netPayableAmount":
      return line.netPayableAmount
    default:
      return null
  }
}

function addComponentMismatch(
  issues: string[],
  key: PayrollRegisterComponentAmountKey,
  expected: Prisma.Decimal.Value,
  actual: Prisma.Decimal.Value,
) {
  if (!decimal(expected).equals(decimal(actual))) {
    addComponentIssue(issues, `mismatch:${key}`)
  }
}

function addComponentIssue(issues: string[], issue: string) {
  if (!issues.includes(issue)) issues.push(issue)
}

function decimalFromUnknown(value: unknown) {
  if (value === null || typeof value === "undefined" || value === "") return null
  if (typeof value !== "string" && typeof value !== "number") return null

  try {
    return decimal(value)
  } catch {
    return null
  }
}

function decimalOrZero(value: Prisma.Decimal | null | undefined) {
  return value ?? new Prisma.Decimal(0)
}

function snapshotNumber(snapshot: Record<string, unknown> | null, key: string) {
  const value = snapshot?.[key]
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function payrollRubriqueComponents(snapshot: Record<string, unknown> | null) {
  const components = snapshot?.payrollRubriqueComponents
  if (!Array.isArray(components)) return []
  return components.map(unknownRecord).filter((component): component is Record<string, unknown> => Boolean(component))
}

function componentDecimal(component: Record<string, unknown>, key: string) {
  return decimalFromUnknown(component[key]) ?? new Prisma.Decimal(0)
}

function componentString(component: Record<string, unknown>, key: string) {
  return metadataString(component, key)
}

function componentCodes(components: Record<string, unknown>[]) {
  return Array.from(new Set(components.map((component) => componentString(component, "code")).filter((code): code is string => Boolean(code)))).sort()
}

function sumComponentDecimals(components: Record<string, unknown>[], key: string) {
  return components.reduce((total, component) => total.plus(componentDecimal(component, key)), new Prisma.Decimal(0)).toDecimalPlaces(2)
}

function effectiveComponentStatus(hasProof: boolean, issues: string[]): PayrollRegisterTieOutStatus {
  if (issues.some((issue) => issue.startsWith("missing:"))) return "MISSING"
  if (issues.length > 0) return "MISMATCH"
  return hasProof ? "MATCHED" : "PENDING"
}

function effectiveComponentProof(input: {
  family: PayrollRegisterEffectiveComponentFamily
  amount?: Prisma.Decimal
  taxableBaseAmount?: Prisma.Decimal
  socialBaseAmount?: Prisma.Decimal
  employeeDeductionAmount?: Prisma.Decimal
  employerChargeAmount?: Prisma.Decimal
  quantity?: string | null
  currency: string
  componentCount?: number
  componentCodes?: string[]
  issues?: string[]
  hasProof?: boolean
}): PayrollRegisterEffectiveComponentProofRaw {
  const amount = input.amount ?? new Prisma.Decimal(0)
  const componentCount = input.componentCount ?? 0
  const issues = input.issues ?? []
  return {
    family: input.family,
    status: effectiveComponentStatus(input.hasProof ?? (componentCount > 0 || !amount.isZero()), issues),
    amount: amount.toDecimalPlaces(2),
    taxableBaseAmount: (input.taxableBaseAmount ?? new Prisma.Decimal(0)).toDecimalPlaces(2),
    socialBaseAmount: (input.socialBaseAmount ?? new Prisma.Decimal(0)).toDecimalPlaces(2),
    employeeDeductionAmount: (input.employeeDeductionAmount ?? new Prisma.Decimal(0)).toDecimalPlaces(2),
    employerChargeAmount: (input.employerChargeAmount ?? new Prisma.Decimal(0)).toDecimalPlaces(2),
    quantity: input.quantity ?? null,
    currency: input.currency,
    componentCount,
    componentCodes: [...(input.componentCodes ?? [])].sort(),
    issues,
    source: PAYROLL_EFFECTIVE_COMPONENT_SOURCE,
  }
}

function attendanceLeaveProofs(snapshot: Record<string, unknown> | null, currency: string) {
  const leaveMinutes = snapshotNumber(snapshot, "leaveMinutes") ?? 0
  const scheduledMinutes = snapshotNumber(snapshot, "scheduledMinutes")
  const workedMinutes = snapshotNumber(snapshot, "workedMinutes")
  const paidMinutes = snapshotNumber(snapshot, "paidMinutes")
  const baseSalary = snapshotDecimal(snapshot, "baseSalary")

  if (leaveMinutes <= 0) {
    return [
      effectiveComponentProof({ family: "PAID_LEAVE", currency }),
      effectiveComponentProof({ family: "UNPAID_LEAVE", currency }),
    ]
  }

  const issues: string[] = []
  if (!scheduledMinutes || scheduledMinutes <= 0) issues.push("missing:scheduledMinutes")
  if (workedMinutes == null) issues.push("missing:workedMinutes")
  if (paidMinutes == null) issues.push("missing:paidMinutes")
  if (!baseSalary) issues.push("missing:baseSalary")

  if (issues.length > 0 || !scheduledMinutes || !baseSalary || workedMinutes == null || paidMinutes == null) {
    return [
      effectiveComponentProof({ family: "PAID_LEAVE", currency, quantity: String(leaveMinutes), issues, hasProof: true }),
      effectiveComponentProof({ family: "UNPAID_LEAVE", currency, quantity: String(leaveMinutes), issues, hasProof: true }),
    ]
  }

  const paidLeaveMinutes = Math.max(0, Math.min(leaveMinutes, paidMinutes - workedMinutes))
  const unpaidLeaveMinutes = Math.max(0, leaveMinutes - paidLeaveMinutes)
  const leaveAmount = (minutes: number) => baseSalary.times(minutes).div(scheduledMinutes).toDecimalPlaces(2)

  return [
    effectiveComponentProof({
      family: "PAID_LEAVE",
      amount: leaveAmount(paidLeaveMinutes),
      taxableBaseAmount: leaveAmount(paidLeaveMinutes),
      socialBaseAmount: leaveAmount(paidLeaveMinutes),
      quantity: String(paidLeaveMinutes),
      currency,
      hasProof: paidLeaveMinutes > 0,
    }),
    effectiveComponentProof({
      family: "UNPAID_LEAVE",
      amount: leaveAmount(unpaidLeaveMinutes),
      quantity: String(unpaidLeaveMinutes),
      currency,
      hasProof: unpaidLeaveMinutes > 0,
    }),
  ]
}

function validateRubriqueComponentRollups(
  snapshot: Record<string, unknown> | null,
  amounts: PayrollRegisterComponentAmountsRaw,
  issues: string[],
) {
  const components = payrollRubriqueComponents(snapshot)
  const rollups: Array<[PayrollRegisterComponentAmountKey, string]> = [
    ["payrollRubriqueGrossAmount", "grossAmount"],
    ["payrollRubriqueTaxableBaseAmount", "taxableBaseAmount"],
    ["payrollRubriqueSocialBaseAmount", "socialBaseAmount"],
    ["payrollRubriqueEmployeeDeductionAmount", "employeeDeductionAmount"],
    ["payrollRubriqueEmployerChargeAmount", "employerChargeAmount"],
  ]
  const hasRubriqueAmount = rollups.some(([key]) => !decimalOrZero(amounts[key]).isZero())

  if (hasRubriqueAmount && components.length === 0) {
    addComponentIssue(issues, "missing:payrollRubriqueComponents")
    return
  }

  if (components.length === 0) return

  for (const [amountKey, componentKey] of rollups) {
    const expected = amounts[amountKey]
    if (!expected) {
      addComponentIssue(issues, `missing:${amountKey}`)
      continue
    }
    const actual = sumComponentDecimals(components, componentKey)
    if (!actual.equals(expected)) {
      addComponentIssue(issues, `mismatch:${amountKey}`)
    }
  }
}

function buildEffectiveComponentProofs(
  snapshot: Record<string, unknown> | null,
  amounts: PayrollRegisterComponentAmountsRaw,
  currency: string,
): PayrollRegisterEffectiveComponentProofRaw[] {
  const components = payrollRubriqueComponents(snapshot)
  const taxableAllowanceComponents = components.filter(
    (component) => componentString(component, "kind") === "EARNING" && componentDecimal(component, "taxableBaseAmount").gt(0),
  )
  const benefitComponents = components.filter((component) => {
    const formulaTrace = unknownRecord(component.formulaTrace)
    return componentString(component, "kind") === "EMPLOYER_CHARGE" ||
      componentDecimal(component, "employerChargeAmount").gt(0) ||
      metadataString(formulaTrace, "parameterPath") === "payroll.compensation.benefits"
  })
  const overtimeMinutes = snapshotNumber(snapshot, "overtimeMinutes") ?? 0
  const overtimeIssues = overtimeMinutes > 0 && !amounts.overtimePremiumAmount ? ["missing:overtimePremiumAmount"] : []
  const overtimeAmount = decimalOrZero(amounts.overtimePremiumAmount)

  return [
    effectiveComponentProof({
      family: "TAXABLE_ALLOWANCE",
      amount: sumComponentDecimals(taxableAllowanceComponents, "grossAmount"),
      taxableBaseAmount: sumComponentDecimals(taxableAllowanceComponents, "taxableBaseAmount"),
      socialBaseAmount: sumComponentDecimals(taxableAllowanceComponents, "socialBaseAmount"),
      currency,
      componentCount: taxableAllowanceComponents.length,
      componentCodes: componentCodes(taxableAllowanceComponents),
    }),
    effectiveComponentProof({
      family: "BENEFIT_IN_KIND",
      amount: sumComponentDecimals(benefitComponents, "amount"),
      taxableBaseAmount: sumComponentDecimals(benefitComponents, "taxableBaseAmount"),
      socialBaseAmount: sumComponentDecimals(benefitComponents, "socialBaseAmount"),
      employerChargeAmount: sumComponentDecimals(benefitComponents, "employerChargeAmount"),
      currency,
      componentCount: benefitComponents.length,
      componentCodes: componentCodes(benefitComponents),
    }),
    ...attendanceLeaveProofs(snapshot, currency),
    effectiveComponentProof({
      family: "OVERTIME",
      amount: overtimeAmount,
      taxableBaseAmount: overtimeAmount,
      socialBaseAmount: overtimeAmount,
      quantity: overtimeMinutes > 0 ? String(overtimeMinutes) : null,
      currency,
      issues: overtimeIssues,
      hasProof: overtimeMinutes > 0 || !overtimeAmount.isZero(),
    }),
  ]
}

function componentProofHashPayload(proof: Omit<PayrollRegisterLineComponentProof, "componentEvidenceHash">) {
  return {
    runLineId: proof.runLineId,
    status: proof.status,
    issues: [...proof.issues].sort(),
    currency: proof.currency,
    incomeTaxCalculationStatus: proof.incomeTaxCalculationStatus,
    incomeTaxApplied: proof.incomeTaxApplied,
    blockedStatutoryComponentCount: proof.blockedStatutoryComponentCount,
    components: Object.fromEntries(
      PAYROLL_COMPONENT_AMOUNT_KEYS.map((key) => [key, proof.amounts[key]?.toFixed(2) ?? null]),
    ),
    effectiveComponents: proof.effectiveComponents.map((component) => ({
      family: component.family,
      status: component.status,
      amount: component.amount.toFixed(2),
      taxableBaseAmount: component.taxableBaseAmount.toFixed(2),
      socialBaseAmount: component.socialBaseAmount.toFixed(2),
      employeeDeductionAmount: component.employeeDeductionAmount.toFixed(2),
      employerChargeAmount: component.employerChargeAmount.toFixed(2),
      quantity: component.quantity,
      currency: component.currency,
      componentCount: component.componentCount,
      componentCodes: [...component.componentCodes].sort(),
      issues: [...component.issues].sort(),
      source: component.source,
    })),
  }
}

function buildLineComponentProof(line: PayrollRegisterRunRecord["lines"][number]): PayrollRegisterLineComponentProof {
  const snapshot = jsonRecord(line.calculationSnapshot)
  const issues: string[] = []
  const amounts = emptyComponentAmounts()

  if (!snapshot) {
    issues.push("missing:calculationSnapshot")
  }

  for (const key of PAYROLL_COMPONENT_AMOUNT_KEYS) {
    amounts[key] = snapshotDecimal(snapshot, key)
  }

  for (const key of REQUIRED_PAYROLL_COMPONENT_AMOUNT_KEYS) {
    if (!amounts[key]) {
      issues.push(`missing:${key}`)
    }
  }

  for (const key of PAYROLL_COMPONENT_AMOUNT_KEYS) {
    const lineAmount = lineComponentAmount(line, key)
    if (lineAmount && amounts[key]) {
      addComponentMismatch(issues, key, lineAmount, amounts[key])
    }
  }
  validateRubriqueComponentRollups(snapshot, amounts, issues)

  const incomeTaxCalculationStatus = snapshotString(snapshot, "incomeTaxCalculationStatus")
  const incomeTaxApplied = snapshotBoolean(snapshot, "incomeTaxApplied")
  if (!incomeTaxCalculationStatus) {
    issues.push("missing:incomeTaxCalculationStatus")
  }
  if (incomeTaxApplied && !amounts.incomeTaxWithholdingAmount) {
    issues.push("missing:incomeTaxWithholdingAmount")
  }

  const snapshotCurrency = snapshotString(snapshot, "currency")
  if (!snapshotCurrency) {
    issues.push("missing:currency")
  } else if (snapshotCurrency !== line.currency) {
    issues.push("mismatch:currency")
  }

  const incomeTaxAmount = amounts.incomeTaxWithholdingAmount ?? new Prisma.Decimal(0)
  const rubriqueEmployeeDeductionAmount = amounts.payrollRubriqueEmployeeDeductionAmount ?? new Prisma.Decimal(0)
  if (amounts.employeePensionContributionAmount && amounts.employeeDeductionAmount) {
    addComponentMismatch(
      issues,
      "employeeDeductionAmount",
      amounts.employeeDeductionAmount,
      amounts.employeePensionContributionAmount.plus(incomeTaxAmount).plus(rubriqueEmployeeDeductionAmount),
    )
  }

  if (
    amounts.employerPensionContributionAmount &&
    amounts.familyAllowanceContributionAmount &&
    amounts.occupationalRiskContributionAmount &&
    amounts.employerChargeAmount
  ) {
    const rubriqueEmployerChargeAmount = amounts.payrollRubriqueEmployerChargeAmount ?? new Prisma.Decimal(0)
    addComponentMismatch(
      issues,
      "employerChargeAmount",
      amounts.employerChargeAmount,
      amounts.employerPensionContributionAmount
        .plus(amounts.familyAllowanceContributionAmount)
        .plus(amounts.occupationalRiskContributionAmount)
        .plus(rubriqueEmployerChargeAmount),
    )
  }

  if (amounts.grossAmount && amounts.employeeDeductionAmount && amounts.netPayableAmount) {
    addComponentMismatch(
      issues,
      "netPayableAmount",
      amounts.netPayableAmount,
      amounts.grossAmount.minus(amounts.employeeDeductionAmount),
    )
  }

  const effectiveComponents = buildEffectiveComponentProofs(snapshot, amounts, snapshotCurrency ?? line.currency)
  for (const effectiveComponent of effectiveComponents) {
    for (const issue of effectiveComponent.issues) {
      addComponentIssue(issues, `${effectiveComponent.family}:${issue}`)
    }
  }

  const missingEvidence = issues.some((issue) => issue.includes(":missing:") || issue.startsWith("missing:"))
  const status: PayrollRegisterTieOutStatus = missingEvidence ? "MISSING" : issues.length > 0 ? "MISMATCH" : "MATCHED"
  const blockedStatutoryComponentCount = incomeTaxCalculationStatus?.startsWith("BLOCKED") ? 1 : 0
  const proofWithoutHash: Omit<PayrollRegisterLineComponentProof, "componentEvidenceHash"> = {
    runLineId: line.id,
    status,
    issues,
    amounts,
    incomeTaxCalculationStatus,
    incomeTaxApplied,
    currency: snapshotCurrency ?? line.currency,
    blockedStatutoryComponentCount,
    effectiveComponents,
  }

  return {
    ...proofWithoutHash,
    componentEvidenceHash: `sha256:${hashBusinessPayload({
      kind: "AQSTOQFLOW_PAYROLL_COMPONENT_PROOF",
      version: 2,
      ...componentProofHashPayload(proofWithoutHash),
    })}`,
  }
}

function componentAmountsForReadModel(
  proof: PayrollRegisterLineComponentProof,
  decision: RedactionDecision,
): PayrollRegisterComponentAmounts {
  return {
    grossAmount: amount(decision, proof.amounts.grossAmount),
    taxableBaseAmount: amount(decision, proof.amounts.taxableBaseAmount),
    socialBaseAmount: amount(decision, proof.amounts.socialBaseAmount),
    employeePensionContributionAmount: amount(decision, proof.amounts.employeePensionContributionAmount),
    employerPensionContributionAmount: amount(decision, proof.amounts.employerPensionContributionAmount),
    familyAllowanceContributionAmount: amount(decision, proof.amounts.familyAllowanceContributionAmount),
    occupationalRiskContributionAmount: amount(decision, proof.amounts.occupationalRiskContributionAmount),
    incomeTaxWithholdingAmount: nullableAmount(decision, proof.amounts.incomeTaxWithholdingAmount),
    overtimePremiumAmount: amount(decision, proof.amounts.overtimePremiumAmount),
    payrollRubriqueGrossAmount: amount(decision, proof.amounts.payrollRubriqueGrossAmount),
    payrollRubriqueTaxableBaseAmount: amount(decision, proof.amounts.payrollRubriqueTaxableBaseAmount),
    payrollRubriqueSocialBaseAmount: amount(decision, proof.amounts.payrollRubriqueSocialBaseAmount),
    payrollRubriqueEmployeeDeductionAmount: amount(decision, proof.amounts.payrollRubriqueEmployeeDeductionAmount),
    payrollRubriqueEmployerChargeAmount: amount(decision, proof.amounts.payrollRubriqueEmployerChargeAmount),
    incomeTaxCalculationStatus: proof.incomeTaxCalculationStatus,
    incomeTaxApplied: proof.incomeTaxApplied,
    employeeDeductionAmount: amount(decision, proof.amounts.employeeDeductionAmount),
    employerChargeAmount: amount(decision, proof.amounts.employerChargeAmount),
    netPayableAmount: amount(decision, proof.amounts.netPayableAmount),
    currency: proof.currency,
  }
}

function effectiveComponentsForReadModel(
  proof: PayrollRegisterLineComponentProof,
  decision: RedactionDecision,
): PayrollRegisterEffectiveComponentProof[] {
  return proof.effectiveComponents.map((component) => ({
    family: component.family,
    status: component.status,
    amount: amount(decision, component.amount),
    taxableBaseAmount: amount(decision, component.taxableBaseAmount),
    socialBaseAmount: amount(decision, component.socialBaseAmount),
    employeeDeductionAmount: amount(decision, component.employeeDeductionAmount),
    employerChargeAmount: amount(decision, component.employerChargeAmount),
    quantity: decision.allowed ? component.quantity : component.quantity ? decision.replacement : null,
    currency: component.currency,
    componentCount: component.componentCount,
    componentCodes: component.componentCodes,
    issues: component.issues,
    source: component.source,
  }))
}

function componentTotalsForReadModel(
  proofs: PayrollRegisterLineComponentProof[],
  decision: RedactionDecision,
  currency: string,
): PayrollRegisterComponentTotals {
  const total = (key: PayrollRegisterComponentAmountKey) => sumDecimals(proofs.map((proof) => proof.amounts[key]))
  return {
    grossAmount: amount(decision, total("grossAmount")),
    taxableBaseAmount: amount(decision, total("taxableBaseAmount")),
    socialBaseAmount: amount(decision, total("socialBaseAmount")),
    employeePensionContributionAmount: amount(decision, total("employeePensionContributionAmount")),
    employerPensionContributionAmount: amount(decision, total("employerPensionContributionAmount")),
    familyAllowanceContributionAmount: amount(decision, total("familyAllowanceContributionAmount")),
    occupationalRiskContributionAmount: amount(decision, total("occupationalRiskContributionAmount")),
    incomeTaxWithholdingAmount: amount(decision, total("incomeTaxWithholdingAmount")),
    overtimePremiumAmount: amount(decision, total("overtimePremiumAmount")),
    payrollRubriqueGrossAmount: amount(decision, total("payrollRubriqueGrossAmount")),
    payrollRubriqueTaxableBaseAmount: amount(decision, total("payrollRubriqueTaxableBaseAmount")),
    payrollRubriqueSocialBaseAmount: amount(decision, total("payrollRubriqueSocialBaseAmount")),
    payrollRubriqueEmployeeDeductionAmount: amount(decision, total("payrollRubriqueEmployeeDeductionAmount")),
    payrollRubriqueEmployerChargeAmount: amount(decision, total("payrollRubriqueEmployerChargeAmount")),
    incomeTaxCalculationStatus: null,
    incomeTaxApplied: proofs.some((proof) => proof.incomeTaxApplied),
    employeeDeductionAmount: amount(decision, total("employeeDeductionAmount")),
    employerChargeAmount: amount(decision, total("employerChargeAmount")),
    netPayableAmount: amount(decision, total("netPayableAmount")),
    currency,
    missingComponentProofCount: proofs.filter((proof) => proof.status === "MISSING").length,
    mismatchedComponentProofCount: proofs.filter((proof) => proof.status === "MISMATCH").length,
    blockedStatutoryComponentCount: proofs.reduce((totalCount, proof) => totalCount + proof.blockedStatutoryComponentCount, 0),
  }
}

function componentTieOutForReadModel(proofs: PayrollRegisterLineComponentProof[]): PayrollRegisterComponentTieOut {
  const missingLineCount = proofs.filter((proof) => proof.status === "MISSING").length
  const mismatchedLineCount = proofs.filter((proof) => proof.status === "MISMATCH").length
  return {
    status: missingLineCount > 0 ? "MISSING" : mismatchedLineCount > 0 ? "MISMATCH" : "MATCHED",
    checkedLineCount: proofs.length,
    matchedLineCount: proofs.filter((proof) => proof.status === "MATCHED").length,
    missingLineCount,
    mismatchedLineCount,
    blockedStatutoryComponentCount: proofs.reduce((totalCount, proof) => totalCount + proof.blockedStatutoryComponentCount, 0),
    source: PAYROLL_COMPONENT_SOURCE,
  }
}

function componentTotal(proofs: PayrollRegisterLineComponentProof[], key: PayrollRegisterComponentAmountKey) {
  return sumDecimals(proofs.map((proof) => proof.amounts[key]))
}

function incomeTaxCalculationStatusForProofs(proofs: PayrollRegisterLineComponentProof[]) {
  const statuses = proofs
    .map((proof) => proof.incomeTaxCalculationStatus)
    .filter((value): value is string => Boolean(value))
  return statuses.length === 0 ? null : Array.from(new Set(statuses)).sort().join("|")
}

function buildComponentMappingPayload(input: {
  run: PayrollRegisterRunRecord
  proofs: PayrollRegisterLineComponentProof[]
}) {
  const incomeTaxWithholding = componentTotal(input.proofs, "incomeTaxWithholdingAmount")
  const statutoryPayable = componentTotal(input.proofs, "employeePensionContributionAmount")
    .plus(incomeTaxWithholding)
    .plus(componentTotal(input.proofs, "employerPensionContributionAmount"))
    .plus(componentTotal(input.proofs, "familyAllowanceContributionAmount"))
    .plus(componentTotal(input.proofs, "occupationalRiskContributionAmount"))
    .toDecimalPlaces(2)
  const declarationLiability = componentTotal(input.proofs, "employeeDeductionAmount")
    .plus(componentTotal(input.proofs, "employerChargeAmount"))
    .toDecimalPlaces(2)
  const incomeTaxCalculationStatus = incomeTaxCalculationStatusForProofs(input.proofs)
  const blockedStatutoryComponentCount = input.proofs.reduce((totalCount, proof) => totalCount + proof.blockedStatutoryComponentCount, 0)
  const reviewStatus = blockedStatutoryComponentCount > 0 || incomeTaxCalculationStatus?.includes("BLOCKED")
    ? "BLOCKED_REQUIRES_EXPERT_REVIEW"
    : "REVIEWED"

  return {
    kind: "AQSTOQFLOW_PAYROLL_COMPONENT_MAPPING" as const,
    version: 1 as const,
    payrollRunId: input.run.id,
    runNumber: input.run.runNumber,
    currency: input.run.currency,
    reviewStatus,
    reviewDefault: "BLOCK_UNTIL_REVIEWED_FIXTURES" as const,
    taxableBaseAmount: componentTotal(input.proofs, "taxableBaseAmount").toFixed(2),
    incomeTaxWithholdingAmount: incomeTaxWithholding.toFixed(2),
    statutoryPayableAmount: statutoryPayable.toFixed(2),
    declarationLiabilityAmount: declarationLiability.toFixed(2),
    incomeTaxCalculationStatus,
    incomeTaxApplied: input.proofs.some((proof) => proof.incomeTaxApplied),
    incomeTaxWithholdingEnabled: input.proofs.some((proof) => proof.incomeTaxApplied) && reviewStatus === "REVIEWED",
    blockedStatutoryComponentCount,
    requiredLedgerMappingKeys: [...PAYROLL_COMPONENT_LEDGER_MAPPING_KEYS],
  }
}


function declarationMappingHash(declaration: PayrollRegisterRunRecord["declarations"][number]) {
  const metadata = unknownRecord(declaration.metadata)
  return metadataString(metadata, "payrollComponentMappingHash") ?? metadataString(nestedRecord(metadata, "payload"), "payrollComponentMappingHash")
}

function journalLineMappingKey(line: PayrollRegisterJournalEntryLineRecord) {
  return metadataString(line.metadata, "mappingKey")
}

function journalLineMappingHash(line: PayrollRegisterJournalEntryLineRecord) {
  return metadataString(line.metadata, "payrollComponentMappingHash")
}

function journalLineAmount(line: PayrollRegisterJournalEntryLineRecord) {
  return decimal(line.debit).plus(decimal(line.credit)).toDecimalPlaces(2)
}

function componentMappingTieOutForReadModel(input: {
  run: PayrollRegisterRunRecord
  proofs: PayrollRegisterLineComponentProof[]
  journalLines: PayrollRegisterJournalEntryLineRecord[]
  decision: RedactionDecision
}): PayrollRegisterComponentMappingTieOut {
  const expectedPayload = buildComponentMappingPayload({ run: input.run, proofs: input.proofs })
  const expectedHash = `sha256:${hashBusinessPayload(expectedPayload)}`
  const declarationHashes = Array.from(new Set(input.run.declarations.map(declarationMappingHash).filter((hash): hash is string => Boolean(hash)))).sort()
  const ledgerHashes = Array.from(new Set(input.journalLines.map(journalLineMappingHash).filter((hash): hash is string => Boolean(hash)))).sort()
  const ledgerAmountsByMapping = new Map<string, Prisma.Decimal>()
  for (const line of input.journalLines) {
    const mappingKey = journalLineMappingKey(line)
    if (!mappingKey) continue
    ledgerAmountsByMapping.set(
      mappingKey,
      (ledgerAmountsByMapping.get(mappingKey) ?? new Prisma.Decimal(0)).plus(journalLineAmount(line)).toDecimalPlaces(2),
    )
  }

  const expectedLedgerAmounts = new Map<string, Prisma.Decimal>([
    ["PAYROLL_GROSS_EXPENSE", decimal(input.run.grossAmount)],
    ["PAYROLL_EMPLOYER_CHARGE_EXPENSE", decimal(input.run.employerChargeAmount)],
    ["EMPLOYEE_PAYABLES", decimal(input.run.netPayableAmount)],
    ["PAYROLL_WITHHOLDING_PAYABLE", decimal(input.run.employeeDeductionAmount)],
    ["SOCIAL_CONTRIBUTIONS_PAYABLE", decimal(input.run.employerChargeAmount)],
  ])
  const missingLedgerMappingKeys = PAYROLL_COMPONENT_LEDGER_MAPPING_KEYS.filter((key) => !ledgerAmountsByMapping.has(key))
  const declarationLiability = sumDecimals(input.run.declarations.map((declaration) => declaration.amount))
  const missingIssues = [
    ...(input.run.declarations.length > 0 && declarationHashes.length === 0 ? ["missing:declarationComponentMappingHash"] : []),
    ...(input.journalLines.length === 0 ? ["missing:ledgerPostingLines"] : []),
    ...(input.journalLines.length > 0 && ledgerHashes.length === 0 ? ["missing:ledgerComponentMappingHash"] : []),
    ...missingLedgerMappingKeys.map((key) => `missing:ledgerMapping:${key}`),
  ]
  const mismatchedIssues = [
    ...(declarationHashes.some((hash) => hash !== expectedHash) ? ["mismatch:declarationComponentMappingHash"] : []),
    ...(ledgerHashes.some((hash) => hash !== expectedHash) ? ["mismatch:ledgerComponentMappingHash"] : []),
    ...Array.from(expectedLedgerAmounts.entries())
      .filter(([key, expected]) => ledgerAmountsByMapping.has(key) && !decimal(ledgerAmountsByMapping.get(key)).equals(expected))
      .map(([key]) => `mismatch:ledgerAmount:${key}`),
    ...(!declarationLiability.equals(new Prisma.Decimal(expectedPayload.declarationLiabilityAmount)) ? ["mismatch:declarationLiabilityAmount"] : []),
  ]
  const status: PayrollRegisterTieOutStatus = missingIssues.length > 0 ? "MISSING" : mismatchedIssues.length > 0 ? "MISMATCH" : "MATCHED"

  return {
    status,
    taxableBaseAmount: amount(input.decision, expectedPayload.taxableBaseAmount),
    incomeTaxWithholdingAmount: amount(input.decision, expectedPayload.incomeTaxWithholdingAmount),
    statutoryPayableAmount: amount(input.decision, expectedPayload.statutoryPayableAmount),
    declarationLiabilityAmount: amount(input.decision, expectedPayload.declarationLiabilityAmount),
    declarationLiabilityDeltaAmount: amount(input.decision, declarationLiability.minus(expectedPayload.declarationLiabilityAmount).abs()),
    ledgerPostingLineCount: input.journalLines.length,
    ledgerMappedLineCount: input.journalLines.filter((line) => journalLineMappingHash(line) === expectedHash).length,
    missingLedgerMappingKeys,
    componentMappingHash: expectedHash,
    declarationComponentMappingHashes: declarationHashes,
    ledgerComponentMappingHashes: ledgerHashes,
    incomeTaxCalculationStatus: expectedPayload.incomeTaxCalculationStatus,
    incomeTaxWithholdingEnabled: expectedPayload.incomeTaxWithholdingEnabled,
    source: "payroll_declarations.metadata/journal_entry_lines.metadata",
  }
}

function ledgerTieOutForReadModel(input: {
  run: PayrollRegisterRunRecord
  sourceLinks: AccountingSourceLinkRecord[]
  sourceLinksByKey: Map<string, AccountingSourceLinkRecord[]>
  journalLines: PayrollRegisterJournalEntryLineRecord[]
  componentMappingStatus: PayrollRegisterComponentMappingTieOut
  decision: RedactionDecision
}): PayrollRegisterLedgerTieOut {
  const runSourceLinked = sourceLinksFor(input.sourceLinksByKey, AccountingSourceType.PAYROLL_RUN, input.run.id).length > 0
  const paymentSourceLinked = input.run.paymentBatches.length === 0
    ? false
    : input.run.paymentBatches.every((batch) => sourceLinksFor(input.sourceLinksByKey, AccountingSourceType.PAYROLL_PAYMENT, batch.id).length > 0)
  const expectedDebit = decimal(input.run.grossAmount).plus(decimal(input.run.employerChargeAmount)).toDecimalPlaces(2)
  const expectedCredit = decimal(input.run.netPayableAmount)
    .plus(decimal(input.run.employeeDeductionAmount))
    .plus(decimal(input.run.employerChargeAmount))
    .toDecimalPlaces(2)
  const actualDebit = sumDecimals(input.journalLines.map((line) => line.debit))
  const actualCredit = sumDecimals(input.journalLines.map((line) => line.credit))
  const debitDelta = actualDebit.minus(expectedDebit).abs().toDecimalPlaces(2)
  const creditDelta = actualCredit.minus(expectedCredit).abs().toDecimalPlaces(2)
  const balanceDelta = actualDebit.minus(actualCredit).abs().toDecimalPlaces(2)
  const requiredMappingKeys = [...PAYROLL_COMPONENT_LEDGER_MAPPING_KEYS]
  const presentMappingKeys = Array.from(new Set(input.journalLines.map(journalLineMappingKey).filter((key): key is string => Boolean(key)))).sort()
  const requiredMappingKeySet = new Set<string>(requiredMappingKeys)
  const missingMappingKeys = requiredMappingKeys.filter((key) => !presentMappingKeys.includes(key))
  const extraMappingKeys = presentMappingKeys.filter((key) => !requiredMappingKeySet.has(key))
  const unmappedLineCount = input.journalLines.filter((line) => !journalLineMappingKey(line)).length
  const unhashedLineCount = input.journalLines.filter((line) => !journalLineMappingHash(line)).length
  const postingPurposeMatched = input.journalLines.length > 0 && input.journalLines.every(
    (line) => line.journalEntry.postingPurpose === AccountingPostingPurpose.PAYROLL_RUN,
  )
  const sourceMatched = input.journalLines.length > 0 && input.journalLines.every((line) => (
    line.journalEntry.sourceType === AccountingSourceType.PAYROLL_RUN &&
    line.journalEntry.sourceId === input.run.id &&
    (!input.run.ledgerPostingBatchId || line.journalEntry.postingBatchId === input.run.ledgerPostingBatchId) &&
    (!input.run.journalEntryId || line.journalEntryId === input.run.journalEntryId)
  ))

  const hasMissingEvidence = (
    !runSourceLinked ||
    !paymentSourceLinked ||
    input.journalLines.length === 0 ||
    missingMappingKeys.length > 0 ||
    input.componentMappingStatus.status === "MISSING"
  )
  const hasMismatch = (
    input.componentMappingStatus.status === "MISMATCH" ||
    !debitDelta.isZero() ||
    !creditDelta.isZero() ||
    !balanceDelta.isZero() ||
    unmappedLineCount > 0 ||
    unhashedLineCount > 0 ||
    !postingPurposeMatched ||
    !sourceMatched
  )
  const status: PayrollRegisterTieOutStatus = hasMissingEvidence ? "MISSING" : hasMismatch ? "MISMATCH" : "MATCHED"

  return {
    status,
    runSourceLinked,
    paymentSourceLinked,
    sourceLinkCount: input.sourceLinks.length,
    journalEntryLineCount: input.journalLines.length,
    expectedDebitAmount: amount(input.decision, expectedDebit),
    actualDebitAmount: amount(input.decision, actualDebit),
    debitDeltaAmount: amount(input.decision, debitDelta),
    expectedCreditAmount: amount(input.decision, expectedCredit),
    actualCreditAmount: amount(input.decision, actualCredit),
    creditDeltaAmount: amount(input.decision, creditDelta),
    balanceDeltaAmount: amount(input.decision, balanceDelta),
    requiredMappingKeys,
    presentMappingKeys,
    missingMappingKeys,
    extraMappingKeys,
    unmappedLineCount,
    unhashedLineCount,
    postingPurposeMatched,
    sourceMatched,
    source: "accounting_source_links/journal_entry_lines",
  }
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
  componentProofs: PayrollRegisterLineComponentProof[]
  countryPackProofs: PayrollRegisterCountryPackProof[]
  componentMappingHash: string
  statutoryScenarioCoverageHash: string | null
}) {
  return `sha256:${hashBusinessPayload({
    kind: "AQSTOQFLOW_PAYROLL_REGISTER_TIE_OUT",
    version: 7,
    payrollRunId: input.run.id,
    runNumber: input.run.runNumber,
    documentHash: input.run.documentHash,
    evidenceHash: input.run.evidenceHash,
    calculationHash: input.run.calculationHash,
    attendanceSnapshotHash: input.run.attendanceSnapshotHash,
    runLineDocumentHashes: input.run.lines.map((line) => line.documentHash).sort(),
    yearToDateAccumulatorHashes: input.run.lines
      .map(yearToDateAccumulatorHashFromLine)
      .filter((hash): hash is string => Boolean(hash))
      .sort(),
    componentEvidenceHashes: input.componentProofs.map((proof) => proof.componentEvidenceHash).sort(),
    countryPackProvenanceHashes: input.countryPackProofs
      .map((proof) => proof.provenanceHash ?? proof.computedHash)
      .filter((hash): hash is string => Boolean(hash))
      .sort(),
    componentMappingHash: input.componentMappingHash,
    statutoryScenarioCoverageHash: input.statutoryScenarioCoverageHash,
    componentProofStatuses: input.componentProofs.map((proof) => ({
      runLineId: proof.runLineId,
      status: proof.status,
      issues: [...proof.issues].sort(),
      blockedStatutoryComponentCount: proof.blockedStatutoryComponentCount,
    })).sort((a, b) => a.runLineId.localeCompare(b.runLineId)),
    countryPackProofStatuses: input.countryPackProofs.map((proof) => ({
      runLineId: proof.runLineId,
      status: proof.status,
      issues: [...proof.issues].sort(),
      countryPackResolutionHash: proof.countryPackResolutionHash,
      statutoryScenarioCoverageHash: proof.statutoryScenarioCoverageHash,
      provenanceHash: proof.provenanceHash,
      computedHash: proof.computedHash,
    })).sort((a, b) => a.runLineId.localeCompare(b.runLineId)),
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

async function loadPayrollRunJournalLines(client: PayrollRegisterClient, run: PayrollRegisterRunRecord) {
  if (!run.ledgerPostingBatchId && !run.journalEntryId) return []

  return client.journalEntryLine.findMany({
    where: {
      organizationId: run.organizationId,
      journalEntry: {
        sourceType: AccountingSourceType.PAYROLL_RUN,
        sourceId: run.id,
        ...(run.ledgerPostingBatchId ? { postingBatchId: run.ledgerPostingBatchId } : {}),
        ...(run.journalEntryId ? { id: run.journalEntryId } : {}),
      },
    },
    select: journalEntryLineSelect,
    orderBy: { lineNumber: "asc" },
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
  componentProofsByLineId: Map<string, PayrollRegisterLineComponentProof>
  countryPackProofsByLineId: Map<string, PayrollRegisterCountryPackProof>
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
    const componentProof = input.componentProofsByLineId.get(line.id) ?? buildLineComponentProof(line)
    const countryPackProof = input.countryPackProofsByLineId.get(line.id) ?? buildLineCountryPackProof({
      line,
      run: input.run,
      statutoryScenarioCoverage: statutoryScenarioCoverageFromRun(input.run),
    })

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
      components: componentAmountsForReadModel(componentProof, input.amountDecision),
      tieOut: {
        payslip: payslip ? (payslipMatchesLine ? "MATCHED" : "MISMATCH") : "MISSING",
        payment: paymentStatus,
        ledger: ledgerStatus,
        components: componentProof.status,
      },
      componentProof: {
        status: componentProof.status,
        issues: componentProof.issues,
        source: PAYROLL_COMPONENT_SOURCE,
        componentEvidenceHash: componentProof.componentEvidenceHash,
        effectiveComponents: effectiveComponentsForReadModel(componentProof, input.amountDecision),
      },
      proof: {
        runLineDocumentHash: line.documentHash,
        payslipDocumentHash: payslip?.documentHash ?? null,
        archiveManifestHash: archiveManifestHash(payslip),
        paymentEvidenceHashes: paymentBatches.map((batch) => batch.evidenceHash).filter((hash): hash is string => Boolean(hash)).sort(),
        countryPack: countryPackProof,
        yearToDate: yearToDateProofFromLine(line),
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
  componentMappingStatus: PayrollRegisterComponentMappingTieOut
  ledgerStatus: PayrollRegisterLedgerTieOut
  statutoryScenarioCoverage: PayrollRegisterStatutoryScenarioCoverageProof
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

  if (input.ledgerStatus.status !== "MATCHED") {
    blockers.push({
      code: input.ledgerStatus.status === "MISSING"
        ? "PAYROLL_REGISTER_LEDGER_TIEOUT_MISSING"
        : "PAYROLL_REGISTER_LEDGER_TIEOUT_MISMATCH",
      severity: "critical",
      message: "Payroll run journal lines do not tie to the immutable payroll register and payroll component mapping.",
      source: input.ledgerStatus.source,
      sourceId: input.run.id,
    })
  }

  if (
    !input.statutoryScenarioCoverage.coverageHash ||
    !input.statutoryScenarioCoverage.status
  ) {
    blockers.push({
      code: "PAYROLL_REGISTER_STATUTORY_REVIEW_EVIDENCE_MISSING",
      severity: "high",
      message: "Payroll register is missing statutory scenario review evidence from the calculated run.",
      source: "payroll_runs.metadata.statutoryScenarioCoverage",
      sourceId: input.run.id,
    })
  } else if (
    input.statutoryScenarioCoverage.status !== "READY" ||
    input.statutoryScenarioCoverage.missingCount > 0
  ) {
    blockers.push({
      code: "PAYROLL_REGISTER_STATUTORY_REVIEW_EVIDENCE_BLOCKED",
      severity: "high",
      message: "Payroll register statutory scenario review evidence is blocked or incomplete.",
      source: "payroll_runs.metadata.statutoryScenarioCoverage",
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
    if (row.tieOut.components !== "MATCHED") {
      blockers.push({
        code: row.tieOut.components === "MISSING"
          ? "PAYROLL_REGISTER_COMPONENT_PROOF_MISSING"
          : "PAYROLL_REGISTER_COMPONENT_PROOF_MISMATCH",
        severity: "high",
        message: `Payroll line ${row.runLineId} does not have matched statutory and effective-dated component proof.`,
        source: row.componentProof.source,
        sourceId: row.runLineId,
      })
    }
    if (row.proof.countryPack.status !== "MATCHED") {
      blockers.push({
        code: row.proof.countryPack.status === "MISSING"
          ? "PAYROLL_REGISTER_COUNTRY_PACK_PROOF_MISSING"
          : "PAYROLL_REGISTER_COUNTRY_PACK_PROOF_MISMATCH",
        severity: "high",
        message: `Payroll line ${row.runLineId} does not have matched country-pack provenance proof.`,
        source: row.proof.countryPack.source,
        sourceId: row.runLineId,
      })
    }
  }

  if (input.componentMappingStatus.status !== "MATCHED") {
    blockers.push({
      code: input.componentMappingStatus.status === "MISSING"
        ? "PAYROLL_REGISTER_COMPONENT_MAPPING_MISSING"
        : "PAYROLL_REGISTER_COMPONENT_MAPPING_MISMATCH",
      severity: "high",
      message: "Payroll register component mapping does not tie to declaration liability and payroll ledger posting lines.",
      source: input.componentMappingStatus.source,
      sourceId: input.run.id,
    })
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
  const [sourceLinks, closeTieOut, journalLines] = await Promise.all([
    loadSourceLinks(client, run),
    loadCloseTieOut(client, run),
    loadPayrollRunJournalLines(client, run),
  ])
  const sourceLinksByKey = sourceLinkMap(sourceLinks)
  const componentProofs = run.lines.map(buildLineComponentProof)
  const componentProofsByLineId = new Map(componentProofs.map((proof) => [proof.runLineId, proof]))
  const componentTieOut = componentTieOutForReadModel(componentProofs)
  const componentTotals = componentTotalsForReadModel(componentProofs, amountDecision, run.currency)
  const componentMappingTieOut = componentMappingTieOutForReadModel({ run, proofs: componentProofs, journalLines, decision: amountDecision })
  const statutoryScenarioCoverage = statutoryScenarioCoverageFromRun(run)
  const countryPackProofs = run.lines.map((line) => buildLineCountryPackProof({
    line,
    run,
    statutoryScenarioCoverage,
  }))
  const countryPackProofsByLineId = new Map(countryPackProofs.map((proof) => [proof.runLineId, proof]))
  const ledgerTieOut = ledgerTieOutForReadModel({
    run,
    sourceLinks,
    sourceLinksByKey,
    journalLines,
    componentMappingStatus: componentMappingTieOut,
    decision: amountDecision,
  })
  const rows = buildRows({ run, sourceLinksByKey, componentProofsByLineId, countryPackProofsByLineId, amountDecision }).slice(0, input.limit)

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
  const hash = registerHash({
    run,
    sourceLinks,
    closeEvidenceCount: closeTieOut.evidenceCount,
    componentProofs,
    countryPackProofs,
    componentMappingHash: componentMappingTieOut.componentMappingHash,
    statutoryScenarioCoverageHash: statutoryScenarioCoverage.coverageHash,
  })
  const blockers = buildBlockers({
    run,
    rows,
    sourceLinksByKey,
    closeStatus: closeTieOut,
    componentMappingStatus: componentMappingTieOut,
    ledgerStatus: ledgerTieOut,
    statutoryScenarioCoverage,
  })

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
      statutoryScenarioCoverage,
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
      componentTotals,
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
      components: componentTieOut,
      componentMapping: componentMappingTieOut,
      ledger: ledgerTieOut,
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
        "services/payroll/payroll-statutory-scenario-coverage.service.ts",
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
        "journal_entry_lines",
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
