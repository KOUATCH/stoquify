#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  HASH_CONTRACT,
  validateManifest,
} = require("./prisma-migration-catalog-gate");
const {
  buildMigrationDeploymentHistory,
  queryHistoryRows,
} = require("./prisma-migration-history-health-check");

const DEFAULT_MARKDOWN_OUT =
  "what-next/prisma-migration-deployment-readiness.md";
const DEFAULT_JSON_OUT = "what-next/prisma-migration-deployment-readiness.json";
const DEFAULT_REVIEW_PACKET_OUT =
  "what-next/prisma-migration-risk-review-packet.md";
const APPROVALS_FILE = "prisma/migration-risk-approvals.json";
const BASELINE_BRIDGE_MIGRATION =
  "20260611130000_accounting_auth_baseline_bridge";
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "host.docker.internal",
]);
const EXPLICIT_TARGETS = new Set(["production", "staging", "preview-isolated"]);

const RISK_RULES = [
  { id: "drop_table", pattern: /\bDROP\s+TABLE\b/gi },
  { id: "drop_column", pattern: /\bDROP\s+COLUMN\b/gi },
  { id: "drop_type", pattern: /\bDROP\s+TYPE\b/gi },
  { id: "drop_schema", pattern: /\bDROP\s+SCHEMA\b/gi },
  { id: "truncate", pattern: /\bTRUNCATE(?:\s+TABLE)?\b/gi },
  { id: "delete_rows", pattern: /\bDELETE\s+FROM\b/gi },
  {
    id: "alter_column_type",
    pattern: /\bALTER\s+(?:TABLE\s+[^;]+?\s+)?COLUMN\s+[^;]+?\s+TYPE\b/gis,
  },
  { id: "rename_table_or_column", pattern: /\bRENAME\s+(?:TABLE|COLUMN)\b/gi },
];
const RISK_RULE_IDS = new Set(RISK_RULES.map((rule) => rule.id));

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    environment: "auto",
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
    reviewPacketOut: DEFAULT_REVIEW_PACKET_OUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--environment") options.environment = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else if (value === "--review-packet-out")
      options.reviewPacketOut = argv[++index];
    else throw new Error("Unknown argument: " + value);
  }

  if (!["report", "fail", "execute", "review"].includes(options.mode))
    throw new Error("Unsupported mode: " + options.mode);
  if (
    !["auto", "production", "preview", "local"].includes(options.environment)
  ) {
    throw new Error("Unsupported environment: " + options.environment);
  }
  return options;
}

function normalizeRelativePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalSql(value) {
  return String(value).replace(/\r\n/g, "\n");
}

function sqlSha256(value) {
  return sha256(canonicalSql(value));
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function isIsoTimestamp(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isHumanAuthoredText(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !/\b(?:REQUIRED|PLACEHOLDER|TBD|TODO)\b/i.test(value)
  );
}

function approvalEntryIsValid(approval) {
  const revocation = approval?.revocation;
  const revocationValid =
    revocation == null ||
    (revocation.humanAuthored === true &&
      isHumanAuthoredText(revocation.revokedBy) &&
      isHumanAuthoredText(revocation.reason) &&
      isIsoTimestamp(revocation.revokedAt));

  return Boolean(
    approval &&
    typeof approval.migration === "string" &&
    /^prisma\/migrations\/[^/]+\/migration\.sql$/.test(
      normalizeRelativePath(approval.migration),
    ) &&
    /^[a-f0-9]{64}$/.test(String(approval.migrationSha256 || "")) &&
    /^[a-f0-9]{64}$/.test(String(approval.findingSha256 || "")) &&
    RISK_RULE_IDS.has(approval.rule) &&
    approval.humanAuthored === true &&
    approval.consequenceAcknowledged === true &&
    isHumanAuthoredText(approval.approvedBy) &&
    isHumanAuthoredText(approval.reviewerRole) &&
    isHumanAuthoredText(approval.reason) &&
    isIsoTimestamp(approval.approvedAt) &&
    (approval.expiresAt == null || isIsoTimestamp(approval.expiresAt)) &&
    revocationValid,
  );
}

function listMigrationFiles(root) {
  const migrationsRoot = path.join(root, "prisma", "migrations");
  if (!fs.existsSync(migrationsRoot)) return [];
  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsRoot, entry.name, "migration.sql"))
    .filter((file) => fs.existsSync(file))
    .sort();
}

