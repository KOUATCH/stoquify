"use server"

import { protect } from "@/services/_shared/protect"
import { commitSaleSchema } from "@/services/pos/pos.schemas"
import { getPOSSaleCommitStatus } from "@/services/pos/pos.service"

/** Retained own financial evidence needs current read authority, not authority
 * to create another sale. The service cannot perform a financial mutation. */
export const getPOSSaleCommitStatusAction = protect(
  { permission: "pos.read", auditResource: "POSCommitResult", auditAllowed: true },
  async (input: unknown, ctx) => getPOSSaleCommitStatus({
    ...commitSaleSchema.parse(input), organizationId: ctx.orgId, userId: ctx.userId,
  }),
)
