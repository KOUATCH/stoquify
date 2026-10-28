const {
  EXPECTED_GATE_IDS,
  EXPECTED_M2_IDS,
  buildEnterpriseProgramGate,
  dependencyGraphIsAcyclic,
} = require("../pos-enterprise-program-gate")

describe("POS enterprise G2-G9 program gate", () => {
  it("keeps later gates dependency-blocked while exposing a complete control plane", () => {
    const report = buildEnterpriseProgramGate(process.cwd())

    expect(report.status).toBe("BLOCKED")
    expect(report.technicalStatus).toBe("PROGRAM_CONTROL_PLANE_READY")
    expect(report.firstBlockingGate).toBe("G1")
    expect(report.productionAuthorized).toBe(false)
    expect(report.summary).toMatchObject({ technicalChecks: 11, technicalReady: 11 })
    expect(report.summary.gates).toBe(EXPECTED_GATE_IDS.length)
    expect(report.summary.m2WorkPackages).toBe(EXPECTED_M2_IDS.length)
    expect(report.gates.find((gate) => gate.id === "G1")).toEqual(
      expect.objectContaining({
        status: "BLOCKED_AUTHENTIC_APPROVALS",
        blockers: expect.not.arrayContaining(["cash_only_and_store_credit_runtime_control"]),
      }),
    )
    expect(report.gates.find((gate) => gate.id === "G2").status).toBe("BLOCKED_DEPENDENCY")
    expect(report.gates.find((gate) => gate.id === "G9").status).toBe("BLOCKED_DEPENDENCY")
  })

  it("rejects cyclic or unresolved gate dependencies", () => {
    expect(
      dependencyGraphIsAcyclic([
        { id: "G1", dependencies: [] },
        { id: "G2", dependencies: ["G1"] },
      ]),
    ).toBe(true)
    expect(
      dependencyGraphIsAcyclic([
        { id: "G1", dependencies: ["G2"] },
        { id: "G2", dependencies: ["G1"] },
      ]),
    ).toBe(false)
    expect(dependencyGraphIsAcyclic([{ id: "G2", dependencies: ["G1"] }])).toBe(false)
  })
})
