"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { NotificationData, NotificationSystem } from "./NotificationSystem"
import { setupErrorNotificationIntegration } from "@/lib/error-handling/notification-integration"
import {
  CRUD_MUTATION_NOTIFICATION_EVENT,
  type CrudMutationNotification,
} from "@/lib/error-handling/crud-notifications"
import {
  PROVIDER_NOTIFICATION_EVENT,
  type ProviderNotificationEventDetail,
} from "@/lib/notifications/notify"

interface NotificationContextType {
  notifications: NotificationData[]
  unreadCount: number
  soundEnabled: boolean
  addNotification: (notification: Omit<NotificationData, "id"> & { id?: string }) => string
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  toggleSound: () => void
  // Convenience methods
  success: (title: string, message: string, options?: Partial<NotificationData>) => string
  error: (title: string, message: string, options?: Partial<NotificationData>) => string
  warning: (title: string, message: string, options?: Partial<NotificationData>) => string
  info: (title: string, message: string, options?: Partial<NotificationData>) => string
  // Enhanced methods for forms and operations
  formSuccess: (operation: string, details?: string) => string
  formError: (operation: string, error: string, details?: string) => string
  operationStart: (operation: string) => string
  operationComplete: (operation: string, result?: string) => string
  cashOperation: (type: "add" | "remove", amount: number, drawer: string) => string
  reconciliationResult: (variance: number, drawer: string) => string
  // Payment-specific methods
  paymentReceived: (amount: number, customer: string, invoiceNumber: string) => string
  paymentMade: (amount: number, supplier: string, invoiceNumber: string) => string
  paymentFailed: (reason: string, amount: number, reference?: string) => string
  invoicePaidInFull: (invoiceNumber: string, payerName: string) => string
  receiptGenerated: (receiptNumber: string, amount: number) => string
  // Purchase Order specific methods
  purchaseOrderCreated: (orderNumber: string, supplier: string, amount: number) => string
  purchaseOrderUpdated: (orderNumber: string, changes: string) => string
  purchaseOrderApproved: (orderNumber: string, approver: string) => string
  purchaseOrderShipped: (orderNumber: string, trackingNumber?: string) => string
  purchaseOrderReceived: (orderNumber: string, itemsCount: number) => string
  purchaseOrderCancelled: (orderNumber: string, reason?: string) => string
  itemAddedToOrder: (itemName: string, quantity: number, orderNumber: string) => string
  itemRemovedFromOrder: (itemName: string, orderNumber: string) => string
  supplierNotified: (orderNumber: string, supplier: string, method: "email" | "phone" | "portal") => string
  // Client Order specific methods
  clientOrderCreated: (orderNumber: string, customer: string, amount: number) => string
  clientOrderUpdated: (orderNumber: string, changes: string) => string
  clientOrderShipped: (orderNumber: string, customer: string) => string
  clientOrderDelivered: (orderNumber: string, customer: string) => string
  clientOrderCancelled: (orderNumber: string, reason?: string) => string
  advancePaymentReceived: (orderNumber: string, amount: number, customer: string) => string
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const severityByType: Record<NotificationData["type"], NonNullable<NotificationData["severity"]>> = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
}

function safeReadBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback

  try {
    const storedValue = window.localStorage.getItem(key)
    return storedValue === null ? fallback : JSON.parse(storedValue)
  } catch {
    return fallback
  }
}

function safeWriteBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sound preference persistence is non-critical.
  }
}

