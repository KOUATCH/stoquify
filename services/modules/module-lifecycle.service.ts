import "server-only"

import { Prisma, type TenantModuleLifecycleOperation } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import type { CompositionLifecycleOperation, CompositionLifecycleState, CompositionLifecycleStep } from "./module-composition-contracts"
import { lifecycleEvidenceHash } from "./module-lifecycle-readiness.service"

export async function appendModuleLifecycleEventInTx(tx: Prisma.TransactionClient, operation: TenantModuleLifecycleOperation, input: {
  actorId: string; eventKey: string; eventType: string; state: CompositionLifecycleState; evidence: Prisma.InputJsonObject
  leaseToken?: string | null; leaseUntil?: Date | null; errorCode?: string | null; completedAt?: Date | null
}) {
  const version = operation.version + 1
  const update = await tx.tenantModuleLifecycleOperation.updateMany({ where: { id: operation.id, organizationId: operation.organizationId, version: operation.version }, data: {
    version, state: input.state,
    ...(input.leaseToken !== undefined ? { leaseToken: input.leaseToken } : {}),
    ...(input.leaseUntil !== undefined ? { leaseUntil: input.leaseUntil } : {}),
    ...(input.errorCode !== undefined ? { errorCode: input.errorCode } : {}),
    ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
  } })
  if (update.count !== 1) throw new ConflictError("Preparation changed concurrently. Refresh its current state.")
  await tx.tenantModuleLifecycleEvent.create({ data: {
    organizationId: operation.organizationId, operationId: operation.id, sequence: version,
    eventKey: input.eventKey, eventType: input.eventType, state: input.state, actorId: input.actorId,
    evidence: input.evidence, evidenceHash: lifecycleEvidenceHash(input.evidence),
  } })
  return { ...operation, version, state: input.state, ...Object.fromEntries(Object.entries({ leaseToken: input.leaseToken, leaseUntil: input.leaseUntil, errorCode: input.errorCode, completedAt: input.completedAt }).filter(([, value]) => value !== undefined)) } as TenantModuleLifecycleOperation
}

export async function readModuleLifecycleInTx(tx: Prisma.TransactionClient, input: { organizationId: string; revision: number; activeRevision: number; actorId: string }): Promise<CompositionLifecycleOperation | null> {
  const row = await tx.tenantModuleLifecycleOperation.findFirst({ where: { organizationId: input.organizationId }, orderBy: { desiredRevision: "desc" }, include: { steps: { orderBy: [{ moduleSlug: "asc" }, { stepKey: "asc" }] } } })
  if (!row) return null
  return {
    id: row.id, commandId: row.commandId, state: row.state, desiredRevision: row.desiredRevision, activeRevision: input.activeRevision,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), errorCode: row.errorCode,
    canResume: input.revision === row.desiredRevision && input.actorId === row.actorId && row.errorCode !== "CONFIGURATION_STALE" &&
      (["REQUESTED", "FAILED"].includes(row.state) || (row.state === "PREPARING" && (!row.leaseUntil || row.leaseUntil <= new Date()))),
    steps: row.steps.map(step => ({ moduleSlug: step.moduleSlug as CompositionLifecycleStep["moduleSlug"], stepKey: step.stepKey,
      status: step.state, code: step.code as CompositionLifecycleStep["code"], href: step.href,
      checkedAt: step.checkedAt?.toISOString() ?? null, evidenceHash: step.evidenceHash, attempts: step.attempts })),
  }
}
