import { createHash } from "crypto"
import {
  AccountingPostingPurpose,
  AccountingSourceType,
  ExceptionSeverity,
  GoodsReceiptStatus,
  JournalEntryStatus,
  JournalType,
  LedgerEntryType,
  LedgerPostingBatchStatus,
  PaymentDirection,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentMethod,
  PaymentTransactionState,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
  PurchaseOrderStatus,
  SupplierBankAccountStatus,
  SupplierBankChangeStatus,
  SupplierInvoiceStatus,
  SupplierPaymentStatus,
  ThreeWayMatchStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { createLedgerPostingBatch, linkAccountingSource } from "@/services/accounting/posting.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import {
  auditSensitiveActionDecision,
  assertSensitiveActionAllowed,
  evaluateSensitiveAction,
  type SensitiveActionEvaluationInput,
} from "@/services/controls/sensitive-action.service"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { resolveRegulatoryParameter, type RegulatoryResolutionResult } from "@/services/regulatory/country-packs/resolve"

import {
  approveSupplierBankChangeInputSchema,
  postSupplierInvoiceInputSchema,
  releaseSupplierPaymentInputSchema,
  requestSupplierBankChangeInputSchema,
  type ApproveSupplierBankChangeInput,
  type PostSupplierInvoiceInput,
  type ReleaseSupplierPaymentInput,
  type RequestSupplierBankChangeInput,
} from "./ap-control.schemas"

type DbClient = typeof db | Prisma.TransactionClient

type InvoiceLinePlan = {
  purchaseOrderLineId: string
  goodsReceiptLineId: string
  goodsReceiptId: string
  itemId: string
  description: string
  quantity: Prisma.Decimal
  unitCost: Prisma.Decimal
  taxRate: Prisma.Decimal
  taxAmount: Prisma.Decimal
  lineSubtotal: Prisma.Decimal
  lineTotal: Prisma.Decimal
  priceVariance: Prisma.Decimal
}

type LedgerBlockerInput = {
  organizationId: string
  periodId?: string | null
  sourceType: AccountingSourceType
  sourceId: string
  postingPurpose: AccountingPostingPurpose
  actorId?: string | null
  documentHash?: string | null
  blockerCode: string
  message: string
  metadata?: Prisma.InputJsonValue
}

type APCountryPackStatus = {
  countryPackStatus: "RESOLVED" | "MISSING_COUNTRY" | "UNRESOLVED"
  countryCode: string | null
  countryPackVersion: string | null
  countryPackResolutionHash: string | null
  taxTreatmentStatus: string
  withholdingTreatmentStatus: string
  operatorActionRequired: boolean
  errorCode?: string | null
  errorMessage?: string | null
}

type APPostingStatus = {
  ledgerBatch: { id: string; status?: LedgerPostingBatchStatus | null; errorMessage?: string | null }
  ledgerStatus: "POSTED" | "BLOCKED_PENDING_RULES"
  blockerCode?: string | null
  blockerMessage?: string | null
  journalEntryId?: string | null
  accountingSourceLinkId?: string | null
}

export type APControlActorContext = {
  organizationId: string
  actorId: string
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
}

type PostingAmountContext = {
  sourceAmount: Prisma.Decimal
  netAmount: Prisma.Decimal
  grossAmount: Prisma.Decimal
  taxAmount: Prisma.Decimal
  costAmount?: Prisma.Decimal
  varianceAmount?: Prisma.Decimal
}

export type APWorkbenchData = {
  organizationId: string
  asOf: string
  counts: {
    postedInvoices: number
    paymentPendingInvoices: number
    matchExceptions: number
    pendingBankChanges: number
    releasedPayments: number
    ledgerBlockers: number
    reconciliationBlockers: number
  }
  queues: {
    recentInvoices: Array<{
      id: string
      invoiceNumber: string
      supplierName: string
      status: SupplierInvoiceStatus
      total: string
      amountPaid: string
      currency: string
      invoiceDate: string
      ledgerPostingBatchId: string | null
      ledgerStatus: string
      ledgerBlockerCode: string | null
      ledgerBlockerMessage: string | null
      countryPackStatus: string | null
      countryPackVersion: string | null
      countryPackResolutionHash: string | null
      taxTreatmentStatus: string | null
      withholdingTreatmentStatus: string | null
      operatorActionRequired: boolean
    }>
    pendingBankChanges: Array<{
      id: string
      supplierId: string
      supplierName: string
      requestedById: string
      requestedAt: string
      reason: string | null
      bankAccountId: string | null
    }>
    releasedPayments: Array<{
      id: string
      paymentNumber: string
      supplierName: string
      amount: string
      currency: string
      method: PaymentMethod
      paymentDate: string
      ledgerPostingBatchId: string | null
      postedBusinessEventId: string | null
      ledgerStatus: string
      ledgerBlockerCode: string | null
      ledgerBlockerMessage: string | null
      reconciliationStatus: string | null
      paymentTransactionId: string | null
      paymentExceptionId: string | null
      countryPackStatus: string | null
      withholdingTreatmentStatus: string | null
      operatorActionRequired: boolean
    }>
    ledgerBlockers: Array<{
      id: string
      sourceType: AccountingSourceType
      sourceId: string
      postingPurpose: AccountingPostingPurpose
      status: LedgerPostingBatchStatus
      errorMessage: string | null
      createdAt: string
    }>
  }
}

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function"
}

async function inTransaction<T>(client: DbClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (hasTransaction(client)) {
    return client.$transaction((tx) => work(tx))
  }

  return work(client as Prisma.TransactionClient)
}

function assertControlActorMatches(
  control: APControlActorContext,
  organizationId: string,
  actorIds: Array<string | null | undefined>,
) {
  if (control.organizationId !== organizationId) {
    throw new BusinessRuleError("Actor organization does not match the AP control tenant.")
  }

  if (actorIds.some((actorId) => actorId && actorId !== control.actorId)) {
    throw new BusinessRuleError("Authenticated actor does not match the AP approval context.")
  }
}

function sensitiveInput(
  control: APControlActorContext,
  input: Omit<SensitiveActionEvaluationInput, "actorId" | "organizationId" | "actorPermissions" | "lastAuthAt">,
): SensitiveActionEvaluationInput {
  return {
    ...input,
    actorId: control.actorId,
    organizationId: control.organizationId,
    actorPermissions: control.actorPermissions,
    lastAuthAt: control.lastAuthAt ?? Date.now(),
  }
}

async function auditDeniedSensitiveAction(client: DbClient, input: SensitiveActionEvaluationInput) {
  const decision = evaluateSensitiveAction(input)
  if (decision.allowed) return decision

  return inTransaction(client, async (tx) => {
    await auditSensitiveActionDecision(tx, decision)
    assertSensitiveActionAllowed(decision)
    return decision
  })
}

async function auditAllowedSensitiveAction(tx: Prisma.TransactionClient, input: SensitiveActionEvaluationInput) {
  const decision = evaluateSensitiveAction(input)
  await auditSensitiveActionDecision(tx, decision)
  return assertSensitiveActionAllowed(decision)
}

async function loadSupplierBankChangeApprovalSubject(
  client: DbClient,
  organizationId: string,
  changeRequestId: string,
) {
  return client.supplierBankChangeRequest.findFirst({
    where: {
      id: changeRequestId,
      organizationId,
    },
    select: {
      id: true,
      supplierId: true,
      requestedById: true,
    },
  })
}

function decimal2(value: Prisma.Decimal.Value | null | undefined) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(2)
}

function decimal3(value: Prisma.Decimal.Value | null | undefined) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(3)
}

function parseDate(value: Date | string | undefined, fallback = new Date()) {
  if (!value) return fallback
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new BusinessRuleError("Invalid AP document date.")
  return parsed
}

function normalizeCurrency(currency?: string | null) {
  return (currency || "XAF").trim().toUpperCase()
}

function decimalString(value: Prisma.Decimal.Value | null | undefined) {
  return decimal2(value).toFixed(2)
}

function normalizeInvoiceNumber(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase()
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function metadataString(value: unknown, key: string) {
  const entry = asRecord(value)[key]
  return typeof entry === "string" ? entry : null
}

function metadataBoolean(value: unknown, key: string) {
  const entry = asRecord(value)[key]
  return typeof entry === "boolean" ? entry : false
}

function assertIdempotencyPayloadMatches(
  metadata: unknown,
  requestPayloadHash: string | null,
  message: string,
) {
  if (!requestPayloadHash) return
  const existingPayloadHash = metadataString(metadata, "idempotencyPayloadHash")
  if (existingPayloadHash && existingPayloadHash !== requestPayloadHash) {
    throw new ConflictError(message)
  }
}

function normalizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase()
  if (!normalized) return null
  if (normalized === "CAMEROON") return "CM"
  return normalized.length === 2 ? normalized : null
}

function normalizeMappingKey(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function conditionMatches(condition: Prisma.JsonValue | null | undefined, context: Record<string, unknown>) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) return true

  return Object.entries(condition as Record<string, unknown>).every(([key, expected]) => {
    const actual = context[key]
    if (Array.isArray(expected)) return expected.includes(actual)
    return actual === expected
  })
}

function amountForSource(source: PostingRuleAmountSource, amounts: PostingAmountContext) {
  switch (source) {
    case PostingRuleAmountSource.FIXED:
      return new Prisma.Decimal(1)
    case PostingRuleAmountSource.SOURCE_AMOUNT:
      return amounts.sourceAmount
    case PostingRuleAmountSource.NET_AMOUNT:
      return amounts.netAmount
    case PostingRuleAmountSource.GROSS_AMOUNT:
      return amounts.grossAmount
    case PostingRuleAmountSource.TAX_AMOUNT:
      return amounts.taxAmount
    case PostingRuleAmountSource.COST_AMOUNT:
    case PostingRuleAmountSource.QUANTITY_COST:
      return amounts.costAmount ?? new Prisma.Decimal(0)
    case PostingRuleAmountSource.VARIANCE_AMOUNT:
      return amounts.varianceAmount ?? new Prisma.Decimal(0)
    default:
      return new Prisma.Decimal(0)
  }
}

function hashSecret(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, "")
  if (!normalized) return null
  return createHash("sha256").update(normalized.toUpperCase()).digest("hex")
}

