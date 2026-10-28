import {
  BusinessRuleError,
  ConflictError,
} from "@/services/_shared/action-errors"

export type InventoryErrorCode =
  | "INSUFFICIENT_STOCK"
  | "CONCURRENT_STOCK_UPDATE"
  | "PERIOD_CLOSED"
  | "MISSING_DOCUMENT"
  | "PROJECTION_DRIFT"
  | "CLASS3_RECONCILIATION_DRIFT"
  | "IDEMPOTENCY_CONFLICT"
  | "TENANT_SCOPE_VIOLATION"
  | "SOD_VIOLATION"
  | "LEDGER_POSTING_BLOCKED"

export class InventoryRuleError extends BusinessRuleError {
  constructor(
    message: string,
    public readonly inventoryCode: InventoryErrorCode,
    public readonly evidence: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = "InventoryRuleError"
  }
}

export class InsufficientStockError extends InventoryRuleError {
  constructor(message: string, evidence: Record<string, unknown> = {}) {
    super(message, "INSUFFICIENT_STOCK", evidence)
    this.name = "InsufficientStockError"
  }
}

export class ConcurrentStockUpdateError extends ConflictError {
  public readonly inventoryCode = "CONCURRENT_STOCK_UPDATE" as const

  constructor(message = "Inventory changed while posting this stock event; retry with the same idempotency key.") {
    super(message)
    this.name = "ConcurrentStockUpdateError"
  }
}

export class InventoryReconciliationDriftError extends InventoryRuleError {
  constructor(message: string, evidence: Record<string, unknown> = {}) {
    super(message, "CLASS3_RECONCILIATION_DRIFT", evidence)
    this.name = "InventoryReconciliationDriftError"
  }
}

export class MissingInventoryEvidenceError extends InventoryRuleError {
  constructor(message = "Inventory evidence hash is required for this stock event.", evidence: Record<string, unknown> = {}) {
    super(message, "MISSING_DOCUMENT", evidence)
    this.name = "MissingInventoryEvidenceError"
  }
}

export class InventorySoDViolationError extends InventoryRuleError {
  constructor(message = "The creator cannot approve this sensitive inventory event.", evidence: Record<string, unknown> = {}) {
    super(message, "SOD_VIOLATION", evidence)
    this.name = "InventorySoDViolationError"
  }
}
