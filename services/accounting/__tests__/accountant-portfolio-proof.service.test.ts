jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {} }))
import { CloseRunStatus } from "@prisma/client"
import { readAccountantPortfolioProof } from "../accountant-portfolio-proof.service"
import { deriveCloseCurrentProof } from "../close-assurance-current-proof"
import { applyCloseAssessmentSelection, deriveCloseAssessmentSelection } from "../close-assessment-order.service"
import { resolveTargetPeriod } from "../close-period-selection.service"

const now = new Date("2026-10-19T12:00:00Z")
const period = { id: "period", name: "October", status: "OPEN", startDate: new Date("2026-10-01"), endDate: new Date("2026-10-31"), organization: { currency: "XAF" } }
const baseRun = { id: "run", periodId: "period", status: CloseRunStatus.CERTIFIED, readinessScore: 100,
  criticalBlockerCount: 0, highBlockerCount: 0, asOf: now, createdAt: now, metadata: null, voidedAt: null }
function transaction() {
  return {
    accountingPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
    closeRun: { findMany: jest.fn().mockResolvedValue([baseRun]), findFirst: jest.fn().mockResolvedValue(baseRun) },
    closeAssuranceFinding: { groupBy: jest.fn().mockResolvedValue([]) },
    closeChecklistItem: { groupBy: jest.fn().mockResolvedValue([]) },
    closeEvidenceItem: { count: jest.fn().mockResolvedValue(0) },
    $queryRaw: jest.fn().mockResolvedValue([{ count: 1n }]),
    $executeRaw: jest.fn(), closeSourceRevision: { create: jest.fn() },
  }
}

