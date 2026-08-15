import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const evidenceDir = join(
  process.cwd(),
  "what-next",
  "evidence",
  "customer-browser-certification-2026-08-11",
);
const projectNames = [
  "customer-authenticated-desktop",
  "customer-authenticated-tablet",
  "customer-authenticated-mobile",
  "customer-rbac-negative",
  "customer-locked-state",
];
const authStatePaths = [
  process.env.PLAYWRIGHT_CUSTOMER_STORAGE_STATE ??
    "playwright/.auth/customer.json",
  process.env.PLAYWRIGHT_CUSTOMER_DENIED_STORAGE_STATE ??
    "playwright/.auth/customer-denied.json",
  process.env.PLAYWRIGHT_CUSTOMER_LOCKED_STORAGE_STATE ??
    "playwright/.auth/customer-locked.json",
];

test.setTimeout(180_000);

test("aggregates customer browser evidence and removes synthetic fixture residue", () => {
  mkdirSync(evidenceDir, { recursive: true });
  const records: Array<{
    status?: string;
    project?: string;
    state?: string;
    verifiedStates?: string[];
    results?: Array<{
      state?: string;
      surface?: string;
      locale?: string;
      viewport?: string;
    }>;
  }> = [];
  const evidenceErrors: string[] = [];

  for (const projectName of projectNames) {
    const path = join(evidenceDir, projectName + ".json");
    try {
      records.push(JSON.parse(readFileSync(path, "utf8")));
    } catch (error) {
      evidenceErrors.push(
        projectName +
          ": " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  let cleanupResult: {
    mode: string;
    organizations: number;
    users: number;
    customers: number;
    salesOrders: number;
  } | null = null;
  try {
    const output = execFileSync(
      process.execPath,
      ["scripts/customer-e2e-fixture.js", "cleanup"],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: "utf8",
      },
    );
    cleanupResult = JSON.parse(output);
  } finally {
    for (const path of authStatePaths) {
      if (existsSync(path)) rmSync(path);
    }
  }

  const stateUnion = [
    ...new Set(
      records
        .flatMap((record) => [record.state, ...(record.verifiedStates ?? [])])
        .filter((state): state is string => Boolean(state)),
    ),
  ].sort();
  const expectedStates = [
    "degraded",
    "denied",
    "empty",
    "error",
    "loading",
    "locked",
    "success",
  ];
  const positiveRecords = records.filter((record) =>
    record.project?.startsWith("customer-authenticated-"),
  );
  const successMatrixComplete =
    positiveRecords.length === 3 &&
    positiveRecords.every((record) => {
      const results = record.results ?? [];
      return ["en", "fr"].every((locale) =>
        ["list", "create", "profile", "edit", "orders", "statement"].every(
          (surface) =>
            results.some(
              (result) =>
                result.state === "success" &&
                result.locale === locale &&
                result.surface === surface,
            ),
        ),
      );
    });
  const passed =
    evidenceErrors.length === 0 &&
    records.length === projectNames.length &&
    records.every((record) => record.status === "PASS") &&
    JSON.stringify(stateUnion) === JSON.stringify(expectedStates) &&
    successMatrixComplete &&
    cleanupResult !== null &&
    cleanupResult.organizations === 0 &&
    cleanupResult.users === 0 &&
    cleanupResult.customers === 0 &&
    cleanupResult.salesOrders === 0;

  writeFileSync(
    join(evidenceDir, "certification-summary.json"),
    JSON.stringify(
      {
        status: passed ? "PASS" : "FAIL",
        checkedAt: new Date().toISOString(),
        projects: records,
        evidenceErrors,
        stateUnion,
        expectedStates,
        successMatrixComplete,
        cleanup: cleanupResult,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  expect(evidenceErrors).toEqual([]);
  expect(records).toHaveLength(projectNames.length);
  expect(records.every((record) => record.status === "PASS")).toBe(true);
  expect(stateUnion).toEqual(expectedStates);
  expect(successMatrixComplete).toBe(true);
  expect(cleanupResult).toEqual({
    mode: "cleanup",
    organizations: 0,
    users: 0,
    customers: 0,
    salesOrders: 0,
  });
});
