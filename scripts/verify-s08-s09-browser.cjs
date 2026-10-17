// Real operator components with synthetic browser-only adapters. No application
// environment, middleware, auth, database, deployment or external requests.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const engines = require('playwright');
const browserNames = (process.env.STOQUIFY_TEST_BROWSERS || 'chromium').split(',');
if (browserNames.some(name => !['chromium', 'firefox', 'webkit'].includes(name))) throw new Error('Unsupported test browser');
const root = path.resolve(__dirname, '..');
const evidence = path.resolve(process.argv[2] || '');
const baseline = process.argv[3] === 'baseline';
if (!process.argv[2] || !fs.statSync(evidence).isDirectory()) throw new Error('Existing evidence directory required');
const reusedFixture = process.env.STOQUIFY_TEST_FIXTURE;
const fixture = reusedFixture ? path.resolve(reusedFixture) : path.join(root, '.codex-tmp', `s08-s09-browser-${Date.now()}`);
if (reusedFixture && (path.dirname(fixture) !== path.join(root, '.codex-tmp') || !/^s08-s09-browser-\d+$/.test(path.basename(fixture)) || !fs.existsSync(path.join(fixture,'.next/BUILD_ID')))) throw new Error('Owned compiled fixture required');
if (!reusedFixture) {
fs.mkdirSync(fixture, { recursive: true });
const write = (name, source) => { const file = path.join(fixture, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, source, { flag: 'wx' }); };
write('package.json', JSON.stringify({ private: true, name: 'operator-journey-fixture', version: '0.0.0' }));
write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2017', lib: ['dom', 'esnext'], allowJs: true, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', isolatedModules: true, jsx: 'preserve', baseUrl: root, paths: { '@/*': ['./*'] } }, include: ['**/*.ts', '**/*.tsx', '.next/types/**/*.ts'], exclude: ['node_modules'] }));
const aliases = Object.fromEntries([
  'actions/purchasing/payment-release.actions', 'actions/security/step-up-auth.actions',
  'actions/pos/checkout.actions', 'hooks/usePermissions', 'hooks/posHooks/usePosOperations',
  'hooks/posHooks/usePOSCheckoutLifecycle', 'components/notifications/NotificationProvider',
  'components/pos/offline/OfflineSyncStatusStrip', 'components/pos/ReceiptTokenHistoryPanel', 'components/pos/ReceiptTokenControlStrip',
].map(name => ['@/' + name + '$', path.join(root, 'tests/s08-s09/browser/adapters.tsx')]));
// Next resolves server-action imports before webpack aliases; route the fixture
// paths at the TypeScript resolver boundary too, so no real action is bundled.
const tsconfig = JSON.parse(fs.readFileSync(path.join(fixture, 'tsconfig.json'), 'utf8'));
for (const key of Object.keys(aliases)) tsconfig.compilerOptions.paths[key.slice(0,-1)] = [aliases[key]];
fs.writeFileSync(path.join(fixture, 'tsconfig.json'), JSON.stringify(tsconfig));
write('next.config.mjs', `export default { experimental: { externalDir: true, cpus: 1 }, outputFileTracingRoot: ${JSON.stringify(root)}, eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true }, webpack(config) { Object.assign(config.resolve.alias, ${JSON.stringify(aliases)}); return config; } };`);
write('postcss.config.mjs', `export default { plugins: { tailwindcss: { config: ${JSON.stringify(path.join(fixture, 'tailwind.config.ts'))} } } };`);
write('tailwind.config.ts', `import config from ${JSON.stringify(path.join(root, 'tailwind.config').replaceAll('\\', '/'))}; export default { ...config, content: [${JSON.stringify(path.join(root, 'components/**/*.{ts,tsx}').replaceAll('\\', '/'))}, ${JSON.stringify(path.join(root, 'tests/s08-s09/browser/*.tsx').replaceAll('\\', '/'))}] };`);
write('app/layout.tsx', `import '@/app/globals.css'; export default function Layout({children}) { return <html><body>{children}</body></html> }`);
write('app/[locale]/[domain]/page.tsx', `import Journey from '@/tests/s08-s09/browser/journey'; export default async function Page({params}) {const {locale,domain}=await params; return <Journey locale={locale} domain={domain}/>}`);
}
const environment = {};
for (const name of ['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','COMSPEC','TEMP','TMP','LOCALAPPDATA','APPDATA','USERPROFILE','ProgramFiles']) if (process.env[name]) environment[name] = process.env[name];
Object.assign(environment, { NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' });
function launch(args, logName) {
  const log = fs.openSync(path.join(evidence, logName), 'w');
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), ...args], { cwd: fixture, env: environment, stdio: ['ignore', log, log], windowsHide: true });
  fs.closeSync(log); return child;
}
function completion(child) { return new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Next exited ${code}; inspect fixture log`))); }); }
async function keyboardClick(page, locator) {
  await locator.waitFor({ state: 'visible' });
  await page.waitForFunction(node => !node.disabled, await locator.elementHandle());
  const key = 'Tab';
  for (let i = 0; i < 120; i++) {
    if (await locator.evaluate(node => node === document.activeElement)) { await page.keyboard.press('Enter'); return; }
    await page.keyboard.press(key);
  }
  throw new Error('Critical action not keyboard reachable via ' + key + ': ' + await locator.textContent());
}
async function main() {
  if (!reusedFixture) await completion(launch(['build'], 'fixture-build.log'));
  const socket = http.createServer(); await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  const origin = `http://127.0.0.1:${port}`, server = launch(['start','--hostname','127.0.0.1','--port',String(port)], 'fixture-server.log');
  let browser; const results = [];
  try {
    for (let i=0; i<120; i++) { try { if ((await fetch(origin+'/en/ap',{signal:AbortSignal.timeout(2000)})).ok) break; } catch {} if (server.exitCode !== null) throw new Error('Fixture exited'); await new Promise(resolve => setTimeout(resolve,250)); }
    for (const browserName of browserNames) {
    browser = await engines[browserName].launch({ headless: true });
    for (const locale of ['en','fr']) for (const width of [1280,390]) {
      const ap = require(`../messages/payment-execution/${locale}.json`);
      for (const scenario of ['success','lost','stale','denied','queue-failed','storage']) {
        const id = `${browserName}-ap-${locale}-${width}-${scenario}`, context = await browser.newContext({ viewport: { width, height: 900 } });
        await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
        await context.tracing.start({ screenshots: true, snapshots: true });
        const page = await context.newPage(), errors=[]; page.on('pageerror', e=>errors.push(e.message));
        try {
          const url = `${origin}/${locale}/ap?scenario=${scenario}`;
          await page.goto(url);
          if (scenario === 'queue-failed') {
            await page.getByRole('alert').filter({hasText:ap.loadFailed}).waitFor();
            assert.equal(await page.getByText(ap.empty,{exact:true}).count(),0);
          } else {
            await keyboardClick(page, page.getByRole('button',{name:ap.choose,exact:true}));
            for (const [field,value] of Object.entries({ executionReference:'BANK/TXN-1',executedAt:'2026-09-08T12:01:00Z',evidenceUri:'https://example.invalid/executed',evidenceSha256:'a'.repeat(64) })) await page.locator('#execution-'+field).fill(value);
            await keyboardClick(page,page.getByRole('button',{name:ap.review,exact:true}));
            if (scenario === 'denied') {
              await page.getByRole('alert').filter({hasText:ap.denied}).waitFor();
              assert.equal(await page.getByText('PAY-1',{exact:true}).count(),0);
            } else {
              let dialog=page.getByRole('dialog'); await dialog.waitFor();
              await dialog.getByLabel(ap.password,{exact:true}).fill('synthetic-password');
              if(scenario==='storage') await page.evaluate(()=>{const original=Storage.prototype.removeItem; Storage.prototype.removeItem=function(key){if(key.startsWith('stoquify:payment-execution:'))throw new Error('Synthetic cleanup failure');return original.call(this,key)}});
              await keyboardClick(page,dialog.getByRole('button',{name:ap.confirm,exact:true}));
              if(scenario==='lost') {
                await dialog.getByRole('alert').filter({hasText:ap.unknown}).waitFor();
                await page.reload(); dialog=page.getByRole('dialog'); await dialog.waitFor();
                await dialog.getByLabel(ap.password,{exact:true}).fill('synthetic-password');
                await keyboardClick(page,dialog.getByRole('button',{name:ap.retry,exact:true}));
              }
              if(scenario==='stale') {
                await dialog.waitFor({state:'hidden'});
                await page.getByRole('alert').filter({hasText:ap.stale}).waitFor();
                assert.equal(await page.locator('#execution-executionReference').inputValue(),'BANK/TXN-1');
              } else {
                await dialog.getByRole('status').filter({hasText:ap.states.RELEASED}).waitFor();
                assert.ok((await dialog.getByRole('status').textContent()).includes(ap.states.FAILED));
                assert.ok((await dialog.getByRole('status').textContent()).includes(ap.states.SUSPENSE));
                const alerts=await dialog.getByRole('alert').allTextContents();
                if(!baseline) assert.ok(!alerts.includes(ap.unknown),'Known success must not be labelled unknown');
                await keyboardClick(page,dialog.getByRole('button',{name:ap.close,exact:true}).first());
                await dialog.waitFor({state:'hidden'});
                await page.waitForTimeout(100);
                const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent?.slice(0,100)}));
                if(!baseline) assert.equal(focus.tag,'H1','Completed dialog restores stable heading focus');
                results.push({id,focus,alerts});
              }
            }
          }
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');
          const calls=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('fixture:calls')||'[]'));
          if(scenario==='lost') assert.deepEqual(calls.filter(c=>c.kind==='ap-confirm')[0].input,calls.filter(c=>c.kind==='ap-confirm')[1].input);
          assert.deepEqual(errors,[]);
          await page.screenshot({path:path.join(evidence,id+'.png'),fullPage:true});
          results.push({id,url,role:'independent AP recorder (synthetic)',locale,width,scenario,calls,passed:true});
        } finally { await context.tracing.stop({path:path.join(evidence,id+'.zip')}); await context.close(); }
      }
      const pos = require(`../messages/${locale}.json`).pos;
      for (const scenario of ['pos-lost','pos-stale','pos-denied']) {
        const id=`${browserName}-${scenario}-${locale}-${width}`, context=await browser.newContext({viewport:{width,height:900}});
        await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
        await context.tracing.start({screenshots:true,snapshots:true});
        const page=await context.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
        try {
          const url=`${origin}/${locale}/pos?scenario=${scenario}`;
          if(scenario==='pos-stale') await context.addInitScript(()=>{
            sessionStorage.setItem('stoquify:pos:pending-sale:v1:org:actor',JSON.stringify({version:1,organizationId:'org',actorId:'actor',request:{clientCommitId:'pos:retained-1',salesOrderId:'cart',locationId:'location',terminalId:'terminal',sessionId:'shift',expectedCartRevision:'a'.repeat(64),tenders:[{method:'CASH',amount:10}]}}));
          });
          await page.goto(url);
          const charge=page.getByTestId('pos-charge-summary').getByRole('button');
          const recovery=page.getByTestId('pos-commit-recovery');
          if(scenario==='pos-stale') {
            await recovery.getByText(pos.recovery.cartChanged,{exact:true}).waitFor();
            assert.equal(await charge.isDisabled(),true);
            assert.equal(await recovery.getByRole('button',{name:pos.recovery.retryOriginal,exact:true}).count(),0);
            await keyboardClick(page,recovery.getByRole('button',{name:pos.recovery.reviewChanged,exact:true}));
            await recovery.getByText(pos.recovery.reviewReady,{exact:true}).waitFor();
            await keyboardClick(page,recovery.getByRole('button',{name:pos.recovery.continueCheckout,exact:true}));
            assert.equal(await page.getByTestId('pos-charge-footer').evaluate(n=>n===document.activeElement),true);
          } else {
            await page.getByRole('button',{name:pos.tender.exact,exact:true}).waitFor();
            await keyboardClick(page,page.getByRole('button',{name:pos.tender.exact,exact:true}));
            await keyboardClick(page,charge);
            await recovery.waitFor();
            await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('fixture:calls')||'[]').some(c=>c.kind==='pos-commit'));
            assert.equal(await charge.isDisabled(),true);
            if(scenario==='pos-lost') {
              await page.waitForFunction(()=>sessionStorage.getItem('fixture:pos-recorded')==='yes');
              await page.reload();
              await recovery.getByRole('button',{name:pos.recovery.acknowledge,exact:true}).waitFor();
              assert.ok((await recovery.textContent()).includes('SALE-1'));
              await keyboardClick(page,recovery.getByRole('button',{name:pos.recovery.acknowledge,exact:true}));
              await recovery.waitFor({state:'hidden'});
              if(!baseline) assert.equal(await page.getByTestId('pos-charge-footer').evaluate(n=>n===document.activeElement),true,'Recovery returns focus to checkout');
            }
          }
          const calls=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('fixture:calls')||'[]'));
          assert.equal(calls.filter(c=>c.kind==='pos-commit').length,scenario==='pos-stale'?0:1);
          if(scenario==='pos-lost') {
            const committed=calls.find(c=>c.kind==='pos-commit').input;
            assert.ok(calls.some(c=>c.kind==='pos-status' && c.input.clientCommitId===committed.clientCommitId));
          }
          assert.equal(calls.some(c=>c.kind==='notification'&&c.input.kind==='success'),false,'Unknown/denied commit must not announce success');
          assert.deepEqual(errors,[]);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');
          await page.screenshot({path:path.join(evidence,id+'.png'),fullPage:true});
          results.push({id,url,role:'cashier (synthetic)',locale,width,scenario,calls,passed:true});
        } finally {await context.tracing.stop({path:path.join(evidence,id+'.zip')});await context.close();}
      }
      console.log(`Completed ${locale} at ${width}px`);
    }
    await browser.close(); browser = null;
    }
  } finally {
    if(browser) await browser.close();
    const exited=new Promise(resolve=>server.once('exit',resolve)); server.kill(); await exited;
    fs.writeFileSync(path.join(evidence,'browser.json'),JSON.stringify({fixture,baseline,scope:'Actual operator components; synthetic browser adapters; not full application authorization or financial persistence proof',results},null,2));
  }
  console.log(JSON.stringify({scenarios:results.filter(r=>r.passed).length,baseline,evidence}));
}
main().catch(error=>{console.error(error);process.exitCode=1});
