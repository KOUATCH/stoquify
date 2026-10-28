"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  approveCloseWaiver,
  assignCloseFinding,
  commentOnCloseFinding,
  getCloseAssuranceDashboard,
  getCloseEvidenceGraph,
  requestCloseWaiver,
  runCloseAssurance,
  updateAccountantReview,
  type AccountantReviewDto,
  type CloseAssuranceCommentDto,
  type CloseAssuranceDashboardData,
  type CloseAssuranceFindingDto,
  type CloseEvidenceGraphDto,
} from "@/services/accounting/close-assurance.service"
import {
  exportClosePack,
  type ClosePackExportResult,
} from "@/services/accounting/close-assurance-pack.service"
import {
  approveCloseWaiverInputSchema,
  assignCloseFindingInputSchema,
  closeAssuranceDashboardInputSchema,
  closeAssurancePeriodInputSchema,
  closeEvidenceGraphInputSchema,
  commentOnCloseFindingInputSchema,
  exportClosePackInputSchema,
  requestCloseWaiverInputSchema,
  updateAccountantReviewInputSchema,
} from "@/services/accounting/close-assurance.schemas"

export type {
  AccountantReviewDto,
  CloseAssuranceCommentDto,
  CloseAssuranceDashboardData,
  CloseAssuranceFindingDto,
  CloseEvidenceGraphDto,
  ClosePackExportResult,
}

function revalidateClosePaths(periodId?: string | null) {
  revalidatePath("/dashboard/accounting", "page")
  revalidatePath("/dashboard/accounting/close", "page")
  if (periodId) revalidatePath(`/dashboard/accounting/close/${periodId}`, "page")
}

const getDashboard = protect<unknown, CloseAssuranceDashboardData>(
  { permission: "accounting.close.read", auditResource: "CloseRun", auditAllowed: false },
  async (input, ctx) => {
    const parsed = closeAssuranceDashboardInputSchema.parse(input)
    return getCloseAssuranceDashboard(ctx.orgId, parsed?.periodId)
  },
)

export async function getCloseAssuranceDashboardAction(input: unknown = {}) {
  return getDashboard(input)
}

const runAssessment = protect<unknown, CloseAssuranceDashboardData>(
  { permission: "accounting.close.run", auditResource: "CloseRun", auditAllowed: true },
  async (input, ctx) => {
    const parsed = closeAssurancePeriodInputSchema.parse(input)
    const result = await runCloseAssurance(ctx.orgId, parsed, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    revalidateClosePaths(parsed.periodId)
    return result
  },
)

export async function runCloseAssuranceAction(input: unknown) {
  return runAssessment(input)
}

const getEvidenceGraph = protect<unknown, CloseEvidenceGraphDto>(
  { permission: "accounting.close.read", auditResource: "CloseEvidenceItem", auditAllowed: false },
  async (input, ctx) => {
    const parsed = closeEvidenceGraphInputSchema.parse(input)
    return getCloseEvidenceGraph(ctx.orgId, parsed)
  },
)

export async function getCloseEvidenceGraphAction(input: unknown) {
  return getEvidenceGraph(input)
}

const assignFinding = protect<unknown, CloseAssuranceFindingDto>(
  { permission: "accounting.close.finding.assign", auditResource: "CloseAssuranceFinding", auditAllowed: true },
  async (input, ctx) => {
    const parsed = assignCloseFindingInputSchema.parse(input)
    const result = await assignCloseFinding(ctx.orgId, parsed, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    revalidateClosePaths()
    return result
  },
)

export async function assignCloseFindingAction(input: unknown) {
  return assignFinding(input)
}

const addComment = protect<unknown, CloseAssuranceCommentDto>(
  { permission: "accounting.close.finding.comment", auditResource: "AccountantComment", auditAllowed: true },
  async (input, ctx) => {
    const parsed = commentOnCloseFindingInputSchema.parse(input)
    const result = await commentOnCloseFinding(ctx.orgId, parsed, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    revalidateClosePaths()
    return result
  },
)

export async function commentOnCloseFindingAction(input: unknown) {
  return addComment(input)
}

const requestWaiver = protect<unknown, CloseAssuranceFindingDto>(
  { permission: "accounting.close.waiver.request", auditResource: "CloseAssuranceFinding", auditAllowed: true },
  async (input, ctx) => {
    const parsed = requestCloseWaiverInputSchema.parse(input)
    const result = await requestCloseWaiver(ctx.orgId, parsed, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    revalidateClosePaths()
    return result
  },
)

export async function requestCloseWaiverAction(input: unknown) {
  return requestWaiver(input)
}

const approveWaiver = protect<unknown, CloseAssuranceFindingDto>(
  {
    permission: "accounting.close.waiver.approve",
    auditResource: "CloseAssuranceFinding",
    auditAllowed: true,
    freshAuth: true,
  },
  async (input, ctx) => {
    const parsed = approveCloseWaiverInputSchema.parse(input)
    const result = await approveCloseWaiver(ctx.orgId, parsed, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: Date.now(),
    })
    revalidateClosePaths()
    return result
  },
)

export async function approveCloseWaiverAction(input: unknown) {
  return approveWaiver(input)
}

const updateReview = protect<unknown, AccountantReviewDto>(
  { permission: "accounting.close.accountant.review", auditResource: "AccountantReview", auditAllowed: true },
  async (input, ctx) => {
    const parsed = updateAccountantReviewInputSchema.parse(input)
    const result = await updateAccountantReview(ctx.orgId, parsed, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    revalidateClosePaths()
    return result
  },
)

export async function updateAccountantReviewAction(input: unknown) {
  return updateReview(input)
}

const exportDraftPack = protect<unknown, ClosePackExportResult>(
  { permission: "accounting.close.export", auditResource: "ClosePackExport", auditAllowed: true },
  async (input, ctx) => {
    const parsed = exportClosePackInputSchema.parse(input)
    const result = await exportClosePack(ctx.orgId, { ...parsed, mode: "DRAFT_NOT_CERTIFIED" }, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    revalidateClosePaths(result.periodId)
    return result
  },
)

export async function exportDraftClosePackAction(input: unknown) {
  return exportDraftPack(input)
}

const exportCertifiedPack = protect<unknown, ClosePackExportResult>(
  {
    permission: "accounting.close.certify",
    auditResource: "ClosePackExport",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
  },
  async (input, ctx) => {
    const parsed = exportClosePackInputSchema.parse(input)
    const result = await exportClosePack(ctx.orgId, { ...parsed, mode: "CERTIFIED" }, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: new Date(),
    })
    revalidateClosePaths(result.periodId)
    return result
  },
)

export async function exportCertifiedClosePackAction(input: unknown) {
  return exportCertifiedPack(input)
}
