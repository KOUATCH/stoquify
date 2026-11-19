import { createHash } from "node:crypto"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { safeCsvValue } from "@/services/security/export-csv"
import type { ReviewWorkpaperBinder, WorkpaperAccount } from "./review-workpaper.contract"

export type RetainedWorkpaper = ReviewWorkpaperBinder & { exportedById: string; watermarkId: string; limitations: string }
const labels = { CASH: "Cash / settlement", RECEIVABLES: "Accounts receivable", PAYABLES: "Accounts payable", INVENTORY: "Inventory" }
const columns = ["openingBalance", "additions", "reductions", "closingBalance"] as const
export function workpaperExportRows(binder: RetainedWorkpaper) {
  const accountRows = (kind: string, account: WorkpaperAccount | null) => ({
    kind, account: account?.accountCode ?? "", ledgerAccountId: account?.ledgerAccountId ?? "",
    currency: account?.currency ?? "", availability: account?.availability ?? "UNAVAILABLE",
    sourceRevision: account?.sourceRevision ?? "", sourceHash: account?.sourceHash ?? "",
    evidenceId: account?.evidenceId ?? "", evidenceHash: account?.evidenceHash ?? "",
    reason: account?.reason ?? (account ? "" : "No supporting schedule is retained for this category."),
    balances: account?.balances ?? null,
  })
  return [...binder.schedules.flatMap(schedule => schedule.accounts.length
    ? schedule.accounts.map(account => accountRows(labels[schedule.kind], account)) : [accountRows(labels[schedule.kind], null)]),
  ...binder.unclassifiedAccounts.map(account => accountRows("Outside pilot / unclassified", account))]
}

/** Every format consumes only the retained, redacted canonical object. */
export function renderReviewWorkpaperExport(binder: RetainedWorkpaper, format: "json" | "csv" | "pdf", contentHash: string) {
  const rows = workpaperExportRows(binder)
  let bytes: Buffer
  let mimeType: string
  if (format === "json") {
    bytes = Buffer.from(JSON.stringify(binder, null, 2), "utf8"); mimeType = "application/json"
  } else if (format === "csv") {
    const csv = (values: unknown[]) => values.map(safeCsvValue).join(",")
    const manifest = [
      ["classification", binder.classification], ["organization_id", binder.organizationId], ["period_id", binder.periodId],
      ["period_start_utc_inclusive", binder.periodStart], ["period_end_utc_inclusive", binder.periodEnd],
      ["observed_at_utc", binder.observedAt], ["source_revision", binder.sourceRevision], ["source_hash", binder.sourceHash],
      ["review_state", binder.reviewState], ["review_hash", binder.reviewHash], ["canonical_hash", contentHash],
      ["watermark_id", binder.watermarkId], ["limitations", binder.limitations],
    ]
    const headers = ["client", "period", "schedule", "account", "currency", "availability", "source_revision", "source_hash", "evidence_id", "evidence_hash",
      ...["ledger", "schedule", "difference"].flatMap(prefix => columns.map(column => `${prefix}_${column}`)), "reason"]
    bytes = Buffer.from([...manifest.map(csv), "", csv(headers), ...rows.map(row => csv([
      binder.organizationId, binder.periodId, row.kind, row.account, row.currency, row.availability, row.sourceRevision, row.sourceHash,
      row.evidenceId, row.evidenceHash, ...(["ledger", "schedule", "differences"] as const).flatMap(basis =>
        columns.map(column => row.balances?.[basis][column] ?? "")), row.reason,
    ]))].join("\r\n"), "utf8"); mimeType = "text/csv;charset=utf-8"
  } else {
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
    doc.setCreationDate(new Date(binder.observedAt))
    doc.setFileId(contentHash.slice(7, 39).toUpperCase())
    doc.setProperties({ title: "Stoquify review workpapers", subject: binder.classification, creator: "Stoquify" })
    doc.setFontSize(18); doc.text("Review workpapers", 14, 19)
    doc.setFontSize(11); doc.text("DRAFT - NOT CERTIFIED / BROUILLON - NON CERTIFIE", 14, 27)
    const metadata = [
      ["Client / period", `${binder.organizationId} / ${binder.periodId}`],
      ["Inclusive UTC period", `${binder.periodStart} to ${binder.periodEnd}`],
      ["Observed / revision", `${binder.observedAt} / ${binder.sourceRevision}`],
      ["Workpaper review", binder.reviewState], ["Source hash", binder.sourceHash], ["Review hash", binder.reviewHash],
      ["Canonical JSON hash", contentHash], ["Watermark", binder.watermarkId], ["Limitations", binder.limitations],
    ]
    autoTable(doc, { startY: 32, tableWidth: 181, body: metadata, theme: "plain", styles: { fontSize: 9, overflow: "linebreak", cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 141 } }, margin: { bottom: 18 } })
    for (const schedule of binder.schedules) {
      doc.addPage()
      doc.setFontSize(16); doc.text(labels[schedule.kind], 14, 19)
      doc.setFontSize(10); doc.text(`Availability: ${schedule.availability}`, 14, 27)
      const selected = rows.filter(row => row.kind === labels[schedule.kind])
      autoTable(doc, { startY: 33, tableWidth: 180, head: [["Account / currency", "Basis", "Opening", "Additions", "Reductions", "Closing"]],
        body: selected.flatMap(row => row.balances
          ? (["ledger", "schedule", "differences"] as const).map(basis => [`${row.account} / ${row.currency}`, basis, ...columns.map(col => row.balances![basis][col])])
          : [[`${row.account} / ${row.currency}`, "UNAVAILABLE", "-", "-", "-", "-"]]),
        styles: { fontSize: 7.5, cellPadding: 1.5, overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 24 }, 2: { cellWidth: 32 }, 3: { cellWidth: 32 }, 4: { cellWidth: 32 }, 5: { cellWidth: 32 } },
        headStyles: { fillColor: [25, 57, 83] }, margin: { bottom: 18 },
        didDrawPage: () => { doc.setFontSize(8) } })
      const y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7
      autoTable(doc, { startY: y, body: selected.map(row => [row.account || "No account", row.reason || `Revision ${row.sourceRevision}; evidence ${row.evidenceId}\n${row.evidenceHash}\nSource ${row.sourceHash}`]),
        theme: "plain", styles: { fontSize: 8, overflow: "linebreak" }, columnStyles: { 0: { cellWidth: 35 } }, margin: { bottom: 18 } })
    }
    if (binder.unclassifiedAccounts.length) {
      doc.addPage(); doc.setFontSize(14); doc.text("Outside pilot / unclassified accounts", 14, 20)
      autoTable(doc, { startY: 28, head: [["Account", "Currency", "Availability", "Evidence"]],
        body: binder.unclassifiedAccounts.map(row => [row.accountCode, row.currency, row.availability, row.evidenceId ?? "Unavailable"]),
        styles: { fontSize: 8 }, margin: { bottom: 18 } })
    }
    for (let page = 1; page <= doc.getNumberOfPages(); page++) {
      doc.setPage(page); doc.setFontSize(8)
      doc.text(`${binder.watermarkId} | DRAFT | ${page}/${doc.getNumberOfPages()}`, 14, 287)
    }
    bytes = Buffer.from(doc.output("arraybuffer")); mimeType = "application/pdf"
  }
  return { fileName: `stoquify-workpapers-${binder.watermarkId}.${format}`, mimeType, contentBase64: bytes.toString("base64"),
    artifactHash: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, byteLength: bytes.length }
}
