"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { NotificationData } from "@/components/notifications/NotificationSystem"
import type { Locale } from "@/types/bilingual"
import { notificationCategoryLabel, notificationDateTime, notificationStateLabel } from "@/lib/notifications/presentation"
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Filter,
  Inbox,
  MessageSquare,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Trash2,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react"

type NotificationFilter =
  | "all"
  | "unread"
  | "high"
  | "system"
  | "security"
  | "finance"
  | "inventory"
  | "approvals"
  | "messages"

const copy = {
  en: {
    title: "Notifications",
    subtitle: "Temporary messages in this tab. Reading or dismissing a message does not complete its business task.",
    provider: "Current tab",
    active: "Temporary messages",
    queue: "Messages",
    unread: "Unread",
    highPriority: "High priority",
    delivered: "Read in this tab",
    sound: "Sound",
    soundOn: "On",
    soundOff: "Off",
    soundLoading: "Loading this browser’s preference…",
    soundDefault: "Default setting. Changes apply to this browser across accounts and tabs.",
    soundSaved: "Saved in this browser; shared across its accounts and tabs.",
    soundSessionOnly: "This choice works in this tab, but could not be saved. Check browser storage settings and toggle again to retry.",
    sendTest: "Show local example",
    clearQueue: "Dismiss all",
    markAllRead: "Mark all read",
    empty: "No notifications match this view.",
    channels: "What this view contains",
    storage: "Message history",
    storageValue: "Up to five recent messages are kept temporarily. Automatic dismissal pauses while you review this page. Outside this view, timed notices disappear. Dismissal or a full page reload removes them. This is not a saved inbox.",
    emailPush: "Email, SMS, push and durable business alerts are managed by their own workflows. This page does not confirm their delivery or readiness.",
    notConfigured: "Local view only",
    filters: "Filters",
    all: "All",
    high: "High",
    system: "System",
    security: "Security",
    finance: "Finance",
    inventory: "Inventory",
    approvals: "Approvals",
    messages: "Messages",
    testTitle: "Local example — no business action",
    testMessage: "This is a display example. No payment, approval or external message was created.",
    sampleSource: "Local display example",
    readAnnouncement: "Message marked read in this tab.",
    allReadAnnouncement: "Current messages marked read in this tab.",
    dismissedAnnouncement: "Message dismissed from this tab.",
    clearedAnnouncement: "Current messages dismissed from this tab. Business records are unchanged.",
    read: "Read",
    new: "New",
    markRead: "Mark read",
    dismiss: "Dismiss",
    source: "Source",
    noSource: "Local notification",
  },
  fr: {
    title: "Notifications",
    subtitle: "Messages temporaires dans cet onglet. Lire ou masquer un message ne termine pas la tâche correspondante.",
    provider: "Onglet actuel",
    active: "Messages temporaires",
    queue: "Messages",
    unread: "Non lues",
    highPriority: "Priorité élevée",
    delivered: "Lues dans cet onglet",
    sound: "Son",
    soundOn: "Activé",
    soundOff: "Désactivé",
    soundLoading: "Chargement du réglage de ce navigateur…",
    soundDefault: "Réglage par défaut. Les changements concernent les comptes et onglets de ce navigateur.",
    soundSaved: "Enregistré dans ce navigateur ; partagé entre ses comptes et onglets.",
    soundSessionOnly: "Ce choix fonctionne dans cet onglet, mais n’a pas pu être enregistré. Vérifiez le stockage du navigateur puis changez à nouveau le réglage pour réessayer.",
    sendTest: "Afficher un exemple local",
    clearQueue: "Tout masquer",
    markAllRead: "Tout marquer comme lu",
    empty: "Aucune notification dans cette vue.",
    channels: "Contenu de cette vue",
    storage: "Historique des messages",
    storageValue: "Cinq messages récents au maximum sont conservés temporairement. Leur masquage automatique est suspendu pendant la consultation de cette page. Ailleurs, les messages temporisés disparaissent. Le masquage ou le rechargement complet les supprime. Cette boîte n’est pas enregistrée.",
    emailPush: "Les e-mails, SMS, notifications push et alertes métier conservées relèvent de leurs propres parcours. Cette page ne confirme ni leur livraison ni leur disponibilité.",
    notConfigured: "Vue locale uniquement",
    filters: "Filtres",
    all: "Toutes",
    high: "Priorité élevée",
    system: "Système",
    security: "Sécurité",
    finance: "Finance",
    inventory: "Stock",
    approvals: "Approbations",
    messages: "Messages",
    testTitle: "Exemple local — aucune action métier",
    testMessage: "Ceci est un exemple d’affichage. Aucun paiement, aucune approbation et aucun message externe n’ont été créés.",
    sampleSource: "Exemple d’affichage local",
    readAnnouncement: "Message marqué comme lu dans cet onglet.",
    allReadAnnouncement: "Messages actuels marqués comme lus dans cet onglet.",
    dismissedAnnouncement: "Message masqué dans cet onglet.",
    clearedAnnouncement: "Messages actuels masqués dans cet onglet. Les données métier sont inchangées.",
    read: "Lue",
    new: "Nouvelle",
    markRead: "Marquer comme lue",
    dismiss: "Masquer",
    source: "Source",
    noSource: "Notification locale",
  },
} as const

