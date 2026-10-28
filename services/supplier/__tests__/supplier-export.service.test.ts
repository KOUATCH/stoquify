const mockDbTransaction = jest.fn()
const mockAuditExportSafetyDecision = jest.fn()

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: (...args: unknown[]) => mockDbTransaction(...args),
  },
}))

jest.mock("@/services/security/export-safety.service", () => ({
  auditExportSafetyDecision: (...args: unknown[]) => mockAuditExportSafetyDecision(...args),
}))

import { auditSupplierExportDecision } from "@/services/supplier/supplier-export.service"

describe("auditSupplierExportDecision", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("persists the controlled export decision inside a service-owned transaction", async () => {
    const tx = { auditLog: { create: jest.fn() } }
    const decision = {
      allowed: true,
      reasonCode: "ALLOWED",
      safeMessage: "Controlled export allowed.",
      action: "report.export",
      organizationId: "org-1",
      actorId: "user-1",
      resourceType: "SupplierManagementExport",
      resourceId: "supplier-directory-redacted",
      exportContext: {
        scope: "supplier-directory:Name,Code",
        filtersHash: "a".repeat(64),
        rowCount: 2,
        fileType: "csv",
        sensitivity: "operational",
        watermarkId: "wm_supplier_export",
      },
    }
    mockDbTransaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
    mockAuditExportSafetyDecision.mockResolvedValue({ id: "audit-1" })

    await auditSupplierExportDecision(decision as never)

    expect(mockDbTransaction).toHaveBeenCalledTimes(1)
    expect(mockAuditExportSafetyDecision).toHaveBeenCalledWith(tx, decision)
  })
})
