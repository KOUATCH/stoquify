// Static mocked-action rendering only. No Next/app/env/DB/provider is started.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../..'), dependencies = path.join(root, 'node_modules');
const hash = value => crypto.createHash('sha256').update(value).digest('hex'), digest = file => hash(fs.readFileSync(file));
const owned = name => require(path.join(dependencies, name));
const write = (directory, name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const osKeys = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i;
for (const key of Object.keys(process.env)) if (!osKeys.test(key)) delete process.env[key];
Object.assign(process.env, { NODE_ENV: 'test', NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: 'postgresql://synthetic@127.0.0.1:1/rendered_collection_disabled', DIRECT_URL: 'postgresql://synthetic@127.0.0.1:1/rendered_collection_disabled', SHADOW_DATABASE_URL: 'postgresql://synthetic@127.0.0.1:1/rendered_collection_disabled' });
require(path.join(root, 'scripts/local-gates-network.cjs'));
const product = ['components/finance/CustomerSettlementControls.tsx', 'components/ui/button.tsx', 'components/ui/input.tsx', 'services/accounting/customer-settlement-workbench.service.ts', 'actions/finance/customer-settlement.actions.ts', 'app/globals.css', 'app/public-contours.css', 'tailwind.config.ts', 'package.json', 'package-lock.json'];
const evidenceBytes = Buffer.from('Synthetic rendered receipt proof. No real customer or provider data.\n'), evidenceDigest = hash(evidenceBytes);
function fileBinding(files) { return [...new Set(files)].sort().map(file => ({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: digest(file) })); }
function assertBindings(files) { for (const file of files) assert.equal(digest(path.join(root, file.path)), file.sha256, 'Rendered source changed: ' + file.path); }
async function compile(directory) {
  const loader = path.join(directory, 'typescript-loader.cjs');
  fs.writeFileSync(loader, 'const ts=require(' + JSON.stringify(path.join(dependencies, 'typescript')) + ');module.exports=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;', { flag: 'wx' });
  const bundled = owned('next/dist/compiled/webpack/webpack'); bundled.init();
  const mock = path.join(__dirname, 'mocks.test.ts'), aliases = { '@/actions/finance/customer-settlement.actions$': mock, '@/actions/security/step-up-auth.actions$': mock, '@': root };
  const noServerImports = { apply(compiler) { compiler.hooks.normalModuleFactory.tap('FixtureServerBoundary', factory => {
    factory.hooks.afterResolve.tap('FixtureServerBoundary', result => {
      const resource = (result.createData?.resource || '').split('?')[0].replaceAll('\\', '/').toLowerCase(), base = root.replaceAll('\\', '/').toLowerCase();
      if (['/actions/', '/prisma/', '/services/', '/lib/auth-client.', '/lib/auth.'].some(prefix => resource.startsWith(base + prefix))) throw Error('Real server/auth import crossed mock boundary: ' + resource);
    });
  }); } };
  const config = { mode: 'development', devtool: false, cache: false, context: root, entry: path.join(__dirname, 'browser-entry.test.tsx'), output: { path: directory, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [dependencies, 'node_modules'], alias: aliases }, resolveLoader: { modules: [dependencies] },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] }, optimization: { minimize: false }, performance: { hints: false }, plugins: [noServerImports] };
  const compiler = bundled.webpack(config); let stats;
  try { stats = await new Promise((resolve, reject) => compiler.run((error, value) => error || value.hasErrors() ? reject(error || Error(value.toString({ all: false, errors: true }))) : resolve(value))); }
  finally { await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve())); }
  const sourceFiles = [...stats.compilation.fileDependencies].filter(file => file.startsWith(root + path.sep) && !file.startsWith(dependencies + path.sep) && fs.existsSync(file) && fs.lstatSync(file).isFile());
  const tailwind = owned('tailwindcss/loadConfig')(path.join(root, 'tailwind.config.ts')); tailwind.content = sourceFiles.filter(file => /\.[jt]sx?$/.test(file));
  const globalCss = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8'); assert(globalCss.startsWith('@import "./public-contours.css";'));
  const inlinedCss = globalCss.replace('@import "./public-contours.css";', fs.readFileSync(path.join(root, 'app/public-contours.css'), 'utf8'));
  const css = await owned('postcss')([owned('tailwindcss')(tailwind)]).process(inlinedCss, { from: path.join(root, 'app/globals.css') });
  fs.writeFileSync(path.join(directory, 'style.css'), css.css, { flag: 'wx' }); fs.copyFileSync(path.join(dependencies, 'axe-core/axe.min.js'), path.join(directory, 'axe.js'), fs.constants.COPYFILE_EXCL);
  return fileBinding([...sourceFiles, ...product.map(file => path.join(root, file)), __filename]);
}
async function main() {
  assert.equal(process.argv.length, 2, 'No target or authority overrides accepted');
  const readinessFile = path.join(__dirname, '../UI_PROJECTION_RESULT.json'), readiness = JSON.parse(fs.readFileSync(readinessFile, 'utf8')); assert.equal(readiness.status, 'PASS_MOCKED_PROJECTION_ACTION_AND_COMPONENT_SCOPE'); assertBindings(readiness.files);
  const directory = path.join(__dirname, 'attempt-' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(directory);
  const temporary = path.join(root, '.codex-tmp', 'collection-rendered-' + crypto.randomBytes(3).toString('hex')); assert(!fs.lstatSync(path.dirname(temporary)).isSymbolicLink()); fs.mkdirSync(temporary); process.env.TEMP = temporary; process.env.TMP = temporary;
  const initial = fileBinding(product.map(file => path.join(root, file))), results = [], errors = [], network = [];
  write(directory, 'RUNNER_REVIEW.json', { checkedAt: new Date().toISOString(), runnerSha256: digest(__filename), initial, ownerUnitReceiptSha256: digest(readinessFile),
    classification: 'Real component/Button/Input/styles in Edge with explicitly mocked authority/actions. No authenticated app, DB, provider or deployment.',
    effects: ['New owned bundle/CSS/axe, source bindings, screenshots and safe booleans/counts', 'Ephemeral127.0.0.1 static HTTP listener', 'Owned headless installed Edge and short ignored TEMP/profile'],
    boundaries: ['No Next config or environment files', 'No package installation, Prisma generation, schema promotion or database', 'No real account or provider', 'No request bodies, passwords, traces or HAR retained', 'Exact loopback origin only'], temporary, environmentVariableNames: Object.keys(process.env).sort() });
  let source = initial, server, browser, origin, browserClosed = false, serverClosed = false, outcome, stage = 'compile', activeVariant;
  try {
    source = await compile(directory); assertBindings(initial); assertBindings(readiness.files);
    write(directory, 'SOURCE_BINDING.json', { source, mockBoundary: ['Finance server actions', 'Password step-up action', 'Parent auth/permission scope'], files: ['bundle.js', 'style.css', 'axe.js'].map(file => ({ path: file, sha256: digest(path.join(directory, file)) })) });
    server = http.createServer((request, response) => {
      const route = new URL(request.url, 'http://127.0.0.1').pathname;
      if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
      response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data:; font-src 'self'; frame-src 'none'");
      if (route === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      if (['/bundle.js', '/style.css', '/axe.js'].includes(route)) { response.setHeader('Content-Type', route.endsWith('.js') ? 'application/javascript' : 'text/css'); response.end(fs.readFileSync(path.join(directory, route.slice(1)))); return; }
      if (!['/en/fixture', '/fr/fixture'].includes(route)) { response.writeHead(404); response.end(); return; }
      response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html lang="' + (route.startsWith('/fr') ? 'fr' : 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mocked customer collection rendering</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); origin = 'http://127.0.0.1:' + server.address().port;
    browser = await owned('playwright').chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-default-browser-check'] });
    for (const locale of ['en', 'fr']) for (const width of [390, 1440]) {
      stage = locale + '-' + width + '-native-selection';
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      await context.route('**/*', route => { const url = new URL(route.request().url()), allowed = url.origin === origin; network.push({ path: allowed ? url.pathname : '[blocked-external]', allowed }); return allowed ? route.continue() : route.abort(); });
      const page = await context.newPage(), cases = [], consoleErrors = [];
      activeVariant = { locale, width, completedCases: cases };
      page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      const t = (en, fr) => locale === 'fr' ? fr : en;
      const selector = () => page.getByRole('combobox', { name: t('Confirmed provider receipt (optional)', 'Confirmation du prestataire (facultatif)'), exact: true });
      const amount = () => page.getByLabel(t('Amount (XAF)', 'Montant (XAF)'), { exact: true });
      const reference = () => page.getByLabel(t('Payment / evidence reference', 'Référence du paiement / justificatif'), { exact: true });
      const date = () => page.getByLabel(t('Payment date', 'Date du paiement'), { exact: true });
      const submit = () => page.getByRole('button', { name: t('Confirm payment', 'Confirmer le paiement'), exact: true });
      const retry = () => page.getByRole('button', { name: t('Retry the same payment', 'Réessayer le même paiement'), exact: true });
      const refresh = () => page.getByRole('button', { name: t('Refresh payments', 'Actualiser les paiements'), exact: true });
      const patch = value => page.evaluate(patch => window.collectionFixture.set(patch), value);
      const open = async () => { await page.getByRole('button', { name: t('Record customer payment', 'Enregistrer un paiement client'), exact: true }).click(); await selector().waitFor(); };
      const attach = () => page.getByLabel(t('Supporting evidence file', 'Fichier justificatif'), { exact: true }).setInputFiles({ name: 'synthetic-rendered-proof.txt', mimeType: 'text/plain', buffer: evidenceBytes });
      const choose = async () => { await selector().selectOption('fixture-native-bank'); await attach(); };
      const collected = () => page.getByText(t('Customer payment recorded. The invoice and accounting entries have been updated.', 'Paiement client enregistré. La facture et les écritures comptables sont actualisées.'), { exact: true });
      const submitAndObserve = async () => { const before = await page.evaluate(() => window.collectionFixture.calls.collect.length); await submit().focus(); await page.keyboard.press('Enter'); await page.waitForFunction(before => window.collectionFixture.calls.collect.length === before + 1, before); };
      await page.goto(origin + '/' + locale + '/fixture'); await page.getByText('MOCKED AUTH / ACTIONS · STATIC LOOPBACK FIXTURE · NO DATABASE').waitFor(); await open();
      assert.equal(await selector().inputValue(), ''); await page.getByText(t('Manual recording does not link a provider confirmation.', 'La saisie manuelle ne lie aucune confirmation du prestataire.'), { exact: true }).waitFor();
      await selector().focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Tab');
      assert.equal(await selector().inputValue(), 'fixture-native-bank'); assert.equal(await amount().inputValue(), '75.00'); assert.equal(await date().inputValue(), '2026-10-25');
      assert((await reference().inputValue()).startsWith('SYNTHETIC-CONFIRMED-BANK-'));
      const selectedSummary = page.getByText(t('Selected confirmation:', 'Confirmation sélectionnée:'), { exact: true }).locator('..');
      assert((await selectedSummary.innerText()).includes(await page.evaluate(() => window.collectionFixture.receipt.accountLabel)));
      assert((await selectedSummary.innerText()).includes(await reference().inputValue())); assert(!(await selectedSummary.innerText()).includes('fixture-native-bank'));
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth })); assert(geometry.documentWidth <= width + 1, 'Long receipt preview overflows viewport');
      await page.screenshot({ path: path.join(directory, locale + '-provider-selection-' + width + '.png'), fullPage: true });
      await page.addScriptTag({ url: origin + '/axe.js' }); const axe = await page.evaluate(async () => { const result = await window.axe.run(document); return { violations: result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })), incomplete: result.incomplete.map(item => item.id) }; });
      assert.equal(axe.violations.length, 0, 'Automated accessibility violations');
      await attach(); await submitAndObserve(); await collected().waitFor();
      assert(await page.evaluate(expected => { const input = window.collectionFixture.calls.collect[0]; return input.paymentTransactionId === 'fixture-native-bank' && input.amount === '75.00' && input.settlementDate === '2026-10-25T00:00:00.000Z' && input.documentHash === expected && typeof input.evidenceHash === 'string'; }, evidenceDigest)); cases.push('manual-default-explicit-keyboard-native-selection-file-hash-and-submit');
      await open(); await selector().selectOption('fixture-native-bank'); await amount().fill('40.00'); assert.equal(await selector().inputValue(), '');
      await selector().selectOption('fixture-native-bank'); await date().fill('2026-10-26'); assert.equal(await selector().inputValue(), '');
      await selector().selectOption('fixture-native-bank'); await page.getByRole('combobox', { name: t('Payment method', 'Mode de paiement'), exact: true }).selectOption('CASH'); assert.equal(await selector().count(), 0);
      await page.getByRole('combobox', { name: t('Payment method', 'Mode de paiement'), exact: true }).selectOption('BANK_TRANSFER'); assert.equal(await selector().inputValue(), ''); cases.push('amount-date-method-edits-clear-native-link');
      await choose(); await patch({ collectMode: 'uncertain' }); await submitAndObserve(); await page.getByRole('alert').filter({ hasText: t('could not be confirmed', 'n’a pas pu être confirmé') }).waitFor(); assert(await selector().isDisabled());
      stage = locale + '-' + width + '-uncertain-retry';
      const uncertainIndex = await page.evaluate(() => window.collectionFixture.calls.collect.length - 1); await patch({ showReceipts: false, collectMode: 'success' }); await refresh().click(); await page.getByRole('option', { name: new RegExp(t('Previously selected confirmation', 'Confirmation sélectionnée précédemment')) }).waitFor({ state: 'attached' });
      assert.equal(await selector().inputValue(), 'fixture-native-bank'); await retry().click(); await collected().waitFor(); assert(await page.evaluate(index => JSON.stringify(window.collectionFixture.calls.collect[index]) === JSON.stringify(window.collectionFixture.calls.collect[index + 1]), uncertainIndex)); cases.push('uncertain-outcome-refreshed-preview-retains-exact-native-command');
      stage = locale + '-' + width + '-password-step-up';
      await patch({ showReceipts: true, collectMode: 'fresh', fresh: false }); await refresh().click(); await open(); await choose(); await submitAndObserve();
      const password = page.getByLabel(t('Current password', 'Mot de passe actuel'), { exact: true }); await password.waitFor(); assert(await password.evaluate(element => element === document.activeElement));
      const beforeStep = await page.evaluate(() => window.collectionFixture.calls.collect.length); await password.fill('synthetic-rendered-only'); await page.keyboard.press('Enter');
      await page.getByText(t('Identity verified. Retry the payment action to continue.', 'Identité vérifiée. Réessayez l’action de paiement pour continuer.'), { exact: true }).waitFor(); assert.equal(await page.evaluate(() => window.collectionFixture.calls.collect.length), beforeStep);
      await retry().click(); await collected().waitFor(); assert(await page.evaluate(index => JSON.stringify(window.collectionFixture.calls.collect[index - 1]) === JSON.stringify(window.collectionFixture.calls.collect[index]), beforeStep)); cases.push('password-focus-step-up-never-submits-manual-exact-retry');
      for (const code of ['AUTH_REQUIRED', 'FORBIDDEN', 'TENANT_SCOPE_VIOLATION']) {
        stage = locale + '-' + width + '-command-' + code;
        await patch({ collectMode: code }); await open(); await choose(); await submitAndObserve();
        await page.getByText(t('This action is not available with your current permissions, workspace or payment state. Refresh payments before continuing.', 'Cette action est indisponible selon vos droits, l’espace actuel ou l’état du paiement. Actualisez les paiements avant de continuer.'), { exact: true }).waitFor();
        assert.equal(await selector().count(), 0); assert.equal(await amount().count(), 0); assert.equal(await page.getByText(t('Current amount due', 'Montant dû actuel'), { exact: false }).count(), 0); assert.equal(await page.getByText('Mocked private diagnostic must not be displayed', { exact: true }).count(), 0);
        if (code === 'FORBIDDEN') await page.screenshot({ path: path.join(directory, locale + '-authority-denial-' + width + '.png'), fullPage: true });
        await patch({ collectMode: 'success' }); await refresh().click(); await page.getByRole('button', { name: t('Record customer payment', 'Enregistrer un paiement client'), exact: true }).waitFor(); cases.push('command-' + code.toLowerCase() + '-hides-private-state-and-new-read-recovers');
      }
      await open(); await choose(); await patch({ readDenial: 'AUTH_REQUIRED' }); await refresh().click(); await page.getByText(t('Current payments could not be loaded. Refresh before continuing.', 'Impossible de charger les paiements actuels. Actualisez avant de continuer.'), { exact: true }).waitFor(); assert.equal(await selector().count(), 0);
      stage = locale + '-' + width + '-read-and-permission-recovery';
      await patch({ readDenial: null }); await refresh().click(); await selector().waitFor(); assert.equal(await selector().inputValue(), ''); cases.push('failed-authoritative-read-hides-selection-and-new-read-requires-choice');
      await choose(); await patch({ allowCollect: false }); await page.getByText(t('This invoice is read-only for your current permissions or state.', 'Cette facture est en lecture seule selon vos droits ou son état actuel.'), { exact: true }).waitFor();
      assert.equal(await selector().count(), 0); assert.equal(await reference().count(), 0); await patch({ allowCollect: true }); await page.getByRole('button', { name: t('Record customer payment', 'Enregistrer un paiement client'), exact: true }).waitFor(); cases.push('collect-permission-scope-change-clears-private-choice-and-fresh-read-restores');
      for (const boundary of ['actor', 'document']) {
        stage = locale + '-' + width + '-late-' + boundary;
        if (await selector().count() === 0) await open(); await choose(); await patch({ collectMode: 'pending' }); await submitAndObserve(); assert(await selector().isDisabled());
        const next = boundary === 'actor' ? { actorId: 'fixture-collector-b' } : { referenceId: 'fixture-invoice-b' }; await patch(next); await page.getByRole('button', { name: t('Record customer payment', 'Enregistrer un paiement client'), exact: true }).waitFor();
        await patch({ collectMode: 'success' }); await page.evaluate(() => window.collectionFixture.release()); await page.waitForTimeout(80); assert.equal(await collected().count(), 0); assert.equal(await selector().count(), 0); cases.push('late-native-command-' + boundary + '-scope-fence');
      }
      await open(); await choose(); await patch({ collectMode: 'pending' }); await submitAndObserve(); await patch({ mounted: false }); await page.getByText('Fixture unmounted', { exact: true }).waitFor(); await page.evaluate(() => window.collectionFixture.release()); await page.waitForTimeout(80); assert.equal(await collected().count(), 0); cases.push('unmount-fences-late-native-command');
      assert.deepEqual(consoleErrors, []); results.push({ locale, width, cases, geometry, axe, mockCommandCount: await page.evaluate(() => window.collectionFixture.calls.collect.length), stepUpCount: await page.evaluate(() => window.collectionFixture.calls.password) });
      await context.close(); console.log(JSON.stringify({ locale, width, cases: cases.length, axeViolations: axe.violations.length }));
    }
    assert.deepEqual(errors, []); assert(network.every(request => request.allowed)); assertBindings(source); assertBindings(readiness.files);
    outcome = { passed: true, results, errors, network, sourceBindingSha256: digest(path.join(directory, 'SOURCE_BINDING.json')) };
  } catch (error) {
    const redacted = String(error.stack || error).split('synthetic-rendered-only').join('[SYNTHETIC_PASSWORD_REDACTED]').split(evidenceBytes.toString('utf8')).join('[SYNTHETIC_EVIDENCE_REDACTED]');
    fs.writeFileSync(path.join(temporary, 'failure.private.txt'), redacted, { flag: 'wx' });
    outcome = { passed: false, failure: { stage, errorType: error.name || 'Error', message: 'Rendered fixture failed; redacted private diagnostic retained.', activeVariant }, results, errors, network };
  }
  finally {
    try { if (browser) { await browser.close(); browserClosed = true; } }
    finally { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); serverClosed = true; } }
  }
  const remainingOwnedProfiles = fs.readdirSync(temporary).filter(name => name.startsWith('playwright_chromiumdev_profile-')).length;
  if (remainingOwnedProfiles) outcome.passed = false;
  write(directory, 'RESULT.json', { checkedAt: new Date().toISOString(), ...outcome, browserClosed, serverClosed, remainingOwnedProfiles, origin,
    evidenceClass: 'Real browser components/styles with mocked parent authority and actions. No authenticated app, DB, provider or E2E qualification.',
    limits: ['No visual regression baseline; new screenshots only.', 'Axe is partial automation; no screen-reader or complete accessibility claim.', 'No raw action payload, password, request body, HAR or real financial document was retained.'] });
  console.log(JSON.stringify({ directory, passed: outcome.passed, browserClosed, serverClosed, remainingOwnedProfiles })); if (!outcome.passed) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
