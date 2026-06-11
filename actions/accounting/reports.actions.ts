"use server"

import { createHash, randomUUID } from "node:crypto"
import { z } from "zod"

import { db } from "@/prisma/db"
import { protect } from "@/services/_shared/protect"
import {
  getAccountingDashboardSummary,
  getGeneralLedger,
  getTrialBalance,
} from "@/services/accounting/reports.service"
import {
  assertSensitiveActionAllowed,
  evaluateAndAuditSensitiveAction,
} from "@/services/controls/sensitive-action.service"

const trialBalanceSchema = z.object({
  periodId: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  includeZeroBalance: z.boolean().optional(),
}).optional()

const generalLedgerSchema = z.object({
  accountId: z.string().min(1),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
})

const exportAccountingReportSchema = z.object({
  reportType: z.enum(["TRIAL_BALANCE", "GENERAL_LEDGER"]),
  fileType: z.enum(["json", "csv"]).default("json"),
  periodId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  includeZeroBalance: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.reportType === "GENERAL_LEDGER" && !value.accountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["accountId"],
      message: "General ledger export requires an account",
    })
  }
})

function hashFilters(input: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(input)).digest("hex")}`
}

const getDashboardSummary = protect<unknown, unknown>(
  { permission: "accounting.reports.read", auditResource: "AccountingReport" },
  async (_input, ctx) => getAccountingDashboardSummary(ctx.orgId),
)

export async function getAccountingDashboardSummaryAction(input: unknown = {}) {
  return getDashboardSummary(input)
}

const getTrialBalanceProtected = protect<unknown, unknown>(
  { permission: "accounting.reports.read", auditResource: "TrialBalance" },
  async (input, ctx) => {
    const parsed = trialBalanceSchema.parse(input)
    return getTrialBalance({
      organizationId: ctx.orgId,
      periodId: parsed?.periodId,
      startDate: parsed?.startDate,
      endDate: parsed?.endDate,
      includeZeroBalance: parsed?.includeZeroBalance ?? true,
    })
  },
)

export async function getTrialBalanceAction(input: unknown = {}) {
  return getTrialBalanceProtected(input)
}

const getGeneralLedgerProtected = protect<unknown, unknown>(
  { permission: "accounting.reports.read", auditResource: "GeneralLedger" },
  async (input, ctx) => {
    const parsed = generalLedgerSchema.parse(input)
    return getGeneralLedger({
      organizationId: ctx.orgId,
      accountId: parsed.accountId,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    })
  },
)

export async function getGeneralLedgerAction(input: unknown) {
  return getGeneralLedgerProtected(input)
}

const exportAccountingReportProtected = protect<unknown, unknown>(
  {
    permission: "accounting.exports.create",
    auditResource: "AccountingExport",
    freshAuth: { maxAgeSeconds: 300 },
  },
  async (input, ctx) => {
    const parsed = exportAccountingReportSchema.parse(input)
    const normalizedFilters = {
      reportType: parsed.reportType,
      periodId: parsed.periodId || null,
      accountId: parsed.accountId || null,
      startDate: parsed.startDate?.toISOString() || null,
      endDate: parsed.endDate?.toISOString() || null,
      includeZeroBalance: parsed.includeZeroBalance ?? true,
    }

    const report =
      parsed.reportType === "TRIAL_BALANCE"
        ? await getTrialBalance({
            organizationId: ctx.orgId,
            periodId: parsed.periodId,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            includeZeroBalance: parsed.includeZeroBalance ?? true,
          })
        : await getGeneralLedger({
            organizationId: ctx.orgId,
            accountId: parsed.accountId!,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
          })

    const rowCount = Array.isArray(report) ? report.length : report.rows.length
    const exportId = randomUUID()
    const watermarkId = `acct-${ctx.orgId}-${exportId}`
    const filtersHash = hashFilters(normalizedFilters)

    const decision = await db.$transaction((tx) =>
      evaluateAndAuditSensitiveAction(tx, {
        action: "accounting.export",
        actorId: ctx.userId,
        organizationId: ctx.orgId,
        actorPermissions: ctx.permissions,
        lastAuthAt: Date.now(),
        resourceType: "AccountingExport",
        resourceId: exportId,
        exportContext: {
          scope: parsed.reportType,
          filtersHash,
          rowCount,
          fileType: parsed.fileType,
          sensitivity: "statutory",
          watermarkId,
        },
        metadata: normalizedFilters,
      }),
    )
    assertSensitiveActionAllowed(decision)

    return {
      exportId,
      reportType: parsed.reportType,
      fileType: parsed.fileType,
      rowCount,
      filtersHash,
      watermarkId,
      generatedAt: new Date().toISOString(),
      data: report,
    }
  },
)

export async function exportAccountingReportAction(input: unknown) {
  return exportAccountingReportProtected(input)
}