function readApprovalRegistry(root) {
  const target = path.join(root, APPROVALS_FILE);
  if (!fs.existsSync(target)) {
    return {
      exists: false,
      valid: false,
      approvals: [],
      errors: ["approval_registry_missing"],
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
    const approvals = Array.isArray(parsed.approvals) ? parsed.approvals : [];
    const errors = [];
    if (parsed.version !== 2) errors.push("approval_registry_version");
    for (const approval of approvals) {
      if (!approvalEntryIsValid(approval)) {
        errors.push("approval_registry_entry_invalid");
      }
    }
    const approvalKeys = approvals
      .filter(approvalEntryIsValid)
      .map(
        (approval) =>
          normalizeRelativePath(approval.migration) +
          ":" +
          approval.findingSha256,
      );
    if (new Set(approvalKeys).size !== approvalKeys.length) {
      errors.push("approval_registry_duplicate_entry");
    }
    return {
      exists: true,
      valid: errors.length === 0,
      approvals,
      errors: [...new Set(errors)],
    };
  } catch {
    return {
      exists: true,
      valid: false,
      approvals: [],
      errors: ["approval_registry_unparseable"],
    };
  }
}

function statementBounds(source, matchIndex) {
  const start = source.lastIndexOf(";", Math.max(0, matchIndex - 1)) + 1;
  const terminator = source.indexOf(";", matchIndex);
  return {
    start,
    end: terminator < 0 ? source.length : terminator + 1,
  };
}

function exactClauseFor(source, rule, matchIndex) {
  if (rule === "drop_column") {
    const comma = source.indexOf(",", matchIndex);
    const semicolon = source.indexOf(";", matchIndex);
    const candidates = [comma, semicolon].filter((index) => index >= 0);
    const end = candidates.length ? Math.min(...candidates) : source.length;
    return source.slice(matchIndex, end).trim();
  }
  const bounds = statementBounds(source, matchIndex);
  return source.slice(matchIndex, bounds.end).trim();
}

function destructiveObjectFor(source, rule, matchIndex, clause) {
  if (rule === "drop_column") {
    const bounds = statementBounds(source, matchIndex);
    const statementPrefix = source.slice(bounds.start, matchIndex);
    const tableMatch = statementPrefix.match(
      /\bALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+("(?:[^"]|"")+"|[A-Za-z_][\w.$]*)/i,
    );
    const columnMatch = clause.match(
      /\bDROP\s+COLUMN(?:\s+IF\s+EXISTS)?\s+("(?:[^"]|"")+"|[A-Za-z_][\w$]*)/i,
    );
    return {
      table: tableMatch?.[1] || "the altered table",
      column: columnMatch?.[1] || "the named column",
    };
  }
  if (rule === "drop_table") {
    const tableMatch = clause.match(
      /\bDROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+("(?:[^"]|"")+"|[A-Za-z_][\w.$]*)/i,
    );
    return { table: tableMatch?.[1] || "the named table" };
  }
  return {};
}

function consequenceFor(rule, object) {
  if (rule === "drop_column") {
    return (
      "Permanently removes " +
      object.table +
      "." +
      object.column +
      " and its stored values; owned indexes/constraints may also be removed."
    );
  }
  if (rule === "drop_table") {
    return (
      "Permanently removes " +
      object.table +
      " and all of its rows, indexes, triggers, and constraints."
    );
  }
  if (rule === "drop_type")
    return "Permanently removes the named database type and may invalidate dependent schema objects.";
  if (rule === "drop_schema")
    return "Permanently removes the named schema; CASCADE, when present, also removes contained objects.";
  if (rule === "truncate")
    return "Permanently removes all rows from the targeted table or tables without row-by-row recovery.";
  if (rule === "delete_rows")
    return "Permanently removes every row selected by this DELETE statement.";
  if (rule === "alter_column_type")
    return "Rewrites or coerces stored column values and can fail or lose fidelity for incompatible data.";
  return "Renames a database object and can break consumers that still use the previous name.";
}

