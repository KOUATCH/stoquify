#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const {
  buildG1ContractGate,
} = require("./pos-g1-contract-gate")

const PROGRAM_PATH =
  "docs/pos-enterprise-grade-audit/EXECUTION_07_G2_G9_GATE_CLOSURE_PROGRAM.json"
const ROADMAP_PATH =
  "docs/pos-enterprise-grade-audit/STOQUIFY_POS_AND_SALES_TO_CASH_MASTER_IMPLEMENTATION_ROADMAP_2026-08-17.md"
const G0_EVIDENCE_PATH =
  "docs/pos-enterprise-grade-audit/EXECUTION_05_G0_FINAL_REASSESSMENT_GATE_EVIDENCE.json"
const DEFAULT_MD_OUT =
  "docs/pos-enterprise-grade-audit/EXECUTION_07_G2_G9_GATE_STATUS.md"
const DEFAULT_JSON_OUT =
  "docs/pos-enterprise-grade-audit/EXECUTION_07_G2_G9_GATE_STATUS.json"

const EXPECTED_GATE_IDS = ["G1", "G2", "G3A", "G3B", "G4", "G5", "G6", "G7", "G8", "G9"]
const EXPECTED_M2_IDS = [
  ...Array.from({ length: 9 }, (_, index) => `M2-A${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 9 }, (_, index) => `M2-B${String(index + 1).padStart(2, "0")}`),
]

function readText(root, relativePath) {
  return fs.readFileSync(path.resolve(root, relativePath), "utf8")
}

function readJson(root, relativePath) {
  return JSON.parse(readText(root, relativePath))
}

function exactSet(values) {
  return JSON.stringify([...new Set(values)].sort())
}

function dependencyGraphIsAcyclic(gates) {
  const byId = new Map(gates.map((gate) => [gate.id, gate]))
  const visiting = new Set()
  const visited = new Set()

  function visit(id) {
    if (visiting.has(id)) return false
    if (visited.has(id)) return true
    const gate = byId.get(id)
    if (!gate) return false
    visiting.add(id)
    for (const dependency of gate.dependencies || []) {
      if (!visit(dependency)) return false
    }
    visiting.delete(id)
    visited.add(id)
    return true
  }

  return gates.every((gate) => visit(gate.id))
}

function buildEnterpriseProgramGate(root = process.cwd()) {
  const program = readJson(root, PROGRAM_PATH)
  const roadmap = readText(root, ROADMAP_PATH)
  const g0 = readJson(root, G0_EVIDENCE_PATH)
  const g1 = buildG1ContractGate(root)
  const gateById = new Map(program.gates.map((gate) => [gate.id, gate]))
  const externalByGate = new Map()

  for (const item of program.externalEvidenceRegister) {
    const values = externalByGate.get(item.gate) || []
    values.push(item)
    externalByGate.set(item.gate, values)
  }

  const technicalChecks = [
    {
      id: "g0_development_baseline_exists",
      ready: g0.status === "PASS_DEVELOPMENT_G0_PRODUCTION_BLOCKED",
    },
    {
      id: "canonical_gate_set_complete",
      ready: exactSet(program.gates.map((gate) => gate.id)) === exactSet(EXPECTED_GATE_IDS),
    },
    {
      id: "dependency_graph_resolves_without_cycle",
      ready:
        dependencyGraphIsAcyclic(program.gates) &&
        program.gates.every((gate) =>
          (gate.dependencies || []).every((dependency) => gateById.has(dependency)),
        ),
    },
    {
      id: "m2_a01_a09_b01_b09_covered",
      ready:
        exactSet(Object.keys(gateById.get("G2")?.workPackages || {})) === exactSet(EXPECTED_M2_IDS),
    },
    {
      id: "g2_g9_have_evidence_and_stop_contracts",
      ready: program.gates
        .filter((gate) => gate.id !== "G1")
        .every(
          (gate) =>
            Array.isArray(gate.requiredEvidence) &&
            gate.requiredEvidence.length > 0 &&
            Array.isArray(gate.stopConditions) &&
            gate.stopConditions.length > 0,
        ),
    },
    {
      id: "external_evidence_register_is_gate_scoped",
      ready: program.externalEvidenceRegister.every((item) => gateById.has(item.gate)),
    },
    {
      id: "no_placeholder_external_evidence_marked_verified",
      ready: program.externalEvidenceRegister.every(
        (item) => item.status !== "VERIFIED" || Boolean(item.verificationReference),
      ),
    },
    {
      id: "candidate_is_not_misrepresented_as_promotable",
      ready:
        program.candidate.dirty === true &&
        program.candidate.classification === "DEVELOPMENT_ROLLING_NOT_PROMOTABLE",
    },
    {
      id: "high_invariant_stop_policy_is_enabled",
      ready:
        program.executionPolicy.doNotAdvanceOnHighOrCriticalInvariant === true &&
        program.executionPolicy.placeholderApprovalAccepted === false &&
        program.executionPolicy.localEvidenceEqualsProductionProof === false,
    },
    {
      id: "g1_exact_hash_approval_gate_is_connected",
      ready:
        g1.technicalStatus === "READY_FOR_ACCOUNTABLE_REVIEW" &&
        g1.technicalChecks.every((check) => check.ready),
    },
    {
      id: "roadmap_contains_all_program_gates",
      ready: EXPECTED_GATE_IDS.filter((id) => id !== "G1").every((id) =>
        roadmap.includes(`Gate: ${id} `),
      ),
    },
  ]

  const runtimeById = new Map()
  for (const gateId of EXPECTED_GATE_IDS) {
    const gate = gateById.get(gateId)
    if (gateId === "G1") {
      runtimeById.set(gateId, {
        id: gateId,
        name: gate.name,
        status: g1.status === "PASSED" ? "PASSED" : "BLOCKED_AUTHENTIC_APPROVALS",
        dependenciesReady: true,
        declaredStatus: gate.status,
        blockers: g1.blockers,
      })
      continue
    }

    const dependenciesReady = gate.dependencies.every(
      (dependency) => runtimeById.get(dependency)?.status === "PASSED",
    )
    const externalEvidence = externalByGate.get(gateId) || []
    const externalReady = externalEvidence.every((item) => item.status === "VERIFIED")
    const declaredPassed = gate.status === "PASSED"
    const status = !dependenciesReady
      ? "BLOCKED_DEPENDENCY"
      : declaredPassed && externalReady
        ? "PASSED"
        : gate.status

    runtimeById.set(gateId, {
      id: gateId,
      name: gate.name,
      status,
      dependenciesReady,
      declaredStatus: gate.status,
      externalEvidenceReady: externalReady,
      externalBlockers: externalEvidence
        .filter((item) => item.status !== "VERIFIED")
        .map((item) => item.id),
      dependencies: gate.dependencies,
    })
  }

  const gates = EXPECTED_GATE_IDS.map((id) => runtimeById.get(id))
  const firstBlockingGate = gates.find((gate) => gate.status !== "PASSED")?.id || null
  const technicalReady = technicalChecks.every((check) => check.ready)
  const programPassed = technicalReady && gates.every((gate) => gate.status === "PASSED")

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    status: programPassed ? "PASSED" : "BLOCKED",
    technicalStatus: technicalReady ? "PROGRAM_CONTROL_PLANE_READY" : "PROGRAM_CONTROL_PLANE_INVALID",
    firstBlockingGate,
    activeGate: firstBlockingGate,
    productionAuthorized: false,
    summary: {
      technicalChecks: technicalChecks.length,
      technicalReady: technicalChecks.filter((check) => check.ready).length,
      gates: gates.length,
      passedGates: gates.filter((gate) => gate.status === "PASSED").length,
      externalEvidenceItems: program.externalEvidenceRegister.length,
      verifiedExternalEvidenceItems: program.externalEvidenceRegister.filter(
        (item) => item.status === "VERIFIED",
      ).length,
      m2WorkPackages: Object.keys(gateById.get("G2").workPackages).length,
    },
    technicalChecks,
    gates,
    nextPermittedWork: program.nextPermittedWork,
    nonClaims: [
      "A technically ready program controller does not approve any domain gate.",
      "Local evidence is not provider, statutory, physical-hardware, production-operations or pilot proof.",
      "Passing G1 through G8 would still require a separate bounded G9 expansion decision.",
    ],
  }
}

function renderMarkdown(report) {
  const gateRows = report.gates.map(
    (gate) =>
      `| ${gate.id} | ${gate.status} | ${(gate.dependencies || []).join(", ") || "None"} |`,
  )
  return [
    "# Stoquify enterprise POS gate status",
    "",
    `Status: **${report.status}**`,
    `Program controller: **${report.technicalStatus}**`,
    `First blocking gate: **${report.firstBlockingGate || "none"}**`,
    `Passed gates: **${report.summary.passedGates}/${report.summary.gates}**`,
    `Verified external evidence: **${report.summary.verifiedExternalEvidenceItems}/${report.summary.externalEvidenceItems}**`,
    "",
    "| Gate | Runtime status | Dependencies |",
    "| --- | --- | --- |",
    ...gateRows,
    "",
    "The gate intentionally remains nonzero until every dependency, internal invariant and authentic external evidence item passes.",
    "",
  ].join("\n")
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    out: DEFAULT_MD_OUT,
    jsonOut: DEFAULT_JSON_OUT,
    write: true,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--root") options.root = path.resolve(argv[++index])
    else if (value === "--mode") options.mode = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else if (value === "--no-write") options.write = false
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!new Set(["report", "fail"]).has(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`)
  }
  return options
}

function writeReport(root, options, report) {
  const markdownPath = path.resolve(root, options.out)
  const jsonPath = path.resolve(root, options.jsonOut)
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true })
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
  fs.writeFileSync(markdownPath, renderMarkdown(report), "utf8")
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const report = buildEnterpriseProgramGate(options.root)
    if (options.write) writeReport(options.root, options, report)
    process.stdout.write(renderMarkdown(report))
    if (options.mode === "fail" && report.status !== "PASSED") process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  EXPECTED_GATE_IDS,
  EXPECTED_M2_IDS,
  PROGRAM_PATH,
  buildEnterpriseProgramGate,
  dependencyGraphIsAcyclic,
  parseArgs,
  renderMarkdown,
}
