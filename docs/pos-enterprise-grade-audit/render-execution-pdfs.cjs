const fs = require("node:fs/promises")
const path = require("node:path")
const { marked } = require("marked")
const { chromium } = require("playwright")

const auditDir = __dirname
const defaultSourceFiles = [
  "EXECUTION_00_M0_G0_REPORT.md",
  "EXECUTION_00_CONTRACT_AND_CONTROL_FREEZE.md",
  "EXECUTION_00_APPROVAL_PACKET.md",
  "EXECUTION_00_MIGRATION_DISPOSITION_REVIEW.md",
  "EXECUTION_02_M2_CLIENT_COMMIT_REPLAY_REPORT.md",
]
const requestedSourceFiles = process.argv.slice(2)
const sourceFiles = requestedSourceFiles.length > 0 ? requestedSourceFiles : defaultSourceFiles

const css = `
  @page { size: A4; margin: 18mm 14mm 18mm; }
  * { box-sizing: border-box; }
  html { color: #172033; background: #fff; font-family: "Segoe UI", Arial, sans-serif; }
  body { margin: 0; font-size: 9.2pt; line-height: 1.46; }
  body::before { content: "STOQUIFY / POS & SALES-TO-CASH EXECUTION"; display: block; margin: -3mm 0 8mm; padding: 3.2mm 4mm; color: #d9f7ef; background: linear-gradient(90deg,#0d2033,#123b47); border-left: 4px solid #f2c94c; border-radius: 2px; font-size: 7.5pt; font-weight: 700; letter-spacing: 1.2px; }
  h1,h2,h3,h4 { color: #10263a; break-after: avoid-page; }
  h1 { margin: 0 0 6mm; font-size: 22pt; line-height: 1.12; }
  h2 { margin: 8mm 0 3mm; padding-bottom: 1.5mm; border-bottom: 1.5px solid #c8d8de; font-size: 15pt; }
  h3 { margin: 6mm 0 2.5mm; color: #0d5960; font-size: 11.5pt; }
  p { margin: 0 0 3mm; orphans: 3; widows: 3; }
  ul,ol { margin: 1.5mm 0 3.5mm 5mm; padding-left: 4mm; }
  li { margin-bottom: 1.2mm; }
  code { padding: .25mm .8mm; color: #17394b; background: #eef3f5; border-radius: 2px; font: 8pt Consolas, monospace; overflow-wrap: anywhere; }
  pre { margin: 3mm 0 5mm; padding: 3.5mm; color: #eaf7f5; background: #0c2433; border-radius: 4px; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
  pre code { padding: 0; color: inherit; background: transparent; }
  table { width: 100%; margin: 3mm 0 6mm; border-collapse: collapse; table-layout: fixed; font-size: 7.8pt; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th,td { padding: 2.1mm 2.3mm; border: .5px solid #cdd9dd; vertical-align: top; overflow-wrap: anywhere; }
  th { color: #fff; background: #174957; text-align: left; }
  tbody tr:nth-child(even) td { background: #f5f8f8; }
`

async function render(browser, sourceName) {
  const sourcePath = path.join(auditDir, sourceName)
  const markdown = await fs.readFile(sourcePath, "utf8")
  const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(sourceName, ".md")
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${marked.parse(markdown)}</body></html>`, { waitUntil: "load" })
  await page.emulateMedia({ media: "print" })
  const outputPath = sourcePath.replace(/\.md$/i, ".pdf")
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="width:100%;font:7px 'Segoe UI',Arial;color:#61717e;padding:0 14mm;text-align:right;">Stoquify · Gated execution · 2026-08-17</div>`,
    footerTemplate: `<div style="width:100%;font:7px 'Segoe UI',Arial;color:#61717e;padding:0 14mm;display:flex;justify-content:space-between;"><span>${title}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin: { top: "18mm", right: "14mm", bottom: "18mm", left: "14mm" },
  })
  await page.close()
  return outputPath
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const source of sourceFiles) console.log(path.relative(process.cwd(), await render(browser, source)))
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
