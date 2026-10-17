jest.mock("@/prisma/db", () => ({ db: {
  payment: { aggregate: jest.fn() }, payrollEmployeeBalanceCase: { groupBy: jest.fn() }, purchaseOrder: { groupBy: jest.fn() },
} }))
jest.mock("@/services/modules/module-access-batch.service", () => ({ observeModuleReadAccessBatch: jest.fn() }))
jest.mock("@/services/payroll/payroll-finance-forecast.service", () => ({
  getPayrollFinanceForecast: jest.fn(), payrollForecastBlockers: jest.fn(() => []),
}))
jest.mock("@/services/snapshots/payment-truth-snapshot.service", () => ({ getPaymentTruthSnapshot: jest.fn() }))
jest.mock("@/services/snapshots/inventory-cash-snapshot.service", () => ({ getInventoryCashSnapshot: jest.fn() }))
jest.mock("@/services/snapshots/close-readiness-snapshot.service", () => ({ getCloseReadinessSnapshot: jest.fn() }))

import { db } from "@/prisma/db"
import { observeModuleReadAccessBatch } from "@/services/modules/module-access-batch.service"
import { getPayrollFinanceForecast, payrollForecastBlockers } from "@/services/payroll/payroll-finance-forecast.service"
import type { PayrollFinanceForecastMetrics } from "@/services/snapshots/snapshot-contracts"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getCashCommandSources } from "../cash-command-sources.service"

const now = new Date("2026-09-28T12:00:00Z")
const input = { organizationId: "owned-org", actorId: "actor", currency: "XAF", now, actorPermissions: [] as string[] }
const matrix = [
  ["finance.read", "finance", db.payment.aggregate],
  ["payments.reconciliation.read", "payment_reconciliation", getPaymentTruthSnapshot],
  ["inventory.read", "inventory", getInventoryCashSnapshot],
  ["accounting.close.read", "close_assurance", getCloseReadinessSnapshot],
  ["payroll.payments.reconcile", "payroll", db.payrollEmployeeBalanceCase.groupBy],
  ["payroll.declarations.manage", "payroll", getPayrollFinanceForecast],
  ["purchases.orders.read", "purchasing", db.purchaseOrder.groupBy],
] as const
const reads = [...new Set(matrix.map(row => row[2]))] as jest.Mock[]
const gate = observeModuleReadAccessBatch as jest.Mock
const decisions = (allowed: boolean) => ({ moduleSlugs }: { moduleSlugs: readonly string[] }) => new Map(moduleSlugs.map(slug => [slug, { allowed }]))
const forecast = getPayrollFinanceForecast as jest.Mock

beforeEach(() => {
  jest.resetAllMocks()
  gate.mockImplementation(decisions(true))
  ;(db.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 }, _max: { updatedAt: null }, _count: { _all: 0 } })
  ;(db.payrollEmployeeBalanceCase.groupBy as jest.Mock).mockResolvedValue([])
  ;(db.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([])
  forecast.mockResolvedValue(null)
  ;(payrollForecastBlockers as jest.Mock).mockImplementation(jest.requireActual("@/services/payroll/payroll-finance-forecast.service").payrollForecastBlockers)
})

it("never queries a domain or module without its source permission; absence is null", async () => {
  const result = await getCashCommandSources(input)
  expect(gate).not.toHaveBeenCalled()
  for (const read of reads) expect(read).not.toHaveBeenCalled()
  expect(result.operating.metrics).toEqual({ cashCollected: null, activeEmployeeBalanceCaseCount: null, employeeBalanceOutstandingAmount: null, payrollFinanceForecast: null })
  expect(result.paymentTruth).toBeNull()
  expect(result.inventoryCash).toBeNull()
  expect(result.closeReadiness).toBeNull()
  expect(result.signals).toEqual([])
  expect(result.restrictions.every(item => item.reason === "permission_denied")).toBe(true)
})

