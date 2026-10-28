import { defineConfig, devices } from "@playwright/test";

const webServerPort = Number(process.env.PLAYWRIGHT_PORT ?? "3000");
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${webServerPort}`;
const customerAuthStatePath =
  process.env.PLAYWRIGHT_CUSTOMER_STORAGE_STATE ??
  "playwright/.auth/customer.json";
const customerDeniedAuthStatePath =
  process.env.PLAYWRIGHT_CUSTOMER_DENIED_STORAGE_STATE ??
  "playwright/.auth/customer-denied.json";
const customerLockedAuthStatePath =
  process.env.PLAYWRIGHT_CUSTOMER_LOCKED_STORAGE_STATE ??
  "playwright/.auth/customer-locked.json";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/customer" }],
  ],
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: `node node_modules/next/dist/bin/next dev -p ${webServerPort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: {
          ...process.env,
          NEXT_DIST_DIR: ".next-customer-e2e",
          NEXTAUTH_URL: baseURL,
          NEXT_PUBLIC_BASE_URL: baseURL,
          AQSTOQFLOW_HISTORY_CURSOR_SECRET:
            process.env.AQSTOQFLOW_HISTORY_CURSOR_SECRET ??
            "customer-local-e2e-cursor-secret-2026-08-11",
        },
      },
  projects: [
    {
      name: "customer-auth-setup",
      testMatch: /customer-auth\.setup\.ts/,
      teardown: "customer-cleanup",
    },
    {
      name: "customer-cleanup",
      testMatch: /customer-cleanup-evidence\.setup\.ts/,
    },
    {
      name: "customer-authenticated-desktop",
      testMatch: /customer-authenticated-release\.spec\.ts/,
      dependencies: ["customer-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: customerAuthStatePath,
      },
    },
    {
      name: "customer-authenticated-tablet",
      testMatch: /customer-authenticated-release\.spec\.ts/,
      dependencies: ["customer-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 834, height: 1112 },
        storageState: customerAuthStatePath,
      },
    },
    {
      name: "customer-authenticated-mobile",
      testMatch: /customer-authenticated-release\.spec\.ts/,
      dependencies: ["customer-auth-setup"],
      use: {
        ...devices["Pixel 7"],
        storageState: customerAuthStatePath,
      },
    },
    {
      name: "customer-rbac-negative",
      testMatch: /customer-rbac-negative\.spec\.ts/,
      dependencies: ["customer-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: customerDeniedAuthStatePath,
      },
    },
    {
      name: "customer-locked-state",
      testMatch: /customer-locked-state\.spec\.ts/,
      dependencies: ["customer-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: customerLockedAuthStatePath,
      },
    },
  ],
});
