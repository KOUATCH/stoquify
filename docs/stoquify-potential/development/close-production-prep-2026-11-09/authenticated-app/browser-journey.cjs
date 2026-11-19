// Actual authenticated UI on root's owned development app. No mocks or DB client.
// Private fixture, credentials, handshake and original/downloaded bytes stay private.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../../..'), privateRoot = path.join(root, '.codex-tmp');
const osKeys = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i;
for (const key of Object.keys(process.env)) if (!osKeys.test(key)) delete process.env[key];
require(path.join(root, 'scripts/local-gates-network.cjs'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (directory, name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const fail = code => { throw Object.assign(new Error(code), { publicCode: code }); };
const need = (condition, code) => { if (!condition) fail(code); };
function privatePath(value, directory = false) {
  need(typeof value === 'string' && path.isAbsolute(value), 'PRIVATE_PATH_REQUIRED');
  const ownedRoot = fs.lstatSync(privateRoot); need(ownedRoot.isDirectory() && !ownedRoot.isSymbolicLink(), 'PRIVATE_ROOT_LINK_REFUSED');
  const resolved = path.resolve(value), prefix = privateRoot.toLowerCase() + path.sep;
  need(resolved.toLowerCase().startsWith(prefix), 'PRIVATE_PATH_OUTSIDE_OWNED_TREE');
  for (let current = resolved; current.toLowerCase() !== privateRoot.toLowerCase(); current = path.dirname(current)) {
    const stat = fs.lstatSync(current); need(!stat.isSymbolicLink(), 'PRIVATE_PATH_LINK_REFUSED');
    if (current === resolved) need(directory ? stat.isDirectory() : stat.isFile(), 'PRIVATE_PATH_WRONG_KIND');
  }
  return resolved;
}
const sources = ['components/accounting/CloseAssuranceCenter.tsx', 'hooks/accounting/useCloseAssurance.ts', 'components/auth/v2/LoginV2Form.tsx',
  'app/[locale]/(dashboard)/dashboard/accounting/close/[periodId]/page.tsx', 'actions/accounting/close-assurance.actions.ts', 'actions/security/step-up-auth.actions.ts',
  'services/security/step-up-auth.service.ts', 'services/accounting/close-assurance-pack.service.ts', 'services/accounting/close-assurance.service.ts',
  'services/accounting/close-evidence-acceptance-authority.service.ts', 'services/accounting/periods.service.ts', 'services/accounting/period-control.service.ts',
  'prisma/migrations/20261017090000_period_close_control/migration.sql', 'lib/auth-client.ts', 'hooks/usePermissions.ts'];
const sourceBinding = () => [...sources.map(file => ({ path: file, sha256: digest(fs.readFileSync(path.join(root, file))) })),
  { path: path.relative(root, __filename).replaceAll('\\', '/'), sha256: digest(fs.readFileSync(__filename)) }];
function assertBinding(binding) { for (const file of binding) need(digest(fs.readFileSync(path.join(root, file.path))) === file.sha256, 'INSPECTED_SOURCE_CHANGED'); }
const orderedOperations = ['stale-proof', 'suspend-close-module', 'restore-close-module', 'revoke-current-session'];
async function main() {
  need(process.argv.length === 3, 'ONE_PRIVATE_FIXTURE_PATH_REQUIRED');
  const fixture = JSON.parse(fs.readFileSync(privatePath(process.argv[2]), 'utf8'));
  need(fixture.version === 1 && fixture.origin === 'https://127.0.0.1:43872' && ['en', 'fr'].includes(fixture.locale), 'FIXTURE_TARGET_MISMATCH');
  for (const key of ['organizationId', 'actorId', 'periodId', 'originalExportId', 'originalRunId']) need(typeof fixture[key] === 'string' && fixture[key].length > 0 && fixture[key].length <= 200, 'FIXTURE_ID_REQUIRED');
  need(typeof fixture.email === 'string' && typeof fixture.password === 'string' && fixture.password.length > 0, 'PRIVATE_CREDENTIALS_REQUIRED');
  need(/^sha256:[a-f0-9]{64}$/.test(fixture.originalDocumentDigest), 'EXPECTED_DOCUMENT_DIGEST_REQUIRED');
  const originalPath = privatePath(fixture.originalDocumentPath), handshake = privatePath(fixture.handshakeDirectory, true);
  need(!fs.existsSync(path.join(handshake, 'FINISHED.json')), 'HANDSHAKE_ALREADY_FINISHED');
  const original = fs.readFileSync(originalPath), originalDigest = 'sha256:' + digest(original);
  need(originalDigest === fixture.originalDocumentDigest && Buffer.from(original.toString('utf8'), 'utf8').equals(original), 'PRIVATE_ORIGINAL_DIGEST_OR_UTF8_MISMATCH');
  JSON.parse(original.toString('utf8'));
  const directory = path.join(__dirname, 'attempt-' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(directory);
  // An actual session's browser profile/cookie database must remain private even
  // while the browser is running or if a later cleanup operation fails.
  const temporary = path.join(handshake, 'browser-' + crypto.randomBytes(3).toString('hex')); fs.mkdirSync(temporary); process.env.TEMP = temporary; process.env.TMP = temporary;
  const binding = sourceBinding();
  write(directory, 'SOURCE_BINDING.json', { checkedAt: new Date().toISOString(), source: binding,
    note: 'Inspected root source binding. Root separately owns application snapshot/startup and schema-only module override receipts.' });
  write(directory, 'RUNNER_REVIEW.json', { checkedAt: new Date().toISOString(), origin: fixture.origin,
    classification: 'Actual authenticated current-source DEVELOPMENT application. Schema-only module override and read-only reused dependencies; not a sealed production artifact or hosted release.',
    auth: 'Actual BetterAuth password UI and actual protected server actions; no auth/action mocks.', orderedOperations,
    effects: ['Owned headless installed Edge/profile', 'Actual synthetic sign-in, optional password step-up and retained-export reads/audits', 'Private wx handshake requests only', 'Private downloaded UTF8 bytes', 'Public safe screenshots and digest/status-only receipts'],
    boundaries: ['Exact TLS loopback origin only', 'Only matching loopback Next HMR websocket allowed', 'No app/server/DB startup or teardown', 'No role/session/financial writes by browser runner', 'No emails', 'No credentials/cookies/network bodies/HAR/trace/storageState published'],
    fixtureIds: { organizationId: fixture.organizationId, actorId: fixture.actorId, periodId: fixture.periodId, originalRunId: fixture.originalRunId, originalExportId: fixture.originalExportId },
    expectedDocumentDigest: originalDigest, sourceBindingSha256: digest(fs.readFileSync(path.join(directory, 'SOURCE_BINDING.json'))) });
  const steps = [], transitions = [], downloads = [], observations = [], network = [], websocket = [], responses = [];
  let operationIndex = 0, stage = 'browser-start', browser, context, page, browserClosed = false, contextClosed = false, moduleSuspended = false, pageErrors = 0, consoleErrors = 0, downloadCount = 0, outcome;
  const cleanupErrors = [];
  const record = id => { steps.push({ id, passed: true, checkedAt: new Date().toISOString() }); console.log(JSON.stringify({ event: 'step-passed', id })); };
  async function transition(operation) {
    need(operation === orderedOperations[operationIndex], 'HANDSHAKE_OPERATION_ORDER_MISMATCH');
    const id = crypto.randomBytes(16).toString('hex');
    write(handshake, id + '.request.json', { id, operation });
    if (operation === 'suspend-close-module') moduleSuspended = true; // Root may apply it even if the reply is delayed.
    console.log(JSON.stringify({ event: 'control-requested', id, operation }));
    const responsePath = path.join(handshake, id + '.response.json'), deadline = Date.now() + 30_000;
    while (!fs.existsSync(responsePath)) { need(Date.now() < deadline, 'ROOT_CONTROL_RESPONSE_TIMEOUT'); await new Promise(resolve => setTimeout(resolve, 200)); }
    const response = JSON.parse(fs.readFileSync(privatePath(responsePath), 'utf8'));
    need(response.id === id && response.operation === operation && response.applied === true && Number.isFinite(Date.parse(response.checkedAt)), 'ROOT_CONTROL_TRANSITION_UNCONFIRMED');
    transitions.push({ id, operation, applied: true, checkedAt: response.checkedAt }); operationIndex++;
    if (operation === 'suspend-close-module') moduleSuspended = true;
    if (operation === 'restore-close-module') moduleSuspended = false;
  }
  const locale = fixture.locale, t = (en, fr) => locale === 'fr' ? fr : en;
  const closePath = '/' + locale + '/dashboard/accounting/close/' + encodeURIComponent(fixture.periodId);
  const workspace = () => page.getByTestId('close-readiness-workspace');
  const receipts = () => page.getByRole('region', { name: t('Retained export receipts', 'Reçus des exports conservés'), exact: true });
  const recovery = () => receipts().locator('li').filter({ hasText: fixture.originalDocumentDigest }).filter({ hasText: 'CERTIFIED' }).first().getByRole('button', { name: t('Recover original JSON', 'Récupérer le JSON d’origine'), exact: true });
  const denyHeading = () => page.getByRole('heading', { name: t('Access to close evidence denied', 'Accès aux preuves de clôture refusé'), exact: true });
  const decision = () => page.getByRole('textbox', { name: t('Decision notes', 'Notes de decision'), exact: true });
  async function observeCurrentBadge(label) {
    observations.push({ label,
      currentCertificationBadgeVisible: await page.getByText(t('Current certification evidence', 'Preuves de certification à jour'), { exact: true }).count() > 0,
      certifiedExportDisabled: await page.getByRole('button', { name: t('Export certified JSON', 'Exporter JSON certifie'), exact: true }).isDisabled(),
      interpretation: 'Observed application presentation only; retained-byte recovery does not establish current financial approval.' });
  }
  async function screenshot(name) {
    await page.screenshot({ path: path.join(directory, name + '.png'), fullPage: true,
      mask: [page.locator('input[type="password"],input[type="email"]'), page.getByText(fixture.email, { exact: true }), page.locator('nextjs-portal')] });
  }
  async function recoverOriginal(label, requirePasswordStepUp = false) {
    const before = downloadCount;
    const downloaded = page.waitForEvent('download', { timeout: 90_000 }).then(value => ({ kind: 'download', value }), () => ({ kind: 'timeout' }));
    const password = page.getByLabel(t('Current password', 'Mot de passe actuel'), { exact: true });
    const auth = password.waitFor({ state: 'visible', timeout: 90_000 }).then(() => ({ kind: 'step-up' }), () => ({ kind: 'timeout' }));
    await recovery().focus(); await page.keyboard.press('Enter');
    const first = await Promise.race([downloaded, auth]); need(first.kind !== 'timeout', 'RECOVERY_NEITHER_DOWNLOAD_NOR_STEP_UP');
    need(!requirePasswordStepUp || first.kind === 'step-up', 'STALE_PASSWORD_ASSURANCE_DID_NOT_GATE_CERTIFIED_RETRIEVAL');
    let steppedUp = false;
    if (first.kind === 'step-up') {
      need(await password.evaluate(element => element === document.activeElement), 'STEP_UP_PASSWORD_FOCUS_MISSING');
      await password.fill(fixture.password); await page.keyboard.press('Enter');
      await page.getByText(t('Identity verified. Retry your selected action.', 'Identité vérifiée. Réessayez l’action choisie.'), { exact: true }).waitFor();
      need(downloadCount === before, 'STEP_UP_AUTOMATICALLY_RETRIED_RECOVERY'); steppedUp = true;
      await recovery().focus(); await page.keyboard.press('Enter');
    }
    const result = first.kind === 'download' ? first : await downloaded; need(result.kind === 'download', 'ORIGINAL_DOWNLOAD_TIMEOUT');
    const privateDownload = path.join(handshake, crypto.randomBytes(16).toString('hex') + '.download.json'); need(!fs.existsSync(privateDownload), 'DOWNLOAD_DESTINATION_EXISTS');
    await result.value.saveAs(privateDownload); privatePath(privateDownload);
    const bytes = fs.readFileSync(privateDownload), sha256 = 'sha256:' + digest(bytes);
    need(sha256 === originalDigest && bytes.equals(original) && Buffer.from(bytes.toString('utf8'), 'utf8').equals(bytes), 'RETAINED_DOWNLOAD_NOT_EXACT_ORIGINAL_UTF8');
    JSON.parse(bytes.toString('utf8'));
    await page.getByText(t('Historical recorded copy', 'Copie historique enregistrée'), { exact: true }).waitFor();
    downloads.push({ label, sha256, byteLength: bytes.length, equalsPrivateOriginalBytes: true, validUtf8Json: true, passwordStepUpObserved: steppedUp }); record(label);
  }
  try {
    const { chromium } = require(path.join(root, 'node_modules/playwright'));
    browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-default-browser-check'] });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true, ignoreHTTPSErrors: true, serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url()), allowed = url.origin === fixture.origin;
      const category = url.pathname === '/api/auth/sign-in/email' ? 'password-sign-in' : url.pathname === '/api/me/permissions' ? 'current-permissions'
        : url.pathname.startsWith('/api/auth/') ? 'session-auth' : url.pathname.startsWith('/_next/') ? 'next-static' : request.method() === 'POST' ? 'protected-server-action' : 'same-origin-page-or-resource';
      network.push({ category: allowed ? category : 'blocked-external', method: request.method(), allowed }); return allowed ? route.continue() : route.abort();
    });
    await context.routeWebSocket('**/*', socket => {
      const url = new URL(socket.url()), allowed = url.origin === 'wss://127.0.0.1:43872' && url.pathname === '/_next/webpack-hmr';
      websocket.push({ category: allowed ? 'owned-development-hmr' : 'blocked-websocket', allowed }); if (allowed) socket.connectToServer(); else void socket.close();
    });
    page = await context.newPage(); page.setDefaultTimeout(45_000); page.setDefaultNavigationTimeout(180_000);
    page.on('pageerror', () => { pageErrors++ }); page.on('console', message => { if (message.type() === 'error') consoleErrors++ }); page.on('download', () => { downloadCount++ });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin === fixture.origin && (url.pathname.startsWith('/api/') || response.request().method() === 'POST')) responses.push({ category: url.pathname === '/api/auth/sign-in/email' ? 'password-sign-in' : url.pathname === '/api/me/permissions' ? 'current-permissions' : response.request().method() === 'POST' ? 'protected-server-action-or-auth' : 'same-origin-api', status: response.status() }); });
    stage = 'actual-password-sign-in';
    await page.goto(fixture.origin + '/' + locale + '/login-v2?returnUrl=' + encodeURIComponent(closePath), { waitUntil: 'domcontentloaded' });
    const email = page.locator('input[name="email"]'), loginPassword = page.locator('input[name="password"]');
    await email.fill(fixture.email); await loginPassword.fill(fixture.password);
    const signInResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/sign-in/email' && response.request().method() === 'POST');
    await page.locator('form').filter({ has: email }).locator('button[type="submit"]').click(); need((await signInResponse).status() === 200, 'REAL_PASSWORD_SIGN_IN_DENIED');
    await page.waitForURL(url => url.origin === fixture.origin && url.pathname === closePath, { waitUntil: 'domcontentloaded', timeout: 180_000 });
    await workspace().waitFor();
    const cookies = await context.cookies(fixture.origin), sessionCookie = cookies.find(cookie => /session_token$/.test(cookie.name));
    need(sessionCookie && sessionCookie.httpOnly && sessionCookie.secure, 'SECURE_HTTPONLY_SESSION_COOKIE_MISSING');
    record('real-better-auth-password-ui-sign-in-and-close-period-route');
    stage = 'actual-retained-receipt-and-original-download';
    await recovery().waitFor(); need((await receipts().innerText()).includes('CERTIFIED'), 'CERTIFIED_RETAINED_RECEIPT_NOT_LISTED');
    await observeCurrentBadge('baseline-before-retained-recovery');
    await recoverOriginal('latest-receipt-original-byte-recovery'); await screenshot('authenticated-retained-original-1440');
    await page.setViewportSize({ width: 390, height: 1000 }); await screenshot('authenticated-retained-original-390'); await page.setViewportSize({ width: 1440, height: 1000 });
    stage = 'actual-stale-password-assurance'; await transition('stale-proof');
    // Password age gates access to the retained certified file. It does not
    // itself invalidate or downgrade financial close evidence.
    await recoverOriginal('stale-password-assurance-requires-real-step-up-before-original-recovery', true);
    await observeCurrentBadge('after-password-assurance-expiry-and-step-up');
    await screenshot('authenticated-stale-password-assurance-recovery-1440');
    stage = 'actual-close-module-suspension'; await decision().fill('Synthetic private draft before controlled module suspension');
    await transition('suspend-close-module'); const beforeModule = downloadCount; await recovery().click(); await denyHeading().waitFor();
    need(await workspace().count() === 0 && await decision().count() === 0 && await receipts().count() === 0 && downloadCount === beforeModule, 'SUSPENDED_MODULE_LEFT_PRIVATE_CACHE_OR_DOWNLOADED');
    record('real-suspended-close-module-denial-hides-cached-private-workspace'); await screenshot('authenticated-module-denial-1440');
    stage = 'actual-close-module-restoration'; await transition('restore-close-module');
    await page.getByRole('button', { name: t('Refresh', 'Actualiser'), exact: true }).click(); await workspace().waitFor();
    need(await decision().inputValue() === '', 'PRIVATE_DRAFT_RESURRECTED_AFTER_MODULE_RESTORE'); await recovery().waitFor(); record('new-successful-read-restores-access-with-cleared-drafts');
    stage = 'actual-current-session-revocation'; await decision().fill('Synthetic private draft before controlled runtime session revocation');
    await transition('revoke-current-session'); const beforeRevoke = downloadCount; await recovery().click(); await denyHeading().waitFor();
    await page.getByRole('link', { name: t('Sign in again', 'Se reconnecter'), exact: true }).waitFor();
    need(await workspace().count() === 0 && await decision().count() === 0 && await receipts().count() === 0 && downloadCount === beforeRevoke, 'REVOKED_SESSION_LEFT_PRIVATE_CACHE_OR_DOWNLOADED');
    record('real-current-runtime-session-revocation-denial-hides-private-cache'); await screenshot('authenticated-session-denial-1440');
    need(operationIndex === orderedOperations.length && pageErrors === 0, 'OPERATIONS_INCOMPLETE_OR_UNCAUGHT_PAGE_ERROR'); assertBinding(binding);
    outcome = { passed: true, steps, transitions, downloads, observations, network, websocket, responses, pageErrorCount: pageErrors, consoleErrorCount: consoleErrors, sourceBindingSha256: digest(fs.readFileSync(path.join(directory, 'SOURCE_BINDING.json'))) };
  } catch (error) {
    // Never publish Playwright error.message/stack: fill logs can contain a secret.
    outcome = { passed: false, failure: { stage, code: error.publicCode || 'BROWSER_OPERATION_FAILED', errorType: ['TimeoutError', 'AssertionError'].includes(error.name) ? error.name : 'Error' }, steps, transitions, downloads, observations, network, websocket, responses, pageErrorCount: pageErrors, consoleErrorCount: consoleErrors };
  } finally {
    // Root owns app/PG and all state transitions. A failed suspended-module stage
    // is reported explicitly for root cleanup, without inventing an extra write.
    try { if (context) { await context.close(); contextClosed = true; } } catch { cleanupErrors.push('OWNED_CONTEXT_CLOSE_FAILED'); }
    try { if (browser) { await browser.close(); browserClosed = true; } } catch { cleanupErrors.push('OWNED_BROWSER_CLOSE_FAILED'); }
  }
  const remainingProfiles = fs.readdirSync(temporary).filter(name => name.startsWith('playwright_chromiumdev_profile-')).length;
  if (cleanupErrors.length || remainingProfiles) outcome.passed = false;
  write(directory, 'RESULT.json', { checkedAt: new Date().toISOString(), ...outcome, browserClosed, contextClosed, cleanupErrors, remainingOwnedProfileDirectories: remainingProfiles, rootCleanupRequired: moduleSuspended || !!cleanupErrors.length || remainingProfiles > 0,
    classification: 'Actual authenticated current-source DEVELOPMENT; schema-only module override; read-only reused dependencies. Not a sealed artifact or hosted release.',
    privacy: 'Credentials, cookie values, network bodies, private control file hash, original/downloaded document bytes and traces were not published. Root owns app/DB cleanup.' });
  write(handshake, 'FINISHED.json', { passed: outcome.passed, checkedAt: new Date().toISOString(), evidenceDirectory: directory });
  console.log(JSON.stringify({ event: 'journey-complete', evidenceDirectory: path.basename(directory), passed: outcome.passed, stage: outcome.passed ? 'complete' : stage, browserClosed, rootCleanupRequired: moduleSuspended || !!cleanupErrors.length || remainingProfiles > 0 }));
  if (!outcome.passed) process.exitCode = 1;
}
main().catch(() => { console.error('Authenticated browser preflight failed; private inputs were not printed.'); process.exitCode = 1; });