function buildFinding(
  source,
  migration,
  migrationSha256,
  migrationRawSha256,
  rule,
  matchIndex,
) {
  const clause = exactClauseFor(source, rule, matchIndex);
  const object = destructiveObjectFor(source, rule, matchIndex, clause);
  const consequence = consequenceFor(rule, object);
  const clauseSha256 = sqlSha256(clause);
  const findingSha256 = sha256(
    [migration, migrationSha256, rule, clauseSha256, consequence].join("\n"),
  );
  return {
    migration,
    migrationSha256,
    migrationRawSha256,
    hashContractVersion: HASH_CONTRACT.version,
    rule,
    line: lineAt(source, matchIndex),
    clause,
    clauseSha256,
    findingSha256,
    consequence,
  };
}

function scanMigrationRisks(root, options = {}) {
  const files = listMigrationFiles(root);
  const registry = readApprovalRegistry(root);
  const catalogFindings = [];
  const now = new Date(options.now || Date.now());

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const migration = normalizeRelativePath(path.relative(root, file));
    const digest = sqlSha256(source);
    const rawDigest = sha256(fs.readFileSync(file));
    for (const rule of RISK_RULES) {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      for (const match of source.matchAll(pattern)) {
        catalogFindings.push(
          buildFinding(
            source,
            migration,
            digest,
            rawDigest,
            rule.id,
            match.index || 0,
          ),
        );
      }
    }
  }

  const staleApprovals = [];
  const revokedApprovals = [];
  for (const approval of registry.approvals.filter(approvalEntryIsValid)) {
    const migration = normalizeRelativePath(approval.migration);
    const currentFinding = catalogFindings.find(
      (finding) =>
        finding.migration === migration &&
        finding.migrationSha256 === approval.migrationSha256 &&
        finding.findingSha256 === approval.findingSha256 &&
        finding.rule === approval.rule,
    );
    let staleReason = null;
    const target = path.resolve(root, migration);
    if (!fs.existsSync(target)) staleReason = "migration_missing";
    else if (
      sqlSha256(fs.readFileSync(target, "utf8")) !== approval.migrationSha256
    )
      staleReason = "migration_hash_changed";
    else if (!currentFinding) staleReason = "finding_hash_missing";
    else if (
      approval.expiresAt &&
      Date.parse(approval.expiresAt) <= now.getTime()
    )
      staleReason = "approval_expired";

    if (approval.revocation) {
      revokedApprovals.push({
        migration,
        findingSha256: approval.findingSha256,
        revokedAt: approval.revocation.revokedAt,
        revokedBy: approval.revocation.revokedBy,
        reason: approval.revocation.reason,
      });
    }
    if (staleReason) {
      staleApprovals.push({
        migration,
        findingSha256: approval.findingSha256,
        reason: staleReason,
      });
    }
  }

  for (const finding of catalogFindings) {
    const approval = registry.approvals
      .filter(approvalEntryIsValid)
      .find(
        (candidate) =>
          normalizeRelativePath(candidate.migration) === finding.migration &&
          candidate.migrationSha256 === finding.migrationSha256 &&
          candidate.findingSha256 === finding.findingSha256 &&
          candidate.rule === finding.rule,
      );
    const stale = staleApprovals.some(
      (candidate) => candidate.findingSha256 === approval?.findingSha256,
    );
    finding.approvalStatus = !approval
      ? "pending"
      : approval.revocation
        ? "revoked"
        : stale
          ? "stale"
          : "approved";
    finding.approved = finding.approvalStatus === "approved";
  }

  const migrationNames = options.migrationNames
    ? new Set(options.migrationNames)
    : null;
  const findings = migrationNames
    ? catalogFindings.filter((finding) =>
        migrationNames.has(path.basename(path.dirname(finding.migration))),
      )
    : catalogFindings;

  return {
    files,
    registry,
    findings,
    catalogFindings,
    staleApprovals,
    revokedApprovals,
  };
}

function resolveEnvironment(value, environment) {
  if (value !== "auto") return value;
  const vercelEnvironment = String(environment.VERCEL_ENV || "")
    .trim()
    .toLowerCase();
  if (vercelEnvironment === "production") return "production";
  if (vercelEnvironment === "preview") return "preview";
  return "local";
}

function validateDatabaseTarget(rawUrl) {
  if (!rawUrl)
    return { configured: false, safe: false, reason: "database_url_missing" };
  try {
    const parsed = new URL(rawUrl);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      return {
        configured: true,
        safe: false,
        reason: "database_protocol_not_postgresql",
      };
    }
    if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
      return {
        configured: true,
        safe: false,
        reason: "database_target_is_local",
      };
    }
    return { configured: true, safe: true, reason: null };
  } catch {
    return { configured: true, safe: false, reason: "database_url_invalid" };
  }
}

