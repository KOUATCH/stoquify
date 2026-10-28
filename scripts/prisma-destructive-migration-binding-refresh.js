#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  scanMigrationRisks,
} = require("./prisma-production-migration-gate");
const {
  currentSourceState,
} = require("./prisma-destructive-migration-evidence-gate");

const PACKET_PATH =
  "docs/blockers/stoquify-migration-risk-maker-checker-packet-2026-08-13.json";
const PACKET_MARKDOWN_PATH =
  "docs/blockers/STOQUIFY_MIGRATION_RISK_MAKER_CHECKER_PACKET_2026-08-13.md";
const PACKET_SIDECAR_PATH =
  "docs/blockers/stoquify-migration-risk-maker-checker-packet-2026-08-13.sha256";
const BUNDLE_ROOT =
  "docs/reconcile-destructive-migration/evidence/MIG-RISK-20260611130000-F7DE8DC7-RECONCILED-2026-08-13";
const MANIFEST_PATH = `${BUNDLE_ROOT}/evidence-manifest.json`;
const MANIFEST_SIDECAR_PATH = `${MANIFEST_PATH}.sha256`;
const TECHNICAL_MANIFEST_PATH =
  "docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/destructive-migration-technical-hash-manifest.json";
const TECHNICAL_MANIFEST_SIDECAR_PATH =
  "docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17-r2/destructive-migration-technical-hash-manifest.sha256";

const REQUIRED_GATE_BINDINGS = [
  {
    path: "scripts/prisma-destructive-migration-evidence-gate.js",
    purpose: "Evidence completeness, candidate-freeze, and production authorization gate",
  },
  {
    path: "scripts/__tests__/prisma-destructive-migration-evidence-gate.test.js",
    purpose: "Evidence-gate fail-closed regression suite",
  },
  {
    path: "scripts/prisma-destructive-migration-binding-refresh.js",
    purpose: "Development refresh and clean-candidate production freeze utility",
  },
];

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function absolute(root, relative) {
  return path.resolve(root, normalizePath(relative));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileSha256(root, relative) {
  const target = absolute(root, relative);
  if (!fs.existsSync(target)) throw new Error(`bound_file_missing:${relative}`);
  return sha256(fs.readFileSync(target));
}

function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(absolute(root, relative), "utf8"));
}

function writeJson(root, relative, value) {
  const target = absolute(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "development-refresh",
    write: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--write") options.write = true;
    else throw new Error(`unknown_argument:${value}`);
  }
  if (![
    "development-refresh",
    "production-freeze",
  ].includes(options.mode)) {
    throw new Error(`unsupported_mode:${options.mode}`);
  }
  return options;
}

function refreshEntry(root, entry) {
  return { ...entry, sha256: fileSha256(root, entry.path) };
}

