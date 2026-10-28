/**
 * Error Handling System Setup and Initialization
 *
 * This module provides functions to initialize the enterprise error handling
 * system and integrate it with StockFlow's existing notification infrastructure.
 */

import { errorHandler } from './error-handler'
import { createNotificationCallback } from './notification-integration'
import { ErrorCategory, ErrorConfig, ErrorContext, ErrorData } from './types'

/**
 * Default configuration for StockFlow error handling
 */
const STOCKFLOW_ERROR_CONFIG: Partial<ErrorConfig> = {
  defaultMaxRetries: 3,
  defaultRetryDelay: 1000,
  maxLogRetention: 7, // days
  userNotificationThreshold: 'medium' as any,
  adminNotificationThreshold: 'high' as any,
  logThreshold: 'low' as any,

  // Category-specific configurations for StockFlow
  categoryConfig: {
    'inventory': {
      defaultSeverity: 'medium' as any,
      autoRetry: false, // Inventory changes should not auto-retry
      maxRetries: 1,
      notifyUser: true,
      notifyAdmin: true
    },
    'sales': {
      defaultSeverity: 'high' as any,
      autoRetry: false, // Sales operations should not auto-retry
      maxRetries: 1,
      notifyUser: true,
      notifyAdmin: true
    },
    'financial': {
      defaultSeverity: 'high' as any,
      autoRetry: false, // Never auto-retry financial operations
      maxRetries: 0,
      notifyUser: true,
      notifyAdmin: true
    },
    'pos': {
      defaultSeverity: 'medium' as any,
      autoRetry: true, // POS operations can safely retry
      maxRetries: 3,
      notifyUser: true,
      notifyAdmin: false
    },
    'network': {
      defaultSeverity: 'medium' as any,
      autoRetry: true,
      maxRetries: 3,
      notifyUser: false,
      notifyAdmin: false
    },
    'database': {
      defaultSeverity: 'high' as any,
      autoRetry: true,
      maxRetries: 2,
      notifyUser: false,
      notifyAdmin: true
    }
  }
}

/**
 * Initialize the error handling system
 * This should be called during application startup
 */
export function initializeErrorHandling(customConfig?: Partial<ErrorConfig>): {
  errorHandler: typeof errorHandler
  setupNotifications: (notifications: any) => void
  getMetrics: () => Promise<any>
} {
  // Configure the error handler with StockFlow defaults
  const finalConfig = {
    ...STOCKFLOW_ERROR_CONFIG,
    ...customConfig
  }

  // Update error handler configuration (this is a simplified approach)
  // In a real implementation, you might want to recreate the handler with new config
  if (process.env.NODE_ENV === 'development') {
    console.log('Initializing StockFlow error handling system with config:', finalConfig)
  }

  return {
    errorHandler,
    setupNotifications: (notifications) => {
      const notificationCallback = createNotificationCallback(notifications)
      errorHandler.setNotificationCallback(notificationCallback)
      console.log('Error handling notifications configured')
    },
    getMetrics: errorHandler.getMetrics.bind(errorHandler)
  }
}

/**
 * Error handling middleware for Next.js API routes
 */
export function withErrorHandlingMiddleware(handler: any) {
  return async (req: any, res: any) => {
    try {
      return await handler(req, res)
    } catch (error) {
      console.error('API Route error:', error)

      // Handle the error through the centralized system
      const result = await errorHandler.handle(error as Error, {
        includeStackTrace: process.env.NODE_ENV === 'development',
        notifyAdmin: true,
        notifyUser: false,
        logLevel: 'error'
      })

      // Return appropriate error response
      const statusCode = getStatusCodeFromError(error as Error)
      const errorResponse = {
        error: {
          id: result.errorId,
          message: 'An error occurred while processing your request',
          code: 'API_ERROR',
          timestamp: new Date().toISOString()
        }
      }

      return res.status(statusCode).json(errorResponse)
    }
  }
}

interface RouteErrorHandlingConfig {
  routeName?: string
  component?: string
  notifyAdmin?: boolean
  includeStackTrace?: boolean
}

function isNextControlFlowError(error: unknown): boolean {
  const digest = typeof error === 'object' && error !== null && 'digest' in error
    ? String((error as { digest?: unknown }).digest)
    : ''

  return digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND'
}

function getStatusCodeFromErrorData(errorData: ErrorData): number {
  switch (errorData.category) {
    case ErrorCategory.AUTHENTICATION:
      return 401
    case ErrorCategory.AUTHORIZATION:
      return 403
    case ErrorCategory.VALIDATION:
    case ErrorCategory.FORM_VALIDATION:
    case ErrorCategory.USER_INPUT:
    case ErrorCategory.BUSINESS_RULE:
      return 400
    case ErrorCategory.NETWORK:
    case ErrorCategory.EXTERNAL_SERVICE:
      return 503
    default:
      return 500
  }
}

