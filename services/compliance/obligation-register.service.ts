import "server-only"
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { lockWorkpaperAuthorityInTx } from "@/services/accounting/close-evidence-acceptance-authority.service"
import { lockCloseAssessmentPeriodsInTx, readCloseAssessmentPublicationTimeInTx } from "@/services/accounting/close-assessment-order.service"
import { lockCloseSourceRevisionInTx } from "@/services/accounting/close-source-revision.service"
import type { WorkpaperActor } from "@/services/accounting/review-workpaper.service"
import { obligationCodes, obligationCommandSchema, obligationScopeSchema, type ObligationCode, type ObligationItem, type ObligationRegister, type ObligationSource } from "./obligation-register.contract"
import { obligationHash, obligationSource, obligationState } from "./obligation-register-source"

const options = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000, maxWait: 10000 }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const historyLimit = 500, instanceLimit = 100

async function context(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(["firm-obligations-v1", organizationId])},0))::text`)
  const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { countryCode: true } })
  const periods = await tx.accountingPeriod.findMany({ where: { organizationId }, orderBy: [{ startDate: "desc" }, { id: "asc" }], take: 101, select: { id: true, name: true, startDate: true, endDate: true } })
  if (periods.length > 100) throw new BusinessRuleError("This obligation pilot supports up to 100 client periods.")
  await lockCloseAssessmentPeriodsInTx(tx, organizationId, periods.map(p => p.id))
  const sourceRevision = await lockCloseSourceRevisionInTx(tx, organizationId)
  const rows = await tx.firmObligationRevision.findMany({ where: { organizationId }, orderBy: [{ version: "desc" }, { id: "asc" }], take: historyLimit + 1 })
  if (rows.length > historyLimit) throw new BusinessRuleError("Obligation history exceeds the bounded pilot. Retained records require operator review.")
  return { countryCode: org.countryCode?.toUpperCase() ?? "UNKNOWN", periods, rows, sourceRevision: sourceRevision.revision }
}

async function evidence(tx: Prisma.TransactionClient, organizationId: string, periodId: string, code: ObligationCode, evidenceId: string | null, sourceRevision: string) {
  if (!evidenceId) return null
  if (code === "CLOSE_EVIDENCE_COLLECTION") {
    const row = await tx.closePackExport.findFirst({ where: { id: evidenceId, organizationId, periodId }, select: {
      id: true, contentHash: true, closeRunId: true, exportedAt: true, isCertified: true,
      closeRun: { select: { voidedAt: true, status: true } },
    } })
    if (!row || row.closeRun.voidedAt) return null
    // Collection/review of a retained artifact does not certify its Close run.
    return { hash: obligationHash({ ...row, sourceRevision }), classification: "CLOSE_PACK" as const }
  }
  if (code === "CM_CNPS_EVIDENCE") {
    const period = await tx.accountingPeriod.findFirstOrThrow({ where: { id: periodId, organizationId }, select: { startDate: true, endDate: true } })
    const row = await tx.payrollDeclarationEvidence.findFirst({ where: { id: evidenceId, organizationId,
      declaration: { organizationId, countryCode: "CM", authority: "CNPS", periodStart: { gte: period.startDate }, periodEnd: { lte: period.endDate } } },
      select: { id: true, declarationId: true, evidenceHash: true, transition: true, nextStatus: true, authorityEnvironment: true,
        productionSubmissionSupported: true, declaration: { select: { status: true, countryCode: true, countryPackResolutionHash: true, payloadHash: true } } } })
    if (!row) return null
    const classification = /sandbox|test/i.test(row.authorityEnvironment) ? "SANDBOX" as const :
      /manual|portal/i.test(row.authorityEnvironment) ? row.transition === "ACCEPT" ? "MANUAL_ACKNOWLEDGEMENT" as const : "MANUAL_SUBMISSION" as const : "UNVERIFIED_AUTHORITY" as const
    // No adapter is executed, and no string/status or user attachment is live acceptance.
    return { hash: obligationHash(row), classification }
  }
  return null
}

export async function getObligationRegister(actor: WorkpaperActor, raw: unknown): Promise<ObligationRegister> {
  const input = obligationScopeSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId, requirePayrollRead: input.includePayroll }, "workpaper-read")
    const ctx = await context(tx, organizationId), now = await readCloseAssessmentPublicationTimeInTx(tx)
    const sources = obligationCodes.map(code => obligationSource(code, ctx.countryCode, now))
    const latest = [...new Map(ctx.rows.map(row => row.instanceId).map(id => [id, ctx.rows.find(row => row.instanceId === id)!])).values()]
    const items: ObligationItem[] = []
    for (const row of latest) {
      const code = row.code as ObligationCode, source = sources.find(s => s.code === code)!
      const redacted = code === "CM_CNPS_EVIDENCE" && !input.includePayroll
      const attached = redacted ? null : await evidence(tx, organizationId, row.periodId, code, row.evidenceId, ctx.sourceRevision)
      const sourceChanged = row.sourceHash !== source.sourceHash, evidenceChanged = !!row.evidenceId && (redacted || attached?.hash !== row.evidenceHash)
      items.push({ instanceId: row.instanceId, version: row.version, code, periodId: row.periodId, ownerId: row.ownerId,
        applicability: row.applicability as ObligationItem["applicability"], dueAt: row.dueAt?.toISOString() ?? null,
        ...obligationState({ ...row, sourceChanged, evidenceChanged, evidencePresent: !!attached, source }, now),
        sourceChanged, evidenceChanged, source, retainedSourceVersion: (row.sourceSnapshot as unknown as ObligationSource).sourceVersion,
        decision: redacted ? "REDACTED" : row.decision, evidenceId: redacted ? null : row.evidenceId,
        evidenceClass: redacted ? "REDACTED" : attached?.classification ?? "NONE", liveFilingAccepted: false, payrollRedacted: redacted,
        history: redacted ? [] : ctx.rows.filter(r => r.instanceId === row.instanceId).map(r => ({ version: r.version, actorId: r.actorId,
          at: r.createdAt.toISOString(), reason: r.reason, decision: r.decision, sourceVersion: (r.sourceSnapshot as unknown as ObligationSource).sourceVersion,
          dueAt: r.dueAt?.toISOString() ?? null, applicability: r.applicability })) })
    }
    items.sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") || a.instanceId.localeCompare(b.instanceId))
    const packs = await tx.closePackExport.findMany({ where: { organizationId, closeRun: { voidedAt: null } }, orderBy: { exportedAt: "desc" }, take: 100,
      select: { id: true, periodId: true, exportedAt: true } })
    const choices: ObligationRegister["evidence"] = packs.map(p => ({ id: p.id, periodId: p.periodId, code: "CLOSE_EVIDENCE_COLLECTION", label: `Close pack · ${p.exportedAt.toISOString()}` }))
    if (input.includePayroll) {
      const rows = await tx.payrollDeclarationEvidence.findMany({ where: { organizationId, declaration: { organizationId, countryCode: "CM", authority: "CNPS" } },
        orderBy: { createdAt: "desc" }, take: 100, select: { id: true, createdAt: true, declaration: { select: { periodStart: true, periodEnd: true } } } })
      for (const row of rows) for (const p of ctx.periods.filter(p => row.declaration.periodStart >= p.startDate && row.declaration.periodEnd <= p.endDate)) {
        choices.push({ id: row.id, periodId: p.id, code: "CM_CNPS_EVIDENCE", label: `CNPS evidence · ${row.createdAt.toISOString()}` })
      }
    }
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { observedAt: now.toISOString(), clientOrganizationId: organizationId, actorId: actor.actorId, countryCode: ctx.countryCode,
      sources, periods: ctx.periods.map(({ id, name }) => ({ id, name })), items, evidence: choices, payrollIncluded: input.includePayroll, limit: instanceLimit }
  }, options)
}

export async function recordObligationRevision(actor: WorkpaperActor, raw: unknown) {
  const input = obligationCommandSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId, requirePayrollRead: input.code === "CM_CNPS_EVIDENCE" }, input.command === "SAVE" ? "workpaper-prepare" : "workpaper-review")
    const ctx = await context(tx, organizationId), now = await readCloseAssessmentPublicationTimeInTx(tx)
    const commandHash = obligationHash({ actorId: actor.actorId, organizationId, input })
    const replay = ctx.rows.find(row => row.idempotencyKey === input.idempotencyKey)
    if (replay) {
      if (replay.commandHash !== commandHash) throw new IdempotencyConflictError()
      await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
      return { instanceId: replay.instanceId, version: replay.version, replayed: true }
    }
    if (ctx.rows.length >= historyLimit) throw new BusinessRuleError("The pilot's 500 retained revisions are full; reads remain available.")
    const prior = input.instanceId ? ctx.rows.find(row => row.instanceId === input.instanceId) : undefined
    if (input.instanceId && !prior) throw new NotFoundError("The obligation is unavailable.")
    if (!ctx.periods.some(p => p.id === input.periodId)) throw new NotFoundError("The client period is unavailable.")
    if ((prior?.version ?? 0) !== input.expectedVersion || prior && (prior.code !== input.code || prior.periodId !== input.periodId)) throw new ConflictError("The obligation changed. Refresh before editing.")
    if (!prior && new Set(ctx.rows.map(r => r.instanceId)).size >= instanceLimit) throw new BusinessRuleError("The pilot supports at most 100 obligations per client.")
    if (!prior && ctx.rows.some(row => row.code === input.code && row.periodId === input.periodId)) throw new ConflictError("This obligation already exists for the period. Refresh it.")
    const source = obligationSource(input.code, ctx.countryCode, now)
    if (input.expectedSourceHash !== source.sourceHash) throw new ConflictError("Country applicability or source changed. Reload the current source.")
    const attached = await evidence(tx, organizationId, input.periodId, input.code, input.evidenceId, ctx.sourceRevision)
    if (input.evidenceId && !attached) throw new NotFoundError("Choose available evidence from the same client, period and domain.")
    if (input.command !== "SAVE") {
      if (!prior || prior.decision !== "PREPARED" || prior.actorId === actor.actorId) throw new BusinessRuleError("An independent reviewer must review the latest preparation.", "SOD_VIOLATION")
      if (prior.sourceHash !== source.sourceHash || prior.evidenceHash !== (attached?.hash ?? null) || prior.evidenceId !== input.evidenceId ||
        prior.applicability !== input.applicability || (prior.dueAt?.toISOString() ?? null) !== input.dueAt || input.claimOwnership) throw new ConflictError("Prepared terms or evidence changed. Prepare a new revision before review.")
      if (input.command === "REVIEW" && !attached) throw new BusinessRuleError("A positive evidence review requires an existing domain artifact.")
    }
    const instanceId = prior?.instanceId ?? randomUUID(), version = (prior?.version ?? 0) + 1
    const row = { organizationId, instanceId, version, code: input.code, periodId: input.periodId,
      countryCode: ctx.countryCode, ownerId: !prior || input.claimOwnership ? actor.actorId : prior.ownerId,
      applicability: input.applicability, dueAt: input.dueAt ? new Date(input.dueAt) : null, sourceHash: source.sourceHash,
      sourceSnapshot: json(source), evidenceId: input.evidenceId, evidenceHash: attached?.hash ?? null,
      decision: input.command === "SAVE" ? "PREPARED" : input.command === "REVIEW" ? "REVIEWED" : "CHANGES_REQUESTED",
      actorId: actor.actorId, reason: input.reason, idempotencyKey: input.idempotencyKey, commandHash, createdAt: now }
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    await tx.firmObligationRevision.create({ data: { ...row, sourceSnapshot: json(source) } })
    await tx.auditLog.create({ data: { organizationId, userId: actor.actorId, entityType: "FirmObligation", entityId: instanceId,
      action: "OBLIGATION_REVISION_RECORDED", changes: json({ version, command: input.command, commandHash, sourceHash: source.sourceHash }) } })
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { instanceId, version, replayed: false }
  }, options)
}
