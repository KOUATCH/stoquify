jest.mock("server-only", () => ({}))

import type { AgentExecutionContext } from "../agent-contracts"
import {
  CommandToolAdapterError,
  readRoleDailyDigest,
} from "../tools/command-tool-adapters"
import type { DailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest-contracts"

describe("readRoleDailyDigest", () => {
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
