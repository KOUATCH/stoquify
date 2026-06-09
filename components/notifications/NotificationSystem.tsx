"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Volume2,
  VolumeX,
  Clock,
  DollarSign,
  Calculator,
  FileText,
  Zap
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
  | "purchase"
  | "purchase_order"
  | "reporting"
  | "payment"
  | "receipt"
  | "client_order"

export interface NotificationData {
  id: string
  type: "success" | "error" | "info" | "warning"
  title: string
  message: string
  duration?: number
  sound?: boolean
  priority?: "low" | "normal" | "high"
  category?: NotificationCategory
  showProgress?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationSystemProps {
  notifications: NotificationData[]
  onRemove: (id: string) => void
  soundEnabled: boolean
  onToggleSound: () => void
}

const NotificationIcon = ({ type, category }: { type: NotificationData["type"]; category?: string }) => {
  // Category-specific icons
  if (category === "cash") return <DollarSign className="h-5 w-5" />
  if (category === "reconciliation") return <Calculator className="h-5 w-5" />
  if (category === "form") return <FileText className="h-5 w-5" />
  if (category === "operation") return <Zap className="h-5 w-5" />

  // Type-specific icons
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-5 w-5" />
    case "error":
      return <AlertTriangle className="h-5 w-5" />
    case "warning":
      return <AlertTriangle className="h-5 w-5" />
    case "info":
    default:
      return <Info className="h-5 w-5" />
  }
}

const getNotificationStyles = (type: NotificationData["type"], priority?: string) => {
  const baseStyles = "backdrop-blur-xl border-0 shadow-2xl"

  switch (type) {
    case "success":
      return cn(
        baseStyles,
        "bg-gradient-to-r from-emerald-50/95 via-green-50/95 to-teal-50/95 dark:from-emerald-950/90 dark:via-green-950/90 dark:to-teal-950/90",
        "border-l-4 border-l-emerald-500 text-emerald-900 dark:text-emerald-100"
      )
    case "error":
      return cn(
        baseStyles,
        "bg-gradient-to-r from-red-50/95 via-rose-50/95 to-pink-50/95 dark:from-red-950/90 dark:via-rose-950/90 dark:to-pink-950/90",
        "border-l-4 border-l-red-500 text-red-900 dark:text-red-100",
        priority === "high" && "ring-2 ring-red-200 dark:ring-red-800"
      )
    case "warning":
      return cn(
        baseStyles,
        "bg-gradient-to-r from-amber-50/95 via-yellow-50/95 to-orange-50/95 dark:from-amber-950/90 dark:via-yellow-950/90 dark:to-orange-950/90",
        "border-l-4 border-l-amber-500 text-amber-900 dark:text-amber-100"
      )
    case "info":
    default:
      return cn(
        baseStyles,
        "bg-gradient-to-r from-blue-50/95 via-cyan-50/95 to-indigo-50/95 dark:from-blue-950/90 dark:via-cyan-950/90 dark:to-indigo-950/90",
        "border-l-4 border-l-blue-500 text-blue-900 dark:text-blue-100"
      )
  }
}

const getIconStyles = (type: NotificationData["type"], category?: string) => {
  const baseStyles = "rounded-2xl p-2 shadow-lg"

  // Category-specific styling
  if (category === "cash") {
    return cn(baseStyles, "bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-600 dark:text-emerald-400")
  }
  if (category === "reconciliation") {
    return cn(baseStyles, "bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 text-purple-600 dark:text-purple-400")
  }
  if (category === "form") {
    return cn(baseStyles, "bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400")
  }
  if (category === "operation") {
    return cn(baseStyles, "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-600 dark:text-amber-400")
  }

  // Type-specific styling
  switch (type) {
    case "success":
      return cn(baseStyles, "bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-600 dark:text-emerald-400")
    case "error":
      return cn(baseStyles, "bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 text-red-600 dark:text-red-400")
    case "warning":
      return cn(baseStyles, "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-600 dark:text-amber-400")
    case "info":
    default:
      return cn(baseStyles, "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-600 dark:text-blue-400")
  }
}

