"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  Bell,
  Calculator,
  CheckCheck,
  CheckCircle2,
  DollarSign,
  FileText,
  Info,
  MessageSquare,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

export type NotificationCategory =
  | "general"
  | "form"
  | "operation"
  | "cash"
  | "reconciliation"
  | "error"
  | "warning"
  | "info"
  | "business"
  | "security"
  | "system"
  | "network"
  | "inventory"
  | "sales"
  | "pos"
  | "financial"
  | "finance"
  | "purchase"
  | "purchase_order"
  | "reporting"
  | "payment"
  | "receipt"
  | "client_order"
  | "approval"
  | "approvals"
  | "message"
  | "messages"

export type NotificationSeverity = "info" | "success" | "warning" | "error" | "critical"
export type NotificationDeliveryState = "queued" | "sent" | "delivered" | "read" | "failed" | "dismissed"
export type NotificationChannel = "in_app" | "email" | "sms" | "whatsapp" | "push"

export interface NotificationData {
  id: string
  type: "success" | "error" | "info" | "warning"
  title: string
  message: string
  duration?: number
  sound?: boolean
  priority?: "low" | "normal" | "high"
  category?: NotificationCategory
  severity?: NotificationSeverity
  deliveryState?: NotificationDeliveryState
  channel?: NotificationChannel
  createdAt?: string
  readAt?: string
  dismissedAt?: string
  correlationId?: string
  source?: {
    type: string
    id?: string
    label?: string
    href?: string
  }
  showProgress?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationSystemProps {
  notifications: NotificationData[]
  onRemove: (id: string) => void
  onMarkRead: (id: string) => void
  soundEnabled: boolean
  onToggleSound: () => void
  unreadCount?: number
}

const priorityRank: Record<NonNullable<NotificationData["priority"]>, number> = {
  high: 3,
  normal: 2,
  low: 1,
}

function NotificationIcon({ type, category }: { type: NotificationData["type"]; category?: string }) {
  if (category === "cash") return <DollarSign className="h-5 w-5" />
  if (category === "reconciliation") return <Calculator className="h-5 w-5" />
  if (category === "form") return <FileText className="h-5 w-5" />
  if (category === "operation") return <Zap className="h-5 w-5" />
  if (category === "security") return <ShieldCheck className="h-5 w-5" />
  if (category === "inventory") return <PackageCheck className="h-5 w-5" />
  if (category === "payment" || category === "receipt" || category === "finance" || category === "financial") {
    return <ReceiptText className="h-5 w-5" />
  }
  if (category === "message" || category === "messages") return <MessageSquare className="h-5 w-5" />
  if (category === "approval" || category === "approvals") return <CheckCheck className="h-5 w-5" />

  switch (type) {
    case "success":
      return <CheckCircle2 className="h-5 w-5" />
    case "error":
    case "warning":
      return <AlertTriangle className="h-5 w-5" />
    case "info":
    default:
      return <Info className="h-5 w-5" />
  }
}

function notificationTone(notification: NotificationData) {
  if (notification.severity === "critical") return "critical"
  if (notification.severity === "error") return "error"
  if (notification.severity === "warning") return "warning"
  if (notification.severity === "success") return "success"
  if (notification.severity === "info") return "info"
  return notification.type
}

function getNotificationStyles(notification: NotificationData, isUnread?: boolean) {
  return cn(
    "notification-toast",
    `notification-toast--${notificationTone(notification)}`,
    isUnread && "notification-toast--unread",
    notification.priority === "high" && "notification-toast--high-priority"
  )
}

function getCategoryToneClass(category?: string, type?: NotificationData["type"], severity?: NotificationSeverity) {
  if (severity === "critical" || severity === "error" || type === "error") return "notification-icon--danger"
  if (severity === "warning" || type === "warning") return "notification-icon--warning"
  if (severity === "success" || type === "success") return "notification-icon--success"

  switch (category) {
    case "cash":
    case "payment":
    case "receipt":
    case "finance":
    case "financial":
      return "notification-icon--spruce"
    case "reconciliation":
    case "form":
    case "reporting":
    case "system":
      return "notification-icon--brand"
    case "operation":
    case "purchase":
    case "purchase_order":
    case "client_order":
    case "sales":
    case "business":
      return "notification-icon--gold"
    case "inventory":
    case "pos":
    case "approval":
    case "approvals":
      return "notification-icon--success"
    case "security":
    case "network":
    case "error":
      return "notification-icon--danger"
    case "warning":
      return "notification-icon--warning"
    case "message":
    case "messages":
    case "info":
      return "notification-icon--info"
    default:
      return type ? `notification-icon--${type}` : "notification-icon--info"
  }
}

function getIconStyles(type: NotificationData["type"], category?: string, severity?: NotificationSeverity) {
  return cn("notification-icon rounded-lg p-2", getCategoryToneClass(category, type, severity))
}

function formatNotificationTime(createdAt?: string) {
  if (!createdAt) return "Now"

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(createdAt))
  } catch {
    return "Now"
  }
}

