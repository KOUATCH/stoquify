#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const requiredFiles = [
  "services/agents/command-agent-contracts.ts",
  "services/agents/agent-rollout.service.ts",
  "services/agents/agent-definition.service.ts",
  "services/agents/tools/command-tool-adapters.ts",
  "services/agents/skills/role-daily-brief.skill.ts",
  "services/agents/agent-output-validator.service.ts",
  "services/agents/agent-execution-control.service.ts",
  "services/agents/agent-reconciler-auth.service.ts",
  "services/agents/agent-reconciler-invocation.service.ts",
  "services/agents/command-agent.service.ts",
  "actions/agents/command-agent.actions.ts",
  "components/agents/AgentCommandPanel.tsx",
  "app/api/internal/agents/reconcile-abandoned/route.ts",
  "scripts/agent-enabled-pilot-browser-report.ts",
  "scripts/agent-enabled-pilot-e2e-bootstrap.ts",
  "scripts/run-agent-reconciler-schedule.js",
  "scripts/run-agent-reconciler-postgres-smoke.js",
  "scripts/agent-operational-release-gate.js",
  "scripts/agent-phased-execution-requirements-gate.js",
  "scripts/agent-phase2a-freeze-commit-gate.js",
  "scripts/agent-reconciler-evidence-capture.js",
  "scripts/agent-scheduler-deployment-evidence-capture.js",
  "scripts/agent-alert-evidence-capture.js",
  "scripts/__tests__/agent-reconciler-evidence-capture.test.js",
  "scripts/__tests__/agent-scheduler-deployment-evidence-capture.test.js",
  "scripts/agent-governance-evidence-capture.js",
  "scripts/__tests__/agent-alert-evidence-capture.test.js",
  "scripts/agent-ci-release-evidence-capture.js",
  "scripts/agent-credential-rotation-evidence-capture.js",
  "scripts/__tests__/agent-governance-evidence-capture.test.js",
  "scripts/__tests__/agent-ci-release-evidence-capture.test.js",
  "scripts/__tests__/agent-credential-rotation-evidence-capture.test.js",
  "scripts/__tests__/agent-operational-release-gate.test.js",
  "scripts/__tests__/agent-phased-execution-requirements-gate.test.js",
  "scripts/__tests__/agent-phase2a-freeze-commit-gate.test.js",
  "scripts/run-agent-enabled-pilot-e2e.js",
  "scripts/seed-command-agent-cross-tenant-e2e-user.js",
  "tests/e2e/command-agent-enabled-pilot.spec.ts",
  "tests/e2e/command-agent-release-degradation.spec.ts",
  "tests/e2e/command-agent-kill-switch.spec.ts",
  "prisma/migrations/20260722161000_agent_runtime_phase_2a_operational_controls/migration.sql",
  "prisma/migrations/20260724193000_agent_reconciler_invocation_ledger/migration.sql",
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json",
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_CANDIDATE_FILE_MANIFEST_2026-07-25.json",
];
const prohibitedDependencies = [
  "ai",
  "@ai-sdk/",
  "langchain",
  "inngest",
  "@trigger.dev/",
  "langfuse",
  "helicone",
  "litellm",
  "@modelcontextprotocol/",
];

