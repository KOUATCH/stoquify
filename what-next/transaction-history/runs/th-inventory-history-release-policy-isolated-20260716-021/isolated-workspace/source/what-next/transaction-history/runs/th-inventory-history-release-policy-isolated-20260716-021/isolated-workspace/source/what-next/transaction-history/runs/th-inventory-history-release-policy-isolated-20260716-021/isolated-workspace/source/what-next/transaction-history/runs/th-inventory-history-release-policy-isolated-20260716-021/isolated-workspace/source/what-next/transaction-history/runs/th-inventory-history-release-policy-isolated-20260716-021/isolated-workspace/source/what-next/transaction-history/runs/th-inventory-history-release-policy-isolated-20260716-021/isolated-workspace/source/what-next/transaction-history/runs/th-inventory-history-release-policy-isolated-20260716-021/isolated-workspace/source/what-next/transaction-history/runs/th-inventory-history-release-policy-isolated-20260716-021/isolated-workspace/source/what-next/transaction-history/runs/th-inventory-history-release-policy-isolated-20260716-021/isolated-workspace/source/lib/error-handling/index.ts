/**
 * Enterprise Error Handling System for StockFlow
 *
 * Comprehensive error handling ecosystem providing:
 * - Error classification and centralized handling
 * - Database resilience and transaction safety
 * - Financial transaction safety with compensation patterns
 * - Advanced monitoring and alerting
 * - Circuit breaker patterns for external services
 */

// Re-export all core components
export * from './types'
export * from './categories'
export * from './canonical'
export * from './error-handler'
export * from './route-response'
export * from './server-action-wrapper'
export * from './client-error-boundary'
export * from './hooks'
export * from './notification-integration'
export * from './setup'

// Re-export advanced components
export * from './database-resilience'
export * from './financial-safety'
export * from './monitoring'
export * from './circuit-breaker'

// Default export for convenience
export { ErrorHandler } from './error-handler'

// Main entry points for common usage patterns
export { errorHandler } from './error-handler'
export { stockFlowErrorHandling, initializeErrorHandling } from './setup'

// Pre-configured action wrappers
export {
  stockFlowAction,
  inventoryAction,
  salesAction,
  financialAction,
  posAction
} from './server-action-wrapper'

// Error boundary components
export {
  ErrorBoundary,
  InventoryErrorBoundary,
  POSErrorBoundary,
  FinancialErrorBoundary,
  withErrorBoundary
} from './client-error-boundary'

// React hooks
export {
  useServerActionHandler,
  useFormErrorHandler,
  useErrorRecovery,
  useErrorMonitoring
} from './hooks'

// Advanced pattern exports
export {
  resilientDb,
  dbOperation,
  dbTransaction
} from './database-resilience'

export {
  financialSafety,
  executeFinancialOperation,
  FinancialTransactionType,
  FinancialAccountType
} from './financial-safety'

export {
  systemMonitor,
  startSystemMonitoring,
  getSystemHealth,
  createAlert,
  AlertType,
  AlertSeverity,
  HealthStatus
} from './monitoring'

export {
  circuitBreakerManager,
  createCircuitBreaker,
  executeWithCircuitBreaker,
  ServiceType,
  CircuitState
} from './circuit-breaker'
