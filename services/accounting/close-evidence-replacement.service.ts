import "server-only"

import { createHash } from "node:crypto"
import { CloseRunStatus, Prisma, type AccountantComment, type CloseAssuranceFinding, type CloseChecklistItem, type CloseEvidenceItem } from "@prisma/client"
import { lockCloseAssessmentOrderInTx, readCloseAssessmentOrderInTx } from "./close-assessment-order.service"
import { isCloseEvidenceCollectionEligible, verifyCloseEvidenceCollectionReceipt } from "./close-evidence-collection"
import { MISSING_CLOSE_EVIDENCE_REQUEST_TYPE, MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE, MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY, MISSING_CLOSE_EVIDENCE_VISIBILITY } from "./missing-close-evidence-request-queue-contracts"
import { MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE, MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY } from "./missing-close-evidence-response-acceptance-contracts"

export type CloseEvidenceReplacementBinding = {
  kind: "CLOSE_EVIDENCE_REPLACEMENT"
  version: 1
  organizationId: string
  periodId: string
  findingId: string
  originalRunId: string
  originalChecklistId: string
  originalFindingHash: string
  originalChecklistHash: string
  originalEvidence: Array<{ id: string; hash: string }>
  replacementRunId: string
  replacementChecklistId: string
  replacementReceiptHash: string
}

export type CloseEvidenceReplacementSelection = { checklistItemId: string; bindingHash: string }
export type CloseEvidenceReplacementUnavailableReason = "ORIGINAL_NOT_FOUND" | "ORIGINAL_SCOPE_INVALID" | "ORIGINAL_NOT_MISSING" | "CURRENT_ASSESSMENT_AMBIGUOUS" | "NEW_ASSESSMENT_REQUIRED" | "ASSESSMENT_INCOMPLETE" | "ASSESSMENT_VOIDED" | "ASSESSMENT_STALE" | "COLLECTOR_NOT_FOUND" | "COLLECTION_UNVERIFIED" | "SOURCE_CHANGED"
export type CloseEvidenceReplacementPreview = {
  status: "AVAILABLE"
  reason: "VERIFIED_COLLECTION"
  binding: CloseEvidenceReplacementBinding
  selection: CloseEvidenceReplacementSelection
  checklistKey: string
  domain: string
  controlStatus: "PASSED" | "WARNING" | "FAILED"
  observedAt: string
  recoveredEvidenceCount: number
} | { status: "UNAVAILABLE"; reason: CloseEvidenceReplacementUnavailableReason }

const checklistInclude = {
  period: { select: { id: true, organizationId: true } },
  closeRun: { include: { period: { select: { id: true, organizationId: true } } } },
  evidenceItems: { orderBy: { id: "asc" as const } },
} satisfies Prisma.CloseChecklistItemInclude
const findingInclude = {
  period: { select: { id: true, organizationId: true } },
  closeRun: { include: { period: { select: { id: true, organizationId: true } } } },
  checklistItem: { include: checklistInclude },
} satisfies Prisma.CloseAssuranceFindingInclude
type Checklist = Prisma.CloseChecklistItemGetPayload<{ include: typeof checklistInclude }>
type Finding = Prisma.CloseAssuranceFindingGetPayload<{ include: typeof findingInclude }>

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function text(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0 }
function hash(value: unknown): string {
  function canonical(item: unknown): string {
    if (item instanceof Date) return JSON.stringify(item.toISOString())
    if (Array.isArray(item)) return `[${item.map(canonical).join(",")}]`
    if (item && typeof item === "object") return `{${Object.keys(item).sort().map(key => `${JSON.stringify(key)}:${canonical((item as Record<string, unknown>)[key])}`).join(",")}}`
    return JSON.stringify(item)
  }
  return createHash("sha256").update(canonical(value)).digest("hex")
}
const isHash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value)

