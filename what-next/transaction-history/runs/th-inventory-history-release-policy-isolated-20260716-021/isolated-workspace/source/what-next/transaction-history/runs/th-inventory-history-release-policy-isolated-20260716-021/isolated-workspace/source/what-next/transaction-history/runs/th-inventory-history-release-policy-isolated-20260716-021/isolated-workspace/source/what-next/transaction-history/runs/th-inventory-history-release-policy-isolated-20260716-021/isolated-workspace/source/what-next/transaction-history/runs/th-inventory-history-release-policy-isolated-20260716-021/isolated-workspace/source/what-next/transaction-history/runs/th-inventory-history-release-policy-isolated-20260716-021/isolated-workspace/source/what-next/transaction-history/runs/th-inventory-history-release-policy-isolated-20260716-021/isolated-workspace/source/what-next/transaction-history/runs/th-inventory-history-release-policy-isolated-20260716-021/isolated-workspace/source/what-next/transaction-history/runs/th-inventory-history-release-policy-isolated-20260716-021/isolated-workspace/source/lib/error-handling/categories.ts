/**
 * Error categorization and classification logic for StockFlow
 *
 * This module provides intelligent error classification based on error types,
 * messages, stack traces, and business context.
 */

import { ErrorCategory, ErrorSeverity, RecoveryStrategy } from './types'

const PRISMA_KNOWN_REQUEST_ERROR = 'PrismaClientKnownRequestError'
const PRISMA_VALIDATION_ERROR = 'PrismaClientValidationError'
const PRISMA_UNKNOWN_REQUEST_ERROR = 'PrismaClientUnknownRequestError'
const PRISMA_INITIALIZATION_ERROR = 'PrismaClientInitializationError'

type PrismaKnownRequestLike = Error & {
  code: string
  clientVersion?: string
  meta?: unknown
}

// Database error patterns
const DATABASE_ERROR_PATTERNS = {
  [PRISMA_KNOWN_REQUEST_ERROR]: {
    'P2002': { // Unique constraint violation
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      recovery: RecoveryStrategy.USER_ACTION
    },
    'P2025': { // Record not found
      category: ErrorCategory.BUSINESS_RULE,
      severity: ErrorSeverity.MEDIUM,
      recovery: RecoveryStrategy.USER_ACTION
    },
    'P2003': { // Foreign key constraint violation
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.HIGH,
      recovery: RecoveryStrategy.USER_ACTION
    },
    'P1008': { // Operations timed out
      category: ErrorCategory.PERFORMANCE,
      severity: ErrorSeverity.HIGH,
      recovery: RecoveryStrategy.RETRY
    },
    'P1001': { // Can't reach database server
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.CRITICAL,
      recovery: RecoveryStrategy.ADMIN_INTERVENTION
    }
  },
  [PRISMA_VALIDATION_ERROR]: {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    recovery: RecoveryStrategy.USER_ACTION
  },
  [PRISMA_UNKNOWN_REQUEST_ERROR]: {
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
    recovery: RecoveryStrategy.RETRY
  },
  [PRISMA_INITIALIZATION_ERROR]: {
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.CRITICAL,
    recovery: RecoveryStrategy.ADMIN_INTERVENTION
  }
} as const

// Network error patterns
const NETWORK_ERROR_PATTERNS = {
  'ECONNREFUSED': {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    recovery: RecoveryStrategy.RETRY
  },
  'ENOTFOUND': {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    recovery: RecoveryStrategy.RETRY
  },
  'ETIMEDOUT': {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    recovery: RecoveryStrategy.RETRY
  },
  'ECONNRESET': {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    recovery: RecoveryStrategy.RETRY
  }
} as const

// Validation error patterns
const VALIDATION_ERROR_PATTERNS = {
  'required': {
    category: ErrorCategory.USER_INPUT,
    severity: ErrorSeverity.LOW,
    recovery: RecoveryStrategy.USER_ACTION
  },
  'invalid': {
    category: ErrorCategory.FORM_VALIDATION,
    severity: ErrorSeverity.LOW,
    recovery: RecoveryStrategy.USER_ACTION
  },
  'minimum': {
    category: ErrorCategory.FORM_VALIDATION,
    severity: ErrorSeverity.LOW,
    recovery: RecoveryStrategy.USER_ACTION
  },
  'maximum': {
    category: ErrorCategory.FORM_VALIDATION,
    severity: ErrorSeverity.LOW,
    recovery: RecoveryStrategy.USER_ACTION
  }
} as const

