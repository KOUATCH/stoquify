import { createHash } from "crypto"
import {
  PayrollDeclarationEvidenceTransition,
  PayrollPaymentBatchStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"

import { db } from "../../prisma/db"
import { BusinessRuleError } from "../_shared/action-errors"
import {
  getPayrollSetupReadiness,
  redactPayrollSetupRef,
  type PayrollEmployeeSourceMode,
  type PayrollSetupReadinessInput,
  type PayrollSetupReadinessIssue,
  type PayrollSetupReadinessResult,
} from "./payroll-setup-readiness.service"

type DbClient = typeof db | Prisma.TransactionClient

export type PayrollSeedBackfillDryRunInput = PayrollSetupReadinessInput & {
  dryRun?: boolean
}

export type PayrollDryRunPlannedWrite = {
  target: string
  operation: "create" | "upsert" | "reuse" | "blocked"
  count: number
  idempotencyKey: string
  reason: string
}

export type PayrollProofBackfillGapCounts = {
  payrollRunMissingStatutoryScenarioCoverage: number
  declarationEvidenceMissingSourceRegisterHash: number
  declarationEvidenceMissingAuthorityAdapterProof: number
  declarationEvidenceMissingAuthorityLifecycleProof: number
  paymentBatchMissingProviderAdapterProof: number
  paymentBatchMissingSettlementRegisterProof: number
  paymentBatchMissingSettlementLifecycleProof: number
}

export type PayrollProofBackfillDryRun = {
  dryRunOnly: true
  mutationModeAvailable: false
  status: "READY" | "BLOCKED"
  scanScope: "tenant-history"
  evidenceRef: string
  totalBlockingGaps: number
  gapCounts: PayrollProofBackfillGapCounts
  plannedJobs: PayrollDryRunPlannedWrite[]
  requiredSignoffs: string[]
  rollbackStrategy: string[]
  postMigrationReconciliation: string[]
}

export type PayrollSeedBackfillDryRunPlan = {
  dryRunOnly: true
  mutationModeAvailable: false
  status: "READY" | "BLOCKED"
  generatedAt: string
  organizationRef: string
  actorRef: string | null
  input: {
    countryCode: string | null
    periodStart: string
    periodEnd: string
    payDate: string
    employeeSourceMode: PayrollEmployeeSourceMode
    maxRows: number
  }
  readiness: PayrollSetupReadinessResult
  proofBackfill: PayrollProofBackfillDryRun
  plannedWrites: PayrollDryRunPlannedWrite[]
  blockers: PayrollSetupReadinessIssue[]
  warnings: PayrollSetupReadinessIssue[]
  redaction: {
    policy: "payroll-seed-backfill-dry-run-redaction"
    rawPersonDataIncluded: false
    rawPaymentDestinationIncluded: false
    rawSalaryIncluded: false
  }
}

function normalizeDate(value: Date | string) {
  const parsed =
    value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError(
      "Payroll seed/backfill dry-run received an invalid date.",
    )
  }
  return parsed
}

function stableKey(
  kind: string,
  parts: Array<string | number | null | undefined>,
) {
  return `${kind}:${createHash("sha256")
    .update(parts.map((part) => part ?? "").join("|"))
    .digest("hex")
    .slice(0, 16)}`
}

function assertDryRunOnly(input: PayrollSeedBackfillDryRunInput) {
  if (input.dryRun === false) {
    throw new BusinessRuleError(
      "Payroll seed/backfill mutation mode is intentionally unavailable in this rollout slice.",
    )
  }
}

const CLOSE_IMPACTING_DECLARATION_TRANSITIONS = [
  PayrollDeclarationEvidenceTransition.SUBMIT,
  PayrollDeclarationEvidenceTransition.ACCEPT,
  PayrollDeclarationEvidenceTransition.REJECT,
  PayrollDeclarationEvidenceTransition.MARK_PAYMENT_DUE,
  PayrollDeclarationEvidenceTransition.MARK_PAID,
  PayrollDeclarationEvidenceTransition.RECONCILE,
  PayrollDeclarationEvidenceTransition.AMEND,
] as const

