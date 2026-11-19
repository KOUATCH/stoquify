// Scoped lint only, OS-only environment; no app/Next config/.env/DB/generation.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files = ['services/pos/pos.service.ts', 'services/accounting/customer-settlement.service.ts', 'services/payments/pos-electronic-tender-authority.service.ts', 'services/payments/customer-settlement-payment-authority.service.ts',
  'services/pos/__tests__/pos.service.test.ts', 'services/accounting/__tests__/customer-settlement.service.test.ts', 'services/payments/__tests__/pos-electronic-tender-authority.service.test.ts'];
const directory = path.join(__dirname, 'lock-order-lint-' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(directory);
const bindings = [...files, '.eslintrc.json', 'package-lock.json'], before = Object.fromEntries(bindings.map(file => [file, hash(path.join(root, file))]));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const args = [path.join(root, 'node_modules/eslint/bin/eslint.js'), ...files, '--format', 'json', '--output-file', path.join(directory, 'eslint.json')];
const fd = fs.openSync(path.join(directory, 'checks.log'), 'wx'), began = new Date().toISOString();
const result = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 240000 }); fs.closeSync(fd);
const rows = fs.existsSync(path.join(directory, 'eslint.json')) ? JSON.parse(fs.readFileSync(path.join(directory, 'eslint.json'), 'utf8')) : [];
const errors = rows.reduce((sum, row) => sum + row.errorCount, 0), warnings = rows.reduce((sum, row) => sum + row.warningCount, 0), unchanged = bindings.every(file => hash(path.join(root, file)) === before[file]);
const receipt = { passed: result.status === 0 && rows.length === files.length && errors === 0 && warnings === 0 && unchanged, began, ended: new Date().toISOString(), exitCode: result.status, error: result.error?.code || null,
  args, errors, warnings, unchangedInputs: unchanged, sourceHashes: before, evidenceDirectory: directory, runnerSha256: hash(__filename), classification: 'Scoped ESLint only; no application, environment-file, database, browser or generation execution' };
fs.writeFileSync(path.join(directory, 'RESULT.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
