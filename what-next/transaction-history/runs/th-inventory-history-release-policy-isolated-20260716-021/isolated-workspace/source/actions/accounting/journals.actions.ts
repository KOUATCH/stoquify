"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  createManualJournalEntry,
  listJournalEntries,
  listJournals,
} from "@/services/accounting/journals.service"
import { postJournalEntry, reverseJournalEntry } from "@/services/accounting/posting.service"

const journalEntryStatuses = ["DRAFT", "POSTED", "REVERSED", "VOIDED"] as const

const listJournalsSchema = z.object({
  includeInactive: z.boolean().optional(),
}).optional()

const listJournalEntriesSchema = z.object({
  status: z.enum(journalEntryStatuses).optional(),
  journalId: z.string().optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
}).optional()

const amountInput = z.union([z.string(), z.number()]).optional()

const manualJournalLineSchema = z.object({
  accountId: z.string().min(1),
  description: z.string().trim().nullable().optional(),
  debit: amountInput,
  credit: amountInput,
  currency: z.string().trim().min(3).max(3).optional(),
  locationId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  itemId: z.string().nullable().optional(),
})

const createManualJournalEntrySchema = z.object({
  journalId: z.string().min(1),
  entryDate: z.coerce.date(),
  memo: z.string().trim().nullable().optional(),
  reference: z.string().trim().nullable().optional(),
  lines: z.array(manualJournalLineSchema).min(2),
})

const journalEntryIdSchema = z.object({
  journalEntryId: z.string().min(1),
})

const reverseJournalSchema = journalEntryIdSchema.extend({
  reason: z.string().trim().nullable().optional(),
  reversalDate: z.coerce.date().optional(),
})

function revalidateAccountingPaths() {
  revalidatePath("/dashboard/accounting", "page")
  revalidatePath("/dashboard/accounting/journals", "page")
  revalidatePath("/dashboard/accounting/journals/new", "page")
  revalidatePath("/dashboard/accounting/reports/trial-balance", "page")
}

const listJournalsProtected = protect<unknown, unknown>(
  { permission: "accounting.journal.read", auditResource: "Journal" },
  async (input, ctx) => {
    const parsed = listJournalsSchema.parse(input)
    return listJournals(ctx.orgId, parsed?.includeInactive ?? false)
  },
)

export async function listJournalsAction(input: unknown = {}) {
  return listJournalsProtected(input)
}

const listJournalEntriesProtected = protect<unknown, unknown>(
  { permission: "accounting.journal.read", auditResource: "JournalEntry" },
  async (input, ctx) => {
    const parsed = listJournalEntriesSchema.parse(input)
    return listJournalEntries(ctx.orgId, parsed ?? {})
  },
)

export async function listJournalEntriesAction(input: unknown = {}) {
  return listJournalEntriesProtected(input)
}

const createManualJournalProtected = protect<unknown, unknown>(
  { permission: "accounting.journal.create", auditResource: "JournalEntry" },
  async (input, ctx) => {
    const parsed = createManualJournalEntrySchema.parse(input)
    const entry = await createManualJournalEntry(ctx.orgId, parsed, ctx.userId)
    revalidateAccountingPaths()
    return entry
  },
)

export async function createManualJournalEntryAction(input: unknown) {
  return createManualJournalProtected(input)
}

const postJournalProtected = protect<unknown, unknown>(
  { permission: "accounting.journal.post", auditResource: "JournalEntry", freshAuth: true },
  async (input, ctx) => {
    const parsed = journalEntryIdSchema.parse(input)
    const entry = await postJournalEntry(ctx.orgId, parsed.journalEntryId, ctx.userId, {
      actorPermissions: ctx.permissions,
      lastAuthAt: Date.now(),
    })
    revalidateAccountingPaths()
    return entry
  },
)

export async function postJournalEntryAction(input: unknown) {
  return postJournalProtected(input)
}

const reverseJournalProtected = protect<unknown, unknown>(
  { permission: "accounting.journal.reverse", auditResource: "JournalEntry", freshAuth: true },
  async (input, ctx) => {
    const parsed = reverseJournalSchema.parse(input)
    const entry = await reverseJournalEntry(
      ctx.orgId,
      parsed.journalEntryId,
      ctx.userId,
      parsed.reason,
      parsed.reversalDate,
      {
        actorPermissions: ctx.permissions,
        lastAuthAt: Date.now(),
      },
    )
    revalidateAccountingPaths()
    return entry
  },
)

export async function reverseJournalEntryAction(input: unknown) {
  return reverseJournalProtected(input)
}
