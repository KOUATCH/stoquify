import "server-only"
import { AccountingSourceType, Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { statementResponseHistorySchema, statementResponseListSchema, statementResponseReviewSchema, type StatementResponseReview } from "./customer-statement-response.schemas"

export type StatementResponseScope = { organizationId: string; actorId: string; sessionId?: string }
const scopeSchema = z.object({ organizationId: z.string().min(1), actorId: z.string().min(1), sessionId: z.string().min(1).optional() }).strict()
const stateSelect = { id: true, organizationId: true, actionId: true, version: true, status: true, effectiveAt: true, actorType: true, actorId: true, reason: true, previousStateHash: true, stateHash: true, evidenceHash: true, businessEventId: true } satisfies Prisma.CustomerStatementRecipientActionStateSelect
const responseSelect = {
  id: true, organizationId: true, statementSnapshotId: true, tokenId: true, actionType: true,
  customerReceivableDocumentId: true, requestedAmount: true, promisedFor: true, recipientNote: true, noteHash: true,
  idempotencyKey: true, correlationId: true, payloadHash: true, createdAt: true,
  statementSnapshot: { select: { statementNumber: true, version: true, contentHash: true, currency: true } },
  customerReceivableDocument: { select: { documentNumber: true } },
  states: { select: stateSelect, orderBy: { version: "desc" }, take: 2 },
} satisfies Prisma.CustomerStatementRecipientActionSelect
type ResponseRow = Prisma.CustomerStatementRecipientActionGetPayload<{ select: typeof responseSelect }>
type StateRow = Prisma.CustomerStatementRecipientActionStateGetPayload<{ select: typeof stateSelect }>

async function authority(tx: Prisma.TransactionClient, scope: StatementResponseScope, write = false) {
  const now = new Date()
  const actor = await tx.user.findFirst({
    where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } },
    select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true,
      roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } },
  })
  const permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  const required = ["customers.read", "accounting.exports.create", ...(write ? ["customers.update"] : [])]
  if (!actor || !isUsableAccount(actor, now) || required.some(permission => !hasRbacPermission(permissions, permission))) throw new ForbiddenError()
  if (write) {
    const session = scope.sessionId ? await tx.session.findFirst({
      where: { id: scope.sessionId, userId: scope.actorId, expiresAt: { gt: now }, assuranceOrganizationId: scope.organizationId,
        assuranceVerifiedAt: { gte: new Date(now.getTime() - 300_000), lte: now }, assuranceLevel: { gte: 1 }, assuranceMethod: { not: null } },
      select: { id: true },
    }) : null
    if (!session) throw new ForbiddenError("Fresh authentication is required to review this response")
  }
  return permissions
}

function stateDigest(row: ResponseRow, state: StateRow) {
  const common = {
    organizationId: row.organizationId, statementSnapshotId: row.statementSnapshotId,
    actionType: row.actionType, payloadHash: row.payloadHash, version: state.version, status: state.status,
    effectiveAt: state.effectiveAt.toISOString(), actorType: state.actorType,
    previousStateHash: state.previousStateHash, evidenceHash: state.evidenceHash,
  }
  if (state.version === 1 && state.actorType === "STATEMENT_RECIPIENT" && state.status === "OPEN" && state.previousStateHash === null) return hashBusinessPayload(common)
  if (state.version > 1 && state.actorType === "ORGANIZATION_OPERATOR" && state.actorId && state.reason && state.previousStateHash) {
    return hashBusinessPayload({ ...common, actorId: state.actorId, reasonHash: hashBusinessPayload(state.reason) })
  }
  throw new ConflictError("Recipient response review evidence is incomplete")
}

