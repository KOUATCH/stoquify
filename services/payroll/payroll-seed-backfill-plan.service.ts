import { createHash } from "crypto"
import { Prisma } from "@prisma/client"

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
  const parsed = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError("Payroll seed/backfill dry-run received an invalid date.")
  }
  return parsed
}

function stableKey(kind: string, parts: Array<string | number | null | undefined>) {
  return `${kind}:${createHash("sha256")
    .update(parts.map((part) => part ?? "").join("|"))
    .digest("hex")
    .slice(0, 16)}`
}

function assertDryRunOnly(input: PayrollSeedBackfillDryRunInput) {
  if (input.dryRun === false) {
    throw new BusinessRuleError("Payroll seed/backfill mutation mode is intentionally unavailable in this rollout slice.")
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
  const existingPeriod =
    readiness.checks.tenant.organizationExists
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
    operation: readiness.input.employeeSourceMode === "users" ? "upsert" : "blocked",
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
    idempotencyKey: stableKey("payroll-contract", [readiness.organizationRef, readiness.input.periodStart]),
    reason: "Contracts require approved salary and signed document-hash evidence; this dry-run does not fabricate them.",
  })

  plannedWrites.push({
    target: "PayrollPaymentDestination",
    operation: "blocked",
    count: 0,
    idempotencyKey: stableKey("payroll-payment-destination", [readiness.organizationRef]),
    reason: "Payment destinations require approved hashes/evidence only; raw destination details are never planned here.",
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
    reason: "Attendance snapshots require source hashes and a freeze plan before payroll calculation.",
  })

  return {
    dryRunOnly: true,
    mutationModeAvailable: false,
    status: readiness.status,
    generatedAt: new Date().toISOString(),
    organizationRef: readiness.organizationRef,
    actorRef: redactPayrollSetupRef(input.actorId),
    input: readiness.input,
    readiness,
    plannedWrites,
    blockers: readiness.blockers,
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

export function formatPayrollSeedBackfillDryRunReport(plan: PayrollSeedBackfillDryRunPlan) {
  const plannedWrites = plan.plannedWrites
    .map(
      (item) =>
        `| ${item.target} | ${item.operation} | ${item.count} | ${item.idempotencyKey} | ${item.reason} |`,
    )
    .join("\n")
  const blockers = plan.blockers.length ? plan.blockers.map(formatIssue).join("\n") : "- None."
  const warnings = plan.warnings.length ? plan.warnings.map(formatIssue).join("\n") : "- None."

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
