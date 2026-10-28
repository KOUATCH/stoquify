import type { NotificationCategory, NotificationData } from "@/components/notifications/NotificationSystem"

export const PROVIDER_NOTIFICATION_EVENT = "stockflow:provider-notification"

type NotificationType = NotificationData["type"]
type NotificationPriority = NonNullable<NotificationData["priority"]>

type LegacyNotificationOptions = {
  id?: string
  title?: unknown
  message?: unknown
  description?: unknown
  type?: NotificationType
  variant?: "default" | "destructive" | string
  duration?: number
  category?: NotificationCategory
  priority?: NotificationPriority
  severity?: NotificationData["severity"]
  deliveryState?: NotificationData["deliveryState"]
  channel?: NotificationData["channel"]
  source?: NotificationData["source"]
  correlationId?: string
  sound?: boolean
  action?: unknown
}

export type ProviderNotificationPayload = Omit<NotificationData, "id"> & {
  id?: string
}

export type ProviderNotificationEventDetail =
  | {
      action: "show"
      notification: ProviderNotificationPayload
    }
  | {
      action: "dismiss"
      id?: string
    }
  | {
      action: "clear"
    }

type NotifyInput = string | LegacyNotificationOptions
type NotifyMethod = (
  title: unknown,
  messageOrOptions?: unknown,
  options?: LegacyNotificationOptions
) => string

type NotifyApi = {
  (input: NotifyInput): string
  success: NotifyMethod
  error: NotifyMethod
  warning: NotifyMethod
  info: NotifyMethod
  loading: (title: unknown, options?: LegacyNotificationOptions) => string
  dismiss: (id?: string) => void
}

const DEFAULT_MESSAGE: Record<NotificationType, string> = {
  success: "The operation completed successfully.",
  error: "The operation could not be completed. Please try again.",
  warning: "Please review this item before continuing.",
  info: "Here is the latest update.",
}

const DEFAULT_TITLE: Record<NotificationType, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Information",
}

function createId() {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value instanceof Error) return value.message

  if (typeof value === "object" && value !== null) {
    const maybeValue = value as { props?: { children?: unknown }; message?: unknown; description?: unknown }
    return text(maybeValue.message) || text(maybeValue.description) || text(maybeValue.props?.children, fallback)
  }

  return fallback
}

function isOptions(value: unknown): value is LegacyNotificationOptions {
  return typeof value === "object" && value !== null
}

function normalizeType(type: NotificationType, options?: LegacyNotificationOptions): NotificationType {
  if (options?.type) return options.type
  return options?.variant === "destructive" ? "error" : type
}

function normalizeAction(action: unknown): NotificationData["action"] | undefined {
  if (typeof action !== "object" || action === null) return undefined

  const maybeAction = action as { label?: unknown; onClick?: unknown }
  if (typeof maybeAction.label !== "string" || typeof maybeAction.onClick !== "function") {
    return undefined
  }

  return {
    label: maybeAction.label,
    onClick: maybeAction.onClick as () => void,
  }
}

function normalizeFromArgs(
  type: NotificationType,
  title: unknown,
  messageOrOptions?: unknown,
  options?: LegacyNotificationOptions
): ProviderNotificationPayload {
  const secondArgIsOptions = isOptions(messageOrOptions)
  const normalizedOptions = {
    ...(secondArgIsOptions ? messageOrOptions : {}),
    ...options,
  } as LegacyNotificationOptions
  const notificationType = normalizeType(type, normalizedOptions)
  const explicitDescription = text(normalizedOptions.description)
  const explicitMessage = text(normalizedOptions.message)
  const inlineMessage = secondArgIsOptions ? "" : text(messageOrOptions)
  const message = explicitDescription || explicitMessage || inlineMessage || text(title, DEFAULT_MESSAGE[notificationType])
  const titleText = inlineMessage || explicitDescription || explicitMessage
    ? text(title, DEFAULT_TITLE[notificationType])
    : normalizedOptions.title
      ? text(normalizedOptions.title, DEFAULT_TITLE[notificationType])
      : DEFAULT_TITLE[notificationType]

  return {
    id: normalizedOptions.id || createId(),
    type: notificationType,
    title: titleText,
    message,
    duration: normalizedOptions.duration,
    category: normalizedOptions.category || (notificationType === "error" ? "error" : "general"),
    priority: normalizedOptions.priority || (notificationType === "error" ? "high" : "normal"),
    severity: normalizedOptions.severity,
    deliveryState: normalizedOptions.deliveryState,
    channel: normalizedOptions.channel,
    source: normalizedOptions.source,
    correlationId: normalizedOptions.correlationId,
    sound: normalizedOptions.sound ?? (notificationType === "error"),
    action: normalizeAction(normalizedOptions.action),
  }
}

function normalizeInput(input: NotifyInput, fallbackType: NotificationType): ProviderNotificationPayload {
  if (typeof input === "string") {
    return normalizeFromArgs(fallbackType, input)
  }

  const notificationType = normalizeType(fallbackType, input)
  const title = text(input.title, DEFAULT_TITLE[notificationType])
  const message = text(input.description) || text(input.message) || DEFAULT_MESSAGE[notificationType]

  return {
    id: input.id || createId(),
    type: notificationType,
    title,
    message,
    duration: input.duration,
    category: input.category || (notificationType === "error" ? "error" : "general"),
    priority: input.priority || (notificationType === "error" ? "high" : "normal"),
    severity: input.severity,
    deliveryState: input.deliveryState,
    channel: input.channel,
    source: input.source,
    correlationId: input.correlationId,
    sound: input.sound ?? (notificationType === "error"),
    action: normalizeAction(input.action),
  }
}

function dispatch(detail: ProviderNotificationEventDetail) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<ProviderNotificationEventDetail>(PROVIDER_NOTIFICATION_EVENT, { detail }))
}

function show(notification: ProviderNotificationPayload) {
  dispatch({ action: "show", notification })
  return notification.id || ""
}

const baseNotify = ((input: NotifyInput) => show(normalizeInput(input, "info"))) as NotifyApi

baseNotify.success = (title, messageOrOptions, options) => show(normalizeFromArgs("success", title, messageOrOptions, options))
baseNotify.error = (title, messageOrOptions, options) => show(normalizeFromArgs("error", title, messageOrOptions, options))
baseNotify.warning = (title, messageOrOptions, options) => show(normalizeFromArgs("warning", title, messageOrOptions, options))
baseNotify.info = (title, messageOrOptions, options) => show(normalizeFromArgs("info", title, messageOrOptions, options))
baseNotify.loading = (title, options) => show({
  ...normalizeFromArgs("info", title, options),
  duration: options?.duration ?? 0,
  showProgress: true,
})
baseNotify.dismiss = (id?: string) => dispatch(id ? { action: "dismiss", id } : { action: "clear" })

export const notify = baseNotify
