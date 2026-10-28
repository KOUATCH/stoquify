import "server-only";

import {
  PaymentExceptionStatus,
  PaymentReconciliationInboxStatus,
  ProviderAccountStatus,
  ProviderEventStatus,
  ReconciliationRunStatus,
  StatementFileStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions";
import { db } from "@/prisma/db";
import { ForbiddenError } from "@/services/_shared/action-errors";
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts";

const READ_PERMISSIONS = [
  "payroll.command.read",
  "payroll.declarations.manage",
  "payroll.payments.reconcile",
  "payments.reconciliation.read",
] as const;

const idSchema = z.string().trim().min(1);
const dateInputSchema = z.union([
  z.date(),
  z.string().trim().min(1),
  z.number(),
]);

export const payrollAdapterOperationsReadModelInputSchema = z.object({
  organizationId: idSchema,
  actorId: idSchema.optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
  limit: z.number().int().positive().max(100).default(30),
  asOf: dateInputSchema.optional(),
  staleStatementHours: z.number().int().positive().max(720).default(72),
  callbackLagMinutes: z.number().int().positive().max(10080).default(60),
});

export type PayrollAdapterOperationsReadModelInput = z.input<
  typeof payrollAdapterOperationsReadModelInputSchema
>;

type DbClient = typeof db | Prisma.TransactionClient;
type OperationsState = "READY" | "ACTION_REQUIRED" | "BLOCKED" | "UNKNOWN";
type ProviderSettlementWorkerAction =
  | "LEASED"
  | "DEAD_LETTERED"
  | "COMPLETED"
  | "RETRY_SCHEDULED";
type ProviderSettlementWorkerActionSource =
  | "WORKER_METADATA"
  | "INBOX_STATUS";

type ProviderSettlementWorkerEvidenceRef = {
  inboxItemId: string;
  source: string;
  status: PaymentReconciliationInboxStatus;
  payloadHash: string;
  externalId: string | null;
  correlationId: string | null;
  workerAction: ProviderSettlementWorkerAction | null;
  workerActionSource: ProviderSettlementWorkerActionSource | null;
  workerActionAt: string | null;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  redactionPolicy: string | null;
};

type ProviderSettlementWorkerState = {
  leasedCount: number;
  retryScheduledCount: number;
  deadLetteredCount: number;
  completedCount: number;
  unknownCount: number;
  latestAction: ProviderSettlementWorkerAction | null;
  latestActionSource: ProviderSettlementWorkerActionSource | null;
  latestActionAt: string | null;
  nextRetryAt: string | null;
  lastErrorCode: string | null;
  evidenceRefs: ProviderSettlementWorkerEvidenceRef[];
};

type ProviderHealthCard = {
  providerAccountId: string;
  providerCode: string;
  displayName: string;
  status: ProviderAccountStatus;
  state: OperationsState;
  currencyCode: string;
  countryCode: string | null;
  statementSource: string | null;
  latestStatementImportedAt: string | null;
  latestStatementFileHash: string | null;
  latestProviderEventReceivedAt: string | null;
  latestReconciliationRunId: string | null;
  latestReconciliationStatus: ReconciliationRunStatus | null;
  latestReconciliationGuard: string | null;
  latestReconciliationRunDedupeKey: string | null;
  openExceptionCount: number;
  deadLetterInboxCount: number;
  failedInboxCount: number;
  processingInboxCount: number;
  retryDueInboxCount: number;
  staleProcessingInboxCount: number;
  laggingCallbackCount: number;
  replayOrTamperEventCount: number;
  duplicateRiskCount: number;
  settlementWorker: ProviderSettlementWorkerState;
  missingSettlementLedger: boolean;
  missingSuspenseLedger: boolean;
  blockers: string[];
  nextAction: string;
};

type AuthorityExecutionCard = {
  declarationId: string;
  declarationEvidenceId: string | null;
  authority: string;
  declarationType: string;
  status: string;
  executionStatus: string | null;
  authorityAdapterKey: string | null;
  authorityCertificationHarnessHash: string | null;
  authorityAdapterProofHash: string | null;
  adapterChaosReleaseGateHash: string | null;
  nextAttemptAt: string | null;
  leasedBy: string | null;
  attempts: number | null;
  errorCode: string | null;
  updatedAt: string;
  blockers: string[];
  nextAction: string;
};

type PaymentAdapterGap = {
  payrollPaymentBatchId: string;
  batchNumber: string;
  status: string;
  method: string;
  reconciliationStatus: string | null;
  paymentAdapterStatus: string | null;
  productionPaymentAutomationSupported: boolean;
  providerCertificationHarnessHash: string | null;
  paymentAdapterProofHash: string | null;
  paymentProviderAdapterContractHash: string | null;
  adapterChaosReleaseGateHash: string | null;
  paymentExceptionId: string | null;
  blockers: string[];
  nextAction: string;
};

type AdapterChaosReleaseGateCard = {
  state: OperationsState;
  authorityAutomationClaims: number;
  providerAutomationClaims: number;
  authorityProofCount: number;
  providerProofCount: number;
  missingAuthorityProofCount: number;
  missingProviderProofCount: number;
  latestAuthorityProofHash: string | null;
  latestProviderProofHash: string | null;
  blockerCodes: string[];
  nextAction: string;
};

export type PayrollAdapterOperationsReadModel = {
  organizationId: string;
  asOf: string;
  summary: {
    providerAccounts: number;
    providerReady: number;
    providerActionRequired: number;
    providerBlocked: number;
    staleStatementProviders: number;
    laggingCallbackProviders: number;
    deadLetterInboxItems: number;
    failedInboxItems: number;
    processingInboxItems: number;
    retryDueInboxItems: number;
    staleProcessingInboxItems: number;
    settlementWorkerLeasedItems: number;
    settlementWorkerRetryScheduledItems: number;
    settlementWorkerDeadLetteredItems: number;
    settlementWorkerCompletedItems: number;
    settlementWorkerUnknownItems: number;
    openPaymentExceptions: number;
    replayOrTamperEvents: number;
    authorityExecutions: number;
    authorityDeadLetter: number;
    authorityRetryScheduled: number;
    authorityHarnessGaps: number;
    paymentAdapterGaps: number;
    adapterChaosGateBlockers: number;
    authorityChaosGateMissing: number;
    providerChaosGateMissing: number;
  };
  providerHealth: ProviderHealthCard[];
  authorityExecutions: AuthorityExecutionCard[];
  paymentAdapterGaps: PaymentAdapterGap[];
  adapterChaosGate: AdapterChaosReleaseGateCard;
  incidentDigest: {
    providerEvents: Array<{
      id: string;
      providerAccountId: string;
      status: ProviderEventStatus;
      eventType: string;
      rawPayloadHash: string;
      signatureValid: boolean;
      receivedAt: string;
      processedAt: string | null;
    }>;
    inboxItems: Array<{
      id: string;
      providerAccountId: string | null;
      source: string;
      status: PaymentReconciliationInboxStatus;
      payloadHash: string;
      attempts: number;
      nextAttemptAt: string | null;
      leasedBy: string | null;
      externalId: string | null;
      correlationId: string | null;
      processedAt: string | null;
      workerAction: ProviderSettlementWorkerAction | null;
      workerActionSource: ProviderSettlementWorkerActionSource | null;
      workerActionAt: string | null;
      workerRedactionPolicy: string | null;
      lastErrorCode: string | null;
    }>;
    exceptions: Array<{
      id: string;
      providerAccountId: string | null;
      type: string;
      severity: string;
      status: PaymentExceptionStatus;
      evidenceHash: string | null;
      slaDeadline: string | null;
    }>;
  };
  redaction: {
    policy: "payroll-adapter-operations-redacted";
    rawPayloadsIncluded: false;
    credentialSecretsIncluded: false;
    salaryOrEmployeeIdentityIncluded: false;
  };
  sourceScope: {
    limit: number;
    providerAccountsReturned: number;
    authorityDeclarationsReturned: number;
    paymentBatchesReturned: number;
    sourceService: "services/payroll/adapter-operations-read-model.service.ts";
  };
};

function assertReadAllowed(
  input: z.output<typeof payrollAdapterOperationsReadModelInputSchema>,
) {
  if (input.moduleDecision && !input.moduleDecision.allowed) {
    throw new ForbiddenError(
      "Payroll module is not available for this tenant.",
    );
  }
  if (!hasAnyRbacPermission(input.actorPermissions, READ_PERMISSIONS)) {
    throw new ForbiddenError(
      "Missing permission for payroll adapter operations read model.",
    );
  }
}

function parseDate(value: Date | string | number | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataString(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "string" && entry.trim().length > 0
    ? entry.trim()
    : null;
}

function metadataNumber(value: unknown, key: string) {
  const entry = asRecord(value)[key];
  return typeof entry === "number" && Number.isFinite(entry) ? entry : null;
}

function dateIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function hoursBetween(later: Date, earlier: Date | null | undefined) {
  if (!earlier) return null;
  return Math.max(0, (later.getTime() - earlier.getTime()) / 36e5);
}

function evidenceHash(value: unknown) {
  return (
    metadataString(value, "evidenceHash") ??
    metadataString(value, "payloadHash") ??
    metadataString(value, "rawPayloadHash") ??
    metadataString(value, "statementFileHash") ??
    null
  );
}

const settlementWorkerActions = new Set<ProviderSettlementWorkerAction>([
  "LEASED",
  "DEAD_LETTERED",
  "COMPLETED",
  "RETRY_SCHEDULED",
]);

type InboxWorkerSourceItem = {
  id: string;
  source: string;
  status: PaymentReconciliationInboxStatus;
  payloadHash: string;
  payloadSummary?: unknown;
  externalId?: string | null;
  correlationId?: string | null;
  nextAttemptAt?: Date | string | null;
  processedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  lastError?: string | null;
};

function workerAction(value: unknown): ProviderSettlementWorkerAction | null {
  return typeof value === "string" &&
    settlementWorkerActions.has(value as ProviderSettlementWorkerAction)
    ? (value as ProviderSettlementWorkerAction)
    : null;
}

function workerActionFromStatus(
  status: PaymentReconciliationInboxStatus,
): ProviderSettlementWorkerAction | null {
  if (status === PaymentReconciliationInboxStatus.PROCESSING) return "LEASED";
  if (status === PaymentReconciliationInboxStatus.FAILED)
    return "RETRY_SCHEDULED";
  if (status === PaymentReconciliationInboxStatus.DEAD_LETTER)
    return "DEAD_LETTERED";
  if (status === PaymentReconciliationInboxStatus.PROCESSED) return "COMPLETED";
  return null;
}

function safeWorkerErrorCode(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z0-9_:-]{2,80}$/.test(trimmed)
    ? trimmed
    : "REDACTED_ERROR_PRESENT";
}

function sortableTime(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function settlementWorkerEvidenceRef(
  item: InboxWorkerSourceItem,
): ProviderSettlementWorkerEvidenceRef {
  const worker = asRecord(asRecord(item.payloadSummary).worker);
  const action = workerAction(worker.action);
  const derivedAction = action ?? workerActionFromStatus(item.status);
  return {
    inboxItemId: item.id,
    source: item.source,
    status: item.status,
    payloadHash: item.payloadHash,
    externalId: item.externalId ?? null,
    correlationId: item.correlationId ?? null,
    workerAction: derivedAction,
    workerActionSource: action ? "WORKER_METADATA" : derivedAction ? "INBOX_STATUS" : null,
    workerActionAt:
      dateIso(metadataString(worker, "asOf")) ?? dateIso(item.updatedAt),
    nextAttemptAt:
      dateIso(metadataString(worker, "nextAttemptAt")) ??
      dateIso(item.nextAttemptAt),
    lastErrorCode:
      safeWorkerErrorCode(metadataString(worker, "errorCode")) ??
      safeWorkerErrorCode(item.lastError),
    redactionPolicy: metadataString(worker, "redactionPolicy"),
  };
}

function summarizeSettlementWorker(
  items: InboxWorkerSourceItem[],
): ProviderSettlementWorkerState {
  const evidenceRefs = items
    .map(settlementWorkerEvidenceRef)
    .sort(
      (left, right) =>
        sortableTime(right.workerActionAt) - sortableTime(left.workerActionAt),
    );
  const count = (action: ProviderSettlementWorkerAction) =>
    evidenceRefs.filter((ref) => ref.workerAction === action).length;
  const nextRetryAt = evidenceRefs
    .filter((ref) => ref.workerAction === "RETRY_SCHEDULED")
    .map((ref) => ref.nextAttemptAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
  const latest = evidenceRefs[0] ?? null;
  return {
    leasedCount: count("LEASED"),
    retryScheduledCount: count("RETRY_SCHEDULED"),
    deadLetteredCount: count("DEAD_LETTERED"),
    completedCount: count("COMPLETED"),
    unknownCount: evidenceRefs.filter((ref) => !ref.workerAction).length,
    latestAction: latest?.workerAction ?? null,
    latestActionSource: latest?.workerActionSource ?? null,
    latestActionAt: latest?.workerActionAt ?? null,
    nextRetryAt,
    lastErrorCode:
      evidenceRefs.find((ref) => Boolean(ref.lastErrorCode))?.lastErrorCode ??
      null,
    evidenceRefs: evidenceRefs.slice(0, 5),
  };
}

function executionFromDeclaration(metadata: unknown) {
  const execution = asRecord(asRecord(metadata).authorityAdapterExecution);
  return Object.keys(execution).length > 0 ? execution : null;
}

function blockerList(...entries: Array<[boolean, string]>) {
  return entries.filter(([present]) => present).map(([, code]) => code);
}

function nextProviderAction(blockers: string[]) {
  if (blockers.includes("PROVIDER_ACCOUNT_BLOCKED")) {
    return "Reactivate or remap the provider account before relying on settlement automation.";
  }
  if (blockers.includes("PROVIDER_DEAD_LETTER_INBOX")) {
    return "Triage dead-letter provider inbox items with hashed payload evidence and idempotency proof.";
  }
  if (blockers.includes("PROVIDER_INBOX_PROCESSING_STALE")) {
    return "Reclaim stale provider inbox leases through the payment reconciliation inbox worker before settlement signoff.";
  }
  if (blockers.includes("PROVIDER_RECONCILIATION_RUN_IN_PROGRESS")) {
    return "Wait for the existing reconciliation run or investigate the run guard before starting another run.";
  }
  if (blockers.includes("PROVIDER_RECONCILIATION_RUN_OPEN")) {
    return "Resolve the open reconciliation run before provider settlement or close signoff.";
  }
  if (blockers.includes("PROVIDER_REPLAY_OR_TAMPER_EVENT")) {
    return "Investigate replay or tamper evidence before settlement or close signoff.";
  }
  if (blockers.includes("PROVIDER_STATEMENT_STALE")) {
    return "Import or verify the latest provider statement before claiming settlement readiness.";
  }
  if (blockers.includes("PROVIDER_CALLBACK_LAGGING")) {
    return "Check provider callbacks and replay only through idempotent provider evidence.";
  }
  if (blockers.includes("PROVIDER_LEDGER_MAPPING_MISSING")) {
    return "Complete settlement and suspense ledger mappings before reconciliation close.";
  }
  if (blockers.length > 0)
    return "Resolve provider evidence blockers before release.";
  return "Provider evidence is ready for monitored payroll reconciliation.";
}

function nextAuthorityAction(blockers: string[], status: string | null) {
  if (status === "DEAD_LETTER") {
    return "Triage the authority adapter dead-letter and record corrected replay or manual authority evidence.";
  }
  if (blockers.includes("AUTHORITY_CHAOS_GATE_PROOF_MISSING")) {
    return "Run the certified authority adapter chaos release gate and attach its proof hash before automated filing claims.";
  }
  if (status === "PAYMENT_DUE") {
    return "Record statutory payment-due evidence and continue authority payment reconciliation.";
  }
  if (status === "AMENDMENT_REQUIRED") {
    return "Capture maker-checker amendment evidence before close certification proceeds.";
  }
  if (blockers.includes("AUTHORITY_CERTIFICATION_HARNESS_MISSING")) {
    return "Attach a reviewed authority certification harness hash before automated filing claims.";
  }
  if (status === "RETRY_SCHEDULED") {
    return "Monitor the scheduled authority retry and keep lifecycle evidence unchanged until accepted or rejected.";
  }
  if (status === "FAILED") {
    return "Review the redacted adapter failure and choose corrected replay or manual declaration evidence.";
  }
  return "Continue processing through the certified authority adapter worker.";
}

function nextPaymentAction(blockers: string[]) {
  if (blockers.includes("PROVIDER_CERTIFICATION_HARNESS_MISSING")) {
    return "Attach the provider certification harness hash before payment automation claims.";
  }
  if (blockers.includes("PAYMENT_ADAPTER_PROOF_INCOMPLETE")) {
    return "Complete provider adapter proof or keep settlement manual.";
  }
  if (blockers.includes("PAYMENT_EXCEPTION_OPEN")) {
    return "Resolve the linked payment exception before close signoff.";
  }
  if (blockers.includes("PROVIDER_CHAOS_GATE_PROOF_MISSING")) {
    return "Run the certified provider adapter chaos release gate and attach its proof hash before payment automation claims.";
  }
  return "Payment adapter proof is ready for provider reconciliation monitoring.";
}

function nextAdapterChaosGateAction(blockers: string[]) {
  if (blockers.includes("AUTHORITY_CHAOS_GATE_PROOF_MISSING")) {
    return "Run and persist the certified authority adapter chaos release gate before automated filing readiness can be claimed.";
  }
  if (blockers.includes("PROVIDER_CHAOS_GATE_PROOF_MISSING")) {
    return "Run and persist the certified provider adapter chaos release gate before payment automation readiness can be claimed.";
  }
  return "Adapter chaos release gate proof is present for current automation claims.";
}

export async function getPayrollAdapterOperationsReadModel(
  input: PayrollAdapterOperationsReadModelInput,
  client: DbClient = db,
): Promise<PayrollAdapterOperationsReadModel> {
  const parsed = payrollAdapterOperationsReadModelInputSchema.parse(input);
  assertReadAllowed(parsed);
  const asOf = parseDate(parsed.asOf, new Date());
  const staleStatementCutoff = new Date(
    asOf.getTime() - parsed.staleStatementHours * 36e5,
  );
  const callbackLagCutoff = new Date(
    asOf.getTime() - parsed.callbackLagMinutes * 60 * 1000,
  );

  const [
    providerAccounts,
    providerEvents,
    statementFiles,
    paymentExceptions,
    inboxItems,
    processedInboxItems,
    reconciliationRuns,
    declarations,
    paymentBatches,
  ] = await Promise.all([
    client.providerAccount.findMany({
      where: { organizationId: parsed.organizationId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        providerCode: true,
        displayName: true,
        status: true,
        countryCode: true,
        currencyCode: true,
        statementSource: true,
        settlementLedgerAccountId: true,
        suspenseLedgerAccountId: true,
        updatedAt: true,
      },
    }),
    client.providerEvent.findMany({
      where: {
        organizationId: parsed.organizationId,
        status: {
          in: [
            ProviderEventStatus.RECEIVED,
            ProviderEventStatus.FAILED,
            ProviderEventStatus.TAMPERED,
            ProviderEventStatus.REPLAYED,
            ProviderEventStatus.REJECTED,
          ],
        },
      },
      orderBy: { receivedAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        providerAccountId: true,
        status: true,
        eventType: true,
        rawPayloadHash: true,
        signatureValid: true,
        receivedAt: true,
        processedAt: true,
      },
    }),
    client.statementFile.findMany({
      where: { organizationId: parsed.organizationId, archivedAt: null },
      orderBy: { importedAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        providerAccountId: true,
        fileHash: true,
        status: true,
        importedAt: true,
        periodEnd: true,
      },
    }),
    client.paymentException.findMany({
      where: {
        organizationId: parsed.organizationId,
        status: {
          notIn: [
            PaymentExceptionStatus.RESOLVED,
            PaymentExceptionStatus.DISMISSED,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        providerAccountId: true,
        type: true,
        severity: true,
        status: true,
        evidence: true,
        slaDeadline: true,
      },
    }),
    client.paymentReconciliationInboxItem.findMany({
      where: {
        organizationId: parsed.organizationId,
        status: {
          in: [
            PaymentReconciliationInboxStatus.RECEIVED,
            PaymentReconciliationInboxStatus.PROCESSING,
            PaymentReconciliationInboxStatus.FAILED,
            PaymentReconciliationInboxStatus.DEAD_LETTER,
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        providerAccountId: true,
        source: true,
        status: true,
        payloadHash: true,
        payloadSummary: true,
        attempts: true,
        nextAttemptAt: true,
        leasedBy: true,
        lastError: true,
        externalId: true,
        correlationId: true,
        processedAt: true,
        updatedAt: true,
      },
    }),
    client.paymentReconciliationInboxItem.findMany({
      where: {
        organizationId: parsed.organizationId,
        status: PaymentReconciliationInboxStatus.PROCESSED,
      },
      orderBy: { updatedAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        providerAccountId: true,
        source: true,
        status: true,
        payloadHash: true,
        payloadSummary: true,
        attempts: true,
        nextAttemptAt: true,
        leasedBy: true,
        lastError: true,
        externalId: true,
        correlationId: true,
        processedAt: true,
        updatedAt: true,
      },
    }),
    client.reconciliationRun.findMany({
      where: {
        organizationId: parsed.organizationId,
        status: {
          in: [
            ReconciliationRunStatus.DRAFT,
            ReconciliationRunStatus.RUNNING,
            ReconciliationRunStatus.NEEDS_REVIEW,
            ReconciliationRunStatus.BLOCKED,
            ReconciliationRunStatus.FAILED,
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        providerAccountId: true,
        status: true,
        certificateHash: true,
        metadata: true,
        updatedAt: true,
      },
    }),
    client.payrollDeclaration.findMany({
      where: { organizationId: parsed.organizationId },
      orderBy: { updatedAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        authority: true,
        declarationType: true,
        status: true,
        metadata: true,
        updatedAt: true,
        evidenceItems: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            productionSubmissionSupported: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    }),
    client.payrollPaymentBatch.findMany({
      where: { organizationId: parsed.organizationId },
      orderBy: { updatedAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        batchNumber: true,
        status: true,
        method: true,
        reconciliationStatus: true,
        paymentExceptionId: true,
        metadata: true,
      },
    }),
  ]);

  const workerInboxItems = [...inboxItems, ...processedInboxItems];

  const latestStatementByProvider = new Map<
    string,
    (typeof statementFiles)[number]
  >();
  for (const file of statementFiles) {
    if (!latestStatementByProvider.has(file.providerAccountId)) {
      latestStatementByProvider.set(file.providerAccountId, file);
    }
  }

  const latestRunByProvider = new Map<
    string,
    (typeof reconciliationRuns)[number]
  >();
  for (const run of reconciliationRuns) {
    if (!latestRunByProvider.has(run.providerAccountId)) {
      latestRunByProvider.set(run.providerAccountId, run);
    }
  }

  const providerEventIncidentRows = providerEvents.map((event) => ({
    id: event.id,
    providerAccountId: event.providerAccountId,
    status: event.status,
    eventType: event.eventType,
    rawPayloadHash: event.rawPayloadHash,
    signatureValid: event.signatureValid,
    receivedAt: event.receivedAt.toISOString(),
    processedAt: dateIso(event.processedAt),
  }));

  const providerHealth = providerAccounts.map<ProviderHealthCard>((account) => {
    const latestStatement = latestStatementByProvider.get(account.id) ?? null;
    const latestRun = latestRunByProvider.get(account.id) ?? null;
    const accountEvents = providerEvents.filter(
      (event) => event.providerAccountId === account.id,
    );
    const accountExceptions = paymentExceptions.filter(
      (exception) => exception.providerAccountId === account.id,
    );
    const accountInbox = inboxItems.filter(
      (item) => item.providerAccountId === account.id,
    );
    const accountWorkerInbox = workerInboxItems.filter(
      (item) => item.providerAccountId === account.id,
    );
    const latestStatementAge = hoursBetween(
      asOf,
      latestStatement?.importedAt ?? null,
    );
    const staleStatement =
      !latestStatement ||
      latestStatement.status === StatementFileStatus.REJECTED ||
      latestStatement.importedAt < staleStatementCutoff;
    const laggingCallbackCount = accountEvents.filter(
      (event) =>
        event.status === ProviderEventStatus.RECEIVED &&
        !event.processedAt &&
        event.receivedAt < callbackLagCutoff,
    ).length;
    const replayOrTamperEventCount = accountEvents.filter(
      (event) =>
        event.status === ProviderEventStatus.TAMPERED ||
        event.status === ProviderEventStatus.REPLAYED ||
        event.signatureValid === false,
    ).length;
    const duplicateRiskCount = accountExceptions.filter(
      (exception) =>
        exception.type === "DUPLICATE_PROVIDER_REFERENCE" ||
        exception.type === "REPLAY_SPIKE",
    ).length;
    const deadLetterInboxCount = accountInbox.filter(
      (item) => item.status === PaymentReconciliationInboxStatus.DEAD_LETTER,
    ).length;
    const failedInboxCount = accountInbox.filter(
      (item) => item.status === PaymentReconciliationInboxStatus.FAILED,
    ).length;
    const processingInboxCount = accountInbox.filter(
      (item) => item.status === PaymentReconciliationInboxStatus.PROCESSING,
    ).length;
    const retryDueInboxCount = accountInbox.filter(
      (item) =>
        item.status === PaymentReconciliationInboxStatus.FAILED &&
        (!item.nextAttemptAt || item.nextAttemptAt <= asOf),
    ).length;
    const staleProcessingInboxCount = accountInbox.filter(
      (item) =>
        item.status === PaymentReconciliationInboxStatus.PROCESSING &&
        item.nextAttemptAt !== null &&
        item.nextAttemptAt <= asOf,
    ).length;
    const settlementWorker = summarizeSettlementWorker(accountWorkerInbox);
    const missingSettlementLedger = !account.settlementLedgerAccountId;
    const missingSuspenseLedger = !account.suspenseLedgerAccountId;
    const reconciliationInProgress =
      latestRun?.status === ReconciliationRunStatus.RUNNING;
    const reconciliationOpen = Boolean(
      latestRun &&
      (
        [
          ReconciliationRunStatus.NEEDS_REVIEW,
          ReconciliationRunStatus.BLOCKED,
          ReconciliationRunStatus.FAILED,
        ] as ReconciliationRunStatus[]
      ).includes(latestRun.status),
    );
    const blockers = blockerList(
      [
        account.status !== ProviderAccountStatus.ACTIVE,
        "PROVIDER_ACCOUNT_BLOCKED",
      ],
      [staleStatement, "PROVIDER_STATEMENT_STALE"],
      [laggingCallbackCount > 0, "PROVIDER_CALLBACK_LAGGING"],
      [replayOrTamperEventCount > 0, "PROVIDER_REPLAY_OR_TAMPER_EVENT"],
      [deadLetterInboxCount > 0, "PROVIDER_DEAD_LETTER_INBOX"],
      [failedInboxCount > 0, "PROVIDER_FAILED_INBOX"],
      [staleProcessingInboxCount > 0, "PROVIDER_INBOX_PROCESSING_STALE"],
      [reconciliationInProgress, "PROVIDER_RECONCILIATION_RUN_IN_PROGRESS"],
      [reconciliationOpen, "PROVIDER_RECONCILIATION_RUN_OPEN"],
      [accountExceptions.length > 0, "PROVIDER_EXCEPTIONS_OPEN"],
      [
        missingSettlementLedger || missingSuspenseLedger,
        "PROVIDER_LEDGER_MAPPING_MISSING",
      ],
    );
    const state: OperationsState = blockers.some((blocker) =>
      [
        "PROVIDER_ACCOUNT_BLOCKED",
        "PROVIDER_REPLAY_OR_TAMPER_EVENT",
        "PROVIDER_DEAD_LETTER_INBOX",
        "PROVIDER_INBOX_PROCESSING_STALE",
      ].includes(blocker),
    )
      ? "BLOCKED"
      : blockers.length > 0
        ? "ACTION_REQUIRED"
        : latestStatementAge === null
          ? "UNKNOWN"
          : "READY";

    return {
      providerAccountId: account.id,
      providerCode: account.providerCode,
      displayName: account.displayName,
      status: account.status,
      state,
      currencyCode: account.currencyCode,
      countryCode: account.countryCode,
      statementSource: account.statementSource,
      latestStatementImportedAt: dateIso(latestStatement?.importedAt),
      latestStatementFileHash: latestStatement?.fileHash ?? null,
      latestProviderEventReceivedAt: dateIso(accountEvents[0]?.receivedAt),
      latestReconciliationRunId: latestRun?.id ?? null,
      latestReconciliationStatus: latestRun?.status ?? null,
      latestReconciliationGuard: metadataString(
        latestRun?.metadata,
        "concurrencyGuard",
      ),
      latestReconciliationRunDedupeKey: metadataString(
        latestRun?.metadata,
        "runDedupeKey",
      ),
      openExceptionCount: accountExceptions.length,
      deadLetterInboxCount,
      failedInboxCount,
      processingInboxCount,
      retryDueInboxCount,
      staleProcessingInboxCount,
      laggingCallbackCount,
      replayOrTamperEventCount,
      duplicateRiskCount,
      settlementWorker,
      missingSettlementLedger,
      missingSuspenseLedger,
      blockers,
      nextAction: nextProviderAction(blockers),
    };
  });

  const authorityExecutions = declarations
    .map<AuthorityExecutionCard | null>((declaration) => {
      const execution = executionFromDeclaration(declaration.metadata);
      const latestEvidence = declaration.evidenceItems[0] ?? null;
      const latestEvidenceMetadata = asRecord(latestEvidence?.metadata);
      const executionStatus = metadataString(execution, "status");
      const authorityCertificationHarnessHash =
        metadataString(execution, "authorityCertificationHarnessHash") ??
        metadataString(
          latestEvidenceMetadata,
          "authorityCertificationHarnessHash",
        );
      const authorityAdapterProofHash =
        metadataString(execution, "authorityAdapterProofHash") ??
        metadataString(latestEvidenceMetadata, "authorityAdapterProofHash");
      const authorityAdapterKey =
        metadataString(execution, "authorityAdapterKey") ??
        metadataString(latestEvidenceMetadata, "authorityAdapterKey");
      const adapterChaosReleaseGateHash =
        metadataString(execution, "adapterChaosReleaseGateHash") ??
        metadataString(latestEvidenceMetadata, "adapterChaosReleaseGateHash");
      const productionSupported =
        latestEvidence?.productionSubmissionSupported === true;
      if (!execution && !productionSupported) return null;
      const blockers = blockerList(
        [
          productionSupported && !authorityCertificationHarnessHash,
          "AUTHORITY_CERTIFICATION_HARNESS_MISSING",
        ],
        [executionStatus === "DEAD_LETTER", "AUTHORITY_EXECUTION_DEAD_LETTER"],
        [executionStatus === "FAILED", "AUTHORITY_EXECUTION_FAILED"],
        [
          productionSupported && !adapterChaosReleaseGateHash,
          "AUTHORITY_CHAOS_GATE_PROOF_MISSING",
        ],
        [
          executionStatus === "AMENDMENT_REQUIRED",
          "AUTHORITY_AMENDMENT_REQUIRED",
        ],
      );
      return {
        declarationId: declaration.id,
        declarationEvidenceId:
          metadataString(execution, "declarationEvidenceId") ??
          latestEvidence?.id ??
          null,
        authority: declaration.authority,
        declarationType: declaration.declarationType,
        status: declaration.status,
        executionStatus,
        authorityAdapterKey,
        authorityCertificationHarnessHash,
        authorityAdapterProofHash,
        adapterChaosReleaseGateHash,
        nextAttemptAt: metadataString(execution, "nextAttemptAt"),
        leasedBy: metadataString(execution, "leasedBy"),
        attempts: metadataNumber(execution, "attempts"),
        errorCode: metadataString(execution, "errorCode"),
        updatedAt: declaration.updatedAt.toISOString(),
        blockers,
        nextAction: nextAuthorityAction(blockers, executionStatus),
      };
    })
    .filter((value): value is AuthorityExecutionCard => Boolean(value));

  const paymentAdapterGaps = paymentBatches
    .map<PaymentAdapterGap | null>((batch) => {
      const metadata = asRecord(batch.metadata);
      const paymentAdapterStatus = metadataString(
        metadata,
        "paymentAdapterStatus",
      );
      const providerCertificationHarnessHash = metadataString(
        metadata,
        "providerCertificationHarnessHash",
      );
      const productionPaymentAutomationSupported =
        metadata.productionPaymentAutomationSupported === true;
      const certificationBlockers = Array.isArray(
        metadata.paymentAdapterCertificationBlockers,
      )
        ? metadata.paymentAdapterCertificationBlockers.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
      const certifiedRequested =
        paymentAdapterStatus === "SUPPORTED_CERTIFIED" ||
        productionPaymentAutomationSupported;
      const adapterChaosReleaseGateHash = metadataString(
        metadata,
        "adapterChaosReleaseGateHash",
      );
      const blockers = [
        ...blockerList(
          [
            certifiedRequested && !providerCertificationHarnessHash,
            "PROVIDER_CERTIFICATION_HARNESS_MISSING",
          ],
          [
            certificationBlockers.length > 0,
            "PAYMENT_ADAPTER_PROOF_INCOMPLETE",
          ],
          [
            productionPaymentAutomationSupported && !adapterChaosReleaseGateHash,
            "PROVIDER_CHAOS_GATE_PROOF_MISSING",
          ],
          [Boolean(batch.paymentExceptionId), "PAYMENT_EXCEPTION_OPEN"],
        ),
        ...certificationBlockers,
      ];
      if (blockers.length === 0) return null;
      return {
        payrollPaymentBatchId: batch.id,
        batchNumber: batch.batchNumber,
        status: batch.status,
        method: batch.method,
        reconciliationStatus: batch.reconciliationStatus,
        paymentAdapterStatus,
        productionPaymentAutomationSupported,
        providerCertificationHarnessHash,
        paymentAdapterProofHash: metadataString(
          metadata,
          "paymentAdapterProofHash",
        ),
        paymentProviderAdapterContractHash: metadataString(
          metadata,
          "paymentProviderAdapterContractHash",
        ),
        adapterChaosReleaseGateHash,
        paymentExceptionId: batch.paymentExceptionId,
        blockers,
        nextAction: nextPaymentAction(blockers),
      };
    })
    .filter((value): value is PaymentAdapterGap => Boolean(value));

  const authorityChaosGateClaims = declarations.map((declaration): string | null => {
    const latestEvidence = declaration.evidenceItems[0] ?? null;
    if (latestEvidence?.productionSubmissionSupported !== true) return null;
    const execution = executionFromDeclaration(declaration.metadata);
    return (
      metadataString(execution, "adapterChaosReleaseGateHash") ??
      metadataString(latestEvidence.metadata, "adapterChaosReleaseGateHash")
    );
  });
  const providerChaosGateClaims = paymentBatches.map((batch): string | null => {
    const metadata = asRecord(batch.metadata);
    if (metadata.productionPaymentAutomationSupported !== true) return null;
    return metadataString(metadata, "adapterChaosReleaseGateHash");
  });
  const authorityAutomationClaims = authorityChaosGateClaims.filter(
    (_hash, index) => declarations[index]?.evidenceItems[0]?.productionSubmissionSupported === true,
  );
  const providerAutomationClaims = providerChaosGateClaims.filter((_hash, index) => {
    const metadata = asRecord(paymentBatches[index]?.metadata);
    return metadata.productionPaymentAutomationSupported === true;
  });
  const authorityChaosGateProofs = authorityAutomationClaims.filter(
    (hash): hash is string => Boolean(hash),
  );
  const providerChaosGateProofs = providerAutomationClaims.filter(
    (hash): hash is string => Boolean(hash),
  );
  const authorityChaosGateMissing =
    authorityAutomationClaims.length - authorityChaosGateProofs.length;
  const providerChaosGateMissing =
    providerAutomationClaims.length - providerChaosGateProofs.length;
  const adapterChaosGateBlockers = blockerList(
    [
      authorityChaosGateMissing > 0,
      "AUTHORITY_CHAOS_GATE_PROOF_MISSING",
    ],
    [providerChaosGateMissing > 0, "PROVIDER_CHAOS_GATE_PROOF_MISSING"],
  );
  const adapterChaosGate: AdapterChaosReleaseGateCard = {
    state:
      adapterChaosGateBlockers.length > 0
        ? "ACTION_REQUIRED"
        : authorityAutomationClaims.length + providerAutomationClaims.length > 0
          ? "READY"
          : "UNKNOWN",
    authorityAutomationClaims: authorityAutomationClaims.length,
    providerAutomationClaims: providerAutomationClaims.length,
    authorityProofCount: authorityChaosGateProofs.length,
    providerProofCount: providerChaosGateProofs.length,
    missingAuthorityProofCount: authorityChaosGateMissing,
    missingProviderProofCount: providerChaosGateMissing,
    latestAuthorityProofHash: authorityChaosGateProofs[0] ?? null,
    latestProviderProofHash: providerChaosGateProofs[0] ?? null,
    blockerCodes: adapterChaosGateBlockers,
    nextAction: nextAdapterChaosGateAction(adapterChaosGateBlockers),
  };

  const deadLetterInboxItems = inboxItems.filter(
    (item) => item.status === PaymentReconciliationInboxStatus.DEAD_LETTER,
  ).length;
  const failedInboxItems = inboxItems.filter(
    (item) => item.status === PaymentReconciliationInboxStatus.FAILED,
  ).length;
  const processingInboxItems = inboxItems.filter(
    (item) => item.status === PaymentReconciliationInboxStatus.PROCESSING,
  ).length;
  const retryDueInboxItems = inboxItems.filter(
    (item) =>
      item.status === PaymentReconciliationInboxStatus.FAILED &&
      (!item.nextAttemptAt || item.nextAttemptAt <= asOf),
  ).length;
  const staleProcessingInboxItems = inboxItems.filter(
    (item) =>
      item.status === PaymentReconciliationInboxStatus.PROCESSING &&
      item.nextAttemptAt !== null &&
      item.nextAttemptAt <= asOf,
  ).length;
  const replayOrTamperEvents = providerEvents.filter(
    (event) =>
      event.status === ProviderEventStatus.TAMPERED ||
      event.status === ProviderEventStatus.REPLAYED ||
      event.signatureValid === false,
  ).length;

  return {
    organizationId: parsed.organizationId,
    asOf: asOf.toISOString(),
    summary: {
      providerAccounts: providerHealth.length,
      providerReady: providerHealth.filter((card) => card.state === "READY")
        .length,
      providerActionRequired: providerHealth.filter(
        (card) => card.state === "ACTION_REQUIRED",
      ).length,
      providerBlocked: providerHealth.filter((card) => card.state === "BLOCKED")
        .length,
      staleStatementProviders: providerHealth.filter((card) =>
        card.blockers.includes("PROVIDER_STATEMENT_STALE"),
      ).length,
      laggingCallbackProviders: providerHealth.filter(
        (card) => card.laggingCallbackCount > 0,
      ).length,
      deadLetterInboxItems,
      failedInboxItems,
      processingInboxItems,
      retryDueInboxItems,
      staleProcessingInboxItems,
      settlementWorkerLeasedItems: providerHealth.reduce(
        (total, card) => total + card.settlementWorker.leasedCount,
        0,
      ),
      settlementWorkerRetryScheduledItems: providerHealth.reduce(
        (total, card) => total + card.settlementWorker.retryScheduledCount,
        0,
      ),
      settlementWorkerDeadLetteredItems: providerHealth.reduce(
        (total, card) => total + card.settlementWorker.deadLetteredCount,
        0,
      ),
      settlementWorkerCompletedItems: providerHealth.reduce(
        (total, card) => total + card.settlementWorker.completedCount,
        0,
      ),
      settlementWorkerUnknownItems: providerHealth.reduce(
        (total, card) => total + card.settlementWorker.unknownCount,
        0,
      ),
      openPaymentExceptions: paymentExceptions.length,
      replayOrTamperEvents,
      authorityExecutions: authorityExecutions.length,
      authorityDeadLetter: authorityExecutions.filter(
        (execution) => execution.executionStatus === "DEAD_LETTER",
      ).length,
      authorityRetryScheduled: authorityExecutions.filter(
        (execution) => execution.executionStatus === "RETRY_SCHEDULED",
      ).length,
      authorityHarnessGaps: authorityExecutions.filter((execution) =>
        execution.blockers.includes("AUTHORITY_CERTIFICATION_HARNESS_MISSING"),
      ).length,
      paymentAdapterGaps: paymentAdapterGaps.length,
      adapterChaosGateBlockers:
        adapterChaosGate.missingAuthorityProofCount +
        adapterChaosGate.missingProviderProofCount,
      authorityChaosGateMissing: adapterChaosGate.missingAuthorityProofCount,
      providerChaosGateMissing: adapterChaosGate.missingProviderProofCount,
    },
    providerHealth,
    authorityExecutions,
    paymentAdapterGaps,
    adapterChaosGate,
    incidentDigest: {
      providerEvents: providerEventIncidentRows,
      inboxItems: workerInboxItems.map((item) => {
        const worker = settlementWorkerEvidenceRef(item);
        return {
          id: item.id,
          providerAccountId: item.providerAccountId,
          source: item.source,
          status: item.status,
          payloadHash: item.payloadHash,
          attempts: item.attempts,
          nextAttemptAt: dateIso(item.nextAttemptAt),
          leasedBy: item.leasedBy,
          externalId: item.externalId,
          correlationId: item.correlationId,
          processedAt: dateIso(item.processedAt),
          workerAction: worker.workerAction,
          workerActionSource: worker.workerActionSource,
          workerActionAt: worker.workerActionAt,
          workerRedactionPolicy: worker.redactionPolicy,
          lastErrorCode: worker.lastErrorCode,
        };
      }),
      exceptions: paymentExceptions.map((exception) => ({
        id: exception.id,
        providerAccountId: exception.providerAccountId,
        type: exception.type,
        severity: exception.severity,
        status: exception.status,
        evidenceHash: evidenceHash(exception.evidence),
        slaDeadline: dateIso(exception.slaDeadline),
      })),
    },
    redaction: {
      policy: "payroll-adapter-operations-redacted",
      rawPayloadsIncluded: false,
      credentialSecretsIncluded: false,
      salaryOrEmployeeIdentityIncluded: false,
    },
    sourceScope: {
      limit: parsed.limit,
      providerAccountsReturned: providerAccounts.length,
      authorityDeclarationsReturned: declarations.length,
      paymentBatchesReturned: paymentBatches.length,
      sourceService:
        "services/payroll/adapter-operations-read-model.service.ts",
    },
  };
}
