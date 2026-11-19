// Local HTTP smoke of the sealed AF16 application; never loads application .env files.
// Reuses the release verifier and the existing S11 outside-repository runtime pattern.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { verify, filesUnder } = require('./release-artifact.cjs');
const { guard, privateRoot } = require('./af16-verification-context.cjs');
const root = path.resolve(__dirname, '..');
const candidate = path.join(root, '.codex-tmp/af16-release-20261026');
const artifact = path.join(root, '.codex-tmp/af16-artifact-20261026');
const output = path.join(root, 'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-26-run-02');
const runtime = path.join(privateRoot, 'af16-sealed-runtime-20261026');
const databaseUrl = 'postgresql://af16@127.0.0.1:55451/stoquify_local_af16_20261026_build_r2';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const args = process.argv.slice(2);
const attempt = args.length === 0 ? 1 : args.length === 1 && args[0] === '--retry' ? 2 : args.length === 2 && args[0] === '--attempt' && /^[3-9]$/.test(args[1]) ? Number(args[1]) : null;
const retry = attempt > 1;
const label = attempt === 1 ? 'artifact-runtime' : attempt === 2 ? 'artifact-runtime-retry' : `artifact-runtime-attempt-${attempt}`;
const requestTimeoutMs = retry ? 120000 : 30000;

