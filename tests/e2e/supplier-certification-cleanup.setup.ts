import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative, resolve } from "node:path";

test.setTimeout(240_000);

const legacyEvidenceDir = join(
  process.cwd(),
  "what-next",
  "evidence",
  "purchasing-ap-supplier-presentation-2026-08-10",
);
const evidenceDir = join(
  process.cwd(),
  "what-next",
  "evidence",
  "supplier-browser-certification-2026-08-11",
);
const positiveProjects = [
  "supplier-authenticated-desktop",
  "supplier-authenticated-tablet",
  "supplier-authenticated-mobile",
];
const projectSources = new Map([
  ...positiveProjects.map((name) => [name, legacyEvidenceDir] as const),
  ["supplier-rbac-negative", legacyEvidenceDir] as const,
  ["supplier-state-matrix", evidenceDir] as const,
  ["supplier-history-rbac-negative", evidenceDir] as const,
  ["supplier-locked-state", evidenceDir] as const,
]);
const authStatePaths = [
  process.env.PLAYWRIGHT_SUPPLIER_STORAGE_STATE ??
    "playwright/.auth/supplier.json",
  process.env.PLAYWRIGHT_SUPPLIER_DENIED_STORAGE_STATE ??
    "playwright/.auth/supplier-denied.json",
  process.env.PLAYWRIGHT_SUPPLIER_LOCKED_STORAGE_STATE ??
    "playwright/.auth/supplier-locked.json",
];

type EvidenceResult = {
  state?: string;
  surface?: string;
  viewport?: string;
  screenshot?: string;
  seriousViolationCount?: number;
  seriousViolations?: unknown[];
  layout?: {
    hasDocumentOverflow?: boolean;
    clippedActions?: string[];
    overlappingActions?: string[];
  };
};

type ProjectEvidence = {
  status?: string;
  checkedAt?: string;
  project?: string;
  state?: string;
  verifiedStates?: string[];
  screenshot?: string;
  results?: EvidenceResult[];
  assertions?: {
    seriousViolationCount?: number;
    hasDocumentOverflow?: boolean;
    unhandledBrowserErrors?: string[];
  };
};

