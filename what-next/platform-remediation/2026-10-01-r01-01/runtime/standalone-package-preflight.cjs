#!/usr/bin/env node
// Structural checks only. Never copies a package, loads application modules, starts
// a server/browser, reads environment files, or connects to a database.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const slash = value => value.split(path.sep).join('/')
const inside = (root, target) => {
  const relative = path.relative(root, target)
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}
function reject(code) { throw Object.assign(new Error(code), { safeCode: code }) }
function relativePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0')) reject('INVALID_MANIFEST_PATH')
  const parts = value.replace(/\\/g, '/').split('/')
  if (path.posix.isAbsolute(value.replace(/\\/g, '/')) || /^[A-Za-z]:/.test(value) || parts.some(part => !part || part === '.' || part === '..')) reject('UNSAFE_MANIFEST_PATH')
  return parts.join(path.sep)
}
function sensitive(relative) {
  const normalized = relative.replace(/\\/g, '/').toLowerCase()
  const parts = normalized.split('/')
  return parts.some(part => part.startsWith('.env') || ['.example.env', '.neon', '.git', '.seed-artifacts', '.auth'].includes(part)) ||
    /(?:^|\/)(?:seed-login-credentials|credentials|service-account)(?:\.[^/]*)?$/.test(normalized) || /\.(?:pem|p12|pfx|key)$/.test(normalized)
}
function canonicalDirectory(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) reject('ABSOLUTE_DIRECTORY_REQUIRED')
  const real = fs.realpathSync(value)
  if (!fs.statSync(real).isDirectory()) reject('DIRECTORY_REQUIRED')
  return real
}
function safeFile(root, filename) {
  if (!inside(root, path.resolve(filename))) reject('FILE_PATH_ESCAPES_ROOT')
  if (sensitive(slash(path.relative(root, filename)))) reject('SENSITIVE_FILE_NOT_READ')
  const real = fs.realpathSync(filename)
  if (!inside(root, real)) reject('FILE_REALPATH_ESCAPES_ROOT')
  if (sensitive(slash(path.relative(root, real)))) reject('SENSITIVE_FILE_NOT_READ')
  if (!fs.statSync(real).isFile()) reject('REGULAR_FILE_REQUIRED')
  return real
}
function fileHash(root, filename) { return sha(fs.readFileSync(safeFile(root, filename))) }
function inventory(root, { rejectSecrets = true, ignoreTop = [] } = {}) {
  const files = [], links = [], directories = new Set()
  function walk(directory, active) {
    const physical = fs.realpathSync(directory)
    if (!inside(root, physical)) reject('SYMLINK_ESCAPES_PACKAGE')
    if (active.has(physical)) reject('SYMLINK_DIRECTORY_CYCLE')
    const next = new Set(active); next.add(physical)
    directories.add(physical)
    for (const entry of fs.readdirSync(directory).sort()) {
      if (directory === root && ignoreTop.includes(entry)) continue
      const filename = path.join(directory, entry), relative = slash(path.relative(root, filename))
      if (rejectSecrets && sensitive(relative)) reject('SENSITIVE_PACKAGE_PATH_PRESENT')
      const lst = fs.lstatSync(filename)
      let real
      try { real = fs.realpathSync(filename) } catch { reject('DANGLING_OR_UNRESOLVABLE_LINK') }
      if (!inside(root, real)) reject('SYMLINK_ESCAPES_PACKAGE')
      if (lst.isSymbolicLink()) links.push({ path: relative, target: slash(path.relative(root, real)) })
      const stat = fs.statSync(filename)
      if (stat.isDirectory()) walk(filename, next)
      else if (stat.isFile()) files.push({ path: relative, bytes: stat.size, sha256: fileHash(root, filename) })
      else reject('SPECIAL_PACKAGE_FILE_UNSUPPORTED')
    }
  }
  walk(root, new Set())
  files.sort((a, b) => a.path.localeCompare(b.path))
  links.sort((a, b) => a.path.localeCompare(b.path))
  return { files, links, directories: directories.size, fingerprint: sha(JSON.stringify({ files, links })) }
}

