// Actual local AR collection UI, no auth/action mocks or database client.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../../..'), privateRoot = path.join(root, '.codex-tmp');
for (const key of Object.keys(process.env)) if (!/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)) delete process.env[key];
require(path.join(root, 'scripts/local-gates-network.cjs'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (directory, name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const need = (condition, code) => { if (!condition) throw Object.assign(new Error(code), { publicCode: code }); };
let safeHandshake;
function privatePath(value, directory = false) {
  need(typeof value === 'string' && path.isAbsolute(value), 'PRIVATE_PATH_REQUIRED');
  const result = path.resolve(value); need(result.toLowerCase().startsWith(privateRoot.toLowerCase() + path.sep), 'PRIVATE_PATH_OUTSIDE_WORKSPACE');
  need(!fs.lstatSync(privateRoot).isSymbolicLink(), 'PRIVATE_ROOT_LINK_REFUSED');
  for (let current = result; current.toLowerCase() !== privateRoot.toLowerCase(); current = path.dirname(current)) {
    const stat = fs.lstatSync(current); need(!stat.isSymbolicLink(), 'PRIVATE_PATH_LINK_REFUSED');
    if (current === result) need(directory ? stat.isDirectory() : stat.isFile(), 'PRIVATE_PATH_KIND_MISMATCH');
  }
  return result;
}
const sources = ['components/finance/CustomerSettlementControls.tsx', 'components/finance/AROpenItemsHistoryWorkbench.tsx', 'hooks/useAROpenItemsHistoryWorkbench.ts',
  'hooks/usePermissions.ts', 'hooks/useClientAuth.ts', 'components/auth/v2/LoginV2Form.tsx', 'lib/auth-client.ts', 'lib/auth.ts',
  'actions/finance/customer-settlement.actions.ts', 'actions/finance/ar-history.actions.ts', 'actions/security/step-up-auth.actions.ts',
  'services/accounting/customer-settlement.service.ts', 'services/accounting/customer-settlement.schemas.ts', 'services/accounting/customer-settlement-workbench.service.ts',
  'services/payments/customer-settlement-payment-authority.service.ts', 'services/payments/pos-electronic-tender-authority.service.ts',
  'app/[locale]/(dashboard)/dashboard/finance/receivables/history/page.tsx'];
const operations = ['stale-assurance', 'verify-no-collection-before-manual-retry', 'verify-one-collection', 'revoke-collect-permission', 'restore-collect-permission', 'revoke-current-session'];
async function main() {
  need(process.argv.length === 3, 'ONE_PRIVATE_CONTROL_PATH_REQUIRED');
  const fixture = JSON.parse(fs.readFileSync(privatePath(process.argv[2]), 'utf8'));
  need(fixture.version === 1 && fixture.origin === 'https://127.0.0.1:43882' && fixture.locale === 'en' && fixture.method === 'MOBILE_MONEY' && fixture.amount === '100.00', 'EXACT_LOCAL_COLLECTION_FIXTURE_REQUIRED');
  for (const key of ['organizationId', 'actorId', 'customerId', 'documentId', 'paymentTransactionId', 'providerReference', 'paymentDate', 'email', 'password']) need(typeof fixture[key] === 'string' && fixture[key].length > 0, 'FIXTURE_FIELD_REQUIRED');
  const handshake = privatePath(fixture.handshakeDirectory, true), support = privatePath(fixture.supportPath); need(hash(fs.readFileSync(support)) === fixture.supportSha256, 'SUPPORT_FILE_CHANGED');
  need(!fs.existsSync(path.join(handshake, 'FINISHED.json')), 'ALREADY_FINISHED'); safeHandshake = handshake;
  const directory = path.join(__dirname, 'attempt-' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(directory);
  const temporary = path.join(handshake, 'browser-' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(temporary); process.env.TEMP = temporary; process.env.TMP = temporary;
  const binding = [...sources.map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(root, file))) })), { path: path.relative(root, __filename).replaceAll('\\', '/'), sha256: hash(fs.readFileSync(__filename)) }];
  write(directory, 'SOURCE_BINDING.json', { checkedAt: new Date().toISOString(), source: binding, classification: 'Inspected root source; controller separately binds actual development snapshot/private Prisma override/dependencies.' });
  write(directory, 'RUNNER_REVIEW.json', { checkedAt: new Date().toISOString(), origin: fixture.origin, route: '/en/dashboard/finance/receivables/history',
    classification: 'Actual password/session/application/actions, synthetic source facts; no production artifact or live provider authenticity.',
    operations, effects: ['Actual synthetic password sign-in and password re-verification', 'One exact provider-linked customer collection through UI', 'Private file selection/local hashing only', 'Scoped private controller handshake requests', 'Owned Edge/profile/screenshots'],
    boundaries: ['Exact loopback origin and its HMR only', 'No app/DB startup or stop', 'No direct role/session/financial writes by runner', 'No sends, HAR, trace, network bodies, storageState or raw browser error stacks', 'Credentials/support/profile remain private'] });
  const steps = [], transitions = [], network = [], websocket = [], responses = []; let index = 0, browser, context, page, stage = 'browser-start', pageErrors = 0, consoleErrors = 0, browserClosed = false, contextClosed = false, outcome;
  const cleanupErrors = [];
  const record = id => { steps.push({ id, passed: true, checkedAt: new Date().toISOString() }); console.log(JSON.stringify({ event: 'step-passed', id })); };
  async function transition(operation) {
    need(operation === operations[index], 'CONTROL_OPERATION_ORDER_MISMATCH'); const id = crypto.randomBytes(16).toString('hex'); write(handshake, id + '.request.json', { id, operation });
    console.log(JSON.stringify({ event: 'control-requested', id, operation })); const response = path.join(handshake, id + '.response.json'), deadline = Date.now() + 30000;
    while (!fs.existsSync(response)) { need(Date.now() < deadline, 'CONTROLLER_ACK_TIMEOUT'); await new Promise(resolve => setTimeout(resolve, 200)); }
    const result = JSON.parse(fs.readFileSync(privatePath(response), 'utf8')); need(result.id === id && result.operation === operation && result.applied === true, 'CONTROL_NOT_CONFIRMED'); transitions.push(result); index++;
  }
  const widget = () => page.getByRole('region', { name: 'Customer payments', exact: true });
  const paymentForm = () => widget().getByRole('form', { name: 'Record customer payment', exact: true });
  const receiptSelect = () => paymentForm().getByLabel('Confirmed provider receipt (optional)', { exact: true });
  const amount = () => paymentForm().getByLabel('Amount (XAF)', { exact: true });
  async function screenshot(name) { await page.screenshot({ path: path.join(directory, name + '.png'), fullPage: true, mask: [page.locator('input[type="password"],input[type="email"],input[type="file"]'), page.getByText(fixture.email, { exact: true }), page.locator('nextjs-portal')] }); }
  async function manualDraft(label) {
    await widget().getByRole('button', { name: 'Record customer payment', exact: true }).click();
    await amount().fill('1.00'); await paymentForm().getByLabel('Payment / evidence reference', { exact: true }).fill('synthetic-private-' + label + '-' + crypto.randomBytes(5).toString('hex'));
    await paymentForm().getByLabel('Notes (optional)', { exact: true }).fill('Synthetic private draft ' + label);
    await paymentForm().getByLabel('Supporting evidence file', { exact: true }).setInputFiles(support);
  }
  async function assertWidgetPrivateStateHidden() {
    need(await paymentForm().count() === 0 && await widget().getByLabel('Confirmed provider receipt (optional)', { exact: true }).count() === 0, 'PRIVATE_FORM_OR_SELECTION_REMAINED');
    need(await widget().getByText(/Current amount due:/).count() === 0, 'PRIVATE_AMOUNT_REMAINED_AFTER_DENIAL');
  }
  try {
    const { chromium } = require(path.join(root, 'node_modules/playwright'));
    browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-default-browser-check'] });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ignoreHTTPSErrors: true, serviceWorkers: 'block' });
    await context.route('**/*', route => { const request = route.request(), url = new URL(request.url()), allowed = url.origin === fixture.origin;
      network.push({ category: allowed ? url.pathname === '/api/auth/sign-in/email' ? 'password-sign-in' : url.pathname.startsWith('/api/') ? 'same-origin-api' : request.method() === 'POST' ? 'protected-server-action' : 'same-origin-resource' : 'blocked-external', method: request.method(), allowed }); return allowed ? route.continue() : route.abort(); });
    await context.routeWebSocket('**/*', socket => { const url = new URL(socket.url()), allowed = url.origin === 'wss://127.0.0.1:43882' && url.pathname === '/_next/webpack-hmr'; websocket.push({ allowed }); if (allowed) socket.connectToServer(); else void socket.close(); });
    page = await context.newPage(); page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(180000); page.on('pageerror', () => { pageErrors++ }); page.on('console', value => { if (value.type() === 'error') consoleErrors++ });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin === fixture.origin && (url.pathname.startsWith('/api/') || response.request().method() === 'POST')) responses.push({ category: url.pathname === '/api/auth/sign-in/email' ? 'password-sign-in' : response.request().method() === 'POST' ? 'protected-server-action-or-auth' : 'same-origin-api', status: response.status() }); });
    const route = '/en/dashboard/finance/receivables/history?customerId=' + encodeURIComponent(fixture.customerId) + '&selected=' + encodeURIComponent(fixture.documentId);
    stage = 'actual-password-login'; await page.goto(fixture.origin + '/en/login-v2?returnUrl=' + encodeURIComponent(route), { waitUntil: 'domcontentloaded' });
    const email = page.locator('input[name="email"]'), password = page.locator('input[name="password"]'); await email.fill(fixture.email); await password.fill(fixture.password);
    const signedIn = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/sign-in/email' && response.request().method() === 'POST'); await page.locator('form').filter({ has: email }).locator('button[type="submit"]').click(); need((await signedIn).status() === 200, 'REAL_PASSWORD_SIGN_IN_DENIED');
    await page.waitForURL(url => url.origin === fixture.origin && url.pathname === '/en/dashboard/finance/receivables/history' && url.searchParams.get('selected') === fixture.documentId, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await widget().waitFor(); await widget().getByRole('button', { name: 'Record customer payment', exact: true }).waitFor();
    const cookie = (await context.cookies(fixture.origin)).find(value => /session_token$/.test(value.name)); need(cookie && cookie.secure && cookie.httpOnly, 'SECURE_HTTPONLY_ACTUAL_SESSION_REQUIRED'); record('actual-password-session-and-opening-receivable-deep-link');
    stage = 'select-confirmed-native-receipt'; await transition('stale-assurance'); await widget().getByRole('button', { name: 'Record customer payment', exact: true }).click();
    await paymentForm().getByLabel('Payment method', { exact: true }).selectOption('MOBILE_MONEY'); await receiptSelect().selectOption(fixture.paymentTransactionId);
    need(await receiptSelect().inputValue() === fixture.paymentTransactionId && await amount().inputValue() === '100.00', 'CONFIRMED_RECEIPT_NOT_SELECTED');
    need(await paymentForm().getByLabel('Payment / evidence reference', { exact: true }).inputValue() === fixture.providerReference, 'NATIVE_REFERENCE_NOT_PREFILLED');
    need(await paymentForm().getByLabel('Payment date', { exact: true }).inputValue() === fixture.paymentDate, 'NATIVE_DATE_NOT_PREFILLED');
    await paymentForm().getByLabel('Supporting evidence file', { exact: true }).setInputFiles(support); record('explicit-native-receipt-selection-and-private-local-file-hash'); await screenshot('native-selection-desktop');
    stage = 'fresh-password-and-manual-retry'; await paymentForm().getByRole('button', { name: 'Confirm payment', exact: true }).focus(); await page.keyboard.press('Enter');
    const currentPassword = widget().getByLabel('Current password', { exact: true }); await currentPassword.waitFor(); need(await currentPassword.evaluate(value => value === document.activeElement), 'PASSWORD_FOCUS_MISSING');
    await currentPassword.fill(fixture.password); await page.keyboard.press('Enter'); await widget().getByText('Identity verified. Retry the payment action to continue.', { exact: true }).waitFor();
    await transition('verify-no-collection-before-manual-retry'); need(await paymentForm().getByRole('button', { name: 'Retry the same payment', exact: true }).count() === 1, 'EXACT_MANUAL_RETRY_MISSING');
    record('real-password-step-up-has-no-financial-effect-before-manual-retry'); await paymentForm().getByRole('button', { name: 'Retry the same payment', exact: true }).click();
    await widget().getByText('Customer payment recorded. The invoice and accounting entries have been updated.', { exact: true }).waitFor(); await transition('verify-one-collection');
    record('exactly-one-real-linked-collection-posted-and-database-verified'); await screenshot('linked-collection-desktop'); await page.setViewportSize({ width: 390, height: 1000 }); await screenshot('linked-collection-mobile'); await page.setViewportSize({ width: 1440, height: 1000 });
    stage = 'actual-collection-permission-revocation'; await widget().getByRole('button', { name: 'Record customer payment', exact: true }).waitFor(); await manualDraft('permission-denial'); await transition('revoke-collect-permission');
    await paymentForm().getByRole('button', { name: 'Confirm payment', exact: true }).click(); await widget().getByText('This action is not available with your current permissions, workspace or payment state. Refresh payments before continuing.', { exact: true }).waitFor(); await assertWidgetPrivateStateHidden();
    await widget().getByRole('button', { name: 'Refresh payments', exact: true }).click(); await widget().getByText('This invoice is read-only for your current permissions or state.', { exact: true }).waitFor();
    need(await widget().getByRole('button', { name: 'Record customer payment', exact: true }).count() === 0 && await receiptSelect().count() === 0, 'COLLECT_REVOKED_READ_EXPOSED_WRITE_CONTROLS'); record('actual-collect-denial-clears-private-draft-and-fresh-read-is-read-only'); await screenshot('collection-permission-denial-desktop');
    stage = 'actual-collection-permission-restoration'; await transition('restore-collect-permission'); await widget().getByRole('button', { name: 'Refresh payments', exact: true }).click(); await widget().getByRole('button', { name: 'Record customer payment', exact: true }).waitFor();
    await manualDraft('session-denial'); need(await paymentForm().getByLabel('Notes (optional)', { exact: true }).inputValue() === 'Synthetic private draft session-denial', 'RESTORED_DRAFT_NOT_FRESH'); record('fresh-read-restores-collection-access-with-new-draft');
    stage = 'actual-current-session-revocation'; await transition('revoke-current-session'); await paymentForm().getByRole('button', { name: 'Confirm payment', exact: true }).click();
    await widget().getByText('This action is not available with your current permissions, workspace or payment state. Refresh payments before continuing.', { exact: true }).waitFor(); await assertWidgetPrivateStateHidden();
    await widget().getByRole('button', { name: 'Refresh payments', exact: true }).click(); await widget().getByText('Current payments could not be loaded. Refresh before continuing.', { exact: true }).waitFor(); await assertWidgetPrivateStateHidden();
    record('actual-revoked-session-command-and-read-hide-private-payment-data'); await screenshot('session-revocation-desktop');
    need(index === operations.length && pageErrors === 0, 'INCOMPLETE_OPERATIONS_OR_UNCAUGHT_PAGE_ERROR'); for (const file of binding) need(hash(fs.readFileSync(path.join(root, file.path))) === file.sha256, 'QUALIFIED_SOURCE_CHANGED');
    outcome = { passed: true, steps, transitions, network, websocket, responses, pageErrorCount: pageErrors, consoleErrorCount: consoleErrors, sourceBindingSha256: hash(fs.readFileSync(path.join(directory, 'SOURCE_BINDING.json'))) };
  } catch (error) { outcome = { passed: false, failure: { stage, code: error.publicCode || 'BROWSER_OPERATION_FAILED', errorType: ['TimeoutError', 'AssertionError'].includes(error.name) ? error.name : 'Error' }, steps, transitions, network, websocket, responses, pageErrorCount: pageErrors, consoleErrorCount: consoleErrors }; }
  finally { try { if (context) { await context.close(); contextClosed = true; } } catch { cleanupErrors.push('CONTEXT_CLOSE_FAILED'); } try { if (browser) { await browser.close(); browserClosed = true; } } catch { cleanupErrors.push('BROWSER_CLOSE_FAILED'); } }
  const profiles = fs.readdirSync(temporary).filter(name => name.startsWith('playwright_chromiumdev_profile-')).length; if (cleanupErrors.length || profiles) outcome.passed = false;
  write(directory, 'RESULT.json', { checkedAt: new Date().toISOString(), ...outcome, browserClosed, contextClosed, cleanupErrors, remainingOwnedProfileDirectories: profiles,
    classification: 'Actual local DEVELOPMENT application/session/actions, synthetic opening/provider facts, private file hash only; no production/provider-authenticity/custody claim.',
    privacy: 'Credentials, cookies, control-file hash, full request/response bodies, support contents, traces and browser error stacks were not published.' });
  write(handshake, 'FINISHED.json', { passed: outcome.passed, checkedAt: new Date().toISOString(), evidenceDirectory: directory });
  console.log(JSON.stringify({ event: 'journey-complete', passed: outcome.passed, stage: outcome.passed ? 'complete' : stage, evidenceDirectory: directory, browserClosed, contextClosed })); if (!outcome.passed) process.exitCode = 1;
}
if (require.main === module) main().catch(() => { if (safeHandshake && !fs.existsSync(path.join(safeHandshake, 'FINISHED.json'))) write(safeHandshake, 'FINISHED.json', { passed: false, checkedAt: new Date().toISOString(), preflightFailed: true }); console.error('Authenticated collection browser preflight failed; private values were not printed.'); process.exitCode = 1; });
