jest.mock("server-only", () => ({}))

import { db } from "@/prisma/db"
import { getOrganizationManagementRowsForActor } from "../organization-settings.service"

jest.mock("@/prisma/db", () => ({
  db: { organization: { findMany: jest.fn() }, payment: { groupBy: jest.fn() } },
}))

const mockDb = db as unknown as {
  organization: { findMany: jest.Mock }
  payment: { groupBy: jest.Mock }
}

function organization(id: string, deletedAt: Date | null = null) {
  return {
    id, name: id === "org-current" ? "Current company" : "Private other company",
    slug: id, industry: null, country: "CM", state: null, address: "Private address",
    currency: "XAF", timezone: "Africa/Douala", defaultLocale: "EN",
    inventoryStartDate: null, fiscalYearStart: null, isActive: true,
    createdAt: new Date("2026-09-01T00:00:00Z"), updatedAt: new Date("2026-09-01T00:00:00Z"),
    deletedAt,
    _count: { users: 2, items: 3, locations: 4, suppliers: 5, customers: 6, purchaseOrders: 7, salesOrders: 8, payments: 9 },
  }
}

describe("organization management directory tenant scope", () => {
  let organizations: ReturnType<typeof organization>[]

  beforeEach(() => {
    jest.clearAllMocks()
    organizations = [organization("org-current"), organization("org-other")]
    mockDb.organization.findMany.mockImplementation(async ({ where }) => organizations.filter(
      (row) => (where.id === undefined || row.id === where.id) && row.deletedAt === where.deletedAt,
    ))
    mockDb.payment.groupBy.mockImplementation(async ({ where }) => [
      { organizationId: "org-current", _sum: { amount: "125.50" } },
      { organizationId: "org-other", _sum: { amount: "987654.00" } },
    ].filter((row) => where.organizationId.in.includes(row.organizationId)))
  })

  it.each<[string, string[]]>([
    ["canonical read", ["system.organization.read"]],
    ["canonical update", ["system.organization.update"]],
    ["legacy company read", ["COMPANY_READ"]],
    ["legacy organization read", ["organizations.read"]],
    ["legacy organization create", ["organizations.create"]],
    ["legacy organization manage", ["organizations.manage"]],
    ["legacy settings manage", ["settings.organization.manage"]],
    ["wildcard tenant administrator", ["*"]],
    ["no additional scope", []],
  ])("returns only the supplied tenant for %s", async (_label, permissions) => {
    const rows = await getOrganizationManagementRowsForActor({
      organizationId: "org-current", actor: { permissions },
    })

    expect(rows.map((row) => row.id)).toEqual(["org-current"])
    expect(rows[0]).toMatchObject({
      name: "Current company", paidPaymentsAmount: "125.50", usersCount: 2, itemsCount: 3,
      locationsCount: 4, suppliersCount: 5, customersCount: 6,
      purchaseOrdersCount: 7, salesOrdersCount: 8, paymentsCount: 9,
    })
    expect(mockDb.organization.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "org-current", deletedAt: null },
    }))
    expect(mockDb.payment.groupBy).toHaveBeenCalledWith({
      by: ["organizationId"],
      where: { organizationId: { in: ["org-current"] }, deletedAt: null, status: "PAID" },
      _sum: { amount: true },
    })
  })

  it.each(["missing", "deleted"])("does not query another tenant's payments when the supplied tenant is %s", async (state) => {
    organizations = state === "missing"
      ? [organization("org-other")]
      : [organization("org-current", new Date("2026-09-02T00:00:00Z")), organization("org-other")]
    await expect(getOrganizationManagementRowsForActor({
      organizationId: "org-current", actor: { permissions: ["*"] },
    })).resolves.toEqual([])
    expect(mockDb.payment.groupBy).not.toHaveBeenCalled()
  })

  it("keeps a genuine no-paid-payments result at zero", async () => {
    mockDb.payment.groupBy.mockResolvedValue([])
    const rows = await getOrganizationManagementRowsForActor({ organizationId: "org-current", actor: {} })
    expect(rows).toHaveLength(1)
    expect(rows[0].paidPaymentsAmount).toBe("0.00")
  })

  it.each([true, false])("keeps export authority separate from directory read: %s", async granted => {
    const rows = await getOrganizationManagementRowsForActor({ organizationId: "org-current", actor: { permissions: ["system.organization.read", ...(granted ? ["reports.export"] : [])] } })
    expect(rows[0].canExport).toBe(granted)
  })

  it("propagates organization query failure without fabricating an empty directory", async () => {
    mockDb.organization.findMany.mockRejectedValue(new Error("organization lookup unavailable"))
    await expect(getOrganizationManagementRowsForActor({ organizationId: "org-current", actor: {} }))
      .rejects.toThrow("organization lookup unavailable")
    expect(mockDb.payment.groupBy).not.toHaveBeenCalled()
  })

  it("propagates payment query failure without returning a false zero revenue", async () => {
    mockDb.payment.groupBy.mockRejectedValue(new Error("payment aggregation unavailable"))
    await expect(getOrganizationManagementRowsForActor({ organizationId: "org-current", actor: {} }))
      .rejects.toThrow("payment aggregation unavailable")
  })
})