function maskSecret(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, "")
  if (!normalized) return null
  if (normalized.length <= 4) return "****"
  return `${"*".repeat(Math.max(4, normalized.length - 4))}${normalized.slice(-4)}`
}

function duplicateFingerprint(input: {
  organizationId: string
  supplierId: string
  invoiceNumber: string
  total: Prisma.Decimal
  currency: string
}) {
  return createHash("sha256")
    .update(
      [
        input.organizationId,
        input.supplierId,
        normalizeInvoiceNumber(input.invoiceNumber),
        input.total.toFixed(2),
        normalizeCurrency(input.currency),
      ].join("|"),
    )
    .digest("hex")
}

async function createLedgerBlocker(tx: Prisma.TransactionClient, input: LedgerBlockerInput) {
  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      idempotencyKey: `${input.sourceType}:${input.sourceId}:${input.postingPurpose}:blocked`,
      metadata: {
        blockerCode: input.blockerCode,
        documentHash: input.documentHash ?? null,
        ...(input.metadata && typeof input.metadata === "object" ? { details: input.metadata } : {}),
      },
    },
    tx,
  )

  const blocked = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      status: LedgerPostingBatchStatus.FAILED,
      errorMessage: input.message,
      metadata: {
        blockerCode: input.blockerCode,
        documentHash: input.documentHash ?? null,
        details: input.metadata ?? null,
      },
    },
  })

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: "PURCHASING_AP_LEDGER_BLOCKED",
      resourceType: "LedgerPostingBatch",
      resourceId: blocked.id,
      postingBatchId: blocked.id,
      message: input.message,
      metadata: {
        blockerCode: input.blockerCode,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        postingPurpose: input.postingPurpose,
        documentHash: input.documentHash ?? null,
      },
    },
  })

  return blocked
}

async function resolveAPCountryPackStatus(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    documentDate: Date
    taxAmount?: Prisma.Decimal
    purpose: "SUPPLIER_INVOICE" | "SUPPLIER_PAYMENT"
  },
): Promise<APCountryPackStatus> {
  const organization = await tx.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
    select: {
      country: true,
      accountingSettings: {
        select: {
          countryPack: true,
          taxRegime: true,
        },
      },
    },
  })

  const countryCode = normalizeCountryCode(organization?.country)
  if (!countryCode) {
    return {
      countryPackStatus: "MISSING_COUNTRY",
      countryCode: null,
      countryPackVersion: null,
      countryPackResolutionHash: null,
      taxTreatmentStatus: input.taxAmount?.gt(0) ? "UNVERIFIED_COUNTRY_MISSING" : "NO_INPUT_VAT_AMOUNT",
      withholdingTreatmentStatus: "UNVERIFIED_COUNTRY_MISSING",
      operatorActionRequired: input.taxAmount?.gt(0) ?? false,
      errorCode: "COUNTRY_MISSING",
      errorMessage: "Organization country is required before AP tax treatment can be certified.",
    }
  }

  let vatResolution: RegulatoryResolutionResult<number> | null = null
  try {
    vatResolution = resolveRegulatoryParameter<number>("taxes.vat.standardRateBps", {
      countryCode,
      date: input.documentDate,
      pinnedPackVersion: organization?.accountingSettings?.countryPack ?? undefined,
      purpose: `AP_${input.purpose}_INPUT_VAT`,
      entityProfile: {
        countryCode,
        taxRegime: organization?.accountingSettings?.taxRegime ?? null,
      },
    })
  } catch (error) {
    const regulatoryError = error as { regulatoryCode?: string; message?: string }
    return {
      countryPackStatus: "UNRESOLVED",
      countryCode,
      countryPackVersion: null,
      countryPackResolutionHash: null,
      taxTreatmentStatus: input.taxAmount?.gt(0) ? "UNRESOLVED_INPUT_VAT" : "NO_INPUT_VAT_AMOUNT",
      withholdingTreatmentStatus: "UNRESOLVED_WITHHOLDING",
      operatorActionRequired: input.taxAmount?.gt(0) ?? false,
      errorCode: regulatoryError.regulatoryCode ?? "REGULATORY_RESOLUTION_FAILED",
      errorMessage: regulatoryError.message ?? "AP country-pack tax treatment could not be resolved.",
    }
  }

  let withholdingTreatmentStatus = "NOT_CONFIGURED"
  try {
    resolveRegulatoryParameter("taxes.withholding.supplierPayments", {
      countryCode,
      date: input.documentDate,
      pinnedPackVersion: organization?.accountingSettings?.countryPack ?? undefined,
      purpose: `AP_${input.purpose}_WITHHOLDING`,
      entityProfile: {
        countryCode,
        taxRegime: organization?.accountingSettings?.taxRegime ?? null,
      },
    })
    withholdingTreatmentStatus = "RESOLVED"
  } catch {
    withholdingTreatmentStatus = "NOT_CONFIGURED"
  }

  return {
    countryPackStatus: "RESOLVED",
    countryCode,
    countryPackVersion: vatResolution.packVersion,
    countryPackResolutionHash: vatResolution.resolutionHash,
    taxTreatmentStatus: input.taxAmount?.gt(0) ? "INPUT_VAT_PACK_RESOLVED" : "NO_INPUT_VAT_AMOUNT",
    withholdingTreatmentStatus,
    operatorActionRequired: false,
  }
}

async function createAPLedgerPosting(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    periodId: string
    sourceType: AccountingSourceType
    sourceId: string
    sourceNumber: string
    sourceDate: Date
    postingPurpose: AccountingPostingPurpose
    journalType: JournalType
    journalPrefix: "APINV" | "APPAY"
    actorId?: string | null
    supplierId: string
    currency: string
    memo: string
    documentHash?: string | null
    amounts: PostingAmountContext
    conditionContext?: Record<string, unknown>
    metadata?: Record<string, unknown>
    blockerCode: string
    blockerMessage: string
  },
): Promise<APPostingStatus> {
  const rule = await getActivePostingRule(
    input.organizationId,
    {
      sourceType: input.sourceType,
      postingPurpose: input.postingPurpose,
      effectiveAt: input.sourceDate,
    },
    tx,
  )

  if (!rule) {
    const ledgerBatch = await createLedgerBlocker(tx, {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      actorId: input.actorId,
      documentHash: input.documentHash,
      blockerCode: input.blockerCode,
      message: input.blockerMessage,
      metadata: safeJson(input.metadata ?? {}),
    })

    return {
      ledgerBatch,
      ledgerStatus: "BLOCKED_PENDING_RULES",
      blockerCode: input.blockerCode,
      blockerMessage: input.blockerMessage,
    }
  }

  const journal = await tx.journal.findFirst({
    where: {
      organizationId: input.organizationId,
      type: input.journalType,
      isDefault: true,
      isActive: true,
    },
    select: { id: true, code: true },
  })

  if (!journal) {
    const message = `AP posting requires an active default ${input.journalType} journal.`
    const ledgerBatch = await createLedgerBlocker(tx, {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      actorId: input.actorId,
      documentHash: input.documentHash,
      blockerCode: "AP_DEFAULT_JOURNAL_MISSING",
      message,
      metadata: safeJson({ ...input.metadata, journalType: input.journalType }),
    })

    return {
      ledgerBatch,
      ledgerStatus: "BLOCKED_PENDING_RULES",
      blockerCode: "AP_DEFAULT_JOURNAL_MISSING",
      blockerMessage: message,
    }
  }

  const mappingKeys = rule.lines.map((line) => normalizeMappingKey(line.mappingKey)).filter(Boolean) as string[]
  const mappedAccounts = mappingKeys.length
    ? await tx.chartOfAccount.findMany({
        where: {
          organizationId: input.organizationId,
          mappingKey: { in: Array.from(new Set(mappingKeys)) },
          deletedAt: null,
          isActive: true,
        },
        include: { _count: { select: { children: true } } },
      })
    : []
  const accountByMapping = new Map(mappedAccounts.map((account) => [normalizeMappingKey(account.mappingKey), account]))

  const postingLines = rule.lines
    .filter((line) => conditionMatches(line.condition, input.conditionContext ?? {}))
    .map((line) => {
      const account = line.account ?? accountByMapping.get(normalizeMappingKey(line.mappingKey))
      if (!account) {
        throw new BusinessRuleError(`Posting rule ${rule.code} line ${line.lineNumber} does not resolve to an account.`)
      }
      if (!account.isActive || account.deletedAt) {
        throw new BusinessRuleError(`Posting rule ${rule.code} account ${account.code} is not active.`)
      }
      const childCount =
        "_count" in account ? Number((account as { _count?: { children?: number } })._count?.children ?? 0) : 0
      if (childCount > 0) {
        throw new BusinessRuleError(`Posting rule ${rule.code} account ${account.code} must be a leaf account.`)
      }

      const multiplier = new Prisma.Decimal(line.multiplier ?? 1)
      const amount = amountForSource(line.amountSource, input.amounts).times(multiplier).toDecimalPlaces(2)
      if (amount.lt(0)) {
        throw new BusinessRuleError(`Posting rule ${rule.code} line ${line.lineNumber} produced a negative amount.`)
      }
      if (amount.eq(0)) return null

      return {
        accountId: account.id,
        lineNumber: line.lineNumber,
        description: line.description ?? input.memo,
        debit: line.side === PostingRuleLineSide.DEBIT ? amount : new Prisma.Decimal(0),
        credit: line.side === PostingRuleLineSide.CREDIT ? amount : new Prisma.Decimal(0),
        mappingKey: normalizeMappingKey(line.mappingKey),
        amountSource: line.amountSource,
      }
    })
    .filter(Boolean) as Array<{
    accountId: string
    lineNumber: number
    description: string
    debit: Prisma.Decimal
    credit: Prisma.Decimal
    mappingKey: string | null
    amountSource: PostingRuleAmountSource
  }>

  const debitTotal = postingLines.reduce((total, line) => total.plus(line.debit), new Prisma.Decimal(0)).toDecimalPlaces(2)
  const creditTotal = postingLines.reduce((total, line) => total.plus(line.credit), new Prisma.Decimal(0)).toDecimalPlaces(2)

  if (postingLines.length < 2 || !debitTotal.eq(creditTotal) || debitTotal.lte(0)) {
    const message = `AP posting rule ${rule.code} did not produce a balanced non-zero journal entry.`
    const ledgerBatch = await createLedgerBlocker(tx, {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      actorId: input.actorId,
      documentHash: input.documentHash,
      blockerCode: "AP_POSTING_RULE_UNBALANCED",
      message,
      metadata: safeJson({
        ...input.metadata,
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
      }),
    })

    return {
      ledgerBatch,
      ledgerStatus: "BLOCKED_PENDING_RULES",
      blockerCode: "AP_POSTING_RULE_UNBALANCED",
      blockerMessage: message,
    }
  }

  const ledgerBatch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      idempotencyKey: `${input.sourceType}:${input.sourceId}:${input.postingPurpose}:posted`,
      metadata: safeJson({
        ...input.metadata,
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        documentHash: input.documentHash ?? null,
      }),
    },
    tx,
  )

  const now = new Date()
  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: ledgerBatch.id },
    data: {
      status: LedgerPostingBatchStatus.POSTED,
      postedAt: now,
      errorMessage: null,
      metadata: safeJson({
        ...input.metadata,
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
        documentHash: input.documentHash ?? null,
      }),
    },
  })

  const journalEntry = await tx.journalEntry.create({
    data: {
      organizationId: input.organizationId,
      journalId: journal.id,
      periodId: input.periodId,
      postingBatchId: postedBatch.id,
      entryNumber: await nextAPJournalEntryNumber(tx, input.organizationId, input.sourceDate, input.journalPrefix),
      entryDate: input.sourceDate,
      status: JournalEntryStatus.POSTED,
      currency: input.currency,
      memo: input.memo,
      reference: input.sourceNumber,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      postingPurpose: input.postingPurpose,
      postedAt: now,
      postedById: input.actorId ?? null,
      createdById: input.actorId ?? null,
      lines: {
        create: postingLines.map((line, index) => ({
          organizationId: input.organizationId,
          accountId: line.accountId,
          lineNumber: index + 1,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: input.currency,
          exchangeRate: new Prisma.Decimal(1),
          baseDebit: line.debit,
          baseCredit: line.credit,
          supplierId: input.supplierId,
          metadata: safeJson({
            postingRuleId: rule.id,
            postingRuleCode: rule.code,
            postingRuleLineNumber: line.lineNumber,
            mappingKey: line.mappingKey,
            amountSource: line.amountSource,
          }),
        })),
      },
    },
  })

  const sourceLink = await linkAccountingSource(
    {
      organizationId: input.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceNumber: input.sourceNumber,
      sourceDate: input.sourceDate,
      metadata: safeJson({
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        documentHash: input.documentHash ?? null,
      }),
    },
    tx,
  )

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: "PURCHASING_AP_LEDGER_POSTED",
      resourceType: "LedgerPostingBatch",
      resourceId: postedBatch.id,
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
      message: `AP ledger posting ${input.sourceNumber} posted with rule ${rule.code}.`,
      metadata: safeJson({
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        postingPurpose: input.postingPurpose,
        postingRuleId: rule.id,
        postingRuleCode: rule.code,
        accountingSourceLinkId: sourceLink.id,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
      }),
    },
  })

  return {
    ledgerBatch: postedBatch,
    ledgerStatus: "POSTED",
    journalEntryId: journalEntry.id,
    accountingSourceLinkId: sourceLink.id,
  }
}

