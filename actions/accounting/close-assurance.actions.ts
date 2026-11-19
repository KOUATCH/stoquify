"use server"

import { revalidateAfterCommit } from "@/services/_shared/cache-revalidation"

import {
  FreshAuthRequiredError,
  SESSION_ASSURANCE_LEVEL,
} from "@/lib/security/auth-session"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { closeEvidenceAcceptanceControl, closeEvidenceWorkControl } from "@/services/accounting/close-evidence-acceptance-context"
import {
  acceptMissingCloseEvidenceResponse,
  approveCloseWaiver,
  assignCloseFinding,
  commentOnCloseFinding,
  getCloseAssuranceDashboard,
  getCloseEvidenceGraph,
  respondToMissingCloseEvidence,
  requestMissingCloseEvidence,
  requestCloseWaiver,
  runCloseAssurance,
  updateAccountantReview,
  type AccountantReviewDto,
  type CloseAssuranceCommentDto,
  type CloseAssuranceDashboardData as ServiceCloseAssuranceDashboardData,
  type CloseAssuranceFindingDto,
  type CloseEvidenceGraphDto,
  type MissingCloseEvidenceRequestDto,
  type MissingCloseEvidenceResponseDto,
} from "@/services/accounting/close-assurance.service"
import {
  type MissingCloseEvidenceResponseAcceptanceDto,
} from "@/services/accounting/missing-close-evidence-response-acceptance-contracts"
import {
  exportClosePack,
  getRetainedClosePackExport,
  listClosePackExports,
  type ClosePackExportResult,
  type ClosePackExportReceipt,
} from "@/services/accounting/close-assurance-pack.service"
import {
  acceptMissingCloseEvidenceResponseInputSchema,
  approveCloseWaiverInputSchema,
  assignCloseFindingInputSchema,
  closeAssuranceDashboardInputSchema,
  closeAssurancePeriodInputSchema,
  closeEvidenceGraphInputSchema,
  commentOnCloseFindingInputSchema,
  exportClosePackInputSchema,
  getRetainedClosePackExportInputSchema,
  listClosePackExportsInputSchema,
  requestMissingCloseEvidenceInputSchema,
  respondToMissingCloseEvidenceInputSchema,
  requestCloseWaiverInputSchema,
  updateAccountantReviewInputSchema,
} from "@/services/accounting/close-assurance.schemas"

export type {
  AccountantReviewDto,
  CloseAssuranceCommentDto,
  CloseAssuranceFindingDto,
  CloseEvidenceGraphDto,
  MissingCloseEvidenceRequestDto,
  MissingCloseEvidenceResponseDto,
  MissingCloseEvidenceResponseAcceptanceDto,
  ClosePackExportResult,
  ClosePackExportReceipt,
}

/** Bind browser read models to the authenticated action actor and tenant. */
export type CloseAssuranceDashboardData = ServiceCloseAssuranceDashboardData & {
  organizationId: string
  actorId: string
}

function revalidateClosePaths(periodId?: string | null) {
  revalidateAfterCommit({ paths: [
    "/dashboard/accounting",
    "/dashboard/accounting/close",
    ...(periodId ? [`/dashboard/accounting/close/${periodId}`] : []),
  ] })
}

const getDashboard = protect<unknown, CloseAssuranceDashboardData>(
  { permission: "accounting.close.read", auditResource: "CloseRun", auditAllowed: false,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.dashboard", accessIntent: "read", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = closeAssuranceDashboardInputSchema.parse(input)
    const data = await getCloseAssuranceDashboard(ctx.orgId, parsed?.periodId)
    return { ...data, organizationId: ctx.orgId, actorId: ctx.userId }
  },
)

export async function getCloseAssuranceDashboardAction(input: unknown = {}) {
  return getDashboard(input)
}

