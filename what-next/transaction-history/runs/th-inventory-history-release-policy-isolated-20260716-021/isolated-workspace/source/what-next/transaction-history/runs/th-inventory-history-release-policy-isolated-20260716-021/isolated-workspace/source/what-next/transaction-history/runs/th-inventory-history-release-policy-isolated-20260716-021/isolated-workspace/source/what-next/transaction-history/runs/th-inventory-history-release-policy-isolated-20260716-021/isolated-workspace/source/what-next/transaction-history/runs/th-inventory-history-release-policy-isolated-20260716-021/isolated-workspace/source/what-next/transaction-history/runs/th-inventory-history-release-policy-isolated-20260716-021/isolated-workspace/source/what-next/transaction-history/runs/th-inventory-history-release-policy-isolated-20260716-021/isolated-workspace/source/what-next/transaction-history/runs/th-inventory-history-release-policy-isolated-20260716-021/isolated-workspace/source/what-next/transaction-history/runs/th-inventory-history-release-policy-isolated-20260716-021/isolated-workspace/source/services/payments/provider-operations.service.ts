import { ReconciliationRunStatus } from "@prisma/client"
import { randomUUID } from "node:crypto"

import { BusinessRuleError } from "@/services/_shared/action-errors"
import {
  signReconciliationRun,
  type SignReconciliationRunInput,
  type SignReconciliationRunResult,
} from "@/services/reconciliation/payment-reconciliation-certification.service"
import {
  runPaymentReconciliation,
  type RunPaymentReconciliationResult,
} from "@/services/reconciliation/payment-reconciliation-run.service"

import type { PaymentProviderAdapter } from "./payment-ingestion.types"
import {
  importProviderStatement,
  type ImportProviderStatementResult,
} from "./statement-import.service"

export type IngestAndSignProviderStatementInput = {
  organizationId: string
  providerAccountId: string
  adapter: PaymentProviderAdapter
  rawContent: string
  businessDate: Date
  fileName?: string
  importedById?: string
  runById: string
  signedById: string
  control: SignReconciliationRunInput["control"]
  correlationId?: string
  maxFileBytes?: number
}

export type IngestAndSignProviderStatementResult = {
  status: "SIGNED" | "NEEDS_REVIEW" | "IMPORT_BLOCKED"
  statement: ImportProviderStatementResult
  reconciliationRun: RunPaymentReconciliationResult | null
  signoff: SignReconciliationRunResult | null
  correlationId: string
}

function assertIndependentSigner(input: IngestAndSignProviderStatementInput) {
  if (input.signedById === input.runById || input.signedById === input.importedById) {
    throw new BusinessRuleError("Provider statement reconciliation sign-off requires an independent signer.")
  }
}

export async function ingestAndSignProviderStatement(
  input: IngestAndSignProviderStatementInput,
): Promise<IngestAndSignProviderStatementResult> {
  assertIndependentSigner(input)
  const correlationId = input.correlationId ?? randomUUID()

  const statement = await importProviderStatement({
    organizationId: input.organizationId,
    providerAccountId: input.providerAccountId,
    adapter: input.adapter,
    rawContent: input.rawContent,
    fileName: input.fileName,
    importedById: input.importedById,
    correlationId,
    maxFileBytes: input.maxFileBytes,
  })

  if (statement.status === "DUPLICATE_LINE") {
    return {
      status: "IMPORT_BLOCKED",
      statement,
      reconciliationRun: null,
      signoff: null,
      correlationId,
    }
  }

  const reconciliationRun = await runPaymentReconciliation({
    organizationId: input.organizationId,
    providerAccountId: input.providerAccountId,
    businessDate: input.businessDate,
    runById: input.runById,
    correlationId,
  })

  if (reconciliationRun.status !== ReconciliationRunStatus.READY_FOR_SIGNOFF) {
    return {
      status: "NEEDS_REVIEW",
      statement,
      reconciliationRun,
      signoff: null,
      correlationId,
    }
  }

  const signoff = await signReconciliationRun({
    organizationId: input.organizationId,
    runId: reconciliationRun.runId,
    signedById: input.signedById,
    control: input.control,
    correlationId,
  })

  return {
    status: "SIGNED",
    statement,
    reconciliationRun,
    signoff,
    correlationId,
  }
}