it.each(matrix)("admits %s before its source query, including retained reads", async (permission, moduleSlug, query) => {
  await getCashCommandSources({ ...input, actorPermissions: [permission] })
  expect(gate).toHaveBeenCalledTimes(1)
  expect(gate).toHaveBeenCalledWith(expect.objectContaining({ organizationId: input.organizationId, userId: input.actorId, moduleSlugs: [moduleSlug], audit: true }))
  expect(query).toHaveBeenCalledTimes(1)
  expect(gate.mock.invocationCallOrder[0]).toBeLessThan((query as jest.Mock).mock.invocationCallOrder[0])
  for (const other of reads.filter(read => read !== query && !(moduleSlug === "payroll" && read === forecast))) expect(other).not.toHaveBeenCalled()
})

it.each(matrix)("suppresses denied %s before any source reads", async (permission) => {
  gate.mockImplementation(decisions(false))
  const result = await getCashCommandSources({ ...input, actorPermissions: [permission] })
  for (const query of reads) expect(query).not.toHaveBeenCalled()
  expect(result.restrictions.some(item => item.reason === "module_unavailable")).toBe(true)
})

it.each(matrix)("propagates %s query failure and retries through fresh admission", async (permission, _slug, query) => {
  ;(query as jest.Mock).mockRejectedValueOnce(new Error("source unavailable"))
  await expect(getCashCommandSources({ ...input, actorPermissions: [permission] })).rejects.toThrow("source unavailable")
  await getCashCommandSources({ ...input, actorPermissions: [permission] })
  expect(query).toHaveBeenCalledTimes(2)
  expect(gate).toHaveBeenCalledTimes(2)
})

it("does not query any domain when entitlement evaluation fails", async () => {
  gate.mockRejectedValueOnce(new Error("entitlement unavailable"))
  await expect(getCashCommandSources({ ...input, actorPermissions: ["finance.read"] })).rejects.toThrow("entitlement unavailable")
  for (const read of reads) expect(read).not.toHaveBeenCalled()
})

it("batches only permitted modules and keeps each source's permission and decision separate", async () => {
  gate.mockImplementation(() => new Map([["finance", { allowed: true }], ["inventory", { allowed: false }], ["payroll", { allowed: true }]]))
  const result = await getCashCommandSources({ ...input, actorPermissions: ["finance.read", "inventory.read", "payroll.declarations.manage"] })
  expect(gate).toHaveBeenCalledTimes(1)
  expect(gate).toHaveBeenCalledWith(expect.objectContaining({ moduleSlugs: ["finance", "inventory", "payroll"] }))
  expect(result.cashCollected).not.toBeNull()
  expect(getInventoryCashSnapshot).not.toHaveBeenCalled()
  expect(db.payrollEmployeeBalanceCase.groupBy).not.toHaveBeenCalled()
  expect(forecast).toHaveBeenCalledTimes(1)
})

it("keeps a successful empty cash query distinct from denied data and scopes it to tenant and period", async () => {
  const result = await getCashCommandSources({ ...input, actorPermissions: ["finance.read"] })
  expect(result.cashCollected).toMatchObject({ kind: "cash.collected", status: "empty", metrics: { cashCollected: 0 }, sourceModules: ["finance"] })
  expect(db.payment.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: input.organizationId, deletedAt: null, createdAt: { gte: expect.any(Date), lte: expect.any(Date) } }) }))
})

it("passes unavailable provider evidence as null without secretly querying reconciliation", async () => {
  await getCashCommandSources({ ...input, actorPermissions: ["payroll.payments.reconcile", "payroll.declarations.manage"] })
  expect(gate).toHaveBeenCalledTimes(1)
  expect(getPaymentTruthSnapshot).not.toHaveBeenCalled()
  expect(forecast).toHaveBeenCalledWith(expect.objectContaining({ paymentTruth: null, currency: "XAF", scope: expect.objectContaining({ organizationId: input.organizationId }) }))
})

