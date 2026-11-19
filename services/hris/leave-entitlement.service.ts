import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { resolveHrisPeopleAccessScope } from "./org.service"
import { attendanceHash, attendanceMetadata, lockOperationalEmployeeInTx } from "./attendance-correction"
import { assertHrisLeaveDebitInTx, lockHrisLeaveLedgerInTx } from "./leave-ledger-order"
import { assertLeaveEligibility, readLeaveRules, workDate } from "./leave-policy"
import { assertEmployeeLeaveEligibility } from "./leave-eligibility.service"

type Client = typeof db | Prisma.TransactionClient
type Tx = Prisma.TransactionClient
const actorSchema = z.object({ organizationId: z.string().min(1), actorId: z.string().min(1), actorPermissions: z.array(z.string()).default([]) })
type Actor = z.infer<typeof actorSchema>
const tx = <T>(client: Client, run: (client: Tx) => Promise<T>): Promise<T> => "$transaction" in client
  ? client.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }) : run(client)
const key = (employeeId: string, policyId: string) => `${employeeId}:${policyId}`
const manager = (actor: Actor) => hasAnyRbacPermission(actor.actorPermissions, ["hris.people.manage"])
async function access(client: Client, actor: Actor, employeeId: string, write = false) {
  if (manager(actor)) { await resolveHrisPeopleAccessScope({ ...actor, employeeId, limit: 1 }, client); return }
  if (write || !hasAnyRbacPermission(actor.actorPermissions, ["hris.self_service.read", "hris.self_service.request"])) throw new ForbiddenError("Leave permission is required.")
  const own = await client.payrollEmployee.findFirst({ where: { organizationId: actor.organizationId, id: employeeId, userId: actor.actorId, deletedAt: null }, select: { id: true } })
  if (!own) throw new ForbiddenError("Only your own leave record is available.")
}
async function audit(client: Tx, actor: Actor, entityId: string, action: string, changes: Prisma.InputJsonObject) {
  await client.auditLog.create({ data: { organizationId: actor.organizationId, userId: actor.actorId, entityType: action.startsWith("HRIS_LEAVE_CANCELLATION") ? "HrisTimeRequest" : "HrisLeaveBalanceEntry", entityId, action, changes } })
}
export async function assertLeavePolicyOpen(client: Tx, organizationId: string, employeeId: string, leavePolicyId: string) {
  const closed = await client.hrisLeaveBalanceEntry.findFirst({ where: { organizationId, employeeId, leavePolicyId, sourceType: "HRIS_LEAVE_SETTLEMENT" }, select: { id: true } })
  if (closed) throw new BusinessRuleError("HRIS_LEAVE_POLICY_SETTLED: This policy balance is closed. HR must use a reviewed linked adjustment in the current policy; do not rewrite the settled balance.")
}

export async function getHrisLeaveBalances(input: Actor & { employeeId: string }, client: Client = db) {
  const actor = actorSchema.parse(input)
  await access(client, actor, input.employeeId)
  const asOf = new Date()
  const [policies, movements] = await Promise.all([
    client.hrisLeavePolicy.findMany({ where: { organizationId: actor.organizationId, status: { in: ["ACTIVE", "RETIRED"] } }, orderBy: [{ code: "asc" }, { effectiveFrom: "asc" }] }),
    client.hrisLeaveBalanceEntry.findMany({ where: { organizationId: actor.organizationId, employeeId: input.employeeId }, orderBy: [{ effectiveAt: "asc" }, { id: "asc" }] }),
  ])
  return { asOf: asOf.toISOString(), policies: policies.flatMap(policy => {
    let rules
    try { rules = readLeaveRules(policy) } catch { return [] }
    if (!rules.employeeIds.includes(input.employeeId) || !policy.approvedById || !policy.approvalEvidenceHash) return []
    const entries = movements.filter(row => row.leavePolicyId === policy.id)
    const current = entries.filter(row => row.effectiveAt <= asOf), future = entries.filter(row => row.effectiveAt > asOf)
    const availableMinutes = current.reduce((sum, row) => sum + row.deltaMinutes, 0)
    return [{ leavePolicyId: policy.id, name: policy.name, code: policy.code, version: policy.version,
      effectiveFrom: workDate(policy.effectiveFrom), effectiveTo: policy.effectiveTo ? workDate(policy.effectiveTo) : null,
      availableMinutes, futureCredits: future.reduce((sum, row) => sum + Math.max(0, row.deltaMinutes), 0),
      futureDebits: future.reduce((sum, row) => sum - Math.min(0, row.deltaMinutes), 0),
      credits: current.reduce((sum, row) => sum + Math.max(0, row.deltaMinutes), 0),
      debits: current.reduce((sum, row) => sum - Math.min(0, row.deltaMinutes), 0),
      settled: entries.some(row => row.sourceType === "HRIS_LEAVE_SETTLEMENT"),
      retired: policy.status === "RETIRED",
      movements: entries.map(row => ({ id: row.id, effectiveAt: row.effectiveAt.toISOString(), deltaMinutes: row.deltaMinutes, entryType: row.entryType, sourceType: row.sourceType, sourceId: row.sourceId })),
    }]
  }), unresolvedPolicyCount: policies.filter(policy => { try { readLeaveRules(policy); return false } catch { return true } }).length }
}

