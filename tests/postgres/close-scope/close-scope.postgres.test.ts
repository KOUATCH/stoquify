import { PrismaClient } from "@prisma/client"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
import { closeStatementLineWhere } from "@/services/reconciliation/payment-close-scope"
import { getPaymentCloseEvidence } from "@/services/reconciliation/payment-close-evidence.service"
import { getPaymentReconciliationSummary } from "@/services/reconciliation/payment-reconciliation-summary.service"
import { getAccountantPortalData } from "@/services/accounting/data-trust.service"
import { db } from "@/prisma/db"
jest.mock("@/prisma/db", () => {
  const { closeScopeTestTarget } = require("../../../scripts/close-scope-postgres-target.cjs")
  const { url } = closeScopeTestTarget()
  const { PrismaClient } = require("@prisma/client")
  return { db: new PrismaClient({ datasources: { db: { url: url.toString() } } }) }
})
const client = db as PrismaClient
const org = "close-scope-a", other = "close-scope-b"
const start = new Date("2026-09-01T00:00:00Z"), end = new Date("2026-09-30T23:59:59.999Z")
const cutoff = new Date("2026-10-05T12:00:00Z"), imported = new Date("2026-10-02T12:00:00Z")
const scope = createCloseControlScope(org, { id: "sep-a", startDate: start, endDate: end }, cutoff)

