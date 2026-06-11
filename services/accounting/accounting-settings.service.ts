import {
  AccountingPostingPurpose,
  ChartAccountNormalBalance,
  ChartAccountType,
  JournalType,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
  type SensitiveActionDecision,
} from "@/services/controls/sensitive-action.service"

export type AccountingSettingsUpdateInput = {
  countryPack?: string | null
  baseCurrency?: string
  fiscalYearStartMonth?: number
  fiscalYearStartDay?: number
  inventoryValuationPolicy?: string
  roundingMode?: string
  roundingScale?: number
  taxRegime?: string | null
}

export type AccountingSetupControlContext = {
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
}

type ControlledResult<T> =
  | { denied: SensitiveActionDecision; value?: never }
  | { denied?: never; value: T }

export const REQUIRED_ACCOUNTING_MAPPINGS = [
  {
    key: "CASH_ON_HAND",
    label: "cash on hand",
    type: ChartAccountType.ASSET,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "5",
  },
  {
    key: "BANK",
    label: "bank",
    type: ChartAccountType.ASSET,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "5",
  },
  {
    key: "CARD_CLEARING",
    label: "card clearing",
    type: ChartAccountType.ASSET,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "5",
  },
  {
    key: "MOBILE_MONEY_CLEARING",
    label: "mobile money clearing",
    type: ChartAccountType.ASSET,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "5",
  },
  {
    key: "CHEQUE_CLEARING",
    label: "cheque clearing",
    type: ChartAccountType.ASSET,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "5",
  },
  {
    key: "ACCOUNTS_RECEIVABLE",
    label: "customer receivables",
    type: ChartAccountType.ASSET,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "4",
  },
  {
    key: "ACCOUNTS_PAYABLE",
    label: "supplier payables",
    type: ChartAccountType.LIABILITY,
    normalBalance: ChartAccountNormalBalance.CREDIT,
    syscohadaClass: "4",
  },
  {
    key: "STORE_CREDIT_LIABILITY",
    label: "store credit liability",
    type: ChartAccountType.LIABILITY,
    normalBalance: ChartAccountNormalBalance.CREDIT,
    syscohadaClass: "4",
  },
  {
    key: "INVENTORY",
    label: "inventory",
    type: ChartAccountType.ASSET,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "3",
  },
  {
    key: "SALES_REVENUE",
    label: "sales revenue",
    type: ChartAccountType.REVENUE,
    normalBalance: ChartAccountNormalBalance.CREDIT,
    syscohadaClass: "7",
  },
  {
    key: "OUTPUT_VAT",
    label: "output VAT",
    type: ChartAccountType.LIABILITY,
    normalBalance: ChartAccountNormalBalance.CREDIT,
    syscohadaClass: "4",
  },
  {
    key: "INPUT_VAT",
    label: "input VAT",
    type: ChartAccountType.ASSET,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "4",
  },
  {
    key: "COGS",
    label: "cost of goods sold",
    type: ChartAccountType.EXPENSE,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "6",
  },
  {
    key: "INVENTORY_VARIANCE",
    label: "inventory variance",
    type: ChartAccountType.EXPENSE,
    normalBalance: ChartAccountNormalBalance.DEBIT,
    syscohadaClass: "6",
  },
] as const

export const REQUIRED_DEFAULT_JOURNAL_TYPES = [
  JournalType.GENERAL,
  JournalType.SALES,
  JournalType.PURCHASE,
  JournalType.CASH,
  JournalType.BANK,
  JournalType.INVENTORY,
  JournalType.ADJUSTMENT,
  JournalType.OPENING,
] as const

export const REQUIRED_READY_POSTING_PURPOSES = [
  AccountingPostingPurpose.SALE_COMPLETION,
  AccountingPostingPurpose.PAYMENT_RECEIPT,
  AccountingPostingPurpose.REFUND,
  AccountingPostingPurpose.VOID,
  AccountingPostingPurpose.CASH_DRAWER_CLOSE,
  AccountingPostingPurpose.GOODS_RECEIPT,
  AccountingPostingPurpose.SUPPLIER_INVOICE,
  AccountingPostingPurpose.SUPPLIER_PAYMENT,
  AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
  AccountingPostingPurpose.EXPENSE_APPROVAL,
  AccountingPostingPurpose.INVENTORY_ADJUSTMENT,
] as const

function normalizeCurrency(currency?: string) {
  return (currency || "XAF").trim().toUpperCase()
}

