#!/usr/bin/env node

const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { dirname, posix, resolve } = require("node:path");

const DEFAULT_MANIFEST =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_CANDIDATE_FILE_MANIFEST_2026-07-25.json";
const DEFAULT_JSON_OUT =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_COMMIT_ATTESTATION_2026-07-25.json";
const DEFAULT_MD_OUT =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_COMMIT_ATTESTATION_2026-07-25.md";
const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/i;
const MANIFEST_CATEGORIES = new Set([
  "RUNTIME_SOURCE_TEST",
  "RELEASE_EVIDENCE_DOC",
]);
const EVIDENCE_CONTROL_PATHS = new Set([
  "package.json",
  "scripts/agent-phased-execution-requirements-gate.js",
  "scripts/agent-phase-promotion-gate.js",
  "scripts/agent-phase2a-command-gate.js",
  "scripts/agent-phase2a-freeze-commit-gate.js",
  "scripts/release-evidence-ratchet.js",
  "scripts/__tests__/agent-phased-execution-requirements-gate.test.js",
  "scripts/__tests__/agent-phase-promotion-gate.test.js",
  "scripts/__tests__/agent-phase2a-freeze-commit-gate.test.js",
  "scripts/__tests__/release-evidence-ratchet.test.js",
]);
const SHARED_SEMANTIC_RUNTIME_PATHS = new Set(["prisma/schema.prisma"]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    manifestPath: DEFAULT_MANIFEST,
    jsonOut: DEFAULT_JSON_OUT,
    markdownOut: DEFAULT_MD_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") options.mode = argv[++index];
    else if (value === "--manifest") options.manifestPath = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else if (value === "--out") options.markdownOut = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  return options;
}

