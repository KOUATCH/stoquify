import { CloseRunStatus, type Prisma } from "@prisma/client"
import { deriveCloseCurrentProof } from "../close-assurance-current-proof"

const now = new Date("2026-10-01T12:00:00Z")
const stale = { staleState: { status: "EVIDENCE_STALE", sourceId: "private-source" } }
function run(overrides: Partial<Parameters<typeof deriveCloseCurrentProof>[0]> = {}) {
  return { status: CloseRunStatus.CERTIFIED, metadata: null as Prisma.JsonValue, findings: [], checklistItems: [], evidenceItems: [], packExports: [{ metadata: null }], ...overrides }
}

describe("current close proof", () => {
  it.each([CloseRunStatus.CERTIFIED, CloseRunStatus.EXPORTED])("requires current retained export evidence for %s", status => {
    expect(deriveCloseCurrentProof(run({ status }), now)).toEqual({ grade: "certified", checkedAt: now.toISOString(), blockers: [] })
  })
  it("does not certify a stored CERTIFIED status without export evidence", () => {
    expect(deriveCloseCurrentProof(run({ packExports: [] }), now)).toMatchObject({ grade: "blocked", blockers: [expect.objectContaining({ id: "close-certified-export-missing" })] })
  })
  it.each([CloseRunStatus.CERTIFIED, CloseRunStatus.EXPORTED])("keeps run invalidation effective for %s", status => {
    const result = deriveCloseCurrentProof(run({ status, metadata: stale }), now)
    expect(result.grade).toBe("blocked")
    expect(result.blockers).toContainEqual(expect.objectContaining({ id: "close-evidence-stale" }))
    expect(JSON.stringify(result)).not.toContain("private-source")
  })
  it.each([[CloseRunStatus.CERTIFIED, "blocked"], [CloseRunStatus.EXPORTED, "operational"]] as const)("excludes individually stale exports for %s", (status, grade) => {
    expect(deriveCloseCurrentProof(run({ status, packExports: [{ metadata: stale }] }), now).grade).toBe(grade)
  })
  it("checks every export and preserves valid proof beyond historical stale rows", () => {
    const packExports = [...Array.from({ length: 21 }, () => ({ metadata: stale as Prisma.JsonValue })), { metadata: null }]
    expect(deriveCloseCurrentProof(run({ packExports }), now).grade).toBe("certified")
  })
  it.each(["HIGH", "CRITICAL"])("blocks current %s findings and controls beyond display samples", severity => {
    const findings = [...Array.from({ length: 20 }, () => ({ status: "RESOLVED", severity })), { status: "REOPENED", severity }]
    expect(deriveCloseCurrentProof(run({ findings }), now).grade).toBe("blocked")
    const checklistItems = [...Array.from({ length: 20 }, () => ({ status: "PASSED", severity })), { status: "UNAVAILABLE", severity }]
    expect(deriveCloseCurrentProof(run({ checklistItems }), now).grade).toBe("blocked")
  })
  it("uses current finding resolution while retaining medium warnings", () => {
    const result = deriveCloseCurrentProof(run({ findings: [{ status: "RESOLVED", severity: "HIGH" }, { status: "WAIVED_WITH_APPROVAL", severity: "CRITICAL" }, { status: "OPEN", severity: "MEDIUM" }] }), now)
    expect(result.grade).toBe("certified")
    expect(result.blockers).toEqual([expect.objectContaining({ id: "close-findings-open", severity: "medium", detail: "1 finding(s) remain unresolved in the selected close runs." })])
  })
  it("blocks unavailable evidence and voided runs", () => {
    expect(deriveCloseCurrentProof(run({ evidenceItems: [{ available: false }] }), now).grade).toBe("blocked")
    expect(deriveCloseCurrentProof(run({ voidedAt: now }), now).grade).toBe("blocked")
    expect(deriveCloseCurrentProof(run({ status: CloseRunStatus.VOIDED }), now).grade).toBe("blocked")
  })
  it("keeps READY operational and DRAFT raw even with a retained certified export", () => {
    expect(deriveCloseCurrentProof(run({ status: CloseRunStatus.READY }), now).grade).toBe("operational")
    expect(deriveCloseCurrentProof(run({ status: CloseRunStatus.DRAFT }), now).grade).toBe("raw")
  })
})
