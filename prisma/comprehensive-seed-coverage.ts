import { Prisma, type PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "../lib/permissions";
import { resolveCameroonStandardVatRateBps } from "../services/regulatory/country-packs/resolve";

const COUNT = 50;
const ORG_COUNT = 5;
const SEED_REGULATORY_DATE = "2026-06-11";
const SEED_CAMEROON_VAT_RATE_BPS = resolveCameroonStandardVatRateBps(SEED_REGULATORY_DATE).value;
const SEED_CAMEROON_VAT_RATE_PERCENT = SEED_CAMEROON_VAT_RATE_BPS / 100;
const SEED_CAMEROON_VAT_RATE_RATIO = SEED_CAMEROON_VAT_RATE_BPS / 10000;
const ID_PREFIX = "cmp_";
const ORGANIZATION_ID_PREFIX = `${ID_PREFIX}org_`;
const seedIndexes = Array.from({ length: COUNT }, (_, index) => index + 1);
const orgIndexes = Array.from({ length: ORG_COUNT }, (_, index) => index + 1);

type SeedContext = {
  orgIndex: number;
  organizationId: string;
  idPrefix: string;
  documentPrefix: string;
  emailSuffix: string;
  countryCode: string;
  currency: string;
};

type ModelField = (typeof Prisma.dmmf.datamodel.models)[number]["fields"][number];

const pad = (value: number) => value.toString().padStart(3, "0");
const orgIdFor = (value: number) => `${ORGANIZATION_ID_PREFIX}${pad(value)}`;
const orgCodeFor = (value: number) => `org${pad(value)}`;
const contexts: SeedContext[] = orgIndexes.map((orgIndex) => ({
  orgIndex,
  organizationId: orgIdFor(orgIndex),
  idPrefix: `${orgIdFor(orgIndex)}_`,
  documentPrefix: `CMP${pad(orgIndex)}`,
  emailSuffix: orgCodeFor(orgIndex),
  countryCode: orgIndex % 2 === 0 ? "SN" : "CM",
  currency: orgIndex % 2 === 0 ? "XOF" : "XAF",
}));

const day = (value: number) => new Date(Date.UTC(2026, 4, value, 9, 0, 0));
const money = (value: number) => Number(value.toFixed(2));
const qty = (value: number) => Number(value.toFixed(3));
const id = (context: SeedContext, model: string, value: number) =>
  `${context.idPrefix}${model}_${pad(value)}`;
const globalId = (model: string, value: number) =>
  `${ID_PREFIX}${model}_${pad(value)}`;
const globalOrdinal = (context: SeedContext, value: number) =>
  (context.orgIndex - 1) * COUNT + value;
const accountingPeriodIdFor = (context: SeedContext, value: number) =>
  id(context, "accounting_period", ((value - 1) % 12) + 1);

const modelByName = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
);
const enumValues = new Map(
  Prisma.dmmf.datamodel.enums.map((entry) => [
    entry.name,
    entry.values.map((value) => value.name),
  ]),
);

