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

function withProgram(change, evaluate, build = buildEnterpriseProgramGate) {
  const program = JSON.parse(originalRead(path.resolve(PROGRAM_PATH), "utf8"))
  change(program)
  const read = jest.spyOn(fs, "readFileSync").mockImplementation((file, ...args) =>
    path.resolve(String(file)) === path.resolve(PROGRAM_PATH)
      ? JSON.stringify(program)
      : originalRead(file, ...args),
  )
  try { evaluate(build(process.cwd())) } finally { read.mockRestore() }
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

  it("rejects duplicate gates, duplicate external IDs and changed external ownership", () => {
    for (const change of [
      (program) => program.gates.push({ ...program.gates[1] }),
      (program) => program.externalEvidenceRegister.push({ ...program.externalEvidenceRegister[0] }),
      (program) => { program.externalEvidenceRegister[1].gate = "G4" },
    ]) withProgram(change, (report) => expect(report.technicalStatus).toBe("PROGRAM_CONTROL_PLANE_INVALID"))
  })

  it("rejects a manually asserted gate pass without closure proof", () => {
    withProgram((program) => { program.gates[1].status = "PASSED" }, (report) => {
      expect(report.technicalChecks.find((check) => check.id === "declared_gate_passes_have_bound_closure_evidence").ready).toBe(false)
      expect(report.gates[1].status).not.toBe("PASSED")
    })
  })

  it("keeps an absent canonical gate blocked without crashing report generation", () => {
    withProgram((program) => { program.gates = program.gates.filter((gate) => gate.id !== "G2") }, (report) => {
      expect(report.status).toBe("BLOCKED")
      expect(report.technicalStatus).toBe("PROGRAM_CONTROL_PLANE_INVALID")
    })
  })
})

describe("POS program dependency and evidence composition", () => {
  // Isolate orchestration from signature validation (covered with real ephemeral signatures
  // in pos-governance-evidence.test.js). A verified closure is still insufficient when an
  // external requirement is missing, even after all upstream gates pass.
  it.each([false, true])("requires external evidence independently of a valid closure (present=%s)", (externalPresent) => {
    const g1Module = jest.requireActual("../pos-g1-contract-gate")
    const g1 = g1Module.buildG1ContractGate(process.cwd())
    const currentHead = require("child_process").execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }).trim()
    jest.isolateModules(() => {
      jest.doMock("../pos-g1-contract-gate", () => ({ ...g1Module, buildG1ContractGate: () => ({ ...g1, status: "PASSED", blockers: [] }) }))
      jest.doMock("../pos-governance-evidence", () => ({
        ...jest.requireActual("../pos-governance-evidence"),
        verifyAttestation: () => ({ ready: true, payload: { verificationScope: { providerId: "unit", merchantAccountId: "unit", environment: "SANDBOX" } } }),
        verifyManifest: () => true,
      }))
      const { buildEnterpriseProgramGate: build } = require("../pos-enterprise-program-gate")
      try {
        withProgram((program) => {
          program.candidate.head = currentHead
          program.gates.find((gate) => gate.id === "G2").status = "PASSED"
          program.gates.find((gate) => gate.id === "G3A").status = "PASSED"
          if (externalPresent) program.externalEvidenceRegister.find((item) => item.id === "EXT-PROVIDER-SANDBOX").status = "VERIFIED"
        }, (report) => {
          expect(report.technicalStatus).toBe("PROGRAM_CONTROL_PLANE_READY")
          expect(report.gates.find((gate) => gate.id === "G2").status).toBe("PASSED")
          expect(report.gates.find((gate) => gate.id === "G3A").status).toBe(externalPresent ? "PASSED" : "BLOCKED_EVIDENCE")
          expect(report.productionAuthorized).toBe(false)
        }, build)
      } finally {
        jest.dontMock("../pos-g1-contract-gate")
        jest.dontMock("../pos-governance-evidence")
      }
    })
  })
  it("requires class-specific provider, reviewer and hardware scope", () => {
    const { externalScopeIsValid } = require("../pos-enterprise-program-gate")
    expect(externalScopeIsValid("EXT-PROVIDER-SANDBOX", { verificationScope: { providerId: "p", merchantAccountId: "m", environment: "SANDBOX" } })).toBe(true)
    expect(externalScopeIsValid("EXT-PROVIDER-SANDBOX", { verificationScope: { environment: "LOCAL_UNIT" } })).toBe(false)
    expect(externalScopeIsValid("EXT-CM-QUALIFIED-REVIEW", { verificationScope: { country: "Cameroon", reviewerId: "same", checkerId: "same" } })).toBe(false)
    expect(externalScopeIsValid("EXT-HARDWARE-MATRIX", { evidenceClass: "ARTIFACT_BOUND_APPROVAL", verificationScope: { disposition: "TESTED", matrixReference: "pretend" } })).toBe(false)
    expect(externalScopeIsValid("EXT-HARDWARE-MATRIX", { evidenceClass: "ARTIFACT_BOUND_APPROVAL", verificationScope: { disposition: "EXCLUDED", excludedCapabilities: ["printer"], rationale: "Unsupported in this reviewed scope" } })).toBe(true)
  })
})

describe("POS enterprise G2-G9 program gate", () => {
  it("keeps later gates dependency-blocked while exposing a complete control plane", () => {
    const report = buildEnterpriseProgramGate(process.cwd())

    expect(report.status).toBe("BLOCKED")
    expect(report.technicalStatus).toBe("PROGRAM_CONTROL_PLANE_READY")
    expect(report.firstBlockingGate).toBe("G1")
    expect(report.productionAuthorized).toBe(false)
    expect(report.summary).toMatchObject({ technicalChecks: 12, technicalReady: 12 })
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
