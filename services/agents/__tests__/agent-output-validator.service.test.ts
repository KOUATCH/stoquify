jest.mock("server-only", () => ({}))

import type { AgentExecutionContext } from "../agent-contracts"
import {
  AgentOutputValidationError,
  validateAndRedactCommandBrief,
} from "../agent-output-validator.service"
import type { CommandDailyBrief } from "../command-agent-contracts"

describe("Command Agent output validator", () => {
  it("redacts sensitive references before output can be persisted or rendered", () => {
    const result = validateAndRedactCommandBrief({
      context: context(),
      brief: brief({
        title: "Review sk-secretvalue123456",
        priorities: [
          {
            id: "risk-1",
            title: "Payment exception",
            detail: "provider_reference=provider-secret-77",
            severity: "high",
            href: "/dashboard/finance/cash-command",
            requiredPermission: "payments.reconciliation.read",
            evidenceIds: ["evidence-1"],
          },
        ],
      }),
    })

    expect(JSON.stringify(result.brief)).not.toContain("secret")
    expect(result.brief.priorities[0].detail).toContain("REDACTED")
    expect(result.redactionCount).toBeGreaterThan(0)
  })

  it("rejects a material priority whose evidence citation is unknown", () => {
    expect(() =>
      validateAndRedactCommandBrief({
        context: context(),
        brief: brief({
          priorities: [
            {
              id: "risk-1",
              title: "Uncited risk",
              detail: "No matching evidence exists.",
              severity: "high",
              href: "/dashboard/manager-action-center",
              requiredPermission: "dashboard.read",
              evidenceIds: ["missing-evidence"],
            },
          ],
        }),
      }),
    ).toThrow(AgentOutputValidationError)
  })
})

function brief(overrides: Partial<CommandDailyBrief> = {}): CommandDailyBrief {
  return {
    kind: "stoquify.command-agent.daily-brief.v1",
    digestId: "manager-run-sheet",
    audienceRole: "manager",
    title: "Manager brief",
    summary: "Trusted priorities.",
    conclusion: "One item needs review.",
    generatedAt: "2026-07-22T12:00:00.000Z",
    periodStart: "2026-07-22T00:00:00.000Z",
    periodEnd: "2026-07-22T23:59:59.999Z",
    state: "ready",
    evidenceGrade: "operational",
    freshness: "fresh",
    priorities: [],
    evidence: [
      {
        id: "evidence-1",
        subjectType: "daily-habit.digest",
        subjectId: "org-pilot:manager-run-sheet",
        sourceModule: "dashboard",
        sourceHash: "sha256:source",
        evidenceGrade: "operational",
        freshness: "fresh",
        available: true,
        blockerCount: 0,
        redactionCount: 0,
      },
    ],
    limitations: [],
    redactionNotices: [],
    runId: null,
    ...overrides,
  }
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
