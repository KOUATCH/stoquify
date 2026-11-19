// Pure re-render of retained synthetic JSON; no application config or database.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict")
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
require("tsconfig-paths/register")
const { renderReviewWorkpaperExport } = require("../services/accounting/review-workpaper-export")
const { balanceSheetHash } = require("../services/accounting/balance-sheet-contract")
const out = path.resolve("docs/accounting-firms/roadmap-2026-10-19/execution/AF08/2026-10-20-run-01")
const canonical = JSON.parse(fs.readFileSync(path.join(out, "sample-workpapers.json"), "utf8"))
assert.match(canonical.organizationId, /^af08-.*-journey-client$/)
const evidence = JSON.parse(fs.readFileSync(path.join(out, "reconciliation-checks.json"), "utf8"))
assert.equal(balanceSheetHash(canonical), evidence.canonicalHash)
for (const format of ["json", "csv", "pdf"]) {
  const { contentBase64, ...artifact } = renderReviewWorkpaperExport(canonical, format, evidence.canonicalHash)
  fs.writeFileSync(path.join(out, `sample-workpapers.${format}`), Buffer.from(contentBase64, "base64"))
  const previous = evidence.formats.find(row => row.fileName.endsWith("." + format))
  Object.assign(previous, artifact)
}
fs.writeFileSync(path.join(out, "reconciliation-checks.json"), JSON.stringify(evidence, null, 2))
console.log("Re-rendered all three formats from the retained synthetic canonical JSON.")
