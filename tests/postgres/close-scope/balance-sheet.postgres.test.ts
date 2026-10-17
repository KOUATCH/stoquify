import { PrismaClient, Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
import { readBalanceSheetClose } from "@/services/accounting/balance-sheet-close.service"
import { getAccountantPortalData } from "@/services/accounting/data-trust.service"
import { proposeBalanceSheetEvidence, decideBalanceSheetEvidence, readBalanceSheetEvidence } from "@/services/accounting/balance-sheet-evidence.service"
jest.mock("@/prisma/db", () => {
  const { closeScopeTestTarget } = require("../../../scripts/close-scope-postgres-target.cjs")
  const { PrismaClient } = require("@prisma/client")
  return { db: new PrismaClient({ datasources: { db: { url: closeScopeTestTarget().url.toString() } } }) }
})
const client = db as PrismaClient
const start = new Date("2026-09-01"), end = new Date("2026-09-30T23:59:59.999Z"), prior = new Date("2026-08-01")
let org: string, sequence = 0
const proof = { sourceReference: "retained:synthetic-supporting-schedule", sourceDocumentHash: "sha256:" + "a".repeat(64) }
const item = (patch = {}) => ({ ...proof, reference: "item-1", description: "Synthetic receivable balance", openingBalance: "100.00", additions: "20.00", reductions: "0.00", closingBalance: "120.00", ...patch })
const input = (patch = {}) => ({ ...proof, ledgerAccountId: `${org}-ar`, periodId: `${org}-sep`, currency: "XAF", idempotencyKey: `${org}-proof`, scheduleKind: "RECEIVABLES" as const,
  basis: "SUPPORTING_SCHEDULE" as const, explanation: "Reviewed synthetic account schedule", items: [item()], ...patch })
const actor = (name: string, organizationId = org) => ({ organizationId, actorId: `${org}-${name}`, actorPermissions: ["accounting.close.run", "accounting.close.certify", "accounting.close.read"], lastAuthAt: new Date() })
const scope = () => createCloseControlScope(org, { id: `${org}-sep`, startDate: start, endDate: end }, new Date())
const approve = (row: { id: string; evidenceHash: string }, name = "checker") => decideBalanceSheetEvidence({ evidenceId: row.id, expectedEvidenceHash: row.evidenceHash, decision: "APPROVE" }, actor(name))

beforeEach(async () => {
  const [identity] = await client.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  expect(identity.name).toMatch(/^stoquify_local_close_scope_[0-9]{8}_[a-f0-9]{8}$/)
  org = `balance-sheet-${++sequence}`
  await client.organization.create({ data: { id: org, name: "Synthetic balance-sheet", slug: org } })
  await client.fiscalYear.create({ data: { id: `${org}-fy`, organizationId: org, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
  for (const [id, n, date, finish] of [["aug", 8, prior, new Date("2026-08-31T23:59:59.999Z")], ["sep", 9, start, end]] as const)
    await client.accountingPeriod.create({ data: { id: `${org}-${id}`, organizationId: org, fiscalYearId: `${org}-fy`, name: id, periodNumber: n, startDate: date, endDate: finish } })
  await client.chartOfAccount.create({ data: { id: `${org}-ar`, organizationId: org, code: "411", nameEn: "Synthetic receivables", type: "ASSET", normalBalance: "DEBIT", currency: "XAF", createdAt: prior } })
  await client.chartOfAccount.create({ data: { id: `${org}-offset`, organizationId: org, code: "701", nameEn: "Synthetic offset", type: "REVENUE", normalBalance: "CREDIT" } })
  await client.journal.create({ data: { id: `${org}-journal`, organizationId: org, code: "GEN", nameEn: "General", type: "GENERAL" } })
  await post("opening", "100.00", { date: prior, period: "aug" })
  await post("movement", "20.00")
})
afterAll(async () => { await client.$disconnect() })
async function post(name: string, amount: string, opts: { date?: Date; period?: string; account?: string; currency?: string } = {}) {
  const id = `${org}-${name}`, value = new Prisma.Decimal(amount), currency = opts.currency ?? "XAF"
  await client.ledgerPostingBatch.create({ data: { id: `${id}-batch`, organizationId: org, periodId: `${org}-${opts.period ?? "sep"}`, sourceType: "MANUAL", sourceId: id, postingPurpose: "MANUAL_JOURNAL", idempotencyKey: id, status: "POSTED", postedAt: new Date() } })
  await client.journalEntry.create({ data: { id, organizationId: org, journalId: `${org}-journal`, periodId: `${org}-${opts.period ?? "sep"}`, postingBatchId: `${id}-batch`, entryNumber: id, entryDate: opts.date ?? start, currency, status: "POSTED", sourceType: "MANUAL", sourceId: id, postedAt: new Date(),
    lines: { create: [
      { organizationId: org, accountId: opts.account ?? `${org}-ar`, lineNumber: 1, currency, debit: value.gt(0) ? value : 0, credit: value.lt(0) ? value.neg() : 0 },
      { organizationId: org, accountId: `${org}-offset`, lineNumber: 2, currency, credit: value.gt(0) ? value : 0, debit: value.lt(0) ? value.neg() : 0 },
    ] } } })
}

it("requires independent per-account evidence and exposes it through the real portal collector", async () => {
  expect((await readBalanceSheetClose(client, scope())).blockedAccountCount).toBe(1)
  const row = await proposeBalanceSheetEvidence(input(), actor("maker"))
  expect(row.snapshot).toMatchObject({ normalBalance: "DEBIT", balances: { balanced: true, ledger: { openingBalance: "100.00", closingBalance: "120.00" } } })
  await expect(approve(row, "maker")).rejects.toThrow("independent")
  expect((await readBalanceSheetClose(client, scope())).blockedAccountCount).toBe(1)
  await approve(row)
  expect((await readBalanceSheetClose(client, scope())).reconciledAccountCount).toBe(1)
  const portal = await getAccountantPortalData({ organizationId: org, periodId: `${org}-sep` }, client)
  expect(portal.balanceSheetReconciliation?.reconciledAccountCount).toBe(1)
  expect(portal.blockers.some(row => row.gate === "ledger.balance-sheet")).toBe(false)
})

it.each(["LIABILITY", "CONTRA_ASSET", "EQUITY"] as const)("reconciles %s in its credit-normal sign without demanding that an ordinary balance be paid", async type => {
  await client.chartOfAccount.create({ data: { id: `${org}-credit`, organizationId: org, code: "credit", nameEn: "Synthetic credit account", type, normalBalance: "CREDIT", currency: "XAF" } })
  await post("credit-opening", "-100.00", { date: prior, period: "aug", account: `${org}-credit` })
  await post("credit-movement", "-20.00", { account: `${org}-credit` })
  const row = await proposeBalanceSheetEvidence(input({ ledgerAccountId: `${org}-credit`, scheduleKind: type === "LIABILITY" ? "PAYABLES" : type === "CONTRA_ASSET" ? "FIXED_ASSETS" : "EQUITY" }), actor("maker"))
  expect(row.snapshot).toMatchObject({ normalBalance: "CREDIT", balances: { balanced: true, ledger: { closingBalance: "120.00" } } })
  await approve(row)
  expect((await readBalanceSheetClose(client, scope())).accounts.find(row => row.ledgerAccountId === `${org}-credit`)?.status).toBe("RECONCILED")
})

it("rejects net-only schedules when offsetting movements leave the closing balance unchanged", async () => {
  await post("addition", "5.00"); await post("reduction", "-5.00")
  const bad = await proposeBalanceSheetEvidence(input(), actor("maker"))
  expect(bad.snapshot).toMatchObject({ balances: { balanced: false, differences: { closingBalance: "0.00", additions: "-5.00", reductions: "-5.00" } } })
  await expect(approve(bad)).rejects.toThrow("reconcile exactly")
  const good = await proposeBalanceSheetEvidence(input({ idempotencyKey: "gross", items: [item({ additions: "25.00", reductions: "5.00" })] }), actor("maker"))
  await approve(good)
  expect((await readBalanceSheetClose(client, scope())).reconciledAccountCount).toBe(1)
})

it("requires explicit support for unused active accounts and retains archived historical balances", async () => {
  await client.chartOfAccount.create({ data: { id: `${org}-unused`, organizationId: org, code: "48", nameEn: "Unused accrual", type: "LIABILITY", normalBalance: "CREDIT" } })
  await client.chartOfAccount.create({ data: { id: `${org}-parent`, organizationId: org, code: "4", nameEn: "Summary", type: "LIABILITY", normalBalance: "CREDIT" } })
  await client.chartOfAccount.update({ where: { id: `${org}-unused` }, data: { parentId: `${org}-parent` } })
  await client.chartOfAccount.update({ where: { id: `${org}-ar` }, data: { isActive: false, deletedAt: new Date() } })
  const population = await readBalanceSheetClose(client, scope())
  expect(population.requiredAccountCount).toBe(2)
  expect(population.accounts.some(row => row.accountCode === "4")).toBe(false)
  await expect(proposeBalanceSheetEvidence(input({ basis: "ZERO_ACTIVITY", items: [] }), actor("maker"))).rejects.toThrow("no opening balance")
  const zero = await proposeBalanceSheetEvidence(input({ ledgerAccountId: `${org}-unused`, basis: "ZERO_ACTIVITY", items: [], scheduleKind: "ACCRUALS" }), actor("maker"))
  await approve(zero)
  expect((await readBalanceSheetClose(client, scope())).accounts.find(row => row.accountCode === "48")?.status).toBe("RECONCILED")
  const archived = await proposeBalanceSheetEvidence(input({ idempotencyKey: "archived" }), actor("maker"))
  await approve(archived)
  expect((await readBalanceSheetClose(client, scope())).blockedAccountCount).toBe(0)
})

it("keeps currencies separate and lets several approvals coexist without invalidating each other", async () => {
  await client.chartOfAccount.update({ where: { id: `${org}-ar` }, data: { currency: null } })
  await post("eur", "30.00", { currency: "EUR" })
  expect((await readBalanceSheetClose(client, scope())).requiredAccountCount).toBe(2)
  const xaf = await proposeBalanceSheetEvidence(input(), actor("maker"))
  const eur = await proposeBalanceSheetEvidence(input({ currency: "EUR", idempotencyKey: "eur", items: [item({ openingBalance: "0.00", additions: "30.00", closingBalance: "30.00" })] }), actor("maker"))
  await approve(xaf); await approve(eur)
  expect((await readBalanceSheetClose(client, scope())).reconciledAccountCount).toBe(2)
})

it("rechecks both posted and unposted registered sources and invalidates retained close proof", async () => {
  const old = await proposeBalanceSheetEvidence(input(), actor("maker"))
  await client.organization.update({ where: { id: org }, data: { currency: "EUR" } })
  await expect(approve(old)).rejects.toThrow("sources changed")
  const fresh = await proposeBalanceSheetEvidence(input({ idempotencyKey: "fresh" }), actor("maker"))
  await approve(fresh)
  const run = await client.closeRun.create({ data: { organizationId: org, periodId: `${org}-sep`, status: "READY" } })
  await post("late", "1.00")
  expect((await readBalanceSheetClose(client, scope())).blockedAccountCount).toBe(1)
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("BLOCKED")
})

it("rejects a stale schedule after supplier-subledger activity even before that activity reaches the general ledger", async () => {
  await client.supplier.create({ data: { id: `${org}-supplier`, organizationId: org, name: "Synthetic supplier" } })
  const row = await proposeBalanceSheetEvidence(input(), actor("maker"))
  await approve(row)
  await client.supplierLedgerEntry.create({ data: { organizationId: org, supplierId: `${org}-supplier`, entryDate: start, type: "PURCHASE",
    debit: 10, credit: 0, balanceAfter: 10, description: "New unposted supplier evidence", referenceType: "SUPPLIER_INVOICE", referenceId: "synthetic-unposted" } })
  expect((await readBalanceSheetClose(client, scope())).accounts[0].status).toBe("BLOCKED")
  await expect(approve(row)).rejects.toThrow("sources changed")
})

it("does not label offsetting zero-ending transactions as no activity", async () => {
  await client.chartOfAccount.create({ data: { id: `${org}-clearing`, organizationId: org, code: "47", nameEn: "Clearing", type: "ASSET", normalBalance: "DEBIT", currency: "XAF" } })
  await post("clearing-in", "10.00", { account: `${org}-clearing` })
  await post("clearing-out", "-10.00", { account: `${org}-clearing` })
  await expect(proposeBalanceSheetEvidence(input({ ledgerAccountId: `${org}-clearing`, basis: "ZERO_ACTIVITY", items: [] }), actor("maker"))).rejects.toThrow("no posted period lines")
})

it("denies foreign resources, stale authentication, missing permissions, changed replays and immutable payload edits", async () => {
  const row = await proposeBalanceSheetEvidence(input(), actor("maker"))
  expect((await proposeBalanceSheetEvidence(input(), actor("maker"))).id).toBe(row.id)
  await expect(proposeBalanceSheetEvidence(input({ items: [item({ closingBalance: "1.00" })] }), actor("maker"))).rejects.toThrow()
  await expect(readBalanceSheetEvidence({ evidenceId: row.id }, actor("reader", "foreign"))).rejects.toThrow("not found")
  await expect(proposeBalanceSheetEvidence(input({ idempotencyKey: "foreign" }), actor("maker", "foreign"))).rejects.toThrow()
  await expect(proposeBalanceSheetEvidence(input(), { ...actor("maker"), actorPermissions: [] })).rejects.toThrow("permission")
  await expect(approve(row, "maker")).rejects.toThrow("independent")
  await expect(proposeBalanceSheetEvidence(input(), { ...actor("maker"), lastAuthAt: new Date(0) })).rejects.toThrow("Fresh")
  await expect(client.balanceSheetEvidence.update({ where: { id: row.id }, data: { snapshot: {} } })).rejects.toThrow()
  await expect(client.balanceSheetEvidence.delete({ where: { id: row.id } })).rejects.toThrow()
  await expect(client.balanceSheetEvidence.create({ data: { ...row, id: "bad-tenant", organizationId: "foreign", idempotencyKey: "foreign" } })).rejects.toThrow()
  await expect(client.balanceSheetEvidence.create({ data: { ...row, id: "self-proof", idempotencyKey: "self", status: "APPROVED", approvedById: row.proposedById, approvedAt: new Date() } })).rejects.toThrow()
})

it("never falls back to older approvals after replacement or revocation and observes approval cutoffs", async () => {
  const old = await proposeBalanceSheetEvidence(input(), actor("maker"))
  const approved = await approve(old)
  const cutoff = createCloseControlScope(org, { id: `${org}-sep`, startDate: start, endDate: end }, new Date(+approved.approvedAt! - 1))
  expect((await readBalanceSheetClose(client, cutoff)).blockedAccountCount).toBe(1)
  const latest = await proposeBalanceSheetEvidence(input({ idempotencyKey: "replacement" }), actor("maker"))
  expect((await readBalanceSheetClose(client, scope())).accounts[0]).toMatchObject({ evidenceId: latest.id, status: "BLOCKED" })
  await approve(latest)
  const run = await client.closeRun.create({ data: { organizationId: org, periodId: `${org}-sep`, status: "READY" } })
  const revoked = await decideBalanceSheetEvidence({ evidenceId: latest.id, expectedEvidenceHash: latest.evidenceHash, decision: "REVOKE", reason: "Supporting schedule was corrected" }, actor("checker"))
  expect(revoked.approvedById).toBe(actor("checker").actorId)
  await expect(approve(latest)).rejects.toThrow("Revoked")
  expect((await readBalanceSheetClose(client, scope())).blockedAccountCount).toBe(1)
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("BLOCKED")
})

it.each(["commit", "rollback"])("approval waits for a racing supporting source %s", async outcome => {
  const row = await proposeBalanceSheetEvidence(input(), actor("maker"))
  let release!: () => void, changed!: () => void, writerPid = 0
  const releasePromise = new Promise<void>(resolve => { release = resolve })
  const changedPromise = new Promise<void>(resolve => { changed = resolve })
  const writer = client.$transaction(async tx => {
    const [backend] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`
    writerPid = backend.pid
    await tx.chartOfAccount.update({ where: { id: `${org}-ar` }, data: { nameEn: "Corrected supporting source" } })
    changed(); await releasePromise
    if (outcome === "rollback") throw new Error("injected source rollback")
  }, { isolationLevel: "ReadCommitted", timeout: 20000 })
  const writerResult = writer.then(() => null, error => error)
  await changedPromise
  const approval = approve(row).then(value => ({ value, error: null }), error => ({ value: null, error }))
  let observedLock = false
  try {
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
      const [waiting] = await client.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND ${writerPid} = ANY(pg_blocking_pids(pid))`)
      if (Number(waiting.count) > 0) { observedLock = true; break }
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  } finally { release() }
  const [writerError, result] = await Promise.all([writerResult, approval])
  expect(observedLock).toBe(true)
  if (outcome === "commit") { expect(writerError).toBeNull(); expect(result.error?.message).toContain("sources changed") }
  else { expect(writerError?.message).toBe("injected source rollback"); expect(result.error).toBeNull(); expect(result.value?.status).toBe("APPROVED") }
})
