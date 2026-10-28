"use server"

import { err, ok } from "@/services/_shared/action-response"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  listSuppliersForPicker,
  type SupplierPickerListInput,
} from "@/services/supplier/supplier.service"

export default async function getOrgSuppliers(input: SupplierPickerListInput = {}) {
  try {
    const ctx = await requirePermission("purchases.suppliers.read", { resource: "Supplier" })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "purchasing",
      surfaceType: "action",
      surface: "actions/suppliers/getOrgSuppliers.ts",
      accessIntent: "read",
      mode: "observe",
    })
    const result = await listSuppliersForPicker(ctx.orgId, input)

    return ok(result)
  } catch (error) {
    return err(error)
  }
}