function evaluateFreezeCommit(input) {
  const blockers = [];
  const manifestBlockers = validateManifest(input.manifest);
  blockers.push(...manifestBlockers);
  const currentHead = input.currentHead || input.head || "";
  const frozenCommitIsCurrentHead =
    COMMIT_PATTERN.test(input.head || "") &&
    COMMIT_PATTERN.test(currentHead) &&
    input.head.toLowerCase() === currentHead.toLowerCase();
  const files = Array.isArray(input.manifest?.files)
    ? input.manifest.files
    : [];
  const expectedPaths = files.map((entry) => normalizePath(entry.path));
  const expectedSet = new Set(expectedPaths);
  const selfPath = normalizePath(input.manifest?.selfExcluded);
  const commitPaths = uniqueSorted(
    (input.commitPaths || []).map(normalizePath).filter(Boolean),
  );
  const allCommitSet = new Set(commitPaths);
  const commitCandidatePaths = commitPaths.filter((path) => path !== selfPath);
  const commitSet = new Set(commitCandidatePaths);
  const missingPaths = expectedPaths.filter((path) => !commitSet.has(path));
  const unexpectedPaths = commitCandidatePaths.filter(
    (path) => !expectedSet.has(path),
  );

  if (!COMMIT_PATTERN.test(input.head || "")) {
    blockers.push("FREEZE_HEAD_COMMIT_INVALID");
  }
  if (!COMMIT_PATTERN.test(currentHead)) {
    blockers.push("CURRENT_HEAD_COMMIT_INVALID");
  }
  if (input.frozenCommitAncestorOfCurrentHead === false) {
    blockers.push("FROZEN_COMMIT_NOT_CURRENT_HEAD_ANCESTOR");
  }
  if (!COMMIT_PATTERN.test(input.parent || "")) {
    blockers.push("FREEZE_PARENT_COMMIT_INVALID");
  }
  if (
    COMMIT_PATTERN.test(input.parent || "") &&
    input.parent.toLowerCase() !==
      String(input.manifest?.baseHeadCommit || "").toLowerCase()
  ) {
    blockers.push("FREEZE_PARENT_MANIFEST_BASE_MISMATCH");
  }
  if (!allCommitSet.has(selfPath)) {
    blockers.push("FREEZE_MANIFEST_NOT_COMMITTED");
  }
  for (const path of missingPaths) {
    blockers.push(`FREEZE_COMMIT_PATH_MISSING:${path}`);
  }
  for (const path of unexpectedPaths) {
    blockers.push(`FREEZE_COMMIT_PATH_UNEXPECTED:${path}`);
  }

  const currentChanges = (input.currentChanges || []).map((change) => ({
    status: String(change.status || "").trim() || "??",
    path: normalizePath(change.path),
  }));
  const postFreezeCommittedChanges = (
    input.postFreezeCommittedChanges || []
  ).map((change) => ({
    status: String(change.status || "").trim() || "COMMITTED",
    path: normalizePath(change.path),
  }));
  const changedPathSet = new Set(
    [...currentChanges, ...postFreezeCommittedChanges].map(
      (change) => change.path,
    ),
  );
  const fileVerification = [];
  for (const file of files) {
    const path = normalizePath(file.path);
    const committed = getBuffer(input.committedContents, path);
    const filteredCommitted = getBuffer(input.filteredCommittedContents, path);
    const current = getBuffer(input.currentFileContents, path);
    const verification = verifyCommittedFile({
      committed,
      filteredCommitted,
      current,
      currentPathChanged: changedPathSet.has(path),
      expectedBytes: file.bytes,
      expectedSha256: file.sha256,
    });
    fileVerification.push({
      category: file.category,
      path,
      expectedSha256: file.sha256,
      expectedBytes: file.bytes,
      verification,
    });
    if (!verification.verified) {
      blockers.push(`FREEZE_COMMIT_CONTENT_MISMATCH:${path}`);
    }
  }

  const currentChangeClassification = currentChanges.map((change) => {
    const candidate = files.find(
      (entry) => normalizePath(entry.path) === change.path,
    );
    return {
      ...change,
      candidateCategory: candidate?.category ?? null,
      classification: classifyCurrentChange(change.path, candidate, {
        baselineContent: getBuffer(input.committedContents, change.path),
        currentContent: getBuffer(input.currentFileContents, change.path),
      }),
    };
  });
  const postFreezeCommittedClassification = postFreezeCommittedChanges.map(
    (change) => {
      const candidate = files.find(
        (entry) => normalizePath(entry.path) === change.path,
      );
      return {
        ...change,
        candidateCategory: candidate?.category ?? null,
        classification: classifyCurrentChange(change.path, candidate, {
          baselineContent: getBuffer(input.committedContents, change.path),
          currentContent: getBuffer(input.currentHeadContents, change.path),
        }),
      };
    },
  );
  const worktreeRuntimeDrift = currentChangeClassification.filter(
    (entry) => entry.classification === "PHASE2A_RUNTIME_DRIFT",
  );
  const committedRuntimeDrift = postFreezeCommittedClassification.filter(
    (entry) => entry.classification === "PHASE2A_RUNTIME_DRIFT",
  );
  for (const entry of worktreeRuntimeDrift) {
    blockers.push(`POST_FREEZE_RUNTIME_DRIFT:${entry.path}`);
  }
  for (const entry of committedRuntimeDrift) {
    blockers.push(`POST_FREEZE_COMMITTED_RUNTIME_DRIFT:${entry.path}`);
  }

  const uniqueBlockers = [...new Set(blockers)];
  const verificationCounts = countBy(
    fileVerification,
    (entry) => entry.verification.method,
  );
  const ready = uniqueBlockers.length === 0;
  return {
    schemaVersion: 1,
    attestationId: "stoquify-agent-runtime-phase-2a-freeze-commit-2026-07-25",
    evaluatedAt: (input.now || new Date()).toISOString(),
    branch: input.branch || null,
    headCommit: input.head || null,
    currentHeadCommit: currentHead || null,
    frozenCommitIsCurrentHead,
    frozenCommitAncestorOfCurrentHead:
      input.frozenCommitAncestorOfCurrentHead !== false,
    parentCommit: input.parent || null,
    manifestId: input.manifest?.manifestId ?? null,
    manifestBaseCommit: input.manifest?.baseHeadCommit ?? null,
    manifestReference: input.manifestReference || DEFAULT_MANIFEST,
    status: ready ? "FROZEN_COMMIT_VERIFIED" : "BLOCKED",
    freezeVerified: ready,
    cleanReleaseReady:
      ready && currentChanges.length === 0 && frozenCommitIsCurrentHead,
    activationAuthorized: false,
    phase3Authorized: false,
    sourceTreeClean: currentChanges.length === 0,
    summary: {
      manifestFiles: files.length,
      commitCandidateFiles: commitCandidatePaths.length,
      missingPaths: missingPaths.length,
      unexpectedPaths: unexpectedPaths.length,
      verifiedFiles: fileVerification.filter(
        (entry) => entry.verification.verified,
      ).length,
      contentMismatches: fileVerification.filter(
        (entry) => !entry.verification.verified,
      ).length,
      exactBlobMatches: verificationCounts.EXACT_COMMITTED_BLOB || 0,
      lineEndingEquivalentMatches:
        verificationCounts.LINE_ENDING_EQUIVALENT || 0,
      filteredCommitEquivalentMatches:
        verificationCounts.GIT_FILTERED_COMMIT_EQUIVALENT || 0,
      cleanFilterEquivalentMatches:
        verificationCounts.GIT_CLEAN_FILTER_EQUIVALENT || 0,
      currentChanges: currentChanges.length,
      postFreezeCommittedChanges: postFreezeCommittedClassification.length,
      evidenceControlChanges: currentChangeClassification.filter(
        (entry) => entry.classification === "EVIDENCE_CONTROL_REMEDIATION",
      ).length,
      committedEvidenceControlChanges: postFreezeCommittedClassification.filter(
        (entry) => entry.classification === "EVIDENCE_CONTROL_REMEDIATION",
      ).length,
      worktreePhase2aRuntimeDrift: worktreeRuntimeDrift.length,
      committedPhase2aRuntimeDrift: committedRuntimeDrift.length,
      phase2aRuntimeDrift:
        worktreeRuntimeDrift.length + committedRuntimeDrift.length,
      outsideCandidateChanges: currentChangeClassification.filter(
        (entry) => entry.classification === "OUTSIDE_CANDIDATE_SCOPE",
      ).length,
      committedOutsideCandidateChanges:
        postFreezeCommittedClassification.filter(
          (entry) => entry.classification === "OUTSIDE_CANDIDATE_SCOPE",
        ).length,
      blockerCount: uniqueBlockers.length,
      secretValuesPrinted: false,
    },
    missingPaths,
    unexpectedPaths,
    fileVerification,
    currentChanges: currentChangeClassification,
    postFreezeCommittedChanges: postFreezeCommittedClassification,
    blockers: uniqueBlockers,
    safety: {
      historicalManifestRewritten: false,
      businessDataRead: false,
      businessWriteAuthorityAdded: false,
      activationAttempted: false,
      phase3Started: false,
      secretValuesPrinted: false,
    },
  };
}

