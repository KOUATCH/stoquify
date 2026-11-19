import { createHash } from "node:crypto"
import { safeCsvValue } from "@/services/security/export-csv"
import { renderReviewWorkpaperExport, workpaperExportRows, type RetainedWorkpaper } from "../review-workpaper-export"
import { WORKPAPER_KINDS, WORKPAPER_LIMITATIONS, workpaperDecisionSchema, workpaperScopeSchema } from "../review-workpaper.contract"
const hash = "sha256:" + "a".repeat(64)
function fixture(): RetainedWorkpaper {
  return { version: 1, organizationId: "synthetic-client", periodId: "2026-09", periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-09-30T23:59:59.999Z",
    closeRunId: "synthetic-run", sourceRevision: "10", sourceHash: hash, reviewHash: hash, observedAt: "2026-10-20T10:00:00.000Z",
    classification: "DRAFT_WORKPAPERS_NOT_CERTIFIED", reviewState: "UNPREPARED", decisions: [], previousPeriods: [], rolledForwardFrom: null,
    exportedById: "synthetic-reviewer", watermarkId: "wm_synthetic", limitations: WORKPAPER_LIMITATIONS, unclassifiedAccounts: [],
    schedules: WORKPAPER_KINDS.map((kind, i) => ({ kind, availability: "RECONCILED", accounts: [{
      kind, ledgerAccountId: `account-${i}`, accountCode: String(400 + i), currency: i % 2 ? "EUR" : "XAF", availability: "RECONCILED",
      sourceRevision: "9", sourceHash: hash, evidenceId: `evidence-${i}`, evidenceHash: hash, approvedAt: "2026-10-20T09:00:00.000Z", approvedById: "source-reviewer", reason: null,
      balances: { ledger: { openingBalance: "10.20", additions: "30.10", reductions: "5.05", closingBalance: "35.25" },
        schedule: { openingBalance: "10.20", additions: "30.10", reductions: "5.05", closingBalance: "35.25" },
        differences: { openingBalance: "0.00", additions: "0.00", reductions: "0.00", closingBalance: "0.00" } },
    }] })),
  }
}
it.each(["=HYPERLINK(\"https://example.invalid\")", " \t+cmd", "\r\n-1+2", "\u0000@SUM(A1)", "＝SUM(A1)"])("escapes spreadsheet text without executing %s", value => {
  const escaped = safeCsvValue(value)
  expect(escaped).toMatch(/^"/)
  if (value[0] !== "＝") expect(escaped.startsWith("\"'")).toBe(true)
  expect(escaped.includes('""https://example.invalid""')).toBe(value.includes("HYPERLINK"))
})
it("preserves exact decimals, currencies, scope and four controls without summing currencies", () => {
  const binder = fixture(), rows = workpaperExportRows(binder)
  expect(rows).toHaveLength(4)
  expect(rows.map(row => row.currency)).toEqual(["XAF", "EUR", "XAF", "EUR"])
  const exported = renderReviewWorkpaperExport(binder, "csv", hash)
  const csv = Buffer.from(exported.contentBase64, "base64").toString("utf8")
  expect(csv).toContain('"35.25"'); expect(csv).toContain('"difference_closingBalance"')
  expect(csv).toContain('"2026-09-30T23:59:59.999Z"')
  expect(csv).toContain('"source_revision","10"')
  expect(exported.artifactHash).toBe("sha256:" + createHash("sha256").update(csv).digest("hex"))
})
it("does not manufacture zero balances for missing schedules", () => {
  const binder = fixture(); binder.schedules = WORKPAPER_KINDS.map(kind => ({ kind, availability: "UNAVAILABLE", accounts: [] }))
  expect(workpaperExportRows(binder).every(row => row.balances === null && row.availability === "UNAVAILABLE")).toBe(true)
  expect(Buffer.from(renderReviewWorkpaperExport(binder, "csv", hash).contentBase64, "base64").toString()).not.toContain('"0.00"')
})
it("neutralizes formula-bearing account labels in the actual CSV artifact", () => {
  const binder = fixture()
  binder.schedules[0].accounts[0].accountCode = "\t=HYPERLINK(\"https://example.invalid\")"
  const csv = Buffer.from(renderReviewWorkpaperExport(binder, "csv", hash).contentBase64, "base64").toString()
  expect(csv).toContain("\"'\t=HYPERLINK(\"\"https://example.invalid\"\")\"")
})
it("renders real PDF bytes and exact canonical JSON from the same object", () => {
  const binder = fixture()
  const pdf = renderReviewWorkpaperExport(binder, "pdf", hash)
  expect(Buffer.from(pdf.contentBase64, "base64").subarray(0, 5).toString()).toBe("%PDF-")
  expect(renderReviewWorkpaperExport(binder, "pdf", hash).artifactHash).toBe(pdf.artifactHash)
  expect(JSON.parse(Buffer.from(renderReviewWorkpaperExport(binder, "json", hash).contentBase64, "base64").toString())).toEqual(binder)
})
it("rejects actor/amount injection and malformed source bindings at the command boundary", () => {
  expect(workpaperScopeSchema.safeParse({ periodId: "one", actorId: "someone" }).success).toBe(false)
  expect(workpaperDecisionSchema.safeParse({ periodId: "one", idempotencyKey: "one", expectedSourceHash: "wrong", decision: "REVIEWED", conclusion: "Reviewed source" }).success).toBe(false)
})
