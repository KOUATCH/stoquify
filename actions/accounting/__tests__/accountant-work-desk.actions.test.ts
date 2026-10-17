jest.mock("server-only", () => ({}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {
    code = "FRESH_AUTH_REQUIRED"
    constructor() { super("Fresh authentication required"); this.name = "FreshAuthRequiredError" }
  },
  SESSION_ASSURANCE_LEVEL: { NONE: 0, PASSWORD: 1 },
}))
jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((_options, handler) => async (input: unknown) => {
    try { return { success: true, data: await handler(input, mockActionContext) } }
    catch (error) {
      const failure = error as { code?: string; name?: string }
      return { success: false, code: failure.code ?? (failure.name === "FreshAuthRequiredError" ? "FRESH_AUTH_REQUIRED" : "VALIDATION_ERROR") }
    }
  }),
}))
jest.mock("@/services/accounting/accountant-work-desk.service", () => ({ assertAccountantWorkClient: jest.fn(), getAccountantWorkDesk: jest.fn(), getAccountantWorkDetail: jest.fn(), getAccountantWorkClientPage: jest.fn() }))
jest.mock("@/services/accounting/close-assurance.service", () => ({ acceptMissingCloseEvidenceResponse: jest.fn() }))
jest.mock("@/services/accounting/accountant-notification-history.service", () => ({ ...jest.requireActual("@/services/accounting/accountant-notification-history.service"), getAccountantNotificationHistory: jest.fn() }))

import { revalidatePath } from "next/cache"
import { FreshAuthRequiredError } from "@/lib/security/auth-session"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { protect } from "@/services/_shared/protect"
import { assertAccountantWorkClient, getAccountantWorkDesk, getAccountantWorkDetail, getAccountantWorkClientPage } from "@/services/accounting/accountant-work-desk.service"
import { acceptMissingCloseEvidenceResponse } from "@/services/accounting/close-assurance.service"
import { getAccountantWorkDeskAction, getAccountantWorkDetailAction, acceptAccountantWorkItemAction, getAccountantNotificationHistoryAction } from "../accountant-work-desk.actions"
import { getAccountantNotificationHistory } from "@/services/accounting/accountant-notification-history.service"

function trustedContext() {
  const lastAuthAt = new Date("2026-10-01T10:00:00.000Z")
  return {
    orgId: "firm", userId: "actor", permissions: ["accounting.audit.read", "accounting.close.accountant.review"],
    freshAuth: { lastAuthAt, claims: {
      userId: "actor", tenantId: "firm", assuranceOrganizationId: "firm", assuranceLevel: 1,
      lastAuthAt: lastAuthAt.getTime(), sessionId: "trusted-session", sessionToken: "synthetic-trusted-session-token",
    } },
  }
}
let mockActionContext: Record<string, unknown> = trustedContext()
const registeredOptions = (protect as jest.Mock).mock.calls.map(([options]) => options)
const mockAccept = acceptMissingCloseEvidenceResponse as jest.Mock
const mockAssertClient = assertAccountantWorkClient as jest.Mock
const acceptance = {
  clientOrganizationId: "client", requestId: "request", responseId: "response",
  resolutionNotes: "Verified source evidence", correlationId: "same-key",
  replacement: { checklistItemId: "verified-checklist", bindingHash: `sha256:${"a".repeat(64)}` },
}
const accepted = { id: "acceptance-record", periodId: "period-1", decision: "ACCEPTED", replacement: acceptance.replacement }

beforeEach(() => {
  jest.clearAllMocks()
  mockActionContext = trustedContext()
  mockAssertClient.mockReset().mockResolvedValue(undefined)
  mockAccept.mockReset().mockResolvedValue(accepted)
})

