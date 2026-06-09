/**
 * React hooks for error handling integration
 *
 * Provides convenient hooks for client-side error handling,
 * server action integration, and notification management.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useNotifications } from '@/components/notifications/NotificationProvider'
import type { NotificationCategory } from '@/components/notifications/NotificationSystem'
import {
  ErrorData,
  ErrorCategory,
  ErrorSeverity,
  ServerActionResult,
  ErrorHandlingOptions
} from './types'

/**
 * Hook for handling server action errors with automatic notification
 */
export function useServerActionHandler<TData = unknown>() {
  const notifications = useNotifications()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ServerActionResult<TData>['error'] | null>(null)

  const handleAction = useCallback(
    async <TInput = unknown>(
      action: (input: TInput) => Promise<ServerActionResult<TData>>,
      input: TInput,
      options: {
        onSuccess?: (data: TData) => void
        onError?: (error: NonNullable<ServerActionResult<TData>['error']>) => void
        showSuccessNotification?: boolean
        successMessage?: string
        loadingMessage?: string
      } = {}
    ): Promise<ServerActionResult<TData>> => {
      setLoading(true)
      setError(null)

      try {
        // Show loading notification if requested
        let loadingNotificationId: string | undefined
        if (options.loadingMessage) {
          loadingNotificationId = notifications.operationStart(options.loadingMessage)
        }

        const result = await action(input)

        if (result.success) {
          // Clear loading notification
          if (loadingNotificationId) {
            notifications.removeNotification(loadingNotificationId)
          }

          // Show success notification
          if (options.showSuccessNotification !== false) {
            const message = options.successMessage || 'Operation completed successfully'
            notifications.success('Success', message)
          }

          // Call success handler
          if (options.onSuccess) {
            options.onSuccess(result.data!)
          }
        } else if (result.error) {
          // Clear loading notification
          if (loadingNotificationId) {
            notifications.removeNotification(loadingNotificationId)
          }

          setError(result.error)

          // Show error notification using the enhanced error data
          const errorNotification = createErrorNotification(result.error)
          notifications.error(errorNotification.title, errorNotification.message, {
            category: errorNotification.category,
            priority: errorNotification.priority,
            duration: errorNotification.duration,
            action: errorNotification.action
          })

          // Call error handler
          if (options.onError) {
            options.onError(result.error)
          }
        }

        return result
      } catch (actionError) {
        // Handle unexpected errors
        console.error('Server action error:', actionError)

        const errorMessage = actionError instanceof Error
          ? actionError.message
          : 'An unexpected error occurred'

        const unexpectedError = {
          id: `unexpected_${Date.now()}`,
          code: 'UNEXPECTED_ERROR',
          message: errorMessage,
          userMessage: 'An unexpected error occurred. Please try again.',
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.HIGH,
          recoverable: false,
          retryable: true
        }

        setError(unexpectedError)

        notifications.error('Unexpected Error', unexpectedError.userMessage, {
          category: 'error',
          priority: 'high',
          duration: 8000
        })

        return {
          success: false,
          error: unexpectedError
        }
      } finally {
        setLoading(false)
      }
    },
    [notifications]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    handleAction,
    loading,
    error,
    clearError
  }
}

/**
 * Hook for form error handling with field-level validation
 */