function validateManifest(manifest) {
  const blockers = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["FREEZE_MANIFEST_INVALID"];
  }
  if (manifest.schemaVersion !== 1) {
    blockers.push("FREEZE_MANIFEST_SCHEMA_VERSION_INVALID");
  }
  if (!COMMIT_PATTERN.test(manifest.baseHeadCommit || "")) {
    blockers.push("FREEZE_MANIFEST_BASE_COMMIT_INVALID");
  }
  if (manifest.sourceTreeClean !== false) {
    blockers.push("FREEZE_MANIFEST_SOURCE_TREE_STATE_INVALID");
  }
  if (
    manifest.activationAuthorized !== false ||
    manifest.phase3Authorized !== false
  ) {
    blockers.push("FREEZE_MANIFEST_AUTHORITY_BOUNDARY_INVALID");
  }
  if (!safeRelativePath(manifest.selfExcluded)) {
    blockers.push("FREEZE_MANIFEST_SELF_PATH_INVALID");
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    blockers.push("FREEZE_MANIFEST_FILES_MISSING");
    return blockers;
  }
  const paths = new Set();
  for (const file of manifest.files) {
    if (!safeRelativePath(file?.path)) {
      blockers.push("FREEZE_MANIFEST_FILE_PATH_INVALID");
      continue;
    }
    const normalized = normalizePath(file.path);
    if (paths.has(normalized)) {
      blockers.push(`FREEZE_MANIFEST_FILE_DUPLICATE:${normalized}`);
    }
    paths.add(normalized);
    if (!MANIFEST_CATEGORIES.has(file.category)) {
      blockers.push(`FREEZE_MANIFEST_CATEGORY_INVALID:${normalized}`);
    }
    if (!HASH_PATTERN.test(file.sha256 || "")) {
      blockers.push(`FREEZE_MANIFEST_HASH_INVALID:${normalized}`);
    }
    if (!Number.isInteger(file.bytes) || file.bytes < 0) {
      blockers.push(`FREEZE_MANIFEST_BYTES_INVALID:${normalized}`);
    }
  }
  if (manifest.counts?.total !== manifest.files.length) {
    blockers.push("FREEZE_MANIFEST_TOTAL_COUNT_MISMATCH");
  }
  return blockers;
}

