/**
 * Core type definitions for the error handling system
 */

// Severity levels for error classification
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for business domain classification
export enum ErrorCategory {
  // Business Logic Errors
  VALIDATION = 'validation',
  BUSINESS_RULE = 'business_rule',
  AUTHORIZATION = 'authorization',
  AUTHENTICATION = 'authentication',

  // Technical Errors
  DATABASE = 'database',
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
  EXTERNAL = 'external',
  FILE_SYSTEM = 'file_system',

  // User Experience Errors
  USER_INPUT = 'user_input',
  FORM_VALIDATION = 'form_validation',

  // System Errors
  SYSTEM = 'system',
  CONFIGURATION = 'configuration',
  PERFORMANCE = 'performance',

  // Domain-Specific Errors for StockFlow
  INVENTORY = 'inventory',
  SALES = 'sales',
  PURCHASE = 'purchase',
  ACCOUNTING = 'accounting',
  PAYMENT = 'payment',
  PAYROLL = 'payroll',
  COMPLIANCE = 'compliance',
  FINANCIAL = 'financial',
  POS = 'pos',
  REPORTING = 'reporting'
}

// Error contexts for providing additional metadata
export enum ErrorContext {
  SERVER_ACTION = 'server_action',
  API_ROUTE = 'api_route',
  CLIENT_COMPONENT = 'client_component',
  MIDDLEWARE = 'middleware',
  BACKGROUND_JOB = 'background_job',
  DATABASE_OPERATION = 'database_operation',
  EXTERNAL_API_CALL = 'external_api_call'
}

export type ErrorNotificationChannel = 'provider' | 'modal' | 'banner' | 'email'

// Recovery strategies
export enum RecoveryStrategy {
  NONE = 'none',
  RETRY = 'retry',
  FALLBACK = 'fallback',
  USER_ACTION = 'user_action',
  ADMIN_INTERVENTION = 'admin_intervention'
}

// Core error data structure
export interface ErrorData {
  // Identification
  id: string
  timestamp: Date

  // Classification
  category: ErrorCategory
  severity: ErrorSeverity
  context: ErrorContext

  // Error Information
  code: string
  message: string
  details?: string
  userMessage: string

  // Technical Details
  stack?: string
  originalError?: Error

  // Context Information
  userId?: string
  organizationId?: string
  sessionId?: string
  requestId?: string

  // Location and System Info
  component?: string
  action?: string
  endpoint?: string
  userAgent?: string

  // Recovery and Resolution
  recoveryStrategy: RecoveryStrategy
  recoveryAttempts?: number
  maxRetries?: number

  // Business Context
  businessContext?: Record<string, unknown>
  affectedResources?: string[]

  // Notification Preferences
  shouldNotifyUser?: boolean
  shouldNotifyAdmin?: boolean
  shouldLog?: boolean

  // Additional Metadata
  metadata?: Record<string, unknown>
}

// Error handling options
export interface ErrorHandlingOptions {
  // Logging Configuration
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  logToConsole?: boolean
  logToFile?: boolean
  logToExternal?: boolean

  // Notification Configuration
  notifyUser?: boolean
  notifyAdmin?: boolean
  notificationChannel?: ErrorNotificationChannel

  // Recovery Configuration
  autoRetry?: boolean
  maxRetries?: number
  retryDelay?: number
  fallbackAction?: () => Promise<void> | void

  // Context Enhancement
  includeStackTrace?: boolean
  includeBrowserInfo?: boolean
  includeUserContext?: boolean

  // Operation Context
  context?: ErrorContext
  action?: string
  component?: string
  endpoint?: string
  userId?: string
  organizationId?: string
  sessionId?: string
  requestId?: string
  correlationId?: string

  // Business Context
  businessImpact?: 'low' | 'medium' | 'high' | 'critical'
  affectedFeatures?: string[]
  businessContext?: Record<string, unknown>
  affectedResources?: string[]
  metadata?: Record<string, unknown>

  // Classification Overrides
  category?: ErrorCategory
  severity?: ErrorSeverity
  code?: string
  userMessage?: string
  recoveryStrategy?: RecoveryStrategy
}

// Result types for error handling
export interface ErrorHandlingResult {
  handled: boolean
  errorId: string
  recovery?: {
    attempted: boolean
    successful: boolean
    strategy: RecoveryStrategy
  }
  notifications?: {
    user: boolean
    admin: boolean
  }
  logged: boolean
}

// Server action result type with enhanced error handling
export interface ServerActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: {
    id: string
    code: string
    message: string
    userMessage: string
    category: ErrorCategory
    severity: ErrorSeverity
    status?: number
    correlationId?: string
    requestId?: string
    recoverable: boolean
    retryable: boolean
    fieldErrors?: Record<string, string[]>
    metadata?: Record<string, unknown>
    context?: Record<string, unknown>
  }
  metadata?: {
    timestamp: Date
    requestId?: string
    duration?: number
  }
}

// Error metrics for monitoring
export interface ErrorMetrics {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  errorTrends: Array<{
    timestamp: Date
    category: ErrorCategory
    severity: ErrorSeverity
    count: number
  }>
  recoverySuccess: {
    attempted: number
    successful: number
    rate: number
  }
}

// Error configuration
export interface ErrorConfig {
  // Global settings
  defaultSeverity: ErrorSeverity
  defaultCategory: ErrorCategory
  defaultRecoveryStrategy: RecoveryStrategy

  // Notification thresholds
  userNotificationThreshold: ErrorSeverity
  adminNotificationThreshold: ErrorSeverity

  // Logging settings
  logThreshold: ErrorSeverity
  maxLogRetention: number // days

  // Recovery settings
  defaultMaxRetries: number
  defaultRetryDelay: number

  // Category-specific configurations
  categoryConfig: Partial<Record<ErrorCategory, {
    defaultSeverity: ErrorSeverity
    autoRetry: boolean
    maxRetries: number
    notifyUser: boolean
    notifyAdmin: boolean
  }>>
}

// Error handler interface
export interface IErrorHandler {
  handle(error: Error | ErrorData, options?: ErrorHandlingOptions): Promise<ErrorHandlingResult>
  createError(params: Partial<ErrorData>): ErrorData
  categorizeError(error: Error): { category: ErrorCategory; severity: ErrorSeverity }
  shouldRetry(errorData: ErrorData): boolean
  getRecoveryStrategy(errorData: ErrorData): RecoveryStrategy
  getMetrics(): Promise<ErrorMetrics>
}