export function useFormErrorHandler() {
  const notifications = useNotifications()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleFormError = useCallback(
    (error: ServerActionResult<unknown>['error'], fieldMap?: Record<string, string>) => {
      if (!error) return

      // Clear previous errors
      setFieldErrors({})

      // Show general error notification
      const errorNotification = createErrorNotification(error)
      notifications.error(errorNotification.title, errorNotification.message, {
        category: 'form',
        priority: errorNotification.priority,
        duration: errorNotification.duration
      })

      // Map error to specific fields if possible
      if (fieldMap && error.context) {
        const newFieldErrors: Record<string, string> = {}

        // Check for validation errors that can be mapped to fields
        if (error.category === ErrorCategory.FORM_VALIDATION ||
            error.category === ErrorCategory.VALIDATION) {
          Object.entries(fieldMap).forEach(([field, errorKey]) => {
            if (error.message.toLowerCase().includes(errorKey.toLowerCase()) ||
                error.context?.[errorKey]) {
              newFieldErrors[field] = error.userMessage
            }
          })
        }

        setFieldErrors(newFieldErrors)
      }
    },
    [notifications]
  )

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({})
  }, [])

  const getFieldError = useCallback(
    (fieldName: string) => fieldErrors[fieldName],
    [fieldErrors]
  )

  return {
    handleFormError,
    fieldErrors,
    clearFieldErrors,
    getFieldError,
    hasErrors: Object.keys(fieldErrors).length > 0
  }
}

/**
 * Hook for error recovery and retry logic
 */
export function useErrorRecovery<TInput = unknown, TOutput = unknown>() {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const retry = useCallback(
    async (
      action: (input: TInput) => Promise<ServerActionResult<TOutput>>,
      input: TInput,
      maxRetries: number = 3,
      retryDelay: number = 1000
    ): Promise<ServerActionResult<TOutput>> => {
      if (retryCount >= maxRetries) {
        throw new Error('Maximum retry attempts exceeded')
      }

      setIsRetrying(true)
      setRetryCount(prev => prev + 1)

      try {
        // Wait before retrying (exponential backoff)
        const delay = retryDelay * Math.pow(2, retryCount)
        await new Promise(resolve => setTimeout(resolve, delay))

        const result = await action(input)

        if (result.success) {
          // Reset retry count on success
          setRetryCount(0)
        }

        return result
      } finally {
        setIsRetrying(false)
      }
    },
    [retryCount]
  )

  const canRetry = useCallback(
    (error: ServerActionResult<TOutput>['error'], maxRetries: number = 3) => {
      return error?.retryable && retryCount < maxRetries
    },
    [retryCount]
  )

  const reset = useCallback(() => {
    setRetryCount(0)
    setIsRetrying(false)
  }, [])

  return {
    retry,
    canRetry,
    retryCount,
    isRetrying,
    reset
  }
}

/**
 * Hook for monitoring error patterns and health
 */
export function useErrorMonitoring() {
  const [errorHistory, setErrorHistory] = useState<Array<{
    timestamp: Date
    category: ErrorCategory
    severity: ErrorSeverity
    code: string
  }>>([])

  const recordError = useCallback((error: ServerActionResult<unknown>['error']) => {
    if (!error) return

    setErrorHistory(prev => [
      ...prev,
      {
        timestamp: new Date(),
        category: error.category,
        severity: error.severity,
        code: error.code
      }
    ].slice(-50)) // Keep last 50 errors
  }, [])

  const getErrorStats = useCallback(() => {
    const now = new Date()
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
    const recentErrors = errorHistory.filter(e => e.timestamp > lastHour)

    const byCategory = recentErrors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {} as Record<ErrorCategory, number>)

    const bySeverity = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<ErrorSeverity, number>)

    return {
      totalErrors: recentErrors.length,
      byCategory,
      bySeverity,
      errorRate: recentErrors.length / 60 // errors per minute
    }
  }, [errorHistory])

  return {
    recordError,
    errorHistory,
    getErrorStats
  }
}

/**
 * Helper function to create user-friendly error notifications
 */
