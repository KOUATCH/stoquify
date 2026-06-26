import {
  ExceptionSeverity,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
  ProviderAccountStatus,
  StatementFileStatus,
  StatementLineStatus,
  Prisma,
} from "@prisma/client"
import { randomUUID } from "node:crypto"

import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"

import type { ParsedStatementLine, PaymentProviderAdapter } from "./payment-ingestion.types"
import { PaymentIngestionError } from "./payment-ingestion.types"
import { sha256 } from "./adapters/mobile-money-hmac.adapter"

export type ImportProviderStatementInput = {
  organizationId: string
  providerAccountId: string
  adapter: PaymentProviderAdapter
  rawContent: string
  fileName?: string
  importedById?: string
  correlationId?: string
  maxFileBytes?: number
}

export type ImportProviderStatementResult = {
  status: "IMPORTED" | "DUPLICATE_FILE" | "DUPLICATE_LINE"
  statementFileId?: string
  importedLineCount: number
  duplicateLineCount: number
  fileHash: string
  inboxItemId?: string
  exceptionId?: string
  correlationId: string
}

function payloadSize(rawContent: string) {
  return Buffer.byteLength(rawContent, "utf8")
}

function toDecimal(value: Prisma.Decimal.Value | null | undefined) {
  return value === null || value === undefined ? null : new Prisma.Decimal(value)
}

function lineHash(line: ParsedStatementLine, fingerprint: string) {
  return sha256(
    JSON.stringify({
      fingerprint,
      providerTransactionId: line.providerTransactionId,
      providerReference: line.providerReference,
      amount: String(line.amount),
      currencyCode: line.currencyCode ?? "XAF",
      occurredAt: line.occurredAt.toISOString(),
    }),
  )
}

function duplicateFingerprints(lines: Array<{ fingerprint: string }>) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const line of lines) {
    if (seen.has(line.fingerprint)) duplicates.add(line.fingerprint)
    seen.add(line.fingerprint)
  }

  return duplicates
}

