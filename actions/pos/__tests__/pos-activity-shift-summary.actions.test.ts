import { canUsePermission, requireAnyPermission } from "@/lib/security/rbac"
import { db } from "@/prisma/db"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import { getPOSActivityShiftSummaryAction } from "../pos-activity-shift-summary.actions"

jest.mock("@/lib/security/rbac", () => ({ canUsePermission: jest.fn(), requireAnyPermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/prisma/db", () => ({
  db: { pOSSession: { findFirst: jest.fn() }, organization: { findUnique: jest.fn() } },
}))

const cashier = { orgId: "org-a", userId: "cashier-a", permissions: ["pos.use"] }
const manager = { ...cashier, userId: "manager-a", permissions: ["pos.use", "finance.cash-drawer.read"] }
const input = { date: "2026-11-18", locationId: "location-a", terminalId: "register-a", sessionId: "shift-a" }
const close = {
  id: "shift-a",
  sessionNumber: "001",
  locationId: "location-a",
  terminalId: "register-a",
  terminal: { locationId: "location-a" },
  startTime: new Date("2026-11-18T21:00:00Z"),
  endTime: new Date("2026-11-18T23:15:00Z"),
  expectedBalance: "31000",
  closingBalance: "30000",
  variance: "-1000",
}

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(requireAnyPermission).mockResolvedValue(cashier as Awaited<ReturnType<typeof requireAnyPermission>>)
  jest.mocked(canUsePermission).mockReturnValue(false)
  jest.mocked(observeModuleAccess).mockResolvedValue({ allowed: true } as Awaited<ReturnType<typeof observeModuleAccess>>)
  jest.mocked(db.pOSSession.findFirst).mockResolvedValue(close as never)
  jest.mocked(db.organization.findUnique).mockResolvedValue({ currency: "XAF", timezone: "Africa/Douala" } as never)
})

it("reads a selected, finalized shift within the cashier's organization and actor scope", async () => {
  await expect(getPOSActivityShiftSummaryAction(input)).resolves.toMatchObject({
    success: true,
    scope: { organizationId: "org-a", actorId: "cashier-a" },
    data: { sessionId: "shift-a", closeDate: "2026-11-19", currency: "XAF", expected: "31000", counted: "30000", variance: "-1000" },
  })
  expect(db.pOSSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: {
      id: "shift-a", organizationId: "org-a", userId: "cashier-a", status: { in: ["CLOSED", "RECONCILED"] },
      endTime: { not: null }, locationId: "location-a", terminalId: "register-a", location: { organizationId: "org-a" },
      terminal: { organizationId: "org-a" },
    },
  }))
})

it("preserves recorded zero and missing balances in the authorized manager's view", async () => {
  jest.mocked(requireAnyPermission).mockResolvedValue(manager as Awaited<ReturnType<typeof requireAnyPermission>>)
  jest.mocked(db.pOSSession.findFirst).mockResolvedValue({ ...close, expectedBalance: null, closingBalance: "0", variance: null } as never)
  await expect(getPOSActivityShiftSummaryAction({ ...input, date: "2026-11-19" })).resolves.toMatchObject({
    success: true, data: { expected: null, counted: "0", variance: null },
  })
  expect(db.pOSSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ organizationId: "org-a", userId: undefined }),
  }))
})

it("omits a shift outside the selected date or with mismatched station location evidence", async () => {
  await expect(getPOSActivityShiftSummaryAction({ ...input, date: "2026-11-20" })).resolves.toMatchObject({ success: true, data: null })
  jest.mocked(db.pOSSession.findFirst).mockResolvedValue({ ...close, terminal: { locationId: "other-location" } } as never)
  await expect(getPOSActivityShiftSummaryAction(input)).resolves.toMatchObject({ success: true, data: null })
})

it("rejects client-supplied actor scope and prevents reads when module access is denied", async () => {
  await expect(getPOSActivityShiftSummaryAction({ ...input, organizationId: "other-org" })).resolves.toMatchObject({ success: false })
  expect(requireAnyPermission).not.toHaveBeenCalled()
  jest.mocked(observeModuleAccess).mockResolvedValue({ allowed: false } as Awaited<ReturnType<typeof observeModuleAccess>>)
  await expect(getPOSActivityShiftSummaryAction(input)).resolves.toMatchObject({ success: false, status: 403 })
  expect(db.pOSSession.findFirst).not.toHaveBeenCalled()
})