const COVERAGE_MODELS = [
  "Verification",
  "SupplierBankAccount",
  "SupplierBankChangeRequest",
  "SupplierInvoice",
  "SupplierInvoiceLine",
  "ThreeWayMatch",
  "SupplierPayment",
  "SupplierPaymentAllocation",
  "PayrollEmployee",
  "PayrollContract",
  "PayrollRubrique",
  "PayrollEmployeeRubriqueAssignment",
  "PayrollSalaryChangeRequest",
  "PayrollPaymentDestinationChangeRequest",
  "PayrollPeriod",
  "PayrollAttendanceSnapshot",
  "PayrollRun",
  "PayrollRunLine",
  "PayrollPayslip",
  "PayrollPayslipLine",
  "PayrollDeclaration",
  "PayrollDeclarationEvidence",
  "PayrollPaymentBatch",
  "PayrollPaymentAllocation",
  "StockCountSession",
  "StockCountLine",
  "BusinessEvent",
  "BusinessEventOutbox",
  "PaymentRail",
  "ProviderAccount",
  "SettlementAccount",
  "ProviderEvent",
  "StatementFile",
  "StatementLine",
  "PaymentTransaction",
  "ReconciliationRun",
  "MatchRecord",
  "SuspenseItem",
  "PaymentException",
  "PaymentReconciliationInboxItem",
  "POSOfflineDevice",
  "POSOfflineSyncBatch",
  "POSOfflineEvent",
  "POSOfflineSyncConflict",
  "POSOfflineSyncCertificate",
  "CloseRun",
  "CloseChecklistItem",
  "CloseAssuranceFinding",
  "CloseEvidenceItem",
  "ClosePackExport",
  "AccountantReview",
  "AccountantComment",
  "ComplianceAdapterConfig",
  "FiscalSequence",
  "FiscalDocument",
  "FiscalDocumentLine",
  "ComplianceSubmission",
  "ComplianceEvidence",
  "WorkflowAssuranceCheckDefinition",
  "WorkflowAssuranceCheckRun",
  "WorkflowAssuranceIncident",
  "WorkflowAssuranceIncidentEvent",
  "WorkflowAssuranceAlertDelivery",
  "WorkflowAssuranceWaiver",
] as const;

const CREATE_ORDER = [
  "Verification",
  "SupplierBankAccount",
  "SupplierBankChangeRequest",
  "SupplierInvoice",
  "SupplierInvoiceLine",
  "ThreeWayMatch",
  "SupplierPayment",
  "SupplierPaymentAllocation",
  "PayrollEmployee",
  "PayrollContract",
  "PayrollRubrique",
  "PayrollEmployeeRubriqueAssignment",
  "PayrollSalaryChangeRequest",
  "PayrollPaymentDestinationChangeRequest",
  "PayrollPeriod",
  "PayrollAttendanceSnapshot",
  "BusinessEvent",
  "BusinessEventOutbox",
  "PaymentRail",
  "ProviderAccount",
  "SettlementAccount",
  "ProviderEvent",
  "StatementFile",
  "StatementLine",
  "PaymentTransaction",
  "ReconciliationRun",
  "MatchRecord",
  "SuspenseItem",
  "PaymentException",
  "PaymentReconciliationInboxItem",
  "PayrollRun",
  "PayrollRunLine",
  "PayrollPayslip",
  "PayrollPayslipLine",
  "PayrollDeclaration",
  "PayrollDeclarationEvidence",
  "PayrollPaymentBatch",
  "PayrollPaymentAllocation",
  "StockCountSession",
  "StockCountLine",
  "POSOfflineDevice",
  "POSOfflineSyncBatch",
  "POSOfflineEvent",
  "POSOfflineSyncConflict",
  "POSOfflineSyncCertificate",
  "CloseRun",
  "CloseChecklistItem",
  "CloseAssuranceFinding",
  "CloseEvidenceItem",
  "ClosePackExport",
  "AccountantReview",
  "AccountantComment",
  "ComplianceAdapterConfig",
  "FiscalSequence",
  "FiscalDocument",
  "FiscalDocumentLine",
  "ComplianceSubmission",
  "ComplianceEvidence",
  "WorkflowAssuranceCheckDefinition",
  "WorkflowAssuranceCheckRun",
  "WorkflowAssuranceIncident",
  "WorkflowAssuranceIncidentEvent",
  "WorkflowAssuranceAlertDelivery",
  "WorkflowAssuranceWaiver",
] as const;

const DELETE_ORDER = [...CREATE_ORDER].reverse();

const delegateOverrides: Record<string, string> = {
  POSOfflineDevice: "pOSOfflineDevice",
  POSOfflineSyncBatch: "pOSOfflineSyncBatch",
  POSOfflineEvent: "pOSOfflineEvent",
  POSOfflineSyncConflict: "pOSOfflineSyncConflict",
  POSOfflineSyncCertificate: "pOSOfflineSyncCertificate",
};

