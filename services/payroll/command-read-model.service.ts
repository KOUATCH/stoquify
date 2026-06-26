import "server-only"

import {
  CloseRunStatus,
  PayrollAttendanceSnapshotStatus,
  PayrollContractStatus,
  PayrollDeclarationStatus,
  PayrollEmployeeStatus,
  PayrollPaymentBatchStatus,
  PayrollPaymentDestinationChangeStatus,
  PayrollPeriodStatus,
  PayrollRubriqueAssignmentStatus,
  PayrollRunStatus,
  PayrollSalaryChangeStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"
import { evaluateRedaction, type RedactionDecision } from "@/services/security/redaction-policy.service"
import { getPayrollEmployeeSourceData } from "./employee.service"
import { getPaymentEvidenceReadiness } from "./payment-evidence.service"
import { getPayrollWorkbenchData, type PayrollWorkbenchData } from "./payroll-control.service"

type DbClient = typeof db | Prisma.TransactionClient
type ReadinessState = "READY" | "ACTION_REQUIRED" | "BLOCKED" | "UNKNOWN"
type BlockerSeverity = "critical" | "high" | "medium"
type NextActionPriority = "critical" | "high" | "normal"

export const payrollCommandReadModelInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  limit: z.number().int().positive().max(100).default(25),
  asOf: z.coerce.date().optional(),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
})

export type PayrollCommandReadModelInput = z.input<typeof payrollCommandReadModelInputSchema>

export type PayrollCommandBlocker = {
  code: string
  domain: "hr" | "compensation" | "attendance" | "payment" | "payroll" | "posting" | "declaration" | "register" | "close"
  severity: BlockerSeverity
  message: string
  source: string
  count?: number
}

export type PayrollCommandNextAction = {
  id: string
  label: string
  priority: NextActionPriority
  requiredPermission: string
  source: string
  blockedBy: string[]
}

export type PayrollCommandReadiness = {
  state: ReadinessState
  blockerCodes: string[]
  source: string
  counts?: Record<string, number>
  message: string
}

export type PayrollCommandReadModel = {
  organizationId: string
  asOf: string
  currentPeriod: {
    id: string
    name: string
    status: PayrollPeriodStatus
    periodStart: string
    periodEnd: string
    payDate: string
    inputLockedAt: string | null
    countryCode: string
    countryPackVersion: string | null
    countryPackResolutionHash: string | null
    countryPackCapabilityStatus: string | null
    accountingPeriodId: string | null
    selection: "calendar-match" | "latest-period"
  } | null
  roleScope: {
    canReadCommand: boolean
    canReadSalaryAmounts: boolean
    canManageEmployees: boolean
    canManageContracts: boolean
    canManageCompensation: boolean
    canReviewRuns: boolean
    canCalculateRuns: boolean
    canApproveRuns: boolean
    canReleasePayments: boolean
    canPrepareDeclarations: boolean
    canExportPayroll: boolean
    canReadPaymentEvidence: boolean
    canReadAttendanceReadiness: boolean
  }
  redaction: {
    payrollAmounts: Pick<RedactionDecision, "allowed" | "mode" | "reasonCode" | "policy" | "replacement" | "requiredPermissions">
  }
  trustedCounts: {
    activeEmployees: number
    linkedEmployees: number
    unmappedEmployees: number
    activeContracts: number
    activeRubriqueAssignments: number
    frozenAttendanceSnapshots: number
    pendingSalaryChangeRequests: number
    approvedSalaryChangeRequests: number
    pendingPaymentDestinationChanges: number
    approvedPaymentDestinations: number
    missingPaymentDestinations: number
    pendingPaymentDestinations: number
    attendanceReadyEmployees: number
    attendanceDriftEmployees: number
    openPeriods: number
    calculatedRuns: number
    postedRuns: number
    releasedPaymentBatches: number
    openDeclarations: number
    ledgerBlockers: number
    reconciliationExceptions: number
    currentPeriodRuns: number
    currentPeriodPaymentBatches: number
    currentPeriodDeclarations: number
  }
  readiness: Record<"employees" | "contracts" | "compensation" | "attendance" | "paymentDestinations" | "payrollRun" | "payrollRegister" | "payments" | "declarations" | "posting" | "close", PayrollCommandReadiness>
  blockers: PayrollCommandBlocker[]
  nextActions: PayrollCommandNextAction[]
  evidence: {
    latestRun: {
      id: string
      runNumber: string
      status: PayrollRunStatus
      documentHash: string | null
      evidenceHash: string | null
      calculationHash: string
      attendanceSnapshotHash: string
      countryPackResolutionHash: string
      ledgerPostingBatchId: string | null
      postedBusinessEventId: string | null
      payslipCount: number
      lineCount: number
      paymentBatchCount: number
      declarationCount: number
      updatedAt: string
    } | null
    latestPaymentBatch: {
      id: string
      batchNumber: string
      status: PayrollPaymentBatchStatus
      documentHash: string | null
      evidenceHash: string | null
      bankFileHash: string | null
      ledgerPostingBatchId: string | null
      postedBusinessEventId: string | null
      reconciliationStatus: string | null
      updatedAt: string
    } | null
    latestDeclaration: {
      id: string
      authority: string
      declarationType: string
      status: PayrollDeclarationStatus
      payloadHash: string | null
      countryPackResolutionHash: string
      dueDate: string | null
      updatedAt: string
    } | null
    closeRun: {
      id: string
      status: CloseRunStatus
      readinessScore: number
      criticalBlockerCount: number
      highBlockerCount: number
      evidenceCoveragePct: string | null
      asOf: string
    } | null
  }
  freshness: Array<{ source: string; asOf: string | null; status: "fresh" | "stale" | "unknown"; ageHours: number | null }>
  sourceScope: {
    limit: number
    employeeSourceReturned: number
    paymentEvidenceReturned: number
    employeeCoverageComplete: boolean
    paymentEvidenceCoverageComplete: boolean
    sourceServices: string[]
  }
  workbench: PayrollWorkbenchData
}

