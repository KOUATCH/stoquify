#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(relativePath, expected, label) {
  const source = read(relativePath);
  if (!source.includes(expected)) failures.push(`${label}: ${relativePath}`);
}

function prohibitText(relativePath, prohibited, label) {
  const source = read(relativePath);
  if (source.includes(prohibited)) failures.push(`${label}: ${relativePath}`);
}

requireText(
  "scripts/agent-runtime-phase-2a-provision.js",
  "Direct activation is prohibited",
  "provisioning must reject direct activation",
);
requireText(
  "scripts/agent-runtime-phase-2a-provision.js",
  'const status = "DRAFT"',
  "provisioning must remain draft-only",
);
prohibitText(
  "scripts/agent-runtime-phase-2a-provision.js",
  'const status = activate ? "ACTIVE"',
  "legacy activation bypass detected",
);

const commandService = read("services/agents/command-agent.service.ts");
const authorizationCall = commandService.indexOf(
  "await authorizeCommandAgentRelease({",
);
const definitionResolution = commandService.indexOf(
  "const definition = await resolveActiveCommandAgentDefinition(",
);
if (
  authorizationCall < 0 ||
  definitionResolution < 0 ||
  authorizationCall > definitionResolution
) {
  failures.push(
    "runtime release authorization must run before definition resolution",
  );
}

for (const expected of [
  "command-agent-enabled-pilot-desktop",
  "command-agent-enabled-pilot-mobile",
  "STOQUIFY_AGENT_CERTIFICATION_MODE",
]) {
  requireText(
    "playwright.config.ts",
    expected,
    `enabled-pilot Playwright configuration is missing ${expected}`,
  );
}
requireText(
  ".github/workflows/ci.yml",
  "command-agent-enabled-pilot:",
  "enabled-pilot certification must be a CI release job",
);
prohibitText(
  "scripts/agent-enabled-pilot-e2e-bootstrap.ts",
  "activateCommandAgentInternal",
  "browser certification must never activate the release",
);
for (const expected of [
  "rawReportPath",
  "sanitizePlaywrightReport",
  "environmentIncluded: false",
  "unlinkSync(sourcePath)",
]) {
  requireText(
    "scripts/run-agent-enabled-pilot-e2e.js",
    expected,
    `browser certification evidence redaction is missing ${expected}`,
  );
}
for (const expected of [
  'environment === "e2e"',
  'process.env.NODE_ENV !== "production"',
  "STOQUIFY_AGENT_CERTIFICATION_MODE",
  "recordCommandAgentActivationApproval",
  "assignCommandAgentActivationOwner",
  "recordCommandAgentPilotCertification",
  "activateCommandAgentInternal",
  "suspendCommandAgentRelease",
  "RELEASE_SEPARATION_OF_DUTIES",
  "RELEASE_IDEMPOTENCY_CONFLICT",
  "hashAgentReleaseCommand",
  "RELEASE_RECONCILIATION_STALE",
  "RELEASE_ALERT_TRANSPORT_UNHEALTHY",
]) {
  requireText(
    "services/agents/agent-release-control.service.ts",
    expected,
    `release control is missing ${expected}`,
  );
}

for (const expected of [
  "reconcileAgentRuntimeControlPlane",
  "persistWorkflowAssuranceDefinitionExecution",
  "recordAgentReleaseOperationalReadiness",
  "shouldSuspendAgentRuntimeRelease",
  "suspendCommandAgentRelease",
]) {
  requireText(
    "services/agents/agent-control-plane-reconciliation.service.ts",
    expected,
    `control-plane reconciliation is missing ${expected}`,
  );
}

for (const expected of [
  'status: "PROCESSING"',
  "attemptCount: { increment: 1 }",
  '"idempotency-key"',
  "MAX_ATTEMPTS",
]) {
  requireText(
    "services/assurance/assurance-alert-delivery.service.ts",
    expected,
    `alert transport is missing ${expected}`,
  );
}