async function queueOutboundSupplierPaymentReconciliation(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    supplierPaymentId: string
    paymentNumber: string
    supplierId: string
    bankAccountId: string
    amount: Prisma.Decimal
    currency: string
    paymentDate: Date
    method: PaymentMethod
    ledgerPostingBatchId: string
    ledgerStatus: APPostingStatus["ledgerStatus"]
    actorId?: string | null
    evidenceHash?: string | null
    documentHash?: string | null
  },
) {
  const idempotencyKey = `supplier-payment:${input.supplierPaymentId}:outbound`
  const payload = {
    supplierPaymentId: input.supplierPaymentId,
    paymentNumber: input.paymentNumber,
    supplierId: input.supplierId,
    bankAccountId: input.bankAccountId,
    amount: input.amount.toFixed(2),
    currency: input.currency,
    method: input.method,
    paymentDate: input.paymentDate.toISOString(),
    ledgerPostingBatchId: input.ledgerPostingBatchId,
    ledgerStatus: input.ledgerStatus,
  }
  const payloadHash = prefixedHash(payload)

  const paymentTransaction =
    (await tx.paymentTransaction.findFirst({
      where: {
        organizationId: input.organizationId,
        idempotencyKey,
      },
    })) ||
    (await tx.paymentTransaction.create({
      data: {
        organizationId: input.organizationId,
        ledgerPostingBatchId: input.ledgerPostingBatchId,
        direction: PaymentDirection.OUTBOUND,
        state:
          input.ledgerStatus === "POSTED"
            ? PaymentTransactionState.PENDING
            : PaymentTransactionState.SUSPENSE,
        amount: input.amount,
        currencyCode: input.currency,
        providerReference: input.paymentNumber,
        idempotencyKey,
        sourceType: "SUPPLIER_PAYMENT",
        sourceId: input.supplierPaymentId,
        payloadHash,
        occurredAt: input.paymentDate,
        metadata: safeJson({
          supplierId: input.supplierId,
          bankAccountId: input.bankAccountId,
          method: input.method,
          evidenceHash: input.evidenceHash ?? null,
          documentHash: input.documentHash ?? null,
          ledgerStatus: input.ledgerStatus,
        }),
      },
    }))

  const exceptionType =
    input.ledgerStatus === "POSTED"
      ? PaymentExceptionType.MISSING_STATEMENT_LINE
      : PaymentExceptionType.SUSPENSE_POSTING_BLOCKED
  const reconciliationStatus =
    input.ledgerStatus === "POSTED" ? "AWAITING_STATEMENT_MATCH" : "LEDGER_BLOCKED"

  const paymentException =
    (await tx.paymentException.findFirst({
      where: {
        organizationId: input.organizationId,
        paymentTransactionId: paymentTransaction.id,
        type: exceptionType,
        status: { notIn: [PaymentExceptionStatus.RESOLVED, PaymentExceptionStatus.DISMISSED] },
      },
    })) ||
    (await tx.paymentException.create({
      data: {
        organizationId: input.organizationId,
        paymentTransactionId: paymentTransaction.id,
        type: exceptionType,
        severity: input.ledgerStatus === "POSTED" ? ExceptionSeverity.MEDIUM : ExceptionSeverity.HIGH,
        status: PaymentExceptionStatus.OPEN,
        sourceType: "SUPPLIER_PAYMENT",
        sourceId: input.supplierPaymentId,
        evidence: safeJson(payload),
        correlationId: input.supplierPaymentId,
        metadata: safeJson({
          reconciliationStatus,
          supplierId: input.supplierId,
          paymentNumber: input.paymentNumber,
          method: input.method,
          ledgerPostingBatchId: input.ledgerPostingBatchId,
        }),
      },
    }))

  return {
    paymentTransaction,
    paymentException,
    reconciliationStatus,
    payloadHash,
  }
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    entityType: string
    entityId: string
    action: string
    actorId?: string | null
    changes?: unknown
  },
) {
  await tx.auditLog.create({
    data: {
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      userId: input.actorId ?? null,
      changes: input.changes === undefined ? undefined : safeJson(input.changes),
    },
  })
}

async function nextSupplierPaymentNumber(tx: Prisma.TransactionClient, organizationId: string, paymentDate: Date) {
  const prefix = `SPAY-${compactDate(paymentDate)}`
  const count = await tx.supplierPayment.count({
    where: {
      organizationId,
      paymentNumber: { startsWith: prefix },
    },
  })

  return `${prefix}-${String(count + 1).padStart(4, "0")}`
}

async function nextAPJournalEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
  prefix: "APINV" | "APPAY",
) {
  const datedPrefix = `${prefix}-${compactDate(entryDate)}`
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: datedPrefix },
    },
  })

  return `${datedPrefix}-${String(count + 1).padStart(4, "0")}`
}

async function assertSupplier(
  tx: Prisma.TransactionClient,
  organizationId: string,
  supplierId: string,
) {
  const supplier = await tx.supplier.findFirst({
    where: {
      id: supplierId,
      organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      isActive: true,
      currentBalance: true,
    },
  })

  if (!supplier) throw new NotFoundError("Supplier not found for this organization.")
  if (!supplier.isActive) throw new BusinessRuleError("Supplier is inactive.")
  return supplier
}

