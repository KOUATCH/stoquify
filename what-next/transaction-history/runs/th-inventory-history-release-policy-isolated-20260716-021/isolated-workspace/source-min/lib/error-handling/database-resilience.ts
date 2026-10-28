/**
 * Advanced Database Resilience Patterns for StockFlow
 *
 * Provides comprehensive database operation safety including:
 * - Connection pooling and health monitoring
 * - Deadlock detection and retry logic
 * - Transaction timeout handling
 * - Compensating transaction patterns
 * - Query performance monitoring
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { errorHandler } from './error-handler'
import { ErrorCategory, ErrorSeverity, RecoveryStrategy } from './types'

// Database operation configuration
export interface DatabaseConfig {
  maxRetries: number
  baseRetryDelay: number
  maxRetryDelay: number
  connectionTimeout: number
  queryTimeout: number
  transactionTimeout: number
  deadlockRetryLimit: number
  healthCheckInterval: number
  enableCircuitBreaker: boolean
  circuitBreakerThreshold: number
  circuitBreakerRecoveryTime: number
}

const DEFAULT_DB_CONFIG: DatabaseConfig = {
  maxRetries: 3,
  baseRetryDelay: 1000,
  maxRetryDelay: 10000,
  connectionTimeout: 5000,
  queryTimeout: 30000,
  transactionTimeout: 45000,
  deadlockRetryLimit: 5,
  healthCheckInterval: 30000,
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerRecoveryTime: 60000
}

// Database health status
export interface DatabaseHealth {
  isHealthy: boolean
  connectionCount: number
  averageResponseTime: number
  errorRate: number
  lastHealthCheck: Date
  circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

// Database operation metrics
export interface DatabaseMetrics {
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  averageQueryTime: number
  deadlockCount: number
  timeoutCount: number
  retryCount: number
  circuitBreakerTrips: number
}

/**
 * Resilient Database Manager
 * Wraps Prisma operations with advanced error handling and resilience patterns
 */
export class ResilientDatabase {
  private static instance: ResilientDatabase
  private config: DatabaseConfig
  private metrics: DatabaseMetrics
  private health: DatabaseHealth
  private lastHealthCheck: Date
  private circuitBreakerOpenUntil?: Date

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = { ...DEFAULT_DB_CONFIG, ...config }
    this.metrics = this.initializeMetrics()
    this.health = this.initializeHealth()
    this.lastHealthCheck = new Date()

