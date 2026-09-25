const {
  EXPECTED_GATE_IDS,
  EXPECTED_M2_IDS,
  buildEnterpriseProgramGate,
  dependencyGraphIsAcyclic,
} = require("../pos-enterprise-program-gate")

const fs = require("fs")
const path = require("path")
const { PROGRAM_PATH } = require("../pos-enterprise-program-gate")
const originalRead = fs.readFileSync.bind(fs)

function withProgram(change, evaluate) {
  const program = JSON.parse(originalRead(path.resolve(PROGRAM_PATH), "utf8"))
  change(program)
  const read = jest.spyOn(fs, "readFileSync").mockImplementation((file, ...args) =>
    path.resolve(String(file)) === path.resolve(PROGRAM_PATH)
      ? JSON.stringify(program)
      : originalRead(file, ...args),
  )
  try { evaluate(buildEnterpriseProgramGate(process.cwd())) } finally { read.mockRestore() }
}

describe("POS program false-pass regressions", () => {
  it("rejects deleting the external evidence register", () => {
    withProgram((program) => { program.externalEvidenceRegister = [] }, (report) => {
      expect(report.technicalStatus).toBe("PROGRAM_CONTROL_PLANE_INVALID")
    })
  })

  it("rejects removing gate dependencies to bypass G1", () => {
    withProgram((program) => {
      program.gates.find((gate) => gate.id === "G3A").dependencies = []
      program.gates.find((gate) => gate.id === "G3A").status = "PASSED"
    }, (report) => {
      expect(report.technicalStatus).toBe("PROGRAM_CONTROL_PLANE_INVALID")
      expect(report.gates.find((gate) => gate.id === "G3A").status).not.toBe("PASSED")
    })
  })

  it("does not count a declared external verification with a fabricated reference", () => {
    withProgram((program) => {
      program.externalEvidenceRegister[1].status = "VERIFIED"
      program.externalEvidenceRegister[1].verificationReference = "made-up-evidence"
    }, (report) => {
      expect(report.summary.verifiedExternalEvidenceItems).toBe(0)
      expect(report.technicalStatus).toBe("PROGRAM_CONTROL_PLANE_INVALID")
    })
  })
})

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
