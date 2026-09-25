import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"
const storageState = process.env.PLAYWRIGHT_FINANCE_X1_STORAGE_STATE
const runId = process.env.FINANCE_X1_EVIDENCE_RUN_ID ?? "missing-local-run-id"

if (process.env.X1_ALLOW_LOCAL_SIMULATION !== "true") {
  throw new Error("X1_ALLOW_LOCAL_SIMULATION=true is required")
}
if (!storageState) {
  throw new Error("PLAYWRIGHT_FINANCE_X1_STORAGE_STATE is required")
}

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: `what-next/evidence/finance-x1/local-simulation/${runId}/playwright-results`,
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "finance-x1-local-external-accountant-desktop",
      testMatch: /finance-x1-local-authenticated-evidence\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
        storageState,
      },
    },
    {
      name: "finance-x1-local-external-accountant-tablet",
      testMatch: /finance-x1-local-authenticated-evidence\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 834, height: 1112 },
        storageState,
      },
    },
    {
      name: "finance-x1-local-external-accountant-mobile",
      testMatch: /finance-x1-local-authenticated-evidence\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        storageState,
      },
    },
    {
      name: "finance-x1-local-evidence-aggregate",
      testMatch: /finance-x1-local-evidence-aggregate\.setup\.ts/,
      dependencies: [
        "finance-x1-local-external-accountant-desktop",
        "finance-x1-local-external-accountant-tablet",
        "finance-x1-local-external-accountant-mobile",
      ],
    },
  ],
})