async function buildInvoiceLinePlans(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    supplierId: string
    purchaseOrderId?: string
    lines: Array<{
      purchaseOrderLineId?: string
      goodsReceiptLineId: string
      itemId?: string
      description: string
      quantity: string | number
      unitCost: string | number
      taxRate?: string | number
      notes?: string
    }>
  },
) {
  const plans: InvoiceLinePlan[] = []

  for (const line of input.lines) {
    const quantity = decimal3(line.quantity)
    const unitCost = decimal2(line.unitCost)
    const taxRate = decimal3(line.taxRate ?? 0)
    if (quantity.lte(0)) throw new BusinessRuleError("Supplier invoice line quantity must be greater than zero.")
    if (unitCost.lt(0)) throw new BusinessRuleError("Supplier invoice line unit cost cannot be negative.")
    if (taxRate.lt(0)) throw new BusinessRuleError("Supplier invoice line tax rate cannot be negative.")

    const receiptLine = await tx.goodsReceiptLine.findFirst({
      where: {
        id: line.goodsReceiptLineId,
        goodsReceipt: {
          organizationId: input.organizationId,
          deletedAt: null,
          status: { in: [GoodsReceiptStatus.RECEIVED, GoodsReceiptStatus.COMPLETED] },
        },
        purchaseOrderLine: {
          purchaseOrder: {
            organizationId: input.organizationId,
            supplierId: input.supplierId,
            ...(input.purchaseOrderId ? { id: input.purchaseOrderId } : {}),
            status: {
              in: [
                PurchaseOrderStatus.APPROVED,
                PurchaseOrderStatus.PARTIALLY_RECEIVED,
                PurchaseOrderStatus.RECEIVED,
                PurchaseOrderStatus.COMPLETED,
              ],
            },
          },
        },
      },
      include: {
        goodsReceipt: {
          select: {
            id: true,
            purchaseOrderId: true,
            organizationId: true,
            status: true,
          },
        },
        purchaseOrderLine: {
          select: {
            id: true,
            purchaseOrderId: true,
            itemId: true,
            receivedQuantity: true,
            unitCost: true,
          },
        },
      },
    })

    if (!receiptLine) {
      throw new BusinessRuleError("Supplier invoice line requires received goods evidence for this supplier.")
    }

    if (line.purchaseOrderLineId && line.purchaseOrderLineId !== receiptLine.purchaseOrderLineId) {
      throw new BusinessRuleError("Supplier invoice line purchase order evidence does not match the goods receipt line.")
    }

    if (line.itemId && line.itemId !== receiptLine.itemId) {
      throw new BusinessRuleError("Supplier invoice line item does not match the goods receipt line.")
    }

    const alreadyInvoiced = await tx.supplierInvoiceLine.aggregate({
      _sum: { quantity: true },
      where: {
        goodsReceiptLineId: receiptLine.id,
        supplierInvoice: {
          organizationId: input.organizationId,
          deletedAt: null,
          status: { notIn: [SupplierInvoiceStatus.CANCELLED] },
        },
      },
    })

    const previouslyInvoiced = decimal3(alreadyInvoiced._sum.quantity)
    const remainingReceived = decimal3(receiptLine.receivedQuantity).minus(previouslyInvoiced).toDecimalPlaces(3)
    if (quantity.gt(remainingReceived)) {
      throw new BusinessRuleError("Supplier invoice quantity exceeds received and uninvoiced goods.")
    }

    const priceVariance = unitCost.minus(decimal2(receiptLine.unitCost)).times(quantity).toDecimalPlaces(2)
    if (!priceVariance.eq(0)) {
      throw new BusinessRuleError("Supplier invoice unit cost does not match goods receipt cost; create a match exception before posting.")
    }

    const lineSubtotal = quantity.times(unitCost).toDecimalPlaces(2)
    const taxAmount = lineSubtotal.times(taxRate).div(100).toDecimalPlaces(2)
    const lineTotal = lineSubtotal.plus(taxAmount).toDecimalPlaces(2)

    plans.push({
      purchaseOrderLineId: receiptLine.purchaseOrderLineId,
      goodsReceiptLineId: receiptLine.id,
      goodsReceiptId: receiptLine.goodsReceiptId,
      itemId: receiptLine.itemId,
      description: line.description,
      quantity,
      unitCost,
      taxRate,
      taxAmount,
      lineSubtotal,
      lineTotal,
      priceVariance,
    })
  }

  return plans
}

export async function getAPWorkbenchData(
  input: { organizationId: string; limit?: number },
  client: DbClient = db,
): Promise<APWorkbenchData> {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 50))
  const organizationId = input.organizationId

  const [
    postedInvoices,
    paymentPendingInvoices,
    matchExceptions,
    pendingBankChangeCount,
    releasedPaymentCount,
    ledgerBlockerCount,
    reconciliationBlockerCount,
    recentInvoices,
    pendingBankChanges,
    releasedPayments,
    ledgerBlockers,
  ] = await Promise.all([
    client.supplierInvoice.count({
      where: { organizationId, deletedAt: null, status: SupplierInvoiceStatus.POSTED },
    }),
    client.supplierInvoice.count({
      where: { organizationId, deletedAt: null, status: SupplierInvoiceStatus.PAYMENT_PENDING },
    }),
    client.threeWayMatch.count({
      where: { organizationId, status: ThreeWayMatchStatus.EXCEPTION },
    }),
    client.supplierBankChangeRequest.count({
      where: { organizationId, status: SupplierBankChangeStatus.PENDING },
    }),
    client.supplierPayment.count({
      where: { organizationId, deletedAt: null, status: SupplierPaymentStatus.RELEASED },
    }),
    client.ledgerPostingBatch.count({
      where: {
        organizationId,
        status: { in: [LedgerPostingBatchStatus.PENDING, LedgerPostingBatchStatus.FAILED] },
        sourceType: { in: [AccountingSourceType.SUPPLIER_INVOICE, AccountingSourceType.SUPPLIER_PAYMENT] },
      },
    }),
    client.paymentException.count({
      where: {
        organizationId,
        sourceType: "SUPPLIER_PAYMENT",
        status: { notIn: [PaymentExceptionStatus.RESOLVED, PaymentExceptionStatus.DISMISSED] },
      },
    }),
    client.supplierInvoice.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: [SupplierInvoiceStatus.POSTED, SupplierInvoiceStatus.PAYMENT_PENDING, SupplierInvoiceStatus.DISPUTED] },
      },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        amountPaid: true,
        currency: true,
        invoiceDate: true,
        ledgerPostingBatchId: true,
        metadata: true,
        supplier: { select: { name: true } },
      },
    }),
    client.supplierBankChangeRequest.findMany({
      where: { organizationId, status: SupplierBankChangeStatus.PENDING },
      orderBy: { requestedAt: "asc" },
      take: limit,
      select: {
        id: true,
        supplierId: true,
        requestedById: true,
        requestedAt: true,
        reason: true,
        bankAccountId: true,
        supplier: { select: { name: true } },
      },
    }),
    client.supplierPayment.findMany({
      where: { organizationId, deletedAt: null, status: SupplierPaymentStatus.RELEASED },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        currency: true,
        method: true,
        paymentDate: true,
        ledgerPostingBatchId: true,
        postedBusinessEventId: true,
        metadata: true,
        supplier: { select: { name: true } },
      },
    }),
    client.ledgerPostingBatch.findMany({
      where: {
        organizationId,
        status: { in: [LedgerPostingBatchStatus.PENDING, LedgerPostingBatchStatus.FAILED] },
        sourceType: { in: [AccountingSourceType.SUPPLIER_INVOICE, AccountingSourceType.SUPPLIER_PAYMENT] },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        postingPurpose: true,
        status: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
  ])

  const ledgerBatchIds = [
    ...recentInvoices.map((invoice) => invoice.ledgerPostingBatchId),
    ...releasedPayments.map((payment) => payment.ledgerPostingBatchId),
  ].filter(Boolean) as string[]
  const releasedPaymentIds = releasedPayments.map((payment) => payment.id)
  const [receiptLedgerBatches, paymentTransactions, paymentExceptions] = await Promise.all([
    ledgerBatchIds.length
      ? client.ledgerPostingBatch.findMany({
          where: { organizationId, id: { in: Array.from(new Set(ledgerBatchIds)) } },
          select: { id: true, status: true, errorMessage: true, metadata: true },
        })
      : Promise.resolve([]),
    releasedPaymentIds.length
      ? client.paymentTransaction.findMany({
          where: {
            organizationId,
            sourceType: "SUPPLIER_PAYMENT",
            sourceId: { in: releasedPaymentIds },
          },
          select: { id: true, sourceId: true, state: true, metadata: true },
        })
      : Promise.resolve([]),
    releasedPaymentIds.length
      ? client.paymentException.findMany({
          where: {
            organizationId,
            sourceType: "SUPPLIER_PAYMENT",
            sourceId: { in: releasedPaymentIds },
            status: { notIn: [PaymentExceptionStatus.RESOLVED, PaymentExceptionStatus.DISMISSED] },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, sourceId: true, type: true, status: true, metadata: true },
        })
      : Promise.resolve([]),
  ])

  const ledgerBatchById = new Map(receiptLedgerBatches.map((batch) => [batch.id, batch]))
  const paymentTransactionBySourceId = new Map(
    paymentTransactions.filter((transaction) => transaction.sourceId).map((transaction) => [transaction.sourceId!, transaction]),
  )
  const paymentExceptionBySourceId = new Map(
    paymentExceptions.filter((exception) => exception.sourceId).map((exception) => [exception.sourceId!, exception]),
  )

  const ledgerStatusFor = (batchId: string | null, metadata: unknown) => {
    const metadataStatus = metadataString(metadata, "ledgerStatus")
    if (metadataStatus) return metadataStatus
    if (!batchId) return "NOT_POSTED"
    return ledgerBatchById.get(batchId)?.status ?? "UNKNOWN"
  }

  const ledgerBlockerCodeFor = (batchId: string | null, metadata: unknown) =>
    metadataString(metadata, "ledgerBlockerCode") || metadataString(ledgerBatchById.get(batchId ?? "")?.metadata, "blockerCode")

  const ledgerBlockerMessageFor = (batchId: string | null, metadata: unknown) =>
    metadataString(metadata, "ledgerBlockerMessage") || ledgerBatchById.get(batchId ?? "")?.errorMessage || null

  return {
    organizationId,
    asOf: new Date().toISOString(),
    counts: {
      postedInvoices,
      paymentPendingInvoices,
      matchExceptions,
      pendingBankChanges: pendingBankChangeCount,
      releasedPayments: releasedPaymentCount,
      ledgerBlockers: ledgerBlockerCount,
      reconciliationBlockers: reconciliationBlockerCount,
    },
    queues: {
      recentInvoices: recentInvoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        supplierName: invoice.supplier.name,
        status: invoice.status,
        total: decimalString(invoice.total),
        amountPaid: decimalString(invoice.amountPaid),
        currency: invoice.currency,
        invoiceDate: invoice.invoiceDate.toISOString(),
        ledgerPostingBatchId: invoice.ledgerPostingBatchId,
        ledgerStatus: ledgerStatusFor(invoice.ledgerPostingBatchId, invoice.metadata),
        ledgerBlockerCode: ledgerBlockerCodeFor(invoice.ledgerPostingBatchId, invoice.metadata),
        ledgerBlockerMessage: ledgerBlockerMessageFor(invoice.ledgerPostingBatchId, invoice.metadata),
        countryPackStatus: metadataString(invoice.metadata, "countryPackStatus"),
        countryPackVersion: metadataString(invoice.metadata, "countryPackVersion"),
        countryPackResolutionHash: metadataString(invoice.metadata, "countryPackResolutionHash"),
        taxTreatmentStatus: metadataString(invoice.metadata, "taxTreatmentStatus"),
        withholdingTreatmentStatus: metadataString(invoice.metadata, "withholdingTreatmentStatus"),
        operatorActionRequired: metadataBoolean(invoice.metadata, "operatorActionRequired"),
      })),
      pendingBankChanges: pendingBankChanges.map((change) => ({
        id: change.id,
        supplierId: change.supplierId,
        supplierName: change.supplier.name,
        requestedById: change.requestedById,
        requestedAt: change.requestedAt.toISOString(),
        reason: change.reason,
        bankAccountId: change.bankAccountId,
      })),
      releasedPayments: releasedPayments.map((payment) => ({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        supplierName: payment.supplier.name,
        amount: decimalString(payment.amount),
        currency: payment.currency,
        method: payment.method,
        paymentDate: payment.paymentDate.toISOString(),
        ledgerPostingBatchId: payment.ledgerPostingBatchId,
        postedBusinessEventId: payment.postedBusinessEventId,
        ledgerStatus: ledgerStatusFor(payment.ledgerPostingBatchId, payment.metadata),
        ledgerBlockerCode: ledgerBlockerCodeFor(payment.ledgerPostingBatchId, payment.metadata),
        ledgerBlockerMessage: ledgerBlockerMessageFor(payment.ledgerPostingBatchId, payment.metadata),
        reconciliationStatus:
          metadataString(payment.metadata, "reconciliationStatus") ||
          metadataString(paymentExceptionBySourceId.get(payment.id)?.metadata, "reconciliationStatus") ||
          paymentTransactionBySourceId.get(payment.id)?.state ||
          null,
        paymentTransactionId: paymentTransactionBySourceId.get(payment.id)?.id ?? null,
        paymentExceptionId: paymentExceptionBySourceId.get(payment.id)?.id ?? null,
        countryPackStatus: metadataString(payment.metadata, "countryPackStatus"),
        withholdingTreatmentStatus: metadataString(payment.metadata, "withholdingTreatmentStatus"),
        operatorActionRequired: metadataBoolean(payment.metadata, "operatorActionRequired"),
      })),
      ledgerBlockers: ledgerBlockers.map((blocker) => ({
        id: blocker.id,
        sourceType: blocker.sourceType,
        sourceId: blocker.sourceId,
        postingPurpose: blocker.postingPurpose,
        status: blocker.status,
        errorMessage: blocker.errorMessage,
        createdAt: blocker.createdAt.toISOString(),
      })),
    },
  }
}

