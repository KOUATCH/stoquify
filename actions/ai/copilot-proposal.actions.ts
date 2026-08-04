"use server"

import { protect } from "@/services/_shared/protect"
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
  return createProposal(input)
}

export async function decideCopilotProposalAction(input: unknown) {
  return decideProposal(input)
}

export async function listCopilotProposalsAction(input: unknown = {}) {
  return listProposals(input)
}
