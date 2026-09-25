import type { NotificationCategory, NotificationData } from "@/components/notifications/NotificationSystem"
import type { Locale } from "@/types/bilingual"

export const notificationCopy = {
  en: { region: "Temporary notifications", new: "New", high: "High priority", markRead: "Mark read", dismiss: "Dismiss", enableSound: "Enable notification sound", disableSound: "Disable notification sound", on: "On", off: "Off", unknownTime: "Time unavailable", localDisplay: "Displayed in this tab", localRead: "Read in this tab", localQueued: "Queued in this tab", localDismissed: "Dismissed in this tab", queued: "Queued", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed", dismissed: "Dismissed" },
  fr: { region: "Notifications temporaires", new: "Nouvelle", high: "Priorité élevée", markRead: "Marquer comme lue", dismiss: "Masquer", enableSound: "Activer le son des notifications", disableSound: "Désactiver le son des notifications", on: "Activé", off: "Désactivé", unknownTime: "Heure indisponible", localDisplay: "Affichée dans cet onglet", localRead: "Lue dans cet onglet", localQueued: "En attente dans cet onglet", localDismissed: "Masquée dans cet onglet", queued: "En attente", sent: "Envoyée", delivered: "Livrée", read: "Lue", failed: "Échec", dismissed: "Masquée" },
} as const

const categories: Record<NotificationCategory, readonly [string, string]> = {
  general: ["General", "Général"], form: ["Form", "Formulaire"], operation: ["Operation", "Opération"], cash: ["Cash", "Caisse"], reconciliation: ["Reconciliation", "Rapprochement"], error: ["Error", "Erreur"], warning: ["Warning", "Avertissement"], info: ["Information", "Information"], business: ["Business", "Activité"], security: ["Security", "Sécurité"], system: ["System", "Système"], network: ["Network", "Réseau"], inventory: ["Inventory", "Stock"], sales: ["Sales", "Ventes"], pos: ["Point of sale", "Point de vente"], financial: ["Finance", "Finance"], finance: ["Finance", "Finance"], purchase: ["Purchasing", "Achats"], purchase_order: ["Purchase order", "Commande fournisseur"], reporting: ["Reporting", "Rapports"], payment: ["Payment", "Paiement"], receipt: ["Receipt", "Reçu"], client_order: ["Customer order", "Commande client"], approval: ["Approval", "Approbation"], approvals: ["Approvals", "Approbations"], message: ["Message", "Message"], messages: ["Messages", "Messages"],
}

export function notificationCategoryLabel(category: NotificationCategory | undefined, locale: Locale) {
  return category ? categories[category]?.[locale === "fr" ? 1 : 0] ?? (locale === "fr" ? "Autre" : "Other") : ""
}

export function notificationStateLabel(notification: NotificationData, locale: Locale) {
  const t = notificationCopy[locale], state = notification.deliveryState
  if (!state) return ""
  if (!notification.channel || notification.channel === "in_app") {
    if (state === "read") return t.localRead
    if (state === "sent" || state === "delivered") return t.localDisplay
    if (state === "queued") return t.localQueued
    if (state === "dismissed") return t.localDismissed
  }
  return t[state]
}

export function notificationDateTime(value: string | undefined, locale: Locale) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return notificationCopy[locale].unknownTime
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}
