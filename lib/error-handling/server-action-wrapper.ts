/**
 * Server Action Wrapper for Enterprise Error Handling
 *
 * Provides a consistent wrapper for Next.js server actions with automatic
 * error handling, categorization, and integration with the notification system.
 */

import {
  ErrorContext,
  ErrorHandlingOptions,
  ServerActionResult,
  RecoveryStrategy
} from './types'
import { errorHandler } from './error-handler'

/**
 * Wrapper configuration for server actions
 */
interface ServerActionWrapperConfig {
  // Action identification
  actionName: string
  component?: string

  // Error handling preferences
  autoRetry?: boolean
  maxRetries?: number
  retryDelay?: number

  // Notification preferences
  notifyUser?: boolean
  notifyAdmin?: boolean

  // Logging preferences
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  includeStackTrace?: boolean

  // Context information
  organizationId?: string
  userId?: string
  sessionId?: string

  // Business context
  businessContext?: Record<string, unknown>
  affectedResources?: string[]

  // Custom error messages
  customUserMessages?: Record<string, string>

  // Recovery options
  fallbackAction?: () => Promise<any>
}

function isNextControlFlowError(error: unknown): boolean {
  const digest = typeof error === 'object' && error !== null && 'digest' in error
    ? String((error as { digest?: unknown }).digest)
    : ''

  return digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND'
}

function isStructuredActionError(error: unknown): error is NonNullable<ServerActionResult['error']> {
  return typeof error === 'object' && error !== null && 'code' in error && 'userMessage' in error
}

function normalizeActionError(error: unknown, requestId: string): NonNullable<ServerActionResult['error']> {
  if (isStructuredActionError(error)) {
    return error
  }

  const message = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : 'The operation could not be completed.'

  const errorData = errorHandler.createError({
    requestId,
    code: 'ACTION_REPORTED_ERROR',
    message,
    userMessage: message,
    context: ErrorContext.SERVER_ACTION
  })

  return errorHandler.toServerActionError(errorData)
}

/**
 * Wraps a server action with comprehensive error handling
 */
export function withErrorHandling<TInput = unknown, TOutput = unknown>(
  action: (input: TInput) => Promise<ServerActionResult<TOutput>>,
  config: ServerActionWrapperConfig
) {
  return async (input: TInput): Promise<ServerActionResult<TOutput>> => {
    const startTime = Date.now()
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Log action start for debugging
      if (config.logLevel === 'debug') {
        console.log(`[${requestId}] Starting action: ${config.actionName}`, {
          input: typeof input === 'object' ? Object.keys(input as object) : typeof input,
          userId: config.userId,
          organizationId: config.organizationId
        })
      }

      // Execute the actual action
      const result = await action(input)

      // Log successful completion
      const duration = Date.now() - startTime
      if (config.logLevel === 'debug') {
        console.log(`[${requestId}] Action completed: ${config.actionName}`, {
          success: result.success,
          duration: `${duration}ms`
        })
      }

      // Return successful result with metadata
      if (result.success) {
        return {
          ...result,
          metadata: {
            timestamp: new Date(),
            requestId,
            duration
          }
        }
      }

      // Handle action-reported errors
      if (result.error) {
        const actionError = normalizeActionError(result.error, requestId)
        const errorData = errorHandler.createError({
          code: actionError.code,
          message: actionError.message,
          userMessage: actionError.userMessage,
          category: actionError.category,
          severity: actionError.severity,
          context: ErrorContext.SERVER_ACTION,
          component: config.component,
          action: config.actionName,
          organizationId: config.organizationId,
          userId: config.userId,
          sessionId: config.sessionId,
          requestId,
          businessContext: config.businessContext,
          affectedResources: config.affectedResources,
          recoveryStrategy: actionError.recoverable
            ? (actionError.retryable ? RecoveryStrategy.RETRY : RecoveryStrategy.USER_ACTION)
            : RecoveryStrategy.NONE,
          metadata: {
            duration,
            actionInput: config.logLevel === 'debug' ? input : undefined
          }
        })

        // Handle the error through the error system
        await errorHandler.handle(errorData, {
          logLevel: config.logLevel,
          notifyUser: config.notifyUser,
          notifyAdmin: config.notifyAdmin,
          includeStackTrace: config.includeStackTrace,
          autoRetry: config.autoRetry,
          maxRetries: config.maxRetries,
          fallbackAction: config.fallbackAction
        })

        return {
          ...result,
          error: errorHandler.toServerActionError(errorData),
          metadata: {
            timestamp: new Date(),
            requestId,
            duration
          }
        }
      }

      return result

    } catch (error) {
      if (isNextControlFlowError(error)) {
        throw error
      }

      const duration = Date.now() - startTime

      // Create enhanced error data
      const errorData = errorHandler.createErrorFromException(error as Error, {
        context: ErrorContext.SERVER_ACTION,
        component: config.component,
        action: config.actionName,
        organizationId: config.organizationId,
        userId: config.userId,
        sessionId: config.sessionId,
        requestId,
        businessContext: config.businessContext,
        affectedResources: config.affectedResources,
        includeStackTrace: config.includeStackTrace,
        metadata: {
          duration,
          actionName: config.actionName,
          actionInput: config.logLevel === 'debug' ? input : undefined
        }
      })

      if (config.customUserMessages?.[errorData.category]) {
        errorData.userMessage = config.customUserMessages[errorData.category]
      }

      // Handle the error through the centralized system
      const handlingResult = await errorHandler.handle(
        errorData,
        {
          logLevel: config.logLevel,
          notifyUser: config.notifyUser,
          notifyAdmin: config.notifyAdmin,
          includeStackTrace: config.includeStackTrace,
          autoRetry: config.autoRetry,
          maxRetries: config.maxRetries,
          fallbackAction: config.fallbackAction,
          includeUserContext: true,
          includeBrowserInfo: false
        }
      )

      // Return structured, client-safe error response
      return {
        success: false,
        error: {
          ...errorHandler.toServerActionError(errorData),
          context: {
            ...errorHandler.toServerActionError(errorData).context,
            handled: handlingResult.handled
          }
        },
        metadata: {
          timestamp: new Date(),
          requestId,
          duration
        }
      }
    }
  }
}

