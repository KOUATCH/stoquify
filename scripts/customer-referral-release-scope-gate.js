#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DEFAULT_POLICY =
  "what-next/referrals/CUSTOMER_REFERRAL_RELEASE_SCOPE_POLICY.json";
const DEFAULT_MARKDOWN_OUT =
  "what-next/referrals/customer-referral-release-scope-readiness.md";
const DEFAULT_JSON_OUT =
  "what-next/referrals/customer-referral-release-scope-readiness.json";
const CATEGORY_NAMES = ["candidate", "split", "regenerate", "exclude"];

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    policy: DEFAULT_POLICY,
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--policy") options.policy = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error("Unknown argument: " + value);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Unsupported mode: " + options.mode);
  }
  return options;
}

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitLines(root, args, runner = execFileSync) {
  const output = runner("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(output || "")
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(Boolean);
}

function collectChangedPaths(root = process.cwd(), runner = execFileSync) {
  const unstaged = gitLines(root, ["diff", "--name-only"], runner);
  const staged = gitLines(root, ["diff", "--cached", "--name-only"], runner);
  const untracked = gitLines(
    root,
    ["ls-files", "--others", "--exclude-standard"],
    runner,
  );
  const all = [...new Set([...unstaged, ...staged, ...untracked])].sort();
  const stagedSet = new Set(staged);
  const unstagedSet = new Set(unstaged);
  const untrackedSet = new Set(untracked);
  return {
    all,
    staged,
    unstaged,
    untracked,
    stateByPath: new Map(
      all.map((file) => [
        file,
        {
          staged: stagedSet.has(file),
          unstaged: unstagedSet.has(file),
          untracked: untrackedSet.has(file),
        },
      ]),
    ),
  };
}

function readPolicy(root, policyPath) {
  const target = path.resolve(root, policyPath);
  if (!fs.existsSync(target)) {
    return { valid: false, policy: null, errors: ["policy_missing"] };
  }
  try {
    const policy = JSON.parse(fs.readFileSync(target, "utf8"));
    const errors = [];
    if (policy.version !== 1) errors.push("policy_version");
    if (!Array.isArray(policy.requiredCandidatePaths)) {
      errors.push("policy_required_candidate_paths");
    }
    for (const category of CATEGORY_NAMES) {
      const rules = policy.categories?.[category];
      if (!rules || typeof rules !== "object") {
        errors.push(`policy_category_${category}`);
        continue;
      }
      for (const ruleName of ["exact", "prefix", "contains", "suffix"]) {
        if (
          !Array.isArray(rules[ruleName]) ||
          rules[ruleName].some(
            (rule) => typeof rule !== "string" || !normalizePath(rule),
          )
        ) {
          errors.push(`policy_${category}_${ruleName}`);
        }
      }
    }
    return {
      valid: errors.length === 0,
      policy,
      errors: [...new Set(errors)],
    };
  } catch {
    return { valid: false, policy: null, errors: ["policy_unparseable"] };
  }
}

function matchesRules(file, rules) {
  const normalized = normalizePath(file);
  return (
    rules.exact.some((rule) => normalized === normalizePath(rule)) ||
    rules.prefix.some((rule) => normalized.startsWith(normalizePath(rule))) ||
    rules.contains.some((rule) => normalized.includes(normalizePath(rule))) ||
    rules.suffix.some((rule) => normalized.endsWith(normalizePath(rule)))
  );
}

function classifyPath(file, policy) {
  const normalized = normalizePath(file);
  const exactMatches = CATEGORY_NAMES.filter((category) =>
    policy.categories[category].exact.some(
      (rule) => normalized === normalizePath(rule),
    ),
  );
  const matches = exactMatches.length
    ? exactMatches
    : CATEGORY_NAMES.filter((category) => {
        const rules = policy.categories[category];
        return (
          rules.prefix.some((rule) =>
            normalized.startsWith(normalizePath(rule)),
          ) ||
          rules.contains.some((rule) =>
            normalized.includes(normalizePath(rule)),
          ) ||
          rules.suffix.some((rule) =>
            normalized.endsWith(normalizePath(rule)),
          )
        );
      });
  return {
    file,
    category: matches.length === 1 ? matches[0] : null,
    matches,
    conflict: matches.length > 1,
    unclassified: matches.length === 0,
  };
}

function contentHash(root, file) {
  const target = path.resolve(root, file);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Release scope escaped repository root: " + file);
  }
  if (!fs.existsSync(target)) return "deleted";
  const stat = fs.statSync(target);
  if (!stat.isFile()) return "non_file";
  return sha256(fs.readFileSync(target));
}

