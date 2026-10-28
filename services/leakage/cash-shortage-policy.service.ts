import { Prisma } from "@prisma/client";

import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import { db } from "@/prisma/db";
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  getPrismaKnownRequest,
} from "@/services/_shared/action-errors";
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
  type SensitiveActionDecision,
} from "@/services/controls/sensitive-action.service";
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
  stableJsonStringify,
} from "@/services/events/business-event.service";

import {
  approveCashShortagePolicyInputSchema,
  cashShortagePolicyApprovalEventPayloadSchema,
  createCashShortagePolicyDraftInputSchema,
  resolveCashShortagePolicyInputSchema,
  type ApproveCashShortagePolicyInput,
  type CreateCashShortagePolicyDraftInput,
  type ParsedCreateCashShortagePolicyDraftInput,
  type ResolveCashShortagePolicyInput,
} from "./cash-shortage-policy.schemas";
import {
  POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
  cashShortagePolicyV1Schema,
  type CashShortagePolicyV1,
} from "./pos-shift-cash-shortage-contracts";

const POLICY_APPROVAL_EVENT_TYPE = "cash_shortage.policy.approved";
const POLICY_APPROVAL_PERMISSION = "controls.manage";
const SERIALIZABLE_ATTEMPTS = 2;

export type CashShortagePolicyControl = {
  actorId: string;
  actorPermissions: readonly string[];
  lastAuthAt?: Date | number | string | null;
  now?: Date | number | string | null;
};

export type CashShortagePolicyDraftResult = {
  policy: CashShortagePolicyV1;
  createdById: string;
  createdAt: string;
};

export type CashShortagePolicyApprovalResult = {
  policy: CashShortagePolicyV1;
  policyHash: string;
  businessEventId: string;
  created: boolean;
};

type CashShortagePolicyRow = {
  id: string;
  organizationId: string;
  version: number;
  currency: string;
  reviewThreshold: Prisma.Decimal;
  highThreshold: Prisma.Decimal;
  minorUnitScale: number;
  roundingMode: "HALF_UP" | "HALF_EVEN";
  effectiveFrom: Date;
  effectiveTo: Date | null;
  mode: "OBSERVE";
  status: "DRAFT" | "APPROVED";
  createdById: string;
  approvedById: string | null;
  approvedAt: Date | null;
  documentHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ApprovalOutcome =
  | { denied: SensitiveActionDecision; value?: never }
  | { denied?: never; value: CashShortagePolicyApprovalResult };

function normalizedActorId(actorId: string): string {
  const normalized = actorId.trim();
  if (!normalized) throw new ForbiddenError();
  return normalized;
}

function controlNow(value: CashShortagePolicyControl["now"]): Date {
  if (value === undefined || value === null) return new Date();
  const parsed =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError("Policy control time is invalid.");
  }
  return parsed;
}

function approvalIdempotencyKey(policyId: string, version: number): string {
  return `cash-shortage-policy:${policyId}:v${version}:approved`;
}

function policyContract(row: CashShortagePolicyRow): CashShortagePolicyV1 {
  return cashShortagePolicyV1Schema.parse({
    kind: POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
    policyId: row.id,
    version: row.version,
    currency: row.currency,
    reviewThreshold: row.reviewThreshold.toFixed(row.minorUnitScale),
    highThreshold: row.highThreshold.toFixed(row.minorUnitScale),
    minorUnitScale: row.minorUnitScale,
    roundingMode: row.roundingMode,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    approvalStatus: row.status === "APPROVED" ? "approved" : "draft",
    approvedAt: row.approvedAt?.toISOString() ?? null,
    approvedById: row.approvedById,
    mode: "observe",
  });
}

function approvedPolicyContract(row: CashShortagePolicyRow): {
  policy: CashShortagePolicyV1;
  policyHash: string;
} {
  if (
    row.status !== "APPROVED" ||
    row.approvedAt === null ||
    row.approvedById === null ||
    row.documentHash === null
  ) {
    throw new ConflictError(
      "Approved cash-shortage policy evidence is incomplete.",
    );
  }

  const policy = policyContract(row);
  const policyHash = hashBusinessPayload(policy);
  if (policyHash !== row.documentHash) {
    throw new ConflictError(
      "Approved cash-shortage policy hash verification failed.",
    );
  }
  return { policy, policyHash };
}

