const fs = require("fs");
const path = require("path");

const DEFAULT_JSON_OUT =
  "what-next/skills-life-cycle/stoquify-ohada-leadership-release-evidence-index-2026-07-11.json";
const DEFAULT_MARKDOWN_OUT =
  "what-next/skills-life-cycle/STOQUIFY_OHADA_LEADERSHIP_RELEASE_EVIDENCE_INDEX_2026-07-11.md";

const RUN_REPORTS = [
  [
    "stoquify-service-boundary-ratchet",
    "STOQUIFY_SERVICE_BOUNDARY_RATCHET_AUDIT_2026-07-11.md",
  ],
  [
    "stoquify-rbac-tenant-freshauth-enforcer",
    "STOQUIFY_RBAC_POS_ACTION_PERMISSION_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-public-api-abuse-boundary/upload",
    "STOQUIFY_PUBLIC_API_UPLOAD_ABUSE_BOUNDARY_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-public-api-abuse-boundary/identity",
    "STOQUIFY_PUBLIC_IDENTITY_ABUSE_CONTROL_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-ledger-close-truth-guardian",
    "STOQUIFY_LEDGER_CLOSE_TRUTH_GUARDIAN_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-payment-recon-cash-truth-moat",
    "STOQUIFY_PAYMENT_RECON_CASH_TRUTH_MOAT_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-purchasing-ap-consolidator",
    "STOQUIFY_PURCHASING_AP_CONSOLIDATOR_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-offline-pos-fiscal-replay-finalizer",
    "STOQUIFY_OFFLINE_POS_FISCAL_REPLAY_FINALIZER_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-statutory-country-pack-production-gate",
    "STOQUIFY_STATUTORY_COUNTRY_PACK_PRODUCTION_GATE_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-report-trust-export-certifier",
    "STOQUIFY_REPORT_TRUST_EXPORT_CERTIFIER_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-role-based-operating-cockpit-uiux",
    "STOQUIFY_ROLE_BASED_OPERATING_COCKPIT_UIUX_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-release-secret-provisioning-preflight",
    "STOQUIFY_RELEASE_SECRET_PROVISIONING_PREFLIGHT_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-prisma-production-migration-automation",
    "STOQUIFY_PRISMA_PRODUCTION_MIGRATION_AUTOMATION_IMPLEMENTATION_2026-07-11.md",
  ],
  [
    "stoquify-ci-release-gate-modernizer",
    "STOQUIFY_CI_RELEASE_GATE_MODERNIZER_IMPLEMENTATION_2026-07-11.md",
  ],
].map(([skill, file]) => ({
  skill,
  file: "what-next/skills-life-cycle/" + file,
}));

const READINESS_ARTIFACTS = [
  "public-identity-abuse",
  "ledger-close-truth",
  "payment-cash-truth",
  "purchasing-ap-consolidation",
  "offline-pos-fiscal-replay",
  "statutory-country-pack-production",
  "report-trust-export",
  "role-based-operating-cockpit",
  "prisma-migration-deployment",
  "ci-release",
].map((id) => ({
  id,
  json: "what-next/" + id + "-readiness.json",
  markdown: "what-next/" + id + "-readiness.md",
}));

const SUPPORTING_ARTIFACTS = [
  "what-next/api-route-guard-inventory.json",
  "what-next/api-route-guard-inventory.md",
  "what-next/module-surface-inventory.json",
  "what-next/module-surface-inventory.md",
  "what-next/settings-surface-classification.json",
  "what-next/settings-surface-classification.md",
  "what-next/release-secret-preflight.json",
  "what-next/release-secret-preflight.md",
  "prisma/migration-risk-approvals.json",
];

const REQUIRED_POLICY_GATES = [
  "service:boundary:fail",
  "api:guard:inventory:fail",
  "public-identity:abuse:gate",
  "ledger:close-truth:gate",
  "payment:cash-truth:gate",
  "purchasing:ap:gate",
  "offline:pos:replay:gate",
  "statutory:country-pack:gate",
  "report:trust:export:gate",
  "role:cockpit:gate",
  "settings:surface:fail",
  "workflow:assurance:release-gate",
  "prisma:migration:safety:gate",
  "ci:release:gate",
];
const READINESS_STATUSES = new Set(["ready", "blocked", "conditional"]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    release: "auto",
    root: process.cwd(),
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") options.mode = argv[++index];
    else if (value === "--release") options.release = argv[++index];
    else if (value === "--root") options.root = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error("Unknown argument: " + value);
  }
  if (!["report", "fail"].includes(options.mode))
    throw new Error("Unsupported mode: " + options.mode);
  if (!["auto", "on", "off"].includes(options.release))
    throw new Error("Unsupported release mode: " + options.release);
  return options;
}

