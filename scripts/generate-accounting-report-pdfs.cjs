const fs = require("fs")
const path = require("path")
const { marked } = require("marked")
const { chromium } = require("playwright")

const root = path.resolve(__dirname, "..")
const outputDir = path.join(root, "docs", "trial-balance")

const reports = [
  {
    source: "what-next/accounting/trial-balance-ui-2026-08-01/TRIAL_BALANCE_UI_REFINEMENT_REPORT_2026-08-01.md",
    output: "01-trial-balance-ui-refinement-report-2026-08-01.pdf",
    subtitle: "Trial Balance presentation, pagination, accessibility, and verification",
    images: [
      ["Desktop evidence", "what-next/accounting/trial-balance-ui-2026-08-01/desktop.png"],
      ["Tablet evidence", "what-next/accounting/trial-balance-ui-2026-08-01/tablet.png"],
      ["Mobile evidence", "what-next/accounting/trial-balance-ui-2026-08-01/mobile.png"],
    ],
  },
  {
    source: "what-next/accounting-financial-reporting-suite-execution-prompt-2026-08-01.md",
    output: "02-financial-reporting-execution-prompt-2026-08-01.pdf",
    subtitle: "Ledger-backed Profit & Loss, management EBITDA, and Balance Sheet execution contract",
    images: [],
  },
  {
    source: "what-next/accounting-financial-reporting-suite-implementation-2026-08-01.md",
    output: "03-financial-reporting-implementation-report-2026-08-01.pdf",
    subtitle: "Implemented accounting reports, trust controls, and verification evidence",
    images: [
      ["Desktop evidence", "what-next/evidence/accounting-financial-reports-2026-08-01/desktop.png"],
      ["Mobile evidence", "what-next/evidence/accounting-financial-reports-2026-08-01/mobile.png"],
    ],
  },
]

const styles = [
  ":root{--ink:#142033;--muted:#59677a;--line:#dce3eb;--brand:#2f7df6;--brand-dark:#1658ba;--soft:#edf4ff}",
  "@page{size:A4}",
  "*{box-sizing:border-box}",
  "body{margin:0;color:var(--ink);font-family:Segoe UI,Arial,sans-serif;font-size:10.2pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
  ".cover{min-height:245mm;padding:28mm 18mm 20mm;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;background:radial-gradient(circle at 90% 8%,rgba(47,125,246,.22),transparent 32%),linear-gradient(160deg,#f7faff 0%,#fff 62%)}",
  ".brand{color:var(--brand-dark);font-size:11pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase}",
  ".cover h1{margin:34mm 0 8mm;color:#0e1c31;font-size:31pt;line-height:1.08;letter-spacing:-.03em}",
  ".subtitle{max-width:145mm;color:var(--muted);font-size:14pt;line-height:1.45}",
  ".cover-meta{border-top:1px solid var(--line);padding-top:7mm;color:var(--muted);display:flex;justify-content:space-between;font-size:9pt}",
  "article,.evidence{padding:0 2mm}",
  "h1{margin:0 0 7mm;color:#102542;font-size:23pt;line-height:1.15;letter-spacing:-.02em;page-break-after:avoid}",
  "h2{margin:9mm 0 3mm;padding-bottom:2mm;border-bottom:1px solid var(--line);color:#143866;font-size:15pt;line-height:1.25;page-break-after:avoid}",
  "h3{margin:6mm 0 2mm;color:#1d4f8f;font-size:11.5pt;page-break-after:avoid}",
  "p{margin:0 0 3mm;orphans:3;widows:3}",
  ".lede{color:var(--muted);font-size:11pt}",
  "ul,ol{margin:2mm 0 4mm 6mm;padding-left:5mm}",
  "li{margin:1mm 0}",
  "strong{color:#0d2748}",
  "a{color:var(--brand-dark);text-decoration:none;overflow-wrap:anywhere}",
  "code{border-radius:3px;background:#eef2f7;color:#0e3b70;padding:.2mm 1mm;font-family:Consolas,Courier New,monospace;font-size:8.5pt;overflow-wrap:anywhere}",
  "pre{margin:4mm 0;border:1px solid #cbd8e7;border-left:3px solid var(--brand);border-radius:5px;background:#f5f8fc;padding:4mm;white-space:pre-wrap;overflow-wrap:anywhere;page-break-inside:auto}",
  "pre code{padding:0;background:transparent;color:#1a2d45}",
  "blockquote{margin:4mm 0;border-left:3px solid var(--brand);background:var(--soft);padding:3mm 4mm;color:#284a73}",
  "table{width:100%;margin:4mm 0 6mm;border-collapse:collapse;font-size:8.8pt;page-break-inside:auto}",
  "thead{display:table-header-group}",
  "tr{page-break-inside:avoid}",
  "th{background:#eaf2fd;color:#173c6b;text-align:left;font-weight:700}",
  "th,td{border:1px solid #cfd9e5;padding:2.2mm 2.5mm;vertical-align:top}",
  "hr{border:0;border-top:1px solid var(--line);margin:7mm 0}",
  ".evidence{page-break-before:always}",
  ".evidence figure{margin:0 0 8mm;page-break-before:always;page-break-inside:avoid}",
  ".evidence figure:first-of-type{page-break-before:auto}",
  ".evidence figcaption{margin-bottom:3mm;color:#143866;font-size:14pt;font-weight:700}",
  ".evidence img{display:block;width:100%;max-height:220mm;object-fit:contain;object-position:top center;border:1px solid #cfd9e5;border-radius:5px;background:#f6f8fb}",
  ".source-path{margin-top:2mm;color:var(--muted);font-size:7.8pt;overflow-wrap:anywhere}",
].join("\n")

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character])
}