function main() {
  const findings = [];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(root, file)))
      findings.push(`Required Phase 2A file is missing: ${file}`);
  }

  const toolFile = read("services/agents/tools/command-tool-adapters.ts");
  if (!toolFile.includes("key: READ_ROLE_DAILY_DIGEST_TOOL_KEY")) {
    findings.push(
      "Phase 2A must register only the narrow role Daily Digest tool.",
    );
  }
  if (
    !toolFile.includes('toolType: "read_only"') ||
    !toolFile.includes('riskLevel: "read_only"')
  ) {
    findings.push("The Phase 2A command tool must remain read-only.");
  }

  const actionFile = read("actions/agents/command-agent.actions.ts");
  const contractFile = read("services/agents/command-agent-contracts.ts");
  for (const forbiddenInput of [
    "organizationId:",
    "toolKey:",
    "toolInput:",
    "prompt:",
  ]) {
    if (contractFile.includes(forbiddenInput)) {
      findings.push(
        `Command Agent action exposes forbidden generic input: ${forbiddenInput}`,
      );
    }
  }
  if (!actionFile.includes('tenantGuard: "handler-derived"')) {
    findings.push(
      "Command Agent actions must derive tenant identity from protected server context.",
    );
  }

  const serviceFile = read("services/agents/command-agent.service.ts");
  if (serviceFile.includes("@/prisma/db"))
    findings.push(
      "Command Agent orchestration must not import Prisma directly.",
    );
  if (
    !serviceFile.includes("validate") &&
    !read("services/agents/skills/role-daily-brief.skill.ts").includes(
      "validateAndRedactCommandBrief",
    )
  ) {
    findings.push(
      "Command Agent output validation and redaction are not structurally wired.",
    );
  }

  const packageJson = JSON.parse(read("package.json"));
  const operationalReleaseGate = read(
    "scripts/agent-operational-release-gate.js",
  );
  const phasedExecutionRequirementsGate = read(
    "scripts/agent-phased-execution-requirements-gate.js",
  );
  const phase2aFreezeCommitGate = read(
    "scripts/agent-phase2a-freeze-commit-gate.js",
  );
  const reconcilerEvidenceCapture = read(
    "scripts/agent-reconciler-evidence-capture.js",
  );
  const schedulerDeploymentEvidenceCapture = read(
    "scripts/agent-scheduler-deployment-evidence-capture.js",
  );
  const alertEvidenceCapture = read("scripts/agent-alert-evidence-capture.js");
  const governanceEvidenceCapture = read(
    "scripts/agent-governance-evidence-capture.js",
  );
  const ciReleaseEvidenceCapture = read(
    "scripts/agent-ci-release-evidence-capture.js",
  );
  const credentialRotationEvidenceCapture = read(
    "scripts/agent-credential-rotation-evidence-capture.js",
  );
  const credentialRotationRegister = read(
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json",
  );
  const operationalReleaseRegister = read(
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json",
  );
  if (
    !packageJson.scripts?.["agent:operational-release:report"] ||
    !packageJson.scripts?.["agent:operational-release:gate"] ||
    !packageJson.scripts?.["agent:phased-execution:audit:report"] ||
    !packageJson.scripts?.["agent:phased-execution:audit:gate"] ||
    !packageJson.scripts?.["agent:phase2a:freeze:report"] ||
    !packageJson.scripts?.["agent:phase2a:freeze:gate"] ||
    !packageJson.scripts?.["agent:reconciler:evidence:report"] ||
    !packageJson.scripts?.["agent:reconciler:evidence:gate"] ||
    !packageJson.scripts?.["agent:reconciler:evidence:apply"] ||
    !packageJson.scripts?.["agent:scheduler:evidence:report"] ||
    !packageJson.scripts?.["agent:scheduler:evidence:gate"] ||
    !packageJson.scripts?.["agent:scheduler:evidence:apply"] ||
    !packageJson.scripts?.["agent:alert:evidence:report"] ||
    !packageJson.scripts?.["agent:alert:evidence:gate"] ||
    !packageJson.scripts?.["agent:alert:evidence:apply"] ||
    !packageJson.scripts?.["agent:governance:evidence:report"] ||
    !packageJson.scripts?.["agent:governance:evidence:gate"] ||
    !packageJson.scripts?.["agent:governance:evidence:apply"] ||
    !packageJson.scripts?.["agent:ci-release:evidence:report"] ||
    !packageJson.scripts?.["agent:ci-release:evidence:gate"] ||
    !packageJson.scripts?.["agent:ci-release:evidence:apply"] ||
    !packageJson.scripts?.["agent:credential-rotation:evidence:report"] ||
    !packageJson.scripts?.["agent:credential-rotation:evidence:gate"] ||
    !packageJson.scripts?.["agent:credential-rotation:evidence:apply"] ||
    !packageJson.scripts?.["verify:release"]?.includes(
      "npm run agent:credential-rotation:gate",
    ) ||
    !packageJson.scripts?.["verify:release"]?.includes(
      "npm run agent:operational-release:gate",
    ) ||
    !packageJson.scripts?.["verify:release"]?.includes(
      "npm run agent:phased-execution:audit:gate",
    ) ||
    !packageJson.scripts?.["verify:release"]?.includes(
      "npm run agent:phase2a:freeze:gate",
    ) ||
    !operationalReleaseGate.includes("READY_FOR_INDEPENDENT_REVIEW") ||
    !operationalReleaseGate.includes("activationAuthorized: false") ||
    !operationalReleaseGate.includes("evaluateRotationRegister") ||
    !phasedExecutionRequirementsGate.includes("authorizedScopeComplete") ||
    !phasedExecutionRequirementsGate.includes("fullProgramComplete: false") ||
    !phasedExecutionRequirementsGate.includes("activationAuthorized: false") ||
    !phasedExecutionRequirementsGate.includes("phase3Authorized: false") ||
    !phase2aFreezeCommitGate.includes("evaluateFreezeCommit") ||
    !phase2aFreezeCommitGate.includes("activationAuthorized: false") ||
    !phase2aFreezeCommitGate.includes("phase3Authorized: false") ||
    !phase2aFreezeCommitGate.includes(
      "STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_CANDIDATE_FILE_MANIFEST_2026-07-25.json",
    ) ||
    !reconcilerEvidenceCapture.includes(
      "authorizationHeadersRetained: false",
    ) ||
    !reconcilerEvidenceCapture.includes("applyCaptureToOperationalRegister") ||
    !schedulerDeploymentEvidenceCapture.includes(
      "authorizationHeadersRetained: false",
    ) ||
    !schedulerDeploymentEvidenceCapture.includes(
      "applyCaptureToOperationalRegister",
    ) ||
    !alertEvidenceCapture.includes("authorizationHeadersRetained: false") ||
    !alertEvidenceCapture.includes("applyCaptureToOperationalRegister") ||
    !governanceEvidenceCapture.includes(
      "localDatabaseIdentitiesAccepted: false",
    ) ||
    !governanceEvidenceCapture.includes("applyCaptureToOperationalRegister") ||
    !ciReleaseEvidenceCapture.includes("activationAuthorized: false") ||
    !ciReleaseEvidenceCapture.includes("applyCaptureToOperationalRegister") ||
    !credentialRotationEvidenceCapture.includes(
      "authorizationHeadersRetained: false",
    ) ||
    !credentialRotationEvidenceCapture.includes("applyCaptureToRegisters") ||
    !operationalReleaseRegister.includes('"readinessEvidenceSha256": null') ||
    !operationalReleaseRegister.includes('"deploymentEvidenceSha256": null') ||
    !operationalReleaseRegister.includes(
      '"deploymentAuthorityInvalidAuthEvidenceReference": null',
    ) ||
    !operationalReleaseRegister.includes('"governance": {') ||
    !operationalReleaseRegister.includes('"sourceSystemReference": null') ||
    !operationalReleaseRegister.includes(
      '"packageCertificationReference": null',
    ) ||
    !operationalReleaseRegister.includes('"ciEvidenceSha256": null') ||
    !operationalReleaseRegister.includes('"attestationReference": null') ||
    !credentialRotationRegister.includes('"authority": {') ||
    !credentialRotationRegister.includes('"releaseBinding": {') ||
    !credentialRotationRegister.includes(
      '"invalidAuthEvidenceReference": null',
    ) ||
    !operationalReleaseRegister.includes('"evidenceSha256": null') ||
    !operationalReleaseRegister.includes('"requested": false') ||
    !operationalReleaseRegister.includes('"authorized": false') ||
    !operationalReleaseRegister.includes('"activatedAt": null')
  ) {
    findings.push(
      "Phase 2A release verification must bind real operational evidence, credential rotation, and a permanently separate activation ceremony.",
    );
  }
  const runnerFile = read("services/agents/agent-runner.service.ts");
  if (
    !runnerFile.includes(
      "agentDefinitionId: input.provenance.agentDefinitionId",
    )
  ) {
    findings.push(
      "Agent run provenance must be persisted in the initial run insert.",
    );
  }
  if (!runnerFile.includes("agentExecutionFailureCode(error) ??")) {
    findings.push(
      "Typed agent timeout failures must survive the runner boundary.",
    );
  }
  if (!serviceFile.includes("isAgentRunCorrelationConflict")) {
    findings.push(
      "Command Agent must recover same-scope correlation races safely.",
    );
  }

  const prismaSchema = read("prisma/schema.prisma");
  if (
    !prismaSchema.includes(
      "@@unique([organizationId, actorId, agentKey, correlationId])",
    )
  ) {
    findings.push(
      "Agent run correlation uniqueness must include tenant, actor, and agent scope.",
    );
  }

  const reconcilerRoute = read(
    "app/api/internal/agents/reconcile-abandoned/route.ts",
  );
  if (
    !reconcilerRoute.includes("STOQUIFY_AGENT_RECONCILER_SECRET") ||
    !reconcilerRoute.includes("STOQUIFY_AGENT_RECONCILER_SECRET_PREVIOUS") ||
    !reconcilerRoute.includes("reconcileAbandonedAgentRuns") ||
    !reconcilerRoute.includes("x-stoquify-scheduler-run-id") ||
    !reconcilerRoute.includes("beginAgentReconcilerInvocation") ||
    !reconcilerRoute.includes("completeAgentReconcilerInvocation") ||
    !reconcilerRoute.includes("getAgentReconcilerReadiness")
  ) {
    findings.push(
      "Agent reconciliation needs authenticated, replay-safe, overlap-safe schedule evidence and readiness.",
    );
  }
  const invocationService = read(
    "services/agents/agent-reconciler-invocation.service.ts",
  );
  const schedulerWorker = read("scripts/run-agent-reconciler-schedule.js");
  if (
    !prismaSchema.includes("model AgentReconcilerInvocation") ||
    !prismaSchema.includes(
      '@@unique([environment, activeKey], name: "agent_reconciler_active_lease")',
    ) ||
    !invocationService.includes("AGENT_RECONCILER_REQUIRED_SUCCESS_WINDOWS") ||
    !invocationService.includes("RECONCILER_INVOCATION_OVERLAP") ||
    !schedulerWorker.includes("x-stoquify-scheduler-scheduled-at") ||
    !schedulerWorker.includes("STOQUIFY_AGENT_RECONCILER_TIMEOUT_MS") ||
    !packageJson.scripts?.["agent:reconciler:postgres-smoke"]
  ) {
    findings.push(
      "The five-minute reconciler must retain durable invocation, lease, cadence, timeout, retry, and PostgreSQL smoke controls.",
    );
  }

  const dependencies = Object.keys({
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  });
  for (const dependency of dependencies) {
    if (
      prohibitedDependencies.some(
        (prefix) => dependency === prefix || dependency.startsWith(prefix),
      )
    ) {
      findings.push(`Phase 2A must remain provider-free: ${dependency}`);
    }
  }

  const playwrightConfig = read("playwright.config.ts");
  const enabledPilotWrapper = read("scripts/run-agent-enabled-pilot-e2e.js");
  const browserReportContract = read(
    "scripts/agent-enabled-pilot-browser-report.ts",
  );
  const degradationSpec = read(
    "tests/e2e/command-agent-release-degradation.spec.ts",
  );
  if (
    !playwrightConfig.includes(
      'name: "command-agent-enabled-pilot-degradation"',
    ) ||
    !playwrightConfig.includes(
      '"command-agent-enabled-pilot-desktop",\n        "command-agent-enabled-pilot-mobile"',
    )
  ) {
    findings.push(
      "Enabled-pilot degradation certification must run after desktop and mobile baseline projects.",
    );
  }
  if (
    !enabledPilotWrapper.includes(
      "--project=command-agent-enabled-pilot-degradation",
    )
  ) {
    findings.push(
      "Enabled-pilot certification must select the dependency-ordered degradation project.",
    );
  }
  if (
    !browserReportContract.includes("REQUIRED_SCENARIOS") ||
    !browserReportContract.includes("report.stats?.skipped !== 0") ||
    !browserReportContract.includes("report.stats?.unexpected !== 0") ||
    !browserReportContract.includes("report.stats?.flaky !== 0")
  ) {
    findings.push(
      "Enabled-pilot certificates must reject incomplete, skipped, unexpected, or flaky browser reports.",
    );
  }
  if (
    !degradationSpec.includes("agentRun.count") ||
    !degradationSpec.includes('state: "SUSPENDED"') ||
    !degradationSpec.includes('status: "DRAFT"') ||
    !degradationSpec.includes(
      "fails closed when the release manifest no longer matches",
    ) ||
    !degradationSpec.includes(
      "fails closed when a required approval has expired",
    ) ||
    !degradationSpec.includes(
      "fails closed when required owner coverage has expired",
    ) ||
    !degradationSpec.includes(
      "denies a second tenant without a governed release package",
    ) ||
    degradationSpec.includes("ACTIVE_INTERNAL") ||
    degradationSpec.includes("activateCommandAgentInternal")
  ) {
    findings.push(
      "Browser degradation certification must prove zero-persistence definition, manifest, approval, ownership, tenant, and suspended-release denial without activation authority.",
    );
  }

  if (findings.length) {
    console.error("Stoquify Phase 2A Command Agent gate failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }
  console.log(
    "Stoquify Phase 2A Command Agent gate passed: narrow, read-only, provider-free boundary verified.",
  );
}

function read(file) {
  const absolute = path.join(root, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

main();
