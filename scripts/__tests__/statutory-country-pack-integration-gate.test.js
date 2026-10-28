const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildCountryPackIntegrationReadiness,
  gateResultForReport,
} = require("../statutory-country-pack-integration-gate");

function write(root, relativePath, source) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source, "utf8");
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "country-pack-core-"));
  write(
    root,
    "services/regulatory/ports/regulatory-capability.port.ts",
    '"AUTHORITATIVE" "NON_AUTHORITATIVE" "PENDING_COUNTRY_PACK" watermark: "NOT FOR STATUTORY USE"',
  );
  write(
    root,
    "services/regulatory/regulatory-capability.service.ts",
    'kind: "NON_AUTHORITATIVE" watermark: "NOT FOR STATUTORY USE" mode === "PRODUCTION" AUTHORITATIVE_VERIFICATION "EXPERT_REVIEWED" "REGULATOR_CONFIRMED" kind: "PENDING_COUNTRY_PACK"',
  );
  write(
    root,
    "services/regulatory/runtime/regulatory-runtime-class.ts",
    'isProductionDeployment(environment) return "PRODUCTION"',
  );
  write(
    root,
    "scripts/regulatory-boundary-gate.js",
    "DIRECT_COUNTRY_PACK_IMPORT services/regulatory/regulatory-capability.service.ts",
  );
  write(
    root,
    "services/compliance/adapters/fake-sandbox.ts",
    'context.environment !== "FAKE_SANDBOX" productionCertification: false',
  );
  write(
    root,
    "services/compliance/adapters/cameroon-dgi-sandbox.ts",
    'context.environment !== "SANDBOX" SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION',
  );
  write(
    root,
    "services/compliance/fiscal-document.service.ts",
    "ComplianceAdapterEnvironment.PRODUCTION",
  );
  write(
    root,
    "services/compliance/certification-outbox.service.ts",
    'submission.environment === ComplianceAdapterEnvironment.PRODUCTION errorCode: "PRODUCTION_ADAPTER_BLOCKED"',
  );
  write(
    root,
    "prisma/migrations/20260801153000_certified_fiscal_evidence_immutability/migration.sql",
    [
      "CREATE OR REPLACE FUNCTION \"compliance_assert_immutable_content\"() RETURNS VOID AS $$ BEGIN END; $$ LANGUAGE plpgsql;",
      "CREATE OR REPLACE FUNCTION \"compliance_fiscal_documents_prevent_certified_mutation\"() RETURNS TRIGGER AS $$ BEGIN IF OLD.\"status\"::TEXT = 'CERTIFIED' THEN RETURN NEW; END IF; END; $$ LANGUAGE plpgsql;",
      "CREATE OR REPLACE FUNCTION \"compliance_fiscal_document_lines_prevent_certified_parent_mutation\"() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;",
      "CREATE OR REPLACE FUNCTION \"compliance_submissions_prevent_certified_document_mutation\"() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;",
      "CREATE OR REPLACE FUNCTION \"compliance_evidence_prevent_certified_document_mutation\"() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;",
      "CREATE TRIGGER \"compliance_fiscal_documents_prevent_certified_mutation_trigger\" BEFORE UPDATE OR DELETE ON \"fiscal_documents\" FOR EACH ROW EXECUTE FUNCTION \"compliance_fiscal_documents_prevent_certified_mutation\"();",
      "CREATE TRIGGER \"compliance_fiscal_document_lines_prevent_certified_parent_mutation_trigger\" BEFORE INSERT OR UPDATE OR DELETE ON \"fiscal_document_lines\" FOR EACH ROW EXECUTE FUNCTION \"compliance_fiscal_document_lines_prevent_certified_parent_mutation\"();",
      "CREATE TRIGGER \"compliance_submissions_prevent_certified_document_mutation_trigger\" BEFORE INSERT OR UPDATE OR DELETE ON \"compliance_submissions\" FOR EACH ROW EXECUTE FUNCTION \"compliance_submissions_prevent_certified_document_mutation\"();",
      "CREATE TRIGGER \"compliance_evidence_prevent_certified_document_mutation_trigger\" BEFORE INSERT OR UPDATE OR DELETE ON \"compliance_evidence\" FOR EACH ROW EXECUTE FUNCTION \"compliance_evidence_prevent_certified_document_mutation\"();",
    ].join("\n"),
  );
  write(
    root,
    "package.json",
    JSON.stringify({
      scripts: {
        "statutory:country-pack:integration:gate": "node integration",
        "statutory:country-pack:dev:gate": "node development",
        "statutory:country-pack:gate": "node production",
        "policy:gates:integration":
          "npm run regulatory:boundary:fail && npm run statutory:country-pack:integration:gate",
        "policy:gates":
          "npm run regulatory:boundary:fail && npm run statutory:country-pack:gate",
      },
    }),
  );
  return root;
}

