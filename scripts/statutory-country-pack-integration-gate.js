#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_JSON_OUT =
  "what-next/statutory-country-pack-integration-readiness.json";
const DEFAULT_MARKDOWN_OUT =
  "what-next/statutory-country-pack-integration-readiness.md";

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    root: process.cwd(),
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") options.mode = argv[++index];
    else if (value === "--root") options.root = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error("Unknown argument: " + value);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Unsupported mode: " + options.mode);
  }
  return options;
}

function read(root, relativePath) {
  const target = path.join(root, relativePath);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
}

function readMigrationSources(root) {
  const migrationsRoot = path.join(root, "prisma", "migrations");
  if (!fs.existsSync(migrationsRoot)) return "";

  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsRoot, entry.name, "migration.sql"))
    .filter((target) => fs.existsSync(target))
    .sort()
    .map((target) => fs.readFileSync(target, "utf8"))
    .join("\n");
}

function packageScripts(root) {
  try {
    return JSON.parse(read(root, "package.json")).scripts ?? {};
  } catch {
    return {};
  }
}

function directNpmRunTargets(command) {
  if (typeof command !== "string") return [];
  return [...command.matchAll(/\bnpm(?:\.cmd)?\s+run\s+([^\s&|]+)/gi)].map(
    (match) => match[1],
  );
}

function integrationGateTargets(root, scripts) {
  const command = scripts["policy:gates:integration"];
  if (typeof command !== "string") return [];

  const usesManifestRunner =
    /\bnode(?:\.exe)?\s+scripts[\\/]run-policy-gates-integration\.js\b/i.test(
      command,
    );
  if (!usesManifestRunner) return directNpmRunTargets(command);

  try {
    const contract = JSON.parse(
      read(root, "scripts/policy-gates-integration-contract.json"),
    );
    if (
      contract?.version !== 1 ||
      !Array.isArray(contract.gates) ||
      contract.gates.some((gate) => typeof gate !== "string") ||
      new Set(contract.gates).size !== contract.gates.length
    ) {
      return [];
    }
    return contract.gates;
  } catch {
    return [];
  }
}

