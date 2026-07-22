import {
  ExceptionSeverity,
  PaymentExceptionStatus,
  PaymentTransactionState,
  ProviderAccountStatus,
  ReconciliationRunStatus,
  SuspenseStatus,
  Prisma,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    providerAccount: { count: jest.fn(), findFirst: jest.fn() },
    reconciliationRun: { count: jest.fn(), findFirst: jest.fn() },
    paymentException: { count: jest.fn(), findFirst: jest.fn() },
    suspenseItem: { count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
    paymentTransaction: { count: jest.fn(), findFirst: jest.fn() },
  },
}))

import { db } from "@/prisma/db"

import { getPaymentTruthSnapshot } from "../payment-truth-snapshot.service"

const mockDb = db as unknown as {
  providerAccount: { count: jest.Mock; findFirst: jest.Mock }
  reconciliationRun: { count: jest.Mock; findFirst: jest.Mock }
  paymentException: { count: jest.Mock; findFirst: jest.Mock }
  suspenseItem: { count: jest.Mock; aggregate: jest.Mock; findFirst: jest.Mock }
  paymentTransaction: { count: jest.Mock; findFirst: jest.Mock }
}

const latest = new Date("2026-06-19T10:00:00.000Z")

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

function setupPaymentTruthMocks(input: {
  activeProviderAccountCount?: number
  recentRunCount?: number
  signedRunCount?: number
  readyForSignoffCount?: number
  openExceptionCount?: number
  criticalExceptionCount?: number
  openSuspenseCount?: number
  openSuspenseAmount?: number
  pendingTransactionCount?: number
}) {
  const values = {
    activeProviderAccountCount: 1,
    recentRunCount: 1,
    signedRunCount: 1,
    readyForSignoffCount: 0,
    openExceptionCount: 0,
    criticalExceptionCount: 0,
    openSuspenseCount: 0,
    openSuspenseAmount: 0,
    pendingTransactionCount: 0,
    ...input,
  }

  mockDb.providerAccount.count.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    where.status === ProviderAccountStatus.ACTIVE ? values.activeProviderAccountCount : values.activeProviderAccountCount,
  )
  mockDb.reconciliationRun.count.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    if (where.status === ReconciliationRunStatus.READY_FOR_SIGNOFF) return values.readyForSignoffCount
    if (where.status === ReconciliationRunStatus.SIGNED) return values.signedRunCount
    return values.recentRunCount
  })
  mockDb.paymentException.count.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    where.severity === ExceptionSeverity.CRITICAL ? values.criticalExceptionCount : values.openExceptionCount,
  )
  mockDb.suspenseItem.count.mockResolvedValue(values.openSuspenseCount)
  mockDb.suspenseItem.aggregate.mockResolvedValue({ _sum: { amount: amount(values.openSuspenseAmount) } })
  mockDb.paymentTransaction.count.mockResolvedValue(values.pendingTransactionCount)

  mockDb.providerAccount.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.reconciliationRun.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.paymentException.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.suspenseItem.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.paymentTransaction.findFirst.mockResolvedValue({ updatedAt: latest })
}

describe("payment truth snapshot service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("blocks unsupported location scope before tenant-wide payment queries", async () => {
    const result = await getPaymentTruthSnapshot({
      organizationId: "org-1",
      locationId: "loc-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-20T12:00:00.000Z",
    })

    expect(mockDb.providerAccount.count).not.toHaveBeenCalled()
    expect(mockDb.reconciliationRun.count).not.toHaveBeenCalled()
    expect(mockDb.paymentException.count).not.toHaveBeenCalled()
    expect(mockDb.suspenseItem.count).not.toHaveBeenCalled()
    expect(mockDb.paymentTransaction.count).not.toHaveBeenCalled()
    expect(mockDb.providerAccount.findFirst).not.toHaveBeenCalled()
    expect(mockDb.reconciliationRun.findFirst).not.toHaveBeenCalled()
    expect(mockDb.paymentException.findFirst).not.toHaveBeenCalled()
    expect(mockDb.suspenseItem.findFirst).not.toHaveBeenCalled()
    expect(mockDb.paymentTransaction.findFirst).not.toHaveBeenCalled()

    expect(result).toMatchObject({
      kind: "payment.truth",
      organizationId: "org-1",
      locationId: "loc-1",
      status: "blocked",
      uiState: "blocked",
      evidenceGrade: "blocked",
      metrics: {
        providerAccountCount: 0,
        activeProviderAccountCount: 0,
        recentRunCount: 0,
        readyForSignoffCount: 0,
        signedRunCount: 0,
        openExceptionCount: 0,
        criticalExceptionCount: 0,
        openSuspenseCount: 0,
        openSuspenseAmount: 0,
        pendingTransactionCount: 0,
      },
      blockers: [
        expect.objectContaining({
          id: "payment-location-scope-unsupported",
          severity: "high",
          gate: "payment_truth_scope",
          sourceTables: ["provider_accounts", "reconciliation_runs", "payment_transactions"],
        }),
      ],
    })
  })

  it("returns tenant-scoped blocked evidence when critical exceptions and suspense are open", async () => {
    setupPaymentTruthMocks({
      openExceptionCount: 3,
      criticalExceptionCount: 1,
      openSuspenseCount: 2,
      openSuspenseAmount: 15000,
      pendingTransactionCount: 4,
    })

    const result = await getPaymentTruthSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-20T12:00:00.000Z",
    })

    expect(mockDb.providerAccount.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }),
    )
    expect(mockDb.paymentTransaction.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          state: { in: expect.arrayContaining([PaymentTransactionState.PENDING]) },
        }),
      }),
    )
    expect(mockDb.paymentException.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: { in: expect.arrayContaining([PaymentExceptionStatus.OPEN]) },
          severity: ExceptionSeverity.CRITICAL,
        }),
      }),
    )
    expect(mockDb.suspenseItem.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: { in: expect.arrayContaining([SuspenseStatus.OPEN]) },
        }),
      }),
    )
    expect(result.status).toBe("blocked")
    expect(result.evidenceGrade).toBe("blocked")
    expect(result.metrics.openSuspenseAmount).toBe(15000)
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "payment-critical-exceptions-open" }),
        expect.objectContaining({ id: "payment-suspense-open" }),
      ]),
    )
    expect(result.redactions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "payment-provider-identifiers-redacted" })]),
    )
  })

  it("keeps the source hash stable when only generated time and freshness change", async () => {
    setupPaymentTruthMocks({})

    const first = await getPaymentTruthSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-20T09:00:00.000Z",
    })

    const second = await getPaymentTruthSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-21T12:00:00.000Z",
    })

    expect(first.sourceHash).toBe(second.sourceHash)
    expect(first.status).toBe("fresh")
    expect(second.status).toBe("stale")
  })
})
