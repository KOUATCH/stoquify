import { z } from "zod"

const id = z.string().min(1).max(191)
const revision = z.string().regex(/^sha256:[a-f0-9]{64}$/)
const draft = z.object({ targetType: z.string().min(1).max(80), reason: z.string().max(10000), expectedEvidenceRevision: revision, idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/), suspenseLedgerAccountId: id.nullable() }).strict()
const approval = z.object({ suspenseItemId: id, expectedEvidenceRevision: revision }).strict()
const schema = z.object({ version: z.literal(1), organizationId: id, actorId: id, drafts: z.record(id, draft), approval: approval.nullable() }).strict()
export type SuspenseDraft = z.infer<typeof draft>
export type SuspenseApprovalRequest = z.infer<typeof approval>
export type SuspenseRecoveryScope = { organizationId: string; actorId: string }
export type SuspenseRecovery = { drafts: Record<string, SuspenseDraft>; approval: SuspenseApprovalRequest | null }
export const emptySuspenseRecovery = (): SuspenseRecovery => ({ drafts: {}, approval: null })
export const suspenseRecoveryKey = (scope: SuspenseRecoveryScope) => `stoquify:suspense:v1:${JSON.stringify([scope.organizationId, scope.actorId])}`
export function readSuspenseRecovery(storage: Pick<Storage, "getItem">, scope: SuspenseRecoveryScope): SuspenseRecovery {
  const raw = storage.getItem(suspenseRecoveryKey(scope))
  if (raw === null) return emptySuspenseRecovery()
  if (raw.length > 300000) throw new Error("Suspense recovery is too large")
  const saved = schema.parse(JSON.parse(raw))
  if (saved.organizationId !== scope.organizationId || saved.actorId !== scope.actorId) throw new Error("Suspense recovery scope mismatch")
  return { drafts: saved.drafts, approval: saved.approval }
}
export function saveSuspenseRecovery(storage: Pick<Storage, "setItem" | "removeItem">, scope: SuspenseRecoveryScope, recovery: SuspenseRecovery) {
  if (!Object.keys(recovery.drafts).length && !recovery.approval) { storage.removeItem(suspenseRecoveryKey(scope)); return }
  const raw = JSON.stringify(schema.parse({ version: 1, ...scope, ...recovery }))
  if (raw.length > 300000) throw new Error("Suspense recovery is too large")
  storage.setItem(suspenseRecoveryKey(scope), raw)
}
