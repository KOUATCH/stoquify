// Isolated production Next fixture; imports only middleware, theme and upload
// bootstrap. No .env, application layouts, auth, database or remote services.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const dependencyRoot = process.env.STOQUIFY_VERIFICATION_DEPS ? path.resolve(process.env.STOQUIFY_VERIFICATION_DEPS) : root;
const dependencyRequire = createRequire(path.join(dependencyRoot, 'package.json'));
const engines = dependencyRequire('playwright');
const browserNames = (process.env.STOQUIFY_TEST_BROWSERS || 'chromium').split(',');
if (browserNames.some(name => !['chromium', 'firefox', 'webkit'].includes(name))) throw new Error('Unsupported test browser');
const evidence = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.statSync(evidence).isDirectory()) throw new Error('Pass an existing evidence directory');
const reusedFixture = process.env.STOQUIFY_TEST_FIXTURE;
const fixture = reusedFixture ? path.resolve(reusedFixture) : path.join(root, '.codex-tmp', `s06-s07-browser-${Date.now()}`);
if (reusedFixture && (path.dirname(fixture) !== path.join(root, '.codex-tmp') || !/^s06-s07-browser-\d+$/.test(path.basename(fixture)) || !fs.existsSync(path.join(fixture,'.next/BUILD_ID')))) throw new Error('Owned compiled fixture required');
if (!reusedFixture) {
fs.mkdirSync(fixture, { recursive: true });
if (dependencyRoot !== root) fs.symlinkSync(path.join(dependencyRoot, 'node_modules'), path.join(fixture, 'node_modules'), 'junction');
const write = (name, source) => { const file = path.join(fixture, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, source, { flag: 'wx' }); };
write('package.json', JSON.stringify({ private: true, name: 'isolated-csp-proof', version: '0.0.0' }));
write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2017', lib: ['dom', 'esnext'], allowJs: true, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', isolatedModules: true, jsx: 'preserve', baseUrl: root, paths: { '@/*': ['./*'] } }, include: ['**/*.ts', '**/*.tsx', '.next/types/**/*.ts'], exclude: ['node_modules'] }));
write('next.config.mjs', `export default { experimental: { externalDir: true, cpus: 1 }, outputFileTracingRoot: ${JSON.stringify(root)}, eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true }, webpack(config) { config.resolve.modules.unshift(${JSON.stringify(path.join(dependencyRoot, 'node_modules'))}); return config; } };`);
write('middleware.ts', `export { default } from '@/middleware'; export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };`);
write('app/layout.tsx', `import { headers } from 'next/headers'; import Client from './client'; export default async function Layout({children}) { const h = await headers(); return <html suppressHydrationWarning><body><Client nonce={h.get('x-stoquify-csp-nonce') ?? undefined}>{children}</Client></body></html> }`);
write('app/client.tsx', `"use client"; import { ThemeProvider } from 'next-themes'; import { UploadThingBootstrap } from '@/components/security/UploadThingBootstrap'; export default function Client({children,nonce}) { return <ThemeProvider nonce={nonce} attribute="class" defaultTheme="dark"><UploadThingBootstrap nonce={nonce} routerConfig={[{slug:'fixture',config:{image:{maxFileSize:'4MB',maxFileCount:1,minFileCount:1,contentDisposition:'inline'}},note:'</script><script>window.metadataAttack=true</script>'}]} />{children}</ThemeProvider> }`);
write('app/[locale]/login/page.tsx', `import Button from '../../button'; export const dynamic='force-dynamic'; export default async function Page({params}) {const {locale}=await params; return <main><h1>{locale==='fr'?'Connexion':'Sign in'}</h1><Button /></main>}`);
write('app/button.tsx', `"use client"; import {useState} from 'react'; export default function Button(){const [n,setN]=useState(0); return <button onClick={()=>setN(n+1)}>Hydrated {n}</button>}`);
}
const environment = {};
for (const name of ['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','COMSPEC','TEMP','TMP','LOCALAPPDATA','APPDATA','USERPROFILE','ProgramFiles']) if (process.env[name]) environment[name] = process.env[name];
Object.assign(environment, { NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' });
function launch(args, env, logName) {
  const log = fs.openSync(path.join(evidence, logName), 'w');
  const child = spawn(process.execPath, [dependencyRequire.resolve('next/dist/bin/next'), ...args], { cwd: fixture, env: { ...environment, ...env }, stdio: ['ignore', log, log], windowsHide: true });
  fs.closeSync(log);
  return child;
}
async function completion(child) {
  return new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Next exited ${code}`))); });
}
async function freePort() {
  const server = http.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function ready(url, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('Fixture server exited');
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Fixture readiness timeout');
}
async function main() {
  if (!reusedFixture) await completion(launch(['build'], {}, 'fixture-build.log'));
  const results = [];
  for (const browserName of browserNames) {
  const browser = await engines[browserName].launch({ headless: true });
  try {
    for (const mode of ['off', 'report-only', 'enforce']) {
      const port = await freePort(), origin = `http://127.0.0.1:${port}`;
      const server = launch(['start', '--hostname', '127.0.0.1', '--port', String(port)], { STOQUIFY_CSP_MODE: mode }, `fixture-${browserName}-${mode}.log`);
      try {
        await ready(`${origin}/en/login`, server);
        for (const locale of ['en', 'fr']) {
          const context = await browser.newContext();
          await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
          await context.addInitScript(() => { window.violations = []; document.addEventListener('securitypolicyviolation', e => window.violations.push({ directive: e.effectiveDirective, blocked: e.blockedURI, disposition: e.disposition })); });
          const page = await context.newPage();
          const began = performance.now();
          const response = await page.goto(`${origin}/${locale}/login`);
          await page.getByRole('button', { name: 'Hydrated 0' }).click();
          await page.getByRole('button', { name: 'Hydrated 1' }).waitFor();
          const elapsedMs = performance.now() - began;
          assert.equal(await page.title(), '');
          assert.equal(await page.locator('h1').textContent(), locale === 'fr' ? 'Connexion' : 'Sign in');
          assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
          assert.equal(await page.evaluate(() => globalThis.__UPLOADTHING?.[0]?.slug), 'fixture');
          assert.equal(await page.evaluate(() => Boolean(window.metadataAttack)), false);
          const headers = response.headers();
          fs.writeFileSync(path.join(evidence, `bootstrap-${browserName}-${mode}-${locale}.json`), JSON.stringify({ headers, scripts: await page.locator('script:not([src])').evaluateAll(nodes => nodes.map(n => ({ nonce: n.nonce, prefix: n.textContent.slice(0, 90) }))), violations: await page.evaluate(() => window.violations) }, null, 2));
          assert.deepEqual(await page.evaluate(() => window.violations), []);
          const policy = headers[mode === 'report-only' ? 'content-security-policy-report-only' : 'content-security-policy'];
          if (mode !== 'off') {
            assert.match(policy, /'nonce-[A-Za-z0-9+/]+={0,2}'/);
            assert.match(headers['cache-control'], /no-store/);
            const inlineNonces = await page.locator('script:not([src])').evaluateAll(nodes => nodes.map(n => n.nonce));
            assert.ok(inlineNonces.length > 2 && inlineNonces.every(Boolean));
            const second = await context.request.get(`${origin}/${locale}/login`);
            assert.notEqual(second.headers()[mode === 'report-only' ? 'content-security-policy-report-only' : 'content-security-policy'], policy);
          }
          await page.evaluate(() => { const script = document.createElement('script'); script.textContent = 'window.injected = true'; document.body.appendChild(script); });
          if (mode !== 'off') await page.waitForFunction(() => window.violations.length > 0);
          assert.equal(await page.evaluate(() => Boolean(window.injected)), mode !== 'enforce');
          const violations = await page.evaluate(() => window.violations);
          if (mode !== 'off') assert.ok(violations.some(v => v.directive === 'script-src-elem' && v.disposition === (mode === 'enforce' ? 'enforce' : 'report')));
          await page.screenshot({ path: path.join(evidence, `${browserName}-${mode}-${locale}.png`) });
          results.push({ browserName, browserVersion: browser.version(), mode, locale, elapsedMs, cacheControl: headers['cache-control'], violations, passed: true });
          await context.close();
        }
      } finally {
        const exited = new Promise(resolve => server.once('exit', resolve)); server.kill(); await exited;
      }
    }
  } finally { await browser.close(); }
  }
  const output = { fixture, dependencyRoot, next: dependencyRequire('next/package.json').version, results, scope: 'Real Next production rendering of middleware, next-themes and upload bootstrap in a synthetic EN/FR fixture; not complete application journeys.' };
  fs.writeFileSync(path.join(evidence, 'browser.json'), JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
