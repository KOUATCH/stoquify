import "server-only";

import { Prisma, type AgentActivationState } from "@prisma/client";

import { db } from "@/prisma/db";
import { ApplicationError } from "@/services/_shared/action-errors";
import {
  normalizeAssuranceResult,
  type WorkflowAssuranceCheckDefinitionContract,
} from "@/services/assurance/assurance-registry-contracts";
import { resolveWorkflowAssuranceIncident } from "@/services/assurance/assurance-incident.service";
import { persistWorkflowAssuranceDefinitionExecution } from "@/services/assurance/assurance-registry-persistence.service";

import {
  queueWorkflowAssuranceWebhookDelivery,
  resolveAssuranceAlertTransportReadiness,
} from "@/services/assurance/assurance-alert-delivery.service";

import { COMMAND_AGENT_CODE_MANIFEST } from "./agent-definition.service";
import { COMMAND_AGENT_RELEASE_MANIFEST_HASH } from "./agent-release-contracts";
import {
  AgentReleaseControlError,
  evaluateAgentActivationReadiness,
  recordAgentReleaseOperationalReadiness,
  suspendCommandAgentRelease,
} from "./agent-release-control.service";

const CHECK_DEFINITION: WorkflowAssuranceCheckDefinitionContract = {
  checkKey: "agent.runtime.control_plane.integrity",
  version: 1,
  workflow: "agent_runtime",
  moduleSlug: "dashboard",
  invariantName:
    "Agent runtime releases must retain current approval, ownership, certification, and control-plane evidence.",
  executionMode: "scheduled_scan",
  defaultSeverity: "blocking",
  requiredPermission: "controls.audit.read",
  ownerRole: "security_officer",
  enabled: true,
  enforceMode: true,
  sourceTables: [
    "agent_activation_packages",
    "agent_activation_approvals",
    "agent_activation_owners",
    "agent_pilot_certifications",
    "agent_definitions",
  ],
  actionRoute: "/dashboard/manager-action-center",
  metadata: { assuranceDomain: "agent_runtime_release_control" },
};

const RECONCILED_STATES: AgentActivationState[] = [
  "APPROVED",
  "PROVISIONED_INACTIVE",
  "PILOT_CERTIFIED",
  "ACTIVE_INTERNAL",
  "SUSPENDED",
];

