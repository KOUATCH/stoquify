"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  getAccountingDashboardSummary,
  getGeneralLedger,
  getTrialBalance,
} from "@/services/accounting/reports.service"

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

