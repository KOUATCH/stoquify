"use server";
import { requirePermission } from "@/lib/security/rbac";
import { getBriefItemById as getBriefItemByIdFromService } from "@/services/item/item.service";


 const getBriefItemById= async(id: string)=> {
  try {
    const ctx = await requirePermission("inventory.items.read", {
      resource: "Item",
      resourceId: id,
      auditAllowed: false,
    });
    const data = await getBriefItemByIdFromService(ctx.orgId, id);
    return { 
      success: true,
      data,
      error: null, 
     };
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch item",
    };
  }
}
 export default getBriefItemById
