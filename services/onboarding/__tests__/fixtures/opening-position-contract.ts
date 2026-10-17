// Test-only proposed cutover contract. No domain writes, importing or posting API.
export type StockRow = { sourceId: string; organizationId: string; locationId: string; itemId: string; unit: string; quantity: string; unitCost: string; sourceValue: string; ledgerEffect: string; reviewId: string }
type OpenItem = { sourceId: string; organizationId: string; counterpartyId: string; kind: "AR" | "AP"; sourceDocumentId: string; sourceDate: string; dueDate: string; originalAmount: string; settledBeforeCutover: string; outstandingAmount: string; currency: string; reviewId: string }
type LedgerRow = { sourceId: string; organizationId: string; account: string; side: "DEBIT" | "CREDIT"; amount: string; postingOwner: string; covers: string[]; reviewId: string }
export type OpeningFixture = {
  version: string; synthetic: boolean; statutory: boolean; organizationId: string; currency: string; timezone: string; cutoverAt: string; cutoverLocal: string; makerId: string
  review: { id: string; reviewerId: string; decision: string; scope: string }
  locations: Array<{ id: string; organizationId: string }>
  items: Array<{ id: string; organizationId: string; unit: string }>
  counterparties: Array<{ id: string; organizationId: string; kind: string }>
  stock: StockRow[]; openItems: OpenItem[]; ledger: LedgerRow[]
  rejectedStockRows: Array<{ expectedIssue: string; row: StockRow }>
}
export function scaled(value: string, places: number): bigint {
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(value)) throw new Error("PRECISION")
  const [whole, fraction = ""] = value.split(".")
  return BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, "0"))
}
export function stockIssues(fixture: OpeningFixture, row: StockRow) {
  const issues: string[] = []
  if (row.organizationId !== fixture.organizationId) issues.push("WRONG_TENANT")
  if (!fixture.locations.some(loc => loc.id === row.locationId && loc.organizationId === fixture.organizationId)) issues.push("WRONG_LOCATION")
  const item = fixture.items.find(item => item.id === row.itemId && item.organizationId === fixture.organizationId)
  if (!item) issues.push("UNKNOWN_ITEM")
  else if (item.unit !== row.unit) issues.push("WRONG_UNIT")
  if (row.ledgerEffect !== "REVIEW_ONLY") issues.push("DOUBLE_POSTING_RISK")
  if (row.reviewId !== fixture.review.id) issues.push("MISSING_REVIEW")
  try {
    const quantity = scaled(row.quantity, 3), cost = scaled(row.unitCost, 2), value = scaled(row.sourceValue, 2)
    if (quantity <= 0n) issues.push("INVALID_QUANTITY")
    // Positive half-up row valuation. This checks the proposal; it does not certify
    // production rounding. Independent literal controls are kept in another file.
    if ((quantity * cost + 500n) / 1000n !== value) issues.push("VALUE_DISCREPANCY")
  } catch { issues.push("PRECISION") }
  return issues
}

