import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/prisma/db";
import { ApplicationError } from "@/services/_shared/action-errors";

import { COMMAND_AGENT_CODE_MANIFEST } from "./agent-definition.service";
import {
  AGENT_RELEASE_RECONCILIATION_MAX_AGE_MS,
  COMMAND_AGENT_RELEASE_MANIFEST_HASH,
  REQUIRED_AGENT_OWNER_RESPONSIBILITIES,
  assignAgentOwnerSchema,
  commandAgentReleaseManifest,
  hashAgentReleaseCommand,
  prepareAgentActivationPackageSchema,
  recordAgentApprovalSchema,
  recordAgentPilotCertificationSchema,
} from "./agent-release-contracts";

type ReleaseWithEvidence = Prisma.AgentActivationPackageGetPayload<{
  include: {
    approvals: true;
    owners: true;
    certifications: true;
  };
}>;

type ReleaseTransaction = Prisma.TransactionClient;

export type AgentReleaseCommandReceipt<T> = {
  record: T;
  replayed: boolean;
  idempotencyKey: string;
  requestHash: string;
};

export type AgentReleaseControlErrorCode =
  | "RELEASE_NOT_FOUND"
  | "RELEASE_STATE_INVALID"
  | "RELEASE_VERSION_CONFLICT"
  | "RELEASE_IDEMPOTENCY_CONFLICT"
  | "RELEASE_MANIFEST_MISMATCH"
  | "RELEASE_APPROVALS_INCOMPLETE"
  | "RELEASE_SEPARATION_OF_DUTIES"
  | "RELEASE_OWNERS_INCOMPLETE"
  | "RELEASE_CERTIFICATION_INVALID"
  | "RELEASE_RECONCILIATION_STALE"
  | "RELEASE_ALERT_TRANSPORT_UNHEALTHY"
  | "RELEASE_WINDOW_CLOSED"
  | "RELEASE_SCOPE_DENIED";

export class AgentReleaseControlError extends Error {
  constructor(
    public readonly code: AgentReleaseControlErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AgentReleaseControlError";
  }
}

export async function prepareCommandAgentActivationPackage(rawInput: unknown) {
  const input = prepareAgentActivationPackageSchema.parse(rawInput);
  const allowedRoleCodes = uniqueNormalizedRoles(input.allowedRoleCodes);

  return db.$transaction(async (tx) => {
    await assertActiveOrganizationUsers(tx, input.organizationId, [
      input.requestedById,
    ]);
    const record = await tx.agentActivationPackage.create({
      data: {
        organizationId: input.organizationId,
        agentKey: COMMAND_AGENT_CODE_MANIFEST.agentKey,
        releaseVersion: input.releaseVersion,
        environment: input.environment.toLowerCase(),
        commitSha: input.commitSha.toLowerCase(),
        manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH,
        manifest: commandAgentReleaseManifest as Prisma.InputJsonValue,
        modelProviderPolicy: {
          provider: "none",
          externalModelsAllowed: false,
        },
        allowedRoleCodes,
        activationStartsAt: input.activationStartsAt,
        activationEndsAt: input.activationEndsAt,
        residualRisks: input.residualRisks as Prisma.InputJsonValue | undefined,
        requestedById: input.requestedById,
      },
    });
    await writeReleaseAudit(tx, {
      organizationId: record.organizationId,
      packageId: record.id,
      actorId: input.requestedById,
      action: "AGENT_RELEASE_PREPARED",
      before: null,
      after: releaseAuditState(record),
    });
    return record;
  });
}

export async function reviewCommandAgentActivationPackage(input: {
  packageId: string;
  organizationId: string;
  actorId: string;
  expectedVersion: number;
}) {
  return transitionRelease({
    ...input,
    fromStates: ["DRAFT"],
    toState: "REVIEWED",
    action: "AGENT_RELEASE_REVIEWED",
  });
}

