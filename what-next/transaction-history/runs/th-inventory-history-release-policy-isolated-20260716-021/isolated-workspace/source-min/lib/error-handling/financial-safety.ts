/**
 * Advanced Financial Transaction Safety for StockFlow
 *
 * Provides comprehensive financial operation safety including:
 * - ACID transaction guarantees
 * - Compensating transaction patterns (Saga pattern)
 * - Financial audit trails
 * - Double-entry bookkeeping validation
 * - Currency precision handling
 * - Idempotency guarantees
 * - Financial reconciliation checks
 */

import { Prisma, PrismaClient } from '@prisma/client'
import { errorHandler } from './error-handler'
import { resilientDb } from './database-resilience'
import { ErrorCategory, ErrorSeverity, RecoveryStrategy } from './types'
import { v4 as uuidv4 } from 'uuid'

// Financial operation configuration
export interface FinancialConfig {
  enableAuditTrail: boolean
  enableDoubleEntry: boolean
  enableIdempotency: boolean
  currencyPrecision: number
  maxTransactionAmount: number
  requireApprovalThreshold: number
  reconciliationTolerance: number
  financialTimeoutMs: number
}

const DEFAULT_FINANCIAL_CONFIG: FinancialConfig = {
  enableAuditTrail: true,
  enableDoubleEntry: true,
  enableIdempotency: true,
  currencyPrecision: 2,
  maxTransactionAmount: 1000000, // $10,000 default limit
  requireApprovalThreshold: 50000, // $500 approval threshold
  reconciliationTolerance: 0.01, // 1 cent tolerance
  financialTimeoutMs: 60000 // 60 second timeout for financial operations
}

// Financial transaction types
export enum FinancialTransactionType {
  SALE = 'SALE',
  REFUND = 'REFUND',
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL'
}

// Financial account types
export enum FinancialAccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

// Financial transaction data
export interface FinancialTransactionData {
  id?: string
  type: FinancialTransactionType
  amount: number
  currency: string
  reference: string
  description: string
  organizationId: string
  userId: string
  customerId?: string
  orderId?: string
  sessionId?: string
  locationId?: string
  metadata?: Record<string, unknown>
}

// Double-entry journal entry
export interface JournalEntry {
  accountCode: string
  accountType: FinancialAccountType
  debitAmount: number
  creditAmount: number
  description: string
  reference: string
}

// Financial saga step
export interface FinancialSagaStep {
  stepId: string
  operation: () => Promise<any>
  compensation: () => Promise<void>
  description: string
  timeout?: number
}

// Financial audit trail entry
export interface FinancialAuditEntry {
  id: string
  timestamp: Date
  transactionId: string
  operationType: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  userId: string
  organizationId: string
  metadata: Record<string, unknown>
}

/**
 * Financial Transaction Safety Manager
 * Implements enterprise-grade financial transaction patterns
 */
export class FinancialSafety {
  private static instance: FinancialSafety
  private config: FinancialConfig
  private auditLog: FinancialAuditEntry[] = []
  private idempotencyKeys: Set<string> = new Set()

  constructor(config: Partial<FinancialConfig> = {}) {
    this.config = { ...DEFAULT_FINANCIAL_CONFIG, ...config }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<FinancialConfig>): FinancialSafety {
    if (!FinancialSafety.instance) {
      FinancialSafety.instance = new FinancialSafety(config)
    }
    return FinancialSafety.instance
  }

