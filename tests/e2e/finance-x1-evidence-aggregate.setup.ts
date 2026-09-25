import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  financeX1EvidenceBindingSchema,
  financeX1RequiredEvidenceRoutes,
} from "../../components/DataTableComponents/finance-x1-evidence-binding";
import { evaluateFinanceX1EvidenceBinding } from "../../scripts/validate-finance-x1-evidence";

test("aggregates the complete finance X1 matrix for human review", async () => {
  const approvalManifestPath =
    process.env.FINANCE_X1_EVIDENCE_APPROVAL_MANIFEST ??
    "what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json";
  const runId =
    process.env.FINANCE_X1_EVIDENCE_RUN_ID ?? "missing-approved-run-id";
  const runDirectory = join(
    process.cwd(),
    "what-next",
    "evidence",
    "finance-x1",
    runId,
  );
  const approvedBinding = financeX1EvidenceBindingSchema.parse(
    JSON.parse(await readFile(approvalManifestPath, "utf8")),
  );
  expect(approvedBinding.evidenceStatus).toBe("approved-awaiting-evidence");

  const fragments = await Promise.all(
    (["desktop", "tablet", "mobile"] as const).map(async (viewport) => {
      const fragment = JSON.parse(
        await readFile(join(runDirectory, `fragment-${viewport}.json`), "utf8"),
      ) as { status?: string; runId?: string; artifacts?: unknown[] };
      expect(fragment.status).toBe("PASS");
      expect(fragment.runId).toBe(runId);
      return fragment.artifacts ?? [];
    }),
  );
  const artifacts = fragments.flat();
  const expectedArtifactCount = financeX1RequiredEvidenceRoutes.length * 6;
  expect(artifacts).toHaveLength(expectedArtifactCount);

  const completedBinding = financeX1EvidenceBindingSchema.parse({
    ...approvedBinding,
    evidenceStatus: "evidence-collected-awaiting-review",
    claims: {
      screenshotsAvailable: true,
      measurementsAvailable: true,
      productionBudgetsApproved: true,
    },
    evidenceArtifactPaths: artifacts.map(
      (artifact) => (artifact as { artifactPath: string }).artifactPath,
    ),
    evidenceArtifacts: artifacts,
  });
  const manifestPath = join(runDirectory, "manifest.json");
  await mkdir(runDirectory, { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify(completedBinding, null, 2)}\n`,
    "utf8",
  );

  const validation = evaluateFinanceX1EvidenceBinding(completedBinding, {
    root: process.cwd(),
    manifestPath,
  });
  await writeFile(
    join(runDirectory, "validation-report.json"),
    `${JSON.stringify(validation, null, 2)}\n`,
    "utf8",
  );
  expect(validation).toMatchObject({
    status: "ready-for-human-review",
    artifactCount: expectedArtifactCount,
    blockerCount: 0,
    certificationClaimed: false,
  });
});
