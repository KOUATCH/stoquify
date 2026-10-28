import { expect, test } from "@playwright/test"
import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"

const evidenceDir =
  process.env.PLAYWRIGHT_SUPPLIER_EVIDENCE_DIR ??
  join(
    process.cwd(),
    "what-next",
    "evidence",
    "purchasing-ap-supplier-presentation-2026-08-10",
  )
const projectNames = [
  "supplier-authenticated-desktop",
  "supplier-authenticated-tablet",
  "supplier-authenticated-mobile",
  "supplier-rbac-negative",
]
const authStatePaths = [
  process.env.PLAYWRIGHT_SUPPLIER_STORAGE_STATE ??
    "playwright/.auth/supplier.json",
  process.env.PLAYWRIGHT_SUPPLIER_DENIED_STORAGE_STATE ??
    "playwright/.auth/supplier-denied.json",
]

test.setTimeout(180_000)

test("aggregates route-first presentation scenarios and removes supplier fixture residue", () => {
  mkdirSync(evidenceDir, { recursive: true })
  const records: Array<{
    status?: string
    project?: string
    scenarios?: number[]
  }> = []
  const evidenceErrors: string[] = []

  for (const projectName of projectNames) {
    const path = join(evidenceDir, projectName + ".json")
    try {
      records.push(JSON.parse(readFileSync(path, "utf8")))
    } catch (error) {
      evidenceErrors.push(
        projectName + ": " +
          (error instanceof Error ? error.message : String(error)),
      )
    }
  }

  let cleanupResult: {
    mode: string
    organizations: number
    users: number
    suppliers: number
    exportAuditsBeforeCleanup: number
  } | null = null
  try {
    const output = execFileSync(
      process.execPath,
      ["scripts/supplier-e2e-fixture.js", "cleanup"],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: "utf8",
      },
    )
    cleanupResult = JSON.parse(output)
  } finally {
    for (const path of authStatePaths) {
      if (existsSync(path)) rmSync(path)
    }
  }

  const scenarioUnion = [
    ...new Set(records.flatMap((record) => record.scenarios ?? [])),
  ].sort()
  const passed =
    evidenceErrors.length === 0 &&
    records.length === projectNames.length &&
    records.every((record) => record.status === "PASS") &&
    JSON.stringify(scenarioUnion) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]) &&
    cleanupResult !== null &&
    cleanupResult.exportAuditsBeforeCleanup >= 6 &&
    cleanupResult.organizations === 0 &&
    cleanupResult.users === 0 &&
    cleanupResult.suppliers === 0

  writeFileSync(
    join(evidenceDir, "certification-summary.json"),
    JSON.stringify(
      {
        status: passed ? "PASS" : "FAIL",
        checkedAt: new Date().toISOString(),
        projects: records,
        evidenceErrors,
        scenarioUnion,
        expectedScenarios: [1, 2, 3, 4, 5, 6, 7, 8],
        cleanup: cleanupResult,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  )

  expect(evidenceErrors).toEqual([])
  expect(records).toHaveLength(projectNames.length)
  expect(records.every((record) => record.status === "PASS")).toBe(true)
  expect(scenarioUnion).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  expect(cleanupResult).toEqual(
    expect.objectContaining({
      mode: "cleanup",
      organizations: 0,
      users: 0,
      suppliers: 0,
      exportAuditsBeforeCleanup: expect.any(Number),
    }),
  )
  expect(cleanupResult?.exportAuditsBeforeCleanup ?? 0).toBeGreaterThanOrEqual(6)
})