export async function importProviderStatement(
  input: ImportProviderStatementInput,
): Promise<ImportProviderStatementResult> {
  const correlationId = input.correlationId ?? randomUUID()
  const maxFileBytes = input.maxFileBytes ?? 5 * 1024 * 1024

  if (payloadSize(input.rawContent) > maxFileBytes) {
    throw new PaymentIngestionError("PAYLOAD_TOO_LARGE", "Statement file exceeds the allowed size.", {
      correlationId,
      maxFileBytes,
    })
  }

  const parsed = input.adapter.parseStatement({
    rawContent: input.rawContent,
    fileName: input.fileName,
  })
  const fileHash = sha256(input.rawContent)
  const preparedLines = parsed.lines.map((line) => {
    const fingerprint = input.adapter.fingerprintStatementLine(line)
    return {
      line,
      fingerprint,
      rawLineHash: line.rawLineHash ?? lineHash(line, fingerprint),
    }
  })
  const duplicateInFile = duplicateFingerprints(preparedLines)

  return db.$transaction(async (tx) => {
    const providerAccount = await tx.providerAccount.findFirst({
      where: {
        id: input.providerAccountId,
        organizationId: input.organizationId,
      },
      select: { id: true, status: true },
    })

    if (!providerAccount) {
      throw new PaymentIngestionError("PROVIDER_ACCOUNT_NOT_FOUND", "Provider account mapping was not found.", {
        correlationId,
      })
    }

    if (providerAccount.status !== ProviderAccountStatus.ACTIVE) {
      throw new PaymentIngestionError("PROVIDER_ACCOUNT_INACTIVE", "Provider account is not active for ingestion.", {
        correlationId,
        providerAccountId: providerAccount.id,
      })
    }

    const existingFile = await tx.statementFile.findFirst({
      where: {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        fileHash,
      },
      select: { id: true },
    })

    if (existingFile) {
      const inbox = await tx.paymentReconciliationInboxItem.upsert({
        where: {
          organizationId_source_idempotencyKey: {
            organizationId: input.organizationId,
            source: PaymentReconciliationInboxSource.STATEMENT_FILE,
            idempotencyKey: fileHash,
          },
        },
        create: {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          source: PaymentReconciliationInboxSource.STATEMENT_FILE,
          status: PaymentReconciliationInboxStatus.IGNORED,
          idempotencyKey: fileHash,
          externalId: input.fileName,
          payloadHash: fileHash,
          payloadSummary: {
            fileName: input.fileName ?? null,
            sourceType: parsed.sourceType,
            lineCount: parsed.lines.length,
          },
          processedAt: new Date(),
          correlationId,
        },
        update: {
          attempts: { increment: 1 },
          processedAt: new Date(),
          correlationId,
        },
        select: { id: true },
      })

      logger.info("payment-reconciliation.statement.duplicate-file", {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        fileName: input.fileName,
        correlationId,
      })

      return {
        status: "DUPLICATE_FILE",
        statementFileId: existingFile.id,
        importedLineCount: 0,
        duplicateLineCount: parsed.lines.length,
        fileHash,
        inboxItemId: inbox.id,
        correlationId,
      }
    }

    if (duplicateInFile.size > 0) {
      const exception = await tx.paymentException.create({
        data: {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          type: PaymentExceptionType.DUPLICATE_PROVIDER_REFERENCE,
          severity: ExceptionSeverity.HIGH,
          status: PaymentExceptionStatus.OPEN,
          sourceType: "StatementFile",
          sourceId: input.fileName ?? fileHash,
          evidence: {
            fileHash,
            duplicateFingerprints: [...duplicateInFile],
            correlationId,
          },
          correlationId,
        },
        select: { id: true },
      })

      return {
        status: "DUPLICATE_LINE",
        importedLineCount: 0,
        duplicateLineCount: duplicateInFile.size,
        fileHash,
        exceptionId: exception.id,
        correlationId,
      }
    }

    const existingLines = await tx.statementLine.findMany({
      where: {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        fingerprint: { in: preparedLines.map((line) => line.fingerprint) },
      },
      select: { fingerprint: true },
    })

    if (existingLines.length > 0) {
      const exception = await tx.paymentException.create({
        data: {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          type: PaymentExceptionType.DUPLICATE_PROVIDER_REFERENCE,
          severity: ExceptionSeverity.HIGH,
          status: PaymentExceptionStatus.OPEN,
          sourceType: "StatementLine",
          sourceId: input.fileName ?? fileHash,
          evidence: {
            fileHash,
            duplicateFingerprints: existingLines.map((line) => line.fingerprint),
            correlationId,
          },
          correlationId,
        },
        select: { id: true },
      })

      return {
        status: "DUPLICATE_LINE",
        importedLineCount: 0,
        duplicateLineCount: existingLines.length,
        fileHash,
        exceptionId: exception.id,
        correlationId,
      }
    }

    const statementFile = await tx.statementFile.create({
      data: {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        sourceType: parsed.sourceType,
        fileName: input.fileName,
        fileHash,
        periodStart: parsed.periodStart ?? parsed.lines[0].occurredAt,
        periodEnd: parsed.periodEnd ?? parsed.lines[parsed.lines.length - 1].occurredAt,
        status: StatementFileStatus.IMPORTED,
        importedById: input.importedById,
        correlationId,
        metadata: {
          lineCount: parsed.lines.length,
          adapter: input.adapter.providerCode,
        },
      },
      select: { id: true },
    })

    await tx.statementLine.createMany({
      data: preparedLines.map(({ line, fingerprint, rawLineHash }) => ({
        organizationId: input.organizationId,
        statementFileId: statementFile.id,
        providerAccountId: providerAccount.id,
        fingerprint,
        lineNumber: line.lineNumber,
        providerTransactionId: line.providerTransactionId,
        providerReference: line.providerReference,
        direction: line.direction ?? "UNKNOWN",
        status: StatementLineStatus.UNMATCHED,
        amount: new Prisma.Decimal(line.amount),
        feeAmount: toDecimal(line.feeAmount),
        currencyCode: line.currencyCode ?? "XAF",
        occurredAt: line.occurredAt,
        postedAt: line.postedAt,
        description: line.description,
        counterpartyMasked: line.counterpartyMasked,
        counterpartyHash: line.counterpartyHash,
        rawLineHash,
        metadata: line.metadata ?? Prisma.JsonNull,
      })),
    })

    const inbox = await tx.paymentReconciliationInboxItem.upsert({
      where: {
        organizationId_source_idempotencyKey: {
          organizationId: input.organizationId,
          source: PaymentReconciliationInboxSource.STATEMENT_FILE,
          idempotencyKey: fileHash,
        },
      },
      create: {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        source: PaymentReconciliationInboxSource.STATEMENT_FILE,
        status: PaymentReconciliationInboxStatus.RECEIVED,
        idempotencyKey: fileHash,
        externalId: input.fileName,
        payloadHash: fileHash,
        payloadSummary: {
          fileName: input.fileName ?? null,
          sourceType: parsed.sourceType,
          lineCount: parsed.lines.length,
        },
        correlationId,
      },
      update: {
        attempts: { increment: 1 },
        correlationId,
      },
      select: { id: true },
    })

    logger.info("payment-reconciliation.statement.imported", {
      organizationId: input.organizationId,
      providerAccountId: providerAccount.id,
      statementFileId: statementFile.id,
      lineCount: parsed.lines.length,
      correlationId,
    })

    await recordBusinessEventInTx(tx, {
      organizationId: input.organizationId,
      eventType: "payment.statement.imported",
      eventSource: "IMPORT",
      idempotencyKey: `statement-file:${statementFile.id}:imported`,
      actorId: input.importedById,
      sourceType: "PAYMENT_RECONCILIATION",
      sourceId: statementFile.id,
      documentHash: fileHash,
      payload: {
        statementFileId: statementFile.id,
        providerAccountId: providerAccount.id,
        inboxItemId: inbox.id,
        sourceType: parsed.sourceType,
        fileName: input.fileName ?? null,
        fileHash,
        lineCount: parsed.lines.length,
        periodStart: parsed.periodStart ?? parsed.lines[0].occurredAt,
        periodEnd: parsed.periodEnd ?? parsed.lines[parsed.lines.length - 1].occurredAt,
        adapter: input.adapter.providerCode,
        correlationId,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "payment.statement.imported",
          payload: {
            statementFileId: statementFile.id,
            providerAccountId: providerAccount.id,
            inboxItemId: inbox.id,
            fileName: input.fileName ?? null,
            lineCount: parsed.lines.length,
            correlationId,
          },
        },
      ],
    })
    await recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
      sourceCode: "PAYMENT_STATEMENT_IMPORT",
      sourceId: statementFile.id,
      periodStart: parsed.periodStart ?? parsed.lines[0].occurredAt,
      periodEnd: parsed.periodEnd ?? parsed.lines[parsed.lines.length - 1].occurredAt,
      staleReason: "Provider statement import changed payment evidence after close certification.",
      newEvidenceHash: fileHash,
      correlationId,
    }, {
      actorId: input.importedById ?? null,
    })

    return {
      status: "IMPORTED",
      statementFileId: statementFile.id,
      importedLineCount: parsed.lines.length,
      duplicateLineCount: 0,
      fileHash,
      inboxItemId: inbox.id,
      correlationId,
    }
  })
}
