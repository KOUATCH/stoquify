import type {
  TableArchetype,
  TableDataOwnership,
} from "./table-system-contract"

export type NextNormalizationWave = "X1" | "X2" | "X3" | "X4" | "X5"

export interface ModuleNormalizationContract {
  wave: NextNormalizationWave
  name: string
  modules: readonly string[]
  surfaceFamilies: readonly string[]
  allowedArchetypes: readonly TableArchetype[]
  defaultArchetype: TableArchetype
  dataOwnership: readonly TableDataOwnership[]
  behaviorContract: {
    preserveServiceOwnedTruth: true
    preserveTenantIsolation: true
    preserveRbacAndEntitlement: true
    preserveRedaction: true
    preserveBilingualBehavior: true
    preserveProtectedActions: true
    requirements: readonly string[]
  }
  exportContract: {
    manifestRequired: boolean
    asynchronousJobRequired: boolean
    evidenceContext: readonly string[]
  }
  migrationPolicy: "incremental-by-value-and-reuse" | "contract-only-until-evidence"
}

export const nextModuleNormalizationContracts: readonly ModuleNormalizationContract[] = [
  {
    wave: "X1",
    name: "Finance and accounting archetypes",
    modules: ["receivables", "payables", "cash", "accounting", "close_assurance"],
    surfaceFamilies: [
      "receivables",
      "payables",
      "cash-history",
      "journals",
      "trial-balance",
      "profit-and-loss",
      "cash-flow",
      "close-evidence",
    ],
    allowedArchetypes: ["ledger", "evidence", "work-queue", "analytical", "master-reference"],
    defaultArchetype: "ledger",
    dataOwnership: ["server-offset", "server-cursor", "immutable-evidence"],
    behaviorContract: {
      preserveServiceOwnedTruth: true,
      preserveTenantIsolation: true,
      preserveRbacAndEntitlement: true,
      preserveRedaction: true,
      preserveBilingualBehavior: true,
      preserveProtectedActions: true,
      requirements: [
        "freeze identity columns before numeric columns",
        "right-align numeric and currency values",
        "show currency and period/entity context with totals",
        "drill from statement rows to source evidence",
        "keep editable journal drafts separate from posted journals and evidence",
      ],
    },
    exportContract: {
      manifestRequired: true,
      asynchronousJobRequired: true,
      evidenceContext: ["organization", "entity", "period", "currency", "query", "redaction", "source-evidence"],
    },
    migrationPolicy: "incremental-by-value-and-reuse",
  },
  {
    wave: "X2",
    name: "Payroll and HRIS privacy-aware views",
    modules: ["payroll", "hris"],
    surfaceFamilies: [
      "employees",
      "contracts",
      "compensation",
      "attendance",
      "payroll-register",
      "payroll-payments",
      "declarations",
      "approvals",
      "people-history",
    ],
    allowedArchetypes: ["master-reference", "work-queue", "ledger", "evidence"],
    defaultArchetype: "work-queue",
    dataOwnership: ["server-offset", "server-cursor", "immutable-evidence"],
    behaviorContract: {
      preserveServiceOwnedTruth: true,
      preserveTenantIsolation: true,
      preserveRbacAndEntitlement: true,
      preserveRedaction: true,
      preserveBilingualBehavior: true,
      preserveProtectedActions: true,
      requirements: [
        "payroll access must not unlock HRIS people truth",
        "support own-record, manager-scope, payroll-admin, and auditor policies",
        "make effective date and country pack explicit context",
        "make redaction and payment evidence explicit context",
      ],
    },
    exportContract: {
      manifestRequired: true,
      asynchronousJobRequired: true,
      evidenceContext: ["view-policy", "effective-date", "country-pack", "redaction", "payment-evidence"],
    },
    migrationPolicy: "contract-only-until-evidence",
  },
  {
    wave: "X3",
    name: "POS, cash drawer, inventory movement, and loss control",
    modules: ["pos", "cash_drawer", "inventory"],
    surfaceFamilies: ["cash-drawer-history", "inventory-movements", "loss-control", "operational-exceptions"],
    allowedArchetypes: ["work-queue", "evidence", "ledger"],
    defaultArchetype: "work-queue",
    dataOwnership: ["hybrid-server-seed", "server-cursor", "immutable-evidence"],
    behaviorContract: {
      preserveServiceOwnedTruth: true,
      preserveTenantIsolation: true,
      preserveRbacAndEntitlement: true,
      preserveRedaction: true,
      preserveBilingualBehavior: true,
      preserveProtectedActions: true,
      requirements: [
        "keep the core sale interaction out of table migration scope",
        "optimize history and exceptions for fast scan and action",
        "preserve intermittent-connectivity and offline/replay state",
        "preserve idempotency for queued actions",
        "show movement and drawer evidence identifiers, source, actor, terminal/location, and status",
      ],
    },
    exportContract: {
      manifestRequired: true,
      asynchronousJobRequired: true,
      evidenceContext: ["offline-state", "replay-state", "idempotency", "source", "actor", "terminal", "location", "status"],
    },
    migrationPolicy: "incremental-by-value-and-reuse",
  },
  {
    wave: "X4",
    name: "Sales, suppliers, customers, compliance, and administration",
    modules: ["sales", "suppliers", "customers", "compliance", "administration"],
    surfaceFamilies: ["master-reference", "bounded-detail", "work-queue", "compliance-evidence", "assurance"],
    allowedArchetypes: ["master-reference", "work-queue", "evidence", "analytical"],
    defaultArchetype: "master-reference",
    dataOwnership: ["client-bounded", "hybrid-server-seed", "server-offset", "immutable-evidence"],
    behaviorContract: {
      preserveServiceOwnedTruth: true,
      preserveTenantIsolation: true,
      preserveRbacAndEntitlement: true,
      preserveRedaction: true,
      preserveBilingualBehavior: true,
      preserveProtectedActions: true,
      requirements: [
        "prioritize migration by value and reuse potential",
        "use bounded presets for detail subtables and setup lists",
        "use evidence/audit presets for compliance and assurance",
        "document behavior parity before removing bespoke markup",
      ],
    },
    exportContract: {
      manifestRequired: true,
      asynchronousJobRequired: false,
      evidenceContext: ["organization", "query", "redaction", "source-evidence"],
    },
    migrationPolicy: "incremental-by-value-and-reuse",
  },
]

