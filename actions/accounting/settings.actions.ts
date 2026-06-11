"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  ensureAccountingSettings,
  markAccountingSetupReady,
  updateAccountingSettings,
} from "@/services/accounting/accounting-settings.service"
import {
  closeAccountingPeriod,
  createFiscalYearWithPeriods,
  listAccountingPeriods,
  listFiscalYears,
} from "@/services/accounting/periods.service"
import { ensureDefaultJournals, listJournals } from "@/services/accounting/journals.service"

const settingsUpdateSchema = z.object({
  countryPack: z.string().trim().nullable().optional(),
  baseCurrency: z.string().trim().min(3).max(3).optional(),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12).optional(),
  fiscalYearStartDay: z.coerce.number().int().min(1).max(31).optional(),
  inventoryValuationPolicy: z.string().trim().optional(),
  roundingMode: z.string().trim().optional(),
  roundingScale: z.coerce.number().int().min(0).max(6).optional(),
  taxRegime: z.string().trim().nullable().optional(),
})

const fiscalYearCreateSchema = z.object({
  name: z.string().trim().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  createMonthlyPeriods: z.boolean().optional(),
})

const closePeriodSchema = z.object({
  periodId: z.string().min(1),
})

function revalidateAccountingPaths() {
  revalidatePath("/dashboard/accounting", "page")
  revalidatePath("/dashboard/accounting/setup", "page")
  revalidatePath("/dashboard/accounting/accounts", "page")
  revalidatePath("/dashboard/accounting/journals", "page")
  revalidatePath("/dashboard/accounting/reports/trial-balance", "page")
}

const getSetupData = protect<unknown, unknown>(
  { permission: "accounting.setup.manage", auditResource: "AccountingSetup" },
  async (_input, ctx) => {
    const [settings, fiscalYears, periods, journals] = await Promise.all([
      ensureAccountingSettings(ctx.orgId, ctx.userId),
      listFiscalYears(ctx.orgId),
      listAccountingPeriods(ctx.orgId),
      listJournals(ctx.orgId, true),
    ])

    return { settings, fiscalYears, periods, journals }
  },
)

export async function getAccountingSetupDataAction(input: unknown = {}) {
  return getSetupData(input)
}

const updateSettings = protect<unknown, unknown>(
  { permission: "accounting.setup.manage", auditResource: "AccountingSetup", freshAuth: true },
  async (input, ctx) => {
    const parsed = settingsUpdateSchema.parse(input)
    const settings = await updateAccountingSettings(ctx.orgId, parsed, ctx.userId)
    revalidateAccountingPaths()
    return settings
  },
)

export async function updateAccountingSettingsAction(input: unknown) {
  return updateSettings(input)
}

const ensureJournals = protect<unknown, unknown>(
  { permission: "accounting.setup.manage", auditResource: "AccountingSetup", freshAuth: true },
  async (_input, ctx) => {
    const journals = await ensureDefaultJournals(ctx.orgId, ctx.userId)
    revalidateAccountingPaths()
    return journals
  },
)

export async function ensureDefaultJournalsAction(input: unknown = {}) {
  return ensureJournals(input)
}

const createFiscalYear = protect<unknown, unknown>(
  { permission: "accounting.setup.manage", auditResource: "AccountingPeriod", freshAuth: true },
  async (input, ctx) => {
    const parsed = fiscalYearCreateSchema.parse(input)
    const fiscalYear = await createFiscalYearWithPeriods(
      ctx.orgId,
      {
        name: parsed.name,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        createMonthlyPeriods: parsed.createMonthlyPeriods,
      },
      ctx.userId,
    )
    revalidateAccountingPaths()
    return fiscalYear
  },
)

export async function createFiscalYearAction(input: unknown) {
  return createFiscalYear(input)
}

const closePeriod = protect<unknown, unknown>(
  { permission: "accounting.period.close", auditResource: "AccountingPeriod", freshAuth: true },
  async (input, ctx) => {
    const parsed = closePeriodSchema.parse(input)
    const period = await closeAccountingPeriod(ctx.orgId, parsed.periodId, ctx.userId, {
      actorPermissions: ctx.permissions,
      lastAuthAt: Date.now(),
    })
    revalidateAccountingPaths()
    return period
  },
)

export async function closeAccountingPeriodAction(input: unknown) {
  return closePeriod(input)
}

const markSetupReady = protect<unknown, unknown>(
  { permission: "accounting.setup.manage", auditResource: "AccountingSetup", freshAuth: true },
  async (_input, ctx) => {
    const settings = await markAccountingSetupReady(ctx.orgId, ctx.userId, {
      actorPermissions: ctx.permissions,
      lastAuthAt: Date.now(),
    })
    revalidateAccountingPaths()
    return settings
  },
)

export async function markAccountingSetupReadyAction(input: unknown = {}) {
  return markSetupReady(input)
}