export function NotificationSystem({
  notifications,
  onRemove,
  onMarkRead,
  soundEnabled,
  onToggleSound,
  unreadCount = 0,
}: NotificationSystemProps) {
  const [soundsPlayed, setSoundsPlayed] = useState<Set<string>>(new Set())

  useEffect(() => {
    notifications.forEach((notification) => {
      if (soundEnabled && notification.sound && !soundsPlayed.has(notification.id)) {
        playNotificationSound(notification.type, notification.priority)
        setSoundsPlayed((prev) => new Set(prev).add(notification.id))
      }
    })
  }, [notifications, soundEnabled, soundsPlayed])

  const sortedNotifications = [...notifications].sort((a, b) => {
    const priorityDelta = priorityRank[b.priority || "normal"] - priorityRank[a.priority || "normal"]
    if (priorityDelta !== 0) return priorityDelta
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  })

  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSound}
          className="notification-control h-10 gap-2 rounded-lg px-3"
          aria-label={soundEnabled ? "Disable notification sound" : "Enable notification sound"}
        >
          <span className="relative inline-flex">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="notification-unread-count absolute -right-2 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </span>
          {soundEnabled ? (
            <>
              <Volume2 className="notification-control-icon notification-control-icon--on h-4 w-4" />
              <span className="notification-control-label notification-control-label--on text-xs font-bold">On</span>
            </>
          ) : (
            <>
              <VolumeX className="notification-control-icon h-4 w-4" />
              <span className="notification-control-label text-xs font-bold">Off</span>
            </>
          )}
        </Button>
      </div>

      <div className="fixed right-4 top-16 z-50 w-[calc(100vw-2rem)] max-w-sm space-y-3 sm:w-96">
        {sortedNotifications.map((notification, index) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
            onMarkRead={onMarkRead}
            index={index}
          />
        ))}
      </div>
    </>
  )
}

function playNotificationSound(type: NotificationData["type"], priority?: string) {
  try {
    const AudioContextConstructor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) return

    const audioContext = new AudioContextConstructor()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    switch (type) {
      case "success":
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2)
        break
      case "error":
        if (priority === "high") {
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1)
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.2)
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.3)
        } else {
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1)
        }
        break
      case "warning":
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(700, audioContext.currentTime + 0.1)
        break
      case "info":
      default:
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime)
        break
    }

    const volume = priority === "high" ? 0.15 : 0.1
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (priority === "high" ? 0.4 : 0.2))

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + (priority === "high" ? 0.4 : 0.2))
  } catch (error) {
    console.warn("Failed to play notification sound:", error)
  }
}

function NotificationCard({
  notification,
  onRemove,
  onMarkRead,
  index,
}: {
  notification: NotificationData
  onRemove: (id: string) => void
  onMarkRead: (id: string) => void
  index: number
}) {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const isUnread = !notification.readAt

  const handleRemove = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(notification.id)
    }, 250)
  }, [notification.id, onRemove])

  useEffect(() => {
    const duration = notification.duration ?? 5000
    if (duration <= 0) {
      setProgress(100)
      return
    }

    const interval = 75
    const steps = duration / interval
    let currentStep = 0

    const progressTimer = setInterval(() => {
      currentStep += 1
      const nextProgress = ((steps - currentStep) / steps) * 100
      setProgress(Math.max(0, nextProgress))
    }, interval)

    const removeTimer = setTimeout(() => {
      handleRemove()
    }, duration)

    return () => {
      clearInterval(progressTimer)
      clearTimeout(removeTimer)
    }
  }, [handleRemove, notification.duration])

  return (
    <div
      className={cn(
        "relative transform overflow-hidden rounded-lg transition-all duration-300 ease-out",
        getNotificationStyles(notification, isUnread),
        isExiting ? "translate-x-full scale-95 opacity-0" : "translate-x-0 scale-100 opacity-100",
        "animate-in slide-in-from-right-full"
      )}
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: "both",
      }}
    >
      {notification.showProgress ? (
        <div className="notification-progress-track absolute left-0 right-0 top-0 h-1 overflow-hidden">
          <div className="notification-progress-bar h-full transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={getIconStyles(notification.type, notification.category, notification.severity)}>
            <NotificationIcon type={notification.type} category={notification.category} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="notification-title truncate text-sm font-bold leading-tight">{notification.title}</h4>
                  {isUnread ? (
                    <span className="notification-badge notification-badge--new rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="notification-message mt-1 text-sm leading-6">{notification.message}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="notification-dismiss-button h-8 w-8 rounded-lg p-0"
                onClick={handleRemove}
                aria-label={`Dismiss ${notification.title}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="notification-meta mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span>{formatNotificationTime(notification.createdAt)}</span>
              {notification.category && notification.category !== "general" ? (
                <span className="notification-pill notification-pill--category rounded-full px-2 py-0.5 font-semibold capitalize">
                  {notification.category.replace("_", " ")}
                </span>
              ) : null}
              {notification.priority === "high" ? (
                <span className="notification-pill notification-pill--priority rounded-full px-2 py-0.5 font-bold">
                  High priority
                </span>
              ) : null}
              {notification.deliveryState ? (
                <span className="notification-pill notification-pill--state rounded-full px-2 py-0.5 font-semibold capitalize">
                  {notification.deliveryState}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {isUnread ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="notification-action-button h-8 rounded-lg text-xs font-semibold"
                  onClick={() => onMarkRead(notification.id)}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark read
                </Button>
              ) : null}
              {notification.action ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="notification-action-button h-8 rounded-lg text-xs font-semibold"
                  onClick={() => {
                    onMarkRead(notification.id)
                    notification.action?.onClick()
                    handleRemove()
                  }}
                >
                  {notification.action.label}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
