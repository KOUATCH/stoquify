import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const storageState =
  process.env.PLAYWRIGHT_FINANCE_X1_STORAGE_STATE ??
  "playwright/.auth/finance-x1-external-accountant.json";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "finance-x1-external-accountant-desktop",
      testMatch: /finance-x1-authenticated-evidence\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
        storageState,
      },
    },
    {
      name: "finance-x1-external-accountant-tablet",
      testMatch: /finance-x1-authenticated-evidence\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 834, height: 1112 },
        storageState,
      },
    },
    {
      name: "finance-x1-external-accountant-mobile",
      testMatch: /finance-x1-authenticated-evidence\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        storageState,
      },
    },
    {
      name: "finance-x1-evidence-aggregate",
      testMatch: /finance-x1-evidence-aggregate\.setup\.ts/,
      dependencies: [
        "finance-x1-external-accountant-desktop",
        "finance-x1-external-accountant-tablet",
        "finance-x1-external-accountant-mobile",
      ],
    },
  ],
});
