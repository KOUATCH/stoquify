const {
  INTERVENTIONS,
  buildInterventionPlan,
  renderMarkdown,
} = require("../agent-human-intervention-plan")

function resultFixture(overrides = {}) {
  return {
    operationalResult: {
      blockerCount: 4,
      blockers: [
        "release:PACKAGE_ID_MISSING",
        "approval:PRODUCT_NOT_APPROVED",
        "scheduler:PROVIDER_MISSING",
        "alerting:TRANSPORT_NOT_READY",
      ],
    },
    credentialResult: {
      blockerCount: 1,
      blockers: ["primary-database-credential:SECURITY_CLASSIFICATION_UNRESOLVED"],
    },
    phase2bResult: {
      summary: { blockers: 2 },
      checks: [
        { id: "GLOBAL_RELEASE_READY", passed: false },
        { id: "ENTERPRISE_GATE_017_GO", passed: false },
      ],
      blockers: ["GLOBAL_RELEASE_READY", "ENTERPRISE_GATE_017_GO"],
    },
    phase3Result: {
      summary: { blockers: 1 },
      blockers: ["PILOT_EXIT_STATUS_READY"],
    },
    activation: {
      requested: false,
      authorized: false,
      activatedAt: null,
    },
    phase3Authorized: false,
    now: new Date("2026-07-25T18:00:00.000Z"),
    ...overrides,
  }
}

describe("agent human intervention plan", () => {
  it("maps live blockers to accountable intervention groups without granting authority", () => {
    const plan = buildInterventionPlan(resultFixture())

    expect(plan.items).toHaveLength(INTERVENTIONS.length)
    expect(plan.status).toBe("EXTERNAL_AND_HUMAN_INTERVENTION_REQUIRED")
    expect(plan.safeguardsIntact).toBe(true)
    expect(plan.activationAuthorizedByPlan).toBe(false)
    expect(plan.phase3AuthorizedByPlan).toBe(false)
    expect(plan.items.find((item) => item.id === "RELEASE_AND_CI").blockers).toContain(
      "release:PACKAGE_ID_MISSING",
    )
    expect(plan.items.find((item) => item.id === "CREDENTIAL_ROTATION").blockers).toContain(
      "primary-database-credential:SECURITY_CLASSIFICATION_UNRESOLVED",
    )
  })

  it("reports evidence readiness without turning it into activation authority", () => {
    const plan = buildInterventionPlan(
      resultFixture({
        operationalResult: { blockerCount: 0, blockers: [] },
        credentialResult: { blockerCount: 0, blockers: [] },
        phase2bResult: { summary: { blockers: 0 }, checks: [], blockers: [] },
        phase3Result: { summary: { blockers: 0 }, blockers: [] },
      }),
    )

    expect(plan.status).toBe("READY_FOR_SEPARATE_ACTIVATION_REVIEW")
    expect(plan.summary.evidenceReady).toBe(INTERVENTIONS.length)
    expect(plan.activationAuthorizedByPlan).toBe(false)
    expect(plan.phase3AuthorizedByPlan).toBe(false)
  })

  it("fails the safeguard assessment if activation authority is pre-populated", () => {
    const plan = buildInterventionPlan(
      resultFixture({
        activation: {
          requested: true,
          authorized: false,
          activatedAt: null,
        },
      }),
    )

    expect(plan.safeguardsIntact).toBe(false)
  })

  it("renders owner actions, evidence handling, and gate sequence", () => {
    const markdown = renderMarkdown(buildInterventionPlan(resultFixture()))

    expect(markdown).toContain("Accountable owners")
    expect(markdown).toContain("Subsequent interventions")
    expect(markdown).toContain("Gate-Lifting Sequence")
    expect(markdown).toContain("Activation authorized by this plan:** No")
  })
})
