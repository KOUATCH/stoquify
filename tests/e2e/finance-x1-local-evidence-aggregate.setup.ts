import { expect, test } from "@playwright/test"
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { financeX1RequiredEvidenceRoutes } from "../../components/DataTableComponents/finance-x1-evidence-binding"

test("aggregates the local authenticated X1 evidence matrix without release claims", async () => {
  const runId = process.env.FINANCE_X1_EVIDENCE_RUN_ID ?? "missing-local-run-id"
  const runDirectory = join(
    process.cwd(),
    "what-next",
    "evidence",
    "finance-x1",
    "local-simulation",
    runId,
  )
  const fragments = await Promise.all(
    (["desktop", "tablet", "mobile"] as const).map(async (viewport) => {
      const fragment = JSON.parse(
        await readFile(join(runDirectory, `fragment-${viewport}.json`), "utf8"),
      ) as {
        status: string
        runId: string
        authoritative: boolean
        approvedForReleaseEvidence: boolean
        artifacts: Array<{ artifactId: string; artifactPath: string; locale: string; viewport: string; route: string }>
      }
      expect(fragment).toMatchObject({
        status: "PASS",
        runId,
        authoritative: false,
        approvedForReleaseEvidence: false,
      })
      return fragment.artifacts
    }),
  )
  const artifacts = fragments.flat()
  const expectedArtifactCount = financeX1RequiredEvidenceRoutes.length * 2 * 3
  expect(artifacts).toHaveLength(expectedArtifactCount)
  expect(new Set(artifacts.map((artifact) => artifact.artifactId)).size).toBe(expectedArtifactCount)

  const expectedCoverage = ["desktop", "tablet", "mobile"].flatMap((viewport) =>
    ["en", "fr"].flatMap((locale) =>
      financeX1RequiredEvidenceRoutes.map(
        (route) => `${viewport}:${locale}:/${locale}${route.path}`,
      ),
    ),
  )
  const actualCoverage = new Set(
    artifacts.map((artifact) => `${artifact.viewport}:${artifact.locale}:${artifact.route}`),
  )
  expect(expectedCoverage.every((coverage) => actualCoverage.has(coverage))).toBe(true)

  const artifactsWithHashes = await Promise.all(
    artifacts.map(async (artifact) => {
      const bytes = await readFile(join(process.cwd(), artifact.artifactPath))
      return {
        ...artifact,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      }
    }),
  )
  const manifest = {
    schemaVersion: 1,
    classification: "LOCAL_SIMULATION_AUTHENTICATED_EVIDENCE_NOT_FOR_RELEASE",
    authoritative: false,
    authenticated: true,
    approvedForReleaseEvidence: false,
    productionBudgetsApproved: false,
    releaseGate: "BLOCKED_EXTERNAL_APPROVAL_REQUIRED",
    status: "LOCAL_AUTHENTICATED_EVIDENCE_COLLECTED",
    runId,
    organizationId: "rds_org_001",
    foreignIsolationProbeTenantId: "rds_org_002",
    personaRole: "external_accountant",
    locales: ["en", "fr"],
    viewports: ["desktop", "tablet", "mobile"],
    routeCount: financeX1RequiredEvidenceRoutes.length,
    artifactCount: artifactsWithHashes.length,
    capturedAt: new Date().toISOString(),
    artifacts: artifactsWithHashes,
  }
  await writeFile(
    join(runDirectory, "manifest.local-simulation.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  )
})
