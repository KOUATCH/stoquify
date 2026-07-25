import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";

const deniedAuthStatePath =
  process.env.PLAYWRIGHT_RBAC_DENIED_STORAGE_STATE ??
  "playwright/.auth/payroll-requester.json";

test.describe.configure({ timeout: 360_000 });

test("certifies the governed enabled Command Agent without activation authority", async ({
  page,
}) => {
  const requestId = randomUUID();
  await page.addInitScript((stableRequestId) => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: () => stableRequestId,
    });
  }, requestId);

  await page.goto("/en/dashboard/daily-digest", {
    waitUntil: "networkidle",
  });

  await expect(
    page.getByRole("heading", { name: "Daily Habit Digest" }),
  ).toBeVisible();
  const panel = page.getByTestId("command-agent-panel");
  await expect(
    panel.getByRole("heading", { name: "Command Agent" }),
  ).toBeVisible();
  await expect(
    panel.getByText(/No posting, approval, payment, filing/i),
  ).toBeVisible();

  const generate = panel.getByRole("button", { name: "Generate brief" });
  await expect(generate).toBeEnabled();
  await generate.focus();
  await expect(generate).toBeFocused();
  await page.keyboard.press("Enter");

  const brief = panel.getByTestId("command-agent-brief");
  await expect(brief).toBeVisible({ timeout: 90_000 });
  await expect(brief.getByText(/sources$/i)).toBeVisible();
  await expect(panel.getByRole("alert")).toHaveCount(0);

  const evidenceLinks = brief.getByRole("link", { name: /^Open source$/i });
  const evidenceLinkCount = await evidenceLinks.count();
  if (evidenceLinkCount === 0) {
    await expect(
      brief.getByText("No permitted priority is due for this digest."),
    ).toBeVisible();
  } else {
    for (let index = 0; index < evidenceLinkCount; index += 1) {
      await expect(evidenceLinks.nth(index)).toHaveAttribute("href", /^\//);
    }
  }

  expect(await seriousOrCriticalPanelViolations(page)).toEqual([]);

  await panel.getByRole("button", { name: "Helpful", exact: true }).click();
  await expect(panel.getByText("Feedback recorded")).toBeVisible({
    timeout: 30_000,
  });

  await panel.getByRole("button", { name: "Retry" }).click();
  await expect(panel.getByText(/Existing run receipt returned/i)).toBeVisible({
    timeout: 90_000,
  });

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("denies a role outside the controlled pilot allowlist", async ({
  browser,
}, testInfo) => {
  const mobile = testInfo.project.name.endsWith("mobile");
  const context = await browser.newContext({
    storageState: deniedAuthStatePath,
    viewport: mobile
      ? { width: 412, height: 915 }
      : { width: 1440, height: 1000 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  try {
    const deniedPage = await context.newPage();
    await deniedPage.goto("/en/dashboard/daily-digest", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      deniedPage.getByRole("heading", {
        name: "No Daily Digest workspace is available",
      }),
    ).toBeVisible();
    await expect(deniedPage.getByTestId("command-agent-panel")).toHaveCount(0);
    await expect(
      deniedPage.getByRole("button", { name: "Generate brief" }),
    ).toHaveCount(0);
    expect(
      await seriousOrCriticalPanelViolations(deniedPage, "main main"),
    ).toEqual([]);
  } finally {
    await context.close();
  }
});

async function seriousOrCriticalPanelViolations(
  page: Page,
  rootSelector = '[data-testid="command-agent-panel"]',
) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async (selector) => {
    const root = document.querySelector(selector);
    if (!root) throw new Error(`Accessibility root is missing: ${selector}`);
    const axeApi = (
      window as unknown as {
        axe: {
          run: (
            context: Element,
            options: Record<string, unknown>,
          ) => Promise<{
            violations: Array<{
              id: string;
              impact?: string | null;
              help: string;
            }>;
          }>;
        };
      }
    ).axe;
    const results = await axeApi.run(root, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });
    return results.violations
      .filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      )
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
      }));
  }, rootSelector);
}
