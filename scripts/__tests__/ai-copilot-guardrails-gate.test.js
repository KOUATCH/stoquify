const fs = require("node:fs")
const path = require("node:path")

const { evaluate, render } = require("../ai-copilot-guardrails-gate")

const ROOT = path.resolve(__dirname, "../..")

function evaluateWithout(file, marker) {
  const content = fs.readFileSync(path.join(ROOT, file), "utf8")
  expect(content).toContain(marker)
  return evaluate({ [file]: content.replace(marker, "REMOVED_BY_TEST") })
}

describe("AI copilot guardrails gate", () => {
  it("recognizes the complete read-only analysis and non-executing proposal boundary", () => {
    const result = evaluate()

    expect(result.status).toBe("ready")
    expect(result.blockers).toEqual([])
    expect(result.checks).toHaveLength(18)
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

  it("fails closed without bilingual unsafe-action classification", () => {
    const result = evaluateWithout(
      "services/ai/copilot-proposal.service.ts",
      '.normalize("NFKD")',
    )

    expect(result.status).toBe("blocked")
    expect(result.blockers).toContain(
      "unsafe_action_classification_is_bilingual",
    )
  })

  it("fails closed without the stable typed action contract", () => {
    const result = evaluateWithout(
      "actions/ai/copilot-proposal.actions.ts",
      "ok: true as const",
    )

    expect(result.status).toBe("blocked")
    expect(result.blockers).toContain(
      "proposal_actions_return_stable_typed_results",
    )
  })

  it("fails closed when the AI guardrail gate is not policy-wired", () => {
    const result = evaluateWithout(
      "package.json",
      '"ai:copilot:guardrails:gate":',
    )

    expect(result.status).toBe("blocked")
    expect(result.blockers).toContain("copilot_guardrail_gate_is_policy_wired")
  })
})
