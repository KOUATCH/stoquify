import { createHash } from "node:crypto"

export function isUtcDayAlignedAccountingPeriod(start: Date, inclusiveEnd: Date): boolean {
  const exclusiveEnd = new Date(+inclusiveEnd + 1)
  return Number.isFinite(+start) && Number.isFinite(+inclusiveEnd) && Number.isFinite(+exclusiveEnd) && start <= inclusiveEnd &&
    [start, exclusiveEnd].every(date => date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0)
}

export function accountingPeriodReconciliationScope(organizationId: string, providerAccountId: string, accountingPeriodId: string, periodStart: Date, periodEnd: Date) {
  const payload = { version: 1 as const, kind: "ACCOUNTING_PERIOD" as const, organizationId, providerAccountId, accountingPeriodId,
    periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }
  return { ...payload, scopeHash: `sha256:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}` }
}
