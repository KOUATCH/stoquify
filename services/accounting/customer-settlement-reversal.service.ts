import {
  AccountingPostingPurpose,
  AccountingSourceType,
  CustomerSettlementStatus,
  JournalEntryStatus,
  LedgerEntryType,
  LedgerPostingBatchStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/prisma/db";
import {
  SESSION_ASSURANCE_LEVEL,
  type AuthSessionClaims,
} from "@/lib/security/auth-session";
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
} from "@/services/controls/sensitive-action.service";
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";

import { createCustomerLedgerEntry } from "./customer-ledger.service";
import { CUSTOMER_RECEIVABLE_REFERENCE_TYPE } from "./customer-receivable-document.service";
import {
  recordCustomerReceivableSettlementReversedInTx,
} from "./customer-receivable-lifecycle.service";
import {
  reverseCustomerSettlementInputSchema,
  type ParsedReverseCustomerSettlementInput,
  type ReverseCustomerSettlementInput,
} from "./customer-settlement.schemas";
import { CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS } from "./customer-settlement.service";
import { assertBalancedJournalEntry } from "./invariants";
import { recordReversedJournalCloseInvalidationsInTx } from "./journal-close-invalidation.service";
import { getOpenPeriodForDate } from "./periods.service";
import { createLedgerPostingBatch } from "./posting.service";
import { createAccountingSourceLink } from "./source-link.service";

export const CUSTOMER_SETTLEMENT_REVERSAL_SOURCE_VERSION = 1;
export type CustomerSettlementReversalControlContext = {
  organizationId: string;
  actorId: string;
  actorPermissions: readonly string[];
  freshAuth?: {
    lastAuthAt: Date;
    claims: Pick<
      AuthSessionClaims,
      | "userId"
      | "tenantId"
      | "assuranceOrganizationId"
      | "assuranceLevel"
      | "lastAuthAt"
    >;
  } | null;
};

type CustomerSettlementClient = typeof db;

type NormalizedReversal = {
  parsed: ParsedReverseCustomerSettlementInput;
  reversalDate: Date;
  idempotencyPayloadHash: string;
};

type PersistedSettlement = Prisma.CustomerSettlementGetPayload<{
  include: { allocations: true };
}>;

type LedgerEvidence = {
  id: string;
  type: LedgerEntryType;
  referenceType: string | null;
  referenceId: string | null;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
};

type JournalWithLines = Prisma.JournalEntryGetPayload<{
  include: { lines: true };
}>;

type ReversalPostingResult = {
  postingBatchId: string;
  journalEntryId: string;
  sourceLinkId: string;
};

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new BusinessRuleError(`${label} is required`);
  return normalized;
}

function normalizeDate(value: Date | string, label: string) {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError(`${label} is invalid`);
  }
  return date;
}

function verifiedFreshAuthTime(
  control: CustomerSettlementReversalControlContext,
  organizationId: string,
  actorId: string,
): Date | null {
  const freshAuth = control.freshAuth;
  const lastAuthAt = freshAuth?.lastAuthAt;
  const lastAuthAtMs =
    lastAuthAt instanceof Date ? lastAuthAt.getTime() : Number.NaN;

  if (
    !freshAuth ||
    !Number.isFinite(lastAuthAtMs) ||
    freshAuth.claims.userId !== actorId ||
    freshAuth.claims.tenantId !== organizationId ||
    freshAuth.claims.assuranceOrganizationId !== organizationId ||
    !Number.isFinite(freshAuth.claims.assuranceLevel) ||
    freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
    freshAuth.claims.lastAuthAt !== lastAuthAtMs
  ) {
    return null;
  }

  return new Date(lastAuthAtMs);
}

