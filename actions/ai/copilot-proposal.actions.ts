"use server"

import { protect, type ProtectedActionResponse } from "@/services/_shared/protect"
import {
  createCopilotProposal,
  decideCopilotProposal,
  listCopilotProposals,
  type CopilotProposalDto,
} from "@/services/ai/copilot-proposal.service"
import { authorizeCopilotProposalRelease } from "@/services/ai/copilot-proposal-release.service"
import {
  createCopilotProposalSchema,
  decideCopilotProposalSchema,
  listCopilotProposalsSchema,
} from "@/services/ai/copilot-proposal.schemas"

const moduleBoundary = {
  moduleSlug: "dashboard" as const,
  surfaceType: "report" as const,
  mode: "enforce" as const,
}

export type CopilotGuardrailErrorCode =
  | "FORBIDDEN"
  | "STEP_UP_REQUIRED"
  | "MISSING_DOCUMENT"
  | "SYSTEM_ERROR"

function errorCodeFor(
  result: Extract<ProtectedActionResponse<unknown>, { success: false }>,
): CopilotGuardrailErrorCode {
  if (result.code === "FORBIDDEN") return "FORBIDDEN"
  if (result.code === "FRESH_AUTH_REQUIRED") return "STEP_UP_REQUIRED"
  if (result.code === "NOT_FOUND") return "MISSING_DOCUMENT"
  return "SYSTEM_ERROR"
}

function withOk<T>(result: ProtectedActionResponse<T>) {
  return result.success
    ? { ...result, ok: true as const }
    : {
        ...result,
        ok: false as const,
        errorCode: errorCodeFor(result),
      }
}

const createProposal = protect<unknown, CopilotProposalDto>(
  {
    permission: "dashboard.read",
    auditResource: "AiActionProposal",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 600 },
    tenantGuard: "handler-derived",
    module: {
      ...moduleBoundary,
      surface: "copilot:proposal:create",
      accessIntent: "write",
    },
  },
  async (input, ctx) => {
    await authorizeCopilotProposalRelease({
      organizationId: ctx.orgId,
      roleCodes: ctx.roles.map((role) => role.code),
    })
    return createCopilotProposal(
      ctx.orgId,
      ctx.userId,
      ctx.permissions,
      createCopilotProposalSchema.parse(input),
    )
  },
)

const decideProposal = protect<unknown, CopilotProposalDto>(
  {
    permission: "dashboard.read",
    auditResource: "AiActionProposal",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 600 },
    tenantGuard: "handler-derived",
    module: {
      ...moduleBoundary,
      surface: "copilot:proposal:decide",
      accessIntent: "write",
    },
  },
  async (input, ctx) => {
    await authorizeCopilotProposalRelease({
      organizationId: ctx.orgId,
      roleCodes: ctx.roles.map((role) => role.code),
    })
    return decideCopilotProposal(
      ctx.orgId,
      ctx.userId,
      ctx.permissions,
      decideCopilotProposalSchema.parse(input),
    )
  },
)

const listProposals = protect<unknown, CopilotProposalDto[]>(
  {
    permission: "dashboard.read",
    auditResource: "AiActionProposal",
    auditAllowed: true,
    tenantGuard: "handler-derived",
    module: {
      ...moduleBoundary,
      surface: "copilot:proposal:list",
      accessIntent: "read",
    },
  },
  async (input, ctx) => {
    await authorizeCopilotProposalRelease({
      organizationId: ctx.orgId,
      roleCodes: ctx.roles.map((role) => role.code),
    })
    return listCopilotProposals(
      ctx.orgId,
      listCopilotProposalsSchema.parse(input ?? {}),
    )
  },
)

export async function createCopilotProposalAction(input: unknown) {
  return withOk(await createProposal(input))
}

export async function decideCopilotProposalAction(input: unknown) {
  return withOk(await decideProposal(input))
}

export async function listCopilotProposalsAction(input: unknown = {}) {
  return withOk(await listProposals(input))
}
