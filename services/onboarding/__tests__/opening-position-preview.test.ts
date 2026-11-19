import sourceData from "./fixtures/af09-source.json"
import controlsData from "./fixtures/af09-controls.json"
import { openingSourceSchema, openingControlsSchema, openingMappingsSchema, openingStageSchema, type OpeningCatalog, type OpeningMappings } from "../opening-position.contract"
import { previewOpeningPosition } from "../opening-position-preview"
import { hashCsvContent } from "../master-data-csv"

export const catalog: OpeningCatalog = {
  accounts: ["STOCK", "AR", "AP", "CASH", "EQUITY"].map(code => ({ id: code, code, name: code, active: true, currency: "XAF",
    type: code === "AP" ? "LIABILITY" : code === "EQUITY" ? "EQUITY" : "ASSET", normalBalance: ["AP", "EQUITY"].includes(code) ? "CREDIT" : "DEBIT" })),
  customers: [{ id: "customer", name: "Synthetic customer", active: true }], suppliers: [{ id: "supplier", name: "Synthetic supplier", active: true }],
  items: [{ id: "item", name: "Synthetic flour", active: true, unit: "kg" }], locations: [{ id: "location", name: "Synthetic warehouse", active: true }],
}
export const mappings: OpeningMappings = {
  accounts: catalog.accounts.map(row => ({ source: row.code, targetId: row.id })),
  customers: [{ source: "CUSTOMER-1", targetId: "customer" }], suppliers: [{ source: "SUPPLIER-1", targetId: "supplier" }],
  items: [{ source: "FLOUR", targetId: "item" }], locations: [{ source: "MAIN", targetId: "location" }],
}
const run = (source = sourceData, controls = controlsData, map = mappings, records = catalog) =>
  previewOpeningPosition(openingSourceSchema.parse(source), openingControlsSchema.parse(controls), map, records,
    hashCsvContent(JSON.stringify(source)), hashCsvContent(JSON.stringify(controls)))

