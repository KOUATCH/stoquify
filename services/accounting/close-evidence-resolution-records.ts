import "server-only"

import { createHash } from "node:crypto"
import { z } from "zod"
import type { AccountantComment, Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { proposeCloseHistorySchema, approveCloseHistorySchema, closeHistoryDecisionSchema } from "./close-evidence-resolution.schemas"
export { proposeCloseHistorySchema, approveCloseHistorySchema, closeHistoryDecisionSchema } from "./close-evidence-resolution.schemas"

export const CLOSE_HISTORY_PROPOSED = "CLOSE_EVIDENCE_HISTORY_PROPOSED"
export const CLOSE_HISTORY_APPROVED = "CLOSE_EVIDENCE_HISTORY_APPROVED"
export const CLOSE_HISTORY_CLOSED = "CLOSE_EVIDENCE_HISTORY_CLOSED"
export const closeHistoryVisibilities = ["CLIENT_ACTION_REQUIRED", "CLIENT_RESPONSE_SUBMITTED", "ACCOUNTANT_RESPONSE_ACCEPTED"]
const id = z.string().trim().min(1).max(200), hash = z.string().regex(/^[a-f0-9]{64}$/)
export const closeHistoryProposalSchema = z.object({
  version: z.literal(1), command: proposeCloseHistorySchema, findingId: id, closeRunId: id,
  previousApprovalId: id.nullable(), sourceHashes: z.array(z.object({ id, hash }).strict()).min(2).max(100),
}).strict()
export const closeHistoryApprovalSchema = z.object({
  version: z.literal(1), proposalId: id, proposerId: id, command: approveCloseHistorySchema,
  proposal: closeHistoryProposalSchema,
}).strict()
export const closeHistoryClosedSchema = z.object({ version: z.literal(1), proposalId: id, proposerId: id, proposalHash: hash, command: closeHistoryDecisionSchema }).strict()

/** A proposal has at most one terminal outcome. Query by proposal, independently
 * of the bounded history page, so a later decision cannot disappear off-page. */
export async function readCloseHistoryOutcome(tx: Pick<Prisma.TransactionClient, "ledgerAuditEvent">, organizationId: string, findingId: string,
  proposal: { id: string; actorId: string | null; createdAt: Date; metadata: Prisma.JsonValue }) {
  const rows = await tx.ledgerAuditEvent.findMany({ where: { organizationId, resourceType: "CloseAssuranceFinding", resourceId: findingId,
    action: { in: [CLOSE_HISTORY_APPROVED, CLOSE_HISTORY_CLOSED] }, metadata: { path: ["proposalId"], equals: proposal.id } }, take: 2 })
  const invalid = () => new BusinessRuleError("Retained proposal outcome needs investigation.", "REVIEW_REQUIRED")
  if (!rows.length) return null
  if (rows.length !== 1 || !proposal.actorId) throw invalid()
  const row = rows[0]
  if (!row.actorId || row.organizationId !== organizationId || row.resourceId !== findingId || row.resourceType !== "CloseAssuranceFinding" || row.createdAt <= proposal.createdAt) throw invalid()
  if (row.action === CLOSE_HISTORY_APPROVED) {
    const parsed = closeHistoryApprovalSchema.safeParse(row.metadata)
    if (!parsed.success || parsed.data.proposalId !== proposal.id || parsed.data.command.proposalId !== proposal.id || parsed.data.proposerId !== proposal.actorId || row.actorId === proposal.actorId || closeHistoryValueHash(parsed.data.proposal) !== closeHistoryValueHash(proposal.metadata)) throw invalid()
    return { id: row.id, state: "APPROVED" as const, reason: parsed.data.command.notes, createdAt: row.createdAt.toISOString() }
  }
  const parsed = closeHistoryClosedSchema.safeParse(row.metadata)
  if (row.action !== CLOSE_HISTORY_CLOSED || !parsed.success || parsed.data.proposalId !== proposal.id || parsed.data.command.proposalId !== proposal.id || parsed.data.proposerId !== proposal.actorId || parsed.data.proposalHash !== closeHistoryValueHash(proposal.metadata) ||
    (parsed.data.command.decision === "WITHDRAWN" ? row.actorId !== proposal.actorId : row.actorId === proposal.actorId)) throw invalid()
  return { id: row.id, state: parsed.data.command.decision, reason: parsed.data.command.reason, createdAt: row.createdAt.toISOString() }
}
export function closeHistoryValueHash(value: unknown): string {
  const canonical = (item: unknown): unknown => item instanceof Date ? item.toISOString() : Array.isArray(item) ? item.map(canonical) : item && typeof item === "object" ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, canonical(child)])) : item
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")
}
export function closeHistoryRecordHash(record: AccountantComment) {
  return closeHistoryValueHash(record)
}

