#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { scanMigrationRisks } = require("./prisma-production-migration-gate");
const {
  HASH_CONTRACT,
  migrationHashRecord,
} = require("./prisma-migration-catalog-gate");

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

const EVIDENCE_OUTPUT_PREFIXES = [
  "docs/reconcile-destructive-migration/",
  "docs/blockers/stoquify-migration-risk-maker-checker-packet-2026-08-13.json",
  "docs/blockers/stoquify-migration-risk-maker-checker-packet-2026-08-13.sha256",
  "docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/destructive-migration-technical-hash-manifest.json",
  "docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/destructive-migration-technical-hash-manifest.sha256",
  "what-next/prisma-migration-deployment-readiness.md",
  "what-next/prisma-migration-deployment-readiness.json",
];

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

function gitValue(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0 ? String(result.stdout || "").trim() : null;
}

function statusPath(line) {
  const raw = String(line || "").slice(3).trim();
  const renamed = raw.includes(" -> ") ? raw.split(" -> ").at(-1) : raw;
  return normalizePath(renamed.replace(/^"|"$/g, ""));
}

function isEvidenceOutput(relativePath) {
  return EVIDENCE_OUTPUT_PREFIXES.some((prefix) =>
    prefix.endsWith("/")
      ? relativePath.startsWith(prefix)
      : relativePath === prefix,
  );
}