// Authentication/Authorization patterns
const AUTH_ERROR_PATTERNS = {
  'unauthorized': {
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    recovery: RecoveryStrategy.USER_ACTION
  },
  'forbidden': {
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    recovery: RecoveryStrategy.USER_ACTION
  },
  'token': {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    recovery: RecoveryStrategy.USER_ACTION
  },
  'session': {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    recovery: RecoveryStrategy.USER_ACTION
  }
} as const

// StockFlow business domain patterns
const BUSINESS_DOMAIN_PATTERNS = {
  'inventory': {
    'insufficient stock': {
      category: ErrorCategory.INVENTORY,
      severity: ErrorSeverity.HIGH,
      recovery: RecoveryStrategy.USER_ACTION
    },
    'stock level': {
      category: ErrorCategory.INVENTORY,
      severity: ErrorSeverity.MEDIUM,
      recovery: RecoveryStrategy.USER_ACTION
    },
    'location not found': {
      category: ErrorCategory.INVENTORY,
      severity: ErrorSeverity.MEDIUM,
      recovery: RecoveryStrategy.USER_ACTION
    }
  },
  'sales': {
    'payment failed': {
      category: ErrorCategory.SALES,
      severity: ErrorSeverity.HIGH,
      recovery: RecoveryStrategy.USER_ACTION
    },
    'discount invalid': {
      category: ErrorCategory.SALES,
      severity: ErrorSeverity.MEDIUM,
      recovery: RecoveryStrategy.USER_ACTION
    },
    'customer not found': {
      category: ErrorCategory.SALES,
      severity: ErrorSeverity.MEDIUM,
      recovery: RecoveryStrategy.USER_ACTION
    }
  },
  'pos': {
    'cash drawer': {
      category: ErrorCategory.POS,
      severity: ErrorSeverity.HIGH,
      recovery: RecoveryStrategy.USER_ACTION
    },
    'receipt printing': {
      category: ErrorCategory.POS,
      severity: ErrorSeverity.MEDIUM,
      recovery: RecoveryStrategy.FALLBACK
    },
    'barcode scan': {
      category: ErrorCategory.POS,
      severity: ErrorSeverity.LOW,
      recovery: RecoveryStrategy.FALLBACK
    }
  },
  'financial': {
    'calculation error': {
      category: ErrorCategory.FINANCIAL,
      severity: ErrorSeverity.CRITICAL,
      recovery: RecoveryStrategy.ADMIN_INTERVENTION
    },
    'tax rate': {
      category: ErrorCategory.FINANCIAL,
      severity: ErrorSeverity.HIGH,
      recovery: RecoveryStrategy.USER_ACTION
    },
    'currency conversion': {
      category: ErrorCategory.FINANCIAL,
      severity: ErrorSeverity.MEDIUM,
      recovery: RecoveryStrategy.RETRY
    }
  }
} as const

function getRuntimeErrorName(error: Error): string {
  const explicitName = typeof error.name === 'string' ? error.name : ''
  const constructorName = typeof error.constructor?.name === 'string' ? error.constructor.name : ''

  if (explicitName && explicitName !== 'Error') {
    return explicitName
  }

  return constructorName || explicitName || 'Error'
}

function isPrismaKnownRequestError(error: Error): error is PrismaKnownRequestLike {
  const maybePrismaError = error as Partial<PrismaKnownRequestLike>
  const errorName = getRuntimeErrorName(error)

  return (
    errorName === PRISMA_KNOWN_REQUEST_ERROR ||
    (typeof maybePrismaError.code === 'string' &&
      /^P\d{4}$/.test(maybePrismaError.code) &&
      typeof maybePrismaError.clientVersion === 'string')
  )
}

function isKnownPrismaErrorName(errorName: string): errorName is keyof typeof DATABASE_ERROR_PATTERNS {
  return errorName in DATABASE_ERROR_PATTERNS
}

