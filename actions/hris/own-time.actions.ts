"use server"
import {revalidatePath} from "next/cache"
import {protect} from "@/services/_shared/protect"
import {ForbiddenError} from "@/services/_shared/action-errors"
import {requestOwnOperationalTime,cancelOwnLeaveRequest} from "@/services/hris/self-service-boundary.service"
function own<T>(operation:(actor:{organizationId:string;actorId:string;actorPermissions:string[]},input:Record<string,unknown>)=>Promise<T>){return protect<unknown,T>({permission:"hris.self_service.request",freshAuth:true,tenantGuard:"handler-derived",module:{moduleSlug:"payroll",surface:"hris.own.time",accessIntent:"write",mode:"enforce"}},async(input,ctx)=>{
 if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError("Refresh your session.")
 const result=await operation({organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions},input&&typeof input==="object"&&!Array.isArray(input)?input as Record<string,unknown>:{})
 try{revalidatePath("/[locale]/dashboard/people/me","page")}catch{/* A committed request remains recoverable even when UI revalidation fails. */}return result
})}
const request=own(requestOwnOperationalTime),cancel=own(cancelOwnLeaveRequest)
export async function requestOwnOperationalTimeAction(input:unknown){return request(input)}
export async function cancelOwnLeaveRequestAction(input:unknown){return cancel(input)}
