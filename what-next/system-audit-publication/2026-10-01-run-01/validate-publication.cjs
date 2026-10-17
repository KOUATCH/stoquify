const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '../../..')
const destination = path.join(root, 'docs/system-audit')
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8').replace(/^\uFEFF/, ''))
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const baseline = read('publication-baseline.json')
const inputs = read('publication-inputs.json')
const command = read('publisher-result.json')
const errors = []
if (command.exitCode !== 0) errors.push('Publisher did not exit successfully')
const sourceCopies = baseline.sources.map(item => {
  const originalHash = sha(fs.readFileSync(path.join(root, item.source)))
  const copiedHash = sha(fs.readFileSync(path.join(destination, item.name)))
  const unchanged = originalHash === item.sha256 && copiedHash === item.sha256
  if (!unchanged) errors.push(`Source or copy differs: ${item.name}`)
  return { name: item.name, source: item.source, sha256: item.sha256, unchanged }
})
const preservedPrior = baseline.prior.filter(item => !item.name.endsWith('.pdf')).map(item => {
  const unchanged = sha(fs.readFileSync(path.join(destination, item.name))) === item.sha256
  if (!unchanged) errors.push(`Prior non-PDF artifact changed: ${item.name}`)
  return { name: item.name, unchanged }
})
const entries = fs.readdirSync(destination, { withFileTypes: true }).filter(item => item.isFile()).map(item => item.name)
const pairs = entries.filter(name => name.endsWith('.md')).sort().map(markdown => {
  const pdf = markdown.replace(/\.md$/, '.pdf')
  const bytes = fs.existsSync(path.join(destination, pdf)) ? fs.readFileSync(path.join(destination, pdf)) : Buffer.alloc(0)
  const validPdf = bytes.length >= 1024 && bytes.subarray(0, 5).toString('ascii') === '%PDF-'
  if (!validPdf) errors.push(`Invalid/missing PDF: ${pdf}`)
  return { markdown, pdf, pdfBytes: bytes.length, pdfSha256: sha(bytes), validPdf }
})
const expectedCount = baseline.prior.filter(item => item.name.endsWith('.md')).length + baseline.sources.length + 1
if (pairs.length !== expectedCount) errors.push(`Expected ${expectedCount} pairs, got ${pairs.length}`)
if (entries.some(name => /\.(html?|tmp)$/i.test(name))) errors.push('Unexpected intermediary in destination')
const index = fs.readFileSync(path.join(destination, inputs.indexName))
if (sha(index) !== inputs.indexSha256) errors.push('Index changed during publication')
let indexLinks = 0
for (const match of index.toString('utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
  indexLinks++
  if (!fs.existsSync(path.resolve(destination, match[1]))) errors.push(`Missing index link: ${match[1]}`)
}
const result = {
  checkedAt: new Date().toISOString(), status: errors.length ? 'FAILED' : 'PASS', destination: 'docs/system-audit',
  publisherExitCode: command.exitCode, sourceReportsCopied: sourceCopies.length, newIndexPairs: 1,
  sourceCopiesUnchanged: sourceCopies.every(item => item.unchanged), priorNonPdfArtifactsUnchanged: preservedPrior.every(item => item.unchanged),
  pairCount: pairs.length, indexLinks, noIntermediates: !entries.some(name => /\.(html?|tmp)$/i.test(name)),
  scope: 'Publication integrity only; no system re-audit or implementation qualification', sourceCopies, preservedPrior, pairs, errors,
}
fs.writeFileSync(path.join(__dirname, 'publication-validation.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ status: result.status, sourceReportsCopied: result.sourceReportsCopied, pairCount: result.pairCount, indexLinks, unchangedSources: result.sourceCopiesUnchanged, preservedPrior: result.priorNonPdfArtifactsUnchanged, errors }))
if (errors.length) process.exitCode = 1