export async function reconcileAgentRuntimeControlPlane(input?: {
  correlationId?: string;
  executionKey?: string;
  now?: Date;
}) {
  const now = input?.now ?? new Date();
  const definition = await upsertDefinition();
  const [packages, agent, skill, tool] = await Promise.all([
    db.agentActivationPackage.findMany({
      where: {
        agentKey: COMMAND_AGENT_CODE_MANIFEST.agentKey,
        state: { in: RECONCILED_STATES },
      },
      include: { approvals: true, owners: true, certifications: true },
      orderBy: [{ organizationId: "asc" }, { updatedAt: "desc" }],
    }),
    db.agentDefinition.findUnique({
      where: { key: COMMAND_AGENT_CODE_MANIFEST.agentKey },
    }),
    db.agentSkillDefinition.findUnique({
      where: {
        key_version: {
          key: COMMAND_AGENT_CODE_MANIFEST.skill.key,
          version: COMMAND_AGENT_CODE_MANIFEST.skill.version,
        },
      },
    }),
    db.agentToolDefinition.findUnique({
      where: { key: COMMAND_AGENT_CODE_MANIFEST.tool.key },
    }),
  ]);

  const transport = resolveAssuranceAlertTransportReadiness();
  let passed = 0;
  let failed = 0;
  let incidents = 0;
  let suspended = 0;
  for (const release of packages) {
    const activeCount = await db.agentActivationPackage.count({
      where: {
        organizationId: release.organizationId,
        agentKey: release.agentKey,
        environment: release.environment,
        state: "ACTIVE_INTERNAL",
      },
    });
    const blockers = evaluateAgentRuntimeReleaseBlockers({
      release,
      now,
      activeCount,
      transportReady: transport.ready,
      definitionsReady: agentDefinitionRegistryMatches({
        agent,
        skill,
        tool,
      }),
    });
    const ok = blockers.length === 0;
    const result = normalizeAssuranceResult({
      organizationId: release.organizationId,
      checkKey: CHECK_DEFINITION.checkKey,
      definitionVersion: CHECK_DEFINITION.version,
      status: ok ? "passed" : "failed",
      severity: ok ? "info" : "blocking",
      sourceType: "agent_activation_package",
      sourceId: release.id,
      message: ok
        ? "Agent runtime release controls reconciled successfully."
        : "Agent runtime release controls are incomplete or inconsistent.",
      recommendedAction: ok
        ? undefined
        : "Keep activation disabled, restore current evidence, then rerun reconciliation.",
      counts: { scanned: 1, passed: ok ? 1 : 0, failed: ok ? 0 : 1 },
      evidenceLinks: [
        {
          sourceTable: "agent_activation_packages",
          sourceType: "agent_activation_package",
          sourceId: release.id,
          sourceHash: release.manifestHash,
          label: `Agent release ${release.releaseVersion}`,
          route: CHECK_DEFINITION.actionRoute,
        },
      ],
      metadata: {
        state: release.state,
        environment: release.environment,
        blockers,
        manifestHash: release.manifestHash,
        correlationId: input?.correlationId ?? null,
        alertTransport: transport.ready ? "configured" : transport.reason,
      },
    });
    const persisted = await persistWorkflowAssuranceDefinitionExecution({
      organizationId: release.organizationId,
      definitionId: definition.id,
      definition: CHECK_DEFINITION,
      execution: {
        aggregate: result,
        findings: ok
          ? []
          : [
              {
                ...result,
                ordinal: 0,
                sourceType: result.sourceType ?? "agent_activation_package",
                sourceId: result.sourceId ?? release.id,
              },
            ],
      },
      executionKey: `${release.id}:${input?.executionKey ?? now.toISOString()}`,
      actorId: null,
      actorPermissionCount: 0,
      runType: "scheduled",
      runStatus: ok ? "completed" : "completed_with_warnings",
      sourceType: result.sourceType,
      sourceId: result.sourceId,
      startedAt: now,
      completedAt: now,
      durationMs: 0,
    });

    await recordAgentReleaseOperationalReadiness({
      packageId: release.id,
      reconciliationState: ok ? "PASSED" : "FAILED",
      alertTransportReady: transport.ready,
      reconciledAt: now,
    });

    if (shouldSuspendAgentRuntimeRelease(release.state, blockers)) {
      const didSuspend = await suspendDriftedActiveRelease({
        packageId: release.id,
        organizationId: release.organizationId,
        blockers,
        now,
      });
      if (didSuspend) suspended += 1;
    }

    if (ok) {
      passed += 1;
      await resolveHealedIncident(release.organizationId, release.id);
      continue;
    }

    failed += 1;
    if (persisted.incidentId) {
      incidents += 1;
      await queueWorkflowAssuranceWebhookDelivery({
        incidentId: persisted.incidentId,
        reason: "refreshed",
      });
    }
  }

  return {
    scanned: packages.length,
    passed,
    failed,
    incidents,
    suspended,
    alertTransportReady: transport.ready,
    alertTransportReason: transport.ready ? null : transport.reason,
  };
}

export function evaluateAgentRuntimeReleaseBlockers(input: {
  release: Parameters<typeof evaluateAgentActivationReadiness>[0];
  now: Date;
  activeCount: number;
  transportReady: boolean;
  definitionsReady: boolean;
}) {
  if (input.release.state === "SUSPENDED") {
    return input.definitionsReady ? [] : ["DEFINITION_PROJECTION_MISMATCH"];
  }
  const readiness = evaluateAgentActivationReadiness(input.release, input.now);
  const required = new Set([
    "RELEASE_MANIFEST_MISMATCH",
    "RELEASE_APPROVALS_INCOMPLETE",
    "RELEASE_OWNERS_INCOMPLETE",
  ]);
  if (["PILOT_CERTIFIED", "ACTIVE_INTERNAL"].includes(input.release.state)) {
    required.add("RELEASE_CERTIFICATION_INVALID");
    required.add("RELEASE_ALERT_TRANSPORT_UNHEALTHY");
  }
  if (input.release.state === "ACTIVE_INTERNAL") {
    required.add("RELEASE_RECONCILIATION_STALE");
    required.add("RELEASE_WINDOW_CLOSED");
  }
  const blockers = readiness.blockers.filter((blocker) =>
    required.has(blocker),
  );
  if (!input.definitionsReady) blockers.push("RELEASE_MANIFEST_MISMATCH");
  if (input.activeCount > 1) blockers.push("RELEASE_VERSION_CONFLICT");
  if (
    !input.transportReady &&
    ["PILOT_CERTIFIED", "ACTIVE_INTERNAL"].includes(input.release.state)
  ) {
    blockers.push("RELEASE_ALERT_TRANSPORT_UNHEALTHY");
  }
  return [...new Set(blockers)];
}

