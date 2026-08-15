import { defineConfig, devices } from "@playwright/test";

process.env.AQSTOQFLOW_SUPPLIER_CERT_STARTED_AT ??= new Date().toISOString();

const webServerPort = Number(process.env.PLAYWRIGHT_PORT ?? "3000");
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${webServerPort}`;
const supplierAuthStatePath =
  process.env.PLAYWRIGHT_SUPPLIER_STORAGE_STATE ??
  "playwright/.auth/supplier.json";
const supplierDeniedAuthStatePath =
  process.env.PLAYWRIGHT_SUPPLIER_DENIED_STORAGE_STATE ??
  "playwright/.auth/supplier-denied.json";
const supplierLockedAuthStatePath =
  process.env.PLAYWRIGHT_SUPPLIER_LOCKED_STORAGE_STATE ??
  "playwright/.auth/supplier-locked.json";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: "playwright-report/supplier-certification",
      },
    ],
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
        url: `${baseURL}/api/auth/get-session`,
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
        env: {
          ...process.env,
          NEXT_DIST_DIR: ".next-supplier-e2e",
          NEXTAUTH_URL: baseURL,
          NEXT_PUBLIC_BASE_URL: baseURL,
          AQSTOQFLOW_HISTORY_CURSOR_SECRET:
            process.env.AQSTOQFLOW_HISTORY_CURSOR_SECRET ??
            "supplier-local-e2e-cursor-secret-2026-08-11",
        },
      },
  projects: [
    {
      name: "supplier-auth-setup",
      testMatch: /supplier-auth\.setup\.ts/,
      teardown: "supplier-certification-cleanup",
    },
    {
      name: "supplier-certification-cleanup",
      testMatch: /supplier-certification-cleanup\.setup\.ts/,
    },
    {
      name: "supplier-locked-auth-setup",
      testMatch: /supplier-locked-auth\.setup\.ts/,
      dependencies: ["supplier-auth-setup"],
    },
    {
      name: "supplier-authenticated-desktop",
      testMatch: /supplier-authenticated-release\.spec\.ts/,
      dependencies: ["supplier-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: supplierAuthStatePath,
        acceptDownloads: true,
      },
    },
    {
      name: "supplier-authenticated-tablet",
      testMatch: /supplier-authenticated-release\.spec\.ts/,
      dependencies: ["supplier-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 834, height: 1112 },
        storageState: supplierAuthStatePath,
        acceptDownloads: true,
      },
    },
    {
      name: "supplier-authenticated-mobile",
      testMatch: /supplier-authenticated-release\.spec\.ts/,
      dependencies: ["supplier-auth-setup"],
      use: {
        ...devices["Pixel 7"],
        storageState: supplierAuthStatePath,
        acceptDownloads: true,
      },
    },
    {
      name: "supplier-state-matrix",
      testMatch: /supplier-state-matrix\.spec\.ts/,
      dependencies: ["supplier-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: supplierAuthStatePath,
      },
    },
    {
      name: "supplier-rbac-negative",
      testMatch: /supplier-rbac-negative\.spec\.ts/,
      dependencies: ["supplier-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: supplierDeniedAuthStatePath,
      },
    },
    {
      name: "supplier-history-rbac-negative",
      testMatch: /supplier-history-rbac-negative\.spec\.ts/,
      dependencies: ["supplier-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: supplierDeniedAuthStatePath,
      },
    },
    {
      name: "supplier-locked-state",
      testMatch: /supplier-locked-state\.spec\.ts/,
      dependencies: ["supplier-locked-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: supplierLockedAuthStatePath,
      },
    },
  ],
});
