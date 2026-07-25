import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/prisma/db";
import { resolveAssuranceAlertTransportReadiness } from "@/services/assurance/assurance-alert-delivery.service";
import { hashBusinessPayload } from "@/services/events/business-event.service";

import { isAgentReconcilerConfigured } from "./agent-reconciler-auth.service";

export const AGENT_RECONCILER_SCHEDULE_KEY = "agent-runtime-control-plane";
export const AGENT_RECONCILER_INTERVAL_MINUTES = 5;
export const AGENT_RECONCILER_REQUIRED_SUCCESS_WINDOWS = 3;

const ACTIVE_KEY = AGENT_RECONCILER_SCHEDULE_KEY;
const FUTURE_CLOCK_SKEW_MS = 60_000;
const MAX_INVOCATION_AGE_MS = 10 * 60_000;
const CADENCE_FRESHNESS_MS = 8 * 60_000;
const CADENCE_JITTER_MS = 90_000;
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,190}$/;
const ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,62}$/;

export type AgentReconcilerInvocationErrorCode =
  | "RECONCILER_INVOCATION_INVALID"
  | "RECONCILER_INVOCATION_STALE"
  | "RECONCILER_INVOCATION_FUTURE"
  | "RECONCILER_INVOCATION_CONFLICT"
  | "RECONCILER_INVOCATION_IN_PROGRESS"
  | "RECONCILER_INVOCATION_OVERLAP"
  | "RECONCILER_INVOCATION_STATE_INVALID"
  | "RECONCILER_INVOCATION_CONTROL_FAILED";

export type AgentReconcilerReadinessBlocker =
  | "RECONCILER_SECRET_UNAVAILABLE"
  | "RECONCILER_ALERT_TRANSPORT_UNHEALTHY"
  | "RECONCILER_SUCCESS_WINDOWS_INCOMPLETE"
  | "RECONCILER_WINDOW_FAILED"
  | "RECONCILER_CADENCE_STALE"
  | "RECONCILER_CADENCE_IRREGULAR"
  | "RECONCILER_LEASE_STALE";

export class AgentReconcilerInvocationError extends Error {
  constructor(
    readonly code: AgentReconcilerInvocationErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AgentReconcilerInvocationError";
  }
}

export type AgentReconcilerInvocationEnvelope = {
  environment: string;
  scheduleKey: typeof AGENT_RECONCILER_SCHEDULE_KEY;
  runId: string;
  correlationId: string;
  scheduledAt: Date;
  requestHash: string;
};

type StoredInvocation = {
  id: string;
  status: string;
  requestHash: string;
  scheduledAt: Date;
  startedAt: Date;
  completedAt: Date | null;
  result: Prisma.JsonValue | null;
  failureCode: string | null;
};

export type AgentReconcilerInvocationStart =
  | {
      kind: "acquired";
      invocation: StoredInvocation;
    }
  | {
      kind: "in_progress";
      invocation: StoredInvocation;
    }
  | {
      kind: "replayed";
      invocation: StoredInvocation;
    };

export function resolveAgentReconcilerInvocationEnvelope(input: {
  runId: string | null;
  scheduledAt: string | null;
  environment?: string;
  now?: Date;
}): AgentReconcilerInvocationEnvelope {
  const now = input.now ?? new Date();
  const runId = input.runId?.trim() ?? "";
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new AgentReconcilerInvocationError(
      "RECONCILER_INVOCATION_INVALID",
      "A valid scheduler run ID is required.",
      400,
    );
  }

  const scheduledAt = new Date(input.scheduledAt?.trim() ?? "");
  if (!Number.isFinite(scheduledAt.getTime())) {
    throw new AgentReconcilerInvocationError(
      "RECONCILER_INVOCATION_INVALID",
      "A valid scheduler timestamp is required.",
      400,
    );
  }
  if (scheduledAt.getTime() > now.getTime() + FUTURE_CLOCK_SKEW_MS) {
    throw new AgentReconcilerInvocationError(
      "RECONCILER_INVOCATION_FUTURE",
      "The scheduler timestamp is outside the accepted clock-skew window.",
      409,
    );
  }
  if (scheduledAt.getTime() < now.getTime() - MAX_INVOCATION_AGE_MS) {
    throw new AgentReconcilerInvocationError(
      "RECONCILER_INVOCATION_STALE",
      "The scheduler invocation is stale.",
      409,
    );
  }

  const environment = normalizeEnvironment(
    input.environment ??
      process.env.STOQUIFY_AGENT_RELEASE_ENVIRONMENT ??
      "local",
  );
  const requestHash = `sha256:${hashBusinessPayload({
    version: 1,
    environment,
    scheduleKey: AGENT_RECONCILER_SCHEDULE_KEY,
    runId,
    scheduledAt: scheduledAt.toISOString(),
  })}`;

  return {
    environment,
    scheduleKey: AGENT_RECONCILER_SCHEDULE_KEY,
    runId,
    correlationId: runId,
    scheduledAt,
    requestHash,
  };
}

