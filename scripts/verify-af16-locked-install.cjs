// Fresh lockfile materialization only. Never modifies the retained build candidate.
// Dependency lifecycle hooks remain disabled; this is not a full build qualification.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { privateRoot, root } = require('./af16-verification-context.cjs');
const source = path.join(root, '.codex-tmp/af16-release-20261026');
const destination = path.join(privateRoot, 'af16-locked-install-20261026');
const output = path.join(root, 'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-26-run-02');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function main() {
  if (process.argv.length !== 2) throw Error('No arguments supported');
  if (fs.existsSync(destination) || fs.existsSync(path.join(output, 'locked-install.json'))) throw Error('Refusing existing target or receipt');
  const disk = fs.statfsSync(privateRoot);
  if (disk.bavail * disk.bsize < 8 * 1024 ** 3) throw Error('At least 8 GiB free required for this isolated dependency probe');
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'source-manifest.json')));
  const inputs = ['package.json', 'package-lock.json', 'vendor/xlsx-0.20.3.tgz'];
  for (const file of inputs) {
    const expected = manifest.files.find(row => row.path === file);
    if (!expected || sha(fs.readFileSync(path.join(source, file))) !== expected.sha256) throw Error('Frozen installation input differs: ' + file);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(source, 'package-lock.json')));
  if (pkg.workspaces || lock.lockfileVersion !== 3) throw Error('Unexpected installation layout');
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!entry.resolved) continue;
    if (entry.resolved === 'file:vendor/xlsx-0.20.3.tgz') {
      const integrity = 'sha512-' + crypto.createHash('sha512').update(fs.readFileSync(path.join(source, 'vendor/xlsx-0.20.3.tgz'))).digest('base64');
      if (entry.integrity !== integrity) throw Error('Vendored archive integrity mismatch');
    } else if (!entry.resolved.startsWith('https://registry.npmjs.org/')) throw Error('Unreviewed package source: ' + name);
  }
  fs.mkdirSync(destination);
  const copied = inputs.map(file => {
    const target = path.join(destination, file); fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, file), target, fs.constants.COPYFILE_EXCL);
    return { path: file, sha256: sha(fs.readFileSync(target)) };
  });
  const userConfig = path.join(destination, 'empty-user.npmrc'), globalConfig = path.join(destination, 'empty-global.npmrc');
  fs.writeFileSync(userConfig, '', { flag: 'wx' }); fs.writeFileSync(globalConfig, '', { flag: 'wx' });
  const env = {};
  for (const key of ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMSPEC']) if (process.env[key]) env[key] = process.env[key];
  const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const args = [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org', '--userconfig=' + userConfig, '--globalconfig=' + globalConfig, '--cache=' + path.join(destination, 'npm-cache')];
  const log = fs.openSync(path.join(output, 'locked-install.log'), 'wx');
  const start = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: destination, env, windowsHide: true, stdio: ['ignore', log, log], timeout: 20 * 60 * 1000 });
  fs.closeSync(log);
  const unchanged = copied.every(row => sha(fs.readFileSync(path.join(destination, row.path))) === row.sha256);
  const versions = {};
  for (const name of ['next', 'react', 'react-dom', 'prisma', '@prisma/client', 'typescript']) {
    const file = path.join(destination, 'node_modules', name, 'package.json');
    if (fs.existsSync(file)) versions[name] = JSON.parse(fs.readFileSync(file)).version;
  }
  const receipt = { observedAt: new Date().toISOString(), destination, command: 'npm ci --ignore-scripts --no-audit --no-fund with owned empty npm configuration and cache', node: process.version, exitCode: result.status, signal: result.signal, error: result.error?.message || null, elapsedMs: Date.now() - start, copiedInputs: copied, vendoredIntegrity: 'PASS', inputsUnchanged: unchanged, versions, passed: result.status === 0 && unchanged, limitations: ['Dependency lifecycle hooks deliberately disabled', 'No client generation, native-module runtime, application build, audit or database access in this probe', 'Existing frozen candidate node_modules not replaced'], skippedLifecyclePackages: Object.entries(lock.packages).filter(([, row]) => row.hasInstallScript).map(([name, row]) => ({ name, version: row.version })) };
  fs.writeFileSync(path.join(output, 'locked-install.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(receipt));
  process.exitCode = receipt.passed ? 0 : 1;
}
try { main(); } catch (error) { console.error(error.stack); process.exitCode = 1; }
