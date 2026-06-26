jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __managerActionCenterProtectOptions?: Array<Record<string, unknown>>
    }
    store.__managerActionCenterProtectOptions = store.__managerActionCenterProtectOptions ?? []
    store.__managerActionCenterProtectOptions.push(options)
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["dashboard.read", "payments.reconciliation.read", "inventory.read"],
        isSuperUser: false,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/manager-action-center/manager-action-center.service", () => ({
  getManagerActionCenterData: jest.fn(),
}))

import type { ManagerActionCenterData } from "@/services/manager-action-center/manager-action-center-contracts"
import { getManagerActionCenterData } from "@/services/manager-action-center/manager-action-center.service"

import { getManagerActionCenterAction } from "../manager-action-center.actions"

const mockGetManagerActionCenterData = getManagerActionCenterData as jest.Mock

describe("manager action center actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetManagerActionCenterData.mockResolvedValue(managerActionCenterData())
  })

  it("derives tenant and actor permissions from the protected context", async () => {
    const result = await getManagerActionCenterAction({
      organizationId: "attacker-org",
      periodStart: "2026-06-01",
      maxAgeMinutes: 60,
    })

    expect(result.success).toBe(true)
    expect(mockGetManagerActionCenterData).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        actorPermissions: ["dashboard.read", "payments.reconciliation.read", "inventory.read"],
        periodStart: new Date("2026-06-01T00:00:00.000Z"),
        maxAgeMinutes: 60,
      }),
    )
  })

  it("registers the surface behind dashboard.read with audit enabled", async () => {
    await getManagerActionCenterAction({})

    const store = globalThis as typeof globalThis & {
      __managerActionCenterProtectOptions?: Array<Record<string, unknown>>
    }
    expect(store.__managerActionCenterProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "dashboard.read",
          auditResource: "KontavaManagerActionCenter",
          auditAllowed: true,
        }),
      ]),
    )
  })
})

function managerActionCenterData(): ManagerActionCenterData {
  return {
    organizationId: "org-session",
    generatedAt: "2026-06-20T10:00:00.000Z",
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    commandBrief: {
      id: "manager-daily-run-sheet:org-session",
      organizationId: "org-session",
      title: "Manager daily run sheet",
      summary: "No manager action is visible.",
      conclusion: "No manager action is visible for this tenant and permission set right now.",
      mode: "brief",
      generatedAt: "2026-06-20T10:00:00.000Z",
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-20T23:59:59.999Z",
      state: "empty",
      evidenceGrade: "operational",
      trustState: "verified",
      freshness: {
        state: "fresh",
        generatedAt: "2026-06-20T10:00:00.000Z",
        sourceMaxUpdatedAt: "2026-06-20T10:00:00.000Z",
        maxAgeMinutes: 1440,
        stale: false,
        staleReason: null,
      },
      provenance: {
        organizationId: "org-session",
        locationId: null,
        sourceKind: "tenant.operating",
        sourceHash: "tenant-hash",
        sourceModules: ["dashboard"],
        generatedAt: "2026-06-20T10:00:00.000Z",
        periodStart: "2026-06-01T00:00:00.000Z",
        periodEnd: "2026-06-20T23:59:59.999Z",
      },
      sourceModules: ["dashboard"],
      blockers: [],
      redactions: [],
      primaryAction: null,
      drillThrough: null,
      reviewState: {
        organizationId: "org-session",
        reviewerId: null,
        reviewerRole: "manager",
        state: "not_started",
        reviewedAt: null,
        previousReviewedAt: null,
        nextReviewDueAt: null,
        freshness: {
          state: "fresh",
          generatedAt: "2026-06-20T10:00:00.000Z",
          sourceMaxUpdatedAt: "2026-06-20T10:00:00.000Z",
          maxAgeMinutes: 1440,
          stale: false,
          staleReason: null,
        },
        blockers: [],
      },
    },
    runSheetGroups: [],
    kpis: [],
    insights: [],
    actionItems: [],
    actionQueue: {
      organizationId: "org-session",
      generatedAt: "2026-06-20T10:00:00.000Z",
      signals: [],
      actionItems: [],
      filteredOutCount: 0,
      summary: {
        total: 0,
        open: 0,
        assigned: 0,
        stale: 0,
        expired: 0,
        redacted: 0,
        bySeverity: {
          info: 0,
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
        byRole: {},
      },
    },
    summary: {
      total: 0,
      open: 0,
      assigned: 0,
      stale: 0,
      expired: 0,
      critical: 0,
      high: 0,
      redacted: 0,
      blocked: 0,
      overdue: 0,
      hiddenByPermission: 0,
    },
  }
}
