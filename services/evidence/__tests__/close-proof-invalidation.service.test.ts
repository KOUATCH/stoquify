import { CloseRunStatus } from "@prisma/client"

jest.mock("@/prisma/db", () => ({ db: {
  $transaction: jest.fn(), closeRun: { findFirst: jest.fn(), findMany: jest.fn() }, closeAssuranceFinding: { groupBy: jest.fn() },
  closeChecklistItem: { groupBy: jest.fn() }, closeEvidenceItem: { count: jest.fn() },
  closePackExport: { findMany: jest.fn() }, auditLog: { create: jest.fn() },
} }))
import { db } from "@/prisma/db"
import { getProofTrail } from "../proof-trail.service"
import { computeCloseRunEvidenceGrade } from "../evidence-grade.service"
import { presentProofTrail } from "@/components/evidence/proof-trail-presentation"

const mock = (value: unknown) => value as jest.Mock
const input = { organizationId: "org-a", subjectType: "close.run" as const, subjectId: "close-a" }
const stale = { staleState: { status: "EVIDENCE_STALE", staleReason: "private source details", sourceId: "private-source" } }
const pack = (metadata: unknown = null) => ({ id: "pack-a", fileType: "json", watermarkId: "private-mark", isCertified: true, exportedAt: new Date("2026-09-01"), metadata })
const run = (overrides = {}) => ({ id: "close-a", periodId: "period-a", createdAt: new Date("2026-09-01T00:00:00.000Z"), voidedAt: null, status: "CERTIFIED", readinessScore: 100, criticalBlockerCount: 0, highBlockerCount: 0, metadata: null, period: { name: "Owned period" }, checklistItems: [], findings: [], evidenceItems: [], packExports: [pack()], ...overrides })
beforeEach(() => {
  jest.resetAllMocks()
  mock(db.$transaction).mockImplementation(async callback => callback(db))
  mock(db.closeRun.findFirst).mockResolvedValue(run())
  mock(db.closeRun.findMany).mockResolvedValue([run()])
  mock(db.closeAssuranceFinding.groupBy).mockResolvedValue([])
  mock(db.closeChecklistItem.groupBy).mockResolvedValue([])
  mock(db.closeEvidenceItem.count).mockResolvedValue(0)
  mock(db.closePackExport.findMany).mockResolvedValue([{ metadata: null }])
  mock(db.auditLog.create).mockResolvedValue({ id: "audit" })
})

it("requires retained export evidence even for a CERTIFIED status", async () => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ packExports: [] }))
  mock(db.closePackExport.findMany).mockResolvedValue([])
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("blocked")
  expect(proof.blockers).toContainEqual(expect.objectContaining({ id: "close-certified-export-missing" }))
  expect(computeCloseRunEvidenceGrade({ status: CloseRunStatus.CERTIFIED, certifiedPackExportCount: 0, blockers: [] }).grade).toBe("blocked")
})

it.each(["READY", "EXPORTED", "CERTIFIED", "BLOCKED"])("honors invalidation metadata on %s and retains the historical export", async status => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ status, metadata: stale }))
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("blocked")
  expect(proof.blockers).toContainEqual(expect.objectContaining({ id: "close-evidence-stale" }))
  expect(proof.nodes.find(n => n.nodeType === "close.pack_export")).toMatchObject({ evidenceGrade: "blocked", available: true })
  expect(proof.edges.find(e => e.fromNodeId === "close-pack-export-1")).toMatchObject({ edgeType: "source", label: "Retains invalidated close evidence", evidenceGrade: "blocked" })
  expect(JSON.stringify(proof)).not.toMatch(/private source details|private-source|private-mark|EVIDENCE_STALE/)
  const fr = presentProofTrail(proof, "fr")
  expect(fr.blockers.find(b => b.id === "close-evidence-stale")?.title).toBe("Les preuves de certification de clôture sont périmées")
  expect(fr.edges.find(e => e.fromNodeId === "close-pack-export-1")?.label).toBe("Conserve les preuves de clôture invalidées")
})

