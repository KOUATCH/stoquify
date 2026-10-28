import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"

import {
  assertNoDuplicateProviderCapture,
  reconcileSettlementBatch,
  resolveProviderCaptureEvidence,
} from "../payment-reconciliation.service"

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

describe("payment reconciliation hardening", () => {
  it("detects duplicate MoMo provider references as critical suspense", () => {
    const result = reconcileSettlementBatch({
      organizationId: "org-1",
      rail: PaymentMethod.MOBILE_MONEY,
      settlementBatchId: "batch-momo-1",
      settlementReference: "MOMO-SETTLE-1",
      payments: [
        {
          id: "payment-1",
          paymentNumber: "PAY-1",
          amount: amount(10_000),
          method: PaymentMethod.MOBILE_MONEY,
          status: PaymentStatus.PAID,
          mobileMoneyProvider: "MTN_MOMO",
          mobileMoneyReference: "MOMO-REF-1",
        },
        {
          id: "payment-2",
          paymentNumber: "PAY-2",
          amount: amount(10_000),
          method: PaymentMethod.MOBILE_MONEY,
          status: PaymentStatus.PAID,
          mobileMoneyProvider: "MTN_MOMO",
          mobileMoneyReference: "momo-ref-1",
        },
      ],
      providerLines: [
        {
          id: "provider-1",
          providerReference: "MOMO-REF-1",
          amount: amount(10_000),
        },
      ],
    })

    expect(result.isClean).toBe(false)
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "DUPLICATE_INTERNAL_PROVIDER_REFERENCE",
          severity: "critical",
          providerReference: "MOMO-REF-1",
        }),
      ]),
    )
    expect(result.suspenseItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "duplicate_provider_id",
          amount: "20000.00",
        }),
      ]),
    )
  })

  it("detects card amount mismatches between internal capture and acquirer settlement", () => {
    const result = reconcileSettlementBatch({
      organizationId: "org-1",
      rail: PaymentMethod.CARD,
      settlementBatchId: "batch-card-1",
      settlementReference: "CARD-SETTLE-1",
      settlementGrossAmount: amount(9_950),
      expectedFeesAmount: amount(50),
      payments: [
        {
          id: "payment-card-1",
          paymentNumber: "PAY-CARD-1",
          amount: amount(10_000),
          method: PaymentMethod.CARD,
          status: PaymentStatus.PAID,
          authorizationCode: "AUTH-1",
        },
      ],
      providerLines: [
        {
          id: "provider-card-1",
          providerReference: "AUTH-1",
          amount: amount(9_950),
          feesAmount: amount(50),
        },
      ],
    })

    expect(result.isClean).toBe(false)
    expect(result.failures.map((failure) => failure.type)).toEqual(
      expect.arrayContaining(["AMOUNT_MISMATCH"]),
    )
    expect(result.suspenseItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "amount_mismatch",
          amount: "50.00",
          providerReference: "AUTH-1",
        }),
      ]),
    )
  })

  it("detects bank transfer settlement shortfalls and orphan provider lines", () => {
    const result = reconcileSettlementBatch({
      organizationId: "org-1",
      rail: PaymentMethod.BANK_TRANSFER,
      settlementBatchId: "batch-bank-1",
      settlementReference: "BANK-SETTLE-1",
      settlementGrossAmount: amount(25_000),
      payments: [
        {
          id: "payment-bank-1",
          paymentNumber: "PAY-BANK-1",
          amount: amount(20_000),
          method: PaymentMethod.BANK_TRANSFER,
          status: PaymentStatus.PAID,
          bankReference: "BANK-REF-1",
        },
      ],
      providerLines: [
        {
          id: "provider-bank-1",
          providerReference: "BANK-REF-1",
          amount: amount(20_000),
        },
        {
          id: "provider-bank-orphan",
          providerReference: "BANK-REF-ORPHAN",
          amount: amount(1_000),
        },
      ],
    })

    expect(result.isClean).toBe(false)
    expect(result.failures.map((failure) => failure.type)).toEqual(
      expect.arrayContaining(["UNMATCHED_PROVIDER_REFERENCE", "SETTLEMENT_GROSS_MISMATCH"]),
    )
    expect(result.suspenseItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "unmatched_provider_line", amount: "1000.00" }),
        expect.objectContaining({ type: "settlement_shortfall", amount: "4000.00" }),
      ]),
    )
  })

  it("blocks duplicate provider capture before creating a payment row", async () => {
    const tx = {
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          id: "payment-existing",
          paymentNumber: "PAY-EXISTING",
        }),
      },
    } as unknown as Prisma.TransactionClient
    const capture = resolveProviderCaptureEvidence({
      organizationId: "org-1",
      paymentMethod: PaymentMethod.CARD,
      reference: "AUTH-1",
    })

    await expect(assertNoDuplicateProviderCapture(tx, capture!)).rejects.toThrow(/already been captured/i)
  })
})