const COMMAND_READ_PERMISSIONS = ["payroll.command.read"] as const
const ACTIVE_CONTRACT_WHERE = {
  deletedAt: null,
  status: PayrollContractStatus.ACTIVE,
} as const

function assertCommandReadAllowed(input: z.output<typeof payrollCommandReadModelInputSchema>) {
  if (input.moduleDecision && !input.moduleDecision.allowed) {
    throw new ForbiddenError("Payroll module is not available for this tenant.")
  }

  if (!hasAnyRbacPermission(input.actorPermissions, COMMAND_READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for payroll command read model.")
  }
}

function can(actorPermissions: readonly string[], requiredPermissions: readonly string[]) {
  return hasAnyRbacPermission(actorPermissions, requiredPermissions)
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function decimalString(value: Prisma.Decimal | null | undefined) {
  return value ? value.toString() : null
}

function toFreshness(source: string, value: string | Date | null | undefined, asOf: Date) {
  if (!value) return { source, asOf: null, status: "unknown" as const, ageHours: null }
  const date = typeof value === "string" ? new Date(value) : value
  const ageHours = Math.max(0, Math.round(((asOf.getTime() - date.getTime()) / 3_600_000) * 10) / 10)
  return {
    source,
    asOf: date.toISOString(),
    status: ageHours <= 24 ? "fresh" as const : "stale" as const,
    ageHours,
  }
}

function readiness(
  state: ReadinessState,
  source: string,
  message: string,
  blockerCodes: string[] = [],
  counts?: Record<string, number>,
): PayrollCommandReadiness {
  return { state, source, message, blockerCodes, ...(counts ? { counts } : {}) }
}

async function findCurrentPeriod(client: DbClient, organizationId: string, asOf: Date) {
  const current = await client.payrollPeriod.findFirst({
    where: {
      organizationId,
      periodStart: { lte: asOf },
      periodEnd: { gte: asOf },
    },
    orderBy: { periodStart: "desc" },
  })

  if (current) return { period: current, selection: "calendar-match" as const }

  const latest = await client.payrollPeriod.findFirst({
    where: { organizationId },
    orderBy: { periodStart: "desc" },
  })

  return latest ? { period: latest, selection: "latest-period" as const } : { period: null, selection: "latest-period" as const }
}

function addBlocker(blockers: PayrollCommandBlocker[], blocker: PayrollCommandBlocker) {
  blockers.push(blocker)
}

function addAction(actions: PayrollCommandNextAction[], action: PayrollCommandNextAction) {
  actions.push(action)
}

async function writeCommandReadAudit(
  client: DbClient,
  input: {
    organizationId: string
    actorId?: string | null
    amountDecision: RedactionDecision
    blockerCount: number
    nextActionCount: number
    trustedCounts: PayrollCommandReadModel["trustedCounts"]
  },
) {
  await client.auditLog.create({
    data: {
      entityType: "PayrollCommandReadModel",
      entityId: input.organizationId,
      action: "PAYROLL_COMMAND_READ_MODEL_READ",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({
        amountAccess: {
          allowed: input.amountDecision.allowed,
          mode: input.amountDecision.mode,
          reasonCode: input.amountDecision.reasonCode,
          policy: input.amountDecision.policy,
          requiredPermissions: input.amountDecision.requiredPermissions,
        },
        blockerCount: input.blockerCount,
        nextActionCount: input.nextActionCount,
        trustedCounts: input.trustedCounts,
      }),
    },
  })
}

export async function getPayrollCommandReadModel(
  input: PayrollCommandReadModelInput,
  client: DbClient = db,
): Promise<PayrollCommandReadModel> {
  const parsed = payrollCommandReadModelInputSchema.parse(input)
  assertCommandReadAllowed(parsed)

  const asOf = parsed.asOf ?? new Date()
  const periodSelection = await findCurrentPeriod(client, parsed.organizationId, asOf)
  const currentPeriod = periodSelection.period

  const amountDecision = evaluateRedaction({
    field: "PayrollCommandReadModel.payrollAmounts",
    category: "payroll_person_amount",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision ?? null,
  })

  const [
    workbench,
    employeeSourceData,
    paymentEvidence,
    activeEmployees,
    linkedEmployees,
    activeContracts,
    activeRubriqueAssignments,
    pendingSalaryChangeRequests,
    approvedSalaryChangeRequests,
    pendingPaymentDestinationChanges,
  ] = await Promise.all([
    getPayrollWorkbenchData({
      organizationId: parsed.organizationId,
      limit: parsed.limit,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      moduleDecision: parsed.moduleDecision ?? null,
    }, client),
    getPayrollEmployeeSourceData({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      limit: parsed.limit,
      asOf,
      moduleDecision: parsed.moduleDecision ?? null,
    }, client),
    getPaymentEvidenceReadiness({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId ?? undefined,
      actorPermissions: parsed.actorPermissions,
      limit: parsed.limit,
      ...(currentPeriod ? { periodStart: currentPeriod.periodStart, periodEnd: currentPeriod.periodEnd } : {}),
    }, client),
    client.payrollEmployee.count({
      where: { organizationId: parsed.organizationId, deletedAt: null, status: PayrollEmployeeStatus.ACTIVE },
    }),
    client.payrollEmployee.count({
      where: { organizationId: parsed.organizationId, deletedAt: null, status: PayrollEmployeeStatus.ACTIVE, userId: { not: null } },
    }),
    client.payrollContract.count({
      where: {
        organizationId: parsed.organizationId,
        ...ACTIVE_CONTRACT_WHERE,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      },
    }),
    client.payrollEmployeeRubriqueAssignment.count({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        status: PayrollRubriqueAssignmentStatus.ACTIVE,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      },
    }),
    client.payrollSalaryChangeRequest.count({
      where: { organizationId: parsed.organizationId, deletedAt: null, status: PayrollSalaryChangeStatus.REQUESTED },
    }),
    client.payrollSalaryChangeRequest.count({
      where: { organizationId: parsed.organizationId, deletedAt: null, status: PayrollSalaryChangeStatus.APPROVED },
    }),
    client.payrollPaymentDestinationChangeRequest.count({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        status: { in: [PayrollPaymentDestinationChangeStatus.REQUESTED, PayrollPaymentDestinationChangeStatus.APPROVED] },
      },
    }),
  ])

  const currentRuns = currentPeriod
    ? await client.payrollRun.findMany({
        where: { organizationId: parsed.organizationId, deletedAt: null, payrollPeriodId: currentPeriod.id },
        include: { _count: { select: { lines: true, payslips: true, paymentBatches: true, declarations: true } } },
        orderBy: [{ createdAt: "desc" }],
        take: parsed.limit,
      })
    : []
  const currentRunIds = currentRuns.map((run) => run.id)
  const [currentPaymentBatches, currentDeclarations, closeRun, frozenAttendanceSnapshots] = await Promise.all([
    currentRunIds.length
      ? client.payrollPaymentBatch.findMany({
          where: { organizationId: parsed.organizationId, payrollRunId: { in: currentRunIds } },
          orderBy: [{ createdAt: "desc" }],
          take: parsed.limit,
        })
      : Promise.resolve([]),
    currentRunIds.length
      ? client.payrollDeclaration.findMany({
          where: { organizationId: parsed.organizationId, payrollRunId: { in: currentRunIds } },
          orderBy: [{ createdAt: "desc" }],
          take: parsed.limit,
        })
      : Promise.resolve([]),
    currentPeriod?.accountingPeriodId
      ? client.closeRun.findFirst({
          where: { organizationId: parsed.organizationId, periodId: currentPeriod.accountingPeriodId, voidedAt: null },
          orderBy: [{ createdAt: "desc" }],
        })
      : Promise.resolve(null),
    currentPeriod
      ? client.payrollAttendanceSnapshot.count({
          where: {
            organizationId: parsed.organizationId,
            status: PayrollAttendanceSnapshotStatus.FROZEN,
            periodStart: currentPeriod.periodStart,
            periodEnd: currentPeriod.periodEnd,
          },
        })
      : Promise.resolve(0),
  ])

  const latestRun = currentRuns[0] ?? null
  const latestPaymentBatch = currentPaymentBatches[0] ?? null
  const latestDeclaration = currentDeclarations[0] ?? null
  const blockers: PayrollCommandBlocker[] = []
  const nextActions: PayrollCommandNextAction[] = []
  const unmappedEmployees = Math.max(activeEmployees - linkedEmployees, 0)
  const contractGap = Math.max(activeEmployees - activeContracts, 0)
  const attendanceGap = Math.max(activeEmployees - frozenAttendanceSnapshots, 0)
  const paymentMissing = paymentEvidence.summary.missingPaymentDestinationCount
  const paymentPending = paymentEvidence.summary.pendingPaymentDestinationCount

  if (activeEmployees === 0) {
    addBlocker(blockers, { code: "PAYROLL_ACTIVE_EMPLOYEE_SOURCE_EMPTY", domain: "hr", severity: "critical", message: "No active payroll employees are available for the command center.", source: "services/payroll/employee.service.ts" })
  }
  if (unmappedEmployees > 0) {
    addBlocker(blockers, { code: "PAYROLL_EMPLOYEE_USER_MAPPING_GAP", domain: "hr", severity: "high", message: "Some active payroll employees are not mapped to users.", source: "services/payroll/employee.service.ts", count: unmappedEmployees })
    addAction(nextActions, { id: "map-payroll-employees", label: "Resolve payroll employee user mappings", priority: "high", requiredPermission: "payroll.employees.manage", source: "payroll.employee_source", blockedBy: ["PAYROLL_EMPLOYEE_USER_MAPPING_GAP"] })
  }
  if (contractGap > 0) {
    addBlocker(blockers, { code: "PAYROLL_ACTIVE_CONTRACT_GAP", domain: "hr", severity: "high", message: "Some active payroll employees do not have an active contract for the command period.", source: "services/payroll/contract.service.ts", count: contractGap })
    addAction(nextActions, { id: "activate-payroll-contracts", label: "Activate missing payroll contracts", priority: "high", requiredPermission: "payroll.contracts.manage", source: "payroll.contracts", blockedBy: ["PAYROLL_ACTIVE_CONTRACT_GAP"] })
  }
  if (pendingSalaryChangeRequests + approvedSalaryChangeRequests > 0) {
    addBlocker(blockers, { code: "PAYROLL_SALARY_CHANGE_QUEUE_OPEN", domain: "compensation", severity: "medium", message: "Salary change requests are still awaiting decision or application.", source: "services/payroll/compensation.service.ts", count: pendingSalaryChangeRequests + approvedSalaryChangeRequests })
    addAction(nextActions, { id: "clear-salary-change-queue", label: "Clear pending salary change approvals", priority: "normal", requiredPermission: "payroll.salary_changes.approve", source: "payroll.compensation", blockedBy: ["PAYROLL_SALARY_CHANGE_QUEUE_OPEN"] })
  }
  if (!currentPeriod) {
    addBlocker(blockers, { code: "PAYROLL_PERIOD_MISSING", domain: "payroll", severity: "critical", message: "No payroll period exists for command-center planning.", source: "services/payroll/payroll-control.service.ts" })
    addAction(nextActions, { id: "create-payroll-period", label: "Create the payroll period before running payroll", priority: "critical", requiredPermission: "payroll.runs.calculate", source: "payroll.periods", blockedBy: ["PAYROLL_PERIOD_MISSING"] })
  }
  if (attendanceGap > 0) {
    addBlocker(blockers, { code: "PAYROLL_ATTENDANCE_FREEZE_GAP", domain: "attendance", severity: "high", message: "Some active payroll employees do not have a frozen attendance snapshot for the command period.", source: "services/payroll/payment-evidence.service.ts", count: attendanceGap })
    addAction(nextActions, { id: "freeze-attendance-snapshots", label: "Freeze attendance snapshots for payroll", priority: "high", requiredPermission: "payroll.attendance.freeze", source: "payroll.attendance_readiness", blockedBy: ["PAYROLL_ATTENDANCE_FREEZE_GAP"] })
  }
  if (paymentMissing + paymentPending + pendingPaymentDestinationChanges > 0) {
    addBlocker(blockers, { code: "PAYROLL_PAYMENT_DESTINATION_EVIDENCE_GAP", domain: "payment", severity: "high", message: "Payroll payment destination approval evidence is incomplete.", source: "services/payroll/payment-evidence.service.ts", count: paymentMissing + paymentPending + pendingPaymentDestinationChanges })
    addAction(nextActions, { id: "clear-payment-destination-evidence", label: "Approve or apply payroll payment destination evidence", priority: "high", requiredPermission: "payroll.payment_destination.approve", source: "payroll.payment_destination", blockedBy: ["PAYROLL_PAYMENT_DESTINATION_EVIDENCE_GAP"] })
  }
  if (!latestRun && currentPeriod) {
    addAction(nextActions, {
      id: "calculate-current-payroll-run",
      label: "Calculate the current payroll run",
      priority: "high",
      requiredPermission: "payroll.runs.calculate",
      source: "payroll.runs",
      blockedBy: blockers.filter((blocker) => ["hr", "attendance", "payment"].includes(blocker.domain)).map((blocker) => blocker.code),
    })
  }
  if (workbench.counts.ledgerBlockers > 0) {
    addBlocker(blockers, { code: "PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN", domain: "posting", severity: "critical", message: "Payroll posting blockers remain open in the ledger posting gateway.", source: "services/payroll/payroll-control.service.ts", count: workbench.counts.ledgerBlockers })
    addAction(nextActions, { id: "clear-payroll-ledger-blockers", label: "Clear payroll ledger posting blockers", priority: "critical", requiredPermission: "accounting.posting-rules.manage", source: "payroll.ledger_posting", blockedBy: ["PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN"] })
  }
  if (workbench.counts.reconciliationExceptions > 0) {
    addBlocker(blockers, { code: "PAYROLL_PAYMENT_RECON_EXCEPTIONS_OPEN", domain: "payment", severity: "high", message: "Payroll payment reconciliation exceptions remain open.", source: "services/payroll/payroll-control.service.ts", count: workbench.counts.reconciliationExceptions })
    addAction(nextActions, { id: "resolve-payroll-payment-exceptions", label: "Resolve payroll payment reconciliation exceptions", priority: "high", requiredPermission: "payments.reconciliation.exception.resolve", source: "payroll.payment_reconciliation", blockedBy: ["PAYROLL_PAYMENT_RECON_EXCEPTIONS_OPEN"] })
  }
  if (latestRun && latestRun._count.lines === 0) {
    addBlocker(blockers, { code: "PAYROLL_REGISTER_EMPTY", domain: "register", severity: "critical", message: "The latest current-period payroll run has no register lines.", source: "services/payroll/payroll-control.service.ts", count: 0 })
  }
  if (latestRun && latestRun._count.declarations === 0) {
    addAction(nextActions, { id: "prepare-payroll-declarations", label: "Prepare payroll declarations from the posted run", priority: "normal", requiredPermission: "payroll.declarations.prepare", source: "payroll.declarations", blockedBy: latestRun.status === PayrollRunStatus.POSTED ? [] : ["PAYROLL_RUN_NOT_POSTED"] })
  }
  if (latestDeclaration?.status === PayrollDeclarationStatus.REJECTED || latestDeclaration?.status === PayrollDeclarationStatus.PAYMENT_DUE) {
    addBlocker(blockers, { code: "PAYROLL_DECLARATION_ACTION_REQUIRED", domain: "declaration", severity: "high", message: "The latest current-period declaration still requires statutory follow-up.", source: "services/payroll/payroll-control.service.ts", count: 1 })
  }
  if (closeRun && closeRun.criticalBlockerCount > 0) {
    addBlocker(blockers, { code: "PAYROLL_CLOSE_CRITICAL_BLOCKERS_OPEN", domain: "close", severity: "critical", message: "Close assurance has critical blockers for the accounting period linked to payroll.", source: "services/accounting/close-assurance-pack.service.ts", count: closeRun.criticalBlockerCount })
  }

  const trustedCounts: PayrollCommandReadModel["trustedCounts"] = {
    activeEmployees,
    linkedEmployees,
    unmappedEmployees,
    activeContracts,
    activeRubriqueAssignments,
    frozenAttendanceSnapshots,
    pendingSalaryChangeRequests,
    approvedSalaryChangeRequests,
    pendingPaymentDestinationChanges,
    approvedPaymentDestinations: paymentEvidence.summary.approvedPaymentDestinationCount,
    missingPaymentDestinations: paymentMissing,
    pendingPaymentDestinations: paymentPending,
    attendanceReadyEmployees: paymentEvidence.summary.attendanceReadyCount,
    attendanceDriftEmployees: paymentEvidence.summary.attendanceDriftCount,
    openPeriods: workbench.counts.openPeriods,
    calculatedRuns: workbench.counts.calculatedRuns,
    postedRuns: workbench.counts.postedRuns,
    releasedPaymentBatches: workbench.counts.releasedPaymentBatches,
    openDeclarations: workbench.counts.openDeclarations,
    ledgerBlockers: workbench.counts.ledgerBlockers,
    reconciliationExceptions: workbench.counts.reconciliationExceptions,
    currentPeriodRuns: currentRuns.length,
    currentPeriodPaymentBatches: currentPaymentBatches.length,
    currentPeriodDeclarations: currentDeclarations.length,
  }

  const blockerCodes = (domain: PayrollCommandBlocker["domain"]) => blockers.filter((blocker) => blocker.domain === domain).map((blocker) => blocker.code)
  const readModel: PayrollCommandReadModel = {
    organizationId: parsed.organizationId,
    asOf: asOf.toISOString(),
    currentPeriod: currentPeriod
      ? {
          id: currentPeriod.id,
          name: currentPeriod.name,
          status: currentPeriod.status,
          periodStart: currentPeriod.periodStart.toISOString(),
          periodEnd: currentPeriod.periodEnd.toISOString(),
          payDate: currentPeriod.payDate.toISOString(),
          inputLockedAt: iso(currentPeriod.inputLockedAt),
          countryCode: currentPeriod.countryCode,
          countryPackVersion: currentPeriod.countryPackVersion,
          countryPackResolutionHash: currentPeriod.countryPackResolutionHash,
          countryPackCapabilityStatus: currentPeriod.countryPackCapabilityStatus,
          accountingPeriodId: currentPeriod.accountingPeriodId,
          selection: periodSelection.selection,
        }
      : null,
    roleScope: {
      canReadCommand: true,
      canReadSalaryAmounts: amountDecision.allowed,
      canManageEmployees: can(parsed.actorPermissions, ["payroll.employees.manage"]),
      canManageContracts: can(parsed.actorPermissions, ["payroll.contracts.manage"]),
      canManageCompensation: can(parsed.actorPermissions, ["payroll.compensation.manage"]),
      canReviewRuns: can(parsed.actorPermissions, ["payroll.runs.review"]),
      canCalculateRuns: can(parsed.actorPermissions, ["payroll.runs.calculate"]),
      canApproveRuns: can(parsed.actorPermissions, ["payroll.runs.approve"]),
      canReleasePayments: can(parsed.actorPermissions, ["payroll.payments.release"]),
      canPrepareDeclarations: can(parsed.actorPermissions, ["payroll.declarations.prepare"]),
      canExportPayroll: can(parsed.actorPermissions, ["payroll.exports.create"]),
      canReadPaymentEvidence: can(parsed.actorPermissions, ["payroll.payment_destination.read", "payroll.command.read"]),
      canReadAttendanceReadiness: can(parsed.actorPermissions, ["payroll.attendance.readiness.read", "payroll.command.read"]),
    },
    redaction: {
      payrollAmounts: {
        allowed: amountDecision.allowed,
        mode: amountDecision.mode,
        reasonCode: amountDecision.reasonCode,
        policy: amountDecision.policy,
        replacement: amountDecision.replacement,
        requiredPermissions: amountDecision.requiredPermissions,
      },
    },
    trustedCounts,
    readiness: {
      employees: readiness(activeEmployees === 0 ? "BLOCKED" : unmappedEmployees > 0 ? "ACTION_REQUIRED" : "READY", "payroll.employee_source", activeEmployees === 0 ? "No active payroll employees are available." : unmappedEmployees > 0 ? "Employee/user mappings need cleanup." : "Employee source data is ready for command composition.", blockerCodes("hr"), { activeEmployees, linkedEmployees, unmappedEmployees }),
      contracts: readiness(contractGap > 0 ? "ACTION_REQUIRED" : activeEmployees === 0 ? "UNKNOWN" : "READY", "payroll.contracts", contractGap > 0 ? "Active contract coverage is incomplete." : "Active contract coverage is ready.", blockerCodes("hr"), { activeContracts, contractGap }),
      compensation: readiness(pendingSalaryChangeRequests + approvedSalaryChangeRequests > 0 ? "ACTION_REQUIRED" : "READY", "payroll.compensation", pendingSalaryChangeRequests + approvedSalaryChangeRequests > 0 ? "Salary change queue requires maker-checker follow-up." : "Compensation queue is clear for command composition.", blockerCodes("compensation"), { pendingSalaryChangeRequests, approvedSalaryChangeRequests, activeRubriqueAssignments }),
      attendance: readiness(attendanceGap > 0 || paymentEvidence.summary.attendanceDriftCount > 0 ? "ACTION_REQUIRED" : activeEmployees === 0 ? "UNKNOWN" : "READY", "payroll.attendance_readiness", attendanceGap > 0 ? "Attendance freeze coverage is incomplete." : paymentEvidence.summary.attendanceDriftCount > 0 ? "Attendance source drift requires review." : "Attendance readiness is ready for command composition.", blockerCodes("attendance"), { frozenAttendanceSnapshots, attendanceGap, attendanceDriftEmployees: paymentEvidence.summary.attendanceDriftCount }),
      paymentDestinations: readiness(paymentMissing + paymentPending + pendingPaymentDestinationChanges > 0 ? "ACTION_REQUIRED" : activeEmployees === 0 ? "UNKNOWN" : "READY", "payroll.payment_destination", paymentMissing + paymentPending + pendingPaymentDestinationChanges > 0 ? "Payment destination evidence requires approval/application." : "Payment destination evidence is ready for command composition.", blockerCodes("payment"), { approvedPaymentDestinations: paymentEvidence.summary.approvedPaymentDestinationCount, paymentMissing, paymentPending }),
      payrollRun: readiness(!currentPeriod ? "BLOCKED" : latestRun ? "READY" : "ACTION_REQUIRED", "payroll.runs", !currentPeriod ? "A payroll period is required." : latestRun ? "Current-period payroll run data is available." : "The current-period payroll run has not been calculated yet.", blockerCodes("payroll"), { currentPeriodRuns: currentRuns.length }),
      payrollRegister: readiness(!latestRun ? "UNKNOWN" : latestRun._count.lines > 0 ? "READY" : "BLOCKED", "payroll.register", !latestRun ? "Register readiness waits for a current payroll run." : latestRun._count.lines > 0 ? "Payroll register lines are present." : "The payroll register is empty.", blockerCodes("register"), { lineCount: latestRun?._count.lines ?? 0, payslipCount: latestRun?._count.payslips ?? 0 }),
      payments: readiness(workbench.counts.reconciliationExceptions > 0 ? "ACTION_REQUIRED" : currentPaymentBatches.length > 0 ? "READY" : latestRun ? "ACTION_REQUIRED" : "UNKNOWN", "payroll.payments", workbench.counts.reconciliationExceptions > 0 ? "Payroll payment reconciliation exceptions are open." : currentPaymentBatches.length > 0 ? "Payment batch data is available." : "Payment batch creation waits for a payroll run.", blockerCodes("payment"), { currentPeriodPaymentBatches: currentPaymentBatches.length, reconciliationExceptions: workbench.counts.reconciliationExceptions }),
      declarations: readiness(latestDeclaration?.status === PayrollDeclarationStatus.REJECTED || latestDeclaration?.status === PayrollDeclarationStatus.PAYMENT_DUE ? "ACTION_REQUIRED" : currentDeclarations.length > 0 ? "READY" : latestRun ? "ACTION_REQUIRED" : "UNKNOWN", "payroll.declarations", currentDeclarations.length > 0 ? "Declaration data is available for the current period." : "Declaration preparation waits for a posted payroll run.", blockerCodes("declaration"), { currentPeriodDeclarations: currentDeclarations.length, openDeclarations: workbench.counts.openDeclarations }),
      posting: readiness(workbench.counts.ledgerBlockers > 0 ? "BLOCKED" : "READY", "payroll.ledger_posting", workbench.counts.ledgerBlockers > 0 ? "Ledger posting blockers must be cleared." : "Payroll posting blockers are clear.", blockerCodes("posting"), { ledgerBlockers: workbench.counts.ledgerBlockers }),
      close: readiness(!closeRun ? "UNKNOWN" : closeRun.criticalBlockerCount > 0 ? "BLOCKED" : closeRun.highBlockerCount > 0 ? "ACTION_REQUIRED" : "READY", "accounting.close_assurance", !closeRun ? "Close assurance has not produced a current linked close run." : closeRun.criticalBlockerCount > 0 ? "Critical close blockers are open." : "Close assurance is available for the payroll-linked period.", blockerCodes("close"), closeRun ? { criticalBlockerCount: closeRun.criticalBlockerCount, highBlockerCount: closeRun.highBlockerCount } : undefined),
    },
    blockers,
    nextActions,
    evidence: {
      latestRun: latestRun
        ? {
            id: latestRun.id,
            runNumber: latestRun.runNumber,
            status: latestRun.status,
            documentHash: latestRun.documentHash,
            evidenceHash: latestRun.evidenceHash,
            calculationHash: latestRun.calculationHash,
            attendanceSnapshotHash: latestRun.attendanceSnapshotHash,
            countryPackResolutionHash: latestRun.countryPackResolutionHash,
            ledgerPostingBatchId: latestRun.ledgerPostingBatchId,
            postedBusinessEventId: latestRun.postedBusinessEventId,
            payslipCount: latestRun._count.payslips,
            lineCount: latestRun._count.lines,
            paymentBatchCount: latestRun._count.paymentBatches,
            declarationCount: latestRun._count.declarations,
            updatedAt: latestRun.updatedAt.toISOString(),
          }
        : null,
      latestPaymentBatch: latestPaymentBatch
        ? {
            id: latestPaymentBatch.id,
            batchNumber: latestPaymentBatch.batchNumber,
            status: latestPaymentBatch.status,
            documentHash: latestPaymentBatch.documentHash,
            evidenceHash: latestPaymentBatch.evidenceHash,
            bankFileHash: latestPaymentBatch.bankFileHash,
            ledgerPostingBatchId: latestPaymentBatch.ledgerPostingBatchId,
            postedBusinessEventId: latestPaymentBatch.postedBusinessEventId,
            reconciliationStatus: latestPaymentBatch.reconciliationStatus,
            updatedAt: latestPaymentBatch.updatedAt.toISOString(),
          }
        : null,
      latestDeclaration: latestDeclaration
        ? {
            id: latestDeclaration.id,
            authority: latestDeclaration.authority,
            declarationType: latestDeclaration.declarationType,
            status: latestDeclaration.status,
            payloadHash: latestDeclaration.payloadHash,
            countryPackResolutionHash: latestDeclaration.countryPackResolutionHash,
            dueDate: iso(latestDeclaration.dueDate),
            updatedAt: latestDeclaration.updatedAt.toISOString(),
          }
        : null,
      closeRun: closeRun
        ? {
            id: closeRun.id,
            status: closeRun.status,
            readinessScore: closeRun.readinessScore,
            criticalBlockerCount: closeRun.criticalBlockerCount,
            highBlockerCount: closeRun.highBlockerCount,
            evidenceCoveragePct: decimalString(closeRun.evidenceCoveragePct),
            asOf: closeRun.asOf.toISOString(),
          }
        : null,
    },
    freshness: [
      toFreshness("payroll.period", currentPeriod?.updatedAt, asOf),
      toFreshness("payroll.workbench", workbench.asOf, asOf),
      toFreshness("payroll.employee_source", employeeSourceData.asOf, asOf),
      toFreshness("payroll.payment_evidence", paymentEvidence.asOf, asOf),
      toFreshness("payroll.latest_run", latestRun?.updatedAt, asOf),
      toFreshness("payroll.latest_payment_batch", latestPaymentBatch?.updatedAt, asOf),
      toFreshness("payroll.latest_declaration", latestDeclaration?.updatedAt, asOf),
      toFreshness("accounting.close_run", closeRun?.asOf, asOf),
    ],
    sourceScope: {
      limit: parsed.limit,
      employeeSourceReturned: employeeSourceData.employees.length,
      paymentEvidenceReturned: paymentEvidence.employees.length,
      employeeCoverageComplete: activeEmployees <= employeeSourceData.employees.length,
      paymentEvidenceCoverageComplete: activeEmployees <= paymentEvidence.employees.length,
      sourceServices: [
        "services/payroll/payroll-control.service.ts",
        "services/payroll/employee.service.ts",
        "services/payroll/payment-evidence.service.ts",
        "services/payroll/command-read-model.service.ts",
      ],
    },
    workbench,
  }

  await writeCommandReadAudit(client, {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    amountDecision,
    blockerCount: readModel.blockers.length,
    nextActionCount: readModel.nextActions.length,
    trustedCounts,
  })

  return readModel
}
