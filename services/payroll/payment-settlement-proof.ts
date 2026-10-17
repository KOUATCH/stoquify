import "server-only"
import { createHash } from "node:crypto"
import type { Prisma, PayrollRun, PaymentTransaction } from "@prisma/client"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"
import type { SettlementProofOptions, SettlementProofSelection } from "./payment-settlement-proof-contracts"

export const settlementMatchProofInclude = {
  providerEvent: { select: {
    id: true, organizationId: true, providerAccountId: true, providerEventId: true,
    providerTransactionId: true, providerReference: true, rawPayloadHash: true,
    signatureHash: true, signatureValid: true, status: true, amount: true,
    currencyCode: true, direction: true, archivedAt: true, occurredAt: true,
  } },
  statementLine: { select: {
    id: true, organizationId: true, providerAccountId: true, providerTransactionId: true,
    providerReference: true, rawLineHash: true, status: true, amount: true,
    currencyCode: true, direction: true, archivedAt: true, occurredAt: true,
    statementFile: { select: { id: true, organizationId: true, providerAccountId: true, fileHash: true, fileName: true, status: true, archivedAt: true } },
  } },
} satisfies Prisma.MatchRecordInclude

type Match = Prisma.MatchRecordGetPayload<{ include: typeof settlementMatchProofInclude }>
type Batch = { id: string; organizationId: string; payrollRunId: string; currency: string }
const hash = (value: unknown) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`

export function storedRegisterProof(batch: Batch, run: PayrollRun): SettlementProofOptions["register"] {
  if (run.organizationId !== batch.organizationId || run.id !== batch.payrollRunId ||
    !["POSTED", "PAID", "ARCHIVED"].includes(run.status) || run.deletedAt || run.cancelledAt ||
    !run.documentHash || !run.postedBusinessEventId || !run.ledgerPostingBatchId || run.currency !== batch.currency) return null
  return { id: run.id, runNumber: run.runNumber, version: run.version,
    revision: hash([run.id, run.version, run.documentHash, run.postedBusinessEventId, run.ledgerPostingBatchId]) }
}

/** Pure projection: a selected record still requires transactional revalidation. */
export function storedMatchProof(batch: Batch, transaction: PaymentTransaction & { providerAccount?: { organizationId: string } | null }, match: Match) {
  const event = match.providerEvent
  const line = match.statementLine
  if (transaction.organizationId !== batch.organizationId || transaction.sourceType !== "PAYROLL_PAYMENT" ||
    transaction.sourceId !== batch.id || transaction.currencyCode !== batch.currency || transaction.direction !== "OUTBOUND" ||
    match.organizationId !== batch.organizationId || match.paymentTransactionId !== transaction.id ||
    !["APPROVED", "AUTO_MATCHED"].includes(match.status) || !match.amountMatched?.gt(0) ||
    match.currencyCode !== batch.currency || !transaction.providerAccountId ||
    transaction.providerAccount?.organizationId !== batch.organizationId || match.providerAccountId !== transaction.providerAccountId || (!event && !line) ||
    (match.providerEventId && !event) || (match.statementLineId && !line)) return null
  if (event && (event.id !== match.providerEventId || event.organizationId !== batch.organizationId ||
    event.providerAccountId !== transaction.providerAccountId || !event.signatureValid ||
    !["VERIFIED", "PROCESSED"].includes(event.status) || event.archivedAt || !event.rawPayloadHash ||
    event.direction !== "OUTBOUND" || event.currencyCode !== batch.currency || !event.amount?.eq(match.amountMatched))) return null
  if (line && (line.id !== match.statementLineId || line.organizationId !== batch.organizationId ||
    line.providerAccountId !== transaction.providerAccountId || line.status !== "MATCHED" || line.archivedAt ||
    !line.rawLineHash || line.direction !== "DEBIT" || line.currencyCode !== batch.currency || !line.amount.eq(match.amountMatched) ||
    line.statementFile.organizationId !== batch.organizationId || line.statementFile.providerAccountId !== transaction.providerAccountId ||
    line.statementFile.status !== "PROCESSED" || line.statementFile.archivedAt || !line.statementFile.fileHash)) return null
  if (event && line && ((event.providerTransactionId && line.providerTransactionId && event.providerTransactionId !== line.providerTransactionId) ||
    (event.providerReference && line.providerReference && event.providerReference !== line.providerReference))) return null
  const revision = hash([match.id, match.updatedAt.toISOString(), match.status, match.amountMatched.toFixed(2), match.currencyCode,
    event ? [event.id, event.rawPayloadHash, event.signatureHash, event.providerTransactionId, event.providerReference] : null,
    line ? [line.id, line.rawLineHash, line.statementFile.id, line.statementFile.fileHash, line.providerTransactionId, line.providerReference] : null])
  const option: SettlementProofOptions["matches"][number] = {
    id: match.id, revision, kind: event && line ? "provider_and_statement" : event ? "provider" : "statement",
    reference: event?.providerReference ?? line?.providerReference ?? transaction.providerReference ?? match.id,
    amount: match.amountMatched.toFixed(2), currency: match.currencyCode,
    occurredAt: (line?.occurredAt ?? event?.occurredAt ?? match.matchedAt ?? match.createdAt).toISOString(),
  }
  return { option, evidenceHash: hash(["PAYROLL_STORED_SETTLEMENT_PROOF_V1", batch.id, transaction.id, revision]),
    providerEventId: event?.id, statementLineId: line?.id, statementFileHash: line?.statementFile.fileHash,
    providerAccountId: transaction.providerAccountId,
    providerTransactionId: event?.providerTransactionId ?? line?.providerTransactionId ?? transaction.providerTransactionId ?? undefined,
    providerReference: event?.providerReference ?? line?.providerReference ?? transaction.providerReference ?? undefined }
}

export function resolveStoredSettlementProof(batch: Batch, run: PayrollRun, transaction: PaymentTransaction & { providerAccount?: { organizationId: string } | null }, match: Match, selection: SettlementProofSelection) {
  const register = storedRegisterProof(batch, run)
  const proof = storedMatchProof(batch, transaction, match)
  if (!register || !proof) throw new BusinessRuleError("The selected payroll proof is no longer eligible. Refresh and review the source records.")
  if (selection.payrollRunId !== register.id || selection.runVersion !== register.version || selection.runRevision !== register.revision ||
    selection.matchRecordId !== proof.option.id || selection.matchRevision !== proof.option.revision) {
    throw new ConflictError("Payroll proof changed after selection. Refresh and review the source records.")
  }
  return { ...proof, sourceRegisterHash: run.documentHash! }
}