const idStemOverrides: Record<string, string> = {
  Verification: "verification",
  POSStation: "pos_station",
  POSSession: "pos_session",
  POSOfflineDevice: "pos_offline_device",
  POSOfflineSyncBatch: "pos_offline_sync_batch",
  POSOfflineEvent: "pos_offline_event",
  POSOfflineSyncConflict: "pos_offline_sync_conflict",
  POSOfflineSyncCertificate: "pos_offline_sync_certificate",
  PaymentRail: "payment_rail",
  ProviderAccount: "provider_account",
  SettlementAccount: "settlement_account",
  ProviderEvent: "provider_event",
  StatementFile: "statement_file",
  StatementLine: "statement_line",
  PaymentTransaction: "payment_transaction",
  ReconciliationRun: "reconciliation_run",
  MatchRecord: "match_record",
  SuspenseItem: "suspense_item",
  PaymentException: "payment_exception",
  PaymentReconciliationInboxItem: "payment_reconciliation_inbox",
  PayrollEmployee: "payroll_employee",
  PayrollContract: "payroll_contract",
  PayrollRubrique: "payroll_rubrique",
  PayrollEmployeeRubriqueAssignment: "payroll_rubrique_assignment",
  PayrollSalaryChangeRequest: "payroll_salary_change",
  PayrollPaymentDestinationChangeRequest: "payroll_payment_destination_change",
  PayrollPeriod: "payroll_period",
  PayrollAttendanceSnapshot: "payroll_attendance_snapshot",
  PayrollRun: "payroll_run",
  PayrollRunLine: "payroll_run_line",
  PayrollPayslip: "payroll_payslip",
  PayrollPayslipLine: "payroll_payslip_line",
  PayrollDeclaration: "payroll_declaration",
  PayrollDeclarationEvidence: "payroll_declaration_evidence",
  PayrollPaymentBatch: "payroll_payment_batch",
  PayrollPaymentAllocation: "payroll_payment_allocation",
  SupplierBankAccount: "supplier_bank_account",
  SupplierBankChangeRequest: "supplier_bank_change",
  SupplierInvoice: "supplier_invoice",
  SupplierInvoiceLine: "supplier_invoice_line",
  ThreeWayMatch: "three_way_match",
  SupplierPayment: "supplier_payment",
  SupplierPaymentAllocation: "supplier_payment_allocation",
  StockCountSession: "stock_count_session",
  StockCountLine: "stock_count_line",
  BusinessEvent: "business_event",
  BusinessEventOutbox: "business_event_outbox",
  CloseRun: "close_run",
  CloseChecklistItem: "close_checklist_item",
  CloseAssuranceFinding: "close_assurance_finding",
  CloseEvidenceItem: "close_evidence_item",
  ClosePackExport: "close_pack_export",
  AccountantReview: "accountant_review",
  AccountantComment: "accountant_comment",
  ComplianceAdapterConfig: "compliance_adapter_config",
  FiscalSequence: "fiscal_sequence",
  FiscalDocument: "fiscal_document",
  FiscalDocumentLine: "fiscal_document_line",
  ComplianceSubmission: "compliance_submission",
  ComplianceEvidence: "compliance_evidence",
  WorkflowAssuranceCheckDefinition: "workflow_definition",
  WorkflowAssuranceCheckRun: "workflow_check_run",
  WorkflowAssuranceIncident: "workflow_incident",
  WorkflowAssuranceIncidentEvent: "workflow_incident_event",
  WorkflowAssuranceAlertDelivery: "workflow_alert_delivery",
  WorkflowAssuranceWaiver: "workflow_waiver",
  AccountingPeriod: "accounting_period",
  LedgerPostingBatch: "ledger_posting_batch",
  JournalEntry: "journal_entry",
  AccountingSourceLink: "accounting_source_link",
  PurchaseOrder: "purchase_order",
  PurchaseOrderLine: "purchase_order_line",
  GoodsReceipt: "goods_receipt",
  GoodsReceiptLine: "goods_receipt_line",
  SalesOrder: "sales_order",
  SalesOrderLine: "sales_order_line",
};

