const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8")
}

function markerSetPresent(file, markers, overrides = {}) {
  const text = Object.prototype.hasOwnProperty.call(overrides, file)
    ? overrides[file]
    : read(file)
  return markers.every((marker) => text.includes(marker))
}

function evaluate(overrides = {}) {
  const contains = (file, markers) => markerSetPresent(file, markers, overrides)
  const checks = [
    {
      key: "agent_runtime_tools_remain_read_only",
      ready: contains("services/agents/agent-policy.service.ts", [
        'tool.toolType !== "read_only"',
        'tool.riskLevel !== "read_only"',
        "WRITE_TOOL_NOT_ALLOWED",
      ]),
    },
    {
      key: "autonomous_high_authority_actions_are_prohibited",
      ready: contains("services/agents/agent-policy.service.ts", [
        "ledger.*post",
        "statutory.*fil",
        "payroll.*approv",
        "close.*certif",
        "permission.*(change|grant|revoke)",
      ]),
    },
    {
      key: "answers_cite_tenant_period_as_of_and_sources",
      ready: contains("services/agents/command-agent-contracts.ts", [
        "tenantId:",
        "periodStart:",
        "periodEnd:",
        "asOf:",
        "sourceCount:",
      ]),
    },
    {
      key: "proposal_types_are_non_executing_and_allowlisted",
      ready: contains("services/ai/copilot-proposal.schemas.ts", [
        "NAVIGATE_TO_WORKFLOW",
        "PREPARE_REVIEW_CHECKLIST",
        "REQUEST_HUMAN_REVIEW",
      ]),
    },
    {
      key: "proposal_acceptance_has_no_execution_authority",
      ready: contains("services/ai/copilot-proposal.service.ts", [
        'executionAuthority: "NONE"',
        "Acceptance records human intent only",
        "It never invokes the target workflow",
      ]),
    },
    {
      key: "proposal_evidence_is_bound_to_completed_tenant_run",
      ready: contains("services/ai/copilot-proposal.service.ts", [
        'status: "COMPLETED"',
        "organizationId",
        "actorId",
        "assertEvidenceBound",
        "sourceHash",
      ]),
    },
    {
      key: "unsafe_proposals_are_blocked_and_audited",
      ready: contains("services/ai/copilot-proposal.service.ts", [
        "UNSAFE_ACTION_PROPOSAL_BLOCKED",
        "COPILOT_NO_EXECUTION_AUTHORITY",
        'severity: "HIGH"',
        "agentPolicyIncident.create",
      ]),
    },
    {
      key: "unsafe_action_classification_is_bilingual",
      ready:
        contains("services/ai/copilot-proposal.service.ts", [
          '.normalize("NFKD")',
          "soumettre",
          "autorite",
        ]) &&
        contains("services/ai/__tests__/copilot-proposal.service.test.ts", [
          "unsafe French authority-submission request",
          "Soumettre la déclaration",
        ]),
    },
    {
      key: "proposal_actions_require_rbac_fresh_auth_and_server_scope",
      ready: contains("actions/ai/copilot-proposal.actions.ts", [
        'permission: "dashboard.read"',
        "freshAuth: { maxAgeSeconds: 600 }",
        'tenantGuard: "handler-derived"',
        "ctx.orgId",
        "ctx.userId",
        "ctx.permissions",
        "ctx.roles.map",
        "authorizeCopilotProposalRelease",
      ]),
    },
    {
      key: "proposal_actions_return_stable_typed_results",
      ready:
        contains("actions/ai/copilot-proposal.actions.ts", [
          "CopilotGuardrailErrorCode",
          '"FORBIDDEN"',
          '"STEP_UP_REQUIRED"',
          '"MISSING_DOCUMENT"',
          "ok: true as const",
          "ok: false as const",
        ]) &&
        contains("actions/ai/__tests__/copilot-proposal.actions.test.ts", [
          "success: true",
          "ok: true",
        ]),
    },
    {
      key: "proposal_phase_is_server_authorized_and_ui_inactive_by_default",
      ready:
        contains("services/ai/copilot-proposal-release.service.ts", [
          "PHASE_3_READ_AND_DRAFT",
          'state: "ACTIVE_INTERNAL"',
          "STOQUIFY_AGENT_RELEASE_COMMIT_SHA",
          "release.commitSha",
          "COPILOT_PROPOSAL_RELEASE_MANIFEST_HASH",
          'executionAuthority: "NONE"',
          "STOQUIFY_COPILOT_PROPOSAL_KILL_SWITCH",
        ]) &&
        contains("components/agents/AgentCommandPanel.tsx", [
          "proposalDraftsEnabled = false",
          "proposalDraftsEnabled && brief.runId",
        ]),
    },
    {
      key: "analysis_and_proposal_events_are_recorded",
      ready:
        contains("actions/agents/command-agent.actions.ts", [
          "AI_ANALYSIS_REQUESTED",
        ]) &&
        contains("services/ai/copilot-proposal.service.ts", [
          "AI_ACTION_PROPOSAL_CREATED",
          "AI_ACTION_PROPOSAL_ACCEPTED",
          "AI_ACTION_PROPOSAL_REJECTED",
        ]),
    },
    {
      key: "proposal_idempotency_and_hash_evidence_are_durable",
      ready: contains("services/ai/copilot-proposal.service.ts", [
        "requestHash",
        "sourceHash",
        "organizationId_idempotencyKey",
        "hashBusinessPayload",
      ]),
    },
    {
      key: "proposal_notifications_are_outboxed",
      ready: contains("services/ai/copilot-proposal.service.ts", [
        'channel: "NOTIFICATION"',
        "requiresHumanConfirmation: true",
      ]),
    },
    {
      key: "proposal_ui_exposes_loading_error_and_human_decision",
      ready: contains("components/copilot/CopilotProposalControls.tsx", [
        "Loader2",
        'role="alert"',
        "Accept proposal",
        "Reject proposal",
        "cannot execute the workflow",
      ]),
    },
    {
      key: "proposal_schema_has_additive_migration",
      ready: contains(
        "prisma/migrations/20260727170000_ai_copilot_proposal_guardrails/migration.sql",
        [
          'CREATE TABLE "ai_action_proposals"',
          'REFERENCES "agent_runs"("id", "organizationId")',
          "AiActionProposalStatus",
        ],
      ),
    },
    {
      key: "copilot_guardrail_gate_is_policy_wired",
      ready: contains("package.json", [
        '"ai:copilot:guardrails:gate": "node scripts/ai-copilot-guardrails-gate.js"',
        "npm run ai:copilot:guardrails:gate",
      ]),
    },
    {
      key: "hallucination_unsafe_tenant_rbac_and_ui_tests_exist",
      ready:
        contains(
          "services/agents/__tests__/agent-output-validator.service.test.ts",
          ["rejects a material priority whose evidence citation is unknown"],
        ) &&
        contains("services/ai/__tests__/copilot-proposal.service.test.ts", [
          "autonomous posting",
          "cross-tenant",
          "unbound evidence",
          "human acceptance",
          "governed agent run",
          "governed window",
        ]) &&
        contains(
          "actions/ai/__tests__/copilot-proposal.actions.test.ts",
          ["fresh authentication", "tenant", "governed Phase 3 release"],
        ) &&
        contains(
          "services/ai/__tests__/copilot-proposal-release.service.test.ts",
          ["active governed release", "fails closed"],
        ) &&
        contains(
          "components/copilot/__tests__/CopilotProposalControls.test.tsx",
          ["explicit human decision", "cannot execute"],
        ),
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    status: checks.every((check) => check.ready) ? "ready" : "blocked",
    checks,
    blockers: checks.filter((check) => !check.ready).map((check) => check.key),
    authority: {
      analysis: "read_only",
      proposalExecution: "none",
      autonomousPosting: false,
      autonomousPayment: false,
      autonomousApproval: false,
      autonomousFiling: false,
      autonomousCertification: false,
      credentialMutation: false,
    },
  }
}

function render(result) {
  return [
    "# AI Copilot Guardrails Readiness",
    "",
    `Generated: ${result.generatedAt}`,
    `Status: ${result.status}`,
    "",
    "## Summary",
    "",
    `- Checks ready: ${result.checks.filter((check) => check.ready).length}/${result.checks.length}`,
    `- Blockers: ${result.blockers.length}`,
    "- Copilot analysis authority: read-only",
    "- Proposal execution authority: none",
    "",
    "## Checks",
    "",
    ...result.checks.map(
      (check) => `- ${check.ready ? "ready" : "blocked"}: ${check.key}`,
    ),
    "",
    "## Blockers",
    "",
    ...(result.blockers.length
      ? result.blockers.map((blocker) => `- ${blocker}`)
      : ["- None"]),
    "",
    "## Safety Boundary",
    "",
    "- The copilot may analyze trusted tenant evidence and prepare review proposals.",
    "- A proposal acceptance records human intent only and does not invoke a workflow.",
    "- Posting, payment, approval, reversal, certification, filing, submission, credential, role, permission, and entitlement authority remain prohibited.",
    "",
  ].join("\n")
}

function main() {
  const args = process.argv.slice(2)
  const mode = args.includes("--mode")
    ? args[args.indexOf("--mode") + 1]
    : "fail"
  const out = args.includes("--out")
    ? args[args.indexOf("--out") + 1]
    : "what-next/ai-copilot-guardrails-readiness.md"
  const jsonOut = args.includes("--json-out")
    ? args[args.indexOf("--json-out") + 1]
    : "what-next/ai-copilot-guardrails-readiness.json"
  const result = evaluate()
  const markdown = render(result)

  fs.mkdirSync(path.dirname(path.join(ROOT, out)), { recursive: true })
  fs.writeFileSync(path.join(ROOT, out), markdown)
  fs.writeFileSync(path.join(ROOT, jsonOut), `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(markdown)

  if (mode === "fail" && result.status !== "ready") process.exitCode = 1
}

if (require.main === module) main()

module.exports = { evaluate, render }
