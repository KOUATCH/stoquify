import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"
const authStatePath =
  process.env.PLAYWRIGHT_STORAGE_STATE ?? "playwright/.auth/payroll.json"
const rbacDeniedAuthStatePath =
  process.env.PLAYWRIGHT_RBAC_DENIED_STORAGE_STATE ??
  "playwright/.auth/payroll-requester.json"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "payroll-authenticated-smoke",
      testMatch: /payroll-authenticated-smoke\.spec\.ts/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authStatePath,
      },
    },
    {
      name: "hris-authenticated-release",
      testMatch: /hris-authenticated-release\.spec\.ts/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authStatePath,
      },
    },
    {
      name: "hris-rbac-negative",
      testMatch: /hris-rbac-negative\.spec\.ts/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: rbacDeniedAuthStatePath,
      },
    },
  ],
})
