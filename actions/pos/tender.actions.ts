"use server"

import { revalidateTag } from "next/cache"
import { err, ok } from "@/services/_shared/action-response"
import { requireOrg } from "@/services/_shared/require-org"
import { commitPOSSale } from "@/services/pos/pos.service"
import { commitSaleSchema } from "@/services/pos/pos.schemas"

export async function commitPOSSaleAction(input: unknown) {
  try {
    const { orgId, userId } = await requireOrg()
    const parsed = commitSaleSchema.parse(input)
    const sale = await commitPOSSale({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-cart")
    revalidateTag("pos-sessions")
    revalidateTag(`pos-stock-${parsed.locationId}`)
    revalidateTag(`pos-terminal-${parsed.terminalId}`)
    revalidateTag("finance-dashboard")
    revalidateTag("customer-ar")

    return ok(sale)
  } catch (error) {
    return err(error)
  }
}