export function resolveAgentReconcilerSchedulePolicy(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return {
    intervalMinutes: AGENT_RECONCILER_INTERVAL_MINUTES,
    leaseMinutes: boundedInteger(
      environment.STOQUIFY_AGENT_RECONCILER_LEASE_MINUTES,
      10,
      5,
      30,
    ),
  };
}

export async function beginAgentReconcilerInvocation(input: {
  envelope: AgentReconcilerInvocationEnvelope;
  now?: Date;
}): Promise<AgentReconcilerInvocationStart> {
  const now = input.now ?? new Date();
  const policy = resolveAgentReconcilerSchedulePolicy();
  const staleBefore = new Date(now.getTime() - policy.leaseMinutes * 60_000);

  try {
    return await db.$transaction(
      async (tx) => {
        await tx.agentReconcilerInvocation.updateMany({
          where: {
            environment: input.envelope.environment,
            scheduleKey: input.envelope.scheduleKey,
            status: "RUNNING",
            startedAt: { lt: staleBefore },
          },
          data: {
            status: "FAILED",
            activeKey: null,
            completedAt: now,
            failureCode: "RECONCILER_LEASE_EXPIRED",
          },
        });

        const existing = await tx.agentReconcilerInvocation.findUnique({
          where: invocationIdentity(input.envelope),
        });
        if (existing) {
          return classifyStoredInvocation(existing, input.envelope.requestHash);
        }

        const created = await tx.agentReconcilerInvocation.create({
          data: {
            environment: input.envelope.environment,
            scheduleKey: input.envelope.scheduleKey,
            runId: input.envelope.runId,
            requestHash: input.envelope.requestHash,
            scheduledAt: input.envelope.scheduledAt,
            startedAt: now,
            status: "RUNNING",
            activeKey: ACTIVE_KEY,
            correlationId: input.envelope.correlationId,
          },
        });
        return { kind: "acquired" as const, invocation: created };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AgentReconcilerInvocationError) throw error;
    if (!isUniqueConstraint(error)) {
      throw new AgentReconcilerInvocationError(
        "RECONCILER_INVOCATION_CONTROL_FAILED",
        "The reconciler invocation control could not be completed.",
        500,
      );
    }
    const existing = await db.agentReconcilerInvocation.findUnique({
      where: invocationIdentity(input.envelope),
    });
    if (existing) {
      return classifyStoredInvocation(existing, input.envelope.requestHash);
    }
    throw new AgentReconcilerInvocationError(
      "RECONCILER_INVOCATION_OVERLAP",
      "Another reconciler invocation owns the active lease.",
      409,
    );
  }
}

export async function completeAgentReconcilerInvocation(input: {
  invocationId: string;
  result: Prisma.InputJsonObject;
  completedWithWarnings: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const updated = await db.agentReconcilerInvocation.updateMany({
    where: {
      id: input.invocationId,
      status: "RUNNING",
      activeKey: ACTIVE_KEY,
    },
    data: {
      status: input.completedWithWarnings
        ? "COMPLETED_WITH_WARNINGS"
        : "COMPLETED",
      result: input.result,
      completedAt: now,
      activeKey: null,
      failureCode: null,
    },
  });
  if (updated.count !== 1) {
    throw new AgentReconcilerInvocationError(
      "RECONCILER_INVOCATION_STATE_INVALID",
      "The reconciler invocation no longer owns the active lease.",
      409,
    );
  }
  return db.agentReconcilerInvocation.findUniqueOrThrow({
    where: { id: input.invocationId },
  });
}

export async function failAgentReconcilerInvocation(input: {
  invocationId: string;
  failureCode?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return db.agentReconcilerInvocation.updateMany({
    where: {
      id: input.invocationId,
      status: "RUNNING",
      activeKey: ACTIVE_KEY,
    },
    data: {
      status: "FAILED",
      completedAt: now,
      activeKey: null,
      failureCode: normalizeFailureCode(input.failureCode),
    },
  });
}

export async function getAgentReconcilerReadiness(input?: {
  environment?: string;
  now?: Date;
}) {
  const now = input?.now ?? new Date();
  const environment = normalizeEnvironment(
    input?.environment ??
      process.env.STOQUIFY_AGENT_RELEASE_ENVIRONMENT ??
      "local",
  );
  const policy = resolveAgentReconcilerSchedulePolicy();
  const [invocations, activeInvocation] = await Promise.all([
    db.agentReconcilerInvocation.findMany({
      where: {
        environment,
        scheduleKey: AGENT_RECONCILER_SCHEDULE_KEY,
      },
      orderBy: { scheduledAt: "desc" },
      take: AGENT_RECONCILER_REQUIRED_SUCCESS_WINDOWS,
      select: {
        runId: true,
        status: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
      },
    }),
    db.agentReconcilerInvocation.findFirst({
      where: {
        environment,
        scheduleKey: AGENT_RECONCILER_SCHEDULE_KEY,
        status: "RUNNING",
        activeKey: ACTIVE_KEY,
      },
      select: { startedAt: true },
    }),
  ]);
  const transport = resolveAssuranceAlertTransportReadiness();
  return {
    environment,
    scheduleKey: AGENT_RECONCILER_SCHEDULE_KEY,
    intervalMinutes: policy.intervalMinutes,
    ...assessAgentReconcilerReadiness({
      invocations,
      activeStartedAt: activeInvocation?.startedAt ?? null,
      secretConfigured: isAgentReconcilerConfigured(
        process.env.STOQUIFY_AGENT_RECONCILER_SECRET,
      ),
      alertTransportReady: transport.ready,
      now,
      leaseMinutes: policy.leaseMinutes,
    }),
  };
}

export function assessAgentReconcilerReadiness(input: {
  invocations: Array<{
    runId: string;
    status: string;
    scheduledAt: Date;
    startedAt: Date;
    completedAt: Date | null;
  }>;
  activeStartedAt: Date | null;
  secretConfigured: boolean;
  alertTransportReady: boolean;
  now: Date;
  leaseMinutes: number;
}) {
  const blockers: AgentReconcilerReadinessBlocker[] = [];
  const windows = [...input.invocations]
    .sort((left, right) => right.scheduledAt.getTime() - left.scheduledAt.getTime())
    .slice(0, AGENT_RECONCILER_REQUIRED_SUCCESS_WINDOWS);

  if (!input.secretConfigured) blockers.push("RECONCILER_SECRET_UNAVAILABLE");
  if (!input.alertTransportReady) {
    blockers.push("RECONCILER_ALERT_TRANSPORT_UNHEALTHY");
  }
  if (windows.length < AGENT_RECONCILER_REQUIRED_SUCCESS_WINDOWS) {
    blockers.push("RECONCILER_SUCCESS_WINDOWS_INCOMPLETE");
  }
  if (windows.some((window) => window.status !== "COMPLETED")) {
    blockers.push("RECONCILER_WINDOW_FAILED");
  }

  const latest = windows[0];
  if (
    !latest ||
    input.now.getTime() - latest.scheduledAt.getTime() > CADENCE_FRESHNESS_MS
  ) {
    blockers.push("RECONCILER_CADENCE_STALE");
  }
  for (let index = 0; index < windows.length - 1; index += 1) {
    const interval =
      windows[index].scheduledAt.getTime() -
      windows[index + 1].scheduledAt.getTime();
    const expected = AGENT_RECONCILER_INTERVAL_MINUTES * 60_000;
    if (Math.abs(interval - expected) > CADENCE_JITTER_MS) {
      blockers.push("RECONCILER_CADENCE_IRREGULAR");
      break;
    }
  }

  const activeLeaseStale = Boolean(
    input.activeStartedAt &&
      input.activeStartedAt.getTime() <
        input.now.getTime() - input.leaseMinutes * 60_000,
  );
  if (activeLeaseStale) blockers.push("RECONCILER_LEASE_STALE");

  return {
    ready: blockers.length === 0,
    blockers: [...new Set(blockers)],
    requiredSuccessfulWindows: AGENT_RECONCILER_REQUIRED_SUCCESS_WINDOWS,
    successfulWindowCount: windows.filter(
      (window) => window.status === "COMPLETED",
    ).length,
    latestScheduledAt: latest?.scheduledAt.toISOString() ?? null,
    latestCompletedAt: latest?.completedAt?.toISOString() ?? null,
    windows: windows.map((window) => ({
      runId: window.runId,
      status: window.status,
      scheduledAt: window.scheduledAt.toISOString(),
      completedAt: window.completedAt?.toISOString() ?? null,
    })),
    activeInvocation: Boolean(input.activeStartedAt),
    activeLeaseStale,
    alertTransportReady: input.alertTransportReady,
  };
}

function classifyStoredInvocation(
  stored: StoredInvocation,
  requestHash: string,
): AgentReconcilerInvocationStart {
  if (stored.requestHash !== requestHash) {
    throw new AgentReconcilerInvocationError(
      "RECONCILER_INVOCATION_CONFLICT",
      "The scheduler run ID was already used for a different request.",
      409,
    );
  }
  if (stored.status === "RUNNING") {
    return { kind: "in_progress", invocation: stored };
  }
  return { kind: "replayed", invocation: stored };
}

function invocationIdentity(envelope: AgentReconcilerInvocationEnvelope) {
  return {
    agent_reconciler_invocation_identity: {
      environment: envelope.environment,
      scheduleKey: envelope.scheduleKey,
      runId: envelope.runId,
    },
  };
}

function normalizeEnvironment(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!ENVIRONMENT_PATTERN.test(normalized)) {
    throw new AgentReconcilerInvocationError(
      "RECONCILER_INVOCATION_INVALID",
      "The reconciler environment is invalid.",
      400,
    );
  }
  return normalized;
}

function normalizeFailureCode(value: string | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^[A-Z0-9_]{3,100}$/.test(normalized)
    ? normalized
    : "RECONCILER_EXECUTION_FAILED";
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
}

function isUniqueConstraint(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
