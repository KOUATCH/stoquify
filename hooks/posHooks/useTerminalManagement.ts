"use client"

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { usePOSReadQuery } from "./usePOSReadQuery"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import {
  archiveManagedTerminal,
  createManagedTerminal,
  getTerminalManagementData,
  updateManagedTerminal,
  type TerminalManagementInput,
  type TerminalManagementUpdateInput,
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
    errorBody: "The change could not be confirmed. Your entry is retained. Review the current terminal before retrying.",
    activeSession: "Close the active shift before deactivating this terminal.",
    openDrawer: "Close the open drawer before disabling it.",
    activeMove: "Close the active shift and drawer before changing the terminal location.",
    historicalMove: "This terminal has operating history. Create a new terminal at the destination to preserve those records.",
    changed: "The terminal changed while you were editing. Your entry is retained. Review its current shift before retrying.",
    stale: "The terminal changed since you opened this form. Your draft is retained. Review the latest configuration before saving.",
    staleArchive: "The terminal changed since you opened this confirmation. Review its latest configuration before deactivating it.",
    invalid: "Enter a name of 1–100 characters, select a location, and limit the terminal number to 40 characters.",
    duplicate: "This terminal number is already in use. Choose a different number.",
    locationMissing: "The location is unavailable. Refresh and select a location in this organization.",
    terminalMissing: "The terminal is unavailable in this organization. Refresh the list before continuing.",
    numberRequired: "Enter a valid terminal number (up to 40 characters).",
    reload: "The change was saved but could not be reloaded. Refresh the terminal list before submitting again.",
  },
  fr: {
    createTitle: "Terminal cree",
    createBody: "Le terminal POS est pret pour l'affectation au poste.",
    updateTitle: "Terminal mis a jour",
    updateBody: "La configuration et les indicateurs du terminal ont ete actualises.",
    archiveTitle: "Terminal desactive",
    archiveBody: "Le terminal a ete retire de la selection POS active.",
    errorTitle: "Operation terminal echouee",
    errorBody: "La modification n’a pas pu être confirmée. Votre saisie est conservée. Vérifiez l’état actuel du terminal avant de réessayer.",
    activeSession: "Clôturez la session active avant de désactiver ce terminal.",
    openDrawer: "Fermez le tiroir ouvert avant de le désactiver.",
    activeMove: "Clôturez la session active et fermez le tiroir avant de changer l’emplacement du terminal.",
    historicalMove: "Ce terminal possède un historique d’activité. Créez un nouveau terminal à destination pour conserver ces enregistrements.",
    changed: "Le terminal a changé pendant la modification. Votre saisie est conservée. Vérifiez sa session actuelle avant de réessayer.",
    stale: "Le terminal a changé depuis l’ouverture du formulaire. Votre brouillon est conservé. Vérifiez la configuration actuelle avant d’enregistrer.",
    staleArchive: "Le terminal a changé depuis l’ouverture de cette confirmation. Vérifiez sa configuration actuelle avant de le désactiver.",
    invalid: "Saisissez un nom de 1 à 100 caractères, sélectionnez un emplacement et limitez le numéro du terminal à 40 caractères.",
    duplicate: "Ce numéro de terminal est déjà utilisé. Choisissez un autre numéro.",
    locationMissing: "L’emplacement est indisponible. Actualisez puis sélectionnez un emplacement de cette organisation.",
    terminalMissing: "Le terminal est indisponible dans cette organisation. Actualisez la liste avant de continuer.",
    numberRequired: "Saisissez un numéro de terminal valide (40 caractères maximum).",
    reload: "La modification a été enregistrée mais n’a pas pu être rechargée. Actualisez la liste avant de soumettre à nouveau.",
  },
} as const

export function getTerminalManagementErrorMessage(error: unknown, locale: Locale = "en") {
  const message = error instanceof Error ? error.message : ""
  const t = copy[locale]
  switch (message) {
    case "Cannot deactivate terminal with an active session": return t.activeSession
    case "Cannot disable cash drawer while a drawer is open": return t.openDrawer
    case "Cannot move terminal with an active session or open drawer": return t.activeMove
    case "Cannot move terminal with operating history; create a terminal at the new location": return t.historicalMove
    case "Terminal changed during editing; review its current session and try again": return t.changed
    case "Terminal changed since this form was opened; review the latest configuration": return t.stale
    case "Terminal changed since this confirmation was opened; review the latest configuration": return t.staleArchive
    case "Invalid terminal details; check name, location and number lengths": return t.invalid
    case "Terminal number already exists":
    case "Could not generate a unique terminal number": return t.duplicate
    case "Location not found": return t.locationMissing
    case "Terminal not found": return t.terminalMissing
    case "Terminal number is required": return t.numberRequired
    case "Terminal was created but could not be reloaded":
    case "Terminal was updated but could not be reloaded": return t.reload
    default: return t.errorBody
  }
}

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
  const query = usePOSReadQuery({
    queryKey: terminalManagementKeys.dashboard(organizationId),
    queryFn: () => getTerminalManagementData(organizationId),
    permission: "pos.read",
    enabled: !!organizationId,
  })
  return { ...query, data: query.data?.data,
    async refetch() {
      if (query.readState === "denied") { await query.retryRead(); return { ...query, data: undefined, isError: true } }
      const result = await query.refetch(); return { ...result, data: result.data?.data }
    },
  }
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
      notifications.error(t.errorTitle, getTerminalManagementErrorMessage(error, locale))
    },
  })
}

export function useUpdateManagedTerminal(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "update", entity: "Managed Terminal", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, data }: { id: string; data: TerminalManagementUpdateInput }) => {
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
      notifications.error(t.errorTitle, getTerminalManagementErrorMessage(error, locale))
    },
  })
}

export function useArchiveManagedTerminal(organizationId: string, locale: Locale = "en") {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const t = copy[locale]

  return useMutation({
    meta: { operation: "archive", entity: "Managed Terminal", suppressSuccessNotification: true, suppressErrorNotification: true },
    mutationFn: async ({ id, expectedRevision }: { id: string; expectedRevision: string }) => {
      const result = await archiveManagedTerminal(organizationId, id, expectedRevision)

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
      notifications.error(t.errorTitle, getTerminalManagementErrorMessage(error, locale))
    },
  })
}
