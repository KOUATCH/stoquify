/**
 * Circuit Breaker Pattern Implementation for StockFlow
 *
 * Provides comprehensive circuit breaker functionality for external services including:
 * - Service health monitoring and failure detection
 * - Automatic service isolation and recovery
 * - Fallback mechanisms and graceful degradation
 * - Retry logic with exponential backoff
 * - Service dependency mapping
 * - Performance metrics and monitoring
 * - Configurable thresholds and timeouts
 */

import { EventEmitter } from 'events'
import { errorHandler } from './error-handler'
import { systemMonitor, AlertType, AlertSeverity } from './monitoring'
import { ErrorCategory, ErrorSeverity as ErrorSev } from './types'

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests allowed
  OPEN = 'OPEN',         // Circuit is open, requests are blocked
  HALF_OPEN = 'HALF_OPEN' // Testing mode, limited requests allowed
}

// Service types for different external dependencies
export enum ServiceType {
  PAYMENT_PROCESSOR = 'PAYMENT_PROCESSOR',
  EMAIL_SERVICE = 'EMAIL_SERVICE',
  SMS_SERVICE = 'SMS_SERVICE',
  INVENTORY_API = 'INVENTORY_API',
  ANALYTICS_SERVICE = 'ANALYTICS_SERVICE',
  BACKUP_SERVICE = 'BACKUP_SERVICE',
  NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE',
  AUTH_SERVICE = 'AUTH_SERVICE',
  FILE_STORAGE = 'FILE_STORAGE',
  WEBHOOK_ENDPOINT = 'WEBHOOK_ENDPOINT'
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number        // Number of failures before opening circuit
  successThreshold: number        // Number of successes needed to close circuit
  timeout: number                 // Timeout in milliseconds for requests
  resetTimeout: number            // Time to wait before trying to close circuit
  monitoringWindow: number        // Time window for monitoring failures (ms)
  maxRetries: number              // Maximum retry attempts
  retryDelay: number              // Base delay between retries (ms)
  maxRetryDelay: number           // Maximum delay between retries (ms)
  enableFallback: boolean         // Whether to use fallback mechanisms
  enableMetrics: boolean          // Whether to collect performance metrics
  halfOpenMaxRequests: number     // Max requests allowed in half-open state
}