function buildCountryPackIntegrationReadiness(
  root = process.cwd(),
  options = {},
) {
  const port = read(
    root,
    "services/regulatory/ports/regulatory-capability.port.ts",
  );
  const service = read(
    root,
    "services/regulatory/regulatory-capability.service.ts",
  );
  const runtime = read(
    root,
    "services/regulatory/runtime/regulatory-runtime-class.ts",
  );
  const boundaryGate = read(root, "scripts/regulatory-boundary-gate.js");
  const fakeAdapter = read(
    root,
    "services/compliance/adapters/fake-sandbox.ts",
  );
  const cameroonAdapter = read(
    root,
    "services/compliance/adapters/cameroon-dgi-sandbox.ts",
  );
  const fiscalDocument = read(
    root,
    "services/compliance/fiscal-document.service.ts",
  );
  const certificationOutbox = read(
    root,
    "services/compliance/certification-outbox.service.ts",
  );
  const migrationSources = readMigrationSources(root);
  const scripts = packageScripts(root);
  const integrationTargets = integrationGateTargets(root, scripts);
  const promotionTargets = directNpmRunTargets(scripts["policy:gates"]);

  const checks = [
    {
      id: "regulatory_decision_contract_present",
      ready:
        port.includes('"AUTHORITATIVE"') &&
        port.includes('"NON_AUTHORITATIVE"') &&
        port.includes('"PENDING_COUNTRY_PACK"'),
    },
    {
      id: "provisional_results_are_watermarked",
      ready:
        port.includes('watermark: "NOT FOR STATUTORY USE"') &&
        service.includes('kind: "NON_AUTHORITATIVE"') &&
        service.includes('watermark: "NOT FOR STATUTORY USE"'),
    },
    {
      id: "production_resolution_fails_closed",
      ready:
        service.includes('mode === "PRODUCTION"') &&
        service.includes("AUTHORITATIVE_VERIFICATION") &&
        service.includes('"EXPERT_REVIEWED"') &&
        service.includes('"REGULATOR_CONFIRMED"') &&
        service.includes('kind: "PENDING_COUNTRY_PACK"'),
    },
    {
      id: "production_deployment_overrides_requested_mode",
      ready:
        runtime.includes("isProductionDeployment(environment)") &&
        runtime.includes('return "PRODUCTION"'),
    },
    {
      id: "direct_country_pack_imports_are_gated",
      ready:
        boundaryGate.includes("DIRECT_COUNTRY_PACK_IMPORT") &&
        boundaryGate.includes(
          "services/regulatory/regulatory-capability.service.ts",
        ),
    },
    {
      id: "sandbox_adapters_self_enforce",
      ready:
        fakeAdapter.includes('context.environment !== "FAKE_SANDBOX"') &&
        fakeAdapter.includes("productionCertification: false") &&
        cameroonAdapter.includes('context.environment !== "SANDBOX"') &&
        cameroonAdapter.includes("SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION"),
    },
    {
      id: "live_authority_paths_remain_blocked",
      ready:
        fiscalDocument.includes("ComplianceAdapterEnvironment.PRODUCTION") &&
        certificationOutbox.includes(
          "submission.environment === ComplianceAdapterEnvironment.PRODUCTION",
        ) &&
        certificationOutbox.includes('errorCode: "PRODUCTION_ADAPTER_BLOCKED"'),
    },
    {
      id: "certified_fiscal_evidence_is_database_immutable",
      ready:
        migrationSources.includes('"compliance_assert_immutable_content"') &&
        migrationSources.includes(
          '"compliance_fiscal_documents_prevent_certified_mutation"',
        ) &&
        migrationSources.includes(
          '"compliance_fiscal_document_lines_prevent_certified_parent_mutation"',
        ) &&
        migrationSources.includes(
          '"compliance_submissions_prevent_certified_document_mutation"',
        ) &&
        migrationSources.includes(
          '"compliance_evidence_prevent_certified_document_mutation"',
        ) &&
        migrationSources.includes(
          'BEFORE UPDATE OR DELETE ON "fiscal_documents"',
        ) &&
        migrationSources.includes(
          'BEFORE INSERT OR UPDATE OR DELETE ON "fiscal_document_lines"',
        ) &&
        migrationSources.includes(
          'BEFORE INSERT OR UPDATE OR DELETE ON "compliance_submissions"',
        ) &&
        migrationSources.includes(
          'BEFORE INSERT OR UPDATE OR DELETE ON "compliance_evidence"',
        ) &&
        migrationSources.includes("OLD.\"status\"::TEXT = 'CERTIFIED'"),
    },
    {
      id: "integration_and_promotion_commands_are_independent",
      ready:
        typeof scripts["statutory:country-pack:integration:gate"] ===
          "string" &&
        typeof scripts["statutory:country-pack:dev:gate"] === "string" &&
        typeof scripts["statutory:country-pack:gate"] === "string" &&
        typeof scripts["policy:gates:integration"] === "string" &&
        typeof scripts["policy:gates"] === "string" &&
        integrationTargets.includes(
          "statutory:country-pack:integration:gate",
        ) &&
        !integrationTargets.includes("statutory:country-pack:dev:gate") &&
        !integrationTargets.includes("statutory:country-pack:gate") &&
        promotionTargets.includes("statutory:country-pack:gate"),
    },
  ];

  const blockers = checks
    .filter((check) => !check.ready)
    .map((check) => check.id);

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      status:
        blockers.length === 0
          ? "READY_FOR_CORE_INTEGRATION"
          : "BLOCKED_FOR_CORE_INTEGRATION",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
    },
    scope: {
      countryPackEvidenceRequired: false,
      expertApprovalRequired: false,
      regulatorSignatureRequired: false,
      productionActivationAllowed: false,
      liveAuthoritySubmissionAllowed: false,
    },
    checks,
    blockers,
    nonClaims: [
      "Integration readiness is not country-pack development readiness.",
      "Integration readiness is not statutory or production approval.",
      "Country-pack development should separately run the evidence-bearing development gate.",
    ],
  };
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  };
}

function renderMarkdown(report) {
  return [
    "# Statutory Country Pack Core Integration Gate",
    "",
    `Generated: ${report.summary.generatedAt}`,
    `Mode: ${report.summary.mode}`,
    `Status: ${report.summary.status}`,
    "",
    "## Scope",
    "",
    "- Country-pack source packet required: false",
    "- Expert approval required: false",
    "- Regulator signature required: false",
    "- Production activation allowed: false",
    "- Live authority submission allowed: false",
    "",
    "## Checks",
    "",
    ...report.checks.map(
      (check) => `- ${check.ready ? "ready" : "blocked"}: ${check.id}`,
    ),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length
      ? report.blockers.map((blocker) => `- ${blocker}`)
      : ["- None"]),
    "",
    "## Non-claims",
    "",
    ...report.nonClaims.map((claim) => `- ${claim}`),
    "",
  ].join("\n");
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
    const report = buildCountryPackIntegrationReadiness(root, options);
    writeReport(root, options, report);
    console.log(renderMarkdown(report));
    process.exitCode = gateResultForReport(report, options.mode).exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  buildCountryPackIntegrationReadiness,
  directNpmRunTargets,
  gateResultForReport,
  integrationGateTargets,
  parseArgs,
  renderMarkdown,
};