function verify(row: ResponseRow) {
  if (!row.requestedAmount?.isFinite() || row.requestedAmount.lte(0) || hashBusinessPayload(row.recipientNote) !== row.noteHash ||
    hashBusinessPayload({ organizationId: row.organizationId, statementSnapshotId: row.statementSnapshotId,
      statementContentHash: row.statementSnapshot.contentHash, tokenId: row.tokenId, actionType: row.actionType,
      customerReceivableDocumentId: row.customerReceivableDocumentId, requestedAmount: row.requestedAmount.toFixed(2),
      promisedFor: row.promisedFor?.toISOString() ?? null, note: row.recipientNote,
      idempotencyKey: row.idempotencyKey, correlationId: row.correlationId }) !== row.payloadHash) throw new ConflictError("Recipient response source evidence is incomplete")
  const current = row.states[0], previous = row.states[1]
  if (!current || current.organizationId !== row.organizationId || current.actionId !== row.id || stateDigest(row, current) !== current.stateHash ||
    (current.version > 1 && (!previous || previous.version + 1 !== current.version || previous.stateHash !== current.previousStateHash || stateDigest(row, previous) !== previous.stateHash))) {
    throw new ConflictError("Recipient response review history is incomplete")
  }
  return current
}
function stateView(state: StateRow) {
  return { id: state.id, version: state.version, status: state.status, stateHash: state.stateHash, recordedAt: state.effectiveAt.toISOString(), actorId: state.actorId, reason: state.reason }
}
function view(row: ResponseRow) {
  const current = verify(row)
  return { actionId: row.id, statementId: row.statementSnapshotId, statementNumber: row.statementSnapshot.statementNumber,
    statementVersion: row.statementSnapshot.version, currency: row.statementSnapshot.currency, actionType: row.actionType,
    amount: row.requestedAmount!.toFixed(2), documentNumber: row.customerReceivableDocument?.documentNumber ?? null,
    promisedFor: row.promisedFor?.toISOString() ?? null, note: row.recipientNote, requestReference: row.idempotencyKey,
    submittedAt: row.createdAt.toISOString(), current: stateView(current) }
}
const responseWhere = (scope: StatementResponseScope, customerId: string) => ({
  organizationId: scope.organizationId, statementSnapshot: { organizationId: scope.organizationId, customerId },
})
async function findResponse(tx: Prisma.TransactionClient, scope: StatementResponseScope, customerId: string, actionId: string) {
  const row = await tx.customerStatementRecipientAction.findFirst({ where: { ...responseWhere(scope, customerId), id: actionId }, select: responseSelect })
  if (!row) throw new NotFoundError("Customer response not found")
  return row
}