function buildReleaseScope(root, inventory, policyResult, options = {}) {
  const policy = policyResult.policy || {
    categories: Object.fromEntries(
      CATEGORY_NAMES.map((category) => [
        category,
        { exact: [], prefix: [], contains: [], suffix: [] },
      ]),
    ),
    requiredCandidatePaths: [],
  };
  const classifications = inventory.all.map((file) => ({
    ...classifyPath(file, policy),
    ...(inventory.stateByPath.get(file) || {}),
  }));
  const byCategory = Object.fromEntries(
    CATEGORY_NAMES.map((category) => [
      category,
      classifications.filter((entry) => entry.category === category),
    ]),
  );
  const conflicts = classifications.filter((entry) => entry.conflict);
  const unclassified = classifications.filter((entry) => entry.unclassified);
  const candidateSet = new Set(byCategory.candidate.map((entry) => entry.file));
  const missingRequiredCandidates = (policy.requiredCandidatePaths || [])
    .map(normalizePath)
    .filter((file) => !candidateSet.has(file));
  const protectedStagedPaths = classifications.filter(
    (entry) => entry.staged && entry.category !== "candidate",
  );
  const candidateHashes = byCategory.candidate
    .map((entry) => ({ file: entry.file, sha256: contentHash(root, entry.file) }))
    .sort((left, right) => left.file.localeCompare(right.file));
  const candidateScopeDigest = sha256(
    candidateHashes.map((entry) => `${entry.file}\0${entry.sha256}`).join("\n"),
  );
  const classificationBlockers = [
    ...(!policyResult.valid ? ["release_scope_policy_invalid"] : []),
    ...(conflicts.length ? ["release_scope_category_conflicts"] : []),
    ...(unclassified.length ? ["release_scope_has_unclassified_paths"] : []),
    ...(missingRequiredCandidates.length
      ? ["required_referral_candidate_paths_missing"]
      : []),
    ...(!byCategory.candidate.length ? ["referral_candidate_scope_empty"] : []),
  ];
  const releaseBlockers = [
    ...classificationBlockers,
    ...(protectedStagedPaths.length
      ? ["unrelated_user_index_changes_present"]
      : []),
    ...(byCategory.split.length
      ? ["mixed_shared_files_require_hunk_isolation"]
      : []),
    ...(byCategory.regenerate.length
      ? ["architecture_graph_must_be_regenerated_on_isolated_revision"]
      : []),
    "exact_referral_git_revision_not_created",
    "security_diff_scan_not_run_on_exact_revision",
  ];
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      classificationStatus: classificationBlockers.length
        ? "blocked"
        : "ready",
      releaseStatus: releaseBlockers.length ? "blocked" : "ready",
      changedPathCount: inventory.all.length,
      candidateCount: byCategory.candidate.length,
      splitCount: byCategory.split.length,
      regenerateCount: byCategory.regenerate.length,
      excludedCount: byCategory.exclude.length,
      unclassifiedCount: unclassified.length,
      conflictCount: conflicts.length,
      protectedStagedCount: protectedStagedPaths.length,
    },
    candidateScopeDigest,
    policy: {
      valid: policyResult.valid,
      errors: policyResult.errors,
    },
    paths: {
      candidate: byCategory.candidate.map((entry) => entry.file),
      split: byCategory.split.map((entry) => entry.file),
      regenerate: byCategory.regenerate.map((entry) => entry.file),
      excluded: byCategory.exclude.map((entry) => entry.file),
      unclassified: unclassified.map((entry) => entry.file),
      conflicts: conflicts.map((entry) => ({
        file: entry.file,
        categories: entry.matches,
      })),
      protectedStaged: protectedStagedPaths.map((entry) => entry.file),
      missingRequiredCandidates,
    },
    candidateHashes,
    classificationBlockers,
    releaseBlockers,
    safety: {
      readOnlyGitInventory: true,
      stagesFiles: false,
      commitsFiles: false,
      modifiesIndex: false,
      protectsUnrelatedStagedChanges: true,
      graphRefreshBoundToIsolatedRevision: true,
    },
  };
}