const cancellationSchema = actorSchema.extend({ employeeId: z.string().min(1), requestId: z.string().min(1), reason: z.string().trim().min(8).max(1000), idempotencyKey: z.string().trim().min(8).max(100) })
export async function getManagedLeaveWorkspace(input: Actor & { employeeId: string; requestId?: string }, client: Client = db) {
  const actor = actorSchema.parse(input)
  await access(client, actor, input.employeeId, true)
  const [leave, requests, employee] = await Promise.all([
    getHrisLeaveBalances(input, client),
    client.hrisTimeRequest.findMany({ where: { organizationId: actor.organizationId, employeeId: input.employeeId, type: "LEAVE", ...(input.requestId ? {id:z.string().min(1).max(200).parse(input.requestId)} : {}) }, orderBy: { requestedAt: "desc" }, take: 100 }),
    client.payrollEmployee.findFirstOrThrow({ where: { id: input.employeeId, organizationId: actor.organizationId }, select: { displayName: true } }),
  ])
  return { ...leave, employeeId: input.employeeId, displayName: employee.displayName, requests: requests.map(row => ({ id: row.id, status: row.status, minutes: row.requestedMinutes,
    periodStart: workDate(row.periodStart), periodEnd: workDate(row.periodEnd), cancellationStatus: String(attendanceMetadata(attendanceMetadata(row.metadata).cancellation).status ?? ""),
    conversion: attendanceMetadata(row.metadata).conversion ?? null,
    canReviewCancellation: attendanceMetadata(attendanceMetadata(row.metadata).cancellation).requestedById !== actor.actorId,
  })) }
}

export async function requestLeaveCancellation(input: z.input<typeof cancellationSchema>, client: Client = db) {
  const parsed = cancellationSchema.parse(input)
  if (!manager(parsed) && !hasAnyRbacPermission(parsed.actorPermissions, ["hris.self_service.request"])) throw new ForbiddenError("Leave request permission is required.")
  return tx(client, async client => {
    await access(client, parsed, parsed.employeeId)
    await lockOperationalEmployeeInTx(client, parsed.organizationId, parsed.employeeId)
    const request = await client.hrisTimeRequest.findFirst({ where: { id: parsed.requestId, organizationId: parsed.organizationId, employeeId: parsed.employeeId, type: "LEAVE" } })
    if (!request) throw new NotFoundError("Leave request was not found.")
    const metadata = attendanceMetadata(request.metadata), previous = attendanceMetadata(metadata.cancellation)
    const hash = attendanceHash({ requestId: request.id, actorId: parsed.actorId, reason: parsed.reason, key: parsed.idempotencyKey })
    if (previous.key === parsed.idempotencyKey) {
      if (previous.hash !== hash) throw new ConflictError("IDEMPOTENCY_CONFLICT: Cancellation evidence changed.")
      return request
    }
    if (previous.status === "REQUESTED" || !["REQUESTED", "APPROVED"].includes(request.status)) throw new ConflictError("The leave request cannot accept another cancellation. Refresh its status.")
    const pending = request.status === "APPROVED"
    if (pending && request.leavePolicyId) await assertLeavePolicyOpen(client, parsed.organizationId, parsed.employeeId, request.leavePolicyId)
    const cancellation = { key: parsed.idempotencyKey, hash, requestedById: parsed.actorId, status: pending ? "REQUESTED" : "APPROVED", requestedAt: new Date().toISOString() }
    const updated = await client.hrisTimeRequest.update({ where: { id: request.id }, data: { status: pending ? "APPROVED" : "CANCELLED", metadata: { ...metadata, cancellation } as Prisma.InputJsonValue } })
    await audit(client, parsed, request.id, "HRIS_LEAVE_CANCELLATION_REQUESTED", { employeeId: parsed.employeeId, reasonHash: attendanceHash(parsed.reason), pendingReview: pending })
    return updated
  })
}