function updatePacket(root, source, mode, observedAt, sourceState) {
  const packet = JSON.parse(JSON.stringify(source));
  const risk = scanMigrationRisks(root);
  const targetFindings = risk.findings.filter(
    (finding) => normalizePath(finding.migration) === normalizePath(packet.migration.path),
  );
  const migrationTarget = absolute(root, packet.migration.path);

  const evidenceByPath = new Map(
    packet.evidenceSourceFiles.map((entry) => [normalizePath(entry.path), entry]),
  );
  for (const entry of REQUIRED_GATE_BINDINGS) {
    if (!evidenceByPath.has(entry.path)) evidenceByPath.set(entry.path, entry);
  }
  packet.evidenceSourceFiles = [...evidenceByPath.values()].map((entry) =>
    refreshEntry(root, entry),
  );
  packet.consumerGroups = packet.consumerGroups.map((group) => ({
    ...group,
    files: group.files.map((entry) => refreshEntry(root, entry)),
  }));

  packet.reconciledAt = observedAt;
  packet.status =
    mode === "production-freeze"
      ? "PRODUCTION_CANDIDATE_HASH_FROZEN_PENDING_EVIDENCE_AND_APPROVAL"
      : "DEVELOPMENT_BINDINGS_REFRESHED_NOT_PRODUCTION_APPROVAL";
  packet.productionExecutionAuthorized = false;
  packet.approvalClaimed = false;
  packet.repository = {
    ...packet.repository,
    head: sourceState.head,
    tree: sourceState.tree,
    worktreeState:
      sourceState.sourceDirtyPathCount === 0
        ? "SOURCE_CLEAN_EXCLUDING_EVIDENCE_OUTPUTS"
        : "DIRTY_PREEXISTING_CONCURRENT_EDITS",
    candidateMode:
      mode === "production-freeze"
        ? "PRODUCTION_FROZEN"
        : "DEVELOPMENT_ROLLING",
    sourceDirtyAtRefresh: sourceState.sourceDirtyPathCount !== 0,
    sourceDirtyPathCountAtRefresh: sourceState.sourceDirtyPathCount,
    bindingRefreshAt: observedAt,
    bindingRule:
      "Per-file hashes bind technical inputs. Production additionally requires PRODUCTION_FROZEN mode, a clean source candidate excluding evidence outputs, unchanged Git HEAD/tree, completed recovery evidence, and signed maker-checker approval.",
  };
  packet.migration.sha256 = sha256(fs.readFileSync(migrationTarget));
  packet.migration.utf8ByteLength = fs.statSync(migrationTarget).size;
  packet.migration.destructiveOperationCount = targetFindings.length;
  packet.verification.migrationSafetyScan = {
    runAt: observedAt,
    migrationCount: risk.files.length,
    riskFindingCount: targetFindings.length,
    approvedRiskCount: targetFindings.filter((entry) => entry.approved).length,
    status: targetFindings.every((entry) => entry.approved) ? "ready" : "blocked",
    blockers: targetFindings.every((entry) => entry.approved)
      ? []
      : ["destructive_sql_is_exact_hash_approved"],
    databaseTargeted: false,
    execution: "skipped",
  };
  packet.makerChecker = {
    ...packet.makerChecker,
    maker: {
      ...packet.makerChecker.maker,
      evidenceBundleSha256: null,
    },
    checker: {
      ...packet.makerChecker.checker,
      decisionArtifactSha256: null,
    },
  };
  packet.gateDisposition = {
    ...packet.gateDisposition,
    staticVerification: "REFRESHED_HASH_BINDINGS_EXPECTED_FAIL_CLOSED",
    independentApproval: "BLOCKED_NO_SIGNED_FINAL_DECISION",
  };
  return packet;
}

function updateManifest(root, source, packet, mode) {
  const manifest = JSON.parse(JSON.stringify(source));
  manifest.packetId = packet.packetId;
  manifest.migration.sha256 = packet.migration.sha256;
  manifest.prismaSchema.sha256 = fileSha256(root, manifest.prismaSchema.path);
  manifest.bundleStatus =
    mode === "production-freeze"
      ? "PRODUCTION_CANDIDATE_FROZEN_EVIDENCE_INCOMPLETE_NO_DECISION"
      : "DEVELOPMENT_BINDINGS_CURRENT_EVIDENCE_INCOMPLETE_NO_DECISION";
  manifest.partialSupportingEvidence = manifest.partialSupportingEvidence.map(
    (entry) => refreshEntry(root, entry),
  );
  manifest.approvalClaimed = false;
  manifest.productionExecutionAuthorized = false;
  return manifest;
}

function updateTechnicalManifest(root, packet, manifest, mode, observedAt) {
  const technical = readJson(root, TECHNICAL_MANIFEST_PATH);
  technical.observedAt = observedAt;
  technical.artifactStatus =
    mode === "production-freeze"
      ? "PRODUCTION_CANDIDATE_TECHNICAL_HASHES_FROZEN_NOT_APPROVAL"
      : "CURRENT_DEVELOPMENT_TECHNICAL_BINDINGS_NOT_APPROVAL";
  technical.packetId = packet.packetId;
  technical.migration.rawFileSha256 = packet.migration.sha256;
  technical.migration.utf8ByteLength = packet.migration.utf8ByteLength;
  technical.technicalArtifacts = technical.technicalArtifacts.map((entry) => {
    const updated = refreshEntry(root, entry);
    if (normalizePath(entry.path) === normalizePath(MANIFEST_PATH)) {
      updated.status =
        mode === "production-freeze"
          ? "PRODUCTION_CANDIDATE_FROZEN_PENDING_EVIDENCE"
          : "CURRENT_DEVELOPMENT_BINDING_NOT_PRODUCTION";
    }
    return updated;
  });
  technical.restoreReplay = {
    ...technical.restoreReplay,
    scope: "LOCAL_SYNTHETIC_DEVELOPMENT_ONLY",
  };
  technical.approvalState = {
    ...technical.approvalState,
    approvedFindings: packet.verification.migrationSafetyScan.approvedRiskCount,
    finalCondition: "REJECTED_PENDING_PRODUCTION_EVIDENCE_AND_SIGNED_APPROVAL",
    productionExecutionAuthorizedByEvidence: false,
  };
  return technical;
}