function buildDeploymentDecision(environmentName, environment) {
  const forced = environment.AQSTOQFLOW_DEPLOY_MIGRATIONS === "1";
  const shouldDeploy = environmentName === "production" || forced;
  const attestedTarget = String(environment.AQSTOQFLOW_DATABASE_TARGET || "")
    .trim()
    .toLowerCase();
  const database = shouldDeploy
    ? validateDatabaseTarget(environment.DATABASE_URL)
    : { configured: false, safe: true, reason: null };
  const blockers = [];

  if (shouldDeploy && !database.safe) blockers.push(database.reason);
  if (
    forced &&
    environmentName !== "production" &&
    !EXPLICIT_TARGETS.has(attestedTarget)
  ) {
    blockers.push("explicit_database_target_attestation_missing");
  }
  if (
    forced &&
    environmentName === "preview" &&
    attestedTarget !== "preview-isolated"
  ) {
    blockers.push("preview_database_must_be_attested_isolated");
  }

  return {
    environment: environmentName,
    shouldDeploy,
    reason: shouldDeploy
      ? environmentName === "production"
        ? "vercel_production"
        : "explicit_opt_in"
      : "non_production_default_skip",
    databaseConfigured: database.configured,
    databaseTargetSafe: database.safe,
    targetAttestation: attestedTarget || null,
    blockers: [...new Set(blockers)],
  };
}

