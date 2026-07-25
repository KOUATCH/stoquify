import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Prisma } from "@prisma/client";

import { db } from "@/prisma/db";
import { reconcileAgentRuntimeControlPlane } from "@/services/agents/agent-control-plane-reconciliation.service";
import {
  AgentReleaseControlError,
  activateCommandAgentInternal,
  recordCommandAgentActivationApproval,
  recordCommandAgentPilotCertification,
  retireCommandAgentRelease,
} from "@/services/agents/agent-release-control.service";
import { recoverWorkflowAssuranceDeadLetter } from "@/services/assurance/assurance-alert-recovery.service";
import { dispatchWorkflowAssuranceWebhookAlerts } from "@/services/assurance/assurance-alert-delivery.service";

type State = { organizationId: string; packageId: string; certificationId: string };

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Release-control PostgreSQL smoke is forbidden in production.");
  }
  const state = JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        process.env.STOQUIFY_AGENT_E2E_STATE_PATH ??
          "what-next/agents-runtime/command-agent-enabled-e2e-state.json",
      ),
      "utf8",
    ),
  ) as State;

  const reconciliation = await reconcileAgentRuntimeControlPlane({
    correlationId: `postgres-smoke-${Date.now()}`,
  });
  const delivery = await dispatchWorkflowAssuranceWebhookAlerts({ limit: 10 });
  const release = await db.agentActivationPackage.findFirstOrThrow({
    where: { id: state.packageId, organizationId: state.organizationId },
    include: { approvals: true, owners: true, certifications: true },
  });
  const productApproval = release.approvals.find(
    (approval) => approval.approvalType === "PRODUCT",
  );
  const certification = release.certifications.find(
    (candidate) => candidate.id === state.certificationId,
  );
  assert(
    Boolean(productApproval?.idempotencyKey),
    "product approval must retain an idempotency key",
  );
  assert(
    Boolean(certification?.idempotencyKey),
    "pilot certification must retain an idempotency key",
  );

  const approvalReplay = await recordCommandAgentActivationApproval({
    organizationId: state.organizationId,
    packageId: state.packageId,
    idempotencyKey: productApproval!.idempotencyKey!,
    approvalType: productApproval!.approvalType,
    decision: productApproval!.decision,
    approverId: productApproval!.approverId,
    evidenceHash: productApproval!.evidenceHash,
    riskAcceptance:
      (productApproval!.riskAcceptance as Record<string, unknown> | null) ??
      undefined,
    decidedAt: productApproval!.decidedAt,
    expiresAt: productApproval!.expiresAt,
  });
  const certificationReplay = await recordCommandAgentPilotCertification({
    organizationId: state.organizationId,
    packageId: state.packageId,
    idempotencyKey: certification!.idempotencyKey!,
    commitSha: certification!.commitSha,
    manifestHash: certification!.manifestHash,
    suiteVersion: certification!.suiteVersion,
    ciRunId: certification!.ciRunId,
    result: certification!.result,
    reportHash: certification!.reportHash,
    passedAt: certification!.passedAt,
    expiresAt: certification!.expiresAt,
  });
  assert(approvalReplay.replayed, "approval retry must return a replay receipt");
  assert(
    certificationReplay.replayed,
    "certification retry must return a replay receipt",
  );

  let idempotencyConflict = "none";
  try {
    await recordCommandAgentPilotCertification({
      organizationId: state.organizationId,
      packageId: state.packageId,
      idempotencyKey: certification!.idempotencyKey!,
      commitSha: certification!.commitSha,
      manifestHash: certification!.manifestHash,
      suiteVersion: certification!.suiteVersion,
      ciRunId: certification!.ciRunId,
      result: certification!.result,
      reportHash: `sha256:${"f".repeat(64)}`,
      passedAt: certification!.passedAt,
      expiresAt: certification!.expiresAt,
    });
  } catch (error) {
    if (!(error instanceof AgentReleaseControlError)) throw error;
    idempotencyConflict = error.code;
  }
  assert(
    idempotencyConflict === "RELEASE_IDEMPOTENCY_CONFLICT",
    "a reused idempotency key with a different payload must fail closed",
  );

  const [approvalCountAfterReplay, certificationCountAfterReplay] =
    await Promise.all([
      db.agentActivationApproval.count({ where: { packageId: release.id } }),
      db.agentPilotCertification.count({ where: { packageId: release.id } }),
    ]);
  assert(
    approvalCountAfterReplay === release.approvals.length,
    "approval replay must not create another record",
  );
  assert(
    certificationCountAfterReplay === release.certifications.length,
    "certification replay must not create another record",
  );
  const incident = await db.workflowAssuranceIncident.findFirst({
    where: {
      organizationId: state.organizationId,
      checkKey: "agent.runtime.control_plane.integrity",
      sourceType: "agent_activation_package",
      sourceId: state.packageId,
    },
    include: { deliveries: true },
    orderBy: { updatedAt: "desc" },
  });
  const auditCount = await db.auditLog.count({
    where: { organizationId: state.organizationId, entityId: state.packageId },
  });

  assert(release.state === "PILOT_CERTIFIED", "release must remain pilot-certified");
  assert(release.activatedAt === null, "release must not be activated by certification");
  assert(release.approvals.length === 2, "two approval records are required");
  assert(
    new Set(release.approvals.map((approval) => approval.approverId)).size === 2,
    "product and security approvers must be distinct",
  );
  assert(release.owners.length === 6, "all six owner responsibilities are required");
  assert(
    release.owners.every(
      (owner) =>
        owner.acceptedAt &&
        owner.backupUserId &&
        owner.primaryUserId !== owner.backupUserId,
    ),
    "owners must be accepted and have distinct backups",
  );
  assert(
    release.certifications.some(
      (certification) =>
        certification.id === state.certificationId && certification.result === "PASSED",
    ),
    "the Playwright certification hash must be persisted",
  );
  assert(release.reconciliationState === "FAILED", "missing alert transport must fail readiness");
  assert(release.alertTransportReady === false, "alert readiness must fail closed");
  assert(Boolean(incident), "a Workflow Assurance incident must be persisted");
  assert(
    incident?.deliveries.some(
      (candidate) => candidate.channel === "WEBHOOK" && candidate.status === "PENDING",
    ) === true,
    "a pending webhook delivery must be persisted for later retry",
  );
  assert(auditCount >= 10, "release transitions must retain audit evidence");

  let activationBlocker = "none";
  try {
    await activateCommandAgentInternal({
      organizationId: state.organizationId,
      packageId: state.packageId,
      actorId: release.requestedById,
      expectedVersion: release.version,
    });
  } catch (error) {
    if (!(error instanceof AgentReleaseControlError)) throw error;
    activationBlocker = error.code;
  }
  assert(
    activationBlocker === "RELEASE_RECONCILIATION_STALE" ||
      activationBlocker === "RELEASE_ALERT_TRANSPORT_UNHEALTHY",
    "activation must be rejected by operational readiness",
  );

  const fixtureNow = new Date();
  const autoSuspensionFixture = await db.agentActivationPackage.create({
    data: {
      organizationId: release.organizationId,
      agentKey: release.agentKey,
      releaseVersion: `auto-suspend-smoke-${fixtureNow.getTime()}`,
      environment: "e2e-auto-suspend-smoke",
      commitSha: release.commitSha,
      manifestHash: release.manifestHash,
      manifest: release.manifest as Prisma.InputJsonValue,
      modelProviderPolicy:
        release.modelProviderPolicy as Prisma.InputJsonValue,
      allowedRoleCodes: release.allowedRoleCodes,
      activationStartsAt: new Date(fixtureNow.getTime() - 60_000),
      activationEndsAt: new Date(fixtureNow.getTime() + 60 * 60_000),
      residualRisks: { smokeFixture: true },
      state: "ACTIVE_INTERNAL",
      requestedById: release.requestedById,
      activatedById: release.requestedById,
      activatedAt: fixtureNow,
      lastReconciledAt: fixtureNow,
      reconciliationState: "PASSED",
      alertTransportReady: true,
    },
  });
  let autoSuspension: {
    state: string;
    reason: string | null;
    auditRecorded: boolean;
    globalDefinitionStatus: string;
    globalDefinitionRollout: string;
    reconcilerSuspendedCount: number;
    retirementState: string;
    retirementAuditRecorded: boolean;
  };
  {
    const driftReconciliation = await reconcileAgentRuntimeControlPlane({
      correlationId: `auto-suspend-smoke-${fixtureNow.getTime()}`,
      now: new Date(fixtureNow.getTime() + 1_000),
    });
    const [suspendedFixture, globalDefinition, suspensionAudit] =
      await Promise.all([
        db.agentActivationPackage.findUniqueOrThrow({
          where: { id: autoSuspensionFixture.id },
        }),
        db.agentDefinition.findUniqueOrThrow({
          where: { key: release.agentKey },
        }),
        db.auditLog.findFirst({
          where: {
            organizationId: release.organizationId,
            entityId: autoSuspensionFixture.id,
            action: "AGENT_RELEASE_SUSPENDED",
          },
        }),
      ]);
    assert(
      suspendedFixture.state === "SUSPENDED",
      "blocking active-release drift must trigger automatic suspension",
    );
    assert(
      suspendedFixture.suspensionReason?.startsWith(
        "Automated control-plane suspension:",
      ) === true,
      "automatic suspension must retain a bounded control-plane reason",
    );
    assert(
      globalDefinition.status === "ACTIVE" &&
        globalDefinition.rolloutMode === "SHADOW",
      "tenant suspension must not pause or internally activate global definitions",
    );
    assert(
      Boolean(suspensionAudit),
      "automatic suspension must retain immutable audit evidence",
    );
    assert(
      driftReconciliation.suspended >= 1,
      "reconciliation must report the automatic suspension",
    );
    const retiredFixture = await retireCommandAgentRelease({
      packageId: suspendedFixture.id,
      organizationId: release.organizationId,
      actorId: release.requestedById,
      expectedVersion: suspendedFixture.version,
      reason: "Smoke fixture retired after automatic-suspension verification.",
      now: new Date(fixtureNow.getTime() + 2_000),
    });
    const retirementAudit = await db.auditLog.findFirst({
      where: {
        organizationId: release.organizationId,
        entityId: autoSuspensionFixture.id,
        action: "AGENT_RELEASE_RETIRED",
      },
    });
    assert(
      retiredFixture.state === "RETIRED",
      "suspended releases must support governed retirement",
    );
    assert(
      Boolean(retirementAudit),
      "retirement must retain immutable audit evidence",
    );
    autoSuspension = {
      state: suspendedFixture.state,
      reason: suspendedFixture.suspensionReason,
      auditRecorded: Boolean(suspensionAudit),
      globalDefinitionStatus: globalDefinition.status,
      globalDefinitionRollout: globalDefinition.rolloutMode,
      reconcilerSuspendedCount: driftReconciliation.suspended,
      retirementState: retiredFixture.state,
      retirementAuditRecorded: Boolean(retirementAudit),
    };
  }
  const deadLetterFixture = await db.workflowAssuranceAlertDelivery.create({
    data: {
      organizationId: release.organizationId,
      incidentId: incident!.id,
      channel: "WEBHOOK",
      status: "PENDING",
      dedupeKey: `dead-letter-smoke:${fixtureNow.getTime()}`,
      title: "Agent runtime dead-letter smoke",
      message: "Synthetic non-production delivery failure.",
      actionRoute: incident!.actionRoute,
      attemptCount: 4,
      nextAttemptAt: fixtureNow,
      createdAt: new Date("2000-01-01T00:00:00.000Z"),
    },
  });
  const originalWebhookUrl = process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL;
  const originalWebhookSecret =
    process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET;
  let deadLetter: {
    state: string;
    attemptCount: number;
    nextAttemptAt: Date | null;
    workerDeadLetteredCount: number;
  };
  try {
    process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL =
      "https://alerts.invalid/assurance-smoke";
    process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET =
      "non-production-dead-letter-smoke-secret";
    const deadLetterDispatch = await dispatchWorkflowAssuranceWebhookAlerts({
      limit: 1,
      now: new Date(fixtureNow.getTime() + 3_000),
      random: () => 0,
      fetchImpl: (async () => {
        throw new Error("synthetic delivery failure");
      }) as typeof fetch,
    });
    const persistedDeadLetter =
      await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({
        where: { id: deadLetterFixture.id },
      });
    assert(
      persistedDeadLetter.status === "DEAD_LETTER",
      "exhausted webhook delivery must persist as dead letter",
    );
    assert(
      persistedDeadLetter.attemptCount === 5 &&
        persistedDeadLetter.nextAttemptAt === null,
      "dead-letter delivery must be terminal after the fifth attempt",
    );
    assert(
      deadLetterDispatch.deadLettered === 1,
      "delivery worker must report the dead-letter outcome",
    );
    deadLetter = {
      state: persistedDeadLetter.status,
      attemptCount: persistedDeadLetter.attemptCount,
      nextAttemptAt: persistedDeadLetter.nextAttemptAt,
      workerDeadLetteredCount: deadLetterDispatch.deadLettered,
    };
  } finally {
    restoreEnv("STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL", originalWebhookUrl);
    restoreEnv(
      "STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET",
      originalWebhookSecret,
    );
  }
  const recoveryInput = {
    organizationId: release.organizationId,
    deliveryId: deadLetterFixture.id,
    actorId: release.requestedById,
    reason: "Retry after the synthetic alert transport recovery check.",
    idempotencyKey: `dead-letter-recovery:${deadLetterFixture.id}`,
    now: new Date(fixtureNow.getTime() + 4_000),
  };
  const recoveredDelivery = await recoverWorkflowAssuranceDeadLetter(
    recoveryInput,
  );
  const recoveredReplay = await recoverWorkflowAssuranceDeadLetter(
    recoveryInput,
  );
  const sourceAfterRecovery =
    await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({
      where: { id: deadLetterFixture.id },
    });
  const successorAfterRecovery =
    await db.workflowAssuranceAlertDelivery.findUniqueOrThrow({
      where: { id: recoveredDelivery.recoveryDeliveryId },
    });
  const recoveryAudit = await db.auditLog.findFirst({
    where: {
      organizationId: release.organizationId,
      entityId: recoveredDelivery.recoveryDeliveryId,
      action: "WORKFLOW_ASSURANCE_ALERT_RECOVERY_QUEUED",
    },
  });
  assert(
    sourceAfterRecovery.status === "DEAD_LETTER",
    "authorized recovery must preserve the original terminal dead letter",
  );
  assert(
    successorAfterRecovery.status === "PENDING" &&
      successorAfterRecovery.attemptCount === 0,
    "authorized recovery must create a fresh pending successor",
  );
  assert(
    recoveredReplay.replayed &&
      recoveredReplay.recoveryDeliveryId ===
        recoveredDelivery.recoveryDeliveryId,
    "authorized recovery replay must return the same successor",
  );
  assert(
    Boolean(recoveryAudit),
    "authorized dead-letter recovery must record audit evidence",
  );
  const deadLetterRecovery = {
    sourceState: sourceAfterRecovery.status,
    recoveryState: successorAfterRecovery.status,
    recoveryAttemptCount: successorAfterRecovery.attemptCount,
    replayed: recoveredReplay.replayed,
    sameRecoveryDelivery:
      recoveredReplay.recoveryDeliveryId ===
      recoveredDelivery.recoveryDeliveryId,
    auditRecorded: Boolean(recoveryAudit),
  };
  const output = {
    ok: true,
    packageId: release.id,
    state: release.state,
    activatedAt: release.activatedAt,
    approvalCount: release.approvals.length,
    distinctApproverCount: new Set(
      release.approvals.map((approval) => approval.approverId),
    ).size,
    ownerCount: release.owners.length,
    certificationCount: release.certifications.length,
    auditCount,
    reconciliation,
    delivery,
    incidentId: incident?.id ?? null,
    autoSuspension,
    deadLetter,
    deadLetterRecovery,
    idempotency: {
      approvalReplayed: approvalReplay.replayed,
      certificationReplayed: certificationReplay.replayed,
      conflictCode: idempotencyConflict,
      approvalCountAfterReplay,
      certificationCountAfterReplay,
    },
    activationBlocker,
  };
  const outputPath = resolve(
    process.cwd(),
    "what-next/agents-runtime/command-agent-release-control-postgres-smoke.json",
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(output, null, 2));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`PostgreSQL smoke failed: ${message}`);
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
