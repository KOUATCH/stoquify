#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")
const { canonicalJson, evidenceContext, isText, sha256, verifyAttestation, verifyManifest } = require("./pos-governance-evidence")
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
const EXPECTED_DEPENDENCIES = {
  G1: [], G2: ["G1"], G3A: ["G2"], G3B: ["G2"], G4: ["G2", "G3B"],
  G5: ["G3A", "G3B", "G4"], G6: ["G2"], G7: ["G3A", "G3B", "G6"],
  G8: ["G3A", "G3B", "G4", "G5", "G6", "G7"], G9: ["G8"],
}
const EXPECTED_EXTERNAL_EVIDENCE = {
  "EXT-G1-APPROVALS": { gate: "G1", classes: ["ARTIFACT_BOUND_APPROVAL"] },
  "EXT-PROVIDER-SANDBOX": { gate: "G3A", classes: ["PROVIDER_SANDBOX"] },
  "EXT-CM-QUALIFIED-REVIEW": { gate: "G3B", classes: ["QUALIFIED_HUMAN_REVIEW"] },
  "EXT-HARDWARE-MATRIX": { gate: "G4", classes: ["PHYSICAL_HARDWARE", "ARTIFACT_BOUND_APPROVAL"] },
  "EXT-CLOSE-CYCLE": { gate: "G5", classes: ["PRODUCTION_LIKE_OPERATIONS"] },
  "EXT-INVENTORY-POLICY": { gate: "G6", classes: ["ARTIFACT_BOUND_APPROVAL"] },
  "EXT-AR-RETURNS-POLICY": { gate: "G7", classes: ["ARTIFACT_BOUND_APPROVAL"] },
  "EXT-OPS-DRILLS": { gate: "G8", classes: ["PRODUCTION_LIKE_OPERATIONS"] },
  "EXT-PILOT-COHORTS": { gate: "G9", classes: ["CONTROLLED_PILOT"] },
}
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
  return JSON.stringify([...values].sort())
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

function programEvidenceBinding(program, gate, contractSha256, item) {
  return {
    kind: item ? "POS_EXTERNAL_EVIDENCE" : "POS_GATE_CLOSURE",
    programId: program.programId,
    gateId: gate.id,
    contractSha256,
    candidate: program.candidate,
    gateRequirementsSha256: sha256(canonicalJson({
      dependencies: gate.dependencies,
      requiredEvidence: gate.requiredEvidence || [],
      stopConditions: gate.stopConditions || [],
      externalRequirements: gate.externalRequirements || [],
      workPackages: Object.keys(gate.workPackages || {}).sort(),
    })),
    ...(item ? { evidenceId: item.id, required: item.required } : {}),
  }
}

function externalScopeIsValid(id, payload) {
  const scope = payload.verificationScope || {}
  const texts = (values) => Array.isArray(values) && values.length > 0 && values.every(isText)
  switch (id) {
    case "EXT-PROVIDER-SANDBOX":
      return isText(scope.providerId) && isText(scope.merchantAccountId) && scope.environment === "SANDBOX"
    case "EXT-CM-QUALIFIED-REVIEW":
      return scope.country === "Cameroon" && isText(scope.reviewerId) && isText(scope.checkerId) && scope.reviewerId !== scope.checkerId
    case "EXT-HARDWARE-MATRIX":
      return payload.evidenceClass === "PHYSICAL_HARDWARE"
        ? scope.disposition === "TESTED" && isText(scope.matrixReference)
        : scope.disposition === "EXCLUDED" && texts(scope.excludedCapabilities) && isText(scope.rationale)
    case "EXT-CLOSE-CYCLE":
      return scope.environment === "PRODUCTION_LIKE" && isText(scope.cycleId)
    case "EXT-INVENTORY-POLICY":
    case "EXT-AR-RETURNS-POLICY":
      return isText(scope.policyVersion) && isText(scope.ownerId)
    case "EXT-OPS-DRILLS":
      return scope.environment === "PRODUCTION_LIKE" && texts(scope.drillIds)
    case "EXT-PILOT-COHORTS":
      return texts(scope.cohortIds) && texts(scope.stages) && isText(scope.decisionReference)
    default: return false
  }
}