beforeAll(async () => {
  const identity = await client.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  expect(identity[0].name).toMatch(/^stoquify_local_close_scope_[0-9]{8}_[a-f0-9]{8}$/)
  for (const organizationId of [org, other]) {
    await client.organization.create({ data: { id: organizationId, name: "Synthetic close scope", slug: organizationId, currency: "XAF" } })
    await client.fiscalYear.create({ data: { id: `fy-${organizationId}`, organizationId, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31T23:59:59.999Z") } })
    await client.accountingPeriod.create({ data: { id: organizationId === org ? "sep-a" : "sep-b", organizationId, fiscalYearId: `fy-${organizationId}`, periodNumber: 9, name: "September", startDate: start, endDate: end } })
    await client.paymentRail.create({ data: { id: `rail-${organizationId}`, organizationId, code: "TEST", name: "Synthetic rail", type: "BANK_TRANSFER" } })
    await client.providerAccount.create({ data: { id: `account-${organizationId}`, organizationId, paymentRailId: `rail-${organizationId}`, providerCode: "TEST", displayName: "Synthetic account", externalAccountHash: `hash-${organizationId}`, status: "ACTIVE", createdAt: new Date("2026-08-01") } })
  }
  await client.accountingPeriod.create({ data: { id: "oct-a", organizationId: org, fiscalYearId: `fy-${org}`, periodNumber: 10, name: "October", startDate: new Date("2026-10-01"), endDate: new Date("2026-10-31T23:59:59.999Z") } })
  for (const [id, organizationId, periodStart, periodEnd, importedAt] of [
    ["sep-file", org, start, end, imported],
    ["late-file", org, start, end, new Date(cutoff.getTime() + 1)],
    ["oct-file", org, new Date("2026-10-01"), new Date("2026-10-31T23:59:59.999Z"), imported],
    ["foreign-file", other, start, end, imported],
  ] as const) await client.statementFile.create({ data: { id, organizationId, providerAccountId: `account-${organizationId}`, sourceType: "TEST", fileHash: id, periodStart, periodEnd, importedAt, createdAt: importedAt } })
  for (const [id, statementFileId, occurredAt, createdAt, organizationId] of [
    ["start", "sep-file", start, imported, org], ["end", "sep-file", end, imported, org],
    ["before", "sep-file", new Date(start.getTime() - 1), imported, org],
    ["after", "sep-file", new Date(end.getTime() + 1), imported, org],
    ["too-late", "late-file", start, new Date(cutoff.getTime() + 1), org],
    ["october", "oct-file", new Date("2026-10-02"), imported, org],
    ["foreign", "foreign-file", start, imported, other],
  ] as const) await client.statementLine.create({ data: { id, organizationId, providerAccountId: `account-${organizationId}`, statementFileId, fingerprint: id, amount: 10, currencyCode: id === "start" ? "USD" : "XAF", occurredAt, createdAt } })
  for (let i = 0; i < 20; i++) await client.reconciliationRun.create({ data: { id: `signed-${i}`, organizationId: org, paymentRailId: `rail-${org}`, providerAccountId: `account-${org}`, accountingPeriodId: "sep-a", businessDate: new Date(start.getTime() + i * 86400000), periodStart: start, periodEnd: end, status: "SIGNED", signedAt: imported, certificateHash: `h${i}`, createdAt: imported } })
  await client.reconciliationRun.create({ data: { id: "oct-pending", organizationId: org, paymentRailId: `rail-${org}`, providerAccountId: `account-${org}`, accountingPeriodId: "oct-a", businessDate: new Date("2026-10-02"), periodStart: new Date("2026-10-01"), periodEnd: new Date("2026-10-03"), status: "READY_FOR_SIGNOFF", createdAt: imported } })
})
afterAll(async () => { await client.$disconnect() })

it("includes late-imported September evidence and exact endpoints, excluding October, foreign and post-cutoff rows", async () => {
  const rows = await client.statementLine.findMany({ where: closeStatementLineWhere(scope), orderBy: { id: "asc" } })
  expect(rows.map(row => row.id)).toEqual(["end", "start"])
  expect(rows.map(row => row.currencyCode).sort()).toEqual(["USD", "XAF"])
})
it("uses all scoped runs while preserving the organization-wide operational summary", async () => {
  const result = await getPaymentCloseEvidence(scope)
  expect(result.summary).toMatchObject({ signedRunCount: 20, pendingRunCount: 0, readyForSignoffCount: 0 })
  expect(result.recentRuns).toHaveLength(20)
  expect((await getPaymentReconciliationSummary(org)).summary.readyForSignoffCount).toBe(1)
})
it("uses the same resolved scope in the accountant portal against real persisted evidence", async () => {
  const portal = await getAccountantPortalData({ organizationId: org, periodId: "sep-a" }, client, cutoff)
  expect(portal.source.closeScope).toEqual(scope)
  expect(portal.source.scopeHash).toBe(scope.scopeHash)
  await expect(getAccountantPortalData({ organizationId: org, periodId: "sep-b" }, client, cutoff)).rejects.toThrow("not found")
  await expect(getAccountantPortalData({ organizationId: org, periodId: "sep-a", startDate: "2026-10-01" }, client, cutoff)).rejects.toThrow("conflict")
})
it("rejects foreign periods and retains unassigned controls explicitly", async () => {
  await expect(getPaymentCloseEvidence({ ...scope, periodId: "sep-b" })).rejects.toThrow("not found")
  await client.suspenseItem.create({ data: { organizationId: org, type: "OTHER", amount: 1, currencyCode: "USD", createdAt: imported } })
  const result = await getPaymentCloseEvidence(scope)
  expect(result.summary.openSuspenseCount).toBe(1)
  expect(result.organizationControls.unassignedSuspense).toBe(1)
  await client.reconciliationRun.create({ data: { id: "aug-run", organizationId: org, paymentRailId: `rail-${org}`, providerAccountId: `account-${org}`, businessDate: new Date("2026-08-15"), periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), createdAt: imported } })
  await client.suspenseItem.create({ data: { organizationId: org, reconciliationRunId: "aug-run", type: "OTHER", amount: 2, currencyCode: "XAF", createdAt: imported } })
  expect((await getPaymentCloseEvidence(scope)).summary.openSuspenseCount).toBe(2)
})
it("does not erase historical evidence on account deactivation or admit a post-cutoff signature", async () => {
  await client.providerAccount.update({ where: { id: `account-${org}` }, data: { status: "ARCHIVED", archivedAt: new Date() } })
  await client.reconciliationRun.update({ where: { id: "signed-0" }, data: { signedAt: new Date(cutoff.getTime() + 1) } })
  const result = await getPaymentCloseEvidence(scope)
  expect(result.source.statementEvidenceAvailable).toBe(true)
  expect(result.summary).toMatchObject({ signedRunCount: 19, pendingRunCount: 1 })
})
