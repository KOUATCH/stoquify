import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  isAgentReconcilerConfigured,
  isAuthorizedAgentReconciler,
  resolveAgentReconcilerPolicy,
} from "@/services/agents/agent-reconciler-auth.service";
import { reconcileAgentRuntimeControlPlane } from "@/services/agents/agent-control-plane-reconciliation.service";
import {
  AgentReconcilerInvocationError,
  beginAgentReconcilerInvocation,
  completeAgentReconcilerInvocation,
  failAgentReconcilerInvocation,
  getAgentReconcilerReadiness,
  resolveAgentReconcilerInvocationEnvelope,
} from "@/services/agents/agent-reconciler-invocation.service";
import { reconcileAbandonedAgentRuns } from "@/services/agents/agent-run-governance.service";
import { dispatchWorkflowAssuranceWebhookAlerts } from "@/services/assurance/assurance-alert-delivery.service";

export const dynamic = "force-dynamic";

const RUN_ID_HEADER = "x-stoquify-scheduler-run-id";
const SCHEDULED_AT_HEADER = "x-stoquify-scheduler-scheduled-at";

export async function GET(request: NextRequest) {
  const authFailure = reconcilerAuthFailure(request);
  if (authFailure) return authFailure;

  try {
    const readiness = await getAgentReconcilerReadiness();
    return NextResponse.json(
      { ok: readiness.ready, data: readiness },
      { status: readiness.ready ? 200 : 503 },
    );
  } catch {
    logger.error("agent reconciler readiness check failed", {
      operation: "agent.reconciler.readiness",
      failureCode: "RECONCILER_READINESS_UNAVAILABLE",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Agent reconciler readiness is unavailable.",
        code: "RECONCILER_READINESS_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authFailure = reconcilerAuthFailure(request);
  if (authFailure) return authFailure;

  let envelope;
  try {
    envelope = resolveAgentReconcilerInvocationEnvelope({
      runId: request.headers.get(RUN_ID_HEADER),
      scheduledAt: request.headers.get(SCHEDULED_AT_HEADER),
    });
  } catch (error) {
    return invocationErrorResponse(error);
  }

  let start;
  try {
    start = await beginAgentReconcilerInvocation({ envelope });
  } catch (error) {
    return invocationErrorResponse(error);
  }

  if (start.kind === "in_progress") {
    return NextResponse.json(
      {
        ok: false,
        error: "A reconciler invocation is already in progress.",
        code: "RECONCILER_INVOCATION_IN_PROGRESS",
        correlationId: envelope.correlationId,
      },
      { status: 409 },
    );
  }
  if (start.kind === "replayed") {
    const successful = ["COMPLETED", "COMPLETED_WITH_WARNINGS"].includes(
      start.invocation.status,
    );
    return NextResponse.json(
      {
        ok: successful,
        replayed: true,
        status: start.invocation.status,
        correlationId: envelope.correlationId,
        data: start.invocation.result,
        failureCode: start.invocation.failureCode,
      },
      { status: successful ? 200 : 409 },
    );
  }

  const policy = resolveAgentReconcilerPolicy();
  const olderThan = new Date(
    envelope.scheduledAt.getTime() - policy.olderThanMinutes * 60_000,
  );

  try {
    const reconciledCount = await reconcileAbandonedAgentRuns({
      olderThan,
      limit: policy.limit,
    });
    const controlPlane = await reconcileAgentRuntimeControlPlane({
      correlationId: envelope.correlationId,
      executionKey: envelope.runId,
      now: envelope.scheduledAt,
    });
    const alertDelivery = await dispatchWorkflowAssuranceWebhookAlerts({
      workerId: envelope.correlationId,
      limit: policy.limit,
    });
    const result = {
      reconciledCount,
      olderThan: olderThan.toISOString(),
      correlationId: envelope.correlationId,
      scheduledAt: envelope.scheduledAt.toISOString(),
      controlPlane,
      alertDelivery,
    };
    const completedWithWarnings =
      controlPlane.failed > 0 ||
      controlPlane.suspended > 0 ||
      !alertDelivery.ready ||
      alertDelivery.retried > 0 ||
      alertDelivery.failed > 0 ||
      alertDelivery.deadLettered > 0;

    await completeAgentReconcilerInvocation({
      invocationId: start.invocation.id,
      result,
      completedWithWarnings,
    });

    logger.info("agent reconciliation schedule completed", {
      operation: "agent.run.reconcile_abandoned",
      correlationId: envelope.correlationId,
      scheduledAt: envelope.scheduledAt.toISOString(),
      reconciledCount,
      olderThanMinutes: policy.olderThanMinutes,
      limit: policy.limit,
      completedWithWarnings,
    });
    return NextResponse.json({
      ok: true,
      replayed: false,
      status: completedWithWarnings
        ? "COMPLETED_WITH_WARNINGS"
        : "COMPLETED",
      data: result,
    });
  } catch {
    try {
      await failAgentReconcilerInvocation({
        invocationId: start.invocation.id,
        failureCode: "RECONCILER_EXECUTION_FAILED",
      });
    } catch {
      logger.error("agent reconciler invocation failure could not be recorded", {
        operation: "agent.reconciler.invocation_failure_record",
        correlationId: envelope.correlationId,
        failureCode: "RECONCILER_FAILURE_RECORD_UNAVAILABLE",
      });
    }
    logger.error("agent reconciliation schedule failed", {
      operation: "agent.run.reconcile_abandoned",
      correlationId: envelope.correlationId,
      scheduledAt: envelope.scheduledAt.toISOString(),
      failureCode: "RECONCILER_EXECUTION_FAILED",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Agent reconciliation failed.",
        code: "RECONCILER_EXECUTION_FAILED",
        correlationId: envelope.correlationId,
      },
      { status: 500 },
    );
  }
}

function reconcilerAuthFailure(request: NextRequest) {
  if (
    !isAgentReconcilerConfigured(
      process.env.STOQUIFY_AGENT_RECONCILER_SECRET,
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "Agent reconciler is not configured." },
      { status: 503 },
    );
  }
  if (
    !isAuthorizedAgentReconciler({
      authorizationHeader: request.headers.get("authorization"),
      configuredSecret: process.env.STOQUIFY_AGENT_RECONCILER_SECRET,
      previousSecret: process.env.STOQUIFY_AGENT_RECONCILER_SECRET_PREVIOUS,
    })
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }
  return null;
}

function invocationErrorResponse(error: unknown) {
  if (error instanceof AgentReconcilerInvocationError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  logger.error("agent reconciler invocation control failed", {
    operation: "agent.reconciler.invocation_control",
    failureCode: "RECONCILER_INVOCATION_CONTROL_FAILED",
  });
  return NextResponse.json(
    {
      ok: false,
      error: "Agent reconciler invocation control failed.",
      code: "RECONCILER_INVOCATION_CONTROL_FAILED",
    },
    { status: 500 },
  );
}