const cancellationDecisionSchema = actorSchema.extend({ employeeId: z.string().min(1), requestId: z.string().min(1), decision: z.enum(["APPROVE", "REJECT"]), evidenceHash: z.string().min(8).max(256), reason: z.string().trim().min(8).max(1000) })
export async function decideLeaveCancellation(input: z.input<typeof cancellationDecisionSchema>, client: Client = db) {
  const parsed = cancellationDecisionSchema.parse(input)
  return tx(client, async client => {
    await access(client, parsed, parsed.employeeId, true)
    await lockOperationalEmployeeInTx(client, parsed.organizationId, parsed.employeeId)
    const request = await client.hrisTimeRequest.findFirst({ where: { id: parsed.requestId, organizationId: parsed.organizationId, employeeId: parsed.employeeId, type: "LEAVE" } })
    if (!request || !request.leavePolicyId) throw new NotFoundError("Leave request was not found.")
    const metadata = attendanceMetadata(request.metadata), cancellation = attendanceMetadata(metadata.cancellation)
    if (cancellation.requestedById === parsed.actorId) throw new ForbiddenError("SOD_VIOLATION: Another HR reviewer must decide this cancellation.")
    const decisionHash = attendanceHash({ actorId: parsed.actorId, decision: parsed.decision, evidence: parsed.evidenceHash, reason: parsed.reason })
    if (cancellation.decisionHash === decisionHash) return request
    if (request.status !== "APPROVED" || cancellation.status !== "REQUESTED") throw new ConflictError("No pending cancellation was found.")
    if (parsed.decision === "APPROVE") {
      const sealed = await client.payrollRun.findFirst({ where: { organizationId: parsed.organizationId, deletedAt: null,
        payrollPeriod: { periodStart: { lte: request.periodEnd }, periodEnd: { gte: request.periodStart } },
        status: { in: ["CALCULATED", "REVIEWED", "APPROVED", "EMITTED", "POSTED", "PAID", "ARCHIVED"] } }, select: { id: true } })
      if (sealed) throw new BusinessRuleError("HRIS_TIME_CORRECTION_REQUIRES_PAYROLL_CORRECTION_RUN: Use the retained payroll adjustment workflow.")
      await lockHrisLeaveLedgerInTx(client, { ...parsed, leavePolicyId: request.leavePolicyId })
      await assertLeavePolicyOpen(client, parsed.organizationId, parsed.employeeId, request.leavePolicyId)
      const original = await client.hrisLeaveBalanceEntry.findFirst({ where: { organizationId: parsed.organizationId, employeeId: parsed.employeeId, leavePolicyId: request.leavePolicyId, sourceType: "HRIS_TIME_REQUEST", sourceId: request.id, entryType: "LEAVE_APPROVED" } })
      if (!original || original.deltaMinutes !== -request.requestedMinutes) throw new BusinessRuleError("HRIS_LEAVE_ORIGINAL_DEBIT_UNRESOLVED: Reconcile the retained debit before cancellation.")
      const reversal = await client.hrisLeaveBalanceEntry.create({ data: { organizationId: parsed.organizationId, employeeId: parsed.employeeId, leavePolicyId: request.leavePolicyId,
        deltaMinutes: -original.deltaMinutes, effectiveAt: original.effectiveAt, entryType: "LEAVE_CANCELLED", sourceType: "HRIS_LEAVE_REVERSAL", sourceId: original.id,
        sourceHash: attendanceHash({ originalId: original.id, originalHash: original.sourceHash, decisionHash }), idempotencyKey: `leave-reversal:${original.id}`, createdById: parsed.actorId } })
      await audit(client, parsed, reversal.id, "HRIS_LEAVE_DEBIT_REVERSED", { originalEntryId: original.id, requestId: request.id, decisionHash })
    }
    const updated = await client.hrisTimeRequest.update({ where: { id: request.id }, data: { status: parsed.decision === "APPROVE" ? "CANCELLED" : "APPROVED",
      metadata: { ...metadata, cancellation: { ...cancellation, status: parsed.decision === "APPROVE" ? "APPROVED" : "REJECTED", decisionHash, reviewedById: parsed.actorId } } as Prisma.InputJsonValue } })
    await audit(client, parsed, request.id, "HRIS_LEAVE_CANCELLATION_DECIDED", { decision: parsed.decision, decisionHash, requestId: request.id })
    return updated
  })
}

