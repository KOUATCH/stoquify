jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
jest.mock("@/services/_shared/protect", () => ({ protect: jest.fn((options, handler) => {
  const store = globalThis as typeof globalThis & { resolutionOptions?: unknown[]; resolutionContext?: unknown }
  ;(store.resolutionOptions ??= []).push(options)
  return async (input: unknown) => ({ success: true, data: await handler(input, store.resolutionContext) })
}) }))
jest.mock("@/services/reconciliation/payment-suspense-resolution-read.service", () => ({ readSuspenseResolutionWorkspace: jest.fn(), searchSuspenseClearingJournals: jest.fn() }))
jest.mock("@/services/reconciliation/payment-suspense-resolution-evidence.service", () => ({ previewSuspenseResolution: jest.fn() }))
jest.mock("@/services/reconciliation/payment-suspense-resolution.service", () => ({ proposeSuspenseResolution: jest.fn(), reviewSuspenseResolution: jest.fn(), decideSuspenseResolution: jest.fn() }))
jest.mock("@/services/reconciliation/payment-suspense-resolution-recovery.service", () => ({ previewSuspenseResolutionRecovery: jest.fn(), proposeSuspenseResolutionRecovery: jest.fn(), reviewSuspenseResolutionRecovery: jest.fn(), decideSuspenseResolutionRecovery: jest.fn() }))
import * as actions from "../suspense-resolution.actions"
jest.mock("@/services/reconciliation/payment-suspense-resolution-export.service", () => ({ exportSuspenseResolution: jest.fn(), suspenseResolutionExportSchema: jest.requireActual("@/services/reconciliation/payment-suspense-correction.contracts").suspenseCorrectionExportSchema }))
import { exportSuspenseResolution } from "@/services/reconciliation/payment-suspense-resolution-export.service"
import { readSuspenseResolutionWorkspace } from "@/services/reconciliation/payment-suspense-resolution-read.service"
import { decideSuspenseResolution } from "@/services/reconciliation/payment-suspense-resolution.service"
import { decideSuspenseResolutionRecovery } from "@/services/reconciliation/payment-suspense-resolution-recovery.service"

const store = globalThis as typeof globalThis & { resolutionOptions: Array<{ module: { mode: string; accessIntent: string }; freshAuth?: unknown }>; resolutionContext: Record<string, unknown> }
const now = new Date()
beforeEach(() => { jest.clearAllMocks(); store.resolutionContext = { orgId: "org-server", userId: "actor-server", permissions: ["payments.reconciliation.read"], freshAuth: { lastAuthAt: now, claims: { userId: "actor-server", tenantId: "org-server", assuranceOrganizationId: "org-server", assuranceLevel: 1, lastAuthAt: now.getTime() } } } })
it("binds reads to server identity and returns that scope", async () => {
  const result = await actions.readSuspenseResolutionWorkspaceAction({ suspenseItemId: "item" })
  expect(readSuspenseResolutionWorkspace).toHaveBeenCalledWith({ suspenseItemId: "item" }, { organizationId: "org-server", actorId: "actor-server", actorPermissions: ["payments.reconciliation.read"] })
  expect(result).toMatchObject({ data: { scope: { organizationId: "org-server", actorId: "actor-server" } } })
})
it("enforces explicit module intents and fresh decisions/exports on all eleven actions", () => {
  expect(store.resolutionOptions).toHaveLength(11)
  expect(store.resolutionOptions.every(option => option.module.mode === "enforce")).toBe(true)
  expect(store.resolutionOptions.filter(option => option.module.accessIntent === "write")).toHaveLength(4)
  expect(store.resolutionOptions.filter(option => !!option.freshAuth)).toHaveLength(3)
})
it.each(["organizationId", "actorId", "lastAuthAt"])("refuses forged client %s", async field => {
  await expect(actions.readSuspenseResolutionWorkspaceAction({ suspenseItemId: "item", [field]: "forged" })).rejects.toThrow()
  expect(readSuspenseResolutionWorkspace).not.toHaveBeenCalled()
})
const decision = { suspenseItemId: "item", proposalId: "proposal", expectedRevision: "sha256:" + "a".repeat(64), decision: "APPROVE", reason: "Independent review" }
it.each([actions.decideSuspenseResolutionAction, actions.decideSuspenseResolutionRecoveryAction])("rejects a fresh-auth claim bound to another organization", async action => {
  store.resolutionContext.freshAuth = { lastAuthAt: now, claims: { userId: "actor-server", tenantId: "foreign", assuranceOrganizationId: "foreign", assuranceLevel: 1, lastAuthAt: now.getTime() } }
  await expect(action(decision)).rejects.toThrow()
  expect(decideSuspenseResolution).not.toHaveBeenCalled(); expect(decideSuspenseResolutionRecovery).not.toHaveBeenCalled()
})
it("passes verified fresh time to the domain decision", async () => {
  await actions.decideSuspenseResolutionRecoveryAction(decision)
  expect(decideSuspenseResolutionRecovery).toHaveBeenCalledWith(decision, expect.objectContaining({ actorId: "actor-server", organizationId: "org-server", lastAuthAt: now }))
})
it("binds an export to verified server identity and rejects forged authority", async () => {
  const command = { suspenseItemId: "item", recordId: "record", expectedRevision: decision.expectedRevision, idempotencyKey: "abcde123-1234-4123-8123-abcdef123456" }
  await actions.exportSuspenseResolutionAction(command)
  expect(exportSuspenseResolution).toHaveBeenCalledWith(command, expect.objectContaining({ actorId: "actor-server", organizationId: "org-server", lastAuthAt: now }))
  jest.mocked(exportSuspenseResolution).mockClear()
  await expect(actions.exportSuspenseResolutionAction({ ...command, actorId: "forged" })).rejects.toThrow()
  store.resolutionContext.freshAuth = undefined
  await expect(actions.exportSuspenseResolutionAction(command)).rejects.toThrow()
  expect(exportSuspenseResolution).not.toHaveBeenCalled()
})
