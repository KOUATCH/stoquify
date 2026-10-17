import { Prisma } from "@prisma/client"
import { z } from "zod"
export { bankBalanceHash as balanceSheetHash } from "@/services/reconciliation/bank-balance-contract"

const id = z.string().trim().min(1).max(200)
const money = z.string().regex(/^-?(0|[1-9][0-9]{0,15})\.[0-9]{2}$/)
const positiveMoney = z.string().regex(/^(0|[1-9][0-9]{0,15})\.[0-9]{2}$/)
const reference = z.string().trim().min(1).max(1000)
const hash = z.string().regex(/^sha256:[a-f0-9]{64}$/)
export const BALANCE_SHEET_TYPES = ["ASSET", "CONTRA_ASSET", "LIABILITY", "EQUITY"] as const
export const balanceSheetInputSchema = z.object({
  ledgerAccountId: id, periodId: id, currency: z.string().regex(/^[A-Z]{3}$/), idempotencyKey: id,
  scheduleKind: z.enum(["RECEIVABLES", "PAYABLES", "INVENTORY", "FIXED_ASSETS", "TAX", "PAYROLL", "ACCRUALS", "PREPAYMENTS", "DEBT", "EQUITY", "CASH", "OTHER"]),
  basis: z.enum(["SUPPORTING_SCHEDULE", "ZERO_ACTIVITY"]),
  explanation: z.string().trim().min(10).max(2000), sourceReference: reference, sourceDocumentHash: hash,
  items: z.array(z.object({
    reference: id, description: z.string().trim().min(1).max(1000),
    openingBalance: money, additions: positiveMoney, reductions: positiveMoney, closingBalance: money,
    sourceReference: reference, sourceDocumentHash: hash,
  }).strict()).max(1000),
}).strict().superRefine((input, ctx) => {
  if (input.basis === "ZERO_ACTIVITY" ? input.items.length !== 0 : input.items.length === 0)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Use itemized support or explicit zero-activity evidence, never an empty supporting schedule." })
  if (new Set(input.items.map(item => item.reference)).size !== input.items.length)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Schedule item references must be unique." })
})
export const balanceSheetDecisionSchema = z.object({ evidenceId: id, expectedEvidenceHash: hash,
  decision: z.enum(["APPROVE", "REVOKE"]), reason: z.string().trim().min(10).max(2000).optional() }).strict()
export const balanceSheetReadSchema = z.object({ evidenceId: id }).strict()
export type BalanceSheetInput = z.infer<typeof balanceSheetInputSchema>
export type ScheduleBalances = { openingBalance: string; additions: string; reductions: string; closingBalance: string }

/** Values follow the account's normal balance: increases are debits for debit-
 * normal accounts and credits for credit-normal accounts. Compare gross flows. */
export function calculateBalanceSheet(input: BalanceSheetInput, ledger: ScheduleBalances) {
  const totals = { openingBalance: new Prisma.Decimal(0), additions: new Prisma.Decimal(0), reductions: new Prisma.Decimal(0), closingBalance: new Prisma.Decimal(0) }
  const invalidItems: string[] = []
  for (const item of input.items) {
    for (const key of Object.keys(totals) as Array<keyof ScheduleBalances>) totals[key] = totals[key].plus(item[key])
    if (!new Prisma.Decimal(item.openingBalance).plus(item.additions).minus(item.reductions).eq(item.closingBalance)) invalidItems.push(item.reference)
  }
  const schedule = Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value.toFixed(2)])) as ScheduleBalances
  const differences = Object.fromEntries((Object.keys(totals) as Array<keyof ScheduleBalances>).map(key => [key, totals[key].minus(ledger[key]).toFixed(2)])) as ScheduleBalances
  return { ledger, schedule, differences, invalidItems,
    balanced: invalidItems.length === 0 && (Object.keys(totals) as Array<keyof ScheduleBalances>).every(key => totals[key].eq(ledger[key])) }
}
