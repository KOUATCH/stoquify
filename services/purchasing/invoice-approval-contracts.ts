import {
  invoiceLedgerRecoveryCommandSchema, invoiceLedgerRecoveryDecisionSchema,
  invoiceLedgerRecoveryDraftSchema, invoiceLedgerRecoveryHistoryQuerySchema,
  invoiceLedgerRecoveryQuerySchema,
} from "./invoice-ledger-recovery-contracts"
import { z } from "zod"

// Both operations return the same accounting references; their event types differ.
export const invoiceApprovalCommandSchema = invoiceLedgerRecoveryCommandSchema
export const invoiceApprovalDecisionSchema = invoiceLedgerRecoveryDecisionSchema
export const invoiceApprovalDraftSchema = invoiceLedgerRecoveryDraftSchema
export const invoiceApprovalQuerySchema = invoiceLedgerRecoveryQuerySchema
export const invoiceApprovalHistoryQuerySchema = invoiceLedgerRecoveryHistoryQuerySchema
export type InvoiceApprovalCommand = z.infer<typeof invoiceApprovalCommandSchema>
export type InvoiceApprovalDecision = z.infer<typeof invoiceApprovalDecisionSchema>
export type InvoiceApprovalDraft = z.infer<typeof invoiceApprovalDraftSchema>
export type InvoiceApprovalQuery = z.input<typeof invoiceApprovalQuerySchema>
export type InvoiceApprovalHistoryQuery = z.infer<typeof invoiceApprovalHistoryQuerySchema>
export type InvoiceApprovalBlocker = "SOURCE_REVIEW" | "PREPARATION_REVIEW" | "MATCH_EXCEPTION" | "PERIOD_UNAVAILABLE" | "COUNTRY_SETUP" | "CURRENCY_REVIEW" | "JOURNAL_AMBIGUOUS" | "RULE_INVALID"
export type InvoiceApprovalPreview = {
  organizationId: string; actorId: string; invoiceId: string; invoiceNumber: string;
  supplierName: string; makerId: string; invoiceDate: string; dueDate: string | null;
  total: string; subtotal: string; tax: string; currency: string; variance: string;
  documentReference: string | null; preparationEventId: string | null;
  correction?: { reason: string; recordedAt: string; previousTotal: string | null; previousInvoiceDate: string | null; previousNotes: string | null; previousDocumentHash: string | null; lines: Array<{ description: string; quantity: string; unitCost: string; total: string }> } | null;
  periodName: string | null; ruleCode: string | null; journalCode: string | null;
  countryPackVersion: string | null; matchExceptionId: string | null;
  blockers: InvoiceApprovalBlocker[]; postingWarnings: Array<"RULE_UNAVAILABLE" | "JOURNAL_UNAVAILABLE">;
  requiresFreshAuth: boolean; revision: string; checkedAt: string;
  lines: Array<{ id: string; description: string; receiptLineId: string | null; quantity: string; unitCost: string; tax: string; total: string }>;
}
