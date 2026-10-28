import { evaluateAgentFreshness } from "../skills/freshness-evaluator.skill"

describe("agent freshness evaluator skill", () => {
  it("downgrades an old fresh snapshot to stale", () => {
    expect(
      evaluateAgentFreshness({
        status: "fresh",
        generatedAt: "2026-07-20T12:00:00.000Z",
        maxAgeMinutes: 60,
        now: "2026-07-22T12:00:00.000Z",
      }),
    ).toMatchObject({ freshness: "stale", stale: true })
  })

  it("preserves blocked and partial states", () => {
    expect(
      evaluateAgentFreshness({
        status: "blocked",
        generatedAt: "2026-07-22T12:00:00.000Z",
        maxAgeMinutes: 60,
        now: "2026-07-22T12:00:00.000Z",
      }).freshness,
    ).toBe("blocked")
  })
})
