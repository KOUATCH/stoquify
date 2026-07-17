#!/usr/bin/env node

import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import {
  MODES,
  STAGE_BY_ID,
  STAGES,
  normalizeRepoPath,
  pathMatchesAllowlist,
} from "./select-next-stage.mjs"

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/
const COMMIT_PATTERN = /^[0-9a-f]{7,64}$/
const RUN_ID_PATTERN = /^th-[a-z0-9][a-z0-9._-]{2,127}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const STAGE_STATUSES = new Set(["PASS", "PARTIAL", "BLOCKED", "FAILED", "STALE"])
const STATE_STATUSES = new Set([
  "PENDING",
  "RUNNING",
  "PASS",
  "NA",
  "PARTIAL",
  "BLOCKED",
  "FAILED",
  "STALE",
  "CONFLICT",
])
const LANES = new Set(["workbench", "inventory", "cash", "payment", "ap", "ar"])

const EXPECTED_STAGE = Object.freeze({
  "00": {
    skillName: "stoquify-transaction-history-00-orchestrator",
    agentType: "Software Architect",
  },
  ...STAGE_BY_ID,
})

const MANIFEST_KEYS = new Set([
  "schemaVersion",
  "runId",
  "traceId",
  "mode",
  "sliceId",
  "contractVersion",
  "proposal",
  "baseCommit",
  "runtimeArtifactRoot",
  "scope",
  "stageAllowlists",
  "orchestratorPolicy",
  "gates",
  "createdAt",
])

const EVIDENCE_KEYS = new Set([
  "schemaVersion",
  "traceId",
  "runId",
  "sliceId",
  "stageId",
  "skillName",
  "agentType",
  "mode",
  "status",
  "activeLanes",
  "blockedLanes",
  "inputArtifacts",
  "inputFingerprint",
  "allowedEdits",
  "observedEdits",
  "repository",
  "claims",
  "verification",
  "outputs",
  "blockers",
  "nextEligibleStages",
  "startedAt",
  "completedAt",
])

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function addUnknownKeyErrors(value, allowedKeys, location, errors) {
  if (!isObject(value)) return
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) errors.push(`${location}.${key}: unexpected property`)
  }
}

function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function validRepoPath(value) {
  if (typeof value !== "string" || value.trim() === "") return false
  const normalized = normalizeRepoPath(value)
  if (path.isAbsolute(value) || /^[A-Za-z]:/.test(value)) return false
  return !normalized.split("/").includes("..")
}

function validateStringArray(value, location, errors, { minItems = 0, pathValues = false } = {}) {
  if (!Array.isArray(value)) {
    errors.push(`${location}: expected array`)
    return
  }
  if (value.length < minItems) errors.push(`${location}: expected at least ${minItems} item(s)`)
  if (new Set(value).size !== value.length) errors.push(`${location}: duplicate values are not allowed`)
  value.forEach((item, index) => {
    if (typeof item !== "string" || (pathValues && !validRepoPath(item))) {
      errors.push(`${location}[${index}]: invalid ${pathValues ? "repository path" : "string"}`)
    }
  })
}

function validateChecksummedPath(value, location, errors) {
  if (!isObject(value)) {
    errors.push(`${location}: expected object`)
    return
  }
  const keys = Object.keys(value)
  if (keys.some((key) => !["path", "sha256"].includes(key))) {
    errors.push(`${location}: unexpected property`)
  }
  if (!validRepoPath(value.path)) errors.push(`${location}.path: invalid repository path`)
  if (!SHA256_PATTERN.test(value.sha256 ?? "")) errors.push(`${location}.sha256: invalid checksum`)
}

function validateGate(gate, location, errors) {
  if (!isObject(gate)) {
    errors.push(`${location}: expected gate object`)
    return
  }
  if (!["PENDING", "PASS", "BLOCKED", "NA"].includes(gate.status)) {
    errors.push(`${location}.status: invalid gate status`)
  }
  validateStringArray(gate.evidence, `${location}.evidence`, errors, { pathValues: true })
  if (gate.status === "PASS" && gate.evidence?.length === 0) {
    errors.push(`${location}: PASS requires evidence`)
  }
}