// Default configurations for different service types
const DEFAULT_CONFIGS: Record<ServiceType, CircuitBreakerConfig> = {
  [ServiceType.PAYMENT_PROCESSOR]: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 10000,
    resetTimeout: 60000,
    monitoringWindow: 300000,
    maxRetries: 2,
    retryDelay: 1000,
    maxRetryDelay: 5000,
    enableFallback: true,
    enableMetrics: true,
    halfOpenMaxRequests: 3
  },
  [ServiceType.EMAIL_SERVICE]: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 15000,
    resetTimeout: 120000,
    monitoringWindow: 600000,
    maxRetries: 3,
    retryDelay: 2000,
    maxRetryDelay: 10000,
    enableFallback: true,
    enableMetrics: true,
    halfOpenMaxRequests: 5
  },
  [ServiceType.SMS_SERVICE]: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 8000,
    resetTimeout: 180000,
    monitoringWindow: 300000,
    maxRetries: 2,
    retryDelay: 1500,
    maxRetryDelay: 8000,
    enableFallback: true,
    enableMetrics: true,
    halfOpenMaxRequests: 2
  },
  [ServiceType.INVENTORY_API]: {
    failureThreshold: 4,
    successThreshold: 3,
    timeout: 5000,
    resetTimeout: 30000,
    monitoringWindow: 180000,
    maxRetries: 3,
    retryDelay: 500,
    maxRetryDelay: 3000,
    enableFallback: true,
    enableMetrics: true,
    halfOpenMaxRequests: 5
  },
  [ServiceType.ANALYTICS_SERVICE]: {
    failureThreshold: 6,
    successThreshold: 4,
    timeout: 20000,
    resetTimeout: 300000,
    monitoringWindow: 900000,
    maxRetries: 1,
    retryDelay: 3000,
    maxRetryDelay: 15000,
    enableFallback: false,
    enableMetrics: true,
    halfOpenMaxRequests: 3
  },
  [ServiceType.BACKUP_SERVICE]: {
    failureThreshold: 2,
    successThreshold: 1,
    timeout: 30000,
    resetTimeout: 600000,
    monitoringWindow: 1800000,
    maxRetries: 1,
    retryDelay: 5000,
    maxRetryDelay: 30000,
    enableFallback: false,
    enableMetrics: true,
    halfOpenMaxRequests: 1
  },
  [ServiceType.NOTIFICATION_SERVICE]: {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 10000,
    resetTimeout: 120000,
    monitoringWindow: 300000,
    maxRetries: 2,
    retryDelay: 2000,
    maxRetryDelay: 8000,
    enableFallback: true,
    enableMetrics: true,
    halfOpenMaxRequests: 3
  },
  [ServiceType.AUTH_SERVICE]: {
    failureThreshold: 2,
    successThreshold: 2,
    timeout: 3000,
    resetTimeout: 60000,
    monitoringWindow: 120000,
    maxRetries: 3,
    retryDelay: 500,
    maxRetryDelay: 2000,
    enableFallback: true,
    enableMetrics: true,
    halfOpenMaxRequests: 5
  },
  [ServiceType.FILE_STORAGE]: {
    failureThreshold: 4,
    successThreshold: 2,
    timeout: 25000,
    resetTimeout: 180000,
    monitoringWindow: 600000,
    maxRetries: 2,
    retryDelay: 2000,
    maxRetryDelay: 10000,
    enableFallback: true,
    enableMetrics: true,
    halfOpenMaxRequests: 2
  },
  [ServiceType.WEBHOOK_ENDPOINT]: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 8000,
    resetTimeout: 300000,
    monitoringWindow: 600000,
    maxRetries: 3,
    retryDelay: 1000,
    maxRetryDelay: 15000,
    enableFallback: false,
    enableMetrics: true,
    halfOpenMaxRequests: 1
  }
}

// Circuit breaker metrics
export interface CircuitBreakerMetrics {
  serviceName: string
  serviceType: ServiceType
  state: CircuitState
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  timeouts: number
  circuitOpenTime?: Date
  lastFailure?: Date
  lastSuccess?: Date
  averageResponseTime: number
  successRate: number
  failureRate: number
  halfOpenRequests: number
}

// Fallback function type
export type FallbackFunction<T> = () => Promise<T> | T

