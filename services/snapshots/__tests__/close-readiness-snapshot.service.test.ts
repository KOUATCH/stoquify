import { CloseChecklistStatus, CloseFindingSeverity, CloseFindingStatus, CloseRunStatus, Prisma } from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    accountingPeriod: { count: jest.fn(), findFirst: jest.fn() },
    closeRun: { findMany: jest.fn(), findFirst: jest.fn() },
    closeAssuranceFinding: { count: jest.fn(), findFirst: jest.fn(), groupBy: jest.fn() },
    closeEvidenceItem: { count: jest.fn(), findFirst: jest.fn(), groupBy: jest.fn() },
    closeChecklistItem: { findFirst: jest.fn(), groupBy: jest.fn() },
    closePackExport: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { db } from "@/prisma/db"

import { getCloseReadinessSnapshot } from "../close-readiness-snapshot.service"

const mockDb = db as unknown as {
  accountingPeriod: { count: jest.Mock; findFirst: jest.Mock }
  closeRun: { findMany: jest.Mock; findFirst: jest.Mock }
  closeAssuranceFinding: { count: jest.Mock; findFirst: jest.Mock; groupBy: jest.Mock }
  closeEvidenceItem: { count: jest.Mock; findFirst: jest.Mock; groupBy: jest.Mock }
  closeChecklistItem: { findFirst: jest.Mock; groupBy: jest.Mock }
  closePackExport: { findMany: jest.Mock }
  $transaction: jest.Mock
}

const latest = new Date("2026-06-20T10:00:00.000Z")
const scope = { organizationId: "org-1", periodStart: "2026-06-01", periodEnd: "2026-06-30", now: "2026-06-20T12:00:00.000Z" }
const staleMetadata = { staleState: { status: "EVIDENCE_STALE", sourceRecordId: "private-source" } }
function run(overrides: Partial<{ id: string; periodId: string; status: CloseRunStatus; readinessScore: number; metadata: Prisma.JsonValue; createdAt: Date; updatedAt: Date; voidedAt: Date | null }> = {}) {
  return { id: "run-private", periodId: "period-private", status: CloseRunStatus.CERTIFIED, readinessScore: 95, metadata: null, createdAt: latest, updatedAt: latest, voidedAt: null, ...overrides }
}
function pack(overrides: Partial<{ id: string; closeRunId: string; contentHash: string; metadata: Prisma.JsonValue; updatedAt: Date }> = {}) {
  return { id: "export-private", closeRunId: "run-private", contentHash: "private-pack-hash", metadata: null, updatedAt: latest, ...overrides }
}
function severityGroup(severity: CloseFindingSeverity, count = 1) {
  return { closeRunId: "run-private", severity, _count: { _all: count }, _max: { updatedAt: latest } }
}

function setupTenantCloseReadinessMocks() {
  ;(getVerifiedCloseEvidenceReplacementsInTx as jest.Mock).mockResolvedValue({ evidenceIds: [], sourceBindings: [] })
  mockDb.accountingPeriod.count.mockResolvedValue(1)
  mockDb.$transaction.mockImplementation(async (read: (client: typeof mockDb) => Promise<unknown>) => read(mockDb))
  mockDb.closeRun.findMany.mockResolvedValue([run()])
  mockDb.closePackExport.findMany.mockResolvedValue([pack()])
  mockDb.closeAssuranceFinding.groupBy.mockResolvedValue([])
  mockDb.closeEvidenceItem.groupBy.mockResolvedValue([])
  mockDb.closeChecklistItem.groupBy.mockResolvedValue([])
  mockDb.closeChecklistItem.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.closeAssuranceFinding.count.mockResolvedValue(0)
  mockDb.closeEvidenceItem.count.mockResolvedValue(0)
  mockDb.accountingPeriod.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.closeRun.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.closeEvidenceItem.findFirst.mockResolvedValue({ updatedAt: latest })
}