function buildPrismaMigrationReadiness(root = process.cwd(), options = {}) {
  const environment = options.environmentValues || process.env;
  const environmentName = resolveEnvironment(
    options.environment || "auto",
    environment,
  );
  const deployment = buildDeploymentDecision(environmentName, environment);
  const catalogManifest = validateManifest(root);
  const allMigrationNames = listMigrationFiles(root).map((file) =>
    path.basename(path.dirname(file)),
  );
  const deploymentHistory = options.deploymentHistory || null;
  const baselineBridgePending = Boolean(
    deploymentHistory?.pendingMigrationNames?.includes(
      BASELINE_BRIDGE_MIGRATION,
    ),
  );
  const existingDatabaseRequiresManualBaselineAdoption = Boolean(
    deployment.shouldDeploy &&
      baselineBridgePending &&
      deploymentHistory?.summary?.completedRowCount > 0,
  );
  let riskScopeMode;
  let riskMigrationNames;

  if (options.riskScope === "catalog") {
    riskScopeMode = "full_catalog_review";
    riskMigrationNames = allMigrationNames;
  } else if (deployment.shouldDeploy) {
    riskScopeMode = "target_pending";
    riskMigrationNames =
      deploymentHistory?.summary?.status === "ready"
        ? deploymentHistory.pendingMigrationNames
        : allMigrationNames;
  } else if (catalogManifest.manifestPresent) {
    riskScopeMode = "unmanifested_catalog_delta";
    riskMigrationNames = catalogManifest.unmanifested;
  } else {
    riskScopeMode = "legacy_full_catalog";
    riskMigrationNames = allMigrationNames;
  }

  const risk = scanMigrationRisks(root, {
    now: options.now,
    migrationNames: riskMigrationNames,
  });
  const packagePath = path.join(root, "package.json");
  const packageSource = fs.existsSync(packagePath)
    ? fs.readFileSync(packagePath, "utf8")
    : "";
  const packageJson = packageSource
    ? JSON.parse(packageSource)
    : { scripts: {} };
  const buildSource = String(packageJson.scripts?.build || "");
  const policySource = String(packageJson.scripts?.["policy:gates"] || "");
  const verifyReleaseSource = String(
    packageJson.scripts?.["verify:release"] || "",
  );
  const verifyCiSource = String(packageJson.scripts?.["verify:ci"] || "");
  const historyHealthSource = String(
    packageJson.scripts?.["prisma:migration:history:health"] || "",
  );
  const preflightIndex = buildSource.indexOf("release:secrets:preflight");
  const migrationIndex = buildSource.indexOf("prisma:migrate:deploy:safe");
  const appBuildIndex = buildSource.indexOf("build:linted");

  const checks = [
    { id: "migration_history_present", ready: risk.files.length > 0 },
    {
      id: "migration_files_nonempty",
      ready:
        risk.files.length > 0 &&
        risk.files.every((file) => fs.statSync(file).size > 0),
    },
    {
      id: "risk_approval_registry_valid",
      ready:
        risk.registry.exists &&
        risk.registry.valid &&
        risk.staleApprovals.length === 0,
    },
    {
      id: "destructive_sql_is_exact_hash_approved",
      ready: risk.findings.every((finding) => finding.approved),
    },
    {
      id: "migration_catalog_manifest_integrity",
      ready: catalogManifest.status === "ready",
    },
    {
      id: "deployment_target_is_safe",
      ready: deployment.blockers.length === 0,
    },
    {
      id: "production_build_orders_secret_migration_and_app_gates",
      ready:
        preflightIndex >= 0 &&
        migrationIndex > preflightIndex &&
        appBuildIndex > migrationIndex,
    },
    {
      id: "migration_safety_gate_is_in_policy_chain",
      ready: policySource.includes("npm run prisma:migration:safety:gate"),
    },
    {
      id: "release_verification_has_migration_preflight",
      ready: verifyReleaseSource.includes("prisma:migration:release:preflight"),
    },
    {
      id: "protected_verification_has_direct_history_health",
      ready:
        historyHealthSource.includes(
          "prisma-migration-history-health-check.js --mode fail",
        ) &&
        verifyCiSource.indexOf("npm run prisma:migrate:deploy") >= 0 &&
        verifyCiSource.indexOf("npm run prisma:migration:history:health") >
          verifyCiSource.indexOf("npm run prisma:migrate:deploy") &&
        verifyCiSource.indexOf("npm run prisma:migrate:status") >
          verifyCiSource.indexOf("npm run prisma:migration:history:health") &&
        verifyReleaseSource.indexOf("npm run prisma:migration:history:health") >
          verifyReleaseSource.indexOf(
            "npm run prisma:migration:release:preflight",
          ),
    },
  ];

  if (deployment.shouldDeploy) {
    checks.push({
      id: "target_migration_history_integrity_verified",
      ready: deploymentHistory?.summary?.status === "ready",
    });
    checks.push({
      id: "baseline_bridge_execution_path_is_safe",
      ready: !existingDatabaseRequiresManualBaselineAdoption,
    });
  }

  const blockers = [
    ...checks.filter((check) => !check.ready).map((check) => check.id),
    ...risk.registry.errors,
    ...risk.staleApprovals.map(() => "stale_migration_risk_approval"),
    ...risk.revokedApprovals.map(() => "revoked_migration_risk_approval"),
    ...catalogManifest.errors,
    ...(deployment.shouldDeploy && deploymentHistory
      ? deploymentHistory.blockers.map(
          (blocker) => `target_history_${blocker}`,
        )
      : []),
    ...(existingDatabaseRequiresManualBaselineAdoption
      ? ["baseline_bridge_manual_adoption_required"]
      : []),
    ...deployment.blockers,
  ];

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: [...new Set(blockers)].length,
      migrationCount: risk.files.length,
      riskFindingCount: risk.findings.length,
      catalogRiskFindingCount: risk.catalogFindings.length,
      approvedRiskCount: risk.findings.filter((finding) => finding.approved)
        .length,
      staleApprovalCount: risk.staleApprovals.length,
      revokedApprovalCount: risk.revokedApprovals.length,
      secretValuePrinted: false,
    },
    deployment,
    riskScope: {
      mode: riskScopeMode,
      migrationNames: riskMigrationNames,
      pendingMigrationCount:
        deploymentHistory?.pendingMigrationNames?.length ?? null,
    },
    baselinePath: {
      migration: BASELINE_BRIDGE_MIGRATION,
      pending: baselineBridgePending,
      selected:
        !deployment.shouldDeploy || !baselineBridgePending
          ? "not_applicable"
          : existingDatabaseRequiresManualBaselineAdoption
            ? "resolve_existing_manual_only"
            : "execute_empty_requires_approval",
      automaticExecutionAllowed:
        deployment.shouldDeploy &&
        baselineBridgePending &&
        !existingDatabaseRequiresManualBaselineAdoption,
    },
    targetHistory: deploymentHistory
      ? {
          status: deploymentHistory.summary.status,
          targetClass: deploymentHistory.database.targetClass,
          querySucceeded: deploymentHistory.query.succeeded,
          repositoryMigrationCount:
            deploymentHistory.summary.repositoryMigrationCount,
          completedRowCount: deploymentHistory.summary.completedRowCount,
          pendingMigrationNames: deploymentHistory.pendingMigrationNames,
          blockers: deploymentHistory.blockers,
        }
      : null,
    catalogManifest,
    execution: {
      attempted: false,
      status: deployment.shouldDeploy ? "pending" : "skipped",
      exitCode: null,
    },
    checks,
    findings: risk.findings,
    catalogFindings: risk.catalogFindings,
    staleApprovals: risk.staleApprovals,
    revokedApprovals: risk.revokedApprovals,
    blockers: [...new Set(blockers)],
  };
}

