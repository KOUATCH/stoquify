import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { proposeManualMatch, approveManualMatch } from "../payment-reconciliation-run.service"
import { publishPaymentReconciliationNotification } from "../payment-reconciliation-notifications"

jest.mock("@/prisma/db", () => ({ db: {
  $transaction: jest.fn(), $queryRaw: jest.fn(),
  providerAccount: { findFirst: jest.fn() }, paymentTransaction: { findFirst: jest.fn() },
  providerEvent: { findFirst: jest.fn() }, statementLine: { findFirst: jest.fn() },
  matchRecord: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() }, auditLog: { create: jest.fn() },
  organization: { findFirst: jest.fn() }, tenantModuleConfiguration: { findUnique: jest.fn() },
  tenantModuleGrant: { findMany: jest.fn() }, tenantModuleConfigurationCommand: { count: jest.fn() },
} }))
jest.mock("../payment-reconciliation-notifications", () => ({ publishPaymentReconciliationNotification: jest.fn() }))
const mocked = db as unknown as Record<string, Record<string, jest.Mock>> & { $transaction: jest.Mock; $queryRaw: jest.Mock }
const decimal = (value: string | number) => new Prisma.Decimal(value)
const now = new Date("2026-09-05T20:00:00Z")
const control = (permission: string) => ({ actorPermissions: [permission], lastAuthAt: now, now })
const input = (extra = {}) => ({ organizationId: "org-1", providerAccountId: "pa1", paymentTransactionId: "p1", providerEventId: "e1", proposedById: "maker", amountMatched: "60.00", currencyCode: "XAF", idempotencyKey: "manual-request-00000001", control: control("payments.reconciliation.match"), ...extra })
type Row = Record<string, any>
let rows: Row[], provider: Row, payment: Row, event: Row, line: Row
function relevant(row: Row, query: Row) {
  if (query.organizationId && query.organizationId !== row.organizationId) return false
  if (query.providerAccountId && query.providerAccountId !== row.providerAccountId) return false
  if (query.id && query.id !== row.id) return false
  if (query.correctionOfId && query.correctionOfId !== row.correctionOfId) return false
  if (query.matchedById && query.matchedById !== row.matchedById) return false
  if (typeof query.status === "string" && row.status !== query.status) return false
  if (query.status?.in && !query.status.in.includes(row.status)) return false
  if (query.metadata?.path) return row.metadata?.[query.metadata.path[0]] === query.metadata.equals
  return true
}
async function proposed(extra = {}) { const result = await proposeManualMatch(input(extra)); return rows.find(row => row.id === result.matchId)! }
function approval(row: Row, extra = {}) { return { organizationId: "org-1", proposedMatchId: row.id, approvedById: "checker", expectedEvidenceRevision: row.metadata?.evidenceRevision ?? "legacy-without-revision", control: control("payments.reconciliation.override"), ...extra } }

beforeEach(() => {
  jest.resetAllMocks(); rows = []
  provider = { id: "pa1", organizationId: "org-1", currencyCode: "XAF", status: "ACTIVE", archivedAt: null }
  payment = { id: "p1", organizationId: "org-1", providerAccountId: "pa1", amount: decimal(100), currencyCode: "XAF", direction: "INBOUND", state: "CONFIRMED", providerTransactionId: "txn1", providerReference: "ref1" }
  event = { id: "e1", organizationId: "org-1", providerAccountId: "pa1", amount: decimal(100), currencyCode: "XAF", direction: "INBOUND", status: "VERIFIED", signatureValid: true, rawPayloadHash: "raw-hash", archivedAt: null }
  line = { id: "l1", organizationId: "org-1", providerAccountId: "pa1", amount: decimal(100), currencyCode: "XAF", direction: "CREDIT", status: "UNMATCHED", rawLineHash: "line-hash", archivedAt: null }
  mocked.$transaction.mockImplementation(async work => work(mocked))
  mocked.$queryRaw.mockImplementation(async query => query.sql.includes('"organizations"') ? [{ id: "org-1", requestedModules: [] }] : [{ id: "pa1" }])
  mocked.organization.findFirst.mockResolvedValue({ id: "org-1", requestedModules: [] })
  mocked.tenantModuleConfiguration.findUnique.mockResolvedValue(null)
  mocked.tenantModuleGrant.findMany.mockResolvedValue([])
  mocked.tenantModuleConfigurationCommand.count.mockResolvedValue(0)
  mocked.providerAccount.findFirst.mockImplementation(async () => provider)
  mocked.paymentTransaction.findFirst.mockImplementation(async () => payment)
  mocked.providerEvent.findFirst.mockImplementation(async () => event)
  mocked.statementLine.findFirst.mockImplementation(async () => line)
  mocked.matchRecord.findFirst.mockImplementation(async ({ where }) => rows.find(row => relevant(row, where)) ?? null)
  mocked.matchRecord.findMany.mockImplementation(async ({ where }) => rows.filter(row => relevant(row, where)))
  mocked.matchRecord.create.mockImplementation(async ({ data }) => { const row = { id: `m${rows.length + 1}`, createdAt: now, providerEventId: null, statementLineId: null, ...data }; rows.push(row); return row })
})

