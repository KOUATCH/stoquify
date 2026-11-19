"use server"
import {z} from "zod"
import {revalidatePath} from "next/cache"
import {protect} from "@/services/_shared/protect"
import {ForbiddenError} from "@/services/_shared/action-errors"
import {getOwnCorrectionWorkspace,submitOwnCorrection,amendOwnCorrection,getCorrectionQueue,getCorrectionReview,decideCorrection} from "@/services/hris/personal-correction.service"
import type {SelfServiceActor} from "@/services/hris/self-service-boundary.service"
function boundary<T>(permission:string,write:boolean,fn:(actor:SelfServiceActor,input:unknown)=>Promise<T>){return protect<unknown,T>({permission,freshAuth:true,tenantGuard:"handler-derived",module:{moduleSlug:"payroll",surface:"hris.personal.corrections",accessIntent:write?"write":"read",mode:"enforce"}},async(input,ctx)=>{
 if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError("Refresh your session.")
 const result=await fn({organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions},input)
 if(write)try{revalidatePath("/[locale]/dashboard/people/me","page");revalidatePath("/[locale]/dashboard/people/corrections","page")}catch{/* Preserve the committed receipt. */}return result
})}
const own=boundary("hris.self_service.read",false,a=>getOwnCorrectionWorkspace(a)),submit=boundary("hris.self_service.request",true,submitOwnCorrection),amend=boundary("hris.self_service.request",true,amendOwnCorrection),queue=boundary("hris.people.manage",false,(a,i)=>getCorrectionQueue(a,undefined,z.object({caseId:z.string().uuid().optional()}).strict().parse(i??{}).caseId)),review=boundary("hris.people.manage",false,(a,i)=>getCorrectionReview(a,z.object({caseId:z.string().uuid()}).strict().parse(i).caseId)),decide=boundary("hris.people.manage",true,decideCorrection)
export async function getOwnCorrectionWorkspaceAction(input:unknown={}){return own(input)}
export async function submitOwnCorrectionAction(input:unknown){return submit(input)}
export async function amendOwnCorrectionAction(input:unknown){return amend(input)}
export async function getCorrectionQueueAction(input:unknown={}){return queue(input)}
export async function getCorrectionReviewAction(input:unknown){return review(input)}
export async function decideCorrectionAction(input:unknown){return decide(input)}