function createErrorNotification(error: ServerActionResult<unknown>['error']): {
  title: string
  message: string
  category: NotificationCategory
  priority: 'low' | 'normal' | 'high'
  duration: number
  action?: { label: string; onClick: () => void }
} {
  if (!error) {
    return {
      title: 'Error',
      message: 'An unknown error occurred',
      category: 'error',
      priority: 'normal' as const,
      duration: 5000
    }
  }

  // Map severity to notification properties
  const severityConfig = {
    [ErrorSeverity.LOW]: { priority: 'low' as const, duration: 4000 },
    [ErrorSeverity.MEDIUM]: { priority: 'normal' as const, duration: 6000 },
    [ErrorSeverity.HIGH]: { priority: 'high' as const, duration: 8000 },
    [ErrorSeverity.CRITICAL]: { priority: 'high' as const, duration: 12000 }
  }

  // Map category to title and icon
  const categoryConfig: Record<ErrorCategory, string> = {
    [ErrorCategory.VALIDATION]: 'Validation Error',
    [ErrorCategory.FORM_VALIDATION]: 'Form Error',
    [ErrorCategory.USER_INPUT]: 'Input Error',
    [ErrorCategory.BUSINESS_RULE]: 'Business Rule Violation',
    [ErrorCategory.AUTHORIZATION]: 'Access Denied',
    [ErrorCategory.AUTHENTICATION]: 'Authentication Error',
    [ErrorCategory.DATABASE]: 'System Error',
    [ErrorCategory.NETWORK]: 'Connection Error',
    [ErrorCategory.EXTERNAL_SERVICE]: 'Service Error',
    [ErrorCategory.FILE_SYSTEM]: 'File Error',
    [ErrorCategory.INVENTORY]: 'Inventory Error',
    [ErrorCategory.SALES]: 'Sales Error',
    [ErrorCategory.POS]: 'POS Error',
    [ErrorCategory.FINANCIAL]: 'Financial Error',
    [ErrorCategory.PURCHASE]: 'Purchase Error',
    [ErrorCategory.REPORTING]: 'Report Error',
    [ErrorCategory.SYSTEM]: 'System Error',
    [ErrorCategory.CONFIGURATION]: 'Configuration Error',
    [ErrorCategory.PERFORMANCE]: 'Performance Error'
  }

  const config = severityConfig[error.severity]
  const title = categoryConfig[error.category] || 'Error'

  let action: { label: string; onClick: () => void } | undefined

  // Add action buttons based on error type
  if (error.retryable) {
    action = {
      label: 'Try Again',
      onClick: () => {
        // This would need to be implemented by the consuming component
        console.log(`Retry action for error: ${error.id}`)
      }
    }
  } else if (error.recoverable) {
    action = {
      label: 'Help',
      onClick: () => {
        // This could open documentation or help
        console.log(`Show help for: ${error.category}`)
      }
    }
  }

  return {
    title,
    message: error.userMessage,
    category: getCategoryString(error.category),
    priority: config.priority,
    duration: config.duration,
    action
  }
}

/**
 * Convert ErrorCategory enum to string for notification system
 */
function getCategoryString(category: ErrorCategory): NotificationCategory {
  const mapping: Record<ErrorCategory, NotificationCategory> = {
    [ErrorCategory.VALIDATION]: 'form',
    [ErrorCategory.FORM_VALIDATION]: 'form',
    [ErrorCategory.USER_INPUT]: 'form',
    [ErrorCategory.BUSINESS_RULE]: 'business',
    [ErrorCategory.AUTHORIZATION]: 'security',
    [ErrorCategory.AUTHENTICATION]: 'security',
    [ErrorCategory.DATABASE]: 'system',
    [ErrorCategory.NETWORK]: 'network',
    [ErrorCategory.EXTERNAL_SERVICE]: 'network',
    [ErrorCategory.FILE_SYSTEM]: 'system',
    [ErrorCategory.INVENTORY]: 'inventory',
    [ErrorCategory.SALES]: 'sales',
    [ErrorCategory.POS]: 'pos',
    [ErrorCategory.FINANCIAL]: 'financial',
    [ErrorCategory.PURCHASE]: 'purchase_order',
    [ErrorCategory.REPORTING]: 'reporting',
    [ErrorCategory.SYSTEM]: 'system',
    [ErrorCategory.CONFIGURATION]: 'system',
    [ErrorCategory.PERFORMANCE]: 'system'
  }

  return mapping[category] || 'general'
}