const preferredEnum: Record<string, string> = {
  PaymentMethod: "BANK_TRANSFER",
  PaymentRailType: "MOBILE_MONEY",
  PaymentDirection: "INBOUND",
  PaymentTransactionState: "SETTLED",
  MatchRule: "EXACT_PROVIDER_TRANSACTION_ID",
  MatchStatus: "APPROVED",
  SuspenseType: "AMOUNT_MISMATCH",
  SuspenseStatus: "OPEN",
  PaymentExceptionType: "AMOUNT_MISMATCH",
  PaymentExceptionStatus: "OPEN",
  ExceptionSeverity: "HIGH",
  ReconciliationRunStatus: "SIGNED",
  PayrollEmployeeStatus: "ACTIVE",
  PayrollContractType: "CDI",
  PayrollContractStatus: "ACTIVE",
  PayrollRubriqueKind: "EARNING",
  PayrollRubriqueValueType: "FIXED_AMOUNT",
  PayrollRubriqueStatus: "ACTIVE",
  PayrollRubriqueAssignmentStatus: "ACTIVE",
  PayrollSalaryChangeStatus: "APPROVED",
  PayrollPaymentDestinationChangeStatus: "APPLIED",
  PayrollPeriodStatus: "APPROVED",
  PayrollFrequency: "MONTHLY",
  PayrollAttendanceSnapshotStatus: "FROZEN",
  PayrollRunStatus: "APPROVED",
  PayrollPayslipStatus: "EMITTED",
  PayrollPayslipLineCategory: "EARNING",
  PayrollDeclarationStatus: "SUBMITTED",
  PayrollDeclarationEvidenceTransition: "SUBMIT",
  PayrollPaymentBatchStatus: "APPROVED",
  StockCountStatus: "POSTED",
  BusinessEventSource: "INTERNAL",
  BusinessEventStatus: "APPLIED",
  BusinessOutboxChannel: "NOTIFICATION",
  BusinessOutboxStatus: "PENDING",
  FiscalDocumentType: "SALES_INVOICE",
  FiscalDocumentStatus: "CERTIFIED",
  FiscalSequenceStatus: "ACTIVE",
  ComplianceSubmissionOperation: "CERTIFY",
  ComplianceSubmissionStatus: "CERTIFIED",
  ComplianceAdapterConfigStatus: "ACTIVE",
  ComplianceAdapterEnvironment: "SANDBOX",
  ComplianceEvidenceType: "CANONICAL_PAYLOAD",
  ComplianceEvidenceSource: "PLATFORM",
  WorkflowAssuranceWorkflow: "CROSS_MODULE",
  WorkflowAssuranceExecutionMode: "SCHEDULED_SCAN",
  WorkflowAssuranceSeverity: "WARNING",
  WorkflowAssuranceRunType: "SCHEDULED",
  WorkflowAssuranceRunStatus: "COMPLETED",
  WorkflowAssuranceResultStatus: "PASSED",
  WorkflowAssuranceIncidentStatus: "OPEN",
  WorkflowAssuranceIncidentEventType: "CREATED",
  WorkflowAssuranceAlertChannel: "IN_APP",
  WorkflowAssuranceAlertDeliveryStatus: "PENDING",
  WorkflowAssuranceWaiverStatus: "REQUESTED",
};

function delegateName(model: string) {
  return delegateOverrides[model] ?? `${model[0].toLowerCase()}${model.slice(1)}`;
}

