import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"

export const PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE = {
  version: 1,
  kind: "PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE",
  moduleSlug: "payment_reconciliation",
  readPermission: "payments.reconciliation.read",
  signPermission: "payments.reconciliation.sign",
  actionPath: "/dashboard/finance/reconciliation",
} as const

export type PaymentReconciliationSignOffCommandStateInput = {
  accessContext: OperatingAccessContext
  now?: Date | string | null
}

export type PaymentReconciliationSignOffCommandAuthority =
  | {
      kind: "TENANT_WIDE"
      basis: "RBAC_SUPER_USER" | "RBAC_ROLE"
    }
  | {
      kind: "LOCATION_RESPONSIBILITY"
      basis: "Location.managerId"
    }
  | {
      kind: "DENIED"
      basis: "RBAC_PERMISSION" | "LOCATION_ASSIGNMENT"
    }

export type PaymentReconciliationSignOffCommandCandidate = Readonly<{
  commandId: string
  actionPath: typeof PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.actionPath
  requiredPermission: typeof PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.signPermission
  source: {
    type: "ReconciliationRun"
    id: string
    status: "READY_FOR_SIGNOFF"
    updatedAt: string
    versionHash: string
  }
  provider: {
    id: string
    displayName: string
    currencyCode: string
  }
  businessDate: string
  periodStart: string
  periodEnd: string
  makerActorId: string
  totals: {
    internalAmount: string
    externalAmount: string
    matchedAmount: string
    suspenseAmount: string
  }
  matchCount: number
  exceptionCount: number
}>

export type PaymentReconciliationSignOffCommandHiddenReason =
  | "OPERATING_ACCESS_DENIED"
  | "TENANT_WIDE_REQUIRED"
  | "READ_PERMISSION_REQUIRED"
  | "MODULE_READ_UNAVAILABLE"

export type PaymentReconciliationSignOffCommandReadOnlyReason =
  | "SIGN_PERMISSION_REQUIRED"
  | "MODULE_WRITE_UNAVAILABLE"
  | "MAKER_CHECKER_REQUIRED"

export type PaymentReconciliationSignOffCommandStateControls = Readonly<{
  projectionPurpose: "SOURCE_OWNED_SIGN_OFF_COMMAND_STATE_ONLY"
  sourceOfTruth: "ReconciliationRun"
  tenantWideOnly: true
  moduleEntitlementEnforced: true
  makerCheckerRequired: true
  freshAuthRequired: true
  minimumAssurance: "L1"
  sourceRevalidatedAtWrite: true
  clientResolutionAccepted: false
}>

type PaymentReconciliationSignOffCommandStateBase = Readonly<{
  kind: typeof PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.kind
  version: typeof PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.version
  organizationId: string
  actorId: string
  generatedAt: string
  authority: PaymentReconciliationSignOffCommandAuthority
  scope: { kind: "TENANT" } | { kind: "NONE" }
  controls: PaymentReconciliationSignOffCommandStateControls
  projectionHash: string
}>

export type PaymentReconciliationSignOffCommandStateResult =
  | (PaymentReconciliationSignOffCommandStateBase & {
      state: "AVAILABLE"
      reason: null
      commandAllowed: true
      candidate: PaymentReconciliationSignOffCommandCandidate
    })
  | (PaymentReconciliationSignOffCommandStateBase & {
      state: "READ_ONLY"
      reason: PaymentReconciliationSignOffCommandReadOnlyReason
      commandAllowed: false
      candidate: PaymentReconciliationSignOffCommandCandidate
    })
  | (PaymentReconciliationSignOffCommandStateBase & {
      state: "EMPTY"
      reason: "NO_READY_RUN"
      commandAllowed: false
      candidate: null
    })
  | (PaymentReconciliationSignOffCommandStateBase & {
      state: "HIDDEN"
      reason: PaymentReconciliationSignOffCommandHiddenReason
      commandAllowed: false
      candidate: null
    })
