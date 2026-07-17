import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  approveManualMatchAction,
  approveSuspensePostingAction,
  assignPaymentSuspenseItemAction,
  exportReconciliationCertificateAction,
  getPaymentReconciliationDashboardAction,
  getReconciliationRunDetailAction,
  importProviderStatementAction,
  proposeManualMatchAction,
  proposeSuspenseReclassificationAction,
  runPaymentReconciliationAction,
  signReconciliationRunAction,
} from "@/actions/payments/reconciliation.actions"

export const paymentReconciliationDashboardKeys = {
  all: ["payment-reconciliation"] as const,
  dashboard: () => ["payment-reconciliation", "dashboard", "durable-evidence"] as const,
  run: (runId?: string) => ["payment-reconciliation", "run", runId ?? "list"] as const,
  suspense: () => ["payment-reconciliation", "suspense"] as const,
  duplicates: () => ["payment-reconciliation", "duplicates"] as const,
  providerAccounts: () => ["payment-reconciliation", "provider-accounts"] as const,
  certificates: () => ["payment-reconciliation", "certificates"] as const,
  notifications: () => ["payment-reconciliation", "notifications"] as const,
}

export function unwrapPaymentReconciliationActionResult<T>(result: { success: true; data: T } | { success: false; error: string | null }) {
  if (!result.success) throw new Error(result.error || "Payment reconciliation action failed.")
  return result.data
}

function invalidateReconciliation(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: paymentReconciliationDashboardKeys.all })
  queryClient.invalidateQueries({ queryKey: ["payment-reconciliation-workbench"] })
}

export function usePaymentReconciliationDashboard() {
  return useQuery({
    queryKey: paymentReconciliationDashboardKeys.dashboard(),
    queryFn: async () => unwrapPaymentReconciliationActionResult(await getPaymentReconciliationDashboardAction()),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useReconciliationRunDetail(runId?: string | null) {
  return useQuery({
    queryKey: paymentReconciliationDashboardKeys.run(runId ?? undefined),
    queryFn: async () => unwrapPaymentReconciliationActionResult(await getReconciliationRunDetailAction({ runId })),
    enabled: Boolean(runId),
    staleTime: 15_000,
  })
}

export function useSuspenseQueue() {
  return useQuery({
    queryKey: paymentReconciliationDashboardKeys.suspense(),
    queryFn: async () => {
      const dashboard = unwrapPaymentReconciliationActionResult(await getPaymentReconciliationDashboardAction())
      return dashboard.suspenseQueue
    },
    staleTime: 15_000,
  })
}

export function useDuplicateProviderReferenceAlerts() {
  return useQuery({
    queryKey: paymentReconciliationDashboardKeys.duplicates(),
    queryFn: async () => {
      const dashboard = unwrapPaymentReconciliationActionResult(await getPaymentReconciliationDashboardAction())
      return dashboard.exceptionGroups.filter((group) => group.type === "DUPLICATE_PROVIDER_REFERENCE")
    },
    staleTime: 15_000,
  })
}

export function useProviderAccounts() {
  return useQuery({
    queryKey: paymentReconciliationDashboardKeys.providerAccounts(),
    queryFn: async () => {
      const dashboard = unwrapPaymentReconciliationActionResult(await getPaymentReconciliationDashboardAction())
      return dashboard.providerAccounts
    },
    staleTime: 15_000,
  })
}

export function usePaymentExceptionNotifications() {
  return useQuery({
    queryKey: paymentReconciliationDashboardKeys.notifications(),
    queryFn: async () => {
      const dashboard = unwrapPaymentReconciliationActionResult(await getPaymentReconciliationDashboardAction())
      return {
        inDashboardDelivery: true,
        exceptionGroups: dashboard.exceptionGroups,
        closeBlockerCount: dashboard.summary.closeBlockerCount,
        source: dashboard.source,
      }
    },
    staleTime: 15_000,
  })
}

export function useReconciliationNotificationPreferences() {
  return {
    channels: ["in-dashboard"] as const,
    deliveryStatus: "service-boundary-ready" as const,
  }
}

export function useImportProviderStatement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      providerAccountId: string
      providerCode?: string
      rawContent: string
      fileName?: string
      correlationId?: string
    }) => unwrapPaymentReconciliationActionResult(await importProviderStatementAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })
}

export function useRunPaymentReconciliation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { providerAccountId: string; businessDate: Date | string; correlationId?: string }) =>
      unwrapPaymentReconciliationActionResult(await runPaymentReconciliationAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })
}

export function useManualMatchWorkflow() {
  const queryClient = useQueryClient()

  const propose = useMutation({
    mutationFn: async (input: {
      providerAccountId: string
      paymentTransactionId: string
      providerEventId?: string
      statementLineId?: string
      amountMatched: string | number
      currencyCode?: string
      correlationId?: string
    }) => unwrapPaymentReconciliationActionResult(await proposeManualMatchAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  const approve = useMutation({
    mutationFn: async (input: { proposedMatchId: string; correlationId?: string }) =>
      unwrapPaymentReconciliationActionResult(await approveManualMatchAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  return { propose, approve }
}

export function useSignReconciliationRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { runId: string; correlationId?: string }) =>
      unwrapPaymentReconciliationActionResult(await signReconciliationRunAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })
}

export function useExportReconciliationCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { runId: string; fileType?: "json"; correlationId?: string }) =>
      unwrapPaymentReconciliationActionResult(await exportReconciliationCertificateAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })
}

export function useResolveSuspenseItem() {
  const queryClient = useQueryClient()

  const assign = useMutation({
    mutationFn: async (input: { suspenseItemId: string; assignedToId?: string; correlationId?: string }) =>
      unwrapPaymentReconciliationActionResult(await assignPaymentSuspenseItemAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  const propose = useMutation({
    mutationFn: async (input: {
      suspenseItemId: string
      targetType: string
      reason: string
      suspenseLedgerAccountId?: string | null
      correlationId?: string
    }) => unwrapPaymentReconciliationActionResult(await proposeSuspenseReclassificationAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  const approve = useMutation({
    mutationFn: async (input: { suspenseItemId: string; correlationId?: string }) =>
      unwrapPaymentReconciliationActionResult(await approveSuspensePostingAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  return { assign, propose, approve }
}