function normalizeMappingKey(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function normalizeSyscohadaClass(value?: string | null) {
  return value?.trim().slice(0, 1) || null
}

function formatIssueList(issues: string[]) {
  return issues.length <= 6 ? issues.join("; ") : `${issues.slice(0, 6).join("; ")}; and ${issues.length - 6} more`
}

function settingsAudit(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    action: string
    message: string
    metadata?: Prisma.InputJsonValue
  },
) {
  return tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      resourceType: "OrganizationAccountingSettings",
      message: params.message,
      metadata: params.metadata,
    },
  })
}

export async function getAccountingSettings(organizationId: string) {
  return db.organizationAccountingSettings.findUnique({
    where: { organizationId },
  })
}

export async function ensureAccountingSettings(organizationId: string, actorId?: string | null) {
  const existing = await getAccountingSettings(organizationId)
  if (existing) return existing

  return db.$transaction(async (tx) => {
    const settings = await tx.organizationAccountingSettings.create({
      data: {
        organizationId,
        accountingEnabled: false,
        setupStatus: "NOT_STARTED",
        baseCurrency: "XAF",
      },
    })

    await settingsAudit(tx, {
      organizationId,
      actorId,
      action: "ACCOUNTING_SETTINGS_CREATE",
      message: "Accounting settings initialized",
      metadata: { setupStatus: settings.setupStatus, baseCurrency: settings.baseCurrency },
    })

    return settings
  })
}

export async function updateAccountingSettings(
  organizationId: string,
  input: AccountingSettingsUpdateInput,
  actorId?: string | null,
) {
  await ensureAccountingSettings(organizationId, actorId)

  return db.$transaction(async (tx) => {
    const settings = await tx.organizationAccountingSettings.update({
      where: { organizationId },
      data: {
        ...(input.countryPack !== undefined ? { countryPack: input.countryPack } : {}),
        ...(input.baseCurrency !== undefined ? { baseCurrency: normalizeCurrency(input.baseCurrency) } : {}),
        ...(input.fiscalYearStartMonth !== undefined ? { fiscalYearStartMonth: input.fiscalYearStartMonth } : {}),
        ...(input.fiscalYearStartDay !== undefined ? { fiscalYearStartDay: input.fiscalYearStartDay } : {}),
        ...(input.inventoryValuationPolicy !== undefined
          ? { inventoryValuationPolicy: input.inventoryValuationPolicy }
          : {}),
        ...(input.roundingMode !== undefined ? { roundingMode: input.roundingMode } : {}),
        ...(input.roundingScale !== undefined ? { roundingScale: input.roundingScale } : {}),
        ...(input.taxRegime !== undefined ? { taxRegime: input.taxRegime } : {}),
      },
    })

    await settingsAudit(tx, {
      organizationId,
      actorId,
      action: "ACCOUNTING_SETTINGS_UPDATE",
      message: "Accounting settings updated",
      metadata: {
        accountingEnabled: settings.accountingEnabled,
        setupStatus: settings.setupStatus,
        baseCurrency: settings.baseCurrency,
      },
    })

    return settings
  })
}

