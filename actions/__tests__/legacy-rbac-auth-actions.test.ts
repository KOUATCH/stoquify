jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/prisma/db", () => ({
  db: {
    customer: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
    },
    salesOrder: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock("@/services/customer/customer.service", () => ({
  createLegacyCustomerForOrg: jest.fn(),
  getLegacyCustomerByIdForOrg: jest.fn(),
}))

jest.mock("@/services/pos/pos.service", () => ({
  addPOSCartLine: jest.fn(),
  closePOSShift: jest.fn(),
  getActivePOSCart: jest.fn(),
  getActivePOSSession: jest.fn(),
  openPOSShift: jest.fn(),
  removePOSCartLine: jest.fn(),
  updatePOSCartLine: jest.fn(),
}))

jest.mock("@/services/tax-rate/tax-rate.service", () => ({
  createTaxRateForManagement: jest.fn(),
  getTaxRateManagementDataForOrg: jest.fn(),
  removeTaxRateForManagement: jest.fn(),
  updateTaxRateForManagement: jest.fn(),
}))

jest.mock("@/services/location/location.service", () => ({
  archiveLocationForManagement: jest.fn(),
  createLocationForManagement: jest.fn(),
  getLocationManagementDataForOrg: jest.fn(),
  updateLocationForManagement: jest.fn(),
}))

jest.mock("@/services/unit/unit.service", () => ({
  createUnitForManagement: jest.fn(),
  getUnitManagementDataForOrg: jest.fn(),
  removeUnitForManagement: jest.fn(),
  updateUnitForManagement: jest.fn(),
}))

import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { db } from "@/prisma/db"
import {
  createLegacyCustomerForOrg,
  getLegacyCustomerByIdForOrg,
} from "@/services/customer/customer.service"
import { addPOSCartLine, openPOSShift } from "@/services/pos/pos.service"
import { updateTaxRateForManagement } from "@/services/tax-rate/tax-rate.service"
import { createLocationForManagement } from "@/services/location/location.service"
import { removeUnitForManagement } from "@/services/unit/unit.service"
import { getCustomer, createCustomer } from "../customers/customerAction2"
import { openPOSShiftAction } from "../pos/session.actions"
import { addPOSCartLineAction } from "../pos/cart.actions"
import { updateManagedTaxRate } from "../taxRate/tax-rate-management-actions"
import { createManagedLocation } from "../locations/location-management-actions"
import { deleteManagedUnit } from "../units/unit-management-actions"

const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockGetLegacyCustomerByIdForOrg = getLegacyCustomerByIdForOrg as jest.Mock
const mockCreateLegacyCustomerForOrg = createLegacyCustomerForOrg as jest.Mock
const mockOrganizationFindFirst = db.organization.findFirst as jest.Mock
const mockOpenPOSShift = openPOSShift as jest.Mock
const mockAddPOSCartLine = addPOSCartLine as jest.Mock
const mockUpdateTaxRateForManagement = updateTaxRateForManagement as jest.Mock
const mockCreateLocationForManagement = createLocationForManagement as jest.Mock
const mockRemoveUnitForManagement = removeUnitForManagement as jest.Mock

const rbacContext = {
  orgId: "org-session",
  userId: "user-session",
  permissions: [
    "customers.read",
    "customers.create",
    "pos.use",
    "pos.session.start",
    "taxes.update",
    "locations.create",
    "inventory.units.delete",
  ],
}

const customerRecord = {
  id: "customer-1",
  name: "Retail customer",
  code: "CUST-0001",
  email: null,
  phone: null,
  address: null,
  taxId: null,
  creditLimit: null,
  paymentTerms: 30,
  notes: null,
  isActive: true,
  organizationId: "org-session",
  createdAt: new Date("2026-06-21T10:00:00Z"),
  updatedAt: new Date("2026-06-21T10:00:00Z"),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequirePermission.mockResolvedValue(rbacContext)
  mockAssertCanUseOrganization.mockResolvedValue(true)
  mockOrganizationFindFirst.mockResolvedValue({ id: "org-session" })
  mockGetLegacyCustomerByIdForOrg.mockResolvedValue(customerRecord)
  mockCreateLegacyCustomerForOrg.mockResolvedValue(customerRecord)
  mockOpenPOSShift.mockResolvedValue({ id: "session-1", terminalId: "terminal-1" })
  mockAddPOSCartLine.mockResolvedValue({ id: "cart-1" })
  mockUpdateTaxRateForManagement.mockResolvedValue({ id: "tax-1" })
  mockCreateLocationForManagement.mockResolvedValue({ id: "location-1" })
  mockRemoveUnitForManagement.mockResolvedValue({ id: "unit-1", deactivated: false })
})

