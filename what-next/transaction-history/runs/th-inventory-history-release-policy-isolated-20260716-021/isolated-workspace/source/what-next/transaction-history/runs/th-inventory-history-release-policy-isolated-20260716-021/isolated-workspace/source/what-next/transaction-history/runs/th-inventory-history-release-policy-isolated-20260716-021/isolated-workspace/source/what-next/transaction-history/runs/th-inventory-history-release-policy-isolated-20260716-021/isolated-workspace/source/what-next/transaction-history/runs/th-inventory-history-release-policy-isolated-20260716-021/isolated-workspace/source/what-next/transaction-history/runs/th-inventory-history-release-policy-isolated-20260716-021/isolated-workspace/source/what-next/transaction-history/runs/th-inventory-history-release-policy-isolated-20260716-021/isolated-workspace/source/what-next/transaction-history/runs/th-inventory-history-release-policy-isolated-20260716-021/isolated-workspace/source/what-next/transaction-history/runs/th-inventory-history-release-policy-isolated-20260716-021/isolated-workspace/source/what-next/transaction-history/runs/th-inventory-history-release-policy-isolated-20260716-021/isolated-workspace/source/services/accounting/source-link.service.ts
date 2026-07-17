import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"

export type AccountingSourceLinkInput = {
  organizationId: string
  postingBatchId: string
  journalEntryId?: string | null
  sourceType: AccountingSourceType
  sourceId: string
  sourceNumber?: string | null
  sourceDate?: Date | null
  metadata?: Prisma.InputJsonValue | null
}

export type AccountingSourceLinkOptions = {
  actorId?: string | null
  audit?: boolean
  verifyPostingBatch?: boolean
  verifyJournalEntry?: boolean
}

const sourceLinkInclude = {
  postingBatch: true,
  journalEntry: {
    include: {
      journal: true,
      period: true,
    },
  },
} satisfies Prisma.AccountingSourceLinkInclude

function sourceLinkAudit(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    postingBatchId: string
    journalEntryId?: string | null
    resourceId?: string | null
    message: string
    metadata?: Prisma.InputJsonValue
  },
) {
  return tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: "ACCOUNTING_SOURCE_LINK_CREATE",
      resourceType: "AccountingSourceLink",
      resourceId: params.resourceId,
      postingBatchId: params.postingBatchId,
      journalEntryId: params.journalEntryId,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

async function verifyPostingBatch(
  input: AccountingSourceLinkInput,
  tx: Prisma.TransactionClient | typeof db,
) {
  const batch = await tx.ledgerPostingBatch.findFirst({
    where: { id: input.postingBatchId, organizationId: input.organizationId },
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      postingPurpose: true,
      status: true,
    },
  })

  if (!batch) throw new NotFoundError("Ledger posting batch not found")
  if (batch.sourceType !== input.sourceType || batch.sourceId !== input.sourceId) {
    throw new BusinessRuleError("Source link does not match the posting batch source")
  }

  return batch
}

async function verifyJournalEntry(
  input: AccountingSourceLinkInput,
  tx: Prisma.TransactionClient | typeof db,
) {
  if (!input.journalEntryId) return null

  const journalEntry = await tx.journalEntry.findFirst({
    where: { id: input.journalEntryId, organizationId: input.organizationId },
    select: {
      id: true,
      entryNumber: true,
      status: true,
      postingBatchId: true,
    },
  })

  if (!journalEntry) throw new NotFoundError("Journal entry not found for source link")
  if (journalEntry.postingBatchId && journalEntry.postingBatchId !== input.postingBatchId) {
    throw new BusinessRuleError("Source link journal entry belongs to a different posting batch")
  }

  return journalEntry
}

export async function createAccountingSourceLink(
  input: AccountingSourceLinkInput,
  tx: Prisma.TransactionClient | typeof db = db,
  options: AccountingSourceLinkOptions = {},
) {
  const verifyBatch = options.verifyPostingBatch ?? true
  const verifyEntry = options.verifyJournalEntry ?? true
  const audit = options.audit ?? true

  if (verifyBatch) await verifyPostingBatch(input, tx)
  if (verifyEntry) await verifyJournalEntry(input, tx)

  const existing = await tx.accountingSourceLink.findFirst({
    where: {
      organizationId: input.organizationId,
      postingBatchId: input.postingBatchId,
      journalEntryId: input.journalEntryId || null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    include: sourceLinkInclude,
  })

  if (existing) return existing

  const link = await tx.accountingSourceLink.create({
    data: {
      organizationId: input.organizationId,
      postingBatchId: input.postingBatchId,
      journalEntryId: input.journalEntryId || null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceNumber: input.sourceNumber || null,
      sourceDate: input.sourceDate || null,
      metadata: input.metadata ?? undefined,
    },
    include: sourceLinkInclude,
  })

  if (audit) {
    await sourceLinkAudit(tx as Prisma.TransactionClient, {
      organizationId: input.organizationId,
      actorId: options.actorId,
      postingBatchId: input.postingBatchId,
      journalEntryId: input.journalEntryId || null,
      resourceId: link.id,
      message: `Accounting source ${input.sourceType}/${input.sourceId} linked`,
      metadata: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceNumber: input.sourceNumber || null,
      },
    })
  }

  return link
}

export async function getSourceTrace(
  organizationId: string,
  input: {
    sourceType: AccountingSourceType
    sourceId: string
  },
  tx: Prisma.TransactionClient | typeof db = db,
) {
  return tx.accountingSourceLink.findMany({
    where: {
      organizationId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    include: sourceLinkInclude,
    orderBy: { createdAt: "asc" },
  })
}

export async function listPostingBatchSourceLinks(
  organizationId: string,
  postingBatchId: string,
  tx: Prisma.TransactionClient | typeof db = db,
) {
  return tx.accountingSourceLink.findMany({
    where: { organizationId, postingBatchId },
    include: sourceLinkInclude,
    orderBy: { createdAt: "asc" },
  })
}

export async function assertSourceTraceComplete(
  organizationId: string,
  input: {
    sourceType: AccountingSourceType
    sourceId: string
    postingPurpose?: AccountingPostingPurpose
  },
  tx: Prisma.TransactionClient | typeof db = db,
) {
  const links = await getSourceTrace(organizationId, input, tx)

  if (links.length === 0) {
    throw new BusinessRuleError(`No accounting source trace found for ${input.sourceType}/${input.sourceId}`)
  }

  const completeLinks = links.filter((link) => {
    const batchMatchesPurpose =
      !input.postingPurpose || link.postingBatch.postingPurpose === input.postingPurpose
    const batchIsPosted = link.postingBatch.status === LedgerPostingBatchStatus.POSTED
    const entryIsPosted =
      !link.journalEntry ||
      link.journalEntry.status === JournalEntryStatus.POSTED ||
      link.journalEntry.status === JournalEntryStatus.REVERSED

    return batchMatchesPurpose && batchIsPosted && Boolean(link.journalEntryId) && entryIsPosted
  })

  if (completeLinks.length === 0) {
    throw new BusinessRuleError(`Accounting source trace is incomplete for ${input.sourceType}/${input.sourceId}`)
  }

  return completeLinks
}
