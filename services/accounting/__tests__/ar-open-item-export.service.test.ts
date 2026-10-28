jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
      callback({}),
    ),
  },
}))

jest.mock("@/services/accounting/ar-open-item.service", () => ({
  getCustomerAROpenItems: jest.fn(),
}))

jest.mock("@/services/security/export-safety.service", () => ({
  auditExportSafetyDecision: jest.fn(),
  buildExportWatermark: jest.fn().mockReturnValue("wm_ar_export"),
  evaluateExportSafety: jest.fn(),
}))

import { getCustomerAROpenItems } from "@/services/accounting/ar-open-item.service"
import {
  buildAROpenItemsExportCsv,
  prepareAROpenItemsExport,
} from "@/services/accounting/ar-open-item-export.service"
import {
  auditExportSafetyDecision,
  buildExportWatermark,
  evaluateExportSafety,
} from "@/services/security/export-safety.service"

const item = {
  customerId: "customer-1",
  customerName: "=unsafe customer",
  referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
  referenceId: "document-1",
  documentNumber: "AR-001",
  documentVersion: 1,
  documentHash: "document-hash",
  stateHash: "state-hash",
  currency: "EUR",
  orderNumber: "SO-001",
  invoiceDate: "2026-07-01T00:00:00.000Z",
  dueDate: "2026-07-31T00:00:00.000Z",
  openingAmount: "100.00",
  initialPaidAmount: "0.00",
  initialUnpaidAmount: "100.00",
  paidAmount: "40.00",
  allocatedAmount: "40.00",
  openAmount: "60.00",
  status: "partial" as const,
  daysPastDue: 9,
  agingBucket: "1-30" as const,
  evidenceGrade: "posted" as const,
  allocations: [],
}

const currencySummary = {
  currency: "EUR",
  itemCount: 1,
  openItemCount: 1,
  settledItemCount: 0,
  totalOpened: "100.00",
  totalAllocated: "40.00",
  totalOpen: "60.00",
  overdueAmount: "60.00",
}

describe("AR open-items controlled export", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getCustomerAROpenItems as jest.Mock).mockResolvedValue({
      items: [item],
      summary: {
        itemCount: 1,
        openItemCount: 1,
        settledItemCount: 0,
        currency: "EUR",
        mixedCurrency: false,
        totalOpened: "100.00",
        totalAllocated: "40.00",
        totalOpen: "60.00",
        overdueAmount: "60.00",
      },
      summariesByCurrency: [currencySummary],
      asOf: "2026-08-09T12:00:00.000Z",
      recordedThrough: "2026-08-09T12:00:00.000Z",
    })
    ;(evaluateExportSafety as jest.Mock).mockReturnValue({
      allowed: true,
      reasonCode: "ALLOWED",
      safeMessage: "Controlled export allowed.",
      action: "report.export",
      organizationId: "org-1",
      actorId: "user-1",
      resourceType: "AROpenItemsHistoryExport",
      resourceId: "filters-hash",
      exportContext: {
        scope: "customer-ar-open-items-history",
        filtersHash: "filters-hash",
        rowCount: 1,
        fileType: "csv",
        sensitivity: "financial",
        watermarkId: "wm_ar_export",
      },
    })
  })

  it("escapes spreadsheet formulas and includes bitemporal and currency evidence", () => {
    const content = buildAROpenItemsExportCsv({
      watermarkId: "wm_ar_export",
      generatedAt: "2026-08-09T12:00:00.000Z",
      filtersHash: "filters-hash",
      asOf: "2026-08-09T12:00:00.000Z",
      recordedThrough: "2026-08-09T12:00:00.000Z",
      summariesByCurrency: [currencySummary],
      items: [item],
    })

    expect(content).toContain(`"watermark_id","wm_ar_export"`)
    expect(content).toContain(`"currency_summary","EUR"`)
    expect(content).toContain(`"recorded_through","2026-08-09T12:00:00.000Z"`)
    expect(content).toContain(`"'=unsafe customer"`)
  })

  it("derives row count from server data and audits before releasing the file", async () => {
    const result = await prepareAROpenItemsExport({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions: ["finance.reports.export"],
      lastAuthAt: new Date("2026-08-09T11:59:00.000Z").getTime(),
      now: new Date("2026-08-09T12:00:00.000Z"),
    })

    expect(buildExportWatermark).toHaveBeenCalledWith(
      expect.objectContaining({ rowCount: 1, sensitivity: "financial" }),
    )
    expect(evaluateExportSafety).toHaveBeenCalledWith(
      expect.objectContaining({
        lastAuthAt: new Date("2026-08-09T11:59:00.000Z").getTime(),
        exportContext: expect.objectContaining({ rowCount: 1 }),
      }),
    )
    expect(auditExportSafetyDecision).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      fileName: "customer-ar-open-items-wm_ar_export.csv",
      rowCount: 1,
      watermarkId: "wm_ar_export",
      summariesByCurrency: [currencySummary],
    })
    expect(result.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/)
  })
})
