jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error {
    constructor(message: string, public code = "FORBIDDEN", public status = 403) { super(message) }
  }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, assertCanUseOrganization: jest.fn(), requirePermission: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/evidence/proof-trail.service", () => ({ getProofTrail: jest.fn() }))

import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getProofTrail } from "@/services/evidence/proof-trail.service"
import { getProofTrailAction, getJournalEntryProofTrailAction, getReconciliationRunProofTrailAction, getPaymentTransactionProofTrailAction, getCloseRunProofTrailAction } from "../proof-trail.actions"

const permission = requirePermission as jest.Mock
const moduleRead = observeModuleAccess as jest.Mock
const read = getProofTrail as jest.Mock
const subjects = [
  ["journal.entry", "accounting", "accounting.journal.read", getJournalEntryProofTrailAction],
  ["reconciliation.run", "payment_reconciliation", "payments.reconciliation.read", getReconciliationRunProofTrailAction],
  ["payment.transaction", "payment_reconciliation", "payments.reconciliation.read", getPaymentTransactionProofTrailAction],
  ["close.run", "close_assurance", "accounting.close.read", getCloseRunProofTrailAction],
] as const

describe("proof action current module boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    permission.mockResolvedValue({ orgId: "org-session", userId: "actor-session", permissions: ["*"] })
    moduleRead.mockResolvedValue({ allowed: true })
    read.mockResolvedValue({ subjectId: "record-1", organizationId: "org-session" })
  })

  it.each(subjects)("denies %s before data access through dispatcher and dedicated entry", async (subjectType, _moduleSlug, _requiredPermission, dedicated) => {
    moduleRead.mockResolvedValue({ allowed: false })
    for (const call of [() => getProofTrailAction({ subjectType, subjectId: "record-1" }), () => dedicated({ subjectId: "record-1" })]) {
      expect(await call()).toMatchObject({ success: false, status: 403, data: null })
    }
    expect(read).not.toHaveBeenCalled()
  })

  it.each(subjects)("rechecks %s on every request using session tenant and read intent", async (subjectType, moduleSlug, requiredPermission, dedicated) => {
    expect(await dedicated({ organizationId: "foreign-org", subjectId: "record-1" })).toMatchObject({ success: true })
    expect(permission).toHaveBeenCalledWith(requiredPermission, expect.any(Object))
    expect(moduleRead).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", userId: "actor-session", moduleSlug, accessIntent: "read", mode: "enforce", audit: true }))
    expect(moduleRead.mock.invocationCallOrder[0]).toBeLessThan(read.mock.invocationCallOrder[0])
    expect(read).toHaveBeenCalledWith({ organizationId: "org-session", actorId: "actor-session", subjectType, subjectId: "record-1" })
    moduleRead.mockResolvedValue({ allowed: false })
    expect(await getProofTrailAction({ subjectType, subjectId: "record-1" })).toMatchObject({ success: false, data: null })
    expect(read).toHaveBeenCalledTimes(1)
  })

  it("does not inspect module or proof records after RBAC denial", async () => {
    permission.mockRejectedValue(new RbacError("Denied", "FORBIDDEN", 403))
    expect(await getPaymentTransactionProofTrailAction({ subjectId: "record-1" })).toMatchObject({ success: false, data: null })
    expect(moduleRead).not.toHaveBeenCalled()
    expect(read).not.toHaveBeenCalled()
  })

  it("does not turn a failed module check into an allowed proof read", async () => {
    moduleRead.mockRejectedValue(new Error("Private module source error"))
    const result = await getPaymentTransactionProofTrailAction({ subjectId: "record-1" })
    expect(result).toMatchObject({ success: false, data: null })
    expect(JSON.stringify(result)).not.toContain("Private module source error")
    expect(read).not.toHaveBeenCalled()
  })
})