function read(root, relativePath) {
  const target = path.join(root, relativePath);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
}

function releaseEnabled(value, environment) {
  if (value === "on") return true;
  if (value === "off") return false;
  return (
    environment.NODE_ENV === "production" || environment.CI_RELEASE === "1"
  );
}

function hasSafeProductionDatabaseTarget(environment) {
  try {
    const parsed = new URL(String(environment.DATABASE_URL || ""));
    return (
      ["postgres:", "postgresql:"].includes(parsed.protocol) &&
      ![
        "localhost",
        "127.0.0.1",
        "::1",
        "[::1]",
        "host.docker.internal",
      ].includes(parsed.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

function readinessSummaryIsClear(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return false;
  }
  const { status, checkCount, readyCount, blockerCount } = summary;
  const warningCount = summary.warningCount ?? 0;
  if (
    !READINESS_STATUSES.has(status) ||
    !Number.isInteger(checkCount) ||
    checkCount <= 0 ||
    !Number.isInteger(readyCount) ||
    readyCount < 0 ||
    readyCount > checkCount ||
    !Number.isInteger(blockerCount) ||
    blockerCount < 0 ||
    !Number.isInteger(warningCount) ||
    warningCount < 0
  ) {
    return false;
  }
  if (status === "ready") {
    return readyCount === checkCount && blockerCount === 0;
  }
  return readyCount < checkCount && blockerCount > 0;
}

function readinessSummaryIsReleaseReady(summary) {
  return (
    readinessSummaryIsClear(summary) &&
    summary.status === "ready" &&
    summary.readyCount === summary.checkCount &&
    summary.blockerCount === 0
  );
}

function buildReleaseEvidence(root = process.cwd(), options = {}) {
  const environment = options.environment || process.env;
  const releaseEnforced = releaseEnabled(
    options.release || "auto",
    environment,
  );
  const packageSource = read(root, "package.json");
  const packageJson = packageSource
    ? JSON.parse(packageSource)
    : { scripts: {} };

  const runReports = RUN_REPORTS.map((entry) => {
    const source = read(root, entry.file);
    return {
      ...entry,
      exists: Boolean(source),
      bytes: Buffer.byteLength(source),
      dated: /Date:\s*2026-07-11/.test(source),
      verificationRecorded: /## (Verification|Evidence)/.test(source),
      nextStepRecorded: /## (Next|Final Recommendation|Recommendation)/.test(
        source,
      ),
    };
  });

  const readiness = READINESS_ARTIFACTS.map((entry) => {
    const jsonSource = read(root, entry.json);
    let parsed = null;
    try {
      parsed = jsonSource ? JSON.parse(jsonSource) : null;
    } catch {
      parsed = null;
    }
    const summary = parsed?.summary;
    return {
      ...entry,
      jsonExists: Boolean(jsonSource),
      markdownExists: Boolean(read(root, entry.markdown)),
      parseable: Boolean(parsed),
      structurallyClear: readinessSummaryIsClear(summary),
      releaseReady: readinessSummaryIsReleaseReady(summary),
      status: summary?.status ?? null,
      readyCount: summary?.readyCount ?? null,
      checkCount: summary?.checkCount ?? null,
      blockerCount: summary?.blockerCount ?? null,
      warningCount: summary?.warningCount ?? 0,
    };
  });

  const supportingArtifacts = SUPPORTING_ARTIFACTS.map((file) => ({
    file,
    exists: Boolean(read(root, file)),
  }));
  const policySource = String(packageJson.scripts?.["policy:gates"] || "");
  const verifyReleaseSource = String(
    packageJson.scripts?.["verify:release"] || "",
  );

  const releaseConditions = [
    {
      id: "public_identity_hash_secret",
      configured:
        String(environment.PUBLIC_IDENTITY_ABUSE_HASH_SECRET || "").length >=
        32,
      requiredCommand: "release:secrets:preflight:release",
    },
    {
      id: "public_receipt_token_secret",
      configured:
        String(environment.AQSTOQFLOW_RECEIPT_TOKEN_SECRET || "").length >= 32,
      requiredCommand: "release:secrets:preflight:release",
    },
    {
      id: "history_cursor_signing_secret",
      configured:
        String(environment.AQSTOQFLOW_HISTORY_CURSOR_SECRET || "").length >= 32,
      requiredCommand: "release:secrets:preflight:release",
    },
    {
      id: "production_database_target",
      configured: hasSafeProductionDatabaseTarget(environment),
      requiredCommand: "prisma:migration:release:preflight",
    },
  ];

  const readinessReleaseBlockers = readiness
    .filter((entry) => entry.structurallyClear && !entry.releaseReady)
    .map((entry) => `readiness:${entry.id}`);
  const releaseConditionBlockers = releaseConditions
    .filter((condition) => !condition.configured)
    .map((condition) => condition.id);

  const checks = [
    {
      id: "all_skill_run_reports_present",
      ready: runReports.every((entry) => entry.exists && entry.bytes > 0),
    },
    {
      id: "run_reports_record_date_and_verification",
      ready: runReports.every(
        (entry) => entry.dated && entry.verificationRecorded,
      ),
    },
    {
      id: "readiness_json_is_parseable_and_clear",
      ready: readiness.every(
        (entry) =>
          entry.jsonExists && entry.parseable && entry.structurallyClear,
      ),
    },
    {
      id: "readiness_markdown_is_present",
      ready: readiness.every((entry) => entry.markdownExists),
    },
    {
      id: "supporting_inventory_evidence_is_present",
      ready: supportingArtifacts.every((entry) => entry.exists),
    },
    {
      id: "domain_policy_gates_are_composed",
      ready: REQUIRED_POLICY_GATES.every((gate) =>
        policySource.includes("npm run " + gate),
      ),
    },
    {
      id: "release_verification_enforces_both_secret_gates",
      ready:
        verifyReleaseSource.includes("public-identity:abuse:gate:release") &&
        verifyReleaseSource.includes("receipt:token:config-gate:release"),
    },
    {
      id: "dedicated_release_secret_preflight_is_wired",
      ready:
        packageSource.includes('"release:secrets:preflight"') &&
        packageSource.includes('"release:secrets:preflight:release"') &&
        String(packageJson.scripts?.build || "").includes(
          "release:secrets:preflight",
        ) &&
        policySource.includes("npm run release:secrets:preflight") &&
        verifyReleaseSource.includes("release:secrets:preflight:release"),
    },
    {
      id: "prisma_migration_automation_is_wired",
      ready:
        packageSource.includes('"prisma:migration:safety:gate"') &&
        packageSource.includes('"prisma:migration:release:preflight"') &&
        packageSource.includes('"prisma:migrate:deploy:safe"') &&
        String(packageJson.scripts?.build || "").includes(
          "prisma:migrate:deploy:safe",
        ) &&
        policySource.includes("npm run prisma:migration:safety:gate") &&
        verifyReleaseSource.includes("prisma:migration:release:preflight"),
    },
    {
      id: "database_backed_ci_release_gate_is_wired",
      ready:
        packageSource.includes('"ci:release:gate"') &&
        packageSource.includes('"verify:ci"') &&
        policySource.includes("npm run ci:release:gate") &&
        String(packageJson.scripts?.["verify:ci"] || "").includes(
          "prisma:migrate:deploy",
        ) &&
        String(packageJson.scripts?.["verify:ci"] || "").includes(
          "verify:repo",
        ),
    },
    {
      id: "release_evidence_gate_is_wired",
      ready:
        packageSource.includes('"release:evidence:gate"') &&
        packageSource.includes('"release:evidence:gate:release"') &&
        policySource.includes("npm run release:evidence:gate") &&
        verifyReleaseSource.includes("release:evidence:gate:release"),
    },
  ];

  const blockers = checks
    .filter((check) => !check.ready)
    .map((check) => check.id);
  const releaseBlockers = [
    ...readinessReleaseBlockers,
    ...releaseConditionBlockers,
  ];
  const status =
    blockers.length || releaseBlockers.length
      ? releaseEnforced
        ? "blocked"
        : "conditional"
      : "ready";

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      releaseEnforced,
      status,
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
      releaseConditionCount: releaseConditions.length,
      releaseBlockerCount: releaseBlockers.length,
      readinessReleaseBlockerCount: readinessReleaseBlockers.length,
      releaseConditionBlockerCount: releaseConditionBlockers.length,
      runReportCount: runReports.length,
      readinessArtifactCount: readiness.length,
      secretValuePrinted: false,
    },
    checks,
    blockers,
    releaseConditions,
    releaseBlockers,
    runReports,
    readiness,
    readinessReleaseBlockers,
    supportingArtifacts,
    releaseConditionBlockers,
    residualRisks: [
      "Completed skills are focused slices, not a certification of the entire codebase.",
      "Statutory country-pack readiness prevents unsupported claims; it is not legal certification.",
      "Accounting report exports remain internal until Close and Assurance certification signs them.",
      "The Daily Digest cockpit has no authenticated screenshot evidence in this run.",
      "External provider, authority, hardware, and production-load behavior require environment-specific evidence.",
    ],
    nextRecommendation:
      "Resolve every listed readiness and environment release blocker with real authority evidence, rerun `verify:release`, and submit the frozen evidence bundle to `017-aqstoqflow-enterprise-release-gate`.",
  };
}

