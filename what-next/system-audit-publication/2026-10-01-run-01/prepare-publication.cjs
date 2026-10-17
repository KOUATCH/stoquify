const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '../../..')
const destination = path.join(root, 'docs/system-audit')
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const groups = [
  { name: 'Latest implementation records', directory: 'what-next/platform-remediation/2026-09-30-run-01', files: [
    ['EXECUTION_REPORT.md', 'Implementation results and release blockers'],
    ['EXECUTION_REGISTER.md', 'Current 38-package execution register'],
  ] },
  { name: 'Comprehensive roadmap snapshot', directory: 'docs/prompt-execution', files: [
    ['01_REFINED_PROMPT.md', 'Roadmap preparation prompt'],
    ['02_EXECUTION_REPORT.md', 'Roadmap preparation report'],
    ['03_EXECUTION_FINDINGS_AND_RISKS.md', 'Planning findings and risks'],
    ['04_IMPLEMENTATION_ROADMAP.md', 'Comprehensive implementation roadmap'],
    ['05_ROADMAP_EXECUTIVE_SUMMARY.md', 'Roadmap executive summary'],
  ] },
  { name: 'Original assessment snapshot', directory: 'what-next/platform-correctness-audit/2026-09-30-run-01', files: [
    ['executive-assessment.md', 'Platform correctness assessment'],
    ['findings.md', 'Detailed audit findings'],
    ['schema-assessment.md', 'Database schema assessment'],
    ['architecture-and-workflows.md', 'Architecture and workflow assessment'],
    ['bi-capability-matrix.md', 'Business intelligence capability matrix'],
    ['review-lens-register.md', 'Multidisciplinary review coverage'],
    ['verification-summary.md', 'Audit verification summary'],
    ['concurrent-changes-and-rechecks.md', 'Concurrent changes and bounded rechecks'],
    ['remediation-roadmap.md', 'Historical W00-W11 sequence (expanded by R00-R37 roadmap)'],
    ['evidence-index.md', 'Audit evidence index'],
    ['external-source-register.md', 'External source provenance'],
  ] },
]
const sources = groups.flatMap(group => group.files.map(([name, title]) => ({
  source: `${group.directory}/${name}`, name, title, group: group.name,
  sha256: sha(fs.readFileSync(path.join(root, group.directory, name))),
})))
if (new Set(sources.map(item => item.name.toLowerCase())).size !== sources.length) throw new Error('Duplicate report basename')
for (const item of sources) {
  const target = path.join(destination, item.name)
  if (fs.existsSync(target) && sha(fs.readFileSync(target)) !== item.sha256) throw new Error(`Conflicting existing report: ${item.name}`)
}
const prior = fs.readdirSync(destination, { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => {
  const bytes = fs.readFileSync(path.join(destination, entry.name))
  return { name: entry.name, bytes: bytes.length, sha256: sha(bytes) }
})
const baselineFile = path.join(__dirname, 'publication-baseline.json')
if (fs.existsSync(baselineFile)) throw new Error('Publication baseline already exists; do not overwrite historical evidence')
fs.writeFileSync(baselineFile, JSON.stringify({ capturedAt: new Date().toISOString(), destination: 'docs/system-audit', sources, prior }, null, 2) + '\n')
const indexName = 'SYSTEM_AUDIT_PUBLICATION_2026-10-01.md'
const text = [
  '# Stoquify system audit publication', '',
  '**Published:** 1 October 2026. **Report snapshots:** 30 September 2026. **Destination:** `docs/system-audit/`.', '',
  'This archive brings together the original assessment, the comprehensive roadmap and the subsequent first implementation batch. The eighteen source reports retain their original basenames and exact Markdown content. This publication does not rerun the system audit or application verification.', '',
  '## Read the implementation records first', '',
  'The latest recorded state is **roadmap in progress; release blocked**. The execution register contains 38 packages: twelve PARTIAL, twenty-two NOT_STARTED in that batch and four CONDITIONAL_NOT_STARTED. No package is certified complete. These labels describe the execution batch, not an assertion that the underlying platform lacks those capabilities.', '',
  'The implementation records describe accounting, offline durability, close checks, database guards, seed corrections and verification work. The normal application build and attempted standalone packaging recovery failed at packaging qualification. Evidence applies to the recorded candidate; concurrent checkout changes require fresh integrated validation. No source-database migration or production deployment was performed.', '',
  'The earlier roadmap documents correctly describe a planning-only task, and the original audit records earlier failures. Those statements are preserved as historical snapshots. Use EXECUTION_REPORT and EXECUTION_REGISTER for later implementation results and remaining actions; do not interpret the planning snapshots as the current execution status. The earlier W00-W11 remediation sequence is superseded for execution scheduling by the expanded R00-R37 roadmap.', '',
  '## Published report pairs and canonical sources', '',
  'Each report below is available in matching Markdown and PDF. For evidence navigation, use the canonical source: the unchanged archived Markdown may contain relative evidence paths that are meaningful only in its original directory. PDFs are readable snapshots; linked supporting files remain in the repository and are not embedded.', '',
  ...groups.flatMap(group => [
    `### ${group.name}`, '', '| Report | Markdown | PDF | Canonical source |', '|---|---|---|---|',
    ...sources.filter(item => item.group === group.name).map(item => {
      const original = path.relative(destination, path.join(root, item.source)).replace(/\\/g, '/')
      return `| ${item.title} | [Read](${item.name}) | [PDF](${item.name.replace(/\.md$/, '.pdf')}) | [Original](${original}) |`
    }), '',
  ]),
  '## Publication boundaries', '',
  'Previously archived July and August reports remain in this folder as separate historical records. The bundled publisher regenerates PDFs for every Markdown report in the destination. Supporting JSON, CSV, logs, database receipts and scripts stay in their canonical evidence directories. No application, configuration, database, migration or release state is changed by this publication.', '',
  'Publication validation and PDF inspection receipts are retained in `what-next/system-audit-publication/2026-10-01-run-01/`.', '',
].join('\n')
fs.writeFileSync(path.join(destination, indexName), text)
fs.writeFileSync(path.join(__dirname, 'publication-inputs.json'), JSON.stringify({ sources: sources.map(item => item.source), indexName, indexSha256: sha(Buffer.from(text)) }, null, 2) + '\n')
console.log(JSON.stringify({ sourceReports: sources.length, newIndex: indexName, existingMarkdown: prior.filter(item => item.name.endsWith('.md')).length, destination: 'docs/system-audit' }))
