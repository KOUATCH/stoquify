const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../..');
const files = ['services/snapshots/tenant-operating-snapshot.service.ts', 'services/snapshots/snapshot-contracts.ts', 'services/snapshots/snapshot-rebuild.service.ts', 'services/cash-command/cash-command.service.ts', 'services/cash-command/cash-command-contracts.ts', 'services/owner-war-room/owner-war-room.service.ts', 'services/owner-war-room/owner-war-room-contracts.ts', 'services/manager-action-center/manager-action-center.service.ts', 'services/analytics/financial-analytics.service.ts', 'services/finance/finance-dashboard.service.ts', 'services/compliance/compliance-center.service.ts', 'services/accounting/close-assurance.service.ts', 'lib/dashboard/snapshot-blocker-presentation.ts', 'services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts', 'services/cash-command/__tests__/cash-command.service.test.ts', 'services/owner-war-room/__tests__/owner-war-room.service.test.ts', 'services/finance/__tests__/finance-dashboard.service.test.ts', 'services/analytics/__tests__/financial-analytics.service.test.ts', 'lib/dashboard/__tests__/snapshot-source-blocker-presentation.test.ts', 'tsconfig.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex')]));
const receipt = { startedAt: new Date().toISOString(), command: 'node node_modules/typescript/bin/tsc --noEmit --pretty false', sourceBefore: hashes(), timeoutMs: 1200000 };
const output = path.join(__dirname, 'evidence', 'forecast-currency-typecheck-' + crypto.randomUUID() + '.json');
fs.writeFileSync(output, JSON.stringify({ ...receipt, state: 'running' }, null, 2) + '\n', { flag: 'wx' });
const check = spawnSync(process.execPath, [path.join(repo, 'node_modules/typescript/bin/tsc'), '--noEmit', '--pretty', 'false'], { cwd: repo, encoding: 'utf8', windowsHide: true, shell: false, timeout: receipt.timeoutMs, maxBuffer: 1024 * 1024 });
Object.assign(receipt, { endedAt: new Date().toISOString(), status: check.status, signal: check.signal, errorCode: check.error?.code ?? null, output: (check.stdout ?? '') + (check.stderr ?? ''), sourceAfter: hashes() });
receipt.sourceStable = JSON.stringify(receipt.sourceBefore) === JSON.stringify(receipt.sourceAfter);
receipt.passed = check.status === 0 && !check.error && receipt.sourceStable;
console.log(JSON.stringify({ output, passed: receipt.passed, status: check.status, errorCode: receipt.errorCode, sourceStable: receipt.sourceStable, diagnostics: receipt.output }));
const value = JSON.stringify(receipt, null, 2) + '\n', fd = fs.openSync(output, 'r+');
try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); }
process.exitCode = receipt.passed ? 0 : 1;