function imageData(relativePath) {
  return "data:image/png;base64," + fs.readFileSync(path.join(root, relativePath)).toString("base64")
}

function evidenceHtml(images) {
  if (!images.length) return ""

  return [
    '<section class="evidence">',
    "<h1>Browser Evidence</h1>",
    '<p class="lede">Authenticated responsive captures retained with source implementation evidence.</p>',
    ...images.map(([label, relativePath]) => [
      "<figure>",
      "<figcaption>" + escapeHtml(label) + "</figcaption>",
      '<img src="' + imageData(relativePath) + '" alt="' + escapeHtml(label) + '"/>',
      '<div class="source-path">' + escapeHtml(relativePath) + "</div>",
      "</figure>",
    ].join("")),
    "</section>",
  ].join("")
}

async function generate() {
  fs.mkdirSync(outputDir, { recursive: true })
  marked.setOptions({ gfm: true, breaks: false })
  const browser = await chromium.launch({ headless: true })
  const results = []

  try {
    for (const report of reports) {
      const markdown = fs.readFileSync(path.join(root, report.source), "utf8")
      const titleMatch = markdown.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1].trim() : path.basename(report.source, ".md")
      const bodyMarkdown = titleMatch ? markdown.replace(/^#\s+.+\r?\n/, "") : markdown
      const body = marked.parse(bodyMarkdown)
      const html = [
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>",
        escapeHtml(title),
        "</title><style>",
        styles,
        "</style></head><body>",
        '<section class="cover"><div><div class="brand">Stoquify · Accounting Reports</div><h1>',
        escapeHtml(title),
        '</h1><div class="subtitle">',
        escapeHtml(report.subtitle),
        '</div></div><div class="cover-meta"><span>Generated 2026-08-02</span><span>Internal project documentation</span></div></section>',
        "<main><article>",
        body,
        "</article>",
        evidenceHtml(report.images),
        "</main></body></html>",
      ].join("")

      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: "load" })
      await page.emulateMedia({ media: "print" })
      const outputPath = path.join(outputDir, report.output)
      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
        headerTemplate: '<div style="width:100%;font:8px Segoe UI,Arial;color:#6b7788;padding:0 16mm;text-align:right;">Stoquify · Accounting Reports</div>',
        footerTemplate: '<div style="width:100%;font:8px Segoe UI,Arial;color:#6b7788;padding:0 16mm;display:flex;justify-content:space-between;"><span>Internal documentation</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      })
      results.push({ output: report.output, bytes: fs.statSync(outputPath).size })
      await page.close()
    }
  } finally {
    await browser.close()
  }

  process.stdout.write(JSON.stringify(results, null, 2))
}

generate().catch((error) => {
  console.error(error)
  process.exit(1)
})
