import {
  assertPortfolioAccess,
  createPortfolioEvidenceEnvelope,
  decideEvidenceReliance,
  PortfolioControlError,
  type PortfolioEvidenceEnvelope,
} from "../evidence-trust.contracts"

const hash = "a".repeat(64)

function evidence(
  override: Partial<PortfolioEvidenceEnvelope> = {},
): PortfolioEvidenceEnvelope {
  return {
    organizationId: "org-1",
    subjectType: "connector.health",
    subjectId: "connector-1",
    sourceSystem: "mobile-money",
    sourceReference: "provider-account-1",
    sourceHash: hash,
    capturedAt: "2026-08-02T10:00:00.000Z",
    observedAt: "2026-08-02T09:59:00.000Z",
    freshness: "fresh",
    evidenceGrade: "operational",
    available: true,
    confidence: null,
    reviewerId: null,
    reviewedAt: null,
    retentionClass: "connector-operational-evidence",
    redactedFields: [],
    transformations: [],
    ...override,
  }
}

describe("portfolio evidence trust contracts", () => {
  it("denies cross-tenant access with a typed error", () => {
    expect(() =>
      assertPortfolioAccess({
        trustedOrganizationId: "org-1",
        evidenceOrganizationId: "org-2",
        actorAuthorized: true,
        correlationId: "corr-1",
      }),
    ).toThrow(expect.objectContaining<Partial<PortfolioControlError>>({ code: "TENANT_SCOPE_VIOLATION" }))
  })

  it("denies an unauthorized actor", () => {
    expect(() =>
      assertPortfolioAccess({
        trustedOrganizationId: "org-1",
        evidenceOrganizationId: "org-1",
        actorAuthorized: false,
        correlationId: "corr-2",
      }),
    ).toThrow(expect.objectContaining<Partial<PortfolioControlError>>({ code: "FORBIDDEN" }))
  })

  it("normalizes redactions while preserving evidence identity", () => {
    const result = createPortfolioEvidenceEnvelope(
      evidence({ redactedFields: ["phone", "bankAccount", "phone"] }),
      "corr-3",
    )
    expect(result.redactedFields).toEqual(["bankAccount", "phone"])
    expect(result.sourceHash).toBe(hash)
  })

  it("allows stale evidence only as warned read-only context", () => {
    expect(decideEvidenceReliance(evidence({ freshness: "stale" }), "read")).toEqual(
      expect.objectContaining({ decision: "ALLOW_WITH_WARNING", code: "EVIDENCE_STALE" }),
    )
    expect(decideEvidenceReliance(evidence({ freshness: "stale" }), "draft")).toEqual(
      expect.objectContaining({ decision: "BLOCK", code: "EVIDENCE_STALE" }),
    )
  })

  it("never authorizes consequential side effects", () => {
    const result = decideEvidenceReliance(evidence(), "external_message")
    expect(result).toEqual(
      expect.objectContaining({
        decision: "REQUIRE_HUMAN_APPROVAL",
        requiresHumanApproval: true,
        mayCreateSideEffect: false,
      }),
    )
  })
})
