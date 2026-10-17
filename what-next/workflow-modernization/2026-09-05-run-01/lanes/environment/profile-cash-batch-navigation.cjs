const f = require('./statement-recipient-fixtures.cjs'), {db, fs, path, crypto, assert, helper, root} = f;
const {hashPassword} = require(path.join(root, 'lib/password.ts'));
const {chromium, expect: baseExpect} = require('@playwright/test'), expect = baseExpect.configure({timeout: 60000});
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', secrets = [];
const binding = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../evidence/cash-contrast-review-2026-09-30.json')));
const files = [...Object.keys(binding.sourceHashes), 'next.config.mjs', 'components/dashboard/Sidebar.tsx', 'components/dashboard/Navbar.tsx', 'services/modules/module-navigation.service.ts', 'services/modules/module-access-batch.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const receipt = {at: new Date().toISOString(), environment: 'Owned development app; profiles have measurement overhead; HTTP cache disabled by Playwright interception', sourceBefore: hashes(), samples: []}; let browser;
function serverTimings(html) {
  let flight = '';
  for (const match of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)) {
    try { const chunk = JSON.parse(match[1]); if (chunk[0] === 1 && typeof chunk[1] === 'string') flight += chunk[1]; } catch {}
  }
  const rows = new Map(), debug = [];
  for (const line of flight.split('\n')) {
    const match = line.match(/^([a-f\d]+):(D?)(.*)$/); if (!match) continue;
    try { const value = JSON.parse(match[3]); if (match[2]) debug.push({id:match[1],value}); else rows.set(match[1],value); } catch {}
  }
  const resolve = value => typeof value === 'string' && /^\$[a-f\d]+$/.test(value) ? rows.get(value.slice(1)) : value;
  const summaries = new Map();
  for (const {id,value} of debug) {
    const item = resolve(value); if (!item || typeof item !== 'object') continue;
    const summary = summaries.get(id) ?? {id,names:[],times:[],awaited:[]}; summaries.set(id,summary);
    if (typeof item.name === 'string') summary.names.push(item.name);
    if (typeof item.time === 'number') summary.times.push(item.time);
    if (item.awaited) {const wait=resolve(item.awaited); if (wait && typeof wait === 'object') summary.awaited.push({name:wait.name,start:wait.start,end:wait.end});}
  }
  return {flightBytes:Buffer.byteLength(flight),debugRows:debug.length,components:[...summaries.values()].filter(row=>row.names.length || row.awaited.length)};
}
function cpuSummary(profile) {
  const nodes = new Map(profile.nodes.map(node => [node.id, node])), self = new Map();
  for (let i = 0; i < (profile.samples ?? []).length; i++) self.set(profile.samples[i], (self.get(profile.samples[i]) ?? 0) + (profile.timeDeltas?.[i] ?? 0));
  return [...self].map(([id, microseconds]) => {const frame = nodes.get(id)?.callFrame; return {function: frame?.functionName, source: (frame?.url ?? '').split('?')[0].replace(base, ''), line: frame?.lineNumber, milliseconds: microseconds / 1000};}).sort((a,b) => b.milliseconds - a.milliseconds).slice(0, 30);
}
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const org = await db.organization.findFirstOrThrow({where: {name: {startsWith: helper.prefix + 'Cash visibility presentation'}}, orderBy: {createdAt: 'desc'}});
  const role = await db.role.findFirstOrThrow({where: {organizationId: org.id, code: 'administrator'}}); assert.equal(role.nameEn, 'Owned cash accessibility reader');
  const password = 'Owned-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const actor = await db.user.create({data: {organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true}});
  await db.account.create({data: {userId: actor.id, accountId: actor.id, providerId: 'credential', password: hashed}});
  await db.role.update({where: {id: role.id}, data: {users: {connect: {id: actor.id}}}});
  browser = await chromium.launch({headless: true});
  for (const locale of ['en','fr']) {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', {headers: {Origin: base}, data: {email: actor.email, password}, timeout: 60000})).status(), 200);
    const page = await context.newPage(); const cdp = await context.newCDPSession(page); await cdp.send('Profiler.enable');
    await page.addInitScript(() => {
      window.__ownedProfile = {longTasks: [], contentAt: null, modesAt: null};
      new PerformanceObserver(list => {for (const entry of list.getEntries()) window.__ownedProfile.longTasks.push({start: entry.startTime, duration: entry.duration});}).observe({type:'longtask', buffered:true});
      const observer = new MutationObserver(() => {
        const root = document.querySelector('.dashboard-landing-content');
        if (root?.querySelector('h1') && root.querySelector('button[aria-pressed]')) {
          window.__ownedProfile.contentAt ??= performance.now();
          if (!root.querySelector('button[aria-pressed]').disabled) {window.__ownedProfile.modesAt ??= performance.now(); observer.disconnect();}
        }
      }); observer.observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['disabled']});
    });
    for (let sample = 0; sample < (process.argv.includes('--server-only') ? 2 : 3); sample++) {
      const spanId = process.argv.includes('--spans') ? 'cash-profile-' + stamp + '-' + locale + '-' + sample : null;
      if (spanId) await context.setExtraHTTPHeaders({'x-owned-cash-profile':spanId});
      const errors = []; const onError = e => errors.push(f.safe(e, secrets)); page.on('pageerror', onError);
      const profiled = !sample && !process.argv.includes('--server-only');
      if (profiled) await cdp.send('Profiler.start');
      const response = await page.goto(base + '/' + locale + '/dashboard/finance/cash-command', {waitUntil:'domcontentloaded', timeout:180000});
      const root = page.locator('.dashboard-landing-content');
      await expect(root.getByRole('heading',{name:locale === 'fr' ? 'Synthèse de trésorerie' : 'Cash command brief',exact:true})).toBeVisible();
      await expect(root.getByRole('button',{name:locale === 'fr' ? 'Synthèse' : 'Brief',exact:true})).toBeEnabled();
      const cpu = profiled ? cpuSummary((await cdp.send('Profiler.stop')).profile) : null;
      const metrics = await page.evaluate(() => {
        const n = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource').map(r => ({path:new URL(r.name).pathname, type:r.initiatorType, start:r.startTime, duration:r.duration, responseStart:r.responseStart, responseEnd:r.responseEnd, bytes:r.transferSize, decodedBytes:r.decodedBodySize}));
        return {...window.__ownedProfile, navigation:{requestStart:n.requestStart,responseStart:n.responseStart,responseEnd:n.responseEnd,domInteractive:n.domInteractive,domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd,bytes:n.transferSize,decodedBytes:n.decodedBodySize},paint:performance.getEntriesByType('paint').map(p=>({name:p.name,at:p.startTime})),resources};
      });
      const server = serverTimings(await response.text());
      const spans = spanId ? fs.readFileSync(path.join(__dirname,'cash-batch-spans-2026-09-30.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line)).filter(row=>row.id===spanId) : [];
      if(spanId) assert.deepEqual(spans.map(row=>row.stage).sort(),['cash.service','shell.modules','shell.rbac','shell.session']);
      const screenshot = 'cash-batch-' + stamp + '-' + locale + '-' + sample + '.png'; await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true});
      receipt.samples.push({locale,sample,screenshot,cpuProfiled:profiled,cpu,metrics,server,spans,cacheControl:response.headers()['cache-control'],errors}); assert.deepEqual(errors, []); page.off('pageerror',onError);
      console.log(JSON.stringify({locale,sample,contentAt:metrics.contentAt,modesAt:metrics.modesAt,resources:metrics.resources.length,longTasks:metrics.longTasks.length}));
    }
    await context.close();
  }
  const tracePath = path.join(root,'.next-workflow-supplier/trace');
  receipt.nextTrace = fs.readFileSync(tracePath,'utf8').split(/\r?\n/).filter(Boolean).flatMap(line => JSON.parse(line)).filter(row => row.name === 'handle-request' && String(row.tags?.url ?? '').includes('/finance/cash-command')).slice(-12).map(row=>({name:row.name,milliseconds:row.duration/1000,timestamp:row.timestamp,url:row.tags.url.split('?')[0]}));
  receipt.passed = true;
}
main().catch(error => {receipt.passed=false;receipt.error=f.safe(error,secrets);process.exitCode=1;}).finally(async()=>{await browser?.close();receipt.sourceAfter=hashes();receipt.sourceStable=JSON.stringify(receipt.sourceBefore)===JSON.stringify(receipt.sourceAfter);receipt.passed=!!receipt.passed&&receipt.sourceStable;const file='cash-batch-navigation-profile-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:receipt.passed,error:receipt.error}));await db.$disconnect();});
