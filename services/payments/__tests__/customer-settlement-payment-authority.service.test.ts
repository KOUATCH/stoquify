import { PaymentDirection, PaymentMethod, PaymentRailType, PaymentTransactionState, ProviderAccountStatus, ProviderEventStatus, Prisma } from "@prisma/client"

import {
  assertCustomerSettlementPaymentAuthorityReplay,
  assertCustomerSettlementPaymentPostingAccount,
  claimCustomerSettlementPaymentAuthority,
  resolveCustomerSettlementPaymentAuthority,
  type CustomerSettlementPaymentAuthority,
} from "../customer-settlement-payment-authority.service"

const AUTHORITY: CustomerSettlementPaymentAuthority = {
  paymentMethod: "BANK_TRANSFER", paymentTransactionId: "native-1", providerEventId: "event-1", providerAccountId: "account-1", providerTransactionId: "provider-tx-1",
  providerReference: "bank-ref-1", providerName: "Synthetic bank", mobileMoneyProvider: null, state: "CONFIRMED", ledgerAccountId: "bank-gl", amount: "100.00", currencyCode: "XAF",
}

function harness() {
  const ledger = { id: "bank-gl", organizationId: "org-1", isActive: true, deletedAt: null, type: "ASSET", normalBalance: "DEBIT", currency: "XAF" }
  const native = { id: "native-1", organizationId: "org-1", legacyPaymentId: null, ledgerPostingBatchId: null, sourceType: null,
    providerAccountId: "account-1", providerAuthorityEventId: "event-1", direction: PaymentDirection.INBOUND, state: PaymentTransactionState.CONFIRMED,
    amount: new Prisma.Decimal(100), currencyCode: "XAF", providerTransactionId: "provider-tx-1", providerReference: "bank-ref-1", confirmedAt: new Date("2026-10-20T10:00:00Z"),
    providerAccount: { id: "account-1", organizationId: "org-1", providerCode: "BANK", displayName: "Synthetic bank", status: ProviderAccountStatus.ACTIVE, currencyCode: "XAF",
      paymentRail: { organizationId: "org-1", type: PaymentRailType.BANK_TRANSFER, currencyCode: "XAF", isActive: true } },
    providerAuthorityEvent: { id: "event-1", organizationId: "org-1", providerAccountId: "account-1", providerTransactionId: "provider-tx-1", providerReference: "bank-ref-1", status: ProviderEventStatus.PROCESSED,
      signatureValid: true, occurredAt: new Date("2026-10-20T09:00:00Z"), direction: PaymentDirection.INBOUND, amount: new Prisma.Decimal(100), currencyCode: "XAF" } }
  const tx = { $queryRaw: jest.fn().mockResolvedValue([{ id: "native-1" }]), paymentTransaction: { findFirst: jest.fn().mockResolvedValue(native), updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, providerAccount: { findFirst: jest.fn().mockResolvedValue({ settlementLedgerAccount: ledger }) },
    journalEntryLine: { findMany: jest.fn().mockResolvedValue([{ debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF" }]) } }
  return { tx, native, ledger }
}
const INPUT = { organizationId: "org-1", paymentMethod: PaymentMethod.BANK_TRANSFER, paymentTransactionId: "native-1", amount: new Prisma.Decimal(100), currencyCode: "XAF" }
const REPLAY = { organizationId: "org-1", settlementId: "settlement-1", postingBatchId: "batch-1", paymentTransactionId: "native-1", paymentMethod: "BANK_TRANSFER", amount: new Prisma.Decimal(100), currencyCode: "XAF", metadata: { providerAuthority: { version: 1, ...AUTHORITY } } }

describe("customer settlement provider authority", () => {
  it("does not read provider records for a manual collection", async () => {
    const { tx } = harness()
    await expect(resolveCustomerSettlementPaymentAuthority(tx as never, { ...INPUT, paymentTransactionId: undefined })).resolves.toBeNull()
    expect(tx.paymentTransaction.findFirst).not.toHaveBeenCalled()
    expect(tx.$queryRaw).not.toHaveBeenCalled()
    expect(tx.providerAccount.findFirst).not.toHaveBeenCalled()
  })

  it("reuses native provider validation and derives the exact canonical GL mapping", async () => {
    const { tx } = harness()
    await expect(resolveCustomerSettlementPaymentAuthority(tx as never, INPUT)).resolves.toEqual(AUTHORITY)
    expect(tx.providerAccount.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "account-1", organizationId: "org-1" } }))
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.paymentTransaction.findFirst.mock.invocationCallOrder[0])
    expect(tx.$queryRaw.mock.calls[0][0].values).toEqual(["org-1", "native-1"])
  })

  it("does not read another tenant's native authority when the scoped row lock finds nothing", async () => {
    const { tx } = harness()
    tx.$queryRaw.mockResolvedValue([])
    await expect(resolveCustomerSettlementPaymentAuthority(tx as never, INPUT)).rejects.toThrow("not found for this organization")
    expect(tx.paymentTransaction.findFirst).not.toHaveBeenCalled()
  })

  it.each([
    null,
    { organizationId: "foreign-org" },
    { isActive: false },
    { deletedAt: new Date("2026-10-21T00:00:00Z") },
    { type: "LIABILITY" },
    { normalBalance: "CREDIT" },
    { currency: "EUR" },
  ])("rejects an unavailable or incompatible provider GL mapping: %j", async override => {
    const { tx, ledger } = harness()
    tx.providerAccount.findFirst.mockResolvedValue({ settlementLedgerAccount: override === null ? null : { ...ledger, ...override } } as never)
    await expect(resolveCustomerSettlementPaymentAuthority(tx as never, INPUT)).rejects.toThrow("active same-currency asset ledger mapping")
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it("requires the exact provider-account net debit without adding a second posting", () => {
    expect(() => assertCustomerSettlementPaymentPostingAccount(AUTHORITY, [{ accountId: "bank-gl", debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0) }])).not.toThrow()
    expect(() => assertCustomerSettlementPaymentPostingAccount(AUTHORITY, [{ accountId: "other-bank", debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0) }])).toThrow("confirmed provider's ledger")
    expect(() => assertCustomerSettlementPaymentPostingAccount(AUTHORITY, [{ accountId: "bank-gl", debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(1) }])).toThrow("exact amount")
  })

  it("claims only a current unclaimed native record and leaves provider money state unchanged", async () => {
    const { tx } = harness()
    await claimCustomerSettlementPaymentAuthority(tx as never, { organizationId: "org-1", customerSettlementId: "settlement-1", postingBatchId: "batch-1", evidence: AUTHORITY })
    expect(tx.paymentTransaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "native-1", organizationId: "org-1", providerAuthorityEventId: "event-1", providerAccountId: "account-1", providerTransactionId: "provider-tx-1",
        legacyPaymentId: null, ledgerPostingBatchId: null, state: { in: [PaymentTransactionState.CONFIRMED, PaymentTransactionState.SETTLED] }, amount: new Prisma.Decimal(100), currencyCode: { equals: "XAF", mode: "insensitive" } }),
      data: { sourceType: "CUSTOMER_SETTLEMENT", sourceId: "settlement-1", ledgerPostingBatchId: "batch-1" },
    })
    expect(tx.paymentTransaction.updateMany.mock.calls[0][0].data).not.toHaveProperty("state")
  })

  it("rejects a claim lost to another workflow", async () => {
    const { tx } = harness()
    tx.paymentTransaction.updateMany.mockResolvedValue({ count: 0 })
    await expect(claimCustomerSettlementPaymentAuthority(tx as never, { organizationId: "org-1", customerSettlementId: "settlement-1", postingBatchId: "batch-1", evidence: AUTHORITY })).rejects.toThrow("changed or was already used")
  })

  it("treats a later provider state as historical without releasing the original claim", async () => {
    const { tx, native } = harness()
    tx.paymentTransaction.findFirst.mockResolvedValue({ ...native, state: PaymentTransactionState.REFUNDED } as never)
    await expect(assertCustomerSettlementPaymentAuthorityReplay(tx as never, REPLAY)).resolves.toBeUndefined()
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "native-1", organizationId: "org-1", sourceType: "CUSTOMER_SETTLEMENT", sourceId: "settlement-1", ledgerPostingBatchId: "batch-1", legacyPaymentId: null } }))
  })

  it.each([null, {}, { providerAuthority: { version: 1, paymentTransactionId: "other-native" } }, { providerAuthority: { version: 1, paymentTransactionId: "native-1", providerEventId: null } }])("rejects incomplete retained replay authority: %j", async metadata => {
    const { tx } = harness()
    await expect(assertCustomerSettlementPaymentAuthorityReplay(tx as never, { ...REPLAY, metadata })).rejects.toThrow("binding is incomplete")
    expect(tx.paymentTransaction.findFirst).not.toHaveBeenCalled()
  })

  it.each([{ providerAuthorityEventId: "different-event" }, { providerAccountId: "different-account" }, { providerTransactionId: "different-provider-id" }, { amount: new Prisma.Decimal(99) }, { currencyCode: "EUR" }])("rejects changed native replay evidence: %j", async override => {
    const { tx, native } = harness()
    tx.paymentTransaction.findFirst.mockResolvedValue({ ...native, ...override } as never)
    await expect(assertCustomerSettlementPaymentAuthorityReplay(tx as never, REPLAY)).rejects.toThrow("binding changed or is unavailable")
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it.each([{ amount: "not-a-number" }, { currencyCode: "EUR" }, { paymentMethod: "CARD" }, { ledgerAccountId: "" }])("rejects malformed or inconsistent captured receipt fields with a canonical conflict: %j", async override => {
    const { tx } = harness()
    await expect(assertCustomerSettlementPaymentAuthorityReplay(tx as never, { ...REPLAY, metadata: { providerAuthority: { version: 1, ...AUTHORITY, ...override } } })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(tx.paymentTransaction.findFirst).not.toHaveBeenCalled()
  })

  it("validates the captured ledger account against exact original posting lines", async () => {
    const { tx } = harness()
    await assertCustomerSettlementPaymentAuthorityReplay(tx as never, REPLAY)
    expect(tx.journalEntryLine.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", accountId: "bank-gl", journalEntry: { organizationId: "org-1", postingBatchId: "batch-1", sourceType: "CUSTOMER_SETTLEMENT", sourceId: "settlement-1", status: { in: ["POSTED", "REVERSED"] } } },
      select: { debit: true, credit: true, currency: true },
    })
  })

  it.each([{ lines: [] }, { lines: [{ debit: new Prisma.Decimal(99), credit: new Prisma.Decimal(0), currency: "XAF" }] }, { lines: [{ debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "EUR" }] }])("rejects missing or changed original posting lines: %j", async ({ lines }) => {
    const { tx } = harness()
    tx.journalEntryLine.findMany.mockResolvedValue(lines)
    await expect(assertCustomerSettlementPaymentAuthorityReplay(tx as never, REPLAY)).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("keeps historical replay valid after a current provider mapping is changed", async () => {
    const { tx } = harness()
    tx.providerAccount.findFirst.mockResolvedValue({ settlementLedgerAccount: { id: "new-bank-gl", organizationId: "org-1", isActive: false, deletedAt: null, type: "ASSET", normalBalance: "DEBIT", currency: "EUR" } })
    await expect(assertCustomerSettlementPaymentAuthorityReplay(tx as never, REPLAY)).resolves.toBeUndefined()
    expect(tx.providerAccount.findFirst).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })
})
