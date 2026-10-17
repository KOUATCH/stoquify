import { PrismaClient, Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
import { readCloseAssessmentPublicationTimeInTx } from "@/services/accounting/close-assessment-order.service"
import { getAccountantPortalData } from "@/services/accounting/data-trust.service"
import { readBankBalanceClose } from "@/services/reconciliation/bank-balance-close.service"
import { proposeBankBalanceEvidence, decideBankBalanceEvidence, readBankBalanceEvidence } from "@/services/reconciliation/bank-balance-evidence.service"
jest.mock("@/prisma/db", () => {
  const { closeScopeTestTarget } = require("../../../scripts/close-scope-postgres-target.cjs")
  const { PrismaClient } = require("@prisma/client")
  return { db: new PrismaClient({ datasources: { db: { url: closeScopeTestTarget().url.toString() } } }) }
})
const client = db as PrismaClient
const start = new Date("2026-09-01"), end = new Date("2026-09-30T23:59:59.999Z"), prior = new Date("2026-08-01")
let org: string, sequence = 0
const hash = "a".repeat(64)
const actor = (name: string, organizationId = org) => ({ organizationId, actorId: `${org}-${name}`, actorPermissions: ["payments.reconciliation.run", "payments.reconciliation.sign", "payments.reconciliation.read"], lastAuthAt: new Date() })
const input = (patch = {}) => ({ providerAccountId: `${org}-bank`, periodId: `${org}-sep`, statementFileId: `${org}-file`, idempotencyKey: `${org}-proof`,
  openingBalance: "100.00", closingBalance: "120.00", sourceReference: "retained:synthetic-bank-statement", sourceDocumentHash: `sha256:${hash}`, timingItems: [], ...patch })
// Evidence publication uses the database clock; do not mix it with the host clock.
const scope = async () => createCloseControlScope(org, { id: `${org}-sep`, startDate: start, endDate: end }, await readCloseAssessmentPublicationTimeInTx(client))
const approve = (row: { id: string; evidenceHash: string }, name = "checker") => decideBankBalanceEvidence({ evidenceId: row.id, expectedEvidenceHash: row.evidenceHash, decision: "APPROVE" }, actor(name))
beforeEach(async () => {
  const [identity] = await client.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  expect(identity.name).toMatch(/^stoquify_local_close_scope_[0-9]{8}_[a-f0-9]{8}$/)
  org = `bank-balance-${++sequence}`
  await client.organization.create({ data: { id: org, name: "Synthetic bank balance", slug: org } })
  await client.fiscalYear.create({ data: { id: `${org}-fy`, organizationId: org, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
  for (const [id, n, date, finish] of [["aug", 8, prior, new Date("2026-08-31T23:59:59.999Z")], ["sep", 9, start, end]] as const) {
    await client.accountingPeriod.create({ data: { id: `${org}-${id}`, organizationId: org, fiscalYearId: `${org}-fy`, name: id, periodNumber: n, startDate: date, endDate: finish } })
  }
  await client.chartOfAccount.create({ data: { id: `${org}-gl`, organizationId: org, code: "521", nameEn: "Synthetic Bank", type: "ASSET", normalBalance: "DEBIT", currency: "XAF" } })
  await client.chartOfAccount.create({ data: { id: `${org}-offset`, organizationId: org, code: "101", nameEn: "Synthetic Offset", type: "EQUITY", normalBalance: "CREDIT", currency: "XAF" } })
  await client.journal.create({ data: { id: `${org}-journal`, organizationId: org, code: "BNK", nameEn: "Bank", type: "BANK" } })
  await client.paymentRail.create({ data: { id: `${org}-rail`, organizationId: org, code: "BANK", name: "Bank", type: "BANK_TRANSFER" } })
  await client.providerAccount.create({ data: { id: `${org}-bank`, organizationId: org, paymentRailId: `${org}-rail`, providerCode: "BANK", displayName: "Synthetic bank", externalAccountHash: org, settlementLedgerAccountId: `${org}-gl`, status: "ACTIVE", createdAt: prior } })
  await client.statementFile.create({ data: { id: `${org}-file`, organizationId: org, providerAccountId: `${org}-bank`, sourceType: "TEST", fileHash: hash, periodStart: start, periodEnd: end } })
  await client.statementLine.create({ data: { id: `${org}-statement-line`, organizationId: org, providerAccountId: `${org}-bank`, statementFileId: `${org}-file`, fingerprint: org, amount: 20, direction: "CREDIT", occurredAt: start } })
  await post("opening", prior, "100.00", "aug")
  await post("movement", start, "20.00")
})
afterAll(async () => { await client.$disconnect() })
async function post(name: string, entryDate: Date, amount: string, period = "sep") {
  const id = `${org}-${name}`, value = new Prisma.Decimal(amount)
  await client.ledgerPostingBatch.create({ data: { id: `${id}-batch`, organizationId: org, periodId: `${org}-${period}`, sourceType: "MANUAL", sourceId: id, postingPurpose: "MANUAL_JOURNAL", idempotencyKey: id, status: "POSTED", postedAt: new Date() } })
  await client.journalEntry.create({ data: { id, organizationId: org, journalId: `${org}-journal`, periodId: `${org}-${period}`, postingBatchId: `${id}-batch`, entryNumber: id, entryDate, status: "POSTED", sourceType: "MANUAL", sourceId: id, postedAt: new Date(),
    lines: { create: [
      { id: `${id}-line`, organizationId: org, accountId: `${org}-gl`, lineNumber: 1, debit: value.gt(0) ? value : 0, credit: value.lt(0) ? value.neg() : 0 },
      { organizationId: org, accountId: `${org}-offset`, lineNumber: 2, credit: value.gt(0) ? value : 0, debit: value.lt(0) ? value.neg() : 0 },
    ] } } })
  return `${id}-line`
}
it("requires separate bank proof and approves an exact opening/movement/closing reconciliation independently", async () => {
  expect((await readBankBalanceClose(client, await scope())).blockedAccountCount).toBe(1)
  const row = await proposeBankBalanceEvidence(input(), actor("maker"))
  expect(row.snapshot).toMatchObject({ balances: { ledgerOpening: "100.00", ledgerClosing: "120.00", balanced: true } })
  await expect(approve(row, "maker")).rejects.toThrow("independent")
  expect((await readBankBalanceClose(client, await scope())).blockedAccountCount).toBe(1)
  const approved = await approve(row)
  expect(approved.status).toBe("APPROVED")
  expect((await readBankBalanceClose(client, await scope())).reconciledAccountCount).toBe(1)
  const portal = await getAccountantPortalData({ organizationId: org, periodId: `${org}-sep` }, client)
  expect(portal.bankBalanceReconciliation?.reconciledAccountCount).toBe(1)
  expect(portal.blockers.some(row => row.id === `bank-balance:${org}-bank`)).toBe(false)
})
it("retains unbalanced proposals but refuses approval without altering balances", async () => {
  const row = await proposeBankBalanceEvidence(input({ closingBalance: "119.99" }), actor("maker"))
  expect(row.snapshot).toMatchObject({ balances: { balanced: false, closingDifference: "-0.01", rollForwardDifference: "-0.01" } })
  await expect(approve(row)).rejects.toThrow("must all be zero")
  expect((await client.bankBalanceEvidence.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("PROPOSED")
})
it("rechecks sources at approval and invalidates retained close after a later bank source mutation", async () => {
  const stale = await proposeBankBalanceEvidence(input(), actor("maker"))
  await client.statementLine.create({ data: { organizationId: org, providerAccountId: `${org}-bank`, statementFileId: `${org}-file`, fingerprint: `${org}-late-zero`, amount: 0, direction: "CREDIT", occurredAt: start } })
  await expect(approve(stale)).rejects.toThrow("sources changed")
  const current = await proposeBankBalanceEvidence(input({ idempotencyKey: `${org}-fresh` }), actor("maker"))
  await approve(current)
  const run = await client.closeRun.create({ data: { organizationId: org, periodId: `${org}-sep`, status: "READY" } })
  await client.statementLine.create({ data: { organizationId: org, providerAccountId: `${org}-bank`, statementFileId: `${org}-file`, fingerprint: `${org}-late-one`, amount: 1, direction: "CREDIT", occurredAt: start } })
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("BLOCKED")
  expect((await readBankBalanceClose(client, await scope())).blockedAccountCount).toBe(1)
})
it("derives timing amounts from posted lines and rejects duplicates and already bank-matched items", async () => {
  const lineId = await post("in-transit", start, "25.00")
  const timing = { boundary: "CLOSING" as const, journalEntryLineId: lineId, sourceReference: "deposit:retained-proof", sourceDocumentHash: `sha256:${hash}` }
  const row = await proposeBankBalanceEvidence(input({ timingItems: [timing] }), actor("maker"))
  expect(row.snapshot).toMatchObject({ balances: { adjustedClosing: "145.00", ledgerClosing: "145.00", balanced: true }, timing: [{ amount: "25.00", kind: "DEPOSIT_IN_TRANSIT" }] })
  await approve(row)
  await expect(proposeBankBalanceEvidence(input({ idempotencyKey: "duplicate", timingItems: [timing, timing] }), actor("maker"))).rejects.toThrow("only once")
  await client.matchRecord.create({ data: { organizationId: org, providerAccountId: `${org}-bank`, ledgerPostingBatchId: `${org}-in-transit-batch`, statementLineId: `${org}-statement-line`, rule: "MANUAL", status: "APPROVED", amountMatched: 25 } })
  expect((await readBankBalanceClose(client, await scope())).blockedAccountCount).toBe(1)
})
it("enforces read/write authority, tenant binding, replay and immutable retention", async () => {
  const row = await proposeBankBalanceEvidence(input(), actor("maker"))
  expect((await proposeBankBalanceEvidence(input(), actor("maker"))).id).toBe(row.id)
  await expect(proposeBankBalanceEvidence(input({ closingBalance: "100.00" }), actor("maker"))).rejects.toThrow()
  await expect(readBankBalanceEvidence({ evidenceId: row.id }, actor("checker", "foreign"))).rejects.toThrow("not found")
  await expect(approve(row, "maker")).rejects.toThrow("independent")
  await expect(proposeBankBalanceEvidence(input({ idempotencyKey: "denied" }), { ...actor("maker"), actorPermissions: [] })).rejects.toThrow("permission")
  await expect(proposeBankBalanceEvidence(input({ idempotencyKey: "stale-auth" }), { ...actor("maker"), lastAuthAt: new Date(0) })).rejects.toThrow("Fresh")
  await expect(client.bankBalanceEvidence.update({ where: { id: row.id }, data: { input: {} } })).rejects.toThrow()
  await expect(client.bankBalanceEvidence.delete({ where: { id: row.id } })).rejects.toThrow()
  await expect(client.bankBalanceEvidence.create({ data: { ...row, id: "foreign-bank-proof", organizationId: "foreign", idempotencyKey: "foreign" } })).rejects.toThrow()
  await expect(client.bankBalanceEvidence.create({ data: { ...row, id: "self-bank-proof", idempotencyKey: "self", status: "APPROVED", approvedAt: new Date(), approvedById: row.proposedById } })).rejects.toThrow()
  await approve(row)
  const run = await client.closeRun.create({ data: { organizationId: org, periodId: `${org}-sep`, status: "READY" } })
  const revoked = await decideBankBalanceEvidence({ evidenceId: row.id, expectedEvidenceHash: row.evidenceHash, decision: "REVOKE", reason: "Bank corrected its statement" }, actor("checker"))
  expect(revoked).toMatchObject({ status: "REVOKED", approvedById: actor("checker").actorId })
  await expect(approve(row)).rejects.toThrow("Revoked")
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("BLOCKED")
})
it.each(["missing-mapping", "shared-mapping", "currency", "unknown-direction", "partial-statement"])("refuses %s evidence instead of certifying a zero", async kind => {
  if (kind === "missing-mapping") await client.providerAccount.update({ where: { id: `${org}-bank` }, data: { settlementLedgerAccountId: null } })
  if (kind === "shared-mapping") await client.providerAccount.create({ data: { organizationId: org, paymentRailId: `${org}-rail`, providerCode: "SHARED", displayName: "Other bank", externalAccountHash: "other", settlementLedgerAccountId: `${org}-gl` } })
  if (kind === "currency" || kind === "unknown-direction") await client.statementLine.create({ data: { organizationId: org, providerAccountId: `${org}-bank`, statementFileId: `${org}-file`, fingerprint: `${org}-invalid`, amount: 1, currencyCode: kind === "currency" ? "EUR" : "XAF", direction: kind === "unknown-direction" ? "UNKNOWN" : "CREDIT", occurredAt: start } })
  if (kind === "partial-statement") await client.statementFile.create({ data: { id: `${org}-partial`, organizationId: org, providerAccountId: `${org}-bank`, sourceType: "TEST", fileHash: "b".repeat(64), periodStart: start, periodEnd: start } })
  await expect(proposeBankBalanceEvidence(input(kind === "partial-statement" ? { statementFileId: `${org}-partial`, sourceDocumentHash: `sha256:${"b".repeat(64)}` } : {}), actor("maker"))).rejects.toThrow()
  expect(await client.bankBalanceEvidence.count({ where: { organizationId: org } })).toBe(0)
})

it.each(["ledger", "bank-identity"])("invalidates approval after a %s source change", async kind => {
  const row = await proposeBankBalanceEvidence(input(), actor("maker"))
  await approve(row)
  const run = await client.closeRun.create({ data: { organizationId: org, periodId: `${org}-sep`, status: "READY" } })
  if (kind === "ledger") await post("late-bank-charge", start, "-1.00")
  else await client.providerAccount.update({ where: { id: `${org}-bank` }, data: { externalAccountHash: "corrected-bank-identity" } })
  expect((await readBankBalanceClose(client, await scope())).blockedAccountCount).toBe(1)
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("BLOCKED")
})

it("does not fall back to an older approval after a replacement proposal or revocation", async () => {
  const old = await proposeBankBalanceEvidence(input(), actor("maker"))
  await approve(old)
  const latest = await proposeBankBalanceEvidence(input({ idempotencyKey: "replacement" }), actor("maker"))
  expect((await readBankBalanceClose(client, await scope())).accounts[0]).toMatchObject({ status: "BLOCKED", evidenceId: latest.id })
  await decideBankBalanceEvidence({ evidenceId: latest.id, expectedEvidenceHash: latest.evidenceHash, decision: "REVOKE", reason: "Replacement needs correction" }, actor("checker"))
  expect((await readBankBalanceClose(client, await scope())).blockedAccountCount).toBe(1)
})

it("requires approval to be visible through the close recording cutoff", async () => {
  const row = await proposeBankBalanceEvidence(input(), actor("maker"))
  const approved = await approve(row)
  const beforeApproval = createCloseControlScope(org, { id: `${org}-sep`, startDate: start, endDate: end }, new Date(+approved.approvedAt! - 1))
  expect((await readBankBalanceClose(client, beforeApproval)).blockedAccountCount).toBe(1)
  expect((await readBankBalanceClose(client, await scope())).reconciledAccountCount).toBe(1)
})

it.each(["commit", "rollback"])("approval waits for a racing source %s and reads its committed result", async outcome => {
  const row = await proposeBankBalanceEvidence(input(), actor("maker"))
  let release!: () => void, changed!: () => void, writerPid = 0
  const releasePromise = new Promise<void>(resolve => { release = resolve })
  const changedPromise = new Promise<void>(resolve => { changed = resolve })
  const writer = client.$transaction(async tx => {
    const [backend] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`
    writerPid = backend.pid
    await tx.statementLine.create({ data: { organizationId: org, providerAccountId: `${org}-bank`, statementFileId: `${org}-file`, fingerprint: `${org}-racing`, amount: 0, direction: "CREDIT", occurredAt: start } })
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
  if (outcome === "commit") {
    expect(writerError).toBeNull()
    expect(result.error?.message).toContain("sources changed")
    expect((await readBankBalanceClose(client, await scope())).blockedAccountCount).toBe(1)
  } else {
    expect(writerError?.message).toBe("injected source rollback")
    expect(result.error).toBeNull()
    expect(result.value?.status).toBe("APPROVED")
    expect((await readBankBalanceClose(client, await scope())).reconciledAccountCount).toBe(1)
  }
})