describe("manual reconciliation allocation controls", () => {
  it("refuses a payment changed during the provider wait before reading or allocating obsolete evidence", async () => {
    const original = mocked.$queryRaw.getMockImplementation()!
    mocked.$queryRaw.mockImplementation(async query => {
      if (query.sql.includes("payment_transactions")) throw { code: "P2010", meta: { code: "40001" } }
      return original(query)
    })
    await expect(proposed()).rejects.toMatchObject({ code: "CONCURRENCY_CONFLICT" })
    expect(mocked.paymentTransaction.findFirst).not.toHaveBeenCalled()
    expect(mocked.matchRecord.create).not.toHaveBeenCalled()
    expect(rows).toHaveLength(0)
  })
  it("turns a raw PostgreSQL serialization conflict into safe retry without masking other query failures", async () => {
    mocked.$queryRaw.mockRejectedValue({ code: "P2010", meta: { code: "40001" } })
    await expect(proposed()).rejects.toMatchObject({ code: "CONCURRENCY_CONFLICT" })
    const unrelated = { code: "P2010", meta: { code: "42P01" } }
    mocked.$queryRaw.mockRejectedValue(unrelated)
    await expect(proposed()).rejects.toBe(unrelated)
    expect(rows).toHaveLength(0)
  })
  it("rejects a missing organization before reading payment or proposal data", async () => {
    mocked.$queryRaw.mockResolvedValue([])
    await expect(proposed()).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(mocked.paymentTransaction.findFirst).not.toHaveBeenCalled()
    expect(mocked.matchRecord.findFirst).not.toHaveBeenCalled()
    expect(rows).toHaveLength(0)
  })
  it("propagates authority read failures without reverting to legacy grants", async () => {
    mocked.tenantModuleGrant.findMany.mockRejectedValue(new Error("Authority database unavailable"))
    await expect(proposed()).rejects.toThrow("Authority database unavailable")
    expect(mocked.paymentTransaction.findFirst).not.toHaveBeenCalled()
    expect(rows).toHaveLength(0)
  })
  const grants = (overrides = {}) => ["payment_reconciliation", "finance", "accounting"].map(moduleSlug => ({ moduleSlug, status: "active", source: "manual_override", readOnly: false, trial: false, startsAt: null, endsAt: null, ...(moduleSlug === "payment_reconciliation" ? overrides : {}) }))
  it.each([
    { status: "read_only" }, { status: "suspended" }, { status: "expired" }, { status: "unavailable" },
    { readOnly: true }, { startsAt: new Date("2077-01-01") }, { endsAt: new Date("2000-01-01") },
  ])("rejects non-writable module access %j before proposal evidence is read", async invalid => {
    mocked.tenantModuleConfiguration.findUnique.mockResolvedValue({ organizationId: "org-1" })
    mocked.tenantModuleGrant.findMany.mockResolvedValue(grants(invalid))
    await expect(proposed()).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(rows).toHaveLength(0); expect(mocked.paymentTransaction.findFirst).not.toHaveBeenCalled()
  })
  it("does not restore legacy access for managed empty grants or accept suspended dependencies", async () => {
    mocked.tenantModuleConfiguration.findUnique.mockResolvedValue({ organizationId: "org-1" })
    await expect(proposed()).rejects.toMatchObject({ code: "FORBIDDEN" })
    mocked.tenantModuleGrant.findMany.mockResolvedValue(grants().map(row => row.moduleSlug === "accounting" ? { ...row, status: "suspended" } : row))
    await expect(proposed()).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(rows).toHaveLength(0)
  })
  it("rechecks module authority for an existing proposal without deleting it", async () => {
    const old = await proposed()
    mocked.tenantModuleConfiguration.findUnique.mockResolvedValue({ organizationId: "org-1" })
    mocked.tenantModuleGrant.findMany.mockResolvedValue(grants({ status: "read_only" }))
    await expect(approveManualMatch(approval(old, { control: { ...control("payments.reconciliation.override"), actorPermissions: ["*", "payments.reconciliation.override"] } }))).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(rows).toHaveLength(1); expect(old.status).toBe("PROPOSED")
    expect(mocked.auditLog.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "MODULE_ENTITLEMENT_ENFORCED" }) }))
  })
  it("keeps valid allocation rights when workspace shortcuts are deselected or manual-journal admission is stopped", async () => {
    mocked.tenantModuleConfiguration.findUnique.mockResolvedValue({ organizationId: "org-1", activeModules: [], selectedModules: [], newWorkStoppedModules: ["accounting"] })
    mocked.tenantModuleGrant.findMany.mockResolvedValue(grants())
    const old = await proposed(); await expect(approveManualMatch(approval(old))).resolves.toMatchObject({ status: "APPROVED" })
  })
  it("rejects missing proposal permission before a match is saved", async () => {
    await expect(proposed({ control: control("payments.reconciliation.read") })).rejects.toThrow()
    expect(rows).toHaveLength(0)
  })
  it.each(["FAILED", "CANCELLED", "REFUNDED", "PENDING", "DISPUTED"])("rejects internal state %s", async state => {
    payment.state = state; await expect(proposed()).rejects.toThrow(); expect(rows).toHaveLength(0)
  })
  it.each(["REJECTED", "TAMPERED", "ARCHIVED", "RECEIVED"])("rejects provider state %s", async status => {
    event.status = status; await expect(proposed()).rejects.toThrow(); expect(rows).toHaveLength(0)
  })
  it.each([{ signatureValid: false }, { direction: "OUTBOUND" }, { direction: null }, { archivedAt: now }])("rejects nonauthoritative event %j", async invalid => {
    Object.assign(event, invalid); await expect(proposed()).rejects.toThrow(); expect(rows).toHaveLength(0)
  })
  it.each(["UNKNOWN", "REVERSAL", "FEE", "DEBIT"])("rejects unsupported statement direction %s for inbound payment", async direction => {
    line.direction = direction; await expect(proposed({ providerEventId: undefined, statementLineId: "l1" })).rejects.toThrow(); expect(rows).toHaveLength(0)
  })
  it.each(["0", "-1", "NaN", "Infinity", "0.001"])("rejects invalid or over-precision amount %s", async amountMatched => {
    await expect(proposed({ amountMatched })).rejects.toThrow(); expect(rows).toHaveLength(0)
  })
  it("returns the same committed proposal after an exact retry", async () => {
    const first = await proposeManualMatch(input()); const second = await proposeManualMatch(input())
    expect(second).toMatchObject({ matchId: first.matchId, alreadyApplied: true, status: "PROPOSED" })
    expect(rows).toHaveLength(1); expect(publishPaymentReconciliationNotification).toHaveBeenCalledTimes(1)
  })
  it("rejects a changed payload under the original key", async () => {
    await proposed(); await expect(proposed({ amountMatched: "50.00" })).rejects.toThrow(/different|reused/i); expect(rows).toHaveLength(1)
  })
  it("refuses a proposal beyond either remaining allocation", async () => {
    rows.push({ id: "old", organizationId: "org-1", providerAccountId: "pa1", paymentTransactionId: "p1", providerEventId: "e1", status: "AUTO_MATCHED", amountMatched: decimal(60), currencyCode: "XAF" })
    await expect(proposed({ amountMatched: "50.00" })).rejects.toThrow(/remaining|allocated/i); expect(rows).toHaveLength(1)
  })
  it("binds proposals to reviewed evidence and revalidates before independent approval", async () => {
    const row = await proposed(); expect(row.metadata.evidenceRevision).toMatch(/^sha256:[a-f0-9]{64}$/)
    payment.amount = decimal(120)
    await expect(approveManualMatch(approval(row))).rejects.toThrow(/changed|refresh/i)
    expect(rows.filter(value => value.status === "APPROVED")).toHaveLength(0)
  })
  it.each([{ control: control("payments.reconciliation.read") }, { control: { actorPermissions: ["payments.reconciliation.override"], now, lastAuthAt: new Date(now.getTime() - 3600000) } }, { approvedById: "maker" }])("requires current approval authority and independent reviewer %j", async extra => {
    const row = await proposed(); await expect(approveManualMatch(approval(row, extra))).rejects.toThrow(); expect(rows).toHaveLength(1)
  })
  it("rejects a forged review revision", async () => {
    const row = await proposed(); await expect(approveManualMatch(approval(row, { expectedEvidenceRevision: `sha256:${"0".repeat(64)}` }))).rejects.toThrow(/changed|refresh/i); expect(rows).toHaveLength(1)
  })
  it("rechecks allocation when another proposal was approved first", async () => {
    const first = await proposed(), second = await proposed({ idempotencyKey: "manual-request-00000002" })
    await approveManualMatch(approval(first))
    await expect(approveManualMatch(approval(second))).rejects.toThrow(/remaining|allocated/i)
    expect(rows.filter(row => row.status === "APPROVED")).toHaveLength(1)
  })
  it("returns an existing approval without a second allocation or notification", async () => {
    const row = await proposed(); const first = await approveManualMatch(approval(row)); const retry = await approveManualMatch(approval(row))
    expect(retry).toMatchObject({ matchId: first.matchId, alreadyApplied: true, status: "APPROVED" })
    expect(rows.filter(value => value.status === "APPROVED")).toHaveLength(1)
    expect(publishPaymentReconciliationNotification).toHaveBeenCalledTimes(2)
  })
  it("renews stale evidence with a new proposal and append-only supersession", async () => {
    const old = await proposed(); payment.state = "SETTLED"
    const replacementInput = input({ idempotencyKey: "replacement-request-0001", supersedesProposalId: old.id })
    const replacement = await proposeManualMatch(replacementInput)
    expect(old.status).toBe("PROPOSED")
    expect(rows.find(row => row.correctionOfId === old.id)).toMatchObject({ status: "VOIDED", metadata: { replacementProposalId: replacement.matchId } })
    expect(await proposeManualMatch(replacementInput)).toMatchObject({ matchId: replacement.matchId, alreadyApplied: true })
    await expect(approveManualMatch(approval(old))).rejects.toThrow(/decision/i)
    await expect(approveManualMatch(approval(rows.find(row => row.id === replacement.matchId)!))).resolves.toMatchObject({ status: "APPROVED" })
  })
  it("refuses renewal by a different preparer or after approval", async () => {
    const old = await proposed()
    await expect(proposed({ supersedesProposalId: old.id, proposedById: "other-maker", idempotencyKey: "replacement-request-0001" })).rejects.toThrow(/not found/i)
    await approveManualMatch(approval(old))
    await expect(proposed({ supersedesProposalId: old.id, amountMatched: "20.00", idempotencyKey: "replacement-request-0002" })).rejects.toThrow(/decision/i)
  })
  it("passes the transaction to both manual notifications", async () => {
    const row = await proposed(); await approveManualMatch(approval(row))
    for (const call of (publishPaymentReconciliationNotification as jest.Mock).mock.calls) expect(call[1]).toBe(mocked)
    expect(mocked.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }))
  })
})
