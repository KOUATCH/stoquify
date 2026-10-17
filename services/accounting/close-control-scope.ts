import { createHash } from "node:crypto"
import { BusinessRuleError } from "@/services/_shared/action-errors"

/** Stored period endpoints are inclusive instants. Do not round them to local days. */
export type CloseControlScope = {
  version: 1
  organizationId: string
  periodId: string
  startDate: string
  endDate: string
  recordedThrough: string
  timezone: "UTC"
  boundary: "INCLUSIVE_STORED_INSTANTS"
  currencyScope: "ALL_CURRENCIES"
  scopeHash: string
}

export function createCloseControlScope(
  organizationId: string,
  period: { id: string; startDate: Date; endDate: Date },
  recordedThrough: Date,
  requested: { startDate?: Date | string | null; endDate?: Date | string | null } = {},
): CloseControlScope {
  const valid = (date: Date) => Number.isFinite(date.getTime())
  if (!organizationId?.trim() || !period.id || !valid(period.startDate) || !valid(period.endDate) ||
      !valid(recordedThrough) || period.startDate > period.endDate) {
    throw new BusinessRuleError("A valid tenant, period and observation cutoff are required for close.")
  }
  for (const key of ["startDate", "endDate"] as const) {
    if (requested[key] != null && new Date(requested[key]!).getTime() !== period[key].getTime()) {
      throw new BusinessRuleError("Requested dates conflict with the accounting period.")
    }
  }
  const scope = {
    version: 1 as const, organizationId, periodId: period.id,
    startDate: period.startDate.toISOString(), endDate: period.endDate.toISOString(),
    recordedThrough: recordedThrough.toISOString(), timezone: "UTC" as const,
    boundary: "INCLUSIVE_STORED_INSTANTS" as const,
    currencyScope: "ALL_CURRENCIES" as const,
  }
  return { ...scope, scopeHash: `sha256:${createHash("sha256").update(JSON.stringify(scope)).digest("hex")}` }
}

export const closeEconomicDates = (scope: CloseControlScope) => ({
  gte: new Date(scope.startDate), lte: new Date(scope.endDate),
})
export const closeRecordedDates = (scope: CloseControlScope) => ({ lte: new Date(scope.recordedThrough) })