/**
 * Creates a configured wrapper function for common StockFlow actions
 */
export function createStockFlowActionWrapper(baseConfig: Partial<ServerActionWrapperConfig> = {}) {
  return function<TInput = unknown, TOutput = unknown>(
    action: (input: TInput) => Promise<ServerActionResult<TOutput>>,
    actionConfig: ServerActionWrapperConfig
  ) {
    const mergedConfig = {
      // Default StockFlow settings
      logLevel: 'warn' as const,
      includeStackTrace: process.env.NODE_ENV === 'development',
      notifyUser: true,
      notifyAdmin: false,
      autoRetry: false,
      maxRetries: 3,

      // Base config overrides
      ...baseConfig,

      // Action-specific config
      ...actionConfig
    }

    return withErrorHandling(action, mergedConfig)
  }
}

/**
 * Get user-friendly message for error category
 */
function getUserMessageForCategory(category: string): string {
  const messages: Record<string, string> = {
    'validation': 'Please check your input and try again.',
    'business_rule': 'This operation violates a business rule. Please check your data.',
    'authorization': "You don't have permission to perform this action.",
    'authentication': 'Please log in again to continue.',
    'database': 'We are experiencing temporary technical difficulties. Please try again in a moment.',
    'network': 'Network connectivity issue. Please check your connection and try again.',
    'inventory': 'There was an issue with inventory management. Please try again.',
    'sales': 'There was an issue processing your sale. Please try again.',
    'pos': 'There was an issue with the POS system. Please contact support if this continues.',
    'financial': 'There was an issue with financial calculations. Please contact support.',
    'system': 'A system error occurred. Our team has been notified.'
  }

  return messages[category] || 'An unexpected error occurred. Please try again or contact support.'
}

/**
 * Determine if an error category indicates a recoverable error
 */
function isRecoverable(category: string): boolean {
  const recoverableCategories = [
    'validation',
    'user_input',
    'form_validation',
    'business_rule',
    'network',
    'external_service'
  ]

  return recoverableCategories.includes(category)
}

// Pre-configured wrapper for common StockFlow operations
export const stockFlowAction = createStockFlowActionWrapper({
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  includeStackTrace: process.env.NODE_ENV === 'development',
  notifyUser: true,
  notifyAdmin: process.env.NODE_ENV === 'production'
})

/**
 * Specific wrapper configurations for different types of StockFlow actions
 */

// Inventory operations
export const inventoryAction = createStockFlowActionWrapper({
  logLevel: 'warn',
  notifyUser: true,
  notifyAdmin: true, // Inventory errors are business critical
  affectedResources: ['inventory'],
  businessContext: { domain: 'inventory' }
})

// Sales operations
export const salesAction = createStockFlowActionWrapper({
  logLevel: 'warn',
  notifyUser: true,
  notifyAdmin: true, // Sales errors impact revenue
  affectedResources: ['sales', 'customers'],
  businessContext: { domain: 'sales' }
})

// Financial operations
export const financialAction = createStockFlowActionWrapper({
  logLevel: 'error',
  notifyUser: true,
  notifyAdmin: true,
  autoRetry: false, // Never auto-retry financial operations
  includeStackTrace: true,
  affectedResources: ['finances'],
  businessContext: { domain: 'financial', criticalOperation: true }
})

// POS operations
export const posAction = createStockFlowActionWrapper({
  logLevel: 'warn',
  notifyUser: true,
  notifyAdmin: false,
  autoRetry: true,
  maxRetries: 2,
  affectedResources: ['pos', 'sales'],
  businessContext: { domain: 'pos', realTime: true }
})
