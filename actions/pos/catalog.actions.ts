"use server"

import { err, ok } from "@/services/_shared/action-response"
import { requireOrg } from "@/services/_shared/require-org"
import { listPOSCatalogItems, listPOSLocations, listPOSTerminals } from "@/services/pos/pos.service"
import { posCatalogSchema, posTerminalListSchema } from "@/services/pos/pos.schemas"

export async function getPOSLocationsAction() {
  try {
    const { orgId } = await requireOrg()
    const locations = await listPOSLocations({ organizationId: orgId })
    return ok(locations)
  } catch (error) {
    return err(error)
  }
}

export async function getPOSTerminalsAction(input: unknown) {
  try {
    const { orgId } = await requireOrg()
    const parsed = posTerminalListSchema.parse(input)
    const terminals = await listPOSTerminals({ ...parsed, organizationId: orgId })
    return ok(terminals)
  } catch (error) {
    return err(error)
  }
}

export async function getPOSCatalogAction(input: unknown) {
  try {
    const { orgId } = await requireOrg()
    const parsed = posCatalogSchema.parse(input)
    const catalog = await listPOSCatalogItems({ ...parsed, organizationId: orgId })
    return ok(catalog)
  } catch (error) {
    return err(error)
  }
}