export interface ScaleDatasetTier {
  matchingRows: 100 | 1_000 | 10_000 | 100_000
  browserRowTransfer: "bounded-page-or-window"
  representativeFixtureRequired: true
}

export type ScaleSignal =
  | "bounded-client-interaction"
  | "server-feedback"
  | "page-navigation"
  | "bulk-action-acknowledgement"
  | "preference-view-hydration"
  | "browser-row-dom"
  | "export-job-duration"
  | "memory"
  | "hydration"
  | "rendered-row-count"

export interface ProposedScaleBudget {
  signal: ScaleSignal
  target: string
  status: "proposed-not-measured"
  productApprovalRequired: true
}

export interface VirtualizationTrialContract {
  enabled: true
  surfaceCount: 1
  surfaceId: string
  surfaceClass: "analytical-desktop"
  prerequisites: readonly string[]
  exitCriteria: readonly string[]
}

export interface TableScaleContract {
  version: 1
  datasetTiers: readonly ScaleDatasetTier[]
  metrics: readonly ScaleSignal[]
  budgets: readonly ProposedScaleBudget[]
  virtualizationTrial: VirtualizationTrialContract
  noBrowserWideMatchingSetTransfer: true
  notAnSla: true
}

export const tableScaleContract: TableScaleContract = {
  version: 1,
  datasetTiers: [
    { matchingRows: 100, browserRowTransfer: "bounded-page-or-window", representativeFixtureRequired: true },
    { matchingRows: 1_000, browserRowTransfer: "bounded-page-or-window", representativeFixtureRequired: true },
    { matchingRows: 10_000, browserRowTransfer: "bounded-page-or-window", representativeFixtureRequired: true },
    { matchingRows: 100_000, browserRowTransfer: "bounded-page-or-window", representativeFixtureRequired: true },
  ],
  metrics: [
    "bounded-client-interaction",
    "server-feedback",
    "page-navigation",
    "bulk-action-acknowledgement",
    "preference-view-hydration",
    "browser-row-dom",
    "export-job-duration",
    "memory",
    "hydration",
    "rendered-row-count",
  ],
  budgets: [
    { signal: "bounded-client-interaction", target: "under 100 ms at p75 test hardware", status: "proposed-not-measured", productApprovalRequired: true },
    { signal: "server-feedback", target: "loading indication under 150 ms; useful result under 1,000 ms at p75", status: "proposed-not-measured", productApprovalRequired: true },
    { signal: "page-navigation", target: "useful rows under 750 ms at p75 after cached shell", status: "proposed-not-measured", productApprovalRequired: true },
    { signal: "bulk-action-acknowledgement", target: "immediate job receipt with progress and partial result", status: "proposed-not-measured", productApprovalRequired: true },
    { signal: "preference-view-hydration", target: "no visible column-layout flash after initial shell", status: "proposed-not-measured", productApprovalRequired: true },
    { signal: "browser-row-dom", target: "bounded by pagination or a proven virtualization strategy", status: "proposed-not-measured", productApprovalRequired: true },
    { signal: "export-job-duration", target: "measure by dataset tier and format", status: "proposed-not-measured", productApprovalRequired: true },
  ],
  virtualizationTrial: {
    enabled: true,
    surfaceCount: 1,
    surfaceId: "accounting.trial-balance",
    surfaceClass: "analytical-desktop",
    prerequisites: [
      "focus retention and keyboard traversal",
      "screen-reader row discoverability",
      "sticky or frozen column behavior",
      "variable row-height behavior",
      "print and export parity",
      "browser zoom behavior",
    ],
    exitCriteria: [
      "no loss of accessible row or column context",
      "no mutation or redaction boundary regression",
      "no print/export mismatch",
      "measured benefit at an approved representative tier",
    ],
  },
  noBrowserWideMatchingSetTransfer: true,
  notAnSla: true,
}

export function validateNextPhaseContracts(
  moduleContracts: readonly ModuleNormalizationContract[] = nextModuleNormalizationContracts,
  scaleContract: TableScaleContract = tableScaleContract,
): true {
  if (new Set(moduleContracts.map((contract) => contract.wave)).size !== moduleContracts.length) {
    throw new Error("Each NEXT normalization wave must be declared once")
  }
  if (moduleContracts.some((contract) => !contract.behaviorContract.preserveServiceOwnedTruth)) {
    throw new Error("NEXT normalization cannot weaken service-owned business truth")
  }
  if (scaleContract.datasetTiers.map((tier) => tier.matchingRows).join(",") !== "100,1000,10000,100000") {
    throw new Error("Scale tiers must cover 100, 1,000, 10,000, and 100,000 matching rows")
  }
  if (scaleContract.virtualizationTrial.surfaceCount !== 1) {
    throw new Error("Virtualization is limited to one approved trial surface")
  }
  if (!scaleContract.notAnSla || scaleContract.budgets.some((budget) => budget.status !== "proposed-not-measured")) {
    throw new Error("Scale budgets must remain proposed and non-SLA until measured and approved")
  }
  return true
}

validateNextPhaseContracts()
