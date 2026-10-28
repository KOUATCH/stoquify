import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/prisma/db";
import { ApplicationError } from "@/services/_shared/action-errors";

const MAX_ATTEMPTS = 5;
const LOCK_TIMEOUT_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

type FetchLike = typeof fetch;

export type AssuranceAlertTransportReadiness =
  | { ready: true; url: string }
  | { ready: false; reason: string };

export function resolveAssuranceAlertTransportReadiness(
  environment = process.env.NODE_ENV,
): AssuranceAlertTransportReadiness {
  const rawUrl = process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL?.trim();
  const secret = process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET?.trim();
  if (!rawUrl) return { ready: false, reason: "webhook_url_missing" };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ready: false, reason: "webhook_url_invalid" };
  }
  if (
    url.username ||
    url.password ||
    !["http:", "https:"].includes(url.protocol)
  ) {
    return { ready: false, reason: "webhook_url_unsafe" };
  }
  if (environment === "production" && url.protocol !== "https:") {
    return { ready: false, reason: "webhook_https_required" };
  }
  if (environment === "production" && (!secret || secret.length < 32)) {
    return { ready: false, reason: "webhook_secret_missing_or_weak" };
  }
  return { ready: true, url: url.toString() };
}

export async function queueWorkflowAssuranceWebhookDelivery(input: {
  incidentId: string;
  reason: "created" | "reopened" | "refreshed";
}) {
  const incident = await db.workflowAssuranceIncident.findUnique({
    where: { id: input.incidentId },
    select: {
      id: true,
      organizationId: true,
      sourceHash: true,
      severity: true,
      actionRoute: true,
      assignedRole: true,
    },
  });
  if (!incident) return null;

  const dedupeKey = `${input.reason}:${incident.sourceHash}`;
  return db.workflowAssuranceAlertDelivery.upsert({
    where: {
      organizationId_incidentId_channel_dedupeKey: {
        organizationId: incident.organizationId,
        incidentId: incident.id,
        channel: "WEBHOOK",
        dedupeKey,
      },
    },
    create: {
      organizationId: incident.organizationId,
      incidentId: incident.id,
      channel: "WEBHOOK",
      status: "PENDING",
      dedupeKey,
      recipientRole: incident.assignedRole,
      title: "Stoquify agent runtime control requires attention",
      message: "Review the linked Workflow Assurance incident.",
      actionRoute: incident.actionRoute,
      nextAttemptAt: new Date(),
      metadata: {
        reason: input.reason,
        severity: incident.severity,
        sourceHash: incident.sourceHash,
      },
    },
    update: {
      recipientRole: incident.assignedRole,
      title: "Stoquify agent runtime control requires attention",
      message: "Review the linked Workflow Assurance incident.",
      actionRoute: incident.actionRoute,
      metadata: {
        reason: input.reason,
        severity: incident.severity,
        sourceHash: incident.sourceHash,
      },
    },
  });
}

export async function dispatchWorkflowAssuranceWebhookAlerts(input?: {
  limit?: number;
  workerId?: string;
  now?: Date;
  fetchImpl?: FetchLike;
  random?: () => number;
}) {
  const now = input?.now ?? new Date();
  const workerId = input?.workerId ?? randomUUID();
  const limit = Math.max(1, Math.min(input?.limit ?? 20, 100));
  const transport = resolveAssuranceAlertTransportReadiness();
  if (!transport.ready) {
    return {
      ready: false as const,
      delivered: 0,
      retried: 0,
      failed: 0,
      deadLettered: 0,
      reason: transport.reason,
    };
  }

  await db.workflowAssuranceAlertDelivery.updateMany({
    where: {
      channel: "WEBHOOK",
      status: "PROCESSING",
      lockedAt: { lt: new Date(now.getTime() - LOCK_TIMEOUT_MS) },
    },
    data: {
      status: "PENDING",
      lockedAt: null,
      lockedBy: null,
      nextAttemptAt: now,
    },
  });

  const candidates = await db.workflowAssuranceAlertDelivery.findMany({
    where: {
      channel: "WEBHOOK",
      status: "PENDING",
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    include: {
      incident: {
        select: {
          id: true,
          organizationId: true,
          workflow: true,
          checkKey: true,
          sourceType: true,
          sourceId: true,
          severity: true,
          actionRoute: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let delivered = 0;
  let retried = 0;
  let failed = 0;
  let deadLettered = 0;
  const fetchImpl = input?.fetchImpl ?? fetch;
  for (const candidate of candidates) {
    const claimed = await db.workflowAssuranceAlertDelivery.updateMany({
      where: { id: candidate.id, status: "PENDING" },
      data: {
        status: "PROCESSING",
        lockedAt: now,
        lockedBy: workerId,
        attemptCount: { increment: 1 },
      },
    });
    if (claimed.count !== 1) continue;

    const attemptCount = candidate.attemptCount + 1;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetchImpl(transport.url, {
          method: "POST",
          headers: webhookHeaders(candidate.dedupeKey),
          body: JSON.stringify({
            event: "stoquify.workflow_assurance.incident",
            deliveryId: candidate.id,
            dedupeKey: candidate.dedupeKey,
            incident: candidate.incident,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) {
        throw new ApplicationError(
          "INTERNAL_ERROR",
          `HTTP_${response.status}`,
          500,
          false,
        );
      }

      await db.workflowAssuranceAlertDelivery.update({
        where: { id: candidate.id },
        data: {
          status: "DELIVERED",
          deliveredAt: now,
          failedAt: null,
          failureCode: null,
          failureReason: null,
          nextAttemptAt: null,
          lockedAt: null,
          lockedBy: null,
          externalReference:
            response.headers.get("x-request-id")?.slice(0, 200) ?? null,
        },
      });
      delivered += 1;
    } catch (error) {
      const exhausted = attemptCount >= MAX_ATTEMPTS;
      await db.workflowAssuranceAlertDelivery.update({
        where: { id: candidate.id },
        data: {
          status: exhausted ? "DEAD_LETTER" : "PENDING",
          failedAt: exhausted ? now : null,
          failureCode: safeFailureCode(error),
          failureReason:
            "Webhook delivery did not acknowledge the assurance alert.",
          nextAttemptAt: exhausted
            ? null
            : new Date(
                now.getTime() +
                  workflowAssuranceRetryDelayMs(attemptCount, input?.random),
              ),
          lockedAt: null,
          lockedBy: null,
        },
      });
      if (exhausted) {
        failed += 1;
        deadLettered += 1;
      } else retried += 1;
    }
  }

  return {
    ready: true as const,
    delivered,
    retried,
    failed,
    deadLettered,
  };
}

function webhookHeaders(dedupeKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "idempotency-key": dedupeKey,
    "user-agent": "stoquify-workflow-assurance/1",
  };
  const secret = process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET?.trim();
  if (secret) headers.authorization = `Bearer ${secret}`;
  return headers;
}

export function workflowAssuranceRetryDelayMs(
  attempt: number,
  random: () => number = Math.random,
) {
  const exponential = Math.min(
    60 * 60_000,
    30_000 * 2 ** Math.max(0, attempt - 1),
  );
  const sample = random();
  const bounded = Number.isFinite(sample)
    ? Math.max(0, Math.min(1, sample))
    : 0.5;
  return Math.round(exponential * (0.8 + 0.2 * bounded));
}

function safeFailureCode(error: unknown) {
  const value = error instanceof Error ? error.message : "DELIVERY_ERROR";
  return /^HTTP_\d{3}$/.test(value)
    ? value
    : value === "This operation was aborted"
      ? "TIMEOUT"
      : "DELIVERY_ERROR";
}