/**
 * Categorizes an error based on its type, message, and context
 */
export function categorizeError(error: Error): {
  category: ErrorCategory
  severity: ErrorSeverity
  recovery: RecoveryStrategy
} {
  const errorName = getRuntimeErrorName(error)
  const errorMessage = error.message.toLowerCase()

  // Check for Prisma database errors first
  if (isPrismaKnownRequestError(error)) {
    const knownRequestPatterns = DATABASE_ERROR_PATTERNS[PRISMA_KNOWN_REQUEST_ERROR]
    const errorInfo = knownRequestPatterns[error.code as keyof typeof knownRequestPatterns]
    if (errorInfo) {
      return errorInfo
    }

    return {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      recovery: RecoveryStrategy.RETRY
    }
  }

  // Check for other Prisma errors
  if (isKnownPrismaErrorName(errorName)) {
    const errorInfo = DATABASE_ERROR_PATTERNS[errorName]
    if (typeof errorInfo === 'object' && 'category' in errorInfo) {
      return errorInfo
    }
  }

  // Check for network errors
  for (const [pattern, config] of Object.entries(NETWORK_ERROR_PATTERNS)) {
    if (errorMessage.includes(pattern.toLowerCase()) || error.name.includes(pattern)) {
      return config
    }
  }

  // Check for authentication/authorization errors
  for (const [pattern, config] of Object.entries(AUTH_ERROR_PATTERNS)) {
    if (errorMessage.includes(pattern)) {
      return config
    }
  }

  // Check for validation errors
  for (const [pattern, config] of Object.entries(VALIDATION_ERROR_PATTERNS)) {
    if (errorMessage.includes(pattern)) {
      return config
    }
  }

  // Check for business domain specific errors
  for (const [domain, patterns] of Object.entries(BUSINESS_DOMAIN_PATTERNS)) {
    for (const [pattern, config] of Object.entries(patterns)) {
      if (errorMessage.includes(pattern)) {
        return config
      }
    }
  }

  // Check for specific error types by name
  switch (errorName) {
    case 'ValidationError':
    case 'ZodError':
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        recovery: RecoveryStrategy.USER_ACTION
      }

    case 'TypeError':
    case 'ReferenceError':
      return {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
        recovery: RecoveryStrategy.ADMIN_INTERVENTION
      }

    case 'SyntaxError':
      return {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        recovery: RecoveryStrategy.ADMIN_INTERVENTION
      }

    case 'Error':
    default:
      // Analyze the error message for additional clues
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return {
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          recovery: RecoveryStrategy.RETRY
        }
      }

      if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        return {
          category: ErrorCategory.AUTHORIZATION,
          severity: ErrorSeverity.HIGH,
          recovery: RecoveryStrategy.USER_ACTION
        }
      }

      if (errorMessage.includes('not found') || errorMessage.includes('missing')) {
        return {
          category: ErrorCategory.BUSINESS_RULE,
          severity: ErrorSeverity.MEDIUM,
          recovery: RecoveryStrategy.USER_ACTION
        }
      }

      // Default fallback
      return {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        recovery: RecoveryStrategy.NONE
      }
  }
}

/**
 * Determines if an error should be retried based on its category and characteristics
 */
export function shouldRetry(error: Error, attemptCount: number = 0, maxRetries: number = 3): boolean {
  if (attemptCount >= maxRetries) return false

  const { category, recovery } = categorizeError(error)

  // Errors that should be retried
  const retryableCategories = [
    ErrorCategory.NETWORK,
    ErrorCategory.EXTERNAL_SERVICE,
    ErrorCategory.EXTERNAL,
    ErrorCategory.PERFORMANCE,
    ErrorCategory.DATABASE
  ]

  if (retryableCategories.includes(category)) {
    return true
  }

  if (recovery === RecoveryStrategy.RETRY) {
    return true
  }

  // Specific retry conditions for database errors
  if (isPrismaKnownRequestError(error)) {
    const retryCodes = ['P1008', 'P1017'] // Timeout and connection errors
    return retryCodes.includes(error.code)
  }

  return false
}

