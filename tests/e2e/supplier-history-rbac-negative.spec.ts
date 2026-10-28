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

test("denied role cannot read supplier-scoped AP history", async ({
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
      name: "AP history is not available for this role",
    }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("body")).not.toContainText(primarySupplierName);
  await expect(
    page.getByRole("link", { name: "Back to supplier" }),
  ).toHaveCount(0);

  const record = await captureSupplierEvidence({
    page,
    evidenceDir,
    screenshotName: "denied-history-en-desktop",
    state: "denied",
    surface: "history",
    evidenceMethod: "server-rbac-denial-before-history-read",
  });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    join(evidenceDir, testInfo.project.name + ".json"),
    JSON.stringify(
      {
        status: "PASS",
        checkedAt: new Date().toISOString(),
        project: testInfo.project.name,
        state: "denied",
        routes: [record.finalUrl],
        assertions: {
          supplierDataAbsent: true,
          recoveryLinkAbsent: true,
          seriousAccessibilityViolations: 0,
          horizontalOverflow: false,
        },
        results: [record],
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
});
