const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const { chromium } = require("playwright");

async function main() {
  const [sourcePath, outputPath] = process.argv.slice(2);
  if (!sourcePath || !outputPath) throw new Error("Usage: render-blueprint.cjs <source.md> <output.pdf>");

  const markdown = fs.readFileSync(sourcePath, "utf8");
  const content = marked.parse(markdown, { gfm: true });
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 17mm 16mm 18mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #18202a; font: 9.5pt/1.4 Arial, Helvetica, sans-serif; }
h1 { color: #0c2730; font-size: 24pt; line-height: 1.12; margin: 0 0 8mm; padding-bottom: 4mm; border-bottom: 2px solid #1f7a74; }
h2 { color: #123f49; font-size: 14.5pt; line-height: 1.22; margin: 5mm 0 2.4mm; break-after: avoid; }
h3 { color: #223742; font-size: 11pt; line-height: 1.22; margin: 4mm 0 1.8mm; break-after: avoid; }
p { margin: 0 0 2.5mm; orphans: 3; widows: 3; }
ul, ol { margin: 1.5mm 0 3.5mm 5.5mm; padding-left: 4mm; }
li { margin: 0 0 1mm; }
strong { color: #0c2730; }
code { color: #7d2f2f; background: #f2f5f4; padding: 0.2mm 1mm; border-radius: 2px; font: 8.8pt Consolas, monospace; }
pre { background: #13242b; color: #f3f7f6; padding: 4mm; overflow-wrap: anywhere; white-space: pre-wrap; break-inside: avoid; }
pre code { color: inherit; background: transparent; padding: 0; }
blockquote { margin: 3mm 0; padding: 2.5mm 4mm; border-left: 3px solid #1f7a74; background: #f3f7f6; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0 5mm; font-size: 8.2pt; break-inside: auto; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { color: #fff; background: #123f49; text-align: left; font-weight: 700; padding: 2.4mm 2.6mm; border: 1px solid #123f49; }
td { vertical-align: top; padding: 2.2mm 2.6mm; border: 1px solid #ccd7d6; }
tbody tr:nth-child(even) td { background: #f5f8f7; }
hr { border: 0; border-top: 1px solid #ccd7d6; margin: 6mm 0; }
a { color: #166660; text-decoration: none; }
h1 + p { color: #4b5d65; font-size: 10.8pt; }
</style></head><body>${content}</body></html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div style="font:8px Arial;color:#617078;width:100%;padding:0 16mm;">STOQUIFY MODULE SYSTEM SKILL SUITE</div>',
      footerTemplate: '<div style="font:8px Arial;color:#617078;width:100%;padding:0 16mm;display:flex;justify-content:space-between;"><span>2026-07-14</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      margin: { top: "18mm", right: "15mm", bottom: "18mm", left: "15mm" }
    });
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
