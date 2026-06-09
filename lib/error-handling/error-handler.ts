/**
 * Centralized Error Handler for StockFlow
 *
 * This class provides comprehensive error handling including categorization,
 * notification, logging, and recovery strategies.
 */

import {
  ErrorData,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  RecoveryStrategy,
  ErrorHandlingOptions,
  ErrorHandlingResult,
  IErrorHandler,
  ErrorMetrics,
  ErrorConfig,
  ServerActionResult
} from './types'
import {
  categorizeError,
  shouldRetry,
  getUserMessage,
  getErrorCode
} from './categories'

// Default configuration
const DEFAULT_CONFIG: ErrorConfig = {
  defaultSeverity: ErrorSeverity.MEDIUM,
  defaultCategory: ErrorCategory.SYSTEM,
  defaultRecoveryStrategy: RecoveryStrategy.NONE,
  userNotificationThreshold: ErrorSeverity.MEDIUM,
  adminNotificationThreshold: ErrorSeverity.HIGH,
  logThreshold: ErrorSeverity.LOW,
  maxLogRetention: 30,
  defaultMaxRetries: 3,
  defaultRetryDelay: 1000,
  categoryConfig: {
    [ErrorCategory.NETWORK]: {
      defaultSeverity: ErrorSeverity.MEDIUM,
      autoRetry: true,
      maxRetries: 3,
      notifyUser: false,
      notifyAdmin: false
    },
    [ErrorCategory.DATABASE]: {
      defaultSeverity: ErrorSeverity.HIGH,
      autoRetry: true,
      maxRetries: 2,
      notifyUser: false,
      notifyAdmin: true
    },
    [ErrorCategory.VALIDATION]: {
      defaultSeverity: ErrorSeverity.MEDIUM,
      autoRetry: false,
      maxRetries: 0,
      notifyUser: true,
      notifyAdmin: false
    }
  }
}

const SENSITIVE_KEY_PATTERN = /(password|passcode|secret|token|authorization|cookie|session|credential|api[-_]?key|database_url|connection|string|card|cvv|pin)/i
const MAX_METADATA_DEPTH = 4

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function redactString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(password|secret|token|authorization|cookie|api[-_]?key)=([^\s,;]+)/gi, '$1=[REDACTED]')
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi, '[REDACTED_DATABASE_URL]')
}

