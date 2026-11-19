// P09: offline, bounded archive contract. No database, exporter, auth or download entry point.
import { createHash } from "node:crypto"
import { z } from "zod"

export const ARCHIVE_CATEGORIES = [
  "organization-settings", "roles-membership", "locations", "item-unit-tax-codes",
  "customer-supplier-masters", "opening-closing-positions", "sales-returns-shifts",
  "stock-receiving-transfers", "purchasing-ap", "payments-reconciliation-ar",
  "journals-source-links", "close-review-comments", "audit-approvals",
  "attachments", "import-provenance", "offline-pending", "analytics-reports",
  "commercial-lifecycle", "payroll", "credentials",
] as const

const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)
const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/)
const decimal = z.string().regex(/^-?(0|[1-9]\d*)(\.\d+)?$/).max(100)
const quantity = decimal.refine(value => !value.startsWith("-"), "Transaction quantity must be nonnegative")
const currency = z.string().regex(/^[A-Z]{3}$/)
const category = z.enum(ARCHIVE_CATEGORIES)
// Canonical portable paths also exclude Windows aliases, drive prefixes and traversal.
const filePath = z.string().regex(/^(records|attachments)\/[a-z0-9_-]+\.(json|txt|pdf|png|jpg)$/)
  .refine(value => !/\/(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(value), "Reserved filename")
const base = { id, organizationId: id }
const money = z.object({ currency, amount: decimal }).strict()
const position = z.object({ opening: decimal, movement: decimal, closing: decimal }).strict()

export const ArchiveRecordSchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("location"), name: z.string().min(1) }).strict(),
  z.object({ ...base, kind: z.literal("role"), code: id, permissions: z.array(z.string().min(1)) }).strict(),
  z.object({ ...base, kind: z.literal("principal"), roleId: id, locationIds: z.array(id).min(1) }).strict(),
  z.object({ ...base, kind: z.literal("settings"), currency, currencyScale: z.number().int().min(0).max(6), timezone: z.string().min(1), locales: z.array(z.enum(["en", "fr"])).min(1) }).strict(),
  z.object({ ...base, kind: z.literal("item"), sku: id, nameEn: z.string(), nameFr: z.string().nullable(), unitCode: id, quantityScale: z.number().int().min(0).max(6) }).strict(),
  z.object({ ...base, kind: z.literal("party"), partyType: z.enum(["customer", "supplier"]), name: z.string(), contact: z.object({ email: z.string().email() }).strict().optional() }).strict(),
  z.object({ ...base, kind: z.literal("evidence"), attachmentPath: filePath, description: z.string() }).strict(),
  z.object({ ...base, kind: z.literal("transaction"), transactionType: z.enum(["sale", "purchase"]), partyId: id, itemId: id, locationId: id, actorId: id, evidenceIds: z.array(id).min(1), quantity, unitCode: id, total: money, effectiveAt: z.string().datetime(), recordedAt: z.string().datetime(), sourceModel: z.enum(["SalesOrder", "PurchaseOrder"]), sourceId: id }).strict(),
  z.object({ ...base, kind: z.literal("posting"), transactionId: id, accountCode: id, debit: money, credit: money }).strict(),
  z.object({ ...base, kind: z.literal("approval"), transactionId: id, reviewerId: id, evidenceId: id, decision: z.enum(["approved", "rejected"]), recordedAt: z.string().datetime() }).strict(),
  z.object({ ...base, kind: z.literal("stock-position"), itemId: id, locationId: id, unitCode: id, ...position.shape }).strict(),
])
export type ArchiveRecord = z.infer<typeof ArchiveRecordSchema>

export const ArchiveManifestSchema = z.object({
  schemaVersion: z.literal("stoquify.authorized-archive/1-draft"),
  profile: z.literal("p09-synthetic-retail"),
  archiveId: id,
  organizationId: id,
  generatedAt: z.string().datetime(),
  source: z.object({ revision: z.string().min(1), snapshotId: id, basis: z.literal("synthetic-fixture") }).strict(),
  authority: z.object({ ownerId: id, decisionId: id, policyVersion: id, sensitiveScopes: z.array(z.enum(["party.contact"])) }).strict(),
  completeness: z.enum(["declared-scope-complete", "partial"]),
  coverage: z.array(z.object({ category, status: z.enum(["included", "excluded", "blocked"]), reason: z.string().min(1), owner: z.string().min(1) }).strict()),
  files: z.array(z.object({ path: filePath, category, mediaType: z.enum(["application/json", "text/plain", "application/pdf", "image/png", "image/jpeg"]), byteLength: z.number().int().nonnegative(), sha256: digest, recordCount: z.number().int().nonnegative() }).strict()).min(1),
  controls: z.object({ recordCount: z.number().int().nonnegative(), transactionTotals: z.array(money), debitTotals: z.array(money), creditTotals: z.array(money) }).strict(),
}).strict()
export type ArchiveManifest = z.infer<typeof ArchiveManifestSchema>