    // Start health monitoring
    this.startHealthMonitoring()
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<DatabaseConfig>): ResilientDatabase {
    if (!ResilientDatabase.instance) {
      ResilientDatabase.instance = new ResilientDatabase(config)
    }
    return ResilientDatabase.instance
  }

  /**
   * Execute database operation with comprehensive error handling
   */
  async withResilience<T>(
    operation: (db: PrismaClient) => Promise<T>,
    context: {
      operationName: string
      organizationId?: string
      userId?: string
      businessContext?: Record<string, unknown>
    }
  ): Promise<T> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error(`Circuit breaker is OPEN for database operations. Next attempt allowed at ${this.circuitBreakerOpenUntil}`)
    }

    const startTime = Date.now()
    let attempt = 0
    let lastError: Error | null = null

    while (attempt < this.config.maxRetries) {
      attempt++

      try {
        // Import db here to avoid circular dependencies
        const { db } = await import('@/prisma/db')

        // Execute operation with timeout
        const result = await this.withTimeout(
          operation(db),
          this.config.queryTimeout,
          `Database operation timeout: ${context.operationName}`
        )

        // Record successful operation
        const duration = Date.now() - startTime
        this.recordSuccess(duration)

        return result
      } catch (error) {
        lastError = error as Error
        const duration = Date.now() - startTime

        // Classify error and determine retry strategy
        const errorType = this.classifyDatabaseError(error as Error)
        this.recordError(errorType, duration)

        // Handle specific error types
        if (errorType === 'DEADLOCK' && attempt <= this.config.deadlockRetryLimit) {
          await this.handleDeadlock(attempt, context)
          continue
        }

        if (errorType === 'CONNECTION' && this.shouldRetryConnection(attempt)) {
          await this.handleConnectionError(attempt, context)
          continue
        }

        if (errorType === 'TIMEOUT' && this.shouldRetryTimeout(attempt)) {
          await this.handleTimeoutError(attempt, context)
          continue
        }

        // If not retryable or max retries reached, handle the error
        await this.handleDatabaseError(error as Error, {
          ...context,
          attempt,
          duration,
          errorType
        })

        // For non-retryable errors, break immediately
        if (!this.isRetryableError(errorType)) {
          break
        }

        // Apply exponential backoff for retryable errors
        if (attempt < this.config.maxRetries) {
          await this.exponentialBackoff(attempt)
        }
      }
    }

    // All retries exhausted
    throw lastError
  }

  /**
   * Execute database transaction with advanced safety patterns
   */
  async withTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    context: {
      operationName: string
      organizationId?: string
      userId?: string
      businessContext?: Record<string, unknown>
      compensatingActions?: Array<() => Promise<void>>
    }
  ): Promise<T> {
    return this.withResilience(async (db) => {
      try {
        const result = await db.$transaction(
          async (tx) => {
            // Execute the main transaction
            const txResult = await this.withTimeout(
              operation(tx),
              this.config.transactionTimeout,
              `Transaction timeout: ${context.operationName}`
            )

            return txResult
          },
          {
            maxWait: this.config.connectionTimeout,
            timeout: this.config.transactionTimeout,
          }
        )

        return result
      } catch (error) {
        // Execute compensating actions if provided
        if (context.compensatingActions?.length) {
          await this.executeCompensatingActions(context.compensatingActions, context)
        }

        throw error
      }
    }, context)
  }

  /**
   * Health check for database connectivity
   */
  async performHealthCheck(): Promise<DatabaseHealth> {
    try {
      const { db } = await import('@/prisma/db')
      const startTime = Date.now()

      // Simple health check query
      await db.$queryRaw`SELECT 1`

      const responseTime = Date.now() - startTime

      this.health = {
        ...this.health,
        isHealthy: true,
        averageResponseTime: (this.health.averageResponseTime + responseTime) / 2,
        lastHealthCheck: new Date(),
        circuitBreakerStatus: this.getCircuitBreakerStatus()
      }

      // Reset circuit breaker if we're in half-open state and health check passes
      if (this.health.circuitBreakerStatus === 'HALF_OPEN') {
        this.circuitBreakerOpenUntil = undefined
        this.health.circuitBreakerStatus = 'CLOSED'
      }

    } catch (error) {
      this.health = {
        ...this.health,
        isHealthy: false,
        lastHealthCheck: new Date(),
        circuitBreakerStatus: this.getCircuitBreakerStatus()
      }

      await errorHandler.handle(error as Error, {
        notifyAdmin: true,
        includeStackTrace: true,
        businessImpact: 'critical'
      })
    }

    this.lastHealthCheck = new Date()
    return this.health
  }

  /**
   * Get current database metrics
   */
  getMetrics(): DatabaseMetrics {
    return { ...this.metrics }
  }

  /**
   * Get current database health
   */
  getHealth(): DatabaseHealth {
    return { ...this.health }
  }

  // Private helper methods

  private initializeMetrics(): DatabaseMetrics {
    return {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      deadlockCount: 0,
      timeoutCount: 0,
      retryCount: 0,
      circuitBreakerTrips: 0
    }
  }

  private initializeHealth(): DatabaseHealth {
    return {
      isHealthy: true,
      connectionCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastHealthCheck: new Date(),
      circuitBreakerStatus: 'CLOSED'
    }
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      )
    ])
  }

  private classifyDatabaseError(error: Error): 'DEADLOCK' | 'CONNECTION' | 'TIMEOUT' | 'CONSTRAINT' | 'UNKNOWN' {
    const message = error.message.toLowerCase()

    if (message.includes('deadlock') || message.includes('lock timeout')) {
      return 'DEADLOCK'
    }

    if (message.includes('connection') || message.includes('connect') ||
        message.includes('network') || message.includes('econnrefused')) {
      return 'CONNECTION'
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT'
    }

    if (message.includes('constraint') || message.includes('unique') ||
        message.includes('foreign key') || message.includes('check constraint')) {
      return 'CONSTRAINT'
    }

    return 'UNKNOWN'
  }

  private recordSuccess(duration: number): void {
    this.metrics.totalQueries++
    this.metrics.successfulQueries++
    this.metrics.averageQueryTime =
      (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + duration) / this.metrics.totalQueries
  }

  private recordError(errorType: string, duration: number): void {
    this.metrics.totalQueries++
    this.metrics.failedQueries++

    switch (errorType) {
      case 'DEADLOCK':
        this.metrics.deadlockCount++
        break
      case 'TIMEOUT':
        this.metrics.timeoutCount++
        break
    }

    this.updateErrorRate()
    this.checkCircuitBreaker()
  }

  private updateErrorRate(): void {
    this.health.errorRate = this.metrics.failedQueries / this.metrics.totalQueries
  }

  private checkCircuitBreaker(): void {
    if (!this.config.enableCircuitBreaker) return

    if (this.health.errorRate > (this.config.circuitBreakerThreshold / 100) &&
        this.metrics.totalQueries >= 10) {
      this.openCircuitBreaker()
    }
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpenUntil = new Date(Date.now() + this.config.circuitBreakerRecoveryTime)
    this.health.circuitBreakerStatus = 'OPEN'
    this.metrics.circuitBreakerTrips++
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpenUntil) return false

    if (new Date() > this.circuitBreakerOpenUntil) {
      this.health.circuitBreakerStatus = 'HALF_OPEN'
      return false
    }

    return this.health.circuitBreakerStatus === 'OPEN'
  }

  private getCircuitBreakerStatus(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    if (this.isCircuitBreakerOpen()) return 'OPEN'
    if (this.circuitBreakerOpenUntil && new Date() <= this.circuitBreakerOpenUntil) return 'HALF_OPEN'
    return 'CLOSED'
  }

  private async handleDeadlock(attempt: number, context: any): Promise<void> {
    this.metrics.retryCount++

    await errorHandler.handle(
      errorHandler.createError({
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        code: 'DATABASE_DEADLOCK',
        message: `Database deadlock detected on attempt ${attempt}`,
        userMessage: 'The system is busy. Please try again in a moment.',
        recoveryStrategy: RecoveryStrategy.RETRY,
        businessContext: context,
        shouldNotifyUser: false,
        shouldNotifyAdmin: attempt > 2
      }),
      { autoRetry: true }
    )
  }

  private async handleConnectionError(attempt: number, context: any): Promise<void> {
    this.metrics.retryCount++

    await errorHandler.handle(
      errorHandler.createError({
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        code: 'DATABASE_CONNECTION_ERROR',
        message: `Database connection failed on attempt ${attempt}`,
        userMessage: 'Unable to connect to the database. Please check your connection.',
        recoveryStrategy: RecoveryStrategy.RETRY,
        businessContext: context,
        shouldNotifyUser: attempt > 1,
        shouldNotifyAdmin: true
      }),
      { autoRetry: true }
    )
  }

  private async handleTimeoutError(attempt: number, context: any): Promise<void> {
    this.metrics.retryCount++

    await errorHandler.handle(
      errorHandler.createError({
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        code: 'DATABASE_TIMEOUT',
        message: `Database operation timeout on attempt ${attempt}`,
        userMessage: 'The operation is taking longer than expected. Please try again.',
        recoveryStrategy: RecoveryStrategy.RETRY,
        businessContext: context,
        shouldNotifyUser: attempt > 1,
        shouldNotifyAdmin: attempt > 2
      }),
      { autoRetry: true }
    )
  }

  private async handleDatabaseError(
    error: Error,
    context: any
  ): Promise<void> {
    const errorType = this.classifyDatabaseError(error)

    let category = ErrorCategory.DATABASE
    let severity = ErrorSeverity.HIGH
    let userMessage = 'A database error occurred. Please try again.'

    switch (errorType) {
      case 'CONSTRAINT':
        category = ErrorCategory.BUSINESS_RULE
        severity = ErrorSeverity.MEDIUM
        userMessage = 'The operation violates a business rule. Please check your data.'
        break
      case 'CONNECTION':
        severity = ErrorSeverity.CRITICAL
        userMessage = 'Unable to connect to the database. Please contact support.'
        break
    }

    await errorHandler.handle(
      errorHandler.createError({
        category,
        severity,
        code: `DATABASE_${errorType}_ERROR`,
        message: error.message,
        userMessage,
        recoveryStrategy: this.isRetryableError(errorType) ? RecoveryStrategy.RETRY : RecoveryStrategy.ADMIN_INTERVENTION,
        businessContext: context,
        originalError: error,
        shouldNotifyUser: true,
        shouldNotifyAdmin: severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL
      }),
      {
        includeStackTrace: true,
        businessImpact: severity === ErrorSeverity.CRITICAL ? 'critical' : 'high'
      }
    )
  }

  private shouldRetryConnection(attempt: number): boolean {
    return attempt < this.config.maxRetries
  }

  private shouldRetryTimeout(attempt: number): boolean {
    return attempt < this.config.maxRetries
  }

  private isRetryableError(errorType: string): boolean {
    return ['DEADLOCK', 'CONNECTION', 'TIMEOUT'].includes(errorType)
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, attempt - 1),
      this.config.maxRetryDelay
    )

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * delay * 0.1
    const totalDelay = delay + jitter

    await new Promise(resolve => setTimeout(resolve, totalDelay))
  }

  private async executeCompensatingActions(
    actions: Array<() => Promise<void>>,
    context: any
  ): Promise<void> {
    for (const action of actions) {
      try {
        await action()
      } catch (compensationError) {
        await errorHandler.handle(compensationError as Error, {
          notifyAdmin: true,
          businessImpact: 'critical',
          includeStackTrace: true
        })
      }
    }
  }
}

// Export singleton instance
export const resilientDb = ResilientDatabase.getInstance()

// Convenience wrapper for common database operations
export const dbOperation = <T>(
  operation: (db: PrismaClient) => Promise<T>,
  context: {
    operationName: string
    organizationId?: string
    userId?: string
    businessContext?: Record<string, unknown>
  }
): Promise<T> => resilientDb.withResilience(operation, context)

// Convenience wrapper for transaction operations
export const dbTransaction = <T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  context: {
    operationName: string
    organizationId?: string
    userId?: string
    businessContext?: Record<string, unknown>
    compensatingActions?: Array<() => Promise<void>>
  }
): Promise<T> => resilientDb.withTransaction(operation, context)