  /**
   * Execute financial transaction with comprehensive safety checks
   */
  async executeFinancialTransaction<T>(
    transactionData: FinancialTransactionData,
    operation: (tx: Prisma.TransactionClient, transactionId: string) => Promise<T>,
    options: {
      idempotencyKey?: string
      journalEntries?: JournalEntry[]
      preValidation?: () => Promise<void>
      postValidation?: (result: T) => Promise<void>
      compensatingActions?: Array<() => Promise<void>>
    } = {}
  ): Promise<T> {
    // Generate unique transaction ID
    const transactionId = transactionData.id || uuidv4()

    try {
      // 1. Idempotency check
      if (options.idempotencyKey) {
        await this.checkIdempotency(options.idempotencyKey, transactionId, transactionData.organizationId)
      }

      // 2. Pre-transaction validation
      await this.validateFinancialTransaction(transactionData)
      if (options.preValidation) {
        await options.preValidation()
      }

      // 3. Execute transaction with audit trail
      const result = await resilientDb.withTransaction(
        async (tx) => {
          // Record transaction start
          await this.recordAuditEntry(tx, {
            id: uuidv4(),
            timestamp: new Date(),
            transactionId,
            operationType: `${transactionData.type}_START`,
            amount: transactionData.amount,
            balanceBefore: 0, // Will be populated with actual balance
            balanceAfter: 0, // Will be populated with actual balance
            userId: transactionData.userId,
            organizationId: transactionData.organizationId,
            metadata: transactionData.metadata || {}
          })

          // Execute the main operation
          const operationResult = await operation(tx, transactionId)

          // Create double-entry journal entries if enabled
          if (this.config.enableDoubleEntry && options.journalEntries?.length) {
            await this.createJournalEntries(tx, options.journalEntries, transactionId, {
              organizationId: transactionData.organizationId,
              userId: transactionData.userId
            })
          }

          // Record transaction completion
          await this.recordAuditEntry(tx, {
            id: uuidv4(),
            timestamp: new Date(),
            transactionId,
            operationType: `${transactionData.type}_COMPLETE`,
            amount: transactionData.amount,
            balanceBefore: 0,
            balanceAfter: 0,
            userId: transactionData.userId,
            organizationId: transactionData.organizationId,
            metadata: { result: operationResult, ...transactionData.metadata }
          })

          return operationResult
        },
        {
          operationName: `financial_transaction_${transactionData.type}`,
          organizationId: transactionData.organizationId,
          userId: transactionData.userId,
          businessContext: {
            transactionType: transactionData.type,
            amount: transactionData.amount,
            currency: transactionData.currency,
            reference: transactionData.reference
          },
          compensatingActions: options.compensatingActions
        }
      )

      // 4. Post-transaction validation
      if (options.postValidation) {
        await options.postValidation(result)
      }

      // 5. Mark idempotency key as used
      if (options.idempotencyKey) {
        this.idempotencyKeys.add(options.idempotencyKey)
      }

      return result

    } catch (error) {
      await this.handleFinancialError(error as Error, transactionData, transactionId)
      throw error
    }
  }

  /**
   * Execute financial saga (distributed transaction pattern)
   */
  async executeFinancialSaga(
    sagaId: string,
    steps: FinancialSagaStep[],
    context: {
      organizationId: string
      userId: string
      businessContext?: Record<string, unknown>
    }
  ): Promise<any[]> {
    const results: any[] = []
    const completedSteps: FinancialSagaStep[] = []

    try {
      // Execute each step in sequence
      for (const step of steps) {
        const stepResult = await this.executeFinancialSagaStep(step, context)
        results.push(stepResult)
        completedSteps.push(step)
      }

      return results

    } catch (error) {
      // Execute compensating actions in reverse order
      await this.executeCompensatingActions(completedSteps.reverse(), context, sagaId)
      throw error
    }
  }

  /**
   * Reconcile financial balances with tolerance check
   */
  async reconcileFinancialBalances(
    expectedBalance: number,
    actualBalance: number,
    accountCode: string,
    context: {
      organizationId: string
      userId: string
      reference?: string
    }
  ): Promise<{
    isReconciled: boolean
    variance: number
    requiresAttention: boolean
  }> {
    const variance = Math.abs(expectedBalance - actualBalance)
    const isReconciled = variance <= this.config.reconciliationTolerance

    if (!isReconciled) {
      await errorHandler.handle(
        errorHandler.createError({
          category: ErrorCategory.FINANCIAL,
          severity: variance > 1.00 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
          code: 'FINANCIAL_RECONCILIATION_VARIANCE',
          message: `Financial reconciliation variance detected: ${variance}`,
          userMessage: 'Account balances do not match. Please review transactions.',
          recoveryStrategy: RecoveryStrategy.ADMIN_INTERVENTION,
          businessContext: {
            accountCode,
            expectedBalance,
            actualBalance,
            variance,
            ...context
          },
          shouldNotifyUser: variance > 1.00,
          shouldNotifyAdmin: true
        }),
        {
          businessImpact: variance > 10.00 ? 'high' : 'medium'
        }
      )
    }

    return {
      isReconciled,
      variance,
      requiresAttention: !isReconciled
    }
  }

  /**
   * Validate currency amounts with precision handling
   */
  validateCurrencyAmount(
    amount: number,
    currency: string = 'USD'
  ): {
    isValid: boolean
    normalizedAmount: number
    errors: string[]
  } {
    const errors: string[] = []
    let normalizedAmount = amount

    // Check for valid number
    if (!Number.isFinite(amount)) {
      errors.push('Amount must be a valid number')
    }

    // Check for negative amounts in sales contexts
    if (amount < 0) {
      errors.push('Amount cannot be negative for this operation')
    }

    // Check maximum transaction limit
    if (amount > this.config.maxTransactionAmount) {
      errors.push(`Amount exceeds maximum transaction limit of ${this.config.maxTransactionAmount}`)
    }

    // Normalize to currency precision
    normalizedAmount = this.roundToCurrencyPrecision(amount)

    // Check for precision loss
    if (Math.abs(normalizedAmount - amount) > Number.EPSILON) {
      errors.push(`Amount precision adjusted to ${this.config.currencyPrecision} decimal places`)
    }

    return {
      isValid: errors.length === 0,
      normalizedAmount,
      errors
    }
  }

