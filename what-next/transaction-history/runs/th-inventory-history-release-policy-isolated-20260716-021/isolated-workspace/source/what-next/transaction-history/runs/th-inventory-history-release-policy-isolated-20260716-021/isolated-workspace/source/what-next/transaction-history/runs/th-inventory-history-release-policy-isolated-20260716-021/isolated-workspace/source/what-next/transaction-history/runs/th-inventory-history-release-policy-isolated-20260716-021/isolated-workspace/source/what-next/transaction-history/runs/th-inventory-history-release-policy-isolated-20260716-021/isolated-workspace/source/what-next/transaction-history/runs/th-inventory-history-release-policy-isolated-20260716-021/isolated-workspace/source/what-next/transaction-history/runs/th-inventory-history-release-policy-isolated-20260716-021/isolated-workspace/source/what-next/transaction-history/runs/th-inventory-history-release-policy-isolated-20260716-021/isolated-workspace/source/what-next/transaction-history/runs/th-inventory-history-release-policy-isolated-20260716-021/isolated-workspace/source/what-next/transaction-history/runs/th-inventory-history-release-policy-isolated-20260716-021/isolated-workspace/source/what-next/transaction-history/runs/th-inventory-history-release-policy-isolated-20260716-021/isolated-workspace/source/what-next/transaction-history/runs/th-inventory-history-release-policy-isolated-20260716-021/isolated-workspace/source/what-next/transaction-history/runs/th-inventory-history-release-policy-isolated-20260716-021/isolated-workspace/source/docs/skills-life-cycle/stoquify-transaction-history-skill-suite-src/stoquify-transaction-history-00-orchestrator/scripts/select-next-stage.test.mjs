import assert from "node:assert/strict"
import test from "node:test"

import {
  markStaleDependants,
  selectNextStage,
} from "./select-next-stage.mjs"

const fingerprint = (character) => `sha256:${character.repeat(64)}`

function manifest(overrides = {}) {
  const stageAllowlists = Object.fromEntries(
    ["01", "02", "03", "04", "05", "06", "07"].map((stageId) => [
      stageId,
      [`owned/stage-${stageId}/**`],
    ]),
  )

  return {
    runId: "th-test-run",
    mode: "audit",
    sliceId: "foundation-inventory",
    runtimeArtifactRoot: "what-next/transaction-history/runs/th-test-run/",
    scope: { lanes: ["workbench", "inventory"] },
    stageAllowlists,
    gates: {
      foundationInventory: { status: "PENDING", evidence: [] },
      arAccountingPrerequisites: { status: "PENDING", evidence: [] },
    },
    ...overrides,
  }
}

function state(overrides = {}) {
  return {
    runId: "th-test-run",
    sliceId: "foundation-inventory",
    stages: {},
    ...overrides,
  }
}

test("supports audit, implement, and verify modes", () => {
  for (const mode of ["audit", "implement", "verify"]) {
    const result = selectNextStage({
      manifest: manifest({ mode }),
      state: state(),
    })
    assert.equal(result.mode, mode)
    assert.equal(result.nextStage.id, "01")
  }
})

test("does not advance dependants from a partial prerequisite", () => {
  const result = selectNextStage({
    manifest: manifest({ mode: "implement" }),
    state: state({
      stages: {
        "01": { status: "PARTIAL" },
        "02": { status: "PENDING" },
        "03": { status: "PENDING" },
        "04": { status: "PENDING" },
        "05": { status: "PENDING" },
        "06": { status: "PENDING" },
        "07": { status: "PENDING" },
      },
    }),
  })

  assert.equal(result.nextStage, null)
  assert.deepEqual(result.eligibleStages, [])
  assert.equal(result.complete, false)
  assert.ok(result.blockers.some((blocker) => blocker.code === "STAGE_PARTIAL"))
})

test("detects overlapping dirty files before dispatch", () => {
  const result = selectNextStage({
    manifest: manifest(),
    state: state(),
    dirtyFiles: [
      "owned/stage-01/user-change.ts",
      "unrelated/preserved.ts",
      "what-next/transaction-history/runs/th-test-run/run-state.json",
    ],
  })

  assert.equal(result.nextStage, null)
  assert.deepEqual(result.blockedStages[0].overlappingDirtyFiles, [
    "owned/stage-01/user-change.ts",
  ])
  assert.ok(result.blockers.some((blocker) => blocker.code === "OVERLAPPING_DIRTY_FILES"))
})

test("marks a drifted stage and completed transitive dependants stale", () => {
  const stages = Object.fromEntries(
    ["01", "02", "03", "04", "05", "06", "07"].map((stageId) => [
      stageId,
      { status: "PASS", inputFingerprint: fingerprint("a") },
    ]),
  )

  const result = markStaleDependants(
    state({ stages }),
    { "02": fingerprint("b") },
  )

  assert.deepEqual(result.driftedStages, ["02"])
  assert.deepEqual(result.staleStages, ["02", "04", "05", "06", "07"])
  assert.equal(result.state.stages["03"].status, "PASS")
  assert.equal(result.state.stages["04"].staleReason, "UPSTREAM_INPUT_FINGERPRINT_DRIFT")
})

test("blocks only the AR lane when AP can continue", () => {
  const completedAssessment = {
    "01": { status: "PASS" },
    "02": { status: "PASS" },
    "03": { status: "PASS" },
  }
  const apArManifest = manifest({
    sliceId: "ap-ar",
    scope: { lanes: ["ap", "ar"] },
    gates: {
      foundationInventory: {
        status: "PASS",
        evidence: ["what-next/foundation-pass.json"],
      },
      arAccountingPrerequisites: { status: "BLOCKED", evidence: [] },
    },
  })

  const result = selectNextStage({
    manifest: apArManifest,
    state: state({ sliceId: "ap-ar", stages: completedAssessment }),
  })

  assert.deepEqual(result.activeLanes, ["ap"])
  assert.deepEqual(result.blockedLanes, ["ar"])
  assert.equal(result.nextStage.id, "04")
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "AR_ACCOUNTING_PREREQUISITES_NOT_PASSED",
    ),
  )
})

test("stops an AR-only run when accounting prerequisites do not pass", () => {
  const result = selectNextStage({
    manifest: manifest({
      sliceId: "ap-ar",
      scope: { lanes: ["ar"] },
      gates: {
        foundationInventory: {
          status: "PASS",
          evidence: ["what-next/foundation-pass.json"],
        },
        arAccountingPrerequisites: { status: "PENDING", evidence: [] },
      },
    }),
    state: state({
      sliceId: "ap-ar",
      stages: {
        "01": { status: "PASS" },
        "02": { status: "PASS" },
        "03": { status: "PASS" },
      },
    }),
  })

  assert.equal(result.nextStage, null)
  assert.deepEqual(result.blockedLanes, ["ar"])
})

test("requires the foundation gate for later slices", () => {
  const result = selectNextStage({
    manifest: manifest({
      sliceId: "cash-payment",
      scope: { lanes: ["cash", "payment"] },
    }),
    state: state({ sliceId: "cash-payment" }),
  })

  assert.equal(result.nextStage, null)
  assert.ok(result.blockers.some((blocker) => blocker.code === "FOUNDATION_INVENTORY_NOT_PASSED"))
})
