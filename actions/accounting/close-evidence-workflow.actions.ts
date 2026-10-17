"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { assertCloseEvidenceActor, getCloseEvidenceReview, getCloseEvidenceWorkflow, getCloseEvidenceInvestigation } from "@/services/accounting/close-evidence-workflow.service"
import { requestMissingCloseEvidence, respondToMissingCloseEvidence, acceptMissingCloseEvidenceResponse, replaceMissingCloseEvidenceRecipient } from "@/services/accounting/close-assurance.service"
import { requestMissingCloseEvidenceInputSchema, respondToMissingCloseEvidenceInputSchema, acceptMissingCloseEvidenceResponseInputSchema, replaceMissingCloseEvidenceRecipientInputSchema } from "@/services/accounting/close-assurance.schemas"
import { closeEvidenceAcceptanceControl, closeEvidenceWorkControl } from "@/services/accounting/close-evidence-acceptance-context"
import { closeEvidencePageSchema } from "@/services/accounting/close-evidence-pagination"
import { proposeCloseEvidenceResolution, approveCloseEvidenceResolution, closeEvidenceResolutionProposal } from "@/services/accounting/close-evidence-resolution.service"

const identity = (ctx: ProtectedActionContext) => ({ organizationId: ctx.orgId, actorId: ctx.userId })
const read = { permission: "accounting.close.read", auditResource: "CloseEvidenceWorkflow", auditAllowed: false,
  module: { moduleSlug: "close_assurance" as const, surface: "close-evidence-workflow", accessIntent: "read" as const, mode: "enforce" as const } }
const write = { ...read, auditAllowed: true, module: { ...read.module, accessIntent: "write" as const } }
const id = z.string().trim().min(1).max(200)
const list = protect(read, async (input: unknown, ctx) => {
  const parsed = z.object({ periodId: id, page: closeEvidencePageSchema.optional() }).strict().parse(input)
  return getCloseEvidenceWorkflow(identity(ctx), parsed.periodId, parsed.page)
})
const detail = protect({ ...read, permission: "accounting.close.accountant.review" }, async (input: unknown, ctx) => getCloseEvidenceReview(identity(ctx), z.object({ requestId: id }).strict().parse(input).requestId))
const request = protect({ ...write, permission: "accounting.close.evidence.request" }, async (input: unknown, ctx) => {
  const parsed = requestMissingCloseEvidenceInputSchema.omit({ clientOrganizationId: true }).strict().parse(input)
  await assertCloseEvidenceActor(identity(ctx), "accounting.close.evidence.request", "write")
  // New assignments validate and lock recipient eligibility in the domain transaction.
  // An exact replay must still return its retained result after recipient changes.
  const result = await requestMissingCloseEvidence(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
  revalidatePath("/dashboard/accounting/close", "page")
  return result
})
const respond = protect({ ...write, permission: "accounting.close.finding.comment" }, async (input: unknown, ctx) => {
  const parsed = respondToMissingCloseEvidenceInputSchema.strict().parse(input)
  await assertCloseEvidenceActor(identity(ctx), "accounting.close.finding.comment", "write")
  const result = await respondToMissingCloseEvidence(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
  revalidatePath("/dashboard/accounting/close", "page")
  return result
})
const accept = protect({ ...write, permission: "accounting.close.accountant.review", freshAuth: { maxAgeSeconds: 300 } }, async (input: unknown, ctx) => {
  const parsed = acceptMissingCloseEvidenceResponseInputSchema.omit({ clientOrganizationId: true }).strict().parse(input)
  const result = await acceptMissingCloseEvidenceResponse(ctx.orgId, parsed, closeEvidenceAcceptanceControl(ctx))
  revalidatePath("/dashboard/accounting/close", "page")
  return result
})
export async function getCloseEvidenceWorkflowAction(input: unknown) { return list(input) }
export async function getCloseEvidenceReviewAction(input: unknown) { return detail(input) }
export async function requestCloseEvidenceAction(input: unknown) { return request(input) }
export async function respondCloseEvidenceAction(input: unknown) { return respond(input) }
export async function acceptCloseEvidenceAction(input: unknown) { return accept(input) }
const replace = protect({ ...write, permission: "accounting.close.evidence.request" }, async (input: unknown, ctx) => {
  const parsed = replaceMissingCloseEvidenceRecipientInputSchema.parse(input)
  await assertCloseEvidenceActor(identity(ctx), "accounting.close.finding.assign", "write")
  const result = await replaceMissingCloseEvidenceRecipient(ctx.orgId, parsed, await closeEvidenceWorkControl(ctx))
  revalidatePath("/dashboard/accounting/close", "page")
  return result
})
export async function replaceCloseEvidenceRecipientAction(input: unknown) { return replace(input) }
const investigate = protect({ ...read, permission: "accounting.close.accountant.review" }, async (input: unknown, ctx) => {
  const parsed = z.object({ periodId: id, requestId: id }).strict().parse(input)
  return getCloseEvidenceInvestigation(identity(ctx), parsed.periodId, parsed.requestId)
})
export async function getCloseEvidenceInvestigationAction(input: unknown) { return investigate(input) }
const proposeResolution = protect({ ...write, permission: "accounting.close.accountant.review", freshAuth: { maxAgeSeconds: 300 } }, async (input: unknown, ctx) => {
  await assertCloseEvidenceActor(identity(ctx), "accounting.close.accountant.review", "write")
  const result = await proposeCloseEvidenceResolution(ctx.orgId, input, closeEvidenceAcceptanceControl(ctx))
  revalidatePath("/dashboard/accounting/close", "page"); return result
})
const approveResolution = protect({ ...write, permission: "accounting.close.accountant.review", freshAuth: { maxAgeSeconds: 300 } }, async (input: unknown, ctx) => {
  await assertCloseEvidenceActor(identity(ctx), "accounting.close.accountant.review", "write")
  const result = await approveCloseEvidenceResolution(ctx.orgId, input, closeEvidenceAcceptanceControl(ctx))
  revalidatePath("/dashboard/accounting/close", "page"); return result
})
export async function proposeCloseEvidenceResolutionAction(input: unknown) { return proposeResolution(input) }
export async function approveCloseEvidenceResolutionAction(input: unknown) { return approveResolution(input) }
const closeResolution = protect({ ...write, permission: "accounting.close.accountant.review", freshAuth: { maxAgeSeconds: 300 } }, async (input: unknown, ctx) => {
  await assertCloseEvidenceActor(identity(ctx), "accounting.close.accountant.review", "write")
  const result = await closeEvidenceResolutionProposal(ctx.orgId, input, closeEvidenceAcceptanceControl(ctx))
  revalidatePath("/dashboard/accounting/close", "page"); return result
})
export async function closeEvidenceResolutionProposalAction(input: unknown) { return closeResolution(input) }
