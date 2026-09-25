import { createHash, randomUUID } from "node:crypto"
import { z } from "zod"
import { db } from "@/prisma/db"
import { BusinessRuleError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { runPaymentReconciliation } from "@/services/reconciliation/payment-reconciliation-run.service"
import { providerOperationIntentSchema, providerOperationHash, loadProviderOperationIntent } from "./provider-operation-evidence"
import { importProviderStatement, type ImportProviderStatementResult } from "./statement-import.service"
import type { PaymentProviderAdapter } from "./payment-ingestion.types"

const commandSchema = z.object({ providerAccountId: z.string().trim().min(1).max(191), rawContent: z.string().min(1),
  businessDate: z.coerce.date(), fileName: z.string().max(255).optional(), idempotencyKey: z.string().uuid() }).strict()
type Control = { organizationId: string; actorId: string; actorPermissions: readonly string[] }
export type ImportProviderStatementForReviewInput = z.input<typeof commandSchema> & { adapter: PaymentProviderAdapter }
const surface = "services/payments/provider-operations.service.ts"

async function authorize(control: Control) {
  if (!["payments.reconciliation.read", "payments.reconciliation.import", "payments.reconciliation.run"].every(p => hasRbacPermission(control.actorPermissions, p))
    || !await db.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } }))
    throw new ForbiddenError("An active scoped reconciliation reader/importer/operator is required.")
  const decision = await observeModuleAccess({ organizationId: control.organizationId, userId: control.actorId, actorPermissions: control.actorPermissions,
    moduleSlug: "payment_reconciliation", surfaceType: "action", surface, accessIntent: "write", mode: "enforce", audit: true })
  if (!decision.allowed || decision.result !== "allow" || decision.wouldBlock || decision.organizationId !== control.organizationId
    || decision.userId !== control.actorId || decision.moduleSlug !== "payment_reconciliation" || decision.mode !== "enforce"
    || decision.surface !== surface || decision.surfaceType !== "action" || decision.accessIntent !== "write")
    throw new ForbiddenError("Current reconciliation write eligibility is required.")
}

/** Import and matching may complete separately. The immutable intent binds retries;
 * actual statement/run records establish each stage. Signing is a separate review. */
export async function importProviderStatementForReview(input: ImportProviderStatementForReviewInput, control: Control) {
  const { adapter, ...raw } = input, command = commandSchema.parse(raw)
  if (Buffer.byteLength(command.rawContent, "utf8") > 5 * 1024 * 1024) throw new BusinessRuleError("Statement file exceeds the allowed size.")
  await authorize(control)
  const date = new Date(command.businessDate); date.setUTCHours(0, 0, 0, 0)
  const intent = providerOperationIntentSchema.parse({ kind: "PROVIDER_STATEMENT_REVIEW_INTENT_V1", organizationId: control.organizationId, actorId: control.actorId,
    providerAccountId: command.providerAccountId, businessDate: date.toISOString(), providerCode: adapter.providerCode,
    fileHash: createHash("sha256").update(command.rawContent).digest("hex"), fileName: command.fileName ?? null, idempotencyKey: command.idempotencyKey })
  const idempotencyKey = "provider-statement-review:" + command.idempotencyKey, payloadHash = providerOperationHash(intent)
  const where = { organizationId: control.organizationId, source: "RECONCILIATION_RUN" as const, idempotencyKey }
  let stored = await db.paymentReconciliationInboxItem.findFirst({ where })
  if (!stored) {
    // Provider ownership is checked before persisting even the intent.
    if (!await db.providerAccount.findFirst({ where: { id: command.providerAccountId, organizationId: control.organizationId }, select: { id: true } })) throw new ForbiddenError("Provider unavailable in this workspace.")
    try { stored = await db.paymentReconciliationInboxItem.create({ data: { ...where, id: randomUUID(), providerAccountId: command.providerAccountId,
      status: "PROCESSED", processedAt: new Date(), payloadSummary: intent, payloadHash } }) }
    catch (error) { if ((error as { code?: string })?.code !== "P2002") throw error; stored = await db.paymentReconciliationInboxItem.findFirst({ where }); if (!stored) throw error }
  }
  const retained = await loadProviderOperationIntent(db, control.organizationId, stored.id)
  if (providerOperationHash(retained.intent) !== payloadHash) throw new IdempotencyConflictError()
  const base = { intentId: stored.id, fileHash: intent.fileHash, businessDate: intent.businessDate }
  const currentRun = () => db.reconciliationRun.findFirst({ where: { organizationId: control.organizationId, providerAccountId: command.providerAccountId,
    runById: control.actorId, correlationId: stored.id, metadata: { path: ["providerOperationId"], equals: stored.id } },
    select: { id: true, status: true, businessDate: true, signedAt: true } })
  const present = (run: NonNullable<Awaited<ReturnType<typeof currentRun>>>, statementFileId: string) => ({ ...base, stage: "REVIEW_REQUIRED" as const,
    statementFileId, runId: run.id, currentStatus: run.status, reviewPath: "/dashboard/finance/reconciliation?reviewRun=" + encodeURIComponent(run.id), signingPerformed: false as const })
  const existing = await currentRun()
  if (existing) {
    const file = await db.statementFile.findFirst({ where: { organizationId: control.organizationId, providerAccountId: command.providerAccountId, fileHash: intent.fileHash }, select: { id: true } })
    if (!file || existing.businessDate.toISOString() !== intent.businessDate) throw new BusinessRuleError("Retained operation evidence requires review.")
    return present(existing, file.id)
  }
  let statement: ImportProviderStatementResult
  try { statement = await importProviderStatement({ organizationId: control.organizationId, providerAccountId: command.providerAccountId, adapter,
    rawContent: command.rawContent, fileName: command.fileName, importedById: control.actorId, correlationId: stored.id }) }
  catch (error) { return { ...base, stage: "IMPORT_UNCONFIRMED" as const, reason: failureReason(error), retrySameRequest: true as const, signingPerformed: false as const } }
  if (statement.status === "DUPLICATE_LINE") return { ...base, stage: "IMPORT_BLOCKED" as const, exceptionId: statement.exceptionId ?? null, signingPerformed: false as const }
  if (!statement.statementFileId || statement.fileHash !== intent.fileHash) throw new BusinessRuleError("Imported statement evidence requires review.")
  try {
    await authorize(control)
    await runPaymentReconciliation({ organizationId: control.organizationId, providerAccountId: command.providerAccountId, businessDate: date,
      runById: control.actorId, correlationId: stored.id, providerOperationId: stored.id })
  } catch (error) {
    const committed = await currentRun()
    if (committed) return present(committed, statement.statementFileId)
    return { ...base, stage: "IMPORTED_RECONCILIATION_UNCONFIRMED" as const, reason: failureReason(error), statementFileId: statement.statementFileId, retrySameRequest: true as const, signingPerformed: false as const }
  }
  const completed = await currentRun()
  if (!completed) throw new BusinessRuleError("The reconciliation outcome could not be confirmed. Retry the retained request.")
  return present(completed, statement.statementFileId)
}

function failureReason(error: unknown) {
  const code = (error as { code?: string })?.code
  return code === "FORBIDDEN" ? "ACCESS_CHANGED" : code === "CONFLICT" ? "RUN_CONFLICT" : "OUTCOME_UNCONFIRMED"
}

/** The old combined command cannot approve evidence that did not exist at review time. */
export async function ingestAndSignProviderStatement(_input: unknown): Promise<never> {
  throw new BusinessRuleError("Automatic provider statement sign-off is retired. Use importProviderStatementForReview, then independently review and sign the returned run.")
}