function preflight({ buildOutputRoot, packageRoot, publicRoot }) {
  const receipt = {
    checkedAt: new Date().toISOString(), status: 'STRUCTURAL_PREFLIGHT_BLOCKED',
    method: 'Filesystem reads and Node CJS resolution only; application modules are not executed',
    checks: {}, failures: [], dependencyResolution: [],
    pending: ['Actual ESM loading and startup', 'Native dependency loading', 'React/context behavior', 'Login-page and static-asset browser checks', 'Authenticated five-route smoke on verified disposable database'],
    packageCopied: false, applicationStarted: false, databaseContacted: false, environmentFilesRead: false,
  }
  function check(name, fn) {
    try { const result = fn(); receipt.checks[name] = { pass: true, ...result }; return result }
    catch (error) {
      const code = error.safeCode || (/^[A-Z][A-Z0-9_]+$/.test(error.code || '') ? error.code : 'CHECK_FAILED')
      receipt.checks[name] = { pass: false, code }; receipt.failures.push({ check: name, code }); return null
    }
  }
  const roots = check('roots', () => {
    const build = canonicalDirectory(buildOutputRoot), pkg = canonicalDirectory(packageRoot), pub = canonicalDirectory(publicRoot)
    if (build === pkg || inside(pkg, build) || inside(pkg, pub) || inside(pub, pkg)) reject('AMBIGUOUS_ROOT_OVERLAP')
    return { build, pkg, pub }
  })
  if (!roots) return receipt
  const { build, pkg, pub } = roots
  const sourceInputs = new Map(), sourceInventories = []
  let tracePathsAtStart = null
  function readSource(root, filename) {
    const bytes = fs.readFileSync(safeFile(root, filename)), digest = sha(bytes)
    const key = path.resolve(filename), previous = sourceInputs.get(key)
    if (previous && previous.sha256 !== digest) reject('SOURCE_CHANGED_DURING_PREFLIGHT')
    sourceInputs.set(key, { root, filename, sha256: digest })
    return bytes
  }
  const sourceHash = (root, filename) => sha(readSource(root, filename))
  function tracePaths() {
    const traces = []
    function walk(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (directory === build && ['standalone', 'cache', 'static'].includes(entry.name)) continue
        const filename = path.join(directory, entry.name)
        if (entry.isSymbolicLink()) reject('TRACE_TREE_LINK_UNSUPPORTED')
        if (entry.isDirectory()) walk(filename)
        else if (entry.isFile() && entry.name.endsWith('.nft.json')) traces.push(filename)
      }
    }
    walk(build)
    return traces.sort()
  }
  const packageInventory = check('packageInventory', () => {
    const value = inventory(pkg)
    return { fileCount: value.files.length, symlinkCount: value.links.length, fingerprint: value.fingerprint }
  })
  // Do not follow more package paths after an escaping link/secret/cycle was found.
  if (!packageInventory) return receipt
  const config = check('candidateConfiguration', () => {
    const sourceBytes = readSource(build, path.join(build, 'required-server-files.json'))
    const source = JSON.parse(sourceBytes)
    const dist = relativePath(source.config?.distDir)
    if (source.config?.output !== 'standalone' || (source.relativeAppDir || '') !== '') reject('UNSUPPORTED_STANDALONE_LAYOUT')
    let candidate = build
    for (const part of dist.split(path.sep)) candidate = path.dirname(candidate)
    if (path.resolve(candidate, dist) !== build) reject('BUILD_DIRECTORY_CONFIG_MISMATCH')
    if (!inside(candidate, pub) || path.resolve(candidate, 'public') !== pub) reject('PUBLIC_ROOT_NOT_CANDIDATE_PUBLIC')
    const copiedBytes = fs.readFileSync(safeFile(pkg, path.join(pkg, dist, 'required-server-files.json')))
    if (sha(sourceBytes) !== sha(copiedBytes)) reject('COPIED_CONFIGURATION_MISMATCH')
    const id = readSource(build, path.join(build, 'BUILD_ID')).toString('utf8').trim()
    if (!id || id !== fs.readFileSync(safeFile(pkg, path.join(pkg, dist, 'BUILD_ID')), 'utf8').trim()) reject('BUILD_ID_MISMATCH')
    if (sourceHash(build, path.join(build, 'standalone/server.js')) !== fileHash(pkg, path.join(pkg, 'server.js'))) reject('GENERATED_SERVER_MISMATCH')
    if (!Array.isArray(source.files) || !source.files.length) reject('REQUIRED_FILES_MANIFEST_INVALID')
    for (const name of source.files) {
      const relative = relativePath(name)
      if (sourceHash(candidate, path.join(candidate, relative)) !== fileHash(pkg, path.join(pkg, relative))) reject('REQUIRED_FILE_MISMATCH')
    }
    return { candidate, dist, buildIdSha256: sha(id), configSha256: sha(sourceBytes), requiredFileCount: source.files.length }
  })
  if (config) {
    for (const [name, source, copied] of [['staticAssets', path.join(build, 'static'), path.join(pkg, config.dist, 'static')], ['publicAssets', pub, path.join(pkg, 'public')]]) {
      check(name, () => {
        const before = inventory(canonicalDirectory(source)), after = inventory(canonicalDirectory(copied))
        sourceInventories.push({ root: source, fingerprint: before.fingerprint })
        if (name === 'staticAssets' && before.files.length === 0) reject('STATIC_ASSETS_EMPTY')
        if (sha(JSON.stringify(before.files)) !== sha(JSON.stringify(after.files))) reject('ASSET_INVENTORY_MISMATCH')
        return { fileCount: before.files.length, contentFingerprint: sha(JSON.stringify(before.files)) }
      })
    }
    check('tracedFiles', () => {
      const traces = tracePaths()
      tracePathsAtStart = JSON.stringify(traces)
      if (!traces.includes(path.join(build, 'next-server.js.nft.json'))) reject('NEXT_SERVER_TRACE_MISSING')
      const seen = new Map(), traceHashes = [], unconsumedTraces = []
      for (const filename of traces.sort()) {
        const bytes = readSource(build, filename), parsed = JSON.parse(bytes)
        if (!Array.isArray(parsed.files)) reject('TRACE_FILES_INVALID')
        const relativeTrace = slash(path.relative(build, filename))
        traceHashes.push([relativeTrace, sha(bytes)])
        // Installed Next 15.5.23 copyTracedFiles consumes next-server.js.nft.json,
        // but never consumes this separate minimal-server trace. Its unique files
        // are not requirements of the ordinary standalone server.js package.
        if (relativeTrace === 'next-minimal-server.js.nft.json') {
          unconsumedTraces.push({ path: relativeTrace, listedFiles: parsed.files.length, reason: 'Not consumed by reviewed Next 15.5.23 standalone packager' })
          continue
        }
        for (const name of parsed.files) {
          if (typeof name !== 'string' || name.includes('\0') || path.isAbsolute(name) || /^[A-Za-z]:/.test(name)) reject('TRACE_PATH_INVALID')
          const source = path.resolve(path.dirname(filename), name.replace(/\\/g, path.sep))
          if (!inside(config.candidate, source)) reject('TRACE_PATH_ESCAPES_CANDIDATE')
          const relative = slash(path.relative(config.candidate, source))
          if (sensitive(relative)) reject('SENSITIVE_TRACE_PATH')
          if (!seen.has(relative)) {
            const digest = sourceHash(config.candidate, source)
            if (digest !== fileHash(pkg, path.join(pkg, relative))) reject('TRACED_FILE_MISMATCH')
            seen.set(relative, digest)
          }
        }
      }
      return { traceCount: traces.length, requiredTraceCount: traces.length - unconsumedTraces.length, unconsumedTraces, fileCount: seen.size, traceManifestFingerprint: sha(JSON.stringify(traceHashes)), tracedContentFingerprint: sha(JSON.stringify([...seen].sort())) }
    })
  }
  check('runtimeDependencyResolution', () => {
    const fromServer = createRequire(path.join(pkg, 'server.js'))
    function resolveFrom(requireAt, origin, request, required) {
      try {
        const filename = requireAt.resolve(request), real = fs.realpathSync(filename)
        const contained = inside(pkg, real)
        receipt.dependencyResolution.push({ origin, request, required, state: contained ? 'CONTAINED' : 'OUTSIDE_PACKAGE', resolvedPathSha256: sha(real) })
        if (!contained) reject('DEPENDENCY_RESOLVES_OUTSIDE_PACKAGE')
        return real
      } catch (error) {
        if (error.safeCode) throw error
        const absent = error.code === 'MODULE_NOT_FOUND'
        receipt.dependencyResolution.push({ origin, request, required, state: absent && !required ? 'OPTIONAL_UNRESOLVED' : 'UNRESOLVED' })
        if (required || !absent) reject('REQUIRED_DEPENDENCY_UNRESOLVED')
        return null
      }
    }
    resolveFrom(fromServer, 'server.js', 'next', true)
    const nextPackage = resolveFrom(fromServer, 'server.js', 'next/package.json', true)
    const nextVersion = JSON.parse(fs.readFileSync(safeFile(pkg, nextPackage), 'utf8')).version
    if (nextVersion !== '15.5.23') reject('NEXT_PACKAGER_VERSION_REVIEW_REQUIRED')
    const importer = safeFile(pkg, path.join(path.dirname(nextPackage), 'dist/server/next.js'))
    const fromNext = createRequire(importer)
    for (const name of ['@next/env', 'styled-jsx', 'react', 'react-dom']) resolveFrom(fromNext, 'next/dist/server/next.js', name, true)
    for (const name of ['sharp', 'canvas']) resolveFrom(fromNext, 'next/dist/server/next.js', name, false)
    return { requiredOriginsChecked: 2, reviewedNextVersion: nextVersion, applicationModulesLoaded: false, optionalUnresolvedIsNotFailure: true }
  })
  check('packageStableDuringCheck', () => {
    if (inventory(pkg).fingerprint !== packageInventory.fingerprint) reject('PACKAGE_CHANGED_DURING_PREFLIGHT')
    return { unchanged: true }
  })
  check('candidateInputsStableDuringCheck', () => {
    for (const item of sourceInputs.values()) if (fileHash(item.root, item.filename) !== item.sha256) reject('SOURCE_CHANGED_DURING_PREFLIGHT')
    for (const item of sourceInventories) if (inventory(canonicalDirectory(item.root)).fingerprint !== item.fingerprint) reject('SOURCE_ASSET_INVENTORY_CHANGED')
    if (tracePathsAtStart !== null && JSON.stringify(tracePaths()) !== tracePathsAtStart) reject('SOURCE_TRACE_INVENTORY_CHANGED')
    return { unchanged: true, individuallyHashedInputs: sourceInputs.size, assetTrees: sourceInventories.length, atomicFilesystemSnapshot: false }
  })
  if (receipt.failures.length === 0) receipt.status = 'STRUCTURAL_PREFLIGHT_PASS_RUNTIME_PENDING'
  return receipt
}

