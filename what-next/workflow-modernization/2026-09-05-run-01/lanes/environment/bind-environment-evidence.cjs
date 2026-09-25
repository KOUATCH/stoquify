"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "../../../../..");
const sha = data => createHash("sha256").update(data).digest("hex");
const identity = JSON.parse(fs.readFileSync(path.join(__dirname, "postgres-run-f799fb30e867.json"), "utf8"));
const identityPaths = Object.keys(identity.sourceBefore).filter(file => file.startsWith("services/users/") || file.startsWith("lib/") || file.startsWith("services/auth/") || file.startsWith("services/security/"));
const identityBindings = identityPaths.map(file => {
  const bytes = fs.readFileSync(path.join(root, file));
  return {
    path: file,
    sha256: sha(bytes),
    matchesOriginalBeforeAndAfterFingerprint: sha(JSON.stringify(bytes)) === identity.sourceBefore[file] && identity.sourceBefore[file] === identity.sourceAfter[file],
  };
});
const screenshots = ["en-dashboard-desktop.png", "en-modules-desktop.png", "fr-dashboard-desktop-fr-retry.png", "fr-dashboard-mobile-fr-retry.png", "fr-modules-desktop-fr-retry.png", "fr-modules-mobile-fr-retry.png"];
const records = ["ENVIRONMENT_REPORT.md", "POSTGRES_FIXTURE_PROPOSAL.md", "process-and-readiness.json", "preflight-model-name-failed.json", "environment-baseline.json", "environment-baseline-fr-retry.json", "postgres-preflight-c1e6d395cc37.json", "postgres-run-f799fb30e867.json", ...screenshots];
const result = {
  recordedAt: new Date().toISOString(),
  evidence: records.map(file => ({ path: file, sha256: sha(fs.readFileSync(path.join(__dirname, file))) })),
  screenshotsVisuallyInspected: screenshots,
  identityBindings,
  identityScope: "Three grouped real-PostgreSQL reset checks passed; separate statement setup failed and remains a preserved failure.",
  originalFingerprintEncoding: "Initial PG driver fingerprinted JSON.stringify(Buffer) rather than raw bytes. Original receipt is untouched; mappings above verify those exact fingerprints and supply standard raw-byte SHA-256 values.",
  preflightEvidenceWriteFailure: {
    command: "verify-workflow-postgres.cjs preflight",
    result: "EPERM writing postgres-preflight-174e2a2c83e1.json before a receipt was saved; no data writes in preflight mode. Retried same read-only preflight with approved evidence-directory access; READY_READ_ONLY.",
  },
  serverSessionId: 87013,
  browserContextsClosed: true,
};
const output = path.join(__dirname, "environment-binding.json");
fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ evidenceFiles: records.length, identitySourcesStillBound: identityBindings.every(item => item.matchesOriginalBeforeAndAfterFingerprint), output: path.relative(root, output) }));