async function preparePrismaMigrationReadiness(
  root = process.cwd(),
  options = {},
) {
  const environment = options.environmentValues || process.env;
  const environmentName = resolveEnvironment(
    options.environment || "auto",
    environment,
  );
  const deployment = buildDeploymentDecision(environmentName, environment);
  let deploymentHistory = options.deploymentHistory || null;

  if (
    deployment.shouldDeploy &&
    deployment.databaseTargetSafe &&
    !deploymentHistory
  ) {
    const historyQuery = options.historyQuery || queryHistoryRows;
    const query = await historyQuery(environment.DATABASE_URL);
    deploymentHistory = buildMigrationDeploymentHistory(root, {
      mode: "fail",
      databaseUrl: environment.DATABASE_URL,
      rows: query.rows,
      querySucceeded: query.succeeded,
      queryErrorCode: query.errorCode,
    });
  }

  return buildPrismaMigrationReadiness(root, {
    ...options,
    environment: environmentName,
    environmentValues: environment,
    deploymentHistory,
  });
}

function executeMigration(report, options = {}) {
  if (report.blockers.length || !report.deployment.shouldDeploy) return report;
  const runner = options.runner || spawnSync;
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const runnerOptions = {
    cwd: options.root || process.cwd(),
    env: options.environmentValues || process.env,
    stdio: "inherit",
    shell: false,
  };
  const deployResult = runner(
    command,
    ["run", "prisma:migrate:deploy"],
    runnerOptions,
  );
  const deploySucceeded = !deployResult.error && deployResult.status === 0;

  report.execution = {
    attempted: true,
    deployStatus: deploySucceeded ? "succeeded" : "failed",
    deployExitCode: deployResult.status ?? 1,
    historyCheckAttempted: false,
    historyCheckStatus: "not_attempted",
    historyCheckExitCode: null,
    status: deploySucceeded ? "pending_history_check" : "failed",
    exitCode: deployResult.status ?? 1,
  };

  if (deploySucceeded) {
    const historyResult = runner(
      command,
      ["run", "prisma:migration:history:health"],
      runnerOptions,
    );
    const historySucceeded = !historyResult.error && historyResult.status === 0;
    report.execution = {
      ...report.execution,
      historyCheckAttempted: true,
      historyCheckStatus: historySucceeded ? "succeeded" : "failed",
      historyCheckExitCode: historyResult.status ?? 1,
      status: historySucceeded ? "succeeded" : "failed",
      exitCode: historyResult.status ?? 1,
    };
  }

  if (report.execution.status === "failed") {
    const blocker = deploySucceeded
      ? "migration_history_health_failed"
      : "migration_deploy_failed";
    report.blockers = [...new Set([...report.blockers, blocker])];
    report.summary.blockerCount = report.blockers.length;
    report.summary.status = "blocked";
  }
  return report;
}
function renderMarkdown(report, mode = "report") {
  const lines = [
    "# Prisma Migration Deployment Readiness",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: `" + mode + "`",
    "Status: `" + report.summary.status + "`",
    "",
    "## Summary",
    "",
    "- Checks ready: " +
      report.summary.readyCount +
      "/" +
      report.summary.checkCount,
    "- Migrations: " + report.summary.migrationCount,
    "- Risk findings in active scope: " + report.summary.riskFindingCount,
    "- Risk findings in full catalog: " +
      report.summary.catalogRiskFindingCount,
    "- Approved risks: " + report.summary.approvedRiskCount,
    "- Stale approvals: " + report.summary.staleApprovalCount,
    "- Revoked approvals: " + report.summary.revokedApprovalCount,
    "- Blockers: " + report.summary.blockerCount,
    "- Secret values printed: no",
    "",
    "## Deployment Decision",
    "",
    "- Environment: `" + report.deployment.environment + "`",
    "- Action: `" + (report.deployment.shouldDeploy ? "deploy" : "skip") + "`",
    "- Reason: `" + report.deployment.reason + "`",
    "- Database URL configured: " +
      (report.deployment.databaseConfigured ? "yes" : "no"),
    "- Database target safe: " +
      (report.deployment.databaseTargetSafe ? "yes" : "no"),
    "- Execution: `" + report.execution.status + "`",
    "- Risk scope: `" + report.riskScope.mode + "`",
    "- Scoped migrations: " + report.riskScope.migrationNames.length,
    "- Baseline path: `" + report.baselinePath.selected + "`",
    "- Automatic baseline execution allowed: " +
      (report.baselinePath.automaticExecutionAllowed ? "yes" : "no"),
    "",
    "## Target History",
    "",
    ...(report.targetHistory
      ? [
          "- Status: `" + report.targetHistory.status + "`",
          "- Target class: `" + report.targetHistory.targetClass + "`",
          "- Query succeeded: " +
            (report.targetHistory.querySucceeded ? "yes" : "no"),
          "- Repository migrations: " +
            report.targetHistory.repositoryMigrationCount,
          "- Completed migrations: " +
            report.targetHistory.completedRowCount,
          "- Pending migrations: " +
            report.targetHistory.pendingMigrationNames.length,
        ]
      : ["- Not required for this non-deployment scan."]),
    "",
    "## Catalog Manifest",
    "",
    "- Status: `" + report.catalogManifest.status + "`",
    "- Hash contract: `" + report.catalogManifest.hashContract.version + "`",
    "- Catalog SHA-256: `" + report.catalogManifest.catalogSha256 + "`",
    "- Grandfathered timestamp collisions: " +
      report.catalogManifest.duplicateTimestamps.filter(
        (finding) => finding.grandfathered,
      ).length,
    "",
    "## Checks",
    "",
    ...report.checks.map(
      (check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id,
    ),
    "",
    "## Risk Findings",
    "",
    ...(report.findings.length
      ? report.findings.map(
          (finding) =>
            "- " +
            (finding.approved ? "approved" : "blocked") +
            ": " +
            finding.rule +
            " in " +
            finding.migration +
            ":" +
            finding.line +
            " (`" +
            finding.findingSha256 +
            "`)",
        )
      : ["- No destructive SQL patterns detected in the active scope."]),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length
      ? report.blockers.map((blocker) => "- " + blocker)
      : ["- None"]),
    "",
    "## Safety",
    "",
    "- Local and preview deployments skip database mutation by default.",
    "- Production deployment requires a non-local PostgreSQL DATABASE_URL supplied through the process environment.",
    "- Each approved destructive finding is independently bound to the exact migration and SQL-clause hashes.",
    "- Full-catalog history integrity is evaluated separately from target-pending destructive execution risk.",
    "- Revoked, expired, hash-drifted, and missing-finding approvals remain blocked.",
    "- Database URLs and credentials are never written to evidence.",
  ];
  return lines.join("\n") + "\n";
}

function markdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function renderRiskReviewPacket(report) {
  const pendingCount = report.findings.filter(
    (finding) => !finding.approved,
  ).length;
  const lines = [
    "# Destructive SQL Risk Review Packet",
    "",
    "Generated: " + report.summary.generatedAt,
    "Decision status: `" +
      report.summary.approvedRiskCount +
      "/" +
      report.summary.riskFindingCount +
      " approved`; `" +
      pendingCount +
      "` require a current human decision.",
    "",
    "This packet is review evidence only. It does not approve a finding, execute SQL, or authorize deployment. The generator never writes `prisma/migration-risk-approvals.json`.",
    "",
    "## Exact findings",
    "",
    "| # | State | Rule / location | Exact SQL clause | Consequence | Finding SHA-256 |",
    "|---:|---|---|---|---|---|",
    ...report.findings.map(
      (finding, index) =>
        "| " +
        (index + 1) +
        " | `" +
        finding.approvalStatus +
        "` | `" +
        finding.rule +
        "`<br>`" +
        finding.migration +
        ":" +
        finding.line +
        "` | `" +
        markdownCell(finding.clause) +
        "` | " +
        markdownCell(finding.consequence) +
        " | `" +
        finding.findingSha256 +
        "` |",
    ),
    "",
    "## Hash and decision contract",
    "",
    "- Hash contract: `" + HASH_CONTRACT.version + "`.",
    ...[
      ...new Map(
        report.findings.map((finding) => [
          finding.migration,
          {
            canonical: finding.migrationSha256,
            raw: finding.migrationRawSha256,
          },
        ]),
      ),
    ].flatMap(([migration, digests]) => [
      "- `" + migration + "` canonical LF approval SHA-256: `" + digests.canonical + "`",
      "- `" + migration + "` raw-byte transport SHA-256: `" + digests.raw + "`",
    ]),
    "- Finding SHA-256 is SHA-256 of `migration path`, `migration SHA-256`, `rule`, `clause SHA-256`, and `consequence`, joined in that order by LF with no trailing LF.",
    "- One registry entry is required per finding SHA-256; rule-level or migration-wide blanket approvals are rejected.",
    "- A reviewer must manually author `humanAuthored`, identity, role, rationale, consequence acknowledgement, and UTC timestamp fields in the registry.",
    "- Approval hashes use UTF-8 SQL with line endings canonicalized to LF; raw-byte hashes provide transport integrity. Any non-line-ending SQL change makes the old entry stale.",
    "- An optional `expiresAt` in the past also makes an approval stale.",
    "- Adding a human-authored `revocation` object preserves the original decision but immediately makes the finding unapproved.",
    "",
    "## Required human review",
    "",
    "Before authoring any approval, independently verify the target schema/data state, authentication compatibility, backup/restore evidence, and fix-forward plan. Existing non-empty databases must follow the migration's guarded adoption decision; this packet does not authorize `migrate resolve` or execution.",
  ];

  if (report.staleApprovals.length) {
    lines.push(
      "",
      "## Stale approvals",
      "",
      ...report.staleApprovals.map(
        (approval) =>
          "- `" +
          approval.findingSha256 +
          "` in `" +
          approval.migration +
          "`: `" +
          approval.reason +
          "`",
      ),
    );
  }
  if (report.revokedApprovals.length) {
    lines.push(
      "",
      "## Revoked approvals",
      "",
      ...report.revokedApprovals.map(
        (approval) =>
          "- `" +
          approval.findingSha256 +
          "` revoked by " +
          approval.revokedBy +
          " at `" +
          approval.revokedAt +
          "`: " +
          approval.reason,
      ),
    );
  }
  return lines.join("\n") + "\n";
}

