jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
import { closePeriodInputSchema, reopenPeriodInputSchema, assertPeriodControlAuthority, requirePeriodCloseApprovalInTx } from "../period-control.service"
const hash = "sha256:" + "a".repeat(64)
const revision = { version: 1 as const, revision: "7" }
const metadata = { sourceRevision: revision, certifiedExportId: "pack", certifiedById: "reviewer", certifiedContentHash: hash }
let run: any, pack: any, tx: any
beforeEach(() => {
  run = { id: "run", periodId: "period", runById: "maker", status: "CERTIFIED", completedAt: new Date("2026-01-01"), metadata, findings: [], checklistItems: [], evidenceItems: [], criticalBlockerCount: 0, highBlockerCount: 0 }
  pack = { id: "pack", exportedById: "reviewer", exportedAt: new Date("2026-01-02"), contentHash: hash, metadata: {} }
  tx = { $queryRaw: jest.fn(async () => []), closeRun: { findMany: jest.fn(async () => [{ id: "run", createdAt: new Date("2026-01-01") }]), findFirst: jest.fn(async () => run) }, closePackExport: { findFirst: jest.fn(async () => pack) } }
})
it("binds the retained approval to the exact current run, tenant, period, hash and source revision", async () => {
  expect(await requirePeriodCloseApprovalInTx(tx, "org", "period", revision)).toEqual({ closeRunId: "run", certifiedExportId: "pack", contentHash: hash, approvedById: "reviewer", preparedById: "maker", sourceRevision: "7" })
  expect(tx.closePackExport.findFirst).toHaveBeenCalledWith({ where: { id: "pack", organizationId: "org", periodId: "period", closeRunId: "run", isCertified: true } })
})
it.each(["READY", "BLOCKED", "RUNNING", "VOIDED"])("does not accept %s as approved close", async status => {
  run.status = status
  await expect(requirePeriodCloseApprovalInTx(tx, "org", "period", revision)).rejects.toThrow("independent certified approval")
})
it.each(["missing", "self", "hash", "stale", "actor", "future"])("rejects %s retained approval", async kind => {
  if (kind === "missing") pack = null
  if (kind === "self") pack.exportedById = "maker"
  if (kind === "hash") pack.contentHash = "b".repeat(64)
  if (kind === "stale") pack.metadata = { staleState: { status: "EVIDENCE_STALE" } }
  if (kind === "actor") pack.exportedById = "other-reviewer"
  if (kind === "future") pack.exportedAt = new Date(Date.now() + 60000)
  await expect(requirePeriodCloseApprovalInTx(tx, "org", "period", revision)).rejects.toThrow("retained close approval")
})
it.each(["revision", "voided", "findings", "checklistItems", "evidenceItems", "criticalBlockerCount", "highBlockerCount"])("rejects changed %s", async key => {
  if (key === "revision") run.metadata = { ...metadata, sourceRevision: { version: 1, revision: "6" } }
  else if (key === "voided") run.voidedAt = new Date()
  else run[key] = key.endsWith("Count") ? 1 : [{}]
  await expect(requirePeriodCloseApprovalInTx(tx, "org", "period", revision)).rejects.toThrow()
})
it("rejects ambiguous latest assessments instead of selecting an older approval", async () => {
  tx.closeRun.findMany.mockResolvedValue([{ id: "run", createdAt: new Date(0) }, { id: "other", createdAt: new Date(0) }])
  await expect(requirePeriodCloseApprovalInTx(tx, "org", "period", revision)).rejects.toThrow()
  expect(tx.closeRun.findFirst).not.toHaveBeenCalled()
})
it.each([NaN, Date.now() + 60000, Date.now() - 301000])("rejects invalid/future/expired authentication %s", instant => {
  expect(() => assertPeriodControlAuthority({ organizationId: "org", actorId: "actor", actorPermissions: ["accounting.period.reopen"], lastAuthAt: new Date(instant) }, "accounting.period.reopen")).toThrow("fresh authentication")
})
it("requires a version, meaningful reopening reason and strict server-owned authority", () => {
  expect(closePeriodInputSchema.safeParse({ periodId: "p" }).success).toBe(false)
  expect(reopenPeriodInputSchema.safeParse({ periodId: "p", expectedVersion: 1, reason: "short", idempotencyKey: "k" }).success).toBe(false)
  expect(reopenPeriodInputSchema.safeParse({ periodId: "p", expectedVersion: 1, reason: "Correct omitted invoice", idempotencyKey: "k", organizationId: "foreign" }).success).toBe(false)
  expect(() => assertPeriodControlAuthority({ organizationId: "org", actorId: "actor", actorPermissions: ["*"], lastAuthAt: new Date() }, "accounting.period.reopen")).toThrow()
})
