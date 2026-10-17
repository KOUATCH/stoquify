const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');

const root = process.cwd();
const dist = path.resolve(root, '.next-remediation-r01-20260930');
const standalone = path.join(dist, 'standalone');
const probeRoot = path.join(__dirname, 'packaging-link-probes');
const dependencyRoot = fs.realpathSync(path.join(root, 'node_modules'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function contained(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}
function assertContained(parent, child) {
  if (!contained(parent, child)) throw new Error(`Path escaped allowed boundary: ${path.relative(root, child)}`);
}
function verifyDestination(destinationRoot, target) {
  assertContained(destinationRoot, target);
  let ancestor = path.dirname(target);
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const actual = fs.realpathSync(ancestor);
  if (actual !== destinationRoot) assertContained(destinationRoot, actual);
}
async function copyDependency(source, destination, destinationRoot, copies, ancestors = new Set()) {
  const actual = await fs.promises.realpath(source);
  assertContained(dependencyRoot, actual);
  verifyDestination(destinationRoot, destination);
  if (fs.existsSync(destination) && (await fs.promises.lstat(destination)).isSymbolicLink()) throw new Error('Refusing to overwrite an output link');
  const stat = await fs.promises.stat(actual);
  if (stat.isDirectory()) {
    if (ancestors.has(actual)) throw new Error('Dependency directory cycle');
    const next = new Set(ancestors).add(actual);
    await fs.promises.mkdir(destination, { recursive: true });
    for (const entry of await fs.promises.readdir(actual)) await copyDependency(path.join(actual, entry), path.join(destination, entry), destinationRoot, copies, next);
  } else if (stat.isFile()) {
    const sha256 = hash(actual);
    await fs.promises.copyFile(actual, destination);
    if (hash(actual) !== sha256 || hash(destination) !== sha256) throw new Error('Dependency changed during copy');
    copies.set(destination, { source: actual, sha256 });
  } else throw new Error('Unsupported dependency entry');
}
function directoryLinkFallback(destinationRoot, original, fallbacks, copies) {
  return async (target, destination, type) => {
    if (typeof target !== 'string' || typeof destination !== 'string') throw new Error('Unexpected link argument type');
    verifyDestination(destinationRoot, destination);
    const source = path.isAbsolute(target) ? target : path.resolve(root, path.relative(destinationRoot, path.dirname(destination)), target);
    const actual = await fs.promises.realpath(source);
    assertContained(dependencyRoot, actual);
    if (!(await fs.promises.stat(actual)).isDirectory()) throw new Error('Fallback accepts dependency directories only');
    // A successful absolute pnpm link must never be published in standalone:
    // subsequent Next copy operations could otherwise follow it into source.
    const probe = path.join(probeRoot, crypto.randomUUID());
    verifyDestination(probeRoot, probe);
    if (fs.existsSync(probe)) throw new Error('Probe path already exists');
    let creationError;
    try { await original(actual, probe, type); }
    catch (error) { creationError = error; }
    if (!creationError) {
      if (!(await fs.promises.lstat(probe)).isSymbolicLink()) throw new Error('Unexpected probe output');
      await fs.promises.unlink(probe); // Unlink only the verified probe; never its target.
      throw new Error('Expected Windows EPERM was not reproduced; refusing recovery mode');
    }
    if (process.platform !== 'win32' || creationError.code !== 'EPERM') throw creationError;
    await copyDependency(actual, destination, destinationRoot, copies);
    fallbacks.push({ target: path.relative(root, actual), destination: path.relative(destinationRoot, destination), reason: 'Windows EPERM creating a pnpm dependency directory symlink; copied verified directory contents' });
  };
}
function filesIn(directory) {
  const found = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Unexpected output link: ${path.relative(root, target)}`);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile()) found.push(target);
      else throw new Error('Unsupported output entry');
    }
  }
  visit(directory); return found;
}
function compiledHashes() {
  const files = ['server', 'static', 'types'].flatMap(directory => filesIn(path.join(dist, directory)));
  files.push(...fs.readdirSync(dist, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name !== 'trace').map(entry => path.join(dist, entry.name)));
  return Object.fromEntries(files.sort().map(file => [path.relative(dist, file), hash(file)]));
}
function sourceHashes() {
  const files = [];
  for (const directory of ['actions', 'app', 'components', 'config', 'hooks', 'i18n', 'lib', 'services', 'types', 'validations', 'prisma', 'scripts', 'styles', '.github']) {
    if (fs.existsSync(directory)) files.push(...filesIn(directory).filter(file => /\.(ts|tsx|js|jsx|cjs|mjs|json|prisma|sql|css|scss|sass|svg|yaml|yml)$/.test(file)));
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && (/\.(ts|tsx|js|jsx|cjs|mjs|json|css|scss|yaml|yml)$/.test(entry.name) || /^\.env(?:\.|$)/.test(entry.name))) files.push(entry.name);
  }
  return Object.fromEntries([...new Set(files)].sort().map(file => [file.replaceAll('\\', '/'), hash(file)]));
}
function changedKeys(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(file => before[file] !== after[file]);
}
async function probe() {
  const destinationRoot = path.join(__dirname, 'packaging-probe-v3');
  if (fs.existsSync(destinationRoot)) throw new Error('Probe evidence already exists');
  await fs.promises.mkdir(destinationRoot);
  await fs.promises.mkdir(probeRoot, { recursive: true });
  if (fs.realpathSync(probeRoot) !== probeRoot) throw new Error('Probe directory must be real');
  const fallbacks = [], copies = new Map();
  const original = async () => { const error = new Error('Simulated Windows privilege failure'); error.code = 'EPERM'; throw error; };
  const fallback = directoryLinkFallback(destinationRoot, original, fallbacks, copies);
  const source = fs.realpathSync(path.join(root, 'node_modules', 'react'));
  await fallback(source, path.join(destinationRoot, 'react'));
  const rejected = [];
  for (const [label, target, destination] of [
    ['outside dependency source', root, path.join(destinationRoot, 'outside-source')],
    ['outside destination', source, path.join(__dirname, 'outside-destination')],
    ['file rather than directory', path.join(source, 'package.json'), path.join(destinationRoot, 'file-target')],
  ]) { try { await fallback(target, destination); } catch { rejected.push(label); } }
  const successProbe = directoryLinkFallback(destinationRoot,
    (target, destination) => fs.promises.symlink(target, destination, 'junction'), [], new Map());
  try { await successProbe(source, path.join(destinationRoot, 'must-not-publish-link')); }
  catch (error) { if (error.message.includes('Expected Windows EPERM was not reproduced')) rejected.push('successful private link was removed and output refused'); }
  const mismatches = [...copies].filter(([file, value]) => hash(file) !== value.sha256);
  if (rejected.length !== 4 || mismatches.length || fs.existsSync(path.join(destinationRoot, 'must-not-publish-link')) || fs.readdirSync(probeRoot).length) throw new Error('Guarded-copy probe failed');
  const result = { capturedAt: new Date().toISOString(), directoryCopyPassed: true, copiedFileCount: copies.size, rejected, mismatches: mismatches.length };
  fs.writeFileSync(path.join(__dirname, 'standalone-copy-probe-v3.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
async function recover() {
  const recordedCandidate = process.argv.includes('--recorded-candidate');
  const resultPath = path.join(__dirname, 'standalone-recovery.result.json');
  if (fs.existsSync(resultPath)) throw new Error('Recovery evidence already exists');
  assertContained(root, dist);
  if (fs.realpathSync(dist) !== dist) throw new Error('Build output must be a real task-owned directory');
  const original = JSON.parse(fs.readFileSync(path.join(__dirname, 'app-build-final.result.json'), 'utf8'));
  if (original.root !== root || original.postBuildNextOutput.nextDir !== dist || original.build.timedOut || original.sourceChanges.length) throw new Error('Frozen build evidence is not eligible');
  const buildId = fs.readFileSync(path.join(dist, 'BUILD_ID'), 'utf8').trim();
  if (buildId !== original.postBuildNextOutput.buildId) throw new Error('BUILD_ID changed');
  const sources = JSON.parse(fs.readFileSync(path.join(__dirname, 'app-build-final.sources-after.json'), 'utf8'));
  const sourceBefore = sourceHashes();
  const sourceDriftBefore = changedKeys(sources, sourceBefore);
  if (sourceDriftBefore.length) {
    const driftPath = path.join(__dirname, 'standalone-recovery.source-drift.json');
    if (!fs.existsSync(driftPath)) fs.writeFileSync(driftPath, JSON.stringify({
      capturedAt: new Date().toISOString(), recordedBuildEndedAt: original.endedAt,
      originalRefusalEvidence: 'standalone-recovery.stderr.log',
      qualification: 'Recorded compiled candidate only; current checkout has unclaimed concurrent changes',
      changes: sourceDriftBefore.map(file => ({ file, before: sources[file] || null, current: sourceBefore[file] || null })),
    }, null, 2));
    if (!recordedCandidate) throw new Error('Source changed after frozen build');
  }
  const before = compiledHashes();
  const compiledBeforePath = path.join(__dirname, 'standalone-recovery.compiled-before.json');
  if (fs.existsSync(compiledBeforePath)) {
    if (changedKeys(JSON.parse(fs.readFileSync(compiledBeforePath, 'utf8')), before).length) throw new Error('Compiled candidate changed since packaging preflight');
  } else fs.writeFileSync(compiledBeforePath, JSON.stringify(before, null, 2));
  const required = JSON.parse(fs.readFileSync(path.join(dist, 'required-server-files.json'), 'utf8'));
  if (required.appDir !== root || required.config.outputFileTracingRoot !== root || required.config.distDir !== path.basename(dist)) throw new Error('Unexpected compiled configuration roots');
  const pages = JSON.parse(fs.readFileSync(path.join(dist, 'server/pages-manifest.json'), 'utf8'));
  const apps = JSON.parse(fs.readFileSync(path.join(dist, 'server/app-paths-manifest.json'), 'utf8'));
  const middleware = JSON.parse(fs.readFileSync(path.join(dist, 'server/middleware-manifest.json'), 'utf8'));
  const functions = JSON.parse(fs.readFileSync(path.join(dist, 'server/functions-config-manifest.json'), 'utf8'));
  const prerender = JSON.parse(fs.readFileSync(path.join(dist, 'prerender-manifest.json'), 'utf8'));
  const traces = [...filesIn(path.join(dist, 'server')).filter(file => file.endsWith('.nft.json')),
    ...fs.readdirSync(dist).filter(file => file.endsWith('.nft.json')).map(file => path.join(dist, file))];
  const traced = new Set();
  for (const trace of traces) for (const file of JSON.parse(fs.readFileSync(trace, 'utf8')).files) traced.add(path.resolve(path.dirname(trace), file));
  const loadedEnvironments = ['.env', '.env.production'].filter(file => fs.existsSync(file));
  const copyPlan = new Set([...traced,
    ...required.files.map(file => path.resolve(root, file)),
    path.join(dist, 'required-server-files.json'), path.join(root, 'package.json'),
    ...loadedEnvironments.map(file => path.join(root, file)),
    ...filesIn(path.join(dist, 'server/pages')), ...filesIn(path.join(dist, 'server/app')),
  ]);
  for (const edge of [...Object.values(middleware.middleware), ...Object.values(middleware.functions)]) {
    for (const file of [...edge.files, ...(edge.wasm || []).map(item => item.filePath), ...(edge.assets || []).map(item => item.filePath)]) {
      const source = path.resolve(dist, file); assertContained(dist, source); copyPlan.add(source);
    }
  }
  for (const source of copyPlan) {
    assertContained(root, source);
    const actual = fs.realpathSync(source); assertContained(root, actual);
    if (fs.lstatSync(source).isSymbolicLink()) assertContained(dependencyRoot, actual);
    assertContained(standalone, path.resolve(standalone, path.relative(root, source)));
  }
  const plannedHashes = Object.fromEntries([...copyPlan].filter(file => fs.statSync(file).isFile()).map(file => [path.relative(root, file), hash(file)]));
  const packagingSourcePaths = new Set([...copyPlan].map(file => path.relative(root, file).replaceAll('\\', '/')));
  const changedPackagingInputs = sourceDriftBefore.filter(file => packagingSourcePaths.has(file));
  if (changedPackagingInputs.length) throw new Error(`Recorded packaging inputs changed: ${changedPackagingInputs.join(', ')}`);
  const inputProvenance = { matchedRecordedFingerprints: 0, retainedCompiledInputs: 0, previouslyUnfingerprintedInputs: 0,
    limitation: 'Dependencies and public/messages inputs absent from the original source manifest have newly pinned hashes and modification-time corroboration only; no retrospective build-start hash is claimed.' };
  for (const [relative, expected] of Object.entries(plannedHashes)) {
    const normalized = relative.replaceAll('\\', '/');
    const source = path.join(root, relative);
    if (sources[normalized]) {
      if (sources[normalized] !== expected) throw new Error(`Recorded input hash changed: ${normalized}`);
      inputProvenance.matchedRecordedFingerprints++;
    } else if (contained(dist, source)) inputProvenance.retainedCompiledInputs++;
    else {
      if (fs.statSync(source).mtimeMs > Date.parse(original.startedAt)) throw new Error(`Unfingerprinted packaging input was modified after build start: ${normalized}`);
      inputProvenance.previouslyUnfingerprintedInputs++;
    }
  }
  const planPath = path.join(__dirname, 'standalone-recovery.copy-plan-hashes.json');
  if (fs.existsSync(planPath)) {
    if (changedKeys(JSON.parse(fs.readFileSync(planPath, 'utf8')), plannedHashes).length) throw new Error('Packaging inputs changed since pinned preflight');
  } else fs.writeFileSync(planPath, JSON.stringify(plannedHashes, null, 2));
  if (process.argv.includes('--preflight-only')) {
    const proof = { capturedAt: new Date().toISOString(), buildId, recordedCandidate, checkoutDrift: sourceDriftBefore,
      changedPackagingInputs, inputProvenance, traceCount: traces.length, uniqueTracePaths: traced.size,
      copyPlanFiles: Object.keys(plannedHashes).length, outputMutated: false };
    fs.writeFileSync(path.join(__dirname, 'standalone-recovery.input-preflight.json'), JSON.stringify(proof, null, 2));
    console.log(JSON.stringify(proof)); return;
  }
  const backup = path.join(dist, 'standalone.failed-20260930');
  assertContained(dist, standalone); assertContained(dist, backup);
  if (fs.existsSync(backup)) throw new Error('Partial output backup already exists');
  if (fs.existsSync(standalone)) {
    if (fs.realpathSync(standalone) !== standalone) throw new Error('Partial output is not a real owned directory');
    await fs.promises.rename(standalone, backup);
  }
  await fs.promises.mkdir(probeRoot, { recursive: true });
  if (fs.realpathSync(probeRoot) !== probeRoot) throw new Error('Probe directory must be real');
  const nextIndex = require.resolve('next/dist/build/index.js');
  const installedSource = fs.readFileSync(nextIndex, 'utf8');
  const replayModule = new Module(nextIndex, module);
  replayModule.filename = nextIndex;
  replayModule.paths = Module._nodeModulePaths(path.dirname(nextIndex));
  replayModule._compile(installedSource + '\nmodule.exports.__taskPackagingReplay = writeStandaloneDirectory;\n', nextIndex);
  const fallbacks = [], copies = new Map(), guardErrors = [];
  const originalSymlink = fs.promises.symlink;
  const startedAt = new Date().toISOString();
  const result = { startedAt, buildId, originalBuildExitCode: original.exitCode, originalBuildStatus: original.status, recordedCandidate,
    candidateScope: recordedCandidate ? 'Recorded compiled candidate; NOT the current checkout' : 'Current frozen source',
    preexistingCheckoutDrift: sourceDriftBefore, changedPackagingInputs, inputProvenance,
    mode: 'Exact installed Next writeStandaloneDirectory replay; process-local guarded EPERM directory-copy fallback', installedNextIndexHash: hash(nextIndex), installedNextUtilsHash: hash(require.resolve('next/dist/build/utils.js')), partialOutputBackup: path.relative(root, backup), status: 'running' };
  try {
    // Only this packaging call sees the replacement; no files in node_modules are edited.
    const guarded = directoryLinkFallback(standalone, originalSymlink, fallbacks, copies);
    fs.promises.symlink = async (...args) => {
      try { return await guarded(...args); }
      catch (error) { guardErrors.push(error.message); throw error; }
    };
    await replayModule.exports.__taskPackagingReplay(
      { traceChild() { return { traceAsyncFn: operation => operation() }; } }, dist,
      { pages: Object.keys(pages) }, Object.keys(apps), root, required, middleware,
      functions.functions?.['/_middleware']?.runtime === 'nodejs',
      fs.existsSync(path.join(dist, 'server/instrumentation.js')),
      new Set(Object.keys(prerender.routes)),
      loadedEnvironments.map(file => ({ path: file })),
      path.join(root, 'app'),
    );
    const mismatches = [];
    let fileCount = 0, directoryCount = 0;
    for (const source of copyPlan) {
      assertContained(root, source);
      const destination = path.join(standalone, path.relative(root, source));
      if (!fs.existsSync(destination)) { mismatches.push({ file: path.relative(root, source), reason: 'missing' }); continue; }
      if (fs.statSync(source).isDirectory()) { directoryCount++; if (!fs.statSync(destination).isDirectory()) mismatches.push({ file: path.relative(root, source), reason: 'directory mismatch' }); }
      else {
        fileCount++;
        const expected = plannedHashes[path.relative(root, source)];
        if (hash(source) !== expected || hash(destination) !== expected) mismatches.push({ file: path.relative(root, source), reason: 'preflight content hash mismatch' });
      }
    }
    for (const [file, value] of copies) if (hash(file) !== value.sha256 || hash(value.source) !== value.sha256) mismatches.push({ file: path.relative(standalone, file), reason: 'fallback pre-copy hash mismatch' });
    const outputFiles = filesIn(standalone); // Rejects every output symlink/junction, including escaping ones.
    const after = compiledHashes();
    const compiledChanges = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(file => before[file] !== after[file]);
    const sourceChanges = changedKeys(sourceBefore, sourceHashes());
    const packagingInputChanges = sourceChanges.filter(file => packagingSourcePaths.has(file));
    fs.writeFileSync(path.join(__dirname, 'standalone-recovery.compiled-after.json'), JSON.stringify(after, null, 2));
    const residualProbeCount = fs.readdirSync(probeRoot).length;
    Object.assign(result, { traceCount: traces.length, uniqueTracePaths: traced.size, verifiedCopyPlanFiles: fileCount, verifiedCopyPlanDirectories: directoryCount, fallbackCount: fallbacks.length, fallbackCopiedFiles: copies.size, outputFileCount: outputFiles.length, mismatches, compiledChanges, sourceChanges, packagingInputChanges, guardErrors, residualProbeCount, linksFound: 0, serverJsPresent: fs.existsSync(path.join(standalone, 'server.js')) });
    result.status = mismatches.length || compiledChanges.length || (recordedCandidate ? packagingInputChanges.length : sourceChanges.length) || guardErrors.length || residualProbeCount || !result.serverJsPresent ? 'failed-validation' : 'packaging-recovered';
  } catch (error) { result.status = 'failed'; result.error = error.message; }
  finally {
    fs.promises.symlink = originalSymlink;
    result.endedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'standalone-recovery.fallbacks.json'), JSON.stringify(fallbacks, null, 2));
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  }
  console.log(JSON.stringify(result));
  if (result.status !== 'packaging-recovered') process.exitCode = 1;
}
(process.argv.includes('--probe') ? probe() : recover()).catch(error => { console.error(error.message); process.exitCode = 1; });