const PAYROLL_REGISTER_PROOF_RUN_STATUSES = [
  PayrollRunStatus.POSTED,
  PayrollRunStatus.PAID,
  PayrollRunStatus.ARCHIVED,
] as const

const PAYMENT_ADAPTER_PROOF_STATUSES = [
  PayrollPaymentBatchStatus.RELEASED,
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
  PayrollPaymentBatchStatus.SETTLED,
] as const

const PAYMENT_SETTLEMENT_PROOF_STATUSES = [
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
  PayrollPaymentBatchStatus.SETTLED,
] as const

function declarationRegisterProofBackfillCoverageWhere(organizationId: string) {
  return {
    organizationId,
    transition: PayrollDeclarationEvidenceTransition.AMEND,
    sourceRegisterHash: { not: null },
    metadata: {
      path: ["proofBackfill", "coversDeclarationRegisterProof"],
      equals: true,
    },
  }
}

function declarationAuthorityAdapterProofBackfillCoverageWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: PayrollDeclarationEvidenceTransition.AMEND,
    metadata: {
      path: ["proofBackfill", "coversDeclarationAuthorityAdapterProof"],
      equals: true,
    },
  }
}

function declarationAuthorityLifecycleProofBackfillCoverageWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: PayrollDeclarationEvidenceTransition.AMEND,
    metadata: {
      path: ["proofBackfill", "coversDeclarationAuthorityLifecycleProof"],
      equals: true,
    },
  }
}

function declarationEvidenceMissingSourceRegisterHashWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: { in: [...CLOSE_IMPACTING_DECLARATION_TRANSITIONS] },
    OR: [{ sourceRegisterHash: null }, { sourceRegisterHash: "" }],
    declaration: {
      evidenceItems: {
        none: declarationRegisterProofBackfillCoverageWhere(organizationId),
      },
    },
  }
}

function declarationEvidenceMissingAuthorityAdapterProofWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: { in: [...CLOSE_IMPACTING_DECLARATION_TRANSITIONS] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["authorityAdapterProofHash"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["authorityAdapterProofHash"], equals: "" } },
      {
        metadata: {
          path: ["authorityAdapterContractHash"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["authorityAdapterContractHash"], equals: "" } },
    ],
    declaration: {
      evidenceItems: {
        none: declarationAuthorityAdapterProofBackfillCoverageWhere(
          organizationId,
        ),
      },
    },
  }
}