// Service call context
export interface ServiceCallContext {
  operationName: string
  organizationId?: string
  userId?: string
  requestId?: string
  metadata?: Record<string, unknown>
}

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker<T = any> extends EventEmitter {
  private config: CircuitBreakerConfig
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private successCount: number = 0
  private nextAttemptTime: number = 0
  private halfOpenRequests: number = 0
  private metrics: CircuitBreakerMetrics
  private recentRequests: Array<{ timestamp: number; success: boolean; responseTime: number }> = []

  constructor(
    public serviceName: string,
    public serviceType: ServiceType,
    config: Partial<CircuitBreakerConfig> = {},
    public fallbackFunction?: FallbackFunction<T>
  ) {
    super()

    this.config = { ...DEFAULT_CONFIGS[serviceType], ...config }
    this.metrics = this.initializeMetrics()

    // Set up monitoring
    if (this.config.enableMetrics) {
      setInterval(() => this.updateMetrics(), 60000) // Update metrics every minute
    }
  }

  /**
   * Execute a service call with circuit breaker protection
   */
  async execute(
    serviceCall: () => Promise<T>,
    context: ServiceCallContext,
    fallbackOverride?: FallbackFunction<T>
  ): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        return this.executeFallback(fallbackOverride, context)
      } else {
        // Try to move to half-open state
        this.moveToHalfOpen()
      }
    }

    // Check half-open request limit
    if (this.state === CircuitState.HALF_OPEN && this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
      return this.executeFallback(fallbackOverride, context)
    }

    const startTime = Date.now()

    try {
      // Execute the service call with timeout
      const result = await this.executeWithTimeout(serviceCall(), this.config.timeout)

      // Record success
      const responseTime = Date.now() - startTime
      await this.recordSuccess(responseTime, context)

      return result

    } catch (error) {
      // Record failure
      const responseTime = Date.now() - startTime
      await this.recordFailure(error as Error, responseTime, context)

      // Try fallback if available
      if (this.config.enableFallback && (this.fallbackFunction || fallbackOverride)) {
        return this.executeFallback(fallbackOverride, context)
      }

      throw error
    }
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry(
    serviceCall: () => Promise<T>,
    context: ServiceCallContext,
    fallbackOverride?: FallbackFunction<T>
  ): Promise<T> {
    let attempt = 0
    let lastError: Error

    while (attempt < this.config.maxRetries) {
      try {
        return await this.execute(serviceCall, {
          ...context,
          metadata: { ...context.metadata, attempt: attempt + 1 }
        }, fallbackOverride)
      } catch (error) {
        lastError = error as Error
        attempt++

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateRetryDelay(attempt)
          await this.sleep(delay)
        }
      }
    }

    // All retries exhausted, handle final error
    await this.handleFinalError(lastError!, context, attempt)
    throw lastError!
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): {
    state: CircuitState
    isHealthy: boolean
    metrics: CircuitBreakerMetrics
  } {
    return {
      state: this.state,
      isHealthy: this.state === CircuitState.CLOSED,
      metrics: this.getMetrics()
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset circuit breaker (force close)
   */
  reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.halfOpenRequests = 0
    this.nextAttemptTime = 0
    this.emit('circuitReset', { serviceName: this.serviceName })
  }

  /**
   * Force circuit open (for maintenance)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN
    this.nextAttemptTime = Date.now() + this.config.resetTimeout
    this.emit('circuitForceOpened', { serviceName: this.serviceName })
  }

  // Private methods

  private initializeMetrics(): CircuitBreakerMetrics {
    return {
      serviceName: this.serviceName,
      serviceType: this.serviceType,
      state: this.state,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      averageResponseTime: 0,
      successRate: 100,
      failureRate: 0,
      halfOpenRequests: 0
    }
  }

  private async executeWithTimeout(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Service call timeout after ${timeoutMs}ms`))
        }, timeoutMs)
      })
    ])
  }

  private async recordSuccess(responseTime: number, context: ServiceCallContext): Promise<void> {
    this.metrics.totalRequests++
    this.metrics.successfulRequests++
    this.metrics.lastSuccess = new Date()

    this.recentRequests.push({ timestamp: Date.now(), success: true, responseTime })
    this.cleanupOldRequests()

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenRequests++
      this.successCount++

      if (this.successCount >= this.config.successThreshold) {
        this.moveToClosed()
      }
    } else {
      this.failureCount = 0 // Reset failure count on success
    }

    this.updateMetrics()
    this.emit('serviceCallSuccess', {
      serviceName: this.serviceName,
      responseTime,
      context
    })
  }

  private async recordFailure(error: Error, responseTime: number, context: ServiceCallContext): Promise<void> {
    this.metrics.totalRequests++
    this.metrics.failedRequests++
    this.metrics.lastFailure = new Date()

    if (error.message.includes('timeout')) {
      this.metrics.timeouts++
    }

    this.recentRequests.push({ timestamp: Date.now(), success: false, responseTime })
    this.cleanupOldRequests()

    this.failureCount++

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenRequests++
      this.moveToOpen()
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.moveToOpen()
    }

    this.updateMetrics()

    // Handle error through error handler
    await errorHandler.handle(
      errorHandler.createError({
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: this.state === CircuitState.OPEN ? ErrorSev.HIGH : ErrorSev.MEDIUM,
        code: 'SERVICE_CALL_FAILURE',
        message: `${this.serviceName} service call failed: ${error.message}`,
        userMessage: this.getServiceErrorMessage(),
        businessContext: {
          serviceName: this.serviceName,
          serviceType: this.serviceType,
          circuitState: this.state,
          failureCount: this.failureCount,
          ...context
        },
        originalError: error,
        shouldNotifyUser: this.state === CircuitState.OPEN,
        shouldNotifyAdmin: true
      }),
      {
        businessImpact: this.getBusinessImpact(),
        includeStackTrace: true
      }
    )

    this.emit('serviceCallFailure', {
      serviceName: this.serviceName,
      error,
      context,
      circuitState: this.state
    })
  }

  private moveToClosed(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.halfOpenRequests = 0
    this.metrics.state = this.state
    this.emit('circuitClosed', { serviceName: this.serviceName })
  }

  private moveToOpen(): void {
    this.state = CircuitState.OPEN
    this.nextAttemptTime = Date.now() + this.config.resetTimeout
    this.metrics.state = this.state
    this.metrics.circuitOpenTime = new Date()

    // Create alert for circuit opening
    systemMonitor.createAlert(
      AlertType.SYSTEM,
      AlertSeverity.WARNING,
      'Circuit Breaker Opened',
      `Circuit breaker for ${this.serviceName} has been opened due to repeated failures`,
      'CircuitBreaker',
      {
        serviceName: this.serviceName,
        serviceType: this.serviceType,
        failureCount: this.failureCount,
        resetTime: new Date(this.nextAttemptTime)
      }
    )

    this.emit('circuitOpened', {
      serviceName: this.serviceName,
      failureCount: this.failureCount,
      resetTime: new Date(this.nextAttemptTime)
    })
  }

  private moveToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN
    this.halfOpenRequests = 0
    this.successCount = 0
    this.metrics.state = this.state
    this.emit('circuitHalfOpened', { serviceName: this.serviceName })
  }

  private async executeFallback(fallbackOverride?: FallbackFunction<T>, context?: ServiceCallContext): Promise<T> {
    const fallback = fallbackOverride || this.fallbackFunction

    if (!fallback) {
      throw new Error(`${this.serviceName} is unavailable and no fallback is configured`)
    }

    try {
      const result = await fallback()
      this.emit('fallbackExecuted', {
        serviceName: this.serviceName,
        context
      })
      return result
    } catch (fallbackError) {
      await errorHandler.handle(fallbackError as Error, {
        notifyAdmin: true,
        businessImpact: 'high'
      })
      throw fallbackError
    }
  }

  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = this.config.retryDelay * Math.pow(2, attempt - 1)
    const jitter = Math.random() * exponentialDelay * 0.1
    return Math.min(exponentialDelay + jitter, this.config.maxRetryDelay)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private cleanupOldRequests(): void {
    const cutoff = Date.now() - this.config.monitoringWindow
    this.recentRequests = this.recentRequests.filter(req => req.timestamp >= cutoff)
  }

  private updateMetrics(): void {
    if (this.recentRequests.length === 0) return

    const successfulRequests = this.recentRequests.filter(req => req.success).length
    const totalRequests = this.recentRequests.length

    this.metrics.successRate = (successfulRequests / totalRequests) * 100
    this.metrics.failureRate = 100 - this.metrics.successRate

    const totalResponseTime = this.recentRequests.reduce((sum, req) => sum + req.responseTime, 0)
    this.metrics.averageResponseTime = totalResponseTime / totalRequests

    this.metrics.halfOpenRequests = this.halfOpenRequests
  }

  private async handleFinalError(error: Error, context: ServiceCallContext, attempts: number): Promise<void> {
    await errorHandler.handle(
      errorHandler.createError({
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSev.CRITICAL,
        code: 'SERVICE_CALL_EXHAUSTED',
        message: `${this.serviceName} service call failed after ${attempts} attempts: ${error.message}`,
        userMessage: 'The service is currently unavailable. Please try again later.',
        businessContext: {
          serviceName: this.serviceName,
          serviceType: this.serviceType,
          attempts,
          finalError: error.message,
          ...context
        },
        originalError: error,
        shouldNotifyUser: true,
        shouldNotifyAdmin: true
      }),
      {
        businessImpact: 'critical',
        includeStackTrace: true
      }
    )
  }

  private getServiceErrorMessage(): string {
    switch (this.serviceType) {
      case ServiceType.PAYMENT_PROCESSOR:
        return 'Payment processing is temporarily unavailable. Please try again later.'
      case ServiceType.EMAIL_SERVICE:
        return 'Email notifications may be delayed. Your request has been saved.'
      case ServiceType.SMS_SERVICE:
        return 'SMS notifications are temporarily unavailable.'
      case ServiceType.INVENTORY_API:
        return 'Inventory information may be temporarily unavailable.'
      case ServiceType.AUTH_SERVICE:
        return 'Authentication service is temporarily unavailable.'
      default:
        return 'This service is temporarily unavailable. Please try again later.'
    }
  }

  private getBusinessImpact(): 'low' | 'medium' | 'high' | 'critical' {
    switch (this.serviceType) {
      case ServiceType.PAYMENT_PROCESSOR:
      case ServiceType.AUTH_SERVICE:
        return 'critical'
      case ServiceType.INVENTORY_API:
        return 'high'
      case ServiceType.EMAIL_SERVICE:
      case ServiceType.NOTIFICATION_SERVICE:
        return 'medium'
      default:
        return 'low'
    }
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager()
    }
    return CircuitBreakerManager.instance
  }

  /**
   * Create or get circuit breaker for a service
   */
  getCircuitBreaker<T>(
    serviceName: string,
    serviceType: ServiceType,
    config?: Partial<CircuitBreakerConfig>,
    fallbackFunction?: FallbackFunction<T>
  ): CircuitBreaker<T> {
    if (!this.circuitBreakers.has(serviceName)) {
      const circuitBreaker = new CircuitBreaker<T>(serviceName, serviceType, config, fallbackFunction)
      this.circuitBreakers.set(serviceName, circuitBreaker)
    }

    return this.circuitBreakers.get(serviceName) as CircuitBreaker<T>
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses(): Array<{ serviceName: string; status: any }> {
    return Array.from(this.circuitBreakers.entries()).map(([serviceName, cb]) => ({
      serviceName,
      status: cb.getStatus()
    }))
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuitBreakers.forEach(cb => cb.reset())
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    totalServices: number
    healthyServices: number
    unhealthyServices: number
    openCircuits: number
  } {
    const statuses = this.getAllStatuses()

    return {
      totalServices: statuses.length,
      healthyServices: statuses.filter(s => s.status.isHealthy).length,
      unhealthyServices: statuses.filter(s => !s.status.isHealthy).length,
      openCircuits: statuses.filter(s => s.status.state === CircuitState.OPEN).length
    }
  }
}

// Export singleton and convenience functions
export const circuitBreakerManager = CircuitBreakerManager.getInstance()

export const createCircuitBreaker = <T>(
  serviceName: string,
  serviceType: ServiceType,
  config?: Partial<CircuitBreakerConfig>,
  fallbackFunction?: FallbackFunction<T>
): CircuitBreaker<T> => circuitBreakerManager.getCircuitBreaker(serviceName, serviceType, config, fallbackFunction)

export const executeWithCircuitBreaker = <T>(
  serviceName: string,
  serviceType: ServiceType,
  serviceCall: () => Promise<T>,
  context: ServiceCallContext,
  options: {
    config?: Partial<CircuitBreakerConfig>
    fallback?: FallbackFunction<T>
    enableRetry?: boolean
  } = {}
): Promise<T> => {
  const circuitBreaker = circuitBreakerManager.getCircuitBreaker<T>(
    serviceName,
    serviceType,
    options.config,
    options.fallback
  )

  return options.enableRetry
    ? circuitBreaker.executeWithRetry(serviceCall, context, options.fallback)
    : circuitBreaker.execute(serviceCall, context, options.fallback)
}