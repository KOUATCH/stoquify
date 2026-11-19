"use client"
import { useHrisFreshAuth } from "./useHrisFreshAuth"
import { HrisLeaveManagement, type LeaveWorkspace, type LeaveExecute } from "./HrisLeaveManagement"
import { getManagedLeaveWorkspaceAction, adjustHrisLeaveBalanceAction, executeHrisLeaveEntitlementsAction, decideLeaveCancellationAction } from "@/actions/hris/leave-entitlement.actions"
const actions = { READ: getManagedLeaveWorkspaceAction, ADJUST: adjustHrisLeaveBalanceAction, EXECUTE: executeHrisLeaveEntitlementsAction, DECIDE: decideLeaveCancellationAction }
export function HrisLeaveManagementClient({ initial, locale }: { initial: LeaveWorkspace; locale: "en" | "fr" }) {
  const recovery=useHrisFreshAuth(locale,initial.employeeId)
  const execute: LeaveExecute = (command, input) => recovery.run(async()=>await actions[command](input))
  return <>{recovery.dialog}<HrisLeaveManagement key={initial.employeeId} initial={initial} locale={locale} execute={execute} /></>
}