async function main() {
  if (attempt === null) throw Error('Usage: verify-af16-artifact-runtime.cjs [--retry | --attempt 3..9]');
  if (fs.existsSync(path.join(output, label + '.json'))) throw Error('Refusing existing receipt');
  if (!retry && fs.existsSync(runtime)) throw Error('Refusing existing runtime');
  const digest = JSON.parse(fs.readFileSync(path.join(output, 'artifact-digest.json'))).sha256;
  const manifest = verify(candidate, artifact, digest);
  if (retry) {
    const priorName = attempt === 2 ? 'artifact-runtime' : attempt === 3 ? 'artifact-runtime-retry' : `artifact-runtime-attempt-${attempt - 1}`;
    const prior = JSON.parse(fs.readFileSync(path.join(output, priorName + '.json')));
    if (prior.passed || !prior.serverStopped || prior.artifactSha256 !== digest || prior.runtime !== runtime) throw Error('Stopped failed runtime with the same artifact required');
  }
  const client = new (require('pg').Client)({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  await client.connect();
  try { await guard(client); } finally { await client.end(); }
  if (!retry) fs.cpSync(path.join(artifact, 'runtime'), runtime, { recursive: true });
  // verify() has already checked the artifact bytes against this manifest.
  // Reuse only an exact runtime copy; do not reread the same artifact a second time.
  assert.deepEqual(filesUnder(runtime), manifest.files.filter(row => row.path.startsWith('runtime/')).map(row => ({ path: row.path.slice('runtime/'.length), sha256: row.sha256 })));
  const port = await new Promise((resolve, reject) => {
    const reservation = net.createServer();
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', () => {
      const value = reservation.address().port;
      reservation.close(error => error ? reject(error) : resolve(value));
    });
  });
  const env = {};
  for (const key of ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMSPEC']) if (process.env[key]) env[key] = process.env[key];
  Object.assign(env, {
    NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl,
    NEXTAUTH_URL: `https://localhost:${port}`, NEXT_PUBLIC_BASE_URL: `https://localhost:${port}`, NEXT_PUBLIC_APP_URL: `https://localhost:${port}`,
    STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0',
  });
  for (const key of ['AUTH_SECRET', 'NEXTAUTH_SECRET', 'BETTER_AUTH_SECRET', 'PUBLIC_IDENTITY_ABUSE_HASH_SECRET', 'AQSTOQFLOW_RECEIPT_TOKEN_SECRET', 'AQSTOQFLOW_HISTORY_CURSOR_SECRET', 'AQSTOQFLOW_STATEMENT_TOKEN_SECRET', 'AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY', 'AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY']) env[key] = crypto.randomBytes(32).toString('hex');
  // NextURL canonicalizes loopback aliases to localhost. Keep request and redirect
  // origins consistent while retaining the strict 127.0.0.1 listener.
  const addresses = await require('node:dns').promises.lookup('localhost', { all: true });
  if (!addresses.length || addresses.some(row => !['127.0.0.1', '::1'].includes(row.address))) throw Error('localhost must resolve only to loopback');
  const base = `http://localhost:${port}`;
  const log = fs.openSync(path.join(output, label + '.log'), 'wx');
  const child = spawn(process.execPath, [path.join(runtime, 'server.js')], { cwd: runtime, env, windowsHide: true, stdio: ['ignore', log, log] });
  let spawnError = null;
  child.once('error', error => { spawnError = error; });
  const exited = new Promise(resolve => child.once('close', resolve));
  const receipt = { attempt, artifactSha256: digest, buildId: manifest.buildId, runtime, port, requestOrigin: base, listener: '127.0.0.1', copiedBytesVerified: true, reusedCopy: retry, requestTimeoutMs, loopbackOnly: true, evidenceClass: 'HTTP smoke of the sealed full application; not authenticated browser, TLS, prior-application rollback or production qualification', requests: [], checks: [], passed: false };
  const request = async route => {
    const observation = { route, startedAt: Date.now(), stage: 'headers' };
    receipt.requests.push(observation);
    console.log(JSON.stringify({ route, phase: 'request', requestTimeoutMs }));
    const response = await fetch(base + route, { redirect: 'manual', signal: AbortSignal.timeout(requestTimeoutMs) });
    Object.assign(observation, { status: response.status, headersElapsedMs: Date.now() - observation.startedAt, stage: 'body' });
    return response;
  };
  const recordCheck = check => {
    const observation = receipt.requests.at(-1);
    Object.assign(observation, { stage: 'complete', elapsedMs: Date.now() - observation.startedAt });
    receipt.checks.push({ ...check, elapsedMs: observation.elapsedMs });
    console.log(JSON.stringify({ route: check.route, phase: 'passed', elapsedMs: observation.elapsedMs }));
  };
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw Error('Standalone server exited before readiness');
      try {
        const response = await fetch(base + '/favicon.ico', { redirect: 'manual', signal: AbortSignal.timeout(1000) });
        await response.arrayBuffer(); ready = true; break;
      } catch { await delay(500); }
    }
    assert.equal(ready, true, 'Standalone server readiness');
    for (const locale of ['en', 'fr']) {
      for (const route of [`/${locale}`, `/${locale}/login`]) {
        const response = await request(route);
        assert.equal(response.status, 200, route);
        assert.match(response.headers.get('content-type') || '', /text\/html/);
        assert.match(await response.text(), /Stoquify/i);
        recordCheck({ route, status: response.status, html: true });
      }
      const route = `/${locale}/dashboard/accounting`;
      const denied = await request(route);
      assert.ok([302, 303, 307, 308].includes(denied.status));
      const location = new URL(denied.headers.get('location'), base);
      assert.equal(location.origin, base);
      assert.equal(location.pathname, `/${locale}/login`);
      assert.equal(location.searchParams.get('callbackUrl'), route);
      await denied.arrayBuffer();
      recordCheck({ route, status: denied.status, anonymousLoginRedirect: true });
    }
    for (const prefix of ['runtime/public/', 'runtime/.next/static/']) {
      const file = manifest.files.find(row => row.path.startsWith(prefix) && /\.(?:svg|png|ico|js)$/.test(row.path));
      assert.ok(file, 'Sealed asset required: ' + prefix);
      const route = prefix === 'runtime/public/' ? '/' + file.path.slice(prefix.length) : '/_next/static/' + file.path.slice(prefix.length);
      const response = await request(route);
      assert.equal(response.status, 200, route);
      assert.equal(sha256(Buffer.from(await response.arrayBuffer())), file.sha256);
      recordCheck({ route, status: response.status, digestMatched: true });
    }
    verify(candidate, artifact, digest);
    receipt.artifactUnchangedAfterRequests = true;
    receipt.passed = true;
  } catch (error) { receipt.error = error.stack; receipt.failedRequest = receipt.requests.at(-1) || null; throw error; }
  finally {
    if (child.exitCode === null && child.pid) child.kill();
    await exited;
    fs.closeSync(log);
    receipt.serverStopped = true;
    fs.writeFileSync(path.join(output, label + '.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
  }
  console.log(JSON.stringify({ passed: receipt.passed, checks: receipt.checks.length, serverStopped: receipt.serverStopped }));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
