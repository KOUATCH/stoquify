// Isolated browser rendering: real controls/hooks/child components; mocked auth/actions.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../..'), dependencies = path.join(root, 'node_modules');
const hash = value => crypto.createHash('sha256').update(value).digest('hex'), digest = file => hash(fs.readFileSync(file)), owned = name => require(path.join(dependencies, name));
const write = (directory, name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const osKeys = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i;
for (const key of Object.keys(process.env)) if (!osKeys.test(key)) delete process.env[key];
Object.assign(process.env, { NODE_ENV: 'test', NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: 'postgresql://synthetic@127.0.0.1:1/monthly_fixture_disabled', DIRECT_URL: 'postgresql://synthetic@127.0.0.1:1/monthly_fixture_disabled', SHADOW_DATABASE_URL: 'postgresql://synthetic@127.0.0.1:1/monthly_fixture_disabled' });
require(path.join(root, 'scripts/local-gates-network.cjs'));
const changed = ['components/finance/PaymentReconciliationWorkbench.tsx', 'hooks/payments/usePaymentReconciliationDashboard.ts', 'messages/en.json', 'messages/fr.json'];
const product = [...changed, 'hooks/payments/usePaymentReconciliationWorkbench.ts', 'app/globals.css', 'app/public-contours.css', 'tailwind.config.ts', 'package.json', 'package-lock.json'];
const boundaryNames = ['@/actions/evidence/proof-trail.actions', '@/actions/payments/alert-scan-recovery.actions', '@/actions/payments/exception-closure.actions', '@/actions/payments/exception-link.actions', '@/actions/payments/reconciliation-preparation.actions', '@/actions/payments/reconciliation-sign-review.actions', '@/actions/payments/reconciliation-workbench.actions', '@/actions/payments/reconciliation.actions', '@/actions/payments/suspense-resolution.actions', '@/actions/security/step-up-auth.actions', '@/components/notifications/NotificationProvider', '@/hooks/usePermissions'];
const clientContracts = ['services/evidence/evidence-contracts.ts', 'services/reconciliation/payment-exception-closure.contracts.ts', 'services/reconciliation/payment-exception-link.contracts.ts', 'services/reconciliation/payment-suspense-correction.contracts.ts', 'services/reconciliation/payment-suspense-resolution-recovery.contracts.ts', 'services/reconciliation/payment-suspense-resolution.contracts.ts', 'services/reconciliation/reconciliation-certificate-export.contracts.ts', 'services/reconciliation/reconciliation-run-preparation.contracts.ts', 'services/reconciliation/reconciliation-sign-review.contracts.ts'];
function fileBinding(files) { return [...new Set(files)].sort().map(file => ({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: digest(file) })); }
function assertBindings(files) { for (const file of files) assert.equal(digest(path.join(root, file.path)), file.sha256, 'Rendered source changed: ' + file.path); }
async function compile(directory) {
  const loader = path.join(directory, 'typescript-loader.cjs');
  fs.writeFileSync(loader, 'const ts=require(' + JSON.stringify(path.join(dependencies, 'typescript')) + ');module.exports=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;', { flag: 'wx' });
  const moduleLoader = path.join(directory, 'reviewed-css-module-loader.cjs');
  // Only this reviewed existing module is transformed. Its .root remains scoped;
  // its :global selectors remain global. No CSS dependency or Node polyfill added.
  fs.writeFileSync(moduleLoader, 'module.exports=function(s){if(!this.resourcePath.endsWith("ReconciliationSignReview.module.css"))throw Error("Unreviewed CSS module");const css=s.replace(/:global\\(([^)]+)\\)/g,"$1").replace(/\\.root\\b/g,".monthly-fixture-sign-root");return "const style=document.createElement(\\"style\\");style.textContent="+JSON.stringify(css)+";document.head.appendChild(style);export default {root:\\"monthly-fixture-sign-root\\"};";};', { flag: 'wx' });
  const bundled = owned('next/dist/compiled/webpack/webpack'); bundled.init();
  const aliases = Object.fromEntries(boundaryNames.map(name => [name + '$', path.join(__dirname, 'mocks.ts')]));
  aliases['next/link$'] = path.join(__dirname, 'framework-link.tsx');
  aliases['@/components/DataTableComponents$'] = path.join(__dirname, 'table-exports.ts');
  aliases['@/components/bi$'] = path.join(root, 'components/bi/BIProofDrawerHost.tsx'); aliases['@'] = root;
  const noServerImports = { apply(compiler) { compiler.hooks.normalModuleFactory.tap('MonthlyFixtureBoundary', factory => factory.hooks.afterResolve.tap('MonthlyFixtureBoundary', result => {
    const resource = (result.createData?.resource || '').split('?')[0].replaceAll('\\', '/').toLowerCase(), base = root.replaceAll('\\', '/').toLowerCase();
    const allowed = clientContracts.some(file => resource === base + '/' + file.toLowerCase());
    if (!allowed && ['/actions/', '/prisma/', '/services/', '/lib/auth-client.', '/lib/auth.'].some(prefix => resource.startsWith(base + prefix))) throw Error('Real backend/auth module crossed fixture boundary: ' + resource);
  })); } };
  const compiler = bundled.webpack({ mode: 'development', devtool: false, cache: false, context: root, entry: path.join(__dirname, 'browser-entry.tsx'), output: { path: directory, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [dependencies, 'node_modules'], alias: aliases }, resolveLoader: { modules: [dependencies] },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }, { test: /\.module\.css$/, use: moduleLoader }] },
    optimization: { minimize: false }, performance: { hints: false }, plugins: [noServerImports] });
  let stats;
  try { stats = await new Promise((resolve, reject) => compiler.run((error, value) => error || value.hasErrors() ? reject(error || Error(value.toString({ all: false, errors: true }))) : resolve(value))); }
  finally { await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve())); }
  const sourceFiles = [...stats.compilation.fileDependencies].filter(file => file.startsWith(root + path.sep) && !file.startsWith(dependencies + path.sep) && fs.existsSync(file) && fs.lstatSync(file).isFile());
  const tailwind = owned('tailwindcss/loadConfig')(path.join(root, 'tailwind.config.ts')); tailwind.content = sourceFiles.filter(file => /\.[jt]sx?$/.test(file));
  const globalCss = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8'); assert(globalCss.startsWith('@import "./public-contours.css";'));
  const css = await owned('postcss')([owned('tailwindcss')(tailwind)]).process(globalCss.replace('@import "./public-contours.css";', fs.readFileSync(path.join(root, 'app/public-contours.css'), 'utf8')), { from: path.join(root, 'app/globals.css') });
  fs.writeFileSync(path.join(directory, 'style.css'), css.css, { flag: 'wx' }); fs.copyFileSync(path.join(dependencies, 'axe-core/axe.min.js'), path.join(directory, 'axe.js'), fs.constants.COPYFILE_EXCL);
  return fileBinding([...sourceFiles, ...product.map(file => path.join(root, file)), __filename, path.join(__dirname, 'SOURCE_READY.json')]);
}
async function main() {
  assert.equal(process.argv.length, 2, 'No target or authority overrides accepted');
  const ready = JSON.parse(fs.readFileSync(path.join(__dirname, 'SOURCE_READY.json'), 'utf8'));
  assert.deepEqual(ready.files.map(item => item.path).sort(), [...changed].sort(), 'All four owner-confirmed source files required'); assert(ready.confirmedBy && ready.confirmedAt); assertBindings(ready.files);
  const directory = path.join(__dirname, 'attempt-' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(directory);
  const temporary = path.join(__dirname, 'tmp-' + crypto.randomBytes(3).toString('hex')); fs.mkdirSync(temporary); process.env.TEMP = temporary; process.env.TMP = temporary;
  const initial = fileBinding(product.map(file => path.join(root, file))), results = [], errors = [], network = [];
  write(directory, 'RUNNER_REVIEW.json', { checkedAt: new Date().toISOString(), runnerSha256: digest(__filename), initial, sourceReadySha256: digest(path.join(__dirname, 'SOURCE_READY.json')),
    classification: 'Mocked auth/actions; real payment workbench, child components, read/run hooks and EN/FR messages. No authenticated application/E2E/DB/hosted build.',
    toolchain: 'Installed Next bundled Webpack + explicit TypeScript loader + scoped existing CSS module; no Next/tsconfig/dotenv setup or Node polyfills', mockedBoundaries: [...boundaryNames, 'next/link: static anchor, no Next router'], narrowedBarrels: ['Same real BIProofDrawerHost export', 'Same three real canonical table exports, excluding unrelated Next URL-state hook'], clientContracts,
    effects: ['New owned bundle/CSS/receipts/screenshots', 'Ephemeral127.0.0.1 static listener', 'Owned headless installed Edge'], temporary, environmentVariableNames: Object.keys(process.env).sort() });
  let source = initial, server, browser, origin, serverClosed = false, browserClosed = false, outcome;
  try {
    source = await compile(directory); assertBindings(initial); assertBindings(ready.files);
    write(directory, 'SOURCE_BINDING.json', { source, sourceReadySha256: digest(path.join(__dirname, 'SOURCE_READY.json')), assets: ['bundle.js', 'style.css', 'axe.js'].map(file => ({ path: file, sha256: digest(path.join(directory, file)) })) });
    server = http.createServer((request, response) => {
      const route = new URL(request.url, 'http://127.0.0.1').pathname; if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
      response.setHeader('Content-Security-Policy', "default-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data:; font-src 'self'; frame-src 'none'");
      if (route === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      if (['/bundle.js', '/style.css', '/axe.js'].includes(route)) { response.setHeader('Content-Type', route.endsWith('.js') ? 'application/javascript' : 'text/css'); response.end(fs.readFileSync(path.join(directory, route.slice(1)))); return; }
      if (!['/en/fixture', '/fr/fixture'].includes(route)) { response.writeHead(404); response.end(); return; }
      response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html lang="' + (route.startsWith('/fr') ? 'fr' : 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mocked monthly reconciliation fixture</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); origin = 'http://127.0.0.1:' + server.address().port;
    browser = await owned('playwright').chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-default-browser-check'] });
    for (const locale of ['en', 'fr']) for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      await context.route('**/*', route => { const url = route.request().url(), allowed = new URL(url).origin === origin; network.push({ url, allowed }); return allowed ? route.continue() : route.abort(); });
      const page = await context.newPage(), cases = [], consoleErrors = [];
      page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      const messages = JSON.parse(fs.readFileSync(path.join(root, 'messages', locale + '.json'))).paymentReconciliationWorkbench;
      const t = key => key.split('.').reduce((value, name) => value[name], messages);
      const run = () => page.getByRole('button', { name: t('certification.actions.run'), exact: true });
      const coverage = () => page.getByRole('combobox', { name: t('certification.runScope.label'), exact: true });
      const period = () => page.getByRole('combobox', { name: t('certification.runScope.periodLabel'), exact: true });
      async function choose(control, option) { await control.focus(); await page.keyboard.press('Enter'); const item = page.getByRole('option', { name: option, exact: true }); await item.waitFor(); await item.focus(); await page.keyboard.press('Enter'); assert(await control.evaluate(element => element === document.activeElement), 'Select returns keyboard focus'); }
      await page.goto(origin + '/' + locale + '/fixture'); await page.getByText('MOCKED AUTH / ACTIONS · STATIC LOOPBACK FIXTURE · NO DATABASE').waitFor(); await coverage().waitFor();
      assert.equal(await coverage().innerText(), t('certification.runScope.daily')); assert.equal(await period().count(), 0);
      const before = Date.now(); await run().focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => window.closeMonthlyFixture.calls.length === 1);
      await page.waitForFunction(() => window.closeMonthlyFixture.notifications.some(item => item.type === 'success'));
      const daily = await page.evaluate(() => window.closeMonthlyFixture.calls[0]); assert.deepEqual(Object.keys(daily).sort(), ['businessDate', 'providerAccountId']); assert(Date.parse(daily.businessDate) >= before - 1000 && Date.parse(daily.businessDate) <= Date.now() + 1000); cases.push('daily-default-dispatches-current-date-only');
      await choose(coverage(), t('certification.runScope.accountingPeriod')); assert(await run().isDisabled());
      await page.getByText(t('certification.runScope.collisionWarning'), { exact: true }).waitFor(); assert.equal(await page.getByRole('textbox', { name: t('certification.runScope.periodLabel'), exact: true }).count(), 0); cases.push('monthly-disabled-until-stored-period-no-arbitrary-date-input');
      await choose(period(), 'June 2026 / 2026-06-01 – 2026-06-30 UTC'); assert(await run().isEnabled()); await run().focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.closeMonthlyFixture.calls.length === 2); const monthly = await page.evaluate(() => window.closeMonthlyFixture.calls[1]); assert.deepEqual(monthly, { providerAccountId: 'monthly-fixture-account', accountingPeriodId: 'monthly-fixture-june' }); cases.push('keyboard-monthly-command-dispatches-only-stored-accounting-period');
      await page.getByText(t('statementImport.formatHint'), { exact: true }).waitFor(); cases.push('localized-observed-dates-coverage-limitation-visible');
      await page.screenshot({ path: path.join(directory, locale + '-monthly-' + width + '.png'), fullPage: true });
      await page.evaluate(() => window.closeMonthlyFixture.set({ catalog: 'empty' })); await page.getByText(t('certification.runScope.noPeriods'), { exact: true }).waitFor(); assert(await run().isDisabled()); cases.push('catalog-removal-disables-selected-period');
      await page.evaluate(() => window.closeMonthlyFixture.set({ catalog: 'both', holdRuns: true })); await run().waitFor({ state: 'visible' });
      await page.evaluate(() => window.closeMonthlyFixture.clearNotifications()); await run().click(); await page.waitForFunction(() => window.closeMonthlyFixture.waiting === 1); assert(await run().isDisabled());
      await choose(period(), 'July 2026 / 2026-07-01 – 2026-07-31 UTC'); await page.evaluate(() => window.closeMonthlyFixture.release()); await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.closeMonthlyFixture.notifications.filter(item => item.type !== 'info').length), 0); cases.push('pending-disabled-and-late-period-response-has-no-completion-toast');
      await page.evaluate(() => window.closeMonthlyFixture.clearNotifications()); await run().click(); await page.waitForFunction(() => window.closeMonthlyFixture.waiting === 1);
      await page.evaluate(() => window.closeMonthlyFixture.set({ actorId: 'monthly-fixture-actor-b' })); await coverage().waitFor(); assert.equal(await coverage().innerText(), t('certification.runScope.daily'));
      await page.evaluate(() => window.closeMonthlyFixture.release()); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => window.closeMonthlyFixture.notifications.filter(item => item.type !== 'info').length), 0); cases.push('actor-transition-resets-to-day-and-fences-late-run');
      await page.evaluate(() => window.closeMonthlyFixture.clearNotifications()); await run().click(); await page.waitForFunction(() => window.closeMonthlyFixture.waiting === 1);
      await page.evaluate(() => window.closeMonthlyFixture.set({ allowRun: false })); assert(await run().isDisabled()); await page.evaluate(() => window.closeMonthlyFixture.release(true)); await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.closeMonthlyFixture.notifications.filter(item => item.type !== 'info').length), 0); assert.equal(await page.evaluate(() => window.closeMonthlyFixture.calls.length), 5); cases.push('run-authority-revocation-fences-late-error-without-retry');
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth })); assert(geometry.documentWidth <= width + 1, 'Page overflows viewport');
      await page.addScriptTag({ url: origin + '/axe.js' }); const axe = await page.evaluate(async () => { const result = await window.axe.run(document); return { violations: result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })), incomplete: result.incomplete.map(item => item.id) }; });
      assert.deepEqual(consoleErrors, []); assert.deepEqual(errors, []); results.push({ locale, width, cases, geometry, axe, commands: await page.evaluate(() => window.closeMonthlyFixture.calls), screenshot: locale + '-monthly-' + width + '.png' });
      await context.close(); console.log(JSON.stringify({ locale, width, cases: cases.length, axeViolations: axe.violations.length }));
    }
    assert(network.every(item => item.allowed)); assertBindings(source); assertBindings(ready.files);
    outcome = { passed: true, results, errors, network, sourceBindingSha256: digest(path.join(directory, 'SOURCE_BINDING.json')) };
  } catch (error) { outcome = { passed: false, error: error.message, stack: error.stack, results, errors, network }; }
  finally { try { if (browser) { await browser.close(); browserClosed = true; } } finally { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); serverClosed = true; } } }
  write(directory, 'RESULT.json', { checkedAt: new Date().toISOString(), ...outcome, browserClosed, serverClosed, origin,
    evidenceClass: 'Mocked auth/actions with real browser rendering only; no authenticated application/E2E/DB/hosted build.',
    limitations: ['No visual baseline or full accessibility/screen-reader certification.', 'Notifications are captured mock provider calls; real toast transport is not exercised.', 'Synthetic periods/accounts/statements; no financial coverage or monthly certificate is established.'] });
  console.log(JSON.stringify({ directory, passed: outcome.passed, browserClosed, serverClosed })); if (!outcome.passed) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
