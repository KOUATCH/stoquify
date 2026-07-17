# Enterprise Error Handling System

## Description
A comprehensive skill for implementing enterprise-grade error handling systems in TypeScript/Next.js applications. Provides structured approaches for building watertight, professional error management with proper classification, monitoring, and recovery mechanisms.

## Trigger
Use this skill when implementing or refactoring error handling systems, especially in enterprise applications requiring high reliability, financial transaction safety, and comprehensive error tracking.

## Core Principles

### 1. Error Classification Framework
- **Categorize errors systematically** by domain (database, validation, auth, financial)
- **Assign severity levels** (low, medium, high, critical)
- **Map errors to recovery strategies** and user notifications
- **Maintain error taxonomies** for consistent handling across the application

### 2. Defense in Depth Strategy
- **Multiple error boundaries** at different application layers
- **Graceful degradation patterns** when systems fail
- **Circuit breakers** for external service dependencies
- **Retry logic with exponential backoff** for transient failures

### 3. Financial Transaction Safety
- **Atomic operations** for all financial transactions
- **Compensating transactions** for rollback scenarios
- **Audit trails** for all financial operations
- **Reconciliation mechanisms** for detecting discrepancies

### 4. Observability and Monitoring
- **Structured logging** with correlation IDs
- **Real-time error tracking** with configurable alerting
- **Error rate monitoring** with threshold-based notifications
- **Performance error detection** for degraded user experience

## Implementation Strategy

### Phase 1: Foundation Layer (Week 1-2)
1. **Error Type System** - Define comprehensive error categories and severity levels
2. **Centralized Handler** - Implement unified error processing and response
3. **Classification System** - Map errors to appropriate categories and actions
4. **Basic Logging** - Structured error logging with context

### Phase 2: Database & Transaction Safety (Week 2-3)
1. **Resilient Operations** - Retry logic, deadlock handling, connection management
2. **Transaction Safety** - Atomic operations with proper rollback mechanisms
3. **Financial Safety** - Compensating transactions for financial operations
4. **Performance Monitoring** - Database operation error tracking

### Phase 3: API & Client Safety (Week 3-4)
1. **API Middleware** - Centralized error handling for all API routes
2. **Circuit Breakers** - External service failure protection
3. **Rate Limiting** - Error-based rate limiting and protection
4. **Client Integration** - Error boundaries and graceful degradation

### Phase 4: Monitoring & Observability (Week 4-5)
1. **Error Analytics** - Comprehensive error tracking and analysis
2. **Alerting System** - Threshold-based monitoring and notifications
3. **Performance Tracking** - Error impact on system performance
4. **User Impact Analysis** - Error effects on user experience

### Phase 5: Integration & Testing (Week 5-6)
1. **Testing Framework** - Comprehensive error scenario testing
2. **Documentation** - Error handling guides and runbooks
3. **Team Training** - Error handling best practices
4. **Production Deployment** - Gradual rollout with monitoring

## Key Implementation Patterns

### Error Type Definitions
```typescript
enum ErrorCategory {
  DATABASE = 'database',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_API = 'external_api',
  FINANCIAL = 'financial',
  INVENTORY = 'inventory',
  NETWORK = 'network'
}

enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface ErrorContext {
  correlationId: string
  userId?: string
  sessionId?: string
  operation: string
  metadata?: Record<string, unknown>
}

class ApplicationError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public severity: ErrorSeverity,
    public context: ErrorContext,
    public recoverable: boolean = false
  ) {
    super(message)
    this.name = this.constructor.name
  }
}
```

### Centralized Error Handler
```typescript
export class ErrorHandler {
  static handle(error: unknown, context: ErrorContext): ErrorResponse {
    // 1. Normalize error to ApplicationError
    const appError = this.normalizeError(error, context)

    // 2. Log error with structured data
    this.logError(appError)

    // 3. Notify monitoring systems if critical
    if (appError.severity === ErrorSeverity.CRITICAL) {
      this.notifyMonitoring(appError)
    }

    // 4. Attempt recovery if possible
    if (appError.recoverable) {
      return this.attemptRecovery(appError)
    }

    // 5. Return user-friendly error response
    return this.createUserResponse(appError)
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: () => T
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const response = this.handle(error, context)
      if (fallback && response.canFallback) {
        return fallback()
      }
      throw new ApplicationError(
        response.message,
        response.category,
        response.severity,
        context
      )
    }
  }
}
```

### Database Resilience
```typescript
export class ResilientDatabase {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // Don't retry non-retryable errors
        if (!this.isRetryableError(error)) {
          throw error
        }

        // Exponential backoff with jitter
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
          await this.sleep(delay)
        }
      }
    }

    throw new ApplicationError(
      `Operation failed after ${maxRetries} attempts`,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      { correlationId: generateId(), operation: 'database_retry' }
    )
  }

  static async withTransaction<T>(
    operations: (tx: any) => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    return ErrorHandler.withErrorHandling(
      () => db.$transaction(operations, {
        maxWait: 10000,
        timeout: 20000,
      }),
      { ...context, operation: 'database_transaction' }
    )
  }
}
```

