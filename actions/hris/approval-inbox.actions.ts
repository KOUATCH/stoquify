"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getHrisApprovalReview, decideReviewedHrisApproval } from "@/services/hris/approval-review.service"
import {
  decideHrisApprovalInboxItem,
  getHrisApprovalInbox,
  type HrisApprovalInboxDecisionInput,
  type HrisApprovalInboxReadInput,
} from "@/services/hris/approval-inbox.service"

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function readFields(input: unknown) {
  const record = asRecord(input)
  return {
    domain: record.domain,
    stage: record.stage,
    limit: record.limit,
  }
}

function decisionFields(input: unknown) {
  const record = asRecord(input)
  return {
    domain: record.domain,
    decision: record.decision,
    employeeId: record.employeeId,
    sourceId: record.sourceId,
    decisionReason: record.decisionReason,
    reviewVersion: record.reviewVersion,
    acknowledged: record.acknowledged,
    evidenceReferences: record.evidenceReferences,
  }
}

function revalidateApprovalPaths() {
  revalidatePath("/dashboard/people", "page")
  revalidatePath("/[locale]/dashboard/people", "page")
  revalidatePath("/dashboard/people/approvals", "page")
  revalidatePath("/[locale]/dashboard/people/approvals", "page")
  revalidatePath("/dashboard/payroll/command-center", "page")
  revalidatePath("/[locale]/dashboard/payroll/command-center", "page")
}

const readInbox = protect<unknown, Awaited<ReturnType<typeof getHrisApprovalInbox>>>(
  {
    permission: "hris.people.read",
    auditResource: "HrisApprovalInbox",
    auditAllowed: false,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => getHrisApprovalInbox({
    ...readFields(input),
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
  } as HrisApprovalInboxReadInput),
)

const decideInboxItem = protect<
  unknown,
  Awaited<ReturnType<typeof decideReviewedHrisApproval>>
>(
  {
    permission: "hris.people.manage",
    auditResource: "HrisApprovalInbox",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {moduleSlug:"payroll",surface:"hris.approval.review.decide",accessIntent:"write",mode:"enforce"},
  },
  async (input, ctx) => {
    if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError("Refresh your session before continuing.")
    const result = await decideReviewedHrisApproval({
      ...decisionFields(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as Parameters<typeof decideReviewedHrisApproval>[0])
    // A cache failure after commit must not hide the durable decision receipt.
    try { revalidateApprovalPaths() } catch { /* Receipt remains authoritative; refresh can be retried. */ }
    return result
  },
)

export async function getHrisApprovalInboxAction(input: unknown = {}) {
  return readInbox(input)
}

export async function decideHrisApprovalInboxItemAction(input: unknown) {
  return decideInboxItem(input)
}

const previewReview = protect<unknown, Awaited<ReturnType<typeof getHrisApprovalReview>>>(
  {permission:"hris.people.manage",freshAuth:true,tenantGuard:"handler-derived",module:{moduleSlug:"payroll",surface:"hris.approval.review.read",accessIntent:"read",mode:"enforce"}},
  async(input,ctx)=>{
    if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError("Refresh your session before continuing.")
    const fields=decisionFields(input)
    return getHrisApprovalReview({...fields,organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions} as Parameters<typeof getHrisApprovalReview>[0])
  },
)
export async function getHrisApprovalReviewAction(input:unknown){return previewReview(input)}