function createCorrelationId() {
  return `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
  maxNotifications?: number
  defaultSoundEnabled?: boolean
}

export function NotificationProvider({
  children,
  maxNotifications = 5,
  defaultSoundEnabled = true
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [soundEnabled, setSoundEnabled] = useState(defaultSoundEnabled)
  const notificationCounter = useRef(0)
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.readAt).length, [notifications])

  // Load sound preference from localStorage
  useEffect(() => {
    setSoundEnabled(safeReadBoolean("notification-sound-enabled", defaultSoundEnabled))
  }, [defaultSoundEnabled])

  // Save sound preference to localStorage
  useEffect(() => {
    safeWriteBoolean("notification-sound-enabled", soundEnabled)
  }, [soundEnabled])

  const addNotification = useCallback((notification: Omit<NotificationData, "id"> & { id?: string }) => {
    const id = notification.id || `notification-${Date.now()}-${++notificationCounter.current}`
    const { id: _notificationId, ...notificationData } = notification
    const newNotification: NotificationData = {
      id,
      sound: true,
      duration: 5000,
      priority: "normal",
      category: "general",
      severity: severityByType[notification.type],
      deliveryState: "delivered",
      channel: "in_app",
      createdAt: new Date().toISOString(),
      correlationId: createCorrelationId(),
      ...notificationData,
    }

    setNotifications((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== id)
      const updated = [...withoutDuplicate, newNotification]
      // Keep only the most recent notifications
      if (updated.length > maxNotifications) {
        return updated.slice(-maxNotifications)
      }
      return updated
    })

    return id
  }, [maxNotifications])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const markAsRead = useCallback((id: string) => {
    const readAt = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              readAt: notification.readAt || readAt,
              deliveryState: "read",
            }
          : notification
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    const readAt = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        readAt: notification.readAt || readAt,
        deliveryState: notification.deliveryState === "dismissed" ? notification.deliveryState : "read",
      }))
    )
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev)
  }, [])

  // Convenience methods for different notification types
  const success = useCallback(
    (title: string, message: string, options?: Partial<NotificationData>) => {
      return addNotification({
        type: "success",
        title,
        message,
        priority: "normal",
        category: "general",
        ...options
      })
    },
    [addNotification],
  )

  const error = useCallback(
    (title: string, message: string, options?: Partial<NotificationData>) => {
      return addNotification({
        type: "error",
        title,
        message,
        priority: "high",
        category: "error",
        duration: 8000, // Errors stay longer
        ...options
      })
    },
    [addNotification],
  )

  const warning = useCallback(
    (title: string, message: string, options?: Partial<NotificationData>) => {
      return addNotification({
        type: "warning",
        title,
        message,
        priority: "normal",
        category: "warning",
        duration: 6000,
        ...options
      })
    },
    [addNotification],
  )

  const info = useCallback(
    (title: string, message: string, options?: Partial<NotificationData>) => {
      return addNotification({
        type: "info",
        title,
        message,
        priority: "low",
        category: "info",
        ...options
      })
    },
    [addNotification],
  )

  // Enhanced methods for forms and operations
  const formSuccess = useCallback(
    (operation: string, details?: string) => {
      return success(
        `${operation} Successful`,
        details || `${operation} has been completed successfully`,
        {
          category: "form",
          action: {
            label: "View Details",
            onClick: () => console.log(`${operation} completed`)
          }
        }
      )
    },
    [success]
  )

  const formError = useCallback(
    (operation: string, error: string, details?: string) => {
      return addNotification({
        type: "error",
        title: `${operation} Failed`,
        message: details || error,
        priority: "high",
        category: "form",
        duration: 10000,
        action: {
          label: "Try Again",
          onClick: () => console.log(`Retry ${operation}`)
        }
      })
    },
    [addNotification]
  )

  const operationStart = useCallback(
    (operation: string) => {
      return info(
        `${operation} Started`,
        `${operation} is now in progress...`,
        {
          category: "operation",
          duration: 3000,
          showProgress: true
        }
      )
    },
    [info]
  )

  const operationComplete = useCallback(
    (operation: string, result?: string) => {
      return success(
        `${operation} Complete`,
        result || `${operation} has been completed successfully`,
        {
          category: "operation",
          priority: "normal"
        }
      )
    },
    [success]
  )

  const cashOperation = useCallback(
    (type: "add" | "remove", amount: number, drawer: string) => {
      const operation = type === "add" ? "Cash Added" : "Cash Removed"
      const actionText = type === "add" ? "added to" : "removed from"

      return success(
        operation,
        `$${amount.toFixed(2)} has been ${actionText} ${drawer}`,
        {
          category: "cash",
          priority: "normal",
          action: {
            label: "View Transaction",
            onClick: () => console.log(`View cash ${type} transaction`)
          }
        }
      )
    },
    [success]
  )

  const reconciliationResult = useCallback(
    (variance: number, drawer: string) => {
      if (variance === 0) {
        return success(
          "Perfect Reconciliation",
          `${drawer} has been reconciled with no variance`,
          {
            category: "reconciliation",
            priority: "normal"
          }
        )
      } else if (Math.abs(variance) <= 10) {
        return warning(
          "Minor Variance Detected",
          `${drawer} has a variance of $${Math.abs(variance).toFixed(2)} ${variance > 0 ? "(overage)" : "(shortage)"}`,
          {
            category: "reconciliation",
            priority: "normal",
            action: {
              label: "Review Details",
              onClick: () => console.log("Review reconciliation details")
            }
          }
        )
      } else {
        return error(
          "Significant Variance",
          `${drawer} has a ${variance > 0 ? "overage" : "shortage"} of $${Math.abs(variance).toFixed(2)}`,
          {
            category: "reconciliation",
            priority: "high",
            action: {
              label: "Investigate",
              onClick: () => console.log("Investigate variance")
            }
          }
        )
      }
    },
    [success, warning, error]
  )

  // Payment-specific notification methods
  const paymentReceived = useCallback(
    (amount: number, customer: string, invoiceNumber: string) => {
      return success(
        "Payment Received",
        `$${amount.toFixed(2)} received from ${customer} for invoice ${invoiceNumber}`,
        {
          category: "payment",
          priority: "normal",
          action: {
            label: "View Receipt",
            onClick: () => console.log(`View receipt for payment from ${customer}`)
          }
        }
      )
    },
    [success]
  )

  const paymentMade = useCallback(
    (amount: number, supplier: string, invoiceNumber: string) => {
      return success(
        "Payment Processed",
        `$${amount.toFixed(2)} paid to ${supplier} for invoice ${invoiceNumber}`,
        {
          category: "payment",
          priority: "normal",
          action: {
            label: "View Receipt",
            onClick: () => console.log(`View receipt for payment to ${supplier}`)
          }
        }
      )
    },
    [success]
  )

  const paymentFailed = useCallback(
    (reason: string, amount: number, reference?: string) => {
      return error(
        "Payment Failed",
        `Payment of $${amount.toFixed(2)} failed: ${reason}${reference ? ` (Ref: ${reference})` : ''}`,
        {
          category: "payment",
          priority: "high",
          duration: 10000,
          action: {
            label: "Retry Payment",
            onClick: () => console.log("Retry payment process")
          }
        }
      )
    },
    [error]
  )

  const invoicePaidInFull = useCallback(
    (invoiceNumber: string, payerName: string) => {
      return success(
        "Invoice Paid in Full",
        `Invoice ${invoiceNumber} has been fully paid by ${payerName}`,
        {
          category: "payment",
          priority: "normal",
          action: {
            label: "View Invoice",
            onClick: () => console.log(`View invoice ${invoiceNumber}`)
          }
        }
      )
    },
    [success]
  )

  const receiptGenerated = useCallback(
    (receiptNumber: string, amount: number) => {
      return info(
        "Receipt Generated",
        `Payment receipt ${receiptNumber} for $${amount.toFixed(2)} has been created`,
        {
          category: "receipt",
          priority: "low",
          duration: 4000,
          action: {
            label: "View Receipt",
            onClick: () => console.log(`View receipt ${receiptNumber}`)
          }
        }
      )
    },
    [info]
  )

  // Purchase Order specific notification methods
  const purchaseOrderCreated = useCallback(
    (orderNumber: string, supplier: string, amount: number) => {
      return success(
        "Purchase Order Created",
        `Order ${orderNumber} for ${supplier} worth $${amount.toFixed(2)} has been created`,
        {
          category: "purchase_order",
          priority: "normal",
          action: {
            label: "View Order",
            onClick: () => console.log(`View purchase order ${orderNumber}`)
          }
        }
      )
    },
    [success]
  )

  const purchaseOrderUpdated = useCallback(
    (orderNumber: string, changes: string) => {
      return success(
        "Purchase Order Updated",
        `Order ${orderNumber} has been updated. Changes: ${changes}`,
        {
          category: "purchase_order",
          priority: "normal",
          action: {
            label: "View Changes",
            onClick: () => console.log(`View changes for ${orderNumber}`)
          }
        }
      )
    },
    [success]
  )

  const purchaseOrderApproved = useCallback(
    (orderNumber: string, approver: string) => {
      return success(
        "Purchase Order Approved",
        `Order ${orderNumber} has been approved by ${approver}`,
        {
          category: "purchase_order",
          priority: "high",
          action: {
            label: "View Order",
            onClick: () => console.log(`View approved order ${orderNumber}`)
          }
        }
      )
    },
    [success]
  )

  const purchaseOrderShipped = useCallback(
    (orderNumber: string, trackingNumber?: string) => {
      const message = trackingNumber
        ? `Order ${orderNumber} has been shipped with tracking number ${trackingNumber}`
        : `Order ${orderNumber} has been shipped`

      return info(
        "Purchase Order Shipped",
        message,
        {
          category: "purchase_order",
          priority: "normal",
          action: {
            label: trackingNumber ? "Track Package" : "View Order",
            onClick: () => console.log(`Track shipment for ${orderNumber}`)
          }
        }
      )
    },
    [info]
  )

  const purchaseOrderReceived = useCallback(
    (orderNumber: string, itemsCount: number) => {
      return success(
        "Purchase Order Received",
        `Order ${orderNumber} has been fully received with ${itemsCount} items`,
        {
          category: "purchase_order",
          priority: "normal",
          action: {
            label: "View Receipt",
            onClick: () => console.log(`View receipt for ${orderNumber}`)
          }
        }
      )
    },
    [success]
  )

  const purchaseOrderCancelled = useCallback(
    (orderNumber: string, reason?: string) => {
      const message = reason
        ? `Order ${orderNumber} has been cancelled. Reason: ${reason}`
        : `Order ${orderNumber} has been cancelled`

      return warning(
        "Purchase Order Cancelled",
        message,
        {
          category: "purchase_order",
          priority: "high",
          duration: 8000,
          action: {
            label: "View Details",
            onClick: () => console.log(`View cancellation details for ${orderNumber}`)
          }
        }
      )
    },
    [warning]
  )

  const itemAddedToOrder = useCallback(
    (itemName: string, quantity: number, orderNumber: string) => {
      return success(
        "Item Added to Order",
        `${quantity} units of ${itemName} added to order ${orderNumber}`,
        {
          category: "purchase_order",
          priority: "low",
          duration: 4000,
          action: {
            label: "View Order",
            onClick: () => console.log(`View order ${orderNumber}`)
          }
        }
      )
    },
    [success]
  )

  const itemRemovedFromOrder = useCallback(
    (itemName: string, orderNumber: string) => {
      return info(
        "Item Removed from Order",
        `${itemName} has been removed from order ${orderNumber}`,
        {
          category: "purchase_order",
          priority: "low",
          duration: 4000,
          action: {
            label: "View Order",
            onClick: () => console.log(`View order ${orderNumber}`)
          }
        }
      )
    },
    [info]
  )

  const supplierNotified = useCallback(
    (orderNumber: string, supplier: string, method: "email" | "phone" | "portal") => {
      const methodText = method === "email" ? "email" : method === "phone" ? "phone call" : "supplier portal"

      return info(
        "Supplier Notified",
        `${supplier} has been notified about order ${orderNumber} via ${methodText}`,
        {
          category: "purchase_order",
          priority: "low",
          duration: 4000,
          action: {
            label: "View Communication Log",
            onClick: () => console.log(`View communication log for ${supplier}`)
          }
        }
      )
    },
    [info]
  )

  // Client Order specific notification methods
  const clientOrderCreated = useCallback(
    (orderNumber: string, customer: string, amount: number) => {
      return success(
        "Client Order Created",
        `Order ${orderNumber} for ${customer} worth $${amount.toFixed(2)} has been created successfully`,
        {
          category: "client_order",
          priority: "normal",
          duration: 6000,
          action: {
            label: "View Order",
            onClick: () => console.log(`View client order ${orderNumber}`)
          }
        }
      )
    },
    [success]
  )

  const clientOrderUpdated = useCallback(
    (orderNumber: string, changes: string) => {
      return success(
        "Client Order Updated",
        `Order ${orderNumber} has been updated. Changes: ${changes}`,
        {
          category: "client_order",
          priority: "normal",
          action: {
            label: "View Changes",
            onClick: () => console.log(`View changes for ${orderNumber}`)
          }
        }
      )
    },
    [success]
  )

  const clientOrderShipped = useCallback(
    (orderNumber: string, customer: string) => {
      return info(
        "Client Order Shipped",
        `Order ${orderNumber} for ${customer} has been shipped and is on the way`,
        {
          category: "client_order",
          priority: "normal",
          action: {
            label: "Track Order",
            onClick: () => console.log(`Track order ${orderNumber}`)
          }
        }
      )
    },
    [info]
  )

  const clientOrderDelivered = useCallback(
    (orderNumber: string, customer: string) => {
      return success(
        "Client Order Delivered",
        `Order ${orderNumber} has been successfully delivered to ${customer}`,
        {
          category: "client_order",
          priority: "normal",
          action: {
            label: "View Receipt",
            onClick: () => console.log(`View delivery receipt for ${orderNumber}`)
          }
        }
      )
    },
    [success]
  )

  const clientOrderCancelled = useCallback(
    (orderNumber: string, reason?: string) => {
      const message = reason
        ? `Order ${orderNumber} has been cancelled. Reason: ${reason}`
        : `Order ${orderNumber} has been cancelled`

      return warning(
        "Client Order Cancelled",
        message,
        {
          category: "client_order",
          priority: "high",
          duration: 8000,
          action: {
            label: "View Details",
            onClick: () => console.log(`View cancellation details for ${orderNumber}`)
          }
        }
      )
    },
    [warning]
  )

  const advancePaymentReceived = useCallback(
    (orderNumber: string, amount: number, customer: string) => {
      return success(
        "Advance Payment Received",
        `Advance payment of $${amount.toFixed(2)} received from ${customer} for order ${orderNumber}`,
        {
          category: "payment",
          priority: "normal",
          action: {
            label: "View Receipt",
            onClick: () => console.log(`View advance payment receipt for ${orderNumber}`)
          }
        }
      )
    },
    [success]
  )

  useEffect(() => {
    const integration = setupErrorNotificationIntegration({
      success,
      error,
      warning,
      info,
      formSuccess,
      formError,
      operationStart,
      operationComplete,
    })

    return () => {
      integration.teardown()
    }
  }, [
    success,
    error,
    warning,
    info,
    formSuccess,
    formError,
    operationStart,
    operationComplete,
  ])

  useEffect(() => {
    const handleMutationNotification = (event: Event) => {
      const notification = (event as CustomEvent<CrudMutationNotification>).detail

      if (!notification) {
        return
      }

      const options: Partial<NotificationData> = {
        category: notification.category,
        priority: notification.priority,
        duration: notification.duration,
        sound: notification.type === "error" && notification.priority === "high",
      }

      switch (notification.type) {
        case "success":
          success(notification.title, notification.message, options)
          break
        case "warning":
          warning(notification.title, notification.message, options)
          break
        case "info":
          info(notification.title, notification.message, options)
          break
        case "error":
        default:
          error(notification.title, notification.message, options)
          break
      }
    }

    window.addEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, handleMutationNotification)

    return () => {
      window.removeEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, handleMutationNotification)
    }
  }, [success, error, warning, info])

  useEffect(() => {
    const handleProviderNotification = (event: Event) => {
      const detail = (event as CustomEvent<ProviderNotificationEventDetail>).detail

      if (!detail) {
        return
      }

      if (detail.action === "dismiss") {
        if (detail.id) {
          removeNotification(detail.id)
        }
        return
      }

      if (detail.action === "clear") {
        clearAll()
        return
      }

      addNotification(detail.notification)
    }

    window.addEventListener(PROVIDER_NOTIFICATION_EVENT, handleProviderNotification)

    return () => {
      window.removeEventListener(PROVIDER_NOTIFICATION_EVENT, handleProviderNotification)
    }
  }, [addNotification, removeNotification, clearAll])

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    soundEnabled,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    toggleSound,
    success,
    error,
    warning,
    info,
    formSuccess,
    formError,
    operationStart,
    operationComplete,
    cashOperation,
    reconciliationResult,
    paymentReceived,
    paymentMade,
    paymentFailed,
    invoicePaidInFull,
    receiptGenerated,
    purchaseOrderCreated,
    purchaseOrderUpdated,
    purchaseOrderApproved,
    purchaseOrderShipped,
    purchaseOrderReceived,
    purchaseOrderCancelled,
    itemAddedToOrder,
    itemRemovedFromOrder,
    supplierNotified,
    clientOrderCreated,
    clientOrderUpdated,
    clientOrderShipped,
    clientOrderDelivered,
    clientOrderCancelled,
    advancePaymentReceived,
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
        onMarkRead={markAsRead}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        unreadCount={unreadCount}
      />
    </NotificationContext.Provider>
  )
}
