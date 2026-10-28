import {
  AccountingPostingPurpose,
  AccountingSourceType,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"

export type PostingRuleLineInput = {
  lineNumber?: number
  side: PostingRuleLineSide
  accountId?: string | null
  mappingKey?: string | null
  amountSource: PostingRuleAmountSource
  multiplier?: Prisma.Decimal | number | string | null
  condition?: Prisma.InputJsonValue | null
  description?: string | null
  dimensions?: Prisma.InputJsonValue | null
}

export type PostingRuleWriteInput = {
  code: string
  nameEn: string
  nameFr?: string | null
  descriptionEn?: string | null
  descriptionFr?: string | null
  sourceType: AccountingSourceType
  postingPurpose: AccountingPostingPurpose
  priority?: number
  effectiveFrom?: Date | null
  effectiveTo?: Date | null
  isActive?: boolean
  lines: PostingRuleLineInput[]
}

export type PostingRuleUpdateInput = Partial<Omit<PostingRuleWriteInput, "lines">> & {
  lines?: PostingRuleLineInput[]
}

const postingRuleInclude = {
  lines: {
    include: {
      account: {
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameFr: true,
          mappingKey: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { lineNumber: "asc" },
  },
} satisfies Prisma.PostingRuleInclude

function normalizeCode(value: string) {
  return value.trim().toUpperCase()
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed || null
}

function normalizeMappingKey(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function toMultiplier(value: PostingRuleLineInput["multiplier"]) {
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(1)
  return new Prisma.Decimal(value).toDecimalPlaces(4)
}

function postingRuleAudit(
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
      resourceType: "PostingRule",
      resourceId: params.resourceId,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

function prepareRuleLines(lines: PostingRuleLineInput[]) {
  return lines.map((line, index) => ({
    lineNumber: line.lineNumber ?? index + 1,
    side: line.side,
    accountId: line.accountId || null,
    mappingKey: normalizeMappingKey(line.mappingKey),
    amountSource: line.amountSource,
    multiplier: toMultiplier(line.multiplier),
    condition: line.condition ?? undefined,
    description: normalizeOptionalText(line.description),
    dimensions: line.dimensions ?? undefined,
  }))
}

export async function validatePostingRuleLines(
  organizationId: string,
  lines: PostingRuleLineInput[],
  tx: Prisma.TransactionClient | typeof db = db,
) {
  if (lines.length < 2) {
    throw new BusinessRuleError("Posting rule requires at least two lines")
  }

  const prepared = prepareRuleLines(lines)
  const lineNumbers = new Set<number>()
  let hasDebit = false
  let hasCredit = false

  for (const line of prepared) {
    if (line.lineNumber < 1) throw new BusinessRuleError("Posting rule line numbers must be positive")
    if (lineNumbers.has(line.lineNumber)) {
      throw new BusinessRuleError(`Posting rule line number ${line.lineNumber} is duplicated`)
    }
    lineNumbers.add(line.lineNumber)

    if (line.side === PostingRuleLineSide.DEBIT) hasDebit = true
    if (line.side === PostingRuleLineSide.CREDIT) hasCredit = true

    const hasAccount = Boolean(line.accountId)
    const hasMapping = Boolean(line.mappingKey)
    if (hasAccount === hasMapping) {
      throw new BusinessRuleError("Each posting rule line must reference exactly one account or mapping key")
    }

    if (line.multiplier.eq(0)) {
      throw new BusinessRuleError("Posting rule line multiplier cannot be zero")
    }
  }

  if (!hasDebit || !hasCredit) {
    throw new BusinessRuleError("Posting rule must include both debit and credit lines")
  }

  const accountIds = prepared.map((line) => line.accountId).filter(Boolean) as string[]
  const mappingKeys = prepared.map((line) => line.mappingKey).filter(Boolean) as string[]

  if (accountIds.length > 0) {
    const accounts = await tx.chartOfAccount.findMany({
      where: { organizationId, id: { in: Array.from(new Set(accountIds)) }, deletedAt: null },
      include: { _count: { select: { children: true } } },
    })
    const accountById = new Map(accounts.map((account) => [account.id, account]))

    for (const accountId of accountIds) {
      const account = accountById.get(accountId)
      if (!account) throw new BusinessRuleError(`Posting rule account ${accountId} was not found`)
      if (!account.isActive) throw new BusinessRuleError(`Posting rule account ${account.code} is inactive`)
      if (account._count.children > 0) {
        throw new BusinessRuleError(`Posting rule account ${account.code} must be a leaf account`)
      }
    }
  }

  if (mappingKeys.length > 0) {
    const mappedAccounts = await tx.chartOfAccount.findMany({
      where: {
        organizationId,
        mappingKey: { in: Array.from(new Set(mappingKeys)) },
        deletedAt: null,
        isActive: true,
      },
      include: { _count: { select: { children: true } } },
    })
    const accountByMapping = new Map(mappedAccounts.map((account) => [normalizeMappingKey(account.mappingKey), account]))

    for (const mappingKey of mappingKeys) {
      const account = accountByMapping.get(mappingKey)
      if (!account) {
        throw new BusinessRuleError(`Posting rule mapping ${mappingKey} does not resolve to an active account`)
      }
      if (account._count.children > 0) {
        throw new BusinessRuleError(`Posting rule mapping ${mappingKey} resolves to non-leaf account ${account.code}`)
      }
    }
  }

  return prepared
}

export async function listPostingRules(
  organizationId: string,
  input: {
    sourceType?: AccountingSourceType
    postingPurpose?: AccountingPostingPurpose
    includeInactive?: boolean
  } = {},
) {
  return db.postingRule.findMany({
    where: {
      organizationId,
      ...(input.sourceType ? { sourceType: input.sourceType } : {}),
      ...(input.postingPurpose ? { postingPurpose: input.postingPurpose } : {}),
      ...(input.includeInactive ? {} : { isActive: true }),
    },
    include: postingRuleInclude,
    orderBy: [{ sourceType: "asc" }, { postingPurpose: "asc" }, { priority: "asc" }, { code: "asc" }],
  })
}

export async function getActivePostingRule(
  organizationId: string,
  input: {
    sourceType: AccountingSourceType
    postingPurpose: AccountingPostingPurpose
    effectiveAt?: Date
  },
  tx: Prisma.TransactionClient | typeof db = db,
) {
  const effectiveAt = input.effectiveAt ?? new Date()
  const rule = await tx.postingRule.findFirst({
    where: {
      organizationId,
      sourceType: input.sourceType,
      postingPurpose: input.postingPurpose,
      isActive: true,
      AND: [
        { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: effectiveAt } }] },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveAt } }] },
      ],
    },
    include: postingRuleInclude,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  })

  if (!rule) return null

  await validatePostingRuleLines(organizationId, rule.lines, tx)
  return rule
}