export function sanitizeErrorMetadata(value: unknown, depth = 0): unknown {
  if (depth > MAX_METADATA_DEPTH) {
    return '[TRUNCATED]'
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message)
    }
  }

  if (typeof value === 'string') {
    return redactString(value)
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map(item => sanitizeErrorMetadata(item, depth + 1))
  }

  if (isPlainRecord(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((safe, [key, entry]) => {
      safe[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? '[REDACTED]'
        : sanitizeErrorMetadata(entry, depth + 1)
      return safe
    }, {})
  }

  return value
}

function getPublicMessage(errorData: ErrorData): string {
  return errorData.userMessage || 'An unexpected error occurred. Please try again or contact support.'
}

function createErrorId(): string {
  if (globalThis.crypto?.randomUUID) {
    return `err_${globalThis.crypto.randomUUID()}`
  }

  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Singleton ErrorHandler class implementing comprehensive error management
 */
export class ErrorHandler implements IErrorHandler {
  private static instance: ErrorHandler
  private config: ErrorConfig
  private errorLog: ErrorData[] = []
  private notificationCallback?: (errorData: ErrorData, options: ErrorHandlingOptions) => Promise<void>

  constructor(config: Partial<ErrorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ErrorConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config)
    }
    return ErrorHandler.instance
  }

  /**
   * Set notification callback for user/admin notifications
   */
  setNotificationCallback(callback?: (errorData: ErrorData, options: ErrorHandlingOptions) => Promise<void>) {
    this.notificationCallback = callback
  }

  /**
   * Main error handling method
   */
  async handle(
    error: Error | ErrorData,
    options: ErrorHandlingOptions = {}
  ): Promise<ErrorHandlingResult> {
    let errorData: ErrorData

    if (error instanceof Error) {
      errorData = this.createErrorFromException(error, options)
    } else {
      errorData = {
        ...error,
        metadata: sanitizeErrorMetadata(error.metadata) as Record<string, unknown> | undefined,
        businessContext: sanitizeErrorMetadata(error.businessContext) as Record<string, unknown> | undefined
      }
    }

    // Apply options to error data
    if (options.notifyUser !== undefined) {
      errorData.shouldNotifyUser = options.notifyUser
    }
    if (options.notifyAdmin !== undefined) {
      errorData.shouldNotifyAdmin = options.notifyAdmin
    }

    const result: ErrorHandlingResult = {
      handled: false,
      errorId: errorData.id,
      notifications: { user: false, admin: false },
      logged: false
    }

    try {
      // Log the error
      if (this.shouldLog(errorData)) {
        await this.logError(errorData)
        result.logged = true
      }

      // Handle notifications
      if (this.shouldNotifyUser(errorData) || options.notifyUser) {
        await this.notifyUser(errorData, options)
        result.notifications!.user = true
      }

      if (this.shouldNotifyAdmin(errorData) || options.notifyAdmin) {
        await this.notifyAdmin(errorData, options)
        result.notifications!.admin = true
      }

      // Attempt recovery
      const recoveryResult = await this.attemptRecovery(errorData, options)
      result.recovery = recoveryResult

      result.handled = true
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError)
      // Don't throw - we don't want error handling to fail
    }

    return result
  }

  /**
   * Create ErrorData from Error exception
   */
  createErrorFromException(error: Error, options: ErrorHandlingOptions = {}): ErrorData {
    const categorization = categorizeError(error)
    const category = options.category || categorization.category
    const severity = options.severity || categorization.severity
    const requestId = options.requestId || options.correlationId

    const errorData: ErrorData = {
      id: createErrorId(),
      timestamp: new Date(),
      category,
      severity,
      context: options.context || this.inferContext(options),
      code: options.code || getErrorCode(error, category),
      message: redactString(error.message),
      userMessage: options.userMessage || getUserMessage(error, category),
      stack: options.includeStackTrace ? error.stack : undefined,
      originalError: error,
      recoveryStrategy: options.recoveryStrategy || categorization.recovery,
      shouldNotifyUser: this.shouldNotifyUser({ severity } as ErrorData),
      shouldNotifyAdmin: this.shouldNotifyAdmin({ severity } as ErrorData),
      shouldLog: this.shouldLog({ severity } as ErrorData),
      component: options.component,
      action: options.action,
      endpoint: options.endpoint,
      organizationId: options.organizationId,
      userId: options.userId,
      sessionId: options.sessionId,
      requestId,
      businessContext: sanitizeErrorMetadata(options.businessContext) as Record<string, unknown> | undefined,
      affectedResources: options.affectedResources || options.affectedFeatures,
      metadata: {
        errorName: error.name,
        ...(sanitizeErrorMetadata(options.metadata) as Record<string, unknown> | undefined)
      }
    }

    return errorData
  }

  /**
   * Create ErrorData programmatically
   */
  createError(params: Partial<ErrorData>): ErrorData {
    return {
      id: createErrorId(),
      timestamp: new Date(),
      category: this.config.defaultCategory,
      severity: this.config.defaultSeverity,
      context: ErrorContext.SERVER_ACTION,
      code: `CUSTOM_${Date.now()}`,
      recoveryStrategy: this.config.defaultRecoveryStrategy,
      shouldNotifyUser: false,
      shouldNotifyAdmin: false,
      shouldLog: true,
      ...params,
      message: params.message ? redactString(params.message) : 'Custom error',
      userMessage: params.userMessage || params.message || 'An error occurred',
      metadata: sanitizeErrorMetadata(params.metadata) as Record<string, unknown> | undefined,
      businessContext: sanitizeErrorMetadata(params.businessContext) as Record<string, unknown> | undefined
    }
  }

  /**
   * Convert ErrorData into the app's serializable server-action error shape.
   * This is safe to return to clients.
   */
  toServerActionError(errorData: ErrorData): NonNullable<ServerActionResult['error']> {
    return {
      id: errorData.id,
      code: errorData.code,
      message: getPublicMessage(errorData),
      userMessage: getPublicMessage(errorData),
      category: errorData.category,
      severity: errorData.severity,
      recoverable: errorData.recoveryStrategy !== RecoveryStrategy.NONE,
      retryable: errorData.recoveryStrategy === RecoveryStrategy.RETRY,
      context: {
        action: errorData.action,
        component: errorData.component,
        requestId: errorData.requestId,
        category: errorData.category,
        severity: errorData.severity
      }
    }
  }

  /**
   * Categorize an error using the categorization logic
   */
  categorizeError(error: Error): { category: ErrorCategory; severity: ErrorSeverity } {
    const result = categorizeError(error)
    return {
      category: result.category,
      severity: result.severity
    }
  }

  /**
   * Determine if error should be retried
   */
  shouldRetry(errorData: ErrorData): boolean {
    const attempts = errorData.recoveryAttempts || 0
    const maxRetries = errorData.maxRetries || this.config.defaultMaxRetries

    return shouldRetry(
      errorData.originalError || new Error(errorData.message),
      attempts,
      maxRetries
    )
  }

  /**
   * Get recovery strategy for error
   */
  getRecoveryStrategy(errorData: ErrorData): RecoveryStrategy {
    return errorData.recoveryStrategy
  }

  /**
   * Get error metrics
   */
  async getMetrics(): Promise<ErrorMetrics> {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const recentErrors = this.errorLog.filter(error => error.timestamp > dayAgo)

    const errorsByCategory = {} as Record<ErrorCategory, number>
    const errorsBySeverity = {} as Record<ErrorSeverity, number>

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory[category] = 0
    })
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0
    })

    // Count errors
    recentErrors.forEach(error => {
      errorsByCategory[error.category]++
      errorsBySeverity[error.severity]++
    })

    const recoveryAttempts = recentErrors.filter(e => (e.recoveryAttempts || 0) > 0).length
    const recoverySuccesses = recentErrors.filter(e =>
      (e.recoveryAttempts || 0) > 0 && e.metadata?.recoverySuccessful
    ).length

    return {
      totalErrors: recentErrors.length,
      errorsByCategory,
      errorsBySeverity,
      errorTrends: this.generateErrorTrends(recentErrors),
      recoverySuccess: {
        attempted: recoveryAttempts,
        successful: recoverySuccesses,
        rate: recoveryAttempts > 0 ? recoverySuccesses / recoveryAttempts : 0
      }
    }
  }

  /**
   * Private methods
   */
  private inferContext(options: ErrorHandlingOptions): ErrorContext {
    // Try to infer context from call stack or options
    if (typeof window !== 'undefined') {
      return ErrorContext.CLIENT_COMPONENT
    }
    return ErrorContext.SERVER_ACTION
  }

  private shouldLog(errorData: ErrorData): boolean {
    if (errorData.shouldLog !== undefined) {
      return errorData.shouldLog
    }
    return this.getSeverityLevel(errorData.severity) >= this.getSeverityLevel(this.config.logThreshold)
  }

  private shouldNotifyUser(errorData: ErrorData): boolean {
    if (errorData.shouldNotifyUser !== undefined) {
      return errorData.shouldNotifyUser
    }
    return this.getSeverityLevel(errorData.severity) >= this.getSeverityLevel(this.config.userNotificationThreshold)
  }

  private shouldNotifyAdmin(errorData: ErrorData): boolean {
    if (errorData.shouldNotifyAdmin !== undefined) {
      return errorData.shouldNotifyAdmin
    }
    return this.getSeverityLevel(errorData.severity) >= this.getSeverityLevel(this.config.adminNotificationThreshold)
  }

  private getSeverityLevel(severity: ErrorSeverity): number {
    const levels = {
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.CRITICAL]: 4
    }
    return levels[severity]
  }

  private async logError(errorData: ErrorData): Promise<void> {
    // Add to in-memory log
    this.errorLog.push(errorData)

    // Cleanup old errors
    const cutoff = new Date(Date.now() - this.config.maxLogRetention * 24 * 60 * 60 * 1000)
    this.errorLog = this.errorLog.filter(error => error.timestamp > cutoff)

    // Console logging
    const logLevel = this.getSeverityLogLevel(errorData.severity)
    const logMessage = `[${errorData.id}] ${errorData.category}: ${errorData.message}`

    console[logLevel](logMessage, {
      error: {
        id: errorData.id,
        timestamp: errorData.timestamp,
        category: errorData.category,
        severity: errorData.severity,
        context: errorData.context,
        code: errorData.code,
        message: errorData.message,
        userMessage: errorData.userMessage,
        userId: errorData.userId,
        organizationId: errorData.organizationId,
        sessionId: errorData.sessionId,
        requestId: errorData.requestId,
        component: errorData.component,
        action: errorData.action,
        endpoint: errorData.endpoint,
        recoveryStrategy: errorData.recoveryStrategy,
        businessContext: sanitizeErrorMetadata(errorData.businessContext),
        affectedResources: errorData.affectedResources,
        metadata: sanitizeErrorMetadata(errorData.metadata)
      },
      stack: errorData.stack
    })
  }

  private getSeverityLogLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info'
      case ErrorSeverity.MEDIUM:
        return 'warn'
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error'
      default:
        return 'error'
    }
  }

  private async notifyUser(errorData: ErrorData, options: ErrorHandlingOptions): Promise<void> {
    if (this.notificationCallback) {
      await this.notificationCallback(errorData, options)
    }
  }

  private async notifyAdmin(errorData: ErrorData, options: ErrorHandlingOptions): Promise<void> {
    // In a real implementation, this would send admin notifications
    // via email, Slack, or other admin channels
    console.warn(`ADMIN NOTIFICATION: ${errorData.category} error`, {
      id: errorData.id,
      code: errorData.code,
      severity: errorData.severity,
      message: errorData.message,
      action: errorData.action,
      component: errorData.component,
      requestId: errorData.requestId,
      userId: errorData.userId,
      organizationId: errorData.organizationId,
      businessContext: sanitizeErrorMetadata(errorData.businessContext)
    })
  }

  private async attemptRecovery(
    errorData: ErrorData,
    options: ErrorHandlingOptions
  ): Promise<{ attempted: boolean; successful: boolean; strategy: RecoveryStrategy }> {
    const result = {
      attempted: false,
      successful: false,
      strategy: errorData.recoveryStrategy
    }

    if (errorData.recoveryStrategy === RecoveryStrategy.NONE) {
      return result
    }

    result.attempted = true

    try {
      switch (errorData.recoveryStrategy) {
        case RecoveryStrategy.RETRY:
          if (options.autoRetry && this.shouldRetry(errorData)) {
            // In a real implementation, this would retry the failed operation
            result.successful = true
          }
          break

        case RecoveryStrategy.FALLBACK:
          if (options.fallbackAction) {
            await options.fallbackAction()
            result.successful = true
          }
          break

        case RecoveryStrategy.USER_ACTION:
          // User action required - just flag as attempted
          result.successful = true
          break

        case RecoveryStrategy.ADMIN_INTERVENTION:
          // Admin intervention required - just flag as attempted
          result.successful = true
          break
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError)
      result.successful = false
    }

    return result
  }

  private generateErrorTrends(errors: ErrorData[]): Array<{
    timestamp: Date
    category: ErrorCategory
    severity: ErrorSeverity
    count: number
  }> {
    // Group errors by hour for trending
    const hourlyGroups = new Map<string, Map<string, number>>()

    errors.forEach(error => {
      const hourKey = new Date(error.timestamp.getTime())
      hourKey.setMinutes(0, 0, 0)
      const hourString = hourKey.toISOString()
      const categoryKey = `${error.category}-${error.severity}`

      if (!hourlyGroups.has(hourString)) {
        hourlyGroups.set(hourString, new Map())
      }

      const hourlyMap = hourlyGroups.get(hourString)!
      hourlyMap.set(categoryKey, (hourlyMap.get(categoryKey) || 0) + 1)
    })

    // Convert to trend array
    const trends: Array<{
      timestamp: Date
      category: ErrorCategory
      severity: ErrorSeverity
      count: number
    }> = []

    hourlyGroups.forEach((categoryCounts, hourString) => {
      categoryCounts.forEach((count, categoryKey) => {
        const [category, severity] = categoryKey.split('-') as [ErrorCategory, ErrorSeverity]
        trends.push({
          timestamp: new Date(hourString),
          category,
          severity,
          count
        })
      })
    })

    return trends.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()