export function parseCloseEvidenceReplacementBinding(value: unknown): CloseEvidenceReplacementBinding | null {
  const record = object(value)
  const identity = ["organizationId", "periodId", "findingId", "originalRunId", "originalChecklistId", "replacementRunId", "replacementChecklistId"] as const
  if (record.kind !== "CLOSE_EVIDENCE_REPLACEMENT" || record.version !== 1 || !identity.every(key => text(record[key])) ||
    !isHash(record.originalFindingHash) || !isHash(record.originalChecklistHash) || !isHash(record.replacementReceiptHash) || !Array.isArray(record.originalEvidence)) return null
  const evidence: Array<{ id: string; hash: string }> = []
  for (const value of record.originalEvidence) {
    const row = object(value)
    if (!text(row.id) || !isHash(row.hash) || evidence.some(item => item.id === row.id)) return null
    evidence.push({ id: row.id, hash: row.hash })
  }
  return {
    kind: "CLOSE_EVIDENCE_REPLACEMENT", version: 1,
    organizationId: record.organizationId as string, periodId: record.periodId as string, findingId: record.findingId as string,
    originalRunId: record.originalRunId as string, originalChecklistId: record.originalChecklistId as string,
    originalFindingHash: record.originalFindingHash, originalChecklistHash: record.originalChecklistHash,
    originalEvidence: evidence.sort((a, b) => a.id.localeCompare(b.id)), replacementRunId: record.replacementRunId as string,
    replacementChecklistId: record.replacementChecklistId as string, replacementReceiptHash: record.replacementReceiptHash,
  }
}

export function closeEvidenceReplacementSelection(binding: CloseEvidenceReplacementBinding): CloseEvidenceReplacementSelection {
  return { checklistItemId: binding.replacementChecklistId, bindingHash: `sha256:${hash(binding)}` }
}

