"use server"

import {
  getAccountantAccessRegister,
  getAccountantPortfolio,
  grantAccountantAccess,
  revokeAccountantAccess,
  type AccountantAccessGrantDto,
  type AccountantPortfolio,
} from "@/services/accounting/accountant-access.service"
import {
  inviteOrGrantAccountantAccess,
  type InviteOrGrantAccountantAccessResult,
} from "@/services/accounting/accountant-client-invite.service"
import {
  grantAccountantAccessInputSchema,
  inviteAccountantAccessInputSchema,
  revokeAccountantAccessInputSchema,
} from "@/services/accounting/accountant-access.schemas"
import { protect } from "@/services/_shared/protect"

export type { AccountantAccessGrantDto, AccountantPortfolio }

const listAccess = protect<unknown, AccountantAccessGrantDto[]>(
  {
    permission: "accounting.close.accountant.invite",
    auditResource: "AccountantAccessGrant",
    auditAllowed: false,
  },
  async (_input, ctx) => getAccountantAccessRegister(ctx.orgId),
)

export async function getAccountantAccessRegisterAction(input: unknown = {}) {
  return listAccess(input)
}

const listPortfolio = protect<unknown, AccountantPortfolio>(
  {
    permission: "accounting.audit.read",
    auditResource: "AccountantPortfolio",
    auditAllowed: false,
  },
  async (_input, ctx) => getAccountantPortfolio(ctx.userId),
)

export async function getAccountantPortfolioAction(input: unknown = {}) {
  return listPortfolio(input)
}

const grantAccess = protect<unknown, AccountantAccessGrantDto>(
  {
    permission: "accounting.close.accountant.invite",
    auditResource: "AccountantAccessGrant",
    freshAuth: { maxAgeSeconds: 300 },
  },
  async (input, ctx) =>
    grantAccountantAccess(
      ctx.orgId,
      ctx.userId,
      grantAccountantAccessInputSchema.parse(input),
    ),
)

export async function grantAccountantAccessAction(input: unknown) {
  return grantAccess(input)
}

const inviteAccess = protect<unknown, InviteOrGrantAccountantAccessResult>(
  {
    permission: "accounting.close.accountant.invite",
    auditResource: "AccountantClientInvite",
    freshAuth: { maxAgeSeconds: 300 },
  },
  async (input, ctx) =>
    inviteOrGrantAccountantAccess(
      ctx.orgId,
      ctx.userId,
      inviteAccountantAccessInputSchema.parse(input),
    ),
)

export async function inviteAccountantAccessAction(input: unknown) {
  return inviteAccess(input)
}

const revokeAccess = protect<unknown, AccountantAccessGrantDto>(
  {
    permission: "accounting.close.accountant.invite",
    auditResource: "AccountantAccessGrant",
    freshAuth: { maxAgeSeconds: 300 },
  },
  async (input, ctx) =>
    revokeAccountantAccess(
      ctx.orgId,
      ctx.userId,
      revokeAccountantAccessInputSchema.parse(input),
    ),
)

export async function revokeAccountantAccessAction(input: unknown) {
  return revokeAccess(input)
}
