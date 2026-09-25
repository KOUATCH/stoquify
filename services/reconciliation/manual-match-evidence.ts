import { MatchStatus, Prisma, type MatchRecord, type PaymentTransaction, type ProviderAccount, type ProviderEvent, type StatementLine } from "@prisma/client"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"

export const MANUAL_ALLOCATION_STATUSES = [MatchStatus.AUTO_MATCHED, MatchStatus.APPROVED, MatchStatus.CORRECTED]
export type ManualEvidenceReason = "EVIDENCE_SELECTION_REQUIRED" | "EVIDENCE_UNAVAILABLE" | "PROVIDER_UNAVAILABLE" | "PAYMENT_STATE" | "PROVIDER_EVIDENCE_INVALID" | "STATEMENT_EVIDENCE_INVALID" | "CURRENCY_MISMATCH" | "AMOUNT_UNAVAILABLE" | "ALLOCATION_INVALID" | "FULLY_ALLOCATED" | "READY"
export class ManualEvidenceError extends BusinessRuleError {
  constructor(public readonly reason: ManualEvidenceReason, message: string) { super(message) }
}
export function manualMatchAmount(value: Prisma.Decimal.Value | null | undefined) {
  let result: Prisma.Decimal
  try { result = new Prisma.Decimal(value ?? "NaN") } catch { throw new BusinessRuleError("A valid manual match amount is required.") }
  if (!result.isFinite() || result.lte(0) || result.decimalPlaces() > 2) throw new BusinessRuleError("Manual match amount must be positive and have at most two decimal places.")
  return result
}

type Evidence = {
  provider: Pick<ProviderAccount, "status" | "archivedAt" | "currencyCode">
  payment: Pick<PaymentTransaction, "state" | "direction" | "currencyCode" | "amount">
  event: Pick<ProviderEvent, "status" | "signatureValid" | "archivedAt" | "direction" | "currencyCode" | "amount"> | null
  line: Pick<StatementLine, "status" | "archivedAt" | "direction" | "currencyCode" | "amount"> | null
  currencyCode?: string
}

/** The writer and preparation view share these evidence rules. The write owner
 * separately scopes/locks records and binds its unchanged snapshot hash. */
export function validateManualMatchEvidence({ provider, payment, event, line, currencyCode = payment.currencyCode }: Evidence) {
  if (Boolean(event) === Boolean(line)) throw new ManualEvidenceError("EVIDENCE_SELECTION_REQUIRED", "Manual match requires exactly one provider event or statement line.")
  if (provider.status !== "ACTIVE" || provider.archivedAt) throw new ManualEvidenceError("PROVIDER_UNAVAILABLE", "An active provider account is required.")
  if (!["CONFIRMED", "SETTLED"].includes(payment.state)) throw new ManualEvidenceError("PAYMENT_STATE", "Only confirmed or settled internal payments can be matched.")
  if (event && (!event.signatureValid || event.archivedAt || !["VERIFIED", "PROCESSED"].includes(event.status) || event.direction !== payment.direction)) {
    throw new ManualEvidenceError("PROVIDER_EVIDENCE_INVALID", "Provider evidence must be verified, current and agree with the payment direction.")
  }
  if (line && (line.archivedAt || line.status !== "UNMATCHED" || !(
    (payment.direction === "INBOUND" && line.direction === "CREDIT") || (payment.direction === "OUTBOUND" && line.direction === "DEBIT")
  ))) throw new ManualEvidenceError("STATEMENT_EVIDENCE_INVALID", "Statement evidence must be available and agree with the payment direction.")
  const external = event ?? line!
  if ([provider.currencyCode, payment.currencyCode, external.currencyCode].some(currency => currency !== currencyCode)) throw new ManualEvidenceError("CURRENCY_MISMATCH", "Manual match evidence must use the same currency.")
  try { return { currencyCode, internalAmount: manualMatchAmount(payment.amount), externalAmount: manualMatchAmount(external.amount) } }
  catch (error) {
    if (error instanceof BusinessRuleError) throw new ManualEvidenceError("AMOUNT_UNAVAILABLE", error.message)
    throw error
  }
}

export type ManualEvidenceKeys = { paymentTransactionId: string; providerEventId?: string | null; statementLineId?: string | null }
type Allocation = Pick<MatchRecord, "paymentTransactionId" | "providerEventId" | "statementLineId" | "amountMatched" | "currencyCode">
export function getManualRemainingAmounts(
  keys: ManualEvidenceKeys,
  evidence: { internalAmount: Prisma.Decimal; externalAmount: Prisma.Decimal; currencyCode: string },
  rows: readonly Allocation[],
) {
  let internalAllocated = new Prisma.Decimal(0), externalAllocated = new Prisma.Decimal(0)
  for (const row of rows) {
    const internal = row.paymentTransactionId === keys.paymentTransactionId
    const external = Boolean((keys.providerEventId && row.providerEventId === keys.providerEventId) || (keys.statementLineId && row.statementLineId === keys.statementLineId))
    if (!internal && !external) continue
    if (row.currencyCode !== evidence.currencyCode) throw new ConflictError("Existing allocation currency requires review.")
    const allocated = manualMatchAmount(row.amountMatched)
    if (internal) internalAllocated = internalAllocated.plus(allocated)
    if (external) externalAllocated = externalAllocated.plus(allocated)
  }
  const internalRemaining = evidence.internalAmount.minus(internalAllocated), externalRemaining = evidence.externalAmount.minus(externalAllocated)
  if (internalRemaining.lt(0) || externalRemaining.lt(0)) throw new ConflictError("Existing allocations exceed the available evidence and require review.")
  return { internalRemaining, externalRemaining, availableAmount: Prisma.Decimal.min(internalRemaining, externalRemaining) }
}