function declarationEvidenceMissingAuthorityLifecycleProofWhere(
  organizationId: string,
) {
  return {
    organizationId,
    transition: { in: [...CLOSE_IMPACTING_DECLARATION_TRANSITIONS] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["authorityLifecycleContractHash"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: { path: ["authorityLifecycleContractHash"], equals: "" },
      },
      {
        metadata: {
          path: ["authorityLifecycleStatus"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["authorityLifecycleStatus"], equals: "" } },
      {
        metadata: {
          path: ["authorityLifecycleCloseImpact"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["authorityLifecycleCloseImpact"], equals: "" } },
    ],
    declaration: {
      evidenceItems: {
        none: declarationAuthorityLifecycleProofBackfillCoverageWhere(
          organizationId,
        ),
      },
    },
  }
}

function paymentProviderAdapterProofBackfillCoverageWhere() {
  return {
    metadata: {
      path: ["proofBackfill", "coversPaymentProviderAdapterProof"],
      equals: true,
    },
  }
}

function paymentSettlementRegisterProofBackfillCoverageWhere() {
  return {
    metadata: {
      path: ["proofBackfill", "coversPaymentSettlementRegisterProof"],
      equals: true,
    },
  }
}

function paymentSettlementLifecycleProofBackfillCoverageWhere() {
  return {
    metadata: {
      path: ["proofBackfill", "coversPaymentSettlementLifecycleProof"],
      equals: true,
    },
  }
}

function paymentBatchMissingProviderAdapterProofWhere(organizationId: string) {
  return {
    organizationId,
    status: { in: [...PAYMENT_ADAPTER_PROOF_STATUSES] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["paymentAdapterProofHash"],
          equals: Prisma.AnyNull,
        },
      },
      { metadata: { path: ["paymentAdapterProofHash"], equals: "" } },
      {
        metadata: {
          path: ["paymentProviderAdapterContractHash"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: {
          path: ["paymentProviderAdapterContractHash"],
          equals: "",
        },
      },
    ],
    NOT: paymentProviderAdapterProofBackfillCoverageWhere(),
  }
}

function paymentBatchMissingSettlementRegisterProofWhere(
  organizationId: string,
) {
  return {
    organizationId,
    status: { in: [...PAYMENT_SETTLEMENT_PROOF_STATUSES] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["latestSettlementSourceRegisterHash"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: {
          path: ["latestSettlementSourceRegisterHash"],
          equals: "",
        },
      },
    ],
    NOT: paymentSettlementRegisterProofBackfillCoverageWhere(),
  }
}

function paymentBatchMissingSettlementLifecycleProofWhere(
  organizationId: string,
) {
  return {
    organizationId,
    status: { in: [...PAYMENT_SETTLEMENT_PROOF_STATUSES] },
    OR: [
      { metadata: { equals: Prisma.AnyNull } },
      {
        metadata: {
          path: ["latestSettlementLifecycleContractHash"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: {
          path: ["latestSettlementLifecycleContractHash"],
          equals: "",
        },
      },
      {
        metadata: {
          path: ["latestSettlementLifecycleStatus"],
          equals: Prisma.AnyNull,
        },
      },
      {
        metadata: { path: ["latestSettlementLifecycleStatus"], equals: "" },
      },
    ],
    NOT: paymentSettlementLifecycleProofBackfillCoverageWhere(),
  }
}
function countTotalGaps(counts: PayrollProofBackfillGapCounts) {
  return Object.values(counts).reduce((total, count) => total + count, 0)
}

function plannedProofJob(
  target: string,
  count: number,
  idempotencyKey: string,
  missingReason: string,
  cleanReason: string,
): PayrollDryRunPlannedWrite {
  return {
    target,
    operation: count > 0 ? "blocked" : "reuse",
    count,
    idempotencyKey,
    reason: count > 0 ? missingReason : cleanReason,
  }
}

async function scanPayrollProofBackfill(
  input: PayrollSeedBackfillDryRunInput,
  readiness: PayrollSetupReadinessResult,
  client: DbClient,
): Promise<PayrollProofBackfillDryRun> {
  const [
    payrollRunMissingStatutoryScenarioCoverage,
    declarationEvidenceMissingSourceRegisterHash,
    declarationEvidenceMissingAuthorityAdapterProof,
    declarationEvidenceMissingAuthorityLifecycleProof,
    paymentBatchMissingProviderAdapterProof,
    paymentBatchMissingSettlementRegisterProof,
    paymentBatchMissingSettlementLifecycleProof,
  ] = await Promise.all([
    client.payrollRun.count({
      where: {
        organizationId: input.organizationId,
        status: { in: [...PAYROLL_REGISTER_PROOF_RUN_STATUSES] },
        deletedAt: null,
        OR: [
          { metadata: { equals: Prisma.AnyNull } },
          {
            metadata: {
              path: ["statutoryScenarioCoverageHash"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["statutoryScenarioCoverageHash"], equals: "" } },
          {
            metadata: {
              path: ["statutoryScenarioCoverage", "status"],
              equals: Prisma.AnyNull,
            },
          },
          { metadata: { path: ["statutoryScenarioCoverage", "status"], equals: "" } },
          {
            metadata: {
              path: [
                "statutoryScenarioCoverage",
                "reviewEvidence",
                "sourceEvidenceHashes",
              ],
              equals: Prisma.AnyNull,
            },
          },
        ],
      },
    }),
    client.payrollDeclarationEvidence.count({
      where: declarationEvidenceMissingSourceRegisterHashWhere(
        input.organizationId,
      ),
    }),
    client.payrollDeclarationEvidence.count({
      where: declarationEvidenceMissingAuthorityAdapterProofWhere(
        input.organizationId,
      ),
    }),
    client.payrollDeclarationEvidence.count({
      where: declarationEvidenceMissingAuthorityLifecycleProofWhere(
        input.organizationId,
      ),
    }),
    client.payrollPaymentBatch.count({
      where: paymentBatchMissingProviderAdapterProofWhere(
        input.organizationId,
      ),
    }),
    client.payrollPaymentBatch.count({
      where: paymentBatchMissingSettlementRegisterProofWhere(
        input.organizationId,
      ),
    }),
    client.payrollPaymentBatch.count({
      where: paymentBatchMissingSettlementLifecycleProofWhere(
        input.organizationId,
      ),
    }),
  ])

  const gapCounts: PayrollProofBackfillGapCounts = {
    payrollRunMissingStatutoryScenarioCoverage,
    declarationEvidenceMissingSourceRegisterHash,
    declarationEvidenceMissingAuthorityAdapterProof,
    declarationEvidenceMissingAuthorityLifecycleProof,
    paymentBatchMissingProviderAdapterProof,
    paymentBatchMissingSettlementRegisterProof,
    paymentBatchMissingSettlementLifecycleProof,
  }
  const totalBlockingGaps = countTotalGaps(gapCounts)
  const evidenceRef = stableKey("payroll-proof-backfill-dry-run", [
    readiness.organizationRef,
    "tenant-history",
  ])

  const plannedJobs = [
    plannedProofJob(
      "PayrollRunStatutoryScenarioCoverageBackfill",
      payrollRunMissingStatutoryScenarioCoverage,
      stableKey("payroll-run-statutory-scenario-coverage-backfill", [
        readiness.organizationRef,
        "tenant-history",
      ]),
      "Posted payroll registers are missing statutory scenario review evidence; requires reviewed country-pack coverage and register recertification before metadata-only backfill.",
      "Posted payroll registers already carry statutory scenario coverage proof.",
    ),
    plannedProofJob(
      "PayrollDeclarationEvidenceRegisterProofBackfill",
      declarationEvidenceMissingSourceRegisterHash,
      stableKey("payroll-declaration-register-proof-backfill", [
        readiness.organizationRef,
        "tenant-history",
      ]),
      "Source register proof is missing; requires reviewed source-register mapping and correction evidence before certification.",
      "Declaration evidence source register proof is already present for close-impacting records.",
    ),
    plannedProofJob(
      "PayrollDeclarationEvidenceAuthorityAdapterProofBackfill",
      declarationEvidenceMissingAuthorityAdapterProof,
      stableKey("payroll-declaration-adapter-proof-backfill", [
        readiness.organizationRef,
        "tenant-history",
      ]),
      "Authority adapter proof is missing; requires reviewed adapter registry proof before any metadata-only correction job.",
      "Declaration authority adapter proof is already present for close-impacting records.",
    ),
    plannedProofJob(
      "PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill",
      declarationEvidenceMissingAuthorityLifecycleProof,
      stableKey("payroll-declaration-lifecycle-proof-backfill", [
        readiness.organizationRef,
        "tenant-history",
      ]),
      "Authority lifecycle proof is missing; requires deterministic lifecycle contract derivation, redacted evidence, and accounting/security signoff.",
      "Declaration authority lifecycle proof is already present for close-impacting records.",
    ),
    plannedProofJob(
      "PayrollPaymentBatchProviderAdapterProofBackfill",
      paymentBatchMissingProviderAdapterProof,
      stableKey("payroll-payment-provider-adapter-proof-backfill", [
        readiness.organizationRef,
        "tenant-history",
      ]),
      "Provider adapter proof is missing; requires reviewed provider adapter contract and settlement evidence mapping before certification.",
      "Payment provider adapter proof is already present for released or settled batches.",
    ),
    plannedProofJob(
      "PayrollPaymentSettlementRegisterProofBackfill",
      paymentBatchMissingSettlementRegisterProof,
      stableKey("payroll-payment-settlement-register-proof-backfill", [
        readiness.organizationRef,
        "tenant-history",
      ]),
      "Settlement register proof is missing; requires register tie-out evidence before close certification.",
      "Payment settlement register proof is already present for settled batches.",
    ),
    plannedProofJob(
      "PayrollPaymentSettlementLifecycleProofBackfill",
      paymentBatchMissingSettlementLifecycleProof,
      stableKey("payroll-payment-settlement-lifecycle-proof-backfill", [
        readiness.organizationRef,
        "tenant-history",
      ]),
      "Settlement lifecycle proof is missing; requires deterministic provider settlement lifecycle contract derivation and signoff.",
      "Payment settlement lifecycle proof is already present for settled batches.",
    ),
  ]

  return {
    dryRunOnly: true,
    mutationModeAvailable: false,
    status: totalBlockingGaps > 0 ? "BLOCKED" : "READY",
    scanScope: "tenant-history",
    evidenceRef,
    totalBlockingGaps,
    gapCounts,
    plannedJobs,
    requiredSignoffs: [
      "payroll-admin",
      "accounting-controller",
      "security-privacy",
      "operations-owner",
    ],
    rollbackStrategy: [
      "Do not overwrite immutable payroll evidence; append reviewed correction/backfill metadata with deterministic idempotency keys.",
      "If a backfill job is wrong, append a reversing correction event and keep both records in the audit trail.",
      "Re-run data-trust and close-assurance gates after each tenant backfill batch before enabling certification.",
    ],
    postMigrationReconciliation: [
      "Declaration evidence count equals pre-migration count plus approved correction/backfill records.",
      "Payroll run statutory scenario coverage proof counts match posted, paid, and archived register states.",
      "Payment batch settlement proof counts match released, partially settled, and settled batch states.",
      "Data-trust declaration/payment proof gap facts return zero for the tenant before signoff.",
      "Accounting close blockers and payroll immutability runtime checks remain green after backfill.",
    ],
  }
}

export async function generatePayrollSeedBackfillDryRunPlan(
  input: PayrollSeedBackfillDryRunInput,
  client: DbClient = db,
): Promise<PayrollSeedBackfillDryRunPlan> {
  assertDryRunOnly(input)

  const readiness = await getPayrollSetupReadiness(input, client)
  const periodStart = normalizeDate(input.periodStart)
  const periodEnd = normalizeDate(input.periodEnd)

  const plannedWrites: PayrollDryRunPlannedWrite[] = []
  const proofBackfill = await scanPayrollProofBackfill(input, readiness, client)
  const existingPeriod = readiness.checks.tenant.organizationExists
    ? await client.payrollPeriod.findFirst({
        where: {
          organizationId: input.organizationId,
          periodStart,
          periodEnd,
        },
        select: { id: true, status: true },
      })
    : null

  plannedWrites.push({
    target: "PayrollPeriod",
    operation: existingPeriod ? "reuse" : "create",
    count: existingPeriod ? 0 : 1,
    idempotencyKey: stableKey("payroll-period", [
      readiness.organizationRef,
      readiness.input.periodStart,
      readiness.input.periodEnd,
    ]),
    reason: existingPeriod
      ? "Existing tenant payroll period matches the requested date range."
      : "Would create one tenant payroll period using the existing organization-period unique key.",
  })

  plannedWrites.push({
    target: "PayrollEmployee",
    operation:
      readiness.input.employeeSourceMode === "users" ? "upsert" : "blocked",
    count: readiness.checks.employeeUserMapping.plannedEmployeeCreateCount,
    idempotencyKey: stableKey("payroll-employee-users", [
      readiness.organizationRef,
      readiness.input.employeeSourceMode,
      readiness.checks.employeeUserMapping.plannedEmployeeCreateCount,
    ]),
    reason:
      readiness.input.employeeSourceMode === "users"
        ? "Would upsert payroll employee shells from active tenant users with deterministic employee numbers."
        : "No employee writes are planned because this source adapter is not implemented.",
  })

  plannedWrites.push({
    target: "PayrollContract",
    operation: "blocked",
    count: 0,
    idempotencyKey: stableKey("payroll-contract", [
      readiness.organizationRef,
      readiness.input.periodStart,
    ]),
    reason:
      "Contracts require approved salary and signed document-hash evidence; this dry-run does not fabricate them.",
  })

  plannedWrites.push({
    target: "PayrollPaymentDestination",
    operation: "blocked",
    count: 0,
    idempotencyKey: stableKey("payroll-payment-destination", [
      readiness.organizationRef,
    ]),
    reason:
      "Payment destinations require approved hashes/evidence only; raw destination details are never planned here.",
  })

  plannedWrites.push({
    target: "PayrollAttendanceSnapshot",
    operation: "blocked",
    count: 0,
    idempotencyKey: stableKey("payroll-attendance", [
      readiness.organizationRef,
      readiness.input.periodStart,
      readiness.input.periodEnd,
    ]),
    reason:
      "Attendance snapshots require source hashes and a freeze plan before payroll calculation.",
  })

  plannedWrites.push(...proofBackfill.plannedJobs)

  const reviewedProofChain =
    readiness.checks.countryPack.calculationFixtures.reviewedProofChain
  const proofBackfillBlockers: PayrollSetupReadinessIssue[] =
    proofBackfill.totalBlockingGaps > 0
      ? [
          {
            code: "PAYROLL_PROOF_BACKFILL_REQUIRED",
            severity: "BLOCKER",
            message:
              "Historical payroll run, declaration, or payment records require proof-contract backfill before production certification.",
            evidence: {
              totalBlockingGaps: proofBackfill.totalBlockingGaps,
              payrollRunStatutoryCoverageGaps:
                proofBackfill.gapCounts
                  .payrollRunMissingStatutoryScenarioCoverage,
              declarationLifecycleProofGaps:
                proofBackfill.gapCounts
                  .declarationEvidenceMissingAuthorityLifecycleProof,
              paymentSettlementLifecycleProofGaps:
                proofBackfill.gapCounts
                  .paymentBatchMissingSettlementLifecycleProof,
              reviewedProofChainStatus: reviewedProofChain?.status ?? null,
              reviewedProofChainCoverageHash:
                reviewedProofChain?.coverageHash ?? null,
              reviewedProofChainBlockerCodes:
                reviewedProofChain?.blockerCodes.join(", ") || null,
            },
          },
        ]
      : []
  const blockers = [...readiness.blockers, ...proofBackfillBlockers]

  return {
    dryRunOnly: true,
    mutationModeAvailable: false,
    status: blockers.length > 0 ? "BLOCKED" : readiness.status,
    generatedAt: new Date().toISOString(),
    organizationRef: readiness.organizationRef,
    actorRef: redactPayrollSetupRef(input.actorId),
    input: readiness.input,
    readiness,
    proofBackfill,
    plannedWrites,
    blockers,
    warnings: readiness.warnings,
    redaction: {
      policy: "payroll-seed-backfill-dry-run-redaction",
      rawPersonDataIncluded: false,
      rawPaymentDestinationIncluded: false,
      rawSalaryIncluded: false,
    },
  }
}

function formatIssue(issue: PayrollSetupReadinessIssue) {
  const evidence = issue.evidence
    ? ` (${Object.entries(issue.evidence)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")})`
    : ""
  return `- [${issue.severity}] ${issue.code}: ${issue.message}${evidence}`
}

export function formatPayrollSeedBackfillDryRunReport(
  plan: PayrollSeedBackfillDryRunPlan,
) {
  const plannedWrites = plan.plannedWrites
    .map(
      (item) =>
        `| ${item.target} | ${item.operation} | ${item.count} | ${item.idempotencyKey} | ${item.reason} |`,
    )
    .join("\n")
  const blockers = plan.blockers.length
    ? plan.blockers.map(formatIssue).join("\n")
    : "- None."
  const warnings = plan.warnings.length
    ? plan.warnings.map(formatIssue).join("\n")
    : "- None."
  const proofGaps = Object.entries(plan.proofBackfill.gapCounts)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join("\n")
  const signoffs = plan.proofBackfill.requiredSignoffs
    .map((item) => `- ${item}`)
    .join("\n")
  const rollback = plan.proofBackfill.rollbackStrategy
    .map((item) => `- ${item}`)
    .join("\n")
  const reconciliation = plan.proofBackfill.postMigrationReconciliation
    .map((item) => `- ${item}`)
    .join("\n")

  return `# Payroll Seed/Backfill Dry-Run Plan

Generated: ${plan.generatedAt}

Status: ${plan.status}
Dry-run only: yes
Mutation mode available: no

## Redacted Input

- Organization: ${plan.organizationRef}
- Actor: ${plan.actorRef ?? "redacted:none"}
- Country: ${plan.input.countryCode ?? "not configured"}
- Period: ${plan.input.periodStart} to ${plan.input.periodEnd}
- Pay date: ${plan.input.payDate}
- Employee source mode: ${plan.input.employeeSourceMode}
- Max rows scanned: ${plan.input.maxRows}

## Readiness Summary

- Payroll module entitled: ${plan.readiness.checks.tenant.payrollModuleEntitled}
- Accounting dependency present: ${plan.readiness.checks.tenant.accountingDependencyPresent}
- Accounting setup status: ${plan.readiness.checks.accounting.settingsStatus ?? "missing"}
- Payroll account mappings ready count: ${plan.readiness.checks.accounting.payrollMappingCount}
- Payroll journal ready: ${plan.readiness.checks.accounting.payrollJournalReady}
- Payroll posting rules found: ${plan.readiness.checks.accounting.payrollPostingRuleCodes.join(", ") || "none"}
- Open accounting period for pay date: ${plan.readiness.checks.accounting.openAccountingPeriodId ? "yes" : "no"}
- Active users scanned: ${plan.readiness.checks.employeeUserMapping.activeUserCount}
- Planned payroll employee creates: ${plan.readiness.checks.employeeUserMapping.plannedEmployeeCreateCount}

## Planned Writes

| Target | Operation | Count | Idempotency key | Reason |
| --- | --- | ---: | --- | --- |
${plannedWrites}

## Historical Proof Backfill Dry Run

- Scan scope: ${plan.proofBackfill.scanScope}
- Evidence ref: ${plan.proofBackfill.evidenceRef}
- Status: ${plan.proofBackfill.status}
- Total blocking proof gaps: ${plan.proofBackfill.totalBlockingGaps}

| Gap | Count |
| --- | ---: |
${proofGaps}

### Required Signoffs

${signoffs}

### Rollback And Correction Strategy

${rollback}

### Post-Migration Reconciliation

${reconciliation}

## Blockers

${blockers}

## Warnings

${warnings}

## Redaction

- Raw person data included: ${plan.redaction.rawPersonDataIncluded}
- Raw salary included: ${plan.redaction.rawSalaryIncluded}
- Raw payment destination included: ${plan.redaction.rawPaymentDestinationIncluded}
`
}