function money(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function json(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isPrismaCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function normalizeCommand(
  input: ReverseCustomerSettlementInput,
  organizationId: string,
  actorId: string,
): NormalizedReversal {
  const parsed = reverseCustomerSettlementInputSchema.parse(input);
  const reversalDate = normalizeDate(parsed.reversalDate, "Reversal date");
  const idempotencyPayloadHash = hashBusinessPayload({
    operation: "reverseCustomerSettlement",
    sourceVersion: CUSTOMER_SETTLEMENT_REVERSAL_SOURCE_VERSION,
    organizationId,
    actorId,
    customerSettlementId: parsed.customerSettlementId,
    reversalDate: reversalDate.toISOString(),
    reason: parsed.reason,
    correlationId: parsed.correlationId,
    documentHash: parsed.documentHash.toLowerCase(),
    evidenceHash: parsed.evidenceHash.toLowerCase(),
  });

  return { parsed, reversalDate, idempotencyPayloadHash };
}

function orderedAllocations(settlement: PersistedSettlement) {
  return [...settlement.allocations].sort((left, right) =>
    left.salesOrderId.localeCompare(right.salesOrderId),
  );
}

function originalLedgerEntryIds(settlement: PersistedSettlement) {
  const ids = orderedAllocations(settlement).map(
    (allocation) => allocation.customerLedgerEntryId,
  );
  if (new Set(ids).size !== ids.length) {
    throw new ConflictError(
      "Customer settlement original ledger evidence is duplicated",
    );
  }
  return ids;
}

function reversalLedgerEntryIds(settlement: PersistedSettlement) {
  const ids: string[] = [];
  for (const allocation of orderedAllocations(settlement)) {
    if (!allocation.reversalCustomerLedgerEntryId) {
      throw new ConflictError(
        "Customer settlement reversal allocation ledger evidence is incomplete",
      );
    }
    ids.push(allocation.reversalCustomerLedgerEntryId);
  }
  if (new Set(ids).size !== ids.length) {
    throw new ConflictError(
      "Customer settlement reversal allocation ledger evidence is duplicated",
    );
  }
  return ids;
}
type ReversalEventEvidence = {
  reversalCustomerLedgerEntryIds: string[];
  reversalLedgerPostingBatchId: string;
  reversalJournalEntryId: string;
  correlationId: string;
};

function reversalBusinessEventIdempotencyKey(
  settlementId: string,
  idempotencyKey: string,
) {
  return `customer-settlement:${settlementId}:reversed:${idempotencyKey}`;
}

function reversalBusinessEventPayload(
  settlement: PersistedSettlement,
  evidence: ReversalEventEvidence,
) {
  return {
    customerSettlementId: settlement.id,
    settlementNumber: settlement.settlementNumber,
    customerId: settlement.customerId,
    amount: money(settlement.amount).toFixed(2),
    currency: settlement.currency,
    allocationIds: orderedAllocations(settlement).map(
      (allocation) => allocation.id,
    ),
    customerReceivableDocumentIds: orderedAllocations(settlement).map(
      (allocation) => allocation.customerReceivableDocumentId,
    ),
    originalCustomerLedgerEntryIds: originalLedgerEntryIds(settlement),
    reversalCustomerLedgerEntryIds: evidence.reversalCustomerLedgerEntryIds,
    originalLedgerPostingBatchId: settlement.ledgerPostingBatchId,
    reversalLedgerPostingBatchId: evidence.reversalLedgerPostingBatchId,
    originalJournalEntryId: settlement.journalEntryId,
    reversalJournalEntryId: evidence.reversalJournalEntryId,
    correlationId: evidence.correlationId,
  };
}

function reversalOutboxPayload(
  settlement: PersistedSettlement,
  reversalLedgerPostingBatchId: string,
) {
  return {
    severity: "warning",
    customerSettlementId: settlement.id,
    customerId: settlement.customerId,
    amount: money(settlement.amount).toFixed(2),
    currency: settlement.currency,
    allocationCount: settlement.allocations.length,
    reversalLedgerPostingBatchId,
  };
}

function assertAllocationConservation(settlement: PersistedSettlement) {
  const allocated = settlement.allocations
    .reduce(
      (total, allocation) => total.plus(money(allocation.amount)),
      new Prisma.Decimal(0),
    )
    .toDecimalPlaces(2);
  if (!allocated.eq(money(settlement.amount))) {
    throw new ConflictError(
      "Customer settlement allocation evidence is not conserved",
    );
  }
}

function assertOriginalLedgerEvidence(
  settlement: PersistedSettlement,
  entries: LedgerEvidence[],
) {
  const ids = originalLedgerEntryIds(settlement);
  if (entries.length !== ids.length) {
    throw new ConflictError(
      "Customer settlement original ledger evidence is incomplete",
    );
  }
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  for (const allocation of settlement.allocations) {
    const entry = byId.get(allocation.customerLedgerEntryId);
    if (
      !entry ||
      entry.type !== LedgerEntryType.PAYMENT ||
      !allocation.customerReceivableDocumentId ||
      entry.referenceType !== CUSTOMER_RECEIVABLE_REFERENCE_TYPE ||
      entry.referenceId !== allocation.customerReceivableDocumentId ||
      !entry.debit.eq(0) ||
      !entry.credit.eq(allocation.amount)
    ) {
      throw new ConflictError(
        "Customer settlement original allocation ledger evidence does not match",
      );
    }
  }
}

function assertReversalLedgerEvidence(
  settlement: PersistedSettlement,
  entries: LedgerEvidence[],
) {
  const ids = reversalLedgerEntryIds(settlement);
  if (entries.length !== ids.length) {
    throw new ConflictError(
      "Customer settlement reversal ledger evidence is incomplete",
    );
  }
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  for (const allocation of settlement.allocations) {
    const entry = byId.get(allocation.reversalCustomerLedgerEntryId!);
    if (
      !entry ||
      entry.type !== LedgerEntryType.PAYMENT_REVERSAL ||
      !allocation.customerReceivableDocumentId ||
      entry.referenceType !== CUSTOMER_RECEIVABLE_REFERENCE_TYPE ||
      entry.referenceId !== allocation.customerReceivableDocumentId ||
      !entry.debit.eq(allocation.amount) ||
      !entry.credit.eq(0)
    ) {
      throw new ConflictError(
        "Customer settlement reversal allocation ledger evidence does not match",
      );
    }
  }
}

function assertReplayMatches(
  settlement: PersistedSettlement,
  command: NormalizedReversal,
  actorId: string,
) {
  if (settlement.status !== CustomerSettlementStatus.REVERSED) {
    throw new ConflictError("Customer settlement is not in reversed state");
  }
  if (
    settlement.reversalIdempotencyKey !== command.parsed.idempotencyKey ||
    settlement.reversalIdempotencyPayloadHash !== command.idempotencyPayloadHash
  ) {
    throw new ConflictError(
      "Customer settlement reversal idempotency key was reused with a different payload",
    );
  }
  if (
    settlement.reversalCorrelationId !== command.parsed.correlationId ||
    settlement.reversedById !== actorId ||
    settlement.reversalReason !== command.parsed.reason ||
    settlement.reversalDate?.getTime() !== command.reversalDate.getTime() ||
    settlement.reversalDocumentHash !==
      command.parsed.documentHash.toLowerCase() ||
    settlement.reversalEvidenceHash !==
      command.parsed.evidenceHash.toLowerCase()
  ) {
    throw new ConflictError(
      "Customer settlement reversal evidence does not match",
    );
  }
  if (
    !settlement.reversedAt ||
    !settlement.reversedById ||
    !settlement.reversalLedgerPostingBatchId ||
    !settlement.reversalJournalEntryId ||
    !settlement.reversalAccountingSourceLinkId ||
    !settlement.reversalBusinessEventId
  ) {
    throw new ConflictError(
      "Customer settlement reversal evidence is incomplete",
    );
  }
  reversalLedgerEntryIds(settlement);
}
function assertJournalMirror(
  original: JournalWithLines,
  reversal: JournalWithLines,
) {
  assertBalancedJournalEntry(original.lines);
  assertBalancedJournalEntry(reversal.lines);
  if (
    reversal.reversalOfEntryId !== original.id ||
    reversal.lines.length !== original.lines.length
  ) {
    throw new ConflictError(
      "Customer settlement reversal journal evidence is incomplete",
    );
  }

  const originalByLine = new Map(
    original.lines.map((line) => [line.lineNumber, line]),
  );
  for (const line of reversal.lines) {
    const source = originalByLine.get(line.lineNumber);
    if (
      !source ||
      line.accountId !== source.accountId ||
      !line.debit.eq(source.credit) ||
      !line.credit.eq(source.debit) ||
      !money(line.baseDebit ?? line.debit).eq(
        money(source.baseCredit ?? source.credit),
      ) ||
      !money(line.baseCredit ?? line.credit).eq(
        money(source.baseDebit ?? source.debit),
      ) ||
      line.currency !== source.currency ||
      line.locationId !== source.locationId ||
      line.customerId !== source.customerId ||
      line.supplierId !== source.supplierId ||
      line.itemId !== source.itemId
    ) {
      throw new ConflictError(
        "Customer settlement reversal journal lines do not mirror the original",
      );
    }
  }
}

function resultFor(settlement: PersistedSettlement, replayed: boolean) {
  return {
    settlementId: settlement.id,
    status: settlement.status,
    originalCustomerLedgerEntryIds: originalLedgerEntryIds(settlement),
    reversalCustomerLedgerEntryIds: reversalLedgerEntryIds(settlement),
    originalPostingBatchId: settlement.ledgerPostingBatchId!,
    originalJournalEntryId: settlement.journalEntryId!,
    reversalPostingBatchId: settlement.reversalLedgerPostingBatchId!,
    reversalJournalEntryId: settlement.reversalJournalEntryId!,
    reversalSourceLinkId: settlement.reversalAccountingSourceLinkId!,
    reversalBusinessEventId: settlement.reversalBusinessEventId!,
    reversalDate: settlement.reversalDate!.toISOString(),
    replayed,
  };
}

async function validateReplayEvidence(
  tx: Prisma.TransactionClient,
  settlement: PersistedSettlement,
) {
  const originalIds = originalLedgerEntryIds(settlement);
  const reversalIds = reversalLedgerEntryIds(settlement);
  const reversalEventIdempotencyKey = reversalBusinessEventIdempotencyKey(
    settlement.id,
    settlement.reversalIdempotencyKey!,
  );
  const reversalOutboxIdempotencyKey = `INTERNAL:${reversalEventIdempotencyKey}:NOTIFICATION:customer_settlement.reversed`;
  const expectedEventPayloadHash = hashBusinessPayload(
    reversalBusinessEventPayload(settlement, {
      reversalCustomerLedgerEntryIds: reversalIds,
      reversalLedgerPostingBatchId: settlement.reversalLedgerPostingBatchId!,
      reversalJournalEntryId: settlement.reversalJournalEntryId!,
      correlationId: settlement.reversalCorrelationId!,
    }),
  );
  const expectedOutboxPayloadHash = hashBusinessPayload(
    reversalOutboxPayload(settlement, settlement.reversalLedgerPostingBatchId!),
  );

  const [
    originalEntries,
    reversalEntries,
    originalBatch,
    reversalBatch,
    originalJournal,
    reversalJournal,
    originalLinks,
    reversalLink,
    reversalEvent,
  ] = await Promise.all([
    tx.customerLedgerEntry.findMany({
      where: {
        id: { in: originalIds },
        organizationId: settlement.organizationId,
        customerId: settlement.customerId,
      },
      select: {
        id: true,
        type: true,
        referenceType: true,
        referenceId: true,
        debit: true,
        credit: true,
      },
    }),
    tx.customerLedgerEntry.findMany({
      where: {
        id: { in: reversalIds },
        organizationId: settlement.organizationId,
        customerId: settlement.customerId,
      },
      select: {
        id: true,
        type: true,
        referenceType: true,
        referenceId: true,
        debit: true,
        credit: true,
      },
    }),
    tx.ledgerPostingBatch.findFirst({
      where: {
        id: settlement.ledgerPostingBatchId!,
        organizationId: settlement.organizationId,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
        status: LedgerPostingBatchStatus.POSTED,
      },
      select: { id: true },
    }),
    tx.ledgerPostingBatch.findFirst({
      where: {
        id: settlement.reversalLedgerPostingBatchId!,
        organizationId: settlement.organizationId,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingPurpose: AccountingPostingPurpose.REVERSAL,
        status: LedgerPostingBatchStatus.POSTED,
      },
      select: { id: true },
    }),
    tx.journalEntry.findFirst({
      where: {
        id: settlement.journalEntryId!,
        organizationId: settlement.organizationId,
        postingBatchId: settlement.ledgerPostingBatchId!,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
        status: JournalEntryStatus.REVERSED,
      },
      include: { lines: { orderBy: { lineNumber: "asc" } } },
    }),
    tx.journalEntry.findFirst({
      where: {
        id: settlement.reversalJournalEntryId!,
        organizationId: settlement.organizationId,
        postingBatchId: settlement.reversalLedgerPostingBatchId!,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingPurpose: AccountingPostingPurpose.REVERSAL,
        status: JournalEntryStatus.POSTED,
      },
      include: { lines: { orderBy: { lineNumber: "asc" } } },
    }),
    tx.accountingSourceLink.findMany({
      where: {
        organizationId: settlement.organizationId,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingBatchId: settlement.ledgerPostingBatchId!,
        journalEntryId: settlement.journalEntryId!,
      },
      select: { id: true },
      take: 2,
    }),
    tx.accountingSourceLink.findFirst({
      where: {
        id: settlement.reversalAccountingSourceLinkId!,
        organizationId: settlement.organizationId,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingBatchId: settlement.reversalLedgerPostingBatchId!,
        journalEntryId: settlement.reversalJournalEntryId!,
      },
      select: { id: true },
    }),
    tx.businessEvent.findFirst({
      where: {
        id: settlement.reversalBusinessEventId!,
        organizationId: settlement.organizationId,
        eventType: "customer.settlement.reversed",
        eventSource: "INTERNAL",
        schemaVersion: CUSTOMER_SETTLEMENT_REVERSAL_SOURCE_VERSION,
        status: "APPLIED",
        idempotencyKey: reversalEventIdempotencyKey,
        actorId: settlement.reversedById!,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingBatchId: settlement.reversalLedgerPostingBatchId!,
        documentHash: settlement.reversalDocumentHash!,
      },
      select: {
        id: true,
        payloadHash: true,
        outboxMessages: {
          where: {
            organizationId: settlement.organizationId,
            channel: "NOTIFICATION",
            eventName: "customer_settlement.reversed",
            destination: "accounting",
            idempotencyKey: reversalOutboxIdempotencyKey,
          },
          select: { payloadHash: true },
          take: 2,
        },
      },
    }),
  ]);

  assertOriginalLedgerEvidence(settlement, originalEntries);
  assertReversalLedgerEvidence(settlement, reversalEntries);
  if (
    !originalBatch ||
    !reversalBatch ||
    !originalJournal ||
    !reversalJournal ||
    originalLinks.length !== 1 ||
    !reversalLink
  ) {
    throw new ConflictError(
      "Customer settlement reversal accounting evidence is incomplete",
    );
  }
  assertJournalMirror(originalJournal, reversalJournal);
  if (
    !reversalEvent ||
    reversalEvent.payloadHash !== expectedEventPayloadHash ||
    reversalEvent.outboxMessages.length !== 1 ||
    reversalEvent.outboxMessages[0]?.payloadHash !== expectedOutboxPayloadHash
  ) {
    throw new ConflictError(
      "Customer settlement reversal business event evidence is incomplete",
    );
  }
}

async function nextReversalEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  settlementNumber: string,
) {
  const entryNumber = `ARREV-${settlementNumber}`;
  const existing = await tx.journalEntry.findFirst({
    where: { organizationId, entryNumber },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError(
      "Customer settlement reversal journal number already exists",
    );
  }
  return entryNumber;
}

async function postReversalInTx(
  tx: Prisma.TransactionClient,
  input: {
    settlement: PersistedSettlement;
    originalJournal: JournalWithLines;
    actorId: string;
    reversalDate: Date;
    idempotencyKey: string;
    idempotencyPayloadHash: string;
    documentHash: string;
    now: Date;
  },
): Promise<ReversalPostingResult> {
  const { settlement, originalJournal } = input;
  assertBalancedJournalEntry(originalJournal.lines);
  const period = await getOpenPeriodForDate(
    settlement.organizationId,
    input.reversalDate,
    tx,
  );
  const batch = await createLedgerPostingBatch(
    {
      organizationId: settlement.organizationId,
      periodId: period.id,
      sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
      sourceId: settlement.id,
      postingPurpose: AccountingPostingPurpose.REVERSAL,
      sourceVersion: CUSTOMER_SETTLEMENT_REVERSAL_SOURCE_VERSION,
      idempotencyKey: `customer-settlement-reversal:${settlement.id}:${input.idempotencyKey}`,
      metadata: json({
        gate: "phase-5-slice-436-customer-settlement-reversal",
        sourceVersion: CUSTOMER_SETTLEMENT_REVERSAL_SOURCE_VERSION,
        originalJournalEntryId: originalJournal.id,
        documentHash: input.documentHash,
        idempotencyPayloadHash: input.idempotencyPayloadHash,
      }),
    },
    tx,
  );
  if (batch.status !== LedgerPostingBatchStatus.PENDING) {
    throw new ConflictError(
      "Customer settlement reversal posting batch is not pending",
    );
  }

  const postedBatch = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      periodId: period.id,
      status: LedgerPostingBatchStatus.POSTED,
      postedAt: input.now,
      errorMessage: null,
    },
  });
  const reversal = await tx.journalEntry.create({
    data: {
      organizationId: settlement.organizationId,
      journalId: originalJournal.journalId,
      periodId: period.id,
      postingBatchId: postedBatch.id,
      entryNumber: await nextReversalEntryNumber(
        tx,
        settlement.organizationId,
        settlement.settlementNumber,
      ),
      entryDate: input.reversalDate,
      status: JournalEntryStatus.POSTED,
      currency: originalJournal.currency.trim().toUpperCase(),
      memo: `Reversal of customer settlement ${settlement.settlementNumber}`,
      reference: settlement.settlementNumber,
      sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
      sourceId: settlement.id,
      postingPurpose: AccountingPostingPurpose.REVERSAL,
      reversalOfEntryId: originalJournal.id,
      postedAt: input.now,
      postedById: input.actorId,
      createdById: input.actorId,
      lines: {
        create: originalJournal.lines.map((line) => ({
          organizationId: settlement.organizationId,
          accountId: line.accountId,
          lineNumber: line.lineNumber,
          description: line.description
            ? `Reversal: ${line.description}`
            : `Reversal of ${originalJournal.entryNumber}`,
          debit: line.credit,
          credit: line.debit,
          currency: line.currency,
          exchangeRate: line.exchangeRate,
          baseDebit: line.baseCredit ?? line.credit,
          baseCredit: line.baseDebit ?? line.debit,
          locationId: line.locationId,
          customerId: line.customerId,
          supplierId: line.supplierId,
          itemId: line.itemId,
          dimensions: line.dimensions ?? undefined,
          metadata: line.metadata ?? undefined,
        })),
      },
    },
    include: { lines: { orderBy: { lineNumber: "asc" } } },
  });
  assertJournalMirror(originalJournal, reversal);

  const originalClaim = await tx.journalEntry.updateMany({
    where: {
      id: originalJournal.id,
      organizationId: settlement.organizationId,
      status: JournalEntryStatus.POSTED,
    },
    data: {
      status: JournalEntryStatus.REVERSED,
      reversedAt: input.now,
      reversedById: input.actorId,
    },
  });
  if (originalClaim.count !== 1) {
    throw new ConflictError(
      "Customer settlement original journal reversal claim was lost",
    );
  }

  const sourceLink = await createAccountingSourceLink(
    {
      organizationId: settlement.organizationId,
      postingBatchId: postedBatch.id,
      journalEntryId: reversal.id,
      sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
      sourceId: settlement.id,
      sourceNumber: settlement.settlementNumber,
      sourceDate: input.reversalDate,
      metadata: json({
        gate: "phase-5-slice-436-customer-settlement-reversal",
        originalJournalEntryId: originalJournal.id,
        documentHash: input.documentHash,
      }),
    },
    tx,
    {
      actorId: input.actorId,
      audit: true,
      verifyPostingBatch: false,
      verifyJournalEntry: false,
    },
  );
  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: settlement.organizationId,
      actorId: input.actorId,
      action: "CUSTOMER_SETTLEMENT_REVERSAL_LEDGER_POSTED",
      resourceType: "CustomerSettlement",
      resourceId: settlement.id,
      postingBatchId: postedBatch.id,
      journalEntryId: reversal.id,
      message: `Customer settlement ${settlement.settlementNumber} reversal posted`,
      metadata: json({
        originalJournalEntryId: originalJournal.id,
        reversalJournalEntryId: reversal.id,
        sourceVersion: CUSTOMER_SETTLEMENT_REVERSAL_SOURCE_VERSION,
      }),
    },
  });
  await recordReversedJournalCloseInvalidationsInTx(
    tx,
    settlement.organizationId,
    {
      originalJournalEntryId: originalJournal.id,
      reversalJournalEntryId: reversal.id,
      originalPeriodId: originalJournal.periodId,
      reversalPeriodId: period.id,
      reversalDate: input.reversalDate,
      correlationId: postedBatch.id,
      staleReason:
        "Customer settlement reversal changed certified close evidence.",
    },
    { actorId: input.actorId, now: input.now },
  );

  return {
    postingBatchId: postedBatch.id,
    journalEntryId: reversal.id,
    sourceLinkId: sourceLink.id,
  };
}

