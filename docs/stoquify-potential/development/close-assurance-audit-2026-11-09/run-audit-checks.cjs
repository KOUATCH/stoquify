// File-bound audit and two pure/mocked tests. No application or DB execution.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const prior = path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09');
const manifestFile = path.join(prior, 'CANDIDATE_SOURCE_MANIFEST.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const prefixes = ['services/accounting/', 'services/reconciliation/', 'services/payments/', 'services/evidence/', 'actions/accounting/', 'actions/payments/', 'components/accounting/', 'hooks/accounting/', 'app/[locale]/(dashboard)/dashboard/accounting/'];
const exact = ['prisma/schema.prisma', 'prisma/db.ts', 'services/_shared/protect.ts', 'services/_shared/action-errors.ts', 'lib/security/rbac.ts', 'lib/security/auth-session.ts', 'lib/security/rbac-permissions.ts', 'lib/auth.ts', 'config/permissions.ts', 'package.json', 'package-lock.json'];
const names = new Set();
function walk(relative) {
  const file = path.join(root, relative); if (!fs.existsSync(file)) return;
  assert(!fs.lstatSync(file).isSymbolicLink(), 'No linked audit source');
  if (fs.statSync(file).isDirectory()) for (const entry of fs.readdirSync(file)) walk(relative + '/' + entry);
  else if (/\.(tsx?|json)$/.test(relative)) names.add(relative);
}
for (const prefix of prefixes) walk(prefix.replace(/\/$/, '')); for (const name of exact) if (fs.existsSync(path.join(root, name))) names.add(name);
const previous = new Map(manifest.files.map(entry => [entry.path, entry.sha256]));
const files = [...names].sort().map(name => ({ path: name, sha256: sha(path.join(root, name)), previousArtifactSourceSha256: previous.get(name) || null }));
const removed = manifest.files.filter(entry => prefixes.some(prefix => entry.path.startsWith(prefix)) && !fs.existsSync(path.join(root, entry.path))).map(entry => entry.path);
write('SOURCE_BINDING.json', { checkedAt: new Date().toISOString(), manifestFileSha256: sha(manifestFile), priorSourceManifestSha256: manifest.manifestSha256,
  files, sourceFiles: files.length, changedOrAdded: files.filter(entry => entry.sha256 !== entry.previousArtifactSourceSha256).map(entry => entry.path), removed,
  limitation: 'Scoped current-source equality with the prior qualified artifact; not a new build, DB test, browser check or close certificate.' });
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const disabled = 'postgresql://audit_disabled@127.0.0.1:1/stoquify_audit_disabled?schema=public';
const env = { ...osEnv, NODE_ENV: 'test', DATABASE_URL: disabled, DIRECT_URL: disabled, SHADOW_DATABASE_URL: disabled,
  NODE_OPTIONS: '--require ' + JSON.stringify(path.join(root, 'scripts/local-gates-network.cjs')), CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' };
const args = [path.join(root, 'node_modules/jest/bin/jest.js'), '--config', path.join(__dirname, 'jest.audit.config.cjs'), '--runInBand', '--no-cache', '--runTestsByPath',
  'services/accounting/__tests__/close-assurance-current-proof.test.ts', 'services/accounting/__tests__/close-assessment-order.service.test.ts', '--json', '--outputFile', path.join(__dirname, 'focused-checks.results.json')];
const started = new Date().toISOString(), fd = fs.openSync(path.join(__dirname, 'focused-checks.log'), 'wx');
const result = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 120000 }); fs.closeSync(fd);
write('VERIFICATION.json', { started, finished: new Date().toISOString(), command: [process.execPath, ...args], exitCode: result.status, error: result.error?.code || null,
  runnerSha256: sha(__filename), configSha256: sha(path.join(__dirname, 'jest.audit.config.cjs')), networkPreloadSha256: sha(path.join(root, 'scripts/local-gates-network.cjs')),
  class: 'Pure proof grading and mocked Prisma transaction/order checks; no application configuration/setup, database or browser', noPrismaGeneration: true });
process.exitCode = result.status ?? 1;
console.log(JSON.stringify({ exitCode: result.status, sourceFiles: files.length, changedOrAdded: files.filter(entry => entry.sha256 !== entry.previousArtifactSourceSha256).length, removed: removed.length }));
