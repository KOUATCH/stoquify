const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), hash = value => crypto.createHash('sha256').update(value).digest('hex');
const checks = JSON.parse(fs.readFileSync(path.join(__dirname, 'evidence/source-withdrawal-checks-8848b033-e69d-4a03-9d57-5fbbc149ac9e.json'), 'utf8'));
const report = { at: new Date().toISOString(), reusedChecks: 'source-withdrawal-checks-8848b033-e69d-4a03-9d57-5fbbc149ac9e.json', files: {} };
try {
  if (!checks.passed || !checks.sourceStable) throw Error('Prior checks are not reusable');
  for (const [file, expected] of Object.entries(checks.sourceAfter)) {
    const bytes = fs.readFileSync(path.join(root, file)), currentHash = hash(bytes);
    let normalized = bytes.toString('utf8');
    if (file === 'components/finance/PaymentExceptionClosurePanel.tsx') normalized = normalized.replace("opener = useRef<HTMLButtonElement | null>(null), returnCaseId = useRef<string | null>(null)", "opener = useRef<HTMLButtonElement | null>(null)").replace("<Button ref={node => { if (node && returnCaseId.current === item.id) opener.current = node }} variant=\"outline\" disabled={busy} onClick={event => { returnCaseId.current = item.id; opener.current = event.currentTarget; select(item.id) }}>", "<Button variant=\"outline\" disabled={busy} onClick={event => { opener.current = event.currentTarget; select(item.id) }}>").replace('{t(withdrawing ? "withdrawalReason" : "reason")}</label><Textarea id=', '{t("reason")}</label><Textarea id=');
    if (file === 'messages/en.json' || file === 'messages/fr.json') normalized = normalized
      .replace(/^      "withdrawalReason": "[^"\r\n]*",\r?\n/m, '')
      .replace(/^        "payment_reconciliation_exception_source_(?:withdrawal_proposed|withdrawal_rejected|withdrawn)": "[^"\r\n]*",\r?\n/gm, '');
    if (hash(normalized) !== expected) throw Error('Unexpected post-check source change: ' + file);
    report.files[file] = { previousHash: expected, currentHash, onlySpecifiedPresentationChange: currentHash !== expected };
  }
  const args = ['node_modules/eslint/bin/eslint.js', 'components/finance/PaymentExceptionClosurePanel.tsx'];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 300000 });
  report.lint = { args, status: result.status, error: result.error?.code ?? null, stdout: result.stdout, stderr: result.stderr };
  if (result.status !== 0 || result.error) throw Error('Final component lint failed');
  const typeArgs = ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false'];
  const typed = spawnSync(process.execPath, typeArgs, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 1200000, maxBuffer: 2 * 1024 * 1024 });
  report.typecheck = { args: typeArgs, status: typed.status, error: typed.error?.code ?? null, stdout: typed.stdout, stderr: typed.stderr };
  if (typed.status !== 0 || typed.error) throw Error('Final TypeScript check failed');
  report.passed = true;
} catch (error) { report.passed = false; report.error = error.message; process.exitCode = 1; }
const output = path.join(__dirname, 'evidence/source-withdrawal-final-copy-' + crypto.randomUUID() + '.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error }));