async function reverseCustomerSettlementInTx(
  tx: Prisma.TransactionClient,
  command: NormalizedReversal,
  control: CustomerSettlementReversalControlContext,
  verifiedLastAuthAt: Date | null,
  now: Date,
) {
  const organizationId = requiredText(control.organizationId, "Organization");
  const actorId = requiredText(control.actorId, "Actor");
  if (command.reversalDate.getTime() > now.getTime() + 5 * 60 * 1000) {
    throw new BusinessRuleError("Reversal date cannot be in the future");
  }

  const organization = await tx.organization.findFirst({
    where: { id: organizationId, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!organization) throw new NotFoundError("Organization not found");

  const actor = await tx.user.findFirst({
    where: { id: actorId, organizationId, isActive: true },
    select: { id: true },
  });
  if (!actor)
    throw new NotFoundError("Active settlement reversal actor not found");

  const settlement = await tx.customerSettlement.findFirst({
    where: {
      id: command.parsed.customerSettlementId,
      organizationId,
    },
    include: { allocations: true },
  });
  if (!settlement) throw new NotFoundError("Customer settlement not found");

  const decision = evaluateSensitiveAction({
    action: "customer.settlement.reverse",
    organizationId,
    actorId,
    actorPermissions: control.actorPermissions,
    lastAuthAt: verifiedLastAuthAt,
    now,
    resourceType: "CustomerSettlement",
    resourceId: settlement.id,
    subjectActorId: settlement.receivedById,
    amount: settlement.amount,
    currency: settlement.currency,
    metadata: {
      customerId: settlement.customerId,
      settlementNumber: settlement.settlementNumber,
      allocationCount: settlement.allocations.length,
      correlationId: command.parsed.correlationId,
    },
  });
  await auditSensitiveActionDecision(tx, decision);
  if (!decision.allowed) return { denied: decision };

  assertAllocationConservation(settlement);
  if (settlement.status === CustomerSettlementStatus.REVERSED) {
    assertReplayMatches(settlement, command, actorId);
    await validateReplayEvidence(tx, settlement);
    return { value: resultFor(settlement, true) };
  }
  if (settlement.status !== CustomerSettlementStatus.POSTED) {
    throw new ConflictError(
      "Customer settlement cannot be reversed from its current state",
    );
  }
  if (command.reversalDate.getTime() < settlement.settlementDate.getTime()) {
    throw new BusinessRuleError(
      "Reversal date cannot precede the settlement date",
    );
  }
  if (
    !settlement.ledgerPostingBatchId ||
    !settlement.journalEntryId ||
    !settlement.postedBusinessEventId
  ) {
    throw new ConflictError(
      "Customer settlement posting evidence is incomplete",
    );
  }
  if (
    settlement.reversalIdempotencyKey ||
    settlement.reversalCorrelationId ||
    settlement.reversalJournalEntryId ||
    settlement.allocations.some(
      (allocation) => allocation.reversalCustomerLedgerEntryId,
    )
  ) {
    throw new ConflictError(
      "Customer settlement has partial reversal evidence",
    );
  }

  const [
    originalEntries,
    originalBatch,
    originalJournal,
    originalLinks,
    idempotencyConflict,
    correlationConflict,
  ] = await Promise.all([
    tx.customerLedgerEntry.findMany({
      where: {
        id: { in: originalLedgerEntryIds(settlement) },
        organizationId,
        customerId: settlement.customerId,
      },
      select: {
        id: true,
        type: true,
        referenceType: true,
        referenceId: true,
        debit: true,
        credit: true,
      },
    }),
    tx.ledgerPostingBatch.findFirst({
      where: {
        id: settlement.ledgerPostingBatchId,
        organizationId,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
        status: LedgerPostingBatchStatus.POSTED,
      },
      select: { id: true },
    }),
    tx.journalEntry.findFirst({
      where: {
        id: settlement.journalEntryId,
        organizationId,
        postingBatchId: settlement.ledgerPostingBatchId,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
      },
      include: {
        lines: { orderBy: { lineNumber: "asc" } },
        reversedByEntries: { select: { id: true }, take: 2 },
      },
    }),
    tx.accountingSourceLink.findMany({
      where: {
        organizationId,
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: settlement.id,
        postingBatchId: settlement.ledgerPostingBatchId,
        journalEntryId: settlement.journalEntryId,
      },
      select: { id: true },
      take: 2,
    }),
    tx.customerSettlement.findFirst({
      where: {
        organizationId,
        reversalIdempotencyKey: command.parsed.idempotencyKey,
        id: { not: settlement.id },
      },
      select: { id: true },
    }),
    tx.customerSettlement.findFirst({
      where: {
        organizationId,
        reversalCorrelationId: command.parsed.correlationId,
        id: { not: settlement.id },
      },
      select: { id: true },
    }),
  ]);

  assertOriginalLedgerEvidence(settlement, originalEntries);
  if (
    !originalBatch ||
    !originalJournal ||
    originalJournal.status !== JournalEntryStatus.POSTED ||
    originalJournal.reversedByEntries.length !== 0 ||
    originalLinks.length !== 1
  ) {
    throw new ConflictError(
      "Customer settlement original accounting evidence is incomplete",
    );
  }
  assertBalancedJournalEntry(originalJournal.lines);
  if (idempotencyConflict) {
    throw new ConflictError(
      "Customer settlement reversal idempotency key is already in use",
    );
  }
  if (correlationConflict) {
    throw new ConflictError(
      "Customer settlement reversal correlation ID is already in use",
    );
  }

  const reversalLedgerIds: string[] = [];
  for (const allocation of orderedAllocations(settlement)) {
    if (!allocation.customerReceivableDocumentId) {
      throw new ConflictError(
        "Customer settlement allocation receivable document evidence is missing",
      );
    }
    const ledgerEntry = await createCustomerLedgerEntry(tx, {
      organizationId,
      customerId: settlement.customerId,
      type: LedgerEntryType.PAYMENT_REVERSAL,
      debit: allocation.amount,
      entryDate: command.reversalDate,
      description: `Reversal of customer settlement ${settlement.settlementNumber}`,
      referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
      referenceId: allocation.customerReceivableDocumentId,
    });
    const allocationClaim = await tx.customerSettlementAllocation.updateMany({
      where: {
        id: allocation.id,
        organizationId,
        customerSettlementId: settlement.id,
        reversalCustomerLedgerEntryId: null,
      },
      data: { reversalCustomerLedgerEntryId: ledgerEntry.id },
    });
    if (allocationClaim.count !== 1) {
      throw new ConflictError(
        "Customer settlement allocation reversal claim was lost",
      );
    }
    await recordCustomerReceivableSettlementReversedInTx(tx, {
      organizationId,
      documentId: allocation.customerReceivableDocumentId,
      actorId: actor.id,
      settlementAllocationId: allocation.id,
      amount: allocation.amount,
      effectiveAt: command.reversalDate,
      evidenceHash: command.parsed.evidenceHash.toLowerCase(),
    });
    reversalLedgerIds.push(ledgerEntry.id);
  }

  const posting = await postReversalInTx(tx, {
    settlement,
    originalJournal,
    actorId: actor.id,
    reversalDate: command.reversalDate,
    idempotencyKey: command.parsed.idempotencyKey,
    idempotencyPayloadHash: command.idempotencyPayloadHash,
    documentHash: command.parsed.documentHash.toLowerCase(),
    now,
  });
  const eventResult = await recordBusinessEventInTx(tx, {
    organizationId,
    eventType: "customer.settlement.reversed",
    eventSource: "INTERNAL",
    schemaVersion: CUSTOMER_SETTLEMENT_REVERSAL_SOURCE_VERSION,
    idempotencyKey: reversalBusinessEventIdempotencyKey(
      settlement.id,
      command.parsed.idempotencyKey,
    ),
    payload: reversalBusinessEventPayload(settlement, {
      reversalCustomerLedgerEntryIds: reversalLedgerIds,
      reversalLedgerPostingBatchId: posting.postingBatchId,
      reversalJournalEntryId: posting.journalEntryId,
      correlationId: command.parsed.correlationId,
    }),
    occurredAt: command.reversalDate,
    actorId: actor.id,
    sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
    sourceId: settlement.id,
    postingBatchId: posting.postingBatchId,
    documentHash: command.parsed.documentHash.toLowerCase(),
    metadata: {
      gate: "phase-5-slice-436-customer-settlement-reversal",
      reasonProvided: true,
      evidenceHash: command.parsed.evidenceHash.toLowerCase(),
    },
    outboxMessages: [
      {
        channel: "NOTIFICATION",
        eventName: "customer_settlement.reversed",
        destination: "accounting",
        payload: reversalOutboxPayload(settlement, posting.postingBatchId),
      },
    ],
  });
  await markBusinessEventAppliedInTx(tx, organizationId, eventResult.event.id);

  const completedClaim = await tx.customerSettlement.updateMany({
    where: {
      id: settlement.id,
      organizationId,
      status: CustomerSettlementStatus.POSTED,
      reversedAt: null,
      reversalDate: null,
      reversedById: null,
      reversalReason: null,
      reversalIdempotencyKey: null,
      reversalIdempotencyPayloadHash: null,
      reversalCorrelationId: null,
      reversalDocumentHash: null,
      reversalEvidenceHash: null,
      reversalLedgerPostingBatchId: null,
      reversalJournalEntryId: null,
      reversalAccountingSourceLinkId: null,
      reversalBusinessEventId: null,
    },
    data: {
      status: CustomerSettlementStatus.REVERSED,
      reversedAt: now,
      reversalDate: command.reversalDate,
      reversedById: actor.id,
      reversalReason: command.parsed.reason,
      reversalIdempotencyKey: command.parsed.idempotencyKey,
      reversalIdempotencyPayloadHash: command.idempotencyPayloadHash,
      reversalCorrelationId: command.parsed.correlationId,
      reversalDocumentHash: command.parsed.documentHash.toLowerCase(),
      reversalEvidenceHash: command.parsed.evidenceHash.toLowerCase(),
      reversalLedgerPostingBatchId: posting.postingBatchId,
      reversalJournalEntryId: posting.journalEntryId,
      reversalAccountingSourceLinkId: posting.sourceLinkId,
      reversalBusinessEventId: eventResult.event.id,
    },
  });
  if (completedClaim.count !== 1) {
    throw new ConflictError("Customer settlement reversal claim was lost");
  }
  const completed = await tx.customerSettlement.findFirst({
    where: { id: settlement.id, organizationId },
    include: { allocations: true },
  });
  if (!completed) {
    throw new ConflictError(
      "Customer settlement reversal evidence is unavailable",
    );
  }
  await tx.auditLog.create({
    data: {
      organizationId,
      entityType: "CustomerSettlement",
      entityId: settlement.id,
      action: "CUSTOMER_SETTLEMENT_REVERSED",
      userId: actor.id,
      changes: json({
        after: {
          status: CustomerSettlementStatus.REVERSED,
          customerId: settlement.customerId,
          settlementNumber: settlement.settlementNumber,
          amount: money(settlement.amount).toFixed(2),
          currency: settlement.currency,
          allocationCount: settlement.allocations.length,
          reasonProvided: true,
          reversalLedgerPostingBatchId: posting.postingBatchId,
          reversalJournalEntryId: posting.journalEntryId,
          reversalBusinessEventId: eventResult.event.id,
          correlationId: command.parsed.correlationId,
        },
      }),
    },
  });

  return { value: resultFor(completed, false) };
}

async function runSerializable<T>(
  client: CustomerSettlementClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (
    let attempt = 1;
    attempt <= CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await client.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      if (isPrismaCode(error, "P2002")) throw error;
      if (
        isPrismaCode(error, "P2034") &&
        attempt < CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS
      ) {
        continue;
      }
      if (isPrismaCode(error, "P2034")) {
        throw new ConflictError(
          "Customer settlement reversal transaction could not be serialized",
        );
      }
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Customer settlement reversal transaction failed.",
        500,
        false,
      );
    }
  }

  throw new ConflictError(
    "Customer settlement reversal transaction could not be serialized",
  );
}

