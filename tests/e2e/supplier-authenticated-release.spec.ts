import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

test.describe.configure({ mode: "serial", timeout: 240_000 });

const listPath = "/en/dashboard/purchases/suppliers";
const createPath = listPath + "/create";
const foreignSupplierName = "Foreign Tenant Supplier Must Not Appear";
const primarySupplierName = "Playwright Tenant Supplier";
const lifecycleIds = {
  desktop: "supplier_supplier_e2e_archive_desktop",
  tablet: "supplier_supplier_e2e_archive_tablet",
  mobile: "supplier_supplier_e2e_archive_mobile",
} as const;
const evidenceDir =
  process.env.PLAYWRIGHT_SUPPLIER_EVIDENCE_DIR ??
  join(
    process.cwd(),
    "what-next",
    "evidence",
    "purchasing-ap-supplier-presentation-2026-08-10",
  );

type ViewportKey = keyof typeof lifecycleIds;
type EvidenceRecord = {
  surface:
    | "list"
    | "create-page"
    | "detail-page"
    | "edit-page"
    | "history-page"
    | "payables-workbench"
    | "finance-payables";
  locale: "en" | "fr";
  viewport: ViewportKey;
  path: string;
  finalUrl: string;
  screenshot: string;
  dialogCount: number;
  seriousViolationCount: number;
  seriousViolations: Array<{
    id: string;
    impact: string | null;
    help: string;
    nodeCount: number;
    nodes: Array<{
      target: string[];
      html: string;
      failureSummary: string | null;
    }>;
  }>;
  layout: {
    viewportWidth: number;
    documentWidth: number;
    bodyWidth: number;
    hasDocumentOverflow: boolean;
    clippedActions: string[];
    overlappingActions: string[];
  };
};

const scenarioResults = new Set<number>();
const evidence: EvidenceRecord[] = [];
let createdSupplierId = "";
let createdSupplierName = "";

function refreshSupplierAssurance() {
  execFileSync(
    process.execPath,
    ["scripts/supplier-e2e-fixture.js", "assure"],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );
}

function viewportKey(projectName: string): ViewportKey {
  if (projectName.includes("tablet")) return "tablet";
  if (projectName.includes("mobile")) return "mobile";
  return "desktop";
}

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
    failures.push(
      "requestfailed: " +
        request.method() +
        " " +
        request.url() +
        " " +
        failure,
    );
  });
  return failures;
}

async function expectAuthorized(page: Page) {
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator("body")).not.toContainText(
    /Application error|Internal Server Error|not available for this role/i,
  );
}