describe("portfolio close-proof projection", () => {
  it("uses shared current-proof rules, marks the score historical and never writes", async () => {
    const tx = transaction()
    const row = await readAccountantPortfolioProof(tx as any, "client", now)
    expect(row).toMatchObject({ proofState: "CURRENT", assessmentAsOf: now.toISOString(), checkedAt: now.toISOString(),
      close: { readinessScore: 100, scoreBasis: "HISTORICAL_ASSESSMENT" }, currentProof: { grade: "certified", assessmentState: "CURRENT" } })
    expect(tx.$executeRaw).not.toHaveBeenCalled()
    expect(tx.closeSourceRevision.create).not.toHaveBeenCalled()
    expect(tx.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2, where: { organizationId: "client", periodId: period.id } }))
  })

  it.each(["NO_PERIOD", "NO_ASSESSMENT"])("distinguishes %s without a fallback assessment", async state => {
    const tx = transaction()
    if (state === "NO_PERIOD") tx.accountingPeriod.findFirst.mockResolvedValue(null)
    else tx.closeRun.findMany.mockResolvedValue([])
    const row = await readAccountantPortfolioProof(tx as any, "client", now)
    expect(row).toMatchObject({ proofState: state, close: null, currentProof: null })
    expect(tx.$queryRaw).not.toHaveBeenCalled()
  })

  it.each([
    ["stale", "STALE", "close-evidence-stale"],
    ["missing-export", "UNAVAILABLE", "close-certified-export-missing"],
    ["missing-evidence", "UNAVAILABLE", "close-evidence-unavailable"],
    ["ambiguous", "AMBIGUOUS", "close-assessment-order-ambiguous"],
    ["voided", "VOIDED", "close-assessment-voided"],
  ])("never presents persisted 100/CERTIFIED as current certification with %s", async (reason, state, blocker) => {
    const tx = transaction()
    if (reason === "stale") tx.closeRun.findFirst.mockResolvedValue({ ...baseRun, metadata: { staleState: { status: "EVIDENCE_STALE", privateSource: "secret" } } } as any)
    if (reason === "missing-export") tx.$queryRaw.mockResolvedValue([{ count: 0n }])
    if (reason === "missing-evidence") tx.closeEvidenceItem.count.mockResolvedValue(1)
    if (reason === "ambiguous") tx.closeRun.findMany.mockResolvedValue([baseRun, { ...baseRun, id: "other" }])
    if (reason === "voided") tx.closeRun.findFirst.mockResolvedValue({ ...baseRun, voidedAt: now } as any)
    const row = await readAccountantPortfolioProof(tx as any, "client", now)
    expect(row.proofState).toBe(state)
    expect(row.currentProof).toMatchObject({ grade: "blocked", blockers: expect.arrayContaining([expect.objectContaining({ id: blocker })]) })
    expect(JSON.stringify(row)).not.toContain("secret")
  })

  it("keeps the latest adverse assessment instead of falling back to an older certified run", async () => {
    const tx = transaction()
    const latest = { ...baseRun, id: "new", status: CloseRunStatus.RUNNING }
    tx.closeRun.findMany.mockResolvedValue([latest, { ...baseRun, createdAt: new Date("2026-10-18") }])
    tx.closeRun.findFirst.mockResolvedValue(latest)
    const row = await readAccountantPortfolioProof(tx as any, "client", now)
    expect(tx.closeRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "client", periodId: "period", id: "new" } }))
    expect(row.currentProof?.grade).toBe("raw")
    expect(row.close?.status).toBe("RUNNING")
  })

  it("aggregates all findings/controls and agrees exactly with full detail proof", async () => {
    const tx = transaction()
    tx.closeAssuranceFinding.groupBy.mockResolvedValue([{ severity: "MEDIUM", _count: { _all: 120 } }, { severity: "HIGH", _count: { _all: 1 } }] as any)
    tx.closeChecklistItem.groupBy.mockResolvedValue([{ severity: "CRITICAL", _count: { _all: 21 } }] as any)
    tx.closeEvidenceItem.count.mockResolvedValue(7)
    const result = await readAccountantPortfolioProof(tx as any, "client", now)
    const detail = deriveCloseCurrentProof({
      ...baseRun, findings: [...Array.from({ length: 120 }, () => ({ status: "OPEN", severity: "MEDIUM" })), { status: "REOPENED", severity: "HIGH" }],
      checklistItems: Array.from({ length: 21 }, () => ({ status: "FAILED", severity: "CRITICAL" })),
      evidenceItems: Array.from({ length: 7 }, () => ({ available: false })), packExports: [{ metadata: null }],
    }, now)
    expect(result.currentProof).toEqual(applyCloseAssessmentSelection(detail,
      deriveCloseAssessmentSelection({ latest: baseRun, ambiguous: false }, baseRun)))
    for (const delegate of [tx.closeAssuranceFinding.groupBy, tx.closeChecklistItem.groupBy, tx.closeEvidenceItem.count]) {
      expect(delegate.mock.calls[0][0].where).toMatchObject({ organizationId: "client", periodId: "period", closeRunId: "run" })
      expect(delegate.mock.calls[0][0]).not.toHaveProperty("take")
    }
    const sql = tx.$queryRaw.mock.calls[0][0] as any
    expect(sql.values).toEqual(["client", "period", "run"])
    expect(sql.strings.join("?")).toContain("IS DISTINCT FROM 'EVIDENCE_STALE'")
  })

  it("preserves medium warnings without inventing a different grade", async () => {
    const tx = transaction()
    tx.closeAssuranceFinding.groupBy.mockResolvedValue([{ severity: "MEDIUM", _count: { _all: 2 } }] as any)
    const result = await readAccountantPortfolioProof(tx as any, "client", now)
    expect(result.currentProof).toMatchObject({ grade: "certified", blockers: [expect.objectContaining({ severity: "medium" })] })
  })

  it("labels historical selections through the shared selection guard", () => {
    const older = { ...baseRun, id: "old" }
    const proof = deriveCloseCurrentProof({ ...older, findings: [], checklistItems: [], evidenceItems: [], packExports: [{ metadata: null }] }, now)
    expect(applyCloseAssessmentSelection(proof, deriveCloseAssessmentSelection({ latest: baseRun, ambiguous: false }, older)))
      .toMatchObject({ grade: "blocked", assessmentState: "HISTORICAL" })
  })

  it("uses each client's own period and a stable tie-break, with the canonical open fallback", async () => {
    const tx = transaction()
    tx.accountingPeriod.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(period)
    await readAccountantPortfolioProof(tx as any, "client-A", now)
    expect(tx.accountingPeriod.findFirst.mock.calls[0][0]).toMatchObject({ where: { organizationId: "client-A", startDate: { lte: now }, endDate: { gte: now } }, orderBy: [{ startDate: "desc" }, { id: "desc" }] })
    expect(tx.accountingPeriod.findFirst.mock.calls[1][0].where).toEqual({ organizationId: "client-A", status: "OPEN" })
    tx.accountingPeriod.findFirst.mockResolvedValue(null)
    await expect(resolveTargetPeriod("client-B", "foreign-period", tx as any, now)).rejects.toThrow("Accounting period not found")
    expect(tx.accountingPeriod.findFirst.mock.calls.at(-1)[0].where).toEqual({ organizationId: "client-B", id: "foreign-period" })
  })
})
