/**
 * Integration between the ErrorHandler and StockFlow's notification system
 *
 * This module bridges the enterprise error handling system with the existing
 * NotificationProvider to provide seamless user notifications.
 */

import { ErrorData, ErrorCategory, ErrorSeverity, ErrorHandlingOptions } from './types'
import { errorHandler } from './error-handler'
import type { NotificationCategory, NotificationData } from '@/components/notifications/NotificationSystem'

interface NotificationMethods {
  success: (title: string, message: string, options?: Partial<NotificationData>) => string
  error: (title: string, message: string, options?: Partial<NotificationData>) => string
  warning: (title: string, message: string, options?: Partial<NotificationData>) => string
  info: (title: string, message: string, options?: Partial<NotificationData>) => string
  formSuccess: (operation: string, details?: string) => string
  formError: (operation: string, error: string, details?: string) => string
  operationStart: (operation: string) => string
  operationComplete: (operation: string, result?: string) => string
}

/**
 * Maps ErrorSeverity to notification priority and type
 */
function mapSeverityToNotification(severity: ErrorSeverity): {
  type: NotificationData['type']
  priority: NotificationData['priority']
  duration: number
} {
  switch (severity) {
    case ErrorSeverity.LOW:
      return {
        type: 'info',
        priority: 'low',
        duration: 4000
      }
    case ErrorSeverity.MEDIUM:
      return {
        type: 'warning',
        priority: 'normal',
        duration: 6000
      }
    case ErrorSeverity.HIGH:
      return {
        type: 'error',
        priority: 'high',
        duration: 8000
      }
    case ErrorSeverity.CRITICAL:
      return {
        type: 'error',
        priority: 'high',
        duration: 12000
      }
  }
}

/**
 * Maps ErrorCategory to notification category and icon suggestions
 */
function mapCategoryToNotification(category: ErrorCategory): {
  category: NotificationCategory
  icon?: string
  titlePrefix?: string
} {
  switch (category) {
    case ErrorCategory.VALIDATION:
    case ErrorCategory.FORM_VALIDATION:
    case ErrorCategory.USER_INPUT:
      return {
        category: 'form',
        titlePrefix: 'Input Error'
      }

    case ErrorCategory.BUSINESS_RULE:
      return {
        category: 'business',
        titlePrefix: 'Business Rule Violation'
      }

    case ErrorCategory.AUTHORIZATION:
    case ErrorCategory.AUTHENTICATION:
      return {
        category: 'security',
        titlePrefix: 'Access Error'
      }

    case ErrorCategory.DATABASE:
    case ErrorCategory.SYSTEM:
      return {
        category: 'system',
        titlePrefix: 'System Error'
      }

    case ErrorCategory.NETWORK:
    case ErrorCategory.EXTERNAL_SERVICE:
      return {
        category: 'network',
        titlePrefix: 'Connection Error'
      }

    case ErrorCategory.INVENTORY:
      return {
        category: 'inventory',
        titlePrefix: 'Inventory Error'
      }

    case ErrorCategory.SALES:
      return {
        category: 'sales',
        titlePrefix: 'Sales Error'
      }

    case ErrorCategory.POS:
      return {
        category: 'pos',
        titlePrefix: 'POS Error'
      }

    case ErrorCategory.FINANCIAL:
      return {
        category: 'financial',
        titlePrefix: 'Financial Error'
      }

    case ErrorCategory.PURCHASE:
      return {
        category: 'purchase_order',
        titlePrefix: 'Purchase Error'
      }

    case ErrorCategory.REPORTING:
      return {
        category: 'reporting',
        titlePrefix: 'Report Error'
      }

    default:
      return {
        category: 'general',
        titlePrefix: 'Error'
      }
  }
}

/**
 * Creates notification callback for ErrorHandler integration
 */