function currentSourceState(root) {
  const head = gitValue(root, ["rev-parse", "HEAD"]);
  const tree = gitValue(root, ["rev-parse", "HEAD^{tree}"]);
  const status = gitValue(root, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  if (head == null || tree == null || status == null) {
    return {
      available: false,
      head,
      tree,
      sourceDirtyPaths: [],
      sourceDirtyPathCount: null,
    };
  }
  const sourceDirtyPaths = status
    .split(/\r?\n/)
    .filter(Boolean)
    .map(statusPath)
    .filter((entry) => entry && !isEvidenceOutput(entry));
  return {
    available: true,
    head,
    tree,
    sourceDirtyPaths,
    sourceDirtyPathCount: sourceDirtyPaths.length,
  };
}

function evaluateCandidateFreeze(packet, sourceState) {
  const repository = packet?.repository || {};
  const errors = [];
  if (repository.candidateMode !== "PRODUCTION_FROZEN") {
    errors.push("candidate_mode_not_production_frozen");
  }
  if (repository.sourceDirtyAtRefresh !== false) {
    errors.push("candidate_was_dirty_when_bindings_were_refreshed");
  }
  if (!sourceState?.available) {
    errors.push("candidate_git_state_unavailable");
  } else {
    if (sourceState.sourceDirtyPathCount !== 0) {
      errors.push("candidate_source_worktree_dirty");
    }
    if (!repository.head || repository.head !== sourceState.head) {
      errors.push("candidate_head_changed_after_refresh");
    }
    if (!repository.tree || repository.tree !== sourceState.tree) {
      errors.push("candidate_tree_changed_after_refresh");
    }
  }
  return {
    ready: errors.length === 0,
    errors,
    mode: repository.candidateMode || "LEGACY_UNCLASSIFIED",
    refreshedHead: repository.head || null,
    refreshedTree: repository.tree || null,
    sourceDirtyAtRefresh: repository.sourceDirtyAtRefresh ?? null,
    liveSourceDirtyPathCount: sourceState?.sourceDirtyPathCount ?? null,
  };
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
  const migrationHashes = migrationHashRecord(migrationTarget);
  if (migrationHashes.rawSha256 !== packet.migration.sha256) {
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
  const releaseSnapshotErrors = boundFileMismatches.length
    ? ["bound_file_hash_mismatch"]
    : [];

  return {
    ready: errors.length === 0,
    errors,
    hashContract: HASH_CONTRACT,
    migrationSha256: migrationHashes.rawSha256,
    migrationCanonicalLfSha256: migrationHashes.canonicalLfSha256,
    migrationByteLength: fs.statSync(migrationTarget).size,
    operationCount: packet.destructiveInventory.length,
    operationHashMismatches,
    inventorySha256,
    boundFileCount: boundFiles.length,
    boundFileMismatches,
    releaseSnapshotReady: releaseSnapshotErrors.length === 0,
    releaseSnapshotErrors,
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

function exactApprovalState(root, packet) {
  const risk = scanMigrationRisks(root);
  const findings = risk.findings.filter(
    (finding) =>
      normalizePath(finding.migration) === normalizePath(packet.migration.path),
  );
  const approvedFindingCount = findings.filter(
    (finding) => finding.approved,
  ).length;
  return {
    ready:
      findings.length === packet.migration.destructiveOperationCount &&
      approvedFindingCount === findings.length,
    findingCount: findings.length,
    approvedFindingCount,
    staleApprovalCount: risk.staleApprovals.length,
    revokedApprovalCount: risk.revokedApprovals.length,
  };
}

function buildEvidenceReport(root = process.cwd()) {
  const packet = readJson(absolute(root, PACKET_PATH));
  const manifest = readJson(absolute(root, MANIFEST_PATH));
  const packetBindings = checkPacketBindings(root, packet);
  const candidateFreeze = evaluateCandidateFreeze(
    packet,
    currentSourceState(root),
  );
  const manifestErrors = [];
  const releaseSnapshotErrors = [
    ...packetBindings.releaseSnapshotErrors,
  ];

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
    releaseSnapshotErrors.push("manifest_prisma_schema_hash_mismatch");
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
    releaseSnapshotErrors.push("supporting_evidence_hash_mismatch");
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
  const approvalState = exactApprovalState(root, packet);
  const historicalApprovalReady =
    packetBindings.ready &&
    manifestErrors.length === 0 &&
    preCheckerReady &&
    checkerDecision === "APPROVE_EXACT_HASH" &&
    approvalState.ready;
  const releaseSnapshotReady =
    candidateFreeze.ready && releaseSnapshotErrors.length === 0;
  const approved = historicalApprovalReady && releaseSnapshotReady;

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
    candidateFreeze,
    releaseSnapshot: {
      ready: releaseSnapshotReady,
      errors: [...new Set(releaseSnapshotErrors)],
      mutableFilesInvalidateHistoricalApproval: false,
    },
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
    approvalState,
    historicalApprovalReady,
    exactHashApprovalRecorded: approvalState.ready,
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
    `- Release snapshot bindings: ${report.releaseSnapshot.ready ? "passed" : "blocked"}`,
    `- Candidate freeze: ${report.candidateFreeze.ready ? "passed" : "blocked"}`,
    `- Candidate mode: \`${report.candidateFreeze.mode}\``,
    `- Live source dirty paths: ${report.candidateFreeze.liveSourceDirtyPathCount ?? "unknown"}`,
    `- Migration SHA-256: \`${report.packetBindings.migrationSha256}\``,
    `- Canonical LF approval SHA-256: \`${report.packetBindings.migrationCanonicalLfSha256}\``,
    `- Hash contract: \`${report.packetBindings.hashContract.version}\``,
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
    `- Current finding approvals: ${report.approvalState.approvedFindingCount}/${report.approvalState.findingCount}`,
    `- Stale approvals: ${report.approvalState.staleApprovalCount}`,
    `- Revoked approvals: ${report.approvalState.revokedApprovalCount}`,
    `- Exact-hash approval recorded: ${report.exactHashApprovalRecorded ? "yes" : "no"}`,
    `- Historical approval evidence complete: ${report.historicalApprovalReady ? "yes" : "no"}`,
    `- Mutable release snapshot invalidates historical approval: no`,
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
  currentSourceState,
  evaluateCandidateFreeze,
  parseArgs,
  renderMarkdown,
};
