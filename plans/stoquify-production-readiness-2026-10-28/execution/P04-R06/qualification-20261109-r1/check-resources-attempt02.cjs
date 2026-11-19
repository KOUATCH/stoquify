// Read-only resource collection; its only write is a new receipt in this evidence packet.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const thresholds = Object.freeze({ freePhysicalBytes: 6 * 1024 ** 3, freeCommitBytes: 12 * 1024 ** 3, freeBuildDriveBytes: 12 * 1024 ** 3 });
function collect() {
  const raw = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'resource-snapshot-attempt02.ps1')], { windowsHide: true, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
  const snapshot = JSON.parse(raw.replace(/^\uFEFF/, ''));
  for (const key of ['totalPhysicalBytes','freePhysicalBytes','totalCommitBytes','freeCommitBytes']) assert(Number.isFinite(snapshot[key]) && snapshot[key] > 0, 'Invalid host measure: ' + key);
  const buildDrive = snapshot.drives.find(drive => drive.drive === 'D');
  assert(buildDrive && buildDrive.freeBytes > 0, 'Build drive unavailable');
  const failures = [];
  if (snapshot.freePhysicalBytes < thresholds.freePhysicalBytes) failures.push('physical_memory_headroom');
  if (snapshot.freeCommitBytes < thresholds.freeCommitBytes) failures.push('commit_headroom');
  if (buildDrive.freeBytes < thresholds.freeBuildDriveBytes) failures.push('build_drive_headroom');
  return { ...snapshot, thresholds, passed: failures.length === 0, failures, rationale: 'Conservative local retry gate: unchanged approximately 4 GiB default Node heap; retained compiler plus separate type/lint workers need native/process headroom. Thresholds admit an attempt, not a guarantee of build success.' };
}
if (require.main === module) {
  assert.equal(process.argv.length, 3, 'Provide a new receipt filename');
  const name = process.argv[2];
  assert(/^resource-[a-z0-9-]+\.json$/.test(name), 'Evidence-local receipt name required');
  const result = collect();
  fs.writeFileSync(path.join(__dirname, name), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: result.passed, failures: result.failures, freePhysicalGiB: result.freePhysicalBytes / 1024 ** 3, freeCommitGiB: result.freeCommitBytes / 1024 ** 3, receipt: name }));
}
module.exports = { collect, thresholds };