### Financial Transaction Safety
```typescript
export class FinancialTransactionManager {
  static async executeAtomicTransaction(
    operations: FinancialOperation[],
    context: ErrorContext
  ): Promise<TransactionResult> {
    const compensations: CompensatingAction[] = []

    try {
      return await db.$transaction(async (tx) => {
        let result: TransactionResult = { success: true, operations: [] }

        for (const operation of operations) {
          try {
            const opResult = await this.executeOperation(tx, operation)
            result.operations.push(opResult)

            // Store compensation action for rollback
            compensations.push(this.createCompensation(operation, opResult))

          } catch (error) {
            // Execute compensations in reverse order
            await this.executeCompensations(tx, compensations.reverse())
            throw new ApplicationError(
              `Financial operation failed: ${operation.type}`,
              ErrorCategory.FINANCIAL,
              ErrorSeverity.CRITICAL,
              context
            )
          }
        }

        return result
      })
    } catch (error) {
      // Log financial error with high priority
      this.logFinancialError(error, context, operations)
      throw error
    }
  }
}
```

### API Error Middleware
```typescript
export function withAPIErrorHandling(handler: any): any {
  return async (req: any, res: any) => {
    const correlationId = req.headers['x-correlation-id'] as string || generateId()
    const context: ErrorContext = {
      correlationId,
      operation: `${req.method} ${req.url}`,
      userId: req.user?.id,
      metadata: { userAgent: req.headers['user-agent'] }
    }

    try {
      await handler(req, res)
    } catch (error) {
      const errorResponse = ErrorHandler.handle(error, context)

      // Map to appropriate HTTP status
      const statusCode = this.mapToHTTPStatus(errorResponse)

      res.status(statusCode).json({
        error: {
          message: errorResponse.message,
          code: errorResponse.code,
          correlationId,
          ...(process.env.NODE_ENV === 'development' && { details: errorResponse.details })
        }
      })
    }
  }
}
```

### React Error Boundaries
```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error to monitoring system
    ErrorHandler.handle(error, {
      correlationId: generateId(),
      operation: 'react_error_boundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name
      }
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false })}
        />
      )
    }

    return this.props.children
  }
}
```

## Usage Instructions

### Quick Start
1. **Assess Current State** - Analyze existing error handling patterns in the codebase
2. **Create Foundation** - Implement error types, categories, and centralized handler
3. **Identify Critical Paths** - Focus on financial, authentication, and data integrity operations
4. **Implement Gradually** - Start with one module/feature and expand systematically
5. **Monitor and Iterate** - Track error rates and adjust thresholds and handling

### Integration Checklist
- [ ] Define error categories specific to your domain
- [ ] Implement centralized ErrorHandler class
- [ ] Add database resilience patterns
- [ ] Create API error middleware
- [ ] Set up error monitoring and alerting
- [ ] Add React error boundaries
- [ ] Write comprehensive error tests
- [ ] Document error codes and recovery procedures
- [ ] Configure production monitoring

### Best Practices
- **Start Small** - Begin with one critical path and expand gradually
- **Test Error Scenarios** - Comprehensive testing of failure conditions
- **User-Friendly Messages** - Clear, actionable error messages for users
- **Security Conscious** - Avoid exposing sensitive information in errors
- **Performance Aware** - Minimize overhead of error handling code
- **Monitoring Integration** - Connect to existing logging and monitoring systems

### Common Integration Points
- **Existing Notification Systems** - Leverage current toast/alert systems
- **Database Operations** - Wrap Prisma/database calls with resilient patterns
- **API Routes** - Apply error middleware to all API endpoints
- **React Components** - Add error boundaries at strategic component levels
- **External Services** - Implement circuit breakers for third-party integrations

## Expected Outcomes

### Immediate Benefits (Week 1-2)
- Consistent error handling across the application
- Better debugging with structured logging and correlation IDs
- Improved user experience with meaningful error messages
- Foundation for advanced error handling patterns

### Short-term Benefits (Month 1)
- Resilient database operations with retry and transaction safety
- Financial transaction safety with atomic operations
- Comprehensive error monitoring and alerting
- Reduced production incidents and faster recovery

### Long-term Benefits (Month 2+)
- Enterprise-grade reliability and uptime
- Proactive error detection and prevention
- Comprehensive error analytics and insights
- Team confidence in system reliability

This skill transforms basic error handling into a comprehensive, enterprise-grade system that provides watertight reliability, excellent observability, and superior user experience—essential for professional retail management platforms.