export async function reverseCustomerSettlementWithControls(
  input: ReverseCustomerSettlementInput,
  control: CustomerSettlementReversalControlContext,
  client: CustomerSettlementClient = db,
) {
  const organizationId = requiredText(control.organizationId, "Organization");
  const actorId = requiredText(control.actorId, "Actor");
  const command = normalizeCommand(input, organizationId, actorId);
  const now = new Date();
  const verifiedLastAuthAt = verifiedFreshAuthTime(
    control,
    organizationId,
    actorId,
  );
  const preflight = evaluateSensitiveAction({
    action: "customer.settlement.reverse",
    organizationId,
    actorId,
    actorPermissions: control.actorPermissions,
    lastAuthAt: verifiedLastAuthAt,
    now,
    resourceType: "CustomerSettlement",
    resourceId: command.parsed.customerSettlementId,
    metadata: { correlationId: command.parsed.correlationId },
  });
  if (!preflight.allowed) {
    await auditSensitiveActionDecision(client, preflight);
    assertSensitiveActionAllowed(preflight);
  }

  const execute = async () => {
    const outcome = await runSerializable(client, (tx) =>
      reverseCustomerSettlementInTx(
        tx,
        command,
        control,
        verifiedLastAuthAt,
        now,
      ),
    );
    if ("denied" in outcome && outcome.denied) {
      assertSensitiveActionAllowed(outcome.denied);
      throw new BusinessRuleError("Customer settlement reversal was denied");
    }
    return outcome.value;
  };

  try {
    return await execute();
  } catch (error) {
    if (!isPrismaCode(error, "P2002")) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Customer settlement reversal failed.",
        500,
        false,
      );
    }
    try {
      return await execute();
    } catch (replayError) {
      if (isPrismaCode(replayError, "P2002")) {
        throw new ConflictError(
          "Customer settlement reversal uniqueness conflict",
        );
      }
      if (replayError instanceof ApplicationError) throw replayError;
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Customer settlement reversal replay failed.",
        500,
        false,
      );
    }
  }
}
