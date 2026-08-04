import "server-only"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hasRbacPermission,
  isKnownPermission,
} from "@/lib/security/rbac-permissions"
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  createCopilotProposalSchema,
  decideCopilotProposalSchema,
  listCopilotProposalsSchema,
  type CreateCopilotProposalInput,
  type DecideCopilotProposalInput,
} from "./copilot-proposal.schemas"

const UNSAFE_PROPOSAL_PATTERNS = [
  /\b(post|book)\b.{0,24}\b(ledger|journal|entry)\b/i,
  /\b(pay|release)\b.{0,24}\b(payment|payroll|funds?)\b/i,
  /\b(approve|certify|close|reverse|file|submit)\b.{0,24}\b(payroll|period|return|declaration|invoice|authority)\b/i,
  /\b(change|rotate|reveal)\b.{0,24}\b(secret|credential|password|api.?key)\b/i,
  /\b(grant|revoke|change)\b.{0,24}\b(permission|role|entitlement)\b/i,
] as const
const MAX_PROPOSAL_TTL_MS = 24 * 60 * 60 * 1000

type CopilotProposalStatus =
  | "DRAFT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"

type ProposalRecord = {
  id: string
  organizationId: string
  runId: string
  createdById: string
  proposalType: string
  targetRoute: string
  requiredPermission: string
  title: string
  detail: string
  evidenceRefs: unknown
  sourceHash: string
  status: CopilotProposalStatus
  periodStart: Date
  periodEnd: Date
  asOf: Date
  expiresAt: Date
  decidedById: string | null
  decidedAt: Date | null
  decisionReason: string | null
  createdAt: Date
}

export type CopilotProposalDto = {
  id: string
  runId: string
  proposalType: string
  targetRoute: string
  requiredPermission: string
  title: string
  detail: string
  evidenceRefs: unknown
  sourceHash: string
  status: CopilotProposalStatus
  periodStart: string
  periodEnd: string
  asOf: string
  expiresAt: string
  decidedAt: string | null
  decisionReason: string | null
  createdAt: string
  executionAuthority: "NONE"
}

export async function createCopilotProposal(
  organizationId: string,
  actorId: string,
  actorPermissions: readonly string[],
  rawInput: CreateCopilotProposalInput,
  now = new Date(),
): Promise<CopilotProposalDto> {
  const input = createCopilotProposalSchema.parse(rawInput)
  assertPermission(actorPermissions, input.requiredPermission)

  if (containsUnsafeProposal(input)) {
    await recordUnsafeProposalAttempt({
      organizationId,
      actorId,
      runId: input.runId,
    })
    throw new ForbiddenError(
      "The requested operation cannot be proposed or executed by the copilot.",
    )
  }

  const run = await db.agentRun.findFirst({
    where: {
      id: input.runId,
      organizationId,
      actorId,
      status: "COMPLETED",
    },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      completedAt: true,
      evidenceLinks: {
        select: {
          subjectType: true,
          subjectId: true,
          sourceModule: true,
          sourceHash: true,
          evidenceGrade: true,
          freshness: true,
          available: true,
        },
      },
    },
  })
  if (!run) {
    throw new NotFoundError("A completed tenant-scoped copilot run was not found.")
  }
  assertRunProvenance(input, run, now)
  assertEvidenceBound(input, run.evidenceLinks)

  const evidenceRefs = input.evidence.map((item) => ({
    ...item,
    sourceHash: item.sourceHash || null,
  }))
  const requestPayload = {
    runId: input.runId,
    proposalType: input.proposalType,
    targetRoute: input.targetRoute,
    requiredPermission: input.requiredPermission,
    title: input.title,
    detail: input.detail,
    evidence: evidenceRefs,
    periodStart: input.periodStart.toISOString(),
    periodEnd: input.periodEnd.toISOString(),
    asOf: input.asOf.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
  }
  const requestHash = hashBusinessPayload(requestPayload)
  const sourceHash = hashBusinessPayload({
    runId: input.runId,
    evidence: evidenceRefs,
    periodStart: requestPayload.periodStart,
    periodEnd: requestPayload.periodEnd,
    asOf: requestPayload.asOf,
  })

  const proposal = await db.$transaction(async (tx) => {
    const existing = await tx.aiActionProposal.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    })
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictError(
          "The copilot proposal idempotency key was reused with different content.",
        )
      }
      return existing
    }

    const created = await tx.aiActionProposal.create({
      data: {
        organizationId,
        runId: input.runId,
        createdById: actorId,
        proposalType: input.proposalType,
        targetRoute: input.targetRoute,
        requiredPermission: input.requiredPermission,
        title: input.title,
        detail: input.detail,
        evidenceRefs,
        sourceHash,
        requestHash,
        idempotencyKey: input.idempotencyKey,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        asOf: input.asOf,
        expiresAt: input.expiresAt,
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId,
      eventType: "AI_ACTION_PROPOSAL_CREATED",
      eventSource: "INTERNAL",
      idempotencyKey: `ai-action-proposal-created:${created.id}`,
      actorId,
      sourceType: "AiActionProposal",
      sourceId: created.id,
      documentHash: sourceHash,
      payload: {
        proposalId: created.id,
        runId: input.runId,
        proposalType: input.proposalType,
        targetRoute: input.targetRoute,
        requiredPermission: input.requiredPermission,
        executionAuthority: "NONE",
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "AI_ACTION_PROPOSAL_CREATED",
          destination: actorId,
          payload: {
            proposalId: created.id,
            targetRoute: input.targetRoute,
            requiresHumanConfirmation: true,
          },
        },
      ],
    })
    return created
  })

  return toDto(proposal)
}

