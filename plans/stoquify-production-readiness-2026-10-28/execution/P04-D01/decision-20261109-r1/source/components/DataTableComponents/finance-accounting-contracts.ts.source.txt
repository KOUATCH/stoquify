import { z } from "zod"

import {
  buildCanonicalTableExportIntent,
  canonicalTableExportIntentSchema,
  createCanonicalTableQuery,
  defineCanonicalTableContract,
  type CanonicalTableColumn,
  type CanonicalTableContract,
  type CanonicalTableQuery,
  type CanonicalTableSelection,
  type TableDataOwnership,
  type TableArchetype,
  type TableLocale,
} from "./table-system-contract"

export const financePaymentsLedgerTableContract = defineCanonicalTableContract({
  id: "finance.payments-ledger",
  version: 1,
  route: "/dashboard/finance/payments",
  module: "finance",
  archetype: "ledger",
  dataOwnership: "hybrid-server-seed",
  rowId: "id",
  labels: { en: "Finance payment ledger", fr: "Grand livre des paiements" },
  access: {
    readPermission: "finance.payments.read",
    requiredModule: "finance",
    tenantScoped: true,
    redactionPolicy: "finance-payments-ledger-v1",
  },
  query: {
    searchParam: "q",
    defaultPageSize: 10,
    maxPageSize: 50,
    allowedPageSizes: [5, 10, 20, 50],
    allowedSorts: ["paymentNumber", "counterparty", "method", "status", "amount", "createdAt"],
    allowedFilters: [{ id: "status" }, { id: "method" }, { id: "startDate" }, { id: "endDate" }],
  },
  columns: {
    allowed: [
      { id: "paymentNumber", label: { en: "Payment", fr: "Paiement" }, defaultVisible: true, hideable: false, sortable: true, filterable: true, frozen: "start" },
      { id: "counterparty", label: { en: "Counterparty", fr: "Contrepartie" }, defaultVisible: true, sortable: true, frozen: "start" },
      { id: "method", label: { en: "Method", fr: "Methode" }, defaultVisible: true, sortable: true },
      { id: "status", label: { en: "Status", fr: "Statut" }, defaultVisible: true, sortable: true, filterable: true },
      { id: "amount", label: { en: "Amount", fr: "Montant" }, defaultVisible: true, sortable: true, alignment: "right" },
      { id: "createdAt", label: { en: "Time", fr: "Heure" }, defaultVisible: true, sortable: true },
    ],
  },
  selection: { enabled: false, allowedScopes: [], clearOnQueryChange: true },
  actions: [
    { id: "view-evidence", requiredPermission: "finance.payments.read", requiredModule: "finance", protectedAction: true, mutatesBusinessTruth: false },
  ],
  export: {
    enabled: true,
    requiredPermission: "finance.payments.read",
    requiredModule: "finance",
    sourceReadModel: "finance-dashboard.recent-payments",
    serverFinalized: true,
    formats: ["csv", "xlsx", "pdf"],
  },
  builtInViews: [],
})

type FinanceStatementBehavior = {
  frozenIdentityColumnIds: readonly string[]
  numericColumnIds: readonly string[]
  multiCurrencyTotals: "per-currency" | "single-context"
  requiresPeriodEntityContext: true
  drillToEvidence: true
  editableDraft: boolean
  postedEvidenceReadOnly: boolean
}

