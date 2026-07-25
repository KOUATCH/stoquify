"use server";

import { z } from "zod";

import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
} from "@/services/_shared/action-errors";
import {
  protect,
  type ProtectedActionContext,
} from "@/services/_shared/protect";
import {
  AgentReleaseControlError,
  acceptCommandAgentActivationOwnership,
  activateCommandAgentInternal,
  assignCommandAgentActivationOwner,
  prepareCommandAgentActivationPackage,
  provisionCommandAgentShadow,
  recordCommandAgentActivationApproval,
  retireCommandAgentRelease,
  reviewCommandAgentActivationPackage,
  suspendCommandAgentRelease,
} from "@/services/agents/agent-release-control.service";
import {
  REQUIRED_AGENT_OWNER_RESPONSIBILITIES,
  agentReleaseIdempotencyKeySchema,
} from "@/services/agents/agent-release-contracts";

const idSchema = z.string().trim().min(1).max(191);
const sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const transitionSchema = z
  .object({ packageId: idSchema, expectedVersion: z.number().int().positive() })
  .strict();
const approvalSchema = z
  .object({
    packageId: idSchema,
    idempotencyKey: agentReleaseIdempotencyKeySchema,
    decision: z.enum(["APPROVED", "REJECTED", "REVOKED"]),
    evidenceHash: sha256Schema,
    riskAcceptance: z.record(z.string(), z.unknown()).optional(),
    decidedAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
  })
  .strict();
const ownerSchema = z
  .object({
    packageId: idSchema,
    responsibility: z.enum(REQUIRED_AGENT_OWNER_RESPONSIBILITIES),
    primaryUserId: idSchema,
    backupUserId: idSchema.optional(),
    escalationRouteRef: z.string().trim().min(1).max(300),
    runbookVersion: z.string().trim().min(1).max(80),
    validUntil: z.coerce.date().optional(),
    coverageStartsAt: z.coerce.date(),
    coverageEndsAt: z.coerce.date(),
  })
  .strict();
const ownerAcceptanceSchema = z
  .object({
    packageId: idSchema,
    responsibility: z.enum(REQUIRED_AGENT_OWNER_RESPONSIBILITIES),
  })
  .strict();
const prepareSchema = z
  .object({
    releaseVersion: z.string().trim().min(1).max(80),
    environment: z.string().trim().min(1).max(40),
    commitSha: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{7,64}$/i),
    allowedRoleCodes: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    activationStartsAt: z.coerce.date(),
    activationEndsAt: z.coerce.date(),
    residualRisks: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
const suspendSchema = z
  .object({ packageId: idSchema, reason: z.string().trim().min(5).max(500) })
  .strict();
const retireSchema = transitionSchema
  .extend({ reason: z.string().trim().min(5).max(500) })
  .strict();

const prepareAction = protect<unknown, unknown>(
  {
    permission: "agent.release.prepare",
    auditResource: "AgentActivationPackage",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 600 },
    tenantGuard: "handler-derived",
  },
  async (rawInput, ctx) => {
    const input = parseInput(prepareSchema, rawInput);
    return executeReleaseCommand(() =>
      prepareCommandAgentActivationPackage({
        ...input,
        organizationId: ctx.orgId,
        requestedById: ctx.userId,
      }),
    );
  },
);

const reviewAction = protect<unknown, unknown>(
  {
    permission: "agent.release.prepare",
    auditResource: "AgentActivationPackage",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 600 },
    tenantGuard: "handler-derived",
  },
  async (rawInput, ctx) => {
    const input = parseInput(transitionSchema, rawInput);
    return executeReleaseCommand(() =>
      reviewCommandAgentActivationPackage({
        ...input,
        organizationId: ctx.orgId,
        actorId: ctx.userId,
      }),
    );
  },
);

const productApprovalAction = approvalAction(
  "PRODUCT",
  "agent.release.product.approve",
);
const securityApprovalAction = approvalAction(
  "SECURITY",
  "agent.release.security.approve",
);

const assignOwnerAction = protect<unknown, unknown>(
  {
    permission: "agent.release.owner.manage",
    auditResource: "AgentActivationOwner",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 600 },
    tenantGuard: "handler-derived",
  },
  async (rawInput, ctx) => {
    const input = parseInput(ownerSchema, rawInput);
    return executeReleaseCommand(() =>
      assignCommandAgentActivationOwner({
        ...input,
        organizationId: ctx.orgId,
        acceptedAt: undefined,
      }),
    );
  },
);