export async function requireActivePostingRule(
  organizationId: string,
  input: {
    sourceType: AccountingSourceType
    postingPurpose: AccountingPostingPurpose
    effectiveAt?: Date
  },
  tx: Prisma.TransactionClient | typeof db = db,
) {
  const rule = await getActivePostingRule(organizationId, input, tx)
  if (!rule) {
    throw new NotFoundError(`No active posting rule found for ${input.sourceType}/${input.postingPurpose}`)
  }
  return rule
}

export async function createPostingRule(
  organizationId: string,
  input: PostingRuleWriteInput,
  actorId?: string | null,
) {
  return db.$transaction(async (tx) => {
    const lines = await validatePostingRuleLines(organizationId, input.lines, tx)
    const rule = await tx.postingRule.create({
      data: {
        organizationId,
        code: normalizeCode(input.code),
        nameEn: input.nameEn.trim(),
        nameFr: normalizeOptionalText(input.nameFr),
        descriptionEn: normalizeOptionalText(input.descriptionEn),
        descriptionFr: normalizeOptionalText(input.descriptionFr),
        sourceType: input.sourceType,
        postingPurpose: input.postingPurpose,
        priority: input.priority ?? 100,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveTo: input.effectiveTo ?? null,
        isActive: input.isActive ?? true,
        lines: {
          create: lines.map((line) => ({
            organizationId,
            ...line,
          })),
        },
      },
      include: postingRuleInclude,
    })

    await postingRuleAudit(tx, {
      organizationId,
      actorId,
      action: "POSTING_RULE_CREATE",
      resourceId: rule.id,
      message: `Posting rule ${rule.code} created`,
      metadata: { sourceType: rule.sourceType, postingPurpose: rule.postingPurpose, lineCount: rule.lines.length },
    })

    return rule
  })
}

