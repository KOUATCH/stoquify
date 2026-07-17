"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
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
    approvalEvidenceHash: record.approvalEvidenceHash,
    idempotencyKey: record.idempotencyKey,
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
  Awaited<ReturnType<typeof decideHrisApprovalInboxItem>>
>(
  {
    permission: "hris.people.manage",
    auditResource: "HrisApprovalInbox",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const result = await decideHrisApprovalInboxItem({
      ...decisionFields(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as HrisApprovalInboxDecisionInput)
    revalidateApprovalPaths()
    return result
  },
)

export async function getHrisApprovalInboxAction(input: unknown = {}) {
  return readInbox(input)
}

export async function decideHrisApprovalInboxItemAction(input: unknown) {
  return decideInboxItem(input)
}
