#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DEFAULT_MANIFEST =
  "what-next/referrals/CUSTOMER_REFERRAL_SHARED_HUNK_POLICY.json";
const DEFAULT_OUT =
  "what-next/referrals/customer-referral-shared-hunk-readiness.md";
const DEFAULT_JSON_OUT =
  "what-next/referrals/customer-referral-shared-hunk-readiness.json";

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    manifest: DEFAULT_MANIFEST,
    out: DEFAULT_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--manifest") options.manifest = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error("Unknown argument: " + value);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Unsupported mode: " + options.mode);
  }
  return options;
}

function normalize(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(root, relativePath, label) {
  const target = path.resolve(root, relativePath);
  try {
    return {
      valid: true,
      value: JSON.parse(fs.readFileSync(target, "utf8")),
      errors: [],
    };
  } catch {
    return {
      valid: false,
      value: null,
      errors: [label + "_missing_or_unparseable"],
    };
  }
}

function validateManifest(result) {
  if (!result.valid) return result;
  const manifest = result.value;
  const errors = [];
  if (manifest.version !== 1) errors.push("hunk_policy_version");
  if (!normalize(manifest.releaseScopePolicy)) {
    errors.push("release_scope_policy_path");
  }
  if (!Array.isArray(manifest.files) || !manifest.files.length) {
    errors.push("hunk_policy_files");
  } else {
    for (const file of manifest.files) {
      if (!normalize(file.path)) errors.push("hunk_policy_file_path");
      for (const field of ["referralAnchors", "unrelatedAnchors"]) {
        if (
          !Array.isArray(file[field]) ||
          !file[field].length ||
          file[field].some((item) => !normalize(item))
        ) {
          errors.push("hunk_policy_" + field);
        }
      }
    }
  }
  return {
    valid: errors.length === 0,
    value: manifest,
    errors: [...new Set(errors)],
  };
}

function addedLines(diff) {
  return String(diff || "")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1).trim());
}

function gitDiff(root, file, runner = execFileSync) {
  return runner("git", ["diff", "--unified=0", "--", file], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function hasAnchor(additions, anchor) {
  const expected = normalize(anchor);
  return additions.some((line) => line.includes(expected));
}

function buildReport(
  root,
  manifestResult,
  scopeResult,
  diffProvider = (file) => gitDiff(root, file),
) {
  const manifest = manifestResult.value || { files: [] };
  const splitPaths = new Set(
    (scopeResult.value?.categories?.split?.exact || []).map(normalize),
  );
  const manifestPaths = new Set(
    (manifest.files || []).map((file) => normalize(file.path)),
  );
  const files = (manifest.files || []).map((file) => {
    const additions = addedLines(diffProvider(file.path));
    const referralAnchors = file.referralAnchors || [];
    const unrelatedAnchors = file.unrelatedAnchors || [];
    const overlap = referralAnchors.filter((anchor) =>
      unrelatedAnchors.includes(anchor),
    );
    return {
      path: normalize(file.path),
      inSplitScope: splitPaths.has(normalize(file.path)),
      referralAnchorCount: referralAnchors.length,
      unrelatedAnchorCount: unrelatedAnchors.length,
      missingReferralAnchorCount: referralAnchors.filter(
        (anchor) => !hasAnchor(additions, anchor),
      ).length,
      missingUnrelatedAnchorCount: unrelatedAnchors.filter(
        (anchor) => !hasAnchor(additions, anchor),
      ).length,
      overlappingAnchorCount: overlap.length,
    };
  });
  const policyOnly = [...splitPaths].filter((file) => !manifestPaths.has(file));
  const manifestOnly = [...manifestPaths].filter((file) => !splitPaths.has(file));
  const blockers = [
    ...(!manifestResult.valid ? manifestResult.errors : []),
    ...(!scopeResult.valid ? scopeResult.errors : []),
    ...(policyOnly.length
      ? ["split_scope_path_missing_from_hunk_policy"]
      : []),
    ...(manifestOnly.length
      ? ["hunk_policy_path_missing_from_split_scope"]
      : []),
    ...(files.some((file) => file.missingReferralAnchorCount)
      ? ["referral_hunk_anchor_missing"]
      : []),
    ...(files.some((file) => file.missingUnrelatedAnchorCount)
      ? ["unrelated_hunk_anchor_missing"]
      : []),
    ...(files.some((file) => file.overlappingAnchorCount)
      ? ["hunk_anchor_overlap"]
      : []),
  ];
  const selectionDigest = sha256(
    (manifest.files || [])
      .flatMap((file) =>
        (file.referralAnchors || []).map(
          (anchor) => normalize(file.path) + "\0" + normalize(anchor),
        ),
      )
      .sort()
      .join("\n"),
  );
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      status: blockers.length ? "blocked" : "ready",
      mixedFileCount: files.length,
      referralAnchorCount: files.reduce(
        (sum, file) => sum + file.referralAnchorCount,
        0,
      ),
      unrelatedAnchorCount: files.reduce(
        (sum, file) => sum + file.unrelatedAnchorCount,
        0,
      ),
    },
    selectionDigest,
    files,
    policyOnly,
    manifestOnly,
    blockers,
    safety: {
      readsDiffOnly: true,
      stagesFiles: false,
      commitsFiles: false,
      includesDiffContentInReport: false,
    },
  };
}

function renderList(values) {
  return values.length ? values.map((value) => "- " + value) : ["- None"];
}

function renderMarkdown(report) {
  return [
    "# Customer Referral Shared-Hunk Readiness",
    "",
    "Generated: " + report.summary.generatedAt,
    "Status: `" + report.summary.status + "`",
    "",
    "- Mixed shared files: " + report.summary.mixedFileCount,
    "- Referral anchors: " + report.summary.referralAnchorCount,
    "- Unrelated anchors: " + report.summary.unrelatedAnchorCount,
    "- Referral selection digest: `" + report.selectionDigest + "`",
    "",
    "## Blockers",
    "",
    ...renderList(report.blockers),
    "",
    "## File checks",
    "",
    ...report.files.map(
      (file) =>
        "- " +
        file.path +
        ": split=" +
        file.inSplitScope +
        "; missing referral=" +
        file.missingReferralAnchorCount +
        "; missing unrelated=" +
        file.missingUnrelatedAnchorCount +
        "; overlap=" +
        file.overlappingAnchorCount,
    ),
    "",
    "## Safety",
    "",
    "- The gate reads zero-context Git additions and policy files only.",
    "- It never stages, commits, or changes the index.",
    "- It records counts and a digest, not source or diff content.",
    "",
  ].join("\n");
}

function gateResult(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  };
}

function main() {
  const options = parseArgs();
  const root = path.resolve(options.root);
  const manifest = validateManifest(
    readJson(root, options.manifest, "hunk_policy"),
  );
  const scopePath = manifest.value?.releaseScopePolicy || "";
  const scope = readJson(root, scopePath, "release_scope_policy");
  const report = buildReport(root, manifest, scope);
  fs.writeFileSync(path.resolve(root, options.out), renderMarkdown(report), "utf8");
  fs.writeFileSync(
    path.resolve(root, options.jsonOut),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
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
  addedLines,
  buildReport,
  gateResult,
  renderMarkdown,
  validateManifest,
};
