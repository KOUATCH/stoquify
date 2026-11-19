import { createHash } from "node:crypto"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { safeCsvValue } from "@/services/security/export-csv"
import type { AdvisoryDocument } from "./advisory-outcomes.contract"

type Canonical = { document: AdvisoryDocument; revisionId: string; version: number; deliveryHash: string; freshness: "CURRENT" | "REVIEW_REQUIRED" }
/** A single projection supplies readable CSV/PDF; JSON retains the exact source
 * amounts and hashes. No floating-point financial calculation occurs here. */
export function advisoryExportRows(pack: Canonical) {
  const d = pack.document
  return [
    ["Advisory pack", "Historical delivery / not an audit opinion"], ["Client", d.organizationId], ["Engagement", d.engagementId],
    ["Period", `${d.periodStart} — ${d.periodEnd} (inclusive UTC)`], ["Revision", `${pack.revisionId} / ${pack.version}`],
    ["Freshness", pack.freshness], ["Observed at", d.observedAt], ["Source hash", d.sourceHash], ["Review hash", d.reviewHash], ["Delivery hash", pack.deliveryHash],
    ["Prepared", `${d.preparedById} / ${d.preparedAt}`], ["Reviewed", `${d.reviewedById} / ${d.reviewedAt}`],
    ["Client agreement", `${d.agreedById} / ${d.agreedAt}`], ["Published to client workspace", `${d.deliveredById} / ${d.deliveredAt}`],
    ["Confidence", d.confidence], ["Limitations", d.limitations],
    ...d.observations.flatMap(schedule => schedule.accounts.flatMap(account => [
      [`${schedule.kind} / ${account.accountCode} / ${account.currency}`, account.availability],
      ["Reviewed ledger closing", account.balances?.ledger.closingBalance ?? "UNAVAILABLE"],
      ["Reviewed supporting closing", account.balances?.schedule.closingBalance ?? "UNAVAILABLE"],
      ["Difference", account.balances?.differences.closingBalance ?? "UNAVAILABLE"],
      ["Source / evidence", `${account.sourceHash ?? "UNAVAILABLE"}\n${account.evidenceId ?? "UNAVAILABLE"}\n${account.evidenceHash ?? "UNAVAILABLE"}`],
    ])),
    ...d.narrative.conclusions.map(row => [`Conclusion / ${row.kind}`, row.text]),
    ...d.narrative.actions.map(row => [`Agreed action / ${row.kind}`, `${row.title}\nOwner: ${row.ownerId}\nDue (UTC): ${row.dueAt}`]),
  ]
}
export function renderAdvisoryExport(pack: Canonical, format: "json" | "csv" | "pdf", contentHash: string, watermarkId: string) {
  const rows = [...advisoryExportRows(pack), ["Canonical hash", contentHash], ["Watermark", watermarkId]]
  let bytes: Buffer, mimeType: string
  if (format === "json") { bytes = Buffer.from(JSON.stringify(pack, null, 2)); mimeType = "application/json" }
  else if (format === "csv") { bytes = Buffer.from(rows.map(row => row.map(safeCsvValue).join(",")).join("\r\n")); mimeType = "text/csv;charset=utf-8" }
  else {
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
    doc.setCreationDate(new Date(pack.document.deliveredAt!)); doc.setFileId(contentHash.slice(7, 39).toUpperCase())
    doc.setProperties({ title: "Stoquify client advisory pack", creator: "Stoquify" })
    doc.setFontSize(17); doc.text("Client advisory pack / Conseil client", 14, 18)
    doc.setFontSize(10); doc.text(pack.freshness === "CURRENT" ? "Historical delivery - source match at export" : "REVIEW REQUIRED - SOURCES OR REVIEW CHANGED", 14, 26)
    autoTable(doc, { startY: 32, head: [["Evidence / decision", "Retained observation"]], body: rows,
      tableWidth: 181, styles: { fontSize: 9, overflow: "linebreak", cellPadding: 2 }, columnStyles: { 0: { cellWidth: 49 }, 1: { cellWidth: 132 } },
      headStyles: { fillColor: [25, 57, 83] }, margin: { bottom: 19 },
      didDrawPage: () => { doc.setFontSize(8); doc.text(`${pack.freshness} | Historical advisory | ${doc.getNumberOfPages()}`, 14, 287) } })
    bytes = Buffer.from(doc.output("arraybuffer")); mimeType = "application/pdf"
  }
  return { fileName: `stoquify-advisory-${pack.revisionId}-${pack.freshness.toLowerCase()}.${format}`, mimeType,
    contentBase64: bytes.toString("base64"), byteLength: bytes.length, artifactHash: `sha256:${createHash("sha256").update(bytes).digest("hex")}` }
}
