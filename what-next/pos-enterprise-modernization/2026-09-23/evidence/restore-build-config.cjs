const fs = require("node:fs")
const path = require("node:path")
const hash = require("node:crypto")
const evidence = "what-next/pos-enterprise-modernization/2026-09-23/evidence"
const buildInclude = ".next-pos-enterprise-build-20260924/types/**/*.ts"
const buildReference = "./.next-pos-enterprise-build-20260924/types/routes.d.ts"
const digest = (value) => hash.createHash("sha256").update(value).digest("hex")

const beforeConfig = fs.readFileSync(path.join(evidence, "tsconfig.before-isolated-build.json"))
const currentConfig = fs.readFileSync("tsconfig.json")
const before = JSON.parse(beforeConfig.toString("utf8").replace(/^\uFEFF/, ""))
const current = JSON.parse(currentConfig.toString("utf8").replace(/^\uFEFF/, ""))
const filtered = { ...current, include: current.include.filter((entry) => entry !== buildInclude) }
const normalizedBefore = { ...before, include: [...before.include].sort() }
const normalizedFiltered = { ...filtered, include: [...filtered.include].sort() }
if (JSON.stringify(normalizedFiltered) !== JSON.stringify(normalizedBefore)) {
  throw new Error("Config has changes beyond this build include; preserve them for coordinator review.")
}

const beforeEnv = fs.readFileSync(path.join(evidence, "next-env.before-isolated-build.d.ts.txt"))
const currentEnv = fs.readFileSync("next-env.d.ts")
const originalReference = beforeEnv.toString("utf8").match(/<reference path="([^"]+)"/)
if (!originalReference) throw new Error("Original Next route reference was not found")
const normalizedEnv = currentEnv.toString("utf8").replace(buildReference, originalReference[1])
if (normalizedEnv !== beforeEnv.toString("utf8")) {
  throw new Error("Next env has changes beyond this build reference; preserve them for coordinator review.")
}

// Restore exact snapshots only after proving the differences are build-owned.
fs.writeFileSync("tsconfig.json", beforeConfig)
fs.writeFileSync("next-env.d.ts", beforeEnv)
const report = {
  completedAt: new Date().toISOString(),
  removedBuildInclude: current.include.includes(buildInclude),
  restoredBuildRouteReference: currentEnv.toString("utf8").includes(buildReference),
  preservedDevInclude: before.include.includes(".next-pos-audit-dev/types/**/*.ts"),
  tsconfig: { beforeBuildHash: digest(beforeConfig), beforeCleanupHash: digest(currentConfig), restoredHash: digest(fs.readFileSync("tsconfig.json")) },
  nextEnv: { beforeBuildHash: digest(beforeEnv), beforeCleanupHash: digest(currentEnv), restoredHash: digest(fs.readFileSync("next-env.d.ts")) },
  directoryDeletionPerformedByThisCleanup: false,
}
fs.writeFileSync(path.join(evidence, "build-config-cleanup.json"), JSON.stringify(report, null, 2) + "\n")
console.log(JSON.stringify(report, null, 2))