export async function recordCommandAgentActivationApproval(rawInput: unknown) {
  const input = recordAgentApprovalSchema.parse(rawInput);
  const requestHash = hashAgentReleaseCommand({
    packageId: input.packageId,
    approvalType: input.approvalType,
    decision: input.decision,
    approverId: input.approverId,
    evidenceHash: input.evidenceHash,
    riskAcceptance: input.riskAcceptance ?? null,
    decidedAt: input.decidedAt,
    expiresAt: input.expiresAt,
  });

  try {
    return await db.$transaction(
      async (tx) => {
        const release = await loadReleaseWithEvidence(
          tx,
          input.packageId,
          input.organizationId,
        );
        await assertActiveOrganizationUsers(tx, release.organizationId, [
          input.approverId,
        ]);
        const existing = await tx.agentActivationApproval.findUnique({
          where: {
            packageId_idempotencyKey: {
              packageId: release.id,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) {
          assertCommandReplayHash(existing.requestHash, requestHash);
          return releaseCommandReceipt(
            existing,
            true,
            input.idempotencyKey,
            requestHash,
          );
        }

        assertState(release.state, ["REVIEWED", "APPROVED"]);
        assertManifest(release);

        const otherType =
          input.approvalType === "PRODUCT" ? "SECURITY" : "PRODUCT";
        const other = latestApproval(release.approvals, otherType);
        if (
          input.decision === "APPROVED" &&
          other?.decision === "APPROVED" &&
          other.approverId === input.approverId
        ) {
          throw new AgentReleaseControlError(
            "RELEASE_SEPARATION_OF_DUTIES",
            "Product and security approvals must be recorded by different people.",
          );
        }

        const approval = await tx.agentActivationApproval.create({
          data: {
            packageId: release.id,
            idempotencyKey: input.idempotencyKey,
            requestHash,
            approvalType: input.approvalType,
            decision: input.decision,
            approverId: input.approverId,
            evidenceHash: input.evidenceHash,
            riskAcceptance: input.riskAcceptance as
              | Prisma.InputJsonValue
              | undefined,
            decidedAt: input.decidedAt,
            expiresAt: input.expiresAt,
            revokedAt: input.decision === "REVOKED" ? input.decidedAt : null,
          },
        });

        const approvals = [...release.approvals, approval];
        const ready = approvalsReady(approvals, new Date());
        const nextState = ready ? "APPROVED" : "REVIEWED";
        await tx.agentActivationPackage.update({
          where: { id: release.id },
          data: { state: nextState, version: { increment: 1 } },
        });
        await writeReleaseAudit(tx, {
          organizationId: release.organizationId,
          packageId: release.id,
          actorId: input.approverId,
          action: `AGENT_RELEASE_${input.approvalType}_${input.decision}`,
          before: releaseAuditState(release),
          after: {
            state: nextState,
            approvalType: input.approvalType,
            decision: input.decision,
            evidenceHash: input.evidenceHash,
            idempotencyKey: input.idempotencyKey,
            requestHash,
          },
        });
        return releaseCommandReceipt(
          approval,
          false,
          input.idempotencyKey,
          requestHash,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AgentReleaseControlError) throw error;
    if (!isUniqueConstraintError(error)) {
      throw agentReleasePersistenceError();
    }
    const existing = await db.agentActivationApproval.findFirst({
      where: {
        packageId: input.packageId,
        idempotencyKey: input.idempotencyKey,
        package: { organizationId: input.organizationId },
      },
    });
    if (!existing) throw agentReleasePersistenceError();
    assertCommandReplayHash(existing.requestHash, requestHash);
    return releaseCommandReceipt(
      existing,
      true,
      input.idempotencyKey,
      requestHash,
    );
  }
}

export async function assignCommandAgentActivationOwner(rawInput: unknown) {
  const input = assignAgentOwnerSchema.parse(rawInput);
  return db.$transaction(async (tx) => {
    const release = await loadReleaseWithEvidence(
      tx,
      input.packageId,
      input.organizationId,
    );
    assertState(release.state, ["DRAFT", "REVIEWED", "APPROVED"]);
    await assertActiveOrganizationUsers(tx, release.organizationId, [
      input.primaryUserId,
      input.backupUserId,
    ]);
    const { organizationId: _organizationId, ...ownerInput } = input;
    const owner = await tx.agentActivationOwner.upsert({
      where: {
        packageId_responsibility: {
          packageId: release.id,
          responsibility: input.responsibility,
        },
      },
      create: ownerInput,
      update: {
        primaryUserId: input.primaryUserId,
        backupUserId: input.backupUserId,
        escalationRouteRef: input.escalationRouteRef,
        runbookVersion: input.runbookVersion,
        acceptedAt: input.acceptedAt,
        validUntil: input.validUntil,
        coverageStartsAt: input.coverageStartsAt,
        coverageEndsAt: input.coverageEndsAt,
      },
    });
    await tx.agentActivationPackage.update({
      where: { id: release.id },
      data: { version: { increment: 1 } },
    });
    await writeReleaseAudit(tx, {
      organizationId: release.organizationId,
      packageId: release.id,
      actorId: input.primaryUserId,
      action: "AGENT_RELEASE_OWNER_ASSIGNED",
      before: null,
      after: {
        responsibility: input.responsibility,
        primaryUserId: input.primaryUserId,
        backupUserId: input.backupUserId ?? null,
        runbookVersion: input.runbookVersion,
      },
    });
    return owner;
  });
}

export async function acceptCommandAgentActivationOwnership(input: {
  organizationId: string;
  packageId: string;
  responsibility: (typeof REQUIRED_AGENT_OWNER_RESPONSIBILITIES)[number];
  actorId: string;
  acceptedAt?: Date;
}) {
  return db.$transaction(async (tx) => {
    const release = await loadReleaseWithEvidence(
      tx,
      input.packageId,
      input.organizationId,
    );
    assertState(release.state, ["DRAFT", "REVIEWED", "APPROVED"]);
    await assertActiveOrganizationUsers(tx, release.organizationId, [
      input.actorId,
    ]);
    const owner = await tx.agentActivationOwner.findUnique({
      where: {
        packageId_responsibility: {
          packageId: release.id,
          responsibility: input.responsibility,
        },
      },
    });
    if (!owner || owner.primaryUserId !== input.actorId) {
      throw new AgentReleaseControlError(
        "RELEASE_SCOPE_DENIED",
        "Only the assigned primary owner may accept this responsibility.",
      );
    }
    const acceptedAt = input.acceptedAt ?? new Date();
    const updated = await tx.agentActivationOwner.update({
      where: { id: owner.id },
      data: { acceptedAt },
    });
    await tx.agentActivationPackage.update({
      where: { id: release.id },
      data: { version: { increment: 1 } },
    });
    await writeReleaseAudit(tx, {
      organizationId: release.organizationId,
      packageId: release.id,
      actorId: input.actorId,
      action: "AGENT_RELEASE_OWNER_ACCEPTED",
      before: {
        responsibility: owner.responsibility,
        acceptedAt: owner.acceptedAt,
      },
      after: {
        responsibility: updated.responsibility,
        acceptedAt: updated.acceptedAt,
      },
    });
    return updated;
  });
}
export async function provisionCommandAgentShadow(input: {
  packageId: string;
  organizationId: string;
  actorId: string;
  expectedVersion: number;
}) {
  return db.$transaction(async (tx) => {
    const release = await loadReleaseWithEvidence(
      tx,
      input.packageId,
      input.organizationId,
    );
    assertExpectedVersion(release.version, input.expectedVersion);
    assertState(release.state, ["APPROVED"]);
    await assertActiveOrganizationUsers(tx, release.organizationId, [
      input.actorId,
    ]);
    assertManifest(release);
    assertApprovals(release, new Date());
    assertOwners(release, new Date());
    await assertDefinitionRecordsMatch(tx);
    await ensureDefinitionRegistryActive(tx);
    const updated = await tx.agentActivationPackage.update({
      where: { id: release.id },
      data: { state: "PROVISIONED_INACTIVE", version: { increment: 1 } },
    });
    await writeReleaseAudit(tx, {
      organizationId: release.organizationId,
      packageId: release.id,
      actorId: input.actorId,
      action: "AGENT_RELEASE_PROVISIONED_INACTIVE",
      before: releaseAuditState(release),
      after: releaseAuditState(updated),
    });
    return updated;
  });
}

export async function recordCommandAgentPilotCertification(rawInput: unknown) {
  const input = recordAgentPilotCertificationSchema.parse(rawInput);
  const requestHash = hashAgentReleaseCommand({
    packageId: input.packageId,
    commitSha: input.commitSha.toLowerCase(),
    manifestHash: input.manifestHash,
    suiteVersion: input.suiteVersion,
    ciRunId: input.ciRunId,
    result: input.result,
    reportHash: input.reportHash,
    passedAt: input.passedAt,
    expiresAt: input.expiresAt,
  });

  try {
    return await db.$transaction(
      async (tx) => {
        const release = await loadReleaseWithEvidence(
          tx,
          input.packageId,
          input.organizationId,
        );
        const existing = await tx.agentPilotCertification.findUnique({
          where: {
            packageId_idempotencyKey: {
              packageId: release.id,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) {
          assertCommandReplayHash(existing.requestHash, requestHash);
          return releaseCommandReceipt(
            existing,
            true,
            input.idempotencyKey,
            requestHash,
          );
        }

        assertState(release.state, ["PROVISIONED_INACTIVE", "PILOT_CERTIFIED"]);
        if (
          input.commitSha.toLowerCase() !== release.commitSha.toLowerCase() ||
          input.manifestHash !== release.manifestHash
        ) {
          throw new AgentReleaseControlError(
            "RELEASE_CERTIFICATION_INVALID",
            "Pilot certification does not match the governed build and manifest.",
          );
        }
        const {
          organizationId: _organizationId,
          idempotencyKey,
          ...certificationInput
        } = input;
        const certification = await tx.agentPilotCertification.create({
          data: {
            ...certificationInput,
            idempotencyKey,
            requestHash,
          },
        });
        const passed =
          input.result === "PASSED" && input.expiresAt > input.passedAt;
        await tx.agentActivationPackage.update({
          where: { id: release.id },
          data: {
            state: passed ? "PILOT_CERTIFIED" : "PROVISIONED_INACTIVE",
            version: { increment: 1 },
          },
        });
        await writeReleaseAudit(tx, {
          organizationId: release.organizationId,
          packageId: release.id,
          actorId: null,
          action: "AGENT_RELEASE_PILOT_CERTIFICATION_RECORDED",
          before: releaseAuditState(release),
          after: {
            result: input.result,
            ciRunId: input.ciRunId,
            reportHash: input.reportHash,
            idempotencyKey: input.idempotencyKey,
            requestHash,
          },
        });
        return releaseCommandReceipt(
          certification,
          false,
          input.idempotencyKey,
          requestHash,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AgentReleaseControlError) throw error;
    if (!isUniqueConstraintError(error)) {
      throw agentReleasePersistenceError();
    }
    const existing = await db.agentPilotCertification.findFirst({
      where: {
        packageId: input.packageId,
        idempotencyKey: input.idempotencyKey,
        package: { organizationId: input.organizationId },
      },
    });
    if (!existing) throw agentReleasePersistenceError();
    assertCommandReplayHash(existing.requestHash, requestHash);
    return releaseCommandReceipt(
      existing,
      true,
      input.idempotencyKey,
      requestHash,
    );
  }
}

export async function activateCommandAgentInternal(input: {
  packageId: string;
  organizationId: string;
  actorId: string;
  expectedVersion: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return db.$transaction(async (tx) => {
    const release = await loadReleaseWithEvidence(
      tx,
      input.packageId,
      input.organizationId,
    );
    assertExpectedVersion(release.version, input.expectedVersion);
    assertState(release.state, ["PILOT_CERTIFIED"]);
    await assertActiveOrganizationUsers(tx, release.organizationId, [
      input.actorId,
    ]);
    const readiness = evaluateAgentActivationReadiness(release, now);
    if (!readiness.ready) throw releaseBlockerError(readiness.blockers[0]);
    await assertDefinitionRecordsMatch(tx);
    const updated = await tx.agentActivationPackage.update({
      where: { id: release.id },
      data: {
        state: "ACTIVE_INTERNAL",
        activatedById: input.actorId,
        activatedAt: now,
        suspendedAt: null,
        suspensionReason: null,
        version: { increment: 1 },
      },
    });
    await writeReleaseAudit(tx, {
      organizationId: release.organizationId,
      packageId: release.id,
      actorId: input.actorId,
      action: "AGENT_RELEASE_ACTIVATED_INTERNAL",
      before: releaseAuditState(release),
      after: releaseAuditState(updated),
    });
    return updated;
  });
}

export async function suspendCommandAgentRelease(input: {
  packageId: string;
  organizationId: string;
  actorId?: string | null;
  reason: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return db.$transaction(async (tx) => {
    const release = await loadReleaseWithEvidence(
      tx,
      input.packageId,
      input.organizationId,
    );
    if (input.actorId) {
      await assertActiveOrganizationUsers(tx, release.organizationId, [
        input.actorId,
      ]);
    }
    assertState(release.state, [
      "PROVISIONED_INACTIVE",
      "PILOT_CERTIFIED",
      "ACTIVE_INTERNAL",
    ]);
    const updated = await tx.agentActivationPackage.update({
      where: { id: release.id },
      data: {
        state: "SUSPENDED",
        suspendedAt: now,
        suspensionReason: input.reason.slice(0, 500),
        version: { increment: 1 },
      },
    });
    await writeReleaseAudit(tx, {
      organizationId: release.organizationId,
      packageId: release.id,
      actorId: input.actorId ?? null,
      action: "AGENT_RELEASE_SUSPENDED",
      before: releaseAuditState(release),
      after: releaseAuditState(updated),
    });
    return updated;
  });
}

export async function retireCommandAgentRelease(input: {
  packageId: string;
  organizationId: string;
  actorId: string;
  expectedVersion: number;
  reason: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return db.$transaction(async (tx) => {
    const release = await loadReleaseWithEvidence(
      tx,
      input.packageId,
      input.organizationId,
    );
    await assertActiveOrganizationUsers(tx, release.organizationId, [
      input.actorId,
    ]);
    assertExpectedVersion(release.version, input.expectedVersion);
    assertState(release.state, ["SUSPENDED"]);
    const result = await tx.agentActivationPackage.updateMany({
      where: {
        id: release.id,
        version: input.expectedVersion,
        state: "SUSPENDED",
      },
      data: {
        state: "RETIRED",
        retiredAt: now,
        retiredById: input.actorId,
        retirementReason: input.reason.trim().slice(0, 500),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw new AgentReleaseControlError(
        "RELEASE_VERSION_CONFLICT",
        "The release package changed before retirement completed.",
      );
    }
    const updated = await tx.agentActivationPackage.findUniqueOrThrow({
      where: { id: release.id },
    });
    await writeReleaseAudit(tx, {
      organizationId: release.organizationId,
      packageId: release.id,
      actorId: input.actorId,
      action: "AGENT_RELEASE_RETIRED",
      before: releaseAuditState(release),
      after: releaseAuditState(updated),
    });
    return updated;
  });
}
export async function authorizeCommandAgentRelease(input: {
  organizationId: string;
  roleCodes: readonly string[];
  rolloutMode: "shadow" | "internal";
  environment?: string;
  now?: Date;
}) {
  const environment = (
    input.environment ??
    process.env.STOQUIFY_AGENT_RELEASE_ENVIRONMENT ??
    "local"
  ).toLowerCase();
  const certificationSession =
    input.rolloutMode === "internal" &&
    environment === "e2e" &&
    process.env.STOQUIFY_AGENT_CERTIFICATION_MODE === "1" &&
    process.env.NODE_ENV !== "production";
  const allowedStates = certificationSession
    ? (["PROVISIONED_INACTIVE"] as const)
    : input.rolloutMode === "internal"
      ? (["ACTIVE_INTERNAL"] as const)
      : (["PROVISIONED_INACTIVE", "PILOT_CERTIFIED"] as const);
  const release = await db.agentActivationPackage.findFirst({
    where: {
      organizationId: input.organizationId,
      agentKey: COMMAND_AGENT_CODE_MANIFEST.agentKey,
      environment,
      state: { in: [...allowedStates] },
    },
    include: { approvals: true, owners: true, certifications: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!release) {
    throw new AgentReleaseControlError(
      "RELEASE_NOT_FOUND",
      "No governed Command Agent release is available for this tenant and environment.",
    );
  }
  assertManifest(release);
  const roles = new Set(release.allowedRoleCodes.map(normalizeRole));
  if (!input.roleCodes.some((role) => roles.has(normalizeRole(role)))) {
    throw new AgentReleaseControlError(
      "RELEASE_SCOPE_DENIED",
      "The actor role is outside the approved release scope.",
    );
  }
  const now = input.now ?? new Date();
  if (input.rolloutMode === "internal" && !certificationSession) {
    const readiness = evaluateAgentActivationReadiness(release, now);
    if (!readiness.ready) throw releaseBlockerError(readiness.blockers[0]);
  } else {
    assertApprovals(release, now);
    assertOwners(release, now);
    assertWindow(release, now);
  }
  return {
    packageId: release.id,
    manifestHash: release.manifestHash,
    definitionRolloutMode: certificationSession
      ? ("shadow" as const)
      : input.rolloutMode,
    certificationSession,
  };
}

export function evaluateAgentActivationReadiness(
  release: ReleaseWithEvidence,
  now = new Date(),
) {
  const blockers: AgentReleaseControlErrorCode[] = [];
  if (release.manifestHash !== COMMAND_AGENT_RELEASE_MANIFEST_HASH) {
    blockers.push("RELEASE_MANIFEST_MISMATCH");
  }
  if (!approvalsReady(release.approvals, now)) {
    blockers.push("RELEASE_APPROVALS_INCOMPLETE");
  }
  if (!ownersReady(release.owners, release, now)) {
    blockers.push("RELEASE_OWNERS_INCOMPLETE");
  }
  if (!certificationReady(release, now)) {
    blockers.push("RELEASE_CERTIFICATION_INVALID");
  }
  if (
    !release.lastReconciledAt ||
    now.getTime() - release.lastReconciledAt.getTime() >
      AGENT_RELEASE_RECONCILIATION_MAX_AGE_MS ||
    release.reconciliationState !== "PASSED"
  ) {
    blockers.push("RELEASE_RECONCILIATION_STALE");
  }
  if (!release.alertTransportReady) {
    blockers.push("RELEASE_ALERT_TRANSPORT_UNHEALTHY");
  }
  if (now < release.activationStartsAt || now > release.activationEndsAt) {
    blockers.push("RELEASE_WINDOW_CLOSED");
  }
  return { ready: blockers.length === 0, blockers };
}

export async function recordAgentReleaseOperationalReadiness(input: {
  packageId: string;
  reconciliationState: "PASSED" | "WARNING" | "FAILED";
  alertTransportReady: boolean;
  reconciledAt?: Date;
}) {
  return db.agentActivationPackage.update({
    where: { id: input.packageId },
    data: {
      lastReconciledAt: input.reconciledAt ?? new Date(),
      reconciliationState: input.reconciliationState,
      alertTransportReady: input.alertTransportReady,
    },
  });
}

function releaseCommandReceipt<T>(
  record: T,
  replayed: boolean,
  idempotencyKey: string,
  requestHash: string,
): AgentReleaseCommandReceipt<T> {
  return { record, replayed, idempotencyKey, requestHash };
}

function assertCommandReplayHash(
  persistedHash: string | null,
  requestHash: string,
) {
  if (persistedHash !== requestHash) {
    throw new AgentReleaseControlError(
      "RELEASE_IDEMPOTENCY_CONFLICT",
      "The idempotency key was already used for a different release command.",
    );
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function agentReleasePersistenceError() {
  return new ApplicationError(
    "INTERNAL_ERROR",
    "Agent release persistence failed.",
    500,
    false,
  );
}
function approvalsReady(
  approvals: ReleaseWithEvidence["approvals"],
  now: Date,
) {
  const product = latestApproval(approvals, "PRODUCT");
  const security = latestApproval(approvals, "SECURITY");
  return Boolean(
    product?.decision === "APPROVED" &&
    security?.decision === "APPROVED" &&
    !product.revokedAt &&
    !security.revokedAt &&
    product.expiresAt > now &&
    security.expiresAt > now &&
    product.approverId !== security.approverId,
  );
}

function ownersReady(
  owners: ReleaseWithEvidence["owners"],
  release: Pick<ReleaseWithEvidence, "activationStartsAt" | "activationEndsAt">,
  now: Date,
) {
  return REQUIRED_AGENT_OWNER_RESPONSIBILITIES.every((responsibility) => {
    const owner = owners.find(
      (candidate) => candidate.responsibility === responsibility,
    );
    return Boolean(
      owner?.acceptedAt &&
      owner.backupUserId &&
      owner.primaryUserId !== owner.backupUserId &&
      owner.coverageStartsAt <= release.activationStartsAt &&
      owner.coverageEndsAt >= release.activationEndsAt &&
      (!owner.validUntil || owner.validUntil > now),
    );
  });
}

function certificationReady(release: ReleaseWithEvidence, now: Date) {
  const latest = [...release.certifications].sort(
    (a, b) => b.passedAt.getTime() - a.passedAt.getTime(),
  )[0];
  return Boolean(
    latest?.result === "PASSED" &&
    latest.commitSha.toLowerCase() === release.commitSha.toLowerCase() &&
    latest.manifestHash === release.manifestHash &&
    latest.expiresAt > now,
  );
}

function latestApproval(
  approvals: ReleaseWithEvidence["approvals"],
  approvalType: "PRODUCT" | "SECURITY",
) {
  return approvals
    .filter((approval) => approval.approvalType === approvalType)
    .sort((a, b) => b.decidedAt.getTime() - a.decidedAt.getTime())[0];
}

function assertApprovals(release: ReleaseWithEvidence, now: Date) {
  if (!approvalsReady(release.approvals, now)) {
    throw new AgentReleaseControlError(
      "RELEASE_APPROVALS_INCOMPLETE",
      "Current, separated product and security approvals are required.",
    );
  }
}

function assertOwners(release: ReleaseWithEvidence, now: Date) {
  if (!ownersReady(release.owners, release, now)) {
    throw new AgentReleaseControlError(
      "RELEASE_OWNERS_INCOMPLETE",
      "All required release owners and backups must accept current coverage.",
    );
  }
}

function assertWindow(release: ReleaseWithEvidence, now: Date) {
  if (now < release.activationStartsAt || now > release.activationEndsAt) {
    throw new AgentReleaseControlError(
      "RELEASE_WINDOW_CLOSED",
      "The governed activation window is not open.",
    );
  }
}

function assertManifest(release: Pick<ReleaseWithEvidence, "manifestHash">) {
  if (release.manifestHash !== COMMAND_AGENT_RELEASE_MANIFEST_HASH) {
    throw new AgentReleaseControlError(
      "RELEASE_MANIFEST_MISMATCH",
      "The release package does not match the deployed Command Agent manifest.",
    );
  }
}

async function assertDefinitionRecordsMatch(tx: ReleaseTransaction) {
  const manifest = COMMAND_AGENT_CODE_MANIFEST;
  const [agent, skill, tool] = await Promise.all([
    tx.agentDefinition.findUnique({ where: { key: manifest.agentKey } }),
    tx.agentSkillDefinition.findUnique({
      where: {
        key_version: {
          key: manifest.skill.key,
          version: manifest.skill.version,
        },
      },
    }),
    tx.agentToolDefinition.findUnique({ where: { key: manifest.tool.key } }),
  ]);
  const matches =
    agent?.riskLevel === manifest.riskLevel &&
    sameValues(agent.allowedToolKeys, [manifest.tool.key]) &&
    sameValues(agent.allowedSkillKeys, [manifest.skill.key]) &&
    skill?.promptHash === manifest.skill.promptHash &&
    sameValues(skill.requiredPermissions, [manifest.tool.requiredPermission]) &&
    tool?.ownerService === manifest.tool.ownerService &&
    tool.moduleSlug === manifest.tool.moduleSlug &&
    tool.requiredPermission === manifest.tool.requiredPermission &&
    tool.riskLevel === "READ_ONLY" &&
    tool.toolType === "READ_ONLY" &&
    tool.inputSchemaHash === manifest.tool.inputSchemaHash &&
    tool.outputSchemaHash === manifest.tool.outputSchemaHash;
  if (!matches) {
    throw new AgentReleaseControlError(
      "RELEASE_MANIFEST_MISMATCH",
      "Provisioned definitions do not match the code-backed manifest.",
    );
  }
}

async function ensureDefinitionRegistryActive(tx: ReleaseTransaction) {
  const manifest = COMMAND_AGENT_CODE_MANIFEST;
  await Promise.all([
    tx.agentDefinition.update({
      where: { key: manifest.agentKey },
      data: { status: "ACTIVE", rolloutMode: "SHADOW" },
    }),
    tx.agentSkillDefinition.update({
      where: {
        key_version: {
          key: manifest.skill.key,
          version: manifest.skill.version,
        },
      },
      data: { status: "ACTIVE" },
    }),
    tx.agentToolDefinition.update({
      where: { key: manifest.tool.key },
      data: { status: "ACTIVE" },
    }),
  ]);
}
async function transitionRelease(input: {
  packageId: string;
  organizationId: string;
  actorId: string;
  expectedVersion: number;
  fromStates: ReleaseWithEvidence["state"][];
  toState: ReleaseWithEvidence["state"];
  action: string;
}) {
  return db.$transaction(async (tx) => {
    const release = await loadReleaseWithEvidence(
      tx,
      input.packageId,
      input.organizationId,
    );
    await assertActiveOrganizationUsers(tx, release.organizationId, [
      input.actorId,
    ]);
    assertExpectedVersion(release.version, input.expectedVersion);
    assertState(release.state, input.fromStates);
    assertManifest(release);
    const result = await tx.agentActivationPackage.updateMany({
      where: { id: release.id, version: input.expectedVersion },
      data: { state: input.toState, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      throw new AgentReleaseControlError(
        "RELEASE_VERSION_CONFLICT",
        "The release package changed before this transition completed.",
      );
    }
    const updated = await tx.agentActivationPackage.findUniqueOrThrow({
      where: { id: release.id },
    });
    await writeReleaseAudit(tx, {
      organizationId: release.organizationId,
      packageId: release.id,
      actorId: input.actorId,
      action: input.action,
      before: releaseAuditState(release),
      after: releaseAuditState(updated),
    });
    return updated;
  });
}

async function loadReleaseWithEvidence(
  tx: ReleaseTransaction,
  packageId: string,
  organizationId: string,
) {
  const release = await tx.agentActivationPackage.findFirst({
    where: { id: packageId, organizationId },
    include: { approvals: true, owners: true, certifications: true },
  });
  if (!release) {
    throw new AgentReleaseControlError(
      "RELEASE_NOT_FOUND",
      "The governed agent release package was not found.",
    );
  }
  return release;
}

async function assertActiveOrganizationUsers(
  tx: ReleaseTransaction,
  organizationId: string,
  userIds: Array<string | undefined>,
) {
  const uniqueIds = [
    ...new Set(userIds.filter((value): value is string => Boolean(value))),
  ];
  const count = await tx.user.count({
    where: { id: { in: uniqueIds }, organizationId, isActive: true },
  });
  if (count !== uniqueIds.length) {
    throw new AgentReleaseControlError(
      "RELEASE_SCOPE_DENIED",
      "Release actors and owners must be active members of the governed organization.",
    );
  }
}

function assertState(
  actual: ReleaseWithEvidence["state"],
  expected: ReleaseWithEvidence["state"][],
) {
  if (!expected.includes(actual)) {
    throw new AgentReleaseControlError(
      "RELEASE_STATE_INVALID",
      `Release state ${actual} cannot perform this transition.`,
    );
  }
}

function assertExpectedVersion(actual: number, expected: number) {
  if (actual !== expected) {
    throw new AgentReleaseControlError(
      "RELEASE_VERSION_CONFLICT",
      "The release package version is stale.",
    );
  }
}

function releaseBlockerError(code: AgentReleaseControlErrorCode | undefined) {
  const resolved = code ?? "RELEASE_STATE_INVALID";
  return new AgentReleaseControlError(
    resolved,
    `Agent release is blocked by ${resolved}.`,
  );
}

async function writeReleaseAudit(
  tx: ReleaseTransaction,
  input: {
    organizationId: string;
    packageId: string;
    actorId: string | null;
    action: string;
    before: unknown;
    after: unknown;
  },
) {
  await tx.auditLog.create({
    data: {
      organizationId: input.organizationId,
      entityType: "AgentActivationPackage",
      entityId: input.packageId,
      action: input.action,
      userId: input.actorId,
      changes: {
        before: input.before,
        after: input.after,
      } as Prisma.InputJsonValue,
    },
  });
}

function releaseAuditState(release: {
  state: string;
  version: number;
  manifestHash: string;
  environment: string;
  organizationId: string;
}) {
  return {
    state: release.state,
    version: release.version,
    manifestHash: release.manifestHash,
    environment: release.environment,
    organizationId: release.organizationId,
  };
}

function uniqueNormalizedRoles(roles: readonly string[]) {
  return [...new Set(roles.map(normalizeRole).filter(Boolean))];
}

function normalizeRole(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sameValues(actual: readonly string[], expected: readonly string[]) {
  return (
    actual.length === expected.length &&
    expected.every((value) => actual.includes(value))
  );
}