describe("legacy RBAC/auth migrated actions", () => {
  it("derives customer read tenant scope from RBAC context instead of caller input", async () => {
    const result = await getCustomer("customer-1", "attacker-org")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("customers.read", {
      resource: "Customer",
      resourceId: "customer-1",
    })
    expect(mockGetLegacyCustomerByIdForOrg).toHaveBeenCalledWith("org-session", "customer-1")
  })

  it("requires customer create permission before writing new customers", async () => {
    const result = await createCustomer({
      name: "Retail customer",
      code: "",
      email: "",
      phone: "",
      address: "",
      taxId: "",
      creditLimit: null,
      paymentTerms: 30,
      notes: "",
      isActive: true,
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("customers.create", {
      resource: "Customer",
      auditAllowed: true,
    })
    expect(mockCreateLegacyCustomerForOrg).toHaveBeenCalledWith(
      "org-session",
      expect.objectContaining({
        name: "Retail customer",
        code: null,
        email: null,
        preferredLocale: "EN",
      }),
    )
  })

  it("denies customer reads before service access when RBAC rejects the user", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Missing permission: customers.read"))

    await expect(getCustomer("customer-1", "attacker-org")).rejects.toThrow("Missing permission: customers.read")
    expect(mockGetLegacyCustomerByIdForOrg).not.toHaveBeenCalled()
  })

  it("gates POS shift opening with the POS session permission and RBAC actor", async () => {
    const result = await openPOSShiftAction({
      terminalId: "terminal-1",
      locationId: "location-1",
      openingBalance: 1000,
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.session.start", {
      resource: "POSSession",
      resourceId: "terminal-1",
      auditAllowed: true,
    })
    expect(mockOpenPOSShift).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-session",
      userId: "user-session",
    }))
  })

  it("gates POS cart mutation with POS use permission and RBAC actor", async () => {
    const result = await addPOSCartLineAction({
      terminalId: "terminal-1",
      locationId: "location-1",
      itemId: "item-1",
      quantity: 2,
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.use", {
      resource: "POSCart",
      resourceId: "terminal-1",
      auditAllowed: true,
    })
    expect(mockAddPOSCartLine).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-session",
      userId: "user-session",
    }))
  })

  it("gates tax-rate updates with tenant guard and tax update permission", async () => {
    const result = await updateManagedTaxRate("org-session", "tax-1", {
      nameEn: "VAT",
      rate: 19.25,
      isActive: true,
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("taxes.update", {
      resource: "TaxRate",
      resourceId: "tax-1",
      auditAllowed: true,
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(rbacContext, "org-session")
    expect(mockUpdateTaxRateForManagement).toHaveBeenCalledWith(
      "org-session",
      "tax-1",
      expect.objectContaining({ nameEn: "VAT" }),
    )
  })

  it("gates location creation with tenant guard and location create permission", async () => {
    const result = await createManagedLocation("org-session", {
      name: "Warehouse",
      code: "WH",
      isActive: true,
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.create", {
      resource: "Location",
      auditAllowed: true,
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(rbacContext, "org-session")
    expect(mockCreateLocationForManagement).toHaveBeenCalledWith(
      "org-session",
      expect.objectContaining({ name: "Warehouse" }),
    )
  })

  it("gates unit deletion with tenant guard and unit delete permission", async () => {
    const result = await deleteManagedUnit("org-session", "unit-1")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.units.delete", {
      resource: "Unit",
      resourceId: "unit-1",
      auditAllowed: true,
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(rbacContext, "org-session")
    expect(mockRemoveUnitForManagement).toHaveBeenCalledWith("org-session", "unit-1")
  })
})
