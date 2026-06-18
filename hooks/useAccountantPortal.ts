"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  exportAccountantTrustPackAction,
  getAccountantPortalAction,
  type AccountantPortalData,
} from "@/actions/accounting/data-trust.actions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { Locale } from "@/types/bilingual"

type AccountantPortalFilters = {
  periodId?: string | null
  startDate?: string | Date | null
  endDate?: string | Date | null
  limit?: number
}

type UseAccountantPortalOptions = AccountantPortalFilters & {
  initialData?: AccountantPortalData | null
  enabled?: boolean
}

const copy = {
  en: {
    fetchError: "Accountant portal evidence is unavailable.",
    exportSuccessTitle: "Trust pack exported",
    exportSuccessBody: "The certified accountant trust pack is ready.",
    exportErrorTitle: "Trust pack export blocked",
    exportErrorBody: "Resolve the trust blockers before exporting a certified pack.",
  },
  fr: {
    fetchError: "Les preuves du portail comptable sont indisponibles.",
    exportSuccessTitle: "Pack de confiance exporte",
    exportSuccessBody: "Le pack comptable certifie est pret.",
    exportErrorTitle: "Export du pack bloque",
    exportErrorBody: "Corrigez les blocages de confiance avant l'export certifie.",
  },
} as const

export const accountantPortalKeys = {
  all: ["accountant-portal"] as const,
  dashboard: (filters: AccountantPortalFilters = {}) =>
    [
      ...accountantPortalKeys.all,
      "dashboard",
      filters.periodId ?? "current",
      filters.startDate ? String(filters.startDate) : "open",
      filters.endDate ? String(filters.endDate) : "open",
    ] as const,
}

export function useAccountantPortal(options: UseAccountantPortalOptions = {}) {
  const filters: AccountantPortalFilters = {
    periodId: options.periodId,
    startDate: options.startDate,
    endDate: options.endDate,
    limit: options.limit,
  }

  return useQuery({
    queryKey: accountantPortalKeys.dashboard(filters),
    queryFn: async () => {
      const result = await getAccountantPortalAction(filters)

      if (!result.success || !result.data) {
        throw new Error(result.error || copy.en.fetchError)
      }

      return result.data
    },
    initialData: options.initialData ?? undefined,
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}

export function useExportAccountantTrustPack(locale: Locale = "en", filters: AccountantPortalFilters = {}) {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: {
      operation: "export",
      entity: "Accountant Trust Pack",
      suppressSuccessNotification: true,
      suppressErrorNotification: true,
    },
    mutationFn: async (input?: AccountantPortalFilters & { includeLedgerRows?: boolean }) => {
      const result = await exportAccountantTrustPackAction({
        ...filters,
        ...input,
        fileType: "json",
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || t.exportErrorBody)
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountantPortalKeys.all })
      notifications.success(t.exportSuccessTitle, t.exportSuccessBody)
    },
    onError: (error: Error) => {
      notifications.error(t.exportErrorTitle, error.message || t.exportErrorBody)
    },
  })
}