test("core integration passes without any country-pack evidence directory", () => {
  const root = fixture();
  const report = buildCountryPackIntegrationReadiness(root, { mode: "fail" });
  expect(report.summary).toMatchObject({
    status: "READY_FOR_CORE_INTEGRATION",
    readyCount: 9,
    blockerCount: 0,
  });
  expect(report.scope).toMatchObject({
    countryPackEvidenceRequired: false,
    expertApprovalRequired: false,
    regulatorSignatureRequired: false,
    productionActivationAllowed: false,
  });
  expect(gateResultForReport(report, "fail").exitCode).toBe(0);
});

test("core integration fails when provisional output loses its watermark", () => {
  const root = fixture();
  write(
    root,
    "services/regulatory/ports/regulatory-capability.port.ts",
    '"AUTHORITATIVE" "NON_AUTHORITATIVE" "PENDING_COUNTRY_PACK"',
  );
  expect(buildCountryPackIntegrationReadiness(root).blockers).toContain(
    "provisional_results_are_watermarked",
  );
});

test("core integration fails when production can use the development gate", () => {
  const root = fixture();
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  packageJson.scripts["policy:gates:integration"] =
    "npm run statutory:country-pack:dev:gate";
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(packageJson),
    "utf8",
  );
  expect(buildCountryPackIntegrationReadiness(root).blockers).toContain(
    "integration_and_promotion_commands_are_independent",
  );
});

test("core integration validates the retry runner through its declarative contract", () => {
  const root = fixture();
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  packageJson.scripts["policy:gates:integration"] =
    "node scripts/run-policy-gates-integration.js";
  write(root, "package.json", JSON.stringify(packageJson));
  write(
    root,
    "scripts/policy-gates-integration-contract.json",
    JSON.stringify({
      version: 1,
      gates: [
        "regulatory:boundary:fail",
        "statutory:country-pack:integration:gate",
      ],
    }),
  );

  expect(buildCountryPackIntegrationReadiness(root).blockers).not.toContain(
    "integration_and_promotion_commands_are_independent",
  );
});

test("core integration rejects a retry runner contract containing a promotion gate", () => {
  const root = fixture();
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  packageJson.scripts["policy:gates:integration"] =
    "node scripts/run-policy-gates-integration.js";
  write(root, "package.json", JSON.stringify(packageJson));
  write(
    root,
    "scripts/policy-gates-integration-contract.json",
    JSON.stringify({
      version: 1,
      gates: [
        "statutory:country-pack:integration:gate",
        "statutory:country-pack:gate",
      ],
    }),
  );

  expect(buildCountryPackIntegrationReadiness(root).blockers).toContain(
    "integration_and_promotion_commands_are_independent",
  );
});
test("core integration fails when production authority rejection disappears", () => {
  const root = fixture();
  write(
    root,
    "services/compliance/certification-outbox.service.ts",
    "no production guard",
  );
  expect(buildCountryPackIntegrationReadiness(root).blockers).toContain(
    "live_authority_paths_remain_blocked",
  );
});


test("core integration fails when certified fiscal evidence database immutability is missing", () => {
  const root = fixture();
  fs.rmSync(path.join(root, "prisma"), { recursive: true, force: true });

  expect(buildCountryPackIntegrationReadiness(root).blockers).toContain(
    "certified_fiscal_evidence_is_database_immutable",
  );
});
