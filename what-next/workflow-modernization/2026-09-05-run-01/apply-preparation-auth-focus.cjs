const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '../../..'), file = path.join(repo, 'components/finance/ReconciliationPreparationWorkbench.tsx');
let raw = fs.readFileSync(file, 'utf8');
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), 'bda5c7db5ba33ed55023ae33842bc0bc3610f5bb474ea24db92231dc5ff5fa2d');
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
function replace(before, after) { assert.equal(raw.split(before).length - 1, 1, before); raw = raw.replace(before, after); }
replace('  function fail(error: unknown) {', '  const primaryAction = useRef<HTMLButtonElement>(null), focusAfterAuthentication = useRef(false)' + newline + '  function fail(error: unknown, failureMessage?: string) {');
replace('setFeedback({ error: true, text: t(code ===', 'setFeedback({ error: true, text: failureMessage ?? t(code ===');
replace('async function perform(work: () => Promise<void>)', 'async function perform(work: () => Promise<void>, failureMessage?: string)');
replace('if (mounted.current) fail(error) }', 'if (mounted.current) fail(error, failureMessage) }');
const anchor = '  useEffect(() => { if (needsAuth && !busy) password.current?.focus() }, [needsAuth, busy])';
replace(anchor, anchor + newline + [
  '  useEffect(() => {',
  '    if (busy || needsAuth || !focusAfterAuthentication.current) return',
  '    focusAfterAuthentication.current = false',
  '    if (primaryAction.current && !primaryAction.current.disabled) primaryAction.current.focus()',
  '    else region.current?.focus()',
  '  }, [busy, needsAuth])',
].join(newline));
replace('throw new Error("Authentication failed"); setNeedsAuth(false);', 'throw new Error("Authentication failed"); focusAfterAuthentication.current = true; setNeedsAuth(false);');
replace('    }) }}><label htmlFor={`${runId}-preparation-password`}', '    }, common("suspenseWorkflow.review.authFailed")) }}><label htmlFor={`${runId}-preparation-password`}');
replace('<Button className="dashboard-button-primary" disabled={busy || !ready', '<Button ref={primaryAction} className="dashboard-button-primary" disabled={busy || !ready');
assert.ok(file.startsWith(repo + path.sep));
const retained = path.join(__dirname, 'evidence/preparation-before-auth-focus.tsx'); fs.copyFileSync(file, retained, fs.constants.COPYFILE_EXCL);
const staged = file + '.pending-' + crypto.randomUUID(); fs.writeFileSync(staged, raw, { flag: 'wx' }); fs.renameSync(staged, file);
assert.equal(fs.readFileSync(file, 'utf8'), raw); console.log(JSON.stringify({ file, sha256: crypto.createHash('sha256').update(raw).digest('hex') }));
