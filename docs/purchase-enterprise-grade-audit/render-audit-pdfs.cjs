const fs = require("node:fs/promises")
const path = require("node:path")
const { pathToFileURL } = require("node:url")
const { marked } = require("marked")
const { chromium } = require("playwright")

const auditDir = __dirname
const sourceFiles = [
  "01-executed-audit-prompt.md",
  "02-purchase-enterprise-grade-audit-report.md",
  "03-evidence-and-verification-ledger.md",
]

const css = `
  @page { size: A4; margin: 17mm 14mm 18mm; }
  * { box-sizing: border-box; }
  html { color: #172033; background: #ffffff; font-family: "Segoe UI", Arial, sans-serif; }
  body { margin: 0; font-size: 9.2pt; line-height: 1.46; }
  body::before {
    content: "STOQUIFY  /  PURCHASE ENTERPRISE READINESS";
    display: block; margin: -3mm 0 8mm; padding: 3.2mm 4mm;
    color: #d9f7ef; background: linear-gradient(90deg, #0d2033, #123b47);
    border-left: 4px solid #f2c94c; border-radius: 2px;
    font-size: 7.5pt; font-weight: 700; letter-spacing: 1.35px;
  }
  h1, h2, h3, h4 { color: #10263a; page-break-after: avoid; break-after: avoid-page; }
  h1 { margin: 0 0 6mm; font-size: 23pt; line-height: 1.12; letter-spacing: -0.45px; }
  h2 { margin: 8mm 0 3mm; padding-bottom: 1.5mm; border-bottom: 1.5px solid #c8d8de; font-size: 15pt; }
  h3 { margin: 6mm 0 2.5mm; color: #0d5960; font-size: 11.5pt; }
  h4 { margin: 4mm 0 2mm; font-size: 10pt; }
  p { margin: 0 0 3mm; orphans: 3; widows: 3; }
  ul, ol { margin: 1.5mm 0 3.5mm 5mm; padding-left: 4mm; }
  li { margin: 0 0 1.3mm; }
  strong { color: #0b3042; }
  a { color: #0b6970; text-decoration: none; }
  blockquote { margin: 4mm 0; padding: 3mm 4mm; border-left: 3px solid #26a69a; background: #eff8f7; }
  code { padding: 0.25mm 0.8mm; color: #17394b; background: #eef3f5; border-radius: 2px; font-family: Consolas, "Courier New", monospace; font-size: 8pt; overflow-wrap: anywhere; }
  pre { margin: 3mm 0 5mm; padding: 3.5mm; color: #eaf7f5; background: #0c2433; border-radius: 4px; white-space: pre-wrap; overflow-wrap: anywhere; page-break-inside: avoid; }
  pre code { padding: 0; color: inherit; background: transparent; }
  table { width: 100%; margin: 3mm 0 6mm; border-collapse: collapse; table-layout: fixed; font-size: 7.8pt; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th, td { padding: 2.1mm 2.3mm; border: 0.5px solid #cdd9dd; vertical-align: top; overflow-wrap: anywhere; }
  th { color: #ffffff; background: #174957; text-align: left; font-weight: 700; }
  tbody tr:nth-child(even) td { background: #f5f8f8; }
  table th:first-child:nth-last-child(2), table th:first-child:nth-last-child(2) ~ th { width: auto; }
  img { display: block; max-width: 100%; max-height: 205mm; margin: 4mm auto 6mm; border: 1px solid #c4d2d7; border-radius: 4px; }
  hr { margin: 7mm 0; border: 0; border-top: 1px solid #c8d8de; }
  .meta { color: #47576a; }
`

async function embedLocalImages(html, markdownDir) {
  const matches = [...html.matchAll(/<img([^>]*?)src="([^"]+)"([^>]*?)>/g)]
  let output = html
  for (const match of matches) {
    const src = match[2]
    if (/^(data:|https?:)/i.test(src)) continue
    const imagePath = path.resolve(markdownDir, decodeURIComponent(src))
    const bytes = await fs.readFile(imagePath)
    const extension = path.extname(imagePath).toLowerCase()
    const mime = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png"
    output = output.replace(match[0], `<img${match[1]}src="data:${mime};base64,${bytes.toString("base64")}"${match[3]}>`)
  }
  return output
}

async function render(browser, sourceName) {
  const sourcePath = path.join(auditDir, sourceName)
  const markdown = await fs.readFile(sourcePath, "utf8")
  const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(sourceName, ".md")
  const body = await embedLocalImages(marked.parse(markdown), auditDir)
  const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${pathToFileURL(auditDir + path.sep)}"><title>${firstHeading}</title><style>${css}</style></head><body>${body}</body></html>`
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.setContent(html, { waitUntil: "load" })
  await page.emulateMedia({ media: "print" })
  const outputPath = sourcePath.replace(/\.md$/i, ".pdf")
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="width:100%;font:7px 'Segoe UI',Arial;color:#61717e;padding:0 14mm;text-align:right;">Stoquify · Evidence-led audit · 2026-08-17</div>`,
    footerTemplate: `<div style="width:100%;font:7px 'Segoe UI',Arial;color:#61717e;padding:0 14mm;display:flex;justify-content:space-between;"><span>${firstHeading}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin: { top: "17mm", right: "14mm", bottom: "18mm", left: "14mm" },
  })
  await page.close()
  return outputPath
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const sourceName of sourceFiles) {
      const output = await render(browser, sourceName)
      console.log(path.relative(process.cwd(), output))
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
