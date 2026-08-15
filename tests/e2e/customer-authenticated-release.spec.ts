import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

test.describe.configure({ mode: "serial", timeout: 900_000 });

const primaryCustomerId = "customer_customer_e2e_primary";
const emptyCustomerId = "customer_customer_e2e_empty";
const missingCustomerId = "customer_customer_e2e_missing";
const foreignCustomerId = "customer_customer_e2e_foreign";
const primaryCustomerName = "Playwright Tenant Customer";
const foreignCustomerName = "Foreign Tenant Customer Must Not Appear";
const evidenceDir = join(
  process.cwd(),
  "what-next",
  "evidence",
  "customer-browser-certification-2026-08-11",
);

type ViewportKey = "desktop" | "tablet" | "mobile";
type LocaleKey = "en" | "fr";
type EvidenceState = "success" | "loading" | "empty" | "error" | "degraded";

type EvidenceRecord = {
  surface: string;
  locale: LocaleKey;
  viewport: ViewportKey;
  state: EvidenceState;
  path: string;
  screenshot: string;
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
  };
  evidenceMethod: "live-route" | "controlled-server-action-delay";
};

const evidence: EvidenceRecord[] = [];
const verifiedStates = new Set<EvidenceState>();

function viewportKey(projectName: string): ViewportKey {
  if (projectName.includes("tablet")) return "tablet";
  if (projectName.includes("mobile")) return "mobile";
  return "desktop";
}

function monitorBrowserErrors(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push("pageerror: " + error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (
      failure.includes("ERR_ABORTED") ||
      failure.includes("ERR_FAILED") ||
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

async function expectAuthenticated(page: Page) {
  await expect(page).not.toHaveURL(/\/(?:login|unauthorized)(?:\?|$)/);
  await expect(page.locator("body")).not.toContainText(
    /Application error|Internal Server Error/i,
  );
}

async function waitForReactOwnership(page: Page, selector: string) {
  await page.waitForFunction(
    (candidate) => {
      const element = document.querySelector(candidate);
      return Boolean(
        element &&
        Object.keys(element).some((key) => key.startsWith("__reactProps$")),
      );
    },
    selector,
    { timeout: 60_000 },
  );
}

async function captureEvidence(
  page: Page,
  input: {
    surface: string;
    locale: LocaleKey;
    viewport: ViewportKey;
    state: EvidenceState;
    evidenceMethod?: EvidenceRecord["evidenceMethod"];
  },
) {
  await mkdir(evidenceDir, { recursive: true });
  const screenshotPath = join(
    evidenceDir,
    [input.state, input.surface, input.locale, input.viewport].join("-") +
      ".png",
  );

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
              nodes: Array<{
                target: string[];
                html: string;
                failureSummary: string | null;
              }>;
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
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      }));
  });
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth:
      document.body?.scrollWidth ?? document.documentElement.scrollWidth,
    hasDocumentOverflow:
      Math.max(
        document.documentElement.scrollWidth,
        document.body?.scrollWidth ?? document.documentElement.scrollWidth,
      ) >
      window.innerWidth + 8,
  }));

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
    caret: "initial",
  });

  evidence.push({
    surface: input.surface,
    locale: input.locale,
    viewport: input.viewport,
    state: input.state,
    path: new URL(page.url()).pathname,
    screenshot: relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
    seriousViolations,
    layout,
    evidenceMethod: input.evidenceMethod ?? "live-route",
  });
  verifiedStates.add(input.state);

  expect(seriousViolations).toEqual([]);
  expect(layout.hasDocumentOverflow).toBe(false);
}

