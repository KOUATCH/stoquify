"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  approveAndPostPayrollRunAction,
  calculatePayrollRunAction,
  getPayrollWorkbenchAction,
  preparePayrollDeclarationsAction,
  releasePayrollPaymentBatchAction,
  type PayrollWorkbenchData,
} from "@/actions/payroll/payroll-control.actions"

export const payrollWorkbenchKeys = {
  all: ["payroll-workbench"] as const,
  dashboard: (limit?: number) => [...payrollWorkbenchKeys.all, { limit: limit ?? 20 }] as const,
}

function actionErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) return error
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function invalidatePayrollWorkbench(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: payrollWorkbenchKeys.all })
}

export function usePayrollWorkbench(limit = 20) {
  return useQuery<PayrollWorkbenchData>({
    queryKey: payrollWorkbenchKeys.dashboard(limit),
    queryFn: async () => {
      const result = await getPayrollWorkbenchAction({ limit })
      if (!result.success || !result.data) {
        throw new Error(actionErrorMessage(result.error, "Failed to load payroll workbench"))
      }
      return result.data
    },
  })
}

export function useCalculatePayrollRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: unknown) => {
      const result = await calculatePayrollRunAction(input)
      if (!result.success || !result.data) {
        throw new Error(actionErrorMessage(result.error, "Failed to calculate payroll run"))
      }
      return result.data
    },
    onSuccess: () => invalidatePayrollWorkbench(queryClient),
  })
}

export function useApproveAndPostPayrollRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: unknown) => {
      const result = await approveAndPostPayrollRunAction(input)
      if (!result.success || !result.data) {
        throw new Error(actionErrorMessage(result.error, "Failed to approve and post payroll run"))
      }
      return result.data
    },
    onSuccess: () => invalidatePayrollWorkbench(queryClient),
  })
}

export function useReleasePayrollPaymentBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: unknown) => {
      const result = await releasePayrollPaymentBatchAction(input)
      if (!result.success || !result.data) {
        throw new Error(actionErrorMessage(result.error, "Failed to release payroll payment batch"))
      }
      return result.data
    },
    onSuccess: () => invalidatePayrollWorkbench(queryClient),
  })
}

export function usePreparePayrollDeclarations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: unknown) => {
      const result = await preparePayrollDeclarationsAction(input)
      if (!result.success || !result.data) {
        throw new Error(actionErrorMessage(result.error, "Failed to prepare payroll declarations"))
      }
      return result.data
    },
    onSuccess: () => invalidatePayrollWorkbench(queryClient),
  })
}