function renderList(values, empty = "None") {
  return values.length ? values.map((value) => `- ${value}`) : [`- ${empty}`];
}

function renderMarkdown(report) {
  return [
    "# Customer Referral Release Scope Readiness",
    "",
    `Generated: ${report.summary.generatedAt}`,
    `Classification: \`${report.summary.classificationStatus}\``,
    `Exact release: \`${report.summary.releaseStatus}\``,
    "",
    "## Scope summary",
    "",
    `- Changed paths inspected: ${report.summary.changedPathCount}`,
    `- Referral candidate paths: ${report.summary.candidateCount}`,
    `- Mixed shared paths requiring hunk isolation: ${report.summary.splitCount}`,
    `- Regenerate on isolated revision: ${report.summary.regenerateCount}`,
    `- Explicitly excluded user/unrelated paths: ${report.summary.excludedCount}`,
    `- Unclassified paths: ${report.summary.unclassifiedCount}`,
    `- Category conflicts: ${report.summary.conflictCount}`,
    `- Protected staged paths: ${report.summary.protectedStagedCount}`,
    `- Candidate scope digest: \`${report.candidateScopeDigest}\``,
    "",
    "## Classification blockers",
    "",
    ...renderList(report.classificationBlockers),
    "",
    "## Exact-release blockers",
    "",
    ...renderList(report.releaseBlockers),
    "",
    "## Protected staged paths",
    "",
    ...renderList(report.paths.protectedStaged),
    "",
    "## Unclassified paths",
    "",
    ...renderList(report.paths.unclassified),
    "",
    "## Mixed shared paths requiring hunk isolation",
    "",
    ...renderList(report.paths.split),
    "",
    "## Regenerate after isolation",
    "",
    ...renderList(report.paths.regenerate),
    "",
    "## Candidate paths",
    "",
    ...renderList(report.paths.candidate),
    "",
    "## Safety",
    "",
    "- This gate reads Git and file content only; it never stages, commits, or changes the index.",
    "- Existing staged paths outside the referral candidate are protected and block exact-release readiness.",
    "- Generated architecture graphs are excluded from the dirty-tree candidate and must be regenerated after referral isolation.",
    "- Security certification remains blocked until an exact Git-backed referral revision exists.",
    "",
  ].join("\n");
}

function writeReport(root, options, report) {
  const markdownTarget = path.resolve(root, options.out);
  const jsonTarget = path.resolve(root, options.jsonOut);
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8");
  fs.writeFileSync(jsonTarget, JSON.stringify(report, null, 2) + "\n", "utf8");
}

function gateResult(report, mode = "report") {
  return {
    status: report.summary.releaseStatus,
    exitCode: mode === "fail" && report.releaseBlockers.length ? 1 : 0,
  };
}

function main() {
  const options = parseArgs();
  const root = path.resolve(options.root);
  const policy = readPolicy(root, options.policy);
  const inventory = collectChangedPaths(root);
  const report = buildReleaseScope(root, inventory, policy, {
    mode: options.mode,
  });
  writeReport(root, options, report);
  console.log(renderMarkdown(report));
  process.exitCode = gateResult(report, options.mode).exitCode;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  buildReleaseScope,
  classifyPath,
  collectChangedPaths,
  gateResult,
  matchesRules,
  normalizePath,
  parseArgs,
  readPolicy,
  renderMarkdown,
};