async function assertActiveTenantActors(
  tx: Prisma.TransactionClient,
  organizationId: string,
  actorIds: readonly string[],
) {
  const uniqueActorIds = [...new Set(actorIds)];
  const [organization, actors] = await Promise.all([
    tx.organization.findFirst({
      where: { id: organizationId, isActive: true, deletedAt: null },
      select: { id: true },
    }),
    tx.user.findMany({
      where: {
        id: { in: uniqueActorIds },
        organizationId,
        isActive: true,
      },
      select: { id: true },
    }),
  ]);

  if (!organization) throw new NotFoundError("Organization not found.");
  if (actors.length !== uniqueActorIds.length) {
    throw new ForbiddenError(
      "Policy actors must be active users in the organization.",
    );
  }
}

async function runSerializable<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const code = getPrismaKnownRequest(error)?.code;
      const retryable = code === "P2002" || code === "P2034";
      if (retryable && attempt + 1 < SERIALIZABLE_ATTEMPTS) continue;
      if (retryable) {
        throw new ConflictError(
          "Cash-shortage policy changed concurrently. Retry the command.",
        );
      }
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Cash-shortage policy persistence failed.",
        500,
        false,
      );
    }
  }

  throw new ConflictError("Cash-shortage policy transaction did not complete.");
}

function normalizedThresholds(input: ParsedCreateCashShortagePolicyDraftInput) {
  return {
    reviewThreshold: new Prisma.Decimal(input.reviewThreshold).toFixed(
      input.minorUnitScale,
    ),
    highThreshold: new Prisma.Decimal(input.highThreshold).toFixed(
      input.minorUnitScale,
    ),
  };
}

export async function createCashShortagePolicyDraft(
  input: CreateCashShortagePolicyDraftInput,
  control: CashShortagePolicyControl,
): Promise<CashShortagePolicyDraftResult> {
  const parsed = createCashShortagePolicyDraftInputSchema.parse(input);
  const actorId = normalizedActorId(control.actorId);
  if (
    !hasRbacPermission(control.actorPermissions, POLICY_APPROVAL_PERMISSION)
  ) {
    throw new ForbiddenError(
      "You are not allowed to manage cash-shortage policies.",
    );
  }
  const thresholds = normalizedThresholds(parsed);

  return runSerializable(async (tx) => {
    await assertActiveTenantActors(tx, parsed.organizationId, [actorId]);
    const latest = await tx.cashShortagePolicy.findFirst({
      where: {
        organizationId: parsed.organizationId,
        currency: parsed.currency,
      },
      orderBy: [{ version: "desc" }, { id: "asc" }],
      select: { version: true },
    });

    const row = (await tx.cashShortagePolicy.create({
      data: {
        organizationId: parsed.organizationId,
        version: (latest?.version ?? 0) + 1,
        currency: parsed.currency,
        reviewThreshold: new Prisma.Decimal(thresholds.reviewThreshold),
        highThreshold: new Prisma.Decimal(thresholds.highThreshold),
        minorUnitScale: parsed.minorUnitScale,
        roundingMode: parsed.roundingMode,
        effectiveFrom: parsed.effectiveFrom,
        effectiveTo: parsed.effectiveTo,
        mode: "OBSERVE",
        status: "DRAFT",
        createdById: actorId,
      },
    })) as CashShortagePolicyRow;

    const policy = policyContract(row);
    await tx.auditLog.create({
      data: {
        entityType: "CashShortagePolicy",
        entityId: row.id,
        action: "CASH_SHORTAGE_POLICY_DRAFT_CREATED",
        userId: actorId,
        organizationId: parsed.organizationId,
        changes: {
          after: {
            policy,
            createdById: actorId,
          },
        },
      },
    });

    return {
      policy,
      createdById: actorId,
      createdAt: row.createdAt.toISOString(),
    };
  });
}

function overlapWhere(
  row: CashShortagePolicyRow,
): Prisma.CashShortagePolicyWhereInput {
  return {
    organizationId: row.organizationId,
    currency: row.currency,
    status: "APPROVED",
    id: { not: row.id },
    ...(row.effectiveTo ? { effectiveFrom: { lt: row.effectiveTo } } : {}),
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: row.effectiveFrom } }],
  };
}