export function validateRunManifest(manifest) {
  const errors = []
  if (!isObject(manifest)) return ["manifest: expected object"]
  addUnknownKeyErrors(manifest, MANIFEST_KEYS, "manifest", errors)

  if (manifest.schemaVersion !== "1.0") errors.push("manifest.schemaVersion: expected 1.0")
  if (!RUN_ID_PATTERN.test(manifest.runId ?? "")) errors.push("manifest.runId: invalid run ID")
  if (!UUID_PATTERN.test(manifest.traceId ?? "")) errors.push("manifest.traceId: invalid UUID")
  if (!MODES.includes(manifest.mode)) errors.push("manifest.mode: expected audit, implement, or verify")
  if (!["foundation-inventory", "cash-payment", "ap-ar"].includes(manifest.sliceId)) {
    errors.push("manifest.sliceId: invalid slice")
  }
  if (typeof manifest.contractVersion !== "string" || manifest.contractVersion.length === 0) {
    errors.push("manifest.contractVersion: required")
  }
  validateChecksummedPath(manifest.proposal, "manifest.proposal", errors)
  if (!COMMIT_PATTERN.test(manifest.baseCommit ?? "")) errors.push("manifest.baseCommit: invalid commit")

  const expectedRuntimeRoot = manifest.runId
    ? `what-next/transaction-history/runs/${manifest.runId}/`
    : ""
  if (manifest.runtimeArtifactRoot !== expectedRuntimeRoot) {
    errors.push(`manifest.runtimeArtifactRoot: expected ${expectedRuntimeRoot}`)
  }

  if (!isObject(manifest.scope)) {
    errors.push("manifest.scope: expected object")
  } else {
    addUnknownKeyErrors(
      manifest.scope,
      new Set(["lanes", "includePaths", "excludePaths"]),
      "manifest.scope",
      errors,
    )
    validateStringArray(manifest.scope.lanes, "manifest.scope.lanes", errors, { minItems: 1 })
    for (const lane of manifest.scope.lanes ?? []) {
      if (!LANES.has(lane)) errors.push(`manifest.scope.lanes: invalid lane ${lane}`)
    }
    validateStringArray(manifest.scope.includePaths, "manifest.scope.includePaths", errors, {
      pathValues: true,
    })
    validateStringArray(manifest.scope.excludePaths, "manifest.scope.excludePaths", errors, {
      pathValues: true,
    })

    const laneSet = new Set(manifest.scope.lanes ?? [])
    if (
      manifest.sliceId === "foundation-inventory" &&
      (!laneSet.has("workbench") || !laneSet.has("inventory") || laneSet.size !== 2)
    ) {
      errors.push("manifest.scope.lanes: foundation-inventory requires only workbench and inventory")
    }
    if (
      manifest.sliceId === "cash-payment" &&
      [...laneSet].some((lane) => !["cash", "payment"].includes(lane))
    ) {
      errors.push("manifest.scope.lanes: cash-payment permits only cash and payment")
    }
    if (
      manifest.sliceId === "ap-ar" &&
      [...laneSet].some((lane) => !["ap", "ar"].includes(lane))
    ) {
      errors.push("manifest.scope.lanes: ap-ar permits only ap and ar")
    }
  }

  if (!isObject(manifest.stageAllowlists)) {
    errors.push("manifest.stageAllowlists: expected object")
  } else {
    const expectedIds = STAGES.map((stage) => stage.id)
    for (const key of Object.keys(manifest.stageAllowlists)) {
      if (!expectedIds.includes(key)) errors.push(`manifest.stageAllowlists.${key}: unexpected stage`)
    }
    for (const stageId of expectedIds) {
      validateStringArray(
        manifest.stageAllowlists[stageId],
        `manifest.stageAllowlists.${stageId}`,
        errors,
        { minItems: 1, pathValues: true },
      )
    }
  }

  const policy = manifest.orchestratorPolicy
  if (!isObject(policy)) {
    errors.push("manifest.orchestratorPolicy: expected object")
  } else {
    addUnknownKeyErrors(
      policy,
      new Set(["productCodeEdits", "installSkills", "deployMigrations"]),
      "manifest.orchestratorPolicy",
      errors,
    )
    for (const key of ["productCodeEdits", "installSkills", "deployMigrations"]) {
      if (policy[key] !== false) errors.push(`manifest.orchestratorPolicy.${key}: must be false`)
    }
  }

  if (!isObject(manifest.gates)) {
    errors.push("manifest.gates: expected object")
  } else {
    addUnknownKeyErrors(
      manifest.gates,
      new Set(["foundationInventory", "arAccountingPrerequisites"]),
      "manifest.gates",
      errors,
    )
    validateGate(manifest.gates.foundationInventory, "manifest.gates.foundationInventory", errors)
    validateGate(
      manifest.gates.arAccountingPrerequisites,
      "manifest.gates.arAccountingPrerequisites",
      errors,
    )
  }

  if (!validDate(manifest.createdAt)) errors.push("manifest.createdAt: invalid date-time")
  return errors
}

