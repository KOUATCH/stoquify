// Minimal manual-identity probe; previous diagnostic and evidence are preserved.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after the coordinator releases the owned browser lane.');
} else {
  const r = require('./close-current-recovery-runtime.cjs'), b = require('./close-denial-recovery-browser.cjs'), j = require('./close-current-recovery-browser.cjs');
  const { f, db, helper, root } = r, { fs, path, crypto, assert } = f;
  const { execFileSync } = require('node:child_process'), { chromium, expect: baseExpect } = require('@playwright/test');
  const expect = baseExpect.configure({ timeout: 60000 }), run = crypto.randomUUID(), secrets = [], base = 'http://127.0.0.1:3110';
  const report = { run, at: new Date().toISOString(), diagnosticOnly: true, servedAssets: [], permissionTimings: [], pageErrors: [],
    scope: 'One actual READY fixture and manual certification/authentication attempt only. No count posting, automatic certification retry or Cash journey. Explicitly bind export DOM node and verify trace/focus baseline before submitting. Capture normalized DOM state and native focus timing only, never password values/cookies/tokens/HTML.' };
  const sources = () => ({ ...j.sources(), [path.relative(root, __filename).replaceAll('\\', '/')]: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') });
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_LISTENER_PID); assert.ok(Number.isSafeInteger(expected) && expected > 0);
    const escaped = root.toLowerCase().replaceAll("'", "''");
    const command = `$ErrorActionPreference='Stop';$rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen);if($rows.Count -ne 1){throw 'Expected one owned listener'};$row=$rows[0];$p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$row.OwningProcess);$parent=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId);$c=(@($p.CommandLine,$parent.CommandLine) -join ' ');[pscustomobject]@{address=$row.LocalAddress;pid=$p.ProcessId;workspace=$c.ToLowerInvariant().Contains('${escaped}');nextDev=($c -match 'next.+dev.+-p.+3110')}|ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.address, '127.0.0.1'); assert.equal(value.pid, expected); assert.equal(value.workspace, true); assert.equal(value.nextDev, true); return value;
  }
  function installProbe() {
    let origin = null, sequence = 0, last = ''; const nodes = new WeakMap(), trace = [], started = Date.now();
    const kind = element => {
      if (!(element instanceof Element)) return 'none';
      if (element === document.body) return 'body';
      if (element.id === 'close-identity-password') return 'identity-password';
      if (element.tagName === 'BUTTON') { const label = (element.textContent || '').replace(/\s+/g, ' ').trim(); return label === 'Export certified JSON' ? 'certified-export' : label === 'Verify identity' ? 'verify-identity' : 'other-button'; }
      return element.tagName.toLowerCase();
    };
    const describe = element => {
      if (!(element instanceof Element)) return null; if (!nodes.has(element)) nodes.set(element, ++sequence);
      const style = getComputedStyle(element);
      return { node: nodes.get(element), kind: kind(element), tag: element.tagName, connected: element.isConnected, disabled: element.matches(':disabled'), ariaDisabled: element.getAttribute('aria-disabled') === 'true', visible: element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none', inert: !!element.closest('[inert]') };
    };
    const record = (reason, target = null, caller = null) => {
      const current = [...document.querySelectorAll('button')].find(element => kind(element) === 'certified-export');
      const state = { active: describe(document.activeElement), original: describe(origin), current: describe(current), target: describe(target),
        identityVisible: !!document.getElementById('close-identity-password'), identityVerified: !!document.body?.textContent?.includes('Identity verified. Retry your selected action.'), documentFocused: document.hasFocus(), visibility: document.visibilityState };
      const key = JSON.stringify(state); if (['poll', 'mutation'].includes(reason) && key === last) return state; last = key;
      trace.push({ ms: Date.now() - started, reason, caller, ...state }); if (trace.length > 500) trace.shift(); return state;
    };
    Object.defineProperty(window, '__ownedCloseFocusProbe', { configurable: true, value: { trace, bind: element => { origin = element; return record('origin-bound', element); }, snapshot: reason => record(reason) } });
    for (const event of ['focusin', 'focusout', 'click']) document.addEventListener(event, value => record(event, value.target instanceof Element ? value.target : null), true);
    const focus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (...args) {
      const stack = new Error().stack || '', caller = { closeCenter: stack.includes('CloseAssuranceCenter'), focusScope: stack.includes('FocusScope'), playwright: stack.includes('utilityScript') };
      record('native-focus-before', this, caller); const value = Reflect.apply(focus, this, args); record('native-focus-after', this, caller); return value;
    };
    new MutationObserver(() => record('mutation')).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'inert'] });
    setInterval(() => record('poll'), 100); record('installed'); return { installed: true, traceLength: trace.length };
  }
  async function main() {
    report.listenerBefore = listener(); await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await j.outside(); report.financialBeforeSetup = await r.financial();
    const fixture = await b.browserFixture('focus-probe'); secrets.push(fixture.password); await r.prepareCashActor(fixture.x); report.fixture = { organizationId: fixture.x.organizationId, closeRunId: fixture.x.closeRunId, actorId: fixture.actor.id };
    report.financialAfterSetup = await r.financial(); const browser = await chromium.launch({ headless: true }); let context, page; const assets = [], downloads = [], requests = [];
    try {
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-GB', reducedMotion: 'reduce', acceptDownloads: true });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const signed = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: fixture.actor.email, password: fixture.password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(signed.status(), 200);
      page = await context.newPage(); page.setDefaultNavigationTimeout(180000); page.on('pageerror', error => report.pageErrors.push(f.safe(error, secrets))); page.on('download', value => downloads.push(value));
      page.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/api/me/permissions') report.permissionTimings.push({ phase: 'request', at: new Date().toISOString() }); if (request.method() === 'POST' && request.headers()['next-action'] && (request.postData() || '').includes('CERTIFIED')) requests.push({ at: new Date().toISOString() }); });
      page.on('response', response => {
        const url = new URL(response.url()); if (url.pathname === '/api/me/permissions') report.permissionTimings.push({ phase: 'response', status: response.status(), at: new Date().toISOString() });
        if (url.origin === base && url.pathname.includes('/accounting/close/page.js')) assets.push((async () => { const body = await response.body(), text = body.toString('utf8'); report.servedAssets.push({ path: url.pathname, status: response.status(), bytes: body.length, sha256: crypto.createHash('sha256').update(body).digest('hex'), pendingFocusMarker: text.includes('returnActionFocus'), commitRetryComment: text.includes('Authentication can finish before') }); })().catch(error => { report.assetError = f.safe(error, secrets); }));
      });
      await page.goto(base + '/en/dashboard/accounting/close', { waitUntil: 'domcontentloaded' }); await expect(page.getByRole('region', { name: 'Current close evidence', exact: true }).getByText('Operational evidence', { exact: true })).toBeVisible();
      const button = page.getByRole('button', { name: 'Export certified JSON', exact: true }); await expect(button).toBeEnabled();
      report.install = await page.evaluate(installProbe); assert.equal(report.install.installed, true);
      report.bound = await button.evaluate(element => window.__ownedCloseFocusProbe.bind(element)); assert.equal(report.bound.original.node, report.bound.current.node); assert.equal(report.bound.original.disabled, false);
      await button.scrollIntoViewIfNeeded(); await button.evaluate(element => element.focus()); await expect(button).toBeFocused();
      report.baseline = await page.evaluate(() => ({ state: window.__ownedCloseFocusProbe.snapshot('baseline-before-action'), events: window.__ownedCloseFocusProbe.trace.map(row => row.reason) }));
      assert.equal(report.baseline.state.active.node, report.baseline.state.original.node); assert.ok(report.baseline.events.includes('native-focus-before')); assert.ok(report.baseline.events.includes('focusin'));
      await page.keyboard.press('Enter'); const identity = page.getByRole('form', { name: 'Confirm your identity', exact: true }); await expect(identity).toBeVisible(); assert.equal(downloads.length, 0);
      await identity.getByLabel('Current password', { exact: true }).fill(fixture.password); const verify = identity.getByRole('button', { name: 'Verify identity', exact: true }); await verify.focus(); await page.keyboard.press('Enter');
      await expect(page.getByText('Identity verified. Retry your selected action.', { exact: true })).toBeVisible(); await expect(identity).not.toBeVisible();
      report.afterIdentity = await page.evaluate(() => window.__ownedCloseFocusProbe.snapshot('after-identity-notice'));
      await expect(button).toBeEnabled(); report.afterEnabled = await page.evaluate(() => window.__ownedCloseFocusProbe.snapshot('after-export-enabled'));
      try { await expect(button).toBeFocused({ timeout: 10000 }); report.focusRecovered = true; } catch { report.focusRecovered = false; }
      report.finalState = await page.evaluate(() => window.__ownedCloseFocusProbe.snapshot('final-observation')); report.manualCertificationRequests = requests.length; report.noAutomaticRetry = requests.length === 1 && downloads.length === 0;
      const image = 'close-auth-focus-probe-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, image), animations: 'disabled' }); report.screenshot = image;
    } finally {
      if (page && !page.isClosed()) { try { report.trace = await page.evaluate(() => window.__ownedCloseFocusProbe?.trace || []); } catch (error) { report.traceError = f.safe(error, secrets); } }
      await Promise.allSettled(assets); if (context) await context.close(); await browser.close();
    }
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error, secrets); }
    finally {
      try { report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await j.outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await r.financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash; } catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.diagnosticComplete = !report.error && !report.finalizationError && report.trace?.length > 3 && report.servedAssets.length > 0 && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-auth-focus-probe-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, diagnosticComplete: report.diagnosticComplete, focusRecovered: report.focusRecovered, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects })); await db.$disconnect(); if (!report.diagnosticComplete) process.exitCode = 1;
    }
  }
  if (require.main === module) runMain();
}
