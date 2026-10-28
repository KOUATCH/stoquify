#!/usr/bin/env node

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { dirname, resolve } = require("node:path");

const DEFAULT_JSON_OUT =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_AUTHORIZED_SCOPE_REQUIREMENTS_AUDIT_2026-07-25.json";
const DEFAULT_MD_OUT =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_AUTHORIZED_SCOPE_REQUIREMENTS_AUDIT_2026-07-25.md";
const OPERATIONAL_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json";
const CREDENTIAL_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json";
const PROMOTION_LEDGER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_3_PROMOTION_LEDGER_2026-07-25.json";
const FREEZE_ATTESTATION =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_COMMIT_ATTESTATION_2026-07-25.json";

const PROHIBITED_DEPENDENCY_PREFIXES = [
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

const REQUIREMENTS = [
  requirement("P0-01", "PHASE_0", "One shared runtime and domain ownership", [
    fileCheck(
      "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md",
      [
        "one shared, TypeScript-native agent runtime",
        "services/agents",
        "will not own business truth",
      ],
    ),
  ]),
  requirement("P0-02", "PHASE_0", "MVP agents and pilot roles", [
    fileCheck(
      "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md",
      [
        "Command Agent",
        "Cash/Reconciliation Agent",
        "Inventory/Replenishment Agent",
        "Pilot roles",
      ],
    ),
  ]),
  requirement("P0-03", "PHASE_0", "Risk taxonomy", [
    fileCheck(
      "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md",
      ["`read_only`", "`draft`", "`low_risk`", "`sensitive`", "`prohibited`"],
    ),
  ]),
  requirement("P0-04", "PHASE_0", "Permanent prohibited-action policy", [
    fileCheck(
      "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md",
      [
        "## Permanent Prohibited Actions",
        "Raw Prisma business writes",
        "Direct ledger or journal posting",
        "Permission, role, entitlement",
      ],
    ),
  ]),
  requirement(
    "P0-05",
    "PHASE_0",
    "Read-only tool catalog with governance metadata",
    [
      fileCheck(
        "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md",
        [
          "Owner service",
          "Required permission",
          "Evidence behavior",
          "readTenantOperatingSnapshot",
          "readBusinessSignals",
          "readActionQueue",
          "readProofTrail",
          "readPaymentTruthSnapshot",
          "readPaymentReconciliationWorkbench",
          "readInventoryCashSnapshot",
          "readCloseReadinessSnapshot",
        ],
      ),
    ],
  ),
  requirement(
    "P0-06",
    "PHASE_0",
    "Dependency order, rollout, rollback, and stop conditions",
    [
      fileCheck(
        "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md",
        [
          "## Dependency Adoption Order",
          "## Rollout And Stop Conditions",
          "Rollback is additive",
        ],
      ),
    ],
  ),
  requirement("P0-07", "PHASE_0", "Measurable Phase 1 acceptance criteria", [
    fileCheck(
      "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md",
      [
        "## Phase 1 Acceptance Criteria",
        "Context resolution fails closed without a tenant",
        "Only read-only tools are registered",
        "Focused tests and agent boundary gates pass",
      ],
    ),
  ]),
  requirement("P0-08", "PHASE_0", "Phase 0/1 execution report", [
    fileCheck(
      "what-next/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_1_EXECUTION_REPORT_2026-07-22.md",
      [
        "Phase 0 `complete`",
        "Phase 1 implementation `complete`",
        "## Verification Results",
        "## Remaining Risks",
        "## Rollback",
      ],
    ),
  ]),
  requirement("P1-01", "PHASE_1", "Agent governance persistence models", [
    fileCheck("prisma/schema.prisma", [
      "model AgentDefinition",
      "model AgentSkillDefinition",
      "model AgentToolDefinition",
      "model AgentRun",
      "model AgentStep",
      "model AgentEvidenceLink",
      "model AgentFeedback",
      "model AgentCostLedger",
      "model AgentPolicyIncident",
    ]),
  ]),
  requirement(
    "P1-02",
    "PHASE_1",
    "Additive runtime migrations and tenant consistency",
    [
      existenceCheck(
        "prisma/migrations/20260722143000_agent_runtime_phase_1_foundation/migration.sql",
      ),
      existenceCheck(
        "prisma/migrations/20260722150000_agent_runtime_tenant_consistency/migration.sql",
      ),
      existenceCheck(
        "prisma/migrations/20260722153000_agent_runtime_incident_cascade_consistency/migration.sql",
      ),
    ],
  ),
  requirement("P1-03", "PHASE_1", "Shared runtime contracts", [
    fileCheck("services/agents/agent-contracts.ts", [
      "AgentExecutionContext",
      "AgentEvidenceRecord",
      "AgentToolDefinition",
      "AgentRunReceipt",
    ]),
  ]),
  requirement(
    "P1-04",
    "PHASE_1",
    "Trusted tenant, actor, and entitlement context",
    [
      fileCheck("services/agents/agent-context.service.ts", [
        "requireRbacContext",
        'mode: "enforce"',
        "organizationId: rbac.orgId",
        "actorId: rbac.userId",
        "moduleDecisions",
      ]),
    ],
  ),
  requirement(
    "P1-05",
    "PHASE_1",
    "Permission and entitlement guard before tool exposure",
    [
      fileCheck("services/agents/agent-policy.service.ts", [
        'tool.toolType !== "read_only"',
        "hasRbacPermission",
        "context.moduleDecisions",
        "!moduleDecision.allowed || moduleDecision.wouldBlock",
      ]),
      fileCheck("services/agents/agent-tool-registry.service.ts", [
        "authorize(",
        "listAllowed",
      ]),
    ],
  ),
  requirement(
    "P1-06",
    "PHASE_1",
    "Static read-only registry and prohibited-tool policy",
    [
      fileCheck("services/agents/tools/command-tools.ts", [
        'toolType: "read_only"',
        'riskLevel: "read_only"',
      ]),
      existenceCheck("scripts/agent-tool-registry-gate.js"),
      existenceCheck("scripts/agent-prohibited-action-gate.js"),
    ],
  ),
  requirement(
    "P1-07",
    "PHASE_1",
    "Evidence binder and explicit no-evidence state",
    [
      fileCheck("services/agents/agent-evidence.service.ts", [
        "sourceHash",
        "evidenceGrade",
        "freshness",
        "blockerCount",
        "redactionCount",
        "bindUnavailableEvidence",
      ]),
    ],
  ),
  requirement("P1-08", "PHASE_1", "Redaction before prompt and output", [
    fileCheck("services/agents/agent-redaction.service.ts", [
      "redactBeforeAgentPrompt",
      "redactBeforeAgentOutput",
      "redaction-policy.service",
    ]),
  ]),
  requirement("P1-09", "PHASE_1", "Freshness evaluator", [
    fileCheck("services/agents/skills/freshness-evaluator.skill.ts", [
      "evaluateAgentFreshness",
      "must not be presented as current complete proof",
    ]),
  ]),
  requirement(
    "P1-10",
    "PHASE_1",
    "Deterministic run and step logger without raw payload persistence",
    [
      fileCheck("services/agents/agent-runner.service.ts", [
        "hashAgentPayload",
        "inputHash",
        "outputHash",
        "createPolicyIncident",
        "runDeterministicAgent",
      ]),
    ],
  ),
  requirement(
    "P1-11",
    "PHASE_1",
    "Feedback, cost, and policy-incident foundations",
    [
      fileCheck("prisma/schema.prisma", [
        "model AgentFeedback",
        "model AgentCostLedger",
        "model AgentPolicyIncident",
      ]),
      existenceCheck("services/agents/agent-feedback.service.ts"),
      existenceCheck("services/agents/agent-metrics.service.ts"),
    ],
  ),
  requirement("P1-12", "PHASE_1", "Focused safety tests and runtime commands", [
    existenceCheck("services/agents/__tests__/agent-context.service.test.ts"),
    existenceCheck(
      "services/agents/__tests__/agent-tool-registry.service.test.ts",
    ),
    existenceCheck("services/agents/__tests__/agent-evidence.service.test.ts"),
    existenceCheck("services/agents/__tests__/agent-redaction.service.test.ts"),
    existenceCheck("services/agents/__tests__/agent-runner.service.test.ts"),
    packageScriptCheck("agent:runtime:gates"),
    packageScriptCheck("agent:runtime:postgres-smoke"),
  ]),
  requirement("P1-13", "PHASE_1", "Provider-free deterministic foundation", [
    dependencyBoundaryCheck(),
  ]),
  requirement(
    "P2A-01",
    "PHASE_2A",
    "Command Agent design freeze and disabled rollout",
    [
      fileCheck(
        "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_COMMAND_AGENT_DESIGN_FREEZE_2026-07-22.md",
        [
          "internal rollout remains disabled pending product and security approval",
          "STOQUIFY_COMMAND_AGENT_KILL_SWITCH",
          "defaults to no roles",
          "must not render output",
        ],
      ),
    ],
  ),
  requirement(
    "P2A-02",
    "PHASE_2A",
    "Role-aware Command Agent with one narrow read tool",
    [
      fileCheck("services/agents/command-agent.service.ts", [
        "AgentToolRegistry",
        "READ_ROLE_DAILY_DIGEST_TOOL_KEY",
        "buildRoleDailyBrief",
      ]),
      fileCheck("services/agents/tools/command-tool-adapters.ts", [
        "key: READ_ROLE_DAILY_DIGEST_TOOL_KEY",
        'toolType: "read_only"',
        'riskLevel: "read_only"',
      ]),
    ],
  ),
  requirement(
    "P2A-03",
    "PHASE_2A",
    "Versioned evidence-constrained Daily Brief skill",
    [
      fileCheck("services/agents/command-agent-contracts.ts", [
        'ROLE_DAILY_BRIEF_SKILL_KEY = "role-daily-brief"',
        "ROLE_DAILY_BRIEF_SKILL_VERSION = 1",
        "ROLE_DAILY_BRIEF_PROMPT_HASH",
      ]),
      fileCheck("services/agents/skills/role-daily-brief.skill.ts", [
        "buildRoleDailyBrief",
        "validateAndRedactCommandBrief",
      ]),
    ],
  ),
  requirement(
    "P2A-04",
    "PHASE_2A",
    "Protected server action with handler-derived tenant scope",
    [
      fileCheck("actions/agents/command-agent.actions.ts", [
        'tenantGuard: "handler-derived"',
        "commandAgentRequestSchema.safeParse",
        'moduleSlug: "dashboard"',
      ]),
    ],
  ),
  requirement(
    "P2A-05",
    "PHASE_2A",
    "Evidence and trust fields on material output",
    [
      fileCheck("services/agents/command-agent-contracts.ts", [
        "sourceModule",
        "sourceHash",
        "evidenceGrade",
        "freshness",
        "blockerCount",
        "redactionCount",
        "limitations",
        "redactionNotices",
        "runId",
      ]),
      fileCheck("services/agents/agent-contracts.ts", [
        "organizationId: string",
        "actorId: string",
        "correlationId: string",
      ]),
    ],
  ),
  requirement(
    "P2A-06",
    "PHASE_2A",
    "Embedded Daily Digest UI with safe states",
    [
      fileCheck("components/agents/AgentCommandPanel.tsx", [
        "EvidenceGradeBadge",
        "limitations",
        "redactionNotices",
        'role="alert"',
        'role="status"',
      ]),
      fileCheck("components/daily-habit/DailyHabitDigestDashboard.tsx", [
        "AgentCommandPanel",
      ]),
      fileCheck("app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx", [
        "resolveCommandAgentRollout",
        "commandAgentAccess",
      ]),
    ],
  ),
  requirement("P2A-07", "PHASE_2A", "Bounded user feedback persistence", [
    fileCheck("services/agents/agent-feedback.service.ts", [
      "recordCommandAgentFeedback",
    ]),
    fileCheck("actions/agents/command-agent.actions.ts", [
      "commandAgentFeedbackSchema.safeParse",
      "submitCommandAgentFeedbackAction",
    ]),
  ]),
  requirement("P2A-08", "PHASE_2A", "Fail-closed rollout and kill switch", [
    fileCheck("services/agents/agent-rollout.service.ts", [
      "STOQUIFY_COMMAND_AGENT_KILL_SWITCH",
      "STOQUIFY_COMMAND_AGENT_ROLLOUT",
      "STOQUIFY_COMMAND_AGENT_PILOT_ORG_IDS",
      "STOQUIFY_COMMAND_AGENT_PILOT_ROLE_CODES",
      'return value === "shadow" || value === "internal" ? value : "off"',
    ]),
  ]),
  requirement(
    "P2A-09",
    "PHASE_2A",
    "Release, reconciliation, and rollback controls",
    [
      existenceCheck("services/agents/agent-release-control.service.ts"),
      existenceCheck("services/agents/agent-execution-control.service.ts"),
      existenceCheck("services/agents/agent-reconciler-invocation.service.ts"),
      existenceCheck("app/api/internal/agents/reconcile-abandoned/route.ts"),
      packageScriptCheck("agent:release-control:gate"),
      packageScriptCheck("agent:operational-release:gate"),
    ],
  ),
  requirement(
    "P2A-10",
    "PHASE_2A",
    "Focused, browser, and static verification surfaces",
    [
      existenceCheck("services/agents/__tests__/command-agent.service.test.ts"),
      existenceCheck("actions/agents/__tests__/command-agent.actions.test.ts"),
      existenceCheck("components/agents/__tests__/AgentCommandPanel.test.tsx"),
      existenceCheck("tests/e2e/command-agent-enabled-pilot.spec.ts"),
      existenceCheck("tests/e2e/command-agent-kill-switch.spec.ts"),
      packageScriptCheck("agent:phase2a:gate"),
      packageScriptCheck("agent:phase2a:postgres-smoke"),
    ],
  ),
  requirement("P2A-11", "PHASE_2A", "Frozen commit attestation", [
    jsonFieldCheck("freezeAttestation", ["status"], "FROZEN_COMMIT_VERIFIED"),
    jsonFieldCheck("freezeAttestation", ["freezeVerified"], true),
    jsonFieldCheck("freezeAttestation", ["summary", "contentMismatches"], 0),
    jsonFieldCheck("freezeAttestation", ["summary", "phase2aRuntimeDrift"], 0),
  ]),
  requirement("P2A-12", "PHASE_2A", "Phase 2A execution report", [
    fileCheck(
      "what-next/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_COMMAND_AGENT_EXECUTION_REPORT_2026-07-22.md",
      [
        "Engineering implementation complete; rollout remains disabled",
        "## Verification",
        "## Gates Blocked",
        "## Rollback",
      ],
    ),
  ]),
  requirement(
    "P2A-13",
    "PHASE_2A",
    "Executable Phase 2B and Phase 3 entry gates",
    [
      existenceCheck("scripts/agent-phase-promotion-gate.js"),
      existenceCheck("scripts/__tests__/agent-phase-promotion-gate.test.js"),
      existenceCheck(
        "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2B_PILOT_EXIT_REGISTER_2026-07-25.json",
      ),
      existenceCheck(
        "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_PROMOTION_GATE_CONTRACT_2026-07-25.md",
      ),
      packageScriptCheck("agent:phase2b:entry:gate"),
      packageScriptCheck("agent:phase3:entry:gate"),
    ],
  ),
  requirement("BOUNDARY-01", "PERMANENT", "No agent business-write authority", [
    packageScriptCheck("agent:prohibited-action:gate"),
    fileCheck("scripts/agent-prohibited-action-gate.js", [
      "direct PrismaClient construction is prohibited",
      "prohibited business mutation",
    ]),
  ]),
  requirement("BOUNDARY-02", "PERMANENT", "Activation remains unauthorized", [
    jsonFieldCheck("operationalEvidence", ["activation", "requested"], false),
    jsonFieldCheck("operationalEvidence", ["activation", "authorized"], false),
    jsonFieldCheck("operationalEvidence", ["activation", "activatedAt"], null),
    jsonFieldCheck("freezeAttestation", ["activationAuthorized"], false),
  ]),
  requirement(
    "BOUNDARY-03",
    "PERMANENT",
    "Phase 3 remains unauthorized and unstarted",
    [
      jsonFieldCheck("promotionLedger", ["phase3Authorized"], false),
      jsonFieldCheck("freezeAttestation", ["phase3Authorized"], false),
      forbiddenFileMarkerCheck(
        "prisma/schema.prisma",
        "model AgentActionDraft",
      ),
    ],
  ),
];

function requirement(id, phase, title, checks) {
  return { id, phase, title, checks };
}

function fileCheck(path, markers) {
  return { type: "file", path, markers };
}

function existenceCheck(path) {
  return { type: "file", path, markers: [] };
}

function packageScriptCheck(name) {
  return { type: "packageScript", name };
}

function dependencyBoundaryCheck() {
  return { type: "dependencyBoundary" };
}

function jsonFieldCheck(source, path, expected) {
  return { type: "jsonField", source, path, expected };
}

function forbiddenFileMarkerCheck(path, marker) {
  return { type: "forbiddenFileMarker", path, marker };
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    jsonOut: DEFAULT_JSON_OUT,
    markdownOut: DEFAULT_MD_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") options.mode = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else if (value === "--out") options.markdownOut = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  return options;
}

function evaluatePhasedExecution(input) {
  const results = REQUIREMENTS.map((definition) =>
    evaluateRequirement(definition, input),
  );
  const repositoryBlockers = results.flatMap((result) => result.blockers);
  const externalBlockers = evaluateExternalBlockers(input);
  const phaseCounts = {};
  for (const result of results) {
    phaseCounts[result.phase] ??= { total: 0, satisfied: 0, blocked: 0 };
    phaseCounts[result.phase].total += 1;
    if (result.satisfied) phaseCounts[result.phase].satisfied += 1;
    else phaseCounts[result.phase].blocked += 1;
  }
  const authorizedScopeComplete = repositoryBlockers.length === 0;
  const status = authorizedScopeComplete
    ? externalBlockers.length
      ? "AUTHORIZED_SCOPE_COMPLETE_EXTERNAL_BLOCKED"
      : "READY_FOR_NEXT_AUTHORIZED_PHASE"
    : "BLOCKED_REPOSITORY_REQUIREMENTS";

  return {
    schemaVersion: 1,
    auditId: "stoquify-agent-runtime-authorized-scope-requirements-2026-07-25",
    evaluatedAt: (input.now || new Date()).toISOString(),
    status,
    authorizedScope: ["PHASE_0", "PHASE_1", "PHASE_2A"],
    authorizedScopeComplete,
    fullProgramComplete: false,
    activationAuthorized: false,
    phase3Authorized: false,
    summary: {
      requirements: results.length,
      satisfied: results.filter((result) => result.satisfied).length,
      repositoryBlockers: repositoryBlockers.length,
      externalBlockers: externalBlockers.length,
      secretValuesPrinted: false,
    },
    phaseCounts,
    requirements: results,
    repositoryBlockers,
    externalBlockers,
    authority: {
      operationalStatus: input.operationalEvidence?.declaredStatus ?? null,
      credentialStatus: input.credentialRegister?.declaredStatus ?? null,
      promotionStatus: input.promotionLedger?.overallStatus ?? null,
      activationRequested:
        input.operationalEvidence?.activation?.requested ?? null,
      activationAuthorized:
        input.operationalEvidence?.activation?.authorized ?? null,
      activatedAt: input.operationalEvidence?.activation?.activatedAt ?? null,
      phase3Authorized: input.promotionLedger?.phase3Authorized ?? null,
    },
    safety: {
      businessWriteAuthorityAdded: false,
      activationAttempted: false,
      phase3Started: false,
      externalEvidenceFabricated: false,
      secretValuesPrinted: false,
    },
  };
}

function evaluateRequirement(definition, input) {
  const blockers = [];
  const evidencePaths = [];
  for (const check of definition.checks) {
    if (typeof check.path === "string") evidencePaths.push(check.path);
    if (check.type === "file") {
      const content = input.files?.[check.path];
      if (typeof content !== "string") {
        blockers.push(`${definition.id}:FILE_MISSING:${check.path}`);
        continue;
      }
      for (const marker of check.markers) {
        if (!content.includes(marker)) {
          blockers.push(
            `${definition.id}:MARKER_MISSING:${check.path}:${marker}`,
          );
        }
      }
    } else if (check.type === "forbiddenFileMarker") {
      const content = input.files?.[check.path];
      if (typeof content !== "string") {
        blockers.push(`${definition.id}:FILE_MISSING:${check.path}`);
      } else if (content.includes(check.marker)) {
        blockers.push(
          `${definition.id}:FORBIDDEN_MARKER:${check.path}:${check.marker}`,
        );
      }
    } else if (check.type === "packageScript") {
      evidencePaths.push("package.json");
      if (!input.packageJson?.scripts?.[check.name]) {
        blockers.push(`${definition.id}:PACKAGE_SCRIPT_MISSING:${check.name}`);
      }
    } else if (check.type === "dependencyBoundary") {
      evidencePaths.push("package.json");
      const dependencies = Object.keys({
        ...(input.packageJson?.dependencies || {}),
        ...(input.packageJson?.devDependencies || {}),
      });
      for (const dependency of dependencies) {
        if (
          PROHIBITED_DEPENDENCY_PREFIXES.some(
            (prefix) => dependency === prefix || dependency.startsWith(prefix),
          )
        ) {
          blockers.push(
            `${definition.id}:PREMATURE_PROVIDER_DEPENDENCY:${dependency}`,
          );
        }
      }
    } else if (check.type === "jsonField") {
      evidencePaths.push(sourcePath(check.source));
      const actual = readNested(input[check.source], check.path);
      if (!deepEqual(actual, check.expected)) {
        blockers.push(
          `${definition.id}:JSON_FIELD_MISMATCH:${check.source}:${check.path.join(
            ".",
          )}`,
        );
      }
    }
  }
  return {
    id: definition.id,
    phase: definition.phase,
    title: definition.title,
    satisfied: blockers.length === 0,
    evidencePaths: [...new Set(evidencePaths)],
    blockers,
  };
}

function evaluateExternalBlockers(input) {
  const blockers = [];
  for (const approval of ["product", "security"]) {
    const record = input.operationalEvidence?.approvals?.[approval];
    if (record?.decision !== "APPROVED" || !record?.actorDirectoryId) {
      blockers.push(`EXTERNAL_${approval.toUpperCase()}_APPROVAL_NOT_RECORDED`);
    }
  }
  if (input.freezeAttestation?.cleanReleaseReady !== true) {
    blockers.push("EXTERNAL_CLEAN_RELEASE_NOT_READY");
  }
  if (input.credentialRegister?.declaredStatus !== "READY") {
    blockers.push("EXTERNAL_CREDENTIAL_ROTATION_BLOCKED");
  }
  if (
    input.operationalEvidence?.declaredStatus !== "READY_FOR_INDEPENDENT_REVIEW"
  ) {
    blockers.push("EXTERNAL_OPERATIONAL_RELEASE_BLOCKED");
  }
  if (input.promotionLedger?.phase3Authorized !== true) {
    blockers.push("EXTERNAL_PHASE3_GO_NOT_RECORDED");
  }
  return blockers;
}

function collectInput(root) {
  const paths = new Set(
    REQUIREMENTS.flatMap((definition) =>
      definition.checks.flatMap((check) =>
        typeof check.path === "string" ? [check.path] : [],
      ),
    ),
  );
  const files = {};
  for (const path of paths) {
    const absolute = resolve(root, path);
    files[path] = existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
  }
  return {
    files,
    packageJson: readJson(root, "package.json"),
    operationalEvidence: readJson(root, OPERATIONAL_REGISTER),
    credentialRegister: readJson(root, CREDENTIAL_REGISTER),
    promotionLedger: readJson(root, PROMOTION_LEDGER),
    freezeAttestation: readJson(root, FREEZE_ATTESTATION),
  };
}

function renderMarkdown(result) {
  const lines = [
    "# Stoquify Agent Runtime Authorized-Scope Requirements Audit",
    "",
    `**Evaluated:** ${result.evaluatedAt}<br>`,
    `**Status:** \`${result.status}\`<br>`,
    `**Authorized scope complete:** ${
      result.authorizedScopeComplete ? "Yes" : "No"
    }<br>`,
    "**Full phased program complete:** No<br>",
    "**Activation authorized:** No<br>",
    "**Phase 3 authorized:** No",
    "",
    "## Scope",
    "",
    "This gate proves repository-owned requirements for Phase 0, Phase 1, and the inactive read-only Phase 2A Command Agent. It does not convert missing approval, deployment, credential, pilot, or release evidence into completion.",
    "",
    "## Summary",
    "",
    "| Measure | Result |",
    "|---|---:|",
    `| Requirements | ${result.summary.requirements} |`,
    `| Satisfied | ${result.summary.satisfied} |`,
    `| Repository blockers | ${result.summary.repositoryBlockers} |`,
    `| External blockers | ${result.summary.externalBlockers} |`,
    "",
    "## Phase Counts",
    "",
    "| Phase | Satisfied | Total | Blocked |",
    "|---|---:|---:|---:|",
    ...Object.entries(result.phaseCounts).map(
      ([phase, counts]) =>
        `| ${phase} | ${counts.satisfied} | ${counts.total} | ${counts.blocked} |`,
    ),
    "",
    "## Requirement Matrix",
    "",
    "| ID | Phase | Requirement | Result | Evidence |",
    "|---|---|---|---|---|",
    ...result.requirements.map(
      (requirementResult) =>
        `| ${requirementResult.id} | ${requirementResult.phase} | ${escapeTable(
          requirementResult.title,
        )} | ${requirementResult.satisfied ? "Passed" : "Blocked"} | ${escapeTable(
          requirementResult.evidencePaths.join(", "),
        )} |`,
    ),
    "",
    "## Repository Blockers",
    "",
    ...(result.repositoryBlockers.length
      ? result.repositoryBlockers.map((blocker) => `- \`${blocker}\``)
      : ["- None within the authorized repository scope."]),
    "",
    "## External Authority Blockers",
    "",
    ...result.externalBlockers.map((blocker) => `- \`${blocker}\``),
    "",
    "## Authority State",
    "",
    `- Operational register: \`${result.authority.operationalStatus}\`.`,
    `- Credential register: \`${result.authority.credentialStatus}\`.`,
    `- Promotion ledger: \`${result.authority.promotionStatus}\`.`,
    `- Activation requested / authorized / timestamp: \`${result.authority.activationRequested}\` / \`${result.authority.activationAuthorized}\` / \`${result.authority.activatedAt}\`.`,
    `- Phase 3 authorized: \`${result.authority.phase3Authorized}\`.`,
    "",
    "## Decision",
    "",
    result.authorizedScopeComplete
      ? "The authorized repository scope is complete. The full phased program remains incomplete and blocked on external authority evidence; no activation or Phase 3 work is authorized."
      : "The authorized repository scope has unresolved implementation requirements. Correct them before requesting external approval or advancing.",
    "",
  ];
  return lines.join("\n");
}

function readJson(root, path) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) {
    throw new Error(`Required JSON evidence is missing: ${path}`);
  }
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function readNested(value, path) {
  let cursor = value;
  for (const segment of path) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sourcePath(source) {
  const paths = {
    operationalEvidence: OPERATIONAL_REGISTER,
    credentialRegister: CREDENTIAL_REGISTER,
    promotionLedger: PROMOTION_LEDGER,
    freezeAttestation: FREEZE_ATTESTATION,
  };
  return paths[source] || source;
}

function escapeTable(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function main() {
  const options = parseArgs();
  const root = process.cwd();
  const result = evaluatePhasedExecution(collectInput(root));
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
        authorizedScopeComplete: result.authorizedScopeComplete,
        fullProgramComplete: false,
        requirements: result.summary.requirements,
        satisfied: result.summary.satisfied,
        repositoryBlockers: result.summary.repositoryBlockers,
        externalBlockers: result.summary.externalBlockers,
        activationAuthorized: false,
        phase3Authorized: false,
        secretValuesPrinted: false,
        report: options.markdownOut,
      },
      null,
      2,
    )}\n`,
  );
  if (options.mode === "fail" && !result.authorizedScopeComplete) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        code: "AGENT_PHASED_EXECUTION_REQUIREMENTS_AUDIT_FAILED",
        activationAuthorized: false,
        phase3Authorized: false,
        secretValuesPrinted: false,
      })}\n`,
    );
    process.exitCode = 1;
  }
}

module.exports = {
  PROHIBITED_DEPENDENCY_PREFIXES,
  REQUIREMENTS,
  collectInput,
  evaluatePhasedExecution,
  parseArgs,
  renderMarkdown,
};