function cli(argv) {
  const values = {}
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    if (!['--build-output-root', '--package-root', '--public-root', '--receipt'].includes(flag) || !argv[index + 1] || values[flag]) reject('INVALID_ARGUMENTS')
    values[flag] = argv[index + 1]
  }
  const destination = path.resolve(__dirname, values['--receipt'] || 'standalone-preflight.json')
  const evidenceRoot = fs.realpathSync(__dirname), parent = fs.realpathSync(path.dirname(destination))
  if (!inside(evidenceRoot, parent) || path.extname(destination) !== '.json' || (fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink())) reject('RECEIPT_MUST_STAY_IN_RUNTIME_EVIDENCE')
  const result = preflight({ buildOutputRoot: values['--build-output-root'], packageRoot: values['--package-root'], publicRoot: values['--public-root'] })
  fs.writeFileSync(destination, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ status: result.status, failures: result.failures, receipt: path.relative(evidenceRoot, destination), runtimeVerification: 'PENDING' }))
  return result.failures.length ? 1 : 0
}
module.exports = { preflight, inventory, relativePath, inside, cli }
if (require.main === module) {
  try { process.exitCode = cli(process.argv.slice(2)) }
  catch (error) { console.error(JSON.stringify({ status: 'PREFLIGHT_ARGUMENT_OR_RECEIPT_FAILURE', code: error.safeCode || error.code || 'UNKNOWN' })); process.exitCode = 1 }
}