const filterOptions: Array<{ key: NotificationFilter; icon: LucideIcon }> = [
  { key: "all", icon: Inbox },
  { key: "unread", icon: Bell },
  { key: "high", icon: AlertTriangle },
  { key: "system", icon: Clock3 },
  { key: "security", icon: ShieldCheck },
  { key: "finance", icon: ReceiptText },
  { key: "inventory", icon: PackageCheck },
  { key: "approvals", icon: CheckCheck },
  { key: "messages", icon: MessageSquare },
]

function getLabels(locale: Locale) {
  return copy[locale]
}

function isFinanceNotification(notification: NotificationData) {
  return ["finance", "financial", "payment", "receipt", "cash", "reconciliation"].includes(notification.category || "")
}

function matchesFilter(notification: NotificationData, filter: NotificationFilter) {
  switch (filter) {
    case "unread":
      return !notification.readAt
    case "high":
      return notification.priority === "high" || notification.severity === "critical"
    case "finance":
      return isFinanceNotification(notification)
    case "approvals":
      return notification.category === "approval" || notification.category === "approvals"
    case "messages":
      return notification.category === "message" || notification.category === "messages"
    case "system":
    case "security":
    case "inventory":
      return notification.category === filter
    case "all":
    default:
      return true
  }
}

function notificationTone(notification: NotificationData) {
  if (notification.priority === "high" || notification.severity === "critical") {
    return "notification-list-row--error"
  }

  switch (notification.type) {
    case "success":
      return "notification-list-row--success"
    case "warning":
      return "notification-list-row--warning"
    case "error":
      return "notification-list-row--error"
    case "info":
    default:
      return "notification-list-row--info"
  }
}