  /**
   * Get financial audit trail for a transaction
   */
  async getAuditTrail(
    transactionId: string,
    organizationId: string
  ): Promise<FinancialAuditEntry[]> {
    return resilientDb.withResilience(
      async (db) => {
        const financialAuditDelegate = (db as any).financialAuditLog

        if (financialAuditDelegate?.findMany) {
          const auditEntries = await financialAuditDelegate.findMany({
            where: {
              transactionId,
              organizationId
            },
            orderBy: { timestamp: 'asc' }
          })

          return auditEntries.map((entry: any) => ({
            id: entry.id,
            timestamp: entry.timestamp,
            transactionId: entry.transactionId,
            operationType: entry.operationType,
            amount: Number(entry.amount),
            balanceBefore: Number(entry.balanceBefore),
            balanceAfter: Number(entry.balanceAfter),
            userId: entry.userId,
            organizationId: entry.organizationId,
            metadata: entry.metadata as Record<string, unknown>
          }))
        }

        const auditEntries = await db.auditLog.findMany({
          where: {
            entityType: 'FinancialTransaction',
            entityId: transactionId,
            organizationId
          },
          orderBy: { createdAt: 'asc' }
        })

        return auditEntries.map(entry => {
          const changes = entry.changes as Record<string, any> | null

          return {
            id: entry.id,
            timestamp: entry.createdAt,
            transactionId,
            operationType: entry.action,
            amount: Number(changes?.amount || 0),
            balanceBefore: Number(changes?.balanceBefore || 0),
            balanceAfter: Number(changes?.balanceAfter || 0),
            userId: entry.userId || '',
            organizationId: entry.organizationId,
            metadata: (changes?.metadata || {}) as Record<string, unknown>
          }
        })
      },
      {
        operationName: 'get_financial_audit_trail',
        organizationId,
        businessContext: { transactionId }
      }
    )
  }

  // Private helper methods

  private async validateFinancialTransaction(
    transactionData: FinancialTransactionData
  ): Promise<void> {
    const validation = this.validateCurrencyAmount(transactionData.amount)

    if (!validation.isValid) {
      throw new Error(`Financial validation failed: ${validation.errors.join(', ')}`)
    }

    // Check approval requirements
    if (transactionData.amount > this.config.requireApprovalThreshold) {
      throw new Error('Transaction exceeds approval threshold and requires manager approval')
    }
  }

  private async checkIdempotency(
    idempotencyKey: string,
    transactionId: string,
    organizationId: string
  ): Promise<void> {
    if (this.idempotencyKeys.has(idempotencyKey)) {
      throw new Error(`Transaction with idempotency key ${idempotencyKey} already processed`)
    }

    // Check the schema-backed payment table for existing financial operations.
    const existingTransaction = await resilientDb.withResilience(
      async (db) => {
        return db.payment.findFirst({
          where: {
            organizationId,
            idempotencyKey
          },
          select: { id: true, paymentNumber: true }
        })
      },
      {
        operationName: 'check_idempotency',
        organizationId,
        businessContext: { idempotencyKey, transactionId }
      }
    )

    if (existingTransaction) {
      throw new Error(`Transaction with idempotency key ${idempotencyKey} already exists`)
    }
  }

  private async recordAuditEntry(
    tx: Prisma.TransactionClient,
    entry: FinancialAuditEntry
  ): Promise<void> {
    if (!this.config.enableAuditTrail) return

    const financialAuditDelegate = (tx as any).financialAuditLog

    if (financialAuditDelegate?.create) {
      await financialAuditDelegate.create({
        data: {
          id: entry.id,
          timestamp: entry.timestamp,
          transactionId: entry.transactionId,
          operationType: entry.operationType,
          amount: entry.amount,
          balanceBefore: entry.balanceBefore,
          balanceAfter: entry.balanceAfter,
          userId: entry.userId,
          organizationId: entry.organizationId,
          metadata: entry.metadata
        }
      })
      return
    }

    await tx.auditLog.create({
      data: {
        id: entry.id,
        entityType: 'FinancialTransaction',
        entityId: entry.transactionId,
        action: entry.operationType,
        changes: {
          amount: entry.amount,
          balanceBefore: entry.balanceBefore,
          balanceAfter: entry.balanceAfter,
          metadata: entry.metadata
        } as Prisma.InputJsonValue,
        userId: entry.userId,
        organizationId: entry.organizationId,
        createdAt: entry.timestamp
      }
    })
  }

