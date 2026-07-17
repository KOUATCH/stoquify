#!/usr/bin/env node

import { readFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"

export const MODES = Object.freeze(["audit", "implement", "verify"])

export const STAGES = Object.freeze([
  {
    id: "01",
    skillName: "stoquify-transaction-history-01-architecture-gate",
    agentType: "Software Architect",
    dependsOn: [],
  },
  {
    id: "02",
    skillName: "stoquify-transaction-history-02-security-proof-gate",
    agentType: "Security Architect",
    dependsOn: ["01"],
  },
  {
    id: "03",
    skillName: "stoquify-transaction-history-03-accounting-control-gate",
    agentType: "Bookkeeper & Controller",
    dependsOn: ["01"],
  },
  {
    id: "04",
    skillName: "stoquify-transaction-history-04-read-model-optimizer",
    agentType: "Database Optimizer",
    dependsOn: ["02", "03"],
  },
  {
    id: "05",
    skillName: "stoquify-transaction-history-05-workbench-ux-contract",
    agentType: "UX Architect",
    dependsOn: ["04"],
  },
  {
    id: "06",
    skillName: "stoquify-transaction-history-06-frontend-delivery",
    agentType: "Frontend Developer",
    dependsOn: ["04", "05"],
  },
  {
    id: "07",
    skillName: "stoquify-transaction-history-07-release-review",
    agentType: "API Tester/Code Reviewer",
    dependsOn: ["02", "03", "04", "05", "06"],
  },
])

export const STAGE_BY_ID = Object.freeze(
  Object.fromEntries(STAGES.map((stage) => [stage.id, stage])),
)

const PASSING_STATUSES = new Set(["PASS"])
const COMPLETED_STATUSES = new Set(["PASS", "PARTIAL"])
const STOPPED_STATUSES = new Set(["PARTIAL", "BLOCKED", "FAILED"])

export function normalizeRepoPath(value) {
  if (typeof value !== "string") return ""
  return value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "")
}

function globToRegExp(glob) {
  let source = "^"

  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index]

    if (character === "*") {
      if (glob[index + 1] === "*") {
        index += 1
        if (glob[index + 1] === "/") {
          index += 1
          source += "(?:.*/)?"
        } else {
          source += ".*"
        }
      } else {
        source += "[^/]*"
      }
      continue
    }

    if (character === "?") {
      source += "[^/]"
      continue
    }

    source += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
  }

  return new RegExp(`${source}$`)
}

export function pathMatchesAllowlist(filePath, allowedPath) {
  const file = normalizeRepoPath(filePath)
  const allowed = normalizeRepoPath(allowedPath)
  if (!file || !allowed) return false

  if (!allowed.includes("*") && !allowed.includes("?")) {
    return file === allowed || file.startsWith(`${allowed}/`)
  }

  return globToRegExp(allowed).test(file)
}

export function detectOverlappingDirtyFiles(
  dirtyFiles,
  allowedEdits,
  runtimeArtifactRoot = "",
) {
  const artifactRoot = normalizeRepoPath(runtimeArtifactRoot)
  const uniqueDirtyFiles = [...new Set((dirtyFiles ?? []).map(normalizeRepoPath))]

  return uniqueDirtyFiles.filter((file) => {
    if (!file) return false
    if (artifactRoot && (file === artifactRoot || file.startsWith(`${artifactRoot}/`))) {
      return false
    }
    return (allowedEdits ?? []).some((allowed) => pathMatchesAllowlist(file, allowed))
  })
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}))
}

function normalizedStages(state) {
  const stages = clone(state.stages)
  for (const stage of STAGES) {
    stages[stage.id] ??= { status: "PENDING" }
  }
  return stages
}

function dependantIds(stageId) {
  const dependants = new Set()
  const queue = [stageId]

  while (queue.length > 0) {
    const current = queue.shift()
    for (const stage of STAGES) {
      if (stage.dependsOn.includes(current) && !dependants.has(stage.id)) {
        dependants.add(stage.id)
        queue.push(stage.id)
      }
    }
  }

  return [...dependants]
}

export function markStaleDependants(state, currentFingerprints = {}) {
  const nextState = clone(state)
  nextState.stages = normalizedStages(nextState)
  const driftedStages = []
  const staleStages = new Set()

  for (const stage of STAGES) {
    const stageState = nextState.stages[stage.id]
    const currentFingerprint = currentFingerprints[stage.id]

    if (
      currentFingerprint &&
      stageState.inputFingerprint &&
      currentFingerprint !== stageState.inputFingerprint &&
      COMPLETED_STATUSES.has(stageState.status)
    ) {
      driftedStages.push(stage.id)
      staleStages.add(stage.id)
      for (const dependant of dependantIds(stage.id)) staleStages.add(dependant)
    }
  }

  for (const stageId of staleStages) {
    const stageState = nextState.stages[stageId]
    if (stageState.status === "PENDING") continue
    stageState.previousStatus = stageState.status
    stageState.status = "STALE"
    stageState.staleReason = driftedStages.includes(stageId)
      ? "INPUT_FINGERPRINT_DRIFT"
      : "UPSTREAM_INPUT_FINGERPRINT_DRIFT"
  }

  return {
    state: nextState,
    driftedStages: driftedStages.sort(),
    staleStages: [...staleStages]
      .filter((stageId) => nextState.stages[stageId].status === "STALE")
      .sort(),
  }
}

function gatePassed(gate) {
  return gate?.status === "PASS" && Array.isArray(gate.evidence) && gate.evidence.length > 0
}

