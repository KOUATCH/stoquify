import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { getPaymentReconciliationWorkbench } from "../payment-reconciliation-workbench.service"

jest.mock("@/prisma/db", () => ({
  db: {
    organization: { findFirst: jest.fn() },
    location: { findMany: jest.fn() },
    payment: { findMany: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  organization: { findFirst: jest.Mock }
  location: { findMany: jest.Mock }
  payment: { findMany: jest.Mock }
}

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

function payment(overrides: Partial<ReturnType<typeof basePayment>> = {}) {
  return {
    ...basePayment(),
    ...overrides,
  }
}

function basePayment() {
  return {
    id: "payment-1",
    paymentNumber: "PAY-1",
    amount: amount(10_000),
    method: PaymentMethod.MOBILE_MONEY,
    status: PaymentStatus.PAID,
    authorizationCode: null,
    mobileMoneyProvider: "MTN_MOMO",
    mobileMoneyReference: "MOMO-REF-1",
    mobileMoneyFeesAmount: amount(0),
    bankName: null,
    bankReference: null,
    transactionId: null,
    processedAt: new Date("2026-06-12T10:00:00Z"),
    createdAt: new Date("2026-06-12T10:00:00Z"),
    salesOrderId: "sale-1",
    purchaseOrderId: null,
    salesOrder: {
      orderNumber: "SO-1",
      locationId: "loc-1",
      customer: { name: "Customer One" },
    },
    purchaseOrder: null,
  }
}

describe("payment reconciliation workbench read model", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDb.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Demo Org",
      currency: "XAF",
    })
    mockedDb.location.findMany.mockResolvedValue([])
  })

  it("surfaces duplicate provider references as critical alerts and suspense-ready failures", async () => {
    mockedDb.payment.findMany.mockResolvedValue([
      payment(),
      payment({
        id: "payment-2",
        paymentNumber: "PAY-2",
        createdAt: new Date("2026-06-12T11:00:00Z"),
      }),
    ])

    const workbench = await getPaymentReconciliationWorkbench({
      organizationId: "org-1",
      period: "7d",
    })

    expect(workbench.duplicateProviderReferenceAlerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rail: PaymentMethod.MOBILE_MONEY,
          providerReference: "MOMO-REF-1",
          count: 2,
          amount: 20_000,
        }),
      ]),
    )
    expect(workbench.failureGroupsByRail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rail: PaymentMethod.MOBILE_MONEY,
          type: "DUPLICATE_INTERNAL_PROVIDER_REFERENCE",
          severity: "critical",
        }),
      ]),
    )
    expect(workbench.summary.criticalFailureCount).toBeGreaterThan(0)
    expect(workbench.suspenseReadyFailures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          suspenseType: "duplicate_provider_id",
          suspenseAccountHint: "47x",
          readiness: "ready_for_suspense",
        }),
      ]),
    )
  })

  it("classifies missing provider evidence for electronic payments", async () => {
    mockedDb.payment.findMany.mockResolvedValue([
      payment({
        method: PaymentMethod.CARD,
        authorizationCode: null,
        mobileMoneyProvider: null,
        mobileMoneyReference: null,
        transactionId: null,
      }),
    ])

    const workbench = await getPaymentReconciliationWorkbench({
      organizationId: "org-1",
      period: "7d",
    })

    expect(workbench.summary.providerReferenceCoverage).toBe(0)
    expect(workbench.suspenseReadyFailures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rail: PaymentMethod.CARD,
          type: "MISSING_PROVIDER_REFERENCE",
          suspenseType: "missing_provider_reference",
          amount: 10_000,
        }),
      ]),
    )
  })
})