function writeReport(root, options, report) {
  const markdownTarget = path.resolve(root, options.out);
  const jsonTarget = path.resolve(root, options.jsonOut);
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.writeFileSync(
    markdownTarget,
    renderMarkdown(report, options.mode),
    "utf8",
  );
  fs.writeFileSync(jsonTarget, JSON.stringify(report, null, 2) + "\n", "utf8");
}

function writeRiskReviewPacket(root, options, report) {
  const target = path.resolve(root, options.reviewPacketOut);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, renderRiskReviewPacket(report), "utf8");
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode:
      !["report", "review"].includes(mode) && report.blockers.length ? 1 : 0,
  };
}

async function main() {
  const options = parseArgs();
  const root = path.resolve(options.root);
  let report = await preparePrismaMigrationReadiness(root, {
    environment: options.environment,
    riskScope: options.mode === "review" ? "catalog" : undefined,
  });
  if (options.mode === "execute") report = executeMigration(report, { root });
  if (options.mode === "review") {
    writeRiskReviewPacket(root, options, report);
    console.log(renderRiskReviewPacket(report));
  } else {
    writeReport(root, options, report);
    console.log(renderMarkdown(report, options.mode));
  }
  process.exitCode = gateResultForReport(report, options.mode).exitCode;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  buildDeploymentDecision,
  buildPrismaMigrationReadiness,
  executeMigration,
  gateResultForReport,
  parseArgs,
  preparePrismaMigrationReadiness,
  renderMarkdown,
  renderRiskReviewPacket,
  resolveEnvironment,
  scanMigrationRisks,
  validateDatabaseTarget,
};
