#!/usr/bin/env node
'use strict';

// R01 build qualification only. No migration, deployment, runtime or database phase.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');

const TESTS = [
  'services/accounting/__tests__/posting.service.test.ts',
  'services/accounting/__tests__/periods.service.test.ts',
  'services/accounting/__tests__/close-assurance.service.test.ts',
  'services/accounting/__tests__/close-assurance-pack.service.test.ts',
  'services/accounting/__tests__/general-ledger-balances.service.test.ts',
  'services/accounting/__tests__/reports-export.service.test.ts',
  'services/analytics/__tests__/financial-reports.service.test.ts',
  'services/pos/__tests__/offline-sync.service.test.ts',
  'hooks/posHooks/__tests__/offline-flush-recovery.test.ts',
  'hooks/posHooks/__tests__/offline-dashboard-scope.test.ts',
  'lib/pos/__tests__/offline-local-queue.test.ts',
  'services/inventory/__tests__/inventory-stock-event.service.test.ts',
];
const DATABASE_KEYS = ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL',
  'DATABASE_URL_UNPOOLED', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING', 'PAYROLL_IMMUTABILITY_DATABASE_URL'];
const DISABLED_DATABASE = 'postgresql://verification:verification@127.0.0.1:1/r01_no_database?connect_timeout=1';
const DIST = '.next-r01-linux';
const GENERATED = ['node_modules', DIST, 'tsconfig.tsbuildinfo'];
const NEXT_STUB = '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n' +
  '// NOTE: This file should not be edited\n' +
  '// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.\n';
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

function guardRuntime(platform = process.platform, version = process.versions.node) {
  if (platform !== 'linux') throw new Error('Linux is required; no dependency or verification command was started.');
  if (Number(version.split('.')[0]) !== 20) throw new Error('Node.js major 20 is required, matching the existing CI convention.');
}

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!['--candidate', '--evidence', '--manifest'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error('Use --candidate <absolute directory> --manifest <absolute frozen manifest> --evidence <absolute new directory>.');
    }
    if (result[key.slice(2)]) throw new Error(`Duplicate argument: ${key}`);
    result[key.slice(2)] = args[++i];
  }
  if (!result.candidate || !result.evidence || !result.manifest) throw new Error('--candidate, --manifest and --evidence are required.');
  return result;
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

function resolvePaths(args) {
  for (const value of Object.values(args)) if (!path.isAbsolute(value)) throw new Error('Paths must be absolute.');
  const candidate = fs.realpathSync(args.candidate);
  if (!fs.statSync(candidate).isDirectory()) throw new Error('Candidate must be a directory.');
  if (path.resolve(args.candidate) !== candidate) throw new Error('Candidate path must use its canonical location.');
  const parent = fs.realpathSync(path.dirname(args.evidence));
  const evidence = path.join(parent, path.basename(args.evidence));
  if (path.resolve(args.evidence) !== evidence) throw new Error('Evidence path must use its canonical parent.');
  if (within(candidate, evidence) || within(evidence, candidate)) throw new Error('Evidence must be outside the candidate.');
  if (fs.existsSync(evidence)) throw new Error('Evidence directory must not already exist.');
  const manifest = fs.realpathSync(args.manifest);
  if (within(candidate, manifest)) throw new Error('Frozen manifest must be a sidecar outside the candidate.');
  return { candidate, evidence, manifest };
}

function sourceHashes(root, allowGenerated = false) {
  const result = {};
  function visit(target) {
    const stat = fs.lstatSync(target);
    const relative = path.relative(root, target).split(path.sep).join('/');
    if (stat.isSymbolicLink()) throw new Error(`Source symlink requires separate review: ${relative}`);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(target).sort()) visit(path.join(target, name));
    } else if (stat.isFile()) result[relative] = hash(fs.readFileSync(target));
    else throw new Error(`Unsupported source entry: ${relative}`);
  }
  for (const name of fs.readdirSync(root).sort()) {
    if (allowGenerated && GENERATED.includes(name)) continue;
    visit(path.join(root, name));
  }
  return result;
}

