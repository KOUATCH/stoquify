import {
  commandAgentFeedbackSchema,
  commandAgentRequestSchema,
} from "../command-agent-contracts"

describe("Command Agent public contracts", () => {
  const base = {
    requestId: "00000000-0000-4000-8000-000000000001",
    digestId: "manager-run-sheet",
  }

  it.each([
    ["tenant identity", { organizationId: "org-other" }],
    ["free-form prompt", { prompt: "post this to the ledger" }],
    ["generic tool selection", { toolKey: "postLedgerEntry" }],
    ["generic tool arguments", { toolInput: { amount: 50_000 } }],
  ])("rejects client-controlled %s", (_label, injected) => {
    expect(commandAgentRequestSchema.safeParse({ ...base, ...injected }).success).toBe(false)
  })

  it("accepts only bounded feedback classifications without correction prose", () => {
    expect(commandAgentFeedbackSchema.safeParse({
      runId: "cm00000000000000000000001",
      kind: "helpful",
    }).success).toBe(true)
    expect(commandAgentFeedbackSchema.safeParse({
      runId: "cm00000000000000000000001",
      kind: "wrong",
      correctionText: "raw customer or payroll content",
    }).success).toBe(false)
  })
})
