const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../..');
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'services/daily-habit/daily-habit-digest-presentation.ts', 'components/daily-habit/DailyHabitDigestDashboard.tsx', 'app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx', 'app/[locale]/(dashboard)/dashboard/owner-war-room/owner-war-room-route-access.tsx', 'messages/en.json', 'messages/fr.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex')]));
const receipt = { startedAt: new Date().toISOString(), command: 'node node_modules/typescript/bin/tsc --noEmit --pretty false', sourceBefore: hashes(), timeoutMs: 1200000 };
const output = path.join(__dirname, 'evidence', 'digest-handoff-typecheck-' + crypto.randomUUID() + '.json');
// Fail before the costly checker if this environment cannot retain the receipt.
fs.writeFileSync(output, JSON.stringify({ ...receipt, state: 'running' }, null, 2) + '\n', { flag: 'wx' });
const check = spawnSync(process.execPath, [path.join(repo, 'node_modules/typescript/bin/tsc'), '--noEmit', '--pretty', 'false'], { cwd: repo, encoding: 'utf8', windowsHide: true, shell: false, timeout: receipt.timeoutMs, maxBuffer: 1024 * 1024 });
Object.assign(receipt, { endedAt: new Date().toISOString(), status: check.status, signal: check.signal, errorCode: check.error?.code ?? null, output: (check.stdout ?? '') + (check.stderr ?? ''), sourceAfter: hashes() });
receipt.sourceStable = JSON.stringify(receipt.sourceBefore) === JSON.stringify(receipt.sourceAfter);
receipt.passed = check.status === 0 && !check.error && receipt.sourceStable;
console.log(JSON.stringify({ output, passed: receipt.passed, status: check.status, errorCode: receipt.errorCode, sourceStable: receipt.sourceStable, diagnostics: receipt.output }));
const value = JSON.stringify(receipt, null, 2) + '\n', fd = fs.openSync(output, 'r+');
try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); }
process.exitCode = receipt.passed ? 0 : 1;