export async function decideCopilotProposal(
  organizationId: string,
  actorId: string,
  actorPermissions: readonly string[],
  rawInput: DecideCopilotProposalInput,
  now = new Date(),
): Promise<CopilotProposalDto> {
  const input = decideCopilotProposalSchema.parse(rawInput)

  return db.$transaction(async (tx) => {
    const current = await tx.aiActionProposal.findFirst({
      where: { id: input.proposalId, organizationId },
    })
    if (!current) throw new NotFoundError("Copilot proposal was not found.")
    assertPermission(actorPermissions, current.requiredPermission)
    if (current.status !== "DRAFT") {
      throw new ConflictError("Copilot proposal has already been decided.")
    }
    if (current.expiresAt <= now) {
      throw new BusinessRuleError("Copilot proposal has expired.")
    }

    const transitioned = await tx.aiActionProposal.updateMany({
      where: {
        id: current.id,
        organizationId,
        status: "DRAFT",
      },
      data: {
        status: input.decision,
        decidedById: actorId,
        decidedAt: now,
        decisionReason: input.reason,
      },
    })
    if (transitioned.count !== 1) {
      throw new ConflictError("Copilot proposal changed before the decision was saved.")
    }

    const decided = await tx.aiActionProposal.findFirst({
      where: { id: current.id, organizationId },
    })
    if (!decided) throw new ConflictError("Copilot proposal decision was not found.")

    const eventType =
      input.decision === "ACCEPTED"
        ? "AI_ACTION_PROPOSAL_ACCEPTED"
        : "AI_ACTION_PROPOSAL_REJECTED"
    await recordBusinessEventInTx(tx, {
      organizationId,
      eventType,
      eventSource: "INTERNAL",
      idempotencyKey: `${eventType.toLowerCase()}:${decided.id}`,
      actorId,
      sourceType: "AiActionProposal",
      sourceId: decided.id,
      documentHash: decided.sourceHash,
      payload: {
        proposalId: decided.id,
        decision: input.decision,
        decidedAt: now.toISOString(),
        reason: input.reason,
        executionAuthority: "NONE",
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: eventType,
          destination: decided.createdById,
          payload: {
            proposalId: decided.id,
            decision: input.decision,
            executionAuthority: "NONE",
          },
        },
      ],
    })

    // Acceptance records human intent only. It never invokes the target workflow.
    return toDto(decided)
  })
}

