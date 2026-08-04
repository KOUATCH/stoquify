const { evaluate, render } = require("../ai-copilot-guardrails-gate")

describe("AI copilot guardrails gate", () => {
  it("recognizes the complete read-only analysis and non-executing proposal boundary", () => {
    const result = evaluate()

    expect(result.status).toBe("ready")
    expect(result.blockers).toEqual([])
    expect(result.checks).toHaveLength(15)
    expect(result.authority).toEqual(
      expect.objectContaining({
        analysis: "read_only",
        proposalExecution: "none",
        autonomousPosting: false,
        autonomousPayment: false,
        autonomousFiling: false,
      }),
    )
  })

  it("renders the no-authority contract explicitly", () => {
    const markdown = render(evaluate())

    expect(markdown).toContain("Proposal execution authority: none")
    expect(markdown).toContain(
      "A proposal acceptance records human intent only",
    )
    expect(markdown).toContain("credential")
  })
})