it("keeps an independently invalidated export node from claiming current certification", async () => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ status: "READY", packExports: [pack(stale)] }))
  mock(db.closePackExport.findMany).mockResolvedValue([{ metadata: stale }])
  const proof = await getProofTrail(input)
  expect(proof.nodes.find(n => n.nodeType === "close.pack_export")?.evidenceGrade).toBe("blocked")
  expect(proof.edges.some(e => e.edgeType === "certifies")).toBe(false)
})

it.each(["CERTIFIED", "EXPORTED"])("rejects independently stale export evidence for a %s run", async status => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ status, packExports: [pack(stale)] }))
  mock(db.closePackExport.findMany).mockResolvedValue([{ metadata: stale }])
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe(status === "CERTIFIED" ? "blocked" : "operational")
  expect(proof.nodes.find(n => n.nodeType === "close.pack_export")).toMatchObject({ evidenceGrade: "blocked", available: true })
  expect(proof.edges.some(e => e.edgeType === "certifies")).toBe(false)
})

it("rejects independently stale certified exports outside the displayed sample", async () => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ packExports: [] }))
  mock(db.closePackExport.findMany).mockResolvedValue(Array.from({ length: 22 }, () => ({ metadata: stale })))
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("blocked")
  expect(proof.blockers).toContainEqual(expect.objectContaining({ id: "close-certified-export-missing" }))
  expect(mock(db.closePackExport.findMany)).toHaveBeenCalledWith({ where: { organizationId: "org-a", closeRunId: "close-a", isCertified: true }, select: { metadata: true } })
})

it("uses a current certified export beyond stale displayed history without restoring invalidated nodes", async () => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ packExports: Array.from({ length: 10 }, () => pack(stale)) }))
  mock(db.closePackExport.findMany).mockResolvedValue([...Array.from({ length: 10 }, () => ({ metadata: stale })), { metadata: null }])
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("certified")
  expect(proof.nodes.filter(n => n.nodeType === "close.pack_export")).toHaveLength(10)
  expect(proof.nodes.filter(n => n.nodeType === "close.pack_export").every(n => n.evidenceGrade === "blocked")).toBe(true)
  expect(proof.edges.some(e => e.edgeType === "certifies")).toBe(false)
})

it("finds invalidation even when the export is outside the displayed sample", async () => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ status: "EXPORTED", metadata: stale, packExports: [] }))
  expect((await getProofTrail(input)).evidenceGrade).toBe("blocked")
})

it("includes unavailable controls in complete tenant-scoped checks and blocks their nodes", async () => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ status: "READY", packExports: [], checklistItems: [{ id: "check", status: "UNAVAILABLE", label: "Owned control", severity: "HIGH", evidenceCount: 0 }] }))
  mock(db.closeChecklistItem.groupBy).mockResolvedValue([{ severity: "HIGH", _count: { _all: 22 } }])
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("blocked")
  expect(mock(db.closeChecklistItem.groupBy)).toHaveBeenCalledWith({ by: ["severity"], where: { organizationId: "org-a", closeRunId: "close-a", status: { in: ["FAILED", "UNAVAILABLE"] } }, _count: { _all: true } })
  expect(proof.nodes.find(n => n.nodeType === "close.checklist_item")).toMatchObject({ evidenceGrade: "blocked", available: false })
  expect(presentProofTrail(proof, "fr").blockers[0].detail).toBe("22 contrôle(s) ont échoué ou sont indisponibles.")
})

it.each([null, [], "invalid", { staleState: null }, { staleState: [] }, { staleState: { status: "FRESH" } }])("preserves valid certificate evidence without a recorded invalidation: %j", async metadata => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ metadata }))
  mock(db.closePackExport.findMany).mockResolvedValue([{ metadata }])
  expect((await getProofTrail(input)).evidenceGrade).toBe("certified")
})

