import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { certificatePayloadHash } from "./payment-reconciliation-certification.service"
import { reconciliationCertificateExportSchema, retainedCertificateExportSchema } from "./reconciliation-certificate-export.contracts"
import { certificateHistorySchema, type CertificateHistoryQuery, type CertificateHistoryPage, type CertificateHistoryRun, type CertificateHistoryReceipt } from "./reconciliation-certificate-history.contracts"

const selectRun = { id: true, organizationId: true, status: true, certificateHash: true, signedAt: true, businessDate: true, createdAt: true,
  providerAccount: { select: { organizationId: true, displayName: true, currencyCode: true } } } satisfies Prisma.ReconciliationRunSelect
type RunRow = Prisma.ReconciliationRunGetPayload<{ select: typeof selectRun }>
function presentRun(row: RunRow, organizationId: string): CertificateHistoryRun {
  if (row.organizationId !== organizationId || row.providerAccount.organizationId !== organizationId) throw new ConflictError("Certificate source scope requires review.")
  return { id: row.id, status: row.status, certificateHash: row.certificateHash, signedAt: row.signedAt?.toISOString() ?? null, businessDate: row.businessDate.toISOString(), providerName: row.providerAccount.displayName, currencyCode: row.providerAccount.currencyCode }
}

// Discovery returns summaries only. File bytes still pass the separate fresh-auth export service.
export async function readReconciliationCertificateHistory(input: CertificateHistoryQuery, control: { organizationId: string; actorId: string; actorPermissions: readonly string[] }): Promise<CertificateHistoryPage> {
  const query = certificateHistorySchema.parse(input), { organizationId, actorId } = control
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read")) throw new ForbiddenError("Current reconciliation read permission is required.")
  const filter = JSON.stringify(query.kind === "runs" ? [query.kind, query.search] : [query.kind, query.runId])
  if (query.cursor && query.cursor.filter !== filter) throw new ConflictError("History filters changed. Return to the first page.")
  return db.$transaction(async tx => {
    if (!await tx.user.findFirst({ where: { id: actorId, organizationId, isActive: true }, select: { id: true } })) throw new ForbiddenError("An active workspace actor is required.")
    const after = query.cursor ? { OR: [{ createdAt: { lt: new Date(query.cursor.createdAt) } }, { createdAt: new Date(query.cursor.createdAt), id: { lt: query.cursor.id } }] } : {}
    const base = { scope: { organizationId, actorId }, asOf: new Date().toISOString() }
    if (query.kind === "runs") {
      const rows = await tx.reconciliationRun.findMany({ where: { organizationId, certificateHash: { not: null }, AND: [after, ...(query.search ? [{ OR: [{ id: { contains: query.search, mode: "insensitive" as const } }, { providerAccount: { organizationId, displayName: { contains: query.search, mode: "insensitive" as const } } }] }] : [])] }, select: selectRun, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21 })
      const page = rows.slice(0, 20), last = page.at(-1)
      return { ...base, kind: "runs", runs: page.map(row => presentRun(row, organizationId)), nextCursor: rows.length > 20 && last ? { createdAt: last.createdAt.toISOString(), id: last.id, filter } : null }
    }
    const run = await tx.reconciliationRun.findFirst({ where: { id: query.runId, organizationId, certificateHash: { not: null } }, select: selectRun })
    if (!run) throw new NotFoundError("Signed reconciliation evidence is unavailable in this workspace.")
    const rows = await tx.paymentReconciliationInboxItem.findMany({ where: { organizationId, source: "CERTIFICATE_EXPORT", externalId: run.id, ...after }, select: { id: true, createdAt: true, status: true, idempotencyKey: true, payloadSummary: true, payloadHash: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21 })
    const page = rows.slice(0, 20), last = page.at(-1)
    const receipts: CertificateHistoryReceipt[] = page.map(row => {
      const summary: CertificateHistoryReceipt = { id: row.id, createdAt: row.createdAt.toISOString(), state: "requires_review", certificateHash: null, sha256: null, recoveryRequest: null }
      if (!row.idempotencyKey.startsWith("reconciliation-certificate-export:")) return { ...summary, state: "legacy" }
      const saved = retainedCertificateExportSchema.safeParse(row.payloadSummary)
      if (!saved.success || row.status !== "PROCESSED" || certificatePayloadHash(row.payloadSummary) !== row.payloadHash) return summary
      const { result, requestHash } = saved.data
      if (result.runId !== run.id || result.inboxItemId !== row.id || createHash("sha256").update(result.content).digest("hex") !== result.sha256) return summary
      const command = reconciliationCertificateExportSchema.safeParse({ runId: run.id, expectedCertificateHash: result.certificateHash, idempotencyKey: row.idempotencyKey.slice("reconciliation-certificate-export:".length), fileType: "json" })
      if (!command.success) return summary
      const ownRequest = certificatePayloadHash({ runId: run.id, certificateHash: result.certificateHash, fileType: "json", actorId, idempotencyKey: command.data.idempotencyKey }) === requestHash
      return { ...summary, state: "verified", certificateHash: result.certificateHash, sha256: result.sha256, recoveryRequest: ownRequest ? command.data : null }
    })
    return { ...base, kind: "exports", run: presentRun(run, organizationId), receipts, nextCursor: rows.length > 20 && last ? { createdAt: last.createdAt.toISOString(), id: last.id, filter } : null }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