export async function collectAccountingSetupReadinessIssues(
  organizationId: string,
  tx: Prisma.TransactionClient | typeof db = db,
  now = new Date(),
) {
  const requiredMappingKeys = REQUIRED_ACCOUNTING_MAPPINGS.map((mapping) => mapping.key)
  const [
    mappedAccounts,
    defaultJournals,
    openPeriods,
    postingRules,
  ] = await Promise.all([
    tx.chartOfAccount.findMany({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
        mappingKey: { in: requiredMappingKeys },
      },
      include: { _count: { select: { children: true } } },
    }),
    tx.journal.findMany({
      where: {
        organizationId,
        isActive: true,
        isDefault: true,
        type: { in: [...REQUIRED_DEFAULT_JOURNAL_TYPES] },
      },
      select: { type: true, code: true },
    }),
    tx.accountingPeriod.findMany({
      where: {
        organizationId,
        status: "OPEN",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: { id: true, name: true },
    }),
    tx.postingRule.findMany({
      where: {
        organizationId,
        isActive: true,
        postingPurpose: { in: [...REQUIRED_READY_POSTING_PURPOSES] },
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
      include: {
        lines: {
          select: { id: true, accountId: true, mappingKey: true },
        },
      },
    }),
  ])

  const issues: string[] = []
  const accountByMapping = new Map(mappedAccounts.map((account) => [normalizeMappingKey(account.mappingKey), account]))

  for (const required of REQUIRED_ACCOUNTING_MAPPINGS) {
    const account = accountByMapping.get(required.key)

    if (!account) {
      issues.push(`Missing active ${required.label} mapping (${required.key})`)
      continue
    }

    if (account._count.children > 0) {
      issues.push(`Mapped account ${account.code} for ${required.key} must be a leaf account`)
    }

    if (account.type !== required.type) {
      issues.push(`Mapped account ${account.code} for ${required.key} must be ${required.type}`)
    }

    if (account.normalBalance !== required.normalBalance) {
      issues.push(`Mapped account ${account.code} for ${required.key} must have ${required.normalBalance} normal balance`)
    }

    if (normalizeSyscohadaClass(account.syscohadaClass) !== required.syscohadaClass) {
      issues.push(`Mapped account ${account.code} for ${required.key} must be SYSCOHADA class ${required.syscohadaClass}`)
    }

    if (!account.syscohadaReference?.trim()) {
      issues.push(`Mapped account ${account.code} for ${required.key} requires a SYSCOHADA reference`)
    }
  }

  const journalTypes = new Set(defaultJournals.map((journal) => journal.type))
  for (const requiredType of REQUIRED_DEFAULT_JOURNAL_TYPES) {
    if (!journalTypes.has(requiredType)) {
      issues.push(`Missing active default ${requiredType} journal`)
    }
  }

  if (openPeriods.length === 0) {
    issues.push("Accounting setup requires an open period covering today's date")
  }

  const validPostingPurposes = new Set(
    postingRules
      .filter((rule) => rule.lines.length >= 2 && rule.lines.every((line) => line.accountId || normalizeMappingKey(line.mappingKey)))
      .map((rule) => rule.postingPurpose),
  )

  for (const requiredPurpose of REQUIRED_READY_POSTING_PURPOSES) {
    if (!validPostingPurposes.has(requiredPurpose)) {
      issues.push(`Missing active balanced posting rule scaffold for ${requiredPurpose}`)
    }
  }

  return issues
}

export async function markAccountingSetupReady(
  organizationId: string,
  actorId?: string | null,
  control?: AccountingSetupControlContext,
) {
  const result = await db.$transaction(async (tx) => {
    const readinessIssues = await collectAccountingSetupReadinessIssues(organizationId, tx)

    if (readinessIssues.length > 0) {
      throw new BusinessRuleError(`Accounting setup is not ready: ${formatIssueList(readinessIssues)}`)
    }

    const controlDecision = evaluateSensitiveAction({
      action: "accounting.setup.lock",
      actorId,
      organizationId,
      actorPermissions: control?.actorPermissions ?? [],
      lastAuthAt: control?.lastAuthAt,
      now: control?.now,
      resourceType: "AccountingSetup",
      resourceId: organizationId,
      metadata: {
        requiredMappings: REQUIRED_ACCOUNTING_MAPPINGS.map((mapping) => mapping.key),
        requiredJournalTypes: REQUIRED_DEFAULT_JOURNAL_TYPES,
        requiredPostingPurposes: REQUIRED_READY_POSTING_PURPOSES,
      },
    })
    await auditSensitiveActionDecision(tx, controlDecision)
    if (!controlDecision.allowed) return { denied: controlDecision }

    const settings = await tx.organizationAccountingSettings.upsert({
      where: { organizationId },
      update: {
        accountingEnabled: true,
        setupStatus: "READY",
        setupCompletedAt: new Date(),
        setupCompletedById: actorId,
      },
      create: {
        organizationId,
        accountingEnabled: true,
        setupStatus: "READY",
        setupCompletedAt: new Date(),
        setupCompletedById: actorId,
      },
    })

    await settingsAudit(tx, {
      organizationId,
      actorId,
      action: "ACCOUNTING_SETUP_READY",
      message: "Accounting setup marked ready",
      metadata: {
        requiredMappings: REQUIRED_ACCOUNTING_MAPPINGS.map((mapping) => mapping.key),
        requiredJournalTypes: REQUIRED_DEFAULT_JOURNAL_TYPES,
        requiredPostingPurposes: REQUIRED_READY_POSTING_PURPOSES,
      },
    })

    return { value: settings }
  })

  if (result.denied) {
    assertSensitiveActionAllowed(result.denied)
  }

  return result.value
}