export function auditOpeningFixture(fixture: OpeningFixture) {
  const issues: string[] = []
  const sourceIds = new Set<string>()
  const all = [...fixture.stock, ...fixture.openItems, ...fixture.ledger]
  if (!fixture.synthetic || fixture.statutory || fixture.version !== "opening-fixture-v1") issues.push("NOT_FIXTURE_SCOPE")
  if (fixture.review.decision !== "FIXTURE_APPROVED" || fixture.review.scope !== "NON_STATUTORY_ARITHMETIC_ONLY" ||
      !fixture.review.reviewerId || fixture.review.reviewerId === fixture.makerId) issues.push("REVIEW_SEPARATION")
  if (!Number.isFinite(Date.parse(fixture.cutoverAt)) || Date.parse(fixture.cutoverAt) !== Date.parse(fixture.cutoverLocal)) issues.push("CUTOVER_MISMATCH")
  for (const collection of [fixture.locations, fixture.items, fixture.counterparties]) {
    if (collection.some(row => row.organizationId !== fixture.organizationId)) issues.push("WRONG_TENANT")
    if (new Set(collection.map(row => row.id)).size !== collection.length) issues.push("DUPLICATE_MASTER")
  }
  for (const row of all) {
    if (!row.sourceId || sourceIds.has(row.sourceId)) issues.push("DUPLICATE_SOURCE_ID")
    sourceIds.add(row.sourceId)
    if (row.organizationId !== fixture.organizationId) issues.push("WRONG_TENANT")
    if (row.reviewId !== fixture.review.id) issues.push("MISSING_REVIEW")
  }
  const stockKeys = new Set<string>(), documents = new Set<string>()
  const quantity: Record<string, bigint> = {}, byLocation: Record<string, bigint> = {}, byItem: Record<string, bigint> = {}
  const controls = new Map<string, { account: string; amount: bigint }>()
  let stock = 0n, ar = 0n, ap = 0n, debit = 0n, credit = 0n
  const accountBalances: Record<string, bigint> = {}
  for (const row of fixture.stock) {
    const rowIssues = stockIssues(fixture, row); issues.push(...rowIssues)
    const key = JSON.stringify([row.itemId, row.locationId])
    if (stockKeys.has(key)) issues.push("DUPLICATE_STOCK_POSITION")
    stockKeys.add(key)
    if (rowIssues.length) continue
    const q = scaled(row.quantity, 3), value = scaled(row.sourceValue, 2)
    quantity[row.unit] = (quantity[row.unit] ?? 0n) + q
    byLocation[row.locationId] = (byLocation[row.locationId] ?? 0n) + value
    byItem[row.itemId] = (byItem[row.itemId] ?? 0n) + value
    stock += value; controls.set(row.sourceId, { account: "FIXTURE_INVENTORY", amount: value })
  }
  for (const row of fixture.openItems) {
    const key = JSON.stringify([row.kind, row.counterpartyId, row.sourceDocumentId])
    if (!row.sourceDocumentId || documents.has(key)) issues.push("DUPLICATE_DOCUMENT")
    documents.add(key)
    if (!fixture.counterparties.some(p => p.id === row.counterpartyId && p.organizationId === fixture.organizationId && p.kind === (row.kind === "AR" ? "CUSTOMER" : "SUPPLIER"))) issues.push("WRONG_COUNTERPARTY")
    if (row.currency !== fixture.currency) issues.push("CURRENCY_MISMATCH")
    if (!Number.isFinite(Date.parse(row.sourceDate)) || !Number.isFinite(Date.parse(row.dueDate)) || row.sourceDate >= fixture.cutoverLocal.slice(0, 10) || row.dueDate < row.sourceDate) issues.push("DOCUMENT_DATE")
    try {
      const original = scaled(row.originalAmount, 2), paid = scaled(row.settledBeforeCutover, 2), amount = scaled(row.outstandingAmount, 2)
      if (original - paid !== amount || amount <= 0n) issues.push("OPEN_ITEM_DISCREPANCY")
      if (row.kind === "AR") ar += amount; else if (row.kind === "AP") ap += amount; else issues.push("OPEN_ITEM_KIND")
      controls.set(row.sourceId, { account: row.kind === "AR" ? "FIXTURE_AR" : "FIXTURE_AP", amount })
    } catch { issues.push("PRECISION") }
  }
  const covered = new Set<string>()
  const sides: Record<string, string> = { FIXTURE_INVENTORY: "DEBIT", FIXTURE_AR: "DEBIT", FIXTURE_CASH: "DEBIT", FIXTURE_AP: "CREDIT", FIXTURE_EQUITY: "CREDIT" }
  for (const row of fixture.ledger) {
    if (row.postingOwner !== "OPENING_LEDGER") issues.push("DOUBLE_POSTING_RISK")
    if (!sides[row.account] || sides[row.account] !== row.side) issues.push("ACCOUNT_SIDE")
    try {
      const amount = scaled(row.amount, 2)
      if (row.side === "DEBIT") debit += amount; else if (row.side === "CREDIT") credit += amount
      accountBalances[row.account] = (accountBalances[row.account] ?? 0n) + (row.side === "DEBIT" ? amount : -amount)
      let coveredAmount = 0n
      for (const id of row.covers) {
        if (covered.has(id)) issues.push("DUPLICATE_POSTING_COVERAGE")
        covered.add(id)
        const control = controls.get(id)
        if (!control || control.account !== row.account) issues.push("WRONG_POSTING_COVERAGE")
        else coveredAmount += control.amount
      }
      if (["FIXTURE_INVENTORY", "FIXTURE_AR", "FIXTURE_AP"].includes(row.account) && coveredAmount !== amount) issues.push("COVERAGE_VALUE_DISCREPANCY")
    } catch { issues.push("PRECISION") }
  }
  for (const id of controls.keys()) if (!covered.has(id)) issues.push("MISSING_POSTING_COVERAGE")
  if (debit !== credit) issues.push("LEDGER_IMBALANCE")
  if (accountBalances.FIXTURE_INVENTORY !== stock || accountBalances.FIXTURE_AR !== ar || accountBalances.FIXTURE_AP !== -ap) issues.push("CONTROL_TIE_OUT")
  for (const rejected of fixture.rejectedStockRows) {
    if (sourceIds.has(rejected.row.sourceId)) issues.push("REJECTED_ROW_INCLUDED")
    if (!stockIssues(fixture, rejected.row).includes(rejected.expectedIssue)) issues.push("REJECTION_REASON_MISMATCH")
  }
  const strings = (values: Record<string, bigint>) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.toString()]))
  return { issues: [...new Set(issues)], controls: {
    acceptedStockRows: fixture.stock.length, rejectedStockRows: fixture.rejectedStockRows.length,
    sourceStockRows: fixture.stock.length + fixture.rejectedStockRows.length,
    openReceivables: fixture.openItems.filter(row => row.kind === "AR").length, openPayables: fixture.openItems.filter(row => row.kind === "AP").length,
    ledgerLines: fixture.ledger.length, quantityThousandthsByUnit: strings(quantity), stockValueMinorByLocation: strings(byLocation), stockValueMinorByItem: strings(byItem),
    stockValueMinor: stock.toString(), receivableMinor: ar.toString(), payableMinor: ap.toString(), cashMinor: (accountBalances.FIXTURE_CASH ?? 0n).toString(),
    equityMinor: (-(accountBalances.FIXTURE_EQUITY ?? 0n)).toString(), ledgerDebitMinor: debit.toString(), ledgerCreditMinor: credit.toString(),
  } }
}
