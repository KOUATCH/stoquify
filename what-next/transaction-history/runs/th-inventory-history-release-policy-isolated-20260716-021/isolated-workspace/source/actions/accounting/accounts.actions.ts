"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  archiveChartAccount,
  createChartAccount,
  listChartAccounts,
  updateChartAccount,
} from "@/services/accounting/accounts.service"

const chartAccountTypes = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
  "CONTRA_ASSET",
  "CONTRA_REVENUE",
  "MEMO",
] as const

const normalBalances = ["DEBIT", "CREDIT"] as const

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().nullable().optional(),
)

const listAccountsSchema = z.object({
  includeInactive: z.boolean().optional(),
}).optional()

const accountCreateSchema = z.object({
  code: z.string().trim().min(1),
  nameEn: z.string().trim().min(1),
  nameFr: optionalText,
  descriptionEn: optionalText,
  descriptionFr: optionalText,
  type: z.enum(chartAccountTypes),
  normalBalance: z.enum(normalBalances),
  parentId: optionalText,
  isControlAccount: z.boolean().optional(),
  allowManualPost: z.boolean().optional(),
  mappingKey: optionalText,
  syscohadaClass: optionalText,
  syscohadaReference: optionalText,
  currency: optionalText,
})

const accountUpdateSchema = accountCreateSchema.partial().extend({
  accountId: z.string().min(1),
  isActive: z.boolean().optional(),
})

const accountIdSchema = z.object({
  accountId: z.string().min(1),
})

function revalidateAccountingPaths() {
  revalidatePath("/dashboard/accounting", "page")
  revalidatePath("/dashboard/accounting/accounts", "page")
  revalidatePath("/dashboard/accounting/journals/new", "page")
  revalidatePath("/dashboard/accounting/reports/trial-balance", "page")
}

const listAccounts = protect<unknown, unknown>(
  { permission: "accounting.accounts.read", auditResource: "ChartOfAccount" },
  async (input, ctx) => {
    const parsed = listAccountsSchema.parse(input)
    return listChartAccounts(ctx.orgId, parsed?.includeInactive ?? false)
  },
)

export async function listChartAccountsAction(input: unknown = {}) {
  return listAccounts(input)
}

const createAccount = protect<unknown, unknown>(
  { permission: "accounting.accounts.manage", auditResource: "ChartOfAccount", freshAuth: true },
  async (input, ctx) => {
    const parsed = accountCreateSchema.parse(input)
    const account = await createChartAccount(ctx.orgId, parsed, ctx.userId)
    revalidateAccountingPaths()
    return account
  },
)

export async function createChartAccountAction(input: unknown) {
  return createAccount(input)
}

const updateAccount = protect<unknown, unknown>(
  { permission: "accounting.accounts.manage", auditResource: "ChartOfAccount", freshAuth: true },
  async (input, ctx) => {
    const parsed = accountUpdateSchema.parse(input)
    const { accountId, ...data } = parsed
    const account = await updateChartAccount(ctx.orgId, accountId, data, ctx.userId)
    revalidateAccountingPaths()
    return account
  },
)

export async function updateChartAccountAction(input: unknown) {
  return updateAccount(input)
}

const archiveAccount = protect<unknown, unknown>(
  { permission: "accounting.accounts.manage", auditResource: "ChartOfAccount", freshAuth: true },
  async (input, ctx) => {
    const parsed = accountIdSchema.parse(input)
    const account = await archiveChartAccount(ctx.orgId, parsed.accountId, ctx.userId)
    revalidateAccountingPaths()
    return account
  },
)

export async function archiveChartAccountAction(input: unknown) {
  return archiveAccount(input)
}
