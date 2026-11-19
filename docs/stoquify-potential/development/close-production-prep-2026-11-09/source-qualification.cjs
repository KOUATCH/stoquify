// Static compiler/linter only. The explicitly generated private Prisma client is
// a type mapping; no application, Next config, dotenv, migration or network.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const [client, ...owned] = process.argv.slice(2);
assert(client && owned.length && path.resolve(client).startsWith(path.join(root, '.codex-tmp') + path.sep));
assert.equal(JSON.parse(fs.readFileSync(path.join(client, 'package.json'))).version, '6.19.3');
assert(owned.every(file => /^(actions|services|hooks|components|lib)\/.+\.tsx?$/.test(file) && !file.includes('..') && !file.includes('.test.')));
const id = crypto.randomBytes(5).toString('hex'), dir = path.join(__dirname, 'static-' + id); fs.mkdirSync(dir);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const bindings = [...owned, 'tsconfig.json', '.eslintrc.json', 'prisma/schema.prisma', 'package-lock.json'];
const before = Object.fromEntries(bindings.map(file => [file, digest(path.join(root, file))]));
const config = { extends: path.join(root, 'tsconfig.json'), compilerOptions: { incremental: false, paths: { '@/*': [root.replaceAll('\\', '/') + '/*'], '@prisma/client': [path.join(client, 'index.d.ts').replaceAll('\\', '/')] } } };
const configFile = path.join(dir, 'tsconfig.json'); fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
const checks = [];
for (const [name, args] of [
  ['typecheck', [path.join(root, 'node_modules/typescript/bin/tsc'), '--project', configFile, '--noEmit', '--incremental', 'false', '--pretty', 'false']],
  ['scoped-lint', [path.join(root, 'node_modules/eslint/bin/eslint.js'), ...owned, '--format', 'json', '--output-file', path.join(dir, 'eslint.json')]],
]) {
  const fd = fs.openSync(path.join(dir, name + '.log'), 'wx'), started = new Date().toISOString(); console.log(name + ': starting');
  const result = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 600000 }); fs.closeSync(fd);
  checks.push({ name, args, started, finished: new Date().toISOString(), exitCode: result.status, error: result.error?.code || null }); console.log(name + ': exit ' + result.status);
}
const unchanged = bindings.every(file => before[file] === digest(path.join(root, file)));
const lint = fs.existsSync(path.join(dir, 'eslint.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'eslint.json'))) : [];
const receipt = { passed: checks.every(check => check.exitCode === 0 && !check.error) && unchanged, checks, unchangedInputs: unchanged,
  sourceHashes: before, privateClient: client, privateClientSchemaSha256: digest(path.join(client, 'schema.prisma')), privateClientTypesSha256: digest(path.join(client, 'index.d.ts')),
  lintErrors: lint.reduce((sum, row) => sum + row.errorCount, 0), lintWarnings: lint.reduce((sum, row) => sum + row.warningCount, 0),
  runnerSha256: digest(__filename), configSha256: digest(configFile), evidenceDirectory: dir, classification: 'Static TypeScript and ESLint only; no build, database or browser qualification' };
fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
