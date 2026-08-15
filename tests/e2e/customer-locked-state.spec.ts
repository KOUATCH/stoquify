import { expect, test } from "@playwright/test";
import axe from "axe-core";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

test.describe.configure({ mode: "serial", timeout: 300_000 });

const primaryCustomerId = "customer_customer_e2e_primary";
const evidenceDir = join(
  process.cwd(),
  "what-next",
  "evidence",
  "customer-browser-certification-2026-08-11",
);

test("accounting-unentitled tenant sees the audited customer-statement lock state", async ({
  page,
}, testInfo) => {
  await page.goto(
    "/en/dashboard/customers/" + primaryCustomerId + "/statement",
    { waitUntil: "domcontentloaded" },
  );
  await expect(page).not.toHaveURL(/\/(?:login|unauthorized)(?:\?|$)/);
  await expect(
    page.getByRole("heading", {
      name: "Customer statements are not enabled for this organization",
    }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("body")).toContainText(
    "Enable the Accounting module before generating or sharing immutable customer statements.",
  );

  await page.addScriptTag({ content: axe.source });
  const seriousViolations = await page.evaluate(async () => {
    const results = await (
      window as unknown as {
        axe: {
          run: (
            document: Document,
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
  const hasDocumentOverflow = await page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollWidth,
        document.body?.scrollWidth ?? 0,
      ) >
      window.innerWidth + 8,
  );
  await mkdir(evidenceDir, { recursive: true });
  const screenshotPath = join(evidenceDir, "locked-statement-en-desktop.png");
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
    caret: "initial",
  });
  const passed = seriousViolations.length === 0 && !hasDocumentOverflow;

  await writeFile(
    join(evidenceDir, testInfo.project.name + ".json"),
    JSON.stringify(
      {
        status: passed ? "PASS" : "FAIL",
        checkedAt: new Date().toISOString(),
        project: testInfo.project.name,
        state: "locked",
        authenticated: true,
        entitlement: { sales: "active", accounting: "unavailable" },
        seriousViolations,
        hasDocumentOverflow,
        screenshot: relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  expect(seriousViolations).toEqual([]);
  expect(hasDocumentOverflow).toBe(false);
});