export function NotificationSystem({ notifications, onRemove, soundEnabled, onToggleSound }: NotificationSystemProps) {
  const [soundsPlayed, setSoundsPlayed] = useState<Set<string>>(new Set())

  useEffect(() => {
    notifications.forEach((notification) => {
      if (soundEnabled && notification.sound && !soundsPlayed.has(notification.id)) {
        playNotificationSound(notification.type, notification.priority)
        setSoundsPlayed((prev) => new Set(prev).add(notification.id))
      }
    })
  }, [notifications, soundEnabled, soundsPlayed])

  const playNotificationSound = (type: NotificationData["type"], priority?: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Enhanced sound patterns based on type and priority
      switch (type) {
        case "success":
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2)
          break
        case "error":
          if (priority === "high") {
            // More urgent sound for high priority errors
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

  // Sort notifications by priority
  const sortedNotifications = [...notifications].sort((a, b) => {
    const priorityOrder = { high: 3, normal: 2, low: 1 }
    return (priorityOrder[b.priority || "normal"] || 2) - (priorityOrder[a.priority || "normal"] || 2)
  })

  return (
    <>
      {/* Enhanced Sound Toggle Button */}
      <div className="fixed top-4 right-20 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSound}
          className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="h-4 w-4 text-emerald-600 mr-2" />
              <span className="text-xs font-bold text-emerald-600">ON</span>
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4 text-slate-400 mr-2" />
              <span className="text-xs font-bold text-slate-400">OFF</span>
            </>
          )}
        </Button>
      </div>

      {/* Enhanced Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
        {sortedNotifications.map((notification, index) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
            index={index}
          />
        ))}
      </div>
    </>
  )
}

function NotificationCard({
  notification,
  onRemove,
  index,
}: {
  notification: NotificationData
  onRemove: (id: string) => void
  index: number
}) {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)

  const handleRemove = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(notification.id)
    }, 300)
  }, [notification.id, onRemove])

  useEffect(() => {
    const duration = notification.duration || 5000
    if (duration <= 0) {
      setProgress(100)
      return
    }

    const interval = 50 // Update every 50ms
    const steps = duration / interval
    let currentStep = 0

    const progressTimer = setInterval(() => {
      currentStep++
      const newProgress = ((steps - currentStep) / steps) * 100
      setProgress(Math.max(0, newProgress))
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
        "relative rounded-2xl transition-all duration-500 ease-out transform",
        getNotificationStyles(notification.type, notification.priority),
        isExiting
          ? "opacity-0 scale-95 translate-x-full"
          : "opacity-100 scale-100 translate-x-0",
        "animate-in slide-in-from-right-full"
      )}
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: "both"
      }}
    >
      {/* Progress bar for notifications with showProgress */}
      {notification.showProgress && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Enhanced Icon */}
          <div className={getIconStyles(notification.type, notification.category)}>
            <NotificationIcon type={notification.type} category={notification.category} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-black text-base mb-2 leading-tight">{notification.title}</h4>
                <p className="text-sm opacity-90 leading-relaxed">{notification.message}</p>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-60 hover:opacity-100 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 rounded-xl"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Action button */}
            {notification.action && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 h-8 text-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-bold"
                onClick={() => {
                  notification.action?.onClick()
                  handleRemove()
                }}
              >
                {notification.action.label}
              </Button>
            )}

            {/* Category badge */}
            {notification.category && notification.category !== "general" && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-black/10 dark:bg-white/10 rounded-lg">
                  {notification.category === "cash" && <DollarSign className="w-3 h-3" />}
                  {notification.category === "reconciliation" && <Calculator className="w-3 h-3" />}
                  {notification.category === "form" && <FileText className="w-3 h-3" />}
                  {notification.category === "operation" && <Zap className="w-3 h-3" />}
                  <span className="text-xs font-bold capitalize">{notification.category}</span>
                </div>

                {notification.priority === "high" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-700 dark:text-red-300 rounded-lg">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-xs font-bold">High Priority</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced visual effects */}
      <div className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none">
        <div className={cn(
          "absolute inset-0 rounded-2xl",
          notification.type === "success" && "bg-gradient-to-br from-emerald-400/20 to-green-400/20",
          notification.type === "error" && "bg-gradient-to-br from-red-400/20 to-rose-400/20",
          notification.type === "warning" && "bg-gradient-to-br from-amber-400/20 to-yellow-400/20",
          notification.type === "info" && "bg-gradient-to-br from-blue-400/20 to-cyan-400/20"
        )} />
      </div>
    </div>
  )
}
