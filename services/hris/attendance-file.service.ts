import "server-only"
import { z } from "zod"
import { parseEmployeeCsv } from "./employee-import.csv"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { previewOperationalTime, importReviewedOperationalTime } from "./attendance-import.service"
const fields=["sourceRecordId","employeeId","workDate","scheduledMinutes","workedMinutes","absenceMinutes","overtimeMinutes"] as const
const file=z.object({organizationId:z.string().min(1),actorId:z.string().min(1),actorPermissions:z.array(z.string()),sourceSystem:z.string().trim().min(1).max(120),fileName:z.string().min(1).max(255),content:z.string().max(262144),previewHash:z.string().optional()})
function command(raw:z.input<typeof file>){
  const input=file.parse(raw),csv=parseEmployeeCsv(input.content)
  if(csv.headers.length!==fields.length||fields.some(f=>!csv.headers.includes(f)))throw new BusinessRuleError("HRIS_TIME_IMPORT_COLUMNS: Use the attendance template columns.")
  const entries=csv.records.map(row=>{
    if(row.cells.length!==csv.headers.length)throw new BusinessRuleError(`HRIS_TIME_IMPORT_ROW_WIDTH: ${row.line}`)
    const values=Object.fromEntries(csv.headers.map((key,index)=>[key,row.cells[index].trim()]))
    if(!/^\d{4}-\d{2}-\d{2}$/.test(values.workDate)||!Number.isFinite(Date.parse(values.workDate))||new Date(values.workDate).toISOString().slice(0,10)!==values.workDate)throw new BusinessRuleError(`HRIS_TIME_IMPORT_DATE: ${row.line}`)
    for(const key of fields.slice(3))if(!/^\d+$/.test(values[key]))throw new BusinessRuleError(`HRIS_TIME_IMPORT_INTEGER: ${row.line}`)
    return {sourceRecordId:values.sourceRecordId,employeeId:values.employeeId,workDate:new Date(values.workDate+"T00:00:00Z"),scheduledMinutes:Number(values.scheduledMinutes),workedMinutes:Number(values.workedMinutes),absenceMinutes:Number(values.absenceMinutes),overtimeMinutes:Number(values.overtimeMinutes),sourceHash:hashBusinessPayload(values)}
  })
  const sourceHash=hashBusinessPayload({sourceSystem:input.sourceSystem,entries})
  return {...input,entries,sourceFileName:input.fileName,sourceHash,idempotencyKey:"attendance-file:"+sourceHash}
}
export async function previewAttendanceFile(input:z.input<typeof file>){return previewOperationalTime(command(input))}
export async function commitAttendanceFile(input:z.input<typeof file>){if(!input.previewHash)throw new BusinessRuleError("HRIS_TIME_IMPORT_PREVIEW_REQUIRED");return importReviewedOperationalTime(command(input))}
