import { defineConfig, devices } from "@playwright/test"

const webServerPort = Number(process.env.PLAYWRIGHT_PORT ?? "3000")
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${webServerPort}`
const authStatePath = process.env.PLAYWRIGHT_INVENTORY_ITEMS_STORAGE_STATE ?? "playwright/.auth/inventory-items.json"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure" },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER ? undefined : {
    command: `npx next dev -p ${webServerPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [
    {
      name: "master-data-onboarding-auth-setup",
      testMatch: /inventory-items-auth\.setup\.ts/,
      teardown: "master-data-onboarding-cleanup",
    },
    {
      name: "master-data-onboarding-cleanup",
      testMatch: /inventory-items-cleanup-evidence\.setup\.ts/,
    },
    {
      name: "master-data-onboarding-authenticated-release",
      testMatch: /master-data-onboarding-authenticated-release\.spec\.ts/,
      dependencies: ["master-data-onboarding-auth-setup"],
      use: { ...devices["Desktop Chrome"], storageState: authStatePath },
    },
  ],
})
