import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { captureSupplierEvidence } from "./supplier-certification-evidence";

const primarySupplierId = "supplier_supplier_e2e_primary";
const primarySupplierName = "Playwright Tenant Supplier";
const evidenceDir = join(
  process.cwd(),
  "what-next",
  "evidence",
  "supplier-browser-certification-2026-08-11",
);

test("Purchasing-unentitled tenant sees the supplier-history lock state", async ({
  page,
}, testInfo) => {
  await page.goto(
    "/en/dashboard/purchases/payables/history?supplierId=" +
      encodeURIComponent(primarySupplierId),
    { waitUntil: "domcontentloaded" },
  );
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(
    page.getByRole("heading", {
      name: "AP history is not enabled for this tenant",
    }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("body")).toContainText(
    "This workflow is protected by a module entitlement gate. Enable the required module before using this surface.",
  );
  await expect(page.locator("body")).not.toContainText(primarySupplierName);

  const record = await captureSupplierEvidence({
    page,
    evidenceDir,
    screenshotName: "locked-history-en-desktop",
    state: "locked",
    surface: "history",
    evidenceMethod: "enforced-purchasing-module-entitlement-denial",
  });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    join(evidenceDir, testInfo.project.name + ".json"),
    JSON.stringify(
      {
        status: "PASS",
        checkedAt: new Date().toISOString(),
        project: testInfo.project.name,
        state: "locked",
        fixture: {
          source: "scripts/supplier-locked-e2e-fixture.js",
          productionBackfill: false,
          organizationId: "org_supplier_e2e_locked",
          requestedModules: ["sales"],
          absentModule: "purchasing",
        },
        results: [record],
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
});
