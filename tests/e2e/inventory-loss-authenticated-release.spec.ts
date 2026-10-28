import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

test.describe.configure({ timeout: 240_000 });

const routePath = "/en/dashboard/inventory/loss-control";
const evidenceDir = join(
  process.cwd(),
  "what-next",
  "referrals",
  "screenshots",
  "slice410",
);
const evidencePath = join(evidenceDir, "browser-certification.json");
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1100 },
] as const;

type AxeViolationSummary = {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodeCount: number;
};

type LayoutEvidence = {
  viewportWidth: number;
  documentWidth: number;
  bodyWidth: number;
  hasDocumentOverflow: boolean;
  overlappingElements: string[];
  clippedElements: string[];
};

type BrowserEvidence = {
  state: "complete" | "partial" | "empty";
  viewport: string;
  path: string;
  finalUrl: string;
  screenshot: string;
  seriousViolationCount: number;
  seriousViolations: AxeViolationSummary[];
  layout: LayoutEvidence;
};

declare global {
  interface Window {
    axe: {
      run: (
        context: Document,
        options: Record<string, unknown>,
      ) => Promise<{
        violations: Array<{
          id: string;
          impact?: string | null;
          help: string;
          helpUrl: string;
          nodes: unknown[];
        }>;
      }>;
    };
  }
}

const evidence: BrowserEvidence[] = [];

function dateDaysAgo(days: number) {
  const now = new Date();
  const date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
      12,
    ),
  );
  return date.toISOString().slice(0, 10);
}

function periodPath(fromDaysAgo: number, throughDaysAgo: number) {
  const parameters = new URLSearchParams({
    from: dateDaysAgo(fromDaysAgo),
    to: dateDaysAgo(throughDaysAgo),
  });
  return routePath + "?" + parameters.toString();
}

async function blockUnrelatedDashboardPrefetch(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const unrelatedDashboardGet =
      request.method() === "GET" &&
      url.pathname.startsWith("/en/dashboard/") &&
      url.pathname !== routePath;

    if (unrelatedDashboardGet) {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

function relativeEvidencePath(absolutePath: string) {
  return relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

async function runSeriousAxeScan(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });

    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodeCount: violation.nodes.length,
    }));
  });

  return violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
}

async function readLayoutEvidence(page: Page): Promise<LayoutEvidence> {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>(
      "main.dashboard-landing-theme",
    );
    const candidates = main
      ? Array.from(
          main.querySelectorAll<HTMLElement>(
            "h1, h2, h3, a, button, [role='tab']",
          ),
        )
      : [];
    const visible = candidates.filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") > 0 &&
        rect.width > 1 &&
        rect.height > 1
      );
    });
    const label = (element: HTMLElement) => {
      const text = (
        element.innerText ||
        element.getAttribute("aria-label") ||
        ""
      )
        .trim()
        .replace(/\s+/g, " ");
      return (
        element.tagName.toLowerCase() + ":" + (text.slice(0, 80) || "unnamed")
      );
    };
    const clippedElements = visible
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const hasLabel = Boolean(
          element.innerText.trim() || element.getAttribute("aria-label"),
        );
        return (
          hasLabel &&
          (style.overflowX === "hidden" || style.overflowY === "hidden") &&
          (element.scrollWidth > element.clientWidth + 2 ||
            element.scrollHeight > element.clientHeight + 2)
        );
      })
      .map(label);
    const overlappingElements: string[] = [];

    for (let leftIndex = 0; leftIndex < visible.length; leftIndex += 1) {
      const left = visible[leftIndex];
      const leftRect = left.getBoundingClientRect();
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < visible.length;
        rightIndex += 1
      ) {
        const right = visible[rightIndex];
        if (left.contains(right) || right.contains(left)) continue;
        const rightRect = right.getBoundingClientRect();
        const overlapWidth =
          Math.min(leftRect.right, rightRect.right) -
          Math.max(leftRect.left, rightRect.left);
        const overlapHeight =
          Math.min(leftRect.bottom, rightRect.bottom) -
          Math.max(leftRect.top, rightRect.top);
        if (overlapWidth > 3 && overlapHeight > 3) {
          overlappingElements.push(label(left) + " <> " + label(right));
        }
      }
    }

    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body?.scrollWidth ?? documentWidth;
    const viewportWidth = window.innerWidth;

    return {
      viewportWidth,
      documentWidth,
      bodyWidth,
      hasDocumentOverflow:
        Math.max(documentWidth, bodyWidth) > viewportWidth + 8,
      overlappingElements,
      clippedElements,
    };
  });
}
async function expectAuthenticatedSurface(page: Page) {
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator("body")).not.toContainText(
    /Application error|Internal Server Error/i,
  );
  await expect(
    page.getByRole("heading", {
      name: "Inventory Loss Control",
    }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText(/permission required|access is unavailable/i),
  ).toHaveCount(0);
  await expect(
    page.getByText("Tenant-wide authorized scope").first(),
  ).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator("body")).not.toContainText("sha256:");
  await expect(page.locator("body")).not.toContainText("InventoryLoss@2026");
}

