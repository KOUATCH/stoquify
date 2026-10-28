import {
  PaymentDirection,
  PaymentMethod,
  PaymentRailType,
  PaymentTransactionState,
  ProviderAccountStatus,
  ProviderEventStatus,
  Prisma,
} from "@prisma/client"

import {
  claimPOSElectronicTenderAuthority,
  resolvePOSElectronicTenderAuthority,
} from "../pos-electronic-tender-authority.service"

function transactionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-transaction-1",
    organizationId: "org-1",
    legacyPaymentId: null,
    providerAccountId: "provider-account-1",
    providerAuthorityEventId: "provider-event-1",
    direction: PaymentDirection.INBOUND,
    state: PaymentTransactionState.CONFIRMED,
    amount: new Prisma.Decimal("118.00"),
    currencyCode: "XAF",
    providerTransactionId: "provider-tx-1",
    providerReference: "provider-ref-1",
    confirmedAt: new Date("2026-08-18T09:00:00.000Z"),
    providerAccount: {
      id: "provider-account-1",
      organizationId: "org-1",
      providerCode: "CARD_ACQUIRER",
      displayName: "Approved acquirer",
      status: ProviderAccountStatus.ACTIVE,
      currencyCode: "XAF",
      paymentRail: {
        organizationId: "org-1",
        type: PaymentRailType.CARD,
        currencyCode: "XAF",
        isActive: true,
      },
    },
    providerAuthorityEvent: {
      id: "provider-event-1",
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      providerTransactionId: "provider-tx-1",
      providerReference: "provider-ref-1",
      status: ProviderEventStatus.PROCESSED,
      signatureValid: true,
      direction: PaymentDirection.INBOUND,
      amount: new Prisma.Decimal("118.00"),
      currencyCode: "XAF",
      occurredAt: new Date("2026-08-18T08:59:58.000Z"),
    },
    ...overrides,
  }
}

function buildTx() {
  return {
    paymentTransaction: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as Prisma.TransactionClient & {
    paymentTransaction: {
      findFirst: jest.Mock
      updateMany: jest.Mock
    }
  }
}

const authorityInput = {
  organizationId: "org-1",
  paymentMethod: PaymentMethod.CARD,
  paymentTransactionId: "payment-transaction-1",
  amount: new Prisma.Decimal("118.00"),
  currencyCode: "XAF",
}

describe("POS electronic tender provider authority", () => {
  it.each([PaymentMethod.CASH, PaymentMethod.CREDIT])(
    "retains %s behavior without consulting provider evidence",
    async (paymentMethod) => {
      const tx = buildTx()

      await expect(resolvePOSElectronicTenderAuthority(tx, {
        ...authorityInput,
        paymentMethod,
        paymentTransactionId: undefined,
      })).resolves.toBeNull()

      expect(tx.paymentTransaction.findFirst).not.toHaveBeenCalled()
    },
  )

  it("accepts processed signed provider evidence and claims it for one legacy payment", async () => {
    const tx = buildTx()
    tx.paymentTransaction.findFirst.mockResolvedValue(transactionFixture())
    tx.paymentTransaction.updateMany.mockResolvedValue({ count: 1 })

    const evidence = await resolvePOSElectronicTenderAuthority(tx, authorityInput)

    expect(evidence).toMatchObject({
      paymentTransactionId: "payment-transaction-1",
      providerEventId: "provider-event-1",
      providerAccountId: "provider-account-1",
      providerTransactionId: "provider-tx-1",
      providerReference: "provider-ref-1",
      state: PaymentTransactionState.CONFIRMED,
    })
    expect(tx.paymentTransaction.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "payment-transaction-1",
        organizationId: "org-1",
      },
    }))

    await claimPOSElectronicTenderAuthority(tx, {
      organizationId: "org-1",
      legacyPaymentId: "payment-1",
      evidence: evidence!,
    })
    expect(tx.paymentTransaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "payment-transaction-1",
        organizationId: "org-1",
        providerAuthorityEventId: "provider-event-1",
        legacyPaymentId: null,
      }),
      data: { legacyPaymentId: "payment-1" },
    })
  })

  it.each([
    PaymentTransactionState.PENDING,
    PaymentTransactionState.PROCESSING,
    PaymentTransactionState.UNKNOWN,
  ])("rejects pending provider transaction state %s", async (state) => {
    const tx = buildTx()
    tx.paymentTransaction.findFirst.mockResolvedValue(transactionFixture({ state }))

    await expect(resolvePOSElectronicTenderAuthority(tx, authorityInput)).rejects.toThrow(
      "still pending provider confirmation",
    )
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it.each([
    PaymentTransactionState.FAILED,
    PaymentTransactionState.CANCELLED,
    PaymentTransactionState.DISPUTED,
  ])("rejects failed or disputed provider transaction state %s", async (state) => {
    const tx = buildTx()
    tx.paymentTransaction.findFirst.mockResolvedValue(transactionFixture({ state }))

    await expect(resolvePOSElectronicTenderAuthority(tx, authorityInput)).rejects.toThrow(
      "rejected or is no longer capturable",
    )
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it("rejects an explicitly rejected provider event", async () => {
    const tx = buildTx()
    tx.paymentTransaction.findFirst.mockResolvedValue(transactionFixture({
      providerAuthorityEvent: {
        ...transactionFixture().providerAuthorityEvent,
        status: ProviderEventStatus.REJECTED,
      },
    }))

    await expect(resolvePOSElectronicTenderAuthority(tx, authorityInput)).rejects.toThrow(
      "provider event was rejected",
    )
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it.each([ProviderEventStatus.RECEIVED, ProviderEventStatus.VERIFIED])(
    "rejects provider event state %s while processing is pending",
    async (status) => {
      const tx = buildTx()
      tx.paymentTransaction.findFirst.mockResolvedValue(transactionFixture({
        providerAuthorityEvent: {
          ...transactionFixture().providerAuthorityEvent,
          status,
        },
      }))

      await expect(resolvePOSElectronicTenderAuthority(tx, authorityInput)).rejects.toThrow(
        "provider event is still pending processing",
      )
      expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
    },
  )

  it("fails closed when a transaction id resolves outside the requested tenant", async () => {
    const tx = buildTx()
    tx.paymentTransaction.findFirst.mockResolvedValue(transactionFixture({ organizationId: "org-2" }))

    await expect(resolvePOSElectronicTenderAuthority(tx, authorityInput)).rejects.toThrow(
      "was not found for this organization",
    )
    expect(tx.paymentTransaction.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1" }),
    }))
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it("rejects a provider amount mismatch before claiming the evidence", async () => {
    const tx = buildTx()
    tx.paymentTransaction.findFirst.mockResolvedValue(transactionFixture({
      amount: new Prisma.Decimal("117.00"),
    }))

    await expect(resolvePOSElectronicTenderAuthority(tx, authorityInput)).rejects.toThrow(
      "amount or currency does not match",
    )
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it("fails closed when a concurrent sale already claimed the provider evidence", async () => {
    const tx = buildTx()
    tx.paymentTransaction.findFirst.mockResolvedValue(transactionFixture())
    tx.paymentTransaction.updateMany.mockResolvedValue({ count: 0 })
    const evidence = await resolvePOSElectronicTenderAuthority(tx, authorityInput)

    await expect(claimPOSElectronicTenderAuthority(tx, {
      organizationId: "org-1",
      legacyPaymentId: "payment-1",
      evidence: evidence!,
    })).rejects.toThrow("changed or was already used")
  })
})
