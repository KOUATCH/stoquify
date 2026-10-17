const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const files = ['services/reconciliation/payment-reconciliation-certification.service.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts', 'services/reconciliation/__tests__/payment-reconciliation-evidence.service.test.ts', 'messages/en.json', 'messages/fr.json', 'tsconfig.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const report = { startedAt: new Date().toISOString(), command: 'node node_modules/typescript/bin/tsc --noEmit --pretty false', sourceBefore: hashes() };
const output = path.join(__dirname, 'evidence/signoff-typecheck-' + crypto.randomUUID() + '.json');
fs.writeFileSync(output, JSON.stringify({ ...report, state: 'running' }), { flag: 'wx' });
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--pretty', 'false'], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 1200000, maxBuffer: 1024 * 1024 });
Object.assign(report, { endedAt: new Date().toISOString(), status: result.status, errorCode: result.error?.code ?? null, diagnostics: (result.stdout || '') + (result.stderr || ''), sourceAfter: hashes() });
report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
report.passed = result.status === 0 && !result.error && report.sourceStable;
const value = JSON.stringify(report, null, 2), fd = fs.openSync(output, 'r+');
try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); }
console.log(JSON.stringify({ output, ...report })); process.exitCode = report.passed ? 0 : 1;
