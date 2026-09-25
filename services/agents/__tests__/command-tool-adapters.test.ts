jest.mock("server-only", () => ({}))

import type { AgentExecutionContext } from "../agent-contracts"
import {
  CommandToolAdapterError,
  readRoleDailyDigest,
} from "../tools/command-tool-adapters"
import type { DailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest-contracts"

describe("readRoleDailyDigest", () => {
  it.each(["en", "fr"] as const)("accepts a localized Digest handoff while keeping canonical agent routes (%s)", async locale => {
    const data = digestData()
    data.digests[0].risks[0].drillThrough = { available: true, type: "route", label: "Source", href: `/${locale}/dashboard/purchase-orders`, requiredPermission: "dashboard.read" }
    const loadDigest = jest.fn().mockResolvedValue(data)
    const result = await readRoleDailyDigest({ digestId: "manager-run-sheet" }, { ...context(), locale }, { loadDigest })
    expect(result.output.priorities[0].href).toBe("/dashboard/purchase-orders")
    expect(loadDigest).toHaveBeenCalledWith(expect.objectContaining({ locale }))
  })

  it("requires every source permission before projecting its details", async () => {
    const data = digestData()
    data.digests[0].risks[0].drillThrough.additionalRequiredPermissions = ["payroll.command.read"]
    const denied = await readRoleDailyDigest({ digestId: "manager-run-sheet" }, context(), { loadDigest: async () => data })
    expect(denied.output.priorities).toHaveLength(0)
    const allowed = await readRoleDailyDigest({ digestId: "manager-run-sheet" }, { ...context(), permissions: ["dashboard.read", "payroll.command.read"] }, { loadDigest: async () => data })
    expect(allowed.output.priorities).toHaveLength(1)
  })

  it.each(["/dashboard/../admin", "/en/dashboard/%2e%2e/admin", "/dashboard/\\evil", "/dashboard//evil", "//evil.invalid/dashboard/a", "https://evil.invalid/dashboard/a", "/de/dashboard/a", "/dashboard/a?next=https://evil.invalid", "/dashboard/a#fragment"])("rejects unsafe or unsupported source routes: %s", async href => {
    const data = digestData()
    data.digests[0].risks[0].drillThrough = { available: true, type: "route", label: "Source", href, requiredPermission: "dashboard.read" }
    await expect(readRoleDailyDigest({ digestId: "manager-run-sheet" }, context(), { loadDigest: async () => data })).rejects.toMatchObject({ code: "UNAUTHORIZED_DIGEST_FIELD" })
  })

  it("binds weekly evidence identity to the selected digest period", async () => {
    const data = digestData()
    data.digests[0].id = "weekly"
    data.digests[0].periodStart = "2026-07-16T00:00:00.000Z"
    const result = await readRoleDailyDigest({ digestId: "weekly" }, context(), { loadDigest: async () => data })
    expect(result.output.periodStart).toBe("2026-07-16T00:00:00.000Z")
    expect(result.output.evidence[0].subjectId).toBe("org-pilot:weekly:2026-07-16T00:00:00.000Z:2026-07-22T23:59:59.999Z")
  })
  it("returns only permission-allowed priorities and an allowlisted evidence projection", async () => {
    const result = await readRoleDailyDigest(
      { digestId: "manager-run-sheet" },
      context(),
      { loadDigest: async () => digestData() },
    )

    expect(result.output.priorities.map((item) => item.id)).toEqual(["dashboard-risk"])
    expect(JSON.stringify(result.output)).not.toContain("provider-secret")
    expect(result.output.evidence).toHaveLength(1)
    expect(result.output.priorities[0].evidenceIds).toEqual([result.output.evidence[0].id])
  })

  it("passes trusted actor authority evidence to the digest service", async () => {
    const loadDigest = jest.fn().mockResolvedValue(digestData())

    await readRoleDailyDigest(
      { digestId: "manager-run-sheet" },
      context(),
      { loadDigest },
    )

    expect(loadDigest).toHaveBeenCalledWith({
      organizationId: "org-pilot",
      actorId: "user-1",
      actorPermissions: ["dashboard.read"],
      actorRoleCodes: ["manager"],
      isSuperUser: false,
      locale: "en",
      periodStart: null,
      periodEnd: null,
    })
  })

  it("does not reveal whether a digest hidden from the role exists", async () => {
    await expect(
      readRoleDailyDigest(
        { digestId: "owner-morning" },
        context(),
        { loadDigest: async () => digestData() },
      ),
    ).rejects.toMatchObject<Partial<CommandToolAdapterError>>({ code: "DIGEST_NOT_AVAILABLE" })
  })
})

function digestData(): DailyHabitDigestData {
  return {
    organizationId: "org-pilot",
    organizationName: "Stoquify Pilot",
    generatedAt: "2026-07-22T12:00:00.000Z",
    periodStart: "2026-07-22T00:00:00.000Z",
    periodEnd: "2026-07-22T23:59:59.999Z",
    currency: "XAF",
    digests: [
      {
        id: "manager-run-sheet",
        organizationId: "org-pilot",
        audienceRole: "manager",
        generatedAt: "2026-07-22T12:00:00.000Z",
        periodStart: "2026-07-22T00:00:00.000Z",
        periodEnd: "2026-07-22T23:59:59.999Z",
        freshness: {
          state: "fresh",
          generatedAt: "2026-07-22T12:00:00.000Z",
          sourceMaxUpdatedAt: "2026-07-22T11:59:00.000Z",
          maxAgeMinutes: 60,
          stale: false,
          staleReason: null,
        },
        commandBrief: {
          title: "Manager run sheet",
          summary: "Visible operating risks.",
          conclusion: "Two source signals were evaluated.",
          state: "ready",
          evidenceGrade: "operational",
          freshness: {
            state: "fresh",
            generatedAt: "2026-07-22T12:00:00.000Z",
            sourceMaxUpdatedAt: "2026-07-22T11:59:00.000Z",
            maxAgeMinutes: 60,
            stale: false,
            staleReason: null,
          },
          provenance: {
            organizationId: "org-pilot",
            locationId: null,
            sourceHash: "sha256:digest",
            sourceModules: ["dashboard"],
            generatedAt: "2026-07-22T12:00:00.000Z",
          },
        },
        risks: [
          {
            id: "dashboard-risk",
            title: "Review receiving queue",
            detail: "One permitted operational item needs review.",
            severity: "high",
            severityScore: 80,
            drillThrough: {
              available: true,
              type: "route",
              label: "Open",
              href: "/dashboard/manager-action-center",
              requiredPermission: "dashboard.read",
            },
          },
          {
            id: "payment-risk",
            title: "Provider exception provider-secret",
            detail: "provider-secret",
            severity: "critical",
            severityScore: 100,
            drillThrough: {
              available: true,
              type: "route",
              label: "Open",
              href: "/dashboard/finance/cash-command",
              requiredPermission: "payments.reconciliation.read",
            },
          },
        ],
        blockers: [],
        redactions: [],
      },
    ],
    actionQueue: { summary: {} as DailyHabitDigestData["actionQueue"]["summary"], filteredOutCount: 1 },
    summary: {
      digestCount: 1,
      visibleActionCount: 1,
      filteredOutActionCount: 1,
      staleSignalCount: 0,
      redactedSignalCount: 0,
      blockedDigestCount: 0,
      hiddenDigestCount: 6,
    },
  } as DailyHabitDigestData
}

function context(): AgentExecutionContext {
  return {
    organizationId: "org-pilot",
    organizationName: "Stoquify Pilot",
    actorId: "user-1",
    roleCodes: ["manager"],
    permissions: ["dashboard.read"],
    isSuperUser: false,
    requestedAgentKey: "command-agent",
    sourceRoute: "/dashboard/daily-digest",
    locale: "en",
    currency: "XAF",
    periodStart: null,
    periodEnd: null,
    resolvedAt: "2026-07-22T12:00:00.000Z",
    moduleDecisions: {},
  }
}
