import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { recordOrderedReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import { JournalReversalSnapshotChangedError, lockJournalReversalCatalogInTx, lockJournalReversalClosePeriodsInTx } from "@/services/accounting/journal-reversal-order.service"
import { auditSensitiveActionDecision } from "@/services/controls/sensitive-action.service"
import { suspenseEvidenceHash, suspensePostingSourceHash } from "../payment-suspense-evidence"
import * as correction from "../payment-suspense-correction.service"
import * as recovery from "../payment-suspense-resolution-recovery.service"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/accounting/periods.service", () => ({ getOpenPeriodForDate: jest.fn() }))
jest.mock("@/services/accounting/source-link.service", () => ({ createAccountingSourceLink: jest.fn() }))
jest.mock("@/services/accounting/journal-close-invalidation.service", () => ({ recordOrderedReversedJournalCloseInvalidationsInTx: jest.fn() }))
jest.mock("@/services/accounting/journal-reversal-order.service", () => ({
  ...jest.requireActual("@/services/accounting/journal-reversal-order.service"),
  lockJournalReversalCatalogInTx: jest.fn(), lockJournalReversalClosePeriodsInTx: jest.fn(),
}))
jest.mock("@/services/controls/sensitive-action.service", () => ({
  ...jest.requireActual("@/services/controls/sensitive-action.service"), auditSensitiveActionDecision: jest.fn(),
}))
jest.mock("../payment-suspense-ledger.service", () => ({ assertPaymentSuspenseLedgerTruthInTx: jest.fn() }))
jest.mock("../payment-suspense-cycle-ledger.service", () => ({
  correctionJournalInclude: {}, correctionJournalHash: (row: { id: string }) => `journal-hash:${row.id}`,
  assertCycleJournal: jest.fn(), assertPriorSuspenseCyclesInTx: jest.fn().mockResolvedValue(1),
  assertCompensatedSuspenseCycleInTx: jest.fn(),
}))
jest.mock("../payment-suspense-resolution-evidence.service", () => ({
  suspenseResolutionManifestEvidenceInTx: jest.fn().mockResolvedValue({ allocationId: "allocation", decisionId: "resolution", decisionHash: "resolution-hash" }),
}))
jest.mock("../payment-suspense-resolution-recovery-evidence.service", () => ({ assertSuspenseResolutionRecoveryInTx: jest.fn() }))
jest.mock("../payment-reconciliation-notifications", () => ({ publishPaymentReconciliationNotification: jest.fn() }))

const now = new Date("2026-10-01T12:00:00Z")
const businessDate = new Date("2026-08-10T00:00:00Z")
const originalDate = new Date("2026-09-10T00:00:00Z")
const permissions = ["payments.reconciliation.read", "accounting.journal.read", "payments.reconciliation.suspense.propose", "payments.reconciliation.suspense.post", "accounting.journal.reverse"]
const control = (actorId = "checker") => ({ organizationId: "org", actorId, actorPermissions: permissions, lastAuthAt: now, now })
const draft = { suspenseItemId: "item", reason: "Independent source review", reversalDate: "2026-10-01" }
const routes = [
  { name: "correction", preview: correction.previewSuspenseCorrection, propose: correction.proposeSuspenseCorrection, review: correction.reviewSuspenseCorrection, decide: correction.decideSuspenseCorrection, sourceId: "original", outcome: "REOPENED" },
  { name: "recovery", preview: recovery.previewSuspenseResolutionRecovery, propose: recovery.proposeSuspenseResolutionRecovery, review: recovery.reviewSuspenseResolutionRecovery, decide: recovery.decideSuspenseResolutionRecovery, sourceId: "clearing", outcome: "POSTED_TO_SUSPENSE" },
] as const

describe.each(routes)("$name source reversal command ordering", route => {
  let events: string[]
  let wallClock: number
  let rows: Array<{ id: string; idempotencyKey: string; payloadHash: string; payloadSummary: Record<string, unknown> }>
  let item: Record<string, any>
  let tx: Record<string, any>
  let command: Parameters<typeof correction.decideSuspenseCorrection>[0]
  const catalog = jest.mocked(lockJournalReversalCatalogInTx)
  const scope = jest.mocked(lockJournalReversalClosePeriodsInTx)
  const ordered = jest.mocked(recordOrderedReversedJournalCloseInvalidationsInTx)
  const period = jest.mocked(getOpenPeriodForDate)

  beforeEach(async () => {
    jest.clearAllMocks()
    events = []; rows = []; wallClock = now.getTime()
    jest.spyOn(Date, "now").mockImplementation(() => wallClock)
    const reclassification = { proposedById: "posting-maker", reason: "Original source classification" }
    item = { id: "item", organizationId: "org", providerAccountId: null, reconciliationRunId: "run", providerAccount: null,
      reconciliationRun: { id: "run", organizationId: "org", businessDate, status: "NEEDS_REVIEW" },
      status: route.name === "correction" ? "POSTED_TO_SUSPENSE" : "RESOLVED", postedAt: originalDate,
      ledgerPostingBatchId: "original-batch", amount: new Prisma.Decimal(100), currencyCode: "XAF", type: "UNKNOWN_CREDIT",
      suspenseLedgerAccountId: "suspense-account", ownerId: null, updatedAt: originalDate, metadata: { reclassification } }
    const approval = { inboxItemId: "posting-approval", sourceHash: suspensePostingSourceHash(item as never, originalDate), approvedAt: originalDate.toISOString(),
      proposedById: "posting-maker", approvedById: "poster", reviewedRevision: "posting-revision", proposalHash: suspenseEvidenceHash(reclassification), ledgerPostingBatchId: "original-batch" }
    item.metadata.postingApproval = approval
    const append = (id: string, body: Record<string, unknown>, idempotencyKey = id) => {
      const row = { id, idempotencyKey, payloadSummary: body, payloadHash: suspenseEvidenceHash(body).slice(7) }; rows.push(row); return row
    }
    append("posting-approval", { reviewedRevision: "posting-revision", suspenseItemId: "item", ledgerPostingBatchId: "original-batch", approvedById: "poster", requestedById: "posting-maker" })
    append("allocation", { clearingJournalId: "clearing" })
    const journal = (id: string) => ({ id, organizationId: "org", postedById: "poster", periodId: "original-period", entryDate: originalDate,
      postingBatchId: `${id}-batch`, postingBatch: { periodId: "retained-batch-period" }, journalId: "journal", entryNumber: id, currency: "XAF",
      lines: [{ id: "line", accountId: "class3", account: { organizationId: "org", syscohadaClass: "3" }, lineNumber: 1,
        debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF", exchangeRate: new Prisma.Decimal(1),
        baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0), dimensions: null }] })
    tx = {
      $queryRaw: jest.fn(async () => { events.push("source-lock"); return [] }),
      user: { findFirst: jest.fn().mockResolvedValue({ id: "checker" }) },
      suspenseItem: { findFirst: jest.fn(async () => item), update: jest.fn(async ({ data }) => { events.push("item-write"); item = { ...item, ...data }; return item }) },
      paymentReconciliationInboxItem: {
        findFirst: jest.fn(async ({ where }) => rows.find(row => where.id ? row.id === where.id : row.idempotencyKey === where.idempotencyKey) ?? null),
        create: jest.fn(async ({ data }) => { events.push("receipt-write"); rows.push(data); return data }),
      },
      ledgerAuditEvent: { findFirst: jest.fn().mockResolvedValue({ id: "posting-audit" }), create: jest.fn().mockResolvedValue({}) },
      journalEntry: { findMany: jest.fn().mockResolvedValue([journal("original")]), findFirstOrThrow: jest.fn().mockResolvedValue(journal("clearing")),
        create: jest.fn(async ({ data }) => { events.push("journal-write"); return { ...data, id: "reversal", lines: data.lines.create } }), update: jest.fn().mockResolvedValue({}) },
      ledgerPostingBatch: { create: jest.fn(async () => { events.push("batch-write"); return { id: "reversal-batch" } }), update: jest.fn().mockResolvedValue({}) },
      paymentException: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, reconciliationRun: { update: jest.fn().mockResolvedValue({}) },
    }
    jest.mocked(db.$transaction).mockImplementation(async (work: any) => work({ ...tx }) as never)
    catalog.mockImplementation(async () => { events.push("catalog") })
    scope.mockImplementation(async () => { events.push("scope"); return ["business-date-period", "later-period", "original-period", "reversal-period"] })
    ordered.mockImplementation(async () => { events.push("ordered-invalidation"); return { invalidatedCount: 0, results: [] } })
    period.mockImplementation(async () => { events.push("posting-period"); return { id: "reversal-period" } as never })
    jest.mocked(auditSensitiveActionDecision).mockImplementation(async (_tx, decision) => { events.push(`authority:${decision.allowed}`); return undefined as never })
    const preview = await route.preview(draft, control("maker"))
    const proposal = await route.propose({ ...draft, expectedRevision: preview.revision, idempotencyKey: "550e8400-e29b-41d4-a716-446655440000" }, control("maker"))
    const reviewed = await route.review("item", proposal.proposalId, control())
    command = { suspenseItemId: "item", proposalId: proposal.proposalId, expectedRevision: reviewed.revision, decision: "APPROVE", reason: "Independent correction authorized" }
    events = []; jest.clearAllMocks()
  })
  afterEach(() => jest.restoreAllMocks())

  it("prepares all evidence dates and class-3 scope before one financial effect and one ordered invalidation", async () => {
    await expect(route.decide(command, control())).resolves.toMatchObject({ outcome: route.outcome, replayed: false })
    expect(events.indexOf("catalog")).toBeLessThan(events.indexOf("source-lock"))
    expect(events.indexOf("posting-period")).toBeLessThan(events.indexOf("scope"))
    expect(events.indexOf("scope")).toBeLessThan(events.indexOf("batch-write"))
    expect(events.indexOf("scope")).toBeLessThan(events.lastIndexOf("authority:true"))
    expect(events.lastIndexOf("authority:true")).toBeLessThan(events.indexOf("batch-write"))
    expect(scope).toHaveBeenCalledWith(expect.anything(), "org", expect.objectContaining({ originalPeriodId: "original-period", reversalPeriodId: "reversal-period", originalEntryDate: originalDate, includeLaterPeriods: true, includeAllPeriods: true, additionalEvidenceDates: [businessDate], additionalPeriodIds: ["retained-batch-period"] }), db)
    expect(ordered).toHaveBeenCalledWith(expect.anything(), "org", expect.objectContaining({ originalJournalEntryId: route.sourceId, affectedPeriodIds: ["business-date-period", "later-period", "original-period", "reversal-period"] }), expect.anything())
    expect(tx.ledgerPostingBatch.create).toHaveBeenCalledTimes(1)
    expect(jest.mocked(db.$transaction).mock.calls[0][1]).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  })

  it.each(["catalog", "scope"])("restarts the entire snapshot after %s visibility changes without duplicating effects", async boundary => {
    if (boundary === "catalog") catalog.mockRejectedValueOnce(new JournalReversalSnapshotChangedError())
    else scope.mockRejectedValueOnce(new JournalReversalSnapshotChangedError())
    await expect(route.decide(command, control())).resolves.toMatchObject({ outcome: route.outcome })
    expect(db.$transaction).toHaveBeenCalledTimes(2)
    expect(catalog).toHaveBeenCalledTimes(2)
    expect(catalog.mock.calls[0][0]).not.toBe(catalog.mock.calls[1][0])
    expect(tx.ledgerPostingBatch.create).toHaveBeenCalledTimes(1)
    expect(ordered).toHaveBeenCalledTimes(1)
  })

  it("bounds repeated snapshot changes to three empty attempts", async () => {
    scope.mockRejectedValue(new JournalReversalSnapshotChangedError())
    await expect(route.decide(command, control())).rejects.toMatchObject({ code: "CONFLICT" })
    expect(db.$transaction).toHaveBeenCalledTimes(3)
    expect(tx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(tx.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
  })

  it.each(["APPROVE", "REJECT"] as const)("does not extend supplied fresh authentication through %s waits", async decision => {
    if (decision === "APPROVE") scope.mockImplementation(async () => { wallClock += 2_000; return ["original-period", "reversal-period"] })
    else period.mockImplementation(async () => { wallClock += 2_000; return { id: "reversal-period" } as never })
    await expect(route.decide({ ...command, decision }, { ...control(), lastAuthAt: new Date(now.getTime() - 299_000) })).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
    expect(tx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(tx.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
    expect(tx.suspenseItem.update).not.toHaveBeenCalled()
    if (decision === "REJECT") { expect(catalog).not.toHaveBeenCalled(); expect(scope).not.toHaveBeenCalled() }
  })

  it("retains exact approved replay without redoing financial preparation", async () => {
    const first = await route.decide(command, control())
    await expect(route.decide(command, control())).resolves.toEqual({ ...first, replayed: true })
    expect(tx.ledgerPostingBatch.create).toHaveBeenCalledTimes(1)
    expect(scope).toHaveBeenCalledTimes(1)
    await expect(route.decide({ ...command, reason: "Different approval reason" }, control())).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
    expect(tx.ledgerPostingBatch.create).toHaveBeenCalledTimes(1)
  })

  it("preserves explicit stale-review rejection before financial preparation", async () => {
    await expect(route.decide({ ...command, expectedRevision: `sha256:${"f".repeat(64)}` }, control())).rejects.toMatchObject({ code: "CONFLICT" })
    expect(scope).not.toHaveBeenCalled(); expect(tx.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })

  it.each(["maker", "poster"])("denies self approval by %s before effects", async actorId => {
    await expect(route.decide(command, control(actorId))).rejects.toMatchObject({ code: "SOD_VIOLATION" })
    expect(scope).not.toHaveBeenCalled(); expect(tx.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })

  it("rejects a missing tenant actor before evidence or financial effects", async () => {
    tx.user.findFirst.mockResolvedValue(null)
    await expect(route.decide(command, control())).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(tx.paymentReconciliationInboxItem.findFirst).not.toHaveBeenCalled()
    expect(tx.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })

  it.each([{ code: "P2034", meta: undefined }, { code: "P2010", meta: { code: "40001" } }])("retains explicit $code conflict without automatic retry", async ({ code, meta }) => {
    catalog.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Concurrent change", { code, meta, clientVersion: "6.19.3" }))
    await expect(route.decide(command, control())).rejects.toMatchObject({ code: "CONFLICT" })
    expect(db.$transaction).toHaveBeenCalledTimes(1); expect(tx.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })
})
