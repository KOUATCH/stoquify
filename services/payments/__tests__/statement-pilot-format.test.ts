import { readFileSync, writeFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"
import { Prisma } from "@prisma/client"
import { MobileMoneyHmacAdapter, sha256 } from "../adapters/mobile-money-hmac.adapter"
const adapter = new MobileMoneyHmacAdapter("SYNTHETIC_PILOT")
const line = { transactionId: "synthetic-1", reference: "receipt-1", direction: "CREDIT",
  amount: "100.20", fee: "0.20", currency: "XAF", date: "2026-09-01T10:00:00Z" }
const parse = (change = {}) => adapter.parseStatement({ rawContent: JSON.stringify([{ ...line, ...change }]) }).lines[0]
const envelope = (changes: Record<string, unknown> = {}) => ({ formatVersion: "stoquify-statement-v1", providerCode: "SYNTHETIC_PILOT",
  providerAccountId: "provider-account-1", currencyCode: "XAF", periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-09-30T23:59:59.999Z", lines: [line], ...changes })

it("retains declared file coverage separately from observed transaction dates without changing line identity", () => {
  const result = adapter.parseStatement({ rawContent: JSON.stringify(envelope()) })
  expect(result.periodStart?.toISOString()).toBe("2026-09-01T00:00:00.000Z")
  expect(result.periodEnd?.toISOString()).toBe("2026-09-30T23:59:59.999Z")
  expect(result.observedPeriodStart?.toISOString()).toBe("2026-09-01T10:00:00.000Z")
  expect(result.observedPeriodEnd).toEqual(result.observedPeriodStart)
  expect(result.declaredCoverage).toMatchObject({ providerCode: "SYNTHETIC_PILOT", providerAccountId: "provider-account-1", currencyCode: "XAF" })
  expect(adapter.fingerprintStatementLine(result.lines[0])).toBe(adapter.fingerprintStatementLine(parse()))
})

it("keeps legacy JSON arrays observed-only", () => {
  const result = adapter.parseStatement({ rawContent: JSON.stringify([line]) })
  expect(result.declaredCoverage).toBeUndefined()
  expect(result.periodStart).toEqual(result.observedPeriodStart)
  expect(result.periodEnd).toEqual(result.observedPeriodEnd)
})

it.each([
  { formatVersion: "unknown" }, { extra: "unreviewed" }, { providerCode: "foreign" }, { providerAccountId: "" }, { currencyCode: "USD" },
  { periodStart: "2026-09-02T00:00:00Z" }, { periodEnd: "2026-09-01T09:59:59Z" }, { periodStart: "2026-10-01", periodEnd: "2026-09-01" },
  { periodStart: "2026-09-01T00:00:00" }, { lines: [] }, { lines: [null] }, { lines: [line, { ...line, currency: "USD" }] },
])("rejects ambiguous or unsupported declared coverage %j", changes => {
  expect(() => adapter.parseStatement({ rawContent: JSON.stringify(envelope(changes)) })).toThrow()
})

it("rejects duplicate envelope keys rather than allowing a later bound to replace an earlier one", () => {
  const rawContent = JSON.stringify(envelope()).replace('"periodEnd":', '"periodEnd":"2026-09-01","periodEnd":')
  expect(() => adapter.parseStatement({ rawContent })).toThrow(/Duplicate/)
})

it("preserves the pre-AF07 fingerprint bytes for accepted input", () => {
  expect(adapter.fingerprintStatementLine(parse())).toBe(sha256("synthetic-1|receipt-1|CREDIT|100.20|XAF|2026-09-01T10:00:00.000Z"))
})
it("imports the documented BOM/CRLF/quoted multi-line fixture with Decimal controls", () => {
  const rawContent = readFileSync(join(__dirname, "../__fixtures__/af07-pilot.csv"), "utf8")
  const rows = adapter.parseStatement({ rawContent }).lines
  expect(rows).toHaveLength(4)
  expect(rows[0].description).toBe('Receipt, "quoted"\r\nsecond line')
  expect(rows.map(r => r.direction)).toEqual(["CREDIT", "DEBIT", "FEE", "REVERSAL"])
  expect(rows.reduce((sum, r) => sum.plus(r.amount), new Prisma.Decimal(0)).toFixed(2)).toBe("126.70")
  expect(rows.reduce((sum, r) => sum.plus(r.feeAmount ?? 0), new Prisma.Decimal(0)).toFixed(2)).toBe("0.20")
  expect(rows[0].metadata).toEqual({ formatVersion: "stoquify-pilot-v2", fingerprintVersion: 1 })
})
it.each(["-1", "1e3", "1,000", "1.001", "NaN", "Infinity", "1000000000000", "01", 0.1, 100])("rejects ambiguous/overflow monetary input %s", amount => {
  expect(() => parse({ amount })).toThrow(/amounts/)
})
it.each(["09/01/2026", "2026-02-30", "2026-01-01T10:00:00", "2026-01-01T25:00:00Z", "2026-01-01T10:00:00+14:30"])("rejects ambiguous or invalid date %s", date => {
  expect(() => parse({ date })).toThrow(/ISO/)
})
it("accepts ISO UTC dates and explicit offsets without floating point amounts", () => {
  expect(parse({ date: "2024-02-29" }).occurredAt.toISOString()).toBe("2024-02-29T00:00:00.000Z")
  expect(parse({ date: "2026-09-01T11:00:00+01:00" }).occurredAt.toISOString()).toBe("2026-09-01T10:00:00.000Z")
  expect(parse({ amount: "999999999999.99" }).amount).toBe("999999999999.99")
})
it.each([{ currency: "" }, { currency: "xaf" }, { direction: "UNKNOWN" }, { transactionId: "", reference: "" },
  { lineNumber: 1.5 }, { fee: "1,2" }, { postedAt: "yesterday" }, { amount: "" }, { currencyCode: "USD" }])("rejects invalid mandatory/optional fields %j", change => {
  expect(() => parse(change)).toThrow()
})
it.each(['[', '[null]', '[]', 'a,a\n1,2', 'a,b\n1', 'a,b\n"x"oops,y', 'a,b\n"x,y', 'a,b\nx"q,y',
  'a,b\r1,2', 'a,b\n\uFFFD,x', 'a,b\n\u0000,x'])("rejects malformed input", rawContent => {
  expect(() => adapter.parseStatement({ rawContent })).toThrow()
})
it("enforces byte and line limits before import", () => {
  expect(() => adapter.parseStatement({ rawContent: "x".repeat(5 * 1024 * 1024 + 1) })).toThrow(/5 MiB/)
  expect(() => adapter.parseStatement({ rawContent: JSON.stringify(Array(1001).fill(line)) })).toThrow(/1000/)
})
it("does not silently choose between conflicting aliases", () => {
  expect(() => parse({ occurredAt: "2026-09-02" })).toThrow(/Conflicting/)
  expect(() => adapter.parseStatement({ rawContent: '[{"amount":"1","\\u0061mount":"2"}]' })).toThrow(/Duplicate/)
})
it.each(["\u0000", "\uFFFD", "\uD800"])("rejects invalid text after JSON escape decoding", invalid => {
  const rawContent = JSON.stringify([{ ...line, transactionId: `synthetic${invalid}` }]).replace(/\uFFFD/g, "\\uFFFD")
  expect(() => adapter.parseStatement({ rawContent })).toThrow(/UTF-8/)
})
it.each([true, [1], "1e2", "0x10"])("rejects coerced line numbers %j", lineNumber => {
  expect(() => parse({ lineNumber })).toThrow(/line number/)
})
it("accepts Unicode scalar text and ordinary CSV line numbers", () => {
  expect(parse({ transactionId: "receipt-\u{1F600}", lineNumber: "12" }).lineNumber).toBe(12)
})
it("measures the supported 1000-row boundary with exact totals", () => {
  const rawContent = "transactionId,direction,amount,currency,date\n" + Array.from({ length: 1000 }, (_, n) =>
    `large-${n},CREDIT,0.10,XAF,2026-09-01T10:00:00Z`).join("\n")
  const before = process.memoryUsage().heapUsed, started = performance.now()
  const rows = adapter.parseStatement({ rawContent }).lines, elapsedMs = performance.now() - started
  expect(rows).toHaveLength(1000)
  expect(rows.reduce((n, row) => n.plus(row.amount), new Prisma.Decimal(0)).toFixed(2)).toBe("100.00")
  const evidence = process.env.AF07_EVIDENCE_DIR
  if (!evidence) return
  if (!isAbsolute(evidence)) throw Error("AF07_EVIDENCE_DIR must be absolute")
  writeFileSync(join(evidence, "parser-performance.json"),
    JSON.stringify({ rows: rows.length, utf8Bytes: Buffer.byteLength(rawContent), elapsedMs, heapDeltaBytes: process.memoryUsage().heapUsed - before,
      node: process.version, scope: "Single synthetic CSV parse in Jest; diagnostic heap delta, not a production SLO." }, null, 2), { flag: "wx" })
})