function findingHash(finding: CloseAssuranceFinding) {
  return hash({ id: finding.id, organizationId: finding.organizationId, periodId: finding.periodId, closeRunId: finding.closeRunId,
    checklistItemId: finding.checklistItemId, domain: finding.domain, severity: finding.severity, title: finding.title,
    detail: finding.detail, sourceService: finding.sourceService, sourceType: finding.sourceType, sourceId: finding.sourceId, createdAt: finding.createdAt })
}
function checklistHash(item: CloseChecklistItem) {
  return hash({ id: item.id, organizationId: item.organizationId, periodId: item.periodId, closeRunId: item.closeRunId,
    key: item.key, domain: item.domain, sourceService: item.sourceService, status: item.status, severity: item.severity,
    label: item.label, detail: item.detail, evidenceCount: item.evidenceCount, blockerReason: item.blockerReason, createdAt: item.createdAt })
}
function evidenceHash(item: CloseEvidenceItem) {
  return hash({ id: item.id, organizationId: item.organizationId, periodId: item.periodId, closeRunId: item.closeRunId,
    checklistItemId: item.checklistItemId, findingId: item.findingId, evidenceType: item.evidenceType, sourceTable: item.sourceTable,
    sourceType: item.sourceType, sourceId: item.sourceId, sourceLabel: item.sourceLabel, sourceDate: item.sourceDate,
    sourceHash: item.sourceHash, provenance: item.provenance, available: item.available, unavailableReason: item.unavailableReason,
    metadata: item.metadata, correlationId: item.correlationId, createdAt: item.createdAt })
}
function sameScope(item: { organizationId: string; periodId: string; closeRunId: string }, organizationId: string, periodId: string, runId: string) {
  return item.organizationId === organizationId && item.periodId === periodId && item.closeRunId === runId
}
function validChecklist(checklist: Checklist, organizationId: string, periodId: string, runId: string) {
  return sameScope(checklist, organizationId, periodId, runId) && checklist.period.id === periodId && checklist.period.organizationId === organizationId &&
    checklist.closeRun.id === runId && checklist.closeRun.organizationId === organizationId && checklist.closeRun.periodId === periodId &&
    checklist.closeRun.period.id === periodId && checklist.closeRun.period.organizationId === organizationId &&
    checklist.evidenceItems.every(row => sameScope(row, organizationId, periodId, runId) && row.checklistItemId === checklist.id)
}
function validOriginal(finding: Finding, organizationId: string): finding is Finding & { checklistItem: Checklist } {
  return finding.organizationId === organizationId && finding.period.id === finding.periodId && finding.period.organizationId === organizationId &&
    finding.closeRun.id === finding.closeRunId && finding.closeRun.organizationId === organizationId && finding.closeRun.periodId === finding.periodId &&
    finding.closeRun.period.organizationId === organizationId && finding.closeRun.period.id === finding.periodId && !!finding.checklistItem &&
    finding.checklistItemId === finding.checklistItem.id && finding.domain === finding.checklistItem.domain &&
    finding.sourceService === finding.checklistItem.sourceService && validChecklist(finding.checklistItem, organizationId, finding.periodId, finding.closeRunId)
}
function missing(finding: Finding & { checklistItem: Checklist }) {
  return finding.checklistItem.status === "UNAVAILABLE" || finding.checklistItem.evidenceCount === 0 || finding.checklistItem.evidenceItems.some(item => !item.available)
}
function matchingCollector(original: Checklist, replacement: Checklist) {
  return original.key === replacement.key && original.domain === replacement.domain && original.sourceService === replacement.sourceService
}
function validReceipt(checklist: Checklist) {
  const receipt = object(checklist.metadata).collectionReceipt
  return isCloseEvidenceCollectionEligible(checklist, checklist.evidenceItems) && verifyCloseEvidenceCollectionReceipt(checklist, checklist.evidenceItems, receipt) ? receipt : null
}
function isVoided(run: Checklist["closeRun"]) { return !!run.voidedAt || run.status === CloseRunStatus.VOIDED }
function isStale(run: Checklist["closeRun"]) { return object(object(run.metadata).staleState).status === "EVIDENCE_STALE" }
function completed(run: Checklist["closeRun"]) {
  return !!run.completedAt && run.completedAt.getTime() >= run.createdAt.getTime() && ![CloseRunStatus.DRAFT, CloseRunStatus.RUNNING].includes(run.status as "DRAFT" | "RUNNING")
}
function makeBinding(original: Finding & { checklistItem: Checklist }, replacement: Checklist, receiptHash: string): CloseEvidenceReplacementBinding {
  return {
    kind: "CLOSE_EVIDENCE_REPLACEMENT", version: 1, organizationId: original.organizationId, periodId: original.periodId,
    findingId: original.id, originalRunId: original.closeRunId, originalChecklistId: original.checklistItem.id,
    originalFindingHash: findingHash(original), originalChecklistHash: checklistHash(original.checklistItem),
    originalEvidence: original.checklistItem.evidenceItems.filter(item => !item.available).map(item => ({ id: item.id, hash: evidenceHash(item) })).sort((a, b) => a.id.localeCompare(b.id)),
    replacementRunId: replacement.closeRunId, replacementChecklistId: replacement.id, replacementReceiptHash: receiptHash,
  }
}
const originalWhere = (organizationId: string, findingId: string) => ({ id: findingId, organizationId, period: { organizationId }, closeRun: { organizationId, period: { organizationId } } })
const unavailable = (reason: CloseEvidenceReplacementUnavailableReason): CloseEvidenceReplacementPreview => ({ status: "UNAVAILABLE", reason })