async function captureEvidence(
  page: Page,
  surface: EvidenceRecord["surface"],
  viewport: ViewportKey,
) {
  await mkdir(evidenceDir, { recursive: true });
  const locale = new URL(page.url()).pathname.startsWith("/fr/") ? "fr" : "en";
  const screenshotPath = join(
    evidenceDir,
    surface + "-" + locale + "-" + viewport + ".png",
  );

  await page.addScriptTag({ content: axe.source });
  const seriousViolations = await page.evaluate(async () => {
    const browserAxe = (
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
              nodes: Array<{
                target: string[];
                html: string;
                failureSummary?: string | null;
              }>;
            }>;
          }>;
        };
      }
    ).axe;
    const results = await browserAxe.run(document, {
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
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary ?? null,
        })),
      }));
  });

  const layout = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body?.scrollWidth ?? documentWidth;
    const actionSelector =
      "a, button, input, textarea, select, [role='button'], [role='tab'], [role='menuitem']";
    const isEffectivelyVisible = (element: HTMLElement) => {
      let current: HTMLElement | null = element;
      while (current) {
        const style = window.getComputedStyle(current);
        if (
          current.hidden ||
          current.getAttribute("aria-hidden") === "true" ||
          (current !== element &&
            current.getAttribute("data-state") === "closed") ||
          current.inert ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity || "1") === 0
        )
          return false;
        current = current.parentElement;
      }
      return true;
    };
    const visibleRectFor = (element: HTMLElement) => {
      const ownRect = element.getBoundingClientRect();
      let left = ownRect.left;
      let top = ownRect.top;
      let right = ownRect.right;
      let bottom = ownRect.bottom;
      let current = element.parentElement;
      while (current) {
        const style = window.getComputedStyle(current);
        const rect = current.getBoundingClientRect();
        if (["auto", "scroll", "hidden", "clip"].includes(style.overflowX)) {
          left = Math.max(left, rect.left);
          right = Math.min(right, rect.right);
        }
        if (["auto", "scroll", "hidden", "clip"].includes(style.overflowY)) {
          top = Math.max(top, rect.top);
          bottom = Math.min(bottom, rect.bottom);
        }
        current = current.parentElement;
      }
      return {
        left,
        top,
        right,
        bottom,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      };
    };
    const actions = Array.from(
      document.querySelectorAll<HTMLElement>(actionSelector),
    ).filter((element) => {
      const rect = visibleRectFor(element);
      return isEffectivelyVisible(element) && rect.width > 1 && rect.height > 1;
    });
    const labelFor = (element: HTMLElement) =>
      (
        element.innerText ||
        element.getAttribute("aria-label") ||
        element.getAttribute("name") ||
        element.id ||
        "unnamed"
      )
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 100);
    const hasHorizontalScroller = (element: HTMLElement) => {
      let current = element.parentElement;
      while (current) {
        const style = window.getComputedStyle(current);
        if (
          current.scrollWidth > current.clientWidth + 2 &&
          (style.overflowX === "auto" || style.overflowX === "scroll")
        )
          return true;
        current = current.parentElement;
      }
      return false;
    };
    const clippedActions = actions
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          (rect.left < -2 || rect.right > viewportWidth + 2) &&
          !hasHorizontalScroller(element)
        );
      })
      .map(
        (element) => element.tagName.toLowerCase() + ":" + labelFor(element),
      );

    const describeAction = (element: HTMLElement) => {
      const rect = visibleRectFor(element);
      const ancestors: string[] = [];
      let current: HTMLElement | null = element;
      while (current && ancestors.length < 6) {
        const style = window.getComputedStyle(current);
        ancestors.push(
          [
            current.tagName.toLowerCase(),
            current.getAttribute("role") ?? "",
            current.getAttribute("data-state") ?? "",
            current.getAttribute("aria-hidden") ?? "",
            style.display,
            style.visibility,
            style.opacity,
            style.pointerEvents,
            style.position,
          ].join("|"),
        );
        current = current.parentElement;
      }
      return JSON.stringify({
        label: labelFor(element),
        tag: element.tagName.toLowerCase(),
        className: element.className,
        rect: {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
        },
        ancestors,
      });
    };

    const overlappingActions: string[] = [];
    for (let first = 0; first < actions.length; first += 1) {
      const firstRect = visibleRectFor(actions[first]);
      for (let second = first + 1; second < actions.length; second += 1) {
        if (
          actions[first].contains(actions[second]) ||
          actions[second].contains(actions[first])
        )
          continue;
        const secondRect = visibleRectFor(actions[second]);
        const overlapWidth =
          Math.min(firstRect.right, secondRect.right) -
          Math.max(firstRect.left, secondRect.left);
        const overlapHeight =
          Math.min(firstRect.bottom, secondRect.bottom) -
          Math.max(firstRect.top, secondRect.top);
        if (overlapWidth > 2 && overlapHeight > 2) {
          if (
            actions[first].contains(actions[second]) ||
            actions[second].contains(actions[first])
          )
            continue;
          overlappingActions.push(
            describeAction(actions[first]) +
              " <> " +
              describeAction(actions[second]) +
              ` overlap=${Math.round(overlapWidth)}x${Math.round(overlapHeight)}`,
          );
        }
      }
    }

    return {
      viewportWidth,
      documentWidth,
      bodyWidth,
      hasDocumentOverflow:
        Math.max(documentWidth, bodyWidth) > viewportWidth + 8,
      clippedActions,
      overlappingActions,
    };
  });

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
    caret: "initial",
  });

  evidence.push({
    surface,
    locale,
    viewport,
    path: new URL(page.url()).pathname,
    finalUrl: page.url(),
    screenshot: relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
    dialogCount: await page.getByRole("dialog").count(),
    seriousViolationCount: seriousViolations.length,
    seriousViolations,
    layout,
  });

  expect(seriousViolations).toEqual([]);
  expect(evidence.at(-1)?.dialogCount).toBe(0);
  expect(layout.hasDocumentOverflow).toBe(false);
  expect(layout.clippedActions).toEqual([]);
  expect(layout.overlappingActions).toEqual([]);
}

