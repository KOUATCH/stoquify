// Final local evidence inventory. Does not run the app or alter application data.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../../..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const relative = file => path.relative(root, file).replaceAll("\\", "/");
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const prefix = "what-next/modern-modules-integration/2026-09-05-run-02/";
const previous = read("what-next/modern-modules-integration/2026-09-05-run-01/evidence/source-binding.json");
const build = read(prefix + "evidence/isolated-build-validated-receipt.json");
const sourcePaths = new Set([...previous.sources.map(item => item.path), ...Object.keys(build.sourcesAfter)]);
for (const name of ["ACCOUNTING_ADMISSION_VERIFICATION.json", "ACCOUNTING_CREATE_FAILURE_VERIFICATION.json", "ACCOUNTING_CREATE_FOLLOWUP_VERIFICATION.json"]) {
  const receipt = read(prefix + "evidence/" + name);
  for (const item of receipt.sourceHashes || []) if (item.path) sourcePaths.add(item.path);
}
const sources = [...sourcePaths].sort().map(file => ({ path: file, sha256: hash(path.join(root, file)) }));
const buildDrift = sources.filter(item => build.sourcesAfter[item.path] && build.sourcesAfter[item.path] !== item.sha256).map(item => item.path);
const output = path.join(__dirname, "evidence/source-binding-final.json");
if (fs.existsSync(output)) throw new Error("Preserve the existing final binding; choose a new revision.");
function walk(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(item => {
    const file = path.join(folder, item.name);
    return item.isDirectory() ? walk(file) : item.isFile() && file !== output ? [file] : [];
  });
}
const files = walk(__dirname);
const { readPrivateFixture, targetUrl } = require(path.join(root, "scripts/modern-modules-local-verification"));
const fixture = readPrivateFixture();
const target = targetUrl();
const secrets = [fixture.password, fixture.authSecret, target.toString()].filter(value => typeof value === "string" && value.length >= 8);
const privateMatches = [];
for (const file of files) {
  if (!/\.(?:md|json|txt|log|[cm]?js|ts|html|patch)$/i.test(file)) continue;
  const content = fs.readFileSync(file, "utf8");
  if (secrets.some(secret => content.includes(secret))) privateMatches.push(relative(file));
}
if (privateMatches.length) throw new Error("Private fixture values found in retained artifacts: " + privateMatches.join(", "));
const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim();
const result = {
  recordedAt: new Date().toISOString(), branch: git(["branch", "--show-current"]), commit: git(["rev-parse", "HEAD"]),
  dirtyTree: Boolean(git(["status", "--porcelain", "--untracked-files=normal"])),
  scope: "Current native composition sources, focused follow-ups and retained run02 artifacts. Historical tests remain bound to their own recorded revisions. No global release or professional certification.",
  sources, buildDrift,
  artifacts: files.map(file => ({ path: relative(file), bytes: fs.statSync(file).size, sha256: hash(file) })),
  privateFixtureScan: { checkedTextFiles: files.filter(file => /\.(?:md|json|txt|log|[cm]?js|ts|html|patch)$/i.test(file)).length, matches: 0, scope: "Exact synthetic password, auth secret and synthetic database URL; no claim of exhaustive secret or image OCR audit" },
};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ sources: sources.length, artifacts: result.artifacts.length, buildDrift, privateFixtureMatches: 0, output: relative(output) }));
