import { Prisma, SuspenseStatus } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { suspenseEvidenceRevision, suspenseMetadata, suspensePostingDate, suspensePostingCycle } from "./payment-suspense-evidence"
import type { PaymentReconciliationDashboardData } from "./payment-reconciliation-dashboard.service"

export const suspenseReadSchema = z.object({
  itemId: z.string().min(1).max(191).optional(),
  cursor: z.object({ createdAt: z.string().datetime(), id: z.string().min(1).max(191) }).strict().nullable().optional(),
}).strict().refine(value => !value.itemId || !value.cursor, "Choose a record or a history page")
export type SuspenseReadInput = z.infer<typeof suspenseReadSchema>
export type SuspenseReadPage = { items: PaymentReconciliationDashboardData["suspenseQueue"]; nextCursor: NonNullable<SuspenseReadInput["cursor"]> | null; asOf: string }

const selection = {
  id: true, organizationId: true, providerAccountId: true, reconciliationRunId: true,
  status: true, severity: true, type: true, amount: true, currencyCode: true, slaDeadline: true,
  correlationId: true, ownerId: true, suspenseLedgerAccountId: true, ledgerPostingBatchId: true,
  resolutionNotes: true, postedAt: true, createdAt: true, updatedAt: true, metadata: true,
  reconciliationRun: { select: { organizationId: true, businessDate: true } },
  providerAccount: { select: { organizationId: true, suspenseLedgerAccountId: true } },
  paymentExceptions: { select: { id: true, organizationId: true }, take: 1 },
} satisfies Prisma.SuspenseItemSelect
type Row = Prisma.SuspenseItemGetPayload<{ select: typeof selection }>

async function present(organizationId: string, rows: Row[], now: Date): Promise<SuspenseReadPage["items"]> {
  for (const row of rows) {
    if (row.organizationId !== organizationId || (row.providerAccount && row.providerAccount.organizationId !== organizationId)
      || (row.reconciliationRun && row.reconciliationRun.organizationId !== organizationId)) throw new ConflictError("Suspense source scope requires review.")
  }
  const accountIds = rows.map(row => row.suspenseLedgerAccountId ?? row.providerAccount?.suspenseLedgerAccountId).filter((id): id is string => !!id)
  const [accounts, journals] = await Promise.all([
    accountIds.length ? db.chartOfAccount.findMany({ where: { organizationId, id: { in: accountIds } }, select: { id: true, code: true, nameEn: true, nameFr: true } }) : [],
    rows.length ? db.journalEntry.findMany({ where: { organizationId, sourceType: "PAYMENT_SUSPENSE", sourceId: { in: rows.map(row => row.id) }, postingPurpose: "SUSPENSE_RECLASSIFICATION", reversalOfEntryId: null, status: { in: ["POSTED", "REVERSED"] }, postingBatch: { organizationId, sourceType: "PAYMENT_SUSPENSE", postingPurpose: "SUSPENSE_RECLASSIFICATION" } }, select: { id: true, sourceId: true, postingBatchId: true, entryDate: true, entryNumber: true, status: true } }) : [],
  ])
  return rows.map(row => {
    const accountId = row.suspenseLedgerAccountId ?? row.providerAccount?.suspenseLedgerAccountId ?? null
    const account = accounts.find(value => value.id === accountId)
    const matches = journals.filter(value => value.sourceId === row.id && value.postingBatchId === row.ledgerPostingBatchId)
    const journal = matches.length === 1 ? matches[0] : null
    const historical = !!row.postedAt || !!row.ledgerPostingBatchId || ["POSTED_TO_SUSPENSE", "RESOLVED", "WRITTEN_OFF"].includes(row.status)
    const maker = suspenseMetadata(suspenseMetadata(row.metadata).reclassification).proposedById
    return {
      id: row.id, evidenceRevision: suspenseEvidenceRevision(row, row.postedAt ?? now),
      postingDate: historical ? journal?.entryDate.toISOString() ?? null : suspensePostingDate(row, now).toISOString(),
      providerAccountId: row.providerAccountId, status: row.status, severity: row.severity, type: row.type,
      amount: row.amount.toNumber(), currencyCode: row.currencyCode, slaDeadline: row.slaDeadline?.toISOString() ?? null,
      correlationId: row.correlationId, ownerId: row.ownerId,
      exceptionId: row.paymentExceptions.find(value => value.organizationId === organizationId)?.id ?? null,
      suspenseLedgerAccountId: accountId, suspenseAccount: account ?? null,
      ledgerPostingBatchId: row.ledgerPostingBatchId, journal: journal ? { id: journal.id, number: journal.entryNumber, status: journal.status } : null,
      resolutionNotes: row.resolutionNotes, proposedById: typeof maker === "string" ? maker : null,
      correctionProposalId: typeof suspenseMetadata(row.metadata).correctionProposalId === "string" ? String(suspenseMetadata(row.metadata).correctionProposalId) : null,
      postingCycle: suspensePostingCycle(row)?.number ?? 1,
      postedAt: row.postedAt?.toISOString() ?? null,
    }
  })
}

export async function getSuspenseWorkQueue(organizationId: string, now = new Date()) {
  const rows = await db.suspenseItem.findMany({ where: { organizationId, status: { in: [SuspenseStatus.OPEN, SuspenseStatus.ASSIGNED, SuspenseStatus.IN_REVIEW, SuspenseStatus.POSTED_TO_SUSPENSE, SuspenseStatus.RESOLUTION_PROPOSED, SuspenseStatus.REOPENED] } }, orderBy: [{ severity: "desc" }, { slaDeadline: "asc" }, { createdAt: "desc" }, { id: "desc" }], take: 25, select: selection })
  return present(organizationId, rows, now)
}

// Read-only history: no notification delivery or business mutation on discovery/recovery.
export async function readPaymentSuspenseRecords(organizationId: string, input: SuspenseReadInput): Promise<SuspenseReadPage> {
  const parsed = suspenseReadSchema.parse(input), now = new Date()
  const rows = await db.suspenseItem.findMany({
    where: { organizationId, ...(parsed.itemId ? { id: parsed.itemId } : {}), ...(parsed.cursor ? { OR: [{ createdAt: { lt: new Date(parsed.cursor.createdAt) } }, { createdAt: new Date(parsed.cursor.createdAt), id: { lt: parsed.cursor.id } }] } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: parsed.itemId ? 1 : 26, select: selection,
  })
  if (parsed.itemId && !rows.length) throw new NotFoundError("Suspense record is unavailable in this workspace.")
  const page = rows.slice(0, 25), last = page.at(-1)
  return { items: await present(organizationId, page, now), nextCursor: rows.length > 25 && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null, asOf: now.toISOString() }
}
