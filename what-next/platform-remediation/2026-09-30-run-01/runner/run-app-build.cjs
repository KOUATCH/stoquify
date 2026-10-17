const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const safe = require('../../../../scripts/build-app-safe.js');

async function main() {
  const root = process.cwd();
  const name = process.argv[2] || 'app-build';
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Expected a simple unique evidence name');
  const resultPath = path.join(__dirname, `${name}.result.json`);
  if (fs.existsSync(resultPath)) throw new Error('Evidence already exists; select a new name');
  const outputName = '.next-remediation-r01-20260930';
  const output = path.resolve(root, outputName);
  const relative = path.relative(root, output);
  if (relative !== outputName) throw new Error('Expected a contained build output directory');
  if (fs.existsSync(output)) {
    const priorPath = path.join(__dirname, 'app-build.result.json');
    if (!process.argv.includes('--reuse-owned-output') || !fs.existsSync(priorPath)) throw new Error('Existing output requires a completed task-owned build record');
    const prior = JSON.parse(fs.readFileSync(priorPath, 'utf8'));
    if (prior.root !== root || prior.nextOutput?.nextDir !== output) throw new Error('Prior record does not own this output');
  }
  function sourceHashes() {
    const files = [];
    function visit(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(target);
        else if (entry.isFile() && /\.(ts|tsx|js|jsx|cjs|mjs|json|prisma|sql|css|scss|sass|svg|yaml|yml)$/.test(entry.name)) files.push(target);
      }
    }
    for (const directory of ['actions', 'app', 'components', 'config', 'hooks', 'i18n', 'lib', 'services', 'types', 'validations', 'prisma', 'scripts', 'styles', '.github']) {
      if (fs.existsSync(directory)) visit(directory);
    }
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isFile() && (/\.(ts|tsx|js|jsx|cjs|mjs|json|css|scss|yaml|yml)$/.test(entry.name) || /^\.env(?:\.|$)/.test(entry.name))) files.push(entry.name);
    }
    return Object.fromEntries([...new Set(files)].sort().map(file => [file.replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
  }
  const sourceBefore = sourceHashes();
  fs.writeFileSync(path.join(__dirname, `${name}.sources-before.json`), JSON.stringify(sourceBefore, null, 2));
  const originals = Object.fromEntries(['tsconfig.json', 'next-env.d.ts'].map(file => [file, fs.readFileSync(file, 'utf8')]));
  for (const [file, contents] of Object.entries(originals)) fs.writeFileSync(path.join(__dirname, `${name}.${file}.before-build.txt`), contents);
  const env = { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', NEXT_DIST_DIR: outputName,
    DATABASE_URL: 'postgresql://unreachable:unreachable@127.0.0.1:1/verification_no_database',
    DIRECT_URL: 'postgresql://unreachable:unreachable@127.0.0.1:1/verification_no_database',
    SHADOW_DATABASE_URL: 'postgresql://unreachable:unreachable@127.0.0.1:1/verification_no_database' };
  for (const key of ['DATABASE_URL_UNPOOLED', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NON_POOLING']) {
    env[key] = env.DATABASE_URL;
  }
  const startedAt = new Date().toISOString();
  const stdout = fs.openSync(path.join(__dirname, `${name}.stdout.log`), 'w');
  const stderr = fs.openSync(path.join(__dirname, `${name}.stderr.log`), 'w');
  let summary;
  const configChanges = [];
  try {
    summary = await safe.runSafeBuild({ root, env, skipClean: true, timeoutMs: 1800000,
      buildRunner: ({ timeoutMs }) => safe.runDirectNextBuild({ root, env, timeoutMs, stdio: ['ignore', stdout, stderr] }) });
  } finally {
    fs.closeSync(stdout); fs.closeSync(stderr);
    for (const [file, before] of Object.entries(originals)) {
      const after = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(path.join(__dirname, `${name}.${file}.after-build.txt`), after);
      if (before === after) continue;
      let onlyBuildChange = false;
      if (file === 'tsconfig.json') {
        const current = JSON.parse(after), original = JSON.parse(before);
        current.include = current.include?.filter(value => value !== `${outputName}/types/**/*.ts`);
        onlyBuildChange = JSON.stringify(current) === JSON.stringify(original);
      } else {
        const originalReference = before.match(/\/\/\/ <reference path="([^"]+)" \/>/)?.[0];
        const generatedReference = `/// <reference path="./${outputName}/types/routes.d.ts" />`;
        onlyBuildChange = Boolean(originalReference) && after.replace(generatedReference, originalReference).replaceAll('\r\n', '\n') === before.replaceAll('\r\n', '\n');
      }
      if (onlyBuildChange) fs.writeFileSync(file, before);
      configChanges.push({ file, beforeHash: crypto.createHash('sha256').update(before).digest('hex'),
        generatedHash: crypto.createHash('sha256').update(after).digest('hex'), restoredBuildOnlyChange: onlyBuildChange });
    }
  }
  // Process command lines are not needed in evidence and may contain private arguments.
  for (const key of ['orphanedBuildProcesses', 'postBuildOrphanedBuildProcesses']) {
    summary[key] = summary[key]?.map(({ pid, ppid }) => ({ pid, ppid }));
  }
  const sourceAfter = sourceHashes();
  fs.writeFileSync(path.join(__dirname, `${name}.sources-after.json`), JSON.stringify(sourceAfter, null, 2));
  const sourceChanges = [...new Set([...Object.keys(sourceBefore), ...Object.keys(sourceAfter)])].filter(file => sourceBefore[file] !== sourceAfter[file]);
  const result = { startedAt, endedAt: new Date().toISOString(), command: 'node scripts/build-app-safe.js --skip-clean',
    environment: { NODE_ENV: env.NODE_ENV, NEXT_DIST_DIR: outputName, databaseTarget: 'disabled localhost:1' },
    configChanges, sourceChanges, ...summary };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  process.exitCode = summary.exitCode;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
