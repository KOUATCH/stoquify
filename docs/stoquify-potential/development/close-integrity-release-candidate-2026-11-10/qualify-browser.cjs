// Reviewed actual-browser companion for this sealed local release candidate.
// Import is inert. The parent owns all application/database lifecycle and the
// four bound authority changes. No mocked authentication, sends or deployment.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createRequire } = require('node:module'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), privateRoot = path.join(root, '.codex-tmp');
const origin = 'https://127.0.0.1:3443';
const expectedSource = '5927a9e593e1a5a467c1156dcd06feb2e64948e1c19e971c2a5688b760203093';
// Parent explicitly approved the existing installed Chromium-engine Edge binary.
// It is never installed/updated here and never uses a personal browser profile.
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const osKeys = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const digest = file => hash(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = code => { throw Object.assign(new Error(code), { publicCode: code }); };
const need = (condition, code) => { if (!condition) fail(code); };
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const orderedOperations = ['stale-proof', 'suspend-close-module', 'restore-close-module', 'revoke-current-session'];
function noLinks(file) {
  const absolute = path.resolve(file); let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part); need(!fs.lstatSync(current).isSymbolicLink(), 'LINKED_INPUT_REFUSED');
  }
}
function privatePath(value, directory = false) {
  need(typeof value === 'string' && path.isAbsolute(value), 'ABSOLUTE_PRIVATE_PATH_REQUIRED');
  const absolute = path.resolve(value);
  need(absolute.toLowerCase().startsWith(privateRoot.toLowerCase() + path.sep), 'PRIVATE_PATH_OUTSIDE_OWNED_TREE'); noLinks(absolute);
  const stat = fs.statSync(absolute); need(directory ? stat.isDirectory() : stat.isFile(), 'PRIVATE_INPUT_WRONG_KIND'); return absolute;
}
function pin(file) { noLinks(file); return { path: file, sha256: digest(file), bytes: fs.statSync(file).size }; }
function sanitizedEnvironment() {
  const value = Object.fromEntries(Object.entries(process.env).filter(([key]) => osKeys.test(key)));
  for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, value);
  require('node:dns').setDefaultResultOrder('ipv4first'); return value;
}
function executableVersion(environment) {
  noLinks(edge); need(fs.statSync(edge).isFile(), 'APPROVED_BROWSER_EXECUTABLE_MISSING');
  const powershell = path.join(environment.SYSTEMROOT || environment.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const probe = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command',
    "(Get-Item -LiteralPath 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe').VersionInfo | Select-Object FileVersion,ProductVersion | ConvertTo-Json -Compress"],
  { env: environment, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  need(!probe.error && probe.status === 0, 'BROWSER_FILE_VERSION_PROBE_FAILED'); const version = JSON.parse(probe.stdout.trim());
  need(/^\d+\.\d+\.\d+\.\d+$/.test(version.FileVersion) && /^\d+\.\d+\.\d+\.\d+$/.test(version.ProductVersion), 'BROWSER_FILE_VERSION_UNAVAILABLE');
  return { ...pin(edge), fileVersion: version.FileVersion, productVersion: version.ProductVersion };
}
async function run() {
  // Clear application/provider/Node/Playwright configuration before loading any
  // candidate SDK or verifier. No environment file is read at any point.
  const environment = sanitizedEnvironment();
  need(process.argv.length === 3 && process.argv[2] === 'run', 'EXPECTED_REVIEWED_RUN_WITHOUT_OVERRIDES');
  let stage = 'preflight', directory, privateDirectory, handshake, browser, context, page, temporary;
  let browserClosed = false, contextClosed = false, moduleSuspended = false, operationIndex = 0, downloadCount = 0, pageErrors = 0, consoleErrors = 0;
  let binding, binaryBefore, sdk, fixture, outcome;
  const steps = [], transitions = [], downloads = [], observations = [], requests = [], websockets = [], responses = [], screenshots = [], cleanupErrors = [];
  const record = id => { steps.push({ id, passed: true, checkedAt: new Date().toISOString() }); console.log(JSON.stringify({ event: 'step-passed', id })); };
  const setStage = value => { stage = value; console.log(JSON.stringify({ event: 'stage', stage })); };
  try {
    need(process.platform === 'win32' && process.arch === 'x64', 'REVIEWED_WINDOWS_X64_RUNNER_REQUIRED');
    const readyFile = path.join(__dirname, 'APP_READY.json'), targetFile = path.join(__dirname, 'CANDIDATE_TARGET.json'); noLinks(readyFile); noLinks(targetFile);
    const ready = read(readyFile), target = read(targetFile);
    need(ready.ready === true && ready.origin === origin && ready.sourceManifestSha256 === expectedSource, 'SEALED_APPLICATION_HANDOFF_MISMATCH');
    need(path.dirname(target.directory) === privateRoot && /^close-integrity-release-20261110-[a-f0-9]{10}$/.test(path.basename(target.directory)), 'OWNED_CANDIDATE_REQUIRED'); privatePath(target.directory, true);
    need(target.candidate === path.join(target.directory, 'candidate'), 'CANDIDATE_DIRECTORY_MISMATCH');
    const runtimeDirectory = path.dirname(ready.privateControlFile); privatePath(runtimeDirectory, true);
    need(path.dirname(runtimeDirectory) === target.directory && /^sealed-runtime-[a-f0-9]{10}$/.test(path.basename(runtimeDirectory)), 'OWNED_SEALED_RUNTIME_REQUIRED');
    need(ready.handshakeDirectory === path.join(runtimeDirectory, 'handshake'), 'HANDSHAKE_DIRECTORY_MISMATCH');
    need(ready.runtimeEvidenceDirectory === path.join(__dirname, path.basename(runtimeDirectory)), 'RUNTIME_EVIDENCE_DIRECTORY_MISMATCH');
    handshake = privatePath(ready.handshakeDirectory, true); need(!fs.existsSync(path.join(handshake, 'FINISHED.json')), 'HANDSHAKE_ALREADY_FINISHED');
    // Once the owned handshake is established, every later refusal attempts a
    // failed FINISHED acknowledgement so the parent can clean up its services.
    const id = crypto.randomBytes(5).toString('hex'); directory = path.join(__dirname, 'browser-' + id); fs.mkdirSync(directory);
    privateDirectory = path.join(runtimeDirectory, 'browser-' + id); fs.mkdirSync(privateDirectory); temporary = path.join(privateDirectory, 'temp'); fs.mkdirSync(temporary);
    process.env.TEMP = temporary; process.env.TMP = temporary;

    const { verifyCandidate } = require('./candidate-validation.cjs'), candidate = verifyCandidate();
    need(candidate.target.candidate === target.candidate && candidate.manifest.manifestSha256 === expectedSource, 'FROZEN_CANDIDATE_SOURCE_MISMATCH');
    const selectionFile = path.join(__dirname, 'CLEAN_INSTALL_SELECTED.json'), selection = read(selectionFile);
    need(selection.result === 'CLEAN_INSTALL_RESULT.json', 'QUALIFIED_CLEAN_INSTALL_REQUIRED'); const installFile = path.join(__dirname, selection.result);
    need(digest(installFile) === selection.sha256, 'CLEAN_INSTALL_RECEIPT_CHANGED'); const install = read(installFile);
    need(install.passed && install.inputsUnchanged && install.frozenSourceUnchanged && install.candidate === target.candidate, 'CLEAN_INSTALL_NOT_QUALIFIED');
    const databaseFile = path.join(__dirname, 'DATABASE_TARGET.json'), database = read(databaseFile), databaseReceiptFile = path.join(__dirname, 'DATABASE_QUALIFICATION.json'), databaseReceipt = read(databaseReceiptFile);
    need(databaseReceipt.passed && databaseReceipt.ownedClusterStopped && databaseReceipt.database === database.freshDatabase && databaseReceipt.candidate === target.candidate && databaseReceipt.sourceManifestSha256 === expectedSource, 'EARNED_DATABASE_QUALIFICATION_REQUIRED');
    need(ready.database === database.freshDatabase && /^stoquify_replay_close_monthly_20261110_[a-f0-9]{10}$/.test(ready.database), 'EARNED_DATABASE_HANDOFF_MISMATCH');
    const artifactFile = path.join(__dirname, 'ARTIFACT_QUALIFICATION.json'), artifact = read(artifactFile), emittedFile = path.join(__dirname, 'ARTIFACT_EMITTED_DIGEST.json'), emitted = read(emittedFile);
    need(artifact.fullBuildAndTrustedDigestVerificationPassed && artifact.syntheticPrivateConfigExclusionPassed && artifact.sourceManifestSha256 === expectedSource, 'QUALIFIED_SEALED_ARTIFACT_REQUIRED');
    need(artifact.artifact === emitted.destination && artifact.artifactSha256 === emitted.sha256 && ready.artifactSha256 === emitted.sha256 && ready.buildId === artifact.buildId && emitted.buildId === artifact.buildId, 'ARTIFACT_OR_BUILD_HANDOFF_MISMATCH');
    noLinks(artifact.artifact); const artifactManifest = path.join(artifact.artifact, 'artifact.json'); need(digest(artifactManifest) === emitted.sha256, 'SEALED_ARTIFACT_MANIFEST_CHANGED');
    const appRequire = createRequire(path.join(target.candidate, 'package.json'));
    const sealed = appRequire(path.join(target.candidate, 'scripts/release-artifact.cjs')).verify(target.candidate, artifact.artifact, emitted.sha256);
    need(sealed.buildId === ready.buildId, 'VERIFIED_ARTIFACT_BUILD_MISMATCH');
    require(path.join(target.candidate, 'scripts/local-gates-network.cjs'));

    fixture = read(privatePath(ready.privateControlFile));
    need(fixture.version === 1 && fixture.origin === origin && ['en', 'fr'].includes(fixture.locale) && fixture.handshakeDirectory === handshake, 'PRIVATE_FIXTURE_HANDOFF_MISMATCH');
    for (const key of ['organizationId', 'actorId', 'periodId', 'originalExportId', 'originalRunId']) need(typeof fixture[key] === 'string' && fixture[key].length > 0 && fixture[key].length <= 200, 'FIXTURE_ID_REQUIRED');
    need(typeof fixture.email === 'string' && typeof fixture.password === 'string' && fixture.password.length > 0, 'PRIVATE_CREDENTIALS_REQUIRED');
    need(/^sha256:[a-f0-9]{64}$/.test(fixture.originalDocumentDigest), 'EXPECTED_DOCUMENT_DIGEST_REQUIRED');
    const originalPath = privatePath(fixture.originalDocumentPath), original = fs.readFileSync(originalPath), originalDigest = 'sha256:' + hash(original);
    need(path.dirname(originalPath) === database.privateDocuments && originalDigest === fixture.originalDocumentDigest && Buffer.from(original.toString('utf8'), 'utf8').equals(original), 'PRIVATE_ORIGINAL_BINDING_OR_UTF8_MISMATCH'); JSON.parse(original.toString('utf8'));
    const packBinding = read(path.join(database.evidenceDirectory, 'MONTHLY_FIXTURE.json'));
    need(packBinding.retainedPack.path === originalPath && digest(originalPath) === packBinding.retainedPack.sha256, 'EARNED_MONTHLY_PACK_CHANGED');

    // The new candidate's independently installed SDK is the only automation SDK.
    const sdkEntry = appRequire.resolve('playwright'), sdkPackageFile = path.join(target.candidate, 'node_modules/playwright/package.json'); noLinks(sdkEntry); noLinks(sdkPackageFile);
    need(sdkEntry.startsWith(path.join(target.candidate, 'node_modules') + path.sep), 'CANDIDATE_BROWSER_SDK_REQUIRED');
    const sdkPackage = read(sdkPackageFile), lock = read(path.join(target.candidate, 'package-lock.json'));
    need(lock.packages['node_modules/playwright'].version === sdkPackage.version, 'LOCKED_BROWSER_SDK_VERSION_REQUIRED');
    sdk = { name: sdkPackage.name, version: sdkPackage.version, entry: pin(sdkEntry), package: pin(sdkPackageFile), cleanInstallReceipt: pin(installFile) };
    binaryBefore = executableVersion(environment);
    binding = { checkedAt: new Date().toISOString(), sourceManifestSha256: expectedSource, buildId: artifact.buildId, artifactSha256: emitted.sha256,
      inputs: [readyFile, targetFile, path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json'), selectionFile, installFile, databaseFile, databaseReceiptFile, artifactFile, emittedFile, artifactManifest, __filename].map(pin),
      browserSdk: sdk, browserBinary: binaryBefore, artifactVerifiedBefore: true, verifiedArtifactFileCount: sealed.files.length,
      privacy: 'No credential-file hash, credentials, cookies, session identifiers or document bodies are published.' };
    write(path.join(directory, 'BINDING.json'), binding);

    const locale = fixture.locale, t = (en, fr) => locale === 'fr' ? fr : en;
    const closePath = '/' + locale + '/dashboard/accounting/close/' + encodeURIComponent(fixture.periodId);
    const workspace = () => page.getByTestId('close-readiness-workspace');
    const receipts = () => page.getByRole('region', { name: t('Retained export receipts', 'Reçus des exports conservés'), exact: true });
    const recovery = () => receipts().locator('li').filter({ hasText: originalDigest }).filter({ hasText: 'CERTIFIED' }).first().getByRole('button', { name: t('Recover original JSON', 'Récupérer le JSON d’origine'), exact: true });
    const denied = () => page.getByRole('heading', { name: t('Access to close evidence denied', 'Accès aux preuves de clôture refusé'), exact: true });
    const decision = () => page.getByRole('textbox', { name: t('Decision notes', 'Notes de decision'), exact: true });
    async function transition(operation) {
      need(operation === orderedOperations[operationIndex], 'AUTHORITY_OPERATION_ORDER_MISMATCH'); const id = crypto.randomBytes(16).toString('hex');
      write(path.join(handshake, id + '.request.json'), { id, operation }); if (operation === 'suspend-close-module') moduleSuspended = true;
      console.log(JSON.stringify({ event: 'control-requested', operation })); const responsePath = path.join(handshake, id + '.response.json'), deadline = Date.now() + 30000;
      while (!fs.existsSync(responsePath)) { need(Date.now() < deadline, 'ROOT_CONTROL_RESPONSE_TIMEOUT'); await new Promise(resolve => setTimeout(resolve, 200)); }
      const response = read(privatePath(responsePath)); need(response.id === id && response.operation === operation && response.applied === true && Number.isFinite(Date.parse(response.checkedAt)), 'AUTHORITY_TRANSITION_UNCONFIRMED');
      transitions.push({ operation, applied: true, checkedAt: response.checkedAt }); operationIndex++; if (operation === 'restore-close-module') moduleSuspended = false;
    }
    async function screenshot(name) {
      const file = path.join(directory, name + '.png'); await page.screenshot({ path: file, fullPage: true,
        mask: [page.locator('input[type="password"],input[type="email"]'), page.getByText(fixture.email, { exact: true })] }); screenshots.push(pin(file));
    }
    async function observeCurrentBadge(label) {
      observations.push({ label, currentCertificationBadgeVisible: await page.getByText(t('Current certification evidence', 'Preuves de certification à jour'), { exact: true }).count() > 0,
        certifiedExportDisabled: await page.getByRole('button', { name: t('Export certified JSON', 'Exporter JSON certifie'), exact: true }).isDisabled(),
        interpretation: 'Observed presentation only; historical retrieval does not establish a new financial approval.' });
    }
    async function recoverOriginal(label, requireStepUp = false) {
      const before = downloadCount, downloaded = page.waitForEvent('download', { timeout: 90000 }).then(value => ({ kind: 'download', value }), () => ({ kind: 'timeout' }));
      const password = page.getByLabel(t('Current password', 'Mot de passe actuel'), { exact: true });
      const challenge = password.waitFor({ state: 'visible', timeout: 90000 }).then(() => ({ kind: 'step-up' }), () => ({ kind: 'timeout' }));
      await recovery().focus(); await page.keyboard.press('Enter'); const first = await Promise.race([downloaded, challenge]);
      need(first.kind !== 'timeout', 'RECOVERY_NEITHER_DOWNLOAD_NOR_STEP_UP'); need(!requireStepUp || first.kind === 'step-up', 'STALE_ASSURANCE_DID_NOT_GATE_CERTIFIED_RETRIEVAL');
      let steppedUp = false;
      if (first.kind === 'step-up') {
        need(await password.evaluate(element => element === document.activeElement), 'STEP_UP_PASSWORD_FOCUS_MISSING'); await password.fill(fixture.password); await page.keyboard.press('Enter');
        await page.getByText(t('Identity verified. Retry your selected action.', 'Identité vérifiée. Réessayez l’action choisie.'), { exact: true }).waitFor();
        need(downloadCount === before, 'PASSWORD_VERIFICATION_AUTOMATICALLY_RETRIED_DOWNLOAD'); steppedUp = true; await recovery().focus(); await page.keyboard.press('Enter');
      }
      const result = first.kind === 'download' ? first : await downloaded; need(result.kind === 'download', 'ORIGINAL_DOWNLOAD_TIMEOUT');
      const file = path.join(privateDirectory, crypto.randomBytes(16).toString('hex') + '.download.json'); need(!fs.existsSync(file), 'DOWNLOAD_DESTINATION_EXISTS'); await result.value.saveAs(file); privatePath(file);
      const bytes = fs.readFileSync(file), sha256 = 'sha256:' + hash(bytes);
      need(sha256 === originalDigest && bytes.equals(original) && Buffer.from(bytes.toString('utf8'), 'utf8').equals(bytes), 'RETAINED_DOWNLOAD_NOT_EXACT_ORIGINAL_UTF8'); JSON.parse(bytes.toString('utf8'));
      await page.getByText(t('Historical recorded copy', 'Copie historique enregistrée'), { exact: true }).waitFor();
      downloads.push({ label, sha256, byteLength: bytes.length, equalsPrivateOriginalBytes: true, validUtf8Json: true, passwordStepUpObserved: steppedUp }); record(label);
    }

    setStage('owned-browser-start'); const { chromium } = appRequire('playwright');
    browser = await chromium.launch({ executablePath: edge, headless: true, env: { ...environment, TEMP: temporary, TMP: temporary }, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-default-browser-check'] });
    const reportedBrowserVersion = browser.version(); need(reportedBrowserVersion.split('.')[0] === binaryBefore.productVersion.split('.')[0], 'LAUNCHED_BROWSER_VERSION_MISMATCH');
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true, ignoreHTTPSErrors: true, serviceWorkers: 'block' });
    await context.route('**/*', route => { const request = route.request(), address = new URL(request.url()), allowed = address.origin === origin;
      const category = address.pathname === '/api/auth/sign-in/email' ? 'password-sign-in' : address.pathname === '/api/me/permissions' ? 'current-permissions' : address.pathname.startsWith('/api/auth/') ? 'session-auth' : address.pathname.startsWith('/_next/') ? 'sealed-static' : request.method() === 'POST' ? 'protected-server-action' : 'same-origin-page-or-resource';
      requests.push({ category: allowed ? category : 'blocked-external', method: request.method(), allowed }); return allowed ? route.continue() : route.abort(); });
    // A sealed production-format application has no development HMR channel.
    await context.routeWebSocket('**/*', socket => { websockets.push({ category: 'blocked-websocket', allowed: false }); void socket.close(); });
    page = await context.newPage(); page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(180000);
    page.on('pageerror', () => { pageErrors++; }); page.on('console', message => { if (message.type() === 'error') consoleErrors++; }); page.on('download', () => { downloadCount++; });
    page.on('response', response => { const address = new URL(response.url()); if (address.origin === origin && (address.pathname.startsWith('/api/') || response.request().method() === 'POST')) responses.push({ category: address.pathname === '/api/auth/sign-in/email' ? 'password-sign-in' : address.pathname === '/api/me/permissions' ? 'current-permissions' : response.request().method() === 'POST' ? 'protected-server-action-or-auth' : 'same-origin-api', status: response.status() }); });
    setStage('actual-password-sign-in'); await page.goto(origin + '/' + locale + '/login-v2?returnUrl=' + encodeURIComponent(closePath), { waitUntil: 'domcontentloaded' });
    const email = page.locator('input[name="email"]'), password = page.locator('input[name="password"]'); await email.fill(fixture.email); await password.fill(fixture.password);
    const signIn = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/sign-in/email' && response.request().method() === 'POST');
    await page.locator('form').filter({ has: email }).locator('button[type="submit"]').click(); need((await signIn).status() === 200, 'REAL_PASSWORD_SIGN_IN_DENIED');
    await page.waitForURL(address => address.origin === origin && address.pathname === closePath, { waitUntil: 'domcontentloaded', timeout: 180000 }); await workspace().waitFor();
    const cookies = await context.cookies(origin), cookie = cookies.find(value => /session_token$/.test(value.name)); need(cookie && cookie.httpOnly && cookie.secure, 'SECURE_HTTPONLY_SESSION_COOKIE_MISSING'); record('real-password-ui-sign-in-and-close-period-route');
    setStage('retained-original-recovery'); await recovery().waitFor(); await observeCurrentBadge('before-retained-recovery'); await recoverOriginal('retained-original-byte-recovery'); await screenshot('retained-original-1440');
    await page.setViewportSize({ width: 390, height: 1000 }); await screenshot('retained-original-390'); await page.setViewportSize({ width: 1440, height: 1000 });
    setStage('expired-password-assurance'); await transition('stale-proof'); await recoverOriginal('expired-assurance-requires-password-and-manual-retry', true); await observeCurrentBadge('after-password-assurance-renewal'); await screenshot('renewed-password-assurance-1440');
    setStage('close-module-suspension'); await decision().fill('Synthetic private draft before controlled module suspension'); await transition('suspend-close-module'); const beforeModule = downloadCount; await recovery().click(); await denied().waitFor();
    need(await workspace().count() === 0 && await decision().count() === 0 && await receipts().count() === 0 && downloadCount === beforeModule, 'MODULE_DENIAL_LEFT_PRIVATE_CACHE_OR_DOWNLOADED'); record('suspended-module-denial-hides-private-workspace'); await screenshot('module-denial-1440');
    setStage('close-module-restoration'); await transition('restore-close-module'); await page.getByRole('button', { name: t('Refresh', 'Actualiser'), exact: true }).click(); await workspace().waitFor();
    need(await decision().inputValue() === '', 'PRIVATE_DRAFT_RESURRECTED_AFTER_ACCESS_RESTORE'); await recovery().waitFor(); record('successful-protected-read-restores-access-with-cleared-drafts');
    setStage('current-browser-session-revocation'); await decision().fill('Synthetic private draft before controlled current session revocation'); await transition('revoke-current-session'); const beforeRevoke = downloadCount; await recovery().click(); await denied().waitFor();
    await page.getByRole('link', { name: t('Sign in again', 'Se reconnecter'), exact: true }).waitFor(); need(await workspace().count() === 0 && await decision().count() === 0 && await receipts().count() === 0 && downloadCount === beforeRevoke, 'REVOKED_SESSION_LEFT_PRIVATE_CACHE_OR_DOWNLOADED'); record('revoked-current-session-denial-hides-private-workspace'); await screenshot('session-denial-1440');
    need(operationIndex === orderedOperations.length && pageErrors === 0 && consoleErrors === 0 && requests.every(item => item.allowed) && websockets.length === 0, 'BROWSER_ERRORS_OR_UNEXPECTED_NETWORK');
    for (const entry of binding.inputs) need(digest(entry.path) === entry.sha256, 'BOUND_RELEASE_INPUT_CHANGED_DURING_BROWSER');
    need(digest(binaryBefore.path) === binaryBefore.sha256, 'BROWSER_EXECUTABLE_CHANGED_DURING_RUN'); const binaryAfter = executableVersion(environment); need(binaryAfter.productVersion === binaryBefore.productVersion && binaryAfter.fileVersion === binaryBefore.fileVersion, 'BROWSER_VERSION_CHANGED_DURING_RUN');
    need(digest(sdk.entry.path) === sdk.entry.sha256 && digest(sdk.package.path) === sdk.package.sha256, 'CANDIDATE_BROWSER_SDK_CHANGED_DURING_RUN'); verifyCandidate();
    outcome = { passed: true, locale, reportedBrowserVersion, steps, transitions, downloads, observations, requests, websockets, responses, screenshots, pageErrorCount: pageErrors, consoleErrorCount: consoleErrors, bindingSha256: digest(path.join(directory, 'BINDING.json')), sourceManifestSha256: expectedSource, buildId: ready.buildId, artifactSha256: ready.artifactSha256, browserExecutableUnchanged: true, candidateBrowserSdkUnchanged: true };
  } catch (error) {
    // A Playwright fill stack can contain a password. Full diagnostics stay in
    // private custody and are never printed or hashed into public receipts.
    if (privateDirectory) { try { fs.writeFileSync(path.join(privateDirectory, 'failure.private.txt'), String(error.stack || error), { flag: 'wx', mode: 0o600 }); } catch {} }
    outcome = { passed: false, failure: { stage, code: error.publicCode || 'BROWSER_OPERATION_FAILED', errorType: ['TimeoutError', 'AssertionError'].includes(error.name) ? error.name : 'Error' }, steps, transitions, downloads, observations, requests, websockets, responses, screenshots, pageErrorCount: pageErrors, consoleErrorCount: consoleErrors };
  } finally {
    try { if (context) { await context.close(); contextClosed = true; } } catch { cleanupErrors.push('OWNED_CONTEXT_CLOSE_FAILED'); }
    try { if (browser) { await browser.close(); browserClosed = true; } } catch { cleanupErrors.push('OWNED_BROWSER_CLOSE_FAILED'); }
    let remainingOwnedProfiles = 0; if (temporary) { try { remainingOwnedProfiles = fs.readdirSync(temporary).filter(name => name.startsWith('playwright_chromiumdev_profile-')).length; } catch { cleanupErrors.push('OWNED_PROFILE_INSPECTION_FAILED'); } }
    outcome ||= { passed: false, failure: { stage, code: 'INCOMPLETE_BROWSER_OUTCOME' } }; if (cleanupErrors.length || remainingOwnedProfiles) outcome.passed = false;
    // The browser has finished and closed before acknowledging the controller.
    // Publish the immutable final result only after that acknowledgement attempt,
    // so a failed FINISHED write cannot leave a misleading passed:true receipt.
    let finishedAcknowledgementWritten = false;
    try { if (handshake) { need(!fs.existsSync(path.join(handshake, 'FINISHED.json')), 'FINISHED_ACKNOWLEDGEMENT_ALREADY_EXISTS'); write(path.join(handshake, 'FINISHED.json'), { passed: outcome.passed, evidenceDirectory: directory || __dirname }); finishedAcknowledgementWritten = true; } } catch { outcome.passed = false; cleanupErrors.push('FINISHED_ACKNOWLEDGEMENT_FAILED'); }
    const report = { checkedAt: new Date().toISOString(), ...outcome, browserClosed, contextClosed, cleanupErrors, remainingOwnedProfiles, finishedAcknowledgementWritten, rootCleanupRequired: moduleSuspended || cleanupErrors.length > 0 || remainingOwnedProfiles > 0,
      classification: 'Actual sealed Windows/x64 standalone artifact and real password/session/actions on owned HTTPS loopback; synthetic earned monthly-close fixture. No development runtime, production host, deployment, live delivery or statutory approval.',
      privacy: 'Credentials, cookie values, native session identifiers, control-file hashes, network bodies, traces and document bytes remain unpublished. The parent owns application/database cleanup.' };
    try { if (directory) write(path.join(directory, 'RESULT.json'), report); } catch { outcome.passed = false; cleanupErrors.push('PUBLIC_RECEIPT_WRITE_FAILED'); }
    console.log(JSON.stringify({ event: 'browser-qualification-complete', passed: outcome.passed, evidenceDirectory: directory, stage: outcome.passed ? 'complete' : stage, browserClosed, contextClosed, rootCleanupRequired: report.rootCleanupRequired || cleanupErrors.length > 0 }));
    if (!outcome.passed) process.exitCode = 1;
  }
}
module.exports = { run };
if (require.main === module) run().catch(() => { console.error('Browser qualification refused; no private credential or diagnostic values were printed.'); process.exitCode = 1; });
