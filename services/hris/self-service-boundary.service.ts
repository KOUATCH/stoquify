import "server-only"
import {Prisma} from "@prisma/client"
import {db} from "@/prisma/db"
import {hasAnyRbacPermission} from "@/lib/security/rbac-permissions"
import {ForbiddenError,NotFoundError} from "@/services/_shared/action-errors"
import {assertSetupAccount} from "./setup-reviewer.service"
import {lockHrisReviewEmployeeInTx} from "./review-lock.service"
import {requestOperationalTime} from "./operational-time.service"
import {requestLeaveCancellation} from "./leave-entitlement.service"
export type SelfServiceActor={organizationId:string;actorId:string;actorPermissions:string[]}
export type SelfServiceClient=typeof db|Prisma.TransactionClient
export async function currentHrisActor(tx:Prisma.TransactionClient,actor:SelfServiceActor){
 await assertSetupAccount(tx,actor.organizationId,actor.actorId)
 const rows=await tx.$queryRaw<Array<{permissions:string[]}>>`SELECT r.permissions FROM roles r JOIN "_UserRoles" m ON m."A"=r.id WHERE m."B"=${actor.actorId} AND r."organizationId"=${actor.organizationId} FOR SHARE OF r,m`
 const live=rows.flatMap(r=>r.permissions);return {...actor,actorPermissions:actor.actorPermissions.filter(p=>live.includes(p))}
}
export async function lockedOwnEmployee(tx:Prisma.TransactionClient,actor:SelfServiceActor,write:boolean){
 if(!hasAnyRbacPermission(actor.actorPermissions,[write?"hris.self_service.request":"hris.self_service.read"]))throw new ForbiddenError("Own-service permission is required.")
 const matches=await tx.payrollEmployee.findMany({where:{organizationId:actor.organizationId,userId:actor.actorId,deletedAt:null},select:{id:true},take:2})
 if(matches.length!==1)throw new NotFoundError("Ask HR to resolve your employee account link.")
 await lockHrisReviewEmployeeInTx(tx,actor.organizationId,matches[0].id)
 const employee=await tx.payrollEmployee.findFirst({where:{id:matches[0].id,organizationId:actor.organizationId,userId:actor.actorId,deletedAt:null}})
 if(!employee)throw new ForbiddenError("Your employee account link changed. Refresh your session.")
 return employee
}
export function selfServiceTransaction<T>(client:SelfServiceClient,run:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{return "$transaction" in client?client.$transaction(run,{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,maxWait:15000,timeout:25000}):run(client)}
export async function requestOwnOperationalTime(actor:SelfServiceActor,input:Record<string,unknown>,client:SelfServiceClient=db){return selfServiceTransaction(client,async tx=>{
 const a=await currentHrisActor(tx,actor),employee=await lockedOwnEmployee(tx,a,true)
 // Narrow an already verified own-request capability. The native owner must not
 // switch to its manager branch because this employee also holds HR permissions.
 return requestOperationalTime({...input,...a,actorPermissions:["hris.self_service.request"],employeeId:employee.id} as never,tx)
})}
export async function cancelOwnLeaveRequest(actor:SelfServiceActor,input:Record<string,unknown>,client:SelfServiceClient=db){return selfServiceTransaction(client,async tx=>{
 const a=await currentHrisActor(tx,actor),employee=await lockedOwnEmployee(tx,a,true)
 return requestLeaveCancellation({...input,...a,actorPermissions:["hris.self_service.request"],employeeId:employee.id} as never,tx)
})}
