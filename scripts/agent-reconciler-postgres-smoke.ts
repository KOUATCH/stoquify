import { db } from "@/prisma/db";
import {
  AgentReconcilerInvocationError,
  beginAgentReconcilerInvocation,
  completeAgentReconcilerInvocation,
  failAgentReconcilerInvocation,
  resolveAgentReconcilerInvocationEnvelope,
} from "@/services/agents/agent-reconciler-invocation.service";

const environment = `reconciler-smoke-${Date.now()}`;
const baseNow = new Date();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Agent reconciler smoke is forbidden in production.");
  }

  try {
    const firstEnvelope = envelope("first-window", baseNow, baseNow);
    const first = await beginAgentReconcilerInvocation({
      envelope: firstEnvelope,
      now: baseNow,
    });
    assert(first.kind === "acquired", "the first invocation must acquire the lease");

    const overlappingEnvelope = envelope(
      "overlapping-window",
      new Date(baseNow.getTime() + 1_000),
      new Date(baseNow.getTime() + 1_000),
    );
    await expectInvocationError(
      () =>
        beginAgentReconcilerInvocation({
          envelope: overlappingEnvelope,
          now: new Date(baseNow.getTime() + 1_000),
        }),
      "RECONCILER_INVOCATION_OVERLAP",
    );

    await completeAgentReconcilerInvocation({
      invocationId: first.invocation.id,
      result: {
        correlationId: firstEnvelope.correlationId,
        reconciledCount: 0,
      },
      completedWithWarnings: false,
      now: new Date(baseNow.getTime() + 2_000),
    });

    const replay = await beginAgentReconcilerInvocation({
      envelope: firstEnvelope,
      now: new Date(baseNow.getTime() + 3_000),
    });
    assert(replay.kind === "replayed", "a completed request must replay");
    assert(
      replay.invocation.status === "COMPLETED",
      "the replay must retain its completed status",
    );

    const conflictingEnvelope = resolveAgentReconcilerInvocationEnvelope({
      runId: firstEnvelope.runId,
      scheduledAt: new Date(baseNow.getTime() + 1_000).toISOString(),
      environment,
      now: new Date(baseNow.getTime() + 3_000),
    });
    await expectInvocationError(
      () =>
        beginAgentReconcilerInvocation({
          envelope: conflictingEnvelope,
          now: new Date(baseNow.getTime() + 3_000),
        }),
      "RECONCILER_INVOCATION_CONFLICT",
    );

    const staleEnvelope = envelope(
      "stale-window",
      new Date(baseNow.getTime() + 5_000),
      new Date(baseNow.getTime() + 5_000),
    );
    const stale = await beginAgentReconcilerInvocation({
      envelope: staleEnvelope,
      now: new Date(baseNow.getTime() + 5_000),
    });
    assert(stale.kind === "acquired", "the stale fixture must acquire the lease");
    await db.agentReconcilerInvocation.update({
      where: { id: stale.invocation.id },
      data: { startedAt: new Date(baseNow.getTime() - 11 * 60_000) },
    });

    const recoveredEnvelope = envelope(
      "recovered-window",
      new Date(baseNow.getTime() + 6_000),
      new Date(baseNow.getTime() + 6_000),
    );
    const recovered = await beginAgentReconcilerInvocation({
      envelope: recoveredEnvelope,
      now: new Date(baseNow.getTime() + 6_000),
    });
    assert(
      recovered.kind === "acquired",
      "a new window must recover an expired lease",
    );
    await failAgentReconcilerInvocation({
      invocationId: recovered.invocation.id,
      failureCode: "CONTROLLED_SMOKE_FAILURE",
      now: new Date(baseNow.getTime() + 7_000),
    });

    const rows = await db.agentReconcilerInvocation.findMany({
      where: { environment },
      orderBy: { scheduledAt: "asc" },
      select: {
        runId: true,
        status: true,
        failureCode: true,
        activeKey: true,
      },
    });
    const staleRow = rows.find((row) => row.runId === staleEnvelope.runId);
    const recoveredRow = rows.find(
      (row) => row.runId === recoveredEnvelope.runId,
    );
    assert(
      staleRow?.status === "FAILED" &&
        staleRow.failureCode === "RECONCILER_LEASE_EXPIRED",
      "expired leases must retain a terminal failure record",
    );
    assert(
      recoveredRow?.status === "FAILED" &&
        recoveredRow.failureCode === "CONTROLLED_SMOKE_FAILURE",
      "controlled execution failures must retain a safe failure code",
    );
    assert(
      rows.every((row) => row.activeKey === null),
      "terminal invocations must release the active lease",
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          environment,
          invocationCount: rows.length,
          overlapRejected: true,
          replayed: true,
          conflictRejected: true,
          staleLeaseRecovered: true,
          activeLeaseCount: rows.filter((row) => row.activeKey).length,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await db.agentReconcilerInvocation.deleteMany({ where: { environment } });
    await db.$disconnect();
  }
}

function envelope(label: string, scheduledAt: Date, now: Date) {
  return resolveAgentReconcilerInvocationEnvelope({
    runId: `agent-runtime:${environment}:${label}`,
    scheduledAt: scheduledAt.toISOString(),
    environment,
    now,
  });
}

async function expectInvocationError(
  operation: () => Promise<unknown>,
  expectedCode: AgentReconcilerInvocationError["code"],
) {
  try {
    await operation();
  } catch (error) {
    assert(
      error instanceof AgentReconcilerInvocationError &&
        error.code === expectedCode,
      `expected ${expectedCode}`,
    );
    return;
  }
  throw new Error(`Expected ${expectedCode}.`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

void main();
