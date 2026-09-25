/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { readPaymentSuspenseRecords, suspenseReadSchema } from "../payment-suspense-read.service"
jest.mock("@/prisma/db", () => ({ db: { suspenseItem: { findMany: jest.fn() }, chartOfAccount: { findMany: jest.fn() }, journalEntry: { findMany: jest.fn() } } }))
const row = { id: "item-1", organizationId: "org-1", providerAccountId: null, reconciliationRunId: null, status: "POSTED_TO_SUSPENSE", severity: "MEDIUM", type: "UNKNOWN_CREDIT", amount: new Prisma.Decimal("100.25"), currencyCode: "XAF", ownerId: null, suspenseLedgerAccountId: "account-1", ledgerPostingBatchId: "batch-1", resolutionNotes: "Source reason", postedAt: new Date("2026-09-01T10:00:00Z"), createdAt: new Date("2026-08-30T12:00:00Z"), updatedAt: new Date("2026-09-01T10:00:00Z"), metadata: {}, providerAccount: null, reconciliationRun: null, paymentExceptions: [], slaDeadline: null, correlationId: null }
beforeEach(() => {
  jest.resetAllMocks()
  ;(db.suspenseItem.findMany as jest.Mock).mockResolvedValue([row])
  ;(db.chartOfAccount.findMany as jest.Mock).mockResolvedValue([{ id: "account-1", code: "471", nameEn: "Suspense", nameFr: "Attente" }])
  ;(db.journalEntry.findMany as jest.Mock).mockResolvedValue([{ id: "journal-1", sourceId: row.id, postingBatchId: "batch-1", entryNumber: "SP-001", status: "POSTED", entryDate: new Date("2026-08-31T00:00:00Z") }])
})
it("uses retained journal date and scoped account labels, never today's review time", async () => {
  const result = await readPaymentSuspenseRecords("org-1", { itemId: row.id })
  expect(result.items[0]).toMatchObject({ postingDate: "2026-08-31T00:00:00.000Z", amount: 100.25, suspenseAccount: { nameFr: "Attente" }, journal: { number: "SP-001" } })
  for (const query of [db.suspenseItem.findMany, db.chartOfAccount.findMany, db.journalEntry.findMany]) expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }))
})
it.each([{ journals: [] }, { journals: [{ id: "foreign-batch", sourceId: row.id, postingBatchId: "other", entryDate: new Date() }] }])("keeps missing or mismatched historical evidence unavailable", async ({ journals }) => {
  ;(db.journalEntry.findMany as jest.Mock).mockResolvedValue(journals)
  expect((await readPaymentSuspenseRecords("org-1", {})).items[0]).toMatchObject({ postingDate: null, journal: null })
})
it("returns a deterministic bounded cursor for equal creation times", async () => {
  ;(db.suspenseItem.findMany as jest.Mock).mockResolvedValue(Array.from({ length: 26 }, (_, index) => ({ ...row, id: `item-${99-index}` })))
  const first = await readPaymentSuspenseRecords("org-1", {})
  expect(first.items).toHaveLength(25); expect(first.nextCursor).toEqual({ createdAt: row.createdAt.toISOString(), id: "item-75" })
  await readPaymentSuspenseRecords("org-1", { cursor: first.nextCursor })
  expect(db.suspenseItem.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 26, orderBy: [{ createdAt: "desc" }, { id: "desc" }], where: { organizationId: "org-1", OR: [{ createdAt: { lt: row.createdAt } }, { createdAt: row.createdAt, id: { lt: "item-75" } }] } }))
})
it("does not turn an unavailable object or database failure into empty success", async () => {
  ;(db.suspenseItem.findMany as jest.Mock).mockResolvedValue([])
  await expect(readPaymentSuspenseRecords("org-1", { itemId: "foreign" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  ;(db.suspenseItem.findMany as jest.Mock).mockRejectedValue(new Error("query failed"))
  await expect(readPaymentSuspenseRecords("org-1", {})).rejects.toThrow("query failed")
})
it("rejects cross-tenant source relations before emitting their data", async () => {
  ;(db.suspenseItem.findMany as jest.Mock).mockResolvedValue([{ ...row, providerAccount: { organizationId: "foreign", suspenseLedgerAccountId: "private" } }])
  await expect(readPaymentSuspenseRecords("org-1", {})).rejects.toMatchObject({ code: "CONFLICT" })
  expect(db.chartOfAccount.findMany).not.toHaveBeenCalled()
})
it.each([{ organizationId: "foreign" }, { cursor: { id: "x", createdAt: "bad" } }, { itemId: "x", cursor: { id: "x", createdAt: "2026-09-01T00:00:00Z" } }])("rejects invalid or caller-scoped input %j", input => {
  expect(suspenseReadSchema.safeParse(input).success).toBe(false)
})
