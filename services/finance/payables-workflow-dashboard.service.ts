import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getAPWorkbenchData } from "@/services/purchasing/ap-control.service"

/** Organization-wide workflow counts. These are not location-scoped amounts or execution readiness. */
export async function getPayablesWorkflowDashboard(organizationId: string, access: { approval: boolean; execution: boolean }) {
  return db.$transaction(async tx => {
    const workbench = await getAPWorkbenchData({ organizationId, limit: 1 }, tx)
    const paymentScope = { organizationId, deletedAt: null, supplier: { organizationId } }
    const draftInvoices = await tx.supplierInvoice.count({ where: { organizationId, deletedAt: null, status: "DRAFT" } })
    const awaitingApproval = access.approval ? await tx.supplierPayment.count({ where: { ...paymentScope, status: "DRAFT" } }) : null
    const awaitingExecution = access.execution ? await tx.supplierPayment.count({ where: { ...paymentScope, status: "APPROVED" } }) : null
    // Return only the existing workbench's counts; never bank details or raw blocker messages.
    return { checkedAt: workbench.asOf, counts: workbench.counts, draftInvoices, awaitingApproval, awaitingExecution }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 })
}
