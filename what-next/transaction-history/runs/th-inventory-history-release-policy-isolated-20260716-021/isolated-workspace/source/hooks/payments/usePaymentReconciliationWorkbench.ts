"use client"

import { useQuery } from "@tanstack/react-query"

import { getPaymentReconciliationWorkbenchAction } from "@/actions/payments/reconciliation-workbench.actions"
import type { PaymentReconciliationWorkbenchInput } from "@/services/payments/payment-reconciliation-workbench.schemas"

export const paymentReconciliationWorkbenchKeys = {
  all: ["payment-reconciliation-workbench"] as const,
  dashboard: (params: PaymentReconciliationWorkbenchInput) =>
    [
      ...paymentReconciliationWorkbenchKeys.all,
      params.locationId ?? "all",
      params.period ?? "mtd",
      params.startDate ? new Date(params.startDate).toISOString() : null,
      params.endDate ? new Date(params.endDate).toISOString() : null,
    ] as const,
}

export function usePaymentReconciliationWorkbench(params: PaymentReconciliationWorkbenchInput) {
  return useQuery({
    queryKey: paymentReconciliationWorkbenchKeys.dashboard(params),
    queryFn: async () => {
      const result = await getPaymentReconciliationWorkbenchAction(params)

      if (!result.success || !result.data) {
        throw new Error(result.error || "Payment reconciliation workbench data is unavailable.")
      }

      return result.data
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}
