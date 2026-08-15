#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PACKET_PATH =
  "docs/blockers/stoquify-migration-risk-maker-checker-packet-2026-08-13.json";
const BUNDLE_ROOT =
  "docs/reconcile-destructive-migration/evidence/MIG-RISK-20260611130000-F7DE8DC7-RECONCILED-2026-08-13";
const MANIFEST_PATH = `${BUNDLE_ROOT}/evidence-manifest.json`;
const DEFAULT_MARKDOWN_OUT =
  "docs/reconcile-destructive-migration/EVIDENCE_BUNDLE_STATUS.md";
const DEFAULT_JSON_OUT =
  "docs/reconcile-destructive-migration/evidence-bundle-status.json";

const REQUIRED_ARTIFACT_IDS = [
  "R-01",
  "R-02",
  "R-03",
  "R-04",
  "R-05",
  "R-06",
  "B-01",
  "B-02",
  "B-03",
  "B-04",
  "B-05",
  "A-01",
  "A-02",
  "A-03",
];

const PRE_CHECKER_IDS = new Set([
  "R-01",
  "R-02",
  "R-03",
  "R-04",
  "R-05",
  "R-06",
  "B-01",
  "B-02",
  "B-03",
  "B-04",
  "B-05",
  "A-01",
]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }
  return options;
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileSha256(target) {
  return sha256(fs.readFileSync(target));
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function absolute(root, relative) {
  return path.resolve(root, normalizePath(relative));
}

function checkPacketBindings(root, packet) {
  const errors = [];
  const migrationTarget = absolute(root, packet.migration.path);
  const migrationSha256 = fileSha256(migrationTarget);
  if (migrationSha256 !== packet.migration.sha256) {
    errors.push("migration_hash_mismatch");
  }
  if (fs.statSync(migrationTarget).size !== packet.migration.utf8ByteLength) {
    errors.push("migration_byte_length_mismatch");
  }

  const operationHashMismatches = packet.destructiveInventory
    .filter((operation) => sha256(operation.canonicalSql) !== operation.sha256)
    .map((operation) => operation.id);
  if (operationHashMismatches.length) {
    errors.push("operation_hash_mismatch");
  }

  const inventorySource =
    packet.destructiveInventory.map((operation) => operation.sha256).join("\n") +
    "\n";
  const inventorySha256 = sha256(inventorySource);
  if (inventorySha256 !== packet.operationHashing.inventorySha256) {
    errors.push("inventory_hash_mismatch");
  }

  const boundFiles = [
    ...packet.evidenceSourceFiles,
    ...packet.consumerGroups.flatMap((group) => group.files),
  ];
  const boundFileMismatches = boundFiles
    .filter((entry) => {
      const target = absolute(root, entry.path);
      return !fs.existsSync(target) || fileSha256(target) !== entry.sha256;
    })
    .map((entry) => entry.path);
  if (boundFileMismatches.length) errors.push("bound_file_hash_mismatch");

  return {
    ready: errors.length === 0,
    errors,
    migrationSha256,
    migrationByteLength: fs.statSync(migrationTarget).size,
    operationCount: packet.destructiveInventory.length,
    operationHashMismatches,
    inventorySha256,
    boundFileCount: boundFiles.length,
    boundFileMismatches,
  };
}

function declaredArtifactStatus(target) {
  const source = fs.readFileSync(target, "utf8");
  if (path.extname(target).toLowerCase() === ".json") {
    try {
      return JSON.parse(source).artifactStatus || null;
    } catch {
      return "UNPARSEABLE";
    }
  }
  const match = source.match(/^(?:Status:\s*|Status:\s*`)([^`\r\n]+)`?/im);
  return match ? match[1].trim() : null;
}

function classifyArtifact(bundleRoot, entry) {
  const target = path.resolve(bundleRoot, entry.path);
  if (!target.startsWith(path.resolve(bundleRoot) + path.sep)) {
    return { ...entry, validation: "PRESENT_INVALID", reason: "path_escape" };
  }
  if (!fs.existsSync(target)) {
    return { ...entry, validation: "MISSING", reason: "file_missing" };
  }

  const actualSha256 = fileSha256(target);
  const declaredStatus = declaredArtifactStatus(target);
  if (entry.status !== "PRESENT_VALID") {
    return {
      ...entry,
      validation: entry.status,
      declaredStatus,
      actualSha256,
      reason: "manifest_does_not_claim_completed_evidence",
    };
  }
  if (!entry.sha256 || entry.sha256 !== actualSha256) {
    return {
      ...entry,
      validation: "PRESENT_INVALID",
      declaredStatus,
      actualSha256,
      reason: "completed_evidence_hash_missing_or_mismatched",
    };
  }
  if (declaredStatus !== "PRESENT_VALID") {
    return {
      ...entry,
      validation: "PRESENT_INVALID",
      declaredStatus,
      actualSha256,
      reason: "artifact_does_not_declare_present_valid",
    };
  }
  return {
    ...entry,
    validation: "PRESENT_VALID",
    declaredStatus,
    actualSha256,
    reason: null,
  };
}

function exactApproval(root, packet) {
  const registry = readJson(absolute(root, "prisma/migration-risk-approvals.json"));
  return registry.approvals.find(
    (entry) =>
      normalizePath(entry.migration) === normalizePath(packet.migration.path) &&
      entry.sha256 === packet.migration.sha256 &&
      Array.isArray(entry.rules) &&
      entry.rules.includes("drop_column") &&
      entry.rules.includes("drop_table"),
  );
}

function buildEvidenceReport(root = process.cwd()) {
  const packet = readJson(absolute(root, PACKET_PATH));
  const manifest = readJson(absolute(root, MANIFEST_PATH));
  const packetBindings = checkPacketBindings(root, packet);
  const manifestErrors = [];

  if (manifest.packetId !== packet.packetId) manifestErrors.push("packet_id_mismatch");
  if (manifest.migration.sha256 !== packet.migration.sha256) {
    manifestErrors.push("manifest_migration_hash_mismatch");
  }
  if (
    manifest.destructiveInventorySha256 !==
    packet.operationHashing.inventorySha256
  ) {
    manifestErrors.push("manifest_inventory_hash_mismatch");
  }

  const schemaSha256 = fileSha256(absolute(root, manifest.prismaSchema.path));
  if (schemaSha256 !== manifest.prismaSchema.sha256) {
    manifestErrors.push("manifest_prisma_schema_hash_mismatch");
  }

  const artifactIds = manifest.artifacts.map((entry) => entry.id);
  const missingArtifactIds = REQUIRED_ARTIFACT_IDS.filter(
    (id) => !artifactIds.includes(id),
  );
  const duplicateArtifactIds = artifactIds.filter(
    (id, index) => artifactIds.indexOf(id) !== index,
  );
  const unexpectedArtifactIds = artifactIds.filter(
    (id) => !REQUIRED_ARTIFACT_IDS.includes(id),
  );
  if (missingArtifactIds.length) manifestErrors.push("required_artifact_missing");
  if (duplicateArtifactIds.length) manifestErrors.push("artifact_id_duplicate");
  if (unexpectedArtifactIds.length) manifestErrors.push("artifact_id_unexpected");

  const bundleRoot = absolute(root, BUNDLE_ROOT);
  const artifacts = manifest.artifacts.map((entry) =>
    classifyArtifact(bundleRoot, entry),
  );
  const supportingEvidenceMismatches = manifest.partialSupportingEvidence
    .filter((entry) => {
      const target = absolute(root, entry.path);
      return !fs.existsSync(target) || fileSha256(target) !== entry.sha256;
    })
    .map((entry) => entry.path);
  if (supportingEvidenceMismatches.length) {
    manifestErrors.push("supporting_evidence_hash_mismatch");
  }

  const completed = artifacts.filter(
    (entry) => entry.validation === "PRESENT_VALID",
  );
  const preCheckerReady = [...PRE_CHECKER_IDS].every((id) =>
    completed.some((entry) => entry.id === id),
  );
  const checkerArtifact = artifacts.find((entry) => entry.id === "A-02");
  let checkerDecision = null;
  if (checkerArtifact?.validation === "PRESENT_VALID") {
    checkerDecision = readJson(path.resolve(bundleRoot, checkerArtifact.path)).decision;
  }
  const approval = exactApproval(root, packet);
  const approved =
    preCheckerReady &&
    checkerDecision === "APPROVE_EXACT_HASH" &&
    Boolean(approval);

  const status = approved
    ? "APPROVED_EXACT_HASH_BY_RECORDED_HUMAN_CHECKER"
    : preCheckerReady
      ? "READY_FOR_INDEPENDENT_CHECKER"
      : "REJECTED_BLOCKED_EVIDENCE_INCOMPLETE";

  return {
    generatedAt: new Date().toISOString(),
    status,
    packetId: packet.packetId,
    packetBindings,
    manifest: {
      ready: manifestErrors.length === 0,
      errors: [...new Set(manifestErrors)],
      schemaSha256,
      requiredArtifactCount: REQUIRED_ARTIFACT_IDS.length,
      completedArtifactCount: completed.length,
      missingArtifactIds,
      duplicateArtifactIds: [...new Set(duplicateArtifactIds)],
      unexpectedArtifactIds,
      supportingEvidenceMismatches,
    },
    artifacts,
    preCheckerReady,
    checkerDecision,
    exactHashApprovalRecorded: Boolean(approval),
    productionExecutionAuthorized: approved,
    approvalClaimed: approved,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Destructive migration evidence-bundle status",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: **${report.status}**`,
    `Packet: \`${report.packetId}\``,
    "",
    "## Static bindings",
    "",
    `- Packet bindings: ${report.packetBindings.ready ? "passed" : "failed"}`,
    `- Migration SHA-256: \`${report.packetBindings.migrationSha256}\``,
    `- Destructive operations: ${report.packetBindings.operationCount}`,
    `- Bound consumer/evidence files: ${report.packetBindings.boundFileCount}`,
    `- Manifest structure: ${report.manifest.ready ? "passed" : "failed"}`,
    "",
    "## Artifact status",
    "",
    "| ID | Manifest status | Validation | Reason |",
    "| --- | --- | --- | --- |",
    ...report.artifacts.map(
      (entry) =>
        `| ${entry.id} | ${entry.status} | ${entry.validation} | ${entry.reason || "—"} |`,
    ),
    "",
    "## Decision boundary",
    "",
    `- Completed artifacts: ${report.manifest.completedArtifactCount}/${report.manifest.requiredArtifactCount}`,
    `- Ready for independent checker: ${report.preCheckerReady ? "yes" : "no"}`,
    `- Checker decision: ${report.checkerDecision || "none"}`,
    `- Exact-hash approval recorded: ${report.exactHashApprovalRecorded ? "yes" : "no"}`,
    `- Production execution authorized: ${report.productionExecutionAuthorized ? "yes" : "no"}`,
    "",
    "Templates and partial artifacts are deliberately not counted as completed evidence.",
  ];
  return lines.join("\n") + "\n";
}

function writeReport(root, options, report) {
  const markdownTarget = absolute(root, options.out);
  const jsonTarget = absolute(root, options.jsonOut);
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8");
  fs.writeFileSync(jsonTarget, JSON.stringify(report, null, 2) + "\n", "utf8");
}

if (require.main === module) {
  try {
    const options = parseArgs();
    const report = buildEvidenceReport(options.root);
    writeReport(options.root, options, report);
    process.stdout.write(JSON.stringify(report) + "\n");
    if (
      options.mode === "fail" &&
      report.status !== "APPROVED_EXACT_HASH_BY_RECORDED_HUMAN_CHECKER"
    ) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  REQUIRED_ARTIFACT_IDS,
  buildEvidenceReport,
  classifyArtifact,
  parseArgs,
  renderMarkdown,
};