const executeSchema = actorSchema.extend({ employeeId: z.string().min(1), leavePolicyId: z.string().min(1), throughDate: z.coerce.date() })
export async function executeHrisLeaveEntitlements(input: z.input<typeof executeSchema>, client: Client = db) {
  const parsed = executeSchema.parse(input)
  if (workDate(parsed.throughDate) > workDate(new Date())) throw new BusinessRuleError("HRIS_LEAVE_FUTURE_EXECUTION: Scheduled credits may only execute through today.")
  return tx(client, async client => {
    await access(client, parsed, parsed.employeeId, true)
    await lockOperationalEmployeeInTx(client, parsed.organizationId, parsed.employeeId)
    const policy = await client.hrisLeavePolicy.findFirst({ where: { id: parsed.leavePolicyId, organizationId: parsed.organizationId } })
    if (!policy) throw new NotFoundError("Leave policy was not found.")
    const rules = readLeaveRules(policy)
    if (!rules.employeeIds.includes(parsed.employeeId) || !policy.approvedById || !policy.approvalEvidenceHash) throw new BusinessRuleError("HRIS_LEAVE_POLICY_EVIDENCE_UNRESOLVED")
    if (workDate(parsed.throughDate) < workDate(policy.effectiveFrom)) throw new BusinessRuleError("HRIS_LEAVE_NOT_DUE: Policy has not started.")
    await lockHrisLeaveLedgerInTx(client, parsed)
    const results: string[] = []
    const append = async (data: { deltaMinutes: number; effectiveAt: Date; entryType: string; sourceType: string; sourceId: string; sourceHash: string; idempotencyKey: string }, policyId = policy.id) => {
      const existing = await client.hrisLeaveBalanceEntry.findUnique({ where: { organizationId_sourceType_sourceId: { organizationId: parsed.organizationId, sourceType: data.sourceType, sourceId: data.sourceId } } })
      if (existing) {
        if (existing.leavePolicyId !== policyId || existing.sourceHash !== data.sourceHash) throw new ConflictError("HRIS_LEAVE_EVENT_CONFLICT: A scheduled event is already bound to different policy evidence.")
        results.push(existing.id); return existing
      }
      await assertLeavePolicyOpen(client, parsed.organizationId, parsed.employeeId, policyId)
      if (data.sourceType !== "HRIS_LEAVE_SETTLEMENT") await assertEmployeeLeaveEligibility(client, parsed.organizationId, parsed.employeeId, policyId, data.effectiveAt)
      await assertHrisLeaveDebitInTx(client, { organizationId: parsed.organizationId, employeeId: parsed.employeeId, leavePolicyId: policyId }, data.effectiveAt, data.deltaMinutes)
      const row = await client.hrisLeaveBalanceEntry.create({ data: { ...data, organizationId: parsed.organizationId, employeeId: parsed.employeeId, leavePolicyId: policyId, createdById: parsed.actorId } })
      await audit(client, parsed, row.id, "HRIS_LEAVE_SCHEDULED_ENTRY", { policyId, sourceType: data.sourceType, sourceId: data.sourceId })
      results.push(row.id); return row
    }
    const close = async (source: typeof policy) => {
      const sourceRules = readLeaveRules(source)
      if (!source.effectiveTo || sourceRules.expiry !== "AT_POLICY_END") throw new BusinessRuleError("HRIS_LEAVE_SETTLEMENT_UNDEFINED: Approve a bounded expiring source policy before carryover.")
      const effectiveAt = new Date(`${workDate(source.effectiveTo)}T00:00:00Z`); effectiveAt.setUTCDate(effectiveAt.getUTCDate() + 1)
      if (workDate(effectiveAt) > workDate(parsed.throughDate)) throw new BusinessRuleError("HRIS_LEAVE_SETTLEMENT_NOT_DUE")
      const sourceId = key(parsed.employeeId, source.id)
      const existing = await client.hrisLeaveBalanceEntry.findUnique({ where: { organizationId_sourceType_sourceId: { organizationId: parsed.organizationId, sourceType: "HRIS_LEAVE_SETTLEMENT", sourceId } } })
      if (existing) { results.push(existing.id); return existing }
      assertLeaveEligibility(source, parsed.employeeId, source.effectiveFrom)
      const pending = await client.hrisTimeRequest.count({ where: { organizationId: parsed.organizationId, employeeId: parsed.employeeId, leavePolicyId: source.id,
        OR: [{ status: "REQUESTED" }, { status: "APPROVED", metadata: { path: ["cancellation", "status"], equals: "REQUESTED" } }] } })
      const rows = await client.hrisLeaveBalanceEntry.findMany({ where: { organizationId: parsed.organizationId, employeeId: parsed.employeeId, leavePolicyId: source.id } })
      if (pending || rows.some(row => row.effectiveAt >= effectiveAt)) throw new BusinessRuleError("HRIS_LEAVE_SETTLEMENT_BLOCKED: Resolve pending requests and later ledger movements before closing this policy.")
      if (sourceRules.credits.some(credit => !rows.some(row => row.sourceType === "HRIS_LEAVE_SCHEDULE" && row.sourceId === `${sourceId}:${credit.date}:${credit.kind}`))) throw new BusinessRuleError("HRIS_LEAVE_CREDITS_PENDING: Execute the source policy's scheduled credits before settlement.")
      const amount = rows.reduce((sum, row) => sum + row.deltaMinutes, 0)
      return append({ deltaMinutes: -amount, effectiveAt, entryType: "EXPIRY", sourceType: "HRIS_LEAVE_SETTLEMENT", sourceId,
        sourceHash: attendanceHash({ policyHash: source.sourceHash, approval: source.approvalEvidenceHash, rows: rows.map(row => row.id).sort(), amount }), idempotencyKey: `leave-close:${sourceId}` }, source.id)
    }
    if (rules.carryover) {
      const source = await client.hrisLeavePolicy.findFirst({ where: { id: rules.carryover.fromPolicyId, organizationId: parsed.organizationId } })
      if (!source?.effectiveTo || workDate(source.effectiveTo) >= workDate(policy.effectiveFrom) || source.code !== policy.code || source.countryCode !== policy.countryCode) throw new BusinessRuleError("HRIS_LEAVE_CARRYOVER_SOURCE_INVALID: Select the prior nonoverlapping policy version of the same leave type and country.")
      await lockHrisLeaveLedgerInTx(client, { ...parsed, leavePolicyId: source.id })
      const settlement = await close(source)
      const sourceId = key(parsed.employeeId, source.id)
      await append({ deltaMinutes: Math.min(-settlement.deltaMinutes, rules.carryover.limitMinutes), effectiveAt: policy.effectiveFrom, entryType: "CARRY_OVER", sourceType: "HRIS_LEAVE_CARRYOVER_SOURCE", sourceId,
        sourceHash: attendanceHash({ settlementId: settlement.id, policyId: policy.id, policyHash: policy.sourceHash, limit: rules.carryover.limitMinutes }), idempotencyKey: `leave-carry:${sourceId}` })
    }
    for (const credit of [...rules.credits].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind))) {
      if (credit.date > workDate(parsed.throughDate)) continue
      const sourceId = `${key(parsed.employeeId, policy.id)}:${credit.date}:${credit.kind}`
      await append({ deltaMinutes: credit.minutes, effectiveAt: new Date(`${credit.date}T00:00:00Z`), entryType: credit.kind, sourceType: "HRIS_LEAVE_SCHEDULE", sourceId,
        sourceHash: attendanceHash({ policyHash: policy.sourceHash, approval: policy.approvalEvidenceHash, credit }), idempotencyKey: `leave-credit:${sourceId}` })
    }
    if (rules.expiry === "AT_POLICY_END" && policy.effectiveTo && workDate(parsed.throughDate) > workDate(policy.effectiveTo)) results.push((await close(policy)).id)
    return { entryIds: [...new Set(results)], throughDate: workDate(parsed.throughDate) }
  })
}
