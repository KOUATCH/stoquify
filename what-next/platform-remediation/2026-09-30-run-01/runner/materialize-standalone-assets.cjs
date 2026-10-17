const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const dist = path.join(root, '.next-remediation-r01-20260930');
const standalone = path.join(dist, 'standalone');
const resultPath = path.join(__dirname, 'standalone-assets.result.json');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function inside(parent, child) {
  const relative = path.relative(parent, child);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Path escapes owned asset boundary');
}
function files(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Artifact or asset link is not allowed');
    if (entry.isDirectory()) result.push(...files(target));
    else if (entry.isFile()) result.push(target);
    else throw new Error('Unsupported asset');
  }
  return result;
}
async function main() {
  if (fs.existsSync(resultPath)) throw new Error('Asset evidence already exists');
  const recovery = JSON.parse(fs.readFileSync(path.join(__dirname, 'standalone-recovery.result.json'), 'utf8'));
  if (recovery.status !== 'packaging-recovered') throw new Error('Packaging has not passed recovery verification');
  inside(root, dist); inside(dist, standalone);
  if (fs.realpathSync(standalone) !== standalone) throw new Error('Standalone must be a real owned directory');
  files(standalone); // Check all ancestors before writing into an existing package.
  const plan = [];
  for (const [sourceRoot, destinationRoot] of [
    [path.join(root, 'public'), path.join(standalone, 'public')],
    [path.join(dist, 'static'), path.join(standalone, path.basename(dist), 'static')],
  ]) {
    inside(standalone, destinationRoot);
    if (fs.realpathSync(sourceRoot) !== sourceRoot) throw new Error('Asset source must be a real directory');
    for (const source of files(sourceRoot)) plan.push({ source, destination: path.join(destinationRoot, path.relative(sourceRoot, source)), sha256: sha(source) });
  }
  const startedAt = new Date().toISOString();
  for (const item of plan) {
    inside(standalone, item.destination);
    await fs.promises.mkdir(path.dirname(item.destination), { recursive: true });
    await fs.promises.copyFile(item.source, item.destination);
  }
  const mismatches = plan.filter(item => sha(item.source) !== item.sha256 || sha(item.destination) !== item.sha256).map(item => path.relative(standalone, item.destination));
  const allFiles = files(standalone);
  const hashes = Object.fromEntries(allFiles.sort().map(file => [path.relative(standalone, file).replaceAll('\\', '/'), sha(file)]));
  fs.writeFileSync(path.join(__dirname, 'standalone-package-hashes.json'), JSON.stringify(hashes, null, 2));
  const safe = require('../../../../scripts/build-app-safe.js');
  const output = safe.inspectNextOutput(root, { env: { ...process.env, NEXT_DIST_DIR: path.basename(dist) } });
  const result = { startedAt, endedAt: new Date().toISOString(), status: mismatches.length || output.state !== 'valid' ? 'failed' : 'assets-verified', buildId: recovery.buildId, packagePath: standalone, copiedAssetFiles: plan.length, packageFileCount: allFiles.length, mismatches, linksFound: 0, safeOutputInspection: { state: output.state, reasons: output.reasons, requireStandalone: output.requireStandalone }, environmentFiles: 'Kept task-local; hashes only in evidence; runtime must override database aliases and block external sockets' };
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (result.status !== 'assets-verified') process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
