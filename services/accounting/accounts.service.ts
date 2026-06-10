import { ChartAccountNormalBalance, ChartAccountType, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"

export type AccountCreateInput = {
  code: string
  nameEn: string
  nameFr?: string | null
  descriptionEn?: string | null
  descriptionFr?: string | null
  type: ChartAccountType
  normalBalance: ChartAccountNormalBalance
  parentId?: string | null
  isControlAccount?: boolean
  allowManualPost?: boolean
  mappingKey?: string | null
  syscohadaClass?: string | null
  syscohadaReference?: string | null
  currency?: string | null
}

export type AccountUpdateInput = Partial<AccountCreateInput> & {
  isActive?: boolean
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

function normalizeMappingKey(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed || null
}

function normalizeOptionalCurrency(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function changed<T>(next: T | undefined, current: T) {
  return next !== undefined && next !== current
}

async function assertParentBelongsToOrg(
  organizationId: string,
  parentId?: string | null,
  tx: Prisma.TransactionClient | typeof db = db,
) {
  if (!parentId) return

  const parent = await tx.chartOfAccount.findFirst({
    where: { id: parentId, organizationId, deletedAt: null },
    select: { id: true },
  })

  if (!parent) {
    throw new Error("Parent account was not found in this organization")
  }
}

function accountAudit(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    action: string
    resourceId?: string | null
    message: string
    metadata?: Prisma.InputJsonValue
  },
) {
  return tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      resourceType: "ChartOfAccount",
      resourceId: params.resourceId,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

export async function listChartAccounts(organizationId: string, includeInactive = false) {
  return db.chartOfAccount.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      parent: { select: { id: true, code: true, nameEn: true, nameFr: true } },
      _count: { select: { children: true, journalLines: true } },
    },
    orderBy: [{ code: "asc" }],
  })
}

export async function createChartAccount(
  organizationId: string,
  input: AccountCreateInput,
  actorId?: string | null,
) {
  await assertParentBelongsToOrg(organizationId, input.parentId)

  return db.$transaction(async (tx) => {
    const account = await tx.chartOfAccount.create({
      data: {
        organizationId,
        code: normalizeCode(input.code),
        nameEn: input.nameEn.trim(),
        nameFr: input.nameFr?.trim() || null,
        descriptionEn: input.descriptionEn?.trim() || null,
        descriptionFr: input.descriptionFr?.trim() || null,
        type: input.type,
        normalBalance: input.normalBalance,
        parentId: input.parentId || null,
        isControlAccount: input.isControlAccount ?? false,
        allowManualPost: input.allowManualPost ?? true,
        mappingKey: normalizeMappingKey(input.mappingKey),
        syscohadaClass: input.syscohadaClass?.trim() || null,
        syscohadaReference: input.syscohadaReference?.trim() || null,
        currency: input.currency?.trim().toUpperCase() || null,
      },
    })

    await accountAudit(tx, {
      organizationId,
      actorId,
      action: "CHART_ACCOUNT_CREATE",
      resourceId: account.id,
      message: `Chart account ${account.code} created`,
      metadata: { code: account.code, type: account.type },
    })

    return account
  })
}