function bindManifest(root, manifestPath, actual) {
  const contents = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(contents);
  if (manifest.status !== 'FROZEN_SOURCE_CANDIDATE' || !Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error('Expected a nonempty FROZEN_SOURCE_CANDIDATE manifest.');
  }
  if (manifest.candidateId !== hash(JSON.stringify(manifest.files))) throw new Error('Manifest candidateId does not match its exact files inventory.');
  const expected = {};
  for (const file of manifest.files) {
    if (typeof file.path !== 'string' || !file.path || file.path.includes('\\') ||
      file.path.split('/').some(part => !part || part === '.' || part === '..') || path.isAbsolute(file.path) ||
      !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 ||
      Object.hasOwn(expected, file.path) || GENERATED.includes(file.path.split('/')[0])) {
      throw new Error('Manifest contains an invalid, duplicated or generated file entry.');
    }
    expected[file.path] = file.sha256;
    const target = path.join(root, file.path);
    if (actual[file.path] !== file.sha256 || fs.statSync(target).size !== file.bytes) {
      throw new Error(`Candidate differs from its frozen manifest: ${file.path}`);
    }
  }
  const changes = changedFiles(expected, actual);
  if (changes.length) throw new Error(`Candidate has missing/extra/changed files: ${changes.join(', ')}`);
  return { candidateId: manifest.candidateId, manifestSha256: hash(contents), files: manifest.files.length };
}

function changedFiles(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().filter(file => before[file] !== after[file]);
}

function preflight(root) {
  // Both Next and Prisma load .env files themselves, independently of the child environment.
  for (const directory of [root, path.join(root, 'prisma')]) {
    for (const name of fs.readdirSync(directory)) {
      if (/^\.env(?:\.|$)/.test(name) && !/\.(?:example|sample|template)$/.test(name)) {
        throw new Error(`Remove runnable dotenv files from the disposable candidate first: ${path.relative(root, path.join(directory, name))}`);
      }
    }
  }
  for (const name of fs.readdirSync(root)) {
    if (name === 'node_modules' || /^\.next(?:$|-)/.test(name) || name.endsWith('.tsbuildinfo')) {
      throw new Error(`A fresh candidate is required; existing generated input: ${name}`);
    }
  }
  if (fs.existsSync(path.join(root, '.npmrc'))) throw new Error('Project .npmrc requires explicit review; this runner does not import npm credentials/config.');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const hooks = ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prebuild:app', 'postbuild:app'];
  if (hooks.some(name => pkg.scripts?.[name])) throw new Error('Root npm lifecycle hooks changed; review before running.');
  if (pkg.scripts?.['build:app'] !== 'node scripts/build-app-safe.js') throw new Error('The reviewed build:app command changed.');
  for (const file of ['package-lock.json', 'prisma/schema.prisma', 'prisma.config.ts', 'tsconfig.json',
    'next.config.mjs', 'jest.config.ts', 'scripts/build-app-safe.js', ...TESTS]) {
    if (!fs.statSync(path.join(root, file)).isFile()) throw new Error(`Required file missing: ${file}`);
  }
}

function cleanEnvironment(evidence, mode) {
  // Deliberately never spread process.env. No provider, cloud, GitHub, npm or database credentials are inherited.
  return {
    PATH: [path.dirname(process.execPath), '/usr/local/bin', '/usr/bin', '/bin'].join(':'),
    LANG: 'C.UTF-8', TZ: 'UTC', CI: '1', NODE_ENV: mode,
    TMPDIR: path.join(evidence, 'tmp'),
    npm_config_userconfig: path.join(evidence, 'empty-user.npmrc'),
    npm_config_globalconfig: path.join(evidence, 'empty-global.npmrc'),
    npm_config_cache: path.join(evidence, 'npm-cache'),
    npm_config_registry: 'https://registry.npmjs.org/',
    npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false',
    NEXT_TELEMETRY_DISABLED: '1', NEXT_DIST_DIR: DIST,
    AUTH_SECRET: 'r01-local-verification-only-not-for-any-deployment-2026',
    NEXTAUTH_SECRET: 'r01-local-verification-only-not-for-any-deployment-2026',
    NEXTAUTH_URL: 'http://127.0.0.1:3000', NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
    PGHOST: '127.0.0.1', PGPORT: '1', PGUSER: 'verification', PGPASSWORD: 'verification', PGDATABASE: 'r01_no_database',
    ...Object.fromEntries(DATABASE_KEYS.map(key => [key, DISABLED_DATABASE])),
  };
}

