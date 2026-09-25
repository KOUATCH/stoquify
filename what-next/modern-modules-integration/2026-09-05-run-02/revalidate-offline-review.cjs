// Read-only source comparison; never loads, applies or executes the candidate.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../../..");
const prior = path.join(root, "what-next/modern-modules-integration/2026-09-05-run-01/evidence/lifecycle-continuation/offline-review-candidate");
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const base = JSON.parse(fs.readFileSync(path.join(prior, "BASE_SOURCE_HASHES.json"), "utf8"));
const comparisons = Object.entries(base.sha256).map(([file, expected]) => ({ file, expected, actual: hash(path.join(root, file)) })).map(item => ({ ...item, unchanged: item.actual === item.expected }));
const proposedNewPaths = ["services/pos/offline-continuation.service.ts", "prisma/migrations/20260905210000_protect_offline_acceptance/migration.sql", "services/pos/__tests__/offline-continuation.service.test.ts"];
const result = {
  checkedAt: new Date().toISOString(),
  status: "TEXT REVIEW ONLY / NOT APPLIED / NOT EXECUTED / NOT APPROVED",
  candidateSha256: hash(path.join(prior, "offline-continuation-candidate.patch")),
  comparisons,
  proposedNewPaths: proposedNewPaths.map(file => ({ file, exists: fs.existsSync(path.join(root, file)) })),
  operationalDependencySource: { file: "services/modules/module-operational-dependencies.ts", sha256: hash(path.join(root, "services/modules/module-operational-dependencies.ts")) },
  runtimeCompatibilityVerified: false,
};
fs.writeFileSync(path.join(__dirname, "evidence/OFFLINE_CANDIDATE_BASE_REVALIDATION.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: result.status, unchanged: comparisons.filter(item => item.unchanged).length, changed: comparisons.filter(item => !item.unchanged).map(item => item.file), newCandidateFilesPresent: result.proposedNewPaths.filter(item => item.exists), candidateSha256: result.candidateSha256 }));