export async function postSupplierInvoice(input: PostSupplierInvoiceInput, client: DbClient = db) {
  const parsed = postSupplierInvoiceInputSchema.parse(input)
  const invoiceDate = parseDate(parsed.invoiceDate)
  const dueDate = parsed.dueDate ? parseDate(parsed.dueDate) : undefined
  const currency = normalizeCurrency(parsed.currency)
  const idempotencyPayloadHash = parsed.idempotencyKey
    ? prefixedHash({
        operation: "postSupplierInvoice",
        supplierId: parsed.supplierId,
        purchaseOrderId: parsed.purchaseOrderId ?? null,
        invoiceNumber: normalizeInvoiceNumber(parsed.invoiceNumber),
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate?.toISOString() ?? null,
        currency,
        lines: parsed.lines.map((line) => ({
          purchaseOrderLineId: line.purchaseOrderLineId ?? null,
          goodsReceiptLineId: line.goodsReceiptLineId,
          itemId: line.itemId ?? null,
          description: line.description.trim(),
          quantity: String(line.quantity),
          unitCost: String(line.unitCost),
          taxRate: String(line.taxRate ?? 0),
        })),
      })
    : null

  return inTransaction(client, async (tx) => {
    const supplier = await assertSupplier(tx, parsed.organizationId, parsed.supplierId)

    if (parsed.idempotencyKey) {
      const existing = await tx.supplierInvoice.findFirst({
        where: {
          organizationId: parsed.organizationId,
          idempotencyKey: parsed.idempotencyKey,
          deletedAt: null,
        },
      })
      if (existing) {
        assertIdempotencyPayloadMatches(
          existing.metadata,
          idempotencyPayloadHash,
          "Supplier invoice idempotency key was reused with a different payload.",
        )
        return {
          supplierInvoice: existing,
          postingBatchId: existing.ledgerPostingBatchId,
          businessEventId: existing.postedBusinessEventId,
          ledgerStatus: "IDEMPOTENT_REPLAY" as const,
        }
      }
    }

    if (parsed.purchaseOrderId) {
      const purchaseOrder = await tx.purchaseOrder.findFirst({
        where: {
          id: parsed.purchaseOrderId,
          organizationId: parsed.organizationId,
          supplierId: parsed.supplierId,
          deletedAt: null,
        },
        select: { id: true, status: true },
      })

      if (!purchaseOrder) throw new NotFoundError("Purchase order not found for this supplier.")
      if (purchaseOrder.status === PurchaseOrderStatus.DRAFT || purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
        throw new BusinessRuleError("Supplier invoices can only be posted against approved or received purchase orders.")
      }
    }

    const linePlans = await buildInvoiceLinePlans(tx, {
      organizationId: parsed.organizationId,
      supplierId: parsed.supplierId,
      purchaseOrderId: parsed.purchaseOrderId,
      lines: parsed.lines,
    })

    const subtotal = linePlans.reduce((total, line) => total.plus(line.lineSubtotal), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const taxAmount = linePlans.reduce((total, line) => total.plus(line.taxAmount), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const total = subtotal.plus(taxAmount).toDecimalPlaces(2)
    if (total.lte(0)) throw new BusinessRuleError("Supplier invoice total must be greater than zero.")

    const countryPackStatus = await resolveAPCountryPackStatus(tx, {
      organizationId: parsed.organizationId,
      documentDate: invoiceDate,
      taxAmount,
      purpose: "SUPPLIER_INVOICE",
    })

    const fingerprint = duplicateFingerprint({
      organizationId: parsed.organizationId,
      supplierId: parsed.supplierId,
      invoiceNumber: parsed.invoiceNumber,
      total,
      currency,
    })

    const duplicate = await tx.supplierInvoice.findFirst({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        OR: [
          { supplierId: parsed.supplierId, invoiceNumber: parsed.invoiceNumber.trim() },
          { duplicateFingerprint: fingerprint },
        ],
      },
      select: { id: true, invoiceNumber: true },
    })

    if (duplicate) {
      throw new ConflictError(`Supplier invoice ${parsed.invoiceNumber} is already recorded for this supplier.`)
    }

    const period = await getOpenPeriodForDate(parsed.organizationId, invoiceDate, tx)
    const evidencePayload = {
      supplierId: parsed.supplierId,
      invoiceNumber: parsed.invoiceNumber.trim(),
      invoiceDate: invoiceDate.toISOString(),
      total: total.toFixed(2),
      currency,
      lineCount: linePlans.length,
      goodsReceiptLineIds: linePlans.map((line) => line.goodsReceiptLineId),
    }
    const documentHash = parsed.documentHash ?? prefixedHash(evidencePayload)

    const invoice = await tx.supplierInvoice.create({
      data: {
        organizationId: parsed.organizationId,
        supplierId: parsed.supplierId,
        purchaseOrderId: parsed.purchaseOrderId ?? null,
        invoiceNumber: parsed.invoiceNumber.trim(),
        invoiceDate,
        dueDate: dueDate ?? null,
        status: SupplierInvoiceStatus.POSTED,
        subtotal,
        taxAmount,
        discount: new Prisma.Decimal(0),
        total,
        amountPaid: new Prisma.Decimal(0),
        currency,
        duplicateFingerprint: fingerprint,
        idempotencyKey: parsed.idempotencyKey ?? null,
        documentHash,
        evidenceHash: parsed.evidenceHash ?? prefixedHash(evidencePayload),
        createdById: parsed.createdById ?? null,
        approvedById: parsed.approvedById ?? parsed.createdById ?? null,
        postedAt: invoiceDate,
        notes: parsed.notes ?? null,
        metadata: safeJson({
          gate: "011-purchasing-ap-controls",
          normalizedInvoiceNumber: normalizeInvoiceNumber(parsed.invoiceNumber),
          idempotencyPayloadHash,
          countryPackStatus: countryPackStatus.countryPackStatus,
          countryCode: countryPackStatus.countryCode,
          countryPackVersion: countryPackStatus.countryPackVersion,
          countryPackResolutionHash: countryPackStatus.countryPackResolutionHash,
          taxTreatmentStatus: countryPackStatus.taxTreatmentStatus,
          withholdingTreatmentStatus: countryPackStatus.withholdingTreatmentStatus,
          operatorActionRequired: countryPackStatus.operatorActionRequired,
          countryPackErrorCode: countryPackStatus.errorCode ?? null,
          countryPackErrorMessage: countryPackStatus.errorMessage ?? null,
        }),
        lines: {
          create: linePlans.map((line) => ({
            organizationId: parsed.organizationId,
            purchaseOrderLineId: line.purchaseOrderLineId,
            goodsReceiptLineId: line.goodsReceiptLineId,
            itemId: line.itemId,
            description: line.description,
            quantity: line.quantity,
            unitCost: line.unitCost,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
            lineTotal: line.lineTotal,
            matchStatus: ThreeWayMatchStatus.MATCHED,
          })),
        },
      },
      include: { lines: true },
    })

    const distinctGoodsReceiptIds = Array.from(new Set(linePlans.map((line) => line.goodsReceiptId)))
    const match = await tx.threeWayMatch.create({
      data: {
        organizationId: parsed.organizationId,
        supplierInvoiceId: invoice.id,
        purchaseOrderId: parsed.purchaseOrderId ?? null,
        goodsReceiptId: distinctGoodsReceiptIds.length === 1 ? distinctGoodsReceiptIds[0] : null,
        status: ThreeWayMatchStatus.MATCHED,
        matchedAt: invoiceDate,
        matchedById: parsed.approvedById ?? parsed.createdById ?? null,
        toleranceAmount: new Prisma.Decimal(0),
        varianceAmount: new Prisma.Decimal(0),
        quantityVariance: new Prisma.Decimal(0),
        priceVariance: new Prisma.Decimal(0),
        evidenceHash: prefixedHash({
          invoiceId: invoice.id,
          lineIds: invoice.lines.map((line) => line.id),
          goodsReceiptLineIds: linePlans.map((line) => line.goodsReceiptLineId),
        }),
        metadata: safeJson({
          supplierId: supplier.id,
          supplierName: supplier.name,
          purchaseOrderId: parsed.purchaseOrderId ?? null,
        }),
      },
    })

    const balanceAfter = decimal2(supplier.currentBalance).plus(total).toDecimalPlaces(2)
    await tx.supplier.update({
      where: { id: supplier.id },
      data: { currentBalance: balanceAfter },
    })
    await tx.supplierLedgerEntry.create({
      data: {
        organizationId: parsed.organizationId,
        supplierId: supplier.id,
        entryDate: invoiceDate,
        type: LedgerEntryType.PURCHASE,
        debit: total,
        credit: new Prisma.Decimal(0),
        balanceAfter,
        description: `Supplier invoice ${invoice.invoiceNumber}`,
        referenceType: "SUPPLIER_INVOICE",
        referenceId: invoice.id,
      },
    })

    const postingResult = await createAPLedgerPosting(tx, {
      organizationId: parsed.organizationId,
      periodId: period.id,
      sourceType: AccountingSourceType.SUPPLIER_INVOICE,
      sourceId: invoice.id,
      sourceNumber: invoice.invoiceNumber,
      sourceDate: invoiceDate,
      postingPurpose: AccountingPostingPurpose.SUPPLIER_INVOICE,
      actorId: parsed.approvedById ?? parsed.createdById ?? null,
      supplierId: supplier.id,
      currency,
      journalType: JournalType.PURCHASE,
      journalPrefix: "APINV",
      memo: `Supplier invoice ${invoice.invoiceNumber}`,
      documentHash,
      amounts: {
        sourceAmount: total,
        netAmount: subtotal,
        grossAmount: total,
        taxAmount,
        costAmount: subtotal,
      },
      blockerCode: "AP_POSTING_RULE_REVIEW",
      blockerMessage: "Supplier invoice AP posting requires configured SYSCOHADA purchase/input VAT/AP rules.",
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        supplierId: supplier.id,
        total: total.toFixed(2),
        currency,
        countryPackStatus: countryPackStatus.countryPackStatus,
        countryPackVersion: countryPackStatus.countryPackVersion,
        countryPackResolutionHash: countryPackStatus.countryPackResolutionHash,
        taxTreatmentStatus: countryPackStatus.taxTreatmentStatus,
        withholdingTreatmentStatus: countryPackStatus.withholdingTreatmentStatus,
      },
    })
    const ledgerBatch = postingResult.ledgerBatch

    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "purchase.supplier_invoice.posted",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: parsed.idempotencyKey ?? `supplier-invoice:${invoice.id}`,
      payload: {
        invoiceId: invoice.id,
        supplierId: supplier.id,
        purchaseOrderId: parsed.purchaseOrderId ?? null,
        invoiceNumber: invoice.invoiceNumber,
        total: total.toFixed(2),
        currency,
        threeWayMatchId: match.id,
        ledgerPostingBatchId: ledgerBatch.id,
        journalEntryId: postingResult.journalEntryId ?? null,
        ledgerStatus: postingResult.ledgerStatus,
      },
      occurredAt: invoiceDate,
      actorId: parsed.approvedById ?? parsed.createdById,
      sourceType: AccountingSourceType.SUPPLIER_INVOICE,
      sourceId: invoice.id,
      postingBatchId: ledgerBatch.id,
      documentHash,
      metadata: {
        ledgerStatus: postingResult.ledgerStatus,
        blockerCode: postingResult.blockerCode ?? null,
        countryPackStatus: countryPackStatus.countryPackStatus,
        countryPackVersion: countryPackStatus.countryPackVersion,
        countryPackResolutionHash: countryPackStatus.countryPackResolutionHash,
        gate: "011-purchasing-ap-controls",
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "supplier_invoice.posted",
          destination: "accounting",
          payload: {
            severity: postingResult.ledgerStatus === "POSTED" ? "info" : "warning",
            invoiceId: invoice.id,
            supplierId: supplier.id,
            total: total.toFixed(2),
            ledgerStatus: postingResult.ledgerStatus,
            blockerCode: postingResult.blockerCode ?? null,
          },
        },
      ],
    })

    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)
    const postedInvoice = await tx.supplierInvoice.update({
      where: { id: invoice.id },
      data: {
        ledgerPostingBatchId: ledgerBatch.id,
        postedBusinessEventId: eventResult.event.id,
        metadata: safeJson({
          gate: "011-purchasing-ap-controls",
          normalizedInvoiceNumber: normalizeInvoiceNumber(parsed.invoiceNumber),
          idempotencyPayloadHash,
          ledgerStatus: postingResult.ledgerStatus,
          ledgerBlockerCode: postingResult.blockerCode ?? null,
          ledgerBlockerMessage: postingResult.blockerMessage ?? null,
          journalEntryId: postingResult.journalEntryId ?? null,
          accountingSourceLinkId: postingResult.accountingSourceLinkId ?? null,
          countryPackStatus: countryPackStatus.countryPackStatus,
          countryCode: countryPackStatus.countryCode,
          countryPackVersion: countryPackStatus.countryPackVersion,
          countryPackResolutionHash: countryPackStatus.countryPackResolutionHash,
          taxTreatmentStatus: countryPackStatus.taxTreatmentStatus,
          withholdingTreatmentStatus: countryPackStatus.withholdingTreatmentStatus,
          operatorActionRequired: countryPackStatus.operatorActionRequired,
          countryPackErrorCode: countryPackStatus.errorCode ?? null,
          countryPackErrorMessage: countryPackStatus.errorMessage ?? null,
        }),
      },
      include: { lines: true, threeWayMatches: true },
    })

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "SupplierInvoice",
      entityId: invoice.id,
      action: "SUPPLIER_INVOICE_POSTED",
      actorId: parsed.approvedById ?? parsed.createdById ?? null,
      changes: {
        after: {
          supplierId: supplier.id,
          invoiceNumber: invoice.invoiceNumber,
          total: total.toFixed(2),
          ledgerPostingBatchId: ledgerBatch.id,
          businessEventId: eventResult.event.id,
          ledgerStatus: postingResult.ledgerStatus,
          journalEntryId: postingResult.journalEntryId ?? null,
        },
      },
    })

    return {
      supplierInvoice: postedInvoice,
      threeWayMatch: match,
      postingBatchId: ledgerBatch.id,
      businessEventId: eventResult.event.id,
      ledgerStatus: postingResult.ledgerStatus,
    }
  })
}