it("protects all entries with review permission and accounting access, and acceptance with five-minute fresh authentication", () => {
  expect(registeredOptions).toHaveLength(4)
  for (const options of registeredOptions) expect(options).toMatchObject({ permission: "accounting.close.accountant.review", auditAllowed: false, module: { moduleSlug: "accounting", surface: "accountant-work-desk", accessIntent: "read", mode: "enforce" } })
  expect(registeredOptions.find(options => options.freshAuth)).toMatchObject({ freshAuth: { maxAgeSeconds: 300 } })
})

it("binds historical pages to the server actor and rejects supplied authority", async () => {
  await getAccountantNotificationHistoryAction({ clientOrganizationId: "client", cursor: "position" })
  expect(getAccountantNotificationHistory).toHaveBeenCalledWith({ homeOrganizationId: "firm", actorId: "actor", actorPermissions: trustedContext().permissions }, { clientOrganizationId: "client", cursor: "position" })
  expect((await getAccountantNotificationHistoryAction({ clientOrganizationId: "client", actorId: "forged" })).success).toBe(false)
  expect(getAccountantNotificationHistory).toHaveBeenCalledTimes(1)
})

it("derives the list actor from protected context and rejects spoofed tenancy", async () => {
  await getAccountantWorkDeskAction({ afterGrantId: "g1" })
  expect(getAccountantWorkDesk).toHaveBeenCalledWith(expect.objectContaining({ homeOrganizationId: "firm", actorId: "actor" }), "g1")
  expect((await getAccountantWorkDeskAction({ actorId: "attacker" })).success).toBe(false)
  expect(getAccountantWorkDesk).toHaveBeenCalledTimes(1)
})

it("delegates detail with the explicit target and server actor", async () => {
  await getAccountantWorkDetailAction({ clientOrganizationId: "client", requestId: "request" })
  expect(getAccountantWorkDetail).toHaveBeenCalledWith(expect.objectContaining({ homeOrganizationId: "firm", actorId: "actor" }), "client", "request")
})

it("calls the domain service with trusted authority after target preflight and preserves source selection and retry key", async () => {
  expect(await acceptAccountantWorkItemAction(acceptance)).toEqual({ success: true, data: accepted })
  expect(mockAssertClient).toHaveBeenCalledWith({ homeOrganizationId: "firm", actorId: "actor", actorPermissions: trustedContext().permissions }, "client", "write")
  expect(mockAccept).toHaveBeenCalledWith("firm", acceptance, {
    actorId: "actor", actorPermissions: trustedContext().permissions,
    session: { id: "trusted-session", token: "synthetic-trusted-session-token" }, requireWorkDeskAccess: true,
    freshAuth: { actorId: "actor", organizationId: "firm", lastAuthAt: trustedContext().freshAuth.lastAuthAt },
  })
  expect(mockAssertClient.mock.invocationCallOrder[0]).toBeLessThan(mockAccept.mock.invocationCallOrder[0])
  expect(revalidatePath).toHaveBeenCalledTimes(4)
  for (const route of ["/dashboard/accounting", "/dashboard/accounting/close", "/dashboard/accounting/close/period-1", "/dashboard/accounting/accountant-portfolio"]) expect(revalidatePath).toHaveBeenCalledWith(route, "page")
})

it("validates a single client continuation and preserves the server actor", async () => {
  const clientPage = { clientOrganizationId: "client", kind: "reviews", cursor: "position" }
  expect((await getAccountantWorkDeskAction({ clientPage })).success).toBe(true)
  expect(getAccountantWorkClientPage).toHaveBeenCalledWith(expect.objectContaining({ homeOrganizationId: "firm", actorId: "actor" }), clientPage)
  for (const input of [{ afterGrantId: "g1", clientPage }, { clientPage: { ...clientPage, actorId: "forged" } }, { clientPage: { ...clientPage, kind: "all" } }, { clientPage: { ...clientPage, cursor: "x".repeat(2001) } }]) {
    expect((await getAccountantWorkDeskAction(input)).success).toBe(false)
  }
  expect(getAccountantWorkClientPage).toHaveBeenCalledTimes(1)
})