function createJsonErrorResponse(
  body: unknown,
  status: number,
  headers: Record<string, string>
): Response {
  if (typeof Response !== 'undefined' && typeof Response.json === 'function') {
    return Response.json(body, { status, headers })
  }

  return {
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || headers[name] || null
    },
    json: async () => body
  } as unknown as Response
}

/**
 * Error handling wrapper for Next.js App Router route handlers.
 */
export function withRouteErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response> | Response,
  config: RouteErrorHandlingConfig = {}
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (isNextControlFlowError(error)) {
        throw error
      }

      const request = typeof Request !== 'undefined' && args[0] instanceof Request ? args[0] : undefined
      const requestId = request?.headers.get('x-correlation-id') ||
        request?.headers.get('x-request-id') ||
        `route_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

      const errorData = errorHandler.createErrorFromException(error as Error, {
        context: ErrorContext.API_ROUTE,
        action: config.routeName,
        component: config.component,
        endpoint: request?.url,
        requestId,
        includeStackTrace: config.includeStackTrace ?? process.env.NODE_ENV === 'development',
        metadata: {
          method: request?.method,
          userAgent: request?.headers.get('user-agent') || undefined
        }
      })

      await errorHandler.handle(errorData, {
        notifyAdmin: config.notifyAdmin ?? true,
        notifyUser: false,
        includeStackTrace: config.includeStackTrace ?? process.env.NODE_ENV === 'development',
        logLevel: 'error'
      })

      return createJsonErrorResponse(
        {
          error: {
            ...errorHandler.toServerActionError(errorData),
            correlationId: requestId
          }
        },
        getStatusCodeFromErrorData(errorData),
        {
          'x-correlation-id': requestId
        }
      )
    }
  }
}

/**
 * Error handling for background jobs and scheduled tasks
 */
export async function handleBackgroundError(
  error: Error,
  context: {
    jobName: string
    jobId?: string
    organizationId?: string
    data?: unknown
  }
) {
  try {
    await errorHandler.handle(error, {
      includeStackTrace: true,
      notifyAdmin: true,
      notifyUser: false,
      logLevel: 'error',
      businessContext: {
        jobName: context.jobName,
        jobId: context.jobId,
        organizationId: context.organizationId,
        backgroundJob: true
      }
    })
  } catch (handlingError) {
    // Fallback error logging
    console.error('Failed to handle background job error:', handlingError)
    console.error('Original background job error:', error)
  }
}

/**
 * Utility functions
 */
function getStatusCodeFromError(error: Error): number {
  // Map common errors to HTTP status codes
  if (error.message.includes('unauthorized') || error.message.includes('permission')) {
    return 403
  }
  if (error.message.includes('not found')) {
    return 404
  }
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return 400
  }
  if (error.message.includes('rate limit')) {
    return 429
  }

  return 500 // Internal server error by default
}

/**
 * Development utilities
 */
export const devUtils = {
  /**
   * Test the error handling system
   */
  async testErrorHandling() {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Error testing is only available in development mode')
      return
    }

    console.log('Testing error handling system...')

    try {
      // Test different types of errors
      const testErrors = [
        new Error('Test validation error'),
        new Error('Test network timeout'),
        new Error('Test database connection failed'),
        new Error('Test unauthorized access')
      ]

      for (const error of testErrors) {
        await errorHandler.handle(error, {
          notifyUser: false,
          notifyAdmin: false,
          logLevel: 'debug'
        })
      }

      // Get metrics
      const metrics = await errorHandler.getMetrics()
      console.log('Error handling test completed. Metrics:', metrics)

    } catch (testError) {
      console.error('Error testing failed:', testError)
    }
  },

  /**
   * Generate sample errors for testing notifications
   */
  async generateSampleErrors() {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Sample error generation is only available in development mode')
      return
    }

    const sampleErrors = [
      {
        error: new Error('SKU already exists in this organization'),
        context: { action: 'createItem', category: 'business_rule' }
      },
      {
        error: new Error('Insufficient stock for item XYZ'),
        context: { action: 'createSale', category: 'inventory' }
      },
      {
        error: new Error('Payment processing failed'),
        context: { action: 'processPayment', category: 'sales' }
      },
      {
        error: new Error('Database connection timeout'),
        context: { action: 'loadData', category: 'database' }
      }
    ]

    for (const { error, context } of sampleErrors) {
      await errorHandler.handle(error, {
        notifyUser: true,
        notifyAdmin: false,
        logLevel: 'info',
        businessContext: context
      })

      // Wait between errors to see them individually
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

// Export the initialized system for use throughout the application
export const stockFlowErrorHandling = {
  ...initializeErrorHandling(),
  devUtils: process.env.NODE_ENV === 'development' ? devUtils : undefined
}