function gateResultForReport(report, mode = "report") {
  const structuralFailure =
    report.summary.releaseEnforced && report.blockers.length > 0;
  const releaseFailure =
    report.summary.releaseEnforced && report.releaseBlockers.length > 0;
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && (structuralFailure || releaseFailure) ? 1 : 0,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Stoquify OHADA Leadership Release Evidence Index",
    "",
    "Date: 2026-07-11",
    "",
    "Mode: release synthesis",
    "",
    "Primary skill: stoquify-release-evidence-ratchet",
    "",
    "Status: " + report.summary.status,
    "",
    "## Scope",
    "",
    "Consolidate the completed leadership-skill sequence into durable release evidence without claiming whole-product or statutory certification.",
    "",
    "## Summary",
    "",
    "- Structural checks ready: " +
      report.summary.readyCount +
      "/" +
      report.summary.checkCount,
    "- Release enforcement: " + (report.summary.releaseEnforced ? "on" : "off"),
    "- Skill run reports: " + report.summary.runReportCount,
    "- Readiness artifacts: " + report.summary.readinessArtifactCount,
    "- Structural blockers: " + report.summary.blockerCount,
    "- Release blockers: " + report.summary.releaseBlockerCount,
    "- Readiness release blockers: " +
      report.summary.readinessReleaseBlockerCount,
    "- Environment release blockers: " +
      report.summary.releaseConditionBlockerCount,
    "- Secret values printed: no",
    "",
    "## Skill Run Evidence",
    "",
    "| Skill | Report | Present | Verification recorded | Next step recorded |",
    "| --- | --- | --- | --- | --- |",
    ...report.runReports.map(
      (entry) =>
        "| " +
        entry.skill +
        " | " +
        entry.file +
        " | " +
        (entry.exists ? "yes" : "no") +
        " | " +
        (entry.verificationRecorded ? "yes" : "no") +
        " | " +
        (entry.nextStepRecorded ? "yes" : "no") +
        " |",
    ),
    "",
    "## Readiness Evidence",
    "",
    "| Gate | Status | Checks | Blockers | Warnings |",
    "| --- | --- | ---: | ---: | ---: |",
    ...report.readiness.map(
      (entry) =>
        "| " +
        entry.id +
        " | " +
        (entry.status || "missing") +
        " | " +
        (entry.readyCount ?? 0) +
        "/" +
        (entry.checkCount ?? 0) +
        " | " +
        (entry.blockerCount ?? "-") +
        " | " +
        entry.warningCount +
        " |",
    ),
    "",
    "## Readiness Release Blockers",
    "",
    ...(report.readinessReleaseBlockers.length
      ? report.readinessReleaseBlockers.map(
          (blocker) => "- blocked: " + blocker,
        )
      : ["- None."]),
    "",
    "## Release Conditions",
    "",
    ...report.releaseConditions.map(
      (condition) =>
        "- " +
        (condition.configured ? "ready" : "blocked") +
        ": " +
        condition.id +
        " via " +
        condition.requiredCommand,
    ),
    "",
    "## Verification",
    "",
    "| Check | Result |",
    "| --- | --- |",
    ...report.checks.map(
      (check) =>
        "| " + check.id + " | " + (check.ready ? "passed" : "failed") + " |",
    ),
    "",
    "## Blockers And Residual Risk",
    "",
    ...(report.blockers.length
      ? report.blockers.map((item) => "- Structural blocker: " + item)
      : ["- No structural evidence blockers."]),
    ...report.releaseBlockers.map((item) => "- Release blocker: " + item),
    ...report.residualRisks.map((item) => "- Residual risk: " + item),
    "",
    "## Next Recommended Skill",
    "",
    "Remain on `017-aqstoqflow-enterprise-release-gate` until every release blocker is closed. Do not promote or activate from this evidence index.",
    "",
    "## Suggested Next Slice",
    "",
    report.nextRecommendation,
  ];
  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10);
}

function writeReport(root, options, report) {
  const jsonTarget = path.resolve(root, options.jsonOut);
  const markdownTarget = path.resolve(root, options.out);
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.writeFileSync(
    jsonTarget,
    JSON.stringify(report, null, 2) + String.fromCharCode(10),
    "utf8",
  );
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8");
}

if (require.main === module) {
  try {
    const options = parseArgs();
    const root = path.resolve(options.root);
    const report = buildReleaseEvidence(root, options);
    writeReport(root, options, report);
    console.log(renderMarkdown(report));
    process.exitCode = gateResultForReport(report, options.mode).exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  READINESS_ARTIFACTS,
  REQUIRED_POLICY_GATES,
  RUN_REPORTS,
  SUPPORTING_ARTIFACTS,
  buildReleaseEvidence,
  gateResultForReport,
  hasSafeProductionDatabaseTarget,
  parseArgs,
  readinessSummaryIsClear,
  readinessSummaryIsReleaseReady,
  renderMarkdown,
};
