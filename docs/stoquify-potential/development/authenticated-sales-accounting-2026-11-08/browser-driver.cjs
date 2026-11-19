// Real DOM browser operations on this run's owned loopback app/profile only.
// JSON operations arrive on stdin; synthetic credentials stay in .codex-tmp.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../../../node_modules/playwright'));
const root = path.resolve(__dirname, '../../../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const target = read(path.join(__dirname, 'DATABASE_TARGET.json'));
const app = read(path.join(__dirname, 'APPLICATION_TARGET.json'));
if (app.origin !== 'http://127.0.0.1:3196' || app.database !== target.database
    || path.dirname(target.directory) !== path.join(root, '.codex-tmp')
    || !/^auth-sales-accounting-20261108-[a-f0-9]{10}$/.test(path.basename(target.directory))) throw Error('Unexpected browser target');
const input = read(process.argv[2] || 0);
const evidence = path.join(__dirname, 'browser');
fs.mkdirSync(evidence, { recursive: true });
const name = input.name;
if (!/^[a-z0-9-]+$/.test(name)) throw Error('Evidence name required');
const results = [];
let page, connectedBrowser;
function redact(message) {
  const credentials = read(path.join(target.directory, 'credentials.private.json'));
  for (const user of Object.values(credentials.users)) message = message.replaceAll(user.password, '[SYNTHETIC_PASSWORD]');
  return message;
}
function output() {
  console.log(JSON.stringify(results.map(item => item.controls ? {
    url: item.url, text: item.text,
    fields: item.controls.filter(c => c.tag !== 'BUTTON').map(c => [c.tag, c.id || c.label || c.placeholder, c.type, c.text, c.value, c.disabled]),
    buttons: item.controls.filter(c => c.tag === 'BUTTON').map(c => [c.label || c.text, c.disabled]),
  } : item)));
}
function locator(op) {
  if (op.selector) return page.locator(op.selector).nth(op.index ?? 0);
  if (op.role) return page.getByRole(op.role, { name: op.text, exact: op.exact ?? true }).nth(op.index ?? 0);
  if (op.label) return page.getByLabel(op.label, { exact: op.exact ?? true }).nth(op.index ?? 0);
  if (op.placeholder) return page.getByPlaceholder(op.placeholder, { exact: op.exact ?? true }).nth(op.index ?? 0);
  if (op.text) return page.getByText(op.text, { exact: op.exact ?? true }).nth(op.index ?? 0);
  throw Error('DOM locator required');
}
async function snapshot() {
  return { url: page.url(), title: await page.title(), viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })), text: (await page.locator('body').innerText()).slice(0, input.maxText || 16000),
    controls: await page.locator('input,select,textarea,button,[role="combobox"],[role="dialog"]').evaluateAll(elements => elements.map(el => ({
      tag: el.tagName, role: el.getAttribute('role'), type: el.getAttribute('type'), id: el.id,
      name: el.getAttribute('name'), label: el.getAttribute('aria-label'), placeholder: el.getAttribute('placeholder'),
      text: (el.innerText || '').slice(0, 180), disabled: el.disabled || false,
      value: el.tagName === 'INPUT' && !['password', 'hidden'].includes(el.type) ? el.value : undefined,
    }))) };
}
async function main() {
  const browser = connectedBrowser = await chromium.connectOverCDP('http://127.0.0.1:9316');
  const context = browser.contexts()[0];
  page = context.pages().find(p => p.url().startsWith(app.origin)) || context.pages()[0] || await context.newPage();
  await page.setViewportSize(input.viewport || { width: 1440, height: 1000 });
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(120000);
  page.on('pageerror', error => results.push({ pageError: error.message }));
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(app.origin)) results.push({ httpError: response.status(), url: response.url().split('?')[0] }); });
  for (const op of input.operations) {
    switch (op.kind) {
      case 'goto': {
        const destination = new URL(op.path, app.origin);
        if (destination.origin !== app.origin) throw Error('Only owned origin allowed');
        await page.goto(destination.href, { waitUntil: 'domcontentloaded' }); break;
      }
      case 'login': {
        const fixture = read(path.join(target.directory, 'credentials.private.json'));
        const user = fixture.users[op.user];
        if (!user) throw Error('Unknown synthetic role');
        await context.clearCookies();
        const locale = op.locale || 'en';
        await page.goto(`${app.origin}/${locale}/login-v2?returnUrl=${encodeURIComponent(op.returnUrl || '/dashboard/pos')}`, { waitUntil: 'domcontentloaded' });
        await page.getByLabel(locale === 'fr' ? 'Adresse email' : 'Email address', { exact: true }).fill(user.email);
        await page.getByLabel(locale === 'fr' ? 'Mot de passe' : 'Password', { exact: true }).fill(user.password);
        await page.getByRole('button', { name: locale === 'fr' ? 'Se connecter' : 'Sign in securely', exact: true }).click();
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 120000, waitUntil: 'domcontentloaded' });
        results.push({ signedInRole: op.user }); break;
      }
      case 'fill': await locator(op).fill(op.value); break;
      case 'click': await locator(op).click(); break;
      case 'select': await locator(op).selectOption(op.value); break;
      case 'check': await locator(op).setChecked(op.value ?? true); break;
      case 'key': await page.keyboard.press(op.key); break;
      case 'scroll': await locator(op).scrollIntoViewIfNeeded(); break;
      case 'wait': await locator(op).waitFor({ state: op.state || 'visible', timeout: op.timeout || 60000 }); break;
      case 'assertCount': {
        const actual = await locator(op).count();
        if (actual !== op.count) throw Error(`DOM assertion failed: ${op.text || op.label || op.selector}: expected ${op.count}, received ${actual}`);
        results.push({ assertion: op.text || op.label || op.selector, count: actual, passed: true }); break;
      }
      case 'password': {
        const fixture = read(path.join(target.directory, 'credentials.private.json'));
        await locator(op).fill(fixture.users[op.user].password); break;
      }
      case 'file': {
        const file = path.join(target.directory, 'synthetic-support.txt');
        if (!fs.existsSync(file)) fs.writeFileSync(file, 'Synthetic bank receipt / correction evidence. No real funds or personal information.\n');
        await locator(op).setInputFiles(file); break;
      }
      case 'viewport': await page.setViewportSize({ width: op.width, height: op.height }); break;
      case 'audit': {
        await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
        const audit = await locator(op).evaluate(async element => {
          const result = await window.axe.run(element, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
          return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) })), incompleteCount: result.incomplete.length, passes: result.passes.length };
        });
        results.push({ accessibilityAudit: audit }); break;
      }
      case 'screenshot': {
        const suffix = op.suffix ? `-${op.suffix}` : '';
        if (!/^[a-z0-9-]*$/.test(suffix)) throw Error('Invalid screenshot suffix');
        await page.screenshot({ path: path.join(evidence, `${name}${suffix}.png`), fullPage: op.fullPage ?? false }); break;
      }
      case 'validity': {
        const valid = await locator(op).evaluate(element => element.checkValidity());
        if (valid !== op.expected) throw Error('Unexpected native field validity');
        results.push({ fieldValidity: op.label || op.selector, valid }); break;
      }
      case 'layout': {
        results.push({ layout: await locator(op).evaluate(element => {
          const box = element.getBoundingClientRect();
          return { viewportWidth: innerWidth, viewportHeight: innerHeight, left: box.left, right: box.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
        }) }); break;
      }
      case 'inspect': results.push(await snapshot()); break;
      default: throw Error('Unsupported operation');
    }
    results.push({ operation: op.kind, ...(op.role ? { role: op.role, text: op.text } : {}), ...(op.label ? { label: op.label } : {}) });
  }
  fs.writeFileSync(path.join(evidence, `${name}.json`), JSON.stringify({ utc: new Date().toISOString(), operations: input.operations.map(({ value, ...op }) => ({ ...op, ...(value !== undefined && op.kind !== 'fill' ? { value } : {}) })), results }, null, 2));
  output();
  await browser.close(); // CDP connection detaches; owned supervisor retains browser.
}
main().catch(async error => {
  results.push({ failure: redact(error.message) });
  if (page) { try { results.push(await snapshot()); await page.screenshot({ path: path.join(evidence, `${name}-failure.png`), fullPage: true }); } catch {} }
  fs.writeFileSync(path.join(evidence, `${name}.json`), JSON.stringify({ utc: new Date().toISOString(), results }, null, 2));
  output();
  if (connectedBrowser) await connectedBrowser.close().catch(() => {});
  process.exitCode = 1;
});