export function createNotificationCallback(
  notifications: NotificationMethods
): (errorData: ErrorData, options: ErrorHandlingOptions) => Promise<void> {
  return async (errorData: ErrorData, options: ErrorHandlingOptions) => {
    try {
      const severityMapping = mapSeverityToNotification(errorData.severity)
      const categoryMapping = mapCategoryToNotification(errorData.category)

      // Determine the notification title
      const title = categoryMapping.titlePrefix || 'Error Occurred'

      // Use user message for better UX
      const message = errorData.userMessage || errorData.message

      // Create action if recovery is possible
      let action: NotificationData['action'] | undefined

      if (errorData.recoveryStrategy === 'retry' && (errorData.recoveryAttempts || 0) < 3) {
        action = {
          label: 'Retry',
          onClick: () => {
            // In a real implementation, this would retry the original action
            console.log(`Retrying action: ${errorData.action}`)
          }
        }
      } else if (errorData.recoveryStrategy === 'user_action') {
        action = {
          label: 'Help',
          onClick: () => {
            // In a real implementation, this would show help or guidance
            console.log(`Show help for: ${errorData.category}`)
          }
        }
      }

      // Create the notification based on notification type preference
      const notificationOptions: Partial<NotificationData> = {
        priority: severityMapping.priority,
        category: categoryMapping.category,
        duration: severityMapping.duration,
        sound: errorData.severity === ErrorSeverity.HIGH || errorData.severity === ErrorSeverity.CRITICAL,
        action
      }

      // Choose the appropriate notification method
      let notificationId: string

      if (options.notificationChannel === 'modal') {
        // For modal notifications, use high-priority error method
        notificationId = notifications.error(title, message, {
          ...notificationOptions,
          priority: 'high',
          duration: 0 // Persistent for modals
        })
      } else {
        // Use standard notification methods based on severity
        switch (severityMapping.type) {
          case 'success':
            notificationId = notifications.success(title, message, notificationOptions)
            break
          case 'warning':
            notificationId = notifications.warning(title, message, notificationOptions)
            break
          case 'error':
            notificationId = notifications.error(title, message, notificationOptions)
            break
          case 'info':
          default:
            notificationId = notifications.info(title, message, notificationOptions)
            break
        }
      }

      // For form-specific errors, use the specialized form methods
      if (errorData.context === 'server_action' && errorData.category === ErrorCategory.FORM_VALIDATION) {
        const operation = errorData.action || 'Operation'
        notifications.formError(operation, errorData.message, errorData.userMessage)
      }

      // For operation tracking
      if (errorData.context === 'server_action' && errorData.action) {
        if (errorData.severity === ErrorSeverity.LOW) {
          notifications.operationComplete(errorData.action, 'Completed with warnings')
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`Notification created: ${notificationId} for error: ${errorData.id}`)
      }

    } catch (notificationError) {
      // Don't let notification failures break the error handling flow
      console.error('Failed to create notification for error:', {
        errorId: errorData.id,
        notificationError: notificationError instanceof Error ? notificationError.message : String(notificationError)
      })
    }
  }
}

/**
 * Enhanced notification methods for specific StockFlow business operations
 */
export const stockFlowNotifications = {
  /**
   * Inventory-specific notifications
   */
  inventory: {
    insufficientStock: (notifications: NotificationMethods, itemName: string, requested: number, available: number) => {
      return notifications.error(
        'Insufficient Stock',
        `Cannot process ${requested} units of ${itemName}. Only ${available} available.`,
        {
          category: 'inventory',
          priority: 'high',
          action: {
            label: 'Check Inventory',
            onClick: () => console.log(`Navigate to inventory for ${itemName}`)
          }
        }
      )
    },

    stockAdjusted: (notifications: NotificationMethods, itemName: string, adjustment: number, location: string) => {
      const type = adjustment > 0 ? 'increased' : 'decreased'
      return notifications.success(
        'Stock Updated',
        `${itemName} stock ${type} by ${Math.abs(adjustment)} units at ${location}`,
        {
          category: 'inventory',
          priority: 'normal'
        }
      )
    },

    lowStockAlert: (notifications: NotificationMethods, itemName: string, currentLevel: number, minLevel: number) => {
      return notifications.warning(
        'Low Stock Alert',
        `${itemName} is running low (${currentLevel} remaining, minimum: ${minLevel})`,
        {
          category: 'inventory',
          priority: 'high',
          action: {
            label: 'Reorder',
            onClick: () => console.log(`Create reorder for ${itemName}`)
          }
        }
      )
    }
  },

  /**
   * Sales-specific notifications
   */
  sales: {
    saleCompleted: (notifications: NotificationMethods, orderNumber: string, total: number) => {
      return notifications.success(
        'Sale Completed',
        `Order ${orderNumber} completed successfully. Total: $${total.toFixed(2)}`,
        {
          category: 'sales',
          priority: 'normal'
        }
      )
    },

    paymentFailed: (notifications: NotificationMethods, orderNumber: string, reason: string) => {
      return notifications.error(
        'Payment Failed',
        `Payment for order ${orderNumber} failed: ${reason}`,
        {
          category: 'sales',
          priority: 'high',
          action: {
            label: 'Retry Payment',
            onClick: () => console.log(`Retry payment for ${orderNumber}`)
          }
        }
      )
    }
  },

  /**
   * POS-specific notifications
   */
  pos: {
    sessionStarted: (notifications: NotificationMethods, terminal: string, cashier: string) => {
      return notifications.success(
        'POS Session Started',
        `${cashier} started session on terminal ${terminal}`,
        {
          category: 'pos',
          priority: 'normal'
        }
      )
    },

    receiptPrintFailed: (notifications: NotificationMethods, orderNumber: string) => {
      return notifications.warning(
        'Receipt Print Failed',
        `Could not print receipt for order ${orderNumber}. Sale was completed successfully.`,
        {
          category: 'pos',
          priority: 'normal',
          action: {
            label: 'Reprint',
            onClick: () => console.log(`Reprint receipt for ${orderNumber}`)
          }
        }
      )
    }
  }
}

/**
 * Setup function to initialize the error handling notification integration
 */
export function setupErrorNotificationIntegration(notifications: NotificationMethods) {
  // Set up the notification callback
  const notificationCallback = createNotificationCallback(notifications)
  errorHandler.setNotificationCallback(notificationCallback)

  if (process.env.NODE_ENV === 'development') {
    console.log('Error handling notification integration initialized')
  }

  return {
    teardown: () => errorHandler.setNotificationCallback(undefined),
    stockFlowNotifications: {
      ...stockFlowNotifications.inventory,
      ...stockFlowNotifications.sales,
      ...stockFlowNotifications.pos
    }
  }
}
