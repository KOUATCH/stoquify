import type { PaymentMethod, PaymentStatus } from "@prisma/client"

import type {
  EvidenceGrade,
  ProofTrailBlockerSeverity,
} from "@/services/evidence/evidence-contracts"
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"
import type { SnapshotFreshness } from "@/services/snapshots/snapshot-contracts"

export type BranchPaymentAttributionInput = {
  accessContext: OperatingAccessContext
  locationId: string
  businessDate: string
  now?: Date | string | null
  maxAgeMinutes?: number | null
}

export type BranchPaymentAttributionState =
  | "AVAILABLE_WITH_LIMITATIONS"
  | "NO_ACTIVITY_WITH_LIMITATIONS"
  | "STALE_WITH_LIMITATIONS"

export type BranchPaymentAttributionBlocker = {
  code:
    | "UNLINKED_PAYMENT_BRANCH_COVERAGE_UNAVAILABLE"
    | "BRANCH_PROVIDER_RECONCILIATION_UNSUPPORTED"
    | "BRANCH_PAYMENT_CAPTURE_EVIDENCE_STALE"
  severity: ProofTrailBlockerSeverity
  gate: "branch_payment_attribution"
  title: string
  detail: string
  sourceTables: string[]
  nextAction: string | null
}

export type BranchPaymentAttributionResult = {
  kind: "BRANCH_PAYMENT_CAPTURE_ATTRIBUTION"
  organizationId: string
  actorId: string
  generatedAt: string
  businessDate: string
  periodStart: string
  periodEnd: string
  authority:
    | {
        kind: "TENANT_WIDE"
        basis: "RBAC_SUPER_USER" | "RBAC_ROLE"
      }
    | {
        kind: "LOCATION_RESPONSIBILITY"
        basis: "Location.managerId"
      }
  scope: {
    kind: "LOCATION"
    locationId: string
  }
  location: {
    id: string
    name: string
    code: string
  }
  state: BranchPaymentAttributionState
  attribution: {
    basis: "PAYMENT_SALES_ORDER_LOCATION"
    dateBasis: "PAYMENT_CREATED_AT_UTC"
    returnedRecordsDirectlyAttributed: true
  }
  coverage: {
    state: "PARTIAL"
    complete: false
    directSalesOrderCapture: "SUPPORTED"
    unlinkedPaymentBranchCoverage: {
      state: "UNAVAILABLE"
      count: null
      reasonCode: "UNLINKED_PAYMENTS_HAVE_NO_BRANCH_OWNER"
    }
    externalProviderReconciliation: {
      state: "UNSUPPORTED"
      sourceIds: []
      sourceHash: null
      reasonCode: "NO_BRANCH_OWNED_EXTERNAL_RECONCILIATION_SOURCE"
    }
  }
  facts: {
    paymentCount: number
    statusCounts: Record<PaymentStatus, number>
    methodCounts: Record<PaymentMethod, number>
  }
  evidence: {
    sourceType: "PAYMENT_CAPTURE"
    sourceIds: string[]
    sourceHash: string
    observedAt: string | null
    freshness: SnapshotFreshness
    evidenceGrade: EvidenceGrade
  }
  blockers: BranchPaymentAttributionBlocker[]
}
