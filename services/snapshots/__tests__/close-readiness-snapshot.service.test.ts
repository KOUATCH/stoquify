import { CloseRunStatus } from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    accountingPeriod: { count: jest.fn(), findFirst: jest.fn() },
    closeRun: { count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
    closeAssuranceFinding: { count: jest.fn(), findFirst: jest.fn() },
    closeEvidenceItem: { count: jest.fn(), findFirst: jest.fn() },
  },
}))

import { db } from "@/prisma/db"

import { getCloseReadinessSnapshot } from "../close-readiness-snapshot.service"

const mockDb = db as unknown as {
  accountingPeriod: { count: jest.Mock; findFirst: jest.Mock }
  closeRun: { count: jest.Mock; aggregate: jest.Mock; findFirst: jest.Mock }
  closeAssuranceFinding: { count: jest.Mock; findFirst: jest.Mock }
  closeEvidenceItem: { count: jest.Mock; findFirst: jest.Mock }
}

const latest = new Date("2026-06-20T10:00:00.000Z")

function setupTenantCloseReadinessMocks() {
  mockDb.accountingPeriod.count.mockResolvedValue(1)
  mockDb.closeRun.count.mockImplementation(async ({ where }: { where: { status?: CloseRunStatus } }) =>
    where.status === CloseRunStatus.BLOCKED ? 0 : 1,
  )
  mockDb.closeRun.aggregate.mockResolvedValue({ _avg: { readinessScore: 95 } })
  mockDb.closeAssuranceFinding.count.mockResolvedValue(0)
  mockDb.closeEvidenceItem.count.mockResolvedValue(0)
  mockDb.accountingPeriod.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.closeRun.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.closeAssuranceFinding.findFirst.mockResolvedValue({ updatedAt: latest })
  mockDb.closeEvidenceItem.findFirst.mockResolvedValue({ updatedAt: latest })
}

describe("close readiness snapshot service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("blocks unsupported location scope before tenant-wide close queries", async () => {
    const result = await getCloseReadinessSnapshot({
      organizationId: "org-1",
      locationId: "loc-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-20T12:00:00.000Z",
    })

    expect(mockDb.accountingPeriod.count).not.toHaveBeenCalled()
    expect(mockDb.closeRun.count).not.toHaveBeenCalled()
    expect(mockDb.closeRun.aggregate).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.count).not.toHaveBeenCalled()
    expect(mockDb.closeEvidenceItem.count).not.toHaveBeenCalled()
    expect(mockDb.accountingPeriod.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeRun.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeAssuranceFinding.findFirst).not.toHaveBeenCalled()
    expect(mockDb.closeEvidenceItem.findFirst).not.toHaveBeenCalled()

    expect(result).toMatchObject({
      kind: "close.readiness",
      organizationId: "org-1",
      locationId: "loc-1",
      status: "blocked",
      uiState: "blocked",
      evidenceGrade: "blocked",
      metrics: {
        accountingPeriodCount: 0,
        openPeriodCount: 0,
        recentCloseRunCount: 0,
        certifiedCloseRunCount: 0,
        blockedCloseRunCount: 0,
        averageReadinessScore: null,
        openFindingCount: 0,
        criticalOpenFindingCount: 0,
        unavailableEvidenceCount: 0,
      },
      blockers: [
        expect.objectContaining({
          id: "close-location-scope-unsupported",
          severity: "high",
          gate: "close_readiness_scope",
        }),
      ],
    })
  })

  it("preserves tenant-wide certified close readiness", async () => {
    setupTenantCloseReadinessMocks()

    const result = await getCloseReadinessSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-20T12:00:00.000Z",
    })

    expect(mockDb.accountingPeriod.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }),
    )
    expect(mockDb.closeRun.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }),
    )
    expect(result).toMatchObject({
      kind: "close.readiness",
      organizationId: "org-1",
      locationId: null,
      status: "fresh",
      evidenceGrade: "certified",
      metrics: {
        accountingPeriodCount: 1,
        openPeriodCount: 1,
        recentCloseRunCount: 1,
        certifiedCloseRunCount: 1,
        blockedCloseRunCount: 0,
        averageReadinessScore: 95,
      },
      blockers: [],
    })
  })
})
