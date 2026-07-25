import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

test("keeps the authenticated Command Agent surface visibly fail-closed", async ({
  page,
}) => {
  await page.goto("/en/dashboard/daily-digest", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { name: "Daily Habit Digest" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Command Agent" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate brief" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Command Agent is disabled for this organization."),
  ).toBeVisible();
  await expect(
    page.getByText(/No posting, approval, payment, filing/i),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