function writeSidecar(root, relative, sourceRelative) {
  const sourceName = path.basename(sourceRelative);
  fs.writeFileSync(
    absolute(root, relative),
    `${fileSha256(root, sourceRelative)}  ${sourceName}\n`,
    "utf8",
  );
}

function writePacketSidecar(root) {
  const markdownHash = fileSha256(root, PACKET_MARKDOWN_PATH);
  const jsonHash = fileSha256(root, PACKET_PATH);
  fs.writeFileSync(
    absolute(root, PACKET_SIDECAR_PATH),
    `${markdownHash}  ${path.basename(PACKET_MARKDOWN_PATH)}\n${jsonHash}  ${path.basename(PACKET_PATH)}\n`,
    "utf8",
  );
}

function buildRefresh(root, mode) {
  const observedAt = new Date().toISOString();
  const sourceState = currentSourceState(root);
  if (!sourceState.available) throw new Error("candidate_git_state_unavailable");
  if (mode === "production-freeze" && sourceState.sourceDirtyPathCount !== 0) {
    throw new Error(
      `production_freeze_requires_clean_source_candidate:${sourceState.sourceDirtyPathCount}`,
    );
  }
  const packet = updatePacket(
    root,
    readJson(root, PACKET_PATH),
    mode,
    observedAt,
    sourceState,
  );
  const manifest = updateManifest(
    root,
    readJson(root, MANIFEST_PATH),
    packet,
    mode,
  );
  return { observedAt, sourceState, packet, manifest, mode };
}

function writeRefresh(root, result) {
  writeJson(root, PACKET_PATH, result.packet);
  writeJson(root, MANIFEST_PATH, result.manifest);
  writePacketSidecar(root);
  writeSidecar(root, MANIFEST_SIDECAR_PATH, MANIFEST_PATH);
  const technical = updateTechnicalManifest(
    root,
    result.packet,
    result.manifest,
    result.mode,
    result.observedAt,
  );
  writeJson(root, TECHNICAL_MANIFEST_PATH, technical);
  writeSidecar(
    root,
    TECHNICAL_MANIFEST_SIDECAR_PATH,
    TECHNICAL_MANIFEST_PATH,
  );
  return {
    ...result,
    technicalManifestSha256: fileSha256(root, TECHNICAL_MANIFEST_PATH),
    packetSha256: fileSha256(root, PACKET_PATH),
    evidenceManifestSha256: fileSha256(root, MANIFEST_PATH),
  };
}

function publicResult(result, wrote) {
  return {
    status: wrote ? "HASH_BINDINGS_REFRESHED" : "HASH_BINDINGS_PREVIEWED",
    mode: result.mode,
    observedAt: result.observedAt,
    candidateMode: result.packet.repository.candidateMode,
    sourceDirtyPathCount: result.sourceState.sourceDirtyPathCount,
    packetPath: PACKET_PATH,
    packetSha256: result.packetSha256 || null,
    evidenceManifestPath: MANIFEST_PATH,
    evidenceManifestSha256: result.evidenceManifestSha256 || null,
    prismaSchemaSha256: result.manifest.prismaSchema.sha256,
    technicalManifestPath: TECHNICAL_MANIFEST_PATH,
    technicalManifestSha256: result.technicalManifestSha256 || null,
    productionExecutionAuthorized: false,
  };
}

if (require.main === module) {
  try {
    const options = parseArgs();
    const root = path.resolve(options.root);
    let result = buildRefresh(root, options.mode);
    if (options.write) result = writeRefresh(root, result);
    process.stdout.write(`${JSON.stringify(publicResult(result, options.write), null, 2)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  buildRefresh,
  parseArgs,
  publicResult,
  updateManifest,
  updatePacket,
};