it.each([
  { actorId: "attacker" }, { homeOrganizationId: "other-firm" }, { actorPermissions: ["*"] },
  { session: { id: "forged", token: "forged" } }, { freshAuth: trustedContext().freshAuth },
  { requireWorkDeskAccess: false },
])("rejects form-supplied authority fields %j before preflight or domain execution", async spoof => {
  expect((await acceptAccountantWorkItemAction({ ...acceptance, ...spoof })).success).toBe(false)
  expect(mockAssertClient).not.toHaveBeenCalled()
  expect(mockAccept).not.toHaveBeenCalled()
  expect(revalidatePath).not.toHaveBeenCalled()
})

it.each([
  { clientOrganizationId: undefined }, { clientOrganizationId: " " }, { requestId: "" },
  { replacement: { ...acceptance.replacement, bindingHash: "changed" } },
  { replacement: { ...acceptance.replacement, session: "forged" } },
])("rejects invalid target or selected source input %j before preflight", async invalid => {
  expect((await acceptAccountantWorkItemAction({ ...acceptance, ...invalid })).success).toBe(false)
  expect(mockAssertClient).not.toHaveBeenCalled()
  expect(mockAccept).not.toHaveBeenCalled()
})

it.each([
  ["missing session id", { sessionId: "" }], ["missing session token", { sessionToken: " " }],
  ["actor mismatch", { userId: "other" }], ["tenant mismatch", { tenantId: "other" }],
  ["assurance tenant mismatch", { assuranceOrganizationId: "other" }],
  ["insufficient assurance", { assuranceLevel: 0 }], ["invalid assurance", { assuranceLevel: Number.NaN }],
  ["timestamp mismatch", { lastAuthAt: 0 }],
])("rejects %s in trusted session claims before target or domain access", async (_label, claims) => {
  const context = trustedContext()
  mockActionContext = { ...context, freshAuth: { ...context.freshAuth, claims: { ...context.freshAuth.claims, ...claims } } }
  expect(await acceptAccountantWorkItemAction(acceptance)).toMatchObject({ success: false, code: "FRESH_AUTH_REQUIRED" })
  expect(mockAssertClient).not.toHaveBeenCalled()
  expect(mockAccept).not.toHaveBeenCalled()
  expect(revalidatePath).not.toHaveBeenCalled()
})

it.each([null, { ...trustedContext().freshAuth, lastAuthAt: new Date("invalid") }])("rejects unavailable trusted authentication %j", async freshAuth => {
  mockActionContext = { ...trustedContext(), freshAuth }
  expect(await acceptAccountantWorkItemAction(acceptance)).toMatchObject({ success: false, code: "FRESH_AUTH_REQUIRED" })
  expect(mockAssertClient).not.toHaveBeenCalled()
  expect(mockAccept).not.toHaveBeenCalled()
})

it("never invokes the domain acceptance or refreshes paths when target access is denied", async () => {
  mockAssertClient.mockRejectedValueOnce(new ForbiddenError("Target work access is denied"))
  expect(await acceptAccountantWorkItemAction(acceptance)).toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(mockAccept).not.toHaveBeenCalled()
  expect(revalidatePath).not.toHaveBeenCalled()
})

it.each([
  [new ForbiddenError("Persisted authority was revoked"), "FORBIDDEN"],
  [new FreshAuthRequiredError(), "FRESH_AUTH_REQUIRED"],
])("preserves domain denial code %s without retry or refresh", async (failure, code) => {
  mockAccept.mockRejectedValueOnce(failure)
  expect(await acceptAccountantWorkItemAction(acceptance)).toMatchObject({ success: false, code })
  expect(mockAssertClient).toHaveBeenCalledTimes(1)
  expect(mockAccept).toHaveBeenCalledTimes(1)
  expect(mockAccept.mock.calls[0][1]).toEqual(acceptance)
  expect(revalidatePath).not.toHaveBeenCalled()
})