async function recordApprovalEvidence(
  tx: Prisma.TransactionClient,
  organizationId: string,
  actorId: string,
  approvedAt: Date,
  policy: CashShortagePolicyV1,
  policyHash: string,
) {
  const payload = {
    evidenceVersion: 1 as const,
    organizationId,
    policy,
    policyHash,
  };
  const eventResult = await recordBusinessEventInTx(tx, {
    organizationId,
    eventType: POLICY_APPROVAL_EVENT_TYPE,
    eventSource: "INTERNAL",
    idempotencyKey: approvalIdempotencyKey(policy.policyId, policy.version),
    payload,
    occurredAt: approvedAt,
    actorId,
    sourceType: "MANUAL",
    sourceId: policy.policyId,
    documentHash: policyHash,
    metadata: {
      policyKind: policy.kind,
      policyVersion: policy.version,
      currency: policy.currency,
      mode: policy.mode,
    },
  });
  if (eventResult.created) {
    await markBusinessEventAppliedInTx(
      tx,
      organizationId,
      eventResult.event.id,
    );
  }
  return eventResult;
}

async function assertApprovalEventEvidence(
  client: Pick<Prisma.TransactionClient, "businessEvent">,
  row: CashShortagePolicyRow,
  policy: CashShortagePolicyV1,
  policyHash: string,
) {
  const event = await client.businessEvent.findUnique({
    where: {
      organizationId_eventSource_idempotencyKey: {
        organizationId: row.organizationId,
        eventSource: "INTERNAL",
        idempotencyKey: approvalIdempotencyKey(row.id, row.version),
      },
    },
  });

  if (
    !event ||
    event.eventType !== POLICY_APPROVAL_EVENT_TYPE ||
    event.schemaVersion !== 1 ||
    !["RECORDED", "APPLIED"].includes(event.status) ||
    event.actorId !== row.approvedById ||
    event.sourceType !== "MANUAL" ||
    event.sourceId !== row.id ||
    event.documentHash !== policyHash ||
    event.occurredAt.getTime() !== row.approvedAt?.getTime() ||
    hashBusinessPayload(event.payload) !== event.payloadHash
  ) {
    throw new ConflictError(
      "Cash-shortage policy approval event verification failed.",
    );
  }

  const payload = cashShortagePolicyApprovalEventPayloadSchema.safeParse(
    event.payload,
  );
  if (
    !payload.success ||
    payload.data.organizationId !== row.organizationId ||
    payload.data.policyHash !== policyHash ||
    hashBusinessPayload(payload.data.policy) !== policyHash ||
    stableJsonStringify(payload.data.policy) !== stableJsonStringify(policy)
  ) {
    throw new ConflictError(
      "Cash-shortage policy approval payload verification failed.",
    );
  }
}

