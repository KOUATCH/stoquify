import { PaymentMethod, Prisma, SupplierInvoiceStatus, SupplierPaymentStatus } from "@prisma/client"

import { HistoryCursorError, type HistoryCursorCodec } from "@/services/history/transaction-history.types"
import { readAPHistory } from "@/services/purchasing/ap-history.service"

const now = new Date("2026-07-17T10:00:00.000Z")
const recordedThrough = new Date("2026-07-17T09:00:00.000Z")

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

function cursorCodec(payload?: ReturnType<HistoryCursorCodec["decode"]>): HistoryCursorCodec {
  return {
    encode: jest.fn(() => "next-cursor"),
    decode: jest.fn(() => {
      if (!payload) throw new Error("Unexpected cursor decode")
      return payload
    }),
  }
}

function mockClient(overrides: {
  invoiceRows?: unknown[]
  paymentRows?: unknown[]
  invoiceSummaryRows?: unknown[]
  paymentSummaryRows?: unknown[]
} = {}) {
  const invoiceRows = overrides.invoiceRows ?? [
    {
      id: "invoice-1",
      organizationId: "org-1",
      supplierId: "supplier-1",
      supplier: { id: "supplier-1", name: "Supplier One" },
      purchaseOrderId: "po-1",
      invoiceNumber: "INV-001",
      invoiceDate: new Date("2026-07-10T00:00:00.000Z"),
      dueDate: new Date("2026-07-31T00:00:00.000Z"),
      status: SupplierInvoiceStatus.POSTED,
      total: decimal("100.00"),
      amountPaid: decimal("40.00"),
      currency: "XAF",
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      documentHash: "sha256:invoice",
      evidenceHash: "sha256:evidence",
      notes: "invoice note",
      createdAt: new Date("2026-07-10T08:00:00.000Z"),
    },
  ]
  const paymentRows = overrides.paymentRows ?? [
    {
      id: "payment-1",
      organizationId: "org-1",
      supplierId: "supplier-1",
      supplier: { id: "supplier-1", name: "Supplier One" },
      bankAccount: {
        bankName: "Bank",
        accountNumberMasked: "****1234",
        mobileMoneyProvider: null,
        mobileMoneyPhoneMasked: null,
      },
      paymentNumber: "PAY-001",
      status: SupplierPaymentStatus.RELEASED,
      method: PaymentMethod.BANK_TRANSFER,
      amount: decimal("40.00"),
      currency: "XAF",
      paymentDate: new Date("2026-07-12T00:00:00.000Z"),
      ledgerPostingBatchId: "batch-2",
      postedBusinessEventId: "event-2",
      documentHash: "sha256:payment",
      evidenceHash: "sha256:payment-evidence",
      notes: "payment note",
      createdAt: new Date("2026-07-12T08:00:00.000Z"),
    },
  ]

  return {
    organization: {
      findFirst: jest.fn().mockResolvedValue({ id: "org-1", timezone: "Africa/Douala", currency: "XAF" }),
    },
    supplierInvoice: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce(invoiceRows)
        .mockResolvedValueOnce(overrides.invoiceSummaryRows ?? invoiceRows),
    },
    supplierPayment: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce(paymentRows)
        .mockResolvedValueOnce(overrides.paymentSummaryRows ?? paymentRows),
    },
  }
}

describe("readAPHistory", () => {
  it("returns supplier invoice and payment rows with signed AP movement and redacted bank destination", async () => {
    const client = mockClient()

    const result = await readAPHistory(
      {
        organizationId: "org-1",
        actorUserId: "user-1",
        actorPermissions: ["purchasing.ap.invoice.view"],
        filters: { pageSize: 25 },
      },
      { client: client as never, cursorCodec: cursorCodec(), now: () => now, recordedThrough },
    )

    expect(result.rows).toHaveLength(2)
    expect(result.rows.map((row) => row.signedPayableMovement)).toEqual(["-40.00", "100.00"])
    expect(result.rows[0]).toMatchObject({
      lane: "payment",
      payment: {
        bankDestination: "[REDACTED:BANK]",
        redactions: [expect.objectContaining({ category: "supplier_bank_detail" })],
      },
    })
    expect(result.summary).toMatchObject({
      transactionCount: 2,
      invoiceTotal: "100.00",
      paidTotal: "40.00",
      releasedPaymentTotal: "40.00",
      openPayable: "60.00",
      ledgerBlockerCount: 0,
    })
    expect(result.pageInfo).toEqual({ nextCursor: null, hasMore: false })
  })

  it("rejects a cursor from another tenant before querying AP rows", async () => {
    const client = mockClient()

    await expect(
      readAPHistory(
        {
          organizationId: "org-1",
          actorUserId: "user-1",
          actorPermissions: ["purchasing.ap.invoice.view"],
          filters: { cursor: "foreign-cursor", pageSize: 25 },
        },
        {
          client: client as never,
          cursorCodec: cursorCodec({
            v: 1,
            scope: "transaction-history",
            tenantId: "org-2",
            adapterId: "supplier-ap-history.v1",
            filterHash: "0".repeat(64),
            recordedThrough: recordedThrough.toISOString(),
            effectiveAt: "2026-07-12T00:00:00.000Z",
            recordedAt: "2026-07-12T08:00:00.000Z",
            id: "payment-1",
          }),
          now: () => now,
        },
      ),
    ).rejects.toBeInstanceOf(HistoryCursorError)

    expect(client.supplierInvoice.findMany).not.toHaveBeenCalled()
    expect(client.supplierPayment.findMany).not.toHaveBeenCalled()
  })
})
