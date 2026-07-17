import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  validateRunArtifacts,
  validateRunManifest,
  validateStageEvidence,
} from "./validate-run-artifacts.mjs"

const RUN_ID = "th-validator-test"
const TRACE_ID = "11111111-1111-4111-8111-111111111111"
const COMMIT = "a".repeat(40)
const RUNTIME_ROOT = `what-next/transaction-history/runs/${RUN_ID}/`

function digest(content) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`
}

function manifest(overrides = {}) {
  return {
    schemaVersion: "1.0",
    runId: RUN_ID,
    traceId: TRACE_ID,
    mode: "implement",
    sliceId: "foundation-inventory",
    contractVersion: "1.0",
    proposal: {
      path: "docs/proposal.md",
      sha256: digest("proposal"),
    },
    baseCommit: COMMIT,
    runtimeArtifactRoot: RUNTIME_ROOT,
    scope: {
      lanes: ["workbench", "inventory"],
      includePaths: [],
      excludePaths: [],
    },
    stageAllowlists: Object.fromEntries(
      ["01", "02", "03", "04", "05", "06", "07"].map((stageId) => [
        stageId,
        [`owned/stage-${stageId}/**`],
      ]),
    ),
    orchestratorPolicy: {
      productCodeEdits: false,
      installSkills: false,
      deployMigrations: false,
    },
    gates: {
      foundationInventory: { status: "PENDING", evidence: [] },
      arAccountingPrerequisites: { status: "PENDING", evidence: [] },
    },
    createdAt: "2026-07-14T12:00:00.000Z",
    ...overrides,
  }
}

function evidence(overrides = {}) {
  const reportPath = `${RUNTIME_ROOT}slices/foundation-inventory/00-orchestrator.md`
  return {
    schemaVersion: "1.0",
    traceId: TRACE_ID,
    runId: RUN_ID,
    sliceId: "foundation-inventory",
    stageId: "00",
    skillName: "stoquify-transaction-history-00-orchestrator",
    agentType: "Software Architect",
    mode: "implement",
    status: "PASS",
    activeLanes: ["workbench", "inventory"],
    blockedLanes: [],
    inputArtifacts: [
      { path: "docs/proposal.md", sha256: digest("proposal") },
    ],
    inputFingerprint: digest("inputs"),
    allowedEdits: [RUNTIME_ROOT],
    observedEdits: [
      `${RUNTIME_ROOT}run-state.json`,
      reportPath,
    ],
    repository: {
      headBefore: COMMIT,
      headAfter: COMMIT,
      dirtyFilesBefore: [],
      dirtyFilesAfter: [],
    },
    claims: [
      { id: "control-plane-only", result: "PASS", evidence: [reportPath] },
    ],
    verification: [
      { command: "node --test", status: "PASS", exitCode: 0, logPath: null },
    ],
    outputs: [
      { path: reportPath, sha256: digest("orchestrator report") },
    ],
    blockers: [],
    nextEligibleStages: ["01"],
    startedAt: "2026-07-14T12:00:00.000Z",
    completedAt: "2026-07-14T12:01:00.000Z",
    ...overrides,
  }
}

async function writeRepoFile(repoRoot, relativePath, content) {
  const target = path.join(repoRoot, ...relativePath.split("/"))
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, content, "utf8")
  return target
}

test("accepts a valid runtime tree and verifies checksums", async () => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "stoquify-history-validator-"))
  const runDir = path.join(repoRoot, ...RUNTIME_ROOT.split("/").filter(Boolean))
  const sliceRoot = `${RUNTIME_ROOT}slices/foundation-inventory/`

  await writeRepoFile(repoRoot, "docs/proposal.md", "proposal")
  await writeRepoFile(repoRoot, `${sliceRoot}00-orchestrator.md`, "orchestrator report")
  await writeRepoFile(repoRoot, `${RUNTIME_ROOT}run-manifest.json`, JSON.stringify(manifest()))
  await writeRepoFile(
    repoRoot,
    `${RUNTIME_ROOT}run-state.json`,
    JSON.stringify({
      runId: RUN_ID,
      sliceId: "foundation-inventory",
      stages: { "01": { status: "PENDING" } },
    }),
  )
  await writeRepoFile(
    repoRoot,
    `${sliceRoot}00-orchestrator.json`,
    JSON.stringify(evidence()),
  )

  const result = await validateRunArtifacts({ runDir, repoRoot })
  assert.deepEqual(result.errors, [])
  assert.equal(result.evidenceCount, 1)
  assert.equal(result.valid, true)
})

test("rejects product edits attributed to the orchestrator", () => {
  const errors = validateStageEvidence(
    evidence({ observedEdits: ["services/payments/history.service.ts"] }),
    manifest(),
  )

  assert.ok(errors.some((error) => error.includes("orchestrator cannot edit product path")))
})

test("rejects product edits in audit mode even when stage allowlisted", () => {
  const auditManifest = manifest({ mode: "audit" })
  const errors = validateStageEvidence(
    evidence({
      stageId: "02",
      skillName: "stoquify-transaction-history-02-security-proof-gate",
      agentType: "Security Architect",
      mode: "audit",
      allowedEdits: auditManifest.stageAllowlists["02"],
      observedEdits: ["owned/stage-02/security.ts"],
    }),
    auditManifest,
  )

  assert.ok(errors.some((error) => error.includes("audit mode cannot edit product path")))
})

test("rejects AR evidence after stage 03 without accounting prerequisites", () => {
  const apArManifest = manifest({
    sliceId: "ap-ar",
    scope: { lanes: ["ap", "ar"], includePaths: [], excludePaths: [] },
    gates: {
      foundationInventory: { status: "PASS", evidence: ["what-next/foundation.json"] },
      arAccountingPrerequisites: { status: "BLOCKED", evidence: [] },
    },
  })
  const errors = validateStageEvidence(
    evidence({
      sliceId: "ap-ar",
      stageId: "04",
      skillName: "stoquify-transaction-history-04-read-model-optimizer",
      agentType: "Database Optimizer",
      activeLanes: ["ar"],
      allowedEdits: apArManifest.stageAllowlists["04"],
      observedEdits: [],
    }),
    apArManifest,
  )

  assert.ok(errors.some((error) => error.includes("AR requires passed accounting prerequisites")))
})

test("rejects unsafe orchestrator policy and mismatched runtime root", () => {
  const errors = validateRunManifest(
    manifest({
      runtimeArtifactRoot: "what-next/elsewhere/",
      orchestratorPolicy: {
        productCodeEdits: true,
        installSkills: false,
        deployMigrations: false,
      },
    }),
  )

  assert.ok(errors.some((error) => error.includes("runtimeArtifactRoot")))
  assert.ok(errors.some((error) => error.includes("productCodeEdits")))
})

test("bundled JSON schemas are valid JSON", async () => {
  const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url))
  const referencesDirectory = path.resolve(scriptsDirectory, "..", "references")

  for (const filename of ["run-manifest.schema.json", "stage-evidence.schema.json"]) {
    const source = await readFile(path.join(referencesDirectory, filename), "utf8")
    assert.doesNotThrow(() => JSON.parse(source), filename)
  }
})
