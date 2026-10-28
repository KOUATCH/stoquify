"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getAccountingControlCenterAction,
  lockAccountingSetupAction,
  type AccountingControlCenterData,
} from "@/actions/accounting/settings.actions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { Locale } from "@/types/bilingual"

export const accountingControlCenterKeys = {
  all: ["accounting-control-center"] as const,
  dashboard: (organizationId = "current") =>
    [...accountingControlCenterKeys.all, "dashboard", organizationId] as const,
}

type UseAccountingControlCenterOptions = {
  organizationId?: string | null
  initialData?: AccountingControlCenterData | null
  enabled?: boolean
}

const copy = {
  en: {
    lockSuccessTitle: "Accounting setup locked",
    lockSuccessBody: "The accounting readiness preflight passed and setup is now ready for posting.",
    lockErrorTitle: "Setup lock failed",
    fallbackFetchError: "Accounting control center data is unavailable.",
    fallbackLockError: "Accounting setup could not be locked.",
  },
  fr: {
    lockSuccessTitle: "Configuration comptable verrouillee",
    lockSuccessBody: "Le controle de preparation comptable est valide; la comptabilite est prete.",
    lockErrorTitle: "Verrouillage impossible",
    fallbackFetchError: "Les donnees du centre de controle comptable sont indisponibles.",
    fallbackLockError: "La configuration comptable ne peut pas etre verrouillee.",
  },
} as const

function getQueryOrganizationId(options?: UseAccountingControlCenterOptions) {
  return options?.organizationId || options?.initialData?.organizationId || "current"
}

export function useAccountingControlCenter(options: UseAccountingControlCenterOptions = {}) {
  const organizationId = getQueryOrganizationId(options)

  return useQuery({
    queryKey: accountingControlCenterKeys.dashboard(organizationId),
    queryFn: async () => {
      const result = await getAccountingControlCenterAction({})

      if (!result.success || !result.data) {
        throw new Error(result.error || copy.en.fallbackFetchError)
      }

      return result.data
    },
    initialData: options.initialData ?? undefined,
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}

export function useAccountingSetupReadiness(options: UseAccountingControlCenterOptions = {}) {
  const query = useAccountingControlCenter(options)

  return {
    ...query,
    readiness: query.data?.checklist ?? [],
    blockers: query.data?.blockers ?? [],
    summary: query.data?.summary ?? null,
    status: query.data?.status ?? "blocked",
  }
}

export function usePostingRules(options: UseAccountingControlCenterOptions = {}) {
  const query = useAccountingControlCenter(options)

  return {
    ...query,
    postingRules: query.data?.postingRules ?? [],
  }
}

export function useAccountingPeriods(options: UseAccountingControlCenterOptions = {}) {
  const query = useAccountingControlCenter(options)

  return {
    ...query,
    currentOpenPeriod: query.data?.periods.currentOpenPeriod ?? null,
    openPeriods: query.data?.periods.openPeriods ?? [],
    recentPeriods: query.data?.periods.recentPeriods ?? [],
  }
}

export function useLockAccountingSetup(locale: Locale = "en", organizationId = "current") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: {
      operation: "lock",
      entity: "Accounting Setup",
      suppressSuccessNotification: true,
      suppressErrorNotification: true,
    },
    mutationFn: async () => {
      const result = await lockAccountingSetupAction({})

      if (!result.success || !result.data) {
        throw new Error(result.error || t.fallbackLockError)
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingControlCenterKeys.all })
      queryClient.invalidateQueries({ queryKey: accountingControlCenterKeys.dashboard(organizationId) })
      notifications.success(t.lockSuccessTitle, t.lockSuccessBody)
    },
    onError: (error: Error) => {
      notifications.error(t.lockErrorTitle, error.message || t.fallbackLockError)
    },
  })
}