/** Preview uses RepeatableRead; acceptance uses ReadCommitted and locks before authoritative rereads. */
export async function getCloseEvidenceReplacementInTx(
  tx: Prisma.TransactionClient, organizationId: string, findingId: string, options: { lock?: boolean } = {},
): Promise<CloseEvidenceReplacementPreview> {
  let original = await tx.closeAssuranceFinding.findFirst({ where: originalWhere(organizationId, findingId), include: findingInclude })
  if (!original) return unavailable("ORIGINAL_NOT_FOUND")
  if (!validOriginal(original, organizationId)) return unavailable("ORIGINAL_SCOPE_INVALID")
  if (options.lock) await lockCloseAssessmentOrderInTx(tx, organizationId, original.periodId)
  let order = await readCloseAssessmentOrderInTx(tx, organizationId, original.periodId)
  if (order.ambiguous) return unavailable("CURRENT_ASSESSMENT_AMBIGUOUS")
  if (!order.latest || order.latest.createdAt.getTime() <= original.closeRun.createdAt.getTime()) return unavailable("NEW_ASSESSMENT_REQUIRED")
  if (options.lock) {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "close_runs" WHERE "organizationId" = ${organizationId} AND "id" = ${order.latest.id} FOR NO KEY UPDATE`)
    if (locked.length !== 1) return unavailable("NEW_ASSESSMENT_REQUIRED")
    const initialPeriodId = original.periodId
    original = await tx.closeAssuranceFinding.findFirst({ where: originalWhere(organizationId, findingId), include: findingInclude })
    if (!original) return unavailable("ORIGINAL_NOT_FOUND")
    if (!validOriginal(original, organizationId) || original.periodId !== initialPeriodId) return unavailable("ORIGINAL_SCOPE_INVALID")
    order = await readCloseAssessmentOrderInTx(tx, organizationId, original.periodId)
    if (order.ambiguous) return unavailable("CURRENT_ASSESSMENT_AMBIGUOUS")
    if (!order.latest || order.latest.id !== locked[0].id || order.latest.createdAt.getTime() <= original.closeRun.createdAt.getTime()) return unavailable("NEW_ASSESSMENT_REQUIRED")
  }
  if (!missing(original)) return unavailable("ORIGINAL_NOT_MISSING")
  const replacement = await tx.closeChecklistItem.findFirst({
    where: { organizationId, periodId: original.periodId, closeRunId: order.latest.id, key: original.checklistItem.key }, include: checklistInclude,
  })
  if (!replacement || !validChecklist(replacement, organizationId, original.periodId, order.latest.id)) return unavailable("COLLECTOR_NOT_FOUND")
  if (isVoided(replacement.closeRun)) return unavailable("ASSESSMENT_VOIDED")
  if (!completed(replacement.closeRun)) return unavailable("ASSESSMENT_INCOMPLETE")
  if (isStale(replacement.closeRun)) return unavailable("ASSESSMENT_STALE")
  const receipt = matchingCollector(original.checklistItem, replacement) && validReceipt(replacement)
  if (!receipt) return unavailable("COLLECTION_UNVERIFIED")
  const binding = makeBinding(original, replacement, receipt.hash)
  return { status: "AVAILABLE", reason: "VERIFIED_COLLECTION", binding, selection: closeEvidenceReplacementSelection(binding),
    checklistKey: replacement.key, domain: replacement.domain, controlStatus: replacement.status as "PASSED" | "WARNING" | "FAILED",
    observedAt: replacement.closeRun.completedAt!.toISOString(), recoveredEvidenceCount: binding.originalEvidence.length }
}

function commentContext(comment: AccountantComment, binding: CloseEvidenceReplacementBinding) {
  return sameScope(comment, binding.organizationId, binding.periodId, binding.originalRunId) && comment.findingId === binding.findingId &&
    text(comment.authorId) && text(comment.correlationId)
}
function sameTime(value: unknown, date: Date | null) {
  return text(value) && !!date && Number.isFinite(new Date(value).getTime()) && new Date(value).getTime() === date.getTime()
}
function validAcceptance(acceptance: AccountantComment, original: Finding, binding: CloseEvidenceReplacementBinding) {
  const metadata = object(acceptance.metadata)
  return commentContext(acceptance, binding) && acceptance.visibility === MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY &&
    metadata.acceptanceType === MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE && metadata.decision === "ACCEPTED" && metadata.findingStatus === "RESOLVED" &&
    metadata.acceptedById === acceptance.authorId && text(metadata.respondedById) && metadata.respondedById !== acceptance.authorId &&
    metadata.findingId === binding.findingId && metadata.periodId === binding.periodId && metadata.closeRunId === binding.originalRunId &&
    metadata.correlationId === acceptance.correlationId && text(metadata.requestId) && text(metadata.responseId) &&
    original.status === "RESOLVED" && original.resolvedById === acceptance.authorId && original.ownerId === metadata.respondedById &&
    original.correlationId === acceptance.correlationId && sameTime(metadata.resolvedAt, original.resolvedAt) &&
    !!original.resolvedAt && original.resolvedAt.getTime() <= acceptance.createdAt.getTime() && acceptance.body.trim().length >= 10
}
function validChain(request: AccountantComment, response: AccountantComment, acceptance: AccountantComment, binding: CloseEvidenceReplacementBinding) {
  const req = object(request.metadata), res = object(response.metadata), accepted = object(acceptance.metadata)
  return commentContext(request, binding) && commentContext(response, binding) &&
    request.visibility === MISSING_CLOSE_EVIDENCE_VISIBILITY && req.requestType === MISSING_CLOSE_EVIDENCE_REQUEST_TYPE &&
    req.requestedById === request.authorId && text(req.requestedFromId) && req.correlationId === request.correlationId &&
    text(req.dueAt) && Number.isFinite(new Date(req.dueAt).getTime()) &&
    response.visibility === MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY && res.responseType === MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE &&
    res.requestId === request.id && res.requestCorrelationId === request.correlationId && res.requestedById === request.authorId &&
    res.requestedFromId === req.requestedFromId && res.respondedById === response.authorId && response.authorId === req.requestedFromId &&
    res.correlationId === response.correlationId && accepted.requestId === request.id && accepted.responseId === response.id &&
    accepted.requestCorrelationId === request.correlationId && accepted.responseCorrelationId === response.correlationId &&
    accepted.respondedById === response.authorId && acceptance.authorId !== response.authorId &&
    request.createdAt.getTime() <= response.createdAt.getTime() && response.createdAt.getTime() <= acceptance.createdAt.getTime()
}

/** An accepted historical recovery survives ordinary later assessments/source changes. */
export async function getVerifiedCloseEvidenceReplacementsInTx(tx: Prisma.TransactionClient, organizationId: string): Promise<{
  evidenceIds: string[]; sourceBindings: Prisma.JsonObject[]
}> {
  const acceptances = await tx.accountantComment.findMany({
    where: { organizationId, visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY,
      metadata: { path: ["acceptanceType"], equals: MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE } }, orderBy: { id: "asc" },
  })
  const evidenceIds = new Set<string>(), sourceBindings: Prisma.JsonObject[] = []
  for (const acceptance of acceptances) {
    const metadata = object(acceptance.metadata), binding = parseCloseEvidenceReplacementBinding(metadata.replacementBinding)
    if (!binding || binding.organizationId !== organizationId) continue
    const original = await tx.closeAssuranceFinding.findFirst({ where: originalWhere(organizationId, binding.findingId), include: findingInclude })
    if (!original || !validOriginal(original, organizationId) || !missing(original) || !validAcceptance(acceptance, original, binding)) continue
    const replacement = await tx.closeChecklistItem.findFirst({ where: { id: binding.replacementChecklistId, organizationId }, include: checklistInclude })
    if (!replacement || !validChecklist(replacement, organizationId, binding.periodId, binding.replacementRunId) ||
      !matchingCollector(original.checklistItem, replacement) || isVoided(replacement.closeRun) || !completed(replacement.closeRun) ||
      replacement.closeRun.createdAt.getTime() <= original.closeRun.createdAt.getTime() || replacement.closeRun.completedAt!.getTime() > acceptance.createdAt.getTime()) continue
    const receipt = validReceipt(replacement)
    if (!receipt || hash(makeBinding(original, replacement, receipt.hash)) !== hash(binding)) continue
    const [request, response] = await Promise.all([
      tx.accountantComment.findFirst({ where: { id: metadata.requestId as string, organizationId } }),
      tx.accountantComment.findFirst({ where: { id: metadata.responseId as string, organizationId } }),
    ])
    if (!request || !response || !validChain(request, response, acceptance, binding)) continue
    binding.originalEvidence.forEach(item => evidenceIds.add(item.id))
    sourceBindings.push({ acceptanceId: acceptance.id, acceptanceHash: hash({ id: acceptance.id, authorId: acceptance.authorId, createdAt: acceptance.createdAt,
      metadata: acceptance.metadata }), bindingHash: closeEvidenceReplacementSelection(binding).bindingHash, replacementChecklistId: binding.replacementChecklistId,
      replacementReceiptHash: binding.replacementReceiptHash, originalEvidence: binding.originalEvidence })
  }
  return { evidenceIds: [...evidenceIds].sort(), sourceBindings }
}