export async function updatePostingRule(
  organizationId: string,
  ruleId: string,
  input: PostingRuleUpdateInput,
  actorId?: string | null,
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.postingRule.findFirst({
      where: { id: ruleId, organizationId },
      select: { id: true, code: true },
    })

    if (!existing) throw new NotFoundError("Posting rule not found")

    const nextLines = input.lines ? await validatePostingRuleLines(organizationId, input.lines, tx) : null

    if (nextLines) {
      await tx.postingRuleLine.deleteMany({ where: { postingRuleId: ruleId, organizationId } })
    }

    const rule = await tx.postingRule.update({
      where: { id: ruleId },
      data: {
        ...(input.code !== undefined ? { code: normalizeCode(input.code) } : {}),
        ...(input.nameEn !== undefined ? { nameEn: input.nameEn.trim() } : {}),
        ...(input.nameFr !== undefined ? { nameFr: normalizeOptionalText(input.nameFr) } : {}),
        ...(input.descriptionEn !== undefined ? { descriptionEn: normalizeOptionalText(input.descriptionEn) } : {}),
        ...(input.descriptionFr !== undefined ? { descriptionFr: normalizeOptionalText(input.descriptionFr) } : {}),
        ...(input.sourceType !== undefined ? { sourceType: input.sourceType } : {}),
        ...(input.postingPurpose !== undefined ? { postingPurpose: input.postingPurpose } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.effectiveFrom !== undefined ? { effectiveFrom: input.effectiveFrom } : {}),
        ...(input.effectiveTo !== undefined ? { effectiveTo: input.effectiveTo } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(nextLines
          ? {
              lines: {
                create: nextLines.map((line) => ({
                  organizationId,
                  ...line,
                })),
              },
            }
          : {}),
      },
      include: postingRuleInclude,
    })

    await postingRuleAudit(tx, {
      organizationId,
      actorId,
      action: "POSTING_RULE_UPDATE",
      resourceId: rule.id,
      message: `Posting rule ${rule.code} updated`,
      metadata: { sourceType: rule.sourceType, postingPurpose: rule.postingPurpose, lineCount: rule.lines.length },
    })

    return rule
  })
}

export async function archivePostingRule(
  organizationId: string,
  ruleId: string,
  actorId?: string | null,
) {
  return db.$transaction(async (tx) => {
    const rule = await tx.postingRule.findFirst({ where: { id: ruleId, organizationId } })
    if (!rule) throw new NotFoundError("Posting rule not found")

    const archived = await tx.postingRule.update({
      where: { id: ruleId },
      data: { isActive: false },
      include: postingRuleInclude,
    })

    await postingRuleAudit(tx, {
      organizationId,
      actorId,
      action: "POSTING_RULE_ARCHIVE",
      resourceId: archived.id,
      message: `Posting rule ${archived.code} archived`,
      metadata: { sourceType: archived.sourceType, postingPurpose: archived.postingPurpose },
    })

    return archived
  })
}