/**
 * Gets appropriate user-friendly messages for different error categories
 */
export function getUserMessage(error: Error, category: ErrorCategory): string {
  const errorMessage = error.message.toLowerCase()

  switch (category) {
    case ErrorCategory.VALIDATION:
    case ErrorCategory.USER_INPUT:
    case ErrorCategory.FORM_VALIDATION:
      return 'Please check your input and try again.'

    case ErrorCategory.AUTHORIZATION:
      return "You don't have permission to perform this action."

    case ErrorCategory.AUTHENTICATION:
      return 'Please log in again to continue.'

    case ErrorCategory.INVENTORY:
      if (errorMessage.includes('insufficient stock')) {
        return 'Insufficient stock available for this operation.'
      }
      return 'There was an issue with inventory management. Please try again.'

    case ErrorCategory.SALES:
      if (errorMessage.includes('payment')) {
        return 'Payment processing failed. Please try a different payment method.'
      }
      return 'There was an issue processing your sale. Please try again.'

    case ErrorCategory.POS:
      return 'There was an issue with the POS system. Please contact support if this continues.'

    case ErrorCategory.FINANCIAL:
      return 'There was an issue with financial calculations. Please contact support.'

    case ErrorCategory.DATABASE:
      return 'We are experiencing temporary technical difficulties. Please try again in a moment.'

    case ErrorCategory.NETWORK:
    case ErrorCategory.EXTERNAL_SERVICE:
    case ErrorCategory.EXTERNAL:
      return 'Network connectivity issue. Please check your connection and try again.'

    case ErrorCategory.SYSTEM:
    case ErrorCategory.CONFIGURATION:
      return 'A system error occurred. Our team has been notified.'

    default:
      return 'An unexpected error occurred. Please try again or contact support.'
  }
}

/**
 * Determines the appropriate error code for categorized errors
 */
export function getErrorCode(error: Error, category: ErrorCategory): string {
  // Use Prisma error codes directly
  if (isPrismaKnownRequestError(error)) {
    return `DB_${error.code}`
  }

  // Generate semantic error codes based on category
  const categoryPrefixes = {
    [ErrorCategory.VALIDATION]: 'VALIDATION',
    [ErrorCategory.BUSINESS_RULE]: 'BUSINESS',
    [ErrorCategory.AUTHORIZATION]: 'AUTH',
    [ErrorCategory.AUTHENTICATION]: 'AUTH',
    [ErrorCategory.DATABASE]: 'DB',
    [ErrorCategory.NETWORK]: 'NETWORK',
    [ErrorCategory.EXTERNAL_SERVICE]: 'EXTERNAL',
    [ErrorCategory.EXTERNAL]: 'EXTERNAL',
    [ErrorCategory.FILE_SYSTEM]: 'FILE',
    [ErrorCategory.USER_INPUT]: 'INPUT',
    [ErrorCategory.FORM_VALIDATION]: 'FORM',
    [ErrorCategory.SYSTEM]: 'SYSTEM',
    [ErrorCategory.CONFIGURATION]: 'CONFIG',
    [ErrorCategory.PERFORMANCE]: 'PERF',
    [ErrorCategory.INVENTORY]: 'INV',
    [ErrorCategory.SALES]: 'SALES',
    [ErrorCategory.PURCHASE]: 'PURCHASE',
    [ErrorCategory.ACCOUNTING]: 'ACCOUNTING',
    [ErrorCategory.PAYMENT]: 'PAYMENT',
    [ErrorCategory.PAYROLL]: 'PAYROLL',
    [ErrorCategory.COMPLIANCE]: 'COMPLIANCE',
    [ErrorCategory.FINANCIAL]: 'FINANCIAL',
    [ErrorCategory.POS]: 'POS',
    [ErrorCategory.REPORTING]: 'REPORT'
  }

  const prefix = categoryPrefixes[category] || 'UNKNOWN'

  // Generate a hash-based suffix for uniqueness
  const suffix = Math.abs(hashString(error.message)).toString().slice(0, 4)

  return `${prefix}_${suffix}`
}

/**
 * Simple hash function for generating consistent error code suffixes
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}
