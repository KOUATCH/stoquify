import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { assertLeaveEligibility } from "./leave-policy"
import { attendanceMetadata } from "./attendance-correction"
import { projectEmploymentAsOf } from "./employment-projection"

/** Internal guard: callers establish authorization and the employee lock first. */
export async function assertEmployeeLeaveEligibility(tx: Prisma.TransactionClient, organizationId: string, employeeId: string, leavePolicyId: string, start: Date, end = start) {
  const [employee, policy, events] = await Promise.all([
    tx.payrollEmployee.findFirst({ where: { id: employeeId, organizationId, deletedAt: null } }),
    tx.hrisLeavePolicy.findFirst({ where: { id: leavePolicyId, organizationId } }),
    tx.businessEvent.findMany({ where: { organizationId, sourceId: employeeId, eventType: "hris.employee.lifecycle.applied", status: "APPLIED" }, select: { id: true, payload: true } }),
  ])
  assertLeaveEligibility(policy, employeeId, start, end)
  if (!employee || employee.countryCode !== policy!.countryCode) throw new BusinessRuleError("HRIS_LEAVE_EMPLOYEE_COUNTRY_UNRESOLVED: Confirm the employee's country and policy enrollment.")
  const current = { ...employee, hireDate: employee.hireDate.toISOString(), terminationDate: employee.terminationDate?.toISOString() ?? null }
  const checkpoints = [start, end, ...events.map(event => new Date(String(attendanceMetadata(event.payload).effectiveAt))).filter(date => date > start && date < end)]
  if (checkpoints.some(date => {
    const { state } = projectEmploymentAsOf(current, events, date)
    return state.status !== "ACTIVE" || new Date(state.hireDate) > date || (state.terminationDate && new Date(state.terminationDate) <= date)
  })) throw new BusinessRuleError("HRIS_LEAVE_EMPLOYMENT_INTERVAL_UNRESOLVED: Leave requires active employment throughout the selected dates.")
  return policy!
}