export function validateRunState(state, manifest) {
  const errors = []
  if (!isObject(state)) return ["state: expected object"]
  if (state.runId !== manifest.runId) errors.push("state.runId: does not match manifest")
  if (state.sliceId !== manifest.sliceId) errors.push("state.sliceId: does not match manifest")
  if (!isObject(state.stages)) {
    errors.push("state.stages: expected object")
    return errors
  }

  for (const [stageId, stage] of Object.entries(state.stages)) {
    if (!STAGE_BY_ID[stageId]) errors.push(`state.stages.${stageId}: unexpected stage`)
    if (!isObject(stage)) {
      errors.push(`state.stages.${stageId}: expected object`)
      continue
    }
    if (!STATE_STATUSES.has(stage.status)) {
      errors.push(`state.stages.${stageId}.status: invalid status`)
    }
    if (stage.inputFingerprint && !SHA256_PATTERN.test(stage.inputFingerprint)) {
      errors.push(`state.stages.${stageId}.inputFingerprint: invalid checksum`)
    }
  }
  return errors
}

function arraysEqual(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort())
}

function isRuntimeArtifact(repoPath, runtimeRoot) {
  const file = normalizeRepoPath(repoPath)
  const root = normalizeRepoPath(runtimeRoot)
  return file === root || file.startsWith(`${root}/`)
}

