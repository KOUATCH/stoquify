// Transport diagnostic only: real local HTTP/HTTPS echo, no app/DB/auth mock.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { request, createTlsProxy, freePort } = require('./artifact-http-smoke.cjs');
const file = name => path.join(__dirname, name);
async function main() {
  assert.equal(process.argv.length, 2);
  const record = JSON.parse(fs.readFileSync(file('artifact-http-attempts/01-cold-auth-timeout/ARTIFACT_HTTP_SMOKE_TARGET.json')));
  assert.equal(record.origin, 'https://127.0.0.1:3443'); assert.equal(record.httpPort, 3296); assert.equal(record.tlsPort, 3443);
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash(fs.readFileSync(record.cert)), record.certificateSha256);
  await freePort(record.httpPort); await freePort(record.tlsPort);
  let echo, proxy, received;
  const report = { passed: false, noDatabaseOrApplicationStarted: true, origin: record.origin, startedAt: new Date().toISOString(),
    requestAndProxySourceSha256: hash(fs.readFileSync(file('artifact-http-smoke.cjs'))), limitation: 'Transport/body/forwarded-header check only; not an authentication or application result' };
  try {
    echo = http.createServer((req, res) => {
      const chunks = []; req.on('data', chunk => chunks.push(chunk)); req.on('end', () => {
        const bytes = Buffer.concat(chunks); received = { method: req.method, path: req.url, contentLength: req.headers['content-length'], bytes: bytes.length,
          bodySha256: hash(bytes), host: req.headers.host, forwardedHost: req.headers['x-forwarded-host'], forwardedProto: req.headers['x-forwarded-proto'], origin: req.headers.origin };
        res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': '__Secure-transport_probe=synthetic; Path=/; HttpOnly; Secure; SameSite=Lax' }); res.end(JSON.stringify({ transportOnly: true }));
      });
    });
    await new Promise((resolve, reject) => { echo.once('error', reject); echo.listen(record.httpPort, '127.0.0.1', resolve); });
    proxy = createTlsProxy(record); await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(record.tlsPort, '127.0.0.1', resolve); });
    const body = { synthetic: true, transportOnly: 'POST body integrity', amount: 6 };
    const answer = await request(record, '/transport-only', { method: 'POST', body, timeoutMs: 10000 });
    assert.equal(answer.status, 200); assert.equal(received.method, 'POST'); assert.equal(received.path, '/transport-only');
    assert.equal(received.bytes, Buffer.byteLength(JSON.stringify(body))); assert.equal(Number(received.contentLength), received.bytes);
    assert.equal(received.bodySha256, hash(JSON.stringify(body))); assert.equal(received.host, '127.0.0.1:3443');
    assert.equal(received.forwardedHost, received.host); assert.equal(received.forwardedProto, 'https'); assert.equal(received.origin, record.origin);
    assert.ok(answer.headers['set-cookie'].every(value => value.includes('; Secure')));
    report.elapsedMs = answer.elapsedMs; report.received = received; report.secureCookieHeaderPreserved = true; report.passed = true;
  } finally {
    if (proxy) await new Promise(resolve => proxy.close(resolve)); if (echo) await new Promise(resolve => echo.close(resolve));
    report.finishedAt = new Date().toISOString(); fs.writeFileSync(file('artifact-http-transport.results.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
  console.log(JSON.stringify({ passed: report.passed, elapsedMs: report.elapsedMs, noDatabaseOrApplicationStarted: true }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
