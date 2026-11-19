import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getPOSWhatsAppReceiptCapability, getPOSWhatsAppReceiptStatus, queuePOSWhatsAppReceipt } from "@/services/pos/whatsapp-receipt.service"
import { getPOSWhatsAppReceiptCapabilityAction, getPOSWhatsAppReceiptStatusAction, queuePOSWhatsAppReceiptAction } from "../whatsapp-receipt.actions"

jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error {
    constructor(message: string, public code: string, public status: number) { super(message) }
  }
  return { requirePermission: jest.fn(), assertCanUseOrganization: jest.fn(), RbacError, isRbacError: (error: unknown) => error instanceof RbacError }
})
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { warn: jest.fn(), error: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/pos/whatsapp-receipt.service", () => ({
  getPOSWhatsAppReceiptCapability: jest.fn(), getPOSWhatsAppReceiptStatus: jest.fn(), queuePOSWhatsAppReceipt: jest.fn(),
}))

const authorization = { orgId: "fixture-org", userId: "fixture-cashier", permissions: ["pos.use"] }
const scope = { salesOrderId: "fixture-sale", locationId: "fixture-location" }
const request = { ...scope, locale: "EN", destination: "+12025550112", whatsAppCustomerOptInConfirmed: true }

beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue(authorization)
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
})

it("binds capability, status and queue to the authenticated cashier and POS module", async () => {
  await getPOSWhatsAppReceiptCapabilityAction()
  await getPOSWhatsAppReceiptStatusAction(scope)
  await queuePOSWhatsAppReceiptAction(request)
  expect(requirePermission).toHaveBeenCalledWith("pos.use", { resource: "POSWhatsAppReceipt", auditAllowed: false })
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ moduleSlug: "pos", accessIntent: "write", mode: "enforce" }))
  expect(getPOSWhatsAppReceiptCapability).toHaveBeenCalledWith(authorization.orgId)
  expect(getPOSWhatsAppReceiptStatus).toHaveBeenCalledWith({ ...scope, organizationId: authorization.orgId, userId: authorization.userId })
  expect(queuePOSWhatsAppReceipt).toHaveBeenCalledWith({ ...request, organizationId: authorization.orgId, userId: authorization.userId })
})

it("rejects an injected actor and absent consent before queueing", async () => {
  await expect(queuePOSWhatsAppReceiptAction({ ...request, userId: "other-cashier" })).resolves.toMatchObject({ success: false })
  await expect(queuePOSWhatsAppReceiptAction({ ...request, whatsAppCustomerOptInConfirmed: false })).resolves.toMatchObject({ success: false })
  expect(queuePOSWhatsAppReceipt).not.toHaveBeenCalled()
})

it("denies queue access when the POS module gate denies the current tenant", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValueOnce({ allowed: false })
  await expect(queuePOSWhatsAppReceiptAction(request)).resolves.toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(queuePOSWhatsAppReceipt).not.toHaveBeenCalled()
})
