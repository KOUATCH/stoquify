"use server"
import { revalidatePath } from "next/cache"
import { protect } from "@/services/_shared/protect"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getRosterWorkspace, certifyRosterAttendance } from "@/services/hris/roster-workspace.service"
import { prepareHrisWorkSchedule, approveHrisWorkSchedule } from "@/services/hris/schedule-revision.service"
import { previewAttendanceFile, commitAttendanceFile } from "@/services/hris/attendance-file.service"
import { resolveReviewedOperationalAnomaly } from "@/services/hris/attendance-import.service"
function boundary<T>(permission:string,surface:string,operation:(input:any)=>Promise<T>,write=true){
  return protect<unknown,T>({permission,freshAuth:true,tenantGuard:"handler-derived",module:{moduleSlug:"payroll",surface,accessIntent:write?"write":"read",mode:"enforce"}},async(input,ctx)=>{
    if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError("Refresh your session before continuing.")
    const fields=input&&typeof input==="object"&&!Array.isArray(input)?input:{}
    const result=await operation({...fields,organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions})
    if(write){try{revalidatePath("/[locale]/dashboard/people/roster","page");revalidatePath("/[locale]/dashboard/people/me/schedule","page")}catch{/* Preserve the committed owner result; the workspace performs a separate authorized read. */}}
    return result
  })
}
const read=boundary("hris.people.read","hris.roster.read",input=>getRosterWorkspace({...input,own:false}),false)
const own=boundary("hris.self_service.read","hris.roster.own",input=>getRosterWorkspace({...input,own:true}),false)
const prepare=boundary("hris.people.manage","hris.roster.prepare",prepareHrisWorkSchedule)
const approve=boundary("hris.people.manage","hris.roster.approve",approveHrisWorkSchedule)
const preview=boundary("hris.people.manage","hris.attendance.preview",previewAttendanceFile,false)
const commit=boundary("hris.people.manage","hris.attendance.import",commitAttendanceFile)
const resolve=boundary("hris.people.manage","hris.attendance.repair",resolveReviewedOperationalAnomaly)
const certify=boundary("hris.people.manage","hris.attendance.certify",certifyRosterAttendance)
export async function readRosterAction(input:unknown){return read(input)}
export async function readOwnRosterAction(input:unknown){return own(input)}
export async function prepareRosterAction(input:unknown){return prepare(input)}
export async function approveRosterAction(input:unknown){return approve(input)}
export async function previewAttendanceFileAction(input:unknown){return preview(input)}
export async function commitAttendanceFileAction(input:unknown){return commit(input)}
export async function resolveRosterAnomalyAction(input:unknown){return resolve(input)}
export async function certifyRosterAttendanceAction(input:unknown){return certify(input)}