it("reconciles independently supplied literal controls and preserves exact provenance without enabling apply", () => {
  const preview = run()
  expect(preview.issues).toEqual([])
  expect(preview.comparisons.map(row => row.proposed)).toEqual(["25.00", "100.00", "50.00", "150.00", "150.00", "2.500"])
  expect(preview.comparisons.every(row => ["0.00", "0.000"].includes(row.difference!))).toBe(true)
  expect(preview).toMatchObject({ canReview: true, canApply: false, cutoverAt: "2026-09-30T23:00:00.000Z" })
  expect(preview.writerBlockers).toHaveLength(4)
})
it.each([
  ["stock arithmetic", (s: typeof sourceData) => { s.stock[0].value = "24.99" }, "STOCK_VALUE_DIFFERENCE"],
  ["quantity precision", (s: typeof sourceData) => { s.stock[0].quantity = "2.5001" }, "INVALID_PRECISION_OR_AMOUNT"],
  ["negative quantity", (s: typeof sourceData) => { s.stock[0].quantity = "-1" }, "INVALID_PRECISION_OR_AMOUNT"],
  ["zero quantity", (s: typeof sourceData) => { s.stock[0].quantity = "0" }, "NONPOSITIVE_QUANTITY"],
  ["foreign currency", (s: typeof sourceData) => { s.openItems[0].currency = "EUR" }, "UNSUPPORTED_CURRENCY"],
  ["ambiguous date", (s: typeof sourceData) => { s.openItems[0].sourceDate = "01/09/2026" }, "INVALID_DOCUMENT_DATE"],
  ["invalid calendar date", (s: typeof sourceData) => { s.openItems[0].sourceDate = "2026-02-30" }, "INVALID_DOCUMENT_DATE"],
  ["cutover-day source", (s: typeof sourceData) => { s.openItems[0].sourceDate = "2026-10-01" }, "INVALID_DOCUMENT_DATE"],
  ["open amount", (s: typeof sourceData) => { s.openItems[0].settled = "10.00" }, "OPEN_ITEM_DIFFERENCE"],
  ["duplicate source", (s: typeof sourceData) => { s.ledger[0].sourceId = "stock-1" }, "DUPLICATE_SOURCE_ID"],
  ["double coverage", (s: typeof sourceData) => { s.ledger[0].covers.push("stock-1") }, "DOUBLE_COUNTED_DETAIL"],
  ["missing coverage", (s: typeof sourceData) => { s.ledger[0].covers = [] }, "UNCOVERED_DETAIL"],
  ["wrong domain coverage", (s: typeof sourceData) => { s.ledger[0].covers = ["ar-1"] }, "INVALID_DETAIL_COVERAGE"],
  ["wrong side", (s: typeof sourceData) => { s.ledger[2].side = "DEBIT" }, "ACCOUNT_DOMAIN_SIDE"],
  ["ledger imbalance", (s: typeof sourceData) => { s.ledger[4].amount = "99.00" }, "LEDGER_IMBALANCE"],
  ["duplicate stock", (s: typeof sourceData) => { s.stock.push({ ...s.stock[0], sourceId: "stock-2" }) }, "DUPLICATE_STOCK_POSITION"],
  ["duplicate document", (s: typeof sourceData) => { s.openItems.push({ ...s.openItems[0], sourceId: "ar-2" }) }, "DUPLICATE_DOCUMENT"],
])("blocks %s with explainable evidence", (_name, mutate, code) => {
  const source = structuredClone(sourceData); mutate(source)
  const preview = run(source)
  expect(preview.canReview).toBe(false); expect(preview.issues.some(row => row.code === code)).toBe(true)
})
it("shows an independent difference rather than recomputing the supplied control from detail", () => {
  const preview = run(sourceData, { ...controlsData, ar: "99.00" })
  expect(preview.comparisons.find(row => row.key === "ar")).toMatchObject({ proposed: "100.00", control: "99.00", difference: "1.00" })
  expect(preview.canReview).toBe(false)
})
it("uses unavailable rather than zero for malformed and foreign-currency amounts", () => {
  const source = structuredClone(sourceData); source.openItems[0].currency = "EUR"; source.ledger[0].amount = "NaN"
  const preview = run(source)
  expect(preview.comparisons.find(row => row.key === "ar")?.proposed).toBeNull()
  expect(preview.comparisons.find(row => row.key === "debit")?.proposed).toBeNull()
  expect(preview.details.find(row => row.sourceId === source.openItems[0].sourceId)?.amount).toBeNull()
})
it("binds mapping versions and current master identity while refusing missing/duplicate/foreign mappings", () => {
  const changed = structuredClone(catalog); changed.accounts[0].name = "Renamed"
  expect(run(sourceData, controlsData, mappings, changed).digest).not.toBe(run().digest)
  const missing = structuredClone(mappings); missing.accounts[0].targetId = "foreign"
  expect(run(sourceData, controlsData, missing).issues.some(row => row.code === "MISSING_MAPPING")).toBe(true)
  const duplicate = structuredClone(mappings); duplicate.accounts.push(duplicate.accounts[0])
  expect(run(sourceData, controlsData, duplicate).issues.some(row => row.code === "DUPLICATE_MAPPING")).toBe(true)
})
it("rejects undocumented fields, unsupported pilot headers and oversized source rows", () => {
  expect(openingSourceSchema.safeParse({ ...sourceData, country: "FR" }).success).toBe(false)
  expect(openingSourceSchema.safeParse({ ...sourceData, apply: true }).success).toBe(false)
  expect(openingSourceSchema.safeParse({ ...sourceData, stock: Array(100).fill(sourceData.stock[0]) }).success).toBe(false)
  expect(openingMappingsSchema.safeParse({ ...mappings, organizationId: "foreign" }).success).toBe(false)
  expect(openingStageSchema.safeParse({ actorId: "forged" }).success).toBe(false)
})