const acceptOwnerAction = protect<unknown, unknown>(
  {
    permission: "agent.release.owner.accept",
    auditResource: "AgentActivationOwner",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 600 },
    tenantGuard: "handler-derived",
  },
  async (rawInput, ctx) => {
    const input = parseInput(ownerAcceptanceSchema, rawInput);
    return executeReleaseCommand(() =>
      acceptCommandAgentActivationOwnership({
        ...input,
        organizationId: ctx.orgId,
        actorId: ctx.userId,
      }),
    );
  },
);

const provisionAction = transitionAction(
  "agent.release.provision",
  provisionCommandAgentShadow,
);
const activateAction = transitionAction(
  "agent.release.activate",
  activateCommandAgentInternal,
);

const suspendAction = protect<unknown, unknown>(
  {
    permission: "agent.release.suspend",
    auditResource: "AgentActivationPackage",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
  },
  async (rawInput, ctx) => {
    const input = parseInput(suspendSchema, rawInput);
    return executeReleaseCommand(() =>
      suspendCommandAgentRelease({
        ...input,
        organizationId: ctx.orgId,
        actorId: ctx.userId,
      }),
    );
  },
);

const retireAction = protect<unknown, unknown>(
  {
    permission: "agent.release.retire",
    auditResource: "AgentActivationPackage",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
  },
  async (rawInput, ctx) => {
    const input = parseInput(retireSchema, rawInput);
    return executeReleaseCommand(() =>
      retireCommandAgentRelease({
        ...input,
        organizationId: ctx.orgId,
        actorId: ctx.userId,
      }),
    );
  },
);

export async function prepareCommandAgentReleaseAction(input: unknown) {
  return prepareAction(input);
}

export async function reviewCommandAgentReleaseAction(input: unknown) {
  return reviewAction(input);
}

export async function approveCommandAgentProductReleaseAction(input: unknown) {
  return productApprovalAction(input);
}

export async function approveCommandAgentSecurityReleaseAction(input: unknown) {
  return securityApprovalAction(input);
}

export async function assignCommandAgentReleaseOwnerAction(input: unknown) {
  return assignOwnerAction(input);
}

export async function acceptCommandAgentReleaseOwnerAction(input: unknown) {
  return acceptOwnerAction(input);
}

export async function provisionCommandAgentReleaseAction(input: unknown) {
  return provisionAction(input);
}

export async function activateCommandAgentReleaseAction(input: unknown) {
  return activateAction(input);
}

export async function suspendCommandAgentReleaseAction(input: unknown) {
  return suspendAction(input);
}

export async function retireCommandAgentReleaseAction(input: unknown) {
  return retireAction(input);
}

function approvalAction(
  approvalType: "PRODUCT" | "SECURITY",
  permission:
    | "agent.release.product.approve"
    | "agent.release.security.approve",
) {
  return protect<unknown, unknown>(
    {
      permission,
      auditResource: "AgentActivationApproval",
      auditAllowed: true,
      freshAuth: { maxAgeSeconds: 300 },
      tenantGuard: "handler-derived",
    },
    async (rawInput, ctx) => {
      const input = parseInput(approvalSchema, rawInput);
      return executeReleaseCommand(() =>
        recordCommandAgentActivationApproval({
          ...input,
          organizationId: ctx.orgId,
          approverId: ctx.userId,
          approvalType,
        }),
      );
    },
  );
}

function transitionAction(
  permission: "agent.release.provision" | "agent.release.activate",
  command: (input: {
    packageId: string;
    organizationId: string;
    actorId: string;
    expectedVersion: number;
  }) => Promise<unknown>,
) {
  return protect<unknown, unknown>(
    {
      permission,
      auditResource: "AgentActivationPackage",
      auditAllowed: true,
      freshAuth: { maxAgeSeconds: 300 },
      tenantGuard: "handler-derived",
    },
    async (rawInput, ctx) => {
      const input = parseInput(transitionSchema, rawInput);
      return executeReleaseCommand(() =>
        command({ ...input, organizationId: ctx.orgId, actorId: ctx.userId }),
      );
    },
  );
}

function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Agent release command is invalid.",
      400,
    );
  }
  return parsed.data;
}

async function executeReleaseCommand<T>(command: () => Promise<T>) {
  try {
    return await command();
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    if (!(error instanceof AgentReleaseControlError)) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Agent release command failed safely.",
        500,
        false,
      );
    }
    if (
      error.code === "RELEASE_SCOPE_DENIED" ||
      error.code === "RELEASE_NOT_FOUND"
    ) {
      throw new ForbiddenError(
        "Agent release package is outside the authorized scope.",
      );
    }
    if (
      error.code === "RELEASE_VERSION_CONFLICT" ||
      error.code === "RELEASE_IDEMPOTENCY_CONFLICT"
    ) {
      throw new ConflictError(
        "Agent release package changed; refresh it before retrying.",
      );
    }
    throw new BusinessRuleError(
      "Agent release prerequisites are not complete.",
    );
  }
}