export const financeStatementBehaviorByTableId: Readonly<Record<string, FinanceStatementBehavior>> = Object.freeze({
  "finance.receivables": {
    frozenIdentityColumnIds: ["documentNumber", "counterparty"],
    numericColumnIds: ["amount", "balance"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "finance.receivables-history": {
    frozenIdentityColumnIds: ["documentNumber", "counterparty"],
    numericColumnIds: ["amount", "balance"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "finance.payables": {
    frozenIdentityColumnIds: ["documentNumber", "counterparty"],
    numericColumnIds: ["amount", "balance"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "finance.payables-history": {
    frozenIdentityColumnIds: ["documentNumber", "counterparty"],
    numericColumnIds: ["amount", "movement"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "finance.cash-history": {
    frozenIdentityColumnIds: ["transactionNumber", "transactionDate"],
    numericColumnIds: ["amount", "balance"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "accounting.journal-entries-posted": {
    frozenIdentityColumnIds: ["entryNumber", "entryDate"],
    numericColumnIds: ["debit", "credit"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "accounting.journal-entries-drafts": {
    frozenIdentityColumnIds: ["entryNumber", "entryDate"],
    numericColumnIds: ["debit", "credit"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: true,
    postedEvidenceReadOnly: false,
  },
  "accounting.trial-balance": {
    frozenIdentityColumnIds: ["code", "name"],
    numericColumnIds: ["activityDebit", "activityCredit", "debitBalance", "creditBalance"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "accounting.profit-loss": {
    frozenIdentityColumnIds: ["code", "account"],
    numericColumnIds: ["amount"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "accounting.balance-sheet": {
    frozenIdentityColumnIds: ["code", "account"],
    numericColumnIds: ["amount"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "finance.cash-flow": {
    frozenIdentityColumnIds: ["lineCode", "lineName"],
    numericColumnIds: ["inflow", "outflow", "net"],
    multiCurrencyTotals: "per-currency",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "accounting.close-evidence": {
    frozenIdentityColumnIds: ["evidenceId", "evidenceType"],
    numericColumnIds: ["evidenceCount"],
    multiCurrencyTotals: "single-context",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
  "accounting.close-findings": {
    frozenIdentityColumnIds: ["status", "detail"],
    numericColumnIds: [],
    multiCurrencyTotals: "single-context",
    requiresPeriodEntityContext: true,
    drillToEvidence: true,
    editableDraft: false,
    postedEvidenceReadOnly: true,
  },
})

const financeStatementColumn = (
  id: string,
  en: string,
  fr: string,
  options: Omit<CanonicalTableColumn, "id" | "label" | "defaultVisible"> = {},
): CanonicalTableColumn => ({
  id,
  label: { en, fr },
  defaultVisible: true,
  ...options,
})

function createFinanceStatementContract(input: {
  id: string
  route: string
  module: string
  readPermission: string
  readPermissionsAnyOf?: readonly string[]
  labels: { en: string; fr: string }
  sourceReadModel: string
  rowId?: string
  columns: readonly CanonicalTableColumn[]
  archetype?: TableArchetype
  allowedSorts: readonly string[]
  dataOwnership?: TableDataOwnership
  defaultPageSize?: number
  allowedPageSizes?: readonly number[]
  allowedFilters?: readonly { id: string }[]
  exportFormats?: readonly ("csv" | "xlsx" | "pdf" | "json")[]
  actions?: CanonicalTableContract["actions"]
}) {
  return defineCanonicalTableContract({
    id: input.id,
    version: 1,
    route: input.route,
    module: input.module,
    archetype: input.archetype ?? "ledger",
    dataOwnership: input.dataOwnership ?? "server-offset",
    rowId: input.rowId ?? "id",
    labels: input.labels,
    access: {
      readPermission: input.readPermission,
      requiredModule: input.module,
      tenantScoped: true,
      redactionPolicy: `${input.id}-v1`,
      ...(input.readPermissionsAnyOf ? { readPermissionsAnyOf: input.readPermissionsAnyOf } : {}),
    },
    query: {
      searchParam: "q",
      defaultPageSize: input.defaultPageSize ?? 25,
      maxPageSize: 100,
      allowedPageSizes: input.allowedPageSizes ?? [25, 50, 100],
      allowedSorts: input.allowedSorts,
      allowedFilters: input.allowedFilters ?? [{ id: "periodId" }, { id: "currency" }, { id: "startDate" }, { id: "endDate" }],
    },
    columns: { allowed: input.columns },
    selection: { enabled: false, allowedScopes: [], clearOnQueryChange: true },
    actions: input.actions ?? [
      { id: "view-evidence", requiredPermission: input.readPermission, requiredModule: input.module, protectedAction: true, mutatesBusinessTruth: false },
    ],
    export: {
      enabled: true,
      requiredPermission: input.readPermission,
      requiredModule: input.module,
      sourceReadModel: input.sourceReadModel,
      serverFinalized: true,
      formats: input.exportFormats ?? ["csv", "xlsx", "pdf"],
    },
    builtInViews: [],
  })
}

const financeLedgerColumns = [
  financeStatementColumn("documentNumber", "Document", "Document", { sortable: true, frozen: "start" }),
  financeStatementColumn("counterparty", "Counterparty", "Contrepartie", { sortable: true, frozen: "start" }),
  financeStatementColumn("dueDate", "Due date", "Echeance", { sortable: true }),
  financeStatementColumn("status", "Status", "Statut", { sortable: true }),
  financeStatementColumn("currency", "Currency", "Devise", { sortable: true }),
  financeStatementColumn("amount", "Amount", "Montant", { sortable: true, alignment: "right" }),
  financeStatementColumn("balance", "Balance", "Solde", { sortable: true, alignment: "right" }),
  financeStatementColumn("evidence", "Evidence", "Preuve", { exportable: false }),
] as const

export const financeReceivablesTableContract = createFinanceStatementContract({
  id: "finance.receivables",
  route: "/dashboard/finance/receivables",
  module: "finance",
  readPermission: "finance.receivables.read",
  labels: { en: "Receivables", fr: "Creances clients" },
  sourceReadModel: "finance-dashboard.recent-payments",
  columns: financeLedgerColumns,
  allowedSorts: ["documentNumber", "counterparty", "dueDate", "status", "amount", "balance"],
})

export const financeReceivablesHistoryTableContract = createFinanceStatementContract({
  id: "finance.receivables-history",
  route: "/dashboard/finance/receivables/history",
  module: "finance",
  readPermission: "finance.receivables.read",
  readPermissionsAnyOf: ["finance.read"],
  rowId: "referenceId",
  labels: { en: "Receivable open-item history", fr: "Historique des creances ouvertes" },
  sourceReadModel: "accounting.ar-open-items",
  columns: financeLedgerColumns,
  allowedFilters: [{ id: "customerId" }, { id: "asOf" }, { id: "recordedThrough" }],
  allowedSorts: ["documentNumber", "counterparty", "dueDate", "status", "amount", "balance"],
})

export const financePayablesTableContract = createFinanceStatementContract({
  id: "finance.payables",
  route: "/dashboard/finance/payables",
  module: "finance",
  readPermission: "finance.payables.read",
  labels: { en: "Payables", fr: "Dettes fournisseurs" },
  sourceReadModel: "finance-dashboard.recent-payments",
  columns: financeLedgerColumns,
  allowedSorts: ["documentNumber", "counterparty", "dueDate", "status", "amount", "balance"],
})

const apHistoryColumns = [
  financeStatementColumn("documentNumber", "Document", "Document", { sortable: true, frozen: "start" }),
  financeStatementColumn("counterparty", "Supplier", "Fournisseur", { sortable: true, frozen: "start" }),
  financeStatementColumn("dueDate", "Due date", "Echeance", { sortable: true }),
  financeStatementColumn("status", "Status", "Statut", { sortable: true }),
  financeStatementColumn("currency", "Currency", "Devise", { sortable: true }),
  financeStatementColumn("amount", "Amount", "Montant", { sortable: true, alignment: "right" }),
  financeStatementColumn("movement", "Payable movement", "Mouvement payable", { sortable: true, alignment: "right" }),
  financeStatementColumn("evidence", "Evidence", "Preuve", { exportable: false }),
] as const

export const financePayablesHistoryTableContract = createFinanceStatementContract({
  id: "finance.payables-history",
  route: "/dashboard/purchases/payables/history",
  module: "purchasing",
  readPermission: "purchasing.ap.invoice.view",
  readPermissionsAnyOf: ["finance.payables.read", "purchases.suppliers.read"],
  dataOwnership: "server-cursor",
  labels: { en: "Supplier payable history", fr: "Historique des dettes fournisseurs" },
  sourceReadModel: "purchasing.ap-history",
  columns: apHistoryColumns,
  allowedFilters: [
    { id: "lane" },
    { id: "supplierId" },
    { id: "dateFrom" },
    { id: "dateTo" },
  ],
  allowedSorts: ["documentNumber", "counterparty", "dueDate", "status", "amount", "movement", "effectiveAt"],
})

export const financeCashHistoryTableContract = createFinanceStatementContract({
  id: "finance.cash-history",
  route: "/dashboard/finance/cash-payment-history",
  module: "finance",
  readPermission: "finance.payments.read",
  readPermissionsAnyOf: ["finance.cash-drawer.read", "finance.payments.read"],
  dataOwnership: "server-cursor",
  labels: { en: "Cash payment history", fr: "Historique des paiements en caisse" },
  sourceReadModel: "finance.cash-payment-history",
  columns: [
    financeStatementColumn("transactionNumber", "Transaction", "Transaction", { sortable: true, frozen: "start" }),
    financeStatementColumn("transactionDate", "Date", "Date", { sortable: true, frozen: "start" }),
    financeStatementColumn("account", "Account", "Compte", { sortable: true }),
    financeStatementColumn("currency", "Currency", "Devise", { sortable: true }),
    financeStatementColumn("amount", "Amount", "Montant", { sortable: true, alignment: "right" }),
    financeStatementColumn("balance", "Balance", "Solde", { sortable: true, alignment: "right" }),
    financeStatementColumn("status", "Status", "Statut", { sortable: true }),
    financeStatementColumn("evidence", "Evidence", "Preuve", { exportable: false }),
  ],
  allowedFilters: [
    { id: "lane" },
    { id: "locationId" },
    { id: "cashierId" },
    { id: "paymentMethod" },
    { id: "paymentStatus" },
    { id: "cashType" },
    { id: "effectiveAsOf" },
    { id: "startDate" },
    { id: "endDate" },
  ],
  allowedSorts: ["transactionNumber", "transactionDate", "account", "amount", "balance", "status"],
})

const journalColumns = [
  financeStatementColumn("entryNumber", "Entry", "Ecriture", { sortable: true, frozen: "start" }),
  financeStatementColumn("entryDate", "Date", "Date", { sortable: true, frozen: "start" }),
  financeStatementColumn("journal", "Journal", "Journal", { sortable: true }),
  financeStatementColumn("period", "Period", "Periode", { sortable: true }),
  financeStatementColumn("debit", "Debit", "Debit", { sortable: true, alignment: "right" }),
  financeStatementColumn("credit", "Credit", "Credit", { sortable: true, alignment: "right" }),
  financeStatementColumn("status", "Status", "Statut", { sortable: true }),
  financeStatementColumn("action", "Action", "Action", { exportable: false }),
] as const

export const accountingPostedJournalEntriesTableContract = createFinanceStatementContract({
  id: "accounting.journal-entries-posted",
  route: "/dashboard/accounting/journals",
  module: "accounting",
  readPermission: "accounting.journal.read",
  labels: { en: "Posted journal entries", fr: "Ecritures comptables validees" },
  sourceReadModel: "accounting.journal-entries",
  columns: journalColumns,
  allowedFilters: [{ id: "status" }, { id: "periodId" }, { id: "startDate" }, { id: "endDate" }],
  allowedSorts: ["entryNumber", "entryDate", "journal", "period", "debit", "credit", "status"],
  actions: [
    { id: "reverse-posted", requiredPermission: "accounting.journal.reverse", requiredModule: "accounting", protectedAction: true, mutatesBusinessTruth: true, requiresFreshAuth: true },
    { id: "view-evidence", requiredPermission: "accounting.journal.read", requiredModule: "accounting", protectedAction: true, mutatesBusinessTruth: false },
  ],
})

export const accountingDraftJournalEntriesTableContract = createFinanceStatementContract({
  id: "accounting.journal-entries-drafts",
  route: "/dashboard/accounting/journals",
  module: "accounting",
  readPermission: "accounting.journal.read",
  labels: { en: "Draft journal entries", fr: "Projets d'ecritures comptables" },
  sourceReadModel: "accounting.journal-entries",
  columns: journalColumns,
  allowedFilters: [{ id: "status" }, { id: "periodId" }, { id: "startDate" }, { id: "endDate" }],
  allowedSorts: ["entryNumber", "entryDate", "journal", "period", "debit", "credit", "status"],
  actions: [
    { id: "edit-draft", requiredPermission: "accounting.journal.create", requiredModule: "accounting", protectedAction: true, mutatesBusinessTruth: true },
    { id: "post-draft", requiredPermission: "accounting.journal.post", requiredModule: "accounting", protectedAction: true, mutatesBusinessTruth: true, requiresFreshAuth: true },
    { id: "view-evidence", requiredPermission: "accounting.journal.read", requiredModule: "accounting", protectedAction: true, mutatesBusinessTruth: false },
  ],
})

const financialStatementLineColumns = [
  financeStatementColumn("code", "Account code", "Compte", { sortable: true, frozen: "start" }),
  financeStatementColumn("account", "Account", "Libelle", { sortable: true, frozen: "start" }),
  financeStatementColumn("classificationSource", "Classification", "Classification", { sortable: true }),
  financeStatementColumn("amount", "Amount", "Montant", { sortable: true, alignment: "right" }),
  financeStatementColumn("evidence", "Evidence", "Preuve", { exportable: false }),
] as const

export const accountingTrialBalanceTableContract = createFinanceStatementContract({
  id: "accounting.trial-balance",
  route: "/dashboard/accounting/reports/trial-balance",
  module: "accounting",
  readPermission: "accounting.reports.read",
  labels: { en: "Trial balance", fr: "Balance generale" },
  sourceReadModel: "accounting.trial-balance",
  rowId: "accountId",
  columns: [
    financeStatementColumn("code", "Account code", "Compte", { sortable: true, frozen: "start" }),
    financeStatementColumn("name", "Account", "Libelle", { sortable: true, frozen: "start" }),
    financeStatementColumn("type", "Type", "Type", { sortable: true }),
    financeStatementColumn("normalBalance", "Normal", "Sens normal", { sortable: true }),
    financeStatementColumn("activityDebit", "Activity debit", "Mouvements debit", { sortable: true, alignment: "right" }),
    financeStatementColumn("activityCredit", "Activity credit", "Mouvements credit", { sortable: true, alignment: "right" }),
    financeStatementColumn("debitBalance", "Debit balance", "Solde debit", { sortable: true, alignment: "right" }),
    financeStatementColumn("creditBalance", "Credit balance", "Solde credit", { sortable: true, alignment: "right" }),
    financeStatementColumn("evidence", "Evidence", "Preuve", { exportable: false }),
  ],
  allowedSorts: ["code", "name", "type", "normalBalance", "activityDebit", "activityCredit", "debitBalance", "creditBalance"],
  allowedFilters: [{ id: "accountType" }, { id: "activity" }, { id: "periodId" }, { id: "startDate" }, { id: "endDate" }],
  defaultPageSize: 10,
  allowedPageSizes: [10, 25, 50],
})

export const accountingProfitLossTableContract = createFinanceStatementContract({
  id: "accounting.profit-loss",
  route: "/dashboard/accounting/reports/financial-statements",
  module: "accounting",
  readPermission: "accounting.reports.read",
  labels: { en: "Profit and loss", fr: "Compte de resultat" },
  sourceReadModel: "accounting.financial-statements",
  rowId: "accountId",
  columns: financialStatementLineColumns,
  allowedSorts: ["code", "account", "classificationSource", "amount"],
})

export const accountingBalanceSheetTableContract = createFinanceStatementContract({
  id: "accounting.balance-sheet",
  route: "/dashboard/accounting/reports/financial-statements",
  module: "accounting",
  readPermission: "accounting.reports.read",
  labels: { en: "Balance sheet", fr: "Bilan" },
  sourceReadModel: "accounting.financial-statements",
  rowId: "accountId",
  columns: financialStatementLineColumns,
  allowedSorts: ["code", "account", "classificationSource", "amount"],
})

export const financeCashFlowTableContract = createFinanceStatementContract({
  id: "finance.cash-flow",
  route: "/dashboard/finance/cash-flow",
  module: "finance",
  readPermission: "finance.cash-flow.read",
  labels: { en: "Cash flow", fr: "Flux de tresorerie" },
  sourceReadModel: "finance-dashboard.cash-flow",
  defaultPageSize: 10,
  allowedPageSizes: [10, 25, 50, 100],
  columns: [
    financeStatementColumn("lineCode", "Line", "Ligne", { sortable: true, frozen: "start" }),
    financeStatementColumn("lineName", "Description", "Description", { sortable: true, frozen: "start" }),
    financeStatementColumn("currency", "Currency", "Devise", { sortable: true }),
    financeStatementColumn("inflow", "Inflow", "Entrees", { sortable: true, alignment: "right" }),
    financeStatementColumn("outflow", "Outflow", "Sorties", { sortable: true, alignment: "right" }),
    financeStatementColumn("net", "Net", "Net", { sortable: true, alignment: "right" }),
    financeStatementColumn("evidence", "Evidence", "Preuve", { exportable: false }),
  ],
  allowedFilters: [{ id: "period" }, { id: "locationId" }, { id: "startDate" }, { id: "endDate" }],
  allowedSorts: ["lineCode", "lineName", "inflow", "outflow", "net"],
})

export const accountingCloseEvidenceTableContract = createFinanceStatementContract({
  id: "accounting.close-evidence",
  route: "/dashboard/accounting/close",
  module: "accounting",
  readPermission: "accounting.close.read",
  labels: { en: "Close evidence", fr: "Preuves de cloture" },
  sourceReadModel: "accounting.close-assurance",
  dataOwnership: "immutable-evidence",
  columns: [
    financeStatementColumn("evidenceId", "Evidence ID", "ID de preuve", { sortable: true, frozen: "start" }),
    financeStatementColumn("evidenceType", "Evidence type", "Type de preuve", { sortable: true, frozen: "start" }),
    financeStatementColumn("source", "Source", "Source", { sortable: true }),
    financeStatementColumn("period", "Period", "Periode", { sortable: true }),
    financeStatementColumn("status", "Status", "Statut", { sortable: true }),
    financeStatementColumn("evidenceCount", "Evidence count", "Nombre de preuves", { sortable: true, alignment: "right" }),
    financeStatementColumn("hash", "Hash", "Empreinte", { sensitive: true }),
  ],
  allowedSorts: ["evidenceId", "evidenceType", "source", "period", "status", "evidenceCount"],
  exportFormats: ["pdf", "json"],
})

export const accountingCloseFindingsTableContract = createFinanceStatementContract({
  id: "accounting.close-findings",
  route: "/dashboard/accounting/close",
  module: "accounting",
  archetype: "evidence",
  readPermission: "accounting.close.read",
  labels: { en: "Close findings", fr: "Constats de cloture" },
  sourceReadModel: "accounting.close-assurance",
  dataOwnership: "immutable-evidence",
  columns: [
    financeStatementColumn("status", "Status", "Statut", { sortable: true, frozen: "start" }),
    financeStatementColumn("detail", "Finding", "Constat", { sortable: true, frozen: "start" }),
    financeStatementColumn("source", "Source", "Source", { sortable: true }),
    financeStatementColumn("owner", "Owner", "Responsable", { sortable: true }),
    financeStatementColumn("action", "Action", "Action", { exportable: false }),
  ],
  allowedSorts: ["status", "detail", "source", "owner"],
  exportFormats: ["pdf", "json"],
})

export const financeStatementTableContracts = [
  financeReceivablesTableContract,
  financeReceivablesHistoryTableContract,
  financePayablesTableContract,
  financePayablesHistoryTableContract,
  financeCashHistoryTableContract,
  accountingPostedJournalEntriesTableContract,
  accountingDraftJournalEntriesTableContract,
  accountingTrialBalanceTableContract,
  accountingProfitLossTableContract,
  accountingBalanceSheetTableContract,
  financeCashFlowTableContract,
  accountingCloseEvidenceTableContract,
  accountingCloseFindingsTableContract,
] as const

export const financeStatementContextSchema = z.object({
  entityId: z.string().min(1).max(150),
  entityName: z.string().min(1).max(200),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  sourceReadModel: z.string().min(1).max(200),
  evidenceRoute: z.string().min(1).max(500),
})

export type FinanceStatementContext = z.infer<typeof financeStatementContextSchema>

export function createFinanceStatementContext(input: FinanceStatementContext): FinanceStatementContext {
  return financeStatementContextSchema.parse(input)
}

export const FINANCE_ASYNC_EXPORT_THRESHOLD = 1_000

export const financeStatementExportManifestSchema = canonicalTableExportIntentSchema.extend({
  financeContext: financeStatementContextSchema,
  matchingRows: z.number().int().nonnegative(),
  exportMode: z.enum(["inline", "async-job"]),
})

export type FinanceStatementExportManifest = z.infer<typeof financeStatementExportManifestSchema>

export const financeStatementExportArtifactReferenceSchema = z.object({
  provider: z.string().min(1).max(100).regex(/^[a-z0-9][a-z0-9.-]*$/),
  key: z.string().min(1).max(512),
  contentType: z.string().min(1).max(200),
  byteLength: z.number().int().positive(),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  expiresAt: z.string().datetime(),
}).strict()

export type FinanceStatementExportArtifactReference = z.infer<typeof financeStatementExportArtifactReferenceSchema>

export const financeStatementExportJobReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  clientRequestId: z.string().min(1).max(150),
  jobId: z.string().min(1).max(150),
  status: z.enum(["accepted", "running", "completed", "failed"]),
  acceptedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  artifact: financeStatementExportArtifactReferenceSchema.optional(),
}).superRefine((receipt, context) => {
  if (receipt.status === "completed" && !receipt.artifact) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["artifact"],
      message: "Completed finance statement exports require an artifact reference.",
    })
  }
})

export type FinanceStatementExportJobReceipt = z.infer<typeof financeStatementExportJobReceiptSchema>

export function buildFinanceStatementExportManifest(input: {
  contract?: CanonicalTableContract
  organizationId: string
  query: CanonicalTableQuery
  selection: CanonicalTableSelection
  columns: readonly string[]
  locale: TableLocale
  timeZone: string
  format: "csv" | "xlsx" | "pdf"
  financeContext: FinanceStatementContext
  matchingRows: number
  clientRequestId?: string
  requestedAt?: string
}): FinanceStatementExportManifest {
  const context = createFinanceStatementContext(input.financeContext)
  const contract = input.contract ?? financePaymentsLedgerTableContract
  const intent = buildCanonicalTableExportIntent({
    contract,
    organizationId: input.organizationId,
    query: createCanonicalTableQuery(contract, input.query),
    selection: input.selection,
    columns: input.columns,
    locale: input.locale,
    timeZone: input.timeZone,
    format: input.format,
    clientRequestId: input.clientRequestId,
    requestedAt: input.requestedAt,
  })

  return financeStatementExportManifestSchema.parse({
    ...intent,
    financeContext: context,
    matchingRows: input.matchingRows,
    exportMode: input.matchingRows >= FINANCE_ASYNC_EXPORT_THRESHOLD ? "async-job" : "inline",
  })
}
