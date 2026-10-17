const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const { execFileSync } = require("child_process")

const directory = __dirname
const result = JSON.parse(fs.readFileSync(path.join(directory, "final-focused-jest.json"), "utf8"))
if (!result.success || result.numFailedTests !== 0 || result.numPassedTests !== 69) {
  throw new Error("Expected the completed final 69-test run; not publishing stale or failed evidence.")
}
const sources = [
  "lib/pos/offline-local-queue.ts",
  "lib/pos/__tests__/offline-local-queue.test.ts",
  "hooks/posHooks/useOfflineSync.ts",
  "hooks/posHooks/__tests__/offline-flush-recovery.test.ts",
  "hooks/posHooks/__tests__/offline-dashboard-scope.test.ts",
  "services/pos/offline-sync.service.ts",
  "services/pos/__tests__/offline-sync.service.test.ts",
].map(file => ({
  path: file,
  sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  lastModifiedAt: fs.statSync(file).mtime.toISOString(),
  unchangedSinceRunStart: fs.statSync(file).mtimeMs <= result.startTime,
}))
const gate = JSON.parse(fs.readFileSync(path.join(directory, "replay-gate.json"), "utf8"))
const manifest = {
  recordedAt: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  nodeVersion: process.version,
  playwrightVersion: require("playwright/package.json").version,
  command: "node node_modules/jest/bin/jest.js --runInBand --runTestsByPath lib/pos/__tests__/offline-local-queue.test.ts hooks/posHooks/__tests__/offline-flush-recovery.test.ts hooks/posHooks/__tests__/offline-dashboard-scope.test.ts services/pos/__tests__/offline-sync.service.test.ts --json --outputFile=what-next/platform-remediation/2026-09-30-run-01/offline/final-focused-jest.json",
  result: { startedAt: new Date(result.startTime).toISOString(), success: result.success, suitesPassed: result.numPassedTestSuites, testsPassed: result.numPassedTests, testsFailed: result.numFailedTests },
  focusedTypecheck: { exitCode: 0, command: "node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target es2022 --moduleResolution bundler --module esnext --lib es2022,dom --types node,jest lib/pos/offline-local-queue.ts lib/pos/__tests__/offline-local-queue.test.ts", log: "focused-typecheck.log", scope: "Queue module and browser test only; not repository-wide typecheck." },
  staticReplayGate: gate.summary,
  sourceHashes: sources,
  limits: ["Actual desktop Chromium storage and restart; injected quota/abort, not physical device failure.", "Server service tests use fixtures. No combined browser/database economic-effect or live-provider proof.", "R04/R05 remain partial pending device admission, recovery workflow and pilot qualification."],
}
fs.writeFileSync(path.join(directory, "verification-manifest.json"), JSON.stringify(manifest, null, 2) + "\n")
console.log(JSON.stringify({ result: manifest.result, sourcesStableDuringRun: sources.every(source => source.unchangedSinceRunStart), staticGate: gate.summary }))
