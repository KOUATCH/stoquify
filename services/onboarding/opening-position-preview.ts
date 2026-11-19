import { hashStablePayload } from "./master-data-csv"
import type { OpeningSource, OpeningControls, OpeningMappings, OpeningCatalog, OpeningIssue, OpeningPreview } from "./opening-position.contract"

// Exact preview arithmetic follows the existing opening fixture's scaled-integer
// contract. It is not a posting or country-rounding certification.
function scaled(value: string, places = 2): bigint | null {
  if (!new RegExp(`^\\d{1,12}(?:\\.\\d{1,${places}})?$`).test(value)) return null
  const [whole, fraction = ""] = value.split(".")
  return BigInt(whole) * BigInt(10) ** BigInt(places) + BigInt(fraction.padEnd(places, "0"))
}
function decimal(value: bigint, places = 2) {
  const sign = value < BigInt(0) ? "-" : "", digits = (value < BigInt(0) ? -value : value).toString().padStart(places + 1, "0")
  return `${sign}${digits.slice(0, -places)}.${digits.slice(-places)}`
}
function dateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
}
export function previewOpeningPosition(source: OpeningSource, controls: OpeningControls, mappings: OpeningMappings,
  catalog: OpeningCatalog, sourceHash: string, controlsHash: string): OpeningPreview {
  const issues: OpeningIssue[] = [], details: OpeningPreview["details"] = []
  const issue = (code: string, row: string, field = "") => issues.push({ code, row, field })
  const resolved = new Map<string, string>(), masterEvidence: unknown[] = []
  for (const group of ["accounts", "customers", "suppliers", "items", "locations"] as const) {
    const keys = new Set<string>(), targets = new Set<string>()
    for (const m of mappings[group]) {
      if (keys.has(m.source) || targets.has(m.targetId)) issue("DUPLICATE_MAPPING", m.source, group)
      keys.add(m.source); targets.add(m.targetId)
      const target = catalog[group].find(row => row.id === m.targetId && row.active)
      masterEvidence.push({ group, source: m.source, target: target ?? null })
      if (!target) issue("UNAVAILABLE_MAPPING", m.source, group)
      else resolved.set(`${group}:${m.source}`, target.id)
    }
  }
  const mapped = (group: keyof OpeningMappings, key: string, row: string) => {
    const target = resolved.get(`${group}:${key}`)
    if (!target) issue("MISSING_MAPPING", row, `${group}:${key}`)
    return target ?? null
  }
  const ids = new Set<string>(), docs = new Set<string>(), positions = new Set<string>()
  const detailControls = new Map<string, { account: string; kind: string; amount: bigint | null }>()
  let stock = BigInt(0), ar = BigInt(0), ap = BigInt(0), debit = BigInt(0), credit = BigInt(0)
  const invalid = new Set<string>(), quantities = new Map<string, bigint>()
  const number = (value: string, row: string, field: string, places = 2) => {
    const n = scaled(value, places); if (n === null) issue("INVALID_PRECISION_OR_AMOUNT", row, field); return n
  }
  const unique = (id: string) => { if (ids.has(id)) issue("DUPLICATE_SOURCE_ID", id); ids.add(id) }
  for (const row of source.stock) {
    unique(row.sourceId)
    const accountId = mapped("accounts", row.account, row.sourceId)
    const itemId = mapped("items", row.item, row.sourceId), locationId = mapped("locations", row.location, row.sourceId)
    const item = catalog.items.find(item => item.id === itemId)
    if (item && item.unit !== row.unit) issue("UNIT_MISMATCH", row.sourceId, "unit")
    const key = `${itemId}:${locationId}`
    if (positions.has(key)) issue("DUPLICATE_STOCK_POSITION", row.sourceId); positions.add(key)
    const q = number(row.quantity, row.sourceId, "quantity", 3), cost = number(row.unitCost, row.sourceId, "unitCost"), v = number(row.value, row.sourceId, "value")
    if (q === BigInt(0)) issue("NONPOSITIVE_QUANTITY", row.sourceId, "quantity")
    if (q !== null && cost !== null && v !== null && (q * cost + BigInt(500)) / BigInt(1000) !== v) issue("STOCK_VALUE_DIFFERENCE", row.sourceId, "value")
    if (q !== null) quantities.set(row.unit, (quantities.get(row.unit) ?? BigInt(0)) + q); else invalid.add(`quantity:${row.unit}`)
    if (v !== null) stock += v; else invalid.add("stock")
    detailControls.set(row.sourceId, { account: row.account, kind: "STOCK", amount: v })
    details.push({ sourceId: row.sourceId, kind: "STOCK", accountId, amount: v === null ? null : decimal(v) })
  }
  for (const row of source.openItems) {
    unique(row.sourceId)
    const accountId = mapped("accounts", row.account, row.sourceId)
    const party = mapped(row.kind === "AR" ? "customers" : "suppliers", row.counterparty, row.sourceId)
    const docKey = `${row.kind}:${party}:${row.document}`
    if (docs.has(docKey)) issue("DUPLICATE_DOCUMENT", row.sourceId, "document"); docs.add(docKey)
    if (row.currency !== source.currency) issue("UNSUPPORTED_CURRENCY", row.sourceId, "currency")
    if (!dateOnly(row.sourceDate) || !dateOnly(row.dueDate) || row.sourceDate >= source.cutoverDate || row.dueDate < row.sourceDate) issue("INVALID_DOCUMENT_DATE", row.sourceId, "sourceDate/dueDate")
    const original = number(row.original, row.sourceId, "original"), settled = number(row.settled, row.sourceId, "settled"), amount = number(row.outstanding, row.sourceId, "outstanding")
    if (original !== null && settled !== null && amount !== null && (original - settled !== amount || amount <= BigInt(0))) issue("OPEN_ITEM_DIFFERENCE", row.sourceId, "outstanding")
    if (amount === null || row.currency !== "XAF") invalid.add(row.kind.toLowerCase())
    else if (row.kind === "AR") ar += amount; else ap += amount
    detailControls.set(row.sourceId, { account: row.account, kind: row.kind, amount })
    details.push({ sourceId: row.sourceId, kind: row.kind, accountId, amount: amount === null || row.currency !== "XAF" ? null : decimal(amount) })
  }
  const covered = new Set<string>(), ledgerAccounts = new Set<string>()
  for (const row of source.ledger) {
    unique(row.sourceId)
    const accountId = mapped("accounts", row.account, row.sourceId)
    if (ledgerAccounts.has(row.account)) issue("DUPLICATE_LEDGER_ACCOUNT", row.sourceId, "account"); ledgerAccounts.add(row.account)
    const account = catalog.accounts.find(item => item.id === accountId)
    const side = row.domain === "AP" || row.domain === "EQUITY" ? "CREDIT" : "DEBIT"
    const type = row.domain === "AP" ? "LIABILITY" : row.domain === "EQUITY" ? "EQUITY" : "ASSET"
    if (row.side !== side || (account && (account.type !== type || account.normalBalance !== side))) issue("ACCOUNT_DOMAIN_SIDE", row.sourceId, "account/side")
    if (row.currency !== "XAF" || (account?.currency && account.currency !== "XAF")) issue("UNSUPPORTED_CURRENCY", row.sourceId, "currency")
    const amount = number(row.amount, row.sourceId, "amount")
    if (amount === null || row.currency !== "XAF") invalid.add(row.side === "DEBIT" ? "debit" : "credit")
    else if (row.side === "DEBIT") debit += amount; else credit += amount
    let coveredAmount = BigInt(0)
    for (const id of row.covers) {
      if (covered.has(id)) issue("DOUBLE_COUNTED_DETAIL", row.sourceId, id); covered.add(id)
      const detail = detailControls.get(id)
      if (!detail || detail.kind !== row.domain || detail.account !== row.account || detail.amount === null) issue("INVALID_DETAIL_COVERAGE", row.sourceId, id)
      else coveredAmount += detail.amount
    }
    if (["AR", "AP", "STOCK"].includes(row.domain) ? coveredAmount !== amount : row.covers.length > 0) issue("CONTROL_ACCOUNT_DIFFERENCE", row.sourceId, "covers")
    details.push({ sourceId: row.sourceId, kind: "LEDGER_" + row.domain, accountId, amount: amount === null || row.currency !== "XAF" || (account?.currency && account.currency !== "XAF") ? null : decimal(amount) })
  }
  for (const id of detailControls.keys()) if (!covered.has(id)) issue("UNCOVERED_DETAIL", id, "covers")
  if (debit !== credit || invalid.has("debit") || invalid.has("credit")) issue("LEDGER_IMBALANCE", "ledger")
  const comparisons: OpeningPreview["comparisons"] = []
  const compare = (key: string, proposed: bigint | null, control: bigint | null, places = 2) => {
    if (control === null) issue("INVALID_CONTROL", "controls", key)
    if (proposed !== null && control !== null && proposed !== control) issue("INDEPENDENT_CONTROL_DIFFERENCE", "controls", key)
    comparisons.push({ key, proposed: proposed === null ? null : decimal(proposed, places), control: control === null ? null : decimal(control, places),
      difference: proposed === null || control === null ? null : decimal(proposed - control, places) })
  }
  for (const [key, total] of Object.entries({ stock, ar, ap, debit, credit })) {
    compare(key, invalid.has(key) ? null : total, scaled(controls[key as "stock" | "ar" | "ap" | "debit" | "credit"]))
  }
  const units = new Set(controls.quantities.map(row => row.unit))
  if (units.size !== controls.quantities.length) issue("DUPLICATE_QUANTITY_CONTROL", "controls", "quantities")
  for (const unit of new Set([...units, ...quantities.keys()])) {
    const control = controls.quantities.find(row => row.unit === unit)
    compare(`quantity:${unit}`, invalid.has(`quantity:${unit}`) ? null : quantities.get(unit) ?? BigInt(0), control ? scaled(control.quantity, 3) : null, 3)
  }
  const mappingHash = hashStablePayload(mappings), masterHash = hashStablePayload(masterEvidence)
  const digest = hashStablePayload({ version: "opening-preview-v1", sourceHash, controlsHash, mappingHash, masterHash, issues, comparisons, details })
  return { version: "opening-preview-v1", sourceHash, controlsHash, mappingHash, masterHash, digest, currency: "XAF", country: "CM",
    cutoverAt: "2026-09-30T23:00:00.000Z", canReview: issues.length === 0, canApply: false, issues, comparisons, details,
    // This calculation remains evidence only. Financial authority and live
    // domain preconditions are evaluated separately by the AF10 command.
    writerBlockers: ["CLIENT_FINANCIAL_APPROVAL_REQUIRED", "OPEN_PERIOD_VERSION_REQUIRED", "EMPTY_FINANCIAL_CLIENT_REQUIRED", "CONTROLLED_CUTOVER_REQUIRED"] }
}
