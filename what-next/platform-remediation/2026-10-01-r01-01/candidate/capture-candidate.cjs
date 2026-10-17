const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const cp = require('node:child_process')
const sourceRoot = path.resolve(__dirname, '../../../..')
const treeRoots = ['actions', 'app', 'components', 'config', 'hooks', 'i18n', 'lib', 'services', 'types', 'validations', 'prisma', 'scripts', 'messages', 'public', 'tests', '__tests__', 'src', '.github', 'pages', 'styles', '_legacy-dashboard']
const rootFiles = ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'next.config.mjs', 'postcss.config.mjs', 'tailwind.config.ts', 'prisma.config.ts', 'components.json', 'middleware.ts', 'contries.ts', '.eslintrc.json', '.gitattributes', '.gitignore', 'AGENTS.md', 'tmp-slice25-debug.ts', 'tmp-slice25-debug2.ts']
const supplements = [
  'docs/landing page/current-landing-page-snapshot-2026-07-19',
  'artifacts/stoquify-analytics-network-strategy-site/db/schema.ts',
  'docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUTS_2026-07-25.json',
  'docs/blockers/enterprise-release-external-evidence-intake-2026-07-27.json',
  'docs/skills-life-cycle/skills/stoquify-settings-surface-inventory-classifier/scripts/classify-settings-surfaces.js',
]
function hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex') }
function inside(root, file) {
  const relative = path.relative(root, file)
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}
function excluded(relative) {
  const normalized = relative.replaceAll('\\', '/').toLowerCase()
  const parts = normalized.split('/')
  return parts.some(part => /^(?:node_modules|\.git|\.seed-artifacts|\.auth|coverage|test-results|playwright-report)$/.test(part) || part.startsWith('.next') || part.startsWith('.env') || part === '.example.env' || part === '.neon') || /\.(?:pem|key|pfx|p12|tsbuildinfo|log)$/.test(normalized) || /^public\/(?:uploads|seed-images)(?:\/|$)/.test(normalized)
}
function inventory(root = sourceRoot, { allFiles = false } = {}) {
  const result = new Map(), exclusions = new Set()
  const rootReal = fs.realpathSync(root)
  function visit(relative) {
    if (!allFiles && excluded(relative)) { exclusions.add(relative); return }
    const absolute = path.join(root, relative)
    let stat
    try { stat = fs.lstatSync(absolute) } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }
    if (stat.isSymbolicLink() || !inside(rootReal, fs.realpathSync(absolute))) throw new Error(`Source link or escaping path: ${relative}`)
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute).sort()) visit(`${relative}/${entry}`)
    } else if (stat.isFile()) {
      const bytes = fs.readFileSync(absolute)
      result.set(relative, { path: relative, bytes: bytes.length, sha256: hash(bytes) })
    } else throw new Error(`Unsupported source entry: ${relative}`)
  }
  if (allFiles) {
    for (const name of fs.readdirSync(root).sort()) visit(name)
  } else {
    for (const relative of [...treeRoots, ...rootFiles, ...supplements]) visit(relative)
    for (const name of fs.readdirSync(root).filter(name => /^(?:jest|playwright)[-.].*\.(?:[cm]?js|tsx?|json)$/.test(name))) visit(name)
  }
  return { files: [...result.values()].sort((a,b) => a.path.localeCompare(b.path)), exclusions: [...exclusions].sort() }
}
function separateRoots(left, right) { return !inside(left, right) && !inside(right, left) }
function compare(expected, actual) {
  const left = new Map(expected.map(file => [file.path, file.sha256])), right = new Map(actual.map(file => [file.path, file.sha256]))
  return [...new Set([...left.keys(), ...right.keys()])].filter(file => left.get(file) !== right.get(file))
}
function main() {
  const [managedWorktree, candidateName = 'r01-source-candidate'] = process.argv.slice(2)
  if (!managedWorktree || !/^r01-source-candidate(?:-[a-z0-9]+)?$/.test(candidateName)) throw new Error('Usage: capture-candidate.cjs <managed-worktree> [r01-source-candidate-suffix]')
  const worktree = fs.realpathSync(path.resolve(managedWorktree))
  if (!separateRoots(fs.realpathSync(sourceRoot), worktree) || !fs.existsSync(path.join(worktree, '.git')) || fs.lstatSync(worktree).isSymbolicLink()) throw new Error('Expected a separate existing managed Git worktree')
  const output = path.join(worktree, candidateName)
  const receipt = path.join(__dirname, `${candidateName}.json`)
  if (fs.existsSync(output) || fs.existsSync(receipt)) throw new Error('Candidate or receipt exists; preserve it and choose a new candidate suffix')
  const before = inventory(), startedAt = new Date().toISOString()
  fs.mkdirSync(output)
  const outputReal = fs.realpathSync(output)
  if (!inside(worktree, outputReal) || outputReal !== output) throw new Error('Candidate physical path mismatch')
  let copyFailure = null
  const copied = []
  try {
    for (const file of before.files) {
      const from = path.join(sourceRoot, file.path), to = path.join(output, file.path)
      if (!inside(output, to)) throw new Error('Unsafe destination path')
      if (fs.lstatSync(from).isSymbolicLink() || !inside(fs.realpathSync(sourceRoot), fs.realpathSync(from))) throw new Error(`Source link or escaping path during copy: ${file.path}`)
      fs.mkdirSync(path.dirname(to), { recursive: true })
      if (!inside(outputReal, fs.realpathSync(path.dirname(to)))) throw new Error('Destination parent escaped candidate')
      const bytes = fs.readFileSync(from)
      if (hash(bytes) !== file.sha256) throw new Error(`Source changed during copy: ${file.path}`)
      fs.writeFileSync(to, bytes, { flag: 'wx' })
      copied.push({ path: file.path, bytes: bytes.length, sha256: hash(fs.readFileSync(to)) })
    }
  } catch (error) { copyFailure = error.message }
  let after = { files: [] }, destination = { files: [] }
  try { after = inventory() } catch (error) { copyFailure = copyFailure || `Final source inventory failed: ${error.message}` }
  try { destination = inventory(output, { allFiles: true }) } catch (error) { copyFailure = copyFailure || `Final destination inventory failed: ${error.message}` }
  const sourceDrift = compare(before.files, after.files), copyDrift = compare(before.files, destination.files)
  const status = copyFailure || sourceDrift.length || copyDrift.length ? 'FAILED_SOURCE_CAPTURE' : 'FROZEN_SOURCE_CANDIDATE'
  const manifest = {
    schemaVersion: 'stoquify.r01-source-candidate.v1', startedAt, finishedAt: new Date().toISOString(), status,
    sourceRoot, managedWorktree: worktree, candidateRoot: output,
    baseCommit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim(),
    fileCount: before.files.length, totalBytes: before.files.reduce((total, file) => total + file.bytes, 0),
    candidateId: hash(Buffer.from(JSON.stringify(before.files))), files: before.files,
    exclusionsObserved: before.exclusions, sourceDrift, copyDrift, copyFailure, copiedFileCount: copied.length,
    scope: 'Selected application, build, test, asset and migration inputs copied byte-for-byte from current working tree, including untracked files. Empty destination excludes deleted source paths.',
    scopeLimits: [
      'Broad historical evidence and report directories are not copied. Additional selected policy tests may require reviewed documentary fixtures; full repository CI is not certified by this capture.',
      'Ignored next-env.d.ts and previous generated route types/build caches are excluded; Next/Prisma generation must occur inside the candidate.',
      'One ignored separately versioned artifact schema.ts is included because unchanged tsconfig includes it; it is not part of the main repository commit.',
      'Sensitive filename exclusions are not a complete secret scan. No candidate upload or external publication has been performed.',
      'This is source capture only; Linux build, dependency installation, runtime, migrations and authenticated smoke are not yet qualified.',
    ],
  }
  fs.writeFileSync(receipt, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ status, candidateRoot: output, candidateId: manifest.candidateId, fileCount: manifest.fileCount, totalBytes: manifest.totalBytes, sourceDrift, copyDrift, copyFailure }))
  if (status !== 'FROZEN_SOURCE_CANDIDATE') process.exitCode = 1
}
if (require.main === module) main()
module.exports = { inside, excluded, compare, inventory, separateRoots }