it("does not query related rows for a missing tenant subject", async () => {
  mock(db.closeRun.findFirst).mockResolvedValue(null)
  await expect(getProofTrail(input)).rejects.toThrow("Close proof subject not found")
  expect(mock(db.closePackExport.findMany)).not.toHaveBeenCalled()
})

it("propagates failed evidence reads and permits a successful retry", async () => {
  mock(db.closePackExport.findMany).mockRejectedValueOnce(new Error("owned query unavailable"))
  await expect(getProofTrail(input)).rejects.toThrow("owned query unavailable")
  expect((await getProofTrail(input)).evidenceGrade).toBe("certified")
})

it("uses the supplied client for the complete export evidence check", async () => {
  const client = {
    closeRun: { findFirst: jest.fn().mockResolvedValue(run()), findMany: jest.fn().mockResolvedValue([run()]) },
    closeAssuranceFinding: { groupBy: jest.fn().mockResolvedValue([]) },
    closeChecklistItem: { groupBy: jest.fn().mockResolvedValue([]) },
    closeEvidenceItem: { count: jest.fn().mockResolvedValue(0) },
    closePackExport: { findMany: jest.fn().mockResolvedValue([{ metadata: stale }]) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "tx-audit" }) },
  }
  const proof = await getProofTrail(input, client as unknown as NonNullable<Parameters<typeof getProofTrail>[1]>)
  expect(proof.evidenceGrade).toBe("blocked")
  expect(client.closePackExport.findMany).toHaveBeenCalledWith({ where: { organizationId: "org-a", closeRunId: "close-a", isCertified: true }, select: { metadata: true } })
  expect(mock(db.closeRun.findFirst)).not.toHaveBeenCalled()
  expect(mock(db.closePackExport.findMany)).not.toHaveBeenCalled()
})

it("reads the selected record and complete assessment order in one repeatable snapshot", async () => {
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("certified")
  expect(mock(db.$transaction)).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  expect(mock(db.closeRun.findFirst)).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: "close-a", organizationId: "org-a", period: { organizationId: "org-a" } },
  }))
  expect(mock(db.closeRun.findMany)).toHaveBeenCalledWith({
    where: { organizationId: "org-a", periodId: "period-a" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2,
    select: { id: true, createdAt: true, status: true, voidedAt: true },
  })
  expect(proof.nodes.find(n => n.nodeType === "close.run")?.metadata).toMatchObject({
    status: "CERTIFIED", assessmentState: "CURRENT", assessmentOrderAmbiguous: false,
    latestAssessmentCreatedAt: "2026-09-01T00:00:00.000Z", selectionSourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
  })
})

it.each(["DRAFT", "RUNNING", "BLOCKED", "READY", "VOIDED"])("retains historical certification without treating it as current when the latest assessment is %s", async status => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ packExports: [pack(), { ...pack(), id: "retained-pack" }] }))
  mock(db.closeRun.findMany).mockResolvedValue([run({ id: "private-newer-run", createdAt: new Date("2026-09-02"), status }), run()])
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("blocked")
  expect(proof.blockers).toContainEqual(expect.objectContaining({ id: "close-assessment-not-current", gate: "close_readiness" }))
  expect(proof.nodes.find(n => n.nodeType === "close.run")?.metadata).toMatchObject({ status: "CERTIFIED", assessmentState: "HISTORICAL" })
  expect(proof.nodes.find(n => n.nodeId === "retained-pack")).toMatchObject({
    available: true, label: "Retained certified close pack export", metadata: { recordedIsCertified: true },
  })
  expect(proof.edges.some(e => e.edgeType === "certifies")).toBe(false)
  expect(JSON.stringify(proof)).not.toContain("private-newer-run")
  const fr = presentProofTrail(proof, "fr")
  expect(fr.blockers.find(b => b.id === "close-assessment-not-current")?.title).toBe("L’évaluation de clôture est historique")
  expect(fr.edges.find(e => e.fromNodeId === "close-pack-export-2")?.label).toBe("Conserve la certification de clôture enregistrée")
  expect(presentProofTrail(proof, "en")).toBe(proof)
})

