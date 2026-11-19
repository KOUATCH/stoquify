import "server-only"
import {requireAnyPermission} from "@/lib/security/rbac"
import {requireFreshAuth} from "@/lib/security/auth-session"
import {observeModuleAccess} from "@/services/modules/module-entitlement.service"
import {ForbiddenError} from "@/services/_shared/action-errors"
export async function requireDocumentActor(write:boolean){
 const fresh=await requireFreshAuth(),ctx=await requireAnyPermission(write?["hris.self_service.request","hris.documents.manage","hris.documents.retention"]:["hris.self_service.read","hris.documents.read"],{resource:"HrisEmployeeDocument"})
 if(fresh.claims.userId!==ctx.userId||fresh.claims.tenantId!==ctx.orgId)throw new ForbiddenError("Refresh your session.")
 const access=await observeModuleAccess({moduleSlug:"payroll",organizationId:ctx.orgId,userId:ctx.userId,actorPermissions:ctx.permissions,surfaceType:"api",surface:"hris.documents",accessIntent:write?"write":"read",mode:"enforce"})
 if(!access.allowed)throw new ForbiddenError()
 return {organizationId:ctx.orgId,actorId:ctx.userId,actorPermissions:ctx.permissions}
}