function verifyCommittedFile(input) {
  if (!Buffer.isBuffer(input.committed)) {
    return {
      verified: false,
      method: "MISSING_COMMITTED_BLOB",
      committedBytes: null,
      committedSha256: null,
    };
  }
  const exact = describeBuffer(input.committed);
  if (
    exact.bytes === input.expectedBytes &&
    exact.sha256 === String(input.expectedSha256).toLowerCase()
  ) {
    return {
      verified: true,
      method: "EXACT_COMMITTED_BLOB",
      committedBytes: exact.bytes,
      committedSha256: exact.sha256,
    };
  }
  for (const candidate of lineEndingVariants(input.committed)) {
    const described = describeBuffer(candidate);
    if (
      described.bytes === input.expectedBytes &&
      described.sha256 === String(input.expectedSha256).toLowerCase()
    ) {
      return {
        verified: true,
        method: "LINE_ENDING_EQUIVALENT",
        committedBytes: exact.bytes,
        committedSha256: exact.sha256,
      };
    }
  }
  if (Buffer.isBuffer(input.filteredCommitted)) {
    const filtered = describeBuffer(input.filteredCommitted);
    if (
      filtered.bytes === input.expectedBytes &&
      filtered.sha256 === String(input.expectedSha256).toLowerCase()
    ) {
      return {
        verified: true,
        method: "GIT_FILTERED_COMMIT_EQUIVALENT",
        committedBytes: exact.bytes,
        committedSha256: exact.sha256,
      };
    }
  }
  if (!input.currentPathChanged && Buffer.isBuffer(input.current)) {
    const current = describeBuffer(input.current);
    if (
      current.bytes === input.expectedBytes &&
      current.sha256 === String(input.expectedSha256).toLowerCase()
    ) {
      return {
        verified: true,
        method: "GIT_CLEAN_FILTER_EQUIVALENT",
        committedBytes: exact.bytes,
        committedSha256: exact.sha256,
      };
    }
  }
  return {
    verified: false,
    method: "CONTENT_MISMATCH",
    committedBytes: exact.bytes,
    committedSha256: exact.sha256,
  };
}

function classifyCurrentChange(path, candidate, comparison = {}) {
  if (candidate?.category === "RELEASE_EVIDENCE_DOC") {
    return "EVIDENCE_CONTROL_REMEDIATION";
  }
  if (candidate?.category === "RUNTIME_SOURCE_TEST") {
    if (SHARED_SEMANTIC_RUNTIME_PATHS.has(path)) {
      return agentRuntimeSchemaChanged(
        comparison.baselineContent,
        comparison.currentContent,
      )
        ? "PHASE2A_RUNTIME_DRIFT"
        : "OUTSIDE_CANDIDATE_SCOPE";
    }
    return evidenceControlPath(path)
      ? "EVIDENCE_CONTROL_REMEDIATION"
      : "PHASE2A_RUNTIME_DRIFT";
  }
  if (evidenceControlPath(path)) return "EVIDENCE_CONTROL_REMEDIATION";
  return "OUTSIDE_CANDIDATE_SCOPE";
}

function evidenceControlPath(path) {
  if (EVIDENCE_CONTROL_PATHS.has(path)) return true;
  if (
    path.startsWith("docs/agents-runtime/") ||
    path.startsWith("what-next/agents-runtime/") ||
    path.startsWith("what-next/skills-life-cycle/")
  ) {
    return true;
  }
  if (path.startsWith("what-next/") && /\.(?:json|md|pdf)$/i.test(path)) {
    return true;
  }
  return false;
}