describe("close readiness snapshot service", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    setupTenantCloseReadinessMocks()
  })

  it("blocks unsupported location scope before tenant-wide close queries", async () => {
    const result = await getCloseReadinessSnapshot({
      organizationId: "org-1",
      locationId: "loc-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-20T12:00:00.000Z",
    })

    expect(mockDb.accountingPeriod.count).not.toHaveBeenCalled()
    expect(mockDb.closeRun.findMany).not.toHaveBeenCalled()
    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.count).not.toHaveBeenCalled()
    expect(mockDb.closeEvidenceItem.count).not.toHaveBeenCalled()
    expect(mockDb.accountingPeriod.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeRun.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeEvidenceItem.findFirst).not.toHaveBeenCalled()

    expect(result).toMatchObject({
      kind: "close.readiness",
      organizationId: "org-1",
      locationId: "loc-1",
      status: "blocked",
      uiState: "blocked",
      evidenceGrade: "blocked",
      metrics: {
        accountingPeriodCount: 0,
        openPeriodCount: 0,
        recentCloseRunCount: 0,
        certifiedCloseRunCount: 0,
        blockedCloseRunCount: 0,
        averageReadinessScore: null,
        openFindingCount: 0,
        criticalOpenFindingCount: 0,
        unavailableEvidenceCount: 0,
      },
      blockers: [
        expect.objectContaining({
          id: "close-location-scope-unsupported",
          severity: "high",
          gate: "close_readiness_scope",
        }),
      ],
    })
  })

  it("preserves tenant-wide certified close readiness", async () => {
    setupTenantCloseReadinessMocks()

    const result = await getCloseReadinessSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-20T12:00:00.000Z",
    })

    expect(mockDb.accountingPeriod.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }),
    )
    expect(mockDb.closeRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }),
    )
    expect(result).toMatchObject({
      kind: "close.readiness",
      organizationId: "org-1",
      locationId: null,
      status: "fresh",
      evidenceGrade: "certified",
      metrics: {
        accountingPeriodCount: 1,
        openPeriodCount: 1,
        recentCloseRunCount: 1,
        certifiedCloseRunCount: 1,
        blockedCloseRunCount: 0,
        averageReadinessScore: 95,
      },
      blockers: [],
    })
  })

  it("blocks a status-only CERTIFIED run without current certified export evidence", async () => {
    mockDb.closePackExport.findMany.mockResolvedValue([])
    const result = await getCloseReadinessSnapshot(scope)
    expect(result).toMatchObject({ status: "blocked", evidenceGrade: "blocked", metrics: { certifiedCloseRunCount: 0, blockedCloseRunCount: 1 } })
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "close-certified-export-missing", severity: "high" }))
  })

  it.each([CloseRunStatus.CERTIFIED, CloseRunStatus.EXPORTED])("blocks invalidated run evidence despite a retained pack (%s)", async (status) => {
    mockDb.closeRun.findMany.mockResolvedValue([run({ status, metadata: staleMetadata })])
    const result = await getCloseReadinessSnapshot(scope)
    expect(result).toMatchObject({ evidenceGrade: "blocked", metrics: { certifiedCloseRunCount: 0, blockedCloseRunCount: 1 } })
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "close-evidence-stale", severity: "high" }))
    expect(JSON.stringify(result)).not.toContain("private-source")
  })

  it.each([[CloseRunStatus.CERTIFIED, "blocked"], [CloseRunStatus.EXPORTED, "operational"]] as const)("does not use an individually invalidated export to certify %s", async (status, grade) => {
    mockDb.closeRun.findMany.mockResolvedValue([run({ status })])
    mockDb.closePackExport.findMany.mockResolvedValue([pack({ metadata: staleMetadata })])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ evidenceGrade: grade, metrics: { certifiedCloseRunCount: 0 } })
  })

  it("retains invalidated history while a separate current certified export supports an EXPORTED run", async () => {
    mockDb.closeRun.findMany.mockResolvedValue([run({ status: CloseRunStatus.EXPORTED })])
    mockDb.closePackExport.findMany.mockResolvedValue([pack({ id: "old", metadata: staleMetadata }), pack()])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ evidenceGrade: "certified", metrics: { certifiedCloseRunCount: 1 } })
  })

  it.each([CloseRunStatus.READY, CloseRunStatus.EXPORTED])("keeps %s without certification proof operational", async (status) => {
    mockDb.closeRun.findMany.mockResolvedValue([run({ status })])
    mockDb.closePackExport.findMany.mockResolvedValue([])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ evidenceGrade: "operational", metrics: { certifiedCloseRunCount: 0, blockedCloseRunCount: 0 } })
  })

  it.each([CloseFindingSeverity.HIGH, CloseFindingSeverity.CRITICAL])("blocks unresolved %s findings beyond display samples", async (severity) => {
    mockDb.closeAssuranceFinding.groupBy.mockResolvedValue([severityGroup(severity, 41)])
    const result = await getCloseReadinessSnapshot(scope)
    expect(result).toMatchObject({ evidenceGrade: "blocked", metrics: { certifiedCloseRunCount: 0, blockedCloseRunCount: 1 } })
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "close-findings-open", severity: "high", detail: "41 finding(s) remain unresolved in the selected close runs." }))
  })

  it.each([CloseFindingSeverity.HIGH, CloseFindingSeverity.CRITICAL])("blocks %s failed or unavailable checklist controls beyond display samples", async (severity) => {
    mockDb.closeChecklistItem.groupBy.mockResolvedValue([severityGroup(severity, 47)])
    const result = await getCloseReadinessSnapshot(scope)
    expect(result).toMatchObject({ evidenceGrade: "blocked", metrics: { certifiedCloseRunCount: 0, blockedCloseRunCount: 1 } })
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "close-checklist-incomplete", severity: "high", detail: "47 checklist control(s) failed or are unavailable in the selected close runs." }))
  })

  it("retains medium warnings under the existing proof grading policy", async () => {
    mockDb.closeAssuranceFinding.groupBy.mockResolvedValue([severityGroup(CloseFindingSeverity.MEDIUM)])
    mockDb.closeChecklistItem.groupBy.mockResolvedValue([severityGroup(CloseFindingSeverity.MEDIUM)])
    const result = await getCloseReadinessSnapshot(scope)
    expect(result).toMatchObject({ status: "partial", evidenceGrade: "certified", metrics: { certifiedCloseRunCount: 1, blockedCloseRunCount: 0 } })
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "close-findings-open", severity: "medium" }),
      expect.objectContaining({ id: "close-checklist-incomplete", severity: "medium" }),
    ]))
  })

  it("blocks unavailable evidence and counts the affected selected run once", async () => {
    mockDb.closeEvidenceItem.count.mockResolvedValue(31)
    mockDb.closeEvidenceItem.groupBy.mockResolvedValue([{ closeRunId: "run-private", _count: { _all: 31 }, _max: { updatedAt: latest } }])
    const result = await getCloseReadinessSnapshot(scope)
    expect(result).toMatchObject({ evidenceGrade: "blocked", metrics: { certifiedCloseRunCount: 0, blockedCloseRunCount: 1, unavailableEvidenceCount: 31 } })
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "close-evidence-unavailable", severity: "high" }))
  })

  it("retains tenant-wide unavailable evidence obligations outside selected runs", async () => {
    mockDb.closeEvidenceItem.count.mockResolvedValue(1)
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({
      evidenceGrade: "blocked", metrics: { certifiedCloseRunCount: 1, blockedCloseRunCount: 0, unavailableEvidenceCount: 1 },
      blockers: [expect.objectContaining({ id: "close-evidence-unavailable" })],
    })
  })

  it("retains tenant-wide critical finding obligations outside selected runs", async () => {
    mockDb.closeAssuranceFinding.count.mockResolvedValue(1)
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ evidenceGrade: "blocked", blockers: [expect.objectContaining({ id: "close-critical-findings-open" })] })
  })

  it.each([CloseRunStatus.BLOCKED, CloseRunStatus.VOIDED])("cannot grade a %s run from its retained export", async (status) => {
    mockDb.closeRun.findMany.mockResolvedValue([run({ status })])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ evidenceGrade: "blocked", metrics: { certifiedCloseRunCount: 0, blockedCloseRunCount: 1 } })
  })

  it.each([[CloseRunStatus.READY, "operational"], [CloseRunStatus.DRAFT, "raw"]] as const)("does not certify another period through mixed certified + %s runs", async (status, grade) => {
    mockDb.accountingPeriod.count.mockResolvedValue(2)
    mockDb.closeRun.findMany.mockResolvedValue([run(), run({ id: "second-run", periodId: "second-period", status, readinessScore: 45 })])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ evidenceGrade: grade, metrics: { certifiedCloseRunCount: 1, recentCloseRunCount: 2, averageReadinessScore: 70 } })
  })


  it("recovers readiness while retaining old invalidation and failed-checklist history", async () => {
    const old = run({ id: "old", status: CloseRunStatus.BLOCKED, metadata: staleMetadata, readinessScore: 10, createdAt: new Date("2026-06-19"), updatedAt: new Date("2026-06-20T11:00:00Z") })
    const records = [run(), old], retained = JSON.stringify(records)
    mockDb.closeRun.findMany.mockResolvedValue(records)
    mockDb.closeChecklistItem.groupBy.mockResolvedValue([{ ...severityGroup(CloseFindingSeverity.HIGH), closeRunId: "old" }])
    mockDb.closePackExport.findMany.mockResolvedValue([pack(), pack({ id: "old-export", closeRunId: "old", metadata: staleMetadata })])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ status: "fresh", evidenceGrade: "certified", metrics: { recentCloseRunCount: 1, certifiedCloseRunCount: 1, blockedCloseRunCount: 0, averageReadinessScore: 95 }, blockers: [] })
    expect(JSON.stringify(records)).toBe(retained)
  })

  it.each([
    [CloseRunStatus.BLOCKED, "blocked"], [CloseRunStatus.RUNNING, "raw"],
    [CloseRunStatus.DRAFT, "raw"], [CloseRunStatus.VOIDED, "blocked"],
  ] as const)("never falls back to an older certificate when latest is %s", async (status, grade) => {
    mockDb.closeRun.findMany.mockResolvedValue([run({ id: "new", status, metadata: status === CloseRunStatus.BLOCKED ? { assessmentFailure: "ASSESSMENT_FAILED" } : null }), run({ createdAt: new Date("2026-06-19") })])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ evidenceGrade: grade, metrics: { recentCloseRunCount: 1, certifiedCloseRunCount: 0 } })
  })

  it("blocks newest voided assessment despite certified recorded status and export", async () => {
    mockDb.closeRun.findMany.mockResolvedValue([run({ voidedAt: latest }), run({ id: "old", createdAt: new Date("2026-06-19") })])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ evidenceGrade: "blocked", metrics: { certifiedCloseRunCount: 0, blockedCloseRunCount: 1 } })
  })

  it.each([CloseFindingSeverity.HIGH, CloseFindingSeverity.CRITICAL, CloseFindingSeverity.MEDIUM])("preserves historical unresolved %s findings", async severity => {
    mockDb.closeRun.findMany.mockResolvedValue([run(), run({ id: "old", createdAt: new Date("2026-06-19"), status: CloseRunStatus.BLOCKED })])
    mockDb.closeAssuranceFinding.groupBy.mockResolvedValue([{ ...severityGroup(severity), closeRunId: "old" }])
    const result = await getCloseReadinessSnapshot(scope)
    expect(result).toMatchObject({ evidenceGrade: severity === CloseFindingSeverity.MEDIUM ? "certified" : "blocked", metrics: { recentCloseRunCount: 1, certifiedCloseRunCount: 1 } })
    expect(result.blockers).toEqual([expect.objectContaining({ id: "close-findings-open", severity: severity === CloseFindingSeverity.MEDIUM ? "medium" : "high" })])
  })

  it.each([CloseRunStatus.CERTIFIED, CloseRunStatus.BLOCKED])("blocks ambiguous latest timestamps (%s selected)", async status => {
    mockDb.closeRun.findMany.mockResolvedValue([run({ status }), run({ id: "other", status: CloseRunStatus.BLOCKED })])
    const result = await getCloseReadinessSnapshot(scope)
    expect(result).toMatchObject({ evidenceGrade: "blocked", metrics: { recentCloseRunCount: 1, certifiedCloseRunCount: 0, blockedCloseRunCount: 1 } })
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "close-assessment-order-ambiguous", severity: "high" }))
  })

  it("ignores historical timestamp ties once a distinct newer assessment exists", async () => {
    mockDb.closeRun.findMany.mockResolvedValue([run(), run({ id: "old-z", createdAt: new Date("2026-06-19"), status: CloseRunStatus.BLOCKED }), run({ id: "old-a", createdAt: new Date("2026-06-19"), status: CloseRunStatus.BLOCKED })])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ evidenceGrade: "certified", blockers: [] })
  })

  it("binds selection and historical obligation revisions without exposing private IDs", async () => {
    const before = await getCloseReadinessSnapshot(scope)
    mockDb.closeRun.findMany.mockResolvedValue([run({ createdAt: new Date("2026-06-20T10:01:00Z") })])
    const selected = await getCloseReadinessSnapshot(scope)
    expect(selected.sourceHash).not.toBe(before.sourceHash)
    mockDb.closeAssuranceFinding.groupBy.mockResolvedValue([{ ...severityGroup(CloseFindingSeverity.MEDIUM), closeRunId: "old-private" }])
    const obligation = await getCloseReadinessSnapshot(scope)
    expect(obligation.sourceHash).not.toBe(selected.sourceHash)
    expect(JSON.stringify(obligation)).not.toContain("old-private")
  })

  it("does not certify a period with no close run through another period's export", async () => {
    mockDb.accountingPeriod.count.mockResolvedValue(2)
    const result = await getCloseReadinessSnapshot(scope)
    expect(result).toMatchObject({ status: "partial", evidenceGrade: "raw", metrics: { certifiedCloseRunCount: 1 } })
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "close-periods-unreviewed", severity: "medium" }))
  })

  it("keeps missing periods empty and unreviewed evidence raw", async () => {
    mockDb.accountingPeriod.count.mockResolvedValue(0)
    mockDb.closeRun.findMany.mockResolvedValue([])
    mockDb.closePackExport.findMany.mockResolvedValue([])
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({
      status: "empty", evidenceGrade: "raw", metrics: { recentCloseRunCount: 0, averageReadinessScore: null },
      blockers: [expect.objectContaining({ id: "close-periods-missing" })],
    })
  })

  it("binds complete tenant/period proof and unresolved-obligation queries to one RepeatableRead transaction", async () => {
    await getCloseReadinessSnapshot(scope)
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    const runWhere = { organizationId: "org-1", period: { organizationId: "org-1", startDate: { lte: new Date("2026-06-30T23:59:59.999Z") }, endDate: { gte: new Date("2026-06-01T00:00:00.000Z") } } }
    const evidenceWhere = { organizationId: "org-1", closeRun: runWhere }
    expect(mockDb.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: runWhere, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: expect.objectContaining({ createdAt: true, voidedAt: true }) }))
    expect(mockDb.closeAssuranceFinding.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { ...evidenceWhere, status: { in: [CloseFindingStatus.OPEN, CloseFindingStatus.ASSIGNED, CloseFindingStatus.IN_REVIEW, CloseFindingStatus.REOPENED] } },
    }))
    expect(mockDb.closeChecklistItem.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { ...evidenceWhere, status: { in: [CloseChecklistStatus.FAILED, CloseChecklistStatus.UNAVAILABLE] } } }))
    expect(mockDb.closeEvidenceItem.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { ...evidenceWhere, available: false } }))
    expect(mockDb.closePackExport.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ...evidenceWhere, isCertified: true } }))
    for (const query of [mockDb.closeRun.findMany, mockDb.closeAssuranceFinding.groupBy, mockDb.closeChecklistItem.groupBy, mockDb.closeEvidenceItem.groupBy, mockDb.closePackExport.findMany]) {
      expect(query.mock.calls[0][0]).not.toHaveProperty("take")
      expect(query.mock.calls[0][0]).not.toHaveProperty("skip")
    }
  })

  it("uses the transaction client rather than independent root reads", async () => {
    const tx = { ...mockDb, closeRun: { ...mockDb.closeRun, findMany: jest.fn().mockResolvedValue([run()]) } }
    const rootRead = mockDb.closeRun.findMany
    mockDb.$transaction.mockImplementation(async (read: (client: typeof tx) => Promise<unknown>) => read(tx))
    await getCloseReadinessSnapshot(scope)
    expect(rootRead).not.toHaveBeenCalled()
    expect(tx.closeRun.findMany).toHaveBeenCalledTimes(1)
  })

  it("binds retained export identity to sourceHash without disclosing private data", async () => {
    const before = await getCloseReadinessSnapshot(scope)
    mockDb.closePackExport.findMany.mockResolvedValue([pack({ id: "replacement-private", contentHash: "replacement-hash" })])
    const replacement = await getCloseReadinessSnapshot(scope)
    expect(replacement.metrics).toEqual(before.metrics)
    expect(replacement.sourceHash).not.toBe(before.sourceHash)
    for (const privateValue of ["run-private", "period-private", "replacement-private", "replacement-hash"]) expect(JSON.stringify(replacement)).not.toContain(privateValue)
  })

  it("includes certified export and checklist timestamps in freshness", async () => {
    mockDb.closePackExport.findMany.mockResolvedValue([pack({ updatedAt: new Date("2026-06-20T11:00:00Z") })])
    mockDb.closeChecklistItem.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-20T11:30:00Z") })
    expect(await getCloseReadinessSnapshot(scope)).toMatchObject({ freshness: { sourceMaxUpdatedAt: "2026-06-20T11:30:00.000Z" } })
  })

  it.each(["run", "proof", "transaction"])("propagates %s read failure instead of a successful empty result", async (failure) => {
    const error = new Error("database unavailable")
    if (failure === "run") mockDb.closeRun.findMany.mockRejectedValue(error)
    else if (failure === "proof") mockDb.closePackExport.findMany.mockRejectedValue(error)
    else mockDb.$transaction.mockRejectedValue(error)
    await expect(getCloseReadinessSnapshot(scope)).rejects.toBe(error)
  })
})
it("discounts only verified historical replacements and binds their identity into source truth", async () => {
  setupTenantCloseReadinessMocks()
  mockDb.closeEvidenceItem.count.mockResolvedValue(2)
  ;(getVerifiedCloseEvidenceReplacementsInTx as jest.Mock).mockResolvedValue({ evidenceIds: ["old-evidence"], sourceBindings: [{ acceptanceId: "private-acceptance", bindingHash: "first" }] })
  const first = await getCloseReadinessSnapshot(scope)
  expect(first.metrics.unavailableEvidenceCount).toBe(1)
  expect(first.blockers.some(row => row.id === "close-evidence-unavailable")).toBe(true)
  expect(JSON.stringify(first)).not.toContain("private-acceptance")
  ;(getVerifiedCloseEvidenceReplacementsInTx as jest.Mock).mockResolvedValue({ evidenceIds: ["old-evidence"], sourceBindings: [{ acceptanceId: "private-acceptance", bindingHash: "second" }] })
  const second = await getCloseReadinessSnapshot(scope)
  expect(first.sourceHash).not.toBe(second.sourceHash)
  expect(getVerifiedCloseEvidenceReplacementsInTx).toHaveBeenCalledWith(mockDb, "org-1")
})
it("does not turn failed replacement-chain reads into successful recovery", async () => {
  setupTenantCloseReadinessMocks()
  ;(getVerifiedCloseEvidenceReplacementsInTx as jest.Mock).mockRejectedValue(new Error("replacement query failed"))
  await expect(getCloseReadinessSnapshot(scope)).rejects.toThrow("replacement query failed")
})
jest.mock("@/services/accounting/close-evidence-replacement.service", () => ({ getVerifiedCloseEvidenceReplacementsInTx: jest.fn() }))
import { getVerifiedCloseEvidenceReplacementsInTx } from "@/services/accounting/close-evidence-replacement.service"
