import type {
  EvidenceGrade,
  ProofTrailBlockerSeverity,
} from "@/services/evidence/evidence-contracts";

export const SNAPSHOT_KINDS = [
  "tenant.operating",
  "branch.operating",
  "payment.truth",
  "inventory.cash",
  "close.readiness",
] as const;

export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number];

export type SnapshotStatus =
  | "fresh"
  | "stale"
  | "partial"
  | "blocked"
  | "building"
  | "failed"
  | "empty";

export type SnapshotUiState =
  | "loading"
  | "empty"
  | "fresh"
  | "stale"
  | "partial"
  | "blocked"
  | "redacted"
  | "permission_denied"
  | "module_unavailable"
  | "safe_error";

export type SnapshotSourceModule =
  | "accounting"
  | "close"
  | "compliance"
  | "dashboard"
  | "finance"
  | "inventory"
  | "payments"
  | "payroll"
  | "pos"
  | "purchasing"
  | "sales";

export type SnapshotBlocker = {
  id: string;
  severity: ProofTrailBlockerSeverity;
  gate: string;
  title: string;
  detail: string;
  sourceTables: string[];
  nextAction?: string;
};

export type SnapshotRedaction = {
  id: string;
  field: string;
  reason: string;
  policy: string;
};

export type SnapshotFreshness = {
  generatedAt: string;
  sourceMaxUpdatedAt: string | null;
  maxAgeMinutes: number;
  stale: boolean;
  staleReason: string | null;
};

export type SnapshotResult<TMetrics> = {
  kind: SnapshotKind;
  organizationId: string;
  locationId: string | null;
  periodStart: string;
  periodEnd: string;
  status: SnapshotStatus;
  uiState: SnapshotUiState;
  evidenceGrade: EvidenceGrade;
  freshness: SnapshotFreshness;
  sourceHash: string;
  generatedAt: string;
  sourceModules: SnapshotSourceModule[];
  metrics: TMetrics;
  blockers: SnapshotBlocker[];
  redactions: SnapshotRedaction[];
};

export type SnapshotScopeInput = {
  organizationId: string;
  locationId?: string | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  now?: Date | string | null;
  maxAgeMinutes?: number | null;
};

export type NormalizedSnapshotScope = {
  organizationId: string;
  locationId: string | null;
  periodStart: Date;
  periodEnd: Date;
  now: Date;
  maxAgeMinutes: number;
};

export type PaymentTruthMetrics = {
  providerAccountCount: number;
  activeProviderAccountCount: number;
  recentRunCount: number;
  readyForSignoffCount: number;
  signedRunCount: number;
  openExceptionCount: number;
  criticalExceptionCount: number;
  openSuspenseCount: number;
  openSuspenseAmount: number;
  pendingTransactionCount: number;
};

export type InventoryCashMetrics = {
  trackedItemCount: number;
  inventoryLevelCount: number;
  quantityOnHand: number;
  quantityAvailable: number;
  quantityReserved: number;
  quantityInTransit: number;
  quantityOnOrder: number;
  inventoryValue: number;
  zeroStockLevelCount: number;
  negativeStockLevelCount: number;
  periodTransactionCount: number;
  periodAdjustmentCount: number;
  periodTransferCount: number;
};

export type CloseReadinessMetrics = {
  accountingPeriodCount: number;
  openPeriodCount: number;
  recentCloseRunCount: number;
  certifiedCloseRunCount: number;
  blockedCloseRunCount: number;
  averageReadinessScore: number | null;
  openFindingCount: number;
  criticalOpenFindingCount: number;
  unavailableEvidenceCount: number;
};

export type BranchOperatingMetrics = {
  locationActive: boolean;
  completedSalesCount: number;
  completedSalesRevenue: number;
  cashCollected: number;
  inventoryValue: number;
  inventoryTransactionCount: number;
  pendingPurchaseOrderCount: number;
  openTransferCount: number;
  postedJournalLineCount: number;
  posShiftCount: number;
  closedPosShiftCount: number;
  payrollEmployeeAtLocationCount: number;
  frozenAttendanceSnapshotCount: number;
  approvedPayrollRunLineCount: number;
  unallocatedPayrollRunLineCount: number;
  payrollGrossAmount: number;
  payrollEmployerChargeAmount: number;
  payrollNetPayAmount: number;
  payrollAllocatedCostAmount: number;
  payrollProfitContribution: number | null;
};

export type PayrollFinanceForecastEvidenceStatus =
  | "AUTHORITATIVE"
  | "NON_AUTHORITATIVE";

export type PayrollFinanceForecastMetrics = {
  status: PayrollFinanceForecastEvidenceStatus;
  authoritative: boolean;
  reasonCode: string;
  message: string;
  horizonStart: string;
  horizonEnd: string;
  upcomingNetPayAmount: number;
  upcomingStatutoryLiabilityAmount: number;
  totalUpcomingAmount: number;
  payrollPeriodCount: number;
  payrollRunCount: number;
  paymentBatchCount: number;
  declarationCount: number;
  sourceLinkCount: number;
  evidenceHashCount: number;
  nextPayDate: string | null;
  nextDeclarationDueDate: string | null;
  personLevelAmountsRedacted: true;
  blockerCodes: string[];
};

export type TenantOperatingMetrics = {
  activeLocationCount: number;
  completedSalesCount: number;
  completedSalesRevenue: number;
  cashCollected: number;
  pendingPurchaseOrderCount: number;
  approvedOrPaidPayrollRunCount: number;
  activeEmployeeBalanceCaseCount: number;
  openEmployeeBalanceCaseCount: number;
  partiallySettledEmployeeBalanceCaseCount: number;
  employeeBalanceOutstandingAmount: number;
  periodEmployeeBalanceSettlementCount: number;
  periodEmployeeBalanceSettlementAmount: number;
  postedJournalEntryCount: number;
  sourceLinkCount: number;
  payrollFinanceForecast: PayrollFinanceForecastMetrics;
  paymentTruth: PaymentTruthMetrics;
  inventoryCash: InventoryCashMetrics;
  closeReadiness: CloseReadinessMetrics;
};

export type SnapshotBuildRunMetrics = {
  requestedSnapshotCount: number;
  completedSnapshotCount: number;
  blockedSnapshotCount: number;
  partialSnapshotCount: number;
  staleSnapshotCount: number;
  failedSnapshotCount: number;
};

export type SnapshotBuildRunResult = {
  buildId: string;
  organizationId: string;
  locationId: string | null;
  periodStart: string;
  periodEnd: string;
  status: Exclude<SnapshotStatus, "empty" | "building">;
  evidenceGrade: EvidenceGrade;
  sourceHash: string;
  generatedAt: string;
  metrics: SnapshotBuildRunMetrics;
  snapshots: Array<
    | SnapshotResult<TenantOperatingMetrics>
    | SnapshotResult<BranchOperatingMetrics>
    | SnapshotResult<PaymentTruthMetrics>
    | SnapshotResult<InventoryCashMetrics>
    | SnapshotResult<CloseReadinessMetrics>
  >;
  blockers: SnapshotBlocker[];
  redactions: SnapshotRedaction[];
};

export const DEFAULT_SNAPSHOT_MAX_AGE_MINUTES = 24 * 60;
