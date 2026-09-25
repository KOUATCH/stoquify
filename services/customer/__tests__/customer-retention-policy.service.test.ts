import { db } from "@/prisma/db"
import { archiveLegacyCustomerForOrg, deleteCustomer, removeCustomerForManagement } from "../customer.service"

jest.mock("@/prisma/db", () => ({ db: { customer: { findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() } } }))
const mockCustomer = db.customer as unknown as { findFirst: jest.Mock; update: jest.Mock; updateMany: jest.Mock }
const emptyHistory = { salesOrders: 0, ledgerEntries: 0, receivableDocuments: 0, statementSnapshots: 0, settlements: 0 }
const updated = { id: "customer-1", organizationId: "org-1", name: "Retained customer", isActive: false, deletedAt: null }

beforeEach(() => {
  jest.resetAllMocks()
  mockCustomer.update.mockResolvedValue(updated)
  mockCustomer.updateMany.mockResolvedValue({ count: 1 })
})

describe.each([
  { name: "management removal", remove: removeCustomerForManagement, receipt: true },
  { name: "legacy archive", remove: archiveLegacyCustomerForOrg, receipt: true },
  { name: "direct service deletion", remove: deleteCustomer, receipt: false },
])("$name retention policy", ({ remove, receipt }) => {
  it.each(Object.keys(emptyHistory))("keeps customers with %s available to retained-record reads", async relation => {
    mockCustomer.findFirst.mockResolvedValue({ ...updated, _count: { ...emptyHistory, [relation]: 1 } })
    const result = await remove("org-1", "customer-1")
    expect(result).toEqual(receipt ? { id: "customer-1", mode: "deactivated" } : updated)
    expect(mockCustomer.update).toHaveBeenCalledTimes(1)
    expect(mockCustomer.update).toHaveBeenCalledWith({ where: { id: "customer-1" }, data: { isActive: false } })
    expect(mockCustomer.updateMany).not.toHaveBeenCalled()
    expect(mockCustomer.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "customer-1", organizationId: "org-1", deletedAt: null } }))
  })

  it("archives only when the existing policy observes no retained history", async () => {
    mockCustomer.findFirst.mockResolvedValue({ ...updated, _count: emptyHistory })
    const result = await remove("org-1", "customer-1")
    if (receipt) expect(result).toEqual({ id: "customer-1", mode: "archived" })
    else expect(result).toEqual(updated)
    expect(mockCustomer.update).toHaveBeenCalledWith({ where: { id: "customer-1" }, data: { isActive: false, deletedAt: expect.any(Date) } })
    expect(mockCustomer.updateMany).not.toHaveBeenCalled()
  })

  it("rejects missing or other-tenant customer objects without mutation", async () => {
    mockCustomer.findFirst.mockResolvedValue(null)
    mockCustomer.updateMany.mockResolvedValue({ count: 0 })
    await expect(remove("org-1", "customer-other")).rejects.toThrow("Customer not found")
    expect(mockCustomer.update).not.toHaveBeenCalled()
    expect(mockCustomer.updateMany).not.toHaveBeenCalled()
  })
})
