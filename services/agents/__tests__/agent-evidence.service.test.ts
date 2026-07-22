jest.mock("server-only", () => ({}))

import { bindSnapshotEvidence, bindUnavailableEvidence, hasAvailableAgentEvidence } from "../agent-evidence.service"

describe("agent evidence binder", () => {
  it("preserves source hash, grade, freshness, blockers, and redactions", () => {
    const evidence = bindSnapshotEvidence({
      kind: "inventory.cash",
      organizationId: "org-1",
      locationId: null,
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-22T23:59:59.999Z",
      status: "stale",
      uiState: "stale",
      evidenceGrade: "operational",
      freshness: {
        generatedAt: "2026-07-22T10:00:00.000Z",
        sourceMaxUpdatedAt: "2026-07-20T10:00:00.000Z",
        maxAgeMinutes: 1440,
        stale: true,
        staleReason: "Source data exceeds maximum age.",
      },
      sourceHash: "sha256:inventory",
      generatedAt: "2026-07-22T10:00:00.000Z",
      sourceModules: ["inventory", "purchasing"],
      metrics: { total: 1 },
      blockers: [{ id: "b-1", severity: "high", gate: "stock", title: "Negative", detail: "Review", sourceTables: ["inventory_levels"] }],
      redactions: [{ id: "r-1", field: "supplier.bank", reason: "protected", policy: "supplier-bank" }],
    })

    expect(evidence).toHaveLength(2)
    expect(evidence[0]).toMatchObject({
      sourceHash: "sha256:inventory",
      evidenceGrade: "operational",
      freshness: "stale",
      blockerCount: 1,
      redactionCount: 1,
      available: true,
    })
  })

  it("represents unavailable evidence explicitly", () => {
    const evidence = bindUnavailableEvidence({
      subjectType: "snapshot.payment.truth",
      subjectId: "missing",
      sourceModule: "payments",
    })
    expect(evidence).toMatchObject({ available: false, evidenceGrade: "blocked" })
    expect(hasAvailableAgentEvidence([evidence])).toBe(false)
  })
})

