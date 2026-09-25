#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import MarkdownIt from "markdown-it";
import { chromium } from "playwright";

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

async function isDirectory(candidate) {
  try {
    return (await fs.stat(candidate)).isDirectory();
  } catch {
    return false;
  }
}

async function findRepositoryRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (await isDirectory(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Could not find a repository root containing .git");
    }
    current = parent;
  }
}

function validateSubfolder(value) {
  if (!value || path.isAbsolute(value)) {
    throw new Error("docs_subfolder must be a non-empty relative path beneath docs/");
  }

  const portable = value.replaceAll("\\", "/").replace(/\/+$/, "");
  const segments = portable.split("/");
  if (
    segments.length === 0 ||
    segments[0].toLowerCase() === "docs" ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(
      "Supply only a docs subfolder, without a docs/ prefix or dot path segments",
    );
  }
  return segments.join(path.sep);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function documentHtml(markdown, title, baseHref) {
  const renderer = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
  });
  const body = renderer.render(markdown);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="${escapeHtml(baseHref)}">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #18212f;
      background: #fff;
      font: 10.5pt/1.48 "Segoe UI", Arial, sans-serif;
      overflow-wrap: anywhere;
    }
    h1, h2, h3, h4 { color: #102a43; line-height: 1.2; break-after: avoid-page; }
    h1 { margin: 0 0 14pt; padding-bottom: 7pt; border-bottom: 2px solid #2563eb; font-size: 24pt; }
    h2 { margin: 20pt 0 8pt; font-size: 17pt; }
    h3 { margin: 15pt 0 6pt; font-size: 13.5pt; }
    h4 { margin: 12pt 0 5pt; font-size: 11.5pt; }
    p, ul, ol, blockquote, table, pre { margin: 0 0 9pt; }
    li { margin: 2pt 0; }
    a { color: #1d4ed8; text-decoration: none; }
    blockquote { margin-left: 0; padding: 7pt 10pt; border-left: 3px solid #60a5fa; background: #eff6ff; }
    code { padding: 1pt 3pt; border-radius: 3px; background: #f1f5f9; font: 9pt Consolas, monospace; }
    pre { padding: 9pt; border: 1px solid #dbe4ee; border-radius: 5px; background: #f8fafc; white-space: pre-wrap; break-inside: avoid-page; }
    pre code { padding: 0; background: transparent; }
    table { width: 100%; border-collapse: collapse; font-size: 8.4pt; }
    thead { display: table-header-group; }
    tr { break-inside: avoid-page; }
    th, td { padding: 5pt 6pt; border: 1px solid #cbd5e1; vertical-align: top; }
    th { color: #0f2742; background: #eaf2fb; text-align: left; }
    img { max-width: 100%; height: auto; break-inside: avoid-page; }
    hr { margin: 16pt 0; border: 0; border-top: 1px solid #cbd5e1; }
    @media print {
      a { color: inherit; }
      h1, h2, h3, h4, img, pre, blockquote { break-inside: avoid-page; }
    }
  </style>
</head>
<body>${body}</body>
</html>`;
}

async function validatePdf(pdfPath) {
  const bytes = await fs.readFile(pdfPath);
  if (bytes.length < 1024 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error(`PDF validation failed for ${pdfPath}`);
  }
}

async function main() {
  const [subfolderArg, ...sourceArgs] = process.argv.slice(2);
  const subfolder = validateSubfolder(subfolderArg);
  const repositoryRoot = await findRepositoryRoot(process.cwd());
  const docsRoot = path.resolve(repositoryRoot, "docs");
  const destination = path.resolve(docsRoot, subfolder);
  const docsPrefix = `${docsRoot}${path.sep}`;

  if (!destination.startsWith(docsPrefix)) {
    throw new Error("Resolved destination is outside the repository docs directory");
  }

  await fs.mkdir(destination, { recursive: true });

  const seenBasenames = new Set();
  for (const sourceArg of sourceArgs) {
    const source = path.resolve(repositoryRoot, sourceArg);
    if (path.extname(source).toLowerCase() !== ".md") {
      throw new Error(`Only Markdown report sources are supported: ${sourceArg}`);
    }
    const sourceStat = await fs.stat(source);
    if (!sourceStat.isFile()) {
      throw new Error(`Report source is not a file: ${sourceArg}`);
    }
    const basename = path.basename(source);
    const basenameKey = basename.toLowerCase();
    if (seenBasenames.has(basenameKey)) {
      throw new Error(`Duplicate report basename: ${basename}`);
    }
    seenBasenames.add(basenameKey);
    const target = path.join(destination, basename);
    if (path.resolve(source) !== path.resolve(target)) {
      await fs.copyFile(source, target);
    }
  }

  const markdownFiles = (await fs.readdir(destination, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".md")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (markdownFiles.length === 0) {
    throw new Error(`No Markdown reports found in ${path.relative(repositoryRoot, destination)}`);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const markdownName of markdownFiles) {
      const markdownPath = path.join(destination, markdownName);
      const pdfPath = path.join(destination, `${path.parse(markdownName).name}.pdf`);
      const temporaryPdfPath = `${pdfPath}.tmp`;
      const markdown = await fs.readFile(markdownPath, "utf8");
      const page = await browser.newPage();
      try {
        await page.setContent(
          documentHtml(
            markdown,
            path.parse(markdownName).name,
            pathToFileURL(`${destination}${path.sep}`).href,
          ),
          { waitUntil: "load" },
        );
        await page.emulateMedia({ media: "print" });
        await page.pdf({
          path: temporaryPdfPath,
          format: "A4",
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate:
            '<div style="width:100%;font-size:8px;color:#64748b;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
          margin: { top: "16mm", right: "14mm", bottom: "17mm", left: "14mm" },
        });
        await validatePdf(temporaryPdfPath);
        await fs.rename(temporaryPdfPath, pdfPath);
      } finally {
        await page.close();
        await fs.rm(temporaryPdfPath, { force: true });
      }
    }
  } finally {
    await browser.close();
  }

  for (const markdownName of markdownFiles) {
    const pdfName = `${path.parse(markdownName).name}.pdf`;
    await validatePdf(path.join(destination, pdfName));
  }

  console.log(`Published ${markdownFiles.length} report pair(s) to ${path.relative(repositoryRoot, destination)}`);
  for (const markdownName of markdownFiles) {
    console.log(`- ${markdownName}`);
    console.log(`- ${path.parse(markdownName).name}.pdf`);
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