function agentRuntimeSchemaChanged(baselineContent, currentContent) {
  if (!Buffer.isBuffer(baselineContent) || !Buffer.isBuffer(currentContent)) {
    return true;
  }
  return (
    extractAgentRuntimeSchema(baselineContent) !==
    extractAgentRuntimeSchema(currentContent)
  );
}

function extractAgentRuntimeSchema(content) {
  const lines = content.toString("utf8").replace(/\r\n/g, "\n").split("\n");
  const selected = [];
  let inAgentBlock = false;

  for (const line of lines) {
    const declaration = line.match(/^\s*(?:model|enum)\s+(\w+)\s*\{/);
    if (declaration) {
      inAgentBlock = declaration[1].startsWith("Agent");
    }

    const normalized = normalizePrismaSchemaLine(line);
    if (
      normalized &&
      (inAgentBlock ||
        /\bAgent[A-Za-z0-9_]*\b|\bagent[A-Z][A-Za-z0-9_]*\b/.test(
          normalized,
        ))
    ) {
      selected.push(normalized);
    }

    if (inAgentBlock && /^\s*}\s*$/.test(line)) {
      inAgentBlock = false;
    }
  }

  return selected.join("\n");
}

function normalizePrismaSchemaLine(line) {
  return line.replace(/\/\/.*$/, "").trim().replace(/\s+/g, " ");
}

function lineEndingVariants(buffer) {
  const text = buffer.toString("utf8");
  if (Buffer.from(text, "utf8").compare(buffer) !== 0) return [];
  const variants = [];
  const crlf = Buffer.from(text.replace(/(?<!\r)\n/g, "\r\n"), "utf8");
  const lf = Buffer.from(text.replace(/\r\n/g, "\n"), "utf8");
  if (crlf.compare(buffer) !== 0) variants.push(crlf);
  if (lf.compare(buffer) !== 0) variants.push(lf);
  return variants;
}

function collectGitEvidence(root, manifest) {
  const currentHead = runGitText(root, ["rev-parse", "HEAD"]).trim();
  const baseHead = String(manifest?.baseHeadCommit || "").trim();
  const frozenCommitAncestorOfCurrentHead =
    COMMIT_PATTERN.test(baseHead) &&
    gitCommandSucceeds(root, [
      "merge-base",
      "--is-ancestor",
      baseHead,
      currentHead,
    ]);
  const head = frozenCommitAncestorOfCurrentHead
    ? resolveFrozenCommit(root, baseHead, currentHead)
    : currentHead;
  const parent = runGitText(root, ["rev-parse", `${head}^`]).trim();
  const branch = runGitText(root, ["branch", "--show-current"]).trim();
  const commitPaths = runGitBuffer(root, [
    "diff-tree",
    "--root",
    "--no-commit-id",
    "--name-only",
    "-r",
    "-z",
    head,
  ])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const postFreezeCommittedChanges =
    head.toLowerCase() === currentHead.toLowerCase()
      ? []
      : runGitBuffer(root, ["diff", "--name-only", "-z", head, currentHead])
          .toString("utf8")
          .split("\0")
          .filter(Boolean)
          .map((path) => ({ status: "COMMITTED", path }));
  const currentChanges = parsePorcelainStatus(
    runGitBuffer(root, ["status", "--porcelain=v1", "-z", "-uall"]),
  );
  const committedContents = new Map();
  const currentHeadContents = new Map();
  const filteredCommittedContents = new Map();
  const currentFileContents = new Map();
  for (const file of manifest.files || []) {
    const path = normalizePath(file.path);
    committedContents.set(
      path,
      runGitBuffer(root, ["cat-file", "blob", `${head}:${path}`], true),
    );
    filteredCommittedContents.set(
      path,
      runGitBuffer(
        root,
        ["cat-file", "--filters", `--path=${path}`, `${head}:${path}`],
        true,
      ),
    );
    const currentPath = resolve(root, ...path.split("/"));
    if (existsSync(currentPath)) {
      currentFileContents.set(path, readFileSync(currentPath));
    }
    if (
      SHARED_SEMANTIC_RUNTIME_PATHS.has(path) &&
      postFreezeCommittedChanges.some((change) => change.path === path)
    ) {
      currentHeadContents.set(
        path,
        runGitBuffer(
          root,
          ["cat-file", "blob", `${currentHead}:${path}`],
          true,
        ),
      );
    }
  }
  return {
    branch,
    commitPaths,
    committedContents,
    currentChanges,
    currentFileContents,
    currentHeadContents,
    filteredCommittedContents,
    currentHead,
    frozenCommitAncestorOfCurrentHead,
    head,
    parent,
    postFreezeCommittedChanges,
  };
}