function prerequisitesPassed(stage, stages) {
  return stage.dependsOn.every((dependency) =>
    PASSING_STATUSES.has(stages[dependency]?.status),
  )
}

function evaluateLanes(manifest, stages) {
  const activeLanes = [...new Set(manifest.scope?.lanes ?? [])]
  const blockedLanes = []
  const blockers = []

  if (
    manifest.sliceId === "ap-ar" &&
    activeLanes.includes("ar") &&
    PASSING_STATUSES.has(stages["03"]?.status) &&
    !gatePassed(manifest.gates?.arAccountingPrerequisites)
  ) {
    activeLanes.splice(activeLanes.indexOf("ar"), 1)
    blockedLanes.push("ar")
    blockers.push({
      severity: "high",
      code: "AR_ACCOUNTING_PREREQUISITES_NOT_PASSED",
      reason: "AR cannot advance beyond accounting assessment without a PASS gate and evidence.",
    })
  }

  return { activeLanes, blockedLanes, blockers }
}

function foundationBlocker(manifest) {
  if (manifest.sliceId === "foundation-inventory") return null
  if (gatePassed(manifest.gates?.foundationInventory)) return null

  return {
    severity: "high",
    code: "FOUNDATION_INVENTORY_NOT_PASSED",
    reason: "Later slices require a PASS foundation-inventory gate with evidence.",
  }
}

export function selectNextStage({
  manifest,
  state,
  currentFingerprints = {},
  dirtyFiles = [],
}) {
  if (!MODES.includes(manifest?.mode)) {
    throw new Error(`Unsupported mode: ${manifest?.mode ?? "missing"}`)
  }
  if (!manifest?.runId || manifest.runId !== state?.runId) {
    throw new Error("Manifest and state runId values must match")
  }
  if (!manifest?.sliceId || manifest.sliceId !== state?.sliceId) {
    throw new Error("Manifest and state sliceId values must match")
  }

  const staleResult = markStaleDependants(state, currentFingerprints)
  const stages = staleResult.state.stages
  const blockers = []
  const foundation = foundationBlocker(manifest)
  if (foundation) blockers.push(foundation)

  const lanes = evaluateLanes(manifest, stages)
  blockers.push(...lanes.blockers)

  if (foundation || lanes.activeLanes.length === 0) {
    return {
      runId: manifest.runId,
      mode: manifest.mode,
      sliceId: manifest.sliceId,
      activeLanes: lanes.activeLanes,
      blockedLanes: lanes.blockedLanes,
      driftedStages: staleResult.driftedStages,
      staleStages: staleResult.staleStages,
      eligibleStages: [],
      blockedStages: [],
      nextStage: null,
      complete: false,
      blockers,
      state: staleResult.state,
    }
  }

  const eligibleStages = []
  const blockedStages = []

  for (const stage of STAGES) {
    const stageState = stages[stage.id]

    if (PASSING_STATUSES.has(stageState.status)) continue
    if (stageState.status === "RUNNING") {
      blockers.push({
        severity: "high",
        code: "STAGE_ALREADY_RUNNING",
        reason: `Stage ${stage.id} is already marked RUNNING.`,
      })
      continue
    }
    if (STOPPED_STATUSES.has(stageState.status)) {
      blockers.push({
        severity: "high",
        code: `STAGE_${stageState.status}`,
        reason: `Stage ${stage.id} is ${stageState.status}; this run cannot advance its dependants.`,
      })
      continue
    }
    if (!prerequisitesPassed(stage, stages)) continue

    const allowedEdits = manifest.stageAllowlists?.[stage.id] ?? []
    const overlaps = detectOverlappingDirtyFiles(
      dirtyFiles,
      allowedEdits,
      manifest.runtimeArtifactRoot,
    )

    const candidate = {
      ...stage,
      allowedEdits,
      overlappingDirtyFiles: overlaps,
    }

    if (overlaps.length > 0) {
      blockedStages.push(candidate)
      blockers.push({
        severity: "high",
        code: "OVERLAPPING_DIRTY_FILES",
        reason: `Stage ${stage.id} overlaps existing dirty files: ${overlaps.join(", ")}`,
      })
    } else {
      eligibleStages.push(candidate)
    }
  }

  const allComplete = STAGES.every((stage) =>
    PASSING_STATUSES.has(stages[stage.id]?.status),
  )

  return {
    runId: manifest.runId,
    mode: manifest.mode,
    sliceId: manifest.sliceId,
    activeLanes: lanes.activeLanes,
    blockedLanes: lanes.blockedLanes,
    driftedStages: staleResult.driftedStages,
    staleStages: staleResult.staleStages,
    eligibleStages,
    blockedStages,
    nextStage: eligibleStages[0] ?? null,
    complete: allComplete && lanes.blockedLanes.length === 0,
    blockers,
    state: staleResult.state,
  }
}

function parseArguments(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`)
    const name = argument.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`)
    options[name] = value
    index += 1
  }
  return options
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"))
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv)
  if (!options.manifest || !options.state) {
    throw new Error(
      "Usage: select-next-stage.mjs --manifest <path> --state <path> [--fingerprints <path>] [--dirty-files <path>]",
    )
  }

  const manifest = await readJson(options.manifest)
  const state = await readJson(options.state)
  const currentFingerprints = options.fingerprints
    ? await readJson(options.fingerprints)
    : {}
  const dirtyFiles = options["dirty-files"]
    ? await readJson(options["dirty-files"])
    : state.workingTree?.dirtyFiles ?? []

  const result = selectNextStage({ manifest, state, currentFingerprints, dirtyFiles })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  return result
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : ""
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
}