export async function requestSupplierBankChange(input: RequestSupplierBankChangeInput, client: DbClient = db) {
  const parsed = requestSupplierBankChangeInputSchema.parse(input)

  return inTransaction(client, async (tx) => {
    const supplier = await assertSupplier(tx, parsed.organizationId, parsed.supplierId)
    if (parsed.bankAccountId) {
      const bankAccount = await tx.supplierBankAccount.findFirst({
        where: {
          id: parsed.bankAccountId,
          organizationId: parsed.organizationId,
          supplierId: parsed.supplierId,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (!bankAccount) throw new NotFoundError("Supplier bank account not found for this supplier.")
    }

    const requestPayload = {
      supplierId: supplier.id,
      bankAccountId: parsed.bankAccountId ?? null,
      bankName: parsed.bankName ?? null,
      accountName: parsed.accountName ?? null,
      accountNumberHash: hashSecret(parsed.accountNumber),
      mobileMoneyProvider: parsed.mobileMoneyProvider ?? null,
      mobileMoneyPhoneHash: hashSecret(parsed.mobileMoneyPhone),
      requestedById: parsed.requestedById,
    }

    const change = await tx.supplierBankChangeRequest.create({
      data: {
        organizationId: parsed.organizationId,
        supplierId: supplier.id,
        bankAccountId: parsed.bankAccountId ?? null,
        status: SupplierBankChangeStatus.PENDING,
        requestedById: parsed.requestedById,
        reason: parsed.reason ?? null,
        newBankName: parsed.bankName ?? null,
        newAccountName: parsed.accountName ?? null,
        newAccountNumberMasked: maskSecret(parsed.accountNumber),
        newAccountNumberHash: hashSecret(parsed.accountNumber),
        newMobileMoneyProvider: parsed.mobileMoneyProvider ?? null,
        newMobileMoneyPhoneMasked: maskSecret(parsed.mobileMoneyPhone),
        newMobileMoneyPhoneHash: hashSecret(parsed.mobileMoneyPhone),
        changeHash: prefixedHash(requestPayload),
        documentHash: parsed.documentHash ?? prefixedHash(requestPayload),
        metadata: parsed.metadata ? safeJson(parsed.metadata) : undefined,
      },
    })

    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "supplier.bank_change.requested",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: `supplier-bank-change-requested:${change.id}`,
      payload: {
        changeRequestId: change.id,
        supplierId: supplier.id,
        bankAccountId: parsed.bankAccountId ?? null,
        changeHash: change.changeHash,
      },
      occurredAt: change.requestedAt,
      actorId: parsed.requestedById,
      documentHash: change.documentHash ?? undefined,
      metadata: { gate: "011-purchasing-ap-controls" },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "supplier_bank_change.pending_approval",
          destination: "manager",
          payload: {
            severity: "warning",
            changeRequestId: change.id,
            supplierId: supplier.id,
            supplierName: supplier.name,
          },
        },
      ],
    })
    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)
    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "SupplierBankChangeRequest",
      entityId: change.id,
      action: "SUPPLIER_BANK_CHANGE_REQUESTED",
      actorId: parsed.requestedById,
      changes: { after: { supplierId: supplier.id, changeHash: change.changeHash } },
    })

    return { bankChangeRequest: change, businessEventId: eventResult.event.id }
  })
}

