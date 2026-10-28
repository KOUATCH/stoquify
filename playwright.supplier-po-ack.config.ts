import { defineConfig, devices } from "@playwright/test"

process.env.AQSTOQFLOW_SUPPLIER_PO_TOKEN_SECRET ??=
  "supplier-po-acknowledgement-local-browser-secret-2026"

const port = Number(process.env.PLAYWRIGHT_SUPPLIER_PO_ACK_PORT ?? "3215")
const baseURL = process.env.PLAYWRIGHT_SUPPLIER_PO_ACK_BASE_URL ?? `http://127.0.0.1:${port}`
const storageState = "playwright/.auth/supplier-po-ack.json"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 600_000,
  expect: { timeout: 120_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/supplier-po-acknowledgement" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next dev -p ${port}`,
    url: `${baseURL}/api/auth/get-session`,
    reuseExistingServer: false,
    timeout: 600_000,
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-supplier-po-ack-e2e",
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_BASE_URL: baseURL,
      AQSTOQFLOW_SUPPLIER_PO_TOKEN_SECRET:
        process.env.AQSTOQFLOW_SUPPLIER_PO_TOKEN_SECRET,
    },
  },
  projects: [
    {
      name: "supplier-po-ack-auth-setup",
      testMatch: /supplier-po-ack-auth\.setup\.ts/,
    },
    {
      name: "supplier-po-ack-full-flow",
      testMatch: /supplier-po-acknowledgement\.spec\.ts/,
      dependencies: ["supplier-po-ack-auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        channel: "msedge",
        storageState,
      },
    },
  ],
})
