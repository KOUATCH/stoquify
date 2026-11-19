import { PaymentIngestionError } from "../payment-ingestion.types"
import type { ParsedStatement } from "../payment-ingestion.types"

export const STATEMENT_MAX_BYTES = 5 * 1024 * 1024
export const STATEMENT_MAX_ROWS = 1000
export const STATEMENT_FORMAT_VERSION = "stoquify-pilot-v2"
export const STATEMENT_ENVELOPE_VERSION = "stoquify-statement-v1"

function invalid(message: string): never {
  throw new PaymentIngestionError("INVALID_PAYLOAD", message)
}

// A deliberately narrow CSV dialect. The onboarding parser is private and
// returns onboarding-specific issues; payment inputs must reject ambiguous rows.
function csvRecords(raw: string): Record<string, unknown>[] {
  const records: string[][] = []
  let record: string[] = [], value = "", quoted = false, closed = false
  const cell = () => { record.push(value); value = ""; closed = false }
  const row = () => {
    cell()
    if (record.some(v => v !== "")) records.push(record)
    record = []
    if (records.length > STATEMENT_MAX_ROWS + 1) invalid("Statement exceeds 1000 lines.")
  }
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (quoted) {
      if (c === '"') {
        if (raw[i + 1] === '"') { value += '"'; i++ }
        else { quoted = false; closed = true }
      } else value += c
    } else if (c === ",") cell()
    else if (c === "\r" || c === "\n") {
      if (c === "\r" && raw[i + 1] !== "\n") invalid("Use LF or CRLF line endings.")
      if (c === "\r") i++
      row()
    } else if (c === '"' && value === "" && !closed) quoted = true
    else {
      if (closed || c === '"') invalid("Malformed CSV quoting.")
      value += c
    }
  }
  if (quoted) invalid("Unclosed CSV quoted field.")
  if (value || record.length || closed) row()
  const headers = records.shift()?.map(h => h.trim()) ?? []
  if (!headers.length || headers.some(h => !h) || new Set(headers).size !== headers.length)
    invalid("Statement headers must be nonempty and unique.")
  return records.map((values, index) => {
    if (values.length !== headers.length) invalid(`Statement line ${index + 1} has an incorrect field count.`)
    return Object.fromEntries(headers.map((key, n) => [key, values[n]]))
  })
}

export function statementDocument(raw: string): { rows: Record<string, unknown>[]; declaredCoverage?: ParsedStatement["declaredCoverage"] } {
  if (Buffer.byteLength(raw, "utf8") > STATEMENT_MAX_BYTES)
    throw new PaymentIngestionError("PAYLOAD_TOO_LARGE", "Statement exceeds 5 MiB.")
  // Input has already crossed a text boundary. Reject signs of a lossy decode,
  // UTF-16 input, or invalid Unicode rather than silently changing file identity.
  if (/[\u0000\uFFFD]/u.test(raw) || /[\uD800-\uDFFF]/u.test(raw))
    invalid("Statement must be valid UTF-8 text without replacement characters.")
  const text = raw.replace(/^\uFEFF/, "")
  let rows: unknown
  let declaredCoverage: ParsedStatement["declaredCoverage"]
  if (/^[\[{]/.test(text.trimStart())) {
    try { rows = JSON.parse(text) } catch { invalid("Malformed statement JSON.") }
    // JSON.parse otherwise silently keeps the last duplicate object key.
    const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}[\]:,]/g) ?? []
    const objects: Array<Set<string> | null> = []
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token === "{") objects.push(new Set())
      else if (token === "[") objects.push(null)
      else if (token === "}" || token === "]") objects.pop()
      else if (token.startsWith('"') && tokens[i + 1] === ":") {
        const key = JSON.parse(token) as string, keys = objects[objects.length - 1]
        if (keys?.has(key)) invalid("Duplicate statement JSON key.")
        keys?.add(key)
      }
    }
    if (rows && typeof rows === "object" && !Array.isArray(rows)) {
      const envelope = rows as Record<string, unknown>
      const keys = ["formatVersion", "providerCode", "providerAccountId", "currencyCode", "periodStart", "periodEnd", "lines"]
      if (Object.keys(envelope).length !== keys.length || Object.keys(envelope).some(key => !keys.includes(key)) || envelope.formatVersion !== STATEMENT_ENVELOPE_VERSION)
        invalid("Use the supported versioned statement envelope with explicit coverage and account identity.")
      for (const key of keys.filter(key => key !== "lines")) {
        const value = envelope[key]
        if (typeof value !== "string" || !value.trim() || value !== value.trim() || /[\u0000\uFFFD\uD800-\uDFFF]/u.test(value))
          invalid("Statement envelope fields must be nonempty valid text.")
      }
      if (!/^[A-Z]{3}$/.test(String(envelope.currencyCode))) invalid("Statement envelope requires an uppercase currency.")
      const periodStart = statementDate(envelope.periodStart)!, periodEnd = statementDate(envelope.periodEnd)!
      if (periodStart > periodEnd) invalid("Statement declared coverage is reversed.")
      declaredCoverage = { formatVersion: STATEMENT_ENVELOPE_VERSION, providerCode: envelope.providerCode as string,
        providerAccountId: envelope.providerAccountId as string, currencyCode: envelope.currencyCode as string, periodStart, periodEnd }
      rows = envelope.lines
    }
  } else rows = csvRecords(text)
  if (!Array.isArray(rows) || !rows.length || rows.length > STATEMENT_MAX_ROWS)
    invalid("Statement must contain between 1 and 1000 lines.")
  if (rows.some(row => !row || typeof row !== "object" || Array.isArray(row)))
    invalid("Each statement line must be an object.")
  // JSON escapes can introduce invalid text after the raw-input check.
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if ([key, value].some(text => typeof text === "string" && /[\u0000\uFFFD\uD800-\uDFFF]/u.test(text)))
        invalid("Statement must be valid UTF-8 text without replacement characters.")
    }
  }
  return { rows: rows as Record<string, unknown>[], ...(declaredCoverage ? { declaredCoverage } : {}) }
}

export function statementRows(raw: string): Record<string, unknown>[] { return statementDocument(raw).rows }

export function statementField(row: Record<string, unknown>, ...keys: string[]): unknown {
  const values = keys.map(key => row[key]).filter(v => v !== undefined && v !== null && v !== "")
  if (values.length > 1 && values.some(v => v !== values[0])) invalid(`Conflicting aliases for ${keys[0]}.`)
  return values[0]
}

export function statementMoney(value: unknown, optional = false): string | null {
  if (optional && (value === undefined || value === null || value === "")) return null
  // Preserve the original trimmed decimal spelling for legacy fingerprints.
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(value.trim()))
    invalid("Statement amounts must be unsigned decimal strings with at most 12 integer and 2 fractional digits.")
  return value.trim()
}

export function statementDate(value: unknown, optional = false): Date | null {
  if (optional && (value === undefined || value === null || value === "")) return null
  if (typeof value !== "string") invalid("Statement date is required.")
  const raw = value.trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(Z|[+-](?:0\d|1[0-4]):[0-5]\d))?$/.exec(raw)
  if (!m || +m[1] < 1900 || +m[2] < 1 || +m[2] > 12 || +m[3] < 1
    || +m[3] > new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate()
    || (m[7] && /^[+-]14:(?!00)/.test(m[7])))
    invalid("Use a valid ISO calendar date (UTC) or timestamp with explicit timezone.")
  const date = new Date(raw)
  if (!Number.isFinite(+date)) invalid("Invalid statement date.")
  return date
}