export async function approveSupplierBankChange(input: ApproveSupplierBankChangeInput, client: DbClient = db) {
  const parsed = approveSupplierBankChangeInputSchema.parse(input)

  return inTransaction(client, async (tx) => {
    const change = await tx.supplierBankChangeRequest.findFirst({
      where: {
        id: parsed.changeRequestId,
        organizationId: parsed.organizationId,
        status: SupplierBankChangeStatus.PENDING,
      },
      include: { supplier: true },
    })

    if (!change) throw new NotFoundError("Pending supplier bank change request not found.")
    if (change.requestedById === parsed.approvedById) {
      throw new BusinessRuleError("A separate approver is required for supplier bank changes.")
    }

    const approvedAt = new Date()
    const existingPrimary = await tx.supplierBankAccount.count({
      where: {
        organizationId: parsed.organizationId,
        supplierId: change.supplierId,
        status: SupplierBankAccountStatus.APPROVED,
        isPrimary: true,
        deletedAt: null,
      },
    })

    const accountData = {
      organizationId: parsed.organizationId,
      supplierId: change.supplierId,
      bankName: change.newBankName,
      accountName: change.newAccountName,
      accountNumberMasked: change.newAccountNumberMasked,
      accountNumberHash: change.newAccountNumberHash,
      mobileMoneyProvider: change.newMobileMoneyProvider,
      mobileMoneyPhoneMasked: change.newMobileMoneyPhoneMasked,
      mobileMoneyPhoneHash: change.newMobileMoneyPhoneHash,
      status: SupplierBankAccountStatus.APPROVED,
      requestedById: change.requestedById,
      approvedById: parsed.approvedById,
      approvedAt,
      evidenceHash: change.changeHash,
      documentHash: parsed.documentHash ?? change.documentHash,
      isPrimary: existingPrimary === 0,
      metadata: safeJson({
        approvedFromChangeRequestId: change.id,
        gate: "011-purchasing-ap-controls",
      }),
    }

    const bankAccount = change.bankAccountId
      ? await tx.supplierBankAccount.update({
          where: { id: change.bankAccountId },
          data: accountData,
        })
      : await tx.supplierBankAccount.create({ data: accountData })

    const approvedChange = await tx.supplierBankChangeRequest.update({
      where: { id: change.id },
      data: {
        status: SupplierBankChangeStatus.APPROVED,
        bankAccountId: bankAccount.id,
        approvedById: parsed.approvedById,
        approvedAt,
      },
    })

    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "supplier.bank_change.approved",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: `supplier-bank-change-approved:${approvedChange.id}`,
      payload: {
        changeRequestId: approvedChange.id,
        supplierId: change.supplierId,
        bankAccountId: bankAccount.id,
        changeHash: approvedChange.changeHash,
      },
      occurredAt: approvedAt,
      actorId: parsed.approvedById,
      documentHash: approvedChange.documentHash ?? undefined,
      metadata: { gate: "011-purchasing-ap-controls" },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "supplier_bank_change.approved",
          destination: "accounting",
          payload: {
            severity: "info",
            changeRequestId: approvedChange.id,
            supplierId: change.supplierId,
            bankAccountId: bankAccount.id,
          },
        },
      ],
    })
    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)
    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "SupplierBankChangeRequest",
      entityId: change.id,
      action: "SUPPLIER_BANK_CHANGE_APPROVED",
      actorId: parsed.approvedById,
      changes: {
        before: { status: SupplierBankChangeStatus.PENDING },
        after: { status: SupplierBankChangeStatus.APPROVED, bankAccountId: bankAccount.id },
      },
    })

    return { bankChangeRequest: approvedChange, bankAccount, businessEventId: eventResult.event.id }
  })
}

export async function approveSupplierBankChangeWithControls(
  input: ApproveSupplierBankChangeInput,
  control: APControlActorContext,
  client: DbClient = db,
) {
  const parsed = approveSupplierBankChangeInputSchema.parse(input)
  assertControlActorMatches(control, parsed.organizationId, [parsed.approvedById])

  const change = await loadSupplierBankChangeApprovalSubject(client, parsed.organizationId, parsed.changeRequestId)
  const controlInput = sensitiveInput(control, {
    action: "supplier.bank-change.approve",
    resourceType: "SupplierBankChangeRequest",
    resourceId: parsed.changeRequestId,
    subjectActorId: change?.requestedById ?? null,
    metadata: {
      supplierId: change?.supplierId,
    },
  })

  await auditDeniedSensitiveAction(client, controlInput)
  return inTransaction(client, async (tx) => {
    await auditAllowedSensitiveAction(tx, controlInput)
    return approveSupplierBankChange(parsed, tx)
  })
}

