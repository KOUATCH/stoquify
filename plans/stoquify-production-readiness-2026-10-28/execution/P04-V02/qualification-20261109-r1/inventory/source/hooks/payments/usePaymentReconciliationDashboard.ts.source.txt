import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
import { useTranslations } from "next-intl"
import { usePermissions } from "@/hooks/usePermissions"
import type { ReconciliationCertificateExportCommand } from "@/services/reconciliation/reconciliation-certificate-export.contracts"
import type { ReconciliationReviewedSignCommand } from "@/services/reconciliation/reconciliation-sign-review.contracts"

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

export function unwrapPaymentReconciliationActionResult<T>(result: { success: true; data: T } | { success: false; error: string | null; code?: string }) {
  if (!result.success) throw Object.assign(new Error(result.error || "Payment reconciliation action failed."), { code: result.code })
  return result.data
}

function invalidateReconciliation(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: paymentReconciliationDashboardKeys.all })
  queryClient.invalidateQueries({ queryKey: ["payment-reconciliation-workbench"] })
}

export function usePaymentReconciliationDashboard() {
  const { user, organizationId, permissionState } = usePermissions()
  return useQuery({
    queryKey: [...paymentReconciliationDashboardKeys.dashboard(), organizationId, user?.id],
    enabled: permissionState === "ready" && !!organizationId && !!user?.id,
    queryFn: async () => {
      const data = unwrapPaymentReconciliationActionResult(await getPaymentReconciliationDashboardAction())
      if (data.scope.organizationId !== organizationId || data.scope.actorId !== user?.id) throw Object.assign(new Error("Refresh the current workspace and permissions."), { code: "TENANT_SCOPE_VIOLATION" })
      return data
    },
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
  const t = useTranslations("paymentReconciliationWorkbench.manualMatch.recovery")
  const requestKeys = useRef(new Map<string, string>())
  const unwrapManual = <T,>(result: { success: true; data: T } | { success: false; code?: string; error: string | null }): T => {
    if (result.success) return result.data
    const key = result.code === "FRESH_AUTH_REQUIRED" || result.code === "AUTH_REQUIRED" ? "auth"
      : result.code === "FORBIDDEN" ? "denied"
        : result.code === "SOD_VIOLATION" ? "independent"
          : result.code === "CONFLICT" || result.code === "BUSINESS_RULE_VIOLATION" ? "evidence"
            : result.code === "CONCURRENCY_CONFLICT" ? "concurrent" : "unknown"
    throw Object.assign(new Error(t(key)), { code: result.code })
  }

  const propose = useMutation({
    retry: false,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: {
      providerAccountId: string
      paymentTransactionId: string
      providerEventId?: string
      statementLineId?: string
      amountMatched: string | number
      supersedesProposalId?: string
      currencyCode?: string
      correlationId?: string
    }) => {
      const fingerprint = JSON.stringify([input.providerAccountId, input.paymentTransactionId, input.providerEventId ?? null, input.statementLineId ?? null, String(input.amountMatched), input.currencyCode ?? null, input.supersedesProposalId ?? null])
      let idempotencyKey = requestKeys.current.get(fingerprint)
      if (!idempotencyKey) { idempotencyKey = crypto.randomUUID(); requestKeys.current.set(fingerprint, idempotencyKey) }
      const result = await proposeManualMatchAction({ ...input, idempotencyKey }).catch(() => { throw new Error(t("unknown")) })
      return unwrapManual(result)
    },
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  const approve = useMutation({
    retry: false,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: { proposedMatchId: string; expectedEvidenceRevision: string; correlationId?: string }) =>
      unwrapManual(await approveManualMatchAction(input).catch(() => { throw new Error(t("unknown")) })),
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  return { propose, approve }
}

export function useSignReconciliationRun() {
  const queryClient = useQueryClient()

  return useMutation({
    retry: false,
    mutationFn: async (input: ReconciliationReviewedSignCommand) =>
      unwrapPaymentReconciliationActionResult(await signReconciliationRunAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })
}

export function useExportReconciliationCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    retry: false,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: ReconciliationCertificateExportCommand) =>
      unwrapPaymentReconciliationActionResult(await exportReconciliationCertificateAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })
}

export function useResolveSuspenseItem() {
  const queryClient = useQueryClient()

  const assign = useMutation({
    retry: false,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: { suspenseItemId: string; assignedToId?: string; correlationId?: string }) =>
      unwrapPaymentReconciliationActionResult(await assignPaymentSuspenseItemAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  const propose = useMutation({
    retry: false,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: {
      suspenseItemId: string
      expectedEvidenceRevision: string
      idempotencyKey: string
      targetType: string
      reason: string
      suspenseLedgerAccountId?: string | null
      correlationId?: string
    }) => unwrapPaymentReconciliationActionResult(await proposeSuspenseReclassificationAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  const approve = useMutation({
    retry: false,
    meta: { suppressErrorNotification: true, suppressSuccessNotification: true },
    mutationFn: async (input: { suspenseItemId: string; expectedEvidenceRevision: string; correlationId?: string }) =>
      unwrapPaymentReconciliationActionResult(await approveSuspensePostingAction(input)),
    onSuccess: () => invalidateReconciliation(queryClient),
  })

  return { assign, propose, approve, refresh: () => queryClient.refetchQueries({ queryKey: paymentReconciliationDashboardKeys.dashboard(), type: "active" }, { throwOnError: true }) }
}
