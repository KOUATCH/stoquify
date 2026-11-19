// P04 qualification harness. Synthetic data only; not a full application server.
// Execute only after reviewing this file. Does not load .env or application config.
// Writes a unique fixture/evidence directory beside this script; binds loopback port 0.
const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../../../../..');
const localRequire = createRequire(path.join(root, 'package.json'));
const ts = localRequire('typescript');
const { NextRequest } = localRequire('next/server');
const { setupFsCheck } = localRequire('next/dist/server/lib/router-utils/filesystem');
const { serveStatic } = localRequire('next/dist/server/serve-static');
const { defaultConfig } = localRequire('next/dist/server/config-shared');
const allow = new Set([
  'middleware.ts', 'i18n/routing.ts', 'types/bilingual.ts',
  'lib/security/dashboard-session-recovery.ts',
  'lib/security/traffic-limiter.ts', 'lib/security/csp-pilot.ts',
]);
const captured = [];
const modules = new Map();
function loadSource(relative) {
  if (!allow.has(relative)) throw new Error('Unreviewed import: ' + relative);
  if (modules.has(relative)) return modules.get(relative).exports;
  const source = syncFs.readFileSync(path.join(root, relative), 'utf8');
  captured.push({ path: relative, sha256: crypto.createHash('sha256').update(source).digest('hex') });
  const module = { exports: {} };
  modules.set(relative, module);
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  } }).outputText;
  const requireSource = name => {
    if (name.startsWith('@/')) return loadSource(name.slice(2) + '.ts');
    if (['next/server', 'next-intl/routing'].includes(name)) return localRequire(name);
    throw new Error('Unreviewed dependency: ' + name);
  };
  vm.runInNewContext('(function(require,module,exports){' + code + '\n})', {
    Headers, Request, Response, URL, Uint8Array, Date, Map, Set,
    crypto: crypto.webcrypto, btoa, console,
    process: { env: { NODE_ENV: 'production' } },
  }, { filename: relative })(requireSource, module, module.exports);
  return module.exports;
}

(async () => {
  assert(syncFs.existsSync(path.join(root, 'middleware.ts')), 'workspace root must resolve');
  const fixture = await fs.mkdtemp(path.join(__dirname, 'synthetic-static-run-'));
  const filePath = path.join(fixture, 'public/uploads/synthetic-tenant/sentinel.jpg');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const sentinel = Buffer.from('P04 SYNTHETIC PRIVATE UPLOAD SENTINEL');
  await fs.writeFile(filePath, sentinel);
  const dist = path.join(fixture, '.next');
  await fs.mkdir(path.join(dist, 'server'), { recursive: true });
  await fs.mkdir(path.join(dist, 'static'), { recursive: true });
  await fs.writeFile(path.join(dist, 'BUILD_ID'), 'P04-SYNTHETIC-MANIFEST');
  await fs.writeFile(path.join(dist, 'routes-manifest.json'), JSON.stringify({
    version: 3, dataRoutes: [], dynamicRoutes: [], staticRoutes: [],
    redirects: [], rewrites: { beforeFiles: [], afterFiles: [], fallback: [] }, headers: [],
  }));
  await fs.writeFile(path.join(dist, 'prerender-manifest.json'), JSON.stringify({
    version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: {},
  }));
  await fs.writeFile(path.join(dist, 'server/pages-manifest.json'), '{}');
  await fs.writeFile(path.join(dist, 'server/functions-config-manifest.json'), '{"functions":{}}');
  const check = await setupFsCheck({ dir: fixture, dev: false, config: {
    ...defaultConfig, distDir: '.next', output: 'standalone',
    experimental: { ...defaultConfig.experimental },
  } });
  const middleware = loadSource('middleware.ts').default;
  const trace = [];
  const server = http.createServer(async (req, res) => {
    try {
      // No credentials are sent; this is the actual current middleware function.
      const request = new NextRequest('http://127.0.0.1' + req.url, { headers: req.headers });
      const decision = middleware(request);
      const middlewarePass = decision.headers.get('x-middleware-next') === '1';
      const match = await check.getItem(new URL(request.url).pathname);
      trace.push({ path: req.url, middlewarePass, middlewareStatus: decision.status,
        kind: match?.type ?? null });
      if (!middlewarePass) { res.statusCode = decision.status; res.end('middleware-denied'); return; }
      if (!match || match.type !== 'publicFolder') { res.statusCode = 404; res.end('not-found'); return; }
      // The router-server uses this same installed Next static transport.
      await serveStatic(req, res, match.itemPath, { root: match.itemsRoot });
    } catch (error) { res.statusCode = 500; res.end(String(error.message)); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  let evidence;
  try {
    const port = server.address().port;
    const response = await fetch('http://127.0.0.1:' + port + '/uploads/synthetic-tenant/sentinel.jpg', { redirect: 'manual' });
    const bytes = Buffer.from(await response.arrayBuffer());
    evidence = { evidenceClass: 'component_http_current_middleware_installed_next_synthetic_manifests',
      fullApplicationBuild: false, databaseTouched: false, externalNetwork: false,
      credentialsSent: false, timestamp: new Date().toISOString(),
      nextVersion: localRequire('next/package.json').version,
      source: captured, status: response.status,
      sentinelReturned: bytes.equals(sentinel), trace,
      limitation: 'Actual app route tree, build/config and ingress are not started. Synthetic public-directory fixture only. No real tenant file was read or served.' };
    await fs.writeFile(path.join(fixture, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ ...evidence, evidenceFile: path.join(fixture, 'result.json') }, null, 2));
    assert.equal(response.status, 200, 'source-confirmed bypass reproduction expected HTTP 200');
    assert.equal(evidence.sentinelReturned, true, 'source-confirmed bypass reproduction expected synthetic bytes');
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