function idStem(model: string) {
  return idStemOverrides[model] ?? model.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function recordId(model: string, context: SeedContext, index: number) {
  if (model === "WorkflowAssuranceCheckDefinition") {
    return globalId(idStem(model), globalOrdinal(context, index));
  }
  return id(context, idStem(model), index);
}

function relatedRecordId(targetModel: string, context: SeedContext, index: number) {
  if (targetModel === "Organization") return context.organizationId;
  if (targetModel === "WorkflowAssuranceCheckDefinition") {
    return globalId("workflow_definition", globalOrdinal(context, index));
  }
  if (targetModel === "AccountingPeriod") return accountingPeriodIdFor(context, index);
  return id(context, idStem(targetModel), index);
}

function scalarIdValue(fieldName: string, context: SeedContext, index: number) {
  if (fieldName === "organizationId") return context.organizationId;
  if (fieldName === "periodId" || fieldName === "accountingPeriodId") {
    return accountingPeriodIdFor(context, index);
  }
  if (fieldName === "runById" || fieldName.endsWith("ById") || fieldName === "actorId" || fieldName === "ownerId" || fieldName === "requesterId") {
    return id(context, "user", index);
  }
  if (fieldName === "terminalId" || fieldName === "registerId") return id(context, "pos_station", index);
  if (fieldName === "locationId") return id(context, "location", ((index - 1) % COUNT) + 1);
  if (fieldName === "sourceId") return id(context, "business_event", index);
  if (fieldName === "postingBatchId" || fieldName === "ledgerPostingBatchId") {
    return id(context, "ledger_posting_batch", index);
  }
  if (fieldName === "journalEntryId") return id(context, "journal_entry", index);
  if (fieldName === "accountingSourceLinkId") return id(context, "accounting_source_link", index);
  if (fieldName === "paymentTransactionId") return id(context, "payment_transaction", index);
  return `${fieldName}-${context.emailSuffix}-${pad(index)}`;
}

function stringValue(model: string, field: ModelField, context: SeedContext, index: number) {
  const base = `${context.emailSuffix}-${model}-${field.name}-${pad(index)}`;
  if (field.name === "countryCode") return context.countryCode;
  if (field.name === "currency" || field.name === "currencyCode") return context.currency;
  if (field.name === "requiredPermission") return PERMISSIONS.DASHBOARD_READ;
  if (field.name === "email") return `${model.toLowerCase()}.${pad(index)}.${context.emailSuffix}@stockflow.test`;
  if (field.name.toLowerCase().includes("hash")) return `hash-${base}`;
  if (field.name.toLowerCase().includes("number")) return `${context.documentPrefix}-${field.name.toUpperCase()}-${pad(index)}`;
  if (field.name.toLowerCase().includes("key")) return `key-${base}`;
  if (field.name.toLowerCase().includes("code")) return `CODE-${context.emailSuffix}-${pad(index)}`;
  if (field.name.toLowerCase().includes("status")) return "seeded";
  if (field.name.toLowerCase().includes("route")) return `/dashboard/seed/${context.emailSuffix}/${pad(index)}`;
  if (field.name.toLowerCase().includes("channel")) return `SEED_CHANNEL_${pad(index)}`;
  if (field.name.toLowerCase().includes("environment")) return "SANDBOX";
  if (field.name.toLowerCase().includes("version")) return "2026.seed";
  if (field.name.toLowerCase().includes("year")) return "2026";
  return `${model} ${field.name} ${context.emailSuffix} ${pad(index)}`;
}

function fieldValue(model: string, field: ModelField, context: SeedContext, index: number) {
  if (field.kind === "enum") {
    return preferredEnum[field.type] ?? enumValues.get(field.type)?.[0];
  }

  if (field.name.endsWith("Id") && field.type === "String") {
    return scalarIdValue(field.name, context, index);
  }

  if (field.type === "String") return stringValue(model, field, context, index);
  if (field.type === "Int") return field.name.toLowerCase().includes("version") ? 1 : index;
  if (field.type === "BigInt") return BigInt(index);
  if (field.type === "Float") return index + 0.5;
  if (field.type === "Decimal") {
    if (field.name.toLowerCase().includes("quantity")) return qty(1 + index / 10);
    if (field.name.toLowerCase().includes("rate")) return SEED_CAMEROON_VAT_RATE_PERCENT;
    return money(1000 + index * 17);
  }
  if (field.type === "Boolean") return index % 2 === 0;
  if (field.type === "DateTime") return day(index);
  if (field.type === "Json") return { seed: true, model, index };
  if (field.type === "Bytes") return Buffer.from(`seed-${model}-${index}`);
  return null;
}

function buildRow(modelName: string, context: SeedContext, index: number) {
  const model = modelByName.get(modelName);
  if (!model) throw new Error(`Model ${modelName} not found in Prisma DMMF`);

  const row: Record<string, unknown> = {
    id: recordId(modelName, context, index),
  };

  for (const field of model.fields) {
    if (field.kind !== "object") continue;
    if (!field.isRequired || !field.relationFromFields?.length) continue;

    for (const relationField of field.relationFromFields) {
      row[relationField] = relatedRecordId(field.type, context, index);
    }
  }

  for (const field of model.fields) {
    if (field.kind === "object") continue;
    if (field.name in row) continue;
    if (field.name === "id") continue;
    if (field.hasDefaultValue && !field.isRequired) continue;
    if (field.hasDefaultValue && field.name !== "createdAt" && field.name !== "updatedAt") continue;
    if (!field.isRequired && !["createdAt", "updatedAt"].includes(field.name)) continue;
    if (field.name === "createdAt" || field.name === "updatedAt") {
      row[field.name] = day(index);
      continue;
    }
    row[field.name] = fieldValue(modelName, field, context, index);
  }

  return applyModelOverrides(modelName, row, context, index);
}

function applyModelOverrides(
  modelName: string,
  row: Record<string, unknown>,
  context: SeedContext,
  index: number,
) {
  if (modelName === "WorkflowAssuranceCheckDefinition") {
    row.id = globalId("workflow_definition", globalOrdinal(context, index));
    row.checkKey = `seed.${context.emailSuffix}.${pad(index)}`;
    row.version = 1;
  }
  if (modelName === "WorkflowAssuranceCheckRun" || modelName === "WorkflowAssuranceIncident") {
    row.checkKey = `seed.${context.emailSuffix}.${pad(index)}`;
    row.definitionVersion = 1;
  }
  if (modelName === "WorkflowAssuranceIncident") {
    row.sourceType = "BusinessEvent";
    row.sourceId = id(context, "business_event", index);
    row.sourceHash = `hash-workflow-source-${context.emailSuffix}-${pad(index)}`;
    row.fingerprint = `fingerprint-${context.emailSuffix}-${pad(index)}`;
  }
  if (modelName === "FiscalSequence") {
    row.fiscalYear = "2026";
    row.fiscalPeriodKey = `P${pad(((index - 1) % 12) + 1)}`;
    row.scopeKey = `SEED-${pad(index)}`;
  }
  if (modelName === "FiscalDocument") {
    row.fiscalYear = "2026";
    row.fiscalPeriodKey = `P${pad(((index - 1) % 12) + 1)}`;
    row.sequenceScopeKey = `SEED-${pad(index)}`;
    row.sequenceId = id(context, "fiscal_sequence", index);
    row.subtotal = money(1000 + index * 17);
    row.taxAmount = money((1000 + index * 17) * SEED_CAMEROON_VAT_RATE_RATIO);
    row.totalAmount = money(Number(row.subtotal) + Number(row.taxAmount));
  }
  if (modelName === "PayrollPeriod") {
    row.periodStart = new Date(Date.UTC(2026, index - 1, 1));
    row.periodEnd = new Date(Date.UTC(2026, index, 0, 23, 59, 59));
    row.payDate = new Date(Date.UTC(2026, index, 5, 9, 0, 0));
  }
  if (modelName === "PayrollRunLine") {
    row.calculationSnapshot = { seed: true, employeeId: row.employeeId };
    row.ruleProvenance = { seed: true, countryPack: "2026.seed" };
  }
  if (modelName === "StockCountLine") {
    row.systemQuantity = qty(20 + index);
    row.countedQuantity = qty(19 + index);
    row.varianceQuantity = qty(-1);
  }
  if (modelName === "POSOfflineEvent") {
    row.deviceSeq = index;
    row.payload = { seed: true, provisionalReference: row.provisionalReference };
  }
  if (modelName === "ReconciliationRun") {
    row.businessDate = day(index);
    row.periodStart = day(index);
    row.periodEnd = day(index + 1);
  }
  if (modelName === "MatchRecord") {
    row.confidence = 99.5;
  }
  if (modelName === "PaymentTransaction") {
    row.legacyPaymentId = id(context, "payment", index);
  }
  if (modelName === "BusinessEvent") {
    row.payload = { seed: true, organizationId: context.organizationId, index };
  }
  if (modelName === "BusinessEventOutbox") {
    row.payload = { seed: true, businessEventId: row.businessEventId };
  }
  if (modelName === "ComplianceAdapterConfig") {
    row.authorityChannel = `SEED_AUTHORITY_${pad(index)}`;
  }
  if (modelName === "ComplianceSubmission") {
    row.authorityChannel = `SEED_AUTHORITY_${pad(index)}`;
  }
  return row;
}

async function createMany(prisma: PrismaClient, modelName: string, rows: Array<Record<string, unknown>>) {
  const delegate = (prisma as any)[delegateName(modelName)];
  if (!delegate?.createMany) throw new Error(`Prisma delegate missing for ${modelName}`);
  await delegate.createMany({ data: rows });
}

async function deleteMany(prisma: PrismaClient, modelName: string) {
  const delegate = (prisma as any)[delegateName(modelName)];
  if (!delegate?.deleteMany) throw new Error(`Prisma delegate missing for ${modelName}`);
  return delegate.deleteMany({ where: { id: { startsWith: ID_PREFIX } } });
}

async function countMany(prisma: PrismaClient, modelName: string) {
  const delegate = (prisma as any)[delegateName(modelName)];
  if (!delegate?.count) throw new Error(`Prisma delegate missing for ${modelName}`);
  return delegate.count({ where: { id: { startsWith: ID_PREFIX } } });
}

export async function clearComprehensiveCoverageData(prisma: PrismaClient) {
  console.log("Clearing comprehensive coverage seed records...");
  for (const modelName of DELETE_ORDER) {
    const result = await deleteMany(prisma, modelName);
    if (result.count > 0) {
      console.log(`  deleted ${result.count} ${modelName}`);
    }
  }
}

export async function seedComprehensiveCoverageData(prisma: PrismaClient) {
  console.log("Seeding comprehensive coverage records for new schema entities...");
  for (const modelName of CREATE_ORDER) {
    const rows = contexts.flatMap((context) =>
      seedIndexes.map((index) => buildRow(modelName, context, index)),
    );
    await createMany(prisma, modelName, rows);
    console.log(`  seeded ${rows.length} ${modelName}`);
  }
}

export async function verifyComprehensiveCoverageCounts(prisma: PrismaClient) {
  const counts = await Promise.all(
    COVERAGE_MODELS.map(async (modelName) => ({
      model: modelName,
      count: await countMany(prisma, modelName),
      minimum: ORG_COUNT * COUNT,
    })),
  );
  const lowCounts = counts.filter((entry) => entry.count < entry.minimum);

  console.table(counts);

  if (lowCounts.length > 0) {
    throw new Error(
      `Comprehensive coverage seed failed: ${lowCounts
        .map((entry) => `${entry.model}=${entry.count}/${entry.minimum}`)
        .join(", ")}`,
    );
  }
}
