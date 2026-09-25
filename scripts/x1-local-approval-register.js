#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createRegister } = require("../services/governance/approval-providers/local-manual-register");
const root = path.resolve(__dirname, "..");
function main(args = process.argv.slice(2)) {
  if (process.env.NODE_ENV === "production") throw new Error("This register is limited to the named non-production fixture scope.");
  const registry = createRegister(root);
  const [command = "report", kind, value] = args;
  switch (command) {
    case "init": {
      const source = JSON.parse(fs.readFileSync(path.join(root, "what-next/evidence/finance-x1/x1-approval-automation-readiness-2026-09-05.json"), "utf8"));
      if (source.database.status !== "RETRIEVED_READ_ONLY" || source.database.target.databaseName !== "stoquify_replay_next_20260830") throw new Error("A read-only context for the exact fixture database is required.");
      return registry.initialize({ ...source.database, retrievedAt: source.generatedAt });
    }
    case "enroll": return registry.enroll(JSON.parse(fs.readFileSync(path.join(root, "docs/X1/approval-register/controllers/enrollment-request.json"), "utf8")));
    case "prepare": return registry.prepare(kind);
    case "seal": return registry.seal(kind, fs.readFileSync(registry.recordPath(kind, "pending-signature.txt"), "utf8").trim());
    case "prepare-revocation": return registry.prepareRevocation(kind, value);
    case "revoke": return registry.revoke(kind, fs.readFileSync(registry.recordPath(kind, "pending-signature.txt"), "utf8").trim());
    case "sync": return registry.synchronize();
    case "report": return registry.report();
    default: throw new Error("Use init, enroll, prepare, seal, report, sync, prepare-revocation or revoke.");
  }
}
if (require.main === module) {
  try { const result = main(); process.stdout.write(JSON.stringify(result, null, 2) + "\n"); if (result.findings?.length) process.exitCode = 2; }
  catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
}
module.exports = { main };