/** Resolve only an authenticated, retained approval. Normal evidence stays on
 * its existing path when no resolution exists. New records remain visible;
 * an approval never silently excludes evidence recorded after its snapshot.
 */
export async function readResolvedCloseEvidence(tx: Pick<Prisma.TransactionClient, "ledgerAuditEvent" | "accountantComment">, organizationId: string, findingId: string) {
  const decisions = await tx.ledgerAuditEvent.findMany({ where: { organizationId, action: CLOSE_HISTORY_APPROVED, resourceType: "CloseAssuranceFinding", resourceId: findingId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 })
  if (!decisions.length) return null
  const invalid = () => new BusinessRuleError("Retained evidence resolution needs investigation.", "REVIEW_REQUIRED")
  const decision = decisions[0], parsed = closeHistoryApprovalSchema.safeParse(decision.metadata)
  if (!parsed.success || !decision.actorId || decision.actorId === parsed.data.proposerId || decision.organizationId !== organizationId || decision.resourceId !== findingId || decision.action !== CLOSE_HISTORY_APPROVED) throw invalid()
  const data = parsed.data, proposal = data.proposal, selected = [proposal.command.selectedRequestId, proposal.command.selectedResponseId, proposal.command.selectedAcceptanceId].filter((value): value is string => !!value)
  if (proposal.findingId !== findingId || data.command.proposalId !== data.proposalId) throw invalid()
  const retainedProposal = await tx.ledgerAuditEvent.findFirst({ where: { id: data.proposalId, organizationId, action: CLOSE_HISTORY_PROPOSED, resourceType: "CloseAssuranceFinding", resourceId: findingId } })
  if (!retainedProposal || retainedProposal.actorId !== data.proposerId || closeHistoryValueHash(retainedProposal.metadata) !== closeHistoryValueHash(proposal) || retainedProposal.createdAt > decision.createdAt) throw invalid()
  const outcome = await readCloseHistoryOutcome(tx, organizationId, findingId, retainedProposal)
  if (outcome?.state !== "APPROVED" || outcome.id !== decision.id) throw invalid()
  const rows = await tx.accountantComment.findMany({ where: { organizationId, findingId, visibility: { in: closeHistoryVisibilities } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 101 })
  const excluded = new Set(proposal.command.exclusions.map(row => row.id)), bound = new Set(proposal.sourceHashes.map(row => row.id))
  if (rows.length > 100 || excluded.size !== proposal.command.exclusions.length || new Set(selected).size !== selected.length || selected.some(id => excluded.has(id)) ||
    bound.size !== proposal.sourceHashes.length || bound.size !== selected.length + excluded.size || [...selected, ...excluded].some(id => !bound.has(id))) throw invalid()
  for (const source of proposal.sourceHashes) {
    const row = rows.find(row => row.id === source.id)
    if (!row || closeHistoryRecordHash(row) !== source.hash) throw invalid()
  }
  return { approvalId: decision.id, proposalId: data.proposalId, excludedIds: [...excluded], records: rows.filter(row => !excluded.has(row.id)) }
}