  private async createJournalEntries(
    tx: Prisma.TransactionClient,
    entries: JournalEntry[],
    transactionId: string,
    context: {
      organizationId: string
      userId: string
    }
  ): Promise<void> {
    // Validate double-entry balancing
    const totalDebits = entries.reduce((sum, entry) => sum + entry.debitAmount, 0)
    const totalCredits = entries.reduce((sum, entry) => sum + entry.creditAmount, 0)

    if (Math.abs(totalDebits - totalCredits) > this.config.reconciliationTolerance) {
      throw new Error(`Journal entries are not balanced: Debits ${totalDebits}, Credits ${totalCredits}`)
    }

    const journalEntryDelegate = (tx as any).journalEntry

    // Create journal entries if the schema has a dedicated ledger delegate.
    for (const entry of entries) {
      if (journalEntryDelegate?.create) {
        await journalEntryDelegate.create({
          data: {
            transactionId,
            accountCode: entry.accountCode,
            accountType: entry.accountType,
            debitAmount: entry.debitAmount,
            creditAmount: entry.creditAmount,
            description: entry.description,
            reference: entry.reference,
            createdAt: new Date()
          }
        })
      } else {
        await tx.auditLog.create({
          data: {
            id: uuidv4(),
            entityType: 'FinancialJournalEntry',
            entityId: transactionId,
            action: 'JOURNAL_ENTRY_RECORDED',
            changes: {
              accountCode: entry.accountCode,
              accountType: entry.accountType,
              debitAmount: entry.debitAmount,
              creditAmount: entry.creditAmount,
              description: entry.description,
              reference: entry.reference
            } as Prisma.InputJsonValue,
            userId: context.userId,
            organizationId: context.organizationId,
            createdAt: new Date()
          }
        })
      }
    }
  }

  private async executeFinancialSagaStep(
    step: FinancialSagaStep,
    context: any
  ): Promise<any> {
    const timeout = step.timeout || this.config.financialTimeoutMs

    try {
      // Execute step with timeout
      const result = await Promise.race([
        step.operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Saga step ${step.stepId} timed out`)), timeout)
        )
      ])

      return result

    } catch (error) {
      await errorHandler.handle(error as Error, {
        notifyAdmin: true,
        businessImpact: 'high',
        includeStackTrace: true
      })

      throw error
    }
  }

  private async executeCompensatingActions(
    completedSteps: FinancialSagaStep[],
    context: any,
    sagaId: string
  ): Promise<void> {
    for (const step of completedSteps) {
      try {
        await step.compensation()
      } catch (compensationError) {
        await errorHandler.handle(compensationError as Error, {
          notifyAdmin: true,
          businessImpact: 'critical',
          includeStackTrace: true
        })

        // Log compensation failure but continue with remaining compensations
        console.error(`Compensation failed for saga ${sagaId}, step ${step.stepId}:`, compensationError)
      }
    }
  }

  private async handleFinancialError(
    error: Error,
    transactionData: FinancialTransactionData,
    transactionId: string
  ): Promise<void> {
    await errorHandler.handle(
      errorHandler.createError({
        category: ErrorCategory.FINANCIAL,
        severity: ErrorSeverity.HIGH,
        code: 'FINANCIAL_TRANSACTION_ERROR',
        message: `Financial transaction failed: ${error.message}`,
        userMessage: 'The financial transaction could not be completed. Please try again or contact support.',
        recoveryStrategy: RecoveryStrategy.ADMIN_INTERVENTION,
        businessContext: {
          transactionId,
          transactionType: transactionData.type,
          amount: transactionData.amount,
          currency: transactionData.currency,
          reference: transactionData.reference,
          organizationId: transactionData.organizationId,
          userId: transactionData.userId
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

  private roundToCurrencyPrecision(amount: number): number {
    const factor = Math.pow(10, this.config.currencyPrecision)
    return Math.round(amount * factor) / factor
  }
}

// Export singleton instance
export const financialSafety = FinancialSafety.getInstance()

// Convenience wrapper for financial operations
export const executeFinancialOperation = <T>(
  transactionData: FinancialTransactionData,
  operation: (tx: Prisma.TransactionClient, transactionId: string) => Promise<T>,
  options: {
    idempotencyKey?: string
    journalEntries?: JournalEntry[]
    preValidation?: () => Promise<void>
    postValidation?: (result: T) => Promise<void>
    compensatingActions?: Array<() => Promise<void>>
  } = {}
): Promise<T> => financialSafety.executeFinancialTransaction(transactionData, operation, options)