function knownGeneratedChange(file, before, after) {
  if (file === 'tsconfig.json') {
    try {
      const original = JSON.parse(before), generated = JSON.parse(after);
      if (!Array.isArray(generated.include) || original.include?.includes(`${DIST}/types/**/*.ts`)) return false;
      if (generated.include.filter(item => item === `${DIST}/types/**/*.ts`).length !== 1) return false;
      generated.include = generated.include.filter(item => item !== `${DIST}/types/**/*.ts`);
      return isDeepStrictEqual(generated, original);
    } catch { return false; }
  }
  if (file === 'next-env.d.ts') {
    const reference = before.match(/\/\/\/ <reference path="[^"]+" \/>/)?.[0];
    const expected = `/// <reference path="./${DIST}/types/routes.d.ts" />`;
    if (!after.includes(expected)) return false;
    if (!reference) return before === NEXT_STUB && after.replaceAll('\r\n', '\n').replace(expected + '\n', '') === before;
    return after.replace(expected, reference).replaceAll('\r\n', '\n') === before.replaceAll('\r\n', '\n');
  }
  return false;
}

async function runPhase(root, evidence, phase) {
  const stdout = fs.openSync(path.join(evidence, `${phase.name}.stdout.log`), 'wx');
  const stderr = fs.openSync(path.join(evidence, `${phase.name}.stderr.log`), 'wx');
  const started = Date.now();
  const receipt = { name: phase.name, command: [phase.command, ...phase.args], cwd: root,
    timeoutMs: phase.timeoutMs, startedAt: new Date(started).toISOString(), timedOut: false };
  console.log(`[${receipt.startedAt}] Starting ${phase.name}`);
  try {
    await new Promise(resolve => {
      const child = spawn(phase.command, phase.args, { cwd: root, env: cleanEnvironment(evidence, phase.mode),
        detached: true, shell: false, stdio: ['ignore', stdout, stderr] });
      receipt.pid = child.pid;
      let settled = false, timer, forceTimer;
      function signalGroup(signal) {
        if (!child.pid) return;
        try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') receipt.cleanupError = error.code; }
      }
      function stop(reason) {
        if (settled) return;
        receipt.interruption = reason;
        if (reason === 'timeout') receipt.timedOut = true;
        signalGroup('SIGTERM');
        if (!forceTimer) forceTimer = setTimeout(() => signalGroup('SIGKILL'), 5000);
      }
      const interrupt = () => stop('SIGINT'), terminate = () => stop('SIGTERM');
      process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
      function finish(code, signal, error) {
        if (settled) return;
        settled = true; clearTimeout(timer); clearTimeout(forceTimer);
        process.off('SIGINT', interrupt); process.off('SIGTERM', terminate);
        // The phase owns this process group. No daemon is part of a successful verification phase.
        signalGroup('SIGKILL');
        receipt.exitCode = code; receipt.signal = signal;
        if (error) receipt.spawnError = error.code || error.message;
        resolve();
      }
      child.once('error', error => finish(null, null, error));
      child.once('close', (code, signal) => finish(code, signal));
      timer = setTimeout(() => stop('timeout'), phase.timeoutMs);
    });
  } finally {
    fs.closeSync(stdout); fs.closeSync(stderr);
    receipt.durationMs = Date.now() - started;
    receipt.endedAt = new Date().toISOString();
    receipt.passed = receipt.exitCode === 0 && !receipt.interruption && !receipt.spawnError && !receipt.cleanupError;
    json(path.join(evidence, `${phase.name}.result.json`), receipt);
    console.log(`[${receipt.endedAt}] ${phase.name}: ${receipt.passed ? 'PASS' : 'FAIL'} (${receipt.durationMs} ms)`);
  }
  return receipt;
}