async function captureEvidence(input: {
  page: Page;
  state: BrowserEvidence["state"];
  viewport: string;
  path: string;
}) {
  await mkdir(evidenceDir, { recursive: true });
  const screenshotPath = join(
    evidenceDir,
    input.state + "-" + input.viewport + ".png",
  );
  const seriousViolations = await runSeriousAxeScan(input.page);
  const layout = await readLayoutEvidence(input.page);

  await input.page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  evidence.push({
    state: input.state,
    viewport: input.viewport,
    path: input.path,
    finalUrl: input.page.url(),
    screenshot: relativeEvidencePath(screenshotPath),
    seriousViolationCount: seriousViolations.length,
    seriousViolations,
    layout,
  });

  expect(
    seriousViolations,
    "Serious or critical Axe violations: " + JSON.stringify(seriousViolations),
  ).toEqual([]);
  expect(layout.hasDocumentOverflow).toBe(false);
  expect(layout.overlappingElements).toEqual([]);
  expect(layout.clippedElements).toEqual([]);
}

test.describe("authenticated inventory-loss browser certification", () => {
  test.afterAll(async () => {
    await mkdir(evidenceDir, { recursive: true });
    const expectedEvidenceCount = viewports.length + 2;
    const passed =
      evidence.length === expectedEvidenceCount &&
      evidence.every(
        (item) =>
          item.seriousViolationCount === 0 &&
          !item.layout.hasDocumentOverflow &&
          item.layout.overlappingElements.length === 0 &&
          item.layout.clippedElements.length === 0 &&
          !/\/login(?:\?|$)/.test(item.finalUrl),
      );

    await writeFile(
      evidencePath,
      JSON.stringify(
        {
          status: passed ? "PASS" : "FAIL",
          checkedAt: new Date().toISOString(),
          slice: 410,
          surface: "inventory-loss-control",
          auth: {
            organizationId:
              process.env.AQSTOQFLOW_INVENTORY_LOSS_E2E_ORG_ID ??
              "org_inventory_loss_e2e_local",
            roleCode: "admin",
            requiredPermissions: ["dashboard.read", "inventory.levels.read"],
            fixtureSource: "scripts/seed-inventory-loss-e2e-user.js",
            credentialsRecorded: false,
          },
          authority: {
            browserSuppliedOrganizationId: false,
            browserSuppliedActorId: false,
            browserSuppliedPermissions: false,
            browserSuppliedRoles: false,
            browserSuppliedLocationAuthority: false,
            productAction: "getInventoryLossSummaryAction",
          },
          expectedEvidenceCount,
          results: evidence,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
  });

  for (const viewport of viewports) {
    test(
      "complete inventory-loss surface passes on " + viewport.name,
      async ({ page }) => {
        await blockUnrelatedDashboardPrefetch(page);
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(routePath, {
          waitUntil: "domcontentloaded",
        });

        await expectAuthenticatedSurface(page);
        await expect(page.getByText("Complete source").first()).toBeVisible();
        await expect(page.getByText("Recorded loss value")).toBeVisible();
        await expect(page.getByText("Loss breakdown")).toBeVisible();
        await expect(page.getByText("Recent source records")).toBeVisible();
        await expect(page.getByText("Cocoa cartons").first()).toBeVisible();
        await expect(
          page.getByText("Powdered milk tins").first(),
        ).toBeVisible();
        await expect(
          page.getByText(
            /Approval does not establish who or what caused the loss/i,
          ),
        ).toBeVisible();

        if (viewport.name === "desktop") {
          const detailsButton = page
            .getByRole("button", {
              name: "Open loss record details",
            })
            .first();
          await expect(detailsButton).toBeVisible();
          await detailsButton.click();
          await expect(
            page.getByRole("heading", { name: "Loss record" }),
          ).toBeVisible();
          await expect(page.locator("body")).not.toContainText("sha256:");
          await page.keyboard.press("Escape");
        }

        await captureEvidence({
          page,
          state: "complete",
          viewport: viewport.name,
          path: routePath,
        });
      },
    );
  }

  test("partial evidence remains visibly partial", async ({ page }) => {
    const path = periodPath(50, 40);
    await blockUnrelatedDashboardPrefetch(page);
    await page.setViewportSize({
      width: 1440,
      height: 1100,
    });
    await page.goto(path, { waitUntil: "domcontentloaded" });

    await expectAuthenticatedSurface(page);
    await expect(page.getByText("Totals are partial")).toBeVisible();
    await expect(
      page.getByText(/lack an evidence or document hash/i),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Approval does not establish who or what caused the loss/i,
      ),
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: "Open loss record details: LOSS-E2E-PARTIAL",
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Loss record" }),
    ).toBeVisible();
    await expect(
      page.getByText("Historical count variance awaiting supporting evidence"),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("sha256:");
    await page.keyboard.press("Escape");

    await captureEvidence({
      page,
      state: "partial",
      viewport: "desktop",
      path,
    });
  });

  test("empty evidence remains a truthful empty state", async ({ page }) => {
    const path = periodPath(120, 110);
    await blockUnrelatedDashboardPrefetch(page);
    await page.setViewportSize({
      width: 1440,
      height: 1100,
    });
    await page.goto(path, { waitUntil: "domcontentloaded" });

    await expectAuthenticatedSurface(page);
    await expect(page.getByText("No recorded inventory loss")).toBeVisible();
    await expect(
      page.getByText(/No completed loss-bearing stock adjustment was found/i),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Approval does not establish who or what caused the loss/i,
      ),
    ).toBeVisible();

    await captureEvidence({
      page,
      state: "empty",
      viewport: "desktop",
      path,
    });
  });
});
