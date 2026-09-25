jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/pos/pos.service", () => ({ openPOSShift: jest.fn() }))

import { revalidateTag } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { openPOSShift } from "@/services/pos/pos.service"
import { ModuleNewWorkStoppedError } from "@/services/modules/module-admission.service"
import { POSShiftOpeningAccessError } from "@/services/pos/shift-opening-access"
import { openPOSShiftAction } from "../session.actions"

describe("shift opening policy recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "cashier-1", permissions: ["pos.session.start"] })
  })
  it("exposes a stable stop code with trusted scope and no cache success evidence", async () => {
    ;(openPOSShift as jest.Mock).mockRejectedValueOnce(new ModuleNewWorkStoppedError({ organizationId: "org-1", moduleSlug: "pos", operation: "pos.shift.open" }, ["sales"]))
    const result = await openPOSShiftAction({ terminalId: "terminal-1", locationId: "loc-1", openingBalance: "125", organizationId: "injected-org" })
    expect(result).toMatchObject({ success: false, data: null, code: "MODULE_NEW_WORK_STOPPED" })
    expect(openPOSShift).toHaveBeenCalledWith({ terminalId: "terminal-1", locationId: "loc-1", openingBalance: 125, organizationId: "org-1", userId: "cashier-1" })
    expect(revalidateTag).not.toHaveBeenCalled()
  })
  it("does not label an unrelated failure as a confirmed stop", async () => {
    ;(openPOSShift as jest.Mock).mockRejectedValueOnce(new Error("private database information"))
    const result = await openPOSShiftAction({ terminalId: "terminal-1", locationId: "loc-1", openingBalance: "0" })
    expect(result.success).toBe(false)
    expect(result).not.toHaveProperty("code", "MODULE_NEW_WORK_STOPPED")
    expect(result.error).not.toContain("private database information")
  })
  it("distinguishes unavailable commercial access from an operational stop", async () => {
    ;(openPOSShift as jest.Mock).mockRejectedValueOnce(new POSShiftOpeningAccessError())
    const result = await openPOSShiftAction({ terminalId: "terminal-1", locationId: "loc-1", openingBalance: "0" })
    expect(result).toMatchObject({ success: false, data: null, code: "POS_SHIFT_ENTITLEMENT_UNAVAILABLE" })
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