export async function listCustomerStatementResponses(raw: unknown, rawScope: StatementResponseScope, client: typeof db = db) {
  const command = statementResponseListSchema.parse(raw), scope = scopeSchema.parse(rawScope)
  return client.$transaction(async tx => {
    const permissions = await authority(tx, scope)
    const customer = await tx.customer.findFirst({ where: { id: command.customerId, organizationId: scope.organizationId }, select: { id: true } })
    if (!customer) throw new NotFoundError("Customer not found")
    const where = responseWhere(scope, command.customerId)
    const anchor = command.cursor ? await tx.customerStatementRecipientAction.findFirst({ where: { ...where, id: command.cursor }, select: { id: true, createdAt: true } }) : null
    if (command.cursor && !anchor) throw new NotFoundError("Response cursor not found")
    const rows = await tx.customerStatementRecipientAction.findMany({
      where: { ...where, AND: [
        ...(anchor ? [{ OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }] }] : []),
        ...(command.reference ? [{ OR: [{ id: command.reference }, { idempotencyKey: command.reference }] }] : []),
      ] }, select: responseSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: command.limit + 1,
    })
    return { customerId: command.customerId, checkedAt: new Date().toISOString(), canReviewPermission: hasRbacPermission(permissions, "customers.update"),
      responses: rows.slice(0, command.limit).map(view), nextCursor: rows.length > command.limit ? rows[command.limit - 1].id : null }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function getCustomerStatementResponseHistory(raw: unknown, rawScope: StatementResponseScope, client: typeof db = db) {
  const command = statementResponseHistorySchema.parse(raw), scope = scopeSchema.parse(rawScope)
  return client.$transaction(async tx => {
    await authority(tx, scope)
    const row = await findResponse(tx, scope, command.customerId, command.actionId)
    const response = view(row)
    const where = { organizationId: scope.organizationId, actionId: row.id }
    const anchor = command.beforeVersion ? await tx.customerStatementRecipientActionState.findFirst({ where: { ...where, version: command.beforeVersion }, select: stateSelect }) : null
    if (command.beforeVersion && !anchor) throw new NotFoundError("Review history cursor not found")
    const states = await tx.customerStatementRecipientActionState.findMany({ where: { ...where, ...(command.beforeVersion ? { version: { lt: command.beforeVersion } } : {}) }, select: stateSelect, orderBy: { version: "desc" }, take: command.limit + 1 })
    const chain = anchor ? [anchor, ...states] : states
    for (const [index, state] of chain.entries()) {
      const previous = chain[index + 1]
      if (state.organizationId !== row.organizationId || state.actionId !== row.id || stateDigest(row, state) !== state.stateHash ||
        (previous && (state.version !== previous.version + 1 || state.previousStateHash !== previous.stateHash))) throw new ConflictError("Review history integrity failed")
    }
    if (!chain.length || (!anchor && chain[0].stateHash !== response.current.stateHash) || (states.length <= command.limit && chain[chain.length - 1].version !== 1)) throw new ConflictError("Review history is incomplete")
    return { response, checkedAt: new Date().toISOString(), states: states.slice(0, command.limit).map(stateView), nextBeforeVersion: states.length > command.limit ? states[command.limit - 1].version : null }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export type CustomerStatementResponse = ReturnType<typeof view>
export type CustomerStatementResponses = Awaited<ReturnType<typeof listCustomerStatementResponses>>
export type CustomerStatementResponseHistory = Awaited<ReturnType<typeof getCustomerStatementResponseHistory>>
export type StatementResponseReviewReceipt = { requestId: string; actionId: string; stateId: string; status: StatementResponseReview["outcome"]; version: number; stateHash: string; reviewedAt: string; eventId: string; replayed: boolean }
const eventType = "customer.statement.response.reviewed"

export async function reviewCustomerStatementResponse(raw: unknown, rawScope: StatementResponseScope, client: typeof db = db): Promise<StatementResponseReviewReceipt> {
  const command = statementResponseReviewSchema.parse(raw), scope = scopeSchema.parse(rawScope)
  const payload = { organizationId: scope.organizationId, actorId: scope.actorId, ...command }, payloadHash = hashBusinessPayload(payload)
  const key = "statement-response-review:" + command.requestId
  const work = () => client.$transaction(async tx => {
    const moduleAccess = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "accounting", surfaceType: "action", surface: "actions/accounting/customer-statement-response.actions.ts:review", accessIntent: "write", mode: "enforce" })
    if (!moduleAccess.allowed) throw new ForbiddenError("Current accounting access does not permit response review")
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
    await tx.$queryRaw`SELECT r.id FROM roles r INNER JOIN "_UserRoles" membership ON membership."A" = r.id WHERE membership."B" = ${scope.actorId} AND r."organizationId" = ${scope.organizationId} ORDER BY r.id FOR SHARE OF r, membership`
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${scope.sessionId ?? ""} AND "userId" = ${scope.actorId} FOR SHARE`
    await authority(tx, scope, true)
    await tx.$queryRaw`SELECT id FROM customer_statement_recipient_actions WHERE id = ${command.actionId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
    const row = await findResponse(tx, scope, command.customerId, command.actionId), current = verify(row)
    const existing = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: key } } })
    if (existing) {
      if (existing.payloadHash !== payloadHash || existing.eventType !== eventType || existing.status !== "APPLIED") throw new IdempotencyConflictError()
      const state = await tx.customerStatementRecipientActionState.findFirst({ where: { organizationId: scope.organizationId, actionId: row.id, businessEventId: existing.id }, select: stateSelect })
      if (!state || state.status !== command.outcome || stateDigest(row, state) !== state.stateHash) throw new ConflictError("Review receipt evidence is incomplete")
      return { requestId: command.requestId, actionId: row.id, stateId: state.id, status: command.outcome, version: state.version, stateHash: state.stateHash, reviewedAt: state.effectiveAt.toISOString(), eventId: existing.id, replayed: true }
    }
    if (current.stateHash !== command.expectedStateHash) throw new ConflictError("The response changed. Refresh and review its current state before making another decision.")
    if (current.status === command.outcome) throw new BusinessRuleError("The response already has this review status")
    if (!["OPEN", "ACKNOWLEDGED"].includes(current.status) && command.outcome !== "ACKNOWLEDGED") throw new BusinessRuleError("Reopen the review before recording a different outcome")
    const now = new Date(), evidenceHash = hashBusinessPayload({ responsePayloadHash: row.payloadHash, reviewPayloadHash: payloadHash, previousStateHash: current.stateHash })
    const stateData = { organizationId: scope.organizationId, actionId: row.id, version: current.version + 1, status: command.outcome,
      effectiveAt: now, actorType: "ORGANIZATION_OPERATOR", actorId: scope.actorId, reason: command.reason,
      previousStateHash: current.stateHash, evidenceHash }
    const stateHash = stateDigest(row, { ...stateData, id: "pending", stateHash: "", businessEventId: null })
    const event = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, eventType, eventSource: "INTERNAL", schemaVersion: 1,
      idempotencyKey: key, payload, occurredAt: now, sourceType: AccountingSourceType.CUSTOMER_STATEMENT_RECIPIENT_ACTION, sourceId: row.id,
      metadata: { statementSnapshotId: row.statementSnapshotId, previousStateHash: current.stateHash, stateHash } })
    const state = await tx.customerStatementRecipientActionState.create({ data: { ...stateData, stateHash, businessEventId: event.event.id } })
    await markBusinessEventAppliedInTx(tx, scope.organizationId, event.event.id)
    await tx.auditLog.create({ data: { organizationId: scope.organizationId, userId: scope.actorId, entityType: "CustomerStatementRecipientAction", entityId: row.id,
      action: "CUSTOMER_STATEMENT_RESPONSE_REVIEWED", changes: { before: current.status, after: command.outcome, version: state.version, reasonHash: hashBusinessPayload(command.reason), previousStateHash: current.stateHash, stateHash, eventId: event.event.id, requestId: command.requestId } } })
    return { requestId: command.requestId, actionId: row.id, stateId: state.id, status: command.outcome, version: state.version, stateHash, reviewedAt: now.toISOString(), eventId: event.event.id, replayed: false }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  for (let attempt = 0; ; attempt++) {
    try { return await work() } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null
      if (attempt < 2 && (code === "P2034" || code === "P2002")) continue
      throw error
    }
  }
}
