import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  captureSupplierEvidence,
  type SupplierCertificationEvidence,
  type SupplierEvidenceState,
} from "./supplier-certification-evidence";

test.describe.configure({ mode: "serial", timeout: 300_000 });

const listPath = "/en/dashboard/purchases/suppliers";
const missingSupplierId = "supplier_supplier_e2e_missing";
const foreignSupplierId = "supplier_supplier_e2e_foreign";
const foreignSupplierName = "Foreign Tenant Supplier Must Not Appear";
const evidenceDir = join(
  process.cwd(),
  "what-next",
  "evidence",
  "supplier-browser-certification-2026-08-11",
);
const evidence: SupplierCertificationEvidence[] = [];

test.afterAll(async ({}, testInfo) => {
  await mkdir(evidenceDir, { recursive: true });
  const requiredStates: SupplierEvidenceState[] = ["loading", "empty", "error", "degraded"];
  const verifiedStates = [...new Set(evidence.map((record) => record.state))];
  const passed =
    requiredStates.every((state) => verifiedStates.includes(state)) &&
    evidence.every(
      (record) =>
        record.seriousViolationCount === 0 &&
        !record.layout.hasDocumentOverflow &&
        record.layout.clippedActions.length === 0 &&
        record.layout.overlappingActions.length === 0,
    );
  await writeFile(
    join(evidenceDir, testInfo.project.name + ".json"),
    JSON.stringify(
      {
        status: passed ? "PASS" : "FAIL",
        checkedAt: new Date().toISOString(),
        project: testInfo.project.name,
        verifiedStates: verifiedStates.sort(),
        requiredStates,
        results: evidence,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
});

test("captures loading, empty, error, and degraded supplier states", async ({
  page,
}) => {
  let releaseAction: (() => void) | undefined;
  const actionGate = new Promise<void>((resolve) => {
    releaseAction = resolve;
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await actionGate;
    }
    await route.continue();
  });
  await page.goto(listPath, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Loading suppliers", { exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  evidence.push(
    await captureSupplierEvidence({
      page,
      evidenceDir,
      screenshotName: "loading-list-en-desktop",
      state: "loading",
      surface: "list",
      evidenceMethod: "controlled-server-action-delay",
    }),
  );
  releaseAction?.();
  await expect(
    page.getByRole("heading", { name: "Suppliers dashboard" }),
  ).toBeVisible({ timeout: 60_000 });
  await page.unrouteAll({ behavior: "wait" });

  const search = page.getByPlaceholder(
    "Search suppliers, code, contact, email, phone, country...",
  );
  await search.fill("supplier-state-matrix-no-match");
  await expect(page.locator("body")).toContainText("No suppliers found", {
    timeout: 30_000,
  });
  evidence.push(
    await captureSupplierEvidence({
      page,
      evidenceDir,
      screenshotName: "empty-list-en-desktop",
      state: "empty",
      surface: "list",
      evidenceMethod: "zero-result-supplier-filter",
    }),
  );

  await page.goto(listPath + "/" + missingSupplierId, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByText("Supplier not found", { exact: true }),
  ).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole("link", { name: "Back to suppliers" }),
  ).toBeVisible();
  evidence.push(
    await captureSupplierEvidence({
      page,
      evidenceDir,
      screenshotName: "error-profile-en-desktop",
      state: "error",
      surface: "profile",
      evidenceMethod: "missing-supplier-id-read",
    }),
  );

  await page.goto(listPath + "/" + foreignSupplierId, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByText("Supplier not found", { exact: true }),
  ).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator("body")).not.toContainText(foreignSupplierName);
  await expect(
    page.getByRole("link", { name: "Back to suppliers" }),
  ).toBeVisible();
  evidence.push(
    await captureSupplierEvidence({
      page,
      evidenceDir,
      screenshotName: "degraded-profile-en-desktop",
      state: "degraded",
      surface: "profile",
      evidenceMethod: "foreign-tenant-id-safe-nondisclosing-fallback",
    }),
  );
});
