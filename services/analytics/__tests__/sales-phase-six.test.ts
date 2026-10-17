/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { createHash } from "node:crypto"
import { db } from "@/prisma/db"
import { getSalesCashAttention } from "../sales-cash-attention.service"
import { buildSalesAttention } from "@/lib/analytics/sales-attention"
import { buildSalesPerformanceCsv, prepareSalesPerformanceExport } from "../sales-performance-export.service"
import { getSalesPerformance } from "../sales-performance.service"
jest.mock("../sales-performance.service", () => ({ getSalesPerformance: jest.fn() }))
const now = new Date("2026-10-11T12:00:00Z")
const scope = { organizationId: "org", locationId: "loc", preset: "custom" as const, start: "2026-10-01", end: "2026-10-02" }
const report = () => ({ currency: "XAF", timezone: "Africa/Douala", checkedAt: now.toISOString(), scope, locations: [{ id: "loc", name: " \t=SUM(1,2)\"\r\nNext" }],
  period: { start: "2026-09-30T23:00:00Z", endExclusive: "2026-10-02T23:00:00Z", partial: false }, current: { value: "9007199254740993.25", count: "2", average: "4503599627370496.63" },
  trend: [{ date: "2026-10-01", value: "9007199254740993.00", count: "1" }, { date: "2026-10-02", value: "0.25", count: "1" }], records: [], nextCursor: null } as any)
let tx: any
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(now)
  tx = { organization: { findFirst: jest.fn().mockResolvedValue({ id: "org", currency: "XAF", timezone: "Africa/Douala" }) }, location: { findMany: jest.fn().mockResolvedValue([{ id: "loc", name: "Store" }]) }, dailySalesReport: { findMany: jest.fn().mockResolvedValue([]) }, auditLog: { create: jest.fn().mockResolvedValue({}) } }
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(tx)); (getSalesPerformance as jest.Mock).mockResolvedValue(report())
})
afterEach(() => { jest.useRealTimers(); jest.clearAllMocks() })
it("uses saved calendar dates, tenant/location scope and exact nonzero variances, independent of order filters", async () => {
  tx.dailySalesReport.findMany.mockResolvedValue([0, -0.01].map((v, i) => ({ id: "cash" + i, date: new Date("2026-10-0" + (i + 1)), locationId: "loc", variance: new Prisma.Decimal(v), reportGeneratedAt: now, isFinalized: i === 0 })))
  const result = await getSalesCashAttention({ ...scope, status: "COMPLETED", channel: "POS", search: "ignored" })
  expect(result).toMatchObject({ coveredDays: 2, expectedDays: 2, findings: [{ id: "cash1", amount: "-0.01", finalized: false, location: "Store" }] })
  expect(tx.dailySalesReport.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", locationId: { in: ["loc"] }, date: { gte: new Date("2026-10-01"), lte: new Date("2026-10-02") } }, take: 1001 }))
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
})
it("keeps absent reports distinct from covered days and rejects foreign location before reading", async () => {
  expect(await getSalesCashAttention(scope)).toMatchObject({ coveredDays: 0, expectedDays: 2, findings: [] })
  tx.dailySalesReport.findMany.mockClear()
  await expect(getSalesCashAttention({ ...scope, locationId: "foreign" })).rejects.toThrow("location")
  expect(tx.dailySalesReport.findMany).not.toHaveBeenCalled()
})
it("rejects cash evidence beyond the bounded scope", async () => {
  tx.dailySalesReport.findMany.mockResolvedValue(Array(1001).fill({}))
  await expect(getSalesCashAttention(scope)).rejects.toThrow("bounded")
})
it("orders and deduplicates evidence without urgency scores, excludes prior-only and unknown-stock products", () => {
  const row = { id: "p", quantity: "1.000", available: "0.000", stockStatus: "out", active: true, name: "Product", unit: { symbol: "kg" } }
  const cash = { currency: "XAF", timezone: "UTC", findings: [{ id: "c", date: "2026-10-02", locationId: "loc", amount: "-1.00", recordedAt: now.toISOString() }] }
  const r = { currencies: [{ currency: "USD", overdue: "0.00" }, { currency: "XAF", overdue: "0.01" }], checkedAt: now.toISOString(), timezone: "UTC" }
  const p = { canReadStock: true, stockCheckedAt: now.toISOString(), timezone: "UTC", rows: [row, row, { ...row, id: "prior", quantity: "0.000" }, { ...row, id: "missing", available: null, stockStatus: "unknown" }, { ...row, id: "threshold", available: "2.000", stockStatus: "low" }] }
  const findings = buildSalesAttention({ organizationId: "org", receivables: r, products: p, cash } as any)
  expect(findings.map(row => row.id)).toEqual(["ar:XAF", "cash:c", "stock:p", "stock:threshold"])
  expect(findings[1].href).toContain("view=daily&date=2026-10-02&locationId=loc&reportOrg=org")
  expect(buildSalesAttention({ organizationId: "org", products: { ...p, canReadStock: false } } as any)).toEqual([])
})
it("exports exact reconciled totals, full trend, metadata and formula-safe quoted text", () => {
  const csv = buildSalesPerformanceCsv(report(), "wm_test", now.toISOString())
  expect(csv).toContain('"current","9007199254740993.25","2","4503599627370496.63"')
  expect(csv).toContain('"\' \t=SUM(1,2)""\r\nNext"')
  expect(csv).toContain('"record_search_and_pagination","excluded_from_summary_and_trend"')
  expect(csv).toContain('"timezone","Africa/Douala"'); expect(csv).toContain('"watermark_id","wm_test"')
  for (const bad of [{ value: "1.00" }, { count: "3" }, { average: "0.00" }]) expect(() => buildSalesPerformanceCsv({ ...report(), current: { ...report().current, ...bad } }, "wm", now.toISOString())).toThrow("reconcile")
})
it("returns the same report as the download and durably audits the controlled export", async () => {
  const result = await prepareSalesPerformanceExport({ scope, actorId: "actor", permissions: ["reports.export"], lastAuthAt: now.getTime(), canReadCustomers: false })
  expect(result.report).toEqual(report())
  expect(result.file.contentHash).toBe(createHash("sha256").update(result.file.content).digest("hex"))
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org", userId: "actor", action: "CONTROLLED_EXPORT_ALLOWED" }) }))
})
it.each(["permission", "freshness", "audit"])("withholds files when %s control fails", async failure => {
  if (failure === "audit") tx.auditLog.create.mockRejectedValue(new Error("audit unavailable"))
  await expect(prepareSalesPerformanceExport({ scope, actorId: "actor", permissions: failure === "permission" ? [] : ["reports.export"], lastAuthAt: now.getTime() - (failure === "freshness" ? 301000 : 0), canReadCustomers: false })).rejects.toThrow()
  if (failure !== "audit") expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "CONTROLLED_EXPORT_DENIED" }) }))
})