it("withholds mixed-currency recovery totals and preserves per-currency evidence", async () => {
  ;(db.payrollEmployeeBalanceCase.groupBy as jest.Mock).mockResolvedValue([
    { currency: "EUR", _sum: { outstandingAmount: 100 }, _count: { _all: 1 }, _max: { updatedAt: now } },
    { currency: "XAF", _sum: { outstandingAmount: 200 }, _count: { _all: 1 }, _max: { updatedAt: now } },
  ])
  const result = await getCashCommandSources({ ...input, actorPermissions: ["payroll.payments.reconcile"] })
  expect(result.payrollBalance).toMatchObject({ status: "blocked", metrics: { activeEmployeeBalanceCaseCount: 2, employeeBalanceOutstandingAmount: null } })
  expect(result.payrollBalance?.blockers[0].detail).toContain("100.00 EUR; 200.00 XAF")
  expect(db.payrollEmployeeBalanceCase.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: input.organizationId }) }))
})

it("reevaluates admission on the next request after a grant is revoked", async () => {
  const request = { ...input, actorPermissions: ["finance.read"] }
  expect((await getCashCommandSources(request)).cashCollected).not.toBeNull()
  gate.mockImplementation(decisions(false))
  expect((await getCashCommandSources(request)).cashCollected).toBeNull()
  expect(db.payment.aggregate).toHaveBeenCalledTimes(1)
})

it.each([
  { reasonCode: "PAYROLL_FORECAST_NO_UPCOMING_PERIODS", authoritative: true, blockerCodes: [], grade: "operational", status: "empty" },
  { reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED", authoritative: true, blockerCodes: [], grade: "posted", status: "fresh" },
  { reasonCode: "UNRECOGNIZED_FORECAST_BASIS", authoritative: true, blockerCodes: [], grade: "operational", status: "fresh" },
  { reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED", authoritative: false, blockerCodes: [], grade: "blocked", status: "blocked" },
  { reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED", authoritative: true, blockerCodes: ["PAYROLL_FORECAST_LEDGER_PROOF_MISSING"], grade: "blocked", status: "blocked" },
  { reasonCode: "PAYROLL_FORECAST_NO_UPCOMING_PERIODS", authoritative: false, blockerCodes: ["PAYROLL_FORECAST_POSTED_RUN_MISSING"], grade: "blocked", status: "blocked" },
])("keeps source evidence honest for $reasonCode / $status", async ({ reasonCode, authoritative, blockerCodes, grade, status }) => {
  const empty = reasonCode === "PAYROLL_FORECAST_NO_UPCOMING_PERIODS"
  const metrics: PayrollFinanceForecastMetrics = {
    status: authoritative ? "AUTHORITATIVE" : "NON_AUTHORITATIVE", authoritative, reasonCode, blockerCodes,
    message: "Synthetic source classification fixture", horizonStart: now.toISOString(), horizonEnd: now.toISOString(),
    upcomingNetPayAmount: empty ? 0 : 100, upcomingStatutoryLiabilityAmount: empty ? 0 : 20, totalUpcomingAmount: empty ? 0 : 120,
    payrollPeriodCount: empty ? 0 : 1, payrollRunCount: empty ? 0 : 1, paymentBatchCount: empty ? 0 : 1, declarationCount: empty ? 0 : 1,
    sourceLinkCount: empty ? 0 : 2, evidenceHashCount: empty ? 0 : 4, certifiedInputRunCount: empty ? 0 : 1,
    certifiedInputProofHashCount: empty ? 0 : 1, registerToLedgerRunCount: empty ? 0 : 1,
    nextPayDate: empty ? null : now.toISOString(), nextDeclarationDueDate: empty ? null : now.toISOString(), personLevelAmountsRedacted: true,
  }
  forecast.mockResolvedValue({ metrics, sourceMaxUpdatedAt: now, sourceEvidenceHash: "synthetic-evidence" })
  const result = await getCashCommandSources({ ...input, actorPermissions: ["payroll.payments.reconcile", "payroll.declarations.manage"] })
  expect(result.payrollForecast).toMatchObject({ evidenceGrade: grade, status, uiState: status, metrics })
  expect(result.payrollForecast?.metrics).toBe(metrics)
  expect(result.signals.filter(signal => signal.subjectType === "payroll.forecast")).toHaveLength(blockerCodes.length ? 1 : 0)
})
