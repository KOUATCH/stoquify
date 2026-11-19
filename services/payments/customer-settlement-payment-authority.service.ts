import { PaymentTransactionState, Prisma } from "@prisma/client"

import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"

import {
  lockElectronicTenderAuthoritiesInTx,
  resolveElectronicTenderAuthority,
  type POSElectronicTenderAuthorityEvidence,
  type POSElectronicTenderAuthorityInput,
} from "./pos-electronic-tender-authority.service"

export type CustomerSettlementPaymentAuthority = POSElectronicTenderAuthorityEvidence & {
  ledgerAccountId: string
  amount: string
  currencyCode: string
}

export async function resolveCustomerSettlementPaymentAuthority(
  tx: Prisma.TransactionClient,
  input: POSElectronicTenderAuthorityInput,
): Promise<CustomerSettlementPaymentAuthority | null> {
  if (!input.paymentTransactionId) return null
  // POS claims its native payment before publishing financial sources. Hold the
  // same row first so a collection cannot invert native -> financial lock order.
  await lockElectronicTenderAuthoritiesInTx(tx, { organizationId: input.organizationId, paymentTransactionIds: [input.paymentTransactionId] })
  const evidence = await resolveElectronicTenderAuthority(tx, input)
  if (!evidence) throw new BusinessRuleError("Provider receipt evidence is available only for electronic collections.")
  const account = await tx.providerAccount.findFirst({
    where: { id: evidence.providerAccountId, organizationId: input.organizationId },
    select: { settlementLedgerAccount: { select: { id: true, organizationId: true, isActive: true, deletedAt: true, type: true, normalBalance: true, currency: true } } },
  })
  const ledger = account?.settlementLedgerAccount
  const currencyCode = input.currencyCode.trim().toUpperCase()
  if (!ledger || ledger.organizationId !== input.organizationId || !ledger.isActive || ledger.deletedAt || ledger.type !== "ASSET" || ledger.normalBalance !== "DEBIT" || (ledger.currency && ledger.currency !== currencyCode)) {
    throw new BusinessRuleError("Provider collection requires an active same-currency asset ledger mapping.")
  }
  return { ...evidence, ledgerAccountId: ledger.id, amount: new Prisma.Decimal(input.amount).toFixed(2), currencyCode }
}

export function customerSettlementPaymentAuthorityMetadata(evidence: CustomerSettlementPaymentAuthority) {
  return { version: 1, ...evidence }
}

export function assertCustomerSettlementPaymentPostingAccount(
  evidence: CustomerSettlementPaymentAuthority | null | undefined,
  lines: Array<{ accountId: string; debit: Prisma.Decimal; credit: Prisma.Decimal }>,
) {
  if (!evidence) return
  const netDebit = lines.filter(line => line.accountId === evidence.ledgerAccountId)
    .reduce((total, line) => total.plus(line.debit).minus(line.credit), new Prisma.Decimal(0))
  if (!netDebit.eq(evidence.amount)) {
    throw new BusinessRuleError("Customer collection posting must debit the confirmed provider's ledger account for the exact amount.")
  }
}

export async function claimCustomerSettlementPaymentAuthority(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; customerSettlementId: string; postingBatchId: string; evidence: CustomerSettlementPaymentAuthority },
) {
  const claim = await tx.paymentTransaction.updateMany({
    where: {
      id: input.evidence.paymentTransactionId,
      organizationId: input.organizationId,
      providerAuthorityEventId: input.evidence.providerEventId,
      providerAccountId: input.evidence.providerAccountId,
      providerTransactionId: input.evidence.providerTransactionId,
      legacyPaymentId: null,
      ledgerPostingBatchId: null,
      OR: [{ sourceType: null }, { sourceType: { not: "CUSTOMER_SETTLEMENT" } }],
      state: { in: [PaymentTransactionState.CONFIRMED, PaymentTransactionState.SETTLED] },
      amount: new Prisma.Decimal(input.evidence.amount),
      currencyCode: { equals: input.evidence.currencyCode, mode: "insensitive" },
    },
    data: { sourceType: "CUSTOMER_SETTLEMENT", sourceId: input.customerSettlementId, ledgerPostingBatchId: input.postingBatchId },
  })
  if (claim.count !== 1) throw new ConflictError("Provider receipt evidence changed or was already used.")
}

export async function assertCustomerSettlementPaymentAuthorityReplay(
  tx: Pick<Prisma.TransactionClient, "paymentTransaction" | "journalEntryLine">,
  input: { organizationId: string; settlementId: string; postingBatchId: string; paymentTransactionId: string; paymentMethod: string; amount: Prisma.Decimal; currencyCode: string; metadata: Prisma.JsonValue },
) {
  const metadata = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? input.metadata : null
  const authority = metadata?.providerAuthority
  if (!authority || typeof authority !== "object" || Array.isArray(authority) || authority.version !== 1 || authority.paymentTransactionId !== input.paymentTransactionId ||
    ![authority.providerEventId, authority.providerAccountId, authority.providerTransactionId].every(value => typeof value === "string" && value.length > 0) ||
    typeof authority.ledgerAccountId !== "string" || !authority.ledgerAccountId || authority.paymentMethod !== input.paymentMethod || authority.amount !== input.amount.toFixed(2) || authority.currencyCode !== input.currencyCode) {
    throw new ConflictError("Customer settlement provider receipt binding is incomplete.")
  }
  const native = await tx.paymentTransaction.findFirst({
    where: {
      id: input.paymentTransactionId, organizationId: input.organizationId, sourceType: "CUSTOMER_SETTLEMENT", sourceId: input.settlementId,
      ledgerPostingBatchId: input.postingBatchId, legacyPaymentId: null,
    },
    select: { providerAuthorityEventId: true, providerAccountId: true, providerTransactionId: true, amount: true, currencyCode: true },
  })
  if (!native || native.providerAuthorityEventId !== authority.providerEventId || native.providerAccountId !== authority.providerAccountId || native.providerTransactionId !== authority.providerTransactionId ||
    !native.amount.eq(input.amount) || native.currencyCode.trim().toUpperCase() !== input.currencyCode) {
    throw new ConflictError("Customer settlement provider receipt binding changed or is unavailable.")
  }
  // Historical replay binds to the original posting, not today's provider/GL
  // configuration, which may have legitimately changed after collection.
  const lines = await tx.journalEntryLine.findMany({
    where: {
      organizationId: input.organizationId, accountId: authority.ledgerAccountId,
      journalEntry: { organizationId: input.organizationId, postingBatchId: input.postingBatchId, sourceType: "CUSTOMER_SETTLEMENT", sourceId: input.settlementId, status: { in: ["POSTED", "REVERSED"] } },
    },
    select: { debit: true, credit: true, currency: true },
  })
  const netDebit = lines.reduce((total, line) => total.plus(line.debit).minus(line.credit), new Prisma.Decimal(0))
  if (!lines.length || lines.some(line => line.currency !== input.currencyCode) || !netDebit.eq(input.amount)) {
    throw new ConflictError("Customer settlement provider ledger binding changed or is unavailable.")
  }
}