prohibitText(
  "services/agents/agent-release-control.service.ts",
  "setDefinitionProjection",
  "tenant rollout must not mutate global definition projection",
);
prohibitText(
  "services/agents/agent-release-control.service.ts",
  'rolloutMode: "INTERNAL"',
  "global definitions must remain shadow-only",
);
requireText(
  "services/agents/agent-release-control.service.ts",
  "ensureDefinitionRegistryActive",
  "global definition registry must be activated independently of tenant rollout",
);
for (const expected of [
  'idempotencyKey String?',
  'requestHash    String?',
  '@@unique([packageId, idempotencyKey])',
]) {
  requireText(
    "prisma/schema.prisma",
    expected,
    `release command idempotency schema is missing ${expected}`,
  );
}
requireText(
  "prisma/migrations/20260724100000_agent_runtime_release_hardening/migration.sql",
  "agent_activation_approvals_packageId_idempotencyKey_key",
  "approval idempotency migration is missing",
);
requireText(
  "prisma/migrations/20260724100000_agent_runtime_release_hardening/migration.sql",
  "agent_pilot_certifications_packageId_idempotencyKey_key",
  "certification idempotency migration is missing",
);
for (const expected of [
  "retireCommandAgentRelease",
  'assertState(release.state, ["SUSPENDED"])',
  'action: "AGENT_RELEASE_RETIRED"',
]) {
  requireText(
    "services/agents/agent-release-control.service.ts",
    expected,
    `governed retirement is missing ${expected}`,
  );
}
for (const relativePath of [
  "config/permissions.ts",
  "lib/security/rbac-permissions.ts",
  "actions/agents/agent-release-control.actions.ts",
]) {
  requireText(
    relativePath,
    "agent.release.retire",
    "critical retirement permission is missing",
  );
}
for (const expected of ["retiredAt", "retiredById", "retirementReason"]) {
  requireText(
    "prisma/schema.prisma",
    expected,
    `release retirement evidence is missing ${expected}`,
  );
}
for (const expected of [
  "DEAD_LETTER",
  "workflowAssuranceRetryDelayMs",
  "deadLettered",
]) {
  requireText(
    "services/assurance/assurance-alert-delivery.service.ts",
    expected,
    `alert dead-letter control is missing ${expected}`,
  );
}
for (const expected of [
  "recoverWorkflowAssuranceDeadLetter",
  'source.status !== "DEAD_LETTER"',
  "WORKFLOW_ASSURANCE_ALERT_RECOVERY_QUEUED",
  "recoveryRequestHash",
]) {
  requireText(
    "services/assurance/assurance-alert-recovery.service.ts",
    expected,
    `authorized alert recovery is missing ${expected}`,
  );
}
for (const expected of [
  'permission: "controls.manage"',
  "freshAuth: { maxAgeSeconds: 300 }",
  'tenantGuard: "handler-derived"',
]) {
  requireText(
    "actions/assurance/workflow-assurance-alert.actions.ts",
    expected,
    `protected alert recovery action is missing ${expected}`,
  );
}
for (const expected of [
  "WorkflowAssuranceAlertDeliveryStatus",
  "agent_activation_packages",
  "retirementReason",
]) {
  requireText(
    "prisma/migrations/20260724113000_agent_runtime_retirement_alert_dead_letter/migration.sql",
    expected,
    `retirement/dead-letter migration is missing ${expected}`,
  );
}
for (const expected of [
  "fingerprintAgentProtectedBusinessData",
  "protectedBusinessDataUnchanged",
  "protectedDataBeforeHash",
  "allowedPersistenceBefore",
  "certifyAgentAllowedPersistence",
]) {
  requireText(
    "scripts/agent-enabled-pilot-e2e-bootstrap.ts",
    expected,
    `pilot non-mutation certification is missing ${expected}`,
  );
}
for (const expected of [
  "expectedCommandExecutions = 2",
  "delta.feedback",
  "delta.costs !== 0",
  "delta.policyIncidents !== 0",
]) {
  requireText(
    "scripts/agent-enabled-pilot-persistence-assurance.ts",
    expected,
    `allowed-persistence certification is missing ${expected}`,
  );
}
for (const expected of [
  'from "axe-core"',
  "seriousOrCriticalPanelViolations",
  "denies a role outside the controlled pilot allowlist",
  "Existing run receipt returned",
]) {
  requireText(
    "tests/e2e/command-agent-enabled-pilot.spec.ts",
    expected,
    `pilot browser assurance is missing ${expected}`,
  );
}
for (const expected of [
  "model AgentActivationPackage",
  "model AgentActivationApproval",
  "model AgentActivationOwner",
  "model AgentPilotCertification",
]) {
  requireText(
    "prisma/schema.prisma",
    expected,
    `release schema is missing ${expected}`,
  );
}

if (failures.length > 0) {
  console.error("Agent release-control gate failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Agent release-control gate passed.");
console.log("- direct activation bypass rejected");
console.log("- governed runtime authorization ordered before execution");
console.log(
  "- approval, ownership, certification, reconciliation, and rollback controls present",
);
console.log("- replay-safe evidence commands and tenant-safe definition registry present");
console.log("- blocking active-release drift triggers guarded suspension");
console.log("- retry-safe Workflow Assurance webhook transport and audited recovery present");