async function execute(args) {
  guardRuntime(); // Must precede filesystem mutation and process creation.
  const { candidate, evidence, manifest } = resolvePaths(parseArgs(args));
  preflight(candidate);
  const before = sourceHashes(candidate);
  const binding = bindManifest(candidate, manifest, before);
  const originals = Object.fromEntries(['tsconfig.json', 'next-env.d.ts'].map(file =>
    [file, fs.existsSync(path.join(candidate, file)) ? fs.readFileSync(path.join(candidate, file)) : null]));
  fs.mkdirSync(evidence);
  fs.mkdirSync(path.join(evidence, 'tmp'));
  for (const file of ['empty-user.npmrc', 'empty-global.npmrc']) fs.writeFileSync(path.join(evidence, file), '', { flag: 'wx' });
  json(path.join(evidence, 'sources-before.json'), before);
  fs.copyFileSync(manifest, path.join(evidence, 'candidate-manifest.json'), fs.constants.COPYFILE_EXCL);
  if (hash(fs.readFileSync(path.join(evidence, 'candidate-manifest.json'))) !== binding.manifestSha256) {
    throw new Error('Frozen manifest changed during capture.');
  }
  const summary = { status: 'RUNNING', candidate, evidence, startedAt: new Date().toISOString(),
    platform: process.platform, node: process.versions.node, runnerHash: hash(fs.readFileSync(__filename)),
    ...binding, sourceScope: 'Every frozen candidate file plus detection of new files; no extension filter',
    generatedPathsExcludedAfterStart: GENERATED,
    environment: { inheritedKeys: [], databaseAliases: DATABASE_KEYS, databaseTarget: 'disabled 127.0.0.1:1',
      nextDistDir: DIST, dotenvFilesAllowed: false, npmConfiguration: 'empty explicit user/global files; project .npmrc rejected' },
    selectedTests: TESTS, phases: [], generatedConfig: [], limitations: [
      'Build qualification only; standalone relocation/dependency integrity and browser smoke are separate required steps.',
      'Uses the existing TypeScript/Jest/Next configuration and its existing exclusions; does not certify all repository tests.',
      'Dependency installation requires public registry access. No OS sandbox or network firewall is supplied by this runner.',
      'The external frozen manifest is mandatory. The caller owns candidate transfer and reviewed manifest provenance.',
      'The app compiler is invoked directly with the installed Next CLI. build-app-safe.js is not executed because its Linux child detaches into another process group.',
    ] };
  const node = process.execPath;
  const phases = [
    { name: '01-npm-ci', command: 'npm', args: ['ci', '--include=dev'], mode: 'test', timeoutMs: 900000 },
    { name: '02-prisma-generate', command: node, args: ['node_modules/prisma/build/index.js', 'generate'], mode: 'test', timeoutMs: 300000 },
    { name: '03-prisma-validate', command: node, args: ['node_modules/prisma/build/index.js', 'validate'], mode: 'test', timeoutMs: 120000 },
    { name: '04-typecheck', command: node, args: ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'], mode: 'test', timeoutMs: 900000 },
    { name: '05-jest-selected', command: node, args: ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', ...TESTS,
      '--json', '--outputFile', path.join(evidence, 'jest-results.json')], mode: 'test', timeoutMs: 1200000 },
    { name: '06-build-app', command: node, args: ['node_modules/next/dist/bin/next', 'build'], mode: 'production', timeoutMs: 1800000 },
  ];
  json(path.join(evidence, 'plan.json'), { ...summary, commands: phases });
  try {
    const phaseBefore = { ...before };
    if (originals['next-env.d.ts'] === null) {
      fs.writeFileSync(path.join(candidate, 'next-env.d.ts'), NEXT_STUB, { flag: 'wx' });
      phaseBefore['next-env.d.ts'] = hash(NEXT_STUB);
      summary.generatedNextTypeStub = { path: 'next-env.d.ts', sha256: hash(NEXT_STUB),
        provenance: 'Runner-created minimal Next type references after exact frozen-manifest verification; removed after verification if only known generation occurred.' };
      fs.writeFileSync(path.join(evidence, 'next-env.d.ts.generated-baseline.txt'), NEXT_STUB, { flag: 'wx' });
    }
    for (const phase of phases) {
      const drift = changedFiles(phaseBefore, sourceHashes(candidate, true));
      if (drift.length) throw new Error(`Source changed before ${phase.name}: ${drift.join(', ')}`);
      const result = await runPhase(candidate, evidence, phase);
      summary.phases.push(result);
      if (!result.passed) throw new Error(`Verification failed at ${phase.name}; see its logs and receipt.`);
    }
    for (const required of ['BUILD_ID', 'required-server-files.json', 'standalone/server.js']) {
      const target = path.join(candidate, DIST, required);
      if (!fs.statSync(target).isFile()) throw new Error(`Build output missing: ${required}`);
    }
    summary.buildId = fs.readFileSync(path.join(candidate, DIST, 'BUILD_ID'), 'utf8').trim();
    summary.status = 'BUILD_VERIFIED_RUNTIME_PENDING';
  } catch (error) {
    summary.status = 'FAILED'; summary.error = error.message;
  } finally {
    for (const [file, original] of Object.entries(originals)) {
      try {
      const target = path.join(candidate, file);
      if (fs.existsSync(target) && !fs.lstatSync(target).isFile()) throw new Error('Config is no longer a regular file; retained for review.');
      const after = fs.existsSync(target) ? fs.readFileSync(target) : null;
      if (original) fs.writeFileSync(path.join(evidence, `${file}.before.txt`), original, { flag: 'wx' });
      if (after) fs.writeFileSync(path.join(evidence, `${file}.after.txt`), after, { flag: 'wx' });
      if (original === null) {
        const known = after && (after.toString('utf8') === NEXT_STUB ||
          (summary.phases.some(phase => phase.name === '06-build-app') && knownGeneratedChange(file, NEXT_STUB, after.toString('utf8'))));
        if (known && fs.readFileSync(target).equals(after)) fs.unlinkSync(target);
        summary.generatedConfig.push({ file, initiallyAbsent: true, generatedBaselineHash: hash(NEXT_STUB),
          afterHash: after ? hash(after) : null, removedOnlyKnownGeneratedFile: !fs.existsSync(target) });
        continue;
      }
      if (after?.equals(original)) continue;
      const restore = after && summary.phases.some(phase => phase.name === '06-build-app') &&
        knownGeneratedChange(file, original.toString('utf8'), after.toString('utf8'));
      // Check exact bytes immediately before restoration; unfamiliar/concurrent changes are retained.
      if (restore && fs.readFileSync(target).equals(after)) fs.writeFileSync(target, original);
      summary.generatedConfig.push({ file, beforeHash: hash(original), afterHash: after ? hash(after) : null,
        restoredExactOriginal: fs.existsSync(target) && fs.readFileSync(target).equals(original) });
      } catch (error) {
        summary.status = 'FAILED';
        summary.generatedConfig.push({ file, restoredExactOriginal: false, error: error.message });
      }
    }
    try {
      const after = sourceHashes(candidate, true);
      json(path.join(evidence, 'sources-after.json'), after);
      summary.sourceChanges = changedFiles(before, after);
      if (summary.sourceChanges.length) { summary.status = 'FAILED'; summary.sourceDrift = true; }
    } catch (error) { summary.status = 'FAILED'; summary.sourceVerificationError = error.message; }
    summary.endedAt = new Date().toISOString();
    json(path.join(evidence, 'result.json'), summary);
  }
  console.log(JSON.stringify({ status: summary.status, evidence, sourceChanges: summary.sourceChanges }));
  return summary.status === 'BUILD_VERIFIED_RUNTIME_PENDING' ? 0 : 1;
}

if (require.main === module) {
  if (process.argv.length === 3 && ['--help', '-h'].includes(process.argv[2])) {
    console.log('Linux + Node 20 only. Usage: node run-linux-verification.cjs --candidate /absolute/fresh/candidate --manifest /absolute/frozen-manifest.json --evidence /absolute/new/evidence');
  } else execute(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => {
    console.error(error.message); process.exitCode = 1;
  });
}

module.exports = { guardRuntime, parseArgs, within, resolvePaths, sourceHashes, changedFiles,
  preflight, cleanEnvironment, knownGeneratedChange, bindManifest, TESTS, DIST, GENERATED, NEXT_STUB };
