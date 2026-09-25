// Create a separately retained second build attempt; reuse only its isolated cache.
const fs = require("node:fs");
const path = require("node:path");
const original = fs.readFileSync(path.join(__dirname, "verify-isolated-build.cjs"), "utf8");
let next = original.replaceAll("modern-modules-build-run02.log", "modern-modules-build-run02-final.log")
  .replaceAll('"isolated-build-start.json"', '"isolated-build-final-start.json"')
  .replaceAll('"isolated-build.log"', '"isolated-build-final.log"')
  .replaceAll('"isolated-build-receipt.json"', '"isolated-build-final-receipt.json"')
  .replaceAll('"evidence/isolated-build-receipt.json"', '"evidence/isolated-build-final-receipt.json"')
  .replace('if (fs.existsSync(path.join(ROOT, DIST)) || fs.existsSync(RAW))', 'if (fs.existsSync(RAW))')
  .replace('const extra = [', 'const extra = ["components/finance/FinanceCommandCenterDashboard.tsx", ')
  .replace('pageWorkers: 1, generatedConfigRestoration', 'pageWorkers: 1, reusedIsolatedCache: true, generatedConfigRestoration');
if (next === original || !next.includes('reusedIsolatedCache: true')) throw new Error("Final build derivation failed");
fs.writeFileSync(path.join(__dirname, "verify-isolated-build-final.cjs"), next, { flag: "wx" });
console.log("Prepared separate final build helper; no build started.");