async function waitForSurface(page: Page, locale: LocaleKey, surface: string) {
  if (surface === "list") {
    await expect(
      page.getByRole("heading", {
        name: locale === "fr" ? "Tableau clients" : "Customers dashboard",
      }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText(primaryCustomerName, { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(foreignCustomerName, { exact: true }),
    ).toHaveCount(0);
    return;
  }
  if (surface === "create") {
    await expect(page.locator("#customer-name")).toBeVisible({
      timeout: 60_000,
    });
    return;
  }
  if (surface === "profile") {
    await expect(
      page.getByRole("heading", { name: primaryCustomerName, exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    return;
  }
  if (surface === "edit") {
    await expect(page.locator("#customer-name")).toHaveValue(
      primaryCustomerName,
      {
        timeout: 60_000,
      },
    );
    return;
  }
  if (surface === "orders") {
    await expect(
      page.getByRole("heading", {
        name: locale === "fr" ? "Commandes client" : "Customer orders",
      }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText("SO-CUS-E2E-001", { exact: true }),
    ).toBeVisible();
    return;
  }
  await expect(
    page.getByRole("heading", {
      name: locale === "fr" ? "Relevé client" : "Customer statement",
    }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByText(primaryCustomerName, { exact: false }),
  ).toBeVisible();
}

test.afterAll(async ({}, testInfo) => {
  await mkdir(evidenceDir, { recursive: true });
  const viewport = viewportKey(testInfo.project.name);
  const requiredSuccess = [
    "list",
    "create",
    "profile",
    "edit",
    "orders",
    "statement",
  ];
  const successRecords = evidence.filter(
    (record) => record.state === "success",
  );
  const expectedSuccessCount = requiredSuccess.length * 2;
  const expectedStates: EvidenceState[] =
    viewport === "desktop"
      ? ["success", "loading", "empty", "error", "degraded"]
      : ["success"];
  const passed =
    successRecords.length === expectedSuccessCount &&
    (["en", "fr"] as LocaleKey[]).every((locale) =>
      requiredSuccess.every((surface) =>
        successRecords.some(
          (record) => record.locale === locale && record.surface === surface,
        ),
      ),
    ) &&
    expectedStates.every((state) => verifiedStates.has(state)) &&
    evidence.every(
      (record) =>
        record.seriousViolations.length === 0 &&
        !record.layout.hasDocumentOverflow,
    );

  await writeFile(
    join(evidenceDir, testInfo.project.name + ".json"),
    JSON.stringify(
      {
        status: passed ? "PASS" : "FAIL",
        checkedAt: new Date().toISOString(),
        project: testInfo.project.name,
        viewport,
        locales: ["en", "fr"],
        requiredSurfaces: requiredSuccess,
        verifiedStates: [...verifiedStates].sort(),
        fixture: {
          source: "scripts/customer-e2e-fixture.js",
          productionBackfill: false,
          organizationId: "org_customer_e2e_local",
          primaryCustomerId,
          emptyCustomerId,
        },
        results: evidence,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
});

test("renders all six customer surfaces in English and French", async ({
  page,
}, testInfo) => {
  const failures = monitorBrowserErrors(page);
  const viewport = viewportKey(testInfo.project.name);
  const routeFor = (locale: LocaleKey, surface: string) => {
    const base = "/" + locale + "/dashboard/customers";
    if (surface === "list") return base;
    if (surface === "create") return base + "/new";
    if (surface === "profile") return base + "/" + primaryCustomerId;
    if (surface === "edit") return base + "/" + primaryCustomerId + "/edit";
    if (surface === "orders") return base + "/" + primaryCustomerId + "/orders";
    return base + "/" + primaryCustomerId + "/statement";
  };

  for (const locale of ["en", "fr"] as LocaleKey[]) {
    for (const surface of [
      "list",
      "create",
      "profile",
      "edit",
      "orders",
      "statement",
    ]) {
      await page.goto(routeFor(locale, surface), {
        waitUntil: "domcontentloaded",
      });
      await expectAuthenticated(page);
      await waitForSurface(page, locale, surface);
      await captureEvidence(page, {
        surface,
        locale,
        viewport,
        state: "success",
      });
    }
  }

  expect(failures).toEqual([]);
});

test("creates a customer and persists a profile edit", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("desktop"),
    "Customer mutations are verified once against the shared server-action boundary.",
  );
  const failures = monitorBrowserErrors(page);
  const viewport = viewportKey(testInfo.project.name);
  const createdName = "Playwright Created Customer " + viewport;

  await page.goto("/en/dashboard/customers/new", {
    waitUntil: "domcontentloaded",
  });
  await waitForReactOwnership(page, "#customer-name");
  const createForm = page
    .locator("form")
    .filter({ has: page.locator("#customer-name") })
    .first();
  await expect(createForm).toBeVisible({ timeout: 60_000 });
  await createForm.locator("#customer-name").fill(createdName);
  await createForm
    .locator("#customer-code")
    .fill("CUS-PW-" + viewport.toUpperCase());
  await createForm
    .locator("#customer-email")
    .fill("customer.created." + viewport + "@stockflow.test");
  const formStateBefore = await createForm.evaluate((form) => ({
    valid: (form as HTMLFormElement).checkValidity(),
    name: (form.querySelector("#customer-name") as HTMLInputElement | null)
      ?.value,
    code: (form.querySelector("#customer-code") as HTMLInputElement | null)
      ?.value,
    email: (form.querySelector("#customer-email") as HTMLInputElement | null)
      ?.value,
  }));
  expect(formStateBefore).toEqual({
    valid: true,
    name: createdName,
    code: "CUS-PW-" + viewport.toUpperCase(),
    email: "customer.created." + viewport + "@stockflow.test",
  });
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      Boolean(response.request().headers()["next-action"]) &&
      Boolean(response.request().postData()?.includes(createdName)),
    { timeout: 15_000 },
  );
  await createForm.getByRole("button", { name: "Create customer" }).click();
  const createResponse = await createResponsePromise.catch(async (error) => {
    const formStateAfter = await createForm.evaluate((form) => ({
      valid: (form as HTMLFormElement).checkValidity(),
      name: (form.querySelector("#customer-name") as HTMLInputElement | null)
        ?.value,
      code: (form.querySelector("#customer-code") as HTMLInputElement | null)
        ?.value,
      email: (form.querySelector("#customer-email") as HTMLInputElement | null)
        ?.value,
    }));
    const formAlert = await createForm
      .getByRole("alert")
      .textContent()
      .catch(() => null);
    const buttonText = await createForm
      .getByRole("button", { name: /customer/i })
      .last()
      .textContent();
    throw new Error(
      `Customer create emitted no POST: before=${JSON.stringify(formStateBefore)} after=${JSON.stringify(formStateAfter)} alert=${formAlert ?? "none"} button=${buttonText ?? "none"}`,
      { cause: error },
    );
  });
  try {
    await expect(page).not.toHaveURL(
      /\/en\/dashboard\/customers\/new(?:\?|$)/,
      {
        timeout: 60_000,
      },
    );
  } catch (error) {
    const formAlert = await createForm
      .getByRole("alert")
      .textContent()
      .catch(() => null);
    throw new Error(
      `Customer create did not navigate: status=${createResponse.status()} alert=${formAlert ?? "none"}`,
      { cause: error },
    );
  }
  await expect(
    page.getByRole("heading", { name: createdName, exact: true }),
  ).toBeVisible({
    timeout: 60_000,
  });

  await page.goto("/en/dashboard/customers", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText(createdName, { exact: true }).first(),
  ).toBeVisible({ timeout: 60_000 });

  await page.goto("/en/dashboard/customers/" + primaryCustomerId + "/edit", {
    waitUntil: "domcontentloaded",
  });
  const editForm = page
    .locator("form")
    .filter({ has: page.locator("#customer-name") })
    .first();
  const note = "Persistent synthetic edit from " + viewport;
  await expect(editForm.locator("#customer-name")).toHaveValue(
    primaryCustomerName,
    {
      timeout: 60_000,
    },
  );
  await editForm.locator("#customer-notes").fill(note);
  await editForm.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(
    new RegExp("/en/dashboard/customers/" + primaryCustomerId + "$"),
    { timeout: 60_000 },
  );

  await page.goto("/en/dashboard/customers/" + primaryCustomerId + "/edit", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("#customer-notes")).toHaveValue(note, {
    timeout: 60_000,
  });
  expect(failures).toEqual([]);
});

test("captures loading, empty, error, and degraded states", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("desktop"),
    "State variants are captured once at desktop width.",
  );
  const viewport = viewportKey(testInfo.project.name);

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
  await page.goto("/en/dashboard/customers", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Loading customers", { exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await captureEvidence(page, {
    surface: "list",
    locale: "en",
    viewport,
    state: "loading",
    evidenceMethod: "controlled-server-action-delay",
  });
  releaseAction?.();
  await page.unrouteAll({ behavior: "wait" });

  await page.goto("/en/dashboard/customers/" + emptyCustomerId + "/orders", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "No orders found" }),
  ).toBeVisible({ timeout: 60_000 });
  await captureEvidence(page, {
    surface: "orders",
    locale: "en",
    viewport,
    state: "empty",
  });

  await page.goto("/en/dashboard/customers/" + missingCustomerId + "/orders", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Customer not found" }),
  ).toBeVisible({ timeout: 60_000 });
  await captureEvidence(page, {
    surface: "orders",
    locale: "en",
    viewport,
    state: "error",
  });

  await page.goto("/en/dashboard/customers/" + foreignCustomerId, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Customer profile unavailable" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("link", { name: "Back to customers" }),
  ).toBeVisible();
  await captureEvidence(page, {
    surface: "profile",
    locale: "en",
    viewport,
    state: "degraded",
  });
});
