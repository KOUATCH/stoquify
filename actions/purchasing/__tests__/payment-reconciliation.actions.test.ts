import { revalidatePath } from "next/cache"
import { requireAllPermissions } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { ApplicationError, ForbiddenError } from "@/services/_shared/action-errors"
import * as service from "@/services/purchasing/payment-reconciliation-service"
import * as actions from "../payment-reconciliation.actions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requireAllPermissions: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/purchasing/payment-reconciliation-service", () => ({ previewPaymentReconciliation: jest.fn(), proposePaymentReconciliation: jest.fn(), reviewPaymentReconciliation: jest.fn(), decidePaymentReconciliation: jest.fn(), reopenPaymentReconciliation: jest.fn(), finalizePaymentReconciliation: jest.fn(), readPaymentReconciliation: jest.fn(), loadPaymentReconciliationSources: jest.fn(), loadPaymentReconciliationEvidenceChoices: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "private-session-token" }
const draft = { paymentRequestId: "payment", evidence: { kind: "BANK_STATEMENT", statementLineId: "statement" } }
const command = { draft, expectedRevision: "a".repeat(64), idempotencyKey: "handoff-command-1" }
beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(requireAllPermissions).mockResolvedValue({ orgId: "org", userId: "actor" } as never)
  jest.mocked(requireSession).mockResolvedValue({ claims: { tenantId: "org", userId: "actor", sessionId: "session", sessionToken: "private-session-token" } } as never)
  jest.mocked(service.proposePaymentReconciliation).mockResolvedValue({ organizationId: "org", actorId: "actor", paymentRequestId: "payment", requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, status: "PROPOSED" } as never)
})
it("derives identity and persisted-session bindings on the server", async () => {
  const result = await actions.proposeSupplierPaymentReconciliation(command)
  expect(result.success).toBe(true)
  expect(requireAllPermissions).toHaveBeenCalledWith(["payments.reconciliation.read", "accounting.journal.read", "payments.reconciliation.exception.resolve"], { resource: "SupplierPayment" })
  expect(service.proposePaymentReconciliation).toHaveBeenCalledWith(command, scope)
  expect(JSON.stringify(result)).not.toContain(scope.sessionToken)
})
it("rejects injected authority fields instead of passing them to the service", async () => {
  const result = await actions.proposeSupplierPaymentReconciliation({ ...command, organizationId: "other", actorId: "other", sessionToken: "spoof" })
  expect(result.success).toBe(false); expect(service.proposePaymentReconciliation).not.toHaveBeenCalled()
})
it.each([{ tenantId: "foreign", userId: "actor" }, { tenantId: "org", userId: "other" }])("denies a mismatched trusted session binding", async identity => {
  jest.mocked(requireSession).mockResolvedValue({ claims: { ...identity, sessionId: "session", sessionToken: "token" } } as never)
  const result = await actions.proposeSupplierPaymentReconciliation(command)
  expect(result).toMatchObject({ success: false, code: "FORBIDDEN" }); expect(service.proposePaymentReconciliation).not.toHaveBeenCalled()
})
it.each(["APPROVE", "REJECT"])("requires independent sign and resolve permissions for %s", async decision => {
  const input = { paymentRequestId: "payment", proposalId: "proposal", decision, reason: "Independent source review", expectedRevision: command.expectedRevision, idempotencyKey: "decision-request-1" }
  jest.mocked(service.decidePaymentReconciliation).mockResolvedValue({} as never)
  await actions.decideSupplierPaymentReconciliation(input)
  expect(requireAllPermissions).toHaveBeenCalledWith(["payments.reconciliation.read", "accounting.journal.read", "payments.reconciliation.exception.resolve", "payments.reconciliation.sign"], { resource: "SupplierPayment" })
  expect(service.decidePaymentReconciliation).toHaveBeenCalledWith(input, scope)
})
it("preserves actual service fresh-auth refusal for explicit client recovery", async () => {
  jest.mocked(service.proposePaymentReconciliation).mockRejectedValue(new ApplicationError("FRESH_AUTH_REQUIRED", "Verify identity", 403))
  const result = await actions.proposeSupplierPaymentReconciliation(command)
  expect(result).toMatchObject({ success: false, code: "FRESH_AUTH_REQUIRED" }); expect(revalidatePath).not.toHaveBeenCalled()
})
it("never calls the source service after permission denial", async () => {
  jest.mocked(requireAllPermissions).mockRejectedValue(new ForbiddenError())
  const result = await actions.proposeSupplierPaymentReconciliation(command)
  expect(result).toMatchObject({ success: false, code: "FORBIDDEN" }); expect(service.proposePaymentReconciliation).not.toHaveBeenCalled()
})
it("retains the service outcome when post-commit refresh fails", async () => {
  jest.mocked(revalidatePath).mockImplementation(() => { throw new Error("refresh failed") })
  const result = await actions.proposeSupplierPaymentReconciliation(command)
  expect(result).toMatchObject({ success: true, data: { requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision } })
  expect(service.proposePaymentReconciliation).toHaveBeenCalledTimes(1)
})
it("does not overwrite the receipt binding returned by the source service", async () => {
  jest.mocked(service.proposePaymentReconciliation).mockResolvedValue({ requestReference: "different-receipt", reviewedRevision: command.expectedRevision } as never)
  expect(await actions.proposeSupplierPaymentReconciliation(command)).toMatchObject({ success: true, data: { requestReference: "different-receipt" } })
})