export function validateStageEvidence(evidence, manifest) {
  const errors = []
  if (!isObject(evidence)) return ["evidence: expected object"]
  addUnknownKeyErrors(evidence, EVIDENCE_KEYS, "evidence", errors)

  if (evidence.schemaVersion !== "1.0") errors.push("evidence.schemaVersion: expected 1.0")
  if (evidence.traceId !== manifest.traceId) errors.push("evidence.traceId: does not match manifest")
  if (evidence.runId !== manifest.runId) errors.push("evidence.runId: does not match manifest")
  if (evidence.sliceId !== manifest.sliceId) errors.push("evidence.sliceId: does not match manifest")
  if (!EXPECTED_STAGE[evidence.stageId]) errors.push("evidence.stageId: invalid stage")
  if (EXPECTED_STAGE[evidence.stageId]?.skillName !== evidence.skillName) {
    errors.push("evidence.skillName: does not match stage")
  }
  if (EXPECTED_STAGE[evidence.stageId]?.agentType !== evidence.agentType) {
    errors.push("evidence.agentType: does not match stage")
  }
  if (evidence.mode !== manifest.mode) errors.push("evidence.mode: does not match manifest")
  if (!STAGE_STATUSES.has(evidence.status)) errors.push("evidence.status: invalid status")

  for (const key of ["activeLanes", "blockedLanes"]) {
    validateStringArray(evidence[key], `evidence.${key}`, errors)
    for (const lane of evidence[key] ?? []) {
      if (!LANES.has(lane)) errors.push(`evidence.${key}: invalid lane ${lane}`)
      if (!manifest.scope.lanes.includes(lane)) {
        errors.push(`evidence.${key}: lane ${lane} is outside manifest scope`)
      }
    }
  }
  const laneOverlap = (evidence.activeLanes ?? []).filter((lane) =>
    (evidence.blockedLanes ?? []).includes(lane),
  )
  if (laneOverlap.length > 0) errors.push("evidence lanes: active and blocked lanes overlap")

  if (!Array.isArray(evidence.inputArtifacts)) {
    errors.push("evidence.inputArtifacts: expected array")
  } else {
    evidence.inputArtifacts.forEach((item, index) =>
      validateChecksummedPath(item, `evidence.inputArtifacts[${index}]`, errors),
    )
  }
  if (!SHA256_PATTERN.test(evidence.inputFingerprint ?? "")) {
    errors.push("evidence.inputFingerprint: invalid checksum")
  }

  validateStringArray(evidence.allowedEdits, "evidence.allowedEdits", errors, {
    minItems: 1,
    pathValues: true,
  })
  validateStringArray(evidence.observedEdits, "evidence.observedEdits", errors, {
    pathValues: true,
  })

  const expectedAllowlist = evidence.stageId === "00"
    ? [manifest.runtimeArtifactRoot]
    : manifest.stageAllowlists[evidence.stageId] ?? []
  if (!arraysEqual(evidence.allowedEdits ?? [], expectedAllowlist)) {
    errors.push("evidence.allowedEdits: does not match manifest stage allowlist")
  }

  for (const observedEdit of evidence.observedEdits ?? []) {
    const runtimeEdit = isRuntimeArtifact(observedEdit, manifest.runtimeArtifactRoot)
    const allowedProductEdit = (evidence.allowedEdits ?? []).some((allowed) =>
      pathMatchesAllowlist(observedEdit, allowed),
    )

    if (!runtimeEdit && !allowedProductEdit) {
      errors.push(`evidence.observedEdits: out-of-scope edit ${observedEdit}`)
    }
    if (evidence.stageId === "00" && !runtimeEdit) {
      errors.push(`evidence.observedEdits: orchestrator cannot edit product path ${observedEdit}`)
    }
    if (manifest.mode === "audit" && !runtimeEdit) {
      errors.push(`evidence.observedEdits: audit mode cannot edit product path ${observedEdit}`)
    }
  }

  if (!isObject(evidence.repository)) {
    errors.push("evidence.repository: expected object")
  } else {
    if (!COMMIT_PATTERN.test(evidence.repository.headBefore ?? "")) {
      errors.push("evidence.repository.headBefore: invalid commit")
    }
    if (!COMMIT_PATTERN.test(evidence.repository.headAfter ?? "")) {
      errors.push("evidence.repository.headAfter: invalid commit")
    }
    validateStringArray(
      evidence.repository.dirtyFilesBefore,
      "evidence.repository.dirtyFilesBefore",
      errors,
      { pathValues: true },
    )
    validateStringArray(
      evidence.repository.dirtyFilesAfter,
      "evidence.repository.dirtyFilesAfter",
      errors,
      { pathValues: true },
    )
  }

  if (!Array.isArray(evidence.claims)) {
    errors.push("evidence.claims: expected array")
  } else {
    evidence.claims.forEach((claim, index) => {
      if (!isObject(claim) || typeof claim.id !== "string" || claim.id === "") {
        errors.push(`evidence.claims[${index}]: invalid claim`)
        return
      }
      if (!["PASS", "GAP", "NA"].includes(claim.result)) {
        errors.push(`evidence.claims[${index}].result: invalid result`)
      }
      validateStringArray(claim.evidence, `evidence.claims[${index}].evidence`, errors, {
        pathValues: true,
      })
    })
  }

  if (!Array.isArray(evidence.verification)) {
    errors.push("evidence.verification: expected array")
  } else {
    evidence.verification.forEach((check, index) => {
      if (!isObject(check) || typeof check.command !== "string" || check.command === "") {
        errors.push(`evidence.verification[${index}]: invalid check`)
        return
      }
      if (!["PASS", "FAIL", "SKIPPED"].includes(check.status)) {
        errors.push(`evidence.verification[${index}].status: invalid status`)
      }
      if (check.status === "SKIPPED" && check.exitCode !== null) {
        errors.push(`evidence.verification[${index}].exitCode: SKIPPED requires null`)
      }
      if (check.status !== "SKIPPED" && !Number.isInteger(check.exitCode)) {
        errors.push(`evidence.verification[${index}].exitCode: expected integer`)
      }
      if (check.logPath !== null && !validRepoPath(check.logPath)) {
        errors.push(`evidence.verification[${index}].logPath: invalid path`)
      }
    })
  }

  if (!Array.isArray(evidence.outputs)) {
    errors.push("evidence.outputs: expected array")
  } else {
    evidence.outputs.forEach((item, index) =>
      validateChecksummedPath(item, `evidence.outputs[${index}]`, errors),
    )
  }

  if (!Array.isArray(evidence.blockers)) {
    errors.push("evidence.blockers: expected array")
  } else {
    evidence.blockers.forEach((blocker, index) => {
      if (
        !isObject(blocker) ||
        !["critical", "high", "medium", "low"].includes(blocker.severity) ||
        typeof blocker.code !== "string" ||
        blocker.code === "" ||
        typeof blocker.reason !== "string" ||
        blocker.reason === ""
      ) {
        errors.push(`evidence.blockers[${index}]: invalid blocker`)
      }
    })
  }

  validateStringArray(evidence.nextEligibleStages, "evidence.nextEligibleStages", errors)
  for (const stageId of evidence.nextEligibleStages ?? []) {
    if (!STAGE_BY_ID[stageId]) errors.push(`evidence.nextEligibleStages: invalid stage ${stageId}`)
  }

  if (!validDate(evidence.startedAt)) errors.push("evidence.startedAt: invalid date-time")
  if (!validDate(evidence.completedAt)) errors.push("evidence.completedAt: invalid date-time")
  if (validDate(evidence.startedAt) && validDate(evidence.completedAt)) {
    if (Date.parse(evidence.completedAt) < Date.parse(evidence.startedAt)) {
      errors.push("evidence.completedAt: cannot precede startedAt")
    }
  }

  if (evidence.status === "PASS") {
    if (evidence.verification?.some((check) => check.status === "FAIL")) {
      errors.push("evidence.status: PASS cannot include failed verification")
    }
    if (evidence.blockers?.some((blocker) => ["critical", "high"].includes(blocker.severity))) {
      errors.push("evidence.status: PASS cannot include critical or high blockers")
    }
  }

  if (
    manifest.sliceId === "ap-ar" &&
    Number(evidence.stageId) >= 4 &&
    evidence.activeLanes?.includes("ar") &&
    !(
      manifest.gates.arAccountingPrerequisites.status === "PASS" &&
      manifest.gates.arAccountingPrerequisites.evidence.length > 0
    )
  ) {
    errors.push("evidence.activeLanes: AR requires passed accounting prerequisites after stage 03")
  }

  return errors
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"))
}

