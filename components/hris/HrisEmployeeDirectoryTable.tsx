"use client"

import Link from "next/link"
import { ArrowRight, CircleAlert, UserCheck } from "lucide-react"

import {
  HrPayrollTableControls,
  HrPayrollTablePagination,
  useHrPayrollTable,
} from "@/components/hr-payroll/HrPayrollTableControls"
import { localizePath } from "@/i18n/routing"
import type { HrisEmployeeDirectoryResult } from "@/services/hris/employee.service"
import type { Locale } from "@/types/bilingual"

type Employee = HrisEmployeeDirectoryResult["employees"][number]

function readinessLabel(blockers: readonly string[]) {
  return blockers.length === 0 ? "Ready" : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`
}

export function HrisEmployeeDirectoryTable({
  employees,
  asOf,
  locale,
}: {
  employees: Employee[]
  asOf: string
  locale: Locale
}) {
  const employeeTable = useHrPayrollTable({
    rows: employees,
    searchText: (employee) => JSON.stringify(employee),
    dateValue: (employee) => employee.employment.hireDate ?? employee.attendanceReadiness.latestFrozenPeriodEnd ?? asOf,
    sortOptions: [
      { key: "employee", label: "Employee", value: (employee) => employee.displayName },
      { key: "status", label: "Status", value: (employee) => employee.status },
      { key: "job", label: "Job", value: (employee) => employee.employment.jobTitle },
      { key: "department", label: "Department", value: (employee) => employee.employment.department },
      { key: "readiness", label: "Blockers", value: (employee) => employee.blockers.length },
    ],
  })

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-white/10">
      <HrPayrollTableControls
        table={employeeTable}
        locale={locale}
        tableLabel="employee directory"
        searchPlaceholder="Search employees, jobs, departments, or readiness"
      />
      <div className="dashboard-data-table dashboard-table-shell overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-normal text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">User mapping</th>
              <th className="px-4 py-3 font-medium">Readiness</th>
              <th className="w-12 px-3 py-3"><span className="sr-only">Open profile</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-slate-950/70 text-slate-200">
            {employeeTable.rows.length ? employeeTable.rows.map((employee) => (
              <tr key={employee.id} className="transition-colors hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{employee.displayName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{employee.employment.countryCode ?? "Country not set"}</p>
                </td>
                <td className="px-4 py-3">{employee.status}</td>
                <td className="px-4 py-3">{employee.employment.jobTitle ?? "Not assigned"}</td>
                <td className="px-4 py-3">{employee.employment.department ?? "Not assigned"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    {employee.userMapping.state === "LINKED" ? (
                      <UserCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                    ) : (
                      <CircleAlert className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    )}
                    {employee.userMapping.state}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={employee.blockers.length === 0 ? "text-emerald-200" : "text-amber-200"}>
                    {readinessLabel(employee.blockers)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={localizePath(`/dashboard/people/${employee.id}`, locale)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white"
                    title={`Open ${employee.displayName} profile`}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Open {employee.displayName} profile</span>
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No employees match the table filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <HrPayrollTablePagination table={employeeTable} locale={locale} />
    </div>
  )
}
