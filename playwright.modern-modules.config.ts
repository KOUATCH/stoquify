import { defineConfig, devices } from "@playwright/test"
import path from "node:path"

// Start the isolated app with the inspected helper; this configuration never
// starts a server, migrates a database, or seeds an existing tenant.
const evidence = path.join("what-next", "modern-modules-integration", "2026-09-05-run-01", "evidence")

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /modern-modules\.spec\.ts$/,
  outputDir: path.join(evidence, "browser-results"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  forbidOnly: true,
  timeout: 240_000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["json", { outputFile: path.join(evidence, "browser-results.json") }]],
  use: {
    baseURL: "http://127.0.0.1:3107",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    // Login and step-up use genuine passwords; never retain network traces.
    trace: "off",
    video: "off",
    screenshot: "off",
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    { name: "desktop-en", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 }, locale: "en-GB" } },
    { name: "mobile-fr", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, locale: "fr-FR" } },
  ],
})
