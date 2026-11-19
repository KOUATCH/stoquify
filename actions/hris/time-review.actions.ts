"use server"
import {protect} from "@/services/_shared/protect"
import {ForbiddenError} from "@/services/_shared/action-errors"
import {getTimeApprovalReview,decideReviewedTimeApproval} from "@/services/hris/time-review.service"
function boundary<T>(operation:(data:any)=>Promise<T>,write:boolean){return protect<unknown,T>({permission:"hris.people.read",freshAuth:true,tenantGuard:"handler-derived",module:{moduleSlug:"payroll",surface:"hris.time.review",accessIntent:write?"write":"read",mode:"enforce"}},async(raw,ctx)=>{
 if(ctx.freshAuth?.claims.userId!==ctx.userId||ctx.freshAuth?.claims.tenantId!==ctx.orgId)throw new ForbiddenError("Refresh your session before continuing.")
 const input=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{}
 return operation({...input,organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions})
})}
const read=boundary(getTimeApprovalReview,false),decide=boundary(decideReviewedTimeApproval,true)
export async function getTimeApprovalReviewAction(input:unknown){return read(input)}
export async function decideReviewedTimeApprovalAction(input:unknown){return decide(input)}
