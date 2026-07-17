"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import {
  archiveManagedTerminal,
  createManagedTerminal,
  getTerminalManagementData,
  updateManagedTerminal,
  type TerminalManagementInput,
  type TerminalManagementRow,
} from "@/actions/pos/terminal-management.actions"
import type { Locale } from "@/types/bilingual"

export const terminalManagementKeys = {
  all: ["terminal-management"] as const,
  dashboard: (organizationId: string) => [...terminalManagementKeys.all, "dashboard", organizationId] as const,
}

const copy = {
  en: {
    createTitle: "Terminal created",
    createBody: "The POS terminal is ready for workstation assignment.",
    updateTitle: "Terminal updated",
    updateBody: "Terminal configuration and status metrics were refreshed.",
    archiveTitle: "Terminal deactivated",
    archiveBody: "The terminal was removed from active POS selection.",
    errorTitle: "Terminal operation failed",
  },
  fr: {
    createTitle: "Terminal cree",
    createBody: "Le terminal POS est pret pour l'affectation au poste.",
    updateTitle: "Terminal mis a jour",
    updateBody: "La configuration et les indicateurs du terminal ont ete actualises.",
    archiveTitle: "Terminal desactive",
    archiveBody: "Le terminal a ete retire de la selection POS active.",
    errorTitle: "Operation terminal echouee",
  },
} as const

function invalidateTerminalQueries(queryClient: QueryClient, organizationId: string, terminalId?: string) {
  queryClient.invalidateQueries({ queryKey: terminalManagementKeys.dashboard(organizationId) })
  queryClient.invalidateQueries({ queryKey: ["pos-operations"] })
  queryClient.invalidateQueries({ queryKey: ["terminals"] })
  queryClient.invalidateQueries({ queryKey: ["available-terminals"] })

  if (terminalId) {
    queryClient.invalidateQueries({ queryKey: ["terminal-status", terminalId] })
  }
}

export function useTerminalManagementData(organizationId: string) {
  return useQuery({
    queryKey: terminalManagementKeys.dashboard(organizationId),
    queryFn: async () => {
      const result = await getTerminalManagementData(organizationId)

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch terminal management data")
      }

      return result.data
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCreateManagedTerminal(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "create", entity: "Managed Terminal", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (data: TerminalManagementInput) => {
      const result = await createManagedTerminal(organizationId, data)

      if (!result.success) {
        throw new Error(result.error || "Failed to create terminal")
      }

      return result.data
    },
    onSuccess: (terminal?: TerminalManagementRow) => {
      invalidateTerminalQueries(queryClient, organizationId, terminal?.id)
      notifications.success(t.createTitle, t.createBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useUpdateManagedTerminal(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "update", entity: "Managed Terminal", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: TerminalManagementInput }) => {
      const result = await updateManagedTerminal(organizationId, id, data)

      if (!result.success) {
        throw new Error(result.error || "Failed to update terminal")
      }

      return result.data
    },
    onSuccess: (terminal?: TerminalManagementRow) => {
      invalidateTerminalQueries(queryClient, organizationId, terminal?.id)
      notifications.success(t.updateTitle, t.updateBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}

export function useArchiveManagedTerminal(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "archive", entity: "Managed Terminal", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async (id: string) => {
      const result = await archiveManagedTerminal(organizationId, id)

      if (!result.success) {
        throw new Error(result.error || "Failed to deactivate terminal")
      }

      return result.data
    },
    onSuccess: (terminal?: { id: string }) => {
      invalidateTerminalQueries(queryClient, organizationId, terminal?.id)
      notifications.success(t.archiveTitle, t.archiveBody)
    },
    onError: (error: Error) => {
      notifications.error(t.errorTitle, error.message || t.errorTitle)
    },
  })
}
