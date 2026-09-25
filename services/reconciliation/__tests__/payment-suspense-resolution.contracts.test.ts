import { suspenseResolutionDraftSchema, suspenseResolutionProposalSchema, suspenseResolutionDecisionSchema } from "../payment-suspense-resolution.contracts"

const draft = { suspenseItemId: "suspense", clearingJournalId: "journal", outcome: "RESOLVED", reason: "Actual clearing source" }
describe("suspense resolution commands", () => {
  it("requires actual source identifiers and an explicit outcome", () => {
    expect(suspenseResolutionDraftSchema.parse(draft)).toEqual(draft)
    expect(suspenseResolutionDraftSchema.safeParse({ ...draft, clearingJournalId: " " }).success).toBe(false)
    expect(suspenseResolutionDraftSchema.safeParse({ ...draft, outcome: "APPROVED" }).success).toBe(false)
  })
  it.each(["organizationId", "actorId", "approvedById", "amount", "exchangeRate", "permission"])("refuses client authority or financial overrides: %s", key => {
    expect(suspenseResolutionDraftSchema.safeParse({ ...draft, [key]: "forged" }).success).toBe(false)
  })
  it("requires a revision and stable request key before proposal", () => {
    expect(suspenseResolutionProposalSchema.safeParse(draft).success).toBe(false)
    expect(suspenseResolutionProposalSchema.safeParse({ ...draft, expectedRevision: `sha256:${"a".repeat(64)}`, idempotencyKey: "ff22b328-f43e-4e44-979e-89f6efbb5811" }).success).toBe(true)
  })
  it("separates reviewed decisions from proposal input", () => {
    expect(suspenseResolutionDecisionSchema.safeParse({ ...draft, decision: "APPROVE" }).success).toBe(false)
    expect(suspenseResolutionDecisionSchema.safeParse({ suspenseItemId: "suspense", proposalId: "proposal", expectedRevision: `sha256:${"a".repeat(64)}`, decision: "REJECT", reason: "Source remains unproven" }).success).toBe(true)
  })
})
