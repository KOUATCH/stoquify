import "server-only";

import { createHash } from "node:crypto";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  NotFoundError,
} from "@/services/_shared/action-errors";

export type WorkflowAssuranceDeadLetterRecoveryResult = {
  sourceDeliveryId: string;
  recoveryDeliveryId: string;
  status: "PENDING";
  requestHash: string;
  replayed: boolean;
};

export async function recoverWorkflowAssuranceDeadLetter(input: {
  organizationId: string;
  deliveryId: string;
  actorId: string;
  reason: string;
  idempotencyKey: string;
  now?: Date;
}): Promise<WorkflowAssuranceDeadLetterRecoveryResult> {
  const reason = input.reason.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  if (reason.length < 8 || reason.length > 500) {
    throw new BusinessRuleError(
      "Dead-letter recovery requires a bounded operational reason.",
    );
  }
  if (idempotencyKey.length < 8 || idempotencyKey.length > 120) {
    throw new BusinessRuleError(
      "Dead-letter recovery requires a valid idempotency key.",
    );
  }

  const now = input.now ?? new Date();
  const requestHash = sha256(
    JSON.stringify({
      actorId: input.actorId,
      deliveryId: input.deliveryId,
      organizationId: input.organizationId,
      reason,
    }),
  );
  const recoveryDedupeKey = [
    "recovery",
    input.deliveryId,
    sha256(idempotencyKey).slice(0, 32),
  ].join(":");

  return db.$transaction(async (tx) => {
    const source = await tx.workflowAssuranceAlertDelivery.findFirst({
      where: {
        id: input.deliveryId,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        organizationId: true,
        incidentId: true,
        channel: true,
        status: true,
        recipientId: true,
        recipientRole: true,
        title: true,
        message: true,
        actionRoute: true,
        attemptCount: true,
      },
    });
    if (!source) {
      throw new NotFoundError(
        "Workflow assurance alert delivery was not found.",
      );
    }
    if (source.channel !== "WEBHOOK") {
      throw new BusinessRuleError(
        "Only webhook dead letters support operator recovery.",
      );
    }

    const actorCount = await tx.user.count({
      where: {
        id: input.actorId,
        organizationId: input.organizationId,
        isActive: true,
      },
    });
    if (actorCount !== 1) {
      throw new BusinessRuleError(
        "Dead-letter recovery requires an active tenant operator.",
      );
    }

    const existing = await tx.workflowAssuranceAlertDelivery.findFirst({
      where: {
        organizationId: input.organizationId,
        incidentId: source.incidentId,
        channel: "WEBHOOK",
        dedupeKey: recoveryDedupeKey,
      },
      select: {
        id: true,
        metadata: true,
      },
    });
    if (existing) {
      const metadata = recordMetadata(existing.metadata);
      if (metadata.recoveryRequestHash !== requestHash) {
        throw new BusinessRuleError(
          "Dead-letter recovery idempotency key conflicts with another request.",
        );
      }
      return {
        sourceDeliveryId: source.id,
        recoveryDeliveryId: existing.id,
        status: "PENDING",
        requestHash,
        replayed: true,
      };
    }

    if (source.status !== "DEAD_LETTER") {
      throw new BusinessRuleError(
        "Only terminal dead-letter deliveries can be recovered.",
      );
    }

    const recovery = await tx.workflowAssuranceAlertDelivery.create({
      data: {
        organizationId: source.organizationId,
        incidentId: source.incidentId,
        channel: "WEBHOOK",
        status: "PENDING",
        dedupeKey: recoveryDedupeKey,
        recipientId: source.recipientId,
        recipientRole: source.recipientRole,
        title: source.title,
        message: source.message,
        actionRoute: source.actionRoute,
        attemptCount: 0,
        nextAttemptAt: now,
        metadata: {
          recoveryOfDeliveryId: source.id,
          recoveryRequestHash: requestHash,
          recoveryReason: reason,
          recoveredById: input.actorId,
          recoveredAt: now.toISOString(),
        },
      },
      select: { id: true },
    });

    await tx.workflowAssuranceIncidentEvent.create({
      data: {
        organizationId: input.organizationId,
        incidentId: source.incidentId,
        eventType: "ALERT_RECORDED",
        actorId: input.actorId,
        message: "Workflow assurance dead-letter recovery queued",
        metadata: {
          sourceDeliveryId: source.id,
          recoveryDeliveryId: recovery.id,
          requestHash,
        },
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "WorkflowAssuranceAlertDelivery",
        entityId: recovery.id,
        action: "WORKFLOW_ASSURANCE_ALERT_RECOVERY_QUEUED",
        userId: input.actorId,
        organizationId: input.organizationId,
        changes: {
          before: {
            sourceDeliveryId: source.id,
            status: source.status,
            attemptCount: source.attemptCount,
          },
          after: {
            recoveryDeliveryId: recovery.id,
            status: "PENDING",
            requestHash,
            reason,
          },
        },
      },
    });

    return {
      sourceDeliveryId: source.id,
      recoveryDeliveryId: recovery.id,
      status: "PENDING",
      requestHash,
      replayed: false,
    };
  });
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function recordMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
