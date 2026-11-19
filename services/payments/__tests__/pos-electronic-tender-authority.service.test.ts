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
  lockElectronicTenderAuthoritiesInTx,
  resolvePOSElectronicTenderAuthority,
} from "../pos-electronic-tender-authority.service"

function transactionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-transaction-1",
    organizationId: "org-1",
    legacyPaymentId: null,
    ledgerPostingBatchId: null,
    sourceType: null,
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
    $queryRaw: jest.fn().mockResolvedValue([{ id: "payment-transaction-1" }]),
    paymentTransaction: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as Prisma.TransactionClient & {
    $queryRaw: jest.Mock
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
  it("locks each distinct native receipt in sorted order within its exact organization", async () => {
    const tx = buildTx()
    await lockElectronicTenderAuthoritiesInTx(tx, {
      organizationId: "org-1",
      paymentTransactionIds: ["receipt-b", " receipt-a ", "receipt-b"],
    })
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2)
    expect(tx.$queryRaw.mock.calls.map(([query]) => query.values)).toEqual([
      ["org-1", "receipt-a"], ["org-1", "receipt-b"],
    ])
    for (const [query] of tx.$queryRaw.mock.calls) {
      expect(query.sql.replace(/\s+/g, " ").trim()).toBe('SELECT "id" FROM "payment_transactions" WHERE "organizationId" = ? AND "id" = ? FOR UPDATE')
    }
    expect(tx.paymentTransaction.findFirst).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it("performs no native query for an empty cash or credit receipt set", async () => {
    const tx = buildTx()
    await lockElectronicTenderAuthoritiesInTx(tx, { organizationId: "org-1", paymentTransactionIds: [] })
    expect(tx.$queryRaw).not.toHaveBeenCalled()
  })

  it("rejects an absent or foreign native receipt before resolving or claiming any proof", async () => {
    const tx = buildTx()
    tx.$queryRaw.mockResolvedValueOnce([])
    await expect(lockElectronicTenderAuthoritiesInTx(tx, { organizationId: "org-1", paymentTransactionIds: ["foreign-receipt"] }))
      .rejects.toThrow("was not found for this organization")
    expect(tx.$queryRaw.mock.calls[0][0].values).toEqual(["org-1", "foreign-receipt"])
    expect(tx.paymentTransaction.findFirst).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

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
        ledgerPostingBatchId: null,
        OR: [{ sourceType: null }, { sourceType: { not: "CUSTOMER_SETTLEMENT" } }],
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

  it.each([
    { ledgerPostingBatchId: "customer-settlement-batch" },
    { sourceType: "CUSTOMER_SETTLEMENT" },
  ])("rejects provider evidence already claimed by another financial workflow: %j", async (claim) => {
    const tx = buildTx()
    tx.paymentTransaction.findFirst.mockResolvedValue(transactionFixture(claim))
    await expect(resolvePOSElectronicTenderAuthority(tx, authorityInput)).rejects.toThrow("already been used")
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })
})
