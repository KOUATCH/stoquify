import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.PLAYWRIGHT_PORT ?? "3108")
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`
const storageState =
  process.env.PLAYWRIGHT_POS_G0_STORAGE_STATE ?? "playwright/.auth/pos-g0.json"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/pos-g0" }]],
  outputDir: "test-results/pos-g0",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: `node node_modules/next/dist/bin/next dev -p ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 240_000,
      },
  projects: [
    {
      name: "pos-g0-auth-setup",
      testMatch: /pos-g0-auth\.setup\.ts/,
    },
    {
      name: "pos-g0-authenticated-edge",
      testMatch: /pos-g0-authenticated-smoke\.spec\.ts/,
      dependencies: ["pos-g0-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState,
        channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
      },
    },
  ],
})