export function agentDefinitionRegistryMatches(input: {
  agent: Awaited<ReturnType<typeof db.agentDefinition.findUnique>>;
  skill: Awaited<ReturnType<typeof db.agentSkillDefinition.findUnique>>;
  tool: Awaited<ReturnType<typeof db.agentToolDefinition.findUnique>>;
}) {
  const manifest = COMMAND_AGENT_CODE_MANIFEST;
  return Boolean(
    input.agent?.status === "ACTIVE" &&
    input.agent.rolloutMode === "SHADOW" &&
    input.agent.riskLevel === manifest.riskLevel &&
    sameValues(input.agent.allowedToolKeys, [manifest.tool.key]) &&
    sameValues(input.agent.allowedSkillKeys, [manifest.skill.key]) &&
    input.skill?.status === "ACTIVE" &&
    input.skill.promptHash === manifest.skill.promptHash &&
    input.tool?.status === "ACTIVE" &&
    input.tool.requiredPermission === manifest.tool.requiredPermission &&
    input.tool.inputSchemaHash === manifest.tool.inputSchemaHash &&
    input.tool.outputSchemaHash === manifest.tool.outputSchemaHash,
  );
}

export function shouldSuspendAgentRuntimeRelease(
  state: AgentActivationState,
  blockers: readonly string[],
) {
  return state === "ACTIVE_INTERNAL" && blockers.length > 0;
}
async function suspendDriftedActiveRelease(input: {
  packageId: string;
  organizationId: string;
  blockers: readonly string[];
  now: Date;
}) {
  try {
    await suspendCommandAgentRelease({
      packageId: input.packageId,
      organizationId: input.organizationId,
      actorId: null,
      reason: `Automated control-plane suspension: ${input.blockers.join(", ")}`,
      now: input.now,
    });
    return true;
  } catch (error) {
    if (
      error instanceof AgentReleaseControlError &&
      ["RELEASE_STATE_INVALID", "RELEASE_NOT_FOUND"].includes(error.code)
    ) {
      return false;
    }
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Agent control-plane suspension failed.",
      500,
      false,
    );
  }
}
async function upsertDefinition() {
  return db.workflowAssuranceCheckDefinition.upsert({
    where: {
      checkKey_version: {
        checkKey: CHECK_DEFINITION.checkKey,
        version: CHECK_DEFINITION.version,
      },
    },
    create: definitionData(),
    update: definitionData(),
  });
}

function definitionData() {
  return {
    checkKey: CHECK_DEFINITION.checkKey,
    version: CHECK_DEFINITION.version,
    workflow: "AGENT_RUNTIME" as const,
    moduleSlug: CHECK_DEFINITION.moduleSlug,
    invariantName: CHECK_DEFINITION.invariantName,
    executionMode: "SCHEDULED_SCAN" as const,
    defaultSeverity: "BLOCKING" as const,
    requiredPermission: CHECK_DEFINITION.requiredPermission,
    ownerRole: CHECK_DEFINITION.ownerRole,
    enabled: true,
    enforceMode: true,
    sourceTables: CHECK_DEFINITION.sourceTables,
    actionRoute: CHECK_DEFINITION.actionRoute,
    metadata: CHECK_DEFINITION.metadata as Prisma.InputJsonValue,
  };
}

async function resolveHealedIncident(organizationId: string, sourceId: string) {
  const incident = await db.workflowAssuranceIncident.findFirst({
    where: {
      organizationId,
      checkKey: CHECK_DEFINITION.checkKey,
      definitionVersion: CHECK_DEFINITION.version,
      sourceType: "agent_activation_package",
      sourceId,
      status: {
        in: ["OPEN", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "REOPENED"],
      },
    },
    select: { id: true },
  });
  if (!incident) return;
  await resolveWorkflowAssuranceIncident({
    organizationId,
    incidentId: incident.id,
    actorId: null,
    note: "Agent runtime controls reconciled successfully.",
  });
}

function sameValues(
  left: readonly string[] | undefined,
  right: readonly string[],
) {
  return Boolean(
    left &&
    left.length === right.length &&
    right.every((value) => left.includes(value)),
  );
}
