import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { DEFAULT_POS_POSTING_RULES, type DefaultPostingRuleTemplate } from "./default-posting-rules"
import { validatePostingRuleLines } from "./posting-rules.service"

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

function defaultPostingRuleAudit(
  tx: Prisma.TransactionClient | typeof db,
  params: {
    organizationId: string
    actorId?: string | null
    resourceId?: string | null
    message: string
    metadata?: Prisma.InputJsonValue
  },
) {
  return tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: "DEFAULT_POS_POSTING_RULE_ENSURE",
      resourceType: "PostingRule",
      resourceId: params.resourceId,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

async function createDefaultPostingRule(
  organizationId: string,
  template: DefaultPostingRuleTemplate,
  actorId: string | null | undefined,
  tx: Prisma.TransactionClient | typeof db,
) {
  const lines = await validatePostingRuleLines(organizationId, template.lines, tx)
  const created = await tx.postingRule.create({
    data: {
      organizationId,
      code: template.code,
      nameEn: template.nameEn,
      nameFr: template.nameFr,
      descriptionEn: template.descriptionEn,
      descriptionFr: template.descriptionFr,
      sourceType: template.sourceType,
      postingPurpose: template.postingPurpose,
      priority: template.priority,
      isActive: true,
      lines: {
        create: lines.map((line) => ({
          organizationId,
          ...line,
        })),
      },
    },
    include: postingRuleInclude,
  })

  await defaultPostingRuleAudit(tx, {
    organizationId,
    actorId,
    resourceId: created.id,
    message: `Default POS posting rule ${created.code} ensured`,
    metadata: {
      sourceType: created.sourceType,
      postingPurpose: created.postingPurpose,
      lineCount: created.lines.length,
    },
  })

  return created
}

export async function ensureDefaultPOSPostingRules(
  organizationId: string,
  actorId?: string | null,
  tx: Prisma.TransactionClient | typeof db = db,
) {
  const ensured = []

  for (const template of DEFAULT_POS_POSTING_RULES) {
    const existing = await tx.postingRule.findFirst({
      where: {
        organizationId,
        code: template.code,
      },
      include: postingRuleInclude,
    })

    if (existing) {
      await validatePostingRuleLines(organizationId, existing.lines, tx)
      ensured.push(existing)
      continue
    }

    ensured.push(await createDefaultPostingRule(organizationId, template, actorId, tx))
  }

  return ensured
}
