import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

test.describe.configure({ mode: "serial", timeout: 300_000 });

const listPath = "/en/dashboard/purchases/suppliers";
const primarySupplierId = "supplier_supplier_e2e_primary";
const primarySupplierName = "Playwright Tenant Supplier";
const evidenceDir =
  process.env.PLAYWRIGHT_SUPPLIER_EVIDENCE_DIR ??
  join(
    process.cwd(),
    "what-next",
    "evidence",
    "purchasing-ap-supplier-presentation-2026-08-10",
  );

function monitorBrowserErrors(page: Page) {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push("console: " + message.text());
  });
  page.on("pageerror", (error) => failures.push("pageerror: " + error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (
      failure.includes("ERR_ABORTED") ||
      request.url().includes("_next/webpack-hmr")
    )
      return;
    failures.push("requestfailed: " + request.url() + " " + failure);
  });
  return failures;
}

test("scenario 5: denied role cannot read or reach supplier mutations", async ({
  page,
}, testInfo) => {
  const failures = monitorBrowserErrors(page);
  const routes = [
    { route: listPath, locale: "en" },
    { route: listPath + "/create", locale: "en" },
    { route: listPath + "/" + primarySupplierId, locale: "en" },
    { route: listPath + "/" + primarySupplierId + "/edit", locale: "en" },
    { route: listPath.replace("/en/", "/fr/"), locale: "fr" },
    { route: listPath.replace("/en/", "/fr/") + "/create", locale: "fr" },
    {
      route: listPath.replace("/en/", "/fr/") + "/" + primarySupplierId,
      locale: "fr",
    },
    {
      route:
        listPath.replace("/en/", "/fr/") +
        "/" +
        primarySupplierId +
        "/edit",
      locale: "fr",
    },
  ];

  for (const { route, locale } of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(
      page.getByRole("heading", {
        name:
          locale === "fr"
            ? "Les routes fournisseurs ne sont pas disponibles pour ce role"
            : "Supplier routes are not available for this role",
      }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("body")).not.toContainText(primarySupplierName);
    await expect(page.getByRole("button", { name: "Export" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Create supplier" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Archive supplier", { exact: true }),
    ).toHaveCount(0);
  }

  await page.addScriptTag({ content: axe.source });
  const seriousViolations = await page.evaluate(async () => {
    const results = await (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: Record<string, unknown>,
          ) => Promise<{
            violations: Array<{
              id: string;
              impact?: string | null;
              help: string;
              nodes: unknown[];
            }>;
          }>;
        };
      }
    ).axe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });
    return results.violations
      .filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      )
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        nodeCount: violation.nodes.length,
      }));
  });
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth:
      document.body?.scrollWidth ?? document.documentElement.scrollWidth,
  }));
  const hasOverflow =
    Math.max(layout.documentWidth, layout.bodyWidth) > layout.viewportWidth + 8;

  await mkdir(evidenceDir, { recursive: true });
  const screenshotPath = join(evidenceDir, "rbac-denied-desktop.png");
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
    caret: "initial",
  });

  expect(seriousViolations).toEqual([]);
  expect(hasOverflow).toBe(false);
  expect(failures).toEqual([]);

  await writeFile(
    join(evidenceDir, testInfo.project.name + ".json"),
    JSON.stringify(
      {
        status: "PASS",
        checkedAt: new Date().toISOString(),
        project: testInfo.project.name,
        scenarios: [5],
        routes: routes.map(({ route }) => route),
        assertions: {
          authenticated: true,
          permissionDenied: true,
          supplierDataDisclosed: false,
          exportControlExposed: false,
          lifecycleControlExposed: false,
          seriousViolationCount: seriousViolations.length,
          hasDocumentOverflow: hasOverflow,
          unhandledBrowserErrors: failures,
        },
        screenshot: relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
});