const runAssessment = protect<unknown, CloseAssuranceDashboardData>(
  { permission: "accounting.close.run", auditResource: "CloseRun", auditAllowed: true,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.assessment", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = closeAssurancePeriodInputSchema.parse(input)
    const result = await runCloseAssurance(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
    revalidateClosePaths(parsed.periodId)
    return { ...result, organizationId: ctx.orgId, actorId: ctx.userId }
  },
)

export async function runCloseAssuranceAction(input: unknown) {
  return runAssessment(input)
}

const getEvidenceGraph = protect<unknown, CloseEvidenceGraphDto>(
  { permission: "accounting.close.read", auditResource: "CloseEvidenceItem", auditAllowed: false,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.evidence-graph", accessIntent: "read", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = closeEvidenceGraphInputSchema.parse(input)
    return getCloseEvidenceGraph(ctx.orgId, parsed)
  },
)

export async function getCloseEvidenceGraphAction(input: unknown) {
  return getEvidenceGraph(input)
}

const assignFinding = protect<unknown, CloseAssuranceFindingDto>(
  { permission: "accounting.close.finding.assign", auditResource: "CloseAssuranceFinding", auditAllowed: true,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.finding.assign", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = assignCloseFindingInputSchema.parse(input)
    const result = await assignCloseFinding(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
    revalidateClosePaths()
    return result
  },
)

export async function assignCloseFindingAction(input: unknown) {
  return assignFinding(input)
}

const addComment = protect<unknown, CloseAssuranceCommentDto>(
  { permission: "accounting.close.finding.comment", auditResource: "AccountantComment", auditAllowed: true,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.finding.comment", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = commentOnCloseFindingInputSchema.parse(input)
    const result = await commentOnCloseFinding(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
    revalidateClosePaths()
    return result
  },
)

export async function commentOnCloseFindingAction(input: unknown) {
  return addComment(input)
}

const requestMissingEvidence = protect<unknown, MissingCloseEvidenceRequestDto>(
  {
    permission: "accounting.close.evidence.request",
    auditResource: "AccountantComment",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const parsed = requestMissingCloseEvidenceInputSchema.parse(input)
    const result = await requestMissingCloseEvidence(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
    revalidateClosePaths(result.periodId)
    return result
  },
)

export async function requestMissingCloseEvidenceAction(input: unknown) {
  return requestMissingEvidence(input)
}

const respondToMissingEvidence = protect<unknown, MissingCloseEvidenceResponseDto>(
  {
    permission: "accounting.close.finding.comment",
    auditResource: "AccountantComment",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const parsed = respondToMissingCloseEvidenceInputSchema.parse(input)
    const result = await respondToMissingCloseEvidence(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
    revalidateClosePaths(result.periodId)
    return result
  },
)

export async function respondToMissingCloseEvidenceAction(input: unknown) {
  return respondToMissingEvidence(input)
}

const acceptMissingEvidenceResponse = protect<
  unknown,
  MissingCloseEvidenceResponseAcceptanceDto
>(
  {
    permission: "accounting.close.accountant.review",
    auditResource: "CloseAssuranceFinding",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
  },
  async (input, ctx) => {
    const control = closeEvidenceAcceptanceControl(ctx)
    const parsed = acceptMissingCloseEvidenceResponseInputSchema.parse(input)
    const result = await acceptMissingCloseEvidenceResponse(ctx.orgId, parsed, control)
    revalidateClosePaths(result.periodId)
    return result
  },
)

export async function acceptMissingCloseEvidenceResponseAction(input: unknown) {
  return acceptMissingEvidenceResponse(input)
}

const requestWaiver = protect<unknown, CloseAssuranceFindingDto>(
  { permission: "accounting.close.waiver.request", auditResource: "CloseAssuranceFinding", auditAllowed: true,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.waiver.request", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = requestCloseWaiverInputSchema.parse(input)
    const result = await requestCloseWaiver(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
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
    freshAuth: { maxAgeSeconds: 300 },
    module: { moduleSlug: "close_assurance", surface: "close-assurance.waiver.approve", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const control = closeEvidenceAcceptanceControl(ctx)
    const parsed = approveCloseWaiverInputSchema.parse(input)
    const result = await approveCloseWaiver(ctx.orgId, parsed, {
      actorId: control.actorId,
      actorPermissions: control.actorPermissions,
      session: control.session,
      freshAuth: control.freshAuth,
    })
    revalidateClosePaths()
    return result
  },
)

export async function approveCloseWaiverAction(input: unknown) {
  return approveWaiver(input)
}

const updateReview = protect<unknown, AccountantReviewDto>(
  { permission: "accounting.close.accountant.review", auditResource: "AccountantReview", auditAllowed: true,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.accountant.review", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = updateAccountantReviewInputSchema.parse(input)
    const result = await updateAccountantReview(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
    revalidateClosePaths()
    return result
  },
)

export async function updateAccountantReviewAction(input: unknown) {
  return updateReview(input)
}

const exportDraftPack = protect<unknown, ClosePackExportResult>(
  { permission: "accounting.close.export", auditResource: "ClosePackExport", auditAllowed: true,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.pack.draft", accessIntent: "export", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const parsed = exportClosePackInputSchema.parse(input)
    const result = await exportClosePack(ctx.orgId, { ...parsed, mode: "DRAFT_NOT_CERTIFIED" }, await closeEvidenceWorkControl(ctx))
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
    module: { moduleSlug: "close_assurance", surface: "close-assurance.pack.certified", accessIntent: "write", mode: "enforce", audit: true },
  },
  async (input, ctx) => {
    const lastAuthAt = verifiedCloseFreshAuthTime(ctx)
    const control = closeEvidenceAcceptanceControl(ctx)
    const parsed = exportClosePackInputSchema.parse(input)
    const result = await exportClosePack(ctx.orgId, { ...parsed, mode: "CERTIFIED" }, {
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      session: control.session,
      lastAuthAt,
    })
    revalidateClosePaths(result.periodId)
    return result
  },
)

export async function exportCertifiedClosePackAction(input: unknown) {
  return exportCertifiedPack(input)
}

const listRetainedPacks = protect<unknown, ClosePackExportReceipt[]>(
  { permission: "accounting.close.export", auditResource: "ClosePackExport", auditAllowed: false,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.pack.retained.list", accessIntent: "export", mode: "enforce", audit: true },
  },
  async (input, ctx) => listClosePackExports(ctx.orgId, listClosePackExportsInputSchema.parse(input), await closeEvidenceWorkControl(ctx)),
)

export async function listClosePackExportsAction(input: unknown) {
  return listRetainedPacks(input)
}

async function retrieveRetainedPack(input: unknown, ctx: ProtectedActionContext) {
  const parsed = getRetainedClosePackExportInputSchema.parse(input)
  const control = parsed.mode === "CERTIFIED" ? closeEvidenceAcceptanceControl(ctx) : await closeEvidenceWorkControl(ctx)
  return getRetainedClosePackExport(ctx.orgId, parsed, {
    actorId: control.actorId, actorPermissions: control.actorPermissions, session: control.session,
    ...(parsed.mode === "CERTIFIED" ? { lastAuthAt: verifiedCloseFreshAuthTime(ctx) } : {}),
  })
}

const retrieveDraftPack = protect<unknown, ClosePackExportResult>(
  { permission: "accounting.close.export", auditResource: "ClosePackExport", auditAllowed: true,
    module: { moduleSlug: "close_assurance", surface: "close-assurance.pack.retained", accessIntent: "export", mode: "enforce", audit: true },
  }, retrieveRetainedPack,
)

const retrieveCertifiedPack = protect<unknown, ClosePackExportResult>(
  { permission: "accounting.close.export", auditResource: "ClosePackExport", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 },
    module: { moduleSlug: "close_assurance", surface: "close-assurance.pack.retained", accessIntent: "export", mode: "enforce", audit: true },
  }, retrieveRetainedPack,
)

export async function getRetainedClosePackExportAction(input: unknown) {
  // The persisted receipt is checked again by the service; a draft request can
  // never downgrade the fresh-auth requirement of retained certified bytes.
  return input && typeof input === "object" && "mode" in input && input.mode === "CERTIFIED"
    ? retrieveCertifiedPack(input) : retrieveDraftPack(input)
}

function verifiedCloseFreshAuthTime(ctx: ProtectedActionContext): Date {
  const freshAuth = ctx.freshAuth
  if (
    !freshAuth ||
    freshAuth.claims.userId !== ctx.userId ||
    freshAuth.claims.tenantId !== ctx.orgId ||
    freshAuth.claims.assuranceOrganizationId !== ctx.orgId ||
    !Number.isFinite(freshAuth.claims.assuranceLevel) ||
    freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
    freshAuth.claims.lastAuthAt !== freshAuth.lastAuthAt.getTime()
  ) {
    throw new FreshAuthRequiredError()
  }

  return freshAuth.lastAuthAt
}
