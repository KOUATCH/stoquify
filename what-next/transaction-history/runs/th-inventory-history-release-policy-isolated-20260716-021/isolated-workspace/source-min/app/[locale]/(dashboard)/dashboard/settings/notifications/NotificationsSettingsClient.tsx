"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import type { NotificationData } from "@/components/notifications/NotificationSystem"
import type { Locale } from "@/types/bilingual"
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
    subtitle: "In-app queue, read state, delivery status, and local preferences.",
    provider: "In-app provider",
    active: "Active",
    queue: "Queue",
    unread: "Unread",
    highPriority: "High priority",
    delivered: "Delivered",
    sound: "Sound",
    soundOn: "On",
    soundOff: "Off",
    sendTest: "Send test",
    securityTest: "Security alert",
    paymentTest: "Payment update",
    clearQueue: "Clear queue",
    markAllRead: "Mark all read",
    empty: "No notifications match this view.",
    channels: "Channels",
    storage: "Storage",
    storageValue: "Browser sound preference; current queue is session memory.",
    emailPush: "Email, SMS, WhatsApp, push, digest, and persisted inbox remain adapter-ready.",
    notConfigured: "Adapter-ready",
    filters: "Filters",
    all: "All",
    high: "High",
    system: "System",
    security: "Security",
    finance: "Finance",
    inventory: "Inventory",
    approvals: "Approvals",
    messages: "Messages",
    testTitle: "Notification test",
    testMessage: "The in-app notification provider is active.",
    securityTitle: "Security review required",
    securityMessage: "A privileged action was queued for review.",
    paymentTitle: "Payment received",
    paymentMessage: "A customer payment was recorded and delivered to the in-app queue.",
    read: "Read",
    new: "New",
    markRead: "Mark read",
    dismiss: "Dismiss",
    source: "Source",
    noSource: "Session event",
  },
  fr: {
    title: "Notifications",
    subtitle: "File in-app, lecture, statut de livraison et preferences locales.",
    provider: "Provider in-app",
    active: "Actif",
    queue: "File",
    unread: "Non lues",
    highPriority: "Priorite haute",
    delivered: "Livrees",
    sound: "Son",
    soundOn: "Active",
    soundOff: "Coupe",
    sendTest: "Envoyer test",
    securityTest: "Alerte securite",
    paymentTest: "Paiement",
    clearQueue: "Vider la file",
    markAllRead: "Tout marquer lu",
    empty: "Aucune notification dans cette vue.",
    channels: "Canaux",
    storage: "Stockage",
    storageValue: "Preference sonore navigateur; file actuelle en memoire de session.",
    emailPush: "Email, SMS, WhatsApp, push, digest et inbox persistant restent prets pour adaptateurs.",
    notConfigured: "Pret adaptateur",
    filters: "Filtres",
    all: "Toutes",
    high: "Haute",
    system: "Systeme",
    security: "Securite",
    finance: "Finance",
    inventory: "Stock",
    approvals: "Approbations",
    messages: "Messages",
    testTitle: "Test notification",
    testMessage: "Le provider notification in-app est actif.",
    securityTitle: "Revue securite requise",
    securityMessage: "Une action privilegiee est en attente de revue.",
    paymentTitle: "Paiement recu",
    paymentMessage: "Un paiement client a ete enregistre et livre dans la file in-app.",
    read: "Lue",
    new: "Nouvelle",
    markRead: "Marquer lu",
    dismiss: "Fermer",
    source: "Source",
    noSource: "Evenement session",
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

function formatDateTime(value?: string) {
  if (!value) return ""

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return ""
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
        (notification) => notification.deliveryState === "delivered" || notification.deliveryState === "read"
      ).length,
    [notifications.notifications]
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5 shadow-[0_18px_45px_rgba(5,12,16,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
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
          <Badge variant="outline" className="notification-pill notification-pill--success">
            {t.active}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t.queue} value={notifications.notifications.length} icon={Inbox} />
          <MetricCard label={t.unread} value={notifications.unreadCount} icon={BellRing} />
          <MetricCard label={t.highPriority} value={highPriorityCount} icon={AlertTriangle} tone="warn" />
          <MetricCard label={t.delivered} value={deliveredCount} icon={CheckCircle2} tone="ok" />
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
            checked={notifications.soundEnabled}
            onCheckedChange={() => notifications.toggleSound()}
            className="data-[state=checked]:bg-[var(--dash-success)]"
            aria-label={t.sound}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            className="notification-action-button notification-action-button--brand rounded-lg"
            onClick={() =>
              notifications.info(t.testTitle, t.testMessage, {
                category: "system",
                priority: "normal",
                source: { type: "provider", label: t.provider },
              })
            }
          >
            <BellRing className="h-4 w-4" />
            {t.sendTest}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="notification-action-button notification-action-button--danger rounded-lg"
            onClick={() =>
              notifications.warning(t.securityTitle, t.securityMessage, {
                category: "security",
                priority: "high",
                severity: "critical",
                duration: 10000,
                source: { type: "security", label: t.security },
              })
            }
          >
            <ShieldCheck className="h-4 w-4" />
            {t.securityTest}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="notification-action-button notification-action-button--success rounded-lg"
            onClick={() =>
              notifications.success(t.paymentTitle, t.paymentMessage, {
                category: "payment",
                priority: "normal",
                source: { type: "payment", label: t.finance },
              })
            }
          >
            <ReceiptText className="h-4 w-4" />
            {t.paymentTest}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={notifications.unreadCount === 0}
            className="notification-action-button rounded-lg"
            onClick={notifications.markAllAsRead}
          >
            <CheckCheck className="h-4 w-4" />
            {t.markAllRead}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={notifications.notifications.length === 0}
            className="notification-action-button rounded-lg"
            onClick={notifications.clearAll}
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
                className="notification-filter-button rounded-lg"
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
                onMarkRead={notifications.markAsRead}
                onDismiss={notifications.removeNotification}
              />
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.channels}</h2>
        <div className="mt-5 grid gap-3">
          <StateRow label={t.provider} value={t.active} ok />
          <StateRow label={t.storage} value={t.storageValue} ok />
        </div>
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <Badge variant="outline" className="notification-pill notification-pill--warning">
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
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">{label}</p>
        <span className={`notification-metric-icon flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
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
  onMarkRead,
  onDismiss,
}: {
  notification: NotificationData
  labels: ReturnType<typeof getLabels>
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const isUnread = !notification.readAt

  return (
    <div className={`notification-list-row rounded-lg border p-4 ${notificationTone(notification)}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--dash-text)]">{notification.title}</h3>
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
            {notification.createdAt ? <span>{formatDateTime(notification.createdAt)}</span> : null}
            {notification.category ? <span className="capitalize">{notification.category.replace("_", " ")}</span> : null}
            {notification.deliveryState ? <span className="capitalize">{notification.deliveryState}</span> : null}
            <span>
              {labels.source}: {notification.source?.label || labels.noSource}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {isUnread ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="notification-action-button rounded-lg"
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
            aria-label={labels.dismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
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