export function archiveByteHash(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`
}

// Values remain decimal strings; never convert financial values through JS Number.
function sum(values: string[]): string {
  const scale = Math.max(0, ...values.map(value => (value.split(".")[1] || "").length))
  const total = values.reduce((result, value) => {
    const negative = value.startsWith("-")
    const [whole, fraction = ""] = value.replace(/^-/, "").split(".")
    const integer = BigInt(whole + fraction.padEnd(scale, "0"))
    return result + (negative ? -integer : integer)
  }, BigInt(0))
  const negative = total < BigInt(0)
  const digits = (negative ? -total : total).toString().padStart(scale + 1, "0")
  const formatted = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/\.?0+$/, "") : digits
  return `${negative ? "-" : ""}${formatted}`
}

const recordCategory: Record<ArchiveRecord["kind"], typeof ARCHIVE_CATEGORIES[number]> = {
  location: "locations", role: "roles-membership", principal: "roles-membership",
  settings: "organization-settings", item: "item-unit-tax-codes", party: "customer-supplier-masters",
  evidence: "attachments", transaction: "sales-returns-shifts", posting: "journals-source-links",
  approval: "audit-approvals", "stock-position": "opening-closing-positions",
}

/** The trusted expectation MUST come from outside the archive. This is not an authorization decision.
 * Only synthetic profile v1 is accepted; future production mappings require a reviewed new profile.
 * No filesystem extraction, URL fetching, credential handling or executable content evaluation.
 */
export function validateAuthorizedArchive(raw: unknown, files: ReadonlyMap<string, Uint8Array>, expected: {
  organizationId: string; ownerId: string; decisionId: string; sensitiveScopes: string[]
}): { valid: boolean; errors: string[]; records: ArchiveRecord[] } {
  const parsed = ArchiveManifestSchema.safeParse(raw)
  if (!parsed.success) return { valid: false, errors: ["MANIFEST_SCHEMA"], records: [] }
  const m = parsed.data, errors: string[] = [], records: ArchiveRecord[] = []
  const fail = (code: string) => errors.push(code)
  if (m.organizationId !== expected.organizationId || m.authority.ownerId !== expected.ownerId || m.authority.decisionId !== expected.decisionId) fail("AUTHORITY_MISMATCH")
  if (m.authority.sensitiveScopes.some(s => !expected.sensitiveScopes.includes(s))) fail("UNAUTHORIZED_SCOPE")
  const coverage = new Map(m.coverage.map(c => [c.category, c]))
  if (coverage.size !== m.coverage.length || ARCHIVE_CATEGORIES.some(c => !coverage.has(c))) fail("COVERAGE_MISSING_OR_DUPLICATE")
  if (coverage.get("credentials")?.status !== "excluded") fail("CREDENTIALS_NOT_EXCLUDED")
  if (m.completeness === "declared-scope-complete" && m.coverage.some(c => c.status === "blocked")) fail("FALSE_COMPLETENESS")
  const entries = new Map(m.files.map(f => [f.path, f]))
  if (entries.size !== m.files.length) fail("DUPLICATE_PATH")
  if (m.coverage.some(c => c.status === "included" && !m.files.some(f => f.category === c.category))) fail("INCLUDED_CATEGORY_WITHOUT_FILE")
  if ([...files.keys()].some(p => !entries.has(p))) fail("UNDECLARED_FILE")
  const referencedAttachments = new Set<string>()
  for (const f of m.files) {
    if (coverage.get(f.category)?.status !== "included") fail("FILE_OUTSIDE_COVERAGE")
    const bytes = files.get(f.path)
    if (!bytes) { fail("MISSING_FILE"); continue }
    if (bytes.byteLength !== f.byteLength) fail("BYTE_COUNT")
    if (archiveByteHash(bytes) !== f.sha256) fail("FILE_HASH")
    if (f.path.startsWith("attachments/")) {
      if (f.recordCount !== 0 || f.category !== "attachments" || f.mediaType === "application/json") fail("ATTACHMENT_DESCRIPTOR")
      const mime: Record<string, string> = { txt: "text/plain", pdf: "application/pdf", png: "image/png", jpg: "image/jpeg" }
      if (mime[f.path.split(".").pop()!] !== f.mediaType) fail("ATTACHMENT_DESCRIPTOR")
      continue
    }
    if (!f.path.endsWith(".json") || f.mediaType !== "application/json") { fail("RECORD_DESCRIPTOR"); continue }
    let rows: unknown
    try { rows = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) } catch { fail("RECORD_ENCODING"); continue }
    const result = z.array(ArchiveRecordSchema).safeParse(rows)
    if (!result.success) { fail("RECORD_SCHEMA"); continue }
    if (result.data.length !== f.recordCount) fail("RECORD_COUNT")
    for (const row of result.data) {
      if (row.organizationId !== m.organizationId) fail("FOREIGN_TENANT")
      const actualCategory = row.kind === "transaction" && row.transactionType === "purchase" ? "purchasing-ap" : recordCategory[row.kind]
      if (actualCategory !== f.category) fail("RECORD_CATEGORY")
      if (row.kind === "party" && row.contact && (!m.authority.sensitiveScopes.includes("party.contact") || !expected.sensitiveScopes.includes("party.contact"))) fail("UNAUTHORIZED_FIELD")
      records.push(row)
    }
  }
  if (records.length !== m.controls.recordCount) fail("TOTAL_RECORD_COUNT")
  const byId = new Map(records.map(r => [r.id, r]))
  if (byId.size !== records.length) fail("DUPLICATE_ID")
  const link = (value: string, kind: ArchiveRecord["kind"]) => { if (byId.get(value)?.kind !== kind) fail("MISSING_OR_WRONG_LINK") }
  link(m.authority.ownerId,"principal")
  for (const r of records) {
    if (r.kind === "principal") { link(r.roleId, "role"); r.locationIds.forEach(x=>link(x,"location")) }
    if (r.kind === "transaction") {
      link(r.partyId,"party"); link(r.itemId,"item"); link(r.locationId,"location"); link(r.actorId,"principal"); r.evidenceIds.forEach(x=>link(x,"evidence"))
      const item = byId.get(r.itemId), party = byId.get(r.partyId)
      if (item?.kind === "item" && item.unitCode !== r.unitCode) fail("UNIT_MISMATCH")
      if (party?.kind === "party" && party.partyType !== (r.transactionType === "sale" ? "customer" : "supplier")) fail("PARTY_TYPE")
      if (r.sourceModel !== (r.transactionType === "sale" ? "SalesOrder" : "PurchaseOrder")) fail("SOURCE_MODEL")
    }
    if (r.kind === "posting") { link(r.transactionId,"transaction"); if(r.debit.currency!==r.credit.currency) fail("CURRENCY_MISMATCH") }
    if (r.kind === "approval") { link(r.transactionId,"transaction"); link(r.reviewerId,"principal"); link(r.evidenceId,"evidence") }
    if (r.kind === "evidence") {
      referencedAttachments.add(r.attachmentPath)
      if (!r.attachmentPath.startsWith("attachments/") || !entries.has(r.attachmentPath) || !files.has(r.attachmentPath)) fail("MISSING_REFERENCED_ATTACHMENT")
    }
    if (r.kind === "stock-position") {
      link(r.itemId,"item"); link(r.locationId,"location")
      if (sum([r.opening,r.movement]) !== sum([r.closing])) fail("POSITION_TIE_OUT")
      const item = byId.get(r.itemId)
      if (item?.kind === "item" && item.unitCode !== r.unitCode) fail("UNIT_MISMATCH")
      const movement = records.filter(t => t.kind === "transaction" && t.itemId === r.itemId && t.locationId === r.locationId)
        .map(t => t.kind === "transaction" ? (t.transactionType === "sale" ? sum([`-${t.quantity}`]) : t.quantity) : "0")
      if (sum(movement) !== sum([r.movement])) fail("STOCK_MOVEMENT_TIE_OUT")
    }
  }
  for (const f of m.files) if (f.path.startsWith("attachments/") && !referencedAttachments.has(f.path)) fail("UNREFERENCED_ATTACHMENT")
  const transactions = records.filter(r => r.kind === "transaction")
  const postings = records.filter(r => r.kind === "posting")
  function checkTotals(actual: z.infer<typeof money>[], declared: z.infer<typeof money>[]) {
    const currencies = new Set(actual.map(v=>v.currency))
    if (new Set(declared.map(v=>v.currency)).size !== declared.length || declared.length !== currencies.size) fail("TOTAL_CURRENCIES")
    for (const c of currencies) {
      if (!declared.some(v=>v.currency===c)) fail("TOTAL_CURRENCIES")
      if (sum(actual.filter(v=>v.currency===c).map(v=>v.amount)) !== sum(declared.filter(v=>v.currency===c).map(v=>v.amount))) fail("MONETARY_TOTAL")
    }
  }
  checkTotals(transactions.map(r=>r.total),m.controls.transactionTotals)
  checkTotals(postings.map(r=>r.debit),m.controls.debitTotals)
  checkTotals(postings.map(r=>r.credit),m.controls.creditTotals)
  for (const t of transactions) {
    const lines = postings.filter(r=>r.transactionId===t.id)
    if (!lines.length || lines.some(r=>r.debit.currency!==t.total.currency || r.credit.currency!==t.total.currency) || sum(lines.map(r=>r.debit.amount)) !== sum(lines.map(r=>r.credit.amount)) || sum(lines.map(r=>r.debit.amount)) !== sum([t.total.amount])) fail("TRANSACTION_TIE_OUT")
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)], records: errors.length ? [] : records }
}