function buildEnterpriseProgramGate(root = process.cwd(), options = {}) {
  const context = evidenceContext(root, options)
  const program = readJson(root, PROGRAM_PATH)
  const roadmap = readText(root, ROADMAP_PATH)
  const g0 = readJson(root, G0_EVIDENCE_PATH)
  const g1 = buildG1ContractGate(root, options)
  const gateById = new Map(program.gates.map((gate) => [gate.id, gate]))
  const externalByGate = new Map()
  const externalChecks = new Map()
  const closureChecks = new Map()
  let currentHead = null
  try { currentHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", timeout: 10000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }).trim() } catch { /* No candidate identity means evidence cannot pass. */ }
  const candidateMatches = currentHead !== null && program.candidate.head === currentHead

  for (const item of program.externalEvidenceRegister) {
    const values = externalByGate.get(item.gate) || []
    values.push(item)
    externalByGate.set(item.gate, values)
    let proof = { ready: false, reason: "NOT_VERIFIED" }
    if (item.status === "VERIFIED") {
      if (item.id === "EXT-G1-APPROVALS") {
        proof = { ready: g1.status === "PASSED", reason: g1.status === "PASSED" ? null : "G1_APPROVALS_NOT_VERIFIED" }
      } else if (!candidateMatches) {
        proof = { ready: false, reason: "CANDIDATE_HEAD_MISMATCH_OR_UNAVAILABLE" }
      } else if (gateById.has(item.gate)) {
        proof = verifyAttestation(context, item.verificationReference, item.verificationEvidenceSha256,
          programEvidenceBinding(program, gateById.get(item.gate), g1.evidenceVerification.binding.contractSha256, item),
          EXPECTED_EXTERNAL_EVIDENCE[item.id]?.classes || [])
        if (proof.ready && !externalScopeIsValid(item.id, proof.payload)) {
          proof = { ready: false, reason: "EXTERNAL_VERIFICATION_SCOPE_INCOMPLETE" }
        }
      }
    }
    externalChecks.set(item.id, proof)
  }
  for (const gate of program.gates.filter((entry) => entry.id !== "G1")) {
    let proof = { ready: false, reason: "GATE_CLOSURE_NOT_SUBMITTED" }
    if (gate.status === "PASSED" || gate.closureEvidence) {
      proof = candidateMatches
        ? verifyAttestation(context, gate.closureEvidence?.reference, gate.closureEvidence?.sha256,
          programEvidenceBinding(program, gate, g1.evidenceVerification.binding.contractSha256), ["ARTIFACT_BOUND_APPROVAL"])
        : { ready: false, reason: "CANDIDATE_HEAD_MISMATCH_OR_UNAVAILABLE" }
      if (proof.ready && !verifyManifest(root, proof.payload.sourceManifest)) {
        proof = { ready: false, reason: "SOURCE_MANIFEST_MISSING_OR_CHANGED" }
      }
    }
    closureChecks.set(gate.id, proof)
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
          exactSet(gate.dependencies || []) === exactSet(EXPECTED_DEPENDENCIES[gate.id] || ["UNKNOWN_GATE"])),
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
      ready:
        exactSet(program.externalEvidenceRegister.map((item) => item.id)) === exactSet(Object.keys(EXPECTED_EXTERNAL_EVIDENCE)) &&
        program.externalEvidenceRegister.every((item) => EXPECTED_EXTERNAL_EVIDENCE[item.id]?.gate === item.gate),
    },
    {
      id: "no_placeholder_external_evidence_marked_verified",
      ready: program.externalEvidenceRegister.every(
        (item) => item.status !== "VERIFIED" || externalChecks.get(item.id)?.ready === true,
      ),
    },
    {
      id: "declared_gate_passes_have_bound_closure_evidence",
      ready: program.gates.every((gate) => gate.id === "G1" || gate.status !== "PASSED" || closureChecks.get(gate.id)?.ready === true),
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

  const technicalReady = technicalChecks.every((check) => check.ready)
  const runtimeById = new Map()
  for (const gateId of EXPECTED_GATE_IDS) {
    const gate = gateById.get(gateId) || { name: gateId, status: "MISSING_GATE", dependencies: EXPECTED_DEPENDENCIES[gateId] }
    if (gateId === "G1") {
      runtimeById.set(gateId, {
        id: gateId,
        name: gate.name,
        status: !technicalReady ? "BLOCKED_CONTROL_PLANE" : g1.status === "PASSED" ? "PASSED" :
          g1.technicalStatus === "READY_FOR_ACCOUNTABLE_REVIEW" ? "BLOCKED_AUTHENTIC_APPROVALS" : "BLOCKED_TECHNICAL_CONTRACT",
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
    const externalReady = externalEvidence.every((item) => externalChecks.get(item.id)?.ready === true)
    const closureReady = closureChecks.get(gateId)?.ready === true
    const declaredPassed = gate.status === "PASSED"
    const status = !technicalReady ? "BLOCKED_CONTROL_PLANE" : !dependenciesReady
      ? "BLOCKED_DEPENDENCY"
      : declaredPassed && externalReady && closureReady
        ? "PASSED"
        : declaredPassed ? "BLOCKED_EVIDENCE" : gate.status

    runtimeById.set(gateId, {
      id: gateId,
      name: gate.name,
      status,
      dependenciesReady,
      declaredStatus: gate.status,
      externalEvidenceReady: externalReady,
      closureEvidenceReady: closureReady,
      independentEvidenceBlockers: [
        ...(closureReady ? [] : [closureChecks.get(gateId)?.reason]),
        ...externalEvidence.filter((item) => !externalChecks.get(item.id)?.ready).map((item) => `${item.id}:${externalChecks.get(item.id)?.reason}`),
      ],
      externalBlockers: externalEvidence
        .filter((item) => !externalChecks.get(item.id)?.ready)
        .map((item) => item.id),
      dependencies: gate.dependencies,
    })
  }

  const gates = EXPECTED_GATE_IDS.map((id) => runtimeById.get(id))
  const firstBlockingGate = gates.find((gate) => gate.status !== "PASSED")?.id || null
  const programPassed = technicalReady && gates.every((gate) => gate.status === "PASSED")

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    status: programPassed ? "PASSED" : "BLOCKED",
    technicalStatus: technicalReady ? "PROGRAM_CONTROL_PLANE_READY" : "PROGRAM_CONTROL_PLANE_INVALID",
    firstBlockingGate,
    activeGate: firstBlockingGate,
    productionAuthorized: false,
    candidateBinding: { recordedHead: program.candidate.head, currentHead, matches: candidateMatches },
    evidenceVerification: { trustStatus: context.trustError || "TRUST_ANCHORS_CONFIGURED" },
    summary: {
      technicalChecks: technicalChecks.length,
      technicalReady: technicalChecks.filter((check) => check.ready).length,
      gates: gates.length,
      passedGates: gates.filter((gate) => gate.status === "PASSED").length,
      externalEvidenceItems: program.externalEvidenceRegister.length,
      verifiedExternalEvidenceItems: program.externalEvidenceRegister.filter(
        (item) => externalChecks.get(item.id)?.ready === true,
      ).length,
      m2WorkPackages: Object.keys(gateById.get("G2")?.workPackages || {}).length,
    },
    technicalChecks,
    gates,
    externalEvidenceChecks: program.externalEvidenceRegister.map((item) => ({
      id: item.id, gate: item.gate, declaredStatus: item.status,
      ready: externalChecks.get(item.id)?.ready === true, reason: externalChecks.get(item.id)?.reason,
    })),
    nextPermittedWork: program.nextPermittedWork,
    nonClaims: [
      "A technically ready program controller does not approve any domain gate.",
      "Local evidence is not provider, statutory, physical-hardware, production-operations or pilot proof.",
      "Passing G1 through G8 would still require a separate bounded G9 expansion decision.",
      "The historic G0 status is a baseline reference, not a fresh database or build certification.",
      "A trusted issuer remains accountable for real-world verification and completeness of the reviewed source manifest.",
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
    `Evidence verifier: **${report.evidenceVerification.trustStatus}**`,
    `Recorded candidate matches checkout: **${report.candidateBinding.matches ? "yes" : "no"}**`,
    "",
    "| Gate | Runtime status | Dependencies |",
    "| --- | --- | --- |",
    ...gateRows,
    "",
    "## Independent evidence blockers",
    "",
    ...report.gates.filter((gate) => gate.independentEvidenceBlockers?.length).map((gate) => `- ${gate.id}: ${gate.independentEvidenceBlockers.join(", ")}`),
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
  EXPECTED_DEPENDENCIES,
  EXPECTED_EXTERNAL_EVIDENCE,
  PROGRAM_PATH,
  buildEnterpriseProgramGate,
  dependencyGraphIsAcyclic,
  programEvidenceBinding,
  externalScopeIsValid,
  parseArgs,
  renderMarkdown,
}