function resolveFrozenCommit(root, baseHead, currentHead) {
  const commits = runGitText(root, [
    "rev-list",
    "--first-parent",
    "--reverse",
    `${baseHead}..${currentHead}`,
  ])
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return commits[0] || currentHead;
}

function parsePorcelainStatus(buffer) {
  const records = buffer.toString("utf8").split("\0").filter(Boolean);
  const changes = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const status = record.slice(0, 2);
    const path = normalizePath(record.slice(3));
    changes.push({ status, path });
    if (/[RC]/.test(status) && index + 1 < records.length) index += 1;
  }
  return changes;
}

function renderMarkdown(result) {
  const lines = [
    "# Stoquify Agent Runtime Phase 2A Freeze Commit Attestation",
    "",
    `**Evaluated:** ${result.evaluatedAt}<br>`,
    `**Status:** \`${result.status}\`<br>`,
    `**Freeze verified:** ${result.freezeVerified ? "Yes" : "No"}<br>`,
    `**Clean release ready:** ${result.cleanReleaseReady ? "Yes" : "No"}<br>`,
    "**Activation authorized:** No<br>",
    "**Phase 3 authorized:** No",
    "",
    "## Frozen Source",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Branch | \`${result.branch ?? "unresolved"}\` |`,
    `| Frozen commit | \`${result.headCommit ?? "unresolved"}\` |`,
    `| Current HEAD | \`${result.currentHeadCommit ?? "unresolved"}\` |`,
    `| Frozen commit is current HEAD | ${result.frozenCommitIsCurrentHead ? "Yes" : "No"} |`,
    `| Frozen commit is current HEAD ancestor | ${result.frozenCommitAncestorOfCurrentHead ? "Yes" : "No"} |`,
    `| Parent | \`${result.parentCommit ?? "unresolved"}\` |`,
    `| Manifest base | \`${result.manifestBaseCommit ?? "unresolved"}\` |`,
    `| Manifest | \`${result.manifestReference}\` |`,
    "",
    "## Commit Verification",
    "",
    "| Check | Result |",
    "|---|---:|",
    `| Manifest files | ${result.summary.manifestFiles} |`,
    `| Commit candidate files | ${result.summary.commitCandidateFiles} |`,
    `| Verified files | ${result.summary.verifiedFiles} |`,
    `| Missing paths | ${result.summary.missingPaths} |`,
    `| Unexpected paths | ${result.summary.unexpectedPaths} |`,
    `| Content mismatches | ${result.summary.contentMismatches} |`,
    `| Exact committed blobs | ${result.summary.exactBlobMatches} |`,
    `| Line-ending equivalents | ${result.summary.lineEndingEquivalentMatches} |`,
    `| Git filtered-commit equivalents | ${result.summary.filteredCommitEquivalentMatches} |`,
    `| Git clean-filter equivalents | ${result.summary.cleanFilterEquivalentMatches} |`,
    "",
    "## Post-Freeze Worktree",
    "",
    "| Classification | Count |",
    "|---|---:|",
    `| Working-tree changes | ${result.summary.currentChanges} |`,
    `| Working-tree evidence/control remediation | ${result.summary.evidenceControlChanges} |`,
    `| Commits since freeze: changed paths | ${result.summary.postFreezeCommittedChanges} |`,
    `| Commits since freeze: evidence/control paths | ${result.summary.committedEvidenceControlChanges} |`,
    `| Working-tree Phase 2A runtime drift | ${result.summary.worktreePhase2aRuntimeDrift} |`,
    `| Committed Phase 2A runtime drift | ${result.summary.committedPhase2aRuntimeDrift} |`,
    `| Total Phase 2A runtime drift | ${result.summary.phase2aRuntimeDrift} |`,
    `| Working-tree outside candidate scope | ${result.summary.outsideCandidateChanges} |`,
    `| Commits since freeze: outside candidate scope | ${result.summary.committedOutsideCandidateChanges} |`,
    "",
    "The historical frozen commit can be verified after HEAD advances. A different current HEAD or a dirty worktree still blocks clean release and CI evidence.",
    "",
    "## Blockers",
    "",
    ...(result.blockers.length
      ? result.blockers.map((blocker) => `- \`${blocker}\``)
      : ["- None for promotion point 1 commit attestation."]),
    "",
    "## Safety",
    "",
    "- The historical candidate manifest is not rewritten.",
    "- Working-tree byte hashes are accepted only through an exact committed blob, a deterministic line-ending equivalent, or an unchanged checkout whose Git clean filter maps to the committed blob.",
    "- Post-freeze Phase 2A runtime drift blocks this attestation whether committed or still in the worktree; evidence-only and unrelated changes remain visible.",
    "- This attestation does not prove protected CI, deploy an artifact, activate an agent, or authorize Phase 3.",
    "",
  ];
  return lines.join("\n");
}

