import { PayrollEmployeeStatus } from "@prisma/client"
import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { attendanceMetadata } from "./attendance-correction"

const stateSchema=z.object({id:z.string(),employeeNumber:z.string(),status:z.nativeEnum(PayrollEmployeeStatus),hireDate:z.string().datetime(),terminationDate:z.string().datetime().nullable(),locationId:z.string().nullable(),department:z.string().nullable(),jobTitle:z.string().nullable(),costCenter:z.string().nullable()})
export type EmploymentState=z.output<typeof stateSchema>

/** Applied facts only. A future approved request is a separate forecast, never current truth. */
export function projectEmploymentAsOf(current:EmploymentState,events:Array<{id:string;payload:unknown}>,asOf:Date) {
  let state=current
  const history=events.map((event):Record<string,unknown>&{id:string}=>({id:event.id,...attendanceMetadata(event.payload)}))
    .sort((a,b)=>new Date(String(b.effectiveAt)).getTime()-new Date(String(a.effectiveAt)).getTime()||b.id.localeCompare(a.id))
  for(const event of history){
    if(typeof event.effectiveAt!=="string"||!Number.isFinite(new Date(event.effectiveAt).getTime())) throw new BusinessRuleError("HRIS_LIFECYCLE_HISTORY_UNPROVEN: Reconcile incomplete movement evidence before an as-of projection.")
    if(new Date(event.effectiveAt)<=asOf)break
    const before=stateSchema.safeParse(event.before)
    if(!before.success)throw new BusinessRuleError("HRIS_LIFECYCLE_HISTORY_UNPROVEN: Legacy movement has no retained before-state.")
    state=before.data
  }
  return {asOf:asOf.toISOString(),state,basis:"APPLIED_MOVEMENT_HISTORY" as const,futureApprovalsApplied:false}
}
