jest.mock("server-only", () => ({}))

import type { AgentExecutionContext } from "../agent-contracts"
import { redactBeforeAgentOutput, redactBeforeAgentPrompt } from "../agent-redaction.service"

describe("agent redaction boundary", () => {
  it("redacts sensitive values before prompt construction", () => {
    const result = redactBeforeAgentPrompt({
      data: { supplier: { bankAccount: "CM001234567890" } },
      fields: [{ field: "supplier.bankAccount", category: "supplier_bank_detail" }],
      context: context(),
      hasFreshAuth: false,
    })

    expect(result.data.supplier).toEqual({ bankAccount: "[REDACTED:BANK]" })
    expect(JSON.stringify(result.data)).not.toContain("CM001234567890")
    expect(result.redactions).toHaveLength(1)
  })

  it("applies the same policy again before output", () => {
    const result = redactBeforeAgentOutput({
      data: { providerReference: "provider-secret-1234" },
      fields: [{ field: "providerReference", category: "payment_provider_reference" }],
      context: context(),
    })

    expect(result.data.providerReference).not.toBe("provider-secret-1234")
    expect(result.notices[0]).toMatch(/masked/i)
  })
})

function context(): AgentExecutionContext {
  return {
    organizationId: "org-1",
    organizationName: "Stoquify Pilot",
    actorId: "user-1",
    roleCodes: ["manager"],
    permissions: ["dashboard.read"],
    isSuperUser: false,
    requestedAgentKey: "command-agent",
    sourceRoute: "/dashboard",
    locale: "en",
    currency: "XAF",
    periodStart: null,
    periodEnd: null,
    resolvedAt: "2026-07-22T12:00:00.000Z",
    moduleDecisions: {},
  }
}

