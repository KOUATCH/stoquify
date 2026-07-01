"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  getPayrollPaymentReconciliation,
  payrollPaymentReconciliationInputSchema,
  recordPayrollPaymentSettlementEvidence,
  recordPayrollPaymentSettlementInputSchema,
  type PayrollPaymentReconciliationReadModel,
  type PayrollPaymentSettlementResult,
} from "@/services/payroll/payment-reconciliation.service"

export type { PayrollPaymentReconciliationReadModel, PayrollPaymentSettlementResult }

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {}
}

function revalidatePayrollPaymentReconciliationPaths() {
  revalidatePath("/dashboard/payroll", "page")
  revalidatePath("/[locale]/dashboard/payroll", "page")
  revalidatePath("/dashboard/payroll/payments", "page")
  revalidatePath("/[locale]/dashboard/payroll/payments", "page")
}

const getReconciliation = protect<unknown, PayrollPaymentReconciliationReadModel>(
  {
    permission: "payments.reconciliation.read",
    auditResource: "PayrollPaymentReconciliation",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payments.reconciliation.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = payrollPaymentReconciliationInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })

    return getPayrollPaymentReconciliation(parsed)
  },
)

export async function getPayrollPaymentReconciliationAction(input: unknown = {}) {
  return getReconciliation(input)
}

const recordSettlement = protect<unknown, PayrollPaymentSettlementResult>(
  {
    permission: "payroll.payments.reconcile",
    auditResource: "PayrollPaymentBatch",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payments.reconcile",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const now = new Date()
    const parsed = recordPayrollPaymentSettlementInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? now,
      now,
    })
    const result = await recordPayrollPaymentSettlementEvidence(parsed)
    revalidatePayrollPaymentReconciliationPaths()
    return result
  },
)

export async function recordPayrollPaymentSettlementEvidenceAction(input: unknown) {
  return recordSettlement(input)
}
