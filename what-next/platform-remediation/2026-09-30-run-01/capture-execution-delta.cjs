const fs = require('node:fs')
const path = require('node:path')
const cp = require('node:child_process')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '../../..')
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline.json'), 'utf8'))
const scopes = ['app', 'actions', 'components', 'config', 'hooks', 'lib', 'services', 'prisma', 'scripts', 'jest.config.ts', 'jest.setup.ts', 'tsconfig.json', 'next.config.mjs', 'package.json', 'package-lock.json']
const files = cp.execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...scopes], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\0').filter(Boolean)
const current = {}
for (const file of new Set(files)) {
  const full = path.join(root, file)
  if (fs.existsSync(full) && fs.statSync(full).isFile()) current[file] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')
}
const changes = [...new Set([...Object.keys(baseline.files), ...Object.keys(current)])].sort()
  .filter(file => baseline.files[file] !== current[file])
  .map(file => ({ file, change: !baseline.files[file] ? 'added' : !current[file] ? 'removed' : 'modified', beforeSha256: baseline.files[file] || null, afterSha256: current[file] || null }))
const declaredTaskPaths = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'declared-task-paths.json'), 'utf8')))
const check = cp.spawnSync('git', ['diff', '--check', '--', ...changes.map(item => item.file), 'docs/operations/runbooks/RUNBOOK.md'], { cwd: root, encoding: 'utf8', shell: false, windowsHide: true })
const result = {
  capturedAt: new Date().toISOString(), baselineCapturedAt: baseline.capturedAt,
  baselineHead: baseline.head, baselineSourceFileCount: Object.keys(baseline.files).length,
  currentSourceFileCount: Object.keys(current).length, changes,
  declaredTaskChanges: changes.filter(item => declaredTaskPaths.has(item.file)),
  unattributedWorkspaceChanges: changes.filter(item => !declaredTaskPaths.has(item.file)),
  attributionNote: 'Only the 35 reviewed paths in declared-task-paths.json are attributed to this team. Other paths changed after the baseline are preserved and are not claimed as this remediation batch\'s implementation. Changes after the build are not covered by its validation.',
  documentationOutsideBaseline: ['docs/operations/runbooks/RUNBOOK.md', 'what-next/platform-remediation/2026-09-30-run-01/'],
  limitations: ['The original checkout already contained extensive user changes; these hashes compare to this execution baseline, not HEAD.', 'Documentation and verification artifacts outside baseline scopes are listed separately.', 'A baseline delta is not a claim of exclusive authorship if another process edited the same files.'],
  whitespaceCheck: { exitCode: check.status, output: (check.stdout || '') + (check.stderr || '') },
}
fs.writeFileSync(path.join(__dirname, 'execution-delta.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ changedFiles: changes.length, removedFiles: changes.filter(item => item.change === 'removed').length, whitespaceCheckExitCode: check.status }))
if (check.status !== 0) process.exitCode = 1
