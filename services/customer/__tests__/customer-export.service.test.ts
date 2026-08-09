import { Prisma } from "@prisma/client"

jest.mock("@/prisma/db", () => {
  const tx = {
    customer: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    salesOrder: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    customerLedgerEntry: {
      groupBy: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }

  return {
    db: {
      ...tx,
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    },
  }
})

import { db } from "@/prisma/db"
import {
  buildCustomerExportCsv,
  escapeCustomerCsvCell,
  prepareCustomerExport,
} from "../customer-export.service"
import { CustomerExportRequestSchema } from "../customer.schemas"
import { getSensitiveActionPolicy } from "@/services/controls/sensitive-action.service"

describe("customer controlled export", () => {
  const mockDb = db as unknown as {
    customer: { findMany: jest.Mock }
    salesOrder: { groupBy: jest.Mock }
    customerLedgerEntry: { groupBy: jest.Mock }
    auditLog: { create: jest.Mock }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each(["=2+3", "+SUM(A1:A2)", "-10+20", "@IMPORT", "\tformula"])(
    "neutralizes spreadsheet formula injection for %s",
    (value) => {
      expect(escapeCustomerCsvCell(value)).toBe(`"'${value}"`)
    },
  )

  it("escapes embedded quotes and emits a durable export manifest", () => {
    const content = buildCustomerExportCsv({
      watermarkId: "wm_customer",
      generatedAt: "2026-08-09T12:00:00.000Z",
      purpose: "Controller review",
      scope: "customers",
      filtersHash: "sha256:filters",
      headers: ["name"],
      rows: [['Acme "Central"']],
    })

    expect(content.startsWith("\uFEFF")).toBe(true)
    expect(content).toContain('"watermark_id","wm_customer"')
    expect(content).toContain('"filters_hash","sha256:filters"')
    expect(content).toContain('"Acme ""Central"""')
  })

  it("requires a customer identifier for single-customer and order scopes", () => {
    expect(() => CustomerExportRequestSchema.parse({ scope: "customer" })).toThrow(
      "Customer is required for this export scope",
    )
    expect(() => CustomerExportRequestSchema.parse({ scope: "customer-orders" })).toThrow(
      "Customer is required for this export scope",
    )
  })

  it("registers customer exports as critical, fresh-auth, export-controlled actions", () => {
    expect(getSensitiveActionPolicy("customers.export")).toMatchObject({
      permission: "customers.export",
      riskTier: "critical",
      requiredAssurance: "L1",
      freshAuthMaxAgeSeconds: 300,
      exportControl: true,
    })
  })

  it("releases tenant rows only after recording the controlled-export decision", async () => {
    mockDb.customer.findMany.mockResolvedValue([
      {
        id: "customer-1",
        organizationId: "org-1",
        name: "Acme",
        code: "CUST-001",
        email: "finance@acme.test",
        phone: null,
        address: null,
        taxId: null,
        creditLimit: new Prisma.Decimal(5000),
        currentBalance: new Prisma.Decimal(1200),
        paymentTerms: 30,
        notes: null,
        isActive: true,
        preferredLocale: "EN",
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        updatedAt: new Date("2026-08-02T00:00:00.000Z"),
        _count: { salesOrders: 1, ledgerEntries: 1 },
      },
    ])
    mockDb.salesOrder.groupBy
      .mockResolvedValueOnce([
        {
          customerId: "customer-1",
          _count: { _all: 1 },
          _sum: { total: new Prisma.Decimal(2500) },
          _max: { orderDate: new Date("2026-08-03T00:00:00.000Z") },
        },
      ])
      .mockResolvedValueOnce([{ customerId: "customer-1", _count: { _all: 1 } }])
      .mockResolvedValueOnce([{ customerId: "customer-1", _count: { _all: 1 } }])
    mockDb.customerLedgerEntry.groupBy.mockResolvedValue([
      {
        customerId: "customer-1",
        _max: { entryDate: new Date("2026-08-04T00:00:00.000Z") },
      },
    ])
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" })

    const result = await prepareCustomerExport({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions: ["customers.export"],
      scope: "customers",
      customerIds: ["customer-1"],
      purpose: "Controller customer review",
      lastAuthAt: new Date("2026-08-09T11:59:00.000Z"),
      now: new Date("2026-08-09T12:00:00.000Z"),
    })

    expect(mockDb.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-1",
        deletedAt: null,
        id: { in: ["customer-1"] },
      }),
      take: 5001,
    }))
    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CONTROLLED_EXPORT_ALLOWED",
        organizationId: "org-1",
        userId: "user-1",
        changes: expect.objectContaining({
          metadata: expect.objectContaining({
            selectedFields: expect.arrayContaining(["customer_id", "name"]),
            redactedFields: expect.arrayContaining([
              "email",
              "tax_id",
              "credit_limit",
              "current_balance",
              "notes",
            ]),
          }),
        }),
      }),
    })
    expect(result).toMatchObject({
      scope: "customers",
      customerId: null,
      rowCount: 1,
      mimeType: "text/csv;charset=utf-8",
      generatedAt: "2026-08-09T12:00:00.000Z",
    })
    expect(result.watermarkId).toMatch(/^wm_[a-f0-9]{24}$/)
    expect(result.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(result.content).toContain('"watermark_id"')
    expect(result.content).toContain('"Acme"')
    expect(result.content).not.toContain("finance@acme.test")
    expect(result.content).not.toContain('"tax_id"')
    expect(result.content).not.toContain('"credit_limit"')
    expect(result.content).not.toContain('"current_balance"')
  })
})