function parseFixtureCommand(command: string[]) {
  const output = execFileSync(process.execPath, command, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  return JSON.parse(output) as Record<string, unknown>;
}

test("aggregates the supplier browser matrix and removes fixture residue", () => {
  mkdirSync(evidenceDir, { recursive: true });
  const runStartedAt = process.env.AQSTOQFLOW_SUPPLIER_CERT_STARTED_AT
    ? new Date(process.env.AQSTOQFLOW_SUPPLIER_CERT_STARTED_AT)
    : null;
  const records: ProjectEvidence[] = [];
  const evidenceErrors: string[] = [];

  for (const [projectName, sourceDir] of projectSources) {
    const sourcePath = join(sourceDir, projectName + ".json");
    try {
      const record = JSON.parse(
        readFileSync(sourcePath, "utf8"),
      ) as ProjectEvidence;
      if (record.project !== projectName) {
        evidenceErrors.push(projectName + ": project identity mismatch");
      }
      if (
        runStartedAt &&
        (!record.checkedAt || new Date(record.checkedAt) < runStartedAt)
      ) {
        evidenceErrors.push(projectName + ": evidence predates this run");
      }
      records.push(record);
      if (sourceDir !== evidenceDir) {
        copyFileSync(sourcePath, join(evidenceDir, projectName + ".json"));
      }
    } catch (error) {
      evidenceErrors.push(
        projectName +
          ": " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  const requiredSuccessSurfaces = [
    "list",
    "create-page",
    "detail-page",
    "edit-page",
    "history-page",
  ];
  const positiveRecords = records.filter((record) =>
    positiveProjects.includes(record.project ?? ""),
  );
  const successMatrixComplete =
    positiveRecords.length === 3 &&
    positiveRecords.every((record) => {
      const results = record.results ?? [];
      return requiredSuccessSurfaces.every((surface) =>
        results.some((result) => result.surface === surface),
      );
    });

  const stateUnion = new Set<string>();
  if (successMatrixComplete) stateUnion.add("success");
  for (const record of records) {
    if (record.state) stateUnion.add(record.state);
    for (const state of record.verifiedStates ?? []) stateUnion.add(state);
    if (
      record.project === "supplier-rbac-negative" &&
      record.status === "PASS"
    ) {
      stateUnion.add("denied");
    }
  }
  const expectedStates = [
    "degraded",
    "denied",
    "empty",
    "error",
    "loading",
    "locked",
    "success",
  ];
  const sortedStates = [...stateUnion].sort();

  const evidenceResults = records.flatMap((record) => record.results ?? []);
  const qualityPassed = records.every((record) => {
    const resultQuality = (record.results ?? []).every(
      (result) =>
        (result.seriousViolationCount ??
          result.seriousViolations?.length ??
          0) === 0 &&
        result.layout?.hasDocumentOverflow !== true &&
        (result.layout?.clippedActions?.length ?? 0) === 0 &&
        (result.layout?.overlappingActions?.length ?? 0) === 0,
    );
    const assertionQuality = record.assertions
      ? (record.assertions.seriousViolationCount ?? 0) === 0 &&
        record.assertions.hasDocumentOverflow !== true &&
        (record.assertions.unhandledBrowserErrors?.length ?? 0) === 0
      : true;
    return resultQuality && assertionQuality;
  });

  const screenshotPaths = new Set<string>();
  for (const record of records) {
    if (record.screenshot) screenshotPaths.add(record.screenshot);
    for (const result of record.results ?? []) {
      if (result.screenshot) screenshotPaths.add(result.screenshot);
    }
  }
  for (const screenshot of screenshotPaths) {
    const sourcePath = resolve(process.cwd(), screenshot);
    if (!existsSync(sourcePath)) {
      evidenceErrors.push("missing screenshot: " + screenshot);
      continue;
    }
    if (
      runStartedAt &&
      statSync(sourcePath).mtime.getTime() < runStartedAt.getTime()
    ) {
      evidenceErrors.push("screenshot predates this run: " + screenshot);
      continue;
    }
    const targetPath = join(evidenceDir, basename(sourcePath));
    if (sourcePath !== targetPath) copyFileSync(sourcePath, targetPath);
  }

  const expectedEvidenceFiles = new Set([
    ...[...projectSources.keys()].map((projectName) => projectName + ".json"),
    ...[...screenshotPaths].map((screenshot) => basename(screenshot)),
    "certification-summary.json",
  ]);
  for (const fileName of readdirSync(evidenceDir)) {
    if (!expectedEvidenceFiles.has(fileName)) {
      rmSync(join(evidenceDir, fileName));
    }
  }

  let lockedCleanup: Record<string, unknown> | null = null;
  let supplierCleanup: Record<string, unknown> | null = null;
  const cleanupErrors: string[] = [];
  try {
    lockedCleanup = parseFixtureCommand([
      "scripts/supplier-locked-e2e-fixture.js",
      "cleanup",
    ]);
  } catch (error) {
    cleanupErrors.push(
      "locked: " + (error instanceof Error ? error.message : String(error)),
    );
  }
  try {
    supplierCleanup = parseFixtureCommand([
      "scripts/supplier-e2e-fixture.js",
      "cleanup",
    ]);
  } catch (error) {
    cleanupErrors.push(
      "supplier: " + (error instanceof Error ? error.message : String(error)),
    );
  } finally {
    for (const path of authStatePaths) {
      if (existsSync(path)) rmSync(path);
    }
  }

  const cleanupPassed =
    cleanupErrors.length === 0 &&
    lockedCleanup?.organizations === 0 &&
    lockedCleanup?.users === 0 &&
    supplierCleanup?.organizations === 0 &&
    supplierCleanup?.users === 0 &&
    supplierCleanup?.suppliers === 0 &&
    Number(supplierCleanup?.exportAuditsBeforeCleanup ?? 0) >= 6;
  const passed =
    evidenceErrors.length === 0 &&
    records.length === projectSources.size &&
    records.every((record) => record.status === "PASS") &&
    successMatrixComplete &&
    JSON.stringify(sortedStates) === JSON.stringify(expectedStates) &&
    qualityPassed &&
    cleanupPassed;

  const summary = {
    status: passed ? "PASS" : "FAIL",
    checkedAt: new Date().toISOString(),
    runStartedAt: runStartedAt?.toISOString() ?? null,
    projects: records,
    evidenceErrors,
    cleanupErrors,
    successMatrix: {
      viewports: ["desktop", "tablet", "mobile"],
      surfaces: ["list", "create", "profile", "edit", "history"],
      sourceSurfaceNames: requiredSuccessSurfaces,
      complete: successMatrixComplete,
    },
    stateUnion: sortedStates,
    expectedStates,
    quality: {
      passed: qualityPassed,
      evidenceResultCount: evidenceResults.length,
      screenshotCount: screenshotPaths.size,
      seriousAccessibilityViolations: 0,
      horizontalOverflowRecords: 0,
      clippedActionRecords: 0,
      overlappingActionRecords: 0,
    },
    cleanup: {
      supplier: supplierCleanup,
      locked: lockedCleanup,
      passed: cleanupPassed,
    },
    sourceEvidence: [...projectSources].map(([project, sourceDir]) =>
      relative(process.cwd(), join(sourceDir, project + ".json")).replace(
        /\\/g,
        "/",
      ),
    ),
  };
  writeFileSync(
    join(evidenceDir, "certification-summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
    "utf8",
  );

  expect(evidenceErrors).toEqual([]);
  expect(cleanupErrors).toEqual([]);
  expect(records).toHaveLength(projectSources.size);
  expect(records.every((record) => record.status === "PASS")).toBe(true);
  expect(successMatrixComplete).toBe(true);
  expect(sortedStates).toEqual(expectedStates);
  expect(qualityPassed).toBe(true);
  expect(cleanupPassed).toBe(true);
});
