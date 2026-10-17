jest.mock("@/services/_shared/protect", () => ({ protect: jest.fn((_options: Record<string, unknown>, work: (input: unknown, ctx: unknown) => unknown) => (input: unknown) => work(input, { orgId: "server-org", userId: "server-actor", permissions: ["accounting.close.read"] })) }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/services/accounting/close-evidence-workflow.service", () => ({ assertCloseEvidenceActor: jest.fn(), getCloseEvidenceWorkflow: jest.fn(), getCloseEvidenceReview: jest.fn(), getCloseEvidenceInvestigation: jest.fn() }))
jest.mock("@/services/accounting/close-assurance.service", () => ({ requestMissingCloseEvidence: jest.fn(), respondToMissingCloseEvidence: jest.fn(), acceptMissingCloseEvidenceResponse: jest.fn(), replaceMissingCloseEvidenceRecipient: jest.fn() }))
jest.mock("@/services/accounting/close-evidence-acceptance-context", () => ({ closeEvidenceAcceptanceControl: jest.fn().mockReturnValue({ serverDerived: true }), closeEvidenceWorkControl: jest.fn(async (ctx: { userId: string; permissions: string[] }) => ({ actorId: ctx.userId, actorPermissions: ctx.permissions, session: { id: "server-session", token: "server-token" } })) }))
import * as actions from "../close-evidence-workflow.actions"
import { protect } from "@/services/_shared/protect"
import { assertCloseEvidenceActor, getCloseEvidenceWorkflow, getCloseEvidenceInvestigation } from "@/services/accounting/close-evidence-workflow.service"
import { requestMissingCloseEvidence, respondToMissingCloseEvidence, replaceMissingCloseEvidenceRecipient } from "@/services/accounting/close-assurance.service"
const mockOptions = (protect as jest.Mock).mock.calls.map(call => call[0])
beforeEach(() => { jest.clearAllMocks(); (assertCloseEvidenceActor as jest.Mock).mockResolvedValue([]); (requestMissingCloseEvidence as jest.Mock).mockResolvedValue({ periodId: "period" }) })
test("requires explicit close module read/write policy and fresh acceptance", () => {
  expect(mockOptions).toHaveLength(10)
  expect(mockOptions[0]).toMatchObject({ permission: "accounting.close.read", module: { accessIntent: "read", mode: "enforce" } })
  expect(mockOptions[2]).toMatchObject({ permission: "accounting.close.evidence.request", module: { accessIntent: "write", mode: "enforce" } })
  expect(mockOptions[4]).toMatchObject({ permission: "accounting.close.accountant.review", freshAuth: { maxAgeSeconds: 300 } })
  expect(mockOptions[5]).toMatchObject({ permission: "accounting.close.evidence.request", module: { accessIntent: "write", mode: "enforce" } })
  expect(mockOptions[6]).toMatchObject({ permission: "accounting.close.accountant.review", module: { accessIntent: "read", mode: "enforce" } })
  for (const index of [7, 8, 9]) expect(mockOptions[index]).toMatchObject({ permission: "accounting.close.accountant.review", module: { accessIntent: "write", mode: "enforce" }, freshAuth: { maxAgeSeconds: 300 } })
})

test("investigation uses server identity and rejects forged scope and unbounded references", async () => {
  for (const input of [{ periodId: "period", requestId: "request", organizationId: "foreign" }, { periodId: "period", requestId: "x".repeat(201) }]) await expect(actions.getCloseEvidenceInvestigationAction(input)).rejects.toThrow()
  expect(getCloseEvidenceInvestigation).not.toHaveBeenCalled()
  await actions.getCloseEvidenceInvestigationAction({ periodId: "period", requestId: "request" })
  expect(getCloseEvidenceInvestigation).toHaveBeenCalledWith({ organizationId: "server-org", actorId: "server-actor" }, "period", "request")
})
test("derives tenant and actor from the protected context and rejects forged scope", async () => {
  await actions.getCloseEvidenceWorkflowAction({ periodId: "period" })
  expect(getCloseEvidenceWorkflow).toHaveBeenCalledWith({ organizationId: "server-org", actorId: "server-actor" }, "period", undefined)
  await expect(actions.getCloseEvidenceWorkflowAction({ periodId: "period", organizationId: "other" })).rejects.toThrow()
})

test("validates continuation kind and keeps actor/tenant server-owned", async () => {
  await actions.getCloseEvidenceWorkflowAction({ periodId: "period", page: { kind: "requests", cursor: "position" } })
  expect(getCloseEvidenceWorkflow).toHaveBeenCalledWith({ organizationId: "server-org", actorId: "server-actor" }, "period", { kind: "requests", cursor: "position" })
  for (const page of [{ kind: "users", cursor: "position" }, { kind: "requests", cursor: "position", organizationId: "other" }, { kind: "requests", cursor: "x".repeat(2001) }]) {
    await expect(actions.getCloseEvidenceWorkflowAction({ periodId: "period", page })).rejects.toThrow()
  }
})
test("request rejects client-organization injection and delegates recipient/replay policy to the transaction", async () => {
  const input = { findingId: "finding", requestedFromId: "owner", requestText: "Supply missing evidence", dueAt: "2099-01-01T00:00:00Z", correlationId: "key" }
  await expect(actions.requestCloseEvidenceAction({ ...input, clientOrganizationId: "other" })).rejects.toThrow()
  expect(requestMissingCloseEvidence).not.toHaveBeenCalled()
  await actions.requestCloseEvidenceAction(input)
  expect(assertCloseEvidenceActor).toHaveBeenCalledTimes(1)
  expect(assertCloseEvidenceActor).toHaveBeenCalledWith({ organizationId: "server-org", actorId: "server-actor" }, "accounting.close.evidence.request", "write")
  expect(requestMissingCloseEvidence).toHaveBeenCalledWith("server-org", expect.objectContaining({ findingId: "finding" }), expect.objectContaining({ actorId: "server-actor" }))
})
test("a current permission refusal stops a response before the writer", async () => {
  ;(assertCloseEvidenceActor as jest.Mock).mockRejectedValue(new Error("Revoked"))
  await expect(actions.respondCloseEvidenceAction({ requestId: "request", responseText: "Updated source", correlationId: "key" })).rejects.toThrow("Revoked")
  expect(respondToMissingCloseEvidence).not.toHaveBeenCalled()
})

test("replacement derives authority from the server and refuses injected scope", async () => {
  const input = { requestId: "request", expectedRevision: "request", requestedFromId: "new-owner", reason: "Previous colleague left the team", correlationId: "replacement-key" }
  for (const extra of [{ organizationId: "foreign" }, { actorId: "forged" }, { requireFindingAssignment: false }]) {
    await expect(actions.replaceCloseEvidenceRecipientAction({ ...input, ...extra })).rejects.toThrow()
  }
  expect(replaceMissingCloseEvidenceRecipient).not.toHaveBeenCalled()
  await actions.replaceCloseEvidenceRecipientAction(input)
  expect(assertCloseEvidenceActor).toHaveBeenCalledWith({ organizationId: "server-org", actorId: "server-actor" }, "accounting.close.finding.assign", "write")
  expect(replaceMissingCloseEvidenceRecipient).toHaveBeenCalledWith("server-org", input, expect.objectContaining({ actorId: "server-actor", session: { id: "server-session", token: "server-token" } }))
})

test("replacement stops before the writer when assignment authority is refused", async () => {
  ;(assertCloseEvidenceActor as jest.Mock).mockRejectedValue(new Error("Assignment revoked"))
  await expect(actions.replaceCloseEvidenceRecipientAction({ requestId: "request", expectedRevision: "request", requestedFromId: "new-owner", reason: "Previous colleague left the team", correlationId: "replacement-key" })).rejects.toThrow("Assignment revoked")
  expect(replaceMissingCloseEvidenceRecipient).not.toHaveBeenCalled()
})