test.afterAll(async ({}, testInfo) => {
  await mkdir(evidenceDir, { recursive: true });
  const viewport = viewportKey(testInfo.project.name);
  const expected = [1, 2, 3, 4, 5, 6, 7, 8];
  const passed =
    expected.every((scenario) => scenarioResults.has(scenario)) &&
    evidence.length === 9 &&
    evidence.every(
      (record) =>
        record.dialogCount === 0 &&
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
        viewport,
        scenarios: [...scenarioResults].sort(),
        createdSupplierId,
        fixture: {
          source: "scripts/supplier-e2e-fixture.js",
          productionBackfill: false,
          organizationId: "org_supplier_e2e_local",
          foreignOrganizationId: "org_supplier_e2e_foreign",
          lifecycleSupplierId: lifecycleIds[viewport],
        },
        results: evidence,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
});

test("scenario 1: tenant-scoped list transitions to the routed create page", async ({
  page,
}, testInfo) => {
  const failures = monitorBrowserErrors(page);
  const viewport = viewportKey(testInfo.project.name);
  await page.goto(listPath, { waitUntil: "domcontentloaded" });
  await expectAuthorized(page);
  await expect(
    page.getByRole("heading", { name: "Suppliers dashboard" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("table").getByText(primarySupplierName, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(foreignSupplierName, { exact: true }),
  ).toHaveCount(0);

  await captureEvidence(page, "list", viewport);

  const createLink = page.getByRole("link", { name: "Create supplier" }).first();
  await expect(createLink).toHaveAttribute("href", createPath);
  await createLink.click();
  await expect(page).toHaveURL(createPath, { timeout: 60_000 });
  await expect(page.getByRole("form", { name: "Create supplier" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(failures).toEqual([]);
  scenarioResults.add(1);
});

test("scenario 2: create supplier and land on detail URL", async ({
  page,
}, testInfo) => {
  const failures = monitorBrowserErrors(page);
  const viewport = viewportKey(testInfo.project.name);
  createdSupplierName = "Playwright Created Supplier " + viewport;
  await page.goto(createPath, { waitUntil: "domcontentloaded" });
  await expectAuthorized(page);
  const form = page.getByRole("form", { name: "Create supplier" });
  await expect(form).toBeVisible({ timeout: 60_000 });
  await captureEvidence(page, "create-page", viewport);

  await form.locator("#supplier-name").fill(createdSupplierName);
  await form.locator("#supplier-code").fill("SUP-PW-" + viewport.toUpperCase());
  await form
    .locator("#supplier-contact")
    .fill("Synthetic " + viewport + " contact");
  await form
    .locator("#supplier-email")
    .fill("supplier.created." + viewport + "@stockflow.test");
  await form
    .locator("#supplier-phone")
    .fill(
      "+23761111000" +
        (viewport === "desktop" ? "1" : viewport === "tablet" ? "2" : "3"),
    );
  await form
    .locator("#supplier-tax-id")
    .fill("SYNTH-" + viewport.toUpperCase());
  await form.getByRole("button", { name: "Create supplier" }).click();

  const detailUrl =
    /\/en\/dashboard\/purchases\/suppliers\/(?!create$)([^/]+)$/;
  const submission = await Promise.race([
    page
      .waitForURL(detailUrl, { timeout: 60_000 })
      .then(() => ({ kind: "navigated" as const, message: "" })),
    form
      .getByRole("alert")
      .waitFor({ state: "visible", timeout: 60_000 })
      .then(async () => ({
        kind: "rejected" as const,
        message:
          (await form.getByRole("alert").textContent())?.trim() ??
          "Unknown supplier create error",
      })),
  ]);
  expect(
    submission.kind,
    "Supplier create action was rejected: " + submission.message,
  ).toBe("navigated");
  await expect(page).toHaveURL(detailUrl);
  const matched = new URL(page.url()).pathname.match(/\/suppliers\/([^/]+)$/);
  createdSupplierId = matched?.[1] ?? "";
  expect(createdSupplierId).not.toBe("");
  await expect(
    page.getByRole("heading", { name: createdSupplierName }),
  ).toBeVisible({ timeout: 60_000 });
  expect(failures).toEqual([]);
  scenarioResults.add(2);
});

test("scenario 3: detail state persists after hard refresh", async ({
  page,
}, testInfo) => {
  const failures = monitorBrowserErrors(page);
  const viewport = viewportKey(testInfo.project.name);
  expect(createdSupplierId).not.toBe("");
  await page.goto(listPath + "/" + createdSupplierId, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: createdSupplierName }),
  ).toBeVisible({ timeout: 60_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: createdSupplierName }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText("SUP-PW-" + viewport.toUpperCase(), { exact: true }),
  ).toBeVisible();
  await captureEvidence(page, "detail-page", viewport);
  expect(failures).toEqual([]);
  scenarioResults.add(3);
});

test("scenario 4: edit persists after hard refresh", async ({
  page,
}, testInfo) => {
  const failures = monitorBrowserErrors(page);
  const viewport = viewportKey(testInfo.project.name);
  const updatedName = createdSupplierName + " Updated";
  await page.goto(listPath + "/" + createdSupplierId + "/edit", {
    waitUntil: "domcontentloaded",
  });
  const form = page.getByRole("form", { name: "Edit supplier" });
  await expect(form).toBeVisible({ timeout: 60_000 });
  await expect(form.locator("#supplier-name")).toHaveValue(createdSupplierName);
  await captureEvidence(page, "edit-page", viewport);
  await form.locator("#supplier-name").fill(updatedName);
  await form
    .locator("#supplier-notes")
    .fill("Persistent synthetic edit from " + viewport);
  await form.getByRole("button", { name: "Edit supplier" }).click();

  await expect(page).toHaveURL(
    new RegExp("/en/dashboard/purchases/suppliers/" + createdSupplierId + "$"),
    { timeout: 60_000 },
  );
  createdSupplierName = updatedName;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: updatedName })).toBeVisible({
    timeout: 60_000,
  });
  expect(failures).toEqual([]);
  scenarioResults.add(4);
});

test("scenario 8: French list, create, detail, and edit remain routed pages", async ({
  page,
}, testInfo) => {
  const failures = monitorBrowserErrors(page);
  const viewport = viewportKey(testInfo.project.name);
  const frenchListPath = "/fr/dashboard/purchases/suppliers";

  await page.goto(frenchListPath, { waitUntil: "domcontentloaded" });
  await expectAuthorized(page);
  await expect(
    page.getByRole("heading", { name: "Tableau fournisseurs" }),
  ).toBeVisible({ timeout: 60_000 });
  await captureEvidence(page, "list", viewport);

  const createLink = page.getByRole("link", { name: "Creer fournisseur" }).first();
  await expect(createLink).toHaveAttribute("href", frenchListPath + "/create");
  await createLink.click();
  await expect(page).toHaveURL(frenchListPath + "/create");
  await expect(
    page.getByRole("form", { name: "Creer fournisseur" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("form", { name: "Creer fournisseur" }),
  ).toBeVisible({ timeout: 60_000 });
  await captureEvidence(page, "create-page", viewport);

  await page.goto(frenchListPath + "/" + createdSupplierId, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: createdSupplierName })).toBeVisible({
    timeout: 60_000,
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: createdSupplierName })).toBeVisible({
    timeout: 60_000,
  });
  await captureEvidence(page, "detail-page", viewport);

  const editLink = page.getByRole("link", { name: "Modifier fournisseur" });
  await expect(editLink).toHaveAttribute(
    "href",
    frenchListPath + "/" + createdSupplierId + "/edit",
  );
  await editLink.click();
  await expect(page).toHaveURL(frenchListPath + "/" + createdSupplierId + "/edit");
  const editForm = page.getByRole("form", { name: "Modifier fournisseur" });
  await expect(editForm).toBeVisible({ timeout: 60_000 });
  await expect(editForm.locator("#supplier-name")).toHaveValue(createdSupplierName);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(editForm.locator("#supplier-name")).toHaveValue(createdSupplierName);
  await captureEvidence(page, "edit-page", viewport);

  expect(failures).toEqual([]);
  scenarioResults.add(8);
});

test("scenario 5: supplier AP history preserves supplier context", async ({
  page,
}, testInfo) => {
  const failures = monitorBrowserErrors(page);
  const viewport = viewportKey(testInfo.project.name);
  expect(createdSupplierId).not.toBe("");
  await page.goto(
    "/en/dashboard/purchases/payables/history?supplierId=" +
      encodeURIComponent(createdSupplierId),
    { waitUntil: "domcontentloaded" },
  );
  await expectAuthorized(page);
  await expect(
    page.getByRole("heading", { name: "Supplier payable history" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("link", { name: "Back to supplier" }),
  ).toBeVisible();
  await expect(
    page.getByText(createdSupplierId, { exact: true }).first(),
  ).toBeVisible();
  await captureEvidence(page, "history-page", viewport);
  expect(failures).toEqual([]);
  scenarioResults.add(5);
});

test("scenario 6: redacted and sensitive exports are controlled", async ({
  page,
}) => {
  const failures = monitorBrowserErrors(page);
  refreshSupplierAssurance();
  await page.goto(listPath, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Suppliers dashboard" }),
  ).toBeVisible({ timeout: 60_000 });

  const exportButton = page.getByRole("button", {
    name: "Export",
    exact: true,
  });
  const redactedDownloadPromise = page.waitForEvent("download", {
    timeout: 30_000,
  });
  await exportButton.click();
  const redactedDownload = await redactedDownloadPromise;
  const redactedPath = await redactedDownload.path();
  expect(redactedPath).not.toBeNull();
  const redactedCsv = await readFile(redactedPath as string, "utf8");
  const redactedHeader = redactedCsv.split(/\r?\n/, 1)[0];
  expect(redactedDownload.suggestedFilename()).toContain("suppliers-redacted-");
  expect(redactedHeader).not.toContain('"Contact"');
  expect(redactedHeader).not.toContain('"Email"');
  expect(redactedHeader).not.toContain('"Phone"');
  expect(redactedHeader).not.toContain('"Tax ID"');
  expect(redactedCsv).not.toContain("supplier.primary@stockflow.test");
  expect(redactedCsv).not.toContain("SYNTHETIC-TAX-E2E");

  await page.getByRole("switch", { name: "Include sensitive fields" }).click();
  const fullDownloadPromise = page.waitForEvent("download", {
    timeout: 30_000,
  });
  await exportButton.click();
  const fullDownload = await fullDownloadPromise;
  const fullPath = await fullDownload.path();
  expect(fullPath).not.toBeNull();
  const fullCsv = await readFile(fullPath as string, "utf8");
  const fullHeader = fullCsv.split(/\r?\n/, 1)[0];
  expect(fullDownload.suggestedFilename()).toContain("suppliers-full-");
  expect(fullHeader).toContain('"Contact"');
  expect(fullHeader).toContain('"Email"');
  expect(fullHeader).toContain('"Phone"');
  expect(fullHeader).toContain('"Tax ID"');
  expect(fullCsv).toContain("supplier.primary@stockflow.test");
  expect(failures).toEqual([]);
  scenarioResults.add(6);
});

test("scenario 7: unused supplier archives with focus-safe confirmation", async ({
  page,
}, testInfo) => {
  const failures = monitorBrowserErrors(page);
  const viewport = viewportKey(testInfo.project.name);
  const fixtureName = "Playwright Archive Supplier " + viewport;
  await page.goto(listPath, { waitUntil: "domcontentloaded" });
  const row = page.getByRole("row").filter({ hasText: fixtureName });
  await expect(row).toBeVisible({ timeout: 60_000 });
  const actionsButton = row.getByRole("button", {
    name: "Open supplier actions",
  });
  await actionsButton.click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  const alert = page.getByRole("alertdialog", { name: "Archive supplier" });
  await expect(alert).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(alert).toHaveCount(0);
  await expect(actionsButton).toBeFocused();

  await actionsButton.click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Archive supplier" }).click();
  await expect(row).toHaveCount(0, { timeout: 60_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(fixtureName, { exact: true })).toHaveCount(0);
  expect(failures).toEqual([]);
  scenarioResults.add(7);
});