export async function updateChartAccount(
  organizationId: string,
  accountId: string,
  input: AccountUpdateInput,
  actorId?: string | null,
) {
  const existing = await db.chartOfAccount.findFirst({
    where: { id: accountId, organizationId, deletedAt: null },
    select: {
      id: true,
      code: true,
      type: true,
      normalBalance: true,
      parentId: true,
      isControlAccount: true,
      mappingKey: true,
      syscohadaClass: true,
      syscohadaReference: true,
      currency: true,
      _count: { select: { journalLines: true } },
    },
  })

  if (!existing) throw new NotFoundError("Chart account not found")
  await assertParentBelongsToOrg(organizationId, input.parentId)

  if (existing._count.journalLines > 0) {
    const structuralChanges = [
      changed(input.code !== undefined ? normalizeCode(input.code) : undefined, existing.code) ? "code" : null,
      changed(input.type, existing.type) ? "type" : null,
      changed(input.normalBalance, existing.normalBalance) ? "normal balance" : null,
      changed(input.parentId !== undefined ? input.parentId || null : undefined, existing.parentId) ? "parent account" : null,
      changed(input.isControlAccount, existing.isControlAccount) ? "control-account flag" : null,
      changed(input.mappingKey !== undefined ? normalizeMappingKey(input.mappingKey) : undefined, existing.mappingKey) ? "mapping key" : null,
      changed(input.syscohadaClass !== undefined ? normalizeOptionalText(input.syscohadaClass) : undefined, existing.syscohadaClass) ? "SYSCOHADA class" : null,
      changed(input.syscohadaReference !== undefined ? normalizeOptionalText(input.syscohadaReference) : undefined, existing.syscohadaReference) ? "SYSCOHADA reference" : null,
      changed(input.currency !== undefined ? normalizeOptionalCurrency(input.currency) : undefined, existing.currency) ? "currency" : null,
    ].filter(Boolean)

    if (structuralChanges.length > 0) {
      throw new BusinessRuleError(
        `Cannot change structural fields after journal activity exists. Create a new account and remap future postings instead: ${structuralChanges.join(", ")}`,
      )
    }
  }

  return db.$transaction(async (tx) => {
    const account = await tx.chartOfAccount.update({
      where: { id: accountId },
      data: {
        ...(input.code !== undefined ? { code: normalizeCode(input.code) } : {}),
        ...(input.nameEn !== undefined ? { nameEn: input.nameEn.trim() } : {}),
        ...(input.nameFr !== undefined ? { nameFr: input.nameFr?.trim() || null } : {}),
        ...(input.descriptionEn !== undefined ? { descriptionEn: input.descriptionEn?.trim() || null } : {}),
        ...(input.descriptionFr !== undefined ? { descriptionFr: input.descriptionFr?.trim() || null } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.normalBalance !== undefined ? { normalBalance: input.normalBalance } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId || null } : {}),
        ...(input.isControlAccount !== undefined ? { isControlAccount: input.isControlAccount } : {}),
        ...(input.allowManualPost !== undefined ? { allowManualPost: input.allowManualPost } : {}),
        ...(input.mappingKey !== undefined ? { mappingKey: normalizeMappingKey(input.mappingKey) } : {}),
        ...(input.syscohadaClass !== undefined ? { syscohadaClass: normalizeOptionalText(input.syscohadaClass) } : {}),
        ...(input.syscohadaReference !== undefined
          ? { syscohadaReference: normalizeOptionalText(input.syscohadaReference) }
          : {}),
        ...(input.currency !== undefined ? { currency: normalizeOptionalCurrency(input.currency) } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    })

    await accountAudit(tx, {
      organizationId,
      actorId,
      action: "CHART_ACCOUNT_UPDATE",
      resourceId: account.id,
      message: `Chart account ${account.code} updated`,
      metadata: { code: account.code, type: account.type },
    })

    return account
  })
}

export async function archiveChartAccount(
  organizationId: string,
  accountId: string,
  actorId?: string | null,
) {
  const [account, lineCount, childCount] = await Promise.all([
    db.chartOfAccount.findFirst({ where: { id: accountId, organizationId, deletedAt: null } }),
    db.journalEntryLine.count({ where: { organizationId, accountId } }),
    db.chartOfAccount.count({ where: { organizationId, parentId: accountId, deletedAt: null } }),
  ])

  if (!account) throw new Error("Chart account not found")
  if (childCount > 0) throw new Error("Cannot archive an account that has child accounts")

  return db.$transaction(async (tx) => {
    const archived = await tx.chartOfAccount.update({
      where: { id: accountId },
      data: lineCount > 0 ? { isActive: false, deletedAt: new Date() } : { deletedAt: new Date() },
    })

    await accountAudit(tx, {
      organizationId,
      actorId,
      action: "CHART_ACCOUNT_ARCHIVE",
      resourceId: archived.id,
      message: `Chart account ${archived.code} archived`,
      metadata: { lineCount },
    })

    return archived
  })
}