export async function listCopilotProposals(
  organizationId: string,
  rawInput: { status?: CopilotProposalStatus; limit?: number } = {},
): Promise<CopilotProposalDto[]> {
  const input = listCopilotProposalsSchema.parse(rawInput)
  const rows = await db.aiActionProposal.findMany({
    where: {
      organizationId,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: input.limit,
  })
  return rows.map(toDto)
}

function assertPermission(
  actorPermissions: readonly string[],
  requiredPermission: string,
) {
  if (
    !isKnownPermission(requiredPermission) ||
    !hasRbacPermission(actorPermissions, requiredPermission)
  ) {
    throw new ForbiddenError(
      "The actor is not authorized for the proposed workflow.",
    )
  }
}

function containsUnsafeProposal(input: CreateCopilotProposalInput) {
  const candidate = [
    input.proposalType,
    input.targetRoute,
    input.title,
    input.detail,
  ].join(" ")
  return UNSAFE_PROPOSAL_PATTERNS.some((pattern) => pattern.test(candidate))
}

async function recordUnsafeProposalAttempt(input: {
  organizationId: string
  actorId: string
  runId: string
}) {
  const run = await db.agentRun.findFirst({
    where: {
      id: input.runId,
      organizationId: input.organizationId,
      actorId: input.actorId,
    },
    select: { id: true },
  })
  await db.agentPolicyIncident.create({
    data: {
      runId: run?.id ?? null,
      organizationId: input.organizationId,
      actorId: input.actorId,
      incidentType: "UNSAFE_ACTION_PROPOSAL_BLOCKED",
      severity: "HIGH",
      policyKey: "COPILOT_NO_EXECUTION_AUTHORITY",
      blockedToolKey: null,
      safeSummary:
        "Copilot blocked a request for autonomous or high-authority execution.",
      status: "OPEN",
    },
  })
}

function assertEvidenceBound(
  input: CreateCopilotProposalInput,
  stored: Array<{
    subjectType: string
    subjectId: string
    sourceModule: string
    sourceHash: string | null
    evidenceGrade: string
    freshness: string
    available: boolean
  }>,
) {
  for (const evidence of input.evidence) {
    if (
      !evidence.available ||
      evidence.evidenceGrade === "blocked" ||
      evidence.freshness === "blocked" ||
      evidence.freshness === "failed"
    ) {
      throw new BusinessRuleError(
        "Copilot proposals require available, non-blocked source evidence.",
      )
    }
    const match = stored.some(
      (item) =>
        item.subjectType === evidence.subjectType &&
        item.subjectId === evidence.subjectId &&
        item.sourceModule === evidence.sourceModule &&
        (item.sourceHash || null) === (evidence.sourceHash || null) &&
        item.available,
    )
    if (!match) {
      throw new BusinessRuleError(
        "Copilot proposal evidence is not bound to the selected run.",
      )
    }
  }
}

function assertRunProvenance(
  input: CreateCopilotProposalInput,
  run: {
    periodStart: Date | null
    periodEnd: Date | null
    completedAt: Date | null
  },
  now: Date,
) {
  if (
    !run.periodStart ||
    !run.periodEnd ||
    run.periodStart.getTime() !== input.periodStart.getTime() ||
    run.periodEnd.getTime() !== input.periodEnd.getTime()
  ) {
    throw new BusinessRuleError(
      "Copilot proposal period does not match the governed agent run.",
    )
  }
  if (
    input.asOf > now ||
    !run.completedAt ||
    input.asOf > run.completedAt ||
    input.expiresAt <= now ||
    input.expiresAt.getTime() - now.getTime() > MAX_PROPOSAL_TTL_MS
  ) {
    throw new BusinessRuleError(
      "Copilot proposal provenance or expiry is outside the governed window.",
    )
  }
}

function toDto(row: ProposalRecord): CopilotProposalDto {
  return {
    id: row.id,
    runId: row.runId,
    proposalType: row.proposalType,
    targetRoute: row.targetRoute,
    requiredPermission: row.requiredPermission,
    title: row.title,
    detail: row.detail,
    evidenceRefs: row.evidenceRefs,
    sourceHash: row.sourceHash,
    status: row.status,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    asOf: row.asOf.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decisionReason: row.decisionReason,
    createdAt: row.createdAt.toISOString(),
    executionAuthority: "NONE",
  }
}
