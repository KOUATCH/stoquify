// Reviewed static rendering only: mocked auth/actions, no Next/app/DB/provider startup.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../..'), dependencies = path.join(root, 'node_modules');
const hash = value => crypto.createHash('sha256').update(value).digest('hex'), digest = file => hash(fs.readFileSync(file));
const owned = name => require(path.join(dependencies, name));
const write = (directory, name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const osKeys = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i;
for (const key of Object.keys(process.env)) if (!osKeys.test(key)) delete process.env[key];
Object.assign(process.env, { NODE_ENV: 'test', NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: 'postgresql://synthetic@127.0.0.1:1/rendered_fixture_disabled', DIRECT_URL: 'postgresql://synthetic@127.0.0.1:1/rendered_fixture_disabled', SHADOW_DATABASE_URL: 'postgresql://synthetic@127.0.0.1:1/rendered_fixture_disabled' });
require(path.join(root, 'scripts/local-gates-network.cjs'));
const product = ['components/accounting/CloseAssuranceCenter.tsx', 'hooks/accounting/useCloseAssurance.ts', 'app/globals.css', 'app/public-contours.css', 'tailwind.config.ts', 'package.json', 'package-lock.json'];
const content = '{"classification":"MOCKED_AUTH_ACTIONS","retained":true}\n', documentDigest = hash(Buffer.from(content));
function fileBinding(files) { return [...new Set(files)].sort().map(file => ({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: digest(file) })); }
function assertBindings(files) { for (const file of files) assert.equal(digest(path.join(root, file.path)), file.sha256, 'Rendered source changed during verification: ' + file.path); }
async function compile(directory) {
  const loader = path.join(directory, 'typescript-loader.cjs');
  fs.writeFileSync(loader, 'const ts=require(' + JSON.stringify(path.join(dependencies, 'typescript')) + ');module.exports=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;', { flag: 'wx' });
  const bundled = owned('next/dist/compiled/webpack/webpack'); bundled.init();
  const mock = path.join(__dirname, 'mocks.ts'), aliases = {};
  for (const module of ['@/hooks/usePermissions', '@/components/notifications/NotificationProvider', '@/actions/accounting/close-assurance.actions', '@/actions/security/step-up-auth.actions', '@/actions/accounting/close-evidence-workflow.actions', '@/actions/accounting/close-evidence-notifications.actions', '@/actions/accounting/close-notification-operations.actions']) aliases[module + '$'] = mock;
  aliases['@'] = root;
  const noServerImports = { apply(compiler) { compiler.hooks.normalModuleFactory.tap('FixtureServerBoundary', factory => {
    factory.hooks.afterResolve.tap('FixtureServerBoundary', result => {
      const resource = (result.createData?.resource || '').split('?')[0].replaceAll('\\', '/').toLowerCase(), base = root.replaceAll('\\', '/').toLowerCase();
      const reviewedClientSchema = resource === base + '/services/accounting/close-evidence-resolution.schemas.ts'; // Zod-only, imported by the real client draft owner.
      if (!reviewedClientSchema && ['/actions/', '/prisma/', '/services/', '/lib/auth-client.', '/lib/auth.'].some(prefix => resource.startsWith(base + prefix))) throw Error('Real backend/auth module crossed fixture stub boundary: ' + resource);
    });
  }); } };
  const config = { mode: 'development', devtool: false, cache: false, context: root, entry: path.join(__dirname, 'browser-entry.tsx'),
    output: { path: directory, filename: 'bundle.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [dependencies, 'node_modules'], alias: aliases },
    resolveLoader: { modules: [dependencies] }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] },
    optimization: { minimize: false }, performance: { hints: false }, plugins: [noServerImports, new bundled.webpack.DefinePlugin({ __CLOSE_FIXTURE_DOCUMENT_DIGEST__: JSON.stringify(documentDigest) })] };
  const compiler = bundled.webpack(config);
  let stats;
  try { stats = await new Promise((resolve, reject) => compiler.run((error, value) => error || value.hasErrors() ? reject(error || Error(value.toString({ all: false, errors: true }))) : resolve(value))); }
  finally { await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve())); }
  const sourceFiles = [...stats.compilation.fileDependencies].filter(file => file.startsWith(root + path.sep) && !file.startsWith(dependencies + path.sep) && fs.existsSync(file) && fs.lstatSync(file).isFile());
  const tailwind = owned('tailwindcss/loadConfig')(path.join(root, 'tailwind.config.ts'));
  tailwind.content = sourceFiles.filter(file => /\.[jt]sx?$/.test(file));
  const globalCss = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
  assert(globalCss.startsWith('@import "./public-contours.css";'), 'Reviewed global CSS import changed');
  // Preserve the exact imported CSS while avoiding axe's document-relative
  // import fetch; this fixture intentionally keeps connect-src none.
  const inlinedCss = globalCss.replace('@import "./public-contours.css";', fs.readFileSync(path.join(root, 'app/public-contours.css'), 'utf8'));
  const css = await owned('postcss')([owned('tailwindcss')(tailwind)]).process(inlinedCss, { from: path.join(root, 'app/globals.css') });
  fs.writeFileSync(path.join(directory, 'style.css'), css.css, { flag: 'wx' });
  fs.copyFileSync(path.join(root, 'app/public-contours.css'), path.join(directory, 'public-contours.css'), fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(path.join(dependencies, 'axe-core/axe.min.js'), path.join(directory, 'axe.js'), fs.constants.COPYFILE_EXCL);
  return fileBinding([...sourceFiles, ...product.map(file => path.join(root, file)), __filename]);
}
async function main() {
  assert.equal(process.argv.length, 2, 'No target or authority overrides accepted');
  const directory = path.join(__dirname, 'attempt-' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(directory);
  // Edge's own GPU-cache suffix otherwise crosses Windows' legacy260 limit.
  // Keep a short, newly owned TEMP under this same isolated evidence subtree.
  const temporary = path.join(__dirname, 'tmp-' + crypto.randomBytes(3).toString('hex')); fs.mkdirSync(temporary); process.env.TEMP = temporary; process.env.TMP = temporary;
  const initial = fileBinding(product.map(file => path.join(root, file))), results = [], errors = [], network = [], downloads = [];
  write(directory, 'RUNNER_REVIEW.json', { checkedAt: new Date().toISOString(), runnerSha256: digest(__filename), initial,
    classification: 'Real browser rendering of current components/hooks with explicitly MOCKED AUTH/ACTIONS. No authenticated application, database, statutory or hosted-origin qualification.',
    toolchain: 'Installed Next bundled Webpack + explicit TypeScript transpileModule loader; no Next/tsconfig/dotenv setup; real Tailwind3/app tokens',
    effects: ['New owned fixture bundle/CSS/receipts/downloads/screenshots', 'Ephemeral127.0.0.1 static HTTP listener', 'Owned headless installed Edge browser'],
    boundaries: ['No package installation', 'No application server or database', 'No live provider calls', 'No private credentials', 'External browser requests aborted'], temporary, environmentVariableNames: Object.keys(process.env).sort() });
  let source = initial, server, browser, origin, serverClosed = false, browserClosed = false, outcome;
  try {
    source = await compile(directory); assertBindings(initial);
    write(directory, 'SOURCE_BINDING.json', { source, mockBoundary: ['Server actions', 'Permission/session observer', 'Notification provider'], documentDigest,
      files: ['bundle.js', 'style.css', 'public-contours.css', 'axe.js'].map(file => ({ path: file, sha256: digest(path.join(directory, file)) })) });
    server = http.createServer((request, response) => {
      const route = new URL(request.url, 'http://127.0.0.1').pathname;
      if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
      response.setHeader('Content-Security-Policy', "default-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data:; font-src 'self'; frame-src 'none'");
      if (route === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      if (['/bundle.js', '/style.css', '/public-contours.css', '/axe.js'].includes(route)) { response.setHeader('Content-Type', route.endsWith('.js') ? 'application/javascript' : 'text/css'); response.end(fs.readFileSync(path.join(directory, route.slice(1)))); return; }
      if (!['/en/fixture', '/fr/fixture'].includes(route)) { response.writeHead(404); response.end(); return; }
      response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html lang="' + (route.startsWith('/fr') ? 'fr' : 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mocked close assurance rendered fixture</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); origin = 'http://127.0.0.1:' + server.address().port;
    browser = await owned('playwright').chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-default-browser-check'] });
    for (const locale of ['en', 'fr']) for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
      await context.route('**/*', route => { const url = route.request().url(), allowed = new URL(url).origin === origin; network.push({ url, allowed }); return allowed ? route.continue() : route.abort(); });
      const page = await context.newPage(), cases = [], consoleErrors = [];
      page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('download', download => downloads.push({ locale, width, name: download.suggestedFilename() }));
      const t = (en, fr) => locale === 'fr' ? fr : en;
      await page.goto(origin + '/' + locale + '/fixture'); await page.getByText('MOCKED AUTH / ACTIONS · STATIC LOOPBACK FIXTURE · NO DATABASE').waitFor();
      assert.equal(await page.getByRole('button', { name: t('Export draft JSON', 'Exporter JSON brouillon'), exact: true }).count(), 0); cases.push('permission-loading-hides-private-workspace');
      if (width === 390) await page.screenshot({ path: path.join(directory, locale + '-loading-390.png'), fullPage: true });
      await page.evaluate(() => window.closeFixture.set({ permissionState: 'ready', allowRead: false }));
      await page.getByText(t('Access to close evidence denied', 'Accès aux preuves de clôture refusé'), { exact: true }).waitFor();
      assert.equal(await page.getByText(/Private evidence fixture-actor/).count(), 0); cases.push('ready-without-read-permission-hides-private-workspace');
      await page.evaluate(() => window.closeFixture.set({ permissionState: 'ready', allowRead: true }));
      await page.getByText('Private evidence fixture-actor-a fixture-june', { exact: true }).waitFor();
      const recover = page.getByRole('button', { name: t('Recover original JSON', 'Récupérer le JSON d’origine'), exact: true });
      await recover.focus(); await page.keyboard.press('Enter');
      const password = page.getByLabel(t('Current password', 'Mot de passe actuel'), { exact: true }); await password.waitFor();
      assert(await password.evaluate(element => element === document.activeElement)); await password.fill('synthetic-fixture-only'); await page.keyboard.press('Enter');
      await page.getByText(t('Identity verified. Retry your selected action.', 'Identité vérifiée. Réessayez l’action choisie.'), { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.closeFixture.calls.recovery), 1, 'Step-up must not retry recovery automatically');
      const downloaded = page.waitForEvent('download'); await recover.focus(); await page.keyboard.press('Enter'); const file = await downloaded;
      const fileName = locale + '-' + width + '-original.json'; await file.saveAs(path.join(directory, fileName)); assert.equal(digest(path.join(directory, fileName)), documentDigest);
      assert.equal(await page.getByText(t('Current certification evidence', 'Preuves de certification actuelles'), { exact: true }).count(), 0);
      await page.getByText(t('Historical recorded copy', 'Copie historique enregistrée'), { exact: true }).waitFor();
      cases.push('keyboard-recovery-focus-step-up-manual-retry', 'exact-historical-download-bytes-no-current-certification');
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
      assert(geometry.documentWidth <= width + 1, 'Page overflows viewport');
      await page.screenshot({ path: path.join(directory, locale + '-historical-' + width + '.png'), fullPage: true });
      await page.addScriptTag({ url: origin + '/axe.js' });
      const axe = await page.evaluate(async () => { const result = await window.axe.run(document); return { violations: result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })), incomplete: result.incomplete.map(item => item.id) }; });
      const draft = () => page.getByRole('button', { name: t('Export draft JSON', 'Exporter JSON brouillon'), exact: true });
      await page.evaluate(() => window.closeFixture.set({ pendingExport: true })); await draft().click();
      await page.getByRole('button', { name: t('Exporting', 'Export'), exact: true }).waitFor();
      assert(await page.getByRole('button', { name: t('Exporting', 'Export'), exact: true }).isDisabled());
      const previousDownloads = downloads.length;
      await page.evaluate(() => window.closeFixture.set({ actorId: 'fixture-actor-b' })); await page.getByText('Private evidence fixture-actor-b fixture-june', { exact: true }).waitFor();
      await page.evaluate(() => window.closeFixture.releaseExports()); await page.waitForTimeout(80); assert.equal(downloads.length, previousDownloads);
      assert.equal(await page.getByText(t('Last export', 'Dernier export'), { exact: true }).count(), 0); cases.push('pending-command-disabled', 'actor-transition-fences-late-export-and-private-state');
      await draft().click(); await page.getByRole('button', { name: t('Exporting', 'Export'), exact: true }).waitFor();
      await page.getByRole('combobox', { name: t('Period', 'Periode'), exact: true }).click(); await page.getByRole('option', { name: 'July 2026 - OPEN', exact: true }).click();
      await page.getByText('Private evidence fixture-actor-b fixture-july', { exact: true }).waitFor();
      await page.evaluate(() => window.closeFixture.releaseExports()); await page.waitForTimeout(80); assert.equal(downloads.length, previousDownloads); cases.push('real-period-selector-fences-late-export');
      await draft().click(); await page.getByRole('button', { name: t('Exporting', 'Export'), exact: true }).waitFor();
      await page.evaluate(() => window.closeFixture.set({ permissionState: 'loading' })); await page.getByRole('textbox', { name: t('Decision notes', 'Notes de decision'), exact: true }).waitFor({ state: 'hidden' });
      await page.evaluate(() => window.closeFixture.releaseExports()); await page.waitForTimeout(80); assert.equal(downloads.length, previousDownloads); cases.push('authority-loss-hides-private-state-and-fences-late-export');
      await page.evaluate(() => window.closeFixture.set({ permissionState: 'ready', pendingExport: false, exportDenial: 'FORBIDDEN' }));
      await page.getByText('Private evidence fixture-actor-b fixture-july', { exact: true }).waitFor();
      await draft().click(); await page.getByRole('heading', { name: t('Access to close evidence denied', 'Accès aux preuves de clôture refusé'), exact: true }).waitFor();
      assert.equal(await page.getByText(/Private evidence fixture-actor/).count(), 0); assert.equal(await page.getByText('Mocked private authority diagnostic', { exact: true }).count(), 0);
      cases.push('server-command-forbidden-immediately-hides-cached-private-workspace');
      await page.evaluate(() => window.closeFixture.set({ exportDenial: null })); await page.waitForTimeout(80);
      assert.equal(await page.getByText(/Private evidence fixture-actor/).count(), 0);
      await page.getByRole('button', { name: t('Refresh', 'Actualiser'), exact: true }).click();
      await page.getByText('Private evidence fixture-actor-b fixture-july', { exact: true }).waitFor();
      await page.evaluate(() => window.closeFixture.set({ recoveryDenial: 'AUTH_REQUIRED' }));
      await page.getByRole('button', { name: t('Recover original JSON', 'Récupérer le JSON d’origine'), exact: true }).click();
      await page.getByRole('link', { name: t('Sign in again', 'Se reconnecter'), exact: true }).waitFor();
      assert.equal(await page.getByText(/Private evidence fixture-actor/).count(), 0); cases.push('retained-recovery-session-denial-hides-private-data-and-offers-sign-in');
      await page.screenshot({ path: path.join(directory, locale + '-server-denial-' + width + '.png'), fullPage: true });
      assert.deepEqual(consoleErrors, []); results.push({ locale, width, cases, geometry, axe, screenshot: locale + '-historical-' + width + '.png' });
      await context.close(); console.log(JSON.stringify({ locale, width, cases: cases.length, axeViolations: axe.violations.length }));
    }
    assert.deepEqual(errors, []); assert(network.every(item => item.allowed)); assertBindings(source);
    outcome = { passed: true, results, errors, network, downloads, documentDigest, sourceBindingSha256: digest(path.join(directory, 'SOURCE_BINDING.json')) };
  } catch (error) { outcome = { passed: false, error: error.message, stack: error.stack, results, errors, network, downloads }; }
  finally {
    try { if (browser) { await browser.close(); browserClosed = true; } }
    finally { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); serverClosed = true; } }
  }
  write(directory, 'RESULT.json', { checkedAt: new Date().toISOString(), ...outcome, browserClosed, serverClosed, origin,
    evidenceClass: 'Mocked auth/actions with real browser rendering only; no authenticated application/E2E/DB/hosted build.',
    limitations: ['No visual regression baseline; screenshots are new observations.', 'Automated axe findings are recorded, not full accessibility or screen-reader certification.', 'No production origin, real sessions, statutory certificate or provider was exercised.'] });
  console.log(JSON.stringify({ directory, passed: outcome.passed, browserClosed, serverClosed })); if (!outcome.passed) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