export async function releaseSupplierPayment(input: ReleaseSupplierPaymentInput, client: DbClient = db) {
  const parsed = releaseSupplierPaymentInputSchema.parse(input)
  const paymentDate = parseDate(parsed.paymentDate)
  const releasedById = parsed.releasedById ?? parsed.approvedById
  const method = parsed.method as PaymentMethod
  const idempotencyPayloadHash = parsed.idempotencyKey
    ? prefixedHash({
        operation: "releaseSupplierPayment",
        supplierId: parsed.supplierId,
        bankAccountId: parsed.bankAccountId,
        method,
        paymentDate: paymentDate.toISOString(),
        requestedById: parsed.requestedById,
        approvedById: parsed.approvedById,
        releasedById,
        allocations: [...parsed.allocations]
          .map((allocation) => ({
            supplierInvoiceId: allocation.supplierInvoiceId,
            amount: decimal2(allocation.amount).toFixed(2),
          }))
          .sort((left, right) => left.supplierInvoiceId.localeCompare(right.supplierInvoiceId)),
      })
    : null

  return inTransaction(client, async (tx) => {
    const supplier = await assertSupplier(tx, parsed.organizationId, parsed.supplierId)

    if (parsed.requestedById === parsed.approvedById) {
      throw new BusinessRuleError("A separate approver is required before releasing supplier payments.")
    }
    if (parsed.requestedById === releasedById) {
      throw new BusinessRuleError("A separate releaser is required before releasing supplier payments.")
    }

    if (parsed.idempotencyKey) {
      const existing = await tx.supplierPayment.findFirst({
        where: {
          organizationId: parsed.organizationId,
          idempotencyKey: parsed.idempotencyKey,
          deletedAt: null,
        },
      })
      if (existing) {
        assertIdempotencyPayloadMatches(
          existing.metadata,
          idempotencyPayloadHash,
          "Supplier payment idempotency key was reused with a different payload.",
        )
        return {
          supplierPayment: existing,
          postingBatchId: existing.ledgerPostingBatchId,
          businessEventId: existing.postedBusinessEventId,
          ledgerStatus: "IDEMPOTENT_REPLAY" as const,
        }
      }
    }

    const bankAccount = await tx.supplierBankAccount.findFirst({
      where: {
        id: parsed.bankAccountId,
        organizationId: parsed.organizationId,
        supplierId: parsed.supplierId,
        deletedAt: null,
      },
      select: { id: true, status: true },
    })
    if (!bankAccount || bankAccount.status !== SupplierBankAccountStatus.APPROVED) {
      throw new BusinessRuleError("Payment is blocked until the supplier bank destination is approved.")
    }

    const pendingBankChanges = await tx.supplierBankChangeRequest.count({
      where: {
        organizationId: parsed.organizationId,
        supplierId: parsed.supplierId,
        status: SupplierBankChangeStatus.PENDING,
      },
    })
    if (pendingBankChanges > 0) {
      throw new BusinessRuleError("Payment is blocked while a supplier bank change is pending approval.")
    }

    const allocationIds = parsed.allocations.map((allocation) => allocation.supplierInvoiceId)
    if (allocationIds.length !== new Set(allocationIds).size) {
      throw new BusinessRuleError("Supplier payment cannot contain duplicate invoice allocations.")
    }

    const invoices = await tx.supplierInvoice.findMany({
      where: {
        id: { in: allocationIds },
        organizationId: parsed.organizationId,
        supplierId: parsed.supplierId,
        deletedAt: null,
        status: { in: [SupplierInvoiceStatus.POSTED, SupplierInvoiceStatus.PAYMENT_PENDING] },
      },
    })

    if (invoices.length !== allocationIds.length) {
      throw new BusinessRuleError("Supplier payment can only apply to posted unpaid supplier invoices.")
    }

    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]))
    let totalPayment = new Prisma.Decimal(0)
    const allocationPlans = parsed.allocations.map((allocation) => {
      const invoice = invoiceById.get(allocation.supplierInvoiceId)
      if (!invoice) throw new BusinessRuleError("Supplier payment allocation invoice is not payable.")
      const amount = decimal2(allocation.amount)
      if (amount.lte(0)) throw new BusinessRuleError("Supplier payment allocation amount must be greater than zero.")
      const outstanding = decimal2(invoice.total).minus(decimal2(invoice.amountPaid)).toDecimalPlaces(2)
      if (amount.gt(outstanding)) {
        throw new BusinessRuleError("Supplier payment allocation exceeds outstanding supplier invoice balance.")
      }
      totalPayment = totalPayment.plus(amount).toDecimalPlaces(2)
      return { invoice, amount, outstanding }
    })

    if (totalPayment.lte(0)) throw new BusinessRuleError("Supplier payment amount must be greater than zero.")

    const countryPackStatus = await resolveAPCountryPackStatus(tx, {
      organizationId: parsed.organizationId,
      documentDate: paymentDate,
      taxAmount: new Prisma.Decimal(0),
      purpose: "SUPPLIER_PAYMENT",
    })

    const period = await getOpenPeriodForDate(parsed.organizationId, paymentDate, tx)
    const paymentNumber = await nextSupplierPaymentNumber(tx, parsed.organizationId, paymentDate)
    const evidencePayload = {
      supplierId: supplier.id,
      bankAccountId: bankAccount.id,
      paymentNumber,
      amount: totalPayment.toFixed(2),
      method,
      allocationIds,
    }
    const documentHash = parsed.documentHash ?? prefixedHash(evidencePayload)

    const payment = await tx.supplierPayment.create({
      data: {
        organizationId: parsed.organizationId,
        supplierId: supplier.id,
        bankAccountId: bankAccount.id,
        paymentNumber,
        status: SupplierPaymentStatus.RELEASED,
        method,
        amount: totalPayment,
        currency: normalizeCurrency(invoices[0]?.currency),
        paymentDate,
        idempotencyKey: parsed.idempotencyKey ?? null,
        documentHash,
        evidenceHash: parsed.evidenceHash ?? prefixedHash(evidencePayload),
        requestedById: parsed.requestedById,
        approvedById: parsed.approvedById,
        releasedById,
        approvedAt: paymentDate,
        releasedAt: paymentDate,
        notes: parsed.notes ?? null,
        metadata: safeJson({
          gate: "011-purchasing-ap-controls",
          bankDestinationEvidence: "approved",
          idempotencyPayloadHash,
          countryPackStatus: countryPackStatus.countryPackStatus,
          countryCode: countryPackStatus.countryCode,
          countryPackVersion: countryPackStatus.countryPackVersion,
          countryPackResolutionHash: countryPackStatus.countryPackResolutionHash,
          taxTreatmentStatus: countryPackStatus.taxTreatmentStatus,
          withholdingTreatmentStatus: countryPackStatus.withholdingTreatmentStatus,
          operatorActionRequired: countryPackStatus.operatorActionRequired,
          countryPackErrorCode: countryPackStatus.errorCode ?? null,
          countryPackErrorMessage: countryPackStatus.errorMessage ?? null,
        }),
        allocations: {
          create: allocationPlans.map((allocation) => ({
            organizationId: parsed.organizationId,
            supplierInvoiceId: allocation.invoice.id,
            amount: allocation.amount,
          })),
        },
      },
      include: { allocations: true },
    })

    for (const allocation of allocationPlans) {
      const nextPaid = decimal2(allocation.invoice.amountPaid).plus(allocation.amount).toDecimalPlaces(2)
      const nextStatus = nextPaid.gte(decimal2(allocation.invoice.total))
        ? SupplierInvoiceStatus.PAID
        : SupplierInvoiceStatus.PAYMENT_PENDING
      await tx.supplierInvoice.update({
        where: { id: allocation.invoice.id },
        data: {
          amountPaid: nextPaid,
          status: nextStatus,
        },
      })
    }

    const balanceAfter = decimal2(supplier.currentBalance).minus(totalPayment).toDecimalPlaces(2)
    await tx.supplier.update({
      where: { id: supplier.id },
      data: { currentBalance: balanceAfter },
    })
    await tx.supplierLedgerEntry.create({
      data: {
        organizationId: parsed.organizationId,
        supplierId: supplier.id,
        entryDate: paymentDate,
        type: LedgerEntryType.PAYMENT,
        debit: new Prisma.Decimal(0),
        credit: totalPayment,
        balanceAfter,
        description: `Supplier payment ${payment.paymentNumber}`,
        referenceType: "SUPPLIER_PAYMENT",
        referenceId: payment.id,
      },
    })

    const postingResult = await createAPLedgerPosting(tx, {
      organizationId: parsed.organizationId,
      periodId: period.id,
      sourceType: AccountingSourceType.SUPPLIER_PAYMENT,
      sourceId: payment.id,
      sourceNumber: payment.paymentNumber,
      sourceDate: paymentDate,
      postingPurpose: AccountingPostingPurpose.SUPPLIER_PAYMENT,
      actorId: releasedById,
      supplierId: supplier.id,
      currency: payment.currency,
      journalType: method === PaymentMethod.CASH ? JournalType.CASH : JournalType.BANK,
      journalPrefix: "APPAY",
      memo: `Supplier payment ${payment.paymentNumber}`,
      documentHash,
      amounts: {
        sourceAmount: totalPayment,
        netAmount: totalPayment,
        grossAmount: totalPayment,
        taxAmount: new Prisma.Decimal(0),
      },
      conditionContext: { paymentMethod: method },
      blockerCode: "SUPPLIER_PAYMENT_POSTING_REVIEW",
      blockerMessage: "Supplier payment release requires configured SYSCOHADA AP settlement posting and reconciliation rules.",
      metadata: {
        paymentNumber: payment.paymentNumber,
        supplierId: supplier.id,
        amount: totalPayment.toFixed(2),
        method,
        countryPackStatus: countryPackStatus.countryPackStatus,
        countryPackVersion: countryPackStatus.countryPackVersion,
        countryPackResolutionHash: countryPackStatus.countryPackResolutionHash,
        withholdingTreatmentStatus: countryPackStatus.withholdingTreatmentStatus,
      },
    })
    const ledgerBatch = postingResult.ledgerBatch

    const reconciliationResult = await queueOutboundSupplierPaymentReconciliation(tx, {
      organizationId: parsed.organizationId,
      supplierPaymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      supplierId: supplier.id,
      bankAccountId: bankAccount.id,
      amount: totalPayment,
      currency: payment.currency,
      paymentDate,
      method,
      ledgerPostingBatchId: ledgerBatch.id,
      ledgerStatus: postingResult.ledgerStatus,
      actorId: releasedById,
      evidenceHash: payment.evidenceHash,
      documentHash,
    })

    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "supplier.payment.released",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: parsed.idempotencyKey ?? `supplier-payment:${payment.id}`,
      payload: {
        supplierPaymentId: payment.id,
        supplierId: supplier.id,
        bankAccountId: bankAccount.id,
        amount: totalPayment.toFixed(2),
        method,
        allocationIds,
        ledgerPostingBatchId: ledgerBatch.id,
        journalEntryId: postingResult.journalEntryId ?? null,
        ledgerStatus: postingResult.ledgerStatus,
        paymentTransactionId: reconciliationResult.paymentTransaction.id,
        paymentExceptionId: reconciliationResult.paymentException.id,
        reconciliationStatus: reconciliationResult.reconciliationStatus,
      },
      occurredAt: paymentDate,
      actorId: releasedById,
      sourceType: AccountingSourceType.SUPPLIER_PAYMENT,
      sourceId: payment.id,
      postingBatchId: ledgerBatch.id,
      documentHash,
      metadata: {
        ledgerStatus: postingResult.ledgerStatus,
        blockerCode: postingResult.blockerCode ?? null,
        reconciliationStatus: reconciliationResult.reconciliationStatus,
        paymentTransactionId: reconciliationResult.paymentTransaction.id,
        paymentExceptionId: reconciliationResult.paymentException.id,
        countryPackStatus: countryPackStatus.countryPackStatus,
        countryPackVersion: countryPackStatus.countryPackVersion,
        countryPackResolutionHash: countryPackStatus.countryPackResolutionHash,
        gate: "011-purchasing-ap-controls",
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "supplier_payment.released",
          destination: "accounting",
          payload: {
            severity: postingResult.ledgerStatus === "POSTED" ? "info" : "critical",
            supplierPaymentId: payment.id,
            supplierId: supplier.id,
            amount: totalPayment.toFixed(2),
            ledgerStatus: postingResult.ledgerStatus,
            blockerCode: postingResult.blockerCode ?? null,
          },
        },
        {
          channel: "NOTIFICATION",
          eventName: "supplier_payment.reconciliation_required",
          destination: "reconciliation",
          payload: {
            severity: "warning",
            supplierPaymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            amount: totalPayment.toFixed(2),
            method,
            paymentTransactionId: reconciliationResult.paymentTransaction.id,
            paymentExceptionId: reconciliationResult.paymentException.id,
            reconciliationStatus: reconciliationResult.reconciliationStatus,
          },
        },
      ],
    })

    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)
    const releasedPayment = await tx.supplierPayment.update({
      where: { id: payment.id },
      data: {
        ledgerPostingBatchId: ledgerBatch.id,
        postedBusinessEventId: eventResult.event.id,
        metadata: safeJson({
          gate: "011-purchasing-ap-controls",
          bankDestinationEvidence: "approved",
          idempotencyPayloadHash,
          ledgerStatus: postingResult.ledgerStatus,
          ledgerBlockerCode: postingResult.blockerCode ?? null,
          ledgerBlockerMessage: postingResult.blockerMessage ?? null,
          journalEntryId: postingResult.journalEntryId ?? null,
          accountingSourceLinkId: postingResult.accountingSourceLinkId ?? null,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
          reconciliationPayloadHash: reconciliationResult.payloadHash,
          countryPackStatus: countryPackStatus.countryPackStatus,
          countryCode: countryPackStatus.countryCode,
          countryPackVersion: countryPackStatus.countryPackVersion,
          countryPackResolutionHash: countryPackStatus.countryPackResolutionHash,
          taxTreatmentStatus: countryPackStatus.taxTreatmentStatus,
          withholdingTreatmentStatus: countryPackStatus.withholdingTreatmentStatus,
          operatorActionRequired: countryPackStatus.operatorActionRequired,
          countryPackErrorCode: countryPackStatus.errorCode ?? null,
          countryPackErrorMessage: countryPackStatus.errorMessage ?? null,
        }),
      },
      include: { allocations: true },
    })

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "SupplierPayment",
      entityId: payment.id,
      action: "SUPPLIER_PAYMENT_RELEASED",
      actorId: releasedById,
      changes: {
        after: {
          supplierId: supplier.id,
          amount: totalPayment.toFixed(2),
          paymentNumber: payment.paymentNumber,
          ledgerPostingBatchId: ledgerBatch.id,
          businessEventId: eventResult.event.id,
          ledgerStatus: postingResult.ledgerStatus,
          paymentTransactionId: reconciliationResult.paymentTransaction.id,
          paymentExceptionId: reconciliationResult.paymentException.id,
          reconciliationStatus: reconciliationResult.reconciliationStatus,
        },
      },
    })

    return {
      supplierPayment: releasedPayment,
      postingBatchId: ledgerBatch.id,
      businessEventId: eventResult.event.id,
      ledgerStatus: postingResult.ledgerStatus,
      paymentTransactionId: reconciliationResult.paymentTransaction.id,
      paymentExceptionId: reconciliationResult.paymentException.id,
      reconciliationStatus: reconciliationResult.reconciliationStatus,
    }
  })
}

export async function releaseSupplierPaymentWithControls(
  input: ReleaseSupplierPaymentInput,
  control: APControlActorContext,
  client: DbClient = db,
) {
  const parsed = releaseSupplierPaymentInputSchema.parse(input)
  const releasedById = parsed.releasedById ?? parsed.approvedById
  assertControlActorMatches(control, parsed.organizationId, [parsed.approvedById, releasedById])

  const controlInput = sensitiveInput(control, {
    action: "supplier.payment.release",
    resourceType: "SupplierPayment",
    resourceId: parsed.idempotencyKey ?? parsed.supplierId,
    subjectActorId: parsed.requestedById,
    metadata: {
      supplierId: parsed.supplierId,
      bankAccountId: parsed.bankAccountId,
      allocationCount: parsed.allocations.length,
    },
  })

  await auditDeniedSensitiveAction(client, controlInput)
  return inTransaction(client, async (tx) => {
    await auditAllowedSensitiveAction(tx, controlInput)
    return releaseSupplierPayment({ ...parsed, releasedById }, tx)
  })
}
