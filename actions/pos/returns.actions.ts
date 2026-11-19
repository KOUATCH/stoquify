"use server"

import { z } from "zod"
import { protect } from "@/services/_shared/protect"
import { posReadResult } from "@/services/pos/pos-read-result"
import { getPOSSaleReturnPreview } from "@/services/pos/pos.service"

const returnSearchSchema = z.object({
  orderNumber: z.string().trim().min(1).max(120),
  locationId: z.string().min(1).max(120),
  terminalId: z.string().min(1).max(120),
  sessionId: z.string().min(1).max(120),
}).strict()

export const getPOSSaleReturnPreviewAction = protect(
  {
    permission: "pos.transactions.refund",
    auditResource: "POSSaleRefund",
    module: {
      moduleSlug: "pos",
      surface: "actions/pos/returns.actions.ts:getPOSSaleReturnPreviewAction",
      surfaceType: "action",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    },
  },
  async (input: unknown, ctx) => {
    const parsed = returnSearchSchema.parse(input)
    const sale = await getPOSSaleReturnPreview({ ...parsed, organizationId: ctx.orgId, userId: ctx.userId })
    return posReadResult(sale, ctx)
  },
)