async function checksum(filePath) {
  const content = await readFile(filePath)
  return `sha256:${createHash("sha256").update(content).digest("hex")}`
}

async function verifyArtifactChecksums(entries, repoRoot, location, errors) {
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    if (!validRepoPath(entry.path) || !SHA256_PATTERN.test(entry.sha256 ?? "")) continue
    const absolutePath = path.resolve(repoRoot, ...normalizeRepoPath(entry.path).split("/"))
    const relativePath = path.relative(repoRoot, absolutePath)
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      errors.push(`${location}[${index}].path: resolves outside repository`)
      continue
    }
    try {
      const actual = await checksum(absolutePath)
      if (actual !== entry.sha256) errors.push(`${location}[${index}].sha256: checksum mismatch`)
    } catch (error) {
      if (error?.code === "ENOENT") errors.push(`${location}[${index}].path: file does not exist`)
      else throw error
    }
  }
}

export async function validateRunArtifacts({
  runDir,
  repoRoot = process.cwd(),
  verifyChecksums = true,
}) {
  const errors = []
  const warnings = []
  const absoluteRepoRoot = path.resolve(repoRoot)
  const absoluteRunDir = path.resolve(runDir)

  let manifest
  let state
  try {
    manifest = await readJson(path.join(absoluteRunDir, "run-manifest.json"))
  } catch (error) {
    return { valid: false, errors: [`run-manifest.json: ${error.message}`], warnings, evidenceCount: 0 }
  }

  errors.push(...validateRunManifest(manifest))

  const actualRuntimeRoot = normalizeRepoPath(path.relative(absoluteRepoRoot, absoluteRunDir))
  const declaredRuntimeRoot = normalizeRepoPath(manifest.runtimeArtifactRoot)
  if (actualRuntimeRoot !== declaredRuntimeRoot) {
    errors.push(`run directory: expected ${declaredRuntimeRoot}, found ${actualRuntimeRoot}`)
  }

  try {
    state = await readJson(path.join(absoluteRunDir, "run-state.json"))
    errors.push(...validateRunState(state, manifest))
  } catch (error) {
    errors.push(`run-state.json: ${error.message}`)
  }

  const sliceDirectory = path.join(absoluteRunDir, "slices", manifest.sliceId ?? "")
  let evidenceFiles = []
  try {
    evidenceFiles = (await readdir(sliceDirectory))
      .filter((name) => /^(?:00|0[1-7])-[a-z0-9-]+\.json$/.test(name))
      .sort()
  } catch (error) {
    if (error?.code !== "ENOENT") throw error
    warnings.push(`slice evidence directory not found: ${sliceDirectory}`)
  }

  const seenStages = new Set()
  for (const evidenceFile of evidenceFiles) {
    const evidencePath = path.join(sliceDirectory, evidenceFile)
    let evidence
    try {
      evidence = await readJson(evidencePath)
    } catch (error) {
      errors.push(`${evidenceFile}: ${error.message}`)
      continue
    }

    const stageErrors = validateStageEvidence(evidence, manifest)
    errors.push(...stageErrors.map((message) => `${evidenceFile}: ${message}`))
    if (seenStages.has(evidence.stageId)) errors.push(`${evidenceFile}: duplicate promoted stage evidence`)
    seenStages.add(evidence.stageId)

    if (verifyChecksums) {
      await verifyArtifactChecksums(
        evidence.inputArtifacts ?? [],
        absoluteRepoRoot,
        `${evidenceFile}.inputArtifacts`,
        errors,
      )
      await verifyArtifactChecksums(
        evidence.outputs ?? [],
        absoluteRepoRoot,
        `${evidenceFile}.outputs`,
        errors,
      )
    }
  }

  if (verifyChecksums && isObject(manifest.proposal)) {
    await verifyArtifactChecksums([manifest.proposal], absoluteRepoRoot, "manifest.proposal", errors)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    evidenceCount: evidenceFiles.length,
  }
}

function parseArguments(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--skip-checksums") {
      options.skipChecksums = true
      continue
    }
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`)
    const name = argument.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`)
    options[name] = value
    index += 1
  }
  return options
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv)
  if (!options["run-dir"]) {
    throw new Error(
      "Usage: validate-run-artifacts.mjs --run-dir <path> [--repo-root <path>] [--skip-checksums]",
    )
  }

  const result = await validateRunArtifacts({
    runDir: options["run-dir"],
    repoRoot: options["repo-root"] ?? process.cwd(),
    verifyChecksums: !options.skipChecksums,
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  if (!result.valid) process.exitCode = 1
  return result
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : ""
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
}
