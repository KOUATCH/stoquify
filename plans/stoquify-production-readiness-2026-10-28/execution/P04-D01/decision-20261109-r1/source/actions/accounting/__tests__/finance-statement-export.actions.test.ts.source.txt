jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((_options, handler) => {
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["accounting.reports.read"],
        freshAuth: null,
      })
      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/accounting/finance-statement-export.service", () => ({
  enqueueFinanceStatementExport: jest.fn(),
  getFinanceStatementExportJobStatus: jest.fn(),
}))

jest.mock("@/services/accounting/finance-statement-export-operations.service", () => ({
  getFinanceStatementExportOperationsSnapshot: jest.fn(),
}))

import { protect } from "@/services/_shared/protect"
import { getFinanceStatementExportOperationsSnapshot } from "@/services/accounting/finance-statement-export-operations.service"
import { getFinanceStatementExportOperationsSnapshotAction } from "../finance-statement-export.actions"

const mockProtect = protect as jest.Mock
const mockGetOperations = getFinanceStatementExportOperationsSnapshot as jest.Mock

describe("finance statement export actions", () => {
  beforeEach(() => {
    mockGetOperations.mockClear()
    mockGetOperations.mockResolvedValue({ ready: false, queue: { pendingCount: 0 } })
  })

  it("derives operations tenant scope and keeps the read boundary protected", async () => {
    const result = await getFinanceStatementExportOperationsSnapshotAction({
      organizationId: "attacker-org",
    })

    expect(result.success).toBe(true)
    expect(mockGetOperations).toHaveBeenCalledWith({ organizationId: "org-session" })

    const operationsProtection = mockProtect.mock.calls.find(
      ([options]) => options.auditResource === "FinanceStatementExportOperations",
    )?.[0]
    expect(operationsProtection).toMatchObject({
      permission: "accounting.reports.read",
      tenantGuard: "handler-derived",
      module: {
        moduleSlug: "accounting",
        surface: "accounting.statement.export.operations",
        accessIntent: "read",
        mode: "enforce",
      },
    })
  })
})