function runGitText(root, args) {
  return runGitBuffer(root, args).toString("utf8");
}

function gitCommandSucceeds(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  return result.status === 0;
}

function runGitBuffer(root, args, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(`Git command failed: git ${args.join(" ")}`);
  }
  return result.stdout;
}

function safeRelativePath(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const normalized = normalizePath(value);
  return (
    normalized === value.replaceAll("\\", "/") &&
    !normalized.startsWith("/") &&
    !/^[a-z]:\//i.test(normalized) &&
    !normalized.split("/").includes("..")
  );
}

function normalizePath(value) {
  if (typeof value !== "string") return "";
  return posix.normalize(value.replaceAll("\\", "/")).replace(/^\.\//, "");
}

function getBuffer(collection, path) {
  if (collection instanceof Map) return collection.get(path) ?? null;
  const value = collection?.[path];
  return Buffer.isBuffer(value) ? value : null;
}

function describeBuffer(buffer) {
  return {
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function countBy(values, selector) {
  const counts = {};
  for (const value of values) {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function main() {
  const options = parseArgs();
  const root = process.cwd();
  const manifestPath = resolve(root, options.manifestPath);
  if (!existsSync(manifestPath)) {
    throw new Error("The Phase 2A freeze candidate manifest is missing.");
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const gitEvidence = collectGitEvidence(root, manifest);
  const result = evaluateFreezeCommit({
    ...gitEvidence,
    manifest,
    manifestReference: options.manifestPath,
  });
  const jsonOut = resolve(root, options.jsonOut);
  const markdownOut = resolve(root, options.markdownOut);
  mkdirSync(dirname(jsonOut), { recursive: true });
  mkdirSync(dirname(markdownOut), { recursive: true });
  writeFileSync(jsonOut, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(markdownOut, renderMarkdown(result), "utf8");
  process.stdout.write(
    `${JSON.stringify(
      {
        status: result.status,
        freezeVerified: result.freezeVerified,
        cleanReleaseReady: result.cleanReleaseReady,
        frozenCommit: result.headCommit,
        currentHeadCommit: result.currentHeadCommit,
        frozenCommitIsCurrentHead: result.frozenCommitIsCurrentHead,
        manifestFiles: result.summary.manifestFiles,
        verifiedFiles: result.summary.verifiedFiles,
        contentMismatches: result.summary.contentMismatches,
        phase2aRuntimeDrift: result.summary.phase2aRuntimeDrift,
        currentChanges: result.summary.currentChanges,
        postFreezeCommittedChanges: result.summary.postFreezeCommittedChanges,
        activationAuthorized: false,
        phase3Authorized: false,
        secretValuesPrinted: false,
        report: options.markdownOut,
      },
      null,
      2,
    )}\n`,
  );
  if (options.mode === "fail" && !result.freezeVerified) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        code: "PHASE2A_FREEZE_COMMIT_ATTESTATION_FAILED",
        activationAuthorized: false,
        phase3Authorized: false,
        secretValuesPrinted: false,
      })}\n`,
    );
    process.exitCode = 1;
  }
}

module.exports = {
  agentRuntimeSchemaChanged,
  classifyCurrentChange,
  evaluateFreezeCommit,
  extractAgentRuntimeSchema,
  parseArgs,
  parsePorcelainStatus,
  renderMarkdown,
  validateManifest,
  verifyCommittedFile,
};
