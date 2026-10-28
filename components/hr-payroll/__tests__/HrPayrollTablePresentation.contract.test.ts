import { readFileSync } from "node:fs"
import { join } from "node:path"

const TABLE_FILES = [
  "components/hris/HrisApprovalInbox.tsx",
  "components/hris/HrisEmployeeDirectoryTable.tsx",
  "components/hris/HrisManagerSelfService.tsx",
  "components/hris/HrisMovementHistory.tsx",
  "components/payroll/PayrollCompensationWorkbench.tsx",
  "components/payroll/PayrollContractLifecycleWorkbench.tsx",
  "components/payroll/PayrollDeclarationWorkbench.tsx",
  "components/payroll/PayrollEmployeeBalanceWorkbench.tsx",
  "components/payroll/PayrollEmployeeSourceWorkbench.tsx",
  "components/payroll/PayrollPaymentAttendanceReadinessWorkbench.tsx",
  "components/payroll/PayrollPaymentReconciliationWorkbench.tsx",
  "components/payroll/PayrollRegisterTieOut.tsx",
  "components/payroll/PayrollRunWorkbench.tsx",
  "components/payroll/PayrollSetupControlPlane.tsx",
] as const

describe("HR and payroll table presentation contract", () => {
  it("uses the shared controls, pagination, and Brand and Unit shell for every table", () => {
    let tableCount = 0
    let controlsCount = 0
    let paginationCount = 0
    let canonicalShellCount = 0

    for (const file of TABLE_FILES) {
      const source = readFileSync(join(process.cwd(), file), "utf8")
      tableCount += source.match(/<table/g)?.length ?? 0
      controlsCount += source.match(/<HrPayrollTableControls/g)?.length ?? 0
      paginationCount += source.match(/<HrPayrollTablePagination/g)?.length ?? 0
      canonicalShellCount += source.match(
        /className="dashboard-data-table dashboard-table-shell overflow-x-auto"/g,
      )?.length ?? 0
    }

    expect(tableCount).toBe(18)
    expect(controlsCount).toBe(tableCount)
    expect(paginationCount).toBe(tableCount)
    expect(canonicalShellCount).toBe(tableCount)
  })
})
