// Bounded diagnostic of actual served assets and focus transitions; no values or credentials.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run after the coordinator releases the owned browser lane.');
} else {
  const r = require('./close-current-recovery-runtime.cjs'), journeyApi = require('./close-current-recovery-browser.cjs'), fixtureApi = require('./close-denial-recovery-browser.cjs');
  const { f, db, helper, root } = r, { fs, path, crypto, assert } = f;
  const { execFileSync } = require('node:child_process'), { chromium } = require('@playwright/test');
  const run = crypto.randomUUID(), secrets = [], scriptReads = [];
  const report = { run, at: new Date().toISOString(), diagnosticOnly: true, servedCenterAssets: [], permissionRequests: [], focusTraces: [],
    scope: 'One owned EN1440 real-response journey with unchanged product/driver. Only normalized element type, node identity, disabled/connected/visibility, safe focus-event timing and served-public-JS hash/marker facts. No password, input value, cookies, tokens, full DOM or response bodies retained.' };
  const sources = () => ({ ...journeyApi.sources(), [path.relative(root, __filename).replaceAll('\\', '/')]: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') });
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_LISTENER_PID); assert.ok(Number.isSafeInteger(expected) && expected > 0);
    const escaped = root.toLowerCase().replaceAll("'", "''");
    const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one owned listener'}; $row=$rows[0]; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$row.OwningProcess); $parent=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId); $c=(@($p.CommandLine,$parent.CommandLine) -join ' '); [pscustomobject]@{address=$row.LocalAddress;pid=$p.ProcessId;workspace=$c.ToLowerInvariant().Contains('${escaped}');nextDev=($c -match 'next.+dev.+-p.+3110')} | ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.address, '127.0.0.1'); assert.equal(value.pid, expected); assert.equal(value.workspace, true); assert.equal(value.nextDev, true); return value;
  }
  function instrumentFocus() {
    const nodes = new WeakMap(); let count = 0, original = null, last = '', startedAt = Date.now();
    const trace = []; Object.defineProperty(window, '__ownedCloseFocusTrace', { value: trace, configurable: true });
    const normalize = value => (value || '').replace(/\s+/g, ' ').trim();
    function kind(element) {
      if (!(element instanceof Element)) return 'none';
      if (element === document.body) return 'body';
      if (element.id === 'close-identity-password') return 'identity-password';
      if (element instanceof HTMLButtonElement) {
        const text = normalize(element.textContent);
        if (['Export certified JSON', 'Exporter JSON certifie'].includes(text)) return 'certified-export';
        if (['Verify identity', 'Vérifier l’identité'].includes(text)) return 'verify-identity';
        return 'other-button';
      }
      return element.tagName.toLowerCase();
    }
    function describe(element) {
      if (!(element instanceof Element)) return null;
      if (!nodes.has(element)) nodes.set(element, ++count);
      const style = getComputedStyle(element);
      return { node: nodes.get(element), kind: kind(element), tag: element.tagName, connected: element.isConnected,
        disabled: element.matches(':disabled'), ariaDisabled: element.getAttribute('aria-disabled') === 'true',
        visible: element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none', inert: !!element.closest('[inert]') };
    }
    function record(reason, target) {
      const current = [...document.querySelectorAll('button')].find(element => kind(element) === 'certified-export');
      const text = document.body?.textContent || '';
      const state = { active: describe(document.activeElement), original: describe(original), current: describe(current), target: describe(target),
        identityVisible: !!document.getElementById('close-identity-password'), identityVerified: text.includes('Identity verified. Retry your selected action.') || text.includes('Identité vérifiée. Réessayez l’action choisie.'),
        documentFocused: document.hasFocus(), visibility: document.visibilityState };
      const key = JSON.stringify(state); if ((reason === 'poll' || reason === 'mutation') && key === last) return;
      last = key; trace.push({ ms: Date.now() - startedAt, reason, ...state }); if (trace.length > 800) trace.shift();
    }
    document.addEventListener('click', event => { const button = event.target instanceof Element ? event.target.closest('button') : null; if (kind(button) === 'certified-export') original = button; if (original) record('click', button); }, true);
    for (const event of ['focusin', 'focusout']) document.addEventListener(event, value => { if (original) record(event, value.target); }, true);
    window.addEventListener('focus', () => { if (original) record('window-focus'); }); window.addEventListener('blur', () => { if (original) record('window-blur'); });
    const nativeFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (...args) {
      if (original) record('native-focus-before', this);
      const value = Reflect.apply(nativeFocus, this, args);
      if (original) record('native-focus-after', this); return value;
    };
    const watch = () => { new MutationObserver(() => { if (original) record('mutation'); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'inert'] }); record('installed'); };
    if (document.documentElement) watch(); else document.addEventListener('DOMContentLoaded', watch, { once: true });
    setInterval(() => { if (original) record('poll'); }, 100);
  }
  async function main() {
    report.listenerBefore = listener(); await helper.withClient(f.target, helper.assertOwned); report.sourcesBefore = sources(); report.outsideBefore = await journeyApi.outside(); report.financialBeforeSetup = await r.financial();
    const fixture = await fixtureApi.browserFixture('focus-diagnostic'); secrets.push(fixture.password); await r.prepareCashActor(fixture.x);
    report.fixture = { organizationId: fixture.x.organizationId, closeRunId: fixture.x.closeRunId, certifierId: fixture.actor.id };
    report.financialAfterSetup = await r.financial(); const browser = await chromium.launch({ headless: true });
    const decorated = { newContext: async options => {
      const context = await browser.newContext(options); await context.addInitScript(instrumentFocus);
      context.on('page', page => {
        page.on('request', request => { if (new URL(request.url()).pathname === '/api/me/permissions') report.permissionRequests.push({ stage: 'request', at: new Date().toISOString() }); });
        page.on('response', response => {
          const url = new URL(response.url());
          if (url.pathname === '/api/me/permissions') report.permissionRequests.push({ stage: 'response', status: response.status(), at: new Date().toISOString() });
          if (url.origin !== 'http://127.0.0.1:3110' || !url.pathname.startsWith('/_next/') || !url.pathname.endsWith('.js')) return;
          scriptReads.push((async () => { try { const body = await response.body(); const text = body.toString('utf8'); if (!text.includes('CloseAssuranceCenter')) return;
            report.servedCenterAssets.push({ path: url.pathname, status: response.status(), bytes: body.length, sha256: crypto.createHash('sha256').update(body).digest('hex'),
              hasPendingFocusMarker: text.includes('returnActionFocus'), hasCommitRetryComment: text.includes('Authentication can finish before'), hasOldNoticeFocusPattern: text.includes('authNotice === t.identityVerified'),
              observedAt: new Date().toISOString() });
          } catch (error) { report.assetReadError = f.safe(error, secrets); } })());
        });
      });
      return new Proxy(context, { get(target, property) {
        if (property === 'close') return async () => { for (const page of target.pages()) {
          try { report.focusTraces.push({ path: new URL(page.url()).pathname, trace: await page.evaluate(() => window.__ownedCloseFocusTrace || []) }); }
          catch (error) { report.traceError = f.safe(error, secrets); }
        } await Promise.allSettled(scriptReads); await target.close(); };
        const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
      } });
    } };
    try { report.journey = await journeyApi.journey(decorated, fixture, 'en', 1440); }
    finally { await browser.close(); }
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error, secrets); }
    finally {
      try { report.listenerAfter = listener(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await journeyApi.outside(); report.outsideUnchanged = report.outsideBefore?.hash === report.outsideAfter.hash; report.financialAfter = await r.financial(); report.noOperationFinancialEffects = report.financialAfterSetup?.hash === report.financialAfter.hash; }
      catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.diagnosticComplete = !report.error && !report.finalizationError && report.servedCenterAssets.length > 0 && report.focusTraces.some(row => row.trace.length > 1) && report.sourceStable && report.outsideUnchanged && report.noOperationFinancialEffects;
      const file = path.join(__dirname, 'close-auth-focus-diagnostic-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, diagnosticComplete: report.diagnosticComplete, journeyPassed: report.journey?.passed, error: report.error, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged, noOperationFinancialEffects: report.noOperationFinancialEffects })); await db.$disconnect(); if (!report.diagnosticComplete) process.exitCode = 1;
    }
  }
  if (require.main === module) runMain();
}