it.each(["close-a", "close-z"])("blocks both participants in an equal-time latest tie, including stable selected ID %s", async selectedId => {
  mock(db.closeRun.findFirst).mockResolvedValue(run({ id: selectedId }))
  mock(db.closeRun.findMany).mockResolvedValue([run({ id: "close-z" }), run()])
  const proof = await getProofTrail({ ...input, subjectId: selectedId })
  expect(proof.evidenceGrade).toBe("blocked")
  expect(proof.blockers).toContainEqual(expect.objectContaining({
    id: "close-assessment-order-ambiguous", title: "Current close assessment is ambiguous",
    detail: "1 accounting period(s) have multiple latest assessments with the same creation time.",
  }))
  expect(proof.nodes.find(n => n.nodeType === "close.run")?.metadata).toMatchObject({ assessmentState: "AMBIGUOUS", assessmentOrderAmbiguous: true })
  expect(proof.edges.some(e => e.edgeType === "certifies")).toBe(false)
  expect(presentProofTrail(proof, "fr").blockers.find(b => b.id === "close-assessment-order-ambiguous")?.detail)
    .toBe("1 période(s) comptable(s) ont plusieurs dernières évaluations créées au même instant.")
})

it.each([{ status: "VOIDED" }, { status: "CERTIFIED", voidedAt: new Date("2026-09-03") }])("blocks a voided requested record independently of its status and preserves its record: %j", async overrides => {
  mock(db.closeRun.findFirst).mockResolvedValue(run(overrides))
  mock(db.closeRun.findMany).mockResolvedValue([run({ id: "close-z" }), run()])
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("blocked")
  expect(proof.nodes.find(n => n.nodeType === "close.run")?.metadata).toMatchObject({ status: overrides.status, assessmentState: "VOIDED", assessmentOrderAmbiguous: true })
  expect(proof.blockers).toContainEqual(expect.objectContaining({ id: "close-assessment-voided" }))
  expect(proof.edges.some(e => e.edgeType === "certifies")).toBe(false)
  expect(presentProofTrail(proof, "fr").blockers.find(b => b.id === "close-assessment-voided")?.title).toBe("L’évaluation de clôture est annulée")
})

it("binds current-selection identity without disclosing sibling identifiers", async () => {
  const first = await getProofTrail(input)
  mock(db.closeRun.findMany).mockResolvedValue([run({ id: "private-successor-one", createdAt: new Date("2026-09-02") }), run()])
  const second = await getProofTrail(input)
  mock(db.closeRun.findMany).mockResolvedValue([run({ id: "private-successor-two", createdAt: new Date("2026-09-02") }), run()])
  const third = await getProofTrail(input)
  const hash = (proof: typeof first) => proof.nodes.find(n => n.nodeType === "close.run")?.metadata?.selectionSourceHash
  expect(new Set([hash(first), hash(second), hash(third)]).size).toBe(3)
  expect(JSON.stringify(third)).not.toContain("private-successor-two")
})

it("propagates assessment-order read failures and permits an explicit retry", async () => {
  mock(db.closeRun.findMany).mockRejectedValueOnce(new Error("assessment order unavailable"))
  await expect(getProofTrail(input)).rejects.toThrow("assessment order unavailable")
  expect(mock(db.auditLog.create)).not.toHaveBeenCalled()
  expect((await getProofTrail(input)).evidenceGrade).toBe("certified")
})

it("keeps a missing current selection blocked instead of inventing current evidence", async () => {
  mock(db.closeRun.findMany).mockResolvedValue([])
  const proof = await getProofTrail(input)
  expect(proof.evidenceGrade).toBe("blocked")
  expect(proof.nodes.find(n => n.nodeType === "close.run")?.metadata).toMatchObject({ assessmentState: "HISTORICAL", latestAssessmentCreatedAt: null })
})