import { PrismaClient } from "@prisma/client"
import { db } from "@/prisma/db"
import { readClosePayableBalances } from "@/services/accounting/close-payable-balances.service"
import { getAccountantPortalData } from "@/services/accounting/data-trust.service"
jest.mock("@/prisma/db", () => {
  const { closeScopeTestTarget } = require("../../../scripts/close-scope-postgres-target.cjs")
  const { PrismaClient } = require("@prisma/client")
  return { db: new PrismaClient({ datasources: { db: { url: closeScopeTestTarget().url.toString() } } }) }
})
const client = db as PrismaClient
const date = new Date("2026-09-01"), end = new Date("2026-09-30T23:59:59.999Z"), cutoff = new Date("2026-10-05")
let org: string, sequence = 0
beforeEach(async () => {
  const [identity] = await client.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  expect(identity.name).toMatch(/^stoquify_local_close_scope_[0-9]{8}_[a-f0-9]{8}$/)
  org = `payable-${++sequence}`
  await client.organization.create({ data: { id: org, name: "Synthetic AP close", slug: org } })
  await client.supplier.create({ data: { id: `${org}-supplier`, organizationId: org, name: "Synthetic supplier" } })
  await client.fiscalYear.create({ data: { id: `${org}-fy`, organizationId: org, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
  await client.accountingPeriod.create({ data: { id: `${org}-period`, organizationId: org, fiscalYearId: `${org}-fy`, name: "September", periodNumber: 9, startDate: date, endDate: end } })
})
afterAll(async () => { await client.$disconnect() })
async function addInvoice(suffix: string, patch: Record<string, unknown> = {}) {
  const id = `${org}-${suffix}`
  const row = await client.supplierInvoice.create({ data: { id, organizationId: org, supplierId: `${org}-supplier`, invoiceNumber: id,
    duplicateFingerprint: id, status: "POSTED", invoiceDate: date, dueDate: new Date("2026-10-30"), postedAt: date,
    total: "100.25", amountPaid: 0, ledgerPostingBatchId: `${id}-batch`, createdAt: date, updatedAt: date, ...patch } })
  await client.ledgerPostingBatch.create({ data: { id: `${id}-batch`, organizationId: org, periodId: `${org}-period`, sourceType: "SUPPLIER_INVOICE", sourceId: id,
    postingPurpose: "SUPPLIER_INVOICE", idempotencyKey: id, status: "POSTED", createdAt: date, postedAt: date } })
  await client.supplierLedgerEntry.create({ data: { organizationId: org, supplierId: `${org}-supplier`, entryDate: row.invoiceDate, type: "PURCHASE", debit: row.total,
    credit: 0, balanceAfter: row.total, description: "Synthetic invoice", referenceType: "SUPPLIER_INVOICE", referenceId: id, createdAt: date } })
  return row
}
const read = () => readClosePayableBalances(client, { organizationId: org, economicThrough: end, recordedThrough: cutoff })

it("retains evidenced unpaid and overdue invoices as normal, separately by currency, in the portal", async () => {
  await addInvoice("normal")
  await addInvoice("overdue", { dueDate: new Date("2026-08-31"), deletedAt: date })
  await addInvoice("eur", { currency: "EUR", total: "3.75" })
  const result = await getAccountantPortalData({ organizationId: org, periodId: `${org}-period` }, client, cutoff)
  expect(result.payableBalances).toMatchObject({ normalUnpaidCount: 3, exceptionCount: 0 })
  expect(result.payableBalances?.currencies).toEqual([
    { currency: "EUR", normalUnpaid: "3.75", overdue: "0.00", exceptionCount: 0 },
    { currency: "XAF", normalUnpaid: "200.50", overdue: "100.25", exceptionCount: 0 },
  ])
  expect(result.moduleEvidence.find(row => row.module === "purchasing")?.status).toBe("ready")
  expect(result.blockers.some(row => row.gate.startsWith("purchasing.ap"))).toBe(false)
})
it("retains disputes, unexplained paid amounts and missing ledger evidence as high AP exceptions", async () => {
  await addInvoice("normal")
  await addInvoice("dispute", { status: "DISPUTED" })
  await addInvoice("unexplained", { amountPaid: "10" })
  const missing = await addInvoice("missing")
  await client.supplierLedgerEntry.deleteMany({ where: { organizationId: org, referenceId: missing.id } })
  const result = await getAccountantPortalData({ organizationId: org, periodId: `${org}-period` }, client, cutoff)
  expect(result.payableBalances).toMatchObject({ normalUnpaidCount: 1, exceptionCount: 3 })
  expect(result.blockers.filter(row => row.gate === "purchasing.ap.reconciliation")).toHaveLength(3)
  expect(result.moduleEvidence.find(row => row.module === "purchasing")?.status).toBe("blocked")
})
it("preserves opening obligations and excludes foreign, future-economic and post-cutoff invoices", async () => {
  await addInvoice("opening", { invoiceDate: new Date("2026-08-01") })
  await addInvoice("late-import", { createdAt: new Date("2026-10-02"), updatedAt: new Date("2026-10-02") })
  await addInvoice("future", { invoiceDate: new Date("2026-10-01") })
  await addInvoice("late", { createdAt: new Date("2026-10-06"), updatedAt: new Date("2026-10-06") })
  const result = await read()
  expect(result.balances.map(row => row.invoiceId)).toEqual([`${org}-late-import`, `${org}-opening`])
  expect((await readClosePayableBalances(client, { organizationId: "foreign-ap", economicThrough: end, recordedThrough: cutoff })).balances).toEqual([])
})
it("supplier-ledger changes invalidate retained close evidence atomically and rollback leaves it current", async () => {
  const invoice = await addInvoice("normal")
  const run = await client.closeRun.create({ data: { organizationId: org, periodId: `${org}-period`, status: "READY" } })
  await expect(client.$transaction(async tx => {
    await tx.supplierLedgerEntry.updateMany({ where: { organizationId: org, referenceId: invoice.id }, data: { debit: 1 } })
    throw new Error("rollback")
  })).rejects.toThrow("rollback")
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("READY")
  await client.supplierLedgerEntry.updateMany({ where: { organizationId: org, referenceId: invoice.id }, data: { debit: 1 } })
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("BLOCKED")
  expect((await read()).balances[0].reasons).toContain("UNVERIFIED_BALANCE")
})
it("an explicit matching exception blocks normal classification and invalidates close", async () => {
  const invoice = await addInvoice("normal")
  const match = await client.threeWayMatch.create({ data: { organizationId: org, supplierInvoiceId: invoice.id, status: "EXCEPTION" } })
  const run = await client.closeRun.create({ data: { organizationId: org, periodId: `${org}-period`, status: "READY" } })
  await client.supplierInvoiceMatchException.create({ data: { organizationId: org, supplierInvoiceId: invoice.id, threeWayMatchId: match.id,
    policyVersion: "synthetic", reason: "Unexplained variance", evidenceReference: "synthetic-evidence", varianceAmount: 1, priceVariance: 1, requestedById: "synthetic-maker", expiresAt: new Date("2026-11-01"), createdAt: date } })
  expect((await read()).balances[0].reasons).toContain("UNRESOLVED_MATCH_EXCEPTION")
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("BLOCKED")
})