export async function approveCashShortagePolicy(
  input: ApproveCashShortagePolicyInput,
  control: CashShortagePolicyControl,
): Promise<CashShortagePolicyApprovalResult> {
  const parsed = approveCashShortagePolicyInputSchema.parse(input);
  const actorId = normalizedActorId(control.actorId);
  const commandNow = controlNow(control.now);

  const outcome = await runSerializable<ApprovalOutcome>(async (tx) => {
    const row = (await tx.cashShortagePolicy.findFirst({
      where: { id: parsed.policyId, organizationId: parsed.organizationId },
    })) as CashShortagePolicyRow | null;
    if (!row) throw new NotFoundError("Cash-shortage policy not found.");

    await assertActiveTenantActors(tx, parsed.organizationId, [
      row.createdById,
      actorId,
    ]);
    const decision = evaluateSensitiveAction({
      action: "cash-shortage.policy.approve",
      actorId,
      organizationId: parsed.organizationId,
      actorPermissions: control.actorPermissions,
      subjectActorId: row.createdById,
      lastAuthAt: control.lastAuthAt,
      now: commandNow,
      resourceType: "CashShortagePolicy",
      resourceId: row.id,
      currency: row.currency,
      metadata: {
        policyVersion: row.version,
        effectiveFrom: row.effectiveFrom.toISOString(),
        effectiveTo: row.effectiveTo?.toISOString() ?? null,
      },
    });
    await auditSensitiveActionDecision(tx, decision);
    if (!decision.allowed) return { denied: decision };

    if (row.status === "APPROVED") {
      const approved = approvedPolicyContract(row);
      await assertApprovalEventEvidence(
        tx,
        row,
        approved.policy,
        approved.policyHash,
      );
      const eventResult = await recordApprovalEvidence(
        tx,
        row.organizationId,
        row.approvedById!,
        row.approvedAt!,
        approved.policy,
        approved.policyHash,
      );
      await tx.auditLog.create({
        data: {
          entityType: "CashShortagePolicy",
          entityId: row.id,
          action: "CASH_SHORTAGE_POLICY_APPROVAL_REPLAY",
          userId: actorId,
          organizationId: row.organizationId,
          changes: { after: { policyHash: approved.policyHash } },
        },
      });
      return {
        value: {
          policy: approved.policy,
          policyHash: approved.policyHash,
          businessEventId: eventResult.event.id,
          created: false,
        },
      };
    }
    if (row.status !== "DRAFT") {
      throw new ConflictError("Cash-shortage policy is not approvable.");
    }

    const overlap = await tx.cashShortagePolicy.findFirst({
      where: overlapWhere(row),
      select: { id: true, version: true },
    });
    if (overlap) {
      throw new ConflictError(
        "An approved cash-shortage policy already covers this period.",
      );
    }

    const approvedRow: CashShortagePolicyRow = {
      ...row,
      status: "APPROVED",
      approvedById: actorId,
      approvedAt: commandNow,
      documentHash: null,
      updatedAt: commandNow,
    };
    const policy = policyContract(approvedRow);
    const policyHash = hashBusinessPayload(policy);
    approvedRow.documentHash = policyHash;

    const update = await tx.cashShortagePolicy.updateMany({
      where: {
        id: row.id,
        organizationId: row.organizationId,
        status: "DRAFT",
      },
      data: {
        status: "APPROVED",
        approvedById: actorId,
        approvedAt: commandNow,
        documentHash: policyHash,
      },
    });
    if (update.count !== 1) {
      throw new ConflictError("Cash-shortage policy changed before approval.");
    }

    const eventResult = await recordApprovalEvidence(
      tx,
      row.organizationId,
      actorId,
      commandNow,
      policy,
      policyHash,
    );
    await tx.auditLog.create({
      data: {
        entityType: "CashShortagePolicy",
        entityId: row.id,
        action: "CASH_SHORTAGE_POLICY_APPROVED",
        userId: actorId,
        organizationId: row.organizationId,
        changes: {
          before: { approvalStatus: "draft" },
          after: {
            approvalStatus: "approved",
            approvedById: actorId,
            approvedAt: commandNow.toISOString(),
            policyHash,
            businessEventId: eventResult.event.id,
          },
        },
      },
    });

    return {
      value: {
        policy,
        policyHash,
        businessEventId: eventResult.event.id,
        created: true,
      },
    };
  });

  if (outcome.denied) {
    assertSensitiveActionAllowed(outcome.denied);
    throw new ConflictError("Denied policy approval returned unexpectedly.");
  }
  return outcome.value;
}

export async function resolveApprovedCashShortagePolicy(
  input: ResolveCashShortagePolicyInput,
): Promise<CashShortagePolicyV1 | null> {
  const parsed = resolveCashShortagePolicyInputSchema.parse(input);
  const rows = (await db.cashShortagePolicy.findMany({
    where: {
      organizationId: parsed.organizationId,
      currency: parsed.currency,
      status: "APPROVED",
      effectiveFrom: { lte: parsed.effectiveAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: parsed.effectiveAt } }],
    },
    orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }, { id: "asc" }],
    take: 2,
  })) as CashShortagePolicyRow[];

  if (rows.length === 0) return null;
  if (rows.length > 1) {
    throw new ConflictError(
      "Overlapping approved cash-shortage policies require review.",
    );
  }

  const approved = approvedPolicyContract(rows[0]);
  await assertApprovalEventEvidence(
    db,
    rows[0],
    approved.policy,
    approved.policyHash,
  );
  return approved.policy;
}
