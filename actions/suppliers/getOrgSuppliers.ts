"use server"

import { err, ok } from "@/services/_shared/action-response"
import { requireOrg } from "@/services/_shared/require-org"
import {
  listSuppliersForPicker,
  type SupplierPickerListInput,
} from "@/services/supplier/supplier.service"

export default async function getOrgSuppliers(input: SupplierPickerListInput = {}) {
  try {
    const { orgId } = await requireOrg()
    const result = await listSuppliersForPicker(orgId, input)

    return ok(result)
  } catch (error) {
    return err(error)
  }
}