export default function NotificationsSettingsClient({ locale }: { locale: Locale }) {
  const t = getLabels(locale)
  const notifications = useNotifications()
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all")
  const [announcement, setAnnouncement] = useState("")
  const SoundIcon = notifications.soundEnabled ? Volume2 : VolumeX

  const visibleNotifications = useMemo(
    () => notifications.notifications.filter((notification) => matchesFilter(notification, activeFilter)),
    [activeFilter, notifications.notifications]
  )

  const highPriorityCount = useMemo(
    () =>
      notifications.notifications.filter(
        (notification) => notification.priority === "high" || notification.severity === "critical"
      ).length,
    [notifications.notifications]
  )

  const deliveredCount = useMemo(
    () =>
      notifications.notifications.filter(
        (notification) => Boolean(notification.readAt)
      ).length,
    [notifications.notifications]
  )

  return (
    <div className="grid min-w-0 gap-6 [overflow-wrap:anywhere] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section aria-label={t.title} className="min-w-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-3 shadow-[0_18px_45px_rgba(5,12,16,0.18)] sm:p-5">
        <p role="status" aria-atomic="true" className="sr-only">{announcement}</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row">
            <div className="notification-icon notification-icon--info flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--dash-text-soft)]">
                {t.provider}
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--dash-text)] sm:text-3xl">{t.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)]">{t.subtitle}</p>
            </div>
          </div>
          <Badge variant="outline" className="notification-pill notification-pill--state whitespace-normal">
            {t.active}
          </Badge>
        </div>

        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-4">
          <MetricCard label={t.queue} value={notifications.notifications.length} icon={Inbox} />
          <MetricCard label={t.unread} value={notifications.unreadCount} icon={BellRing} />
          <MetricCard label={t.highPriority} value={highPriorityCount} icon={AlertTriangle} tone="warn" />
          <MetricCard label={t.delivered} value={deliveredCount} icon={CheckCircle2} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <div className="flex items-center gap-3">
            <div className="notification-icon notification-icon--brand flex h-9 w-9 items-center justify-center rounded-lg">
              <SoundIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--dash-text)]">{t.sound}</p>
              <p className="text-xs text-[var(--dash-text-soft)]">
                {notifications.soundEnabled ? t.soundOn : t.soundOff}
              </p>
            </div>
          </div>
          <Switch
            disabled={notifications.soundPreferenceStatus === "loading"}
            checked={notifications.soundEnabled}
            onCheckedChange={() => notifications.toggleSound()}
            className="data-[state=checked]:bg-[var(--dash-brand)]"
            aria-label={t.sound}
          />
          <p role="status" className="w-full text-xs leading-5 text-[var(--dash-text-soft)]">
            {notifications.soundPreferenceStatus === "loading" ? t.soundLoading : notifications.soundPreferenceStatus === "saved" ? t.soundSaved : notifications.soundPreferenceStatus === "session_only" ? t.soundSessionOnly : t.soundDefault}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            className="notification-action-button notification-action-button--brand [&_svg]:hidden sm:[&_svg]:block h-auto min-h-11 whitespace-normal rounded-lg py-2"
            onClick={() =>
              notifications.info(t.testTitle, t.testMessage, {
                category: "system",
                priority: "normal",
                duration: 0,
                sound: false,
                deliveryState: undefined,
                source: { type: "local_sample", label: t.sampleSource },
              })
            }
          >
            <BellRing className="h-4 w-4" />
            {t.sendTest}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={notifications.unreadCount === 0}
            className="notification-action-button [&_svg]:hidden sm:[&_svg]:block h-auto min-h-11 whitespace-normal rounded-lg py-2"
            onClick={() => { notifications.markAllAsRead(); setAnnouncement(t.allReadAnnouncement) }}
          >
            <CheckCheck className="h-4 w-4" />
            {t.markAllRead}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={notifications.notifications.length === 0}
            className="notification-action-button [&_svg]:hidden sm:[&_svg]:block h-auto min-h-11 whitespace-normal rounded-lg py-2"
            onClick={() => { notifications.clearAll(); setAnnouncement(t.clearedAnnouncement) }}
          >
            <Trash2 className="h-4 w-4" />
            {t.clearQueue}
          </Button>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--dash-text-faint)]">
            <Filter className="h-3.5 w-3.5" />
            {t.filters}
          </div>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map(({ key, icon: Icon }) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                data-active={activeFilter === key}
                aria-pressed={activeFilter === key}
                className="notification-filter-button h-auto min-h-9 whitespace-normal rounded-lg py-2"
                onClick={() => setActiveFilter(key)}
              >
                <Icon className="h-3.5 w-3.5" />
                {t[key]}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {visibleNotifications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-6 text-center">
              <Inbox className="mx-auto h-8 w-8 text-[var(--dash-text-faint)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{t.empty}</p>
            </div>
          ) : (
            visibleNotifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                labels={t}
                locale={locale}
                onMarkRead={id => { notifications.markAsRead(id); setAnnouncement(t.readAnnouncement) }}
                onDismiss={id => { notifications.removeNotification(id); setAnnouncement(t.dismissedAnnouncement) }}
              />
            ))
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-3 sm:p-5">
        <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.channels}</h2>
        <div className="mt-5 grid gap-3">
          <StateRow label={t.provider} value={t.active} />
          <StateRow label={t.storage} value={t.storageValue} />
        </div>
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <Badge variant="outline" className="notification-pill notification-pill--state whitespace-normal">
            {t.notConfigured}
          </Badge>
          <p className="mt-3 text-sm leading-6 text-[var(--dash-text-soft)]">{t.emailPush}</p>
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: number
  icon: LucideIcon
  tone?: "default" | "ok" | "warn"
}) {
  const toneClass =
    tone === "ok"
      ? "notification-metric-icon--success"
      : tone === "warn"
        ? "notification-metric-icon--danger"
        : "notification-metric-icon--info"

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">{label}</p>
        <span className={`notification-metric-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-[var(--dash-text)]">{value}</p>
    </div>
  )
}

function NotificationRow({
  notification,
  labels,
  locale,
  onMarkRead,
  onDismiss,
}: {
  notification: NotificationData
  labels: ReturnType<typeof getLabels>
  locale: Locale
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const isUnread = !notification.readAt

  return (
    <article aria-label={notification.title} className={`notification-list-row min-w-0 rounded-lg border p-4 ${notificationTone(notification)}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-sm font-semibold text-[var(--dash-text)]">{notification.title}</h3>
            <Badge variant="outline" className="notification-pill notification-pill--state">
              {isUnread ? labels.new : labels.read}
            </Badge>
            {notification.priority === "high" || notification.severity === "critical" ? (
              <Badge variant="outline" className="notification-pill notification-pill--priority">
                {labels.highPriority}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{notification.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--dash-text-faint)]">
            <span>{notificationDateTime(notification.createdAt, locale)}</span>
            {notification.category ? <span>{notificationCategoryLabel(notification.category, locale)}</span> : null}
            {notification.deliveryState ? <span>{notificationStateLabel(notification, locale)}</span> : null}
            <span>
              {labels.source}: {notification.source?.label || labels.noSource}
            </span>
          </div>
        </div>

        <div className="flex max-w-full flex-wrap gap-2">
          {isUnread ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="notification-action-button [&_svg]:hidden sm:[&_svg]:block h-auto min-h-11 whitespace-normal rounded-lg py-2"
              aria-label={`${labels.markRead}: ${notification.title}`}
              onClick={() => onMarkRead(notification.id)}
            >
              <CheckCheck className="h-4 w-4" />
              {labels.markRead}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="notification-dismiss-button h-9 w-9 rounded-lg p-0"
            onClick={() => onDismiss(notification.id)}
            aria-label={`${labels.dismiss}: ${notification.title}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}

function StateRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-[var(--dash-text)]">{label}</span>
        {ok ? <CheckCircle2 className="notification-check-icon h-4 w-4" /> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{value}</p>
    </div>
  )
}

