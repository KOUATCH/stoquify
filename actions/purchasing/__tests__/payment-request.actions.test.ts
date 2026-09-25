jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/purchasing/payment-request.service", () => ({ previewPaymentRequest: jest.fn(), submitPaymentRequest: jest.fn(), reviewPaymentRequestApproval: jest.fn(), confirmPaymentRequestApproval: jest.fn() }))
jest.mock("@/services/purchasing/payment-request-read.service", () => ({ loadPaymentRequestSources: jest.fn(), loadPaymentRequestQueue: jest.fn(), loadPaymentRequestHistory: jest.fn() }))
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { revalidatePath } from "next/cache"
import { ForbiddenError } from "@/services/_shared/action-errors"
import * as service from "@/services/purchasing/payment-request.service"
import { reviewSupplierPaymentRequest, submitSupplierPaymentRequest, reviewSupplierPaymentApproval, confirmSupplierPaymentApproval } from "../payment-request.actions"

const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "token" }
const draft = { supplierId: "supplier", bankAccountId: "bank", method: "BANK_TRANSFER" as const, paymentDate: "2026-08-12", documentReference: "https://example.invalid/record", documentSha256: "a".repeat(64), allocations: [{ supplierInvoiceId: "invoice", amount: "10.25" }] }
const command = { draft, expectedRevision: "a".repeat(64), idempotencyKey: "request-1" }
const approval = { paymentRequestId: "payment", expectedRevision: "a".repeat(64), idempotencyKey: "approval-1" }
beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(requirePermission).mockResolvedValue({ orgId: "org", userId: "actor" } as never)
  jest.mocked(requireSession).mockResolvedValue({ claims: { tenantId: "org", userId: "actor", sessionId: "session", sessionToken: "token" } } as never)
})
it.each([
  ["request preview", () => reviewSupplierPaymentRequest(draft), service.previewPaymentRequest, draft, "request"],
  ["request submission", () => submitSupplierPaymentRequest(command), service.submitPaymentRequest, command, "request"],
  ["approval preview", () => reviewSupplierPaymentApproval("payment"), service.reviewPaymentRequestApproval, "payment", "approve"],
  ["approval decision", () => confirmSupplierPaymentApproval(approval), service.confirmPaymentRequestApproval, approval, "approve"],
] as const)("binds %s to the current authenticated scope", async (_label, call, target, input, permission) => {
  await expect(call()).resolves.toMatchObject({ success: true })
  expect(requirePermission).toHaveBeenCalledWith(`purchasing.ap.payment.${permission}`, expect.any(Object))
  expect(target).toHaveBeenCalledWith(input, scope)
})
it("rejects disagreeing permission and session identities before the service", async () => {
  jest.mocked(requireSession).mockResolvedValue({ claims: { tenantId: "other", userId: "actor" } } as never)
  await expect(submitSupplierPaymentRequest(command)).resolves.toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(service.submitPaymentRequest).not.toHaveBeenCalled()
})
it("preserves denial and does not convert a failed review into empty success", async () => {
  jest.mocked(requirePermission).mockRejectedValue(new ForbiddenError("denied"))
  await expect(reviewSupplierPaymentApproval("payment")).resolves.toMatchObject({ success: false, data: null, code: "FORBIDDEN" })
  expect(service.reviewPaymentRequestApproval).not.toHaveBeenCalled()
})
it("reports the persisted outcome even when cache invalidation fails", async () => {
  jest.mocked(service.confirmPaymentRequestApproval).mockResolvedValue({ paymentRequestId: "payment", status: "APPROVED", replayed: false })
  jest.mocked(revalidatePath).mockImplementation(() => { throw new Error("cache unavailable") })
  await expect(confirmSupplierPaymentApproval(approval)).resolves.toMatchObject({ success: true, data: { paymentRequestId: "payment", status: "APPROVED" } })
  expect(service.confirmPaymentRequestApproval).toHaveBeenCalledTimes(1)
})